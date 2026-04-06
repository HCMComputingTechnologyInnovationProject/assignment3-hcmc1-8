const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl.replace(/\/$/, "") : "";

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, init);

  if (!response.ok) {
    const rawText = await response.text();
    let message = rawText;
    let parsedBody: { detail?: string; message?: string } | undefined;

    try {
      parsedBody = JSON.parse(rawText) as { detail?: string; message?: string };
      message = parsedBody.detail ?? parsedBody.message ?? rawText;
    } catch {
      // Fall back to the raw response text when the backend does not return JSON.
    }

    throw new ApiError(
      message || `Request failed with status ${response.status}`,
      response.status,
      parsedBody ?? rawText,
    );
  }

  return response.json() as Promise<T>;
}
