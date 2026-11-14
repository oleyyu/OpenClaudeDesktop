import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";
import { pilot } from "../scripts/extract-cds-pilot-v4.mjs";
const require = createRequire(import.meta.url);
const targets = new Map(
  ["react", "react/jsx-runtime", "react/compiler-runtime", "react-dom"].map(
    (id) => [id, pathToFileURL(require.resolve(id)).href],
  ),
);
let Core, hostResolution;
before(async () => {
  hostResolution = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        context.parentURL?.includes("/cds-pilot/staging/") &&
        targets.has(specifier)
      )
        return nextResolve(targets.get(specifier), context);
      return nextResolve(specifier, context);
    },
  });
  Core = await import(
    pathToFileURL(
      path.join(pilot, "staging/src/generated/cds-core/shared-frame.mjs"),
    ).href
  );
});
after(() => hostResolution?.deregister());
const html = (C, props) => renderToStaticMarkup(React.createElement(C, props));
test("official v4 Button renders in the host SSR runtime", () => {
  const result = html(Core.CdsButton, {
    children: "Save",
    "data-testid": "pilot-save",
  });
  assert.match(result, /<button/);
  assert.match(result, /data-cds="Button"/);
  assert.match(result, /Save/);
});
test("official v4 Icon renders in the host SSR runtime", () => {
  const result = html(Core.CdsIcon, { name: "Add", alt: "Add" });
  assert.match(result, /data-cds="Icon"/);
  assert.match(result, /aria-label="Add"/);
});

// Execute the original render functions under a deterministic hook fixture. Effects
// are deliberately not mounted: these assertions cover handler/prop contracts,
// while renderToStaticMarkup above exercises the real React server dispatcher.
import { withMemoCache } from "./support/react-memo-cache.mjs";
function fixture(component, props, contexts = new Map(), { effects = false } = {}) {
  const cells = [];
  const pending = new Map(), cleanups = new Map();
  let cursor = 0,
    tree;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const dispatcher = {
    useContext: (c) => (contexts.has(c) ? contexts.get(c) : c._currentValue),
    useState(initial) {
      const i = cursor++;
      cells[i] ??= {
        value: typeof initial === "function" ? initial() : initial,
      };
      return [
        cells[i].value,
        (next) => {
          cells[i].value =
            typeof next === "function" ? next(cells[i].value) : next;
        },
      ];
    },
    useRef(initial) {
      return dispatcher.useState(() => ({ current: initial }))[0];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!cells[i] || !same(cells[i].deps, deps))
        cells[i] = { value: fn(), deps };
      return cells[i].value;
    },
    useCallback(fn, deps) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useId() {
      return dispatcher.useState(() => `cds-pilot-${cursor}`)[0];
    },
    useSyncExternalStore(subscribe, snapshot, serverSnapshot) {
      return serverSnapshot();
    },
    useEffect(fn, deps) {
      if (!effects) return;
      const i = cursor++;
      if (!cells[i] || !same(cells[i].deps, deps)) {
        cells[i] = { deps };
        pending.set(i, fn);
      }
    },
    useLayoutEffect() {},
    useInsertionEffect() {},
    useImperativeHandle() {},
  };
  withMemoCache(dispatcher);
  const render = () => {
    cursor = 0;
    const internal =
        React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      previous = internal.H;
    internal.H = dispatcher;
    try {
      tree = component(props);
      return tree;
    } finally {
      internal.H = previous;
    }
  };
  render();
  return {
    render,
    flushEffects() {
      for (const [i, fn] of pending) {
        cleanups.get(i)?.();
        cleanups.set(i, fn());
      }
      pending.clear();
    },
    unmount() {
      for (const cleanup of cleanups.values()) cleanup?.();
      cleanups.clear();
    },
    get tree() {
      return tree;
    },
  };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
function button(f) {
  const b = find(f.tree, (n) => n.type === "button");
  assert.ok(b, "original useRender must yield a button");
  return b.props;
}
function event(key, fields = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    defaultPrevented: false,
    stopped: false,
    currentTarget: {},
    nativeEvent: { isComposing: false },
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
    ...fields,
  };
}

