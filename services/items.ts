import { supabase } from "../lib/supabase";

export async function uploadItemImageAndQueueScan({
  userId,
  itemId,
  file,
}: {
  userId: string;
  itemId: string;
  // Accept browser Blob or Node Buffer for server-side usage
  file: Blob | Buffer | ArrayBuffer;
}) {
  // 1. Upload image
  const filePath = `items/${userId}/${Date.now()}.jpg`;

  // Normalize file to a Blob when running in environments that need it.
  let uploadPayload: any = file;
  try {
    // Node Buffer -> Blob (Node 18+ supports global Blob)
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      // Convert Node Buffer to Uint8Array for Blob compatibility
      uploadPayload = new Blob([Uint8Array.from(file as Buffer)], { type: 'image/jpeg' });
    } else if (file instanceof ArrayBuffer) {
      uploadPayload = new Blob([new Uint8Array(file as ArrayBuffer)], { type: 'image/jpeg' });
    }
  } catch (e) {
    // If conversion fails, fall back to original file and let the SDK/runtime handle it.
    uploadPayload = file;
  }

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(filePath, uploadPayload, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 2. Create background job
  const { error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      type: "scan_image",
      payload: {
        image_path: filePath,
        item_id: itemId,
      },
    });

  if (jobError) throw jobError;

  return filePath;
}
