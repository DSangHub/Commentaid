# Commentaid

AI-powered comment monitoring for creators and businesses. Reads YouTube
comments, detects language, translates, and drafts 3 reply options in the
commenter's own language. Includes a "Try it" box to demo the AI on any comment.

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local dev). See `.env.example`.

| Variable | What it's for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI reply drafting | console.anthropic.com |
| `YOUTUBE_API_KEY` | Reading YouTube comments | Google Cloud → APIs & Services → Credentials |

The Supabase URL + publishable key in `app/lib/supabaseClient.js` are public by
design (protected by row-level security) and are safe to commit.

## Run locally

```
npm install
npm run dev
```

## Deploy

Push to GitHub and import the repo into Vercel (or connect the repo to the
existing Vercel project), then add the environment variables above.
