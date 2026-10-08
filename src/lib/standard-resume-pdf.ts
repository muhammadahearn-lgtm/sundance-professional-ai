import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import notoFontUrl from "@/assets/fonts/NotoSans-Variable.ttf?url";
import type { StandardResumeSection, StandardResumeSnapshot } from "./standard-resume";
import { splitResumeColumns, resumePeriod } from "./standard-resume";

type Photo = { bytes: ArrayBuffer; type: string } | null;
// A4 portrait in points.
const W = 595.28, H = 841.89, M = 36;
const SIDE_W = 190; // sidebar ~32%
const GAP = 22;
const navy = rgb(0.082, 0.102, 0.2), blue = rgb(0.184, 0.357, 0.878), muted = rgb(0.38, 0.42, 0.5), sideBg = rgb(0.955, 0.965, 0.99), rule = rgb(0.86, 0.89, 0.97);

function clean(v: string) { return v.replace(/\s+/g, " ").trim(); }

async function browserImageAsPng(photo: NonNullable<Photo>): Promise<ArrayBuffer | null> {
  if (photo.type.includes("png") || photo.type.includes("jpeg") || photo.type.includes("jpg")) return null;
  try {
    const bitmap = await createImageBitmap(new Blob([photo.bytes], { type: photo.type }));
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0); bitmap.close();
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return png ? png.arrayBuffer() : null;
  } catch { return null; }
}

/** A column that flows across pages independently. */
class Column {
  y: number; pageIndex = 0;
  constructor(private pages: PDFPage[], private addPage: () => PDFPage, private font: PDFFont, public x: number, public width: number, startY: number) { this.y = startY; }
  get page() { return this.pages[this.pageIndex]!; }
  need(h: number) { if (this.y - h >= M) return; this.pageIndex++; if (!this.pages[this.pageIndex]) this.addPage(); this.y = H - M; }
  wrap(text: string, size: number) {
    const words = clean(text).split(" ").filter(Boolean); const lines: string[] = []; let line = "";
    for (const w of words) { const next = line ? `${line} ${w}` : w; if (this.font.widthOfTextAtSize(next, size) <= this.width) line = next; else { if (line) lines.push(line); line = w; } }
    if (line) lines.push(line); return lines;
  }
  text(value: string, size = 9, color = navy, lh = 1.4) {
    if (!clean(value)) return;
    for (const line of this.wrap(value, size)) { this.need(size * lh); this.page.drawText(line, { x: this.x, y: this.y - size, size, font: this.font, color }); this.y -= size * lh; }
  }
  heading(label: string) {
    this.need(40); this.y -= 6;
    this.page.drawText(label.toUpperCase(), { x: this.x, y: this.y - 8.5, size: 8.5, font: this.font, color: blue });
    this.y -= 14; this.page.drawLine({ start: { x: this.x, y: this.y }, end: { x: this.x + this.width, y: this.y }, thickness: 0.8, color: rule }); this.y -= 8;
  }
  sub(label: string) { this.need(28); this.y -= 2; this.text(label.toUpperCase(), 7, muted); this.y -= 1; }
  space(h: number) { this.y -= h; }
}

