// pages/api/telegram/webhook.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin.js"
import { verifyTelegramRequest } from "../../../utils/verifyTelegram.js"

// Helper: Generate embedding
async function generateEmbedding(text) {
  const payload = {
    input: text,
    model: 'text-embedding-3-small'
  }

  const response = await fetch(`${process.env.OPENROUTER_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) return null
  const data = await response.json()
  return data.data[0].embedding
}

// Helper: Generate AI response
async function generateAIResponse(userId, sessionId, userMessage) {
  // Retrieve recent messages for context
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('body, direction')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  const context = recentMessages.reverse().map(m => `${m.direction}: ${m.body}`).join('\n')

  // Retrieve relevant embeddings
  const userEmbedding = await generateEmbedding(userMessage)
  let retrievedContext = ''
  if (userEmbedding) {
    const { data: similar } = await supabaseAdmin.rpc('similarity_search', {
      query_embedding: userEmbedding,
      match_threshold: 0.7,
      match_count: 5
    })
    retrievedContext = similar.map(s => s.content).join('\n')
  }


  // System prompt for influencer personality
  const systemPrompt = `You are a charismatic digital influencer. Engage conversationally, learn about the user, build personal connections, and subtly promote paywalled content like coaching or courses when relevant. Keep responses friendly, engaging, and under 200 words.`

  const payload = {
    model: process.env.AI_MODEL || 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nRetrieved:\n${retrievedContext}\n\nUser: ${userMessage}` }
    ],
    max_tokens: 200
  }

  const response = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    console.error('AI API failed:', response.statusText)
    return "Sorry, I'm having trouble responding right now. Let's chat later!"
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Helper: upsert user by telegram ID
async function upsertUser(telegramUser) {
  const externalId = String(telegramUser.id)
  
  // Try to find existing user
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('provider', 'telegram')
    .eq('external_id', externalId)
    .single()

  if (existingUser) {
    // Update last_seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existingUser.id)
    return existingUser
  }

  // Create new user
  const { data: newUser } = await supabaseAdmin
    .from('users')
    .insert([{
      external_id: externalId,
      provider: 'telegram',
      last_seen: new Date().toISOString(),
      locale: telegramUser.language_code
    }])
    .select()
    .single()

  // Create user profile
  await supabaseAdmin
    .from('user_profiles')
    .insert([{
      user_id: newUser.id,
      display_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
      version: 1
    }])

  return newUser
}

// Helper: get or create active session
async function getOrCreateSession(userId) {
  // Find most recent session that's not ended
  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (activeSession) {
    // Check if session is too old (>30 minutes), end it and create new one
    const sessionAge = Date.now() - new Date(activeSession.started_at).getTime()
    if (sessionAge > 30 * 60 * 1000) { // 30 minutes
      await supabaseAdmin
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeSession.id)
    } else {
      return activeSession
    }
  }

  // Create new session
  const { data: newSession } = await supabaseAdmin
    .from('sessions')
    .insert([{
      user_id: userId,
      channel: 'telegram',
      started_at: new Date().toISOString()
    }])
    .select()
    .single()

  return newSession
}

// Main webhook handler
export default async function handler(req, res) {
  try {
    if (!verifyTelegramRequest(req)) {
      return res.status(400).json({ error: "Invalid Telegram webhook" })
    }

    const update = req.body
    const message = update.message || update.edited_message

    if (!message || !message.text) {
      return res.status(200).json({ ok: true, skipped: "No text message" })
    }

    // Upsert user and get/create session
    const user = await upsertUser(message.from)
    const session = await getOrCreateSession(user.id)

    // Insert user message
    const { data: insertedMessage } = await supabaseAdmin
      .from('messages')
      .insert([{
        session_id: session.id,
        user_id: user.id,
        direction: 'user',
        channel_message_id: String(message.message_id),
        body: message.text,
        body_json: message
      }])
      .select()
      .single()

    // Generate and store embedding for retrieval
    const embedding = await generateEmbedding(message.text)
    if (embedding) {
      await supabaseAdmin
        .from('embeddings')
        .insert([{
          user_id: user.id,
          message_id: insertedMessage.id,
          content: message.text,
          embedding: embedding,
          source: 'telegram'
        }])
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(user.id, session.id, message.text)

    // Insert bot message
    const { data: botMessage } = await supabaseAdmin
      .from('messages')
      .insert([{
        session_id: session.id,
        user_id: user.id,
        direction: 'bot',
        body: aiResponse,
        body_json: { ai_generated: true }
      }])
      .select()
      .single()

    // Send response back to Telegram
    if (process.env.TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: aiResponse,
          reply_to_message_id: message.message_id
        })
      })
    }

    return res.status(200).json({ 
      ok: true, 
      message_id: insertedMessage.id,
      user_id: user.id 
    })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    
    // Log error to audit table
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert([{
          action: 'telegram_webhook_error',
          payload: { 
            error: error.message, 
            body: req.body,
            timestamp: new Date().toISOString()
          }
        }])
    } catch (auditError) {
      console.error('Failed to log audit:', auditError)
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    })
  }
}

// Vercel config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}