import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function environment() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("server-renders the Issue-killer product shell", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    environment(),
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Issue-killer · 从 Issue 到可执行计划<\/title>/i);
  assert.match(html, /从一个 Issue/);
  assert.match(html, /生成贡献计划/);
  assert.match(html, /EVIDENCE LEDGER/);
  assert.match(html, /Powered by Tencent Hunyuan Hy3/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("health endpoint is available without exposing secrets", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/health"),
    environment(),
    context,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.model, "hy3");
  assert.equal(typeof payload.serverKeyConfigured, "boolean");
  assert.equal(JSON.stringify(payload).includes("sk-"), false);
});

test("analyze endpoint rejects ambiguous or credential-bearing GitHub URLs", async () => {
  const worker = await loadWorker();
  const invalidUrls = [
    "https://user:pass@github.com/Tencent-Hunyuan/Hy3/issues/4",
    "https://github.com/Tencent-Hunyuan/Hy3/issues/4/extra",
    "https://github.com/Tencent-Hunyuan/Hy3/issues/2147483648",
    "https://github.com/.../Hy3/issues/4",
    "https://github.com/Tencent-Hunyuan/.../issues/4",
  ];

  for (const url of invalidUrls) {
    const response = await worker.fetch(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          apiKey: "test-key-that-is-long-enough",
        }),
      }),
      environment(),
      context,
    );
    assert.equal(response.status, 400);
  }
});

test("repository does not ship starter skeleton or hard-coded secrets", async () => {
  const [page, layout, packageJson, gitignore] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(page, /IssueKillerApp/);
  assert.match(layout, /Issue-killer/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(gitignore, /\.env\*/);
  assert.doesNotMatch(
    [page, layout, packageJson].join("\n"),
    /sk-[A-Za-z0-9_-]{20,}/,
  );
});
