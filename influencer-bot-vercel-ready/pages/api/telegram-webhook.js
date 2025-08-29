import { supabaseAdmin } from "../../lib/supabaseAdmin.js"
import { verifyTelegramRequest } from "../../utils/verifyTelegram.js"

export default async function handler(req, res) {
  if (!verifyTelegramRequest(req)) {
    return res.status(400).json({ error: "Invalid Telegram webhook" })
  }

  const message = req.body.message
  const userId = message.from.id.toString()
  const text = message.text || ""

  // store message in DB
  await supabaseAdmin.from("messages").insert({
    user_id: userId,
    message_text: text,
    source: "telegram"
  })

  // Push to n8n webhook (replace with your n8n webhook URL)
  try {
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        text,
        platform: "telegram"
      })
    })
  } catch (e) {
    console.error("Failed to call n8n", e)
  }

  // Acknowledge to Telegram
  return res.status(200).json({ ok: true })
}