test("Button preserves native attributes, disabled, pressed, size and the caller ref", (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document");
  globalThis.document = {};
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "document", prior);
    else delete globalThis.document;
  });
  const ref = React.createRef();
  const f = fixture((p) => Core.CdsButton.render(p, ref), {
    children: "Delete",
    size: "xxs",
    variant: "danger",
    disabled: true,
    pressed: true,
    id: "delete",
    name: "action",
    value: "delete",
    form: "editor",
    "aria-describedby": "help",
    "data-probe": "yes",
    style: { color: "red" },
  });
  const p = button(f);
  assert.equal(p.type, "button");
  assert.equal(p.disabled, true);
  assert.equal(p["aria-pressed"], true);
  assert.equal(p["data-step"], "1");
  for (const [k, v] of Object.entries({
    id: "delete",
    name: "action",
    value: "delete",
    form: "editor",
    "aria-describedby": "help",
    "data-probe": "yes",
  }))
    assert.equal(p[k], v);
  assert.equal(p.style.color, "red");
  const node = { nodeType: 1 };
  p.ref(node);
  assert.equal(ref.current, node);
  p.ref(null);
  assert.equal(ref.current, null);
});
test("Button forwards click and keyboard events and consumes held activation keys", () => {
  const calls = [];
  const f = fixture(Core.CdsButton.render, {
    children: "Run",
    onClick: (e) => calls.push(["click", e]),
    onKeyDown: (e) => calls.push(["key", e]),
    onKeyUp: (e) => calls.push(["up", e]),
  });
  const p = button(f),
    click = event(),
    key = event("Enter", { repeat: true });
  p.onClick(click);
  p.onKeyDown(key);
  p.onKeyUp(event("Enter"));
  assert.equal(calls[0][1], click);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["click", "key", "up"],
  );
  assert.equal(key.defaultPrevented, true);
});
test("busy Button blocks clicks and bare activation keys but preserves modified-key callbacks", () => {
  const calls = [];
  const f = fixture(Core.CdsButton.render, {
    children: "Run",
    busy: true,
    onClick: () => calls.push("click"),
    onKeyDown: () => calls.push("key"),
    onKeyUp: () => calls.push("up"),
  });
  const p = button(f);
  assert.equal(p["aria-busy"], true);
  assert.equal(p["aria-disabled"], true);
  const click = event(),
    down = event("Enter"),
    up = event(" ");
  p.onClick(click);
  p.onKeyDown(down);
  p.onKeyUp(up);
  assert.ok(
    click.defaultPrevented && down.defaultPrevented && up.defaultPrevented,
  );
  assert.deepEqual(calls, []);
  p.onKeyDown(event("Enter", { ctrlKey: true }));
  assert.deepEqual(calls, ["key"]);
});
test("managed async Button locks a second click until its promise settles", async () => {
  let resolve,
    calls = 0;
  const promise = new Promise((r) => (resolve = r));
  const f = fixture(
    Core.CdsButton.render,
    {
      children: "Run",
      onClick: () => {
        calls++;
        return promise;
      },
    },
    new Map([[Core.Ba, true]]),
  );
  button(f).onClick(event());
  const second = event();
  button(f).onClick(second);
  assert.equal(calls, 1);
  assert.equal(second.defaultPrevented, true);
  resolve();
  await promise;
  await Promise.resolve();
  f.render();
  button(f).onClick(event());
  assert.equal(calls, 2);
});
test("Button href uses the original link contract with target and safe rel", () => {
  const result = html(Core.CdsButton, {
    href: "https://example.test/path",
    target: "_blank",
    children: "Docs",
    download: "guide.txt",
    "data-probe": "link",
  });
  assert.match(result, /<a /);
  assert.match(result, /href="https:\/\/example.test\/path"/);
  assert.match(result, /target="_blank"/);
  assert.match(result, /rel="[^"]*noopener/);
  assert.match(result, /download="guide.txt"/);
});
test("Button custom render receives CDS props and preserves the caller event", () => {
  let received, clicked;
  const onClick = (e) => {
    clicked = e;
  };
  const result = html(Core.CdsButton, {
    render: (p) => {
      received = p;
      return React.createElement("section", p);
    },
    children: "Custom",
    onClick,
    "data-probe": "render",
  });
  assert.match(result, /<section /);
  assert.equal(received["data-cds"], "Button");
  assert.equal(received["data-probe"], "render");
  const e = event();
  received.onClick(e);
  assert.equal(clicked, e);
});
test("Icon preserves the official glyph, layers, rotation and accessible overrides", () => {
  const result = html(Core.CdsIcon, {
    name: "Add",
    alt: "Add",
    rotate: 90,
    size: "sm",
    id: "add",
    className: "probe",
    style: { color: "red" },
  });
  assert.match(result, /\ue001/);
  assert.match(result, /role="img"/);
  assert.match(result, /aria-label="Add"/);
  assert.doesNotMatch(result, /aria-hidden=/);
  assert.match(result, /--cds-icon-rotate:90deg/);
  assert.match(result, /color:red/);
  assert.match(result, /class="probe"/);
  const decorative = html(Core.CdsIcon, {
    name: "Add",
    "aria-label": "Override",
    role: "presentation",
    "aria-hidden": false,
  });
  assert.match(decorative, /aria-label="Override"/);
  assert.match(decorative, /role="presentation"/);
  assert.match(decorative, /aria-hidden="false"/);
  assert.match(html(Core.CdsIcon, { name: "Add" }), /aria-hidden="true"/);
  assert.equal(
    html(Core.CdsIcon, { name: "DotsVertical" }),
    html(Core.CdsIcon, { name: "DotsHorizontal" }),
  );
});
test("Icon custom SVG retains fill and stroked paths without leaking input-only props", () => {
  const result = html(Core.CdsIcon, {
    customIcon: {
      viewBox: 24,
      paths: ["M0 0h2v2z", { d: "M1 1L4 4", strokeWidth: 2 }],
    },
    alt: "Custom",
    rotate: 45,
    size: "lg",
    "data-probe": "svg",
  });
  assert.match(result, /<svg /);
  assert.match(result, /viewBox="0 0 24 24"/);
  assert.match(result, /d="M0 0h2v2z"/);
  assert.match(result, /stroke-width="2"/);
  assert.match(result, /vector-effect="non-scaling-stroke"/);
  assert.match(result, /aria-label="Custom"/);
  assert.doesNotMatch(result, /customIcon=|rotate=\"45\"/);
});
test("density Context crosses the original Button and Icon through one host React", () => {
  function render(density) {
    return renderToStaticMarkup(
      React.createElement(
        Core.Da.Provider,
        { value: density },
        React.createElement(Core.CdsButton, { icon: "Add", children: "Add" }),
      ),
    );
  }
  const comfortable = render("comfortable"),
    compact = render("compact");
  assert.match(comfortable, /font-size:calc\(1\.25rem/);
  assert.match(compact, /font-size:calc\(1rem/);
  let seen;
  function Child() {
    seen = React.useContext(Core.Ku);
    return React.createElement("b", null, seen);
  }
  html(Core.CdsButton, { size: "xs", children: React.createElement(Child) });
  assert.equal(seen, "sm");
});

import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseAst } from "rolldown/parseAst";
import * as official from "../scripts/official-4.16336.0.mjs";
const sha = (x) => createHash("sha256").update(x).digest("hex");
// wave 8: vendor-datadog carries BigInt literals (ESTree Literal.value / .bigint is a bigint), which JSON cannot serialize;
// they are compared by their decimal digits plus the n suffix, so two literals still compare equal only when their values do.
const canonical = (n) =>
  JSON.stringify(n, (key, value) =>
    ["start", "end", "loc", "raw"].includes(key) ? undefined : typeof value === "bigint" ? `${value}n` : value,
  );
// The slicer emits prettier form. Prettier drops the redundant parentheses of `(a?.b)?.c`
// (an optional link whose object is itself a parenthesized optional chain); both forms
// short-circuit to undefined identically and call with the same receiver. Only that one
// ESTree shape is unwrapped, and the test pins exactly which declarations needed it.
const chainCanonical = (n) =>
  JSON.stringify(n, (key, value) => {
    if (["start", "end", "loc", "raw"].includes(key)) return undefined;
    if (typeof value === "bigint") return `${value}n`; // wave 8: as canonical above
    if (value?.type === "MemberExpression" && value.optional === true && value.object?.type === "ChainExpression")
      return { ...value, object: value.object.expression };
    return value;
  });
function names(n) {
  if (!n) return [];
  if (n.type === "Identifier") return [n.name];
  if (n.type === "RestElement") return names(n.argument);
  if (n.type === "AssignmentPattern") return names(n.left);
  if (n.type === "ObjectPattern")
    return n.properties.flatMap((p) => names(p.value ?? p.argument));
  if (n.type === "ArrayPattern") return n.elements.flatMap(names);
  return [];
}
function table(ast) {
  const t = new Map();
  for (const n of ast.body) {
    if (n.type === "VariableDeclaration")
      for (const d of n.declarations)
        for (const name of names(d.id)) t.set(name, d);
    else if (["FunctionDeclaration", "ClassDeclaration"].includes(n.type))
      t.set(n.id.name, n);
  }
  return t;
}
test("every emitted declaration has the original v4 AST and exact source interval/hash", async () => {
  const proof = JSON.parse(
    await fs.readFile(path.join(pilot, "provenance.json"), "utf8"),
  );
  assert.equal(proof.referenceVersion, "4.16336.0");
  let count = 0;
  const prettierChains = [];
  for (const module of proof.modules) {
    const original = await fs.readFile(
      path.join(official.ionSource, module.source),
      "utf8",
    );
    const emitted = await fs.readFile(
      path.join(pilot, "staging/src/generated/cds-core", module.target),
      "utf8",
    );
    assert.equal(sha(original), module.sourceSha256);
    assert.equal(sha(emitted), module.sha256);
    const a = table(parseAst(original)),
      b = table(parseAst(emitted));
    for (const binding of module.bindings) {
      const local = binding.id.split("#")[1];
      assert.equal(
        sha(original.slice(binding.start, binding.end)),
        binding.sha256,
        local,
      );
      assert.ok(a.has(local) && b.has(local), binding.id);
      if (canonical(b.get(local)) !== canonical(a.get(local))) {
        prettierChains.push(binding.id);
        assert.equal(chainCanonical(b.get(local)), chainCanonical(a.get(local)), binding.id);
      }
      count++;
    }
  }
  // wave 8s (W8S-M1): 9746 + 776 (cds-integrate/wave8s/union.json: every wave-8 binding kept identical); wave 8: 7321 + 2425 = 9746
  // (cds-integrate/wave8/union.json: every wave-7 binding kept identical); wave 7: 7168 + 153 = 7321.
  // wave 8a/8b (R4-K1): 10522 + 5 (cds-integrate/wave8b/union.json; wave 8a adds publicNames only, wave8a/union.json
  // bindings 10522 -> 10522); was: 10522.
  // wave 8c (R4-K1 addendum C): 10527 + 6 (cds-integrate/wave8c/union.json: every stage-12b binding kept identical); was: 10527.
  // wave 8d (R4-Q1 addendum D): 10533 + 80 (cds-integrate/wave8d/union.json: every stage-13c binding kept identical); was: 10533.
  assert.equal(count, 10613);
  // TextInput clear (ww) and text insertion at the selection (PD) set the native value via
  // `(Object.getOwnPropertyDescriptor(...)?.set)?.call(...)`; wave 2 adds CheckboxRow's label click guard (c09817156 m,
  // `(d(e.target)?.closest(...))?.matches(...)`) and a Base UI vendor declaration (ty). Prettier drops the parentheses
  // of an optional chain continued by `?.`; short-circuit and receiver are unchanged. Nothing else is normalized. Wave 6
  // adds shared-25's input-pending probe _k (`(globalThis.navigator?.scheduling)?.isInputPending?.()`), the same shape.
  // Wave 8 adds shared-25's current-account uuid reader uI (`((e?.clientState.queries.find(…))?.state.data)?.account?.uuid`,
  // closure of the wave-8 publicNames), the same shape (was: the five above without shared-25 uI). Wave 8s (W8S-M1) adds
  // shared-123's extension-origin reader xg (`(window.location.ancestorOrigins?.[0])?.match(…)`, closure of the wave-8s
  // publicNames), the same shape (wave 8: the six without shared-123 xg).
  assert.deepEqual(prettierChains.sort(), ["c09817156-Yg3kFvSY.js#m", "shared-123-1Hc1RTKl.js#xg", "shared-25-D-aF0gt9.js#_k", "shared-25-D-aF0gt9.js#uI", `${official.sharedFrame}#PD`, `${official.sharedFrame}#ww`, `${official.vendorFrame}#ty`]);
});
test("isolated graph owns its Contexts, host framework and required Base UI registration", async () => {
  const proof = JSON.parse(
    await fs.readFile(path.join(pilot, "provenance.json"), "utf8"),
  );
  const ids = proof.modules.flatMap((m) => m.bindings.map((b) => b.id));
  assert.equal(new Set(ids).size, ids.length);
  const imports = proof.modules.flatMap((m) => m.imports);
  assert.ok(
    imports.some((i) => i.kind === "adapter" && i.name === "loadHostReact"),
  );
  assert.ok(
    imports.some((i) => i.kind === "adapter" && i.name === "hostJsxRuntime"),
  );
  assert.ok(
    imports.some((i) => i.kind === "adapter" && i.name === "hostReactDom"),
  );
  assert.ok(
    imports.some((i) => i.hostIdentity?.module === "react/compiler-runtime"),
  );
  assert.ok(imports.every((i) => !["view-tabs", "linked"].includes(i.kind)));
  assert.ok(
    imports.every(
      (i) =>
        !i.from.includes("app/src") &&
        !i.from.includes("src/generated/view-tabs"),
    ),
  );
  assert.ok(!ids.includes(official.vendorFrame + "#r"));
  assert.ok(!ids.includes(official.vendorFrame + "#se"));
  assert.ok(!ids.includes(official.vendorFrame + "#pe"));
  const vendor = proof.modules.find((m) => m.source === official.vendorFrame);
  assert.equal(vendor.initializers.length, 1);
  assert.match(vendor.initializers[0].policy, /syncHooks/);
  const js = await fs.readFile(
    path.join(pilot, "staging/src/generated/cds-core/vendor-frame.mjs"),
    "utf8",
  );
  assert.match(js, /tr\(\{/);
  assert.match(js, /syncHooks/);
  // ri -> the sheets namespace; wave 3 (cds-surface-additions): sM -> the animated Spark's sprite strips; wave 8 (W8-M1,
  // pins.merge.wave8.dynamicImports): shared-0 NS -> the RUM profiler trace encoder c78048286 and vendor-datadog om -> its
  // profiler c91b42814 (wave 7: the first two only).
  assert.deepEqual(proof.dynamicImports.map((d) => `${d.local} ${d.specifier}`).sort(), ["NS ./c78048286-BYKo118F.js", "om ./c91b42814-CWEg9hC3.js",
    "ri ./c86ccec3d-CSD9PqcP.js", "sM ./cf2613ee5-Btwr9m9F.js"]);
  // Wave 4 (cds-wave4/components): react-intl's useIntl / FormattedMessage (vendor-intl p / l) are host boundaries
  // answered by the adapter's host i18n block. Since wave 5 the chunk's defineMessages identity (tn, `function tn(e){return
  // e}`, which the shared-60 / shared-5 / shared-123 message tables call) is its one sliced binding: no react-intl runtime.
  // Wave 6 adds react-intl's Context K (`K=s(null)`, account2 Tier A ctx_vendorintl_K: the one IntlContext the region graphs
  // link instead of each cutting its own); still no react-intl runtime, only that createContext call.
  assert.deepEqual(proof.boundaries.intl, [
    "vendor-intl-BJgYK7RA.js#p (q) -> adapter useHostIntl: host i18n (electron/i18n catalog); react-intl is not sliced, no IntlProvider",
    "vendor-intl-BJgYK7RA.js#l (Gt) -> adapter HostFormattedMessage: host i18n (electron/i18n catalog); react-intl is not sliced, no IntlProvider"]);
  const intl = proof.modules.filter((m) => m.source === "vendor-intl-BJgYK7RA.js");
  assert.deepEqual(intl.flatMap((m) => m.bindings.map((b) => b.id)), ["vendor-intl-BJgYK7RA.js#K", "vendor-intl-BJgYK7RA.js#tn"]);
  assert.match(await fs.readFile(path.join(pilot, "staging/src/generated/cds-core/vendor-intl.mjs"), "utf8"), /^function tn\(e\) \{\n  return e;\n\}$/m);
  assert.match(await fs.readFile(path.join(pilot, "staging/src/generated/cds-core/vendor-intl.mjs"), "utf8"), /^import \{ createContext as s \} from "react";\nvar K = s\(null\);$/m);
  // Wave 5: the official preload helper's assetsURL (preload-helper a, `return "/" + e`) is the host viteAssetUrl
  // (pins.localAdapterBoundaries): its importer keeps the official text and imports the adapter.
  assert.deepEqual(imports.filter((i) => i.kind === "adapter" && i.name === "viteAssetUrl").map((i) => [i.local, i.via]), [["a", "preload-helper-BBljBeZo.js#a"]]);
  assert.ok(!ids.includes("preload-helper-BBljBeZo.js#a"));
  assert.deepEqual(proof.boundaries.remoteServices, []);
  const adapter = await import(
    pathToFileURL(path.join(pilot, "staging/src/pilot-adapter.mjs")).href
  );
  assert.equal(adapter.loadHostReact().useState, React.useState);
  assert.equal(adapter.loadHostReact().createContext, React.createContext);
});
test("font bytes and glyph map belong to the same official snapshot", async () => {
  const proof = JSON.parse(
    await fs.readFile(path.join(pilot, "provenance.json"), "utf8"),
  );
  const font = await fs.readFile(
    path.join(pilot, "staging/public/assets/v1", proof.iconFont.font),
  );
  assert.equal(sha(font), proof.iconFont.fontSha256);
  const css = await fs.readFile(
    path.join(official.ionSource, proof.iconFont.source),
    "utf8",
  );
  for (const rule of proof.iconFont.rules)
    assert.equal(sha(css.slice(rule.start, rule.end)), rule.sha256);
  assert.match(
    await fs.readFile(path.join(pilot, "staging/public/icon-font.css"), "utf8"),
    /font-family:Anthropicons-Variable/,
  );
});

test("icon-only tooltip and disabled-reason wrappers run the original Base UI SSR protocol", () => {
  const iconOnly = html(Core.CdsButton, {
    icon: "Add",
    iconOnly: true,
    "aria-label": "Add item",
  });
  assert.match(iconOnly, /data-cds-icon-only=""/);
  assert.match(iconOnly, /aria-label="Add item"/);
  assert.match(iconOnly, /data-cds="Icon"/);
  const disabled = html(Core.CdsButton, {
    disabled: true,
    disabledReason: "Unavailable",
    children: "Run",
  });
  assert.match(disabled, /<button[^>]*disabled=""/);
  assert.match(disabled, /Run/);
});

test("all recorded dependency identities close inside the new graph", async () => {
  const proof = JSON.parse(
    await fs.readFile(path.join(pilot, "provenance.json"), "utf8"),
  );
  const ids = new Set(
    proof.modules.flatMap((m) =>
      [...m.bindings, ...m.imports].map((b) => b.id),
    ),
  );
  for (const module of proof.modules)
    for (const binding of module.bindings)
      for (const dependency of binding.dependencies)
        assert.ok(ids.has(dependency), `${binding.id} -> ${dependency}`);
});

import os from "node:os";
import { preflight } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-pilot/provenance.mjs";
test("source drift and another source version fail before generation", async (t) => {
  await assert.rejects(
    preflight({ ...official, referenceVersion: "3.6556.2" }),
    /version\/snapshot mismatch/,
  );
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "cds-pilot-source-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pins = JSON.parse(
    await fs.readFile(path.join(pilot, "pins.json"), "utf8"),
  );
  for (const file of Object.keys(pins.sources))
    await fs.copyFile(
      path.join(official.ionSource, file),
      path.join(directory, file),
    );
  await fs.appendFile(
    path.join(directory, official.sharedFrame),
    "\n// source drift fixture\n",
  );
  await assert.rejects(
    preflight({ ...official, ionSource: directory }),
    /pinned input changed/,
  );
  await fs.copyFile(path.join(official.ionSource, official.sharedFrame), path.join(directory, official.sharedFrame));
  await fs.appendFile(path.join(directory, "c86ccec3d-CSD9PqcP.js"), "\n// lazy source drift fixture\n");
  await assert.rejects(preflight({ ...official, ionSource: directory }), /pinned input changed: c86ccec3d-CSD9PqcP.js/);
});

test("Spinner SSR preserves size aliases, color inheritance and reduced-motion styles", () => {
  for (const [size, box, stroke] of [
    ["sm", 12, 1.5], ["s", 12, 1.5],
    ["md", 16, 1.75], ["m", 16, 1.75],
    ["lg", 20, 2], ["l", 20, 2],
  ]) {
    const markup = html(Core.CdsSpinner, { size, inheritColor: true, className: "probe" });
    assert.ok(markup.includes(`width:calc(${box / 16}rem * var(--cds-rem-scale, 1))`), size);
    assert.ok(markup.includes(`border:calc(${stroke / 16}rem * var(--cds-rem-scale, 1))`), size);
    assert.match(markup, /color-mix\(in srgb, currentColor 25%, transparent\)/);
    assert.match(markup, /conic-gradient\(transparent 40%, currentColor\)/);
    assert.match(markup, /motion-reduce:animate-none/);
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, /probe/);
  }
  assert.match(html(Core.CdsSpinner, {}), /var\(--cds-text-muted\)/);
  assert.equal(html(Core.CdsSpinner, { delay: 50 }), "");
  const labelled = html(Core.CdsSpinner, { delay: 50, label: "Loading" });
  assert.match(labelled, /role="status"/);
  assert.doesNotMatch(labelled, /data-cds="Spinner"|Loading/);
  assert.match(html(Core.CdsSpinner, { delay: -1 }), /data-cds="Spinner"/);
});

test("Spinner original delay effect reveals, resets, and cancels its timer", (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = new Map(), cleared = [];
  let serial = 0;
  globalThis.window = {
    setTimeout(callback, delay) { timers.set(++serial, { callback, delay }); return serial; },
    clearTimeout(id) { timers.delete(id); cleared.push(id); },
  };
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else delete globalThis.window;
  });
  const props = { delay: 40 };
  const f = fixture(Core.CdsSpinner, props, new Map(), { effects: true });
  assert.equal(f.tree, null);
  f.flushEffects();
  assert.deepEqual([...timers.values()].map(v => v.delay), [40]);
  const fire = () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id); timer.callback();
  };
  fire(); f.render();
  assert.ok(find(f.tree, n => n.props?.["data-cds"] === "Spinner"));
  props.delay = 80;
  f.render(); f.render(); // original component performs a render-phase state reset
  assert.equal(f.tree, null);
  f.flushEffects();
  assert.deepEqual([...timers.values()].map(v => v.delay), [80]);
  props.delay = 0;
  f.render(); f.flushEffects();
  assert.equal(timers.size, 0);
  assert.ok(cleared.length >= 2);
  assert.ok(find(f.tree, n => n.props?.["data-cds"] === "Spinner"));
  props.delay = 30;
  f.render(); f.render(); f.flushEffects();
  assert.equal(timers.size, 1);
  f.unmount();
  assert.equal(timers.size, 0);
});

