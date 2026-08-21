---
name: slack-game-development
description: Develop or adapt mini-games for the DSH 摸鱼模式 Slack Mode protocol. Use this Skill to create a new protocol game from scratch (single-file HTML), adapt an existing third-party HTML/JS game (e.g. the wanghao221/moyu 2000-game collection) into the slack protocol, build the postMessage wrapper, handle sandbox pitfalls (localStorage, pause semantics, focus), and validate manifest/protocol compatibility before publishing to dsh-slack-games.
---

# Slack Game Development & Adaptation

The slack protocol turns any **self-contained static web page** into an installable game for the DSH 摸鱼面板: it runs in a `sandbox="allow-scripts"` iframe and talks to the panel only through `postMessage`. Games live in the `dsh-slack-games` repo (`games/<id>/`); the plugin base never contains game code.

## When to use this skill

- Building a new game for the slack panel.
- Adapting an existing HTML/JS game (from `wanghao221/moyu`, a tutorial site, your own legacy code) so it can be installed by URL.
- Debugging why a game fails in the sandbox: pause does nothing, localStorage throws, restore loses progress, Alt+M not forwarded, manifest rejected.

## 1. Protocol at a glance

Authoritative spec: `../SLACK-GAME-PROTOCOL.md` (in the repo root). Minimal contract:

**Manifest** (`manifest.json`, served next to the game):

```json
{ "id": "my-game", "name": "我的游戏", "version": "1.0.0",
  "protocol": 1, "entry": "index.html", "description": "..." }
```

**Panel → game** (`window.addEventListener('message', ...)`):

| type | payload | meaning |
|---|---|---|
| `slack:init` | `{ locale, theme, restore }` | (re)initialize; `restore` = last saved serializable state or `null` |
| `slack:pause` | — | freeze everything: timers, animation, input |
| `slack:resume` | — | continue |
| `slack:destroy` | — | release all resources before unmount |

**Game → panel** (`window.parent.postMessage(msg, '*')`):

| type | payload | meaning |
|---|---|---|
| `slack:ready` | `{ title?, version? }` | initialized |
| `slack:state` | `{ status?, state }` | report status (`playing`/`paused`/`over`) and serializable progress |
| `slack:error` | `{ message }` | optional debug error |
| `slack:key` | `{ key: 'alt-m' }` | forward Alt+M to the panel |

**Sandbox hard rules** (violations are the #1 failure source):

1. **NO `localStorage`/`sessionStorage`** — accessing them in the sandbox throws `SecurityError` and can kill the game. Save progress via `slack:state.state` instead; if the game insists on storage, install an in-memory shim **before** the game's scripts run (see the wrapper template).
2. **NO `window.top` / `window.opener` / popups / form submits / top navigation**.
3. Focus lives inside the iframe: the game's `window` receives keydown when the user clicks it — use that for input; forward Alt+M yourself.

## 2. Build a game from scratch

1. Copy `template/wrapper.html` into `games/<id>/index.html`.
2. Replace the marked regions with your game: CSS in the style block, DOM in the body, logic + protocol wiring in the script.
3. The template already implements: protocol listener, pause/resume hooks, state serialize/restore, Alt+M forwarding, in-memory localStorage shim.
4. Wire your game into the hooks:
   - `onInit(restore)` → build/restore the game state.
   - `onPause()` → stop timers/input; `onResume()` → restart them.
   - `serializeState()` → return the smallest JSON that can rebuild the game.
   - call `postState()` after meaningful changes.
5. Write `manifest.json` (id lowercase-hyphen, protocol 1, entry `index.html`).
6. Test locally (section 5), then add to `registry.json`.

## 3. Adapt an existing third-party game

This is the common case (e.g. the `wanghao221/moyu` 2000-game collection). Follow the order strictly.

### 3.1 Acquire the source

- **Repo directories** (moyu has `游戏-N.*` folders): clone or download the folder. They are usually multi-file (`index.html` + `css/` + `js/`), all local relative paths — copy the **whole directory**.
- **Remote demo URLs** (moyu lists ~2000 games at `game.haiyong.site`): you can reference them remotely (see 3.3 Mode B), but verify the URL returns 200 and is not blocked by `X-Frame-Options`/CSP (`curl -sSI <url> | findstr /I "x-frame content-security"`).

### 3.2 Classify the game (decide the whole strategy)

| axis | answer | consequence |
|---|---|---|
| pace | **turn-based** (2048/象棋/纸牌/石头剪刀布) | pause = disable input; restore = serialize board. Easy |
| | **real-time** (打地鼠/飞机躲避/盖塔楼/贪吃蛇) | pause must freeze the game loop (find `setInterval`/`requestAnimationFrame`/tick fn and gate it). More work |
| storage | uses `localStorage` (high scores, settings) | must install the in-memory shim (copy mode only) |
| assets | self-contained vs multi-file vs CDN | multi-file → serve the whole dir; CDN → verify reachability, prefer to inline/copy |
| input | keyboard / click / drag | ensure it works with iframe focus; keyboard games need the user to click into the frame first |
| structure | single page vs emulator page (FC/NES ROMs, e.g. `游戏-56.小霸王游戏机`) | **skip emulators**: heavy, multi-asset, often external ROMs, pause is emulator-specific |

### 3.3 Choose integration strategy

**Mode A — copy & wrap (recommended, full control):**
Put the game's code inside `template/wrapper.html` (inline its CSS/JS, keep its asset files beside `index.html`). You control load order → the localStorage shim and pause hooks work; restore can reach the game's real state.

**Mode B — remote iframe (zero copy, weaker):**
Set `ORIGINAL_URL` in the wrapper; the wrapper iframes the original and forwards protocol messages. Pause = veil + `pointer-events:none` (hides input) — but **the inner game's timers keep running**, so real-time games keep progressing underneath. Restore is limited to what the wrapper can observe (usually nothing). Only for turn-based, storage-free, iframe-allowable games.

### 3.4 The wrapper

`template/wrapper.html` provides both modes with marked sections. Do not reimplement the shim — reuse the template.

### 3.5 Per-type adaptation recipes

- **Turn-based + keyboard (2048)**: `onPause` → ignore keydown; `serializeState` → `{ grid, score }`; `onInit(restore)` → rebuild grid. ~30 minutes.
- **Turn-based + click (象棋/纸牌)**: `onPause` → ignore clicks (a `paused` flag at the top of every handler, or `pointer-events:none` on the board); restore = board + whose turn.
- **Real-time (打地鼠/飞行)**: locate the loop — grep for `setInterval`/`requestAnimationFrame`/`setTimeout` — replace with a guarded wrapper that checks `paused` (or clear the interval on pause and restart on resume, rebuilding elapsed state if the game depends on `Date.now()`). Verify the game does not desync after resume.
- **localStorage users**: in Mode A, the wrapper's shim (installed before the game's script tag) makes `localStorage.setItem/getItem` work against memory — zero game-code changes for reads/writes; only exotic usages (`localStorage` as event source) need more.

