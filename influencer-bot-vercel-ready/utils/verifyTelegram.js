import crypto from "crypto"

export function verifyTelegramRequest(req) {
  // Telegram doesn't sign webhooks with HMAC like WhatsApp.
  // Minimal check: ensure it's POST and has body.message
  if (req.method !== "POST") return false
  if (!req.body || !req.body.message) return false
  return true
}
