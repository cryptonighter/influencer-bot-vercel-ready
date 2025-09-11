# Influencer Bot - Technical Specification

## Overview

The Influencer Bot is an AI-powered Telegram chatbot designed for influencers to engage with their audience in a personalized, growth-oriented manner. It leverages advanced AI models for natural conversations, context-aware responses, and automated content recommendations. The system includes an admin dashboard for managing users, content, offers, and bot settings.

**Scope of Use:**
- Personal development coaching through conversational AI
- Audience engagement for influencers in self-improvement niches
- Automated referral and offer management
- GDPR-compliant user data handling
- Scalable for small to medium-sized influencer communities

**Limitations:**
- Currently supports only Telegram platform
- AI responses limited by model capabilities and token quotas
- Requires manual content curation for offers and contexts
- Not designed for high-volume enterprise use without optimization

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram      │────│   Vercel        │────│   Supabase      │
│   Client        │    │   (Next.js)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   OpenRouter    │
                       │   AI Models     │
                       └─────────────────┘
```

### Components

1. **Frontend (Dashboard)**
   - Built with Next.js and React
   - Admin interface for managing bot settings, users, content, and analytics
   - Real-time metrics display
   - Responsive design with custom CSS

2. **Backend (API Routes)**
   - Next.js API routes handling Telegram webhooks and admin operations
   - Serverless functions deployed on Vercel
   - Integration with Supabase for data persistence

3. **Database (Supabase)**
   - PostgreSQL with vector extensions for embeddings
   - Row-level security (RLS) enabled
   - Real-time subscriptions for live updates

4. **AI Integration (OpenRouter)**
   - Chat completions for conversational responses
   - Embeddings for semantic search
   - Model selection (GPT-4, Claude, etc.)

5. **External Services**
   - Telegram Bot API for messaging
   - Vercel for hosting and deployment

### Data Flow
1. User sends message on Telegram
2. Telegram webhook triggers Vercel API
3. API processes message, generates AI response
4. Response stored in database, sent back to user
5. Embeddings created for knowledge retrieval
6. Admin dashboard queries database for analytics

## Tech Stack

- **Frontend:** Next.js 12+, React 17+, CSS (custom styling)
- **Backend:** Node.js (Next.js API routes)
- **Database:** Supabase (PostgreSQL with pgvector)
- **AI:** OpenRouter API (multiple LLM providers)
- **Deployment:** Vercel (serverless)
- **Messaging:** Telegram Bot API
- **Authentication:** Supabase Auth (for admin access)
- **Testing:** Jest
- **Version Control:** Git

## Database Schema

### Core Tables
- `users`: User profiles and authentication
- `sessions`: Chat sessions
- `messages`: Message history (user/bot)
- `embeddings`: Vector embeddings for semantic search
- `conversation_logs`: AI analysis and context
- `character_settings`: Bot personality configuration

### Business Tables
- `content_modules`: Premium content (courses, coaching)
- `purchases`: Payment transactions
- `entitlements`: User access rights
- `offers`: Referral offers
- `partners`: Business partners
- `referrals`: Referral tracking

### Compliance Tables
- `consents`: GDPR consent management
- `dsr_requests`: Data subject requests
- `audit_logs`: System activity logging

## API Endpoints

### Public Endpoints
- `POST /api/telegram-webhook`: Telegram message processing

### Admin Endpoints
- `GET /api/admin/metrics`: System metrics
- `GET /api/admin/user-insights`: User analytics
- `POST /api/admin/manage-settings`: Bot configuration
- `GET/POST/DELETE /api/admin/manage-partners`: Partner management
- `GET/POST/DELETE /api/admin/manage-offers`: Offer management
- `GET/POST/DELETE /api/admin/manage-context`: Context management
- `POST /api/admin/test-context-matching`: Context testing
- `POST /api/admin/add-content`: Content creation
- `GET /api/admin/export-user`: User data export
- `POST /api/admin/grant-entitlement`: Access management

## Features

### Core Features
- **Conversational AI**: Context-aware responses using GPT-4 and similar models
- **Personalization**: User profiling and adaptive communication styles
- **Knowledge Base**: Semantic search using vector embeddings
- **Referral System**: Automated offer suggestions and tracking
- **Session Management**: Persistent conversation context
- **Multi-language Support**: Basic locale detection

### Admin Features
- **Dashboard**: Comprehensive admin interface
- **User Management**: Insights, export, and moderation
- **Content Management**: Offers, partners, and character contexts
- **Analytics**: Message counts, user engagement metrics
- **Bot Configuration**: Personality traits, response styles, humor levels

### Security & Compliance
- **GDPR Compliance**: Consent management and data export
- **Data Encryption**: Secure storage of sensitive information
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Comprehensive activity tracking

## Setup and Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account
- Telegram Bot Token
- OpenRouter API key
- Vercel account (for deployment)

### Local Development

1. **Clone Repository**
   ```bash
   git clone https://github.com/cryptonighter/influencer-bot-vercel-ready.git
   cd influencer-bot-vercel-ready
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the following variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key
   - `TELEGRAM_BOT_TOKEN`: Telegram bot token
   - `OPENROUTER_API_KEY`: OpenRouter API key
   - `OPENROUTER_BASE_URL`: https://openrouter.ai/api/v1
   - `AI_MODEL`: openai/gpt-4o-mini

4. **Database Setup**
   - Create a new Supabase project
   - Run migrations in order:
     - `migrations/001_init.sql`
     - `migrations/002_conversation_logs.sql`
     - `migrations/003_user_interests.sql`
     - `migrations/004_partners_offers_referrals.sql`
     - `migrations/005_character_settings.sql`
   - Create similarity search function (see below)

5. **Telegram Webhook Setup**
   - Set webhook URL in Telegram: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram-webhook`

### Similarity Search Function
```sql
CREATE OR REPLACE FUNCTION similarity_search(query_embedding vector(1536), match_threshold float, match_count int)
RETURNS TABLE(id uuid, content text, similarity float)
AS $
SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
FROM embeddings
WHERE 1 - (embedding <=> query_embedding) > match_threshold
ORDER BY embedding <=> query_embedding
LIMIT match_count;
$ LANGUAGE sql;
```

## Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch
4. Update Telegram webhook URL to Vercel domain

### Production Considerations
- Enable Vercel Analytics for monitoring
- Set up error logging (e.g., Sentry)
- Configure rate limiting
- Implement backup strategies for Supabase

## Usage

### For Users
- Start conversation with the bot on Telegram
- Engage in natural dialogue about personal development
- Receive tailored advice and content recommendations
- Opt-in to offers and referrals

### For Admins
- Access dashboard at `/dashboard`
- Configure bot personality and behavior
- Manage content, offers, and partners
- Monitor user engagement and system metrics
- Export user data for compliance

## Testing

### Unit Tests
```bash
npm test
```

### Integration Testing
- Test Telegram webhook with sample messages
- Verify AI responses and embeddings
- Check admin dashboard functionality

### Load Testing
- Simulate multiple concurrent users
- Monitor API response times
- Test database performance under load

## Monitoring and Maintenance

### Key Metrics
- Message volume and response times
- User engagement rates
- AI API usage and costs
- Error rates and system uptime

### Maintenance Tasks
- Regular database backups
- Model performance monitoring
- Content freshness updates
- Security updates and patches

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure GDPR compliance

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues
- Documentation in `/docs`
- Community discussions

---

**Version:** 1.0.0
**Last Updated:** September 10, 2025