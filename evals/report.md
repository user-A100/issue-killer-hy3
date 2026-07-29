# Issue-killer 真实 Hy3 评测报告

生成时间：2026-07-29T07:29:18.134Z

> 两个案例均通过 Issue-killer 的公开 HTTP 接口完成 GitHub 证据抓取、Hy3 API 分析、结构校验和结果落盘。API Key 未写入产物。

| 案例 | 结果 | 模型 | API 耗时 | 证据来源 |
| --- | --- | --- | ---: | ---: |
| Hy3 端到端应用任务 | PASS | hy3 | 18.9s | 3 |
| VulnGym trace 清理任务 | PASS | hy3 | 22.4s | 3 |

## 字段与关键概念检查

### Hy3 端到端应用任务 — PASS

- ✅ 项目标题：应包含 Hy3
- ✅ acceptanceCriteria 数量：6 / 最少 4
- ✅ implementationPlan 数量：5 / 最少 3
- ✅ risks 数量：2 / 最少 1
- ✅ testPlan 数量：4 / 最少 3
- ✅ sources 数量：3 / 最少 2
- ✅ 关键概念覆盖：API、前端、GIF、开源
- ✅ 证据内入口：2 个入口

### VulnGym trace 清理任务 — PASS

- ✅ 项目标题：应包含 VulnGym
- ✅ acceptanceCriteria 数量：6 / 最少 4
- ✅ implementationPlan 数量：4 / 最少 3
- ✅ risks 数量：3 / 最少 1
- ✅ testPlan 数量：5 / 最少 3
- ✅ sources 数量：3 / 最少 2
- ✅ 关键概念覆盖：trace、跨文件、区间、保守、日志
- ✅ 证据内入口：3 个入口

## 评测边界

这些规则检查结构完整性与关键概念覆盖，不把模型建议当作维护者确认的事实。提交代码前仍需人工阅读原 Issue、CONTRIBUTING 和仓库实现。
