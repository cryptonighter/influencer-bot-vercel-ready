# Influencer Bot Vercel Ready

An interactive Telegram bot for influencers, built with Next.js, Supabase, and OpenRouter AI.

## Features
- Telegram webhook integration
- AI-powered responses using OpenRouter
- User session management
- Embeddings for knowledge retrieval
- Admin APIs for user management
- GDPR-compliant data handling

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your keys:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - TELEGRAM_BOT_TOKEN
   - OPENROUTER_API_KEY
   - OPENROUTER_BASE_URL
   - AI_MODEL (e.g., openai/gpt-4o-mini)

3. Run `npm install`
4. Run database migrations from `migrations/001_init.sql` in Supabase
5. Create similarity_search function in Supabase:
   ```sql
   CREATE OR REPLACE FUNCTION similarity_search(query_embedding vector(1536), match_threshold float, match_count int)
   RETURNS TABLE(id uuid, content text, similarity float)
   AS $$
   SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
   FROM embeddings
   WHERE 1 - (embedding <=> query_embedding) > match_threshold
   ORDER BY embedding <=> query_embedding
   LIMIT match_count;
   $$ LANGUAGE sql;
   ```

6. Set up Telegram webhook: `https://your-vercel-url.vercel.app/api/telegram-webhook`

## Deployment
- Push to GitHub
- Connect to Vercel
- Set env vars in Vercel dashboard

## Testing
- Run `npm test` for unit tests
- Send messages to your Telegram bot