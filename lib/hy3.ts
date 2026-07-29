import type {
  EntryPoint,
  IssueAnalysis,
  PlanStep,
  RiskItem,
  TestItem,
} from "./types";
import type { ParsedGitHubUrl, RepositoryContext } from "./github";

type Hy3Response = {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
    message_zh?: string;
  };
};

type ModelAnalysis = Omit<
  IssueAnalysis,
  "project" | "sources" | "meta"
>;

function safeArray<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  max: number,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(guard).slice(0, max);
}

function optionalArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPlanStep(value: unknown): value is PlanStep {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    isString(item.title) &&
    isString(item.detail) &&
    isString(item.verification)
  );
}

function isEntryPoint(value: unknown): value is EntryPoint {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isString(item.path) && isString(item.why);
}

function isRisk(value: unknown): value is RiskItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    ["高", "中", "低"].includes(String(item.level)) &&
    isString(item.risk) &&
    isString(item.mitigation)
  );
}

function isTest(value: unknown): value is TestItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isString(item.scenario) && isString(item.expected);
}

export function normalizeModelOutput(value: unknown): ModelAnalysis {
  if (!isRecord(value)) {
    throw new Error("Hy3 返回的 JSON 不是对象，请重试。");
  }

  const source = value;
  const difficulty = isRecord(source.difficulty) ? source.difficulty : null;
  const hasValidShape =
    isString(source.summary) &&
    difficulty !== null &&
    ["高", "中", "低"].includes(String(difficulty.level)) &&
    isString(difficulty.rationale);

  if (!hasValidShape || !difficulty) {
    throw new Error("Hy3 返回的分析结构不完整，请重试。");
  }

  const level = String(difficulty.level) as "高" | "中" | "低";

  return {
    summary: String(source.summary).trim(),
    difficulty: {
      level,
      rationale: String(difficulty.rationale).trim(),
    },
    acceptanceCriteria: safeArray(
      optionalArray(source.acceptanceCriteria),
      isString,
      10,
    ),
    entryPoints: safeArray(optionalArray(source.entryPoints), isEntryPoint, 8),
    implementationPlan: safeArray(
      optionalArray(source.implementationPlan),
      isPlanStep,
      8,
    ),
    risks: safeArray(optionalArray(source.risks), isRisk, 8),
    questions: safeArray(optionalArray(source.questions), isString, 8),
    testPlan: safeArray(optionalArray(source.testPlan), isTest, 10),
  };
}

function tryParseJson(candidate: string): unknown | undefined {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function findFirstJsonValue(content: string): unknown | undefined {
  for (let start = 0; start < content.length; start += 1) {
    const opening = content[start];
    if (opening !== "{") continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < content.length; index += 1) {
      const character = content[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{" || character === "[") {
        stack.push(character);
      } else if (character === "}" || character === "]") {
        const expected = character === "}" ? "{" : "[";
        if (stack.pop() !== expected) break;
        if (stack.length === 0) {
          const parsed = tryParseJson(content.slice(start, index + 1));
          if (
            isRecord(parsed) &&
            ("summary" in parsed || "difficulty" in parsed)
          ) {
            return parsed;
          }
          break;
        }
      }
    }
  }
  return undefined;
}

export function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const direct = tryParseJson(trimmed);
  if (direct !== undefined) return direct;

  const fencedBlocks = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of fencedBlocks) {
    const parsed = tryParseJson(match[1].trim());
    if (parsed !== undefined) return parsed;
  }

  const embedded = findFirstJsonValue(trimmed);
  if (embedded !== undefined) return embedded;
  throw new Error("Hy3 返回的内容不是合法 JSON，请重试。");
}

function sanitizeUpstreamMessage(message: string, apiKey: string): string {
  let sanitized = message;
  if (apiKey) {
    sanitized = sanitized.split(apiKey).join("[已脱敏]");
  }
  return sanitized
    .replace(
      /\b(?:Bearer\s+)?(?:sk-|gh[pousr]_|github_pat_)[A-Za-z0-9_-]{8,}\b/gi,
      "[已脱敏]",
    )
    .replace(/authorization\s*[:=]\s*[^\s,;]+/gi, "Authorization: [已脱敏]");
}

function hy3TimeoutMs(): number {
  const configured = Number(process.env.HY3_TIMEOUT_MS);
  if (
    Number.isInteger(configured) &&
    configured >= 10_000 &&
    configured <= 180_000
  ) {
    return configured;
  }
  return 90_000;
}

