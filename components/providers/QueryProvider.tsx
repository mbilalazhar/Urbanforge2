"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: { retry: false, gcTime: 0 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
