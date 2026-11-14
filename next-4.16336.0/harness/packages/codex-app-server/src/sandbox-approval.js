// Restore the approval waterfall for this profile without changing DSH Purge.
// Its shared escalation helper ignores rejected return values, so a denied
// escalation must throw after the service records the approval audit pair.
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import { scopeTarget } from '@deepseek-ai/dsh-scope'

const OUTCOMES = new Set(['allowed-once', 'rejected', 'cancelled', 'unavailable'])

export default class CodeDesktopApproval extends ApprovalService {
  async request(req) {
    const outcome = await super.request(req)
    if (outcome !== 'allowed-once' && /^escalate sandbox to /.test(req.reason ?? '')) throw new Error(`Sandbox escalation ${outcome}`)
    return outcome
  }

  async decide(req, session) {
    const signal = req.signal
    if (signal?.aborted) return 'cancelled'
    if (this.effectivePolicy(session) === 'never') return 'rejected'
    const answer = Promise.resolve().then(() => this.ctx.waterfall(scopeTarget(req.agent, req.agent), 'approval/request', req, () => Promise.resolve('unavailable')))
      .then((outcome) => OUTCOMES.has(outcome) ? outcome : 'unavailable', () => 'unavailable')
    if (!signal) return answer
    return new Promise((resolve) => {
      const onAbort = () => { signal.removeEventListener('abort', onAbort); resolve('cancelled') }
      signal.addEventListener('abort', onAbort, { once: true })
      answer.then((outcome) => { signal.removeEventListener('abort', onAbort); resolve(outcome) })
    })
  }
}
