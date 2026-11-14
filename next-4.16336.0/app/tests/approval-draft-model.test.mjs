import test from "node:test";
import assert from "node:assert/strict";
import {
  createApprovalDraftRuntime,
  dismissQuestionPayload,
  isPlanReviewRequest,
  isQuestionAnswered,
  isQuestionInputSubmit,
  planReviewResponse,
  QUESTION_DISMISSED_ANSWER,
  visibleApprovals,
} from "../src/approval-draft-model.mjs";
import { createRequire } from "node:module";
const { approvalResponse } = createRequire(import.meta.url)("../electron/respond-approval.cjs");
let instance = 0;
const bridge = () => ({
  connectionId: "test-connection",
  instanceId: `test-main-instance-${++instance}`,
});
const success = (ticket) => ({ ok: true, identity: ticket.bridgeApproval });

function questionRequest(threadId = "A", id = 1) {
  return {
    id,
    bridgeApproval: bridge(),
    method: "item/tool/requestUserInput",
    params: {
      threadId,
      turnId: `turn-${threadId}`,
      questions: [
        {
          id: "choice",
          header: "Choice",
          question: "Pick an option",
          isOther: true,
          isSecret: false,
          options: [{ label: "Alpha" }, { label: "Beta" }],
        },
        {
          id: "text",
          header: "Text",
          question: "Enter text",
          isOther: false,
          isSecret: false,
          options: null,
        },
      ],
    },
  };
}
function setup(...requests) {
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile(requests);
  return {
    runtime,
    tickets: requests.map((request) => runtime.ticketFor(request)),
  };
}
function answered(runtime, ticket) {
  runtime.selectOption(ticket, "choice", "Alpha");
  runtime.writeCustom(ticket, "text", "Sample answer");
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const visible = (threadId) => ({ getVisibleThreadId: () => threadId });

test("thread/request identity keeps answers independent when question IDs match and the view switches", () => {
  const a = questionRequest("A", 7),
    b = questionRequest("B", 7);
  const {
    runtime,
    tickets: [ta, tb],
  } = setup(a, b);
  runtime.writeCustom(ta, "choice", "A custom draft");
  runtime.writeCustom(tb, "choice", "B custom draft");
  const before = runtime.snapshot(ta);
  runtime.reconcile([b, a]); // A is still pending even when only B is rendered.
  assert.equal(runtime.snapshot(ta), before);
  assert.equal(
    runtime.snapshot(ta).draft.answers.choice.customText,
    "A custom draft",
  );
  assert.equal(
    runtime.snapshot(tb).draft.answers.choice.customText,
    "B custom draft",
  );
});

test("Other remains independent of radio selection and is restored when selected again", () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  runtime.writeCustom(ticket, "choice", "My own option");
  runtime.selectOption(ticket, "choice", "Beta");
  assert.deepEqual(runtime.snapshot(ticket).draft.answers.choice, {
    choice: { kind: "option", label: "Beta" },
    customText: "My own option",
  });
  runtime.selectOther(ticket, "choice");
  assert.equal(
    runtime.snapshot(ticket).draft.answers.choice.customText,
    "My own option",
  );
});

test("real isOther and options constraints prevent invented answers, and all questions must be answered", () => {
  const request = questionRequest();
  request.params.questions[0].isOther = false;
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  assert.equal(runtime.canSubmit(ticket), false);
  assert.throws(
    () => runtime.writeCustom(ticket, "choice", "Not allowed"),
    /does not allow/,
  );
  assert.throws(
    () => runtime.selectOption(ticket, "choice", "Imaginary"),
    /Unknown option/,
  );
  runtime.selectOption(ticket, "choice", "Beta");
  runtime.writeCustom(ticket, "text", "   ");
  assert.equal(runtime.canSubmit(ticket), false);
  runtime.writeCustom(ticket, "text", "Actual text");
  assert.equal(runtime.canSubmit(ticket), true);
});

test("a second activation during a delayed RPC sends exactly once and blocks draft edits", async () => {
  const request = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(request);
  answered(runtime, ticket);
  const delay = deferred(),
    calls = [];
  const submit = runtime.submit(
    ticket,
    null,
    (payload, identity) => {
      calls.push({ payload, identity });
      return delay.promise;
    },
    visible("A"),
  );
  assert.equal(runtime.snapshot(ticket).busy, true);
  assert.equal(runtime.writeCustom(ticket, "text", "Late edit"), false);
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Duplicate RPC"),
        visible("A"),
      )
    ).status,
    "busy",
  );
  delay.resolve(success(ticket));
  assert.equal((await submit).status, "answered");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload, {
    id: 1,
    expected: ticket.bridgeApproval,
    answers: {
      choice: { answers: ["Alpha"] },
      text: { answers: ["Sample answer"] },
    },
  });
  assert.equal(calls[0].identity, ticket);
  assert.equal(runtime.snapshot(ticket).draft.answers.text.customText, "");
  runtime.reconcile([request]);
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Already answered"),
        visible("A"),
      )
    ).status,
    "stale",
  );
  runtime.reconcile([]);
  assert.equal(runtime.pendingCount, 0);
});

test("delayed failure preserves answers and unlocks a single retry", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  answered(runtime, ticket);
  const first = await runtime.submit(
    ticket,
    null,
    async () => {
      throw new Error("Transport unavailable");
    },
    visible("A"),
  );
  assert.equal(first.status, "error");
  assert.equal(runtime.snapshot(ticket).error, "Transport unavailable");
  assert.equal(
    runtime.snapshot(ticket).draft.answers.text.customText,
    "Sample answer",
  );
  assert.equal(runtime.canSubmit(ticket), true);
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        async () => success(ticket),
        visible("A"),
      )
    ).status,
    "answered",
  );
});

