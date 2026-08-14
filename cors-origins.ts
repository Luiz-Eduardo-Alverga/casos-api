const DEFAULT_CORS_ORIGINS = [
  "https://softflow.hostsoftcom.cloud",
  "http://softflow.hostsoftcom.cloud",
];

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS;
  if (!fromEnv?.trim()) {
    return DEFAULT_CORS_ORIGINS;
  }

  return fromEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
