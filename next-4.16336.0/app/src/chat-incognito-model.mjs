// w13-chatfn-history: the incognito chat model (pure). It lives in electron/ so the main process may import it too
// (package.json's packager --ignore drops src/ but six models); the renderer reads it here.
export * from '../electron/chat-incognito-model.mjs';
