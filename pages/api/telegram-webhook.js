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
    let content = data.choices[0].message.content.trim();
    // Strip markdown code block if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    const embedding = JSON.parse(content);
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

// Split message into parts for long responses
function splitMessage(message) {
  const paragraphs = message.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length <= 1) {
    // If short, check word count
    const words = message.split(' ');
    if (words.length < 100) return [message];
    // Split into chunks of ~50 words
    const chunks = [];
    for (let i = 0; i < words.length; i += 50) {
      chunks.push(words.slice(i, i + 50).join(' '));
    }
    return chunks;
  }
  return paragraphs;
}

// AI response helper with theme/fact extraction and context memory
async function generateAIResponse(userId, sessionId, userMessage) {
  // Prepare a default summaryData object first
  let summaryData = { summary: '', topics: [], facts: {}, embed_worthy: false };
  let logContext = '';

  // Fetch recent messages for immediate context
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('body, direction')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const context = truncateText(
    recentMessages.reverse().map(m => `${m.direction}: ${m.body}`).join('\n'),
    5000
  );

  // Analyze the user message to get topics
  const analysisPayload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Analyze the user message and context for themes, facts, and if it\'s worth embedding. Respond with JSON: {"summary": "brief overview of user input", "topics": ["list"], "facts": {"key": "value"}, "embed_worthy": true/false}.' },
      { role: 'user', content: `Context:\n${context}\n\nUser: ${userMessage}` }
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

  if (analysisResponse.ok) {
    const analysisData = await analysisResponse.json();
    try {
      summaryData = JSON.parse(analysisData.choices[0].message.content);
    } catch (err) {
      console.error('Failed to parse analysis JSON:', err);
    }
  }

  // Now it's safe to reference summaryData.topics (it has been updated)
  if (summaryData.topics && summaryData.topics.length > 0) {
    const { data: relevantLogs } = await supabaseAdmin
      .from('conversation_logs')
      .select('summary, topics, facts')
      .eq('user_id', userId)
      .overlaps('topics', summaryData.topics)
      .order('created_at', { ascending: false })
      .limit(3);

    if (relevantLogs && relevantLogs.length > 0) {
      logContext = relevantLogs.map(l => `Summary: ${l.summary}, Topics: ${l.topics.join(', ')}, Facts: ${JSON.stringify(l.facts)}`).join('\n');
    }
  }

  

  // Query relevant offers based on topics
  let relevantOffers = [];
  const { data: initialOffers } = await supabaseAdmin
    .from('offers')
    .select('id, title, description, price_cents, discount_percent, referral_link, payment_type, category')
    .eq('active', true)
    .in('category', summaryData.topics || [])
    .limit(2);

  if (initialOffers && initialOffers.length > 0) {
    relevantOffers = initialOffers;
  } else {
    // If no exact match, get all active offers as fallback
    const { data: allOffers } = await supabaseAdmin
      .from('offers')
      .select('id, title, description, price_cents, discount_percent, referral_link, payment_type, category')
      .eq('active', true)
      .limit(3);
    relevantOffers = allOffers || [];
  }

  // Filter out offers already referred to this user
  const offerIds = relevantOffers.map(o => o.id);
  const { data: existingReferrals } = await supabaseAdmin
    .from('referrals')
    .select('offer_id')
    .eq('user_id', userId)
    .in('offer_id', offerIds);

  const referredOfferIds = existingReferrals ? existingReferrals.map(r => r.offer_id) : [];
  const newOffers = relevantOffers.filter(o => !referredOfferIds.includes(o.id));

  // Query and filter relevant character contexts based on topics
  let relevantContexts = [];
  try {
    const { data: allContexts, error: contextError } = await supabaseAdmin
      .from('character_context')
      .select('id, type, title, description, tags, link')
      .eq('active', true)
      .overlaps('tags', summaryData.topics || [])
      .limit(5);

    if (contextError) {
      console.error('Context query error:', contextError);
    } else if (allContexts && Array.isArray(allContexts) && allContexts.length > 0) {
      // Simple filtering without complex chains
      const tempContexts = [];
      for (let idx = 0; idx < allContexts.length; idx++) {
        const ctx = allContexts[idx];
        if (ctx && ctx.type && (ctx.type === 'post' || ctx.type === 'image')) {
          tempContexts.push(ctx);
        }
      }

      // Simple sorting
      tempContexts.sort(function(first, second) {
        let firstCount = 0;
        let secondCount = 0;
        if (first.tags && Array.isArray(first.tags) && summaryData.topics && Array.isArray(summaryData.topics)) {
          for (let t = 0; t < first.tags.length; t++) {
            if (summaryData.topics.includes(first.tags[t])) {
              firstCount++;
            }
          }
        }
        if (second.tags && Array.isArray(second.tags) && summaryData.topics && Array.isArray(summaryData.topics)) {
          for (let t = 0; t < second.tags.length; t++) {
            if (summaryData.topics.includes(second.tags[t])) {
              secondCount++;
            }
          }
        }
        return secondCount - firstCount;
      });

      // Take top 2
      relevantContexts = tempContexts.slice(0, 2);
    }
  } catch (err) {
    console.error('Context filtering catch:', err);
    relevantContexts = [];
  }

  console.log('User topics:', summaryData.topics);
  console.log('Relevant offers found:', relevantOffers.length, 'New offers:', newOffers.length);
  console.log('Relevant contexts found:', relevantContexts?.length || 0);
  console.log('Selected contexts:', relevantContexts?.map(c => ({ title: c.title, link: c.link })) || []);

  let offerContext = '';
  if (newOffers.length > 0) {
    offerContext = newOffers.map(o =>
      `Offer: ${o.title} - ${o.description}. Price: ${(o.price_cents / 100).toFixed(2)} (${o.discount_percent}% off!). Link: ${o.referral_link}`
    ).join('\n');
  }

  let contextInfo = '';
  if (relevantContexts && relevantContexts.length > 0) {
    contextInfo = relevantContexts.map(c =>
      `Context: ${c.title} (${c.type}) - ${c.description}. Link: ${c.link}`
    ).join('\n');
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

  // Load character settings
  const { data: settingsData } = await supabaseAdmin
    .from('character_settings')
    .select('setting_key, setting_value');
  const botSettings = {};
  settingsData?.forEach(s => { botSettings[s.setting_key] = s.setting_value; });

  // Memory cleanup based on duration
  const memoryDuration = botSettings.memory_duration || '1 Week';
  const durationMap = { '1 Day': 1, '1 Week': 7, '1 Month': 30, 'Forever': Infinity };
  const days = durationMap[memoryDuration];
  if (days !== Infinity) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    await supabaseAdmin
      .from('conversation_logs')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoff.toISOString());
  }

  // Apply settings to prompt
  const mirroring = botSettings.style_mirroring || 50;
  const grounding = botSettings.grounding_level || 80;
  const tone = botSettings.tone || 'Grounded';
  const style = botSettings.communication_style || 'Conversational';
  const energy = botSettings.energy_level || 2;
  const questionFreq = botSettings.question_frequency || 'Sometimes';
  const offerTiming = botSettings.offer_timing || 'Relevant';
  const repetitionCheck = botSettings.repetition_check !== false;
  const responseLength = botSettings.response_length || '50-200';

  const systemPrompt = `You are a ${tone.toLowerCase()}, ${style.toLowerCase()} influencer guiding users toward self-development. Mirror the user's style by ${mirroring}%, but maintain ${grounding}% grounding in your personality. Energy level: ${energy === 1 ? 'low' : energy === 2 ? 'medium' : 'high'}. Ask questions ${questionFreq.toLowerCase()}. Time offers ${offerTiming.toLowerCase()}. ${repetitionCheck ? 'Avoid repetition.' : ''} If relevant offers or contexts are provided, reference them naturally. For contexts, suggest checking your socials if relevant. Do not invent offers/contexts—only use the ones listed. Keep responses between ${responseLength} words.`;

  // Calculate max tokens based on response length setting
  const lengthParts = responseLength.split('-');
  const maxWords = parseInt(lengthParts[1] || '200');
  const maxTokens = Math.ceil(maxWords * 1.5); // Rough estimate: 1.5 tokens per word

  const responsePayload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Previous Logs:
