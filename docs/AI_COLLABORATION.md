# AI 编程协作记录

本文件记录 AI 工具参与的模块、人工判断和验证方式，便于评审区分生成建议与最终工程决策。

| 模块 | AI 协作内容 | 人工决策 / 修改 | 验证 |
| --- | --- | --- | --- |
| 产品定义 | 将 Hy3 Issue #4 拆解为要求矩阵，提出“开源 Issue 贡献规划器”场景 | 选择只读公开仓库与证据优先策略，避免做泛化聊天机器人 | 对照 Issue 原文逐条检查 README |
| GitHub 证据层 | 辅助生成 URL 解析、REST 请求和错误提示初稿 | 收紧到固定 GitHub 域名与固定 API 路径，限制上下文长度 | 无效域名测试、真实 Issue 测试 |
| Hy3 编排层 | 辅助生成结构化 Prompt、JSON schema 和类型守卫 | 规定 entryPoints 只能来自真实根目录，加入未知问题列表 | 两条真实 Hy3 评测与字段检查 |
| Web 前端 | 辅助实现交互表单、进度状态、结果面板与 Markdown 导出 | 采用“证据账本”视觉方向，明确标注示例/实时结果与 BYOK 边界 | 桌面/移动布局检查、构建测试 |
| 文档与交付 | 辅助整理架构、安全、Demo 与 PR 模板 | 人工核对任务要求、API 地址、模型名和提交分支 | README 要求矩阵与演示材料 |

## CodeBuddy / WorkBuddy 复核记录

> 提交前在 CodeBuddy 或 WorkBuddy 中完成一次代码审查，并把实际结果填写到下表。不要伪造协作记录。

CodeBuddy CLI `2.128.1` 已按腾讯官方方式安装。当前设备尚未完成 CodeBuddy 首次登录，因此本仓库没有把安装动作冒充为已完成的 AI 协作。登录后运行以下命令即可生成脱敏的真实复核产物：

```powershell
codebuddy
# 在交互界面输入 /login，完成腾讯账号授权后退出
powershell -ExecutionPolicy Bypass -File scripts/run-codebuddy-review.ps1
```

| 日期 | 工具 | 审查范围 | 采纳的建议 | 未采纳及原因 |
| --- | --- | --- | --- | --- |
| 待填写 | CodeBuddy / WorkBuddy | `lib/github.ts`、`lib/hy3.ts`、`app/api/analyze/route.ts` | 待填写 | 待填写 |

建议复核提示词：

```text
请审查这个 Hy3 API Web 应用，重点检查：
1. GitHub URL 解析是否存在 SSRF；
2. API Key 是否可能写入日志、存储或前端产物；
3. Hy3 JSON 输出校验是否足够；
4. 两个端到端 Demo 是否满足 README 中的验收矩阵。
请按严重级别给出文件、位置、问题和修复建议。
```

## 人工确认清单

- [ ] CodeBuddy / WorkBuddy 的真实审查记录已填写。
- [ ] 审查发现的高危与中危问题已修复或解释。
- [ ] `npm run lint` 和 `npm test` 通过。
- [ ] 两个真实 Demo 已重新运行，结果中没有密钥。
- [ ] 演示 GIF 不超过 2 分钟。
