export type EmployeeExperience = "bdr" | "sdr" | "account-manager" | "support" | "generic";

export function getEmployeeExperience(userRole?: string | null, jobTitle?: string | null): EmployeeExperience | null {
  const role = (userRole || "").toLowerCase();
  const title = (jobTitle || "").toLowerCase();

  if (role === "support_staff") return "support";
  if (role !== "marketing_staff") return null;
  if (title.includes("bdr") || title.includes("business development")) return "bdr";
  if (title.includes("sdr") || title.includes("sales development")) return "sdr";
  if (title.includes("account manager")) return "account-manager";
  return "generic";
}

export function getEmployeeRoute(userRole?: string | null, jobTitle?: string | null) {
  const experience = getEmployeeExperience(userRole, jobTitle);
  if (!experience) return null;
  return `/employee/${experience}`;
}

export function getRoleBadge(jobTitle?: string | null) {
  const experience = getEmployeeExperience("marketing_staff", jobTitle);
  if (experience === "bdr") return "BDR";
  if (experience === "sdr") return "SDR";
  if (experience === "account-manager") return "Account Manager";
  return "Employee";
}
