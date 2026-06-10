"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,  // 5 min — don't refetch if data is fresh
            gcTime: 10 * 60 * 1000,    // 10 min — keep unused data in memory
            retry: 1,
            refetchOnWindowFocus: false, // don't refetch just because user switched tabs
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}