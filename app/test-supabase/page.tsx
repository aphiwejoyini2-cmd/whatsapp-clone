import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function TestSupabase() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*");

  if (error) {
    return (
      <main>
        <h1>Supabase Error</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Supabase Messages</h1>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}