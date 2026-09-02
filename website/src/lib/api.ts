const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, "")
  : process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "";

export function apiUrl(path: `/api${string}`): string {
  return `${API_BASE_URL}${path}`;
}
