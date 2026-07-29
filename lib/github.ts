import type { SourceRecord } from "./types";

export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  number: number;
  kind: "issues" | "pull";
  canonicalUrl: string;
};

type GitHubIssue = {
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  labels: Array<string | { name?: string }>;
  user?: { login?: string };
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

type GitHubRepo = {
  description: string | null;
  default_branch: string;
  language: string | null;
  topics?: string[];
  html_url: string;
};

type GitHubContent = {
  content?: string;
  encoding?: string;
  html_url?: string;
};

type RootEntry = {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  html_url?: string;
};

export type RepositoryContext = {
  issue: GitHubIssue;
  repository: GitHubRepo;
  readme: string;
  contributing: string;
  rootEntries: RootEntry[];
  sources: SourceRecord[];
};

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const MAX_GITHUB_NUMBER = 2_147_483_647;

export class GitHubFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "GitHubFetchError";
  }
}

export class GitHubUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubUrlError";
  }
}

export function parseGitHubIssueUrl(value: string): ParsedGitHubUrl {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new GitHubUrlError("请输入完整的 GitHub Issue URL。");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (
    url.protocol !== "https:" ||
    !GITHUB_HOSTS.has(hostname) ||
    url.username ||
    url.password
  ) {
    throw new GitHubUrlError(
      "目前仅支持 github.com 上的公开 Issue 或 Pull Request。",
    );
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || !["issues", "pull"].includes(parts[2])) {
    throw new GitHubUrlError(
      "URL 格式应为 github.com/owner/repo/issues/123。",
    );
  }

  const number = Number(parts[3]);
  if (
    !Number.isInteger(number) ||
    number <= 0 ||
    number > MAX_GITHUB_NUMBER
  ) {
    throw new GitHubUrlError("Issue 编号无效。");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (
    !/^[A-Za-z0-9_.-]+$/.test(owner) ||
    !/^[A-Za-z0-9_.-]+$/.test(repo) ||
    /^\.+$/.test(owner) ||
    /^\.+$/.test(repo)
  ) {
    throw new GitHubUrlError("仓库地址包含不支持的字符。");
  }

  const kind = parts[2] as "issues" | "pull";
  return {
    owner,
    repo,
    number,
    kind,
    canonicalUrl: `https://github.com/${owner}/${repo}/${kind}/${number}`,
  };
}
function githubHeaders(githubToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Issue-Killer-Hy3",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = githubToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch<T>(
  path: string,
  optional = false,
  githubToken?: string,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: githubHeaders(githubToken),
      signal: controller.signal,
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new GitHubFetchError(
          "GitHub 公共接口暂时达到访问上限，请稍后重试。",
          response.status,
        );
      }
      if (response.status === 404) {
        throw new GitHubFetchError(
          "没有找到该公开 Issue，或仓库暂时不可访问。",
          404,
        );
      }
      throw new GitHubFetchError(
        `读取 GitHub 失败（${response.status}）。`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("读取 GitHub 超时，请稍后重试。");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function decodeContent(content: GitHubContent | null): string {
  if (!content?.content || content.encoding !== "base64") return "";
  try {
    const compact = content.content.replace(/\s/g, "");
    const bytes = Uint8Array.from(atob(compact), (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function clamp(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[内容已截断]`;
}

export async function loadRepositoryContext(
  parsed: ParsedGitHubUrl,
  options: { githubToken?: string } = {},
): Promise<RepositoryContext> {
  const issuePath = `/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
  const repoPath = `/repos/${parsed.owner}/${parsed.repo}`;

  const [issue, repository, readmeResponse, rootResponse] = await Promise.all([
    githubFetch<GitHubIssue>(issuePath, false, options.githubToken),
    githubFetch<GitHubRepo>(repoPath, false, options.githubToken),
    githubFetch<GitHubContent>(
      `/repos/${parsed.owner}/${parsed.repo}/readme`,
      true,
      options.githubToken,
    ),
    githubFetch<RootEntry[]>(
      `/repos/${parsed.owner}/${parsed.repo}/contents`,
      true,
      options.githubToken,
    ),
  ]);

  if (!issue || !repository) {
    throw new Error("无法读取 Issue 的完整上下文。");
  }

  const contributingCandidates = [
    "/CONTRIBUTING.md",
    "/.github/CONTRIBUTING.md",
    "/docs/CONTRIBUTING.md",
  ];
  let contributingResponse: GitHubContent | null = null;
  for (const candidate of contributingCandidates) {
    contributingResponse = await githubFetch<GitHubContent>(
      `/repos/${parsed.owner}/${parsed.repo}/contents${candidate}`,
      true,
      options.githubToken,
    );
    if (contributingResponse) break;
  }

  const readme = clamp(decodeContent(readmeResponse), 14_000);
  const contributing = clamp(decodeContent(contributingResponse), 8_000);
  const rootEntries = (rootResponse ?? []).slice(0, 80);

  const sources: SourceRecord[] = [
    {
      label: `${parsed.owner}/${parsed.repo} #${parsed.number}`,
      url: issue.html_url,
      kind: "issue",
    },
    {
      label: `${parsed.owner}/${parsed.repo} 仓库`,
      url: repository.html_url,
      kind: "repository",
    },
  ];

  if (readmeResponse?.html_url) {
    sources.push({
      label: "README",
      url: readmeResponse.html_url,
      kind: "readme",
    });
  }
  if (contributingResponse?.html_url) {
    sources.push({
      label: "CONTRIBUTING",
      url: contributingResponse.html_url,
      kind: "contributing",
    });
  }

  return {
    issue,
    repository,
    readme,
    contributing,
    rootEntries,
    sources,
  };
}
