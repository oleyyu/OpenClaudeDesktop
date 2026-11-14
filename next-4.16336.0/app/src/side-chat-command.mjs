// cccc2cf0a CT / kT.le: slash clear/reset/new act locally before dispatch.
export const isSideChatReset = text => /^\/(?:clear|reset|new)(?:\s|$)/i.test(text.trim());
