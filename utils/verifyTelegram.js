const crypto = require("crypto")

function verifyTelegramRequest(req) {
  if (req.method !== "POST") return false
  if (!req.body || !req.body.message) return false

  // Optional: Verify HMAC if TELEGRAM_WEBHOOK_SECRET is set
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const receivedHash = req.headers['x-telegram-bot-api-secret-token']
    if (!receivedHash || receivedHash !== secret) return false
  }

  return true
}

module.exports = { verifyTelegramRequest }
