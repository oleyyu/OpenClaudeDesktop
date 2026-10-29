// w13-chatfn-projects: the official claude.ai project_knowledge_search tool (research/w13-chatfn.md M4: the tool name in
// the 3.6556.2 frontend, rendered with the "Projects" icon) on the local side. It searches the knowledge of the project
// the calling Chat or Cowork session belongs to (electron/project-knowledge.mjs: local tokens, BM25 over passages).
// ctx.projectKnowledge (main.cjs host.provide): { project() → {id, name} | null, search(query, {limit}) → results }
export const surfaces = ['chat', 'cowork'];

function service(ctx) {
  if (!ctx?.projectKnowledge || typeof ctx.projectKnowledge.search !== 'function') throw new Error('Project knowledge isn’t available here.');
  return ctx.projectKnowledge;
}

/** The results as the tool's text: each passage under its file name, best first. */
export function renderResults(results, query) {
  if (!results.length) return `No project knowledge matches “${query}”.`;
  return results.map((result, index) => `[${index + 1}] ${result.name} (passage ${result.passage})\n${result.text}`).join('\n\n---\n\n');
}

export const tools = [
  {
    name: 'project_knowledge_search',
    title: 'Search project knowledge',
    description: 'Search the files the user added to this project’s knowledge. Returns the passages that best match the query, each with its file name, best first. Use it before answering anything that may depend on the project’s files; search again with other words when the first results miss.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for: keywords or a short question.' },
        max_text_results: { type: 'integer', minimum: 1, maximum: 20, description: 'At most this many passages (default 5).' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) throw new Error('Give a query to search for.');
      const knowledge = service(ctx);
      const project = await knowledge.project();
      if (!project) throw new Error('This session isn’t in a project.');
      const limit = Number.isInteger(args.max_text_results) ? args.max_text_results : undefined;
      return renderResults(await knowledge.search(query, { limit }), query);
    },
  },
];