test("Spinner label runs the original delayed live-region child", (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  let timer, cancelled;
  globalThis.window = {
    setTimeout(callback, delay) { assert.equal(delay, 100); timer = callback; return 1; },
    clearTimeout(id) { cancelled = id; },
  };
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else delete globalThis.window;
  });
  const f = fixture(Core.CdsSpinner, { label: "Loading items" });
  assert.equal(f.tree.props.role, "status");
  const label = React.Children.toArray(f.tree.props.children).find(n => typeof n.type === "function");
  assert.ok(label);
  const labelProps = { ...label.props };
  const child = fixture(label.type, labelProps, new Map(), { effects: true });
  assert.equal(child.tree, null);
  child.flushEffects(); timer(); child.render();
  assert.equal(child.tree.props.className, "sr-only");
  assert.equal(child.tree.props.children, "Loading items");
  labelProps.show = false;
  child.render();
  assert.equal(child.tree, null);
  child.unmount();
  assert.equal(cancelled, 1);
});

test("Badge SSR preserves attributes, variants, truncation, direction and icon-only semantics", () => {
  const markup = html(Core.CdsBadge, {
    children: "Draft", variant: "danger", size: "xxs", truncate: true,
    labelDir: "rtl", id: "badge", "data-probe": "yes", title: "State",
    className: "probe", style: { color: "red" },
  });
  assert.match(markup, /data-cds="Badge"/);
  assert.match(markup, /data-step="1"/);
  assert.match(markup, /bg-tint-red text-danger/);
  assert.match(markup, /text-ellipsis/);
  assert.match(markup, /dir="rtl"/);
  assert.match(markup, /id="badge"/);
  assert.match(markup, /data-probe="yes"/);
  assert.match(markup, /title="State"/);
  assert.match(markup, /color:red/);
  assert.doesNotMatch(markup, /variant=|truncate=|labelDir=|size=/);
  assert.match(html(Core.CdsBadge, { children: "Ready", variant: "success", bold: true }), /bg-green-500 text-gray-0/);
  const icon = html(Core.CdsBadge, { icon: "Add", iconOnly: true, "aria-label": "Added" });
  assert.match(icon, /role="img"/);
  assert.match(icon, /aria-label="Added"/);
  assert.match(icon, /aspect-square/);
  assert.match(icon, /\ue001/);
  assert.match(html(Core.CdsBadge, { icon: React.createElement("b", null, "!") }), /<b>!<\/b>/);
});

