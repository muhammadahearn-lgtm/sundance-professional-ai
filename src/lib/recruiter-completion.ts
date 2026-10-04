export const RECRUITER_SUMMARY_MAX = 2000;
export const COMPANY_DESCRIPTION_MAX = 5000;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type RecruiterInput = {
  firstName: string; lastName: string; title: string; location: string; yearsExperience: number;
  specialization: string; secondaryCount: number; candidateTypeCount: number;
  industryCount: number; summary: string;
  hasCompany: boolean; companyComplete: boolean;
};

/** Weights total 100: professional 30, specialization 20, industry 15, company 20, summary 15. */
export function computeRecruiterCompletion(i: RecruiterInput) {
  const proFields = [i.firstName, i.lastName, i.title, i.location].filter((s) => s.trim()).length + (i.yearsExperience > 0 ? 1 : 0);
  const professional = Math.round((proFields / 5) * 30);
  const specialization = (i.specialization.trim() ? 10 : 0) + (i.secondaryCount + i.candidateTypeCount > 0 ? 10 : 0);
  const industry = i.industryCount > 0 ? 15 : 0;
  const company = i.hasCompany ? (i.companyComplete ? 20 : 10) : 0;
  const summary = i.summary.trim() ? 15 : 0;
  const percent = professional + specialization + industry + company + summary;
  const suggestions: string[] = [];
  if (professional < 30) suggestions.push("Complete your professional information.");
  if (!i.specialization.trim() || i.secondaryCount + i.candidateTypeCount === 0) suggestions.push("Add recruiting specializations.");
  if (!industry) suggestions.push("Add industry focus.");
  if (company < 20) suggestions.push("Add company information.");
  if (!summary) suggestions.push("Write a professional summary.");
  return { percent, suggestions };
}

export function validateRecruiter(f: { first_name: string; last_name: string; title: string; company_name: string; location: string; specialization: string; summary: string }) {
  const e: Partial<Record<keyof typeof f, string>> = {};
  if (!f.first_name.trim()) e.first_name = "First name is required.";
  if (!f.last_name.trim()) e.last_name = "Last name is required.";
  if (!f.title.trim()) e.title = "Recruiter title is required.";
  if (!f.company_name.trim()) e.company_name = "Company is required.";
  if (!f.location.trim()) e.location = "Location is required.";
  if (!f.specialization.trim()) e.specialization = "Recruiting specialization is required.";
  if (f.summary.length > RECRUITER_SUMMARY_MAX) e.summary = `Keep it under ${RECRUITER_SUMMARY_MAX} characters.`;
  return e;
}

export function validateCompany(f: { company_name: string; industry: string; organization_type: string; description: string }) {
  const e: Partial<Record<keyof typeof f, string>> = {};
  if (!f.company_name.trim()) e.company_name = "Company name is required.";
  if (!f.industry.trim()) e.industry = "Industry is required.";
  if (!f.organization_type.trim()) e.organization_type = "Organization type is required.";
  if (!f.description.trim()) e.description = "Description is required.";
  else if (f.description.length > COMPANY_DESCRIPTION_MAX) e.description = `Keep it under ${COMPANY_DESCRIPTION_MAX} characters.`;
  return e;
}

export function validateImageFile(f: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(f.type)) return "Please upload a PNG, JPG or WEBP image.";
  if (f.size > IMAGE_MAX_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}
