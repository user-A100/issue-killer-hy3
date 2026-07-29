export type SourceRecord = {
  label: string;
  url: string;
  kind: "issue" | "readme" | "contributing" | "repository";
};
export type PlanStep = {
  title: string;
  detail: string;
  verification: string;
};

export type EntryPoint = {
  path: string;
  why: string;
};

export type RiskItem = {
  level: "高" | "中" | "低";
  risk: string;
  mitigation: string;
};

export type TestItem = {
  scenario: string;
  expected: string;
};

export type IssueAnalysis = {
  project: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    state: string;
    labels: string[];
    url: string;
  };
  summary: string;
  difficulty: {
    level: "高" | "中" | "低";
    rationale: string;
  };
  acceptanceCriteria: string[];
  entryPoints: EntryPoint[];
  implementationPlan: PlanStep[];
  risks: RiskItem[];
  questions: string[];
  testPlan: TestItem[];
  sources: SourceRecord[];
  meta: {
    model: string;
    elapsedMs: number;
    promptTokens?: number;
    completionTokens?: number;
    generatedAt: string;
    sample?: boolean;
  };
};

export type AnalyzeRequest = {
  url: string;
  apiKey?: string;
  githubToken?: string;
};