test("an expired/reused callback ID cannot be submitted through an old ticket", async () => {
  const old = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(old);
  answered(runtime, ticket);
  const replacement = questionRequest();
  runtime.reconcile([replacement]);
  assert.notEqual(runtime.ticketFor(replacement).generation, ticket.generation);
  assert.equal(runtime.ticketFor(old), null);
  assert.equal(runtime.snapshot(ticket), null);
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Stale callback dispatched"),
        visible("A"),
      )
    ).status,
    "stale",
  );
});

test("old async success or failure never clears the replacement generation or its draft", async () => {
  for (const outcome of ["resolve", "reject"]) {
    const old = questionRequest(),
      {
        runtime,
        tickets: [ticket],
      } = setup(old);
    answered(runtime, ticket);
    const delay = deferred();
    const pending = runtime.submit(
      ticket,
      null,
      () => delay.promise,
      visible("A"),
    );
    const replacement = questionRequest();
    runtime.reconcile([replacement]);
    const fresh = runtime.ticketFor(replacement);
    runtime.writeCustom(fresh, "choice", "Keep new draft");
    outcome === "resolve"
      ? delay.resolve(success(ticket))
      : delay.reject(new Error("Old failure"));
    assert.equal((await pending).status, "stale");
    assert.equal(
      runtime.snapshot(fresh).draft.answers.choice.customText,
      "Keep new draft",
    );
    assert.equal(runtime.snapshot(fresh).error, "");
  }
});

test("navigation and synchronous expiry during submission preparation prevent dispatch", async () => {
  const request = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(request);
  answered(runtime, ticket);
  let currentThread = "B";
  const options = { getVisibleThreadId: () => currentThread };
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Background submit"),
        options,
      )
    ).status,
    "stale",
  );
  currentThread = "A";
  const unsubscribe = runtime.subscribe(() => {
    if (runtime.snapshot(ticket)?.busy) runtime.expire(ticket);
  });
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Revoked before dispatch"),
        options,
      )
    ).status,
    "stale",
  );
  unsubscribe();
  assert.equal(runtime.pendingCount, 0);
});

test("request resolution/disconnect drops drafts; stale expire cannot drop another generation", () => {
  const request = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(request);
  answered(runtime, ticket);
  const replacement = questionRequest();
  runtime.reconcile([replacement]);
  assert.equal(runtime.expire(ticket), false);
  assert.equal(runtime.pendingCount, 1);
  runtime.reconcile([]);
  assert.equal(runtime.pendingCount, 0);
  assert.equal(runtime.ticketFor(replacement), null);
});

test("command/file session decisions remain supported, while permissions never accept session scope", async () => {
  for (const method of [
    "item/commandExecution/requestApproval",
    "item/fileChange/requestApproval",
    "item/permissions/requestApproval",
  ]) {
    const request = {
      id: 99,
      bridgeApproval: bridge(),
      method,
      params: { threadId: "A", turnId: "turnA", itemId: "itemA" },
    };
    const {
      runtime,
      tickets: [ticket],
    } = setup(request);
    const payloads = [];
    if (method.includes("permissions")) {
      await assert.rejects(
        runtime.submit(
          ticket,
          "acceptForSession",
          async (payload) => payloads.push(payload),
          visible("A"),
        ),
        /turn only/,
      );
      assert.equal(runtime.snapshot(ticket).busy, false);
      assert.equal(
        (
          await runtime.submit(
            ticket,
            "allow",
            async (payload) => {
              payloads.push(payload);
              return success(ticket);
            },
            visible("A"),
          )
        ).status,
        "answered",
      );
      assert.deepEqual(payloads, [
        { id: 99, expected: ticket.bridgeApproval, allow: true },
      ]);
    } else {
      assert.equal(
        (
          await runtime.submit(
            ticket,
            "acceptForSession",
            async (payload) => {
              payloads.push(payload);
              return success(ticket);
            },
            visible("A"),
          )
        ).status,
        "answered",
      );
      assert.deepEqual(payloads, [
        {
          id: 99,
          expected: ticket.bridgeApproval,
          decision: "acceptForSession",
        },
      ]);
    }
  }
});

test("request schema mutation creates a fresh generation and cannot retain an incompatible answer", () => {
  const request = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(request);
  answered(runtime, ticket);
  request.params.questions[0].options = [{ label: "Replacement" }];
  runtime.reconcile([request]);
  const fresh = runtime.ticketFor(request);
  assert.notEqual(fresh.generation, ticket.generation);
  // The fresh draft never keeps "Alpha"; it starts at the new schema's options[0] (_se :7790-7800).
  assert.deepEqual(runtime.snapshot(fresh).draft.answers.choice, {
    choice: { kind: "option", label: "Replacement" },
    customText: "",
  });
});

test("secret classification and custom text stay in memory and clear after expiry", () => {
  const request = questionRequest();
  request.params.questions[1].isSecret = true;
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  // Deliberately synthetic input, never a real credential.
  runtime.writeCustom(ticket, "text", "FIXTURE-ONLY-SECRET");
  assert.equal(runtime.snapshot(ticket).questions[1].isSecret, true);
  runtime.expire(ticket);
  assert.equal(runtime.snapshot(ticket), null);
  assert.equal(runtime.pendingCount, 0);
});

