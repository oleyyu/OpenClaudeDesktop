const { connectionMatches } = require('./session-operations.cjs');

// Side sessions bind every action to the connection that displayed the turn.
// Keep the existing unbound main-composer path, but never restart a bound one.
async function steerTurn(owner, payload, { prepareInput, accepted } = {}) {
  const { threadId, expectedTurnId, input, expected } = payload || {};
  if (typeof threadId !== 'string' || !threadId || typeof expectedTurnId !== 'string' || !expectedTurnId || !Array.isArray(input))
    throw new Error('The steer target is unavailable.');
  const connection = expected ? owner.connection : undefined;
  const check = () => {
    if (expected && (owner.connection !== connection || !connectionMatches(owner, expected)))
      throw new Error('The core connection changed. Reopen the session before retrying.');
  };
  check();
  if (!expected) await owner.start();
  const prepared = prepareInput ? await prepareInput(input) : input;
  check();
  try {
    const result = await owner.request('turn/steer', { threadId, expectedTurnId, input: prepared,
      ...(typeof payload.clientUserMessageId === 'string' ? { clientUserMessageId: payload.clientUserMessageId } : {}) }, 120000, connection);
    // A bookkeeping failure cannot turn a confirmed send into a retry.
    await Promise.resolve().then(() => accepted?.(threadId, input)).catch(() => {});
    return { ok: true, result };
  } catch (error) {
    return { ok: false, message: error.message, data: error.data ?? null, code: error.code ?? null };
  }
}
module.exports = { steerTurn };
