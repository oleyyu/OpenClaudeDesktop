// w12b-slash-plugin-groups: the Add menu's Plugins popup as 3.6556.2 draws it (c752b32f8-mYZAs6yC us → zi / Ui / Gi / Qi).
//
// us hands its popup `{items: F, footerItems: [T, D], search: b ? {…} : void 0}`:
//   - items: customize-model pluginMenuRows — a plugin's submenu (Ui: SubmenuTrigger `{icon: _, className: e("group", p),
//     children: Zi({label, subtitle})}`, its popup Gi with `submenuClassName: "max-h-[284px]"`), or a plugin folded to its
//     one skill (Qi: `h.Item {labelDir: "auto", icon, hint: pluginLabel, …}`, SourceMenu.SkillItem);
//   - footerItems: T "Manage plugins" (icon Tool) and D "Browse plugins" (icon Add), which Gi puts after a Separator in
//     the popup's fixed footer, the list above them capped at 8.5 rows (add-menu-model addSubmenuFrame);
//   - search: only while `_` (singleSkillRows || connectorsFolded) is on, which the host's gates never are
//     (customize-model pluginMenuFlags), so no search field.
// Zi: a subtitle stacks under the label, `span.flex.min-w-0.flex-col > [label, span.truncate.text-footnote.text-muted-as-secondary]`.
import React from "react";
import { SourceMenu } from "./source-menu";
import { addSubmenuFrame } from "./add-menu-model.mjs";
import { t } from "../electron/i18n/index.mjs";

export const PLUGIN_SUBTITLE_STACK_CLASS = "flex min-w-0 flex-col";
export const PLUGIN_SUBTITLE_CLASS = "truncate text-footnote text-muted-as-secondary";

export function AddPluginSubmenuLabel({ label, subtitle }) {
  if (!subtitle) return label;
  return <span className={PLUGIN_SUBTITLE_STACK_CLASS}><span className="block truncate">{label}</span><span className={PLUGIN_SUBTITLE_CLASS}>{subtitle}</span></span>;
}

export function AddPluginRow({ row, onSkill }) {
  if (row.type === "skill") return <SourceMenu.SkillItem item={row} onSelect={onSkill} />;
  const frame = addSubmenuFrame(row.submenuClassName);
  return (
    <SourceMenu.Submenu>
      <SourceMenu.SubmenuTrigger icon={row.icon} className="group" data-plugin-id={row.id}>
        <AddPluginSubmenuLabel label={row.label} subtitle={row.subtitle} />
      </SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={row.label} className={`add-plugin-skills-popup ${frame.className}`} style={frame.style} maxVisibleItems={frame.maxVisibleItems}>
        {row.items.map((item) => <SourceMenu.SkillItem key={item.path} item={item} onSelect={onSkill} />)}
      </SourceMenu.Popup>
    </SourceMenu.Submenu>
  );
}

/** The Plugins submenu's popup: us's rows, then the Manage / Browse footer. */
export function AddPluginsPopup({ rows, onSkill, onManage, onBrowse }) {
  const frame = addSubmenuFrame(undefined);
  return (
    <SourceMenu.Popup label={t("Plugins")} className="add-plugins-popup" maxVisibleItems={frame.maxVisibleItems}
      footer={<>
        <SourceMenu.Separator />
        <SourceMenu.Item icon="Tool" onClick={onManage}>{t("Manage plugins")}</SourceMenu.Item>
        <SourceMenu.Item icon="Add" data-add-browse-plugins="" onClick={onBrowse}>{t("Browse plugins")}</SourceMenu.Item>
      </>}>
      {rows.map((row) => <AddPluginRow key={row.type === "skill" ? `skill:${row.path}` : `plugin:${row.id}`} row={row} onSkill={onSkill} />)}
    </SourceMenu.Popup>
  );
}
