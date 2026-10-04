import { supabase } from "@/integrations/supabase/client";

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PENDING_KEY = "sundance.pendingAvatar";

/** Returns an error message, or null when the file is an acceptable photo. */
export function validateAvatar(file: { type: string; size: number }): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "Photo must be 5 MB or smaller.";
  return null;
}

/** Square-crop and shrink to a small JPEG data URL. */
export async function toSquareDataUrl(file: Blob, size = 400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Could not read image")); i.src = url;
    });
    const s = Math.min(img.width, img.height);
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

/** Crop a chosen pixel area of an image URL to a square JPEG data URL. */
export async function cropToDataUrl(src: string, area: { x: number; y: number; width: number; height: number }, size = 400): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Could not read image")); i.src = src;
  });
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  c.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.85);
}

async function dataUrlToBlob(d: string) { return (await fetch(d)).blob(); }

/** Upload a photo for the signed-in user and save its path on their profile. */
export async function uploadAvatar(uid: string, dataUrl: string): Promise<string> {
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, await dataUrlToBlob(dataUrl), { contentType: "image/jpeg" });
  if (error) throw error;
  const { data: old } = await supabase.from("profiles").select("avatar_path").eq("user_id", uid).maybeSingle();
  const { error: e2 } = await supabase.from("profiles").update({ avatar_path: path }).eq("user_id", uid);
  if (e2) throw e2;
  if (old?.avatar_path) await supabase.storage.from("avatars").remove([old.avatar_path]);
  return path;
}

export async function removeAvatar(uid: string, path: string) {
  await supabase.from("profiles").update({ avatar_path: null }).eq("user_id", uid);
  await supabase.storage.from("avatars").remove([path]);
}

export async function avatarUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Photo picked at sign-up is kept in the browser until the first sign-in. */
export function savePendingAvatar(dataUrl: string | null) {
  try { if (dataUrl) localStorage.setItem(PENDING_KEY, dataUrl); else localStorage.removeItem(PENDING_KEY); } catch { /* storage full */ }
}

export async function flushPendingAvatar(uid: string, hasAvatar: boolean): Promise<string | null> {
  let d: string | null = null;
  try { d = localStorage.getItem(PENDING_KEY); } catch { return null; }
  if (!d) return null;
  localStorage.removeItem(PENDING_KEY);
  if (hasAvatar) return null;
  try { return await uploadAvatar(uid, d); } catch { return null; }
}
