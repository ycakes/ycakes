export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
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

  const data = (await uploadResponse.json()) as { secure_url: string };
  return data.secure_url;
}
