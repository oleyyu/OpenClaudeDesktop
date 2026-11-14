// PushNotification: Claude Code's tool for telling the user something while they are away — a macOS notification
// from OpenClaude Desktop that opens the session when clicked. It follows Settings › Notifications (the Task complete level
// and the sound) and is not shown while the app is in front, where the user already sees the transcript.
//
// ctx.notifications.send({title, message}) → "sent" | "focused" | "off" | "unsupported" | "unknown"
// (main.cjs: desktop-settings.cjs notifyAgent for the calling session).
export const group = "notify";
export const native = "PushNotification";

export const MAX_MESSAGE = 200;
export const MIN_INTERVAL_MS = 10_000;
const lastSent = new Map(); // session id → time of its last notification

/** Forget the rate limit (tests). */
export function resetNotifyLimits() { lastSent.clear(); }

export const tools = [
  {
    name: "PushNotification",
    title: "Send notification",
    description: "Send the user a desktop notification from OpenClaude Desktop, e.g. when a long task finishes or you need their input while they may be away from the app. Clicking it opens this session. It follows the user's notification settings and isn't shown while they are looking at the app. Keep the message short (at most 200 characters) and specific; don't notify for routine progress. At most one notification every 10 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "What to tell the user, at most 200 characters." },
        title: { type: "string", description: "Optional short title. Default: OpenClaude Desktop." },
      },
      required: ["message"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const message = typeof args.message === "string" ? args.message.trim() : "";
      if (!message) throw new Error("message is required.");
      if (message.length > MAX_MESSAGE) throw new Error(`The message is longer than ${MAX_MESSAGE} characters.`);
      const title = typeof args.title === "string" ? args.title.trim().slice(0, 80) : "";
      if (!ctx?.notifications || typeof ctx.notifications.send !== "function") throw new Error("Notifications aren’t available in this session.");
      const now = Date.now(), last = lastSent.get(ctx.sessionId);
      if (last !== undefined && now - last < MIN_INTERVAL_MS) throw new Error(`Notification not sent: wait ${Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000)} s before sending another.`);
      const outcome = await ctx.notifications.send({ title, message });
      if (outcome === "sent") {
        lastSent.set(ctx.sessionId, now);
        if (lastSent.size > 500) lastSent.delete(lastSent.keys().next().value);
        return "Notification sent.";
      }
      const why = outcome === "focused" ? "the user is looking at OpenClaude Desktop right now, so they will see your reply"
        : outcome === "off" ? "the user turned these notifications off in Settings"
          : outcome === "unsupported" ? "this Mac can’t show notifications from OpenClaude Desktop" : "this session can’t send notifications";
      return `Notification not sent: ${why}.`;
    },
  },
];
