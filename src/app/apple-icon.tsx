import { ImageResponse } from "next/og";
import { CoreMark } from "@/components/brand/CoreMark";

// Home-screen icon for iOS, which rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<CoreMark size={180} />, size);
}
