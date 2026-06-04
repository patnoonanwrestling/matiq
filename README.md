# MatIQ

Coach Noonan's wrestling coaching platform. "Win the scrambles."

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to vercel.com → "Add New" → "Project" → import this repo.
3. Vercel auto-detects Vite. Click "Deploy."
4. Done. Live URL appears in ~30 seconds.

## Local development

```
npm install
npm run dev
```

## Admin access

Footer → "Coach Login" → passcode: `matiq2026`

**Change this passcode** before sharing the URL. Edit `ADMIN_PASSCODE` in `src/App.jsx`.

## Important: data resets on reload

This is a front-end prototype. Bookings, session edits, and availability changes
live in the browser session only. To make data persist, connect to a backend
(Supabase recommended) and Stripe for real card payments.

Venmo & Cash App payment links work today without any backend.