test("missing bridge identity is rejected and snapshot clones preserve the same ticket and draft", () => {
  const request = questionRequest();
  const invalid = { ...request, bridgeApproval: undefined };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([invalid]);
  assert.equal(runtime.ticketFor(invalid), null);
  assert.equal(runtime.pendingCount, 0);
  runtime.reconcile([request]);
  const ticket = runtime.ticketFor(request);
  runtime.writeCustom(ticket, "choice", "Keep this draft");
  runtime.setPage(ticket, 1);
  const view = runtime.snapshot(ticket);
  const clone = structuredClone(request);
  runtime.reconcile([clone]);
  assert.equal(runtime.ticketFor(clone), ticket);
  assert.equal(runtime.ticketFor(request), ticket);
  assert.equal(runtime.snapshot(ticket), view);
  assert.equal(view.draft.page, 1);
});

test("the same wire ID on a new connection expires the old ticket and never carries its answers", async () => {
  const old = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(old);
  answered(runtime, ticket);
  const replacement = structuredClone(old);
  replacement.bridgeApproval = {
    connectionId: "replacement-connection",
    instanceId: old.bridgeApproval.instanceId,
  };
  runtime.reconcile([replacement]);
  const fresh = runtime.ticketFor(replacement);
  assert.notEqual(fresh.key, ticket.key);
  assert.equal(runtime.snapshot(ticket), null);
  assert.equal(runtime.snapshot(fresh).draft.answers.text.customText, "");
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Stale ticket dispatched"),
        visible("A"),
      )
    ).status,
    "stale",
  );
});

test("structured IPC failure retains answers; stale identity clears only the expired draft tombstone", async () => {
  const request = questionRequest(),
    {
      runtime,
      tickets: [ticket],
    } = setup(request);
  answered(runtime, ticket);
  const first = await runtime.submit(
    ticket,
    null,
    async (payload) => {
      assert.deepEqual(payload.expected, request.bridgeApproval);
      return {
        ok: false,
        error: { code: "invalid_response", message: "Choose a valid answer" },
      };
    },
    visible("A"),
  );
  assert.equal(first.status, "error");
  assert.equal(
    runtime.snapshot(ticket).draft.answers.text.customText,
    "Sample answer",
  );
  assert.equal(runtime.snapshot(ticket).busy, false);
  const expired = await runtime.submit(
    ticket,
    null,
    async () => ({
      ok: false,
      error: { code: "stale_request", message: "Expired" },
    }),
    visible("A"),
  );
  assert.equal(expired.status, "stale");
  assert.equal(runtime.snapshot(ticket).phase, "expired");
  assert.equal(runtime.snapshot(ticket).draft.answers.text.customText, "");
  runtime.reconcile([structuredClone(request)]);
  assert.equal(runtime.snapshot(ticket).phase, "expired");
  assert.equal(
    (
      await runtime.submit(
        ticket,
        null,
        () => assert.fail("Expired retry"),
        visible("A"),
      )
    ).status,
    "stale",
  );
});

test("missing or mismatched success identity is never treated as an answered request", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  answered(runtime, ticket);
  for (const response of [
    undefined,
    true,
    { ok: true },
    {
      ok: true,
      identity: { ...ticket.bridgeApproval, instanceId: "another-request" },
    },
  ]) {
    assert.equal(
      (await runtime.submit(ticket, null, async () => response, visible("A")))
        .status,
      "error",
    );
    assert.equal(runtime.snapshot(ticket).phase, "pending");
    assert.equal(
      runtime.snapshot(ticket).draft.answers.text.customText,
      "Sample answer",
    );
  }
});

test("numeric and string request IDs keep their type in guarded payloads", async () => {
  const numeric = questionRequest("A", 7),
    string = questionRequest("A", "7");
  const {
    runtime,
    tickets: [a, b],
  } = setup(numeric, string);
  answered(runtime, a);
  answered(runtime, b);
  const sent = [];
  for (const ticket of [a, b])
    await runtime.submit(
      ticket,
      null,
      async (payload, current) => {
        sent.push(payload);
        return success(current);
      },
      visible("A"),
    );
  assert.deepEqual(
    sent.map((payload) => payload.id),
    [7, "7"],
  );
  assert.notDeepEqual(sent[0].expected, sent[1].expected);
});

test("Next requires an answer (the preselected option counts) and final Submit requires every question, even after header navigation", () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  // approval-current.js:7790-7800 _se: single-select questions with options start at [0].
  assert.deepEqual(runtime.snapshot(ticket).draft.answers.choice.choice, {
    kind: "option",
    label: "Alpha",
  });
  assert.equal(runtime.canAdvance(ticket), true);
  runtime.selectOption(ticket, "choice", "Beta");
  assert.equal(runtime.canAdvance(ticket), true);
  assert.equal(runtime.canSubmit(ticket), false);
  runtime.setPage(ticket, 1);
  assert.equal(runtime.canAdvance(ticket), false);
  runtime.writeCustom(ticket, "text", "Answer");
  assert.equal(runtime.canAdvance(ticket), true);
  // Free-form first page: answering only the last page cannot submit.
  const other = questionRequest();
  other.params.questions.reverse();
  const second = setup(other);
  const t = second.tickets[0];
  second.runtime.setPage(t, 1);
  assert.equal(second.runtime.snapshot(t).draft.answers.choice.choice.label, "Alpha");
  assert.equal(second.runtime.canAdvance(t), false);
  assert.equal(second.runtime.canSubmit(t), false);
});

