// Composer Add › Tools: one session's turned-off tools (prefs/tool-profiles.mjs,
// harness tool-gate.js). Profiles at the top apply a saved set; the rows below
// switch single tools and MCP servers (checked = on). Rows keep the menu open,
// so several can be switched in a row.
import React from "react";
import { SourceMenu } from "./source-menu.jsx";
import { isToolOff, requiredToolOff, sameSelection } from "../electron/prefs/tool-profiles.mjs";
import { t } from "../electron/i18n/index.mjs";

/**
 * @param {{
 *   catalog: {tools: {name: string, kind: string, description?: string}[], servers: {name: string, tools: object[]}[]} | null,
 *   selection: {disabled: string[], disabledServers: string[]} | null,
 *   profiles: {id: string, name: string, tools: object | null}[],
 *   onToggle: (name: string, options?: {server?: boolean}) => void,
 *   onProfile: (profile: object | null) => void,
 *   onManage: () => void,
 * }} props
 */
export function SourceToolsMenu({ catalog, selection, profiles = [], onToggle, onProfile, onManage }) {
  const loading = catalog === null;
  const tools = catalog?.tools ?? [], servers = catalog?.servers ?? [];
  const serverOff = (name) => !!selection?.disabledServers?.includes(name);
  return (
    <>
      <SourceMenu.GroupLabel>{t("Tool profile")}</SourceMenu.GroupLabel>
      <SourceMenu.Item checked={!selection} checkedRole="radio" onClick={() => onProfile(null)}>{t("All tools")}</SourceMenu.Item>
      {profiles.map((profile) => (
        <SourceMenu.Item key={profile.id} checked={!!selection && sameSelection(selection, profile.tools)} checkedRole="radio"
          onClick={() => onProfile(profile)}>{profile.name}</SourceMenu.Item>
      ))}
      <SourceMenu.Separator />
      <SourceMenu.PendingList loading={loading} placeholderRows={4}>
        {tools.length > 0 && <SourceMenu.GroupLabel>{t("Tools")}</SourceMenu.GroupLabel>}
        {/* A tool the agent's own config turns off (tools/list disabledReason: Kimi's [tools]) shows as off, not switchable. */}
        {/* A tool the agent stops together with another (tools/list requires) shows as off and fixed while that one is off. */}
        {tools.map((tool) => {
          const withTool = tool.disabledReason ? null : requiredToolOff(tool, selection);
          const reason = tool.disabledReason ? t(tool.disabledReason) : withTool ? t("Turned off with {tool}", { tool: withTool }) : undefined;
          return <SourceMenu.Item key={tool.name} keepOpen checked={!reason && !isToolOff(tool.name, selection)} title={tool.description ? t(tool.description) : undefined}
            disabled={!!reason} disabledReason={reason}
            data-tool={tool.name} onClick={() => onToggle(tool.name)}>{tool.name}</SourceMenu.Item>;
        })}
        {servers.length > 0 && <SourceMenu.GroupLabel>{t("MCP servers")}</SourceMenu.GroupLabel>}
        {servers.map((server) => (
          <SourceMenu.Item key={server.name} keepOpen checked={!serverOff(server.name)} data-tool-server={server.name}
            hint={server.tools.length ? String(server.tools.length) : undefined}
            onClick={() => onToggle(server.name, { server: true })}>{server.name}</SourceMenu.Item>
        ))}
      </SourceMenu.PendingList>
      <SourceMenu.Separator />
      <SourceMenu.Item icon="Tool" onClick={onManage}>{t("Manage profiles")}</SourceMenu.Item>
    </>
  );
}
