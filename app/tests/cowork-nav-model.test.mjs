// w13-coworkui-sidebar, merged into w13-surfaces-nav (E57): the Cowork navigation rows come from the same
// surface-nav-model.mjs (shared-21 hH / bH); this file pins the cowork branch over each gate it reads and the
// official text that rules out the host-only rows (Design, "More", "New task" on the live New row).
// Research: research/w13-coworkui.md §1.3, cwui-45.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { surfaceNavRows } from '../src/surface-nav-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2');
const official = file => fs.readFileSync(path.join(readable, file), 'utf8');
const labels = rows => rows.map(row => row[0]);

test('cowork rows over each gate (scheduled / cowork-artifacts / dispatch / design)', () => {
  const on = { coworkEnabled: true };
  assert.deepEqual(labels(surfaceNavRows('cowork', on)), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Customize']);
  assert.deepEqual(surfaceNavRows('cowork', on).map(row => row[2]), ['new', 'projects', 'artifacts', 'routines', 'customize']);
  assert.deepEqual(surfaceNavRows('cowork', on).map(row => row[1]), ['Add', 'Projects', 'Artifacts', 'Clock', 'Tool']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { ...on, coworkArtifacts: false })), ['New', 'Projects', 'Scheduled', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { ...on, dispatch: true })), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Dispatch', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { ...on, design: true })), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Design', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { ...on, chatIn3p: false })), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Customize'], 'chatIn3p only gates chat Projects');
  assert.deepEqual(surfaceNavRows('cowork', { coworkEnabled: false }), surfaceNavRows('chat', { coworkEnabled: false }), 'Chat rows without Cowork');
});

test('official text: the cowork gates and the live New row', () => {
  const s = official('shared-21-R7LldJ05.js');
  // Dispatch needs $p() (GrowthBook) and the desktop; design needs EV's claude.ai Design entry.
  assert.ok(s.includes('r && a && l.add("dispatch"),') && s.includes('r = $p(),'));
  assert.ok(s.includes('I !== null && l.add("design"),'));
  // gY / hY ("New task") belong to SY, the disabled preview skeleton (Xm variant "nav", disabled: !0), not the live rail.
  assert.ok(s.includes('hY = { code: mY.newSession, cowork: mY.newTask },'));
  assert.ok(s.includes('cowork: ["projects", "scheduled", "cowork-artifacts", "dispatch", "customize"],'));
  const skeleton = s.slice(s.indexOf('SY = O(function (e) {'), s.indexOf('function CY(e) {'));
  assert.ok(skeleton.includes('o.formatMessage(hY[t])') && skeleton.includes('h(Xm, { variant: "nav", className: "mt-1", disabled: !0, children: [r, i] })'));
  // The live New row is H8.new "New" (OHLefiCsSJ).
  assert.ok(s.includes('new: { defaultMessage: "New", id: "OHLefiCsSJ" },') && s.includes('C = H8.new,'));
  // The "More" overflow exists only under the hub look (M = Nc(), tp = !1).
  assert.ok(s.includes('x = r.hideFromSidebar || (M && t !== "code" && !b)'));
});
