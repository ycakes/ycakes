import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FOLDER = "reference-images";
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic,heif";

export async function POST(request: Request) {
  // No auth check — guests can order too, so this can't require a session.
  // Abuse is bounded instead by a per-IP rate limit (Postgres RPC, see
  // 20260816150000_reference_image_rate_limit.sql) and by scoping uploads
  // to a dedicated folder + restricted formats.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const supabase = await createClient();
  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_reference_image_upload_rate_limit",
    { p_ip: ip },
  );

  if (rateLimitError) {
    return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // Alphabetical order of signed params, matching Cloudinary's documented
  // signing scheme (same pattern as /api/admin/cloudinary-signature).
  const paramsToSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${FOLDER}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: FOLDER,
    allowedFormats: ALLOWED_FORMATS,
  });
}
