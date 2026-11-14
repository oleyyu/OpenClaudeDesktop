import { useSyncExternalStore } from "react";

export function useApprovalDraft(runtime, request) {
  useSyncExternalStore(
    runtime.subscribe,
    () => runtime.revision,
    () => 0,
  );
  const ticket = runtime.ticketFor(request);
  return { ticket, view: runtime.snapshot(ticket) };
}
