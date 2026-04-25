export const providerSpecialties = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Family Medicine",
  "Geriatrics",
  "Internal Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Orthopedics",
  "Pain Management",
  "Pediatrics",
  "Physical Medicine & Rehabilitation",
  "Podiatry",
  "Primary Care",
  "Surgery",
  "Urgent Care",
  "Urology",
  "Wound Care",
] as const;

export type ProviderSpecialty = (typeof providerSpecialties)[number];
