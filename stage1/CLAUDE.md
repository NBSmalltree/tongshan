# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

奉化-在地文化数字共创平台 (Fenghua Local Culture Digital Co-creation Platform) — an offline Electron kiosk app for 1920x1080 touch-screen displays. Shows cultural heritage materials across 5 themes with a custom virtual keyboard supporting pinyin input. All UI is in Chinese (zh-CN), no i18n.

## Commands

```bash
npm run dev          # Start Electron in dev mode (electron-vite dev)
npm run build        # Build all three processes (main/preload/renderer)
npm run build:win    # Build + package Windows NSIS installer → dist-release/
npm run build:mac    # Build + package macOS app
npm run build:linux  # Build + package Linux app
```

No test framework is configured. No linter is configured.

## Architecture

Three-process Electron app using `electron-vite`:

**Main process** (`src/main/index.ts`):
- Creates kiosk/fullscreen BrowserWindow, reads `resources/config.json` for settings
- Registers custom `static://` protocol resolving to `resources/` first, then `static/`
- 7 IPC handlers: `get-static-path`, `read-data-json`, `read-config-json`, `resolve-asset`, `close-app`, `check-trial`, `get-trial-status`
- Admin exit: `Ctrl+Alt+Q`. System shortcuts (Alt+Tab, Alt+F4) are blocked in kiosk mode.
- Trial system: tracks open count in `userData/trial.json`, locks after July 1, 2026 if count > 20

**Preload** (`src/preload/index.ts`):
- Exposes `window.electronAPI` via `contextBridge` — the only bridge between renderer and Node.js

**Renderer** (`src/renderer/`):
- Vue 3 SPA with Composition API + `<script setup lang="ts">`
- 6 views: Welcome (carousel), Dashboard (theme grid), ThemeList (horizontal swiper), Detail, SearchView, TrialExpired
- Router uses `createWebHashHistory` (required for Electron file:// protocol)
- Pinia stores: `appStore` (UI state), `dataStore` (loads `data.json`, provides fuzzy search)
- No backend API — all data from local `resources/data.json` and `resources/config.json`

## Key Patterns

- **Asset resolution**: Renderer calls `resolveAsset()` via IPC → main process returns `static://` URLs. CSP in `index.html` allows `static:` protocol for img/media.
- **Kiosk behaviors**: 3-min inactivity watchdog (`plugins/watchdog.ts`) resets to Welcome; 5 rapid taps in top-right corner of Welcome exits app; context menus and navigation blocked.
- **Virtual keyboard**: Custom implementation in `VirtualKeyboard.vue` using `simple-keyboard` + `pinyin-pro` with `@pinyin-pro/data/modern` dictionary. Three layouts (lowercase, uppercase, number).
- **Horizontal drag scrolling**: ThemeList and SearchView use pointer-event-based drag with rubber-band overscroll physics.
- **Page transitions**: `<transition>` wrapper in `App.vue` with names from route meta (fade, slide-up, scale).
- **CSS**: Vanilla CSS with custom properties in `styles/index.css` (dark ink/wood/gold palette). No CSS framework.

## Data Model

`resources/data.json` contains 5 themes and ~17-19 materials. Each material has: `id`, `theme`, `title`, `author`, `type` (text/image/video/audio), `category`, `region`, `period`, `cover`, `content`, `tags`.

`resources/config.json` controls runtime behavior: `resolution` (e.g. "1920x1080"), `kiosk` (bool), `fullscreen` (bool).

## Packaging

`electron-builder.yml` targets Windows NSIS (one-click, per-machine). Both `static/` and `resources/` are bundled as `extraResources`. Output goes to `dist-release/`.

## Development Notes

- When modifying IPC: update handlers in `src/main/index.ts`, the bridge in `src/preload/index.ts`, and the type declaration in `src/renderer/src/env.d.ts`
- The `static://` protocol checks `resources/` before `static/` for file resolution
- Virtual keyboard and horizontal swiper code are complex custom implementations — read carefully before modifying
