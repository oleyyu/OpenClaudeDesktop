import test from 'node:test'
import assert from 'node:assert/strict'
import { UserQuestionError } from '@deepseek-ai/dsh-user-questions'
import { afterPlanPermission, approvedAfterPlan, codexQuestions, harnessAnswer, isPlanApproval, permissionHint, questionFailure, questionItemId, PLAN_REVIEW } from '../packages/codex-app-server/src/questions.js'

// dsh-plan-mode exit_plan_mode's review question (lib/index.js:262-279).
const planReview = (plan = '# Plan\n\n- step') => ({
  id: PLAN_REVIEW, header: 'Plan review', question: 'Approve this plan and leave plan mode?', detail: plan,
  options: [{ label: 'Approve', description: 'Leave plan mode; the plan is carried out from the next step.' }, { label: 'Keep planning', description: 'Stay in plan mode; feedback goes back to the model.' }],
  intent: { kind: 'plan-review', approve: 'Approve', callId: 'call-plan' },
})

test('Harness questions map to ToolRequestUserInputQuestion with free text allowed', () => {
  assert.deepEqual(codexQuestions([{ id: 'q', question: 'Pick', options: [{ label: 'A' }] }]), [
    { id: 'q', header: '', question: 'Pick', isOther: true, isSecret: false, options: [{ label: 'A', description: '' }], multiSelect: false },
  ])
  // ask_user_question multi_select arrives as multiSelect (tool-ask-user index.ts:100-106) and passes through.
  assert.equal(codexQuestions([{ id: 'm', question: 'Pick some', options: [{ label: 'A' }, { label: 'B' }], multiSelect: true }])[0].multiSelect, true)
  assert.equal(codexQuestions([{ id: 'm', question: 'Pick', options: [{ label: 'A' }], multiSelect: 'yes' }])[0].multiSelect, false)
  const [free] = codexQuestions([{ id: 'name', header: 'Name', question: 'What name?', detail: 'Used for the package.' }])
  assert.equal(free.options, null)
  assert.equal(free.header, 'Name')
  assert.equal(free.question, 'What name?\n\nUsed for the package.')
})

test('a plan review question omits its detail: the plan renders as the plan item', () => {
  const [review] = codexQuestions([planReview()])
  assert.equal(review.question, 'Approve this plan and leave plan mode?')
  assert.equal(review.header, 'Plan review')
  assert.deepEqual(review.options.map((option) => option.label), ['Approve', 'Keep planning'])
  assert.equal(review.isOther, true)
  assert.equal('intent' in review || 'detail' in review, false)
})

test('Codex answers map back: option labels are selected, other text is custom', () => {
  const items = [{ id: 'q', question: 'Pick', options: [{ label: 'A' }, { label: 'B' }] }]
  assert.deepEqual(harnessAnswer(items, { answers: { q: { answers: ['A'] } } }), { answers: [{ id: 'q', selected: ['A'] }] })
  assert.deepEqual(harnessAnswer(items, { answers: { q: { answers: ['free text'] } } }), { answers: [{ id: 'q', selected: [], custom: 'free text' }] })
  assert.deepEqual(harnessAnswer(items, { answers: { q: { answers: ['B', 'note', 'more'] } } }), { answers: [{ id: 'q', selected: ['B'], custom: 'note\nmore' }] })
  // A multiSelect answer carries every chosen label (and the Other text).
  assert.deepEqual(harnessAnswer(items, { answers: { q: { answers: ['A', 'B', 'mine'] } } }), { answers: [{ id: 'q', selected: ['A', 'B'], custom: 'mine' }] })
  // A skipped question (absent key) and malformed values answer with nothing.
  const two = [...items, { id: 'r', question: 'Why?' }]
  assert.deepEqual(harnessAnswer(two, { answers: { r: { answers: [7, '  '] } } }), { answers: [{ id: 'q', selected: [] }, { id: 'r', selected: [] }] })
  assert.deepEqual(harnessAnswer(two, null), { answers: [{ id: 'q', selected: [] }, { id: 'r', selected: [] }] })
})

test('only the approve label with no feedback approves a plan review', () => {
  const items = [planReview()]
  const answer = (values) => harnessAnswer(items, { answers: { [PLAN_REVIEW]: { answers: values } } })
  assert.equal(isPlanApproval(items, answer(['Approve'])), true)
  assert.equal(isPlanApproval(items, answer(['Keep planning'])), false)
  assert.equal(isPlanApproval(items, answer(['Approve', 'but rename it'])), false)
  assert.equal(isPlanApproval(items, answer(['Use a queue instead'])), false)
  assert.equal(isPlanApproval(items, harnessAnswer(items, { answers: {} })), false)
  // An ordinary question whose option happens to read 'Approve' is no plan review.
  const plain = [{ id: PLAN_REVIEW, question: 'Ok?', options: [{ label: 'Approve' }] }]
  assert.equal(isPlanApproval(plain, harnessAnswer(plain, { answers: { [PLAN_REVIEW]: { answers: ['Approve'] } } })), false)
})

test('a question belongs to the call it names, else the oldest running question tool not already asking', () => {
  const turn = { items: [
    { type: 'dynamicToolCall', id: 'done', tool: 'ask_user_question', status: 'completed' },
    { type: 'commandExecution', id: 'bash', status: 'inProgress' },
    { type: 'dynamicToolCall', id: 'a1', tool: 'ask_user_question', status: 'inProgress' },
    { type: 'dynamicToolCall', id: 'a2', tool: 'ask_user_question', status: 'inProgress' },
  ] }
  assert.equal(questionItemId({ questions: [planReview()] }, turn), 'call-plan')
  assert.equal(questionItemId({ questions: [{ id: 'q', question: 'x' }], wait: { callId: 'timed' } }, turn), 'timed')
  assert.equal(questionItemId({ questions: [{ id: 'q', question: 'x' }] }, turn), 'a1')
  assert.equal(questionItemId({ questions: [{ id: 'q', question: 'x' }] }, turn, new Set(['a1'])), 'a2')
  assert.equal(questionItemId({ questions: [{ id: 'q', question: 'x' }] }, turn, new Set(['a1', 'a2'])), '')
  assert.equal(questionItemId({ questions: [] }, null), '')
})

