import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createWebAppManifestIconsPlugin,
  resolveWebManifestIcons,
  rewriteWebAppManifests,
  type WebManifestBundle,
  type WebManifestIcon
} from '../build-plugins/web-app-manifest-icons'

const MANIFEST_ICONS: WebManifestIcon[] = [
  { src: './web-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: './web-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
]

const MANIFEST_SOURCE = { name: 'Orca', start_url: '../', icons: MANIFEST_ICONS }

const EMITTED = [
  'assets/web-app-manifest-Qq4w5.webmanifest',
  'assets/web-icon-192-Fi1x2.png',
  'assets/web-icon-512-Zz9y8.png'
]

function iconsFixture(): WebManifestIcon[] {
  return MANIFEST_ICONS.map((icon) => ({ ...icon }))
}

describe('resolveWebManifestIcons', () => {
  it('points each icon at the emitted file beside the manifest', () => {
    const icons = resolveWebManifestIcons(
      iconsFixture(),
      EMITTED,
      'assets/web-app-manifest-Qq4w5.webmanifest'
    )

    expect(icons).toEqual([
      { ...MANIFEST_ICONS[0], src: './web-icon-192-Fi1x2.png' },
      { ...MANIFEST_ICONS[1], src: './web-icon-512-Zz9y8.png' }
    ])
  })

  it('accepts an icon src declared without the leading ./', () => {
    const icons = resolveWebManifestIcons(
      [{ src: 'web-icon-192.png', sizes: '192x192' }],
      EMITTED,
      'assets/web-app-manifest-Qq4w5.webmanifest'
    )

    expect(icons).toEqual([{ src: './web-icon-192-Fi1x2.png', sizes: '192x192' }])
  })

  it('fails the build when a declared icon was not emitted', () => {
    expect(() =>
      resolveWebManifestIcons(
        iconsFixture(),
        ['assets/web-app-manifest-Qq4w5.webmanifest', 'assets/web-icon-192-Fi1x2.png'],
        'assets/web-app-manifest-Qq4w5.webmanifest'
      )
    ).toThrow('web-icon-512.png')
  })

  it('does not let a near-miss icon name satisfy another icon', () => {
    expect(() =>
      resolveWebManifestIcons(
        [{ src: './web-icon-19.png', sizes: '19x19' }],
        EMITTED,
        'assets/web-app-manifest-Qq4w5.webmanifest'
      )
    ).toThrow('web-icon-19.png')
  })

  it('ignores icons emitted outside the manifest directory', () => {
    expect(() =>
      resolveWebManifestIcons(
        iconsFixture(),
        ['assets/web-app-manifest-Qq4w5.webmanifest', 'web-icon-192-Fi1x2.png'],
        'assets/web-app-manifest-Qq4w5.webmanifest'
      )
    ).toThrow('[web-app-manifest-icons]')
  })
})

describe('rewriteWebAppManifests', () => {
  it('rewrites emitted manifests and leaves icons and chunks untouched', () => {
    const bundle: WebManifestBundle = {
      'assets/web-app-manifest-Qq4w5.webmanifest': {
        type: 'asset',
        source: JSON.stringify(MANIFEST_SOURCE)
      },
      'assets/web-icon-192-Fi1x2.png': { type: 'asset', source: 'icon-192-bytes' },
      'assets/web-icon-512-Zz9y8.png': { type: 'asset', source: 'icon-512-bytes' },
      'assets/web-entry-Zz9y8.js': { type: 'chunk', source: 'var entry = true' }
    }

    rewriteWebAppManifests(bundle)

    expect(JSON.parse(String(bundle['assets/web-app-manifest-Qq4w5.webmanifest'].source))).toEqual({
      ...MANIFEST_SOURCE,
      icons: [
        { ...MANIFEST_SOURCE.icons[0], src: './web-icon-192-Fi1x2.png' },
        { ...MANIFEST_SOURCE.icons[1], src: './web-icon-512-Zz9y8.png' }
      ]
    })
    expect(bundle['assets/web-icon-192-Fi1x2.png'].source).toBe('icon-192-bytes')
    expect(bundle['assets/web-entry-Zz9y8.js'].source).toBe('var entry = true')
  })

  it('rejects a manifest without an icon array', () => {
    const bundle: WebManifestBundle = {
      'assets/broken.webmanifest': { type: 'asset', source: '{"name":"Orca"}' }
    }

    expect(() => rewriteWebAppManifests(bundle)).toThrow('does not declare an icon array')
  })
})

describe('createWebAppManifestIconsPlugin', () => {
  it('registers a generateBundle hook and no HTML transform', () => {
    const plugin = createWebAppManifestIconsPlugin()

    expect(plugin.name).toBe('web-app-manifest-icons')
    expect(typeof plugin.generateBundle).toBe('function')
    expect('transformIndexHtml' in plugin).toBe(false)
  })
})

describe('the shipped manifest', () => {
  const manifestPath = resolve('src/renderer/web-app-manifest.webmanifest')
  // Vite emits the manifest into the default assets dir, so these URLs resolve
  // against /assets/ rather than the linking page -- which is what makes './'
  // launch the assets directory instead of the client.
  const servedAt = 'http://127.0.0.1/assets/web-app-manifest-Qq4w5.webmanifest'

  function shipped(): { id: string; start_url: string; scope: string } {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  }

  it('resolves id, start_url and scope to the web client entry', () => {
    const { id, start_url, scope } = shipped()

    expect(new URL(id, servedAt).pathname).toBe('/')
    expect(new URL(start_url, servedAt).pathname).toBe('/')
    expect(new URL(scope, servedAt).pathname).toBe('/')
  })

  it('keeps them prefix-relative when a reverse proxy mounts the client deeper', () => {
    const { id, start_url, scope } = shipped()
    const prefixed = 'http://127.0.0.1/orca/assets/web-app-manifest-Qq4w5.webmanifest'

    expect(new URL(id, prefixed).pathname).toBe('/orca/')
    expect(new URL(start_url, prefixed).pathname).toBe('/orca/')
    expect(new URL(scope, prefixed).pathname).toBe('/orca/')
  })

  it('never points start_url at the assets directory', () => {
    expect(new URL(shipped().start_url, servedAt).pathname).not.toBe('/assets/')
  })
})
