// The request_access access card's own parts (docs/computer-use-ui-css-source-20261020.md §1; 2.42304.0 c96d752d0
// ZEe / TT / GEe). The card around them is SourceApprovalCardView, as for every approval: the card shell and outline,
// the Reason clamp, Deny (Esc) and the one "Allow for this session" (⌘↵), arming and landing. The model is
// computer-use-model.mjs computerUseAccessRequest / computerUseAccessRows / computerUseAccessTitle.
import React from "react";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";
import { ListBadge } from "./source-customize-list.jsx";
import { computerUseTeachRowLabels } from "./computer-use-model.mjs";
import "./computer-use-approval-card.css";

// One translatable sentence per title variant with the emphasized parts as placeholders, so each language keeps its
// own word order and spacing (zh-CN joins 使用 and 这些功能 without a space).
const MARK = "\u0001";
function rich(template, values, parts) {
  const text = t(template, { ...values, ...Object.fromEntries(Object.keys(parts).map((key) => [key, `${MARK}${key}${MARK}`])) });
  return text.split(new RegExp(`${MARK}(\\w+)${MARK}`)).map((piece, index) => index % 2 ? <React.Fragment key={index}>{parts[piece]}</React.Fragment> : piece);
}

/**
 * ZEe: "Allow Claude to <b>use</b> …?": the verb, and for one app its name, in the primary color (sac-em); the rest
 * of the title keeps the heading's color.
 * @param {{title: {kind: "app" | "apps" | "capabilities" | "computer", app?: string, count?: number}, name: string}} props
 */
export function ComputerUseAccessTitle({ title, name }) {
  const use = <span className="sac-em">{t("use")}</span>;
  if (title.kind === "computer") return <>{rich("Allow {name} to {useYourComputer}?", { name }, { useYourComputer: <span className="sac-em">{t("use your computer")}</span> })}</>;
  if (title.kind === "app") return <>{rich("Allow {name} to {use} {app}?", { name }, { use, app: <span className="sac-em"><span className="[unicode-bidi:isolate]">{title.app}</span></span> })}</>;
  if (title.kind === "apps") return <>{rich("Allow {name} to {use} {count} apps?", { name, count: title.count }, { use })}</>;
  return <>{rich("Allow {name} to {use} these capabilities?", { name }, { use })}</>;
}

/**
 * The takeover card's title (official wa / JEe takeoverFrom): "Take over the screen? …". Three variants, by whether
 * the preferred mode is Background and whether an app was named. The whole title is the heading color (no sac-em), as
 * the official card renders it in a plain semibold paragraph.
 * @param {{takeover: {becausePreferredBackground: boolean, appName: string | null}}} props
 */
export function ComputerUseTakeoverTitle({ takeover, name }) {
  if (takeover.becausePreferredBackground) {
    return <>{t("Take over the screen? You’ve set Background as your preferred mode, so {name} is checking before switching to full-screen control.", { name })}</>;
  }
  if (takeover.appName) {
    return <>{rich("Take over the screen? {name} was working on {app} in the background and now needs full-screen control.",
      { name }, { app: <span className="[unicode-bidi:isolate]">{takeover.appName}</span> })}</>;
  }
  return <>{t("Take over the screen? {name} was working in the background and now needs full-screen control.", { name })}</>;
}

/** TT: one requested capability (read-only text; the grant is all or nothing). */
function CapabilityRow({ icon, label }) {
  return <div role="listitem" className="cua-row flex items-center gap-sm rounded-[5px] px-md py-md bg-alpha-1" data-cua-capability="">
    <Icon name={icon} size={20} className="text-muted-as-secondary shrink-0" />
    <div className="text-body text-primary flex-1">{label}</div>
  </div>;
}

/** GEe: one app: icon, name, the risk line for apps that can do more than their tier says, the tier on the right. */
function AppRow({ app }) {
  const missing = app.installed === false;
  return <div role="listitem" className={`cua-row flex items-center gap-sm rounded-[5px] px-md py-md bg-alpha-1${missing ? " opacity-50" : ""}`}
    data-cua-app={app.bundleId ?? app.name} data-cua-risk={app.risk ?? undefined}>
    {app.iconDataUrl
      ? <img src={app.iconDataUrl} alt="" draggable={false} className="size-[20px] rounded-[4px] shrink-0 scale-[1.15]" />
      : <div aria-hidden="true" className="size-[20px] rounded-[4px] bg-alpha-2 shrink-0" />}
    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
      <div className="text-body text-primary truncate [unicode-bidi:isolate]">
        {missing ? rich("{app} {status}", {}, { app: app.name, status: <span className="text-muted-as-secondary">{t("(not installed)")}</span> }) : app.name}
      </div>
      {app.riskLabel && <div className="text-footnote text-warning">{app.riskLabel}</div>}
    </div>
    {app.tierLabel && <span className="text-footnote text-muted-as-secondary shrink-0" data-cua-tier="">{app.tierLabel}</span>}
  </div>;
}