### 3.6 Vetting checklist (run before publishing)

- [ ] Loads in a bare iframe with `sandbox="allow-scripts"` — no `SecurityError`, no console exceptions.
- [ ] Pause actually stops progress (watch the state 3s under pause for real-time games).
- [ ] Resume continues correctly (no desync, no double timers).
- [ ] Restore rebuilds the game (switch away and back — progress kept).
- [ ] Alt+M toggles the panel from inside the game.
- [ ] No popups, no `top` navigation, no external fetch of credentials.
- [ ] Works at the panel's iframe size; controls reachable without scrolling.
- [ ] License/attribution recorded in the game's manifest or README (the moyu collection is by 海拥; source by request — local use fine, public redistribution needs permission).

### 3.7 The moyu collection specifically

- Good first picks (turn-based, simple): `游戏-2.响应式2048`, `游戏-26.石头剪刀布`, `游戏-51.纸牌记忆`, `游戏-52.骰子游戏`, `游戏-57.中国象棋`.
- Skip: `游戏-56.小霸王游戏机` (FC emulator + ROMs), any demo that says "需 PC 打开", anything with external CDN scripts that would break offline.
- The root `index.html` (59KB) is a portal, not a game — ignore it.

## 4. Manifest & install

- `manifest.json` sits next to `index.html`; the panel fetches it by URL and resolves `entry` relative to it.
- `entry` may be `index.html` (recommended). Multi-file games: keep assets in the same directory — the whole dir must be served (a static host or GitHub Pages handles this).
- Install in the panel: 🎮 游戏库 → paste the manifest URL → 添加. Re-adding with the same `id` overwrites (update path).

## 5. Test & verify

1. Local: `python -m http.server 8000` (or `npx serve`) in `dsh-slack-games/`; open `http://localhost:8000/games/<id>/index.html` to smoke-test the game itself.
2. Simulate the protocol from the console:
   ```js
   window.parent.postMessage({ type: 'slack:init', version: 1, payload: { restore: null } }, '*')
   window.parent.postMessage({ type: 'slack:pause' }, '*')
   ```
   (no parent → silent no-op; you can also open the game in an iframe of a scratch page to observe `slack:state`).
3. End-to-end in the panel: add the manifest URL → play → pause (button disables) → 回到工作 → reopen (progress kept) → Alt+M from inside the game → 移除/重装.
4. Open the browser console in the panel: `slack:error` messages from the game print there.

## 6. Publish

1. Update `registry.json` with the new game.
2. Commit to `dsh-slack-games` and push; if the repo is served on GitHub Pages, the game is installable at `https://<user>.github.io/dsh-slack-games/games/<id>/manifest.json`.
3. Update this skill and the template when the protocol or pitfalls change.

## Resources

- `template/wrapper.html` — ready-to-use protocol wrapper (both copy and remote-iframe modes).
- `template/adapt-checklist.md` — printable per-game adaptation checklist.
- `../SLACK-GAME-PROTOCOL.md` — the authoritative protocol spec.
