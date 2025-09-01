const { verifyTelegramRequest } = require('../utils/verifyTelegram')

describe('Telegram Webhook', () => {
  test('verifies valid request', () => {
    const req = {
      method: 'POST',
      body: { message: { text: 'hi' } },
      headers: { 'x-telegram-bot-api-secret-token': 'secret' }
    }
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret'
    expect(verifyTelegramRequest(req)).toBe(true)
  })

  test('rejects invalid request', () => {
    const req = { method: 'GET' }
    expect(verifyTelegramRequest(req)).toBe(false)
  })
})