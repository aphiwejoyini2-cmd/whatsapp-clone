
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,//bzimjswstfkiayotkpcs.supabase.co
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key