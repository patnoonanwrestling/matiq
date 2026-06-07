import { createClient } from "@supabase/supabase-js";

// Supabase credentials come from environment variables set in Vercel.
// Vite exposes any env var prefixed with VITE_ to the browser at build time.
// For local development, create a .env.local file with these values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your Vercel environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
