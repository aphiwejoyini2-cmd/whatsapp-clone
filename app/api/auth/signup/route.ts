import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, normalizeUsername, usernameAuthEmail } from "@/lib/auth/username";

export async function POST(request: Request) {
  let payload: { username?: unknown; phone?: unknown; password?: unknown };
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  const username = typeof payload.username === "string" ? normalizeUsername(payload.username) : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim().replace(/[\s()-]/g, "") : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!isValidUsername(username)) return NextResponse.json({ error: "Username must be 3–30 characters using letters, numbers, dots, or underscores. Start and end with a letter or number; do not use consecutive dots." }, { status: 400 });
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Enter a valid contact number in international format." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.createUser({
      email: usernameAuthEmail(username), email_confirm: true, password,
      user_metadata: { username, phone_e164: phone },
    });
    if (error) {
      console.error("Supabase account creation rejected:", error.message);
      const message = /already|registered|exists|users_email_key|duplicate key.*email/i.test(error.message)
        ? "That username is already taken. Choose another username."
        : /simple_messaging_profiles|phone_e164|duplicate key/i.test(error.message)
          ? "An account already uses this contact number."
          : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ created: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SUPABASE_SECRET_KEY is not configured")) {
      return NextResponse.json({ error: "Signup is not configured: the server is missing SUPABASE_SECRET_KEY. Add it to the server environment and restart the app." }, { status: 500 });
    }
    console.error("Account creation failed:", error);
    return NextResponse.json({ error: "Account creation failed. Check the server logs for the Supabase error." }, { status: 500 });
  }
}