test("a new draft preselects options[0]; free-form and secret questions start empty", () => {
  const request = questionRequest();
  request.params.questions.push({
    id: "secret",
    question: "Secret with options",
    isSecret: true,
    isOther: true,
    options: [{ label: "Hidden" }],
  });
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  const { answers } = runtime.snapshot(ticket).draft;
  assert.deepEqual(answers.choice, {
    choice: { kind: "option", label: "Alpha" },
    customText: "",
  });
  assert.deepEqual(answers.text, { choice: null, customText: "" });
  assert.deepEqual(answers.secret, { choice: null, customText: "" });
  assert.ok(Object.isFrozen(answers.choice) && Object.isFrozen(answers.choice.choice));
});

test("a multiSelect question starts empty, toggles options and Other, and submits every label (approval-current.js:7789-7962)", async () => {
  const request = questionRequest();
  request.params.questions[0].multiSelect = true;
  request.params.questions[0].options.push({ label: "Gamma" });
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  // _se: no preselection for multiSelect; the single-select page is unchanged.
  assert.deepEqual(runtime.snapshot(ticket).draft.answers.choice, { choice: null, selected: [], otherSelected: false, customText: "" });
  assert.equal(runtime.snapshot(ticket).questions[0].multiSelect, true);
  assert.equal(runtime.canAdvance(ticket), false, "nothing selected yet");
  runtime.selectOption(ticket, "choice", "Gamma");
  runtime.selectOption(ticket, "choice", "Alpha");
  runtime.selectOption(ticket, "choice", "Beta");
  runtime.selectOption(ticket, "choice", "Beta"); // V toggles it back off
  assert.deepEqual(runtime.snapshot(ticket).draft.answers.choice.selected, ["Gamma", "Alpha"]);
  assert.equal(runtime.canAdvance(ticket), true);
  // Focusing Other only turns it on; its mark toggles; typing turns it on.
  runtime.selectOther(ticket, "choice", { toggle: false });
  runtime.selectOther(ticket, "choice", { toggle: false });
  assert.equal(runtime.snapshot(ticket).draft.answers.choice.otherSelected, true);
  runtime.selectOther(ticket, "choice");
  assert.equal(runtime.snapshot(ticket).draft.answers.choice.otherSelected, false);
  runtime.writeCustom(ticket, "choice", "Delta");
  assert.equal(runtime.snapshot(ticket).draft.answers.choice.otherSelected, true);
  runtime.writeCustom(ticket, "text", "Sample answer");
  let sent;
  const result = await runtime.submit(ticket, null, async (payload, current) => { sent = payload; return success(current); }, visible("A"));
  assert.equal(result.status, "answered");
  // R sorts the selected indices: Other (-1) and its text first, then the labels in option order.
  assert.deepEqual(sent.answers.choice, { answers: ["Delta", "Alpha", "Gamma"] });
  assert.deepEqual(approvalResponse(request, sent).answers.choice, { answers: ["Delta", "Alpha", "Gamma"] });
});

test("multiSelect: Other without text answers 'Something else'; toggled off it does not; a skip still counts", async () => {
  const request = questionRequest();
  request.params.questions[0].multiSelect = true;
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  // uk (approval-current.js:7764-7766): Other is index -1, so selecting it answers the page.
  runtime.selectOther(ticket, "choice");
  assert.equal(runtime.canAdvance(ticket), true);
  runtime.selectOther(ticket, "choice");
  assert.equal(runtime.canAdvance(ticket), false, "toggled off, nothing is selected");
  runtime.selectOther(ticket, "choice");
  runtime.selectOption(ticket, "choice", "Beta");
  assert.equal(runtime.canAdvance(ticket), true);
  runtime.writeCustom(ticket, "text", "Sample answer");
  runtime.writeCustom(ticket, "choice", "   ");
  let sent;
  await runtime.submit(ticket, null, async (payload, current) => { sent = payload; return success(current); }, visible("A"));
  // R (:7911-7921): `s.other.trim() || "Something else"` (ck :7695), Other's -1 first.
  assert.deepEqual(sent.answers.choice, { answers: ["Something else", "Beta"] }, "an empty Other sends ck");
  assert.deepEqual(approvalResponse(request, sent).answers.choice, { answers: ["Something else", "Beta"] });
  // The main-process mapper accepts several answers only on a multiSelect question.
  const single = questionRequest();
  assert.throws(() => approvalResponse(single, { answers: { choice: { answers: ["Alpha", "Beta"] } } }), /Answer each question/);
  assert.throws(() => approvalResponse(request, { answers: { choice: { answers: ["Alpha", "Alpha"] } } }), /Answer each question/);
  assert.deepEqual(approvalResponse(request, { answers: { choice: { answers: ["Alpha", "Beta"] } } }).answers.choice, { answers: ["Alpha", "Beta"] });
  // A malformed multiSelect flag is a schema error, like the other input settings.
  const bad = questionRequest("B", 2);
  bad.params.questions[0].multiSelect = "yes";
  const { runtime: other, tickets: [badTicket] } = setup(bad);
  assert.equal(other.snapshot(badTicket).phase, "invalid");
});

test("skip on a non-last page marks it skipped and advances without sending", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  const result = await runtime.skip(
    ticket,
    () => assert.fail("Non-last skip must not respond"),
    visible("A"),
  );
  assert.deepEqual(result, { status: "page", page: 1 });
  const view = runtime.snapshot(ticket);
  assert.equal(view.draft.page, 1);
  assert.deepEqual(view.draft.answers.choice, {
    choice: null,
    customText: "",
    skipped: true,
  });
  assert.ok(Object.isFrozen(view.draft.answers.choice));
  assert.equal(runtime.canAdvance(ticket), false);
  runtime.writeCustom(ticket, "text", "Only the note");
  assert.equal(runtime.canSubmit(ticket), true);
});

