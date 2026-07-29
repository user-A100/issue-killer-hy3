# 向 Hy3 `rhinobird2026` 分支提交

独立应用仓库完成并公开后，在 Hy3 仓库的活动分支创建一个只包含项目说明与链接的 Pull Request。

## 建议文件

在 fork 的 `rhinobird2026` 分支新增：

```text
rhinobird2026/issuepilot/README.md
```

内容包含项目名称、仓库地址、在线演示、Demo GIF、作者、Hy3 的角色和 Issue #4 链接。

## PR 标题

```text
[RhinoBird 2026] IssuePilot — Hy3-powered GitHub contribution planner
```

## PR 描述

```markdown
## 项目

IssuePilot：把公开 GitHub Issue 转换为有证据、可验证的贡献计划。

- 项目仓库：<公开 GitHub 仓库 URL>
- 在线演示：<部署 URL>
- 演示 GIF：<仓库中的 GIF URL>
- 对应任务：#4

## Hy3 的角色

Hy3 通过 Chat Completions API 将 Issue、README、CONTRIBUTING 和真实仓库目录转换为结构化的摘要、验收标准、代码入口、实施步骤、风险、澄清问题与测试计划。项目不进行训练、微调或本地推理。

## 两个端到端 Demo

1. Tencent-Hunyuan/Hy3 #4：产品型开放任务。
2. Tencent/VulnGym #5：工程型数据清理任务。

真实输出、评测规则和 ≤2 分钟 GIF 均已包含在项目仓库。

## 验证

- `npm run lint`
- `npm test`
- `npm run eval`

## AI 编程协作

协作模块、人工判断与 CodeBuddy / WorkBuddy 复核记录见项目仓库 `docs/AI_COLLABORATION.md`。
```

## 提交前

- 确认目标分支是 `rhinobird2026`，不是 `main`。
- 用真实公开仓库 URL 替换所有尖括号占位符。
- 确认独立仓库为 Public。
- 在 PR 中直接显示或链接不超过 2 分钟的 GIF。
- 不要提交 `.env.local`、API Key 或包含 Authorization Header 的日志。
