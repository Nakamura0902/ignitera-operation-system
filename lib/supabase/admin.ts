import { createClient } from "@supabase/supabase-js";

// Service-role client — server-side only, bypasses RLS
// Used pre-auth until Supabase Auth is wired up
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
