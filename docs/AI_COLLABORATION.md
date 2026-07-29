# AI 编程协作记录

本文件记录 AI 工具参与的模块、人工判断和验证方式，便于评审区分生成建议与最终工程决策。

## 工具角色边界

- OpenAI Codex 参与了初始原型、界面实现和工程整理。
- Tencent CodeBuddy CLI（Hy3）完成关键服务端代码复核，提出的 high/medium 问题均已修复并重新审查。
- 应用运行时唯一的生成式模型是 Tencent Hunyuan Hy3；Codex 不参与用户请求分析，也不进入部署运行链路。

| 模块 | AI 协作内容 | 人工决策 / 修改 | 验证 |
| --- | --- | --- | --- |
| 产品定义 | 将 Hy3 Issue #4 拆解为要求矩阵，提出“开源 Issue 贡献规划器”场景 | 选择只读公开仓库与证据优先策略，避免做泛化聊天机器人 | 对照 Issue 原文逐条检查 README |
| GitHub 证据层 | 辅助生成 URL 解析、REST 请求和错误提示初稿 | 收紧到固定 GitHub 域名与固定 API 路径，限制上下文长度 | 无效域名测试、真实 Issue 测试 |
| Hy3 编排层 | 辅助生成结构化 Prompt、JSON schema 和类型守卫 | 规定 entryPoints 只能来自真实根目录，加入未知问题列表 | 两条真实 Hy3 评测与字段检查 |
| Web 前端 | 辅助实现交互表单、进度状态、结果面板与 Markdown 导出 | 采用“证据账本”视觉方向，明确标注示例/实时结果与 BYOK 边界 | 桌面/移动布局检查、构建测试 |
| 文档与交付 | 辅助整理架构、安全、Demo 与 PR 模板 | 人工核对任务要求、API 地址、模型名和提交分支 | README 要求矩阵与演示材料 |

## CodeBuddy / WorkBuddy 复核记录

CodeBuddy CLI `2.128.1` 已通过腾讯账号登录并完成真实代码复核。CLI 会话报告使用模型为 `Hy3`；最终脱敏结果保存在 [`codebuddy-review.json`](codebuddy-review.json)，只包含结论和发现，不包含源码、请求记录或密钥。

复核可通过以下命令重复执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-codebuddy-review.ps1
```

| 日期 | 工具 | 审查范围 | 采纳的建议 | 未采纳及原因 |
| --- | --- | --- | --- | --- |
| 2026-07-29 | CodeBuddy CLI `2.128.1`（Hy3） | `lib/github.ts`、`lib/hy3.ts`、`app/api/analyze/route.ts` | 收紧 GitHub URL 与路径段校验；区分输入、404 与上游错误；加入严格且可降级的 JSON schema 校验；把 Hy3 超时收敛到 30 秒；统一对外错误脱敏；增加格式、边界和回归测试 | 最终报告剩余 6 项均为 low：限流状态细分、额外密钥正则、超长非标准密钥、极端超长模型输出、非标准 GitHub 端口和更大的生成上限。当前固定 API 域名、精确密钥替换、20–300 字符官方密钥范围、6000 token 上限及结构化错误已覆盖两条真实流程，因此保留为后续增强，不阻塞提交 |

最终复核结论：

- `verdict`: `pass`
- high / medium：0
- low：6，均已记录原因和后续增强方向
- 复核产物：[`docs/codebuddy-review.json`](codebuddy-review.json)

## 人工确认清单

- [x] CodeBuddy / WorkBuddy 的真实审查记录已填写。
- [x] 审查发现的高危与中危问题已修复并重新复核。
- [x] `npm run lint` 和 `npm test` 通过。
- [x] 两个真实 Demo 已重新运行，结果中没有密钥。
- [x] 演示 GIF 约 18 秒，不超过 2 分钟。
