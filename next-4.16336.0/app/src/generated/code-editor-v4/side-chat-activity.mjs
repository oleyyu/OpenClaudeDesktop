// Original 4.16336.0 side-chat tool announcement (c9bd7af9c-Bvb7EG4D.js); host supplies the intl formatter.

function kN(e, t) {
  switch (e.tool) {
    case "Read":
      return e.detail
        ? t.formatMessage(
            { defaultMessage: "Reading {file}", id: "bXzpWpo1O9" },
            { file: e.detail },
          )
        : t.formatMessage({
            defaultMessage: "Reading a file",
            id: "sFB1oyGxRN",
          });
    case "Grep":
      return e.detail
        ? t.formatMessage(
            { defaultMessage: "Searching for {pattern}", id: "XgFMQ2uC6Q" },
            { pattern: e.detail },
          )
        : t.formatMessage({
            defaultMessage: "Searching files",
            id: "WCIAidgueo",
          });
    case "Glob":
      return t.formatMessage({
        defaultMessage: "Finding files",
        id: "7P+BfHK5OP",
      });
    default:
      return t.formatMessage({
        defaultMessage: "Thinking\u2026",
        id: "P1QHV0AhYD",
      });
  }
}

export { kN as sideChatToolAnnouncement };
