import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let payload: { phone?: unknown; password?: unknown; code?: unknown };
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{6}$/.test(code) || password.length < 6) {
    return NextResponse.json({ error: "Phone, password, or verification code is invalid." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: record, error: lookupError } = await supabase.from("signup_otps")
      .select("otp_hash, expires_at, attempts").eq("phone_e164", phone).maybeSingle();
    if (lookupError) throw new Error("Could not check the verification code.");
    if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
      if (record) await supabase.from("signup_otps").delete().eq("phone_e164", phone);
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }
    if (record.attempts >= 5) return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });

    const expected = Buffer.from(record.otp_hash, "hex");
    const actual = Buffer.from(createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${phone}:${code}`).digest("hex"), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await supabase.from("signup_otps").update({ attempts: record.attempts + 1 }).eq("phone_e164", phone);
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    const { data, error } = await supabase.auth.admin.createUser({ phone, password, phone_confirm: true });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Could not create your account." }, { status: 400 });
    await supabase.from("signup_otps").delete().eq("phone_e164", phone);
    return NextResponse.json({ created: true });
  } catch (error) {
    console.error("Signup verification failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify the code." }, { status: 500 });
  }
}
