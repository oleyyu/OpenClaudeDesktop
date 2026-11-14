// Original stored panel rectangle parser (zod schema); storage object supplied by host.
import { y as s, T as r, w as o, N as n } from "../mcp-app-host/zod.mjs";
var Fi = s(() =>
  r({ left: o(), top: o(), width: o(), height: o(), viewport: n().optional() }),
);
var Ii = s(() => r({ width: o(), height: o() }));
function Ri(e) {
  let t = Ii.safeParse(e);
  return t.success ? t.data : void 0;
}
export function readSideChatPanelRect(localStorage, key) {
  function Li(e) {
    try {
      let t = Fi.safeParse(JSON.parse(localStorage.getItem(e) ?? "null"));
      if (!t.success) return null;
      let { viewport: n, ...r } = t.data,
        i = Ri(n);
      return i ? { ...r, viewport: i } : r;
    } catch {
      return null;
    }
  }
  return Li(key);
}
