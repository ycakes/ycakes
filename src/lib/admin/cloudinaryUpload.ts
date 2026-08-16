export type CloudinaryUploadResult = { url: string; publicId: string };

export async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryUploadResult> {
  const sigResponse = await fetch("/api/admin/cloudinary-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });

  if (!sigResponse.ok) {
    throw new Error("Failed to get upload signature");
  }

  const { signature, timestamp, apiKey, cloudName } = (await sigResponse.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = (await uploadResponse.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}

/** Deletes a Cloudinary asset. Safe to call even if the asset is already gone. */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await fetch("/api/admin/cloudinary-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });
}
