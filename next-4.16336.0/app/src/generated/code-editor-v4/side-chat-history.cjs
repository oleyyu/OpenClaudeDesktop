// Original 4.16336.0 desktop side-chat history, limits, escaping and replay prompt (index.chunk-CqaSnEfn.js, mention escape index.chunk-DSL69jku).
// index.chunk-DSL69jku.js
const $c_index_chunk_DSL69jku = (() => {
  function e(e) {
    return e.replaceAll("@", "\uff20");
  }
  return { e };
})();
const ue = { t: $c_index_chunk_DSL69jku.e };
var C1 = 20,
  w1 = 8e3,
  T1 = 8e4;
function E1(e) {
  return e.replace(/<\/side_chat_history/gi, "<\u200b/side_chat_history");
}
var D1 = class e {
  constructor() {
    ((this.entries = []),
      (this.turn = 0),
      (this.userCount = 0),
      (this.totalChars = 0));
  }
  recordUser(e) {
    this.record("user", e);
  }
  recordAssistant(e) {
    this.record("assistant", e);
  }
  endTurn() {
    this.turn += 1;
  }
  hasUserMessage() {
    return this.userCount > 0;
  }
  cloneForRespawn() {
    let t = new e();
    return (
      (t.entries = this.entries.map((e) => ({ ...e }))),
      (t.turn = this.turn),
      (t.userCount = this.userCount),
      (t.totalChars = this.totalChars),
      t
    );
  }
  buildReplayPrompt() {
    let e = [...this.entries];
    for (; e.at(-1)?.role === "assistant" && e.at(-1)?.turn === this.turn; )
      e.pop();
    let t = [];
    for (let n of e) {
      let e = t.at(-1);
      e?.role === "assistant" && n.role === "assistant" && e.turn === n.turn
        ? (e.text += `\n\n${n.text}`)
        : t.push({ ...n });
    }
    return `<side_chat_history>\n${t.map((e) => (e.role === "user" ? `User: ${E1(e.text)}` : `Assistant: ${E1(ue.t(e.text))}`)).join(`\n\n`)}\n</side_chat_history>\n\nThis side chat was restarted after an error; the exchanges above are its most recent conversation (the panel still shows them). Continue from them: answer the most recent user question that hasn't been answered yet. Don't repeat answers already shown above and don't mention the restart.`;
  }
  record(e, t) {
    let n = t;
    if (t.length > w1) {
      let e = w1,
        r = t.charCodeAt(e - 1);
      (r >= 55296 && r <= 56319 && --e, (n = `${t.slice(0, e)}\u2026`));
    }
    (this.entries.push({ role: e, text: n, turn: this.turn }),
      e === "user" && (this.userCount += 1),
      (this.totalChars += n.length),
      this.evict());
  }
  evict() {
    for (; this.userCount > C1 || this.totalChars > T1; ) {
      let e = +(this.entries[0]?.role === "user" && this.userCount === 1),
        t = this.entries[e];
      if (t === void 0) break;
      (this.entries.splice(e, 1),
        t.role === "user" && --this.userCount,
        (this.totalChars -= t.text.length));
    }
    if (this.userCount > 0)
      for (; this.entries[0]?.role === "assistant"; )
        ((this.totalChars -= this.entries[0].text.length),
          this.entries.shift());
  }
};
module.exports = {
  SideChatHistory: D1,
  escapeSideHistory: E1,
  escapeAssistantMentions: ue.t,
};
