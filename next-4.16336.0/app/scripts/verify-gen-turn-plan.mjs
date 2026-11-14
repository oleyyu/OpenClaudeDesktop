import { extractTurnPlan } from './extract-turn-plan.mjs'; await extractTurnPlan({ check: true });
// 4.16336.0 staging graph (src/generated/turn-plan-v4, scripts/extract-turn-plan-v4.mjs): checked strictly once it exists.
import { existsSync } from 'node:fs';
import { outputs, extractTurnPlanV4 } from './extract-turn-plan-v4.mjs';
if (existsSync(outputs.renderer)) await extractTurnPlanV4({ check: true });
