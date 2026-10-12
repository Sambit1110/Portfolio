"use client";

import { createContext, useContext, useRef, useState, type RefObject } from "react";
import { CURATED_ONLY, type ProjectCollection } from "@/lib/github/repositories";

// The synced project collection, rendered once on the server and handed to the
// world's panels. Without a provider: curated projects only.
const Context = createContext<ProjectCollection>(CURATED_ONLY);

// Repositories are listed a batch at a time; "Show more" adds the next batch.
export const LIST_BATCH = 20;

// How far the Projects list has been opened up and scrolled. Kept here, above
// the panel, so going from the list to a project and back finds the list as it
// was left.
type ListMemory = { shown: number; setShown: (shown: number) => void; scrollTopRef: RefObject<number> };
const Memory = createContext<ListMemory | null>(null);

export function ProjectCollectionProvider({ value, children }: { value: ProjectCollection; children: React.ReactNode }) {
  const [shown, setShown] = useState(LIST_BATCH);
  const scrollTopRef = useRef(0);
  return (
    <Context value={value}>
      <Memory value={{ shown, setShown, scrollTopRef }}>{children}</Memory>
    </Context>
  );
}

export const useProjectCollection = () => useContext(Context);

export function useProjectListMemory(): ListMemory {
  const memory = useContext(Memory);
  // Outside a provider (never in the app): a list that starts afresh each time.
  const [shown, setShown] = useState(LIST_BATCH);
  const scrollTopRef = useRef(0);
  return memory ?? { shown, setShown, scrollTopRef };
}
