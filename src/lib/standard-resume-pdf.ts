import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import notoFontUrl from "@/assets/fonts/NotoSans-Variable.ttf?url";
import type { StandardResumeSection, StandardResumeSnapshot } from "./standard-resume";
import { STANDARD_RESUME_SECTION_LABELS } from "./standard-resume";

type Photo = { bytes: ArrayBuffer; type: string } | null;
const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const navy = rgb(0.082, 0.102, 0.2), blue = rgb(0.184, 0.357, 0.878), muted = rgb(0.34, 0.38, 0.45), pale = rgb(0.91, 0.94, 1);

function clean(v: string) { return v.replace(/\s+/g, " ").trim(); }
function period(v: { start: string | null; end: string | null; current: boolean }) {
  const f = (d: string | null) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  return [f(v.start), v.current ? "Present" : f(v.end)].filter(Boolean).join(" – ");
}

export async function createStandardResumePdf(snapshot: StandardResumeSnapshot, sections: StandardResumeSection[], photo: Photo): Promise<Uint8Array> {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const fontBytes = await fetch(notoFontUrl).then((r) => r.arrayBuffer());
  const font = await doc.embedFont(fontBytes, { subset: true });
  let page = doc.addPage([PAGE.width, PAGE.height]); let y = PAGE.height - PAGE.margin;
  const usable = PAGE.width - PAGE.margin * 2;
  const lineHeight = (size: number) => size * 1.35;
  const wrap = (text: string, size: number, max = usable) => {
    const words = clean(text).split(" ").filter(Boolean); const lines: string[] = []; let line = "";
    for (const word of words) { const next = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(next, size) <= max) line = next; else { if (line) lines.push(line); line = word; } }
    if (line) lines.push(line); return lines;
  };
  const need = (height: number) => { if (y - height >= PAGE.margin) return; page = doc.addPage([PAGE.width, PAGE.height]); y = PAGE.height - PAGE.margin; };
  const text = (value: string, size = 9.5, color = navy, x = PAGE.margin, max = usable) => {
    const lines = wrap(value, size, max); need(lines.length * lineHeight(size) + 4);
    for (const line of lines) { page.drawText(line, { x, y, size, font, color }); y -= lineHeight(size); }
  };
  const heading = (value: string) => { need(34); y -= 8; page.drawText(value.toUpperCase(), { x: PAGE.margin, y, size: 9, font, color: blue }); y -= 8; page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1, color: pale }); y -= 16; };
  const item = (title: string, meta: string, body?: string, detail?: string) => { need(52); text(title, 10.5); if (meta) text(meta, 8.5, muted); if (body) { y -= 2; text(body, 9); } if (detail) { y -= 2; text(detail, 8.5, muted); } y -= 7; };

  let photoWidth = 0;
  if (photo) {
    try {
      const img = photo.type.includes("png") ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
      const dim = img.scaleToFit(60, 60); page.drawImage(img, { x: PAGE.width - PAGE.margin - 60, y: y - 58, width: dim.width, height: dim.height }); photoWidth = 78;
    } catch { photoWidth = 0; }
  }
  text(snapshot.name, 24, navy, PAGE.margin, usable - photoWidth); y += 1;
  text(snapshot.headline, 11, blue, PAGE.margin, usable - photoWidth);
  const contact = [snapshot.location, ...snapshot.links.map((l) => l.url.replace(/^https?:\/\//, ""))].filter(Boolean).join("  •  ");
  if (contact) text(contact, 8.5, muted, PAGE.margin, usable - photoWidth);
  y -= 12;

  for (const section of sections) {
    if (section === "summary" && snapshot.summary) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.summary); }
    if (section === "experience" && snapshot.experience.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); snapshot.experience.forEach((e) => item(`${e.title} · ${e.company}`, [e.location, period(e)].filter(Boolean).join(" · "), e.responsibilities, [e.achievements && `Achievements: ${e.achievements}`, e.technologies.length && `Tools: ${e.technologies.join(", ")}`].filter(Boolean).join(" · "))); }
    if (section === "skills" && snapshot.skills.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.skills.join("  •  ")); }
    if (section === "technologies" && snapshot.technologies.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.technologies.join("  •  ")); }
    if (section === "programming_languages" && snapshot.programmingLanguages.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.programmingLanguages.join("  •  ")); }
    if (section === "soft_skills" && snapshot.softSkills.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.softSkills.join("  •  ")); }
    if (section === "education" && snapshot.education.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); snapshot.education.forEach((e) => item([e.degree, e.field].filter(Boolean).join(" in "), [e.institution, e.year].filter(Boolean).join(" · "))); }
    if (section === "certifications" && snapshot.certifications.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); snapshot.certifications.forEach((c) => item(c.name, [c.issuer, c.issued].filter(Boolean).join(" · "))); }
    if (section === "spoken_languages" && snapshot.spokenLanguages.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); text(snapshot.spokenLanguages.map((l) => `${l.name} — ${l.proficiency}`).join("  •  ")); }
    if (section === "projects" && snapshot.projects.length) { heading(STANDARD_RESUME_SECTION_LABELS[section]); snapshot.projects.forEach((p) => item(p.title, p.url.replace(/^https?:\/\//, ""), p.description, p.technologies.join(", "))); }
  }
  doc.setTitle(`${snapshot.name} — Sundance Standard Resume`); doc.setAuthor(snapshot.name); doc.setSubject("Professional resume generated from candidate-confirmed profile information");
  return doc.save();
}
