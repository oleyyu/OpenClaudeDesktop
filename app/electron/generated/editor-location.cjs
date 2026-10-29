// Original 3.6556.2 desktop Eh/kh encoding and local URI/suffix expressions (index.chunk-DNPOm2Zc openInEditor). Host supplies protocol/path/position.
function Eh(e) {
  let t = encodeURIComponent(e).replace(/%2F/g, "/");
  if (decodeURIComponent(t) !== e || /["\s<>|^&]/.test(t))
    throw Error("Refusing to build editor URI: path failed encode round-trip");
  return t;
}
function kh(e) {
  return Eh(e);
}
function editorLocationURI(a, u, i, o) {
  let f = Number.isInteger(o) && o > 0 ? `:${o}` : "",
    p = Number.isInteger(i) && i > 0 ? `:${i}${f}` : "",
    m;
  return `${a}file/${kh(u)}${p}`;
}
module.exports = { editorLocationURI };
