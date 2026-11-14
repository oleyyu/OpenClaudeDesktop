// File-kind glyph for a path, vendored from 2.2553.1 shared-14-BOJVa-jT.js
// cP (readable :19083-19140 nP/aP/oP/sP/cP) with its imported tables resolved:
//   uu = shared-5-CGK2eyBT.js export Ai = tF (source code extensions),
//   Hc = shared-4-D8W6lHTW.js export Zd = Bh (raster image extensions),
//   Zc = shared-4-D8W6lHTW.js export pf = eg (highlight language ids),
//   as = shared-8-B5xbG2px.js export Na = OT over DT (md/html overrides),
//   qN = shared-14 :19005 (file.<ext> artifact kind fallback).
// Used by the Files tree rows (panes-tile-current.js:5692 ae = zr(name)), the
// file-name search results and the "@" mention leading icon (c099c328d Ip
// :6286-6330 isDirectory ? Folder : Li(label)).

// shared-14 :18875 kN
const ARCHIVE = new Set(["zip", "tar", "gz", "bz2", "xz", "7z", "rar", "tgz"]);
// shared-14 :19044-19048 YN/XN/ZN/QN/$N
const DATA = new Set(["jsonl", "parquet", "db", "sqlite", "sqlite3"]);
const SHEET = new Set(["csv", "tsv"]);
const EXTRA_CODE = new Set(["cs", "vue", "pl", "php", "htm", "xhtml"]);
const ICON_IMAGE = new Set(["ico"]);
const PRESO = new Set(["ppt", "pptx"]);
// shared-14 :19049-19084 eP (documents) and tP (video/audio, shown as documents)
const DOC = new Set(["pdf", "md", "markdown", "txt", "log", "rtf", "doc", "docx", "odt", "pages", "rst", "tex", "epub"]);
const MEDIA = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v", "ogv", "3gp", "mp3", "wav", "ogg", "oga", "opus", "flac", "aac", "m4a", "wma", "aiff"]);
// shared-5 tF (uu)
const SOURCE_CODE = new Set("js.jsx.gs.ts.tsx.py.rb.go.rs.c.cpp.h.hpp.java.kt.swift.sh.bash.zsh.json.yaml.yml.toml.xml.html.css.scss.sql.graphql.proto.lua.r".split("."));
// shared-4 Bh (Hc)
const RASTER = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
// shared-4 eg (Zc)
const LANGUAGES = "python.javascript.typescript.java.csharp.go.rust.ruby.php.swift.kotlin.dart.scala.perl.elixir.haskell.clojure.r.groovy.bash.css.scss.less.sql.graphql.json.html.plaintext".split(".");
// shared-14 :19127 sP
export const FILE_KIND_GLYPHS = { doc: "File", code: "Code", data: "Database", sheet: "Spreadsheet",
  preso: "Slides", image: "Image", archive: "Archive", skill: "Scroll" };
// shared-8 DT (as = OT)
const EXTENSION_OVERRIDES = { md: "Note", markdown: "Note", html: "Globe", htm: "Globe", xhtml: "Globe" };

// shared-14 aP: text after the last '.', lowercased; '' when there is no dot.
export function fileExtension(path) {
  const value = String(path ?? "");
  const tail = value.split(".").pop()?.toLowerCase() ?? "";
  return tail === value.toLowerCase() ? "" : tail;
}

// shared-14 qN: artifact kind of "file.<ext>".
function artifactKind(name) {
  if (name === "SKILL.md") return "skill";
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "skill") return "skill";
  if (ext === "plugin") return "plugin";
  if (["csv", "tsv"].includes(ext)) return "table";
  if (["xls", "xlsx"].includes(ext)) return "spreadsheet";
  if (ext === "pptx") return "preso";
  if (["pdf", "md", "docx", "cd", "clark"].includes(ext)) return "doc";
  if (["mermaid", "mmd"].includes(ext)) return "diagram";
  if (["jsx", "tsx"].includes(ext)) return "code";
  if (ext === "svg" || RASTER.includes(ext)) return "image";
  return LANGUAGES.includes(ext) ? "code" : null;
}

// shared-14 oP
function extensionKind(ext) {
  if (!ext) return null;
  if (ext === "skill" || ext === "plugin") return "skill";
  if (ARCHIVE.has(ext)) return "archive";
  if (PRESO.has(ext)) return "preso";
  if (DATA.has(ext)) return "data";
  if (SHEET.has(ext)) return "sheet";
  if (SOURCE_CODE.has(ext) || EXTRA_CODE.has(ext)) return "code";
  if (ICON_IMAGE.has(ext)) return "image";
  if (DOC.has(ext) || MEDIA.has(ext)) return "doc";
  switch (artifactKind(`file.${ext}`)) {
    case "code": return "code";
    case "spreadsheet": case "table": return "sheet";
    case "image": case "diagram": return "image";
    case "doc": return "doc";
    case "preso": return "preso";
    case "skill": case "plugin": return "skill";
    default: return null;
  }
}

// shared-14 nP
export function fileKind(path) {
  const value = String(path ?? "");
  return value.includes("SKILL.md") ? "skill" : (extensionKind(fileExtension(value)) ?? "doc");
}

// shared-14 cP: skill -> Scroll; else the md/html override, else the kind glyph.
export function fileKindIcon(path) {
  const kind = fileKind(path);
  if (kind === "skill") return FILE_KIND_GLYPHS.skill;
  const ext = fileExtension(path);
  return (Object.hasOwn(EXTENSION_OVERRIDES, ext) ? EXTENSION_OVERRIDES[ext] : undefined) ?? FILE_KIND_GLYPHS[kind];
}