${logContext}

Recent:
${context}

User: ${userMessage}

Relevant Offers:
${offerContext}

Relevant Contexts:
${contextInfo}` }
    ],
    max_tokens: maxTokens
  };

  let aiMessage = "Sorry, I'm having trouble responding right now. Let's chat later!";
  try {
    console.log('Sending AI request with payload:', JSON.stringify(responsePayload, null, 2));
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responsePayload)
    });

    console.log('AI API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API failed:', response.status, response.statusText, errorText);
      return aiMessage;
    }

    const data = await response.json();
    console.log('AI response data:', JSON.stringify(data, null, 2));
    if (data.choices && data.choices[0] && data.choices[0].message) {
      aiMessage = data.choices[0].message.content;
    } else {
      console.error('Unexpected AI response format:', data);
    }
  } catch (aiError) {
    console.error('AI API fetch error:', aiError);
  }

  // Remove "Mia:" prefix if present
  if (aiMessage.startsWith('Mia:')) {
    aiMessage = aiMessage.substring(4).trim();
  }

  // Log referrals for new offers only
  if (newOffers.length > 0) {
    for (const offer of newOffers) {
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

    const { data: insertedMessage, error: insertError } = await supabaseAdmin
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

    if (insertError) {
      console.error('Failed to insert user message:', insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { message: aiResponse, embedding } = await generateAIResponse(user.id, session.id, message.text);

    // Store embedding if generated
    if (embedding) {
      const { error: embeddingError } = await supabaseAdmin
        .from('embeddings')
        .insert([{ user_id: user.id, message_id: insertedMessage.id, content: message.text, embedding, source: 'telegram' }]);
      if (embeddingError) {
        console.error('Failed to insert embedding:', embeddingError);
      }
    }

    const { error: botMessageError } = await supabaseAdmin
      .from('messages')
      .insert([{ session_id: session.id, user_id: user.id, direction: 'bot', body: aiResponse, body_json: { ai_generated: true } }]);
    if (botMessageError) {
      console.error('Failed to insert bot message:', botMessageError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Split and send message parts
    const messageParts = splitMessage(aiResponse);
    if (process.env.TELEGRAM_BOT_TOKEN) {
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        const replyId = i === 0 ? message.message_id : undefined;  // Reply only to first part
        try {
          const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: message.chat.id, text: part, reply_to_message_id: replyId })
          });
          if (!telegramResponse.ok) {
            console.error('Telegram API error:', telegramResponse.status, await telegramResponse.text());
          } else {
            console.log('Message part sent successfully:', i + 1, 'of', messageParts.length);
          }
        } catch (telegramError) {
          console.error('Failed to send message to Telegram:', telegramError);
        }
        if (i < messageParts.length - 1) {
          // Delay between parts (except after last)
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } else {
      console.error('TELEGRAM_BOT_TOKEN not set');
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