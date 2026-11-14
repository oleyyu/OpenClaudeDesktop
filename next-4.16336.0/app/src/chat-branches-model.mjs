// w13-chatfn-branches: the Chat version model lives in electron/chat-branches-model.mjs, because the main process imports
// it (surface-policy.mjs, chat-branches.mjs) and the package script ships no src/*.mjs outside its whitelist. The
// renderer and the tests keep importing it from here.
export * from '../electron/chat-branches-model.mjs';
