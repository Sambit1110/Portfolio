import { ImageResponse } from "next/og";
import { CoreMark } from "@/components/brand/CoreMark";

// Browser tab icon, generated at build time. 48 px: search engines want a
// multiple of 48, and browsers scale it down for the tab.
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<CoreMark size={48} radius={10} />, size);
}
