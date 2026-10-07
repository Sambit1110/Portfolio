import { PALETTE, TONES } from "@/config/world";

// The site's mark for icons and link previews: the AI Core's cyan crystal on
// ink. Inline styles only, as ImageResponse requires.
export function CoreMark({ size, radius = 0 }: { size: number; radius?: number }) {
  const gem = Math.round(size * 0.42);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: TONES.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: gem,
          height: gem,
          transform: "rotate(45deg)",
          borderRadius: Math.max(1, Math.round(size * 0.05)),
          background: `linear-gradient(135deg, #C9F6F8 0%, ${PALETTE.cyan} 55%)`,
          boxShadow: `0 0 ${Math.round(size * 0.2)}px ${PALETTE.cyan}`,
        }}
      />
    </div>
  );
}
