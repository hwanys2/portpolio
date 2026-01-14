export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiError = { error: any };

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data as ApiError;
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  register: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: { id: string; email: string } | null }>("/auth/me"),

  searchAssets: (q: string) => request<{ results: Array<{ symbol: string; name?: string; exchange?: string; type?: string }> }>(`/assets/search?q=${encodeURIComponent(q)}`),

  createPortfolio: (payload: {
    name: string;
    initialInvestAmount: number;
    items: Array<{ symbol: string; targetWeight: number; tolerance?: number }>;
  }) =>
    request<{ portfolio: { id: string; name: string; initialInvestAmount: number } }>("/portfolios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listPortfolios: () =>
    request<{ portfolios: Array<{ id: string; name: string; initialInvestAmount: number; createdAt: string }> }>("/portfolios"),

  getPortfolio: (id: string) =>
    request<{
      portfolio: {
        id: string;
        name: string;
        initialInvestAmount: number;
        createdAt: string;
        items: Array<{
          id: string;
          targetWeight: number;
          tolerance: number | null;
          entryPrice: number;
          initialQuantity: number;
          currentQuantity: number;
          asset: { id: string; symbol: string; name: string | null };
        }>;
      };
    }>(`/portfolios/${id}`),

  refreshPortfolio: (id: string) =>
    request<{ totalValue: number; items: Array<{ id: string; symbol: string; name: string; latestPrice: number; currentQuantity: number; value: number; targetWeight: number; currentWeight: number; diff: number; tolerance: number | null; bounds: { lower: number; upper: number } | null; outOfRange: boolean }> }>(
      `/portfolios/${id}/refresh`,
      { method: "POST" },
    ),

  updateItem: (portfolioId: string, itemId: string, patch: { currentQuantity?: number; tolerance?: number | null }) =>
    request<{ item: { id: string; currentQuantity: number; tolerance: number | null } }>(`/portfolios/${portfolioId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};