function buildPrompt(
  parsed: ParsedGitHubUrl,
  context: RepositoryContext,
): string {
  const labels = context.issue.labels
    .map((label) => (typeof label === "string" ? label : label.name ?? ""))
    .filter(Boolean);
  const root = context.rootEntries
    .map((entry) => `${entry.type === "dir" ? "目录" : "文件"}: ${entry.path}`)
    .join("\n");

  return `你是 Issue-killer，一名严谨的开源贡献规划助手。请仅根据下方证据分析任务，不要虚构不存在的文件、接口或项目规则。

目标：把公开 GitHub Issue 转换成可执行、可验证的贡献计划。

强制要求：
1. 使用简体中文。
2. 只返回合法 JSON，不要 Markdown 代码围栏或额外解释。
3. 验收标准必须可以被验证；Issue 未明确的信息要写入 questions。
4. entryPoints 只能引用“仓库根目录”证据中真实出现的路径；信息不足时返回空数组。
5. implementationPlan 每一步必须给出 verification。
6. testPlan 同时覆盖正常流程、边界条件和失败路径。
7. 不要把模型生成的建议描述为维护者已经确认的事实。

返回结构：
{
  "summary": "120-220字任务摘要",
  "difficulty": {"level": "高|中|低", "rationale": "判断依据"},
  "acceptanceCriteria": ["可验证标准"],
  "entryPoints": [{"path": "真实路径", "why": "阅读原因"}],
  "implementationPlan": [
    {"title": "阶段标题", "detail": "具体动作", "verification": "完成标志"}
  ],
  "risks": [
    {"level": "高|中|低", "risk": "风险", "mitigation": "缓解措施"}
  ],
  "questions": ["需要向维护者确认的问题"],
  "testPlan": [{"scenario": "测试场景", "expected": "预期结果"}]
}

【Issue】
URL: ${parsed.canonicalUrl}
标题: ${context.issue.title}
状态: ${context.issue.state}
标签: ${labels.join("、") || "无"}
作者: ${context.issue.user?.login ?? "未知"}
评论数: ${context.issue.comments}
创建时间: ${context.issue.created_at}
更新时间: ${context.issue.updated_at}
正文:
${context.issue.body || "[无正文]"}

【仓库信息】
名称: ${parsed.owner}/${parsed.repo}
描述: ${context.repository.description || "[无描述]"}
主要语言: ${context.repository.language || "未知"}
默认分支: ${context.repository.default_branch}
主题: ${context.repository.topics?.join("、") || "无"}

【仓库根目录】
${root || "[未获取到]"}

【README】
${context.readme || "[未找到]"}

【CONTRIBUTING】
${context.contributing || "[未找到]"}`;
}

export async function analyzeWithHy3(options: {
  apiKey: string;
  parsed: ParsedGitHubUrl;
  context: RepositoryContext;
}): Promise<{
  analysis: ModelAnalysis;
  usage: Hy3Response["usage"];
}> {
  const baseUrl = (
    process.env.HY3_BASE_URL ||
    "https://tokenhub-intl.tencentcloudmaas.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.HY3_MODEL || "hy3";
  const prompt = buildPrompt(options.parsed, options.context);
  const controller = new AbortController();
  const timeoutMs = hy3TimeoutMs();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "你是严谨的开源工程分析助手。严格遵守证据边界，并输出合法 JSON。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 6_000,
        stream: false,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as Hy3Response;
    if (!response.ok) {
      const upstreamMessage =
        payload.error?.message_zh || payload.error?.message || "";
      if (response.status === 401) {
        throw new Error("Hy3 API Key 无效或与当前区域不匹配。");
      }
      if (response.status === 429) {
        throw new Error("Hy3 当前请求较多或额度受限，请稍后重试。");
      }
      throw new Error(
        upstreamMessage
          ? `Hy3 调用失败：${sanitizeUpstreamMessage(upstreamMessage, options.apiKey).slice(0, 180)}`
          : `Hy3 调用失败（${response.status}）。`,
      );
    }

    const message = payload.choices?.[0]?.message;
    const content =
      message?.content?.trim() || message?.reasoning_content?.trim() || "";
    if (!content) {
      throw new Error("Hy3 没有返回可用的分析内容。");
    }

    return {
      analysis: normalizeModelOutput(extractJson(content)),
      usage: payload.usage,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Hy3 分析超过 ${Math.round(timeoutMs / 1_000)} 秒，请稍后重试或提高 HY3_TIMEOUT_MS。`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
