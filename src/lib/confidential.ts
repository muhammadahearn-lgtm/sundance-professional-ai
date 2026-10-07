export const CONFIDENTIAL_DEFAULT = "Confidential Client";

/** Label candidates see instead of the real company name on a confidential job. */
export function confidentialName(label: string | null | undefined): string {
  const l = (label ?? "").trim().replace(/\s+/g, " ");
  return l || CONFIDENTIAL_DEFAULT;
}

type Co = Record<string, unknown> & { company_name?: string };

/** Candidate view of a company on a confidential job: real name, logo, website and contact removed. */
export function maskCompany<C extends Co | null | undefined>(c: C, job: { is_confidential?: boolean | null; confidential_label?: string | null }): C {
  if (!job.is_confidential) return c;
  const base = (c ?? {}) as Co;
  return {
    ...base, company_id: "confidential", company_name: confidentialName(job.confidential_label), logo_url: null, banner_url: null, gallery_urls: [],
    website: "", description: "", why_work_here: "", headquarters: "", contact_email: "", confidential: true,
  } as unknown as C;
}

/** Applies maskCompany to a job row that embeds `companies`. */
export function maskJobRow<T extends { is_confidential?: boolean | null; confidential_label?: string | null; companies?: unknown }>(row: T): T {
  if (!row.is_confidential) return row;
  return { ...row, companies: maskCompany(row.companies as Co | null, row) };
}