test("skip on the last page submits when every other page is answered, omitting the skipped key", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  runtime.setPage(ticket, 1);
  const sent = [];
  const result = await runtime.skip(
    ticket,
    async (payload) => {
      sent.push(payload);
      return success(ticket);
    },
    visible("A"),
  );
  assert.equal(result.status, "answered");
  assert.deepEqual(sent, [
    {
      id: 1,
      expected: ticket.bridgeApproval,
      answers: { choice: { answers: ["Alpha"] } },
    },
  ]);
  assert.equal(Object.hasOwn(sent[0].answers, "text"), false);
  // Skipping every page sends an empty answers map (schema keys are optional).
  const single = questionRequest("A", 2);
  single.params.questions = [single.params.questions[0]];
  const one = setup(single);
  const payloads = [];
  await one.runtime.skip(
    one.tickets[0],
    async (payload) => {
      payloads.push(payload);
      return success(one.tickets[0]);
    },
    visible("A"),
  );
  assert.deepEqual(payloads[0].answers, {});
});

test("skip on the last page goes to the first unanswered page instead of submitting", async () => {
  const request = questionRequest();
  request.params.questions.reverse(); // free-form "text" first, "choice" last
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  runtime.setPage(ticket, 1);
  assert.deepEqual(
    await runtime.skip(
      ticket,
      () => assert.fail("Unanswered page must not submit"),
      visible("A"),
    ),
    { status: "page", page: 0 },
  );
  const view = runtime.snapshot(ticket);
  assert.equal(view.draft.page, 0);
  assert.equal(view.draft.answers.choice.skipped, true);
  assert.equal(view.busy, false);
});

test("selecting or typing after skip clears skipped", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  await runtime.skip(ticket, () => assert.fail(), visible("A"));
  runtime.setPage(ticket, 0);
  runtime.selectOption(ticket, "choice", "Beta");
  assert.deepEqual(runtime.snapshot(ticket).draft.answers.choice, {
    choice: { kind: "option", label: "Beta" },
    customText: "",
  });
  await runtime.skip(ticket, () => assert.fail(), visible("A"));
  runtime.setPage(ticket, 0);
  runtime.writeCustom(ticket, "choice", "Typed");
  const typed = runtime.snapshot(ticket).draft.answers.choice;
  assert.equal(Object.hasOwn(typed, "skipped"), false);
  assert.deepEqual(typed.choice, { kind: "other" });
  runtime.selectOther(ticket, "choice");
  assert.equal(runtime.snapshot(ticket).draft.answers.choice.skipped, undefined);
});

test("skip is refused while busy, answered, stale or for another session's submit", async () => {
  const request = questionRequest();
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  runtime.writeCustom(ticket, "text", "Note");
  const delay = deferred();
  const pending = runtime.submit(ticket, null, () => delay.promise, visible("A"));
  const before = runtime.snapshot(ticket);
  assert.deepEqual(
    await runtime.skip(ticket, () => assert.fail("Busy skip"), visible("A")),
    { status: "busy" },
  );
  assert.equal(runtime.snapshot(ticket), before);
  delay.resolve(success(ticket));
  assert.equal((await pending).status, "answered");
  assert.deepEqual(
    await runtime.skip(ticket, () => assert.fail("Answered skip"), visible("A")),
    { status: "stale" },
  );
  // Inactive (not the visible session) cannot submit through skip; the page is unchanged.
  const last = questionRequest("B", 3);
  const other = setup(last);
  const t = other.tickets[0];
  other.runtime.setPage(t, 1);
  const unchanged = other.runtime.snapshot(t);
  assert.deepEqual(
    await other.runtime.skip(t, () => assert.fail("Hidden skip"), visible("A")),
    { status: "stale" },
  );
  assert.equal(other.runtime.snapshot(t), unchanged);
  other.runtime.reconcile([]);
  assert.deepEqual(
    await other.runtime.skip(t, () => assert.fail("Expired skip"), visible("B")),
    { status: "stale" },
  );
});

test("custom input shortcut excludes IME and repeat, while plain Enter remains text input", () => {
  assert.equal(isQuestionInputSubmit({ key: "Enter" }), false);
  assert.equal(isQuestionInputSubmit({ key: "Enter", metaKey: true }), true);
  assert.equal(isQuestionInputSubmit({ key: "Enter", ctrlKey: true }), true);
  for (const extra of [
    { repeat: true },
    { isComposing: true },
    { keyCode: 229 },
    { nativeEvent: { isComposing: true } },
    { nativeEvent: { keyCode: 229 } },
  ])
    assert.equal(
      isQuestionInputSubmit({ key: "Enter", metaKey: true, ...extra }),
      false,
    );
});

test("busyAction identifies only the real pending action and clears on failure", async () => {
  const request = {
    id: 91,
    bridgeApproval: bridge(),
    method: "item/commandExecution/requestApproval",
    params: { threadId: "A" },
  };
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  const delay = deferred();
  const submitting = runtime.submit(
    ticket,
    "acceptForSession",
    () => delay.promise,
    visible("A"),
  );
  assert.equal(runtime.snapshot(ticket).busy, true);
  assert.equal(runtime.snapshot(ticket).busyAction, "acceptForSession");
  delay.resolve({
    ok: false,
    error: { code: "transport_error", message: "Controlled failure" },
  });
  assert.equal((await submitting).status, "error");
  assert.equal(runtime.snapshot(ticket).busyAction, null);
  assert.equal(runtime.canSubmit(ticket), true);
});

