'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={400}>
          {children}
          <Toaster
            position="top-right"
            theme="system"
            richColors
            closeButton
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
