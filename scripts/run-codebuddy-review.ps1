param(
  [string]$OutputPath = "docs/codebuddy-review.json"
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$projectRoot = Split-Path -Parent $PSScriptRoot
$reviewFiles = @(
  "lib/github.ts",
  "lib/hy3.ts",
  "app/api/analyze/route.ts"
)

$parts = foreach ($relativePath in $reviewFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "Missing review file: $relativePath"
  }
  "===== $relativePath ====="
  Get-Content -Raw -LiteralPath $absolutePath
}

$prompt = @"
你是本项目的安全代码审查者。下面是 Issue-killer 的三个服务端文件。

请重点检查：
1. GitHub URL 解析是否存在 SSRF、路径绕过或输入验证问题；
2. Hy3 API Key 是否可能写入日志、存储、错误响应或客户端产物；
3. Hy3 JSON 输出校验、超时和错误处理是否足够；
4. 是否存在会破坏两个端到端 Demo 的明显逻辑错误。

部署背景：
- 目标运行时是 Cloudflare Workers，Hy3 主请求已设置 30 秒客户端超时；
- 页面采用 BYOK，密钥只随单次 HTTPS 请求进入服务端，不记录、不存储、不回传；
- verdict 在不存在 high/medium 问题时应为 pass；low 建议可保留在 findings 中。

只返回 JSON，结构为：
{
  "tool": "CodeBuddy",
  "summary": "审查摘要",
  "findings": [
    {
      "severity": "high|medium|low",
      "file": "文件路径",
      "issue": "问题",
      "recommendation": "修复建议"
    }
  ],
  "verdict": "pass|changes_requested"
}

不要复述源码，不要输出任何疑似密钥。
"@

$content = $parts -join "`n"
$transcript = $content | codebuddy -p $prompt --output-format json
if ($LASTEXITCODE -ne 0) {
  throw "CodeBuddy review failed. Run 'codebuddy', use /login, and retry."
}

$events = $transcript | ConvertFrom-Json
$resultEvent = $events |
  Where-Object { $_.type -eq "result" -and -not $_.is_error } |
  Select-Object -Last 1
if (-not $resultEvent -or -not $resultEvent.result) {
  throw "CodeBuddy did not return a review result."
}

$review = $resultEvent.result | ConvertFrom-Json
if (
  $review.tool -ne "CodeBuddy" -or
  $review.verdict -notin @("pass", "changes_requested")
) {
  throw "CodeBuddy returned an unexpected review schema."
}

$resolvedOutput = Join-Path $projectRoot $OutputPath
$outputDirectory = Split-Path -Parent $resolvedOutput
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}
$review |
  ConvertTo-Json -Depth 10 |
  Set-Content -LiteralPath $resolvedOutput -Encoding utf8
Write-Output "CodeBuddy review saved to $OutputPath"