test("malformed question requests stay visible but cannot crash or submit, while valid requests continue", async () => {
  const marker = "FIXTURE-PRIVATE-PAYLOAD-NOT-AN-ERROR";
  const malformed = [
    (r) => {
      r.params.questions = null;
    },
    (r) => {
      r.params.questions = { private: marker };
    },
    (r) => {
      r.params.questions = [];
    },
    (r) => {
      r.params.questions = [null];
    },
    (r) => {
      r.params.questions[1].id = "choice";
    },
    (r) => {
      r.params.questions[0].id = null;
    },
    (r) => {
      r.params.questions[0].question = { private: marker };
    },
    (r) => {
      r.params.questions[0].question = "   ";
    },
    (r) => {
      r.params.questions[0].header = { private: marker };
    },
    (r) => {
      r.params.questions[0].options = { private: marker };
    },
    (r) => {
      r.params.questions[0].options = [null];
    },
    (r) => {
      r.params.questions[0].options[0].label = { private: marker };
    },
    (r) => {
      r.params.questions[0].options[0].description = { private: marker };
    },
    (r) => {
      r.params.questions[0].isSecret = marker;
    },
  ];
  const valid = questionRequest("A", 100);
  const {
    runtime,
    tickets: [validTicket],
  } = setup(valid);
  answered(runtime, validTicket);
  const validView = runtime.snapshot(validTicket);
  for (const mutate of malformed) {
    const invalid = questionRequest("B", 101);
    mutate(invalid);
    assert.doesNotThrow(() => runtime.reconcile([invalid, valid]));
    const ticket = runtime.ticketFor(invalid);
    assert.ok(
      ticket,
      "Invalid schema retains the main-issued request identity",
    );
    assert.equal(runtime.ticketFor(structuredClone(invalid)), ticket);
    const view = runtime.snapshot(ticket);
    assert.equal(view.phase, "invalid");
    assert.ok(view.schemaError.length);
    assert.equal(view.schemaError.includes(marker), false);
    assert.deepEqual(view.questions, []);
    assert.deepEqual(view.draft.answers, {});
    assert.equal(runtime.canSubmit(ticket), false);
    assert.equal(runtime.canAdvance(ticket), false);
    assert.equal(runtime.writeCustom(ticket, "choice", "Cannot write"), false);
    assert.equal(
      (
        await runtime.submit(
          ticket,
          null,
          () => assert.fail("Malformed question reached the IPC adapter"),
          visible("B"),
        )
      ).status,
      "stale",
    );
    assert.equal(runtime.snapshot(validTicket), validView);
    assert.equal(runtime.canSubmit(validTicket), true);
  }
  assert.equal(
    (
      await runtime.submit(
        validTicket,
        null,
        async () => success(validTicket),
        visible("A"),
      )
    ).status,
    "answered",
  );
});

test("a malformed replacement clears old answers and a repaired schema receives a fresh ticket", () => {
  const request = questionRequest();
  const {
    runtime,
    tickets: [original],
  } = setup(request);
  answered(runtime, original);
  const invalid = structuredClone(request);
  invalid.params.questions[0].header = { unsafe: "FIXTURE-ONLY" };
  runtime.reconcile([invalid]);
  const invalidTicket = runtime.ticketFor(invalid);
  assert.equal(runtime.snapshot(original), null);
  assert.equal(runtime.ticketFor(request), null);
  assert.equal(runtime.snapshot(invalidTicket).phase, "invalid");
  runtime.reconcile([structuredClone(invalid)]);
  assert.equal(runtime.ticketFor(invalid), invalidTicket);
  runtime.reconcile([request]);
  const repaired = runtime.ticketFor(request);
  assert.notEqual(repaired, original);
  assert.notEqual(repaired, invalidTicket);
  assert.equal(runtime.snapshot(invalidTicket), null);
  assert.equal(runtime.snapshot(repaired).schemaError, "");
  assert.equal(runtime.snapshot(repaired).phase, "pending");
  assert.equal(runtime.snapshot(repaired).draft.answers.text.customText, "");
});

test("a DeepSeek plan review takes free-text feedback on its isOther question and sends it as the answer", async () => {
  // harness questions.js codexQuestions for exit_plan_mode's review (detail omitted).
  const request = {
    id: 9,
    bridgeApproval: bridge(),
    method: "item/tool/requestUserInput",
    params: {
      threadId: "A",
      turnId: "turn-A",
      itemId: "call-plan",
      isBlocking: true,
      autoResolutionMs: null,
      questions: [
        {
          id: "plan-review",
          header: "Plan review",
          question: "Approve this plan and leave plan mode?",
          isOther: true,
          isSecret: false,
          options: [
            { label: "Approve", description: "Leave plan mode; the plan is carried out from the next step." },
            { label: "Keep planning", description: "Stay in plan mode; feedback goes back to the model." },
          ],
        },
      ],
    },
  };
  const {
    runtime,
    tickets: [ticket],
  } = setup(request);
  assert.deepEqual(runtime.snapshot(ticket).draft.answers["plan-review"].choice, { kind: "option", label: "Approve" });
  runtime.writeCustom(ticket, "plan-review", "Split the migration into two steps");
  assert.equal(runtime.canSubmit(ticket), true);
  let sent;
  const result = await runtime.submit(ticket, null, (payload) => {
    sent = payload;
    return success(ticket);
  }, visible("A"));
  assert.equal(result.status, "answered");
  assert.deepEqual(sent.answers, { "plan-review": { answers: ["Split the migration into two steps"] } });
  // The main-process mapper accepts the non-option text because the question is isOther.
  assert.deepEqual(approvalResponse(request, sent), { answers: { "plan-review": { answers: ["Split the migration into two steps"] } } });
});