test("Badge removal uses translated labels and stops only activation-key propagation", () => {
  let calls = 0;
  const ref = React.createRef();
  const f = fixture(p => Core.CdsBadge.render(p, ref), {
    children: "Draft", onRemove: () => calls++, onClick() {},
  });
  assert.equal(f.tree.props.ref, ref);
  const remove = find(f.tree, n => n.type === "button");
  assert.equal(remove.props.type, "button");
  assert.equal(remove.props["aria-label"], "Remove Draft");
  const click = event(); remove.props.onClick(click);
  assert.equal(calls, 1); assert.equal(click.stopped, true);
  for (const handler of [remove.props.onKeyDown, remove.props.onKeyUp]) {
    for (const key of ["Enter", " "]) {
      const e = event(key); handler(e);
      assert.equal(e.stopped, true); assert.equal(e.defaultPrevented, false);
    }
    const e = event("ArrowRight"); handler(e); assert.equal(e.stopped, false);
  }
  assert.match(html(Core.CdsBadge, { children: React.createElement("b", null, "Tag"), onRemove() {} }), /aria-label="Remove item"/);
  assert.match(html(Core.CdsBadge, { children: "Draft", onRemove() {}, removeLabel: "Discard" }), /aria-label="Discard"/);
  const translated = renderToStaticMarkup(React.createElement(Core.ui.Provider, {
    value: (key, fallback, args) => {
      assert.equal(key, "removeItem"); assert.equal(fallback, "Remove {item}");
      return `删除 ${args.item}`;
    },
  }, React.createElement(Core.CdsBadge, { children: "草稿", onRemove() {} })));
  assert.match(translated, /aria-label="删除 草稿"/);
});

test("Badge custom removeRender retains its own handler, attributes and accessible override", () => {
  let calls = 0;
  const onClick = () => calls++;
  const f = fixture(Core.CdsBadge.render, {
    children: "Draft", removeLabel: "Remove draft",
    removeRender: React.createElement("a", {
      href: "#remove", onClick, className: "custom-remove", "aria-label": "Custom action",
    }),
  });
  const remove = find(f.tree, n => n.type === "a");
  assert.equal(remove.props.href, "#remove");
  assert.match(remove.props.className, /custom-remove/);
  assert.equal(remove.props["aria-label"], "Custom action");
  remove.props.onClick(event()); assert.equal(calls, 1);
  const markup = renderToStaticMarkup(f.tree);
  assert.match(markup, /data-cds="Icon"/);
  assert.doesNotMatch(markup, /<button/);
});

