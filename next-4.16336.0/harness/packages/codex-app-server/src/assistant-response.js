/** Response segments and usage from the durable Session stream vocabulary. */
import { expandAssistantStream, lastAssistantStreamChunk } from '@deepseek-ai/dsh-llm/assistant-stream'

/** Original block indexes keep live frames and independently committed segments on the same item. */
export function assistantSegmentBlocks(data) {
  const indices = [...new Set(expandAssistantStream(data.stream ?? [])
    .flatMap(({ chunk }) => 'index' in chunk ? [chunk.index] : []))]
  return (data.message?.content ?? []).map((block, position) => ({ index: indices[position] ?? position, block }))
}

/** One fold per Session; intermediate segments count as one message and only the full attempt carries usage. */
export class AssistantUsageFold {
  constructor() {
    this.streaming = undefined
    this.lastSeq = -1
  }

  push(event) {
    if (!event || typeof event !== 'object') return undefined
    if (Number.isInteger(event.seq)) {
      if (event.seq <= this.lastSeq) return undefined
      this.lastSeq = event.seq
    }
    const data = event.data ?? {}
    if (event.type === 'session/end-seed' && data.inherited === true) this.streaming = undefined
    if (event.type === 'assistant/stream-start') {
      this.streaming = { turn: data.turn, step: data.step, model: data.model, messageSeen: false }
      return undefined
    }
    const active = this.streaming !== undefined && this.streaming.turn === data.turn && this.streaming.step === data.step
      ? this.streaming : undefined
    if (event.type === 'assistant/stream-merge' || event.type === 'step/end' || event.type === 'turn/end') {
      if (active || event.type === 'turn/end') this.streaming = undefined
      return undefined
    }
    if (event.type === 'assistant/message') {
      if (active) {
        const message = !active.messageSeen
        active.messageSeen = true
        return { message, time: event.time, turn: data.turn, model: active.model }
      }
      return { message: true, time: event.time, turn: data.turn, model: data.message?.source?.model, usage: data.usage }
    }
    if (event.type === 'assistant/attempt' && active) return {
      message: false, time: event.time, turn: data.turn, model: active.model,
      usage: lastAssistantStreamChunk(data.stream ?? [], 'usage')?.usage,
    }
    return undefined
  }
}
