import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DevicePayload = {
  deviceId?: unknown;
  identityKey?: unknown;
  signedPrekey?: unknown;
  signedPrekeySignature?: unknown;
  oneTimePrekeys?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to register this device." }, { status: 401 });

  let payload: DevicePayload;
  try {
    payload = await request.json() as DevicePayload;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof payload.deviceId !== "string" || payload.deviceId.length > 80 ||
      !payload.identityKey || typeof payload.identityKey !== "object" ||
      !payload.signedPrekey || typeof payload.signedPrekey !== "object" ||
      typeof payload.signedPrekeySignature !== "string" ||
      !Array.isArray(payload.oneTimePrekeys) || payload.oneTimePrekeys.length > 100) {
    return NextResponse.json({ error: "Device key bundle is missing required fields." }, { status: 400 });
  }

  const device = {
    user_id: user.id,
    device_id: payload.deviceId,
    identity_key: payload.identityKey,
    signed_prekey: payload.signedPrekey,
    signed_prekey_signature: payload.signedPrekeySignature,
    updated_at: new Date().toISOString(),
  };

  const { error: deviceError } = await supabase.from("messaging_devices").upsert(device, {
    onConflict: "user_id,device_id",
  });
  if (deviceError) return NextResponse.json({ error: deviceError.message }, { status: 500 });

  const prekeys = payload.oneTimePrekeys.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const candidate = value as { keyId?: unknown; publicKey?: unknown };
    if (!Number.isInteger(candidate.keyId) || !candidate.publicKey || typeof candidate.publicKey !== "object") return [];
    return [{
      user_id: user.id,
      device_id: payload.deviceId as string,
      key_id: candidate.keyId as number,
      public_key: candidate.publicKey,
    }];
  });

  if (prekeys.length !== payload.oneTimePrekeys.length) {
    return NextResponse.json({ error: "One or more prekeys were invalid." }, { status: 400 });
  }
  if (prekeys.length) {
    const { error: prekeyError } = await supabase.from("messaging_one_time_prekeys").upsert(prekeys, {
      onConflict: "user_id,device_id,key_id", ignoreDuplicates: true,
    });
    if (prekeyError) return NextResponse.json({ error: prekeyError.message }, { status: 500 });
  }

  return NextResponse.json({ deviceId: payload.deviceId, uploadedPrekeys: prekeys.length });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view registered devices." }, { status: 401 });

  const { data, error } = await supabase.from("messaging_devices")
    .select("device_id, identity_key, signed_prekey, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data });
}
