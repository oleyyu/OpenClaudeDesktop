// The session's web link opener (main.jsx provides it around its tiles): replies' links call it with the click, so a
// Code web links use the original destination chooser and the session's Preview tabs.
// Without a provider (Settings, dialogs) a link opens in the default browser as before.
import React from "react";

export const WebLinkContext = React.createContext(null);
