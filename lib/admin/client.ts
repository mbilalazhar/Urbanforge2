"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Static portal preview: authentication uses lib/auth/client.ts and remains connected.
export { previewRequest as adminRequest } from "./preview";
import { previewRequest as adminRequest } from "./preview";

export function useAdminQuery<T>(resource: string) {
  return useQuery({ queryKey: ["admin", resource], queryFn: () => adminRequest<T>(resource), staleTime: 20_000, retry: false });
}

export function useAdminMutation(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path = resource, method = "POST", body }: { path?: string; method?: string; body?: unknown }) =>
      adminRequest(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["admin"] }); },
  });
}

export const money = (value: number) => `Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
