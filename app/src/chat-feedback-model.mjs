// w13-chatui-message-actions: the Chat feedback model lives in electron/chat-feedback-model.mjs, because the main process
// imports it (chat-feedback.mjs) and the package script ships no src/*.mjs outside its whitelist. The renderer and the
// tests keep importing it from here.
export * from '../electron/chat-feedback-model.mjs';
