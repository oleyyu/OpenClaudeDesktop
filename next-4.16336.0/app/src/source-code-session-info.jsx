// W14-code r4 R4T-08c (E95): the open Code session's facts for the official /status card (c96d752d0 WG / MHe), published
// into the stores MHe reads — the transcript's QueryClient (source-breadcrumb-adapters.jsx fileBrowserQueryClient, the
// one source-code-transcript.jsx provides) and rows-c06cf64bb's live session stores `q` / watchers `nT`. See
// code-session-info-model.mjs for what each row reads and what the host does not serve.
import { useLayoutEffect, useMemo } from "react";
import { q as liveSessionStores, nT as liveSessionWatchers } from "./generated/transcript-rows/rows-c06cf64bb-CdJdJuVd.mjs";
import { fileBrowserQueryClient } from "./source-breadcrumb-adapters.jsx";
import { publishCodeSessionInfo } from "./code-session-info-model.mjs";

const STORES = { stores: liveSessionStores, watchers: liveSessionWatchers, client: fileBrowserQueryClient };

/** main.jsx: `useCodeSessionInfo(mode === "code" ? current : null, {...})`; kept in step before paint. */
export function useCodeSessionInfo(sessionId, info) {
  const key = JSON.stringify(info ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => info, [key]);
  useLayoutEffect(() => {
    if (sessionId) publishCodeSessionInfo(sessionId, value, STORES);
  }, [sessionId, value]);
}
