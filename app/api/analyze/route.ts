import { NextResponse } from "next/server";
import {
  GitHubFetchError,
  GitHubUrlError,
  loadRepositoryContext,
  parseGitHubIssueUrl,
} from "@/lib/github";
import { analyzeWithHy3 } from "@/lib/hy3";
import type { AnalyzeRequest, IssueAnalysis } from "@/lib/types";

export const runtime = "edge";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeErrorMessage(
  message: string,
  credentials: Array<string | undefined>,
): string {
  return credentials.reduce(
    (safeMessage, credential) =>
      credential ? safeMessage.split(credential).join("[已脱敏]") : safeMessage,
    message,
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return errorResponse("请求内容不是合法 JSON。");
  }

  if (!body.url || typeof body.url !== "string" || body.url.length > 500) {
    return errorResponse("请输入有效的 GitHub Issue URL。");
  }

  const apiKey =
    process.env.HY3_API_KEY ||
    (typeof body.apiKey === "string" ? body.apiKey.trim() : "");
  if (!apiKey) {
    return errorResponse(
      "此部署未配置共享密钥，请在页面中填写自己的 Hy3 API Key。",
      401,
    );
  }
  if (apiKey.length < 20 || apiKey.length > 300) {
    return errorResponse("Hy3 API Key 格式不正确。", 401);
  }

  const githubToken =
    typeof body.githubToken === "string" ? body.githubToken.trim() : "";
  if (githubToken && (githubToken.length < 20 || githubToken.length > 300)) {
    return errorResponse("GitHub Token 格式不正确。", 401);
  }

  try {
    const parsed = parseGitHubIssueUrl(body.url);
    const context = await loadRepositoryContext(parsed, {
      githubToken: githubToken || undefined,
    });
    const { analysis, usage } = await analyzeWithHy3({
      apiKey,
      parsed,
      context,
    });

    const labels = context.issue.labels
      .map((label) => (typeof label === "string" ? label : label.name ?? ""))
      .filter(Boolean);
    const result: IssueAnalysis = {
      project: {
        owner: parsed.owner,
        repo: parsed.repo,
        number: parsed.number,
        title: context.issue.title,
        state: context.issue.state,
        labels,
        url: context.issue.html_url,
      },
      ...analysis,
      sources: context.sources,
      meta: {
        model: process.env.HY3_MODEL || "hy3",
        elapsedMs: Date.now() - startedAt,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "分析失败，请稍后重试。";
    const message = sanitizeErrorMessage(rawMessage, [apiKey, githubToken]);
    const status =
      error instanceof GitHubUrlError
        ? 400
        : error instanceof GitHubFetchError && error.statusCode === 404
        ? 404
        : /API Key/.test(message)
          ? 401
          : 502;
    return errorResponse(message, status);
  }
}
