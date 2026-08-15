import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { publicId } = (await request.json()) as { publicId?: string };
  if (!publicId) {
    return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", process.env.CLOUDINARY_API_KEY!);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const deleteResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: "POST", body: formData },
  );

  if (!deleteResponse.ok) {
    // Best-effort cleanup — don't block the admin's actual action on Cloudinary being reachable.
    return NextResponse.json({ error: "Cloudinary delete failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
