import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import notoFontUrl from "@/assets/fonts/NotoSans-Regular.ttf?url";
import { offerLetterRows, type OfferLetterInput } from "./offer-letter";

const W = 595.28, H = 841.89, M = 56;
const navy = rgb(0.082, 0.102, 0.2), blue = rgb(0.184, 0.357, 0.878), muted = rgb(0.39, 0.45, 0.55), rule = rgb(0.886, 0.91, 0.941);

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = w; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Branded one-page Offer Summary & Acceptance Confirmation (static Noto font, no subsetting). */
export async function buildOfferLetterPdf(i: OfferLetterInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await (await fetch(notoFontUrl)).arrayBuffer(), { subset: false });
  doc.setTitle(`Offer Confirmation · ${i.candidateName}`); doc.setProducer("Sundance Professionals");
  const page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: blue });
  let y = H - M - 10;
  page.drawText("SUNDANCE PROFESSIONALS", { x: M, y, size: 10, font, color: blue }); y -= 30;
  page.drawText("Offer Summary & Acceptance Confirmation", { x: M, y, size: 20, font, color: navy }); y -= 22;
  for (const l of wrap(`This document confirms that ${i.candidateName} accepted the offer below for ${i.jobTitle}${i.companyName ? ` at ${i.companyName}` : ""} through Sundance Professionals.`, font, 10.5, W - 2 * M)) { page.drawText(l, { x: M, y, size: 10.5, font, color: muted }); y -= 15; }
  y -= 14;
  for (const [k, v] of offerLetterRows(i)) {
    page.drawLine({ start: { x: M, y: y + 16 }, end: { x: W - M, y: y + 16 }, thickness: 0.6, color: rule });
    page.drawText(k, { x: M, y, size: 10, font, color: muted });
    const lines = wrap(v, font, 11, W - 2 * M - 160);
    lines.forEach((l, n) => page.drawText(l, { x: M + 160, y: y - n * 15, size: 11, font, color: navy }));
    y -= 14 + lines.length * 15;
  }
  if (i.notes.trim()) {
    y -= 10; page.drawText("Additional terms", { x: M, y, size: 12, font, color: navy }); y -= 18;
    for (const l of wrap(i.notes.trim(), font, 10, W - 2 * M).slice(0, 18)) { page.drawText(l, { x: M, y, size: 10, font, color: navy }); y -= 14; }
  }
  if (i.signedName) {
    y -= 24; page.drawText("Candidate signature", { x: M, y, size: 12, font, color: navy }); y -= 30;
    page.drawText(i.signedName, { x: M, y, size: 22, font, color: blue });
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: M + 280, y: y - 6 }, thickness: 0.8, color: navy }); y -= 20;
    page.drawText(`Electronically signed ${i.signedAt ? new Date(i.signedAt).toUTCString().replace("GMT", "UTC") : ""} · typed legal name`, { x: M, y, size: 9, font, color: muted });
  }
  const foot = wrap("Accepted digitally inside Sundance Professionals. The acceptance time above is recorded by the platform and cannot be edited by either party. Keep this confirmation for HR, payroll and onboarding records.", font, 8.5, W - 2 * M);
  foot.forEach((l, n) => page.drawText(l, { x: M, y: M + (foot.length - n) * 12, size: 8.5, font, color: muted }));
  return doc.save();
}
