import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, normalizeUsername, usernameAuthEmail } from "@/lib/auth/username";

export async function PATCH(request: Request) {
  const auth = await createClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to change your username." }, { status: 401 });
  let payload: { username?: unknown };
  try { payload = await request.json() as { username?: unknown }; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const username = typeof payload.username === "string" ? normalizeUsername(payload.username) : "";
  if (!isValidUsername(username)) return NextResponse.json({ error: "Enter a valid username (3–30 letters, numbers, dots, or underscores)." }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { email: usernameAuthEmail(username), user_metadata: { ...user.user_metadata, username } });
  if (error) {
    const message = /already|registered|exists|duplicate|users_email_key/i.test(error.message) ? "That username is already taken." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ username });
}