import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

// One page: the world and its HTML portfolio share the same URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", SITE_URL).toString(), changeFrequency: "monthly", priority: 1 }];
}
