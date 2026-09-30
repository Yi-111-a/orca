import { describe, expect, it } from 'vitest'
import { resolveMarkdownReviewNotesEnabled } from './markdown-review-notes-visibility'

describe('resolveMarkdownReviewNotesEnabled', () => {
  it('shows the controls by default so existing profiles are unchanged', () => {
    expect(resolveMarkdownReviewNotesEnabled(null)).toBe(true)
    expect(resolveMarkdownReviewNotesEnabled({ markdownReviewToolsEnabled: true })).toBe(true)
  })

  it('hides the controls when the setting is off', () => {
    expect(resolveMarkdownReviewNotesEnabled({ markdownReviewToolsEnabled: false })).toBe(false)
  })

  it('lets an explicit prop win over the setting', () => {
    expect(resolveMarkdownReviewNotesEnabled({ markdownReviewToolsEnabled: true }, false)).toBe(
      false
    )
    expect(resolveMarkdownReviewNotesEnabled({ markdownReviewToolsEnabled: false }, true)).toBe(
      true
    )
  })
})
