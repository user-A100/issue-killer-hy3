# 两个端到端 Demo

演示目标时长约 20–35 秒，最长不得超过 2 分钟。

## 录制前

1. 启动应用并打开首页。
2. 准备可用的 Hy3 API Key；输入时保持密码隐藏状态。
3. 确认页面显示“示例报告”标识，说明尚未运行实时分析。

## Flow 01：产品型 Issue

1. 点击“Demo 01 · Hy3 端到端应用”。
2. 确认输入框为 `https://github.com/Tencent-Hunyuan/Hy3/issues/4`。
3. 输入 Key，点击“生成贡献计划”。
4. 快速展示四阶段进度：FETCH → GROUND → PLAN → VERIFY。
5. 展示实时报告中的验收标准、实施计划和证据来源。

## Flow 02：工程型 Issue

1. 点击“Demo 02 · VulnGym 功能 Issue”。
2. 确认输入框为 `https://github.com/Tencent/VulnGym/issues/5`。
3. 再次生成。
4. 展示报告对整数/区间行号、跨文件调用链、保守/修复模式和日志字段的覆盖。
5. 点击“下载报告”，展示结果可被直接用于开工记录。

## 隐私检查

- GIF 中 API Key 始终显示为圆点。
- 浏览器地址栏、终端与配置文件中不出现 Key。
- 只展示公开 GitHub 内容和脱敏后的 Hy3 输出。

生成后的 GIF 放在 `docs/demo/issuepilot-demo.gif`，并在 README 首屏引用。
