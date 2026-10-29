// w12b-titlebar-spawn-lead: the Code titlebar's lead while the draft's first send is starting its session
// (3.6556.2 cc43287c9 oG `t||o ? p(EP,{origin:pe&&{kind:pe,label:ve},title:J,bare:M})`, sessionRef t null, spawn o set).
// EP is c73f45bc3 ay (generated titlebar-spawn-lead.mjs): span[role=status] with the sr-only "Loading session", the
// origin box (the local origin glyph, or the pulsing origin ghost before the kind is known), the title (iy: the known
// title, or the title ghost) and, once both a title and a folder label are known, the static folder pill.
// The seeds go through oG's episode latch RP (c73f45bc3 xv, generated titlebar-seed-latch.mjs): pe = RP(kind, n),
// he = RP(o?.id, n), ve = RP(label, `${n}:${he ?? ""}`), n the pane's episode key.
import React from "react";
import { TitlebarSpawnLead } from "./generated/code-current/titlebar-spawn-lead.mjs";
import { useEpisodeSeed } from "./generated/code-current/titlebar-seed-latch.mjs";
import { titlebarLiveOrigin, titlebarOriginKind, titlebarOriginLabel, titlebarSpawnLeadProps } from "./titlebar-spawn-lead-model.mjs";

// spawn: oG's `o` (titlebarSpawnSource); episodeKey: oG's `n`; title: oG's J (the host learns a session's title only
// once the core has the thread, so a spawning draft passes none and iy shows its ghost); railMode: oG's M (EP `bare`).
// The lead box is the host's (the same `st-lead group/lead` with data-pills-compact as the session and not-found leads).
export function SourceTitlebarSpawnLead({ spawn, episodeKey = "draft", title, railMode = false, pillsCompact = false }) {
  const origin = titlebarLiveOrigin(spawn);
  const kind = useEpisodeSeed(titlebarOriginKind(origin), episodeKey);
  const spawnId = useEpisodeSeed(spawn?.id, episodeKey);
  // The host has no scratch workspace (titlebarSpawnSource never sets isScratchWorkspace), so Fv's "No folder" is not reached.
  const label = useEpisodeSeed(titlebarOriginLabel(origin, undefined), `${episodeKey}:${spawnId ?? ""}`);
  return (
    <div className="st-lead group/lead" data-pills-compact={pillsCompact || undefined}>
      <TitlebarSpawnLead {...titlebarSpawnLeadProps({ kind, label, title, railMode })} />
    </div>
  );
}
