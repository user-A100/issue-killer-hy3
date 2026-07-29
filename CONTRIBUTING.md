# Contributing

感谢你改进 IssuePilot。

## 开始前

1. 使用 Node.js `>=22.13.0`。
2. 复制 `.env.example` 为 `.env.local`，不要提交真实密钥。
3. 新功能应保持“证据优先”：模型不能引用未由 GitHub API 返回的文件路径或项目规则。

## 提交前检查

```bash
npm run lint
npm test
```

如修改 Prompt 或模型输出结构，请同时：

- 更新 `evals/cases.json` 中相应检查项；
- 用真实 Hy3 API 运行 `npm run eval`；
- 检查 `evals/results/` 不含 API Key、请求头或其他凭据；
- 在 Pull Request 中说明两个 Demo 是否仍通过。

## 安全问题

请不要在公开 Issue 中粘贴 API Key。若发现密钥泄漏、SSRF 或响应中包含敏感数据，请先私下联系项目维护者并立即撤销相关凭据。
