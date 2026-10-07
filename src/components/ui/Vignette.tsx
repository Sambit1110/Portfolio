// Soft dusk-violet vignette over the world: frames the centre like a diorama
// photograph. Pure CSS, so it costs nothing on the GPU.
export function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        background:
          "radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgba(122,106,156,0.18) 82%, rgba(94,78,106,0.38) 100%)",
      }}
    />
  );
}