// ---- R07 ----
function planRequest(id = 21, threadId = "A") {
  return {
    id,
    bridgeApproval: bridge(),
    method: "item/tool/requestUserInput",
    params: {
      threadId, turnId: `turn-${threadId}`, itemId: "call-plan", isBlocking: true, autoResolutionMs: null,
      questions: [{ id: "plan-review", header: "Plan review", question: "Approve this plan and leave plan mode?", isOther: true, isSecret: false,
        options: [{ label: "Approve", description: "Leave plan mode; the plan is carried out from the next step." },
          { label: "Keep planning", description: "Stay in plan mode; feedback goes back to the model." }] }],
    },
  };
}

test("R07 single-select Other with an empty field answers 'Something else'; its text is trimmed; free-form still needs text", async () => {
  const {
    runtime,
    tickets: [ticket],
  } = setup(questionRequest());
  runtime.selectOther(ticket, "choice");
  runtime.writeCustom(ticket, "text", "Sample answer");
  assert.equal(runtime.canSubmit(ticket), true, "uk: Other (-1) selected is answered");
  let sent;
  await runtime.submit(ticket, null, async (payload, current) => { sent = payload; return success(current); }, visible("A"));
  assert.deepEqual(sent.answers.choice, { answers: ["Something else"] });
  assert.deepEqual(approvalResponse(questionRequest(), sent).answers.choice, { answers: ["Something else"] });
  const second = setup(questionRequest("B", 2));
  second.runtime.writeCustom(second.tickets[0], "choice", "  Delta  ");
  second.runtime.writeCustom(second.tickets[0], "text", "x");
  await second.runtime.submit(second.tickets[0], null, async (payload, current) => { sent = payload; return success(current); }, visible("B"));
  assert.deepEqual(sent.answers.choice, { answers: ["Delta"] });
  // Free-form (no options) keeps requiring text; Other on an isOther:false question is no answer.
  const free = { id: "text", question: "Enter text", isOther: false, multiSelect: false, options: [] };
  assert.equal(isQuestionAnswered(free, { choice: { kind: "free" }, customText: "  " }), false);
  assert.equal(isQuestionAnswered(free, { choice: { kind: "free" }, customText: "ok" }), true);
  assert.equal(isQuestionAnswered({ id: "c", options: [{ label: "A" }], isOther: false }, { choice: { kind: "other" }, customText: "" }), false);
  assert.equal(isQuestionAnswered({ id: "c", options: [{ label: "A" }], isOther: true }, { choice: { kind: "other" }, customText: "" }), true);
  assert.equal(isQuestionAnswered({ id: "c", options: [{ label: "A" }], isOther: true, multiSelect: true }, { selected: [], otherSelected: true, customText: "" }), true);
});

test("R07 plan card payloads: Reject / Revise keep planning, Accept continues in Manual, the primary in its target", async () => {
  assert.deepEqual(planReviewResponse("reject", { feedback: "ignored", target: "acceptEdits" }),
    { answers: { "plan-review": { answers: ["Keep planning"] } } });
  assert.deepEqual(planReviewResponse("revise", { feedback: "  Split step two  " }),
    { answers: { "plan-review": { answers: ["Keep planning", "Split step two"] } } });
  assert.deepEqual(planReviewResponse("revise", { feedback: "   " }), { answers: { "plan-review": { answers: ["Keep planning"] } } });
  assert.deepEqual(planReviewResponse("accept", { target: "acceptEdits" }),
    { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "ask" } });
  for (const [target, afterPlan] of [["acceptEdits", "acceptEdits"], ["auto", "auto"], ["ask", "ask"], ["bypass", "bypass"], ["plan", "auto"], [undefined, "auto"]])
    assert.deepEqual(planReviewResponse("primary", { target }).codeDesktop, { afterPlan });
  assert.throws(() => planReviewResponse("allow"), /Unsupported plan review/);
  const request = planRequest();
  assert.equal(isPlanReviewRequest(request), true);
  assert.equal(isPlanReviewRequest(questionRequest()), false);
  // Through the runtime: same identity and visible-thread guards, the prepared response goes out.
  for (const [action, options, expected] of [
    ["reject", {}, { answers: { "plan-review": { answers: ["Keep planning"] } } }],
    ["revise", { feedback: "Use a queue" }, { answers: { "plan-review": { answers: ["Keep planning", "Use a queue"] } } }],
    ["accept", { target: "auto" }, { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "ask" } }],
    ["primary", { target: "acceptEdits" }, { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "acceptEdits" } }],
  ]) {
    const current = planRequest();
    const { runtime, tickets: [ticket] } = setup(current);
    assert.equal((await runtime.submit(ticket, action, () => assert.fail(), { ...visible("B"), response: planReviewResponse(action, options) })).status, "stale");
    let sent;
    const result = await runtime.submit(ticket, action, async (payload, owner) => { sent = payload; assert.equal(runtime.snapshot(owner).busyAction, action); return success(owner); },
      { ...visible("A"), response: planReviewResponse(action, options) });
    assert.equal(result.status, "answered");
    assert.deepEqual({ answers: sent.answers, ...(sent.codeDesktop ? { codeDesktop: sent.codeDesktop } : {}) }, expected);
    assert.deepEqual(sent.expected, ticket.bridgeApproval);
    // The main-process mapper carries the answers and the codeDesktop.afterPlan extension.
    assert.deepEqual(approvalResponse(current, sent), expected);
  }
  // The extension belongs to a plan review only, names a plan target (Bypass is validated by main.cjs first), and has no other fields.
  const plan = planRequest();
  assert.deepEqual(approvalResponse(plan, { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "bypass" } }).codeDesktop, { afterPlan: "bypass" });
  for (const codeDesktop of [{ afterPlan: "plan" }, { afterPlan: "ask", extra: 1 }, "ask", null, []])
    assert.throws(() => approvalResponse(plan, { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop }), /Invalid plan approval/);
  assert.throws(() => approvalResponse(questionRequest(), { answers: { choice: { answers: ["Alpha"] }, text: { answers: ["x"] } }, codeDesktop: { afterPlan: "ask" } }), /Invalid plan approval/);
  // Only the review's 'Keep planning' + feedback pair may carry two values on a single-select question.
  assert.throws(() => approvalResponse(plan, { answers: { "plan-review": { answers: ["Approve", "Keep planning"] } } }), /Answer each question/);
  assert.throws(() => approvalResponse(plan, { answers: { "plan-review": { answers: ["Approve", "but smaller"] } } }), /Answer each question/);
  assert.throws(() => approvalResponse(plan, { answers: { "plan-review": { answers: ["Keep planning", "a", "b"] } } }), /Answer each question/);
  assert.throws(() => approvalResponse(plan, { answers: { "plan-review": { answers: ["Keep planning", "  "] } } }), /Answer each question/);
  assert.throws(() => approvalResponse(questionRequest(), { answers: { choice: { answers: ["Alpha", "note"] }, text: { answers: ["x"] } } }), /Answer each question/);
  // A prepared response is for question requests only.
  const command = { id: 3, bridgeApproval: bridge(), method: "item/commandExecution/requestApproval", params: { threadId: "A", turnId: "t", itemId: "i" } };
  const { runtime, tickets: [commandTicket] } = setup(command);
  await assert.rejects(runtime.submit(commandTicket, "accept", () => assert.fail(), { ...visible("A"), response: planReviewResponse("primary") }), /Unsupported approval decision/);
});

