"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { IssueAnalysis } from "@/lib/types";

const DEMOS = [
  {
    id: "hy3",
    eyebrow: "DEMO 01 · 产品型任务",
    title: "Hy3 端到端应用",
    repo: "Tencent-Hunyuan / Hy3",
    url: "https://github.com/Tencent-Hunyuan/Hy3/issues/4",
    accent: "cyan",
  },
  {
    id: "vulngym",
    eyebrow: "DEMO 02 · 工程型任务",
    title: "VulnGym 功能 Issue",
    repo: "Tencent / VulnGym",
    url: "https://github.com/Tencent/VulnGym/issues/5",
    accent: "amber",
  },
] as const;

const SAMPLE_ANALYSIS: IssueAnalysis = {
  project: {
    owner: "Tencent-Hunyuan",
    repo: "Hy3",
    number: 4,
    title: "Build a vibe-coded application powered by Hy3",
    state: "open",
    labels: ["犀牛鸟-中高难度", "腾讯犀牛鸟开源专属"],
    url: "https://github.com/Tencent-Hunyuan/Hy3/issues/4",
  },
  summary:
    "这是一个独立应用交付任务：使用 CodeBuddy 或 WorkBuddy 协作开发，并仅通过 Hy3 API 提供核心智能能力。最终产物需要有可交互入口、两个完整演示流程、两分钟以内的演示视频或 GIF，以及说明 Hy3 角色与协作过程的开源文档。",
  difficulty: {
    level: "中",
    rationale:
      "选题自由，但交付链较完整；主要难点在于把模型能力、真实上下文、交互体验与可复现评测组合成一个可审查的开源项目。",
  },
  acceptanceCriteria: [
    "应用的核心分析由 Hy3 API 完成，不包含训练、微调或本地模型推理。",
    "提供至少一个可实际操作的 Web、CLI 或 IDE 交互入口。",
    "记录两个从输入到结果的完整流程，并提供不超过两分钟的 GIF 或视频。",
    "代码公开，README 明确说明 Hy3 在架构中的职责。",
  ],
  entryPoints: [
    {
      path: "README.md",
      why: "确认模型接入方式、使用限制和仓库约定。",
    },
    {
      path: "cookbook",
      why: "寻找官方 API 示例和可复用的调用模式。",
    },
  ],
  implementationPlan: [
    {
      title: "定义场景与证据边界",
      detail:
        "选择一个真实、可重复的开源贡献场景，规定模型只能基于 Issue、README 与仓库目录生成建议。",
      verification: "输入与输出都有可追溯来源，未知信息被明确标记。",
    },
    {
      title: "打通 API 与交互入口",
      detail:
        "实现 GitHub 上下文抓取、Hy3 结构化分析和浏览器端结果展示，密钥只在单次请求中使用。",
      verification: "健康检查、错误提示与一次真实分析均可通过。",
    },
    {
      title: "固化评测与交付",
      detail:
        "运行两个差异化 Issue，检查结果完整性，生成演示材料、README 和 PR 提交说明。",
      verification: "评测报告、演示 GIF、开源文档和构建测试全部存在。",
    },
  ],
  risks: [
    {
      level: "高",
      risk: "模型可能根据常见项目结构猜测不存在的文件。",
      mitigation: "只允许 entryPoints 使用 GitHub API 返回的真实根目录路径。",
    },
    {
      level: "中",
      risk: "公开 GitHub API 受未认证访问频率限制。",
      mitigation: "返回清晰限流提示，并允许部署时配置可选 GITHUB_TOKEN。",
    },
  ],
  questions: [
    "独立应用是否只需在 Hy3 的 rhinobird2026 分支提交链接型 PR？",
    "评审是否要求 CodeBuddy 或 WorkBuddy 的完整会话截图？",
  ],
  testPlan: [
    {
      scenario: "输入合法的公开 GitHub Issue 地址",
      expected: "返回摘要、验收标准、实施步骤、风险和测试计划。",
    },
    {
      scenario: "输入非 GitHub 域名或无效 Issue 地址",
      expected: "请求在访问外部资源前被拒绝，并给出中文提示。",
    },
    {
      scenario: "使用错误或失效的 Hy3 API Key",
      expected: "不泄露上游响应和密钥，页面显示可操作的认证错误。",
    },
  ],
  sources: [
    {
      label: "Tencent-Hunyuan/Hy3 #4",
      url: "https://github.com/Tencent-Hunyuan/Hy3/issues/4",
      kind: "issue",
    },
    {
      label: "Tencent-Hunyuan/Hy3 仓库",
      url: "https://github.com/Tencent-Hunyuan/Hy3",
      kind: "repository",
    },
    {
      label: "README",
      url: "https://github.com/Tencent-Hunyuan/Hy3/blob/main/README.md",
      kind: "readme",
    },
  ],
  meta: {
    model: "hy3",
    elapsedMs: 0,
    generatedAt: "2026-07-29T00:00:00.000Z",
    sample: true,
  },
};

