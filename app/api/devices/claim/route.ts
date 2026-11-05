import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to request a prekey bundle." }, { status: 401 });

  let body: { userId?: unknown; deviceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.userId !== "string" || typeof body.deviceId !== "string" || body.deviceId.length > 80) {
    return NextResponse.json({ error: "A recipient userId and deviceId are required." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("claim_messaging_prekey", {
    target_user_id: body.userId,
    target_device_id: body.deviceId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "That device is not registered." }, { status: 404 });
  return NextResponse.json({ bundle: data[0] });
}
