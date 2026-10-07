import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PALETTE, TONES } from "@/config/world";
import { PROFILE } from "@/content/profile";
import { CoreMark } from "@/components/brand/CoreMark";

// Link preview for social sites and chat apps, generated at build time from
// the profile. Also used for X/Twitter, which falls back to og:image.
export const alt = `${PROFILE.name}, ${PROFILE.role}: an explorable 3D portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// --cyan-ink in globals.css: cyan darkened for text on light backgrounds.
const CYAN_INK = "#127a80";

export default async function OpenGraphImage() {
  const [bold, semibold] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/fredoka-700.woff")),
    readFile(join(process.cwd(), "public/fonts/fredoka-600.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          backgroundImage: `radial-gradient(circle at 86% 24%, rgba(93, 224, 230, 0.32), rgba(93, 224, 230, 0) 34%), linear-gradient(160deg, ${TONES.groundLight} 0%, ${PALETTE.ground} 55%, ${PALETTE.path} 100%)`,
          fontFamily: "Fredoka",
          fontWeight: 600,
          color: TONES.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <CoreMark size={64} radius={16} />
          <span style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: PALETTE.rock }}>Portfolio</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1 }}>{PROFILE.name}</div>
          <div style={{ fontSize: 44, color: CYAN_INK, marginTop: 22 }}>{PROFILE.role}</div>
          <div style={{ fontSize: 32, color: PALETTE.rock, marginTop: 16 }}>{PROFILE.tagline}</div>
        </div>
        <div style={{ fontSize: 26, color: PALETTE.rock }}>Explore it as a 3D world, or read it as a page</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fredoka", data: bold, weight: 700, style: "normal" },
        { name: "Fredoka", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
