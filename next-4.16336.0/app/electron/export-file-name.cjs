// Export's suggested file name (main.cjs slash-export): the session's title (its name, else its first message), made
// safe for a file name, and the local date, so one export never offers to replace another ("Build script question
// 2026-10-09.md"); `fallback` (the localized "Conversation") when the session has no title.
function exportFileName(metadata, fallback = "Conversation", now = new Date()) {
  const raw = [metadata?.name, metadata?.preview].find((value) => typeof value === "string" && value.trim()) ?? "";
  let title = raw.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  if ([...title].length > 80) title = [...title].slice(0, 80).join("").trim();
  const pad = (value) => String(value).padStart(2, "0");
  return `${title || fallback} ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
}
module.exports = { exportFileName };
