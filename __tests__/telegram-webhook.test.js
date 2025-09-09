import { jest } from '@jest/globals';
import { generateAIResponse } from '../pages/api/telegram-webhook.js';

jest.mock('../../../lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: [] })),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: {} })),
    })),
  },
}));

jest.mock('node-fetch', () => jest.fn(() => Promise.resolve({ ok: true, json: () => ({ choices: [{ message: { content: 'Test response' } }] }) })));

describe('generateAIResponse', () => {
  it('should generate a response and extract summary', async () => {
    const result = await generateAIResponse('user123', 'session123', 'Hello');
    expect(result.message).toBeDefined();
    expect(result.summaryData).toBeDefined();
  });
});