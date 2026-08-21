# 第三方游戏适配清单（每款游戏过一遍）

适配一款游戏：下载 → 套 `template/wrapper.html` → 逐项打勾 → 测试 → 提交。

## A. 源评估

- [ ] 类型：回合制 / 实时制 / 模拟器（模拟器直接跳过）
- [ ] 资源：单文件 / 多文件（拷贝整个目录）/ CDN 依赖（检查可达性）
- [ ] 存储：是否用 localStorage / sessionStorage（用 → 需 shim）
- [ ] 输入：键盘 / 点击 / 拖拽（键盘游戏需用户先点进 iframe）
- [ ] 远程引用时：URL 200 且无 `X-Frame-Options` / CSP `frame-ancestors` 拦截
- [ ] 许可记录：作者、来源、可否再分发（moyu 集合作者：海拥，源码需联系）

## B. 包装（Mode A 内嵌 或 Mode B 远程 iframe）

- [ ] `manifest.json`：id / name / version / protocol:1 / entry
- [ ] localStorage shim 在游戏代码之前生效（Mode A）
- [ ] `onInit(restore)`：恢复状态；无 restore 时全新开局
- [ ] `onPause()`：回合制禁输入；实时制冻结循环（清 interval/暂停动画帧）
- [ ] `onResume()`：恢复且**无重复计时器、无状态错位**
- [ ] `onDestroy()`：清所有定时器/监听器
- [ ] `serializeState()`：最小可恢复 JSON（棋盘/分数/回合/进度）
- [ ] 关键节点调用 `postState()`（落子、得分、暂停、恢复）

## C. 沙箱与交互验证（面板内实测）

- [ ] 加载无 console 报错（无 SecurityError）
- [ ] 暂停后 3 秒状态不再推进（实时制重点）
- [ ] 继续后正常，无双倍速/跳变
- [ ] 切走再切回，进度保留（restore）
- [ ] 游戏内按 Alt+M 能收起/打开面板
- [ ] 无弹窗 / 无 top 导航 / 无凭据外传
- [ ] 面板 iframe 尺寸下可玩、控件可达

## D. 发布

- [ ] 更新 `registry.json`
- [ ] 提交并推送 `dsh-slack-games`
- [ ] （可选）GitHub Pages 托管后记录 manifest URL
- [ ] 在 README 的游戏列表登记
