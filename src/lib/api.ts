const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("auth-storage");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.accessToken || null;
  } catch {
    return null;
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (response.status === 401) {
    // Try refresh
    const refreshStored = localStorage.getItem("auth-storage");
    const refreshParsed = refreshStored ? JSON.parse(refreshStored) : null;
    const refreshToken = refreshParsed?.state?.refreshToken;
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();
        const stored = localStorage.getItem("auth-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = accessToken;
          localStorage.setItem("auth-storage", JSON.stringify(parsed));
        }
        headers["Authorization"] = `Bearer ${accessToken}`;
        return fetch(`${BASE_URL}${url}`, { ...options, headers });
      }
    }
  }
  return response;
}

export const api = {
  get: (url: string) => fetchWithAuth(url),
  post: (url: string, body: unknown) =>
    fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url: string, body: unknown) =>
    fetchWithAuth(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: (url: string, body: unknown) =>
    fetchWithAuth(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url: string) => fetchWithAuth(url, { method: "DELETE" }),
};
