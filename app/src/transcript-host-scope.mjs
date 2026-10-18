// The host's answers for the desktop session stores the generated transcript rows read (c06cf64bb Cy: the running
// turn's start; shared-11 Im: the session waits on an approval or question). Provided once per transcript by
// source-transcript-rows.jsx TranscriptRowsScope; read by the working-line and transcript-rows adapters for the session
// id the transcript live scope names. No React component here, so both adapter modules can import it.
import { createContext } from "react";

export const TranscriptHostScope = createContext(Object.freeze({ sessionId: null, turnStartedAt: null, awaiting: false }));
