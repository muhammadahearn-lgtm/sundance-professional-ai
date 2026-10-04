import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { avatarUrl, removeAvatar, toSquareDataUrl, uploadAvatar, validateAvatar } from "@/lib/avatar";

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    if (!path) { setUrl(null); return; }
    avatarUrl(path).then((u) => on && setUrl(u));
    return () => { on = false; };
  }, [path]);
  return url;
}

/** Round/square photo with initials fallback; editable shows change/remove controls. */
export function ProfilePhoto({ uid, path, initials, className = "h-24 w-24 text-2xl", rounded = "rounded-full", editable, onChange }: {
  uid: string; path: string | null | undefined; initials: string; className?: string | undefined; rounded?: string | undefined;
  editable?: boolean | undefined; onChange?: ((path: string | null) => void) | undefined;
}) {
  const url = useAvatarUrl(path);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    const err = validateAvatar(file);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const p = await uploadAvatar(uid, await toSquareDataUrl(file));
      onChange?.(p); toast.success("Photo updated");
    } catch { toast.error("Couldn't upload photo. Please try again."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove() {
    if (!path) return;
    setBusy(true);
    try { await removeAvatar(uid, path); onChange?.(null); toast.success("Photo removed"); }
    catch { toast.error("Couldn't remove photo."); } finally { setBusy(false); }
  }

  return (
    <div className="relative shrink-0">
      <div className={`grid place-items-center overflow-hidden border-4 border-card bg-gradient-primary font-display font-bold text-primary-foreground ${rounded} ${className} ${busy ? "opacity-60" : ""}`}>
        {url ? <img src={url} alt="Profile photo" className="h-full w-full object-cover" /> : initials}
      </div>
      {editable && (
        <>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label={path ? "Change photo" : "Upload photo"}
            className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow hover:opacity-90">
            <Camera className="h-4 w-4" />
          </button>
          {path && (
            <button type="button" disabled={busy} onClick={remove} aria-label="Remove photo"
              className="absolute bottom-0 left-0 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-card text-muted-foreground shadow hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
