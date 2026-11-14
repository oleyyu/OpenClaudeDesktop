// Checks the 4.16336.0 question card graph (scripts/extract-question-card-v4.mjs -> src/generated/question-card-v4)
// byte for byte, with its reviewed pins (cds-core manifest, roots, linked roots, inner expressions, adapter declaration).
import { extractQuestionCardV4 } from './extract-question-card-v4.mjs';
await extractQuestionCardV4({ check: true });
