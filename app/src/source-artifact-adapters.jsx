import React, { useMemo } from 'react';
import { Jr as OriginalArtifactGlyph } from './generated/current-chat/c230724a2-BxatGObJ.js';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { useStartIntl, StartMessage } from './source-code-start-adapters.jsx';

export function useArtifactIntl() {
  const startIntl = useStartIntl();
  const locale = getLocale();
  return useMemo(() => ({
    ...startIntl,
    locale,
    formatDate: (value, options) => new Intl.DateTimeFormat(locale, options).format(value),
  }), [startIntl, locale]);
}
export function ArtifactMessage({ values, ...message }) {
  return <StartMessage {...message} values={values} />;
}
export const useArtifactOwners = () => () => undefined;
export const isSharedArtifact = () => false;
export const useArtifactTypeChips = () => true;
export const useArtifactBand = () => 'tall-frame';
export const NoCloudArtifact = () => null;
export const formatArtifactCount = value => String(value);
export const artifactTypeInfo = () => undefined;
export function ArtifactMenu({ item, contextMenuTrigger }) { return contextMenuTrigger ?? item.menu?.({ placement: 'row' }) ?? null; }
export const useArtifactAnnouncement = (count, query) => ({ announcement: query ? t('{count} artifacts', { count }) : '' });
export const ARTIFACT_WEEKDAY_FORMAT = { month: 'short', day: 'numeric' };
export const useArtifactToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function ArtifactThumbnail({ item }) {
  return <OriginalArtifactGlyph source={item.source} icon={item.icon} tint={item.tint} iconSize="lg" bare />;
}
export function ArtifactDate({ date, locale }) {
  const elapsed = Date.now() - date;
  if (elapsed >= 0 && elapsed < 48 * 3600000) {
    const unit = elapsed < 3600000 ? 'minute' : 'hour', count = Math.floor(elapsed / (unit === 'hour' ? 3600000 : 60000));
    return new Intl.RelativeTimeFormat(locale, { style: 'narrow', numeric: 'auto' }).format(-count, unit);
  }
  return new Date(date).toLocaleDateString(locale);
}

export function messageDescriptors(messages) { return messages; }

// Current library calls the menu factory for both rows and context triggers.
export const renderArtifactMenu = (item, options) => item.menu?.(options) ?? null;
