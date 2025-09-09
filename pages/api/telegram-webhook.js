// pages/api/telegram-webhook.js
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { verifyTelegramRequest } from "../../utils/verifyTelegram.js";

// Helper: Generate embedding using chat completion
async function generateEmbedding(text) {
  const payload = {
    model: 'openai/gpt-4o-mini', // choose appropriate model
    messages: [
      { role: 'system', content: 'You are a helpful assistant that returns a numeric embedding array.' },
      { role: 'user', content: `Return a JSON array of numbers as an embedding for this text: "${text}"` }
    ],
    max_tokens: 200
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error('Failed to generate embedding:', response.statusText);
    return null;
  }

  const data = await response.json();
  try {
    const embedding = JSON.parse(data.choices[0].message.content);
    if (Array.isArray(embedding)) return embedding;
    return null;
  } catch (err) {
    console.error('Failed to parse embedding JSON:', err, data.choices[0].message.content);
    return null;
  }
}

// Truncate text helper
function truncateText(text, maxChars = 10000) {
  return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
}

// AI response helper with theme/fact extraction and context memory
async function generateAIResponse(userId, sessionId, userMessage) {
  // Fetch recent messages and conversation logs for context
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('body, direction')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: logs } = await supabaseAdmin
    .from('conversation_logs')
    .select('summary, topics, facts')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  const context = truncateText(
    recentMessages.reverse().map(m => `${m.direction}: ${m.body}`).join('\n'),
    5000
  );

  const logContext = logs ? logs.map(l => `Summary: ${l.summary}, Topics: ${l.topics.join(', ')}, Facts: ${JSON.stringify(l.facts)}`).join('\n') : '';

  // Generate summary/topics/facts BEFORE the response, based on user input
  const analysisPayload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Analyze the user message and context for themes, facts, and if it\'s worth embedding. Respond with JSON: {"summary": "brief overview of user input", "topics": ["list"], "facts": {"key": "value"}, "embed_worthy": true/false}.' },
      { role: 'user', content: `Context:\n${logContext}\n\nRecent:\n${context}\n\nUser: ${userMessage}` }
    ],
    max_tokens: 200
  };

  const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(analysisPayload)
  });

  let summaryData = { summary: '', topics: [], facts: {}, embed_worthy: false };
  if (analysisResponse.ok) {
    const analysisData = await analysisResponse.json();
    try {
      summaryData = JSON.parse(analysisData.choices[0].message.content);
    } catch (err) {
      console.error('Failed to parse analysis JSON:', err);
    }
  }

  // Query relevant offers based on topics
  const { data: relevantOffers } = await supabaseAdmin
    .from('offers')
    .select('id, title, description, price_cents, discount_percent, referral_link, payment_type, category')
    .eq('active', true)
    .in('category', summaryData.topics || [])
    .limit(2);

  console.log('User topics:', summaryData.topics);
  console.log('Relevant offers found:', relevantOffers);

  let offerContext = '';
  if (relevantOffers && relevantOffers.length > 0) {
    offerContext = relevantOffers.map(o =>
      `Offer: ${o.title} - ${o.description}. Price: ${(o.price_cents / 100).toFixed(2)} (${o.discount_percent}% off!). Link: ${o.referral_link}`
    ).join('\n');
  } else {
    // If no exact match, get all active offers as fallback
    const { data: allOffers } = await supabaseAdmin
      .from('offers')
      .select('id, title, description, price_cents, discount_percent, referral_link, payment_type, category')
      .eq('active', true)
      .limit(3);
    if (allOffers && allOffers.length > 0) {
      offerContext = allOffers.map(o =>
        `Offer: ${o.title} - ${o.description}. Price: ${(o.price_cents / 100).toFixed(2)} (${o.discount_percent}% off!). Link: ${o.referral_link}`
      ).join('\n');
    }
  }

  // Save to conversation_logs
  if (summaryData.summary) {
    await supabaseAdmin
      .from('conversation_logs')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        summary: summaryData.summary,
        topics: summaryData.topics || [],
        facts: summaryData.facts || {}
      }]);
  }

  // Generate embedding if worthy
  let embedding = null;
  if (summaryData.embed_worthy) {
    embedding = await generateEmbedding(userMessage);
  }

  // Now generate the bot response with strategic offer integration
  const systemPrompt = `You are a grounded, practical influencer guiding users toward self-development. Match the user's tone subtly, focus on helpful, realistic advice. If relevant offers are provided, recommend them naturally and accurately based on the user's needs. Do not invent offers—only use the ones listed. If no offers match, suggest exploring related topics. Keep responses under 200 words.`;

  const responsePayload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${logContext}\n\nRecent:\n${context}\n\nUser: ${userMessage}\n\nRelevant Offers:\n${offerContext}` }
    ],
    max_tokens: 200
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(responsePayload)
  });

  if (!response.ok) {
    console.error('AI API failed:', response.statusText);
    return "Sorry, I'm having trouble responding right now. Let's chat later!";
  }

  const data = await response.json();
  const aiMessage = data.choices[0].message.content;

  // Log referrals for sent offers
  if (relevantOffers) {
    for (const offer of relevantOffers) {
      await supabaseAdmin.from('referrals').insert([{
        user_id: userId,
        offer_id: offer.id,
        referral_link: offer.referral_link,
        status: 'sent'
      }]);
    }
  }

  return { message: aiMessage, embedding, summaryData };
}

// Upsert user
async function upsertUser(telegramUser) {
  if (!telegramUser?.id) throw new Error('Invalid telegramUser');

  const externalId = String(telegramUser.id);

  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('provider', 'telegram')
    .eq('external_id', externalId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') throw selectError;

  if (existingUser) {
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existingUser.id);
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert([{
      external_id: externalId,
      provider: 'telegram',
      last_seen: new Date().toISOString(),
      locale: telegramUser.language_code
    }])
    .select()
    .single();

  if (insertError || !newUser) throw insertError || new Error('User insert failed');

  await supabaseAdmin
    .from('user_profiles')
    .insert([{ user_id: newUser.id, display_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(), version: 1 }]);

  return newUser;
}

// Get or create session
async function getOrCreateSession(userId) {
  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (activeSession) {
    const sessionAge = Date.now() - new Date(activeSession.started_at).getTime();
    if (sessionAge > 30 * 60 * 1000) {
      await supabaseAdmin.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', activeSession.id);
    } else return activeSession;
  }

  const { data: newSession } = await supabaseAdmin
    .from('sessions')
    .insert([{ user_id: userId, channel: 'telegram', started_at: new Date().toISOString() }])
    .select()
    .single();

  return newSession;
}

// Main webhook
export default async function handler(req, res) {
  console.log('Update received:', JSON.stringify(req.body, null, 2));

  try {
    if (!verifyTelegramRequest(req)) {
      return res.status(400).json({ error: "Invalid Telegram webhook" });
    }

    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message?.text || !message.from || !message.chat) {
      return res.status(200).json({ ok: true, skipped: "Incomplete message" });
    }

    const user = await upsertUser(message.from);
    const session = await getOrCreateSession(user.id);

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
      .single();

    const { message: aiResponse, embedding } = await generateAIResponse(user.id, session.id, message.text);

    // Store embedding if generated
    if (embedding) {
      await supabaseAdmin
        .from('embeddings')
        .insert([{ user_id: user.id, message_id: insertedMessage.id, content: message.text, embedding, source: 'telegram' }]);
    }

    await supabaseAdmin
      .from('messages')
      .insert([{ session_id: session.id, user_id: user.id, direction: 'bot', body: aiResponse, body_json: { ai_generated: true } }]);

    // 4 second delay
    await new Promise(resolve => setTimeout(resolve, 4000));

    if (process.env.TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: message.chat.id, text: aiResponse, reply_to_message_id: message.message_id })
      });
    }

    return res.status(200).json({ ok: true, message_id: insertedMessage.id, user_id: user.id });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    try {
      await supabaseAdmin.from('audit_logs').insert([{ action: 'telegram_webhook_error', payload: { error: error.message, body: req.body, timestamp: new Date().toISOString() } }]);
    } catch (auditError) {
      console.error('Failed to log audit:', auditError);
    }
    return res.status(500).json({ error: 'Internal server error', timestamp: new Date().toISOString() });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };