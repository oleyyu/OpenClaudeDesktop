// B39 Allowed sites dialog logic (2.31226.0 c25b1be4a-C8MgNjI5 p, c36734a81-B0yxtrZx g/_): pure, for the
// renderer (source-preview-allowed-sites.jsx) and its tests.

// c25b1be4a p: the add field's message for each shared-0 yg result ("ok" and "declined" show none).
const ERRORS = {
  invalid: "Enter a valid web address.",
  loopback: "Localhost is always allowed.",
  exists: "That site is already allowed.",
  blocked: "This site can’t be added due to safety restrictions.",
  "org-blocked": "This site is blocked by your organization’s policy.",
  unavailable: "Couldn’t verify this site. Try again.",
};
export function allowedSiteError(result, translate = (text) => text) {
  const text = ERRORS[result];
  return text ? translate(text) : null;
}