/**
 * The capabilities, then the apps (already granted ones left out, risky ones first), 3px apart.
 * @param {{rows: {flags: object[], apps: object[]}}} props
 */
export function ComputerUseAccessList({ rows }) {
  if (!rows.flags.length && !rows.apps.length) return null;
  return <div role="list" aria-label={t("Requested access")} className="cua-list flex flex-col gap-0.75">
    {rows.flags.map((flag) => <CapabilityRow key={flag.key} icon={flag.icon} label={flag.label} />)}
    {rows.apps.map((app) => <AppRow key={app.key} app={app} />)}
  </div>;
}

// ── The teach card (official ca31fdde5 Ua / Wa for computer:request_teach_access, its app row Hi / Ui and icon Wi).
// docs/computer-use-official-spec-20261021.md §2.1.1: every class string is the original's (all in the loaded
// c6a992d55 CSS). The card shell and the Deny / Start guide buttons are SourceApprovalCardView's teach branch.
const TEACH_TIER_BADGE = { read: "accent", click: "accent", full: "neutral" };

/** Hi: one app — its icon (Wi), its name, Already allowed or its tier, "(not installed)"; a risky app's warning line. */
function TeachAppRow({ app }) {
  const { tier, risk } = computerUseTeachRowLabels(app);
  return <div className={`p-2.5 ${app.resolved ? "" : "opacity-50"}`} data-cua-app={app.bundleId ?? app.name} data-cua-risk={app.risk ?? undefined}>
    <div className="flex items-center gap-sm">
      {app.iconDataUrl
        ? <div className="size-5 shrink-0 overflow-hidden rounded-[4px]"><img src={app.iconDataUrl} alt="" className="size-full scale-[1.15]" /></div>
        : <div className="size-5 shrink-0 rounded-[4px] bg-alpha-2" />}
      <span className="min-w-0 flex-1 truncate text-body text-secondary [unicode-bidi:isolate]">{app.name}</span>
      {app.resolved
        ? app.alreadyGranted
          ? <ListBadge variant="neutral">{t("Already allowed")}</ListBadge>
          : tier && <ListBadge variant={TEACH_TIER_BADGE[app.tier] ?? "neutral"}>{tier}</ListBadge>
        : <span className="shrink-0 text-footnote text-muted-as-secondary">{t("(not installed)")}</span>}
    </div>
    {risk && <div className="ms-7 mt-1 flex items-start gap-1.5 text-footnote text-danger">
      <Icon name="Warning" size={14} className="mt-0.5 shrink-0" />
      <span>{risk}</span>
    </div>}
  </div>;
}

/**
 * Ua's body (inside the card's "p-md"): the GraduationCap header "Let Claude guide you step by step?", the reason, what
 * happens (the window hides, a tooltip per step, Exit), the apps, then the buttons (`actions`: Deny ⌘. and Start guide
 * ⌘↵). The "other windows will be hidden" line is left out: this build doesn't hide other apps before acting.
 * @param {{teach: {reason: string, apps: object[]}, name: string, actions: React.ReactNode}} props
 */
export function ComputerUseTeachCardBody({ teach, name, actions }) {
  return <div className="p-md">
    <div className="mb-1 flex items-start gap-2">
      <Icon name="GraduationCap" size={20} className="shrink-0 text-secondary" />
      <span className="font-semibold text-body text-secondary">{t("Let {name} guide you step by step?", { name })}</span>
    </div>
    <p className="ms-7 mb-2 text-body text-secondary">{teach.reason}</p>
    <p className="ms-7 mb-3 text-footnote text-muted-as-secondary">{t("The {name} window will hide. A tooltip appears next to each step with a Next button. Click Exit anytime to stop.", { name })}</p>
    {teach.apps.length > 0 && <div className="ms-7 mb-3 divide-y rounded border bg-surface-1">
      {teach.apps.map((app) => <TeachAppRow key={app.key} app={app} />)}
    </div>}
    <div className="ms-7 flex gap-sm">{actions}</div>
  </div>;
}
