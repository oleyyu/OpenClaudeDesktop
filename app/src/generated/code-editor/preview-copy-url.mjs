// Original Claude Desktop 3.6556.2 URL copy hook (cf580efe9 Ba): website validation, clipboard result and
// generation-scoped feedback. Gate `__gb__110515556` is read through the host useFeature (D29/D31 unchanged).
import { useRef as n, useEffect as d } from "react";
import {
  reactMemoCache as J9,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged5 as J5,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore5 as K5,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { tagErrorText as e } from "../view-tabs/preload-helper-D0dM6GpB.js";
export function createPreviewCopyUrl({
  useIntl: Oe,
  useToasts: W,
  useOwnerWindow: v,
  useFeature: $t,
  useStable: R,
  writeClipboard: x,
  previewApi: B,
}) {
  const Ra = "__gb__110515556";
  function za(e) {
    try {
      let { protocol: t } = new URL(e);
      return t === "http:" || t === "https:";
    } catch {
      return !1;
    }
  }
  function Ba(t, r) {
    let $ = J9(9),
      i = Oe(),
      a = W(),
      o = v(),
      s = $t(Ra),
      c = n(0),
      l = J0($, 0)
        ? K0($, 0, () => () => {
            c.current += 1;
          })
        : $[0],
      u = J1($, 1, t) ? K1($, 1, t, [t]) : $[2];
    d(l, u);
    let f = J5($, 3, i, o, t, r, a)
        ? K5($, 3, i, o, t, r, a, () => {
            if (!t) return;
            c.current += 1;
            let n = c.current,
              s = r;
            if (s !== null && !za(s)) {
              a?.addInfo(
                i.formatMessage({
                  defaultMessage: "This only works for websites.",
                  id: "v/N4TlfEs/",
                }),
              );
              return;
            }
            (async () => {
              if (s === null)
                throw e(
                  Error("The pane holds no address."),
                  "The pane holds no address.",
                  "literal",
                );
              let t = await x(o, s);
              if (t !== "written") throw Error(`The clipboard write was ${t}.`);
            })().then(
              () => {
                c.current === n &&
                  a?.addSuccess(
                    i.formatMessage({
                      defaultMessage: "URL copied to clipboard.",
                      id: "PsIG0LbAxt",
                    }),
                  );
              },
              (e) => {
                c.current === n &&
                  a?.addError(
                    i.formatMessage({
                      defaultMessage: "Couldn\u2019t copy the URL. Try again.",
                      id: "kADYN+9Tu7",
                    }),
                    { error: e, messageForLogging: "preview_copy_url_failed" },
                  );
              },
            );
          })
        : $[8],
      p = R(f),
      m = B?.getPreviewUrl !== void 0 && B.onPreviewUrlChanged !== void 0;
    return s && m ? p : void 0;
  }
  return Ba;
}