test("Badge shares the density and size Context owners with the other roots", () => {
  const render = (density, size) => renderToStaticMarkup(
    React.createElement(Core.Da.Provider, { value: density },
      React.createElement(Core.Vd.Provider, { value: size },
        React.createElement(Core.CdsBadge, { icon: "Add", children: "Tag" }))),
  );
  assert.match(render("comfortable"), /font-size:calc\(1rem/);
  assert.match(render("compact"), /font-size:calc\(0\.75rem/);
  assert.match(render("comfortable", "xxs"), /data-step="1"/);
  assert.match(render("comfortable", "xxs"), /font-size:calc\(0\.75rem/);
});

import babel from "../../tools/node_modules/playwright/lib/transform/babelBundle.js";
test("independent official traversal finds exactly the 146-root, published-state and lazy namespace closure and one state owner", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(pilot, "staging/src/generated/cds-core/manifest.json"), "utf8"));
  const sources = new Map();
  for (const m of manifest.modules) {
    const code = await fs.readFile(path.join(official.ionSource, m.source), "utf8");
    const ast = babel.babelParse(code, m.source, true);
    let program;
    babel.traverse(ast, { Program(p) { program = p; p.stop(); } });
    const exports = new Map();
    for (const n of ast.program.body)
      if (n.type === "ExportNamedDeclaration")
        for (const s of n.specifiers) exports.set(s.exported.name ?? s.exported.value, s.local.name);
    sources.set(m.source, { code, ast, program, exports });
  }
  const boundary = new Set(["i", "ce", "be"].map(n => `${official.vendorFrame}#${n}`));
  // Wave 3: the GrowthBook readers the host adapter replaces (shared-0 Rx = Uu, shared-25 wg = ls).
  const growthBook = new Set(["shared-0-CnnWnVrT.js#Uu", "shared-25-D-aF0gt9.js#ls"]);
  // Wave 4: react-intl's p / l in the chat chunk vendor-intl, answered by the adapter's host i18n block (never sliced).
  const hostIntl = new Set(["vendor-intl-BJgYK7RA.js#p", "vendor-intl-BJgYK7RA.js#l"]);
  // Wave 5: the preload helper's assetsURL a, answered by the adapter's viteAssetUrl (pins.localAdapterBoundaries).
  const pins5 = JSON.parse(await fs.readFile(path.join(pilot, "pins.json"), "utf8"));
  const localAdapters = new Set(Object.keys(pins5.localAdapterBoundaries));
  // Wave 8 (W8-M1 / W8-M2, pins.merge.wave8 localAdapterBoundaries): the GrowthBook readers shared-0 Ru / Ku and the window
  // state reader uO are cds-core host boundaries too (hostGrowthBookIsOn / hostGrowthBookValue / hostWindowState); the
  // traversal stops at them like at a (was: ["preload-helper-BBljBeZo.js#a"]).
  // wave 8d (R4-Q1): + shared-25 go / Z, shared-39 su (was: the four up to shared-0 uO).
  assert.deepEqual([...localAdapters], ["preload-helper-BBljBeZo.js#a", "shared-0-CnnWnVrT.js#Ru", "shared-0-CnnWnVrT.js#Ku", "shared-0-CnnWnVrT.js#uO",
    "shared-25-D-aF0gt9.js#go", "shared-25-D-aF0gt9.js#Z", "shared-39-ZCs0lAwB.js#su"]);
  const visited = new Set(), selected = new Set(), adapters = new Set();
  function refs(p) {
    const deps = new Set(), program = p.findParent(q => q.isProgram()) ?? p;
    const add = q => {
      const b = q.scope.getBinding(q.node.name);
      if (b?.scope === program.scope) deps.add(q.node.name);
    };
    if (p.isReferencedIdentifier()) add(p);
    p.traverse({
      ReferencedIdentifier: add,
      AssignmentExpression(q) {
        const n = q.node.left;
        if (n.type === "Identifier" && q.scope.getBinding(n.name)?.scope === program.scope)
          deps.add(n.name);
      },
    });
    return deps;
  }
  function visit(file, name) {
    const id = `${file}#${name}`;
    if (visited.has(id)) return;
    visited.add(id);
    if (boundary.has(id) || growthBook.has(id) || localAdapters.has(id)) { adapters.add(id); return; }
    const source = sources.get(file);
    assert.ok(source, `unlisted original source ${file}`);
    const binding = source.program.scope.getBinding(name);
    assert.ok(binding, `missing original binding ${id}`);
    if (binding.path.isImportSpecifier()) {
      const from = binding.path.parent.source.value.slice(2);
      const alias = binding.path.node.imported.name ?? binding.path.node.imported.value;
      if (from === official.vendorFrame && Object.hasOwn(official.reactAliases, alias)) return;
      if (hostIntl.has(`${from}#${alias}`)) { adapters.add(`${from}#${alias}`); return; }
      assert.ok(sources.has(from), `unlisted imported source ${from}`);
      visit(from, sources.get(from).exports.get(alias));
      return;
    }
    selected.add(id);
    for (const dep of refs(binding.path)) if (dep !== name) visit(file, dep);
  }
  // Resolve the frozen official exports, independently of manifest dependency lists.
  for (const alias of ["Id", "lf", "Zd", "Pu", "Ef", "ld"])
    visit(official.sharedFrame, sources.get(official.sharedFrame).exports.get(alias));
  // One less than before cds-core wave 5: the preload helper's assetsURL a is the viteAssetUrl adapter (not selected).
  assert.equal(selected.size, 1117);
  // Merged owner (cds-integrate): fields, layout and navigation roots join the same walk.
  for (const alias of ["Zi", "Xi", "Qa", "Eu"])
    visit(official.sharedFrame, sources.get(official.sharedFrame).exports.get(alias));
  visit("shared-11-CNsu0Zu8.js", sources.get("shared-11-CNsu0Zu8.js").exports.get("Nr"));
  // Page's generic root has no official export; x is pinned through its exported reader C (t).
  assert.ok(![...sources.get("cd75b47e6-BcflIwff.js").exports.values()].includes("x"));
  assert.equal(sources.get("cd75b47e6-BcflIwff.js").exports.get("t"), "C");
  visit("cd75b47e6-BcflIwff.js", "x");
  assert.equal(selected.size, 1998);
  // Wave 2 (cds-integrate/merge-pins-wave2.mjs): overlays, menus, dialogs, form-controls and display roots, each
  // resolved through its official export, join the same walk.
  const wave2 = {
    [official.sharedFrame]: ["cd", "sd", "Ua", "Td", "Dd", "Uf", "Kf", "Vs", "sa", "Za", "tc", "Bs", "Yl", "ql", "Jl",
      "pc", "Va", "Wi", "Nc", "Mc", "Kt", "ua", "ta", "ea", "$i", "Qi", "Ki", "Gi",
      "aa", "Ou", "ed", "id", "Nu", "eo", "Ui", "Da", "ks", "$r", "rf", "Gd", "od", "tm"],
    "c09817156-Yg3kFvSY.js": ["t"], "shared-2-CsjIBQD8.js": ["r"], "shared-183-B2N6Zy4J.js": ["Dr"],
  };
  for (const [file, aliases] of Object.entries(wave2))
    for (const alias of aliases) visit(file, sources.get(file).exports.get(alias));
  assert.equal(Object.values(wave2).flat().length, 45);
  assert.equal(selected.size, 2757);
  // Wave 3 (cds-integrate/merge-pins-wave3.mjs): cds-wave3-final and cds-surface-additions roots, each resolved through
  // its official export; the six internal ViewTabBar parts (no official export) through their pinned locals.
  const wave3 = {
    "cfe7c4b3b-DL00XXE5.js": ["t"], "cd9e4c7f2-CKPq1wry.js": ["n"], "c75e89812-DRkIsp6K.js": ["t", "n", "r"],
    "c1ea8a271-C3TY2pYF.js": ["t"], "cc18d27d7-CJQ6OnqZ.js": ["l"], "cdfb0c433-OOm3enZf.js": ["r"], "shared-62-DoCqVpIq.js": ["sS"],
    [official.vendorFrame]: ["S", "xa", "Ta", "Fa"],
    [official.sharedFrame]: ["Ff", "cf", "nm", "sf", "Rd", "yu", "Wa", "oa", "Ha", "Au", "Gf", "Vd", "Hs", "up", "sp", "Op", "jp", "hp",
      "Ep", "gd", "wc", "zf", "_p", "Du", "Np", "Tc", "bf", "Yu", "vp"],
    "shared-183-B2N6Zy4J.js": ["Ka"], "c04b2e418-B9im5gUL.js": ["t"],
  };
  for (const [file, aliases] of Object.entries(wave3))
    for (const alias of aliases) visit(file, sources.get(file).exports.get(alias));
  const internal = ["me", "M", "je", "fe", "ue", "Be"];
  for (const local of internal) {
    assert.ok(![...sources.get("cfe7c4b3b-DL00XXE5.js").exports.values()].includes(local), local);
    assert.ok(selected.has(`cfe7c4b3b-DL00XXE5.js#${local}`), `${local} is reached from ViewTabBar`);
  }
  assert.equal(Object.values(wave3).flat().length + internal.length, 50);
  // Wave 4 (cds-integrate/merge-pins-wave4.mjs): the cds-wave4 states / utils / components roots and the two
  // states-review P2 writers (shared-frame Ip = kn, shared-11 Ur = _n), each through its official export; the two roots
  // without one (isDocumentNode gd, createSafeStorage vs, reached from ownerWindow / safeLocalStorage) through their
  // pinned locals.
  const wave4 = {
    [official.sharedFrame]: ["Bf", "Vf", "Dp", "Lf", "Rf", "Tm", "$f", "su", "Ws", "Tu", "jd", "dp", "lu", "Xd", "Jd", "Ip"],
    "shared-25-D-aF0gt9.js": ["Gp", "Up", "Hp", "Ar", "jr"], "shared-92-BOgyxePb.js": ["ov"], "shared-0-CnnWnVrT.js": ["PT", "CC", "TC"],
    "vendor-all-0-uUCo-eCX.js": ["_"], "shared-62-DoCqVpIq.js": ["Ef"], [official.vendorFrame]: ["Kt"], "ce58a0513-CWdKvvaS.js": ["t"],
    "cc18d27d7-CJQ6OnqZ.js": ["c"], "ce802b15a-D3k3ccEH.js": ["t"], "c9c7785eb-0Yp6X-iJ.js": ["t", "n"], "shared-2-CsjIBQD8.js": ["i", "a", "o"],
    "shared-11-CNsu0Zu8.js": ["Ur"],
  };
  for (const [file, aliases] of Object.entries(wave4))
    for (const alias of aliases) visit(file, sources.get(file).exports.get(alias));
  for (const [file, local] of [["shared-25-D-aF0gt9.js", "gd"], ["shared-0-CnnWnVrT.js", "vs"]]) {
    assert.ok(![...sources.get(file).exports.values()].includes(local), local);
    assert.ok(selected.has(`${file}#${local}`), `${local} is reached from its root`);
  }
  assert.equal(Object.values(wave4).flat().length + 2, 39);
  // Published module states (pins.publicStates, wave 4) and the four new Contexts are linked by consumers whether or
  // not a root reaches them: each joins the walk through its pinned local.
  const pins4 = JSON.parse(await fs.readFile(path.join(pilot, "pins.json"), "utf8"));
  for (const s of Object.values(pins4.publicStates)) visit(s.file, s.local);
  for (const name of pins4.merge.wave4.contexts) visit(pins4.contexts[name].file, pins4.contexts[name].local);
  // Namespace dynamic imports make every exported binding reachable: the sheets namespace (ri) and the Spark sprite
  // strips (sM, wave 3).
  for (const file of ["c86ccec3d-CSD9PqcP.js", "cf2613ee5-Btwr9m9F.js"])
    for (const local of sources.get(file).exports.values()) visit(file, local);
  // Wave 8 (W8-M1, pins.merge.wave8.dynamicImports, dec-b moduleTargets): the two official lazy chunks a wave-8 binding loads
  // by namespace import(), vendor-datadog om -> c91b42814 and shared-0 NS -> c78048286, the same way.
  const lazy8 = pins4.merge.wave8.dynamicImports;
  assert.deepEqual(lazy8.map((d) => [d.importer, d.local, d.specifier]).sort(), [["shared-0-CnnWnVrT.js", "NS", "./c78048286-BYKo118F.js"], ["vendor-datadog-BVEJ_UMz.js", "om", "./c91b42814-CWEg9hC3.js"]]);
  for (const d of lazy8) {
    assert.ok(sources.get(d.importer).code.includes(`import("${d.specifier}")`), `${d.importer} import(${d.specifier})`);
    const file = d.specifier.replace("./", "");
    for (const local of sources.get(file).exports.values()) visit(file, local);
  }
  for (const name of ["Da", "Ku", "Ba", "Vd", "ui", "kc", "zu", "eu", "Pl"])
    assert.ok(selected.has(`${official.sharedFrame}#${name}`), `${name} is root-reachable without linkExports`);
  assert.ok(selected.has("cd9e4c7f2-CKPq1wry.js#n"), "the view-tab icon-size Context is root-reachable");
  // eN is the CdsInfoTooltip root now; its carried Text assignment (eN.Text = …) is reviewed below.
  assert.ok(selected.has(`${official.sharedFrame}#eN`));
  const frame = sources.get(official.sharedFrame);
  const text = frame.program.get("body").find(p => p.node.start === 347587);
  assert.equal(sha(frame.code.slice(text.node.start, text.node.end)), "42148450e502fdccd8d37c36bb5e193c52f127ec893913ab871d711ea991bc1e");
  for (const dep of refs(text)) visit(official.sharedFrame, dep);
  const vendor = sources.get(official.vendorFrame);
  const carry = vendor.program.get("body").find(p => p.node.start === 288728);
  assert.equal(sha(vendor.code.slice(carry.node.start, carry.node.end)), "63f0ea586bb39db1327a7fe2758c305ca19bbeae34822d3081e8c68cece62381");
  for (const dep of refs(carry)) visit(official.vendorFrame, dep);
  // display's carried Zq.isCdsPictogram=!0 (shared-frame VA reads it to tell a pictogram from an icon).
  const pictogram = sources.get("shared-183-B2N6Zy4J.js");
  const mark = pictogram.program.get("body").find(p => p.node.start === 428589);
  assert.equal(pictogram.code.slice(mark.node.start, mark.node.end), "Zq.isCdsPictogram=!0;");
  for (const dep of refs(mark)) visit("shared-183-B2N6Zy4J.js", dep);
  // Wave 5 (cds-integrate/merge-pins-wave5.mjs): the 50 cds-wave5 bindings (module state two or more 4.16336.0 graphs
  // cut, their writers / readers and vitePreload), and wave 5b (merge-pins-wave5b.mjs): the 96 cds-wave5b bindings (the
  // region graphs' shared module state, writers and pure links), each through its pinned local (pins.publicBindings:
  // declaration interval and hash), and the carried shared-62 pagehide / pageshow registration (writes af / of, registers sf);
  // wave 6 (merge-pins-wave6.mjs): the 1747 cds-wave6 bindings, pinned the same way; wave 7 (merge-pins-wave7.mjs,
  // cds-integrate/wave7/union.json publicNames 2300 -> 2377): the 77 cds-wave7 bindings, appended in the same order;
  // wave 8 (W8-M1 / W8-M3 / W8-M4, merge-pins-wave8.mjs, cds-integrate/wave8/union.json publicNames 2377 -> 2530): the 153
  // cds-wave8 bindings, appended in the same order (was: 1970, wave 5 .. wave 7); wave 8s (W8S-M1R, merge-pins-wave8s.mjs,
  // cds-integrate/wave8s/union.json publicNames 2530 -> 2927): the 397 cds-wave8s settings bindings, appended in the same order
  // (was: 2123, wave 5 .. wave 8); wave 8a / 8b (R4-K1, merge-pins-wave8a|wave8b.mjs, cds-integrate/wave8a|wave8b/union.json
  // publicNames 2927 -> 3187 -> 3193): the 260 identity values and the 6 addendum-B bindings, appended in the same order
  // (was: 2520, wave 5 .. wave 8s; the list ended with ...pins5.merge.wave8s.publicNames).
  // wave 8c (R4-K1, merge-pins-wave8c.mjs, cds-integrate/wave8c/union.json publicNames 3193 -> 3198): the 5 addendum-C bindings,
  // appended in the same order (was: 2786; the list ended with ...pins5.merge.wave8b.publicNames).
  // wave 8d (R4-Q1, merge-pins-wave8d.mjs, cds-integrate/wave8d/union.json publicNames 3198 -> 3209): the 11 addendum-D
  // bindings, appended in the same order (was: 2791; the list ended with ...pins5.merge.wave8c.publicNames).
  assert.equal(Object.keys(pins5.publicBindings).length, 2802);
  assert.deepEqual(Object.keys(pins5.publicBindings), [...pins5.merge.wave5.publicNames, ...pins5.merge.wave5b.publicNames, ...pins5.merge.wave6.publicNames, ...pins5.merge.wave7.publicNames, ...pins5.merge.wave8.publicNames, ...pins5.merge.wave8s.publicNames, ...pins5.merge.wave8a.publicNames, ...pins5.merge.wave8b.publicNames, ...pins5.merge.wave8c.publicNames, ...pins5.merge.wave8d.publicNames].map((e) => e.name));
  for (const [name, b] of Object.entries(pins5.publicBindings)) {
    assert.equal(sha(sources.get(b.file).code.slice(b.start, b.end)), b.sha256, name);
    visit(b.file, b.local);
  }
  const s62 = sources.get("shared-62-DoCqVpIq.js");
  const unload = s62.program.get("body").find(p => p.node.start === 40114);
  assert.equal(sha(s62.code.slice(unload.node.start, unload.node.end)), "c5d7db17d193f3197f90f8e147f4ecc4659e36a80ac736f64e6bf8ad4b8d71f3");
  assert.match(s62.code.slice(unload.node.start, unload.node.end), /window\.addEventListener\("pagehide",sf\)/);
  for (const dep of refs(unload)) visit("shared-62-DoCqVpIq.js", dep);
  // Wave 7 (W7-D2, pins.merge.wave7.decisionChanges merged "carry"): the two guarded vendor-zod global initialisers
  // `(Le=globalThis).__zod_globalConfig??(Le.__zod_globalConfig={});` and
  // `(Ti=globalThis).__zod_globalRegistry??(Ti.__zod_globalRegistry=Di());`, each through its pinned statement.
  const carried7 = pins5.merge.wave7.decisionChanges.filter((c) => c.merged === "carry");
  assert.deepEqual(carried7.map((c) => [c.file, c.feature]), [["vendor-zod-fszujTq6.js", "__zod_globalConfig??"], ["vendor-zod-fszujTq6.js", "__zod_globalRegistry??"]]);
  for (const change of carried7) {
    const src = sources.get(change.file);
    const statement = src.program.get("body").find((p) => p.node.start === change.start && p.node.end === change.end);
    assert.ok(statement, `${change.file}@${change.start}`);
    assert.equal(sha(src.code.slice(statement.node.start, statement.node.end)), change.sha256, change.feature);
    assert.ok(src.code.slice(statement.node.start, statement.node.end).includes(change.feature), change.feature);
    for (const dep of refs(statement)) visit(change.file, dep);
  }
  // Wave 8 (W7-D4 / W8-M1 / W8-M4, pins.merge.wave8.decisionChanges merged "carry"): the frame store Y's official companion
  // statement `Y.persist.onFinishHydration(NS)` (shared-92), through its pinned statement like the wave-7 carries.
  const carried8 = pins5.merge.wave8.decisionChanges.filter((c) => c.merged === "carry");
  assert.deepEqual(carried8.map((c) => [c.file, c.feature]), [["shared-92-BOgyxePb.js", "Y.persist.onFinishHydration(NS)"]]);
  for (const change of carried8) {
    const src = sources.get(change.file);
    const statement = src.program.get("body").find((p) => p.node.start === change.start && p.node.end === change.end);
    assert.ok(statement, `${change.file}@${change.start}`);
    assert.equal(sha(src.code.slice(statement.node.start, statement.node.end)), change.sha256, change.feature);
    assert.ok(src.code.slice(statement.node.start, statement.node.end).includes(change.feature), change.feature);
    for (const dep of refs(statement)) visit(change.file, dep);
  }
  const actual = manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`));
  assert.equal(new Set(actual).size, actual.length);
  assert.deepEqual([...selected].sort(), actual.sort());
  // Wave 8 (cds-integrate/wave8/union.json bindings 7321 -> 9746; was: 7321); wave 8s (W8S-M1R, cds-integrate/wave8s/union.json
  // bindings 9746 -> 10522, every wave-8 binding kept identical; was: 9746); wave 8a / 8b (R4-K1, cds-integrate/wave8b/union.json
  // bindings 10522 -> 10527, every wave-8s binding kept identical; was: 10522).
  // wave 8c (R4-K1 addendum C, cds-integrate/wave8c/union.json bindings 10527 -> 10533; was: 10527).
  // wave 8d (R4-Q1 addendum D, cds-integrate/wave8d/union.json bindings 10533 -> 10613; was: 10533).
  assert.equal(selected.size, 10613);
  assert.deepEqual([...adapters].sort(), [...boundary, ...growthBook, ...hostIntl, ...localAdapters].sort());
  const proof = JSON.parse(await fs.readFile(path.join(pilot, "provenance.json"), "utf8"));
  const bindings = new Map(proof.modules.flatMap(m => m.bindings.map(b => [b.id, b])));
  // moduleState follows the engine's isModuleState rule since the wave-4 merge fix: besides new Map / Set / WeakMap /
  // WeakSet and the local createContext aliases (shared-frame et, vendor-frame C), a call of an import whose vendor-frame
  // alias is React createContext (e.g. c9c7785eb `M=c(null)`). Older records lack the mark only on exactly those.
  const importedContext = (id) => {
    const [file, local] = id.split("#"), src = sources.get(file);
    const decl = src?.program.scope.getBinding(local)?.path.node;
    if (decl?.type !== "VariableDeclarator" || decl.init?.type !== "CallExpression" || decl.init.callee.type !== "Identifier") return false;
    const callee = src.program.scope.getBinding(decl.init.callee.name)?.path;
    if (!callee?.isImportSpecifier() || callee.parent.source.value !== `./${official.vendorFrame}`) return false;
    return official.reactAliases[callee.node.imported.name ?? callee.node.imported.value]?.[1] === "createContext";
  };
  for (const b of bindings.values()) if (importedContext(b.id)) assert.equal(b.moduleState, true, `${b.id} imported createContext is module state`);
  // Four-root (1069), six-root (1459), twelve-root (2108), 57-root (2852), 107-root (3055) and 146-root (3564) owners
  // before each merge: every binding record unchanged except that mark (the added counts are against today's
  // 9746-binding owner: wave 7 added 153 to the 7168 of wave 6, cds-integrate/wave7/union.json; wave 8 added 2425 to the
  // 7321 of wave 7, cds-integrate/wave8/union.json, so every count below is the wave-7 one + 2425, was: 6253 / 5863 / 5214 /
  // 4470 / 4267 / 3758; wave 8s (W8S-M1R) added 776 to the 9746 of wave 8, cds-integrate/wave8s/union.json, so every count
  // below is the wave-8 one + 776, was: 8678 / 8288 / 7639 / 6895 / 6692 / 6183; wave 8a / 8b (R4-K1) added 5 to the 10522
  // of wave 8s, cds-integrate/wave8b/union.json (wave 8a adds none), so every count below is the wave-8s one + 5, was: 9454 / 9064 /
  // 8415 / 7671 / 7468 / 6959; wave 8c (R4-K1 addendum C) added 6 to the 10527 of wave 8b, cds-integrate/wave8c/union.json, so every
  // count below is the wave-8b one + 6, was: 9459 / 9069 / 8420 / 7676 / 7473 / 6964; wave 8d (R4-Q1 addendum D) added 80 to the
  // 10533 of wave 8c, cds-integrate/wave8d/union.json, so every count below is the wave-8c one + 80, was: 9465 / 9075 / 8426 / 7682 /
  // 7479 / 6970), and except the official preload-helper a, which every one of them held and which wave 5
  // replaces by the host viteAssetUrl (pins.localAdapterBoundaries: no binding record any more).
  const sameExceptImportedContext = (now, was, id) => {
    if (localAdapters.has(id)) { assert.equal(now, undefined, id); return; }
    if (now?.moduleState && !was.moduleState && importedContext(id)) { const { moduleState, ...rest } = now; assert.deepEqual(rest, was, id); return; }
    assert.deepEqual(now, was, id);
  };
  for (const [file, count, added, roots] of [
    ["../cds-providers/before/provenance.json", 1069, 9545, ["CdsButton", "CdsIcon", "CdsSpinner", "CdsBadge"]],
    ["../cds-integrate/before/provenance.json", 1459, 9155, ["CdsButton", "CdsIcon", "CdsSpinner", "CdsBadge", "CdsRoot", "CdsTooltipProvider"]],
    ["../cds-integrate/wave2/before/pilot-provenance.json", 2108, 8506, ["CdsButton", "CdsIcon", "CdsSpinner", "CdsBadge", "CdsRoot", "CdsTooltipProvider",
      "CdsTextInputField", "CdsTextAreaField", "CdsPage", "CdsBanner", "CdsTabs", "CdsTextLink"]],
    ["../cds-integrate/wave3/before/pilot-provenance.json", 2852, 7762, Object.keys(JSON.parse(await fs.readFile(path.join(pilot, "../cds-integrate/wave3/before/pins.json"), "utf8")).roots)],
    // the 107-root owner before wave 4
    ["../cds-integrate/wave4/before/pilot-provenance.json", 3055, 7559, Object.keys(JSON.parse(await fs.readFile(path.join(pilot, "../cds-integrate/wave4/before/pins.json"), "utf8")).roots)],
    // the 146-root owner before wave 5
    ["../cds-integrate/wave5/before/pilot-provenance.json", 3564, 7050, Object.keys(JSON.parse(await fs.readFile(path.join(pilot, "../cds-integrate/wave5/before/pins.json"), "utf8")).roots)],
  ]) {
    const before = JSON.parse(await fs.readFile(path.join(pilot, file), "utf8"));
    const old = before.modules.flatMap(m => m.bindings);
    assert.equal(old.length, count);
    for (const b of old) sameExceptImportedContext(bindings.get(b.id), b, b.id);
    // added = bindings held now and not then (the replaced preload-helper a, held then, is not held now).
    assert.equal(bindings.size - old.filter((b) => !localAdapters.has(b.id)).length, added);
    for (const root of roots) assert.deepEqual(proof.roots[root], before.roots[root]);
  }
});

test("isolated output import graph closes without old UI, extra services or unreviewed dynamic imports", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(pilot, "staging/src/generated/cds-core/manifest.json"), "utf8"));
  const files = manifest.modules.map(m => path.join(pilot, "staging/src/generated/cds-core", m.target));
  files.push(path.join(pilot, "staging/src/pilot-adapter.mjs"));
  const output = new Map();
  let relative = 0, bare = 0;
  const dynamic = [];
  for (const file of files) {
    const code = await fs.readFile(file, "utf8"), ast = parseAst(code), exports = new Set();
    for (const n of ast.body) if (n.type === "ExportNamedDeclaration") {
      for (const s of n.specifiers) exports.add(s.exported.name);
      if (n.declaration?.type === "FunctionDeclaration") exports.add(n.declaration.id.name);
      if (n.declaration?.type === "VariableDeclaration")
        for (const d of n.declaration.declarations) for (const name of names(d.id)) exports.add(name);
    }
    babel.traverse(babel.babelParse(code, file, true), {
      CallExpression(p) { if (p.node.callee.type === "Import") dynamic.push([file, p.node.arguments[0]?.value]); },
      ImportExpression(p) { dynamic.push([file, p.node.source.value]); },
    });
    output.set(file, { ast, exports });
  }
  // The staging adapter's GrowthBook readers answer from the host's one table (app/src/host-growthbook.mjs).
  const hostGrowthBook = path.resolve(pilot, "../../../app/src/host-growthbook.mjs");
  // Wave 4: the adapter's host i18n block imports the chat area's createIntl and the electron/i18n catalog (leaves).
  const hostIntl = new Map([[path.resolve(pilot, "../../../app/src/generated/chat/vendor-intl-BJgYK7RA.js"), ["createIntl"]],
    [path.resolve(pilot, "../../../app/electron/i18n/index.mjs"), ["getLocale", "t"]]]);
  const reexports = [];
  for (const [file, { ast }] of output) for (const n of ast.body) if (n.type === "ExportNamedDeclaration" && n.source)
    reexports.push([path.basename(file), n.source.value, n.specifiers.map((x) => x.local.name ?? x.local.value)]);
  for (const [file, { ast }] of output) for (const n of ast.body) if (n.type === "ImportDeclaration") {
    if (n.source.value.startsWith(".")) {
      relative++;
      const target = path.resolve(path.dirname(file), n.source.value);
      if (target === hostGrowthBook && file.endsWith("/pilot-adapter.mjs")) {
        assert.deepEqual(n.specifiers.map((s) => s.imported.name), ["HOST_GROWTHBOOK", "growthBookFlagKey"]);
        continue;
      }
      if (hostIntl.has(target) && file.endsWith("/pilot-adapter.mjs")) {
        assert.deepEqual(n.specifiers.map((s) => s.imported.name), hostIntl.get(target));
        continue;
      }
      assert.ok(output.has(target), `unexpected dependency ${target}`);
      for (const s of n.specifiers) if (s.type === "ImportSpecifier")
        assert.ok(output.get(target).exports.has(s.imported.name), `${target} missing ${s.imported.name}`);
    } else {
      bare++;
      assert.ok(targets.has(n.source.value), `unexpected host import ${n.source.value}`);
    }
  }
  // 46 modules + the adapter; relative imports include the adapter's host-growthbook, two host i18n imports and (wave 5)
  // the viteAssetUrl re-export source; host framework imports (20 / 23 before wave 3, 34 before wave 4, 47 in wave 5;
  // wave 5b's six new chunk modules add six relative and six host framework imports, every bare specifier one the owner
  // already imported) now include the adapter's own react import. Wave 6: 130 modules + the adapter; its 84 new chunk
  // modules add 94 relative and 45 host framework imports (every bare specifier one the owner already imported: targets).
  // Wave 7 (cds-integrate/wave7/union.json modules 130 -> 137): 137 modules + the adapter; the 7 new chunk modules
  // (c9d6d9802, ce046217f, ce311b43f, vendor-flags, shared-160, c8ae173c6, c8d2b6a1c) carry 9 relative and 4 host framework
  // imports, and the 77 wave-7 bindings folded into the existing modules add 5 relative and 2 host framework imports
  // (round3/integrate-gates/tools/pilot-imports.mjs against cds-integrate/wave7/before/prod-manifest.json; every one still
  // resolves to an output export or a bare specifier in targets, asserted above).
  // Wave 8 (cds-integrate/wave8/union.json modules 137 -> 140): 140 modules + the adapter; the wave-8 bindings and the 3 new
  // chunk modules (vendor-datadog, c91b42814, c78048286) add 25 relative imports and no host framework import (was: 138, [202, 104]; counted on the real tree
  // before and on the wave-8 mirror after, every one still resolving to an output export or a bare specifier in targets).
  // Wave 8s (W8S-M1R, cds-integrate/wave8s/union.json modules 140 -> 164): 164 modules + the adapter; the 24 new chunk modules
  // and the wave-8s bindings add 25 relative and 14 host framework imports (was: 141, [227, 104]; counted on the real tree
  // before and on the wave-8s mirror after, cds-integrate/wave8s/scripts/pilot-imports-w8s.mjs, every one still resolving to an output
  // export or a bare specifier in targets, asserted above).
  // Wave 8a / 8b (R4-K1, modules 164 -> 164): the wave-8b bindings folded into shared-8 add 2 relative imports (./shared-92.mjs,
  // ./vendor-all-0.mjs) and no host framework import (was: 165, [252, 118]; counted on the real tree before and on the wave-8ab
  // mirror after, cds-integrate/wave8ab/scripts/pilot-imports-ab.mjs, logs/pilot-imports-{real,mirror}.json).
  // Wave 8c (R4-K1 addendum C, modules 164 -> 164): the wave-8c bindings folded into shared-4 add one host framework import
  // (shared-4.mjs `import { createContext as D } from "react"`, the official rO = D(null)) and no relative import (was: 165,
  // [254, 118]; counted on the real tree before and on the wave-8c mirror after, cds-integrate/wave8c/scripts/pilot-imports-c.mjs,
  // logs/pilot-imports-{real,mirror}.json).
  // Wave 8d (R4-Q1, modules 164 -> 164): Pu's closure bindings folded into existing modules add 6 relative imports and no host
  // import (was: [254, 119]; counted on the real tree before and on the wave-8d mirror after,
  // cds-integrate/wave8d/scripts/pilot-imports-d.mjs, logs/pilot-imports-{real,mirror}.json).
  assert.equal(output.size, 165); assert.deepEqual([relative, bare], [260, 119]);
  // Wave 5: the adapter's one re-export, the host viteAssetUrl (app/src/view-tabs-asset-url.mjs, a leaf without imports).
  // Wave 8 (W8-M1 / W8-M2, pins.merge.wave8 localAdapterBoundaries): the GrowthBook readers shared-0 Ru / Ku and the window
  // state reader uO re-export their host answers, hostGrowthBookIsOn / hostGrowthBookValue (app/src/host-growthbook.mjs, the
  // adapter's one GrowthBook table) and hostWindowState (app/src/host-window-state.mjs, an import-free leaf) (was: viteAssetUrl only).
  assert.deepEqual(reexports, [["pilot-adapter.mjs", "../../../../../app/src/view-tabs-asset-url.mjs", ["viteAssetUrl"]],
    ["pilot-adapter.mjs", "../../../../../app/src/host-growthbook.mjs", ["hostGrowthBookIsOn", "hostGrowthBookValue"]],
    ["pilot-adapter.mjs", "../../../../../app/src/host-window-state.mjs", ["hostWindowState"]],
    // Wave 8d (R4-Q1): the session-presets host boundaries (app/src/host-session-presets.mjs, an import-free leaf) (was: the
    // three re-exports above).
    ["pilot-adapter.mjs", "../../../../../app/src/host-session-presets.mjs", ["hostUseGrowthBookFeature", "hostUseCurrentAccount", "hostLoadEnvironmentDialogChunk"]]]);
  for (const leaf of ["view-tabs-asset-url.mjs", "host-window-state.mjs", "host-session-presets.mjs"]) // wave 8d: + host-session-presets.mjs
    assert.deepEqual(parseAst(await fs.readFile(path.resolve(pilot, `../../../app/src/${leaf}`), "utf8")).body.filter((n) => n.type === "ImportDeclaration" || n.source), [], leaf);
  // Wave 8 (W8-M1, pins.merge.wave8.dynamicImports): shared-0 NS and vendor-datadog om load the official lazy chunks
  // c78048286 / c91b42814, emitted under their official names (was: the two shared-frame imports only).
  assert.deepEqual(dynamic.map(([f, s]) => [path.basename(f), s]).sort(), [["shared-0.mjs", "./c78048286-BYKo118F.js"], ["shared-frame.mjs", "./c86ccec3d-CSD9PqcP.js"], ["shared-frame.mjs", "./cf2613ee5-Btwr9m9F.js"], ["vendor-datadog.mjs", "./c91b42814-CWEg9hC3.js"]]);
  for (const [f, s] of dynamic) assert.ok(output.has(path.resolve(path.dirname(f), s)));
  const shared = output.get(files.find(f => f.endsWith("/shared-frame.mjs"))).exports;
  for (const root of ["CdsButton", "CdsIcon", "CdsSpinner", "CdsBadge", "CdsRoot", "CdsTooltipProvider", "CdsTextInputField", "CdsTextAreaField", "CdsBanner", "CdsTextLink"])
    assert.ok(shared.has(root), root);
  assert.ok(output.get(files.find(f => f.endsWith("/shared-11.mjs"))).exports.has("CdsTabs"));
  assert.ok(output.get(files.find(f => f.endsWith("/page.mjs"))).exports.has("CdsPage"));
  // Wave 2: every pinned root is exported under its semantic name by the module of its source.
  const pins = JSON.parse(await fs.readFile(path.join(pilot, "pins.json"), "utf8"));
  assert.equal(Object.keys(pins.roots).length, 146);
  for (const [semantic, root] of Object.entries(pins.roots)) {
    const target = manifest.modules.find(m => m.source === root.file).target;
    // A link-export root (wave 4: isDocumentNode, createSafeStorage) is exported under its local.
    assert.ok(output.get(files.find(f => f.endsWith(`/${target}`))).exports.has(root.publish === "linkExport" ? root.local : semantic), semantic);
  }
});

const root = (props, ...children) => React.createElement(Core.CdsRoot, props, ...children);
let Vendor;
before(async () => {
  Vendor = await import(pathToFileURL(path.join(pilot, "staging/src/generated/cds-core/vendor-frame.mjs")).href);
});
function observeRoot(inspect) {
  return function Probe() {
    const values = Object.fromEntries(["Da", "Wa", "Ci", "ui", "Ba", "ja", "Ma", "Na", "Pa", "Ua", "Ia", "Ra", "Ha", "rr", "ka", "qn", "hm"].map(n => [n, React.useContext(Core[n])]));
    values.direction = React.useContext(Vendor.Yn)?.direction ?? "ltr";
    values.baseTooltipDelay = React.useContext(Vendor.ld);
    inspect(values);
    return null;
  };
}
test("Root provides real density, locale, labels, direction, router and experimental Contexts to the existing controls", (t) => {
  const navigations = [], intents = [];
  const router = { resolveHref: href => `/local${href}`, navigate: (href, options) => navigations.push([href, options]), intentHandlers: href => ({ onFocus: () => intents.push(href) }) };
  const labels = (key, fallback, args) => key === "removeItem" ? `移除 ${args.item}` : undefined;
  const Probe = observeRoot(v => {
    assert.equal(v.Da, "compact"); assert.equal(v.Wa, "zh-TW");
    assert.equal(v.Ci, router); assert.equal(v.ui, labels);
    assert.equal(v.direction, "rtl"); assert.equal(v.Ba, true);
    assert.equal(v.ja, "desktop"); assert.equal(v.Ma, "system");
    assert.equal(v.Na, "Local Mono"); assert.equal(v.Pa, "surface-1");
    assert.equal(v.Ia, true); assert.equal(v.Ra, false);
  });
  const result = renderToStaticMarkup(root({ density: "compact", locale: " zh-TW ", direction: "rtl", router, labels, mode: "dark", platform: "desktop", font: "system", fontMono: " Local Mono ", pageBackground: "surface-1", experimental: { automaticDelayedBusy: true, naturalImageTiles: true, shrinkWrapMemory: false } },
    React.createElement(Probe), React.createElement(Core.CdsButton, { href: "/docs", icon: "Add", children: "Docs" }), React.createElement(Core.CdsBadge, { icon: "Add", onRemove() {}, children: "草稿" }), React.createElement(Core.CdsSpinner, { inheritColor: true })));
  assert.match(result, /data-density="compact"/); assert.match(result, /data-mode="dark"/);
  assert.match(result, /data-platform="desktop"/); assert.match(result, /data-font="system"/);
  assert.match(result, /data-page-bg="surface-1"/);
  assert.match(result, /--cds-font-mono-override:&quot;Local Mono&quot;,/);
  assert.match(result, /href="\/local\/docs"/); assert.match(result, /aria-label="移除 草稿"/);
  assert.match(result, /font-size:calc\(0\.75rem/); assert.match(result, /data-cds="Spinner"/);
  // Same-origin routing is a browser contract; provide its actual URL shape.
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  globalThis.window = { location: new URL("http://127.0.0.1:4337/") };
  t.after(() => { if (prior) Object.defineProperty(globalThis, "window", prior); else delete globalThis.window; });
  // Obtain the actual Button's handlers while its real Root providers are active.
  let anchor;
  const Capture = () => { anchor = fixture(Core.CdsButton.render, { href: "/docs", routerOptions: { replace: true }, children: "Docs" }, new Map([[Core.Ci, React.useContext(Core.Ci)]])).tree; return null; };
  renderToStaticMarkup(root({ router }, React.createElement(Capture)));
  const a = find(anchor, n => n.type === "a");
  assert.ok(a); const click = event(undefined, { button: 0 }); a.props.onClick(click);
  assert.equal(click.defaultPrevented, true);
  assert.deepEqual(navigations, [["/docs", { replace: true }]]);
  a.props.onFocus(event()); assert.deepEqual(intents, ["/docs"]);
});

test("nested Roots inherit omitted props and override explicit props with label fallback and one mode store", () => {
  const calls = [];
  const outerRouter = { navigate: href => calls.push(href) }, innerRouter = { navigate: href => calls.push(`inner:${href}`) };
  const outerLabels = (key, fallback, args) => key === "removeItem" ? `Outer ${args.item}` : "Outer fallback";
  const innerLabels = key => key === "custom" ? "Inner custom" : "";
  let outer, inherited, overridden;
  const A = observeRoot(v => { outer = v; });
  const B = observeRoot(v => { inherited = v; });
  const C = observeRoot(v => { overridden = v; });
  const markup = renderToStaticMarkup(root({ density: "comfortable", mode: "dark", locale: "fr", direction: "rtl", platform: "desktop", router: outerRouter, labels: outerLabels, fontMono: "Outer Mono", experimental: { automaticDelayedBusy: true, densityOverride: "compact", fizzyLake: { parts: ["color"] } } },
    React.createElement(A), root({}, React.createElement(B), React.createElement(Core.CdsBadge, { onRemove() {}, children: "Tag" })),
    root({ density: "comfortable", mode: "light", locale: " de ", direction: "ltr", router: innerRouter, labels: innerLabels, fontMono: null, experimental: { densityOverride: "comfortable", automaticDelayedBusy: false, fizzyLake: { parts: ["panels"] } } }, React.createElement(C), React.createElement(Core.CdsBadge, { onRemove() {}, children: "Nested" }))));
  for (const key of ["Da", "Wa", "Ci", "ui", "Ba", "ja", "Ma", "Na", "Pa", "Ua", "Ia", "Ra", "Ha", "rr", "ka", "qn", "direction"]) assert.equal(inherited[key], outer[key], key);
  assert.equal(overridden.Da, "comfortable"); assert.equal(outer.Da, "compact");
  assert.equal(overridden.Wa, "de"); assert.equal(overridden.Ci, innerRouter);
  assert.equal(overridden.direction, "ltr"); assert.equal(overridden.Na, null); assert.equal(overridden.Ba, false);
  assert.equal(overridden.rr, "color panels");
  assert.notEqual(overridden.ka, outer.ka); assert.equal(overridden.ka.getServerAttrSnapshot(), "light");
  assert.equal(overridden.qn, outer.qn);
  assert.equal(overridden.ui("custom"), "Inner custom");
  assert.equal(overridden.ui("removeItem", "Remove {item}", { item: "X" }), "Outer X");
  assert.match(markup, /aria-label="Outer Tag"/); assert.match(markup, /aria-label="Outer Nested"/);
  assert.match(markup, /--cds-font-mono-override:initial/);
});

test("Root preserves official render slot, html slot, mode and page/font style contracts", () => {
  const result = renderToStaticMarkup(root({ mode: "light", density: "comfortable", pageBackground: "#123456", font: "system", fontMono: 'A"B', className: "outer", render: React.createElement("section", { id: "slot", className: "slot", style: { color: "red" }, "data-probe": "yes" }) }, "Body"));
  assert.match(result, /^<section/); assert.match(result, /id="slot"/);
  assert.match(result, /data-probe="yes"/); assert.match(result, /class="slot cds-root text-primary outer"/);
  assert.match(result, /--cds-page-bg:#123456/); assert.match(result, /font-size:var\(--cds-font-size-body\)/);
  assert.match(result, /color:red/); assert.match(result, />Body<\/section>$/);
  const htmlSlot = renderToStaticMarkup(root({ mode: "dark", render: React.createElement("html", { lang: "ja", dir: "rtl" }) }, React.createElement("body", null, "HTML slot")));
  assert.match(htmlSlot, /<html[^>]*data-mode="dark"/); assert.match(htmlSlot, /lang="ja"/);
  assert.doesNotMatch(htmlSlot, /font-size:/);
  assert.doesNotMatch(html(Core.CdsRoot, {}), /data-mode=/);
});

test("TooltipProvider shares original delay Context, inherits delay, resets close delay, and permits explicit zero", () => {
  const results = [];
  const Probe = observeRoot(v => results.push([v.hm, v.baseTooltipDelay]));
  const tip = (props, ...children) => React.createElement(Core.CdsTooltipProvider, props, ...children);
  renderToStaticMarkup(tip({}, React.createElement(Probe), tip({ delay: 75, closeDelay: 90 }, React.createElement(Probe), tip({}, React.createElement(Probe)), tip({ delay: 0, closeDelay: 0 }, React.createElement(Probe)))));
  assert.deepEqual(results, [[300, 300], [75, 75], [75, 75], [0, 0]]);
  const tree = fixture(Core.CdsTooltipProvider, { closeDelay: 9, children: "X" }, new Map([[Core.hm, 25]])).tree;
  assert.equal(tree.type, Core.hm.Provider); assert.equal(tree.props.value, 25);
  assert.equal(tree.props.children.props.delay, 25); assert.equal(tree.props.children.props.closeDelay, 9);
  const nested = fixture(Core.CdsTooltipProvider, { children: "X" }, new Map([[Core.hm, 25]])).tree;
  assert.equal(nested.props.children.props.closeDelay, 200);
  const markup = renderToStaticMarkup(root({ density: "compact" }, tip({ delay: 0 }, React.createElement(Core.CdsButton, { iconOnly: true, icon: "Add", "aria-label": "Add", tooltip: "Add item" }))));
  assert.match(markup, /data-cds="Button"/); assert.match(markup, /data-cds="Icon"/);
});

test("the pinned lazy sheet namespace imports and renders with the same host and core owners", async () => {
  const lazy = await import(pathToFileURL(path.join(pilot, "staging/src/generated/cds-core/c86ccec3d-CSD9PqcP.js")).href);
  // Wave 4: the sheet chunk's three module states (kt, Z, Lt; pins.publicStates) are link exports too.
  assert.deepEqual(Object.keys(lazy).sort(), ["ComboboxSheetBackdrop", "Lt", "MenuSheetPopup", "PopoverSheetBackdrop", "PopoverSheetContent", "SheetPopupHost", "Z", "kt"].sort());
  let value;
  const markup = renderToStaticMarkup(root({}, React.createElement(lazy.SheetPopupHost, { children: state => { value = state; return React.createElement("b", null, "Lazy host"); } })));
  assert.match(markup, /<b>Lazy host<\/b>/); assert.ok(value);
});

test("Root experimental theme store preserves its original resolve, nested ownership and SSR apply boundary", () => {
  const theme = { id: "fixture-theme", accent: "#123456" }, resolved = { accent: "#654321" };
  const resolutions = [], applications = [];
  const spec = { theme, resolve: value => { resolutions.push(value); return resolved; }, apply: (value, { target }) => applications.push([value, target]) };
  let owner, nested;
  const A = observeRoot(v => { owner = v.qn; });
  const B = observeRoot(v => { nested = v.qn; });
  renderToStaticMarkup(root({ experimental: { theme: spec } }, React.createElement(A), root({ experimental: { theme: { theme: { id: "nested" }, resolve: () => assert.fail("nested Root must inherit theme owner") } } }, React.createElement(B))));
  assert.equal(nested, owner); assert.equal(owner.getId(), "fixture-theme");
  assert.deepEqual(owner.getServerSnapshot(), { theme, resolved });
  assert.deepEqual(resolutions, [theme]); assert.deepEqual(applications, []);
});
