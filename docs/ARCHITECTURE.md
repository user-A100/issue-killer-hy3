# IssuePilot 架构与信任边界

## 目标

IssuePilot 的目标不是替代开发者做技术决策，而是把 Issue 中散落的要求变成一份带来源、可验证的开工清单。系统设计优先级为：

1. 证据可追溯；
2. 模型输出不越过已读取上下文；
3. 密钥不会被持久化；
4. 失败模式清晰可操作。

## 数据流

1. 浏览器向 `/api/analyze` 发送 GitHub URL，并可选附带 Hy3 API Key。
2. 服务端只接受 `github.com` 的 HTTPS Issue/PR URL，并从路径片段构造 GitHub API 地址。
3. 应用并行读取 Issue、仓库元信息、README 和根目录，再按候选路径读取 CONTRIBUTING。
4. 应用将这些证据写入约束 Prompt，要求 Hy3 只返回 JSON。
5. 服务端对 Hy3 输出做 JSON 提取、类型守卫、字段数量限制和默认值处理。
6. 浏览器渲染报告，并可导出 Markdown。

## Hy3 的职责

Hy3 负责：

- 任务摘要与难度判断；
- 从 Issue 中归纳可验证的验收标准；
- 解释真实根目录路径可能的阅读价值；
- 生成带验证动作的实施步骤；
- 识别风险、问题和测试场景。

Hy3 不负责：

- 直接联网或读取 GitHub；
- 执行生成的代码；
- 判断维护者未写明的规则；
- 保存用户数据或 API Key。

## 安全控制

### SSRF

`parseGitHubIssueUrl` 要求：

- 协议必须是 HTTPS；
- 主机必须是 `github.com` 或 `www.github.com`；
- 路径必须含 `issues` 或 `pull` 以及正整数编号；
- owner/repo 只允许 GitHub 名称中的安全字符。

后续请求不使用用户提供的完整 URL，而是从校验后的 owner、repo、number 构造固定 `api.github.com` 路径。

### 密钥

- BYOK 密钥只存在于输入框状态、当前 HTTPS 请求体和上游 Authorization Header。
- 前端不调用 localStorage、sessionStorage、cookie 或 IndexedDB。
- 服务端不记录请求体，返回值不包含 Key。
- `.env*` 默认被 Git 忽略，只有无密钥的 `.env.example` 被纳入版本控制。

### 模型输出

- Prompt 明确要求代码入口只能引用真实根目录路径。
- 所有数组都经过类型守卫，并限制最大项目数。
- 模型返回非 JSON 时只保留摘要降级，不执行其中任何内容。
- 渲染使用 React 文本节点，不使用 `dangerouslySetInnerHTML`。

## 可用性边界

- GitHub 公共 API 限流会返回清晰错误；生产环境可配置只读 `GITHUB_TOKEN`。
- Hy3 调用超时为 90 秒，GitHub 单请求超时为 12 秒。
- 页面包含示例报告，便于没有 Key 时理解输出；示例明确标注，不计入真实评测。
