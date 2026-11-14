// Original compiled status-label hook (React Compiler helpers from view-tabs).
import {
  reactMemoCache as J9,
  memoChanged1 as J1,
  memoStore1 as K1,
  memoChanged2 as J2,
  memoStore3 as K3,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { useState as I, useEffect as D } from "react";
import { EE } from "../working-line/working-line.mjs";
var Het = 150;
function V6(e, t, n) {
  let $ = J9(6),
    r = J1($, 0, n) ? K1($, 0, n, { working: n, epoch: 0 }) : $[1],
    [i, a] = I(r),
    o = n && !i.working;
  n !== i.working && a({ working: n, epoch: o ? i.epoch + 1 : i.epoch });
  let [s, c] = I(e),
    l = e === null && t ? s : e,
    u = l !== s && (o || l === null || s === null);
  u && c(l);
  let d, f;
  (J2($, 2, s, l)
    ? ((d = () => {
        if (l === s || l === null || s === null) return;
        let e = setTimeout(() => c(l), Het);
        return () => clearTimeout(e);
      }),
      (f = [l, s]),
      K3($, 2, s, l, d, f))
    : ((d = $[4]), (f = $[5])),
    D(d, f));
  let p = EE((u ? l : s) ?? "", 650, void 0, i.epoch);
  return p === "" ? null : p;
}
export { V6 as useSideChatStatusLabel };
