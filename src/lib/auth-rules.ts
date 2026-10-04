export type Role = "candidate" | "recruiter";

export const ROLES: readonly Role[] = ["candidate", "recruiter"];

export function isRole(v: unknown): v is Role {
  return v === "candidate" || v === "recruiter";
}

export function dashboardPath(role: Role) {
  return role === "candidate" ? "/candidate/dashboard" : "/recruiter/dashboard";
}

export function onboardingPath(role: Role) {
  return role === "candidate" ? "/candidate/onboarding" : "/recruiter/onboarding";
}

/** Which role owns a given app path, or null for public pages. */
export function areaForPath(pathname: string): Role | null {
  if (pathname === "/candidate" || pathname.startsWith("/candidate/")) return "candidate";
  if (pathname === "/recruiter" || pathname.startsWith("/recruiter/")) return "recruiter";
  return null;
}

export function canAccessPath(role: Role | null, pathname: string) {
  const area = areaForPath(pathname);
  if (area === null) return true;
  return role === area;
}

export const MIN_PASSWORD_LENGTH = 8;

export type RegistrationInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  agreed: boolean;
};

export function validateRegistration(i: RegistrationInput): Partial<Record<keyof RegistrationInput, string>> {
  const e: Partial<Record<keyof RegistrationInput, string>> = {};
  if (!i.firstName.trim()) e.firstName = "First name is required.";
  if (!i.lastName.trim()) e.lastName = "Last name is required.";
  if (!i.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) e.email = "Enter a valid email address.";
  if (i.password.length < MIN_PASSWORD_LENGTH) e.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (i.confirm !== i.password) e.confirm = "Passwords do not match.";
  if (!i.agreed) e.agreed = "You must agree to the Terms of Service and Privacy Policy.";
  return e;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

/** Turn raw auth errors into friendly copy. */
export function friendlyAuthError(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password. Please try again.";
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists. Try logging in instead.";
  if (m.includes("email not confirmed")) return "Please verify your email before logging in.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password should")) return "That password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.";
  if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return "This link has expired. Please request a new one.";
  if (m.includes("rate limit") || m.includes("security purposes")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("jwt") || m.includes("session")) return "Your session has expired. Please log in again.";
  return message || "Something went wrong. Please try again.";
}
