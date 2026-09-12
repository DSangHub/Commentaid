# Commentaid

Commentaid is an AI bridge for influencers and businesses managing multilingual comments on posts and ads.

## Features

- Landing page plus Supabase email/password authentication
- Manual Paste Comment → translate → draft → edit → Copy Reply workflow
- Three native-language reply options with English translations
- Intent detection and sensitive-comment escalation labels
- Authenticated, rate-limited AI and YouTube API routes
- YouTube channel comment monitoring

## Local development

1. Copy `.env.example` to `.env.local` and enter the required keys.
2. Install dependencies with `npm install`.
3. Start with `npm run dev`.

## Vercel configuration

Add the variables shown in `.env.example` to Production and Preview. The app accepts either the current Supabase publishable key or the legacy anon key. AI requests use `OPENAI_API_KEY`; when it is absent, Vercel AI Gateway is used.

The API routes verify every bearer token with Supabase Auth. Never expose a Supabase secret/service-role key or the OpenAI key through a `NEXT_PUBLIC_` variable.
