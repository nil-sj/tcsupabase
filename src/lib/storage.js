import { supabase } from "./supabase";

export async function uploadCustomThumbnail(file, userId) {
  if (!file) throw new Error("No file selected");
  if (!userId) throw new Error("You must be logged in");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";

  const fileName = `${userId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from("thumbnails")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  return fileName;
}

export function getStoragePublicUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function removeCustomThumbnail(path) {
  if (!path) return;

  const { error } = await supabase.storage.from("thumbnails").remove([path]);
  if (error) throw error;
}