"use client";

import { useAudio } from "@/audio/useAudio";

// Small sound on/off pill, styled like the visited-zones indicator beside it.
export function SoundToggle() {
  const { muted, toggle } = useAudio();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? "Sound off. Turn sound on" : "Sound on. Turn sound off"}
      className="flex touch-manipulation items-center gap-2 rounded-full bg-ink/55 py-2 pr-3.5 pl-3 text-sm font-medium text-cream backdrop-blur-sm transition select-none hover:bg-ink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan pointer-coarse:min-h-11 max-sm:px-3"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" className="fill-current" />
        {muted ? (
          <path d="m13.5 7.5 4 5m0-5-4 5" />
        ) : (
          <>
            <path d="M13.5 7.2a4 4 0 0 1 0 5.6" />
            <path d="M15.6 5.2a7 7 0 0 1 0 9.6" className="opacity-70" />
          </>
        )}
      </svg>
      <span className="max-sm:sr-only">{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
