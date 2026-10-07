import type { Metadata, Viewport } from "next";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "./globals.css";
import { SITE_URL } from "@/config/site";
import { PROFILE } from "@/content/profile";

const TITLE = `${PROFILE.name} · ${PROFILE.role}`;
const DESCRIPTION = `${PROFILE.role}. ${PROFILE.tagline} Explore projects, skills and experience in an interactive 3D world.`;

// Every field is built from src/content, so search results and link previews
// stay in step with the portfolio. The preview image is app/opengraph-image.
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: TITLE,
  description: DESCRIPTION,
  applicationName: PROFILE.name,
  authors: [{ name: PROFILE.name }],
  creator: PROFILE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: PROFILE.name,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

// viewport-fit=cover exposes the safe-area insets (notches, home indicator);
// resizes-content lets Android shrink the page above the on-screen keyboard.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#e9cba5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
