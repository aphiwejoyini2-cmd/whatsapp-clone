import { createHmac, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MS = 30 * 60 * 1000;

function otpHash(phone: string, code: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase admin credentials are not configured.");
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

async function sendAppimateSms(phone: string, message: string) {
  const apiKey = process.env.APPIMATE_API_KEY;
  const password = process.env.APPIMATE_API_PASSWORD;
  if (!apiKey || !password) throw new Error("Appimate credentials are not configured.");

  const authResponse = await fetch("https://api.appimate.com/api/authentication/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ in_App: "business", in_AppimateID: apiKey, in_Password: password }),
    cache: "no-store",
  });
  let auth: { success?: unknown; msg?: unknown; data?: { accessToken?: unknown } };
  try {
    auth = await authResponse.json();
  } catch {
    console.error("Appimate auth returned non-JSON:", {
      status: authResponse.status,
      contentType: authResponse.headers.get("content-type"),
    }); 
    throw new Error("Appimate authentication returned an unreadable response.");
  }
  const accessToken = auth?.data?.accessToken;
  if (!authResponse.ok || !auth?.success || typeof accessToken !== "string") {
    console.error("Appimate auth rejected:", {
      status: authResponse.status,
      success: auth?.success === true,
      responseFields: Object.keys(auth ?? {}),
      dataFields: auth?.data && typeof auth.data === "object" ? Object.keys(auth.data) : [],
      accessTokenType: typeof accessToken,
      providerMessage: typeof auth?.msg === "string" ? auth.msg.slice(0, 300) : undefined,
    });
    throw new Error("Appimate authentication failed.");
  }

  const smsResponse = await fetch("https://api.appimate.com/api/notifications?appType=business&sms=true&thirdParty=true&priority=0", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ thirdParty: true, sms: true, priority: 0 , phone, message }),
    cache: "no-store",
  });
  let sms: { success?: unknown; msg?: unknown; msg2?: unknown; msg3?: unknown };
  try {
    sms = await smsResponse.json();
  } catch {
    console.error("Appimate SMS returned non-JSON:", {
      status: smsResponse.status,
      contentType: smsResponse.headers.get("content-type"),
    });
    throw new Error("Appimate returned an unreadable SMS response.");
  }
  if (!smsResponse.ok || sms?.success !== true) {
    console.error("Appimate SMS rejected:", {
      status: smsResponse.status,
      success: sms?.success === true,
      providerMessage: typeof sms?.msg === "string" ? sms.msg.slice(0, 300) : undefined,
      providerDetails: typeof sms?.msg2 === "string" ? sms.msg2.slice(0, 300) : undefined,
    });
    throw new Error("Appimate could not send the SMS.");
  }
}

export async function POST(request: Request) {
  let payload: { phone?: unknown; password?: unknown };
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Enter a valid international phone number." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  try {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await sendAppimateSms(phone, `Your WhatsApp Clone verification code is ${code}. It expires in 30 minutes.`);
    const supabase = createAdminClient();
    const { error: cleanupError } = await supabase.from("signup_otps").delete().lte("expires_at", new Date().toISOString());
    if (cleanupError) {
      console.error("Expired OTP cleanup failed:", { code: cleanupError.code, message: cleanupError.message });
      throw new Error("Could not prepare OTP storage.");
    }
    const { error } = await supabase.from("signup_otps").upsert({
      phone_e164: phone,
      otp_hash: otpHash(phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Signup OTP database write failed:", { code: error.code, message: error.message });
      throw new Error("Could not save the verification code.");
    }
    return NextResponse.json({ sent: true, expiresInSeconds: OTP_TTL_MS / 1000 });
  } catch (error) {
    console.error("Signup SMS failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send verification code." }, { status: 500 });
  }
}
