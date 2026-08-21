# DSH 摸鱼模式 · 第三方游戏协议 v1

> 本文档面向游戏开发者：如何为 DSH（DeepSeek Harness）Web UI 的"摸鱼模式"做一个**纯前端、零依赖、一个 URL 就能安装**的小游戏。
>
> 你不需要懂 DSH、不需要 npm、不需要碰插件本体。只需要做一个**静态网页**，放到任意静态托管（GitHub Pages / Vercel / 任意 CDN），然后在摸鱼面板的"游戏库"里粘贴 manifest URL 即可。

---

## 1. 核心概念

- 游戏是一个**独立网页**，被装在 `<iframe sandbox="allow-scripts">` 里运行。
- 游戏与面板之间**只能通过 `postMessage` 通信**，通信格式即本协议。
- 游戏是"无知的"：它不知道 DSH 是什么，只响应 4 个控制消息、上报自己的状态。
- 面板负责一切机制：暂停遮罩、自动切回、游戏切换、进度保存。

```
┌─ 摸鱼面板（父页面）──────────────┐     postMessage      ┌─ 游戏（iframe 沙箱）────────┐
│  sandbox 沙箱隔离                 │ ◄─────────────────► │  纯静态网页，任意技术栈     │
│  校验消息来源、管理生命周期        │   slack:init/pause  │  只实现 init/pause/resume/  │
│  保存/恢复游戏进度                │   /resume/destroy    │  destroy + 状态上报        │
└──────────────────────────────────┘   slack:ready/state  └────────────────────────────┘
```

## 2. 游戏清单（manifest）

游戏必须提供一个 manifest JSON。面板通过用户粘贴的 URL 获取它。

