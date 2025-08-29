// pages/api/telegram/webhook.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin.js"
import { verifyTelegramRequest } from "../../../utils/verifyTelegram.js"

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

    // Forward to n8n for processing
    if (process.env.N8N_WEBHOOK_URL) {
      const n8nPayload = {
        message_id: insertedMessage.id,
        session_id: session.id,
        user_id: user.id,
        text: message.text,
        telegram_chat_id: message.chat.id,
        telegram_user: message.from,
        timestamp: new Date().toISOString()
      }

      const response = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'TelegramBot/1.0'
        },
        body: JSON.stringify(n8nPayload),
        timeout: 5000 // 5 second timeout
      })

      if (!response.ok) {
        console.error('n8n webhook failed:', response.status, response.statusText)
        // Continue processing even if n8n fails
      }
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
