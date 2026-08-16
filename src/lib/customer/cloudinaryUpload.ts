export type CloudinaryUploadResult = { url: string; publicId: string };

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export class ReferenceImageUploadError extends Error {
  constructor(public reason: "invalidType" | "tooLarge" | "rateLimited" | "uploadFailed") {
    super(reason);
  }
}

/** Uploads a customer-submitted reference image (Cake Detail's reference-photo
 * field). Unauthenticated by design — guests can order — so abuse is bounded
 * server-side by a per-IP rate limit rather than a login requirement. */
export async function uploadReferenceImage(file: File): Promise<CloudinaryUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new ReferenceImageUploadError("invalidType");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ReferenceImageUploadError("tooLarge");
  }

  const sigResponse = await fetch("/api/reference-image/cloudinary-signature", { method: "POST" });

  if (sigResponse.status === 429) {
    throw new ReferenceImageUploadError("rateLimited");
  }
  if (!sigResponse.ok) {
    throw new ReferenceImageUploadError("uploadFailed");
  }

  const { signature, timestamp, apiKey, cloudName, folder, allowedFormats } = (await sigResponse.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
    allowedFormats: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("allowed_formats", allowedFormats);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new ReferenceImageUploadError("uploadFailed");
  }

  const data = (await uploadResponse.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}
