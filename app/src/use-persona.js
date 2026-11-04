import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./persona-store.mjs";

/** C2: the live persona ({assistantName, sparkIcon, sparkImage}; W14-code r5 R5DC-01 dropped the greeting). */
export function usePersona() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
