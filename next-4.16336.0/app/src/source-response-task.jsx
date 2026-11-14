import React from 'react';
import { Icon } from './icons';
import { t } from '../electron/i18n/index.mjs';

// markdown-current Dc/Oc: read-only Code task markers, not interactive inputs.
export function ResponseTaskInput({ type, checked, disabled }) {
  if (type !== 'checkbox' || !disabled) return <input type={type} checked={checked} disabled={disabled} readOnly/>;
  return <span className="smd-task-marker" data-done={checked || undefined}>
    {checked ? <Icon name="Check" size={16}/> : <span className="smd-task-circle" aria-hidden="true"/>}
    <span className="sr-only">{checked ? t('done') : t('not done')}</span>
  </span>;
}

export function ResponseTaskItem({ node, children, className, ...props }) {
  if (!className?.split(/\s+/).includes('task-list-item')) return <li className={className} {...props}>{children}</li>;
  const parts = React.Children.toArray(children);
  const isMarker = child => React.isValidElement(child) && child.props.type === 'checkbox' && child.props.disabled;
  // GFM loose lists wrap the marker in their first paragraph. Lift only that
  // marker, retaining paragraph and nested-list structure and all user text.
  const first = parts.findIndex(child => !(typeof child === 'string' && !child.trim()));
  let marker = parts[first];
  if (isMarker(marker)) parts.splice(first, 1);
  else if (React.isValidElement(marker) && marker.type === 'p') {
    const paragraph = React.Children.toArray(marker.props.children);
    if (!isMarker(paragraph[0])) return <li className={className} {...props}>{children}</li>;
    parts[first] = React.cloneElement(marker, {}, paragraph.slice(1));
    marker = paragraph[0];
  } else return <li className={className} {...props}>{children}</li>;
  return <li {...props} className="smd-task-item">{marker}<span className="smd-task-content">{parts}</span></li>;
}
