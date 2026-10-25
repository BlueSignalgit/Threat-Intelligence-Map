export interface Indicator {
  ip: string;
  port: number;
  malware: string;
  country: string;
  status: string;
  firstSeen: string;
  lastSeen: string;
  source: string;
  location?: { lat: number; lon: number; country: string };
}
export interface Vulnerability {
  id: string;
  vendor: string;
  product: string;
  title: string;
  description: string;
  dateAdded: string;
  dueDate: string;
  action: string;
  ransomware: string;
  source: string;
}
export interface Source {
  status: string;
  lastSuccess: string | null;
  count: number;
  url: string;
  error?: string;
}
export interface Intelligence {
  generatedAt: string;
  indicators: Indicator[];
  vulnerabilities: Vulnerability[];
  sources: Record<string, Source>;
}
export const matches = (query: string, fields: unknown[]) =>
  fields.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
export function validateData(data: unknown): Intelligence {
  if (!data || typeof data !== "object")
    throw new Error("Invalid intelligence response");
  const d = data as Intelligence;
  if (
    !Array.isArray(d.indicators) ||
    !Array.isArray(d.vulnerabilities) ||
    !d.sources ||
    typeof d.generatedAt !== "string"
  )
    throw new Error("Invalid intelligence schema");
  return d;
}
export function sourceFresh(source?: Source, timestamp = Date.now()) {
  return (
    source?.status === "ok" &&
    !!source.lastSuccess &&
    timestamp - Date.parse(source.lastSuccess) < 48 * 60 * 60 * 1000
  );
}
