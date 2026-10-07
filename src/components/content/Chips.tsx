// A wrapped list of short tags (technologies, skills, interests).
export function Chips({ items, label }: { items: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[13px] leading-none text-ink/80">
          {item}
        </li>
      ))}
    </ul>
  );
}