```json
{
  "id": "snake-3d",
  "name": "3D贪吃蛇",
  "version": "1.2.0",
  "protocol": 1,
  "entry": "index.html",
  "author": "你的名字",
  "description": "一句话介绍这个游戏",
  "icon": "icon.png"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 全局唯一标识（小写字母数字连字符）。安装时若 id 已存在则覆盖更新 |
| `name` | ✅ | 显示名（面板标签、标题栏） |
| `version` | ✅ | 语义化版本号 |
| `protocol` | ✅ | **必须为 `1`**（本协议版本） |
| `entry` | ✅ | 相对 manifest 所在目录的游戏入口页，如 `index.html` |
| `author` | ❌ | 作者名 |
| `description` | ❌ | 简介 |
| `icon` | ❌ | 图标（相对路径），暂未使用 |
| `sandbox` | ❌ | iframe 沙箱权限（字符串数组或空格分隔的字符串）。**缺省 = `["allow-scripts"]`（最严）**。需要嵌入第三方页面（如 B 站播放器）的游戏可声明放宽，例如 `["allow-scripts","allow-same-origin","allow-forms","allow-popups"]`。⚠️ 放宽权限会降低隔离性，只对你信任的游戏使用 |

## 3. 消息协议

所有消息都是 `postMessage` 发送的普通对象，`type` 字段区分类型。JSON 必须可序列化。

### 3.1 面板 → 游戏

| type | payload | 时机 / 语义 |
|---|---|---|
| `slack:init` | `{ locale, theme, restore }` | iframe 加载完成后发送（**每次挂载发一次**）。`restore` 是上次保存的游戏状态（可序列化 JSON），没有则为 `null`。游戏应据此恢复进度。多次收到 `init` 视为重新初始化 |
| `slack:pause` | 无 | 面板暂停（用户点暂停、或面板被切回工作界面）。游戏必须**冻结一切**：停止计时器/动画/输入 |
| `slack:resume` | 无 | 面板恢复。游戏继续 |
| `slack:destroy` | 无 | 游戏即将被卸载（切换游戏/移除/关闭插件）。游戏应**释放一切资源**：清理定时器、事件监听、动画帧 |

### 3.2 游戏 → 面板

| type | payload | 说明 |
|---|---|---|
| `slack:ready` | `{ title?, version? }` | 游戏初始化完成。`title` 可覆盖显示名 |
| `slack:state` | `{ status?, state? }` | 状态上报。`status` 取值 `playing` / `paused` / `over`（面板用于展示）。`state` 是**可序列化的游戏进度**，面板会保存并在下次 `init` 时通过 `restore` 返回（建议在每次有意义的进度变化后发送） |
| `slack:error` | `{ message }` | 游戏内部错误（可选，仅用于调试） |
| `slack:key` | `{ key }` | **按键转发**（见 §5） |

### 3.3 消息示例

```js
// 面板 → 游戏
parent.postMessage({ type: 'slack:init', version: 1, payload: { locale: 'zh', theme: 'dark', restore: { score: 12 } } }, '*')
// 游戏 → 面板
window.parent.postMessage({ type: 'slack:state', payload: { status: 'playing', state: { score: 13 } } }, '*')
```

## 4. 安全模型（开发者须知）

- 游戏运行在 `sandbox="allow-scripts"` 的 iframe 中：**没有**同源权限、没有弹窗、没有表单提交、没有顶层导航；它拿不到父页面的任何 JS 变量、DOM 或存储。
- 游戏与父页面之间唯一的通道是 `postMessage`。
- 父面板会校验消息来源：只接受**来自本游戏 iframe 实例**（`event.source` 匹配）的消息。由于沙箱 iframe 的 origin 是 `null`，`event.origin` 校验不可用，所以游戏**不要依赖 origin**。
- 游戏向父页面回消息时目标 origin 用 `'*'`（沙箱 iframe 无法用具体 origin）。
- **localStorage 陷阱**：沙箱 iframe（无 allow-same-origin）里访问 `localStorage` 会抛 `SecurityError`。游戏如需保存进度，请把状态放进 `slack:state.state`（由面板负责保存/还原），**不要用 localStorage**；非要本地存则自己实现内存回退。

**给游戏作者的安全建议**：把游戏做成自包含的（样式、脚本全部内联或同目录加载）；不要请求任何凭据敏感的资源。

## 5. 快捷键转发（Alt+M）

- 父面板注册了全局快捷键 **Alt+M**（Mac 为 Cmd+M）切换摸鱼面板。
- 但**焦点在 iframe 内时，父页面的键盘事件收不到**（浏览器安全模型）。
- 因此游戏需要在**自己的文档**里监听 Alt+M，并转发给父面板：

```js
window.addEventListener('keydown', (e) => {
  if ((e.altKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault()
    window.parent.postMessage({ type: 'slack:key', payload: { key: 'alt-m' } }, '*')
  }
})
```

只转发 `alt-m` 这一种按键即可。不转发也不影响使用（点击面板顶部再按 Alt+M 同样有效），但体验会差一点。

## 6. 生命周期速查（游戏侧伪代码）

```js
let paused = false

window.addEventListener('message', (e) => {
  const d = e.data
  if (!d || typeof d !== 'object') return
  switch (d.type) {
    case 'slack:init': {
      const restore = d.payload && d.payload.restore
      loadState(restore)          // 恢复进度
      paused = false
      startGame()
      post({ type: 'slack:ready', payload: { title: '我的游戏' } })
      postState()
      break
    }
    case 'slack:pause':
      paused = true
      stopTimers()                // 冻结
      postState()
      break
    case 'slack:resume':
      paused = false
      startTimers()
      postState()
      break
    case 'slack:destroy':
      destroy()                   // 清定时器/监听器/动画
      break
  }
})

function postState() {
  post({ type: 'slack:state', payload: { status: paused ? 'paused' : 'playing', state: serializeState() } })
}
```

## 7. 本仓库内置游戏（参考实现）

- `games/sudoku`、`games/gomoku`、`games/snake` 是本协议的**完整参考实现**：自包含单文件、支持暂停/恢复/进度 restore、Alt+M 转发。直接对照它们写你的游戏即可。

## 8. 开发调试建议

1. 本地 `python -m http.server` 或 `npx serve` 起静态服务，浏览器直接打开游戏页验证基本功能；
2. 在游戏页 console 里手动 `window.parent.postMessage({ type: 'slack:state', payload: { status: 'playing', state: {} } }, '*')` 模拟上报（无父面板时静默失败，不影响）；
3. 再到摸鱼面板"游戏库"里添加你的 manifest URL 做端到端验证；
4. 面板收到 `slack:error` 会在控制台打印，便于排查。

## 9. 协议版本

- 当前：**protocol = 1**
- 升级策略：协议变更时递增版本号；面板只接受自己支持的版本，不匹配会提示"不支持的协议版本"。
