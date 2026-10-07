// Browser-only: extracts plain text from a resume file (PDF, DOCX, TXT).
// Libraries are loaded lazily so they never run during server rendering.
import { RESUME_FILE_MAX_BYTES } from "./resume-parse";

export type ResumeKind = "pdf" | "docx" | "txt";

export function resumeKind(file: { name: string; type: string }): ResumeKind | null {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || n.endsWith(".docx")) return "docx";
  if (file.type === "text/plain" || n.endsWith(".txt")) return "txt";
  return null;
}

export function validateResumeUpload(file: { name: string; type: string; size: number }): string | null {
  if (!resumeKind(file)) return "Please upload a PDF, Word (.docx) or plain text file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > RESUME_FILE_MAX_BYTES) return "Resume files must be 5 MB or smaller.";
  return null;
}

export async function extractResumeText(file: File): Promise<string> {
  const kind = resumeKind(file);
  if (kind === "txt") return file.text();
  if (kind === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (kind === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      let line = ""; const lines: string[] = [];
      for (const it of content.items) {
        if (!("str" in it)) continue;
        line += it.str;
        if (it.hasEOL) { lines.push(line); line = ""; } else line += " ";
      }
      if (line.trim()) lines.push(line);
      pages.push(lines.join("\n"));
    }
    return pages.join("\n\n");
  }
  throw new Error("Unsupported file type");
}