const STAGES = [
  { short: "FETCH", label: "读取 Issue 与仓库证据" },
  { short: "GROUND", label: "建立可追溯上下文" },
  { short: "PLAN", label: "Hy3 生成结构化计划" },
  { short: "VERIFY", label: "校验文件与输出边界" },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8a9.4 9.4 0 0 0-3 18.3c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1 1.6 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.7-1.3-2.3-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v2.7c0 .4.2.6.7.5A9.4 9.4 0 0 0 12 2.8Z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c.8 5.6 3.3 8.1 8.9 8.9-5.6.8-8.1 3.3-8.9 8.9-.8-5.6-3.3-8.1-8.9-8.9 5.6-.8 8.1-3.3 8.9-8.9Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4 10 3.6 3.6L16 5.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3v9m0 0 4-4m-4 4L6 8M4 15.5h12" />
    </svg>
  );
}

function toMarkdown(result: IssueAnalysis): string {
  const criteria = result.acceptanceCriteria.map((item) => `- ${item}`).join("\n");
  const entries = result.entryPoints
    .map((item) => `- \`${item.path}\` — ${item.why}`)
    .join("\n");
  const steps = result.implementationPlan
    .map(
      (item, index) =>
        `${index + 1}. **${item.title}**\n   - 动作：${item.detail}\n   - 验证：${item.verification}`,
    )
    .join("\n");
  const risks = result.risks
    .map((item) => `- **${item.level}** ${item.risk}\n  - 缓解：${item.mitigation}`)
    .join("\n");
  const questions = result.questions.map((item) => `- ${item}`).join("\n");
  const tests = result.testPlan
    .map((item) => `- ${item.scenario}\n  - 预期：${item.expected}`)
    .join("\n");
  const sources = result.sources
    .map((item) => `- [${item.label}](${item.url})`)
    .join("\n");

  return `# ${result.project.owner}/${result.project.repo} #${result.project.number} 贡献计划

> 由 Issue-killer + ${result.meta.model} 生成于 ${result.meta.generatedAt}

## Issue

[${result.project.title}](${result.project.url})

## 任务摘要

${result.summary}

## 难度

**${result.difficulty.level}** — ${result.difficulty.rationale}

## 验收标准

${criteria || "- 待维护者补充"}

## 建议入口

${entries || "- 当前证据不足，未推荐路径"}

## 实施计划

${steps || "- 当前证据不足，需先澄清需求"}

## 风险

${risks || "- 暂无"}

## 待确认问题

${questions || "- 暂无"}

## 测试计划

${tests || "- 暂无"}

## 证据来源

${sources}
`;
}

