// Original 4.16336.0 desktop path encoding and local URI/suffix expressions (index.chunk-CqaSnEfn.js openInEditor). Host supplies protocol/path/position.
function qc(e) {
  let t = encodeURIComponent(e).replace(/%2F/g, "/");
  if (decodeURIComponent(t) !== e || /["\s<>|^&]/.test(t))
    throw Error("Refusing to build editor URI: path failed encode round-trip");
  return t;
}
function Xc(e) {
  return qc(e);
}
function editorLocationURI(a, u, i, o) {
  let f = Number.isInteger(o) && o > 0 ? `:${o}` : "",
    p = Number.isInteger(i) && i > 0 ? `:${i}${f}` : "",
    m;
  return `${a}file/${Xc(u)}${p}`;
}
module.exports = { editorLocationURI };
