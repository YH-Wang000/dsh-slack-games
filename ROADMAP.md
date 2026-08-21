# ROADMAP · 摸鱼模式项目路线图

## 项目结构（两个仓库）

| 仓库 | 职责 | 状态 |
|---|---|---|
| **dsh-slack-mode**（底座） | 面板、会话监听、协议宿主、游戏库、持久化。零游戏代码 | ✅ v1.0 基线 |
| **dsh-slack-games**（内容仓，本仓库） | 游戏开发/适配、协议文档、Skill、wrapper 模板 | ✅ 起步，内容扩展中 |

## 当前阶段：v1.0 基线（已完成）

- [x] 核心机制：顶层会话 `running→idle` 自动切回 + 完成摘要卡片 + 状态条 + 老板来了 + Alt+M
- [x] 游戏协议 v1：iframe 沙箱 + postMessage + restore 进度
- [x] 转正：正式插件（全会话生效、网络直连、可分发）
- [x] 底座稳定壳化：伺服内容仓 + 预注册 + localStorage 持久化 + 移除记忆
- [x] 游戏开发/适配 Skill（`skills/slack-game-development`）+ wrapper 模板 + 适配清单
- [x] 适配样板：moyu 2048（走完整套 skill 流程）
- [ ] 内容仓推送到 GitHub（需要用户凭据）

## 后期（按用户定义：大规模游戏适配）

### 目标
把 `wanghao221/moyu`（2000 款小游戏）等第三方内容源**批量**接入协议，沉淀可复用的适配流水线。

### 规划
1. **适配流水线**（半自动）：
   - `tools/` 脚本：`fetch-game`（拉源游戏目录）→ `wrap`（套模板生成 wrapper + manifest）→ `validate`（沙箱/协议静态校验）；
   - 优先回合制（低成本），实时制按需；
   - 每款游戏过 `adapt-checklist`（A 源评估 / B 包装 / C 沙箱验证 / D 发布）。
2. **游戏源管理**：以 `registry.json` 为索引，支持按"来源/分类/质量"标记。
3. **托管**：GitHub Pages 托管内容仓 → 所有游戏可通过 URL 安装；也可选装进本地 `~/.dsh/slack-games`。

### 适配期底座可能的增量
- 协议/宿主边界小修（如 iframe 尺寸适配、个别沙箱兼容）——预期小补丁，不重构。

## 后续（分发与治理）

- [ ] 底座发布：npm publish + awesome-dsh-plugin 注册（需要 GitHub 账号操作）
- [ ] 内容仓开源治理：贡献指南（Skill 已有）、游戏质量门槛
- [ ] 底座自动化测试（协议宿主 + 持久化）
