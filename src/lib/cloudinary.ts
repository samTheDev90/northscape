// Cloudinary upload service.
// Free tier, no API key required for unsigned uploads.

const CLOUD_NAME = "dlvtlt57";
const UPLOAD_PRESET = "Panchagarh-trip";

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export async function uploadImage(file: File): Promise<CloudinaryUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `Image is too large. Maximum is ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    );
  }

  // Send upload_preset both in URL and in body. This is the most
  // reliable way to make Cloudinary use the unsigned preset.
  const url =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload` +
    `?upload_preset=${encodeURIComponent(UPLOAD_PRESET)}`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const json = await res.json();

  return {
    secureUrl: json.secure_url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
    format: json.format,
  };
}

export function cloudinaryThumb(url: string, width = 400): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_fill,q_auto,f_auto/`);
}

export function cloudinaryOptimized(url: string, width = 1600): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace(
    "/upload/",
    `/upload/w_${width},c_limit,q_auto:good,f_auto/`,
  );
}
