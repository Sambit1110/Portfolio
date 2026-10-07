"use client";

import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/600.css";
import "./globals.css";
import { PROFILE } from "@/content/profile";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Last resort, for errors in the root layout itself. It replaces the layout,
// so it brings its own document, styles and title.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <title>{`${PROFILE.name} · ${PROFILE.role}`}</title>
        <ErrorFallback retry={retry} />
      </body>
    </html>
  );
}
