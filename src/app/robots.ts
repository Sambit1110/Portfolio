import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

// Everything is public except the AI guide's API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
