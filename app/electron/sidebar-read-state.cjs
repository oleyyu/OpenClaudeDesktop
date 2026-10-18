// Local persistence seam for the renderer's distinct unread/explicitUnread
// inputs. All windows use the same metadata handler, including Mark as unread.
function sidebarReadStatePatch(value, { automatic = false } = {}) {
  if (typeof value?.unread !== 'boolean') return {};
  return { unread: value.unread, explicitUnread: value.unread && !automatic };
}
module.exports = { sidebarReadStatePatch };