export async function createStandardResumePdf(snapshot: StandardResumeSnapshot, sections: StandardResumeSection[], photo: Photo): Promise<Uint8Array> {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await fetch(notoFontUrl).then((r) => r.arrayBuffer()), { subset: true });
  const pages: PDFPage[] = [];
  const addPage = () => { const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: M + SIDE_W + GAP / 2, height: H, color: sideBg }); pages.push(p); return p; };
  const first = addPage();

  // Header (full width, sits on top of both columns)
  let photoW = 0;
  if (photo) {
    try {
      const converted = await browserImageAsPng(photo);
      const img = photo.type.includes("png") || converted ? await doc.embedPng(converted ?? photo.bytes) : await doc.embedJpg(photo.bytes);
      const d = img.scaleToFit(64, 64); first.drawImage(img, { x: M, y: H - M - d.height, width: d.width, height: d.height }); photoW = 80;
    } catch { photoW = 0; }
  }
  const header = new Column(pages, addPage, font, M + photoW, W - M * 2 - photoW, H - M);
  header.text(snapshot.name, 22, navy, 1.2);
  header.text(snapshot.headline, 11, blue, 1.4);
  if (snapshot.location) header.text(snapshot.location, 8.5, muted);
  const headerBottom = Math.min(header.y, photoW ? H - M - 64 : header.y) - 12;
  first.drawLine({ start: { x: M, y: headerBottom }, end: { x: W - M, y: headerBottom }, thickness: 1.5, color: blue });
  const top = headerBottom - 14;

  const { side, main } = splitResumeColumns(sections);
  const s = new Column(pages, addPage, font, M, SIDE_W - 6, top);
  const m = new Column(pages, addPage, font, M + SIDE_W + GAP, W - M * 2 - SIDE_W - GAP, top);

  // Sidebar
  for (const block of side) {
    if (block === "education" && (snapshot.education.length || snapshot.certifications.length)) {
      s.heading(sections.includes("certifications") && snapshot.certifications.length ? "Education & Certifications" : "Education");
      snapshot.education.forEach((e) => { s.text([e.degree, e.field].filter(Boolean).join(" in "), 9); s.text([e.institution, e.year].filter(Boolean).join(" · "), 8, muted); s.space(5); });
      if (sections.includes("certifications")) snapshot.certifications.forEach((c) => { s.text(c.name, 9); s.text([c.issuer, c.issued?.slice(0, 4)].filter(Boolean).join(" · "), 8, muted); s.space(5); });
    }
    if (block === "skills") {
      const groups: [string, string[]][] = [
        ["Technical skills", sections.includes("skills") ? snapshot.skills : []],
        ["Programming languages", sections.includes("programming_languages") ? snapshot.programmingLanguages : []],
        ["Tools & technologies", sections.includes("technologies") ? snapshot.technologies : []],
        ["Soft skills", sections.includes("soft_skills") ? snapshot.softSkills : []],
        ["Languages", sections.includes("spoken_languages") ? snapshot.spokenLanguages.map((l) => `${l.name} (${l.proficiency})`) : []],
      ];
      const filled = groups.filter(([, v]) => v.length);
      if (filled.length) { s.heading("Skills & Languages"); filled.forEach(([label, v]) => { s.sub(label); s.text(v.join(" · "), 8.5); s.space(5); }); }
    }
  }

  // Main
  for (const block of main) {
    if (block === "summary" && snapshot.summary) { m.heading("Profile"); m.text(snapshot.summary, 9.5, navy, 1.45); }
    if (block === "experience") {
      const exp = sections.includes("experience") ? snapshot.experience : [];
      const proj = sections.includes("projects") ? snapshot.projects : [];
      if (exp.length || proj.length) {
        m.heading(proj.length && exp.length ? "Experience & Projects" : exp.length ? "Experience" : "Projects");
        exp.forEach((e) => {
          m.need(40); m.text(e.title, 10.5); m.text([e.company, e.location].filter(Boolean).join(" · ") + (resumePeriod(e) ? `   ${resumePeriod(e)}` : ""), 8.5, muted);
          m.space(2); m.text(e.responsibilities, 9);
          if (e.technologies.length) m.text(e.technologies.join(" · "), 8, muted);
          m.space(8);
        });
        if (proj.length) { if (exp.length) m.sub("Projects"); proj.forEach((p) => { m.need(30); m.text(p.title, 10); m.text(p.description, 9); if (p.technologies.length) m.text(p.technologies.join(" · "), 8, muted); m.space(6); }); }
      }
    }
  }

  doc.setTitle(`${snapshot.name} — Sundance Standard Resume`); doc.setAuthor(snapshot.name); doc.setSubject("Professional resume generated from candidate-confirmed profile information");
  return doc.save();
}
