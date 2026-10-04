import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { avatarUrl, cropToDataUrl, removeAvatar, uploadAvatar, validateAvatar } from "@/lib/avatar";

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

/** Round/square photo with initials fallback; editable shows change/crop/remove controls. */
export function ProfilePhoto({ uid, path, initials, className = "h-24 w-24 text-2xl", rounded = "rounded-full", editable, onChange }: {
  uid: string; path: string | null | undefined; initials: string; className?: string | undefined; rounded?: string | undefined;
  editable?: boolean | undefined; onChange?: ((path: string | null) => void) | undefined;
}) {
  const url = useAvatarUrl(path);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  function openCrop(s: string) { setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); setSrc(s); }

  function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const err = validateAvatar(file);
    if (err) { toast.error(err); return; }
    const r = new FileReader();
    r.onload = () => openCrop(String(r.result));
    r.readAsDataURL(file);
  }
  async function editCurrent() {
    if (!url) return;
    try { const b = await (await fetch(url)).blob(); const r = new FileReader(); r.onload = () => openCrop(String(r.result)); r.readAsDataURL(b); }
    catch { toast.error("Couldn't load photo."); }
  }
  async function save() {
    if (!src || !area) return;
    setBusy(true);
    try {
      const p = await uploadAvatar(uid, await cropToDataUrl(src, area));
      onChange?.(p); setSrc(null); toast.success("Photo updated");
    } catch { toast.error("Couldn't upload photo. Please try again."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!path) return;
    setBusy(true);
    try { await removeAvatar(uid, path); onChange?.(null); toast.success("Photo removed"); }
    catch { toast.error("Couldn't remove photo."); } finally { setBusy(false); }
  }

  const round = rounded === "rounded-full";
  return (
    <div className="relative shrink-0">
      <button type="button" disabled={!editable || busy} onClick={() => (url ? editCurrent() : input.current?.click())}
        aria-label={editable ? (url ? "Edit photo" : "Upload photo") : "Profile photo"}
        className={`group relative grid place-items-center overflow-hidden border-4 border-card bg-gradient-primary font-display font-bold text-primary-foreground ${rounded} ${className} ${busy ? "opacity-60" : ""} ${editable ? "cursor-pointer" : "cursor-default"}`}>
        {url ? <img src={url} alt="Profile photo" className="h-full w-full object-cover" /> : initials}
        {editable && (
          <span className="absolute inset-0 grid place-items-center bg-foreground/50 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />{url ? "Edit" : "Upload"}</span>
          </span>
        )}
      </button>
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
          <Dialog open={!!src} onOpenChange={(o) => !o && !busy && setSrc(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Edit profile photo</DialogTitle></DialogHeader>
              <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
                {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape={round ? "round" : "rect"} showGrid={false}
                  onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} aria-label="Zoom" />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>Choose another</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setSrc(null)} disabled={busy}>Cancel</Button>
                  <Button type="button" onClick={save} disabled={busy || !area}>{busy ? "Saving…" : "Save photo"}</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
