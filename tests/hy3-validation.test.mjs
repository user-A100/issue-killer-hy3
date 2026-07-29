import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transformWithOxc } from "vite";

async function loadHy3Module() {
  const source = await readFile(
    new URL("../lib/hy3.ts", import.meta.url),
    "utf8",
  );
  const result = await transformWithOxc(source, "lib/hy3.ts", { lang: "ts" });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.code).toString("base64")}`
  );
}

const validAnalysis = {
  summary: "这是一个结构完整的任务摘要。",
  difficulty: { level: "高", rationale: "涉及多个接口。" },
  acceptanceCriteria: ["结果可验证"],
  entryPoints: [{ path: "app", why: "应用入口" }],
  implementationPlan: [
    { title: "实现", detail: "完成接口", verification: "测试通过" },
  ],
  risks: [{ level: "低", risk: "格式漂移", mitigation: "严格校验" }],
  questions: [],
  testPlan: [{ scenario: "正常流程", expected: "返回报告" }],
};

test("Hy3 validation preserves supported difficulty and risk levels", async () => {
  const { normalizeModelOutput } = await loadHy3Module();
  const normalized = normalizeModelOutput(validAnalysis);
  assert.equal(normalized.difficulty.level, "高");
  assert.equal(normalized.risks[0].level, "低");
});

test("Hy3 validation rejects malformed JSON and incomplete schemas", async () => {
  const { extractJson, normalizeModelOutput } = await loadHy3Module();
  assert.deepEqual(
    extractJson('说明文字 {"summary":"允许提取首个完整对象"} 尾部'),
    { summary: "允许提取首个完整对象" },
  );
  assert.throws(
    () => extractJson('说明文字 {"unrelated":"不应被采用"} 尾部'),
    /不是合法 JSON/,
  );
  assert.throws(
    () => normalizeModelOutput({ summary: "字段不完整" }),
    /结构不完整/,
  );
});

test("Hy3 validation defaults optional arrays without losing core fields", async () => {
  const { normalizeModelOutput } = await loadHy3Module();
  const normalized = normalizeModelOutput({
    summary: "核心字段完整。",
    difficulty: { level: "中", rationale: "数组可以缺省。" },
  });
  assert.deepEqual(normalized.acceptanceCriteria, []);
  assert.deepEqual(normalized.implementationPlan, []);
  assert.deepEqual(normalized.risks, []);
});
