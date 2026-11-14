// The main process returns a core JSON-RPC error as {__codeDesktopRpcError}
// because ipcRenderer.invoke drops everything but a thrown error's message.
// rpcResult turns it back into a thrown Error carrying .code and .data, so
// callers can read CodexErrorInfo (activeTurnNotSteerable, threadNotFound…).
import { t } from "../electron/i18n/index.mjs";
export function rpcResult(value) {
  const failure = value?.__codeDesktopRpcError;
  if (!failure) return value;
  const error = new Error(failure.message || t("The request failed."));
  error.code = failure.code;
  error.data = failure.data ?? null;
  throw error;
}
