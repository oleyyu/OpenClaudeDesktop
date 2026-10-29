// w13-chatfn-projects: a project's knowledge for its Chat and Cowork sessions (official claude.ai adds it at completion
// time; "Claude references the same knowledge every time you talk to it in this project.", c71dee58b su). Whole while
// it is small, else the file list and project_knowledge_search (electron/project-knowledge.mjs knowledgeInstructions).
// The project's instructions are added before this by applyProjectContext (local-projects.mjs "Project instructions:").
import { knowledgeInstructions } from '../project-knowledge.mjs';

export const id = 'project-knowledge';
export const surfaces = ['chat', 'cowork'];

export async function apply({ project, dataDir }) {
  if (!project || typeof dataDir !== 'string' || !dataDir) return null;
  return knowledgeInstructions(dataDir, project);
}
