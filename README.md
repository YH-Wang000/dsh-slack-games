# dsh-slack-games · 摸鱼模式游戏内容仓

DSH 摸鱼插件的**游戏内容仓库**：这里开发、维护所有协议化的小游戏（自包含单文件 HTML）。插件底座（[dsh-slack-mode](https://github.com/YH-Wang000/dsh-slack-mode) 或本地 `plugin/` 目录）只负责面板、监听与协议宿主，**不包含任何游戏代码**。

## 结构

```
games/<game-id>/          每款游戏一个目录
├── manifest.json         游戏清单（协议版本 1）
└── index.html            自包含游戏页（内联 CSS/JS，无外部依赖）
skills/slack-game-development/   游戏开发/适配 Skill（SKILL.md + template/）
template/                 适配器模板（在 skill 目录内）
registry.json             游戏索引
SLACK-GAME-PROTOCOL.md    协议规范（权威副本）
```

## 游戏列表

| id | 名称 | 说明 | 状态 |
|---|---|---|---|
| 2048 | 2048 | 经典合并数字（从 wanghao221/moyu 适配）| ✅ |
| rps | 石头剪刀布 | 经典猜拳，先到 10 分获胜（从 wanghao221/moyu 适配）| ✅ |
| sudoku | 数独 | 唯一解生成 + 实时冲突校验 | 待开发 |
| gomoku | 五子棋 | 人机（AI）· 双人 | 待开发 |
| snake | 贪吃蛇 | WASD/方向键 | 待开发 |

## 游戏规范（速览）

游戏 = 一个自包含静态网页，在 `sandbox="allow-scripts"` 的 iframe 中运行，只通过 postMessage 与面板通信：

- 面板 → 游戏：`slack:init`（含 `restore` 进度）/ `slack:pause` / `slack:resume` / `slack:destroy`
- 游戏 → 面板：`slack:ready` / `slack:state`（`state` 为可序列化进度，面板保存并在下次 init 时通过 `restore` 归还）
- Alt+M 转发：游戏内监听 Alt+M，以 `slack:key` 转发给父面板

完整规范见 `SLACK-GAME-PROTOCOL.md`。

## 贡献/适配

1. 新游戏放到 `games/<id>/`：`manifest.json` + 自包含 `index.html`（可用 `template/` 模板加速）；
2. 在 `registry.json` 登记；
3. 本地验证：`python -m http.server` 起静态服务，在摸鱼面板"游戏库"粘贴 manifest URL 安装测试；
4. 推送本仓库（GitHub Pages 托管后，游戏即可通过 URL 直接安装）。
