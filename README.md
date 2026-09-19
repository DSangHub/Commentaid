# Commentaid

Commentaid is an AI bridge for influencers and businesses managing multilingual comments on posts and ads.

## Features

- Landing page plus Supabase email/password authentication
- Manual Paste Comment → translate → draft → edit → Copy Reply workflow
- Three native-language reply options with English translations
- Intent detection and sensitive-comment escalation labels
- Authenticated, rate-limited AI and YouTube API routes
- YouTube channel comment monitoring
- Google OAuth connection for channel owners and managers
- Encrypted OAuth token storage, managed comment synchronization, and approval-gated YouTube replies
- Server-only Supabase tables with audit history and sensitive-comment escalation

## Local development

1. Copy `.env.example` to `.env.local` and enter the required keys.
2. Install dependencies with `npm install`.
3. Start with `npm run dev`.

## Vercel configuration

Add the variables shown in `.env.example` to Production and Preview. The app accepts either the current Supabase publishable key or the legacy anon key. AI requests use `OPENAI_API_KEY`; when it is absent, Vercel AI Gateway is used.

The API routes verify every bearer token with Supabase Auth. Never expose a Supabase secret/service-role key or the OpenAI key through a `NEXT_PUBLIC_` variable.

## Managed YouTube setup

1. Run the SQL migration in `supabase/migrations` against the Commentaid Supabase project.
2. Add the server-only variables `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `OAUTH_STATE_SECRET` in Vercel.
3. Set `GOOGLE_REDIRECT_URI` to `https://www.commentaid.com/api/integrations/youtube/callback` and add that exact URI to the Google OAuth web client.
4. Keep the YouTube Data API v3 enabled. Commentaid requests only the `youtube.force-ssl` scope required to read and post comments.
5. Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32` and `OAUTH_STATE_SECRET` with `openssl rand -hex 32`. Never reuse or expose either value.

Connected accounts start in approval mode. Routine replies require an explicit **Approve & post** action. Sensitive and urgent replies are blocked from API posting and must be handled manually.
