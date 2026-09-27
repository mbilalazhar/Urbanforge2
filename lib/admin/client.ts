"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("/") ? path : `/api/admin/${path}`;
  const response = await fetch(url, {
    ...options, credentials: "same-origin", cache: "no-store",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Unable to complete the request. Please try again.");
  if (data === null) throw new Error("The server returned an unexpected response.");
  return data as T;
}

export function useAdminQuery<T>(resource: string) {
  return useQuery({ queryKey: ["admin", resource], queryFn: () => adminRequest<T>(resource), staleTime: 20_000, retry: false });
}

export function useAdminMutation(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path = resource, method = "POST", body }: { path?: string; method?: string; body?: unknown }) =>
      adminRequest(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["admin"] }); await client.invalidateQueries({ queryKey: ["catalog"] }); },
  });
}

export const money = (value: number) => `Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