test("R07 dismiss-on-send answers every question with the lO marker; plan reviews, isOther:false and secret questions are left pending", async () => {
  assert.equal(QUESTION_DISMISSED_ANSWER,
    "[User did not answer this question \u2014 they sent a message instead. Treat that message as their response; do not re-ask.]");
  // Single + free-form (isOther:false with no options still takes text).
  const request = questionRequest();
  const payload = dismissQuestionPayload(request);
  assert.deepEqual(payload, { answers: { choice: { answers: [QUESTION_DISMISSED_ANSWER] }, text: { answers: [QUESTION_DISMISSED_ANSWER] } } });
  assert.deepEqual(approvalResponse(request, payload), payload);
  // multiSelect.
  const multi = questionRequest("B", 2);
  multi.params.questions[0].multiSelect = true;
  assert.deepEqual(dismissQuestionPayload(multi).answers.choice, { answers: [QUESTION_DISMISSED_ANSWER] });
  assert.deepEqual(approvalResponse(multi, dismissQuestionPayload(multi)).answers.choice, { answers: [QUESTION_DISMISSED_ANSWER] });
  // Free-form only.
  const free = questionRequest("C", 3);
  free.params.questions = [free.params.questions[1]];
  assert.deepEqual(approvalResponse(free, dismissQuestionPayload(free)), { answers: { text: { answers: [QUESTION_DISMISSED_ANSWER] } } });
  // Not dismissible.
  const restricted = questionRequest("D", 4);
  restricted.params.questions[0].isOther = false;
  assert.throws(() => approvalResponse(restricted, { answers: { choice: { answers: [QUESTION_DISMISSED_ANSWER] } } }), /Choose an available answer/);
  const secret = questionRequest("E", 5);
  secret.params.questions[1].isSecret = true;
  const malformed = questionRequest("F", 6);
  malformed.params.questions = [null];
  for (const pending of [restricted, secret, malformed, planRequest(), { method: "item/commandExecution/requestApproval", params: { threadId: "A" } }, null])
    assert.equal(dismissQuestionPayload(pending), null);
  // Through the runtime with the card's ticket: the draft is ignored, the card's answers are not.
  const { runtime, tickets: [ticket] } = setup(questionRequest());
  runtime.selectOption(ticket, "choice", "Beta");
  let sent;
  const result = await runtime.submit(ticket, "dismiss", async (out, owner) => { sent = out; return success(owner); },
    { ...visible("A"), response: dismissQuestionPayload(questionRequest()) });
  assert.equal(result.status, "answered");
  assert.deepEqual(sent.answers, payload.answers);
  assert.equal(runtime.snapshot(ticket).phase, "answered");
});

test("R07 one card at a time: only the oldest answerable request shows; unanswerable notices never hold the queue", () => {
  const a = questionRequest("A", 1), b = { id: 2, bridgeApproval: bridge(), method: "item/commandExecution/requestApproval", params: { threadId: "A", turnId: "t", itemId: "i" } };
  const c = planRequest(3);
  assert.deepEqual(visibleApprovals([a, b, c]), [a]);
  assert.deepEqual(visibleApprovals([b, a, c]), [b]);
  assert.deepEqual(visibleApprovals([c]), [c]);
  assert.deepEqual(visibleApprovals([]), []);
  const malformed = questionRequest("A", 4);
  malformed.params.questions = [null];
  const unsupported = { ...b, id: 5, method: "item/unknown/requestApproval", bridgeApproval: bridge() };
  const noIdentity = { ...b, id: 6, bridgeApproval: undefined };
  assert.deepEqual(visibleApprovals([malformed, a, unsupported, b, noIdentity]), [malformed, a, unsupported, noIdentity]);
});