function Report({ result }: { result: IssueAnalysis }) {
  const [copied, setCopied] = useState(false);

  const copyReport = async () => {
    await navigator.clipboard.writeText(toMarkdown(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadReport = () => {
    const blob = new Blob([toMarkdown(result)], {
      type: "text/markdown;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${result.project.repo}-${result.project.number}-plan.md`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <section className="report" id="report" aria-labelledby="report-heading">
      <div className="report-masthead">
        <div>
          <div className="report-kicker">
            {result.meta.sample ? "SAMPLE REPORT" : "LIVE HY3 REPORT"}
          </div>
          <h2 id="report-heading">{result.project.title}</h2>
          <a
            className="issue-link"
            href={result.project.url}
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon />
            {result.project.owner}/{result.project.repo} #{result.project.number}
          </a>
        </div>
        <div className="report-actions">
          <button className="quiet-button" type="button" onClick={copyReport}>
            {copied ? <CheckIcon /> : <span aria-hidden="true">⌘</span>}
            {copied ? "已复制" : "复制 Markdown"}
          </button>
          <button className="quiet-button" type="button" onClick={downloadReport}>
            <DownloadIcon />
            下载报告
          </button>
        </div>
      </div>

      {result.meta.sample && (
        <div className="sample-notice">
          这是用于预览界面的示例报告，不计入真实 Demo。填写 API Key 后可生成实时结果。
        </div>
      )}

      <div className="report-meta">
        <span>
          <b>难度</b>
          <i className={`difficulty difficulty-${result.difficulty.level}`}>
            {result.difficulty.level}
          </i>
        </span>
        <span>
          <b>模型</b>
          <i>{result.meta.model}</i>
        </span>
        <span>
          <b>耗时</b>
          <i>
            {result.meta.sample
              ? "示例"
              : `${(result.meta.elapsedMs / 1000).toFixed(1)}s`}
          </i>
        </span>
        <span>
          <b>证据</b>
          <i>{result.sources.length} 个来源</i>
        </span>
      </div>

      <div className="report-grid">
        <article className="report-panel report-summary">
          <div className="section-number">01</div>
          <div>
            <h3>任务摘要</h3>
            <p>{result.summary}</p>
            <div className="difficulty-note">
              <strong>难度判断</strong>
              <span>{result.difficulty.rationale}</span>
            </div>
          </div>
        </article>

        <article className="report-panel">
          <div className="section-number">02</div>
          <div>
            <h3>可验证的验收标准</h3>
            <ul className="check-list">
              {result.acceptanceCriteria.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="report-panel">
          <div className="section-number">03</div>
          <div>
            <h3>证据内的代码入口</h3>
            {result.entryPoints.length ? (
              <div className="entry-list">
                {result.entryPoints.map((item) => (
                  <div className="entry-item" key={item.path}>
                    <code>{item.path}</code>
                    <p>{item.why}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">当前证据不足，没有猜测仓库路径。</p>
            )}
          </div>
        </article>

        <article className="report-panel report-plan">
          <div className="section-number">04</div>
          <div>
            <h3>实施计划</h3>
            <ol className="plan-list">
              {result.implementationPlan.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <div className="plan-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="plan-body">
                    <h4>{item.title}</h4>
                    <p>{item.detail}</p>
                    <div className="verification">
                      <CheckIcon />
                      <span>
                        <b>完成标志</b> {item.verification}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </article>

        <article className="report-panel">
          <div className="section-number">05</div>
          <div>
            <h3>风险与缓解</h3>
            <div className="risk-list">
              {result.risks.map((item, index) => (
                <div className="risk-item" key={`${item.risk}-${index}`}>
                  <span className={`risk-level risk-${item.level}`}>{item.level}</span>
                  <div>
                    <h4>{item.risk}</h4>
                    <p>{item.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="report-panel">
          <div className="section-number">06</div>
          <div>
            <h3>测试计划</h3>
            <div className="test-table" role="table" aria-label="测试计划">
              {result.testPlan.map((item, index) => (
                <div className="test-row" role="row" key={`${item.scenario}-${index}`}>
                  <div className="test-num">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <b>{item.scenario}</b>
                    <span>{item.expected}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="report-panel">
          <div className="section-number">07</div>
          <div>
            <h3>提交前要问维护者</h3>
            {result.questions.length ? (
              <ul className="question-list">
                {result.questions.map((item, index) => (
                  <li key={item}>
                    <span>Q{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">现有证据已足够，没有额外问题。</p>
            )}
          </div>
        </article>
      </div>

      <div className="source-strip">
        <div>
          <span className="source-led" />
          EVIDENCE LEDGER
        </div>
        <div className="source-links">
          {result.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              {source.label}
              <ArrowIcon />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function IssueKillerApp() {
  const [url, setUrl] = useState(DEMOS[0].url);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [result, setResult] = useState<IssueAnalysis>(SAMPLE_ANALYSIS);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 4200);
    return () => window.clearInterval(timer);
  }, [loading]);

  const buttonLabel = useMemo(() => {
    if (!loading) return "生成贡献计划";
    return STAGES[stage].label;
  }, [loading, stage]);

  const pickDemo = (demoUrl: string) => {
    setUrl(demoUrl);
    setError("");
    document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    setStage(0);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      const payload = (await response.json()) as IssueAnalysis | { error?: string };
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "分析失败，请稍后重试。",
        );
      }
      setResult(payload as IssueAnalysis);
      window.setTimeout(() => {
        document.getElementById("report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <nav className="topbar" aria-label="主导航">
        <a className="brand" href="#top" aria-label="Issue-killer 首页">
          <span className="brand-mark"><SparkIcon /></span>
          <span>Issue-killer</span>
          <em>HY3</em>
        </a>
        <div className="nav-links">
          <a href="#workflow">工作流</a>
          <a href="#demos">示例</a>
          <a
            className="github-link"
            href="https://github.com/Tencent-Hunyuan/Hy3/issues/4"
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon />
            Issue #4
          </a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            EVIDENCE-GROUNDED CONTRIBUTION PLANNER
          </div>
          <h1>
            从一个 Issue，
            <br />
            到一份<span>能开工</span>的计划。
          </h1>
          <p>
            Issue-killer 读取公开的 Issue、README 与仓库目录，让 Hy3
            把模糊需求拆成验收标准、真实代码入口、实施步骤和测试清单。
          </p>
          <div className="hero-proof">
            <span><CheckIcon />不猜文件</span>
            <span><CheckIcon />每步可验证</span>
            <span><CheckIcon />结果可导出</span>
          </div>
        </div>

        <div className="hero-console" aria-label="Issue-killer 工作流预览">
          <div className="console-top">
            <span>ISSUE-KILLER / RUN_042</span>
            <div><i /><i /><i /></div>
          </div>
          <div className="console-body">
            <div className="console-line">
              <span>01</span><code>fetch</code><b>issue + repository</b><em>done</em>
            </div>
            <div className="console-line">
              <span>02</span><code>ground</code><b>4 evidence sources</b><em>done</em>
            </div>
            <div className="console-line active">
              <span>03</span><code>plan</code><b>Hy3 / structured JSON</b><em>running</em>
            </div>
            <div className="console-line muted">
              <span>04</span><code>verify</code><b>paths + criteria</b><em>queued</em>
            </div>
          </div>
          <div className="console-output">
            <span>OUTPUT</span>
            <div>
              <strong>6</strong><small>验收标准</small>
            </div>
            <div>
              <strong>4</strong><small>实施阶段</small>
            </div>
            <div>
              <strong>3</strong><small>风险项</small>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow-band" id="workflow" aria-label="分析流程">
        {STAGES.map((item, index) => (
          <div className="workflow-step" key={item.short}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <b>{item.short}</b>
              <small>{item.label}</small>
            </div>
            {index < STAGES.length - 1 && <ArrowIcon />}
          </div>
        ))}
      </section>

      <section className="analyzer-section" id="analyzer">
        <div className="section-heading">
          <div>
            <span className="section-label">RUN A LIVE ANALYSIS</span>
            <h2>把 Issue 交给证据，而不是直觉。</h2>
          </div>
          <p>
            只支持公开 GitHub Issue / PR。API Key 仅随本次请求发送，不写入浏览器存储或数据库。
          </p>
        </div>

        <form className="analyzer-card" onSubmit={submit}>
          <div className="field-group issue-field">
            <label htmlFor="issue-url">GitHub Issue URL</label>
            <div className="input-shell">
              <GithubIcon />
              <input
                id="issue-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="field-group key-field">
            <label htmlFor="api-key">
              Hy3 API Key <span>BYOK</span>
            </label>
            <div className="input-shell">
              <span className="key-symbol" aria-hidden="true">⌁</span>
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-••••••••••••"
                autoComplete="off"
                disabled={loading}
              />
              <button
                className="show-key"
                type="button"
                onClick={() => setShowKey((value) => !value)}
                aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <SparkIcon />}
            <span>{buttonLabel}</span>
            {!loading && <ArrowIcon />}
          </button>

          {error && (
            <div className="error-message" role="alert">
              <b>请求未完成</b>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="live-progress" aria-live="polite">
              {STAGES.map((item, index) => (
                <div
                  className={`${index < stage ? "done" : ""} ${index === stage ? "current" : ""}`}
                  key={item.short}
                >
                  <span>{index < stage ? "✓" : index + 1}</span>
                  <small>{item.short}</small>
                </div>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="demo-section" id="demos">
        <div className="demo-heading">
          <span className="section-label">TWO END-TO-END FLOWS</span>
          <h2>一键装载评测案例</h2>
          <p>两个不同类型的开源任务，用同一条证据链验证输出稳定性。</p>
        </div>
        <div className="demo-grid">
          {DEMOS.map((demo, index) => (
            <button
              className={`demo-card demo-${demo.accent}`}
              type="button"
              onClick={() => pickDemo(demo.url)}
              key={demo.id}
            >
              <div className="demo-index">0{index + 1}</div>
              <div className="demo-content">
                <span>{demo.eyebrow}</span>
                <h3>{demo.title}</h3>
                <p>{demo.repo}</p>
              </div>
              <div className="demo-arrow"><ArrowIcon /></div>
            </button>
          ))}
        </div>
      </section>

      <div ref={reportRef}>
        <Report result={result} />
      </div>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark"><SparkIcon /></span>
          <div>
            <b>Issue-killer</b>
            <small>Powered by Tencent Hunyuan Hy3</small>
          </div>
        </div>
        <p>
          开源项目 · 为 2026 腾讯犀牛鸟开源人才培养计划构建
        </p>
        <a
          href="https://github.com/Tencent-Hunyuan/Hy3/issues/4"
          target="_blank"
          rel="noreferrer"
        >
          查看任务要求 <ArrowIcon />
        </a>
      </footer>
    </main>
  );
}
