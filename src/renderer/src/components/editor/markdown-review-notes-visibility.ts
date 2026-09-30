import type { GlobalSettings } from '@/shared/global-settings-types'

/** Decides whether the local markdown review-note controls render.
 *
 *  The Settings toggle is the user's only control over these controls, so an absent setting
 *  resolves to enabled and only an explicit `false` hides them. An explicit prop still wins,
 *  so a surface that must suppress the controls regardless of the setting keeps doing so. */
export function resolveMarkdownReviewNotesEnabled(
  settings: Pick<GlobalSettings, 'markdownReviewToolsEnabled'> | null | undefined,
  propEnabled?: boolean
): boolean {
  return propEnabled ?? settings?.markdownReviewToolsEnabled !== false
}
