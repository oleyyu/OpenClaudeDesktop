// Original 4.16336.0 compiled side-chat status-label hook (c96d752d0-D9VB6ArX.js); label hold hook from working-line-v4.
import { pP as $working_line_v4_working_line_pP } from "../working-line-v4/working-line.mjs";
import {
  useEffect as $react_useEffect,
  useState as $react_useState,
} from "react";
import { c as $react_compiler_runtime_c } from "react/compiler-runtime";
// shared-frame-CJdE5Ria.js
const $c_shared_frame_CJdE5Ria = (() => {
  const Je = $react_compiler_runtime_c;
  var J9 = Je;
  function J1(e, t, n) {
    return e[t] !== n;
  }
  function J2(e, t, n, r) {
    return e[t] !== n || e[t + 1] !== r;
  }
  function K1(e, t, n, r) {
    return ((e[t] = n), (e[t + 1] = r), r);
  }
  function K3(e, t, n, r, i, a) {
    return ((e[t] = n), (e[t + 1] = r), (e[t + 2] = i), (e[t + 3] = a), a);
  }
  return { J1, J2, J9, K1, K3 };
})();
const pP = $working_line_v4_working_line_pP;
const v = $react_useState;
const O = $react_useEffect;
const { K1, J9, J1, J2, K3 } = $c_shared_frame_CJdE5Ria;
var t_t = 150;
function G5(e, t, n) {
  let $ = J9(6),
    r = J1($, 0, n) ? K1($, 0, n, { working: n, epoch: 0 }) : $[1],
    [i, a] = v(r),
    o = n && !i.working;
  n !== i.working && a({ working: n, epoch: o ? i.epoch + 1 : i.epoch });
  let [s, c] = v(e),
    l = e === null && t ? s : e,
    u = l !== s && (o || l === null || s === null);
  u && c(l);
  let d, f;
  (J2($, 2, s, l)
    ? ((d = () => {
        if (l === s || l === null || s === null) return;
        let e = setTimeout(() => c(l), t_t);
        return () => clearTimeout(e);
      }),
      (f = [l, s]),
      K3($, 2, s, l, d, f))
    : ((d = $[4]), (f = $[5])),
    O(d, f));
  let p = pP((u ? l : s) ?? "", 650, void 0, i.epoch);
  return p === "" ? null : p;
}

export { G5 as useSideChatStatusLabel };