test('a dropped question is a UserQuestionError: aborted by the turn, or cancelled', () => {
  const cause = new Error('Turn interrupted.')
  const aborted = questionFailure(true, cause)
  assert.ok(aborted instanceof UserQuestionError)
  assert.equal(aborted.code, 'ASK_ABORTED')
  assert.equal(aborted.cause, cause)
  // exit_plan_mode keeps plan mode and stops on ASK_CANCELLED (dsh-plan-mode :282-284).
  const cancelled = questionFailure(false, new Error('Client disconnected.'))
  assert.ok(cancelled instanceof UserQuestionError)
  assert.equal(cancelled.code, 'ASK_CANCELLED')
})

test('the app mode hint is read only when present and valid; an approved plan never continues as Bypass', () => {
  assert.equal(permissionHint({}), null)
  assert.equal(permissionHint({ approvalPolicy: 'on-request', sandbox: 'read-only' }), null)
  // Accept edits (the app's acceptEdits mode, F07) is a valid hint now; unknown modes are not.
  assert.deepEqual(permissionHint({ codeDesktop: { permissionMode: 'acceptEdits' } }), { mode: 'acceptEdits', afterPlan: 'auto' })
  assert.equal(permissionHint({ codeDesktop: { permissionMode: 'dontAsk' } }), null)
  assert.deepEqual(permissionHint({ codeDesktop: { permissionMode: 'plan', afterPlan: 'ask' } }), { mode: 'plan', afterPlan: 'ask' })
  assert.deepEqual(permissionHint({ codeDesktop: { permissionMode: 'plan', afterPlan: 'acceptEdits' } }), { mode: 'plan', afterPlan: 'acceptEdits' })
  assert.deepEqual(permissionHint({ codeDesktop: { permissionMode: 'chat', afterPlan: 'plan' } }), { mode: 'chat', afterPlan: 'auto' })
  assert.deepEqual(afterPlanPermission('ask'), { mode: 'ask', approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
  assert.deepEqual(afterPlanPermission('acceptEdits'), { mode: 'acceptEdits', approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
  for (const value of ['auto', 'plan', undefined])
    assert.deepEqual(afterPlanPermission(value), { mode: 'auto', approvalPolicy: 'on-request', sandbox: 'workspace-write' })
})

test("the plan card's codeDesktop.afterPlan overrides the turn hint; Bypass only as the card's explicit choice", () => {
  const items = [planReview()]
  // OpenClaude Desktop R07 plan card: Accept → 'ask', the primary → its trust-forward target.
  const accept = { answers: { [PLAN_REVIEW]: { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'ask' } }
  assert.equal(isPlanApproval(items, harnessAnswer(items, accept)), true)
  assert.equal(approvedAfterPlan(accept, 'acceptEdits'), 'ask')
  assert.deepEqual(afterPlanPermission(approvedAfterPlan(accept, 'auto')), { mode: 'ask', approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
  assert.equal(approvedAfterPlan({ ...accept, codeDesktop: { afterPlan: 'acceptEdits' } }, 'ask'), 'acceptEdits')
  assert.equal(approvedAfterPlan({ ...accept, codeDesktop: { afterPlan: 'auto' } }, 'ask'), 'auto')
  // Without the extension, or with an unknown value, the hint decides, and a hinted Bypass maps to Auto.
  for (const response of [{ answers: accept.answers }, { ...accept, codeDesktop: { afterPlan: 'plan' } }, { ...accept, codeDesktop: 'ask' }, null])
    assert.equal(approvedAfterPlan(response, 'acceptEdits'), 'acceptEdits')
  assert.equal(approvedAfterPlan({ answers: accept.answers }, 'bypass'), 'auto')
  // 'Accept and bypass permissions' (validated by the app's main process) continues in Bypass.
  assert.equal(approvedAfterPlan({ ...accept, codeDesktop: { afterPlan: 'bypass' } }, 'ask'), 'bypass')
  assert.deepEqual(afterPlanPermission(approvedAfterPlan({ ...accept, codeDesktop: { afterPlan: 'bypass' } }, 'auto')), { mode: 'bypass', approvalPolicy: 'never', sandbox: 'danger-full-access' })
  // Revise sends its option plus the feedback: no approval, the text is the feedback.
  const revise = harnessAnswer(items, { answers: { [PLAN_REVIEW]: { answers: ['Keep planning', 'Split step two'] } } })
  assert.deepEqual(revise, { answers: [{ id: PLAN_REVIEW, selected: ['Keep planning'], custom: 'Split step two' }] })
  assert.equal(isPlanApproval(items, revise), false)
})

test('the dismiss-on-send marker is free text: it answers as custom with nothing selected', () => {
  const marker = '[User did not answer this question \u2014 they sent a message instead. Treat that message as their response; do not re-ask.]'
  const items = [{ id: 'q', question: 'Pick', options: [{ label: 'A' }] }, { id: 'free', question: 'Why?' }]
  assert.ok(codexQuestions(items).every((question) => question.isOther === true))
  assert.deepEqual(harnessAnswer(items, { answers: { q: { answers: [marker] }, free: { answers: [marker] } } }),
    { answers: [{ id: 'q', selected: [], custom: marker }, { id: 'free', selected: [], custom: marker }] })
})
