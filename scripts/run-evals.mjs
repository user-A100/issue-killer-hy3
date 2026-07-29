import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const cases = JSON.parse(
  await readFile(new URL("evals/cases.json", root), "utf8"),
);
const baseUrl = (process.env.ISSUEPILOT_BASE_URL || "http://localhost:3000")
  .replace(/\/+$/, "");
const apiKey = process.env.HY3_API_KEY;

if (!apiKey) {
  throw new Error("请先通过环境变量 HY3_API_KEY 提供密钥；脚本不会保存它。");
}

function allText(result) {
  return JSON.stringify({
    summary: result.summary,
    acceptanceCriteria: result.acceptanceCriteria,
    implementationPlan: result.implementationPlan,
    risks: result.risks,
    questions: result.questions,
    testPlan: result.testPlan,
  });
}

function checkCase(testCase, result) {
  const checks = [];
  checks.push({
    name: "项目标题",
    pass: result.project?.title?.includes(testCase.expectedTitleIncludes),
    detail: `应包含 ${testCase.expectedTitleIncludes}`,
  });

  for (const [field, minimum] of Object.entries(testCase.minimums)) {
    const actual = Array.isArray(result[field]) ? result[field].length : 0;
    checks.push({
      name: `${field} 数量`,
      pass: actual >= minimum,
      detail: `${actual} / 最少 ${minimum}`,
    });
  }

  const text = allText(result);
  const mentions = testCase.mustMentionAny.filter((term) => text.includes(term));
  checks.push({
    name: "关键概念覆盖",
    pass: mentions.length >= Math.min(3, testCase.mustMentionAny.length),
    detail: mentions.length ? mentions.join("、") : "无",
  });

  checks.push({
    name: "证据内入口",
    pass: Array.isArray(result.entryPoints),
    detail: `${result.entryPoints?.length ?? 0} 个入口`,
  });

  return checks;
}

await mkdir(new URL("evals/results/", root), { recursive: true });
const reportRows = [];

for (const testCase of cases) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: testCase.url, apiKey }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${testCase.name} 失败：${result.error || response.status}`);
  }

  const checks = checkCase(testCase, result);
  const passed = checks.every((check) => check.pass);
  const artifact = {
    case: {
      id: testCase.id,
      name: testCase.name,
      url: testCase.url,
    },
    verdict: passed ? "PASS" : "FAIL",
    checks,
    result,
    evaluatedAt: new Date().toISOString(),
    wallTimeMs: Date.now() - startedAt,
  };
  await writeFile(
    new URL(`evals/results/${testCase.id}.json`, root),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  reportRows.push({ testCase, passed, checks, result });
}

const generatedAt = new Date().toISOString();
const table = reportRows
  .map(
    ({ testCase, passed, result }) =>
      `| ${testCase.name} | ${passed ? "PASS" : "FAIL"} | ${result.meta.model} | ${(result.meta.elapsedMs / 1000).toFixed(1)}s | ${result.sources.length} |`,
  )
  .join("\n");
const detail = reportRows
  .map(
    ({ testCase, passed, checks }) => `### ${testCase.name} — ${passed ? "PASS" : "FAIL"}

${checks.map((check) => `- ${check.pass ? "✅" : "❌"} ${check.name}：${check.detail}`).join("\n")}`,
  )
  .join("\n\n");

const report = `# IssuePilot 真实 Hy3 评测报告

生成时间：${generatedAt}

> 两个案例均通过 IssuePilot 的公开 HTTP 接口完成 GitHub 证据抓取、Hy3 API 分析、结构校验和结果落盘。API Key 未写入产物。

| 案例 | 结果 | 模型 | API 耗时 | 证据来源 |
| --- | --- | --- | ---: | ---: |
${table}

## 字段与关键概念检查

${detail}

## 评测边界

这些规则检查结构完整性与关键概念覆盖，不把模型建议当作维护者确认的事实。提交代码前仍需人工阅读原 Issue、CONTRIBUTING 和仓库实现。
`;

await writeFile(new URL("evals/report.md", root), report, "utf8");
const failed = reportRows.filter((row) => !row.passed);
process.stdout.write(
  `完成 ${reportRows.length} 个真实 Hy3 流程：${reportRows.length - failed.length} PASS，${failed.length} FAIL。\n`,
);
if (failed.length) process.exitCode = 1;
