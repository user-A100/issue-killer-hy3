param(
  [string]$OutputPath = "docs/codebuddy-review.json"
)

$ErrorActionPreference = "Stop"
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
你是本项目的安全代码审查者。下面是 IssuePilot 的三个服务端文件。

请重点检查：
1. GitHub URL 解析是否存在 SSRF、路径绕过或输入验证问题；
2. Hy3 API Key 是否可能写入日志、存储、错误响应或客户端产物；
3. Hy3 JSON 输出校验、超时和错误处理是否足够；
4. 是否存在会破坏两个端到端 Demo 的明显逻辑错误。

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
$result = $content | codebuddy -p $prompt --output-format json
if ($LASTEXITCODE -ne 0) {
  throw "CodeBuddy review failed. Run 'codebuddy', use /login, and retry."
}

$resolvedOutput = Join-Path $projectRoot $OutputPath
$outputDirectory = Split-Path -Parent $resolvedOutput
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}
$result | Set-Content -LiteralPath $resolvedOutput -Encoding utf8
Write-Output "CodeBuddy review saved to $OutputPath"
