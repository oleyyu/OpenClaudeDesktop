// turn-plan: a settled wrap-up in the Code transcript (2.42304.0 c96d752d0 `settledTurnBox` row → Itt): the recap, the
// question the next-step box asked and the answer the user gave — the receipt card is cb6930dae's question receipt
// (generated/turn-plan/settled-turn-box.mjs SettledTurnBox, over the generated cb6930dae / cd4f82e77 originals). The
// row comes from turn-plan-model.mjs withTurnBoxRows (in front of the prompt row that answered it); the prompt it quotes
// is c96d752d0 AL over that row, as the official transcript passes `prompt:AL(n)?.text??""`.
// Host difference: the official row sits in the transcript's inset wrapper (c96d752d0 D9 → Git); the host transcript
// spaces its rows itself.
import React, { useMemo } from "react";
import { SettledTurnBox, promptOfRow } from "./generated/turn-plan/settled-turn-box.mjs";
import { useDismissedWrapUpCalls } from "./generated/turn-box/turn-tail.mjs";
import { settledWrapUps } from "./turn-plan-model.mjs";

export function SourceSettledTurnBox({ wrapUp, promptRow, unanswered = false }) {
  const prompt = promptRow ? promptOfRow(promptRow)?.text ?? "" : "";
  return <SettledTurnBox wrapUp={wrapUp} prompt={prompt} unanswered={unanswered === true} />;
}

// c1ebb1aa4 Kt / Lt over the host transcript: prompt id → the settled receipt, without the wrap-up calls the user
// dismissed in the box (G: the turn box's own dismissal memory, generated/turn-box/turn-tail.mjs).
export function useSettledWrapUps({ sessionId, items, activeTurnId = null, turnErrors = null, enabled = true }) {
  const dismissed = useDismissedWrapUpCalls(enabled ? sessionId ?? null : null);
  return useMemo(() => (enabled ? settledWrapUps(items, { activeTurnId, turnErrors, dismissed }) : EMPTY), [enabled, items, activeTurnId, turnErrors, dismissed]);
}
const EMPTY = new Map();
