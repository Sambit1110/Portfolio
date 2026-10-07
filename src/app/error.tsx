"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Unexpected errors anywhere in the page land here instead of a blank screen.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback retry={retry} />;
}
