param(
  [string[]]$Branches = @(
    'expenses-nemotron-3-5-lightning',
    'expenses-hy4',
    'expenses-gpt-6-2-sol',
    'expenses-gpt-6-2-astra',
    'expenses-big-pickle',
    'expenses-copilot-luna-6'
  )
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$worktreeRoot = Join-Path $env:TEMP 'ai-chatbot-comparison'
$resultsRoot = Join-Path $repoRoot 'comparison-results'
$logRoot = Join-Path $env:TEMP 'ai-chatbot-comparison-logs'
$branchesInfo = @{
  'expenses-nemotron-3-5-lightning' = @{ pr = 6; db = 'fcmp_nemotron'; port = 3111; model = 'Nemotron 3.5 Lightning' }
  'expenses-hy4' = @{ pr = 5; db = 'fcmp_hy4'; port = 3112; model = 'Tencent Hy4' }
  'expenses-gpt-6-2-sol' = @{ pr = 4; db = 'fcmp_sol'; port = 3113; model = 'GPT 6.2 Sol' }
  'expenses-gpt-6-2-astra' = @{ pr = 3; db = 'fcmp_astra'; port = 3114; model = 'GPT 6.2 Astra' }
  'expenses-big-pickle' = @{ pr = 2; db = 'fcmp_pickle'; port = 3115; model = 'Open Code Big Pickle' }
  'expenses-copilot-luna-6' = @{ pr = 1; db = 'fcmp_luna'; port = 3116; model = 'Copilot Fusion GPT 6 Luna' }
}

if (-not $env:POSTGRES_ADMIN_URL) {
  throw 'Set POSTGRES_ADMIN_URL to a local Postgres admin URL before running the comparison.'
}

# A single seeded administrator is used on every branch. Email-based branches
# read ADMIN_EMAILS; id-based branches read AI_ADMIN_USER_IDS / FINANCE_ADMIN_IDS.
$env:COMPARISON_ADMIN_EMAIL = 'admin@comparison.local'
$env:COMPARISON_ADMIN_PASSWORD = 'ComparisonAdmin123!'
$env:COMPARISON_ADMIN_USER_ID = '00000000-4000-4000-8000-000000000001'
$env:ADMIN_EMAILS = $env:COMPARISON_ADMIN_EMAIL
$env:AI_ADMIN_USER_IDS = $env:COMPARISON_ADMIN_USER_ID
$env:FINANCE_ADMIN_IDS = $env:COMPARISON_ADMIN_USER_ID

New-Item -ItemType Directory -Force -Path $resultsRoot, $worktreeRoot, $logRoot | Out-Null
Push-Location $repoRoot
try {
  node (Join-Path $PSScriptRoot 'create-databases.mjs')
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to create or verify the isolated test databases.'
  }

  $results = @()
  foreach ($branch in $Branches) {
    if (-not $branchesInfo.ContainsKey($branch)) {
      Write-Warning "Skipping unknown branch: $branch"
      continue
    }

    $branchInfo = $branchesInfo[$branch]
    $worktree = Join-Path $worktreeRoot $branch
    $artifactDirectory = Join-Path $resultsRoot $branch
    New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
    Get-ChildItem $artifactDirectory -File | Remove-Item -Force

    Write-Host "`n=== $branch (PR #$($branchInfo.pr)) ==="
    if (-not (Test-Path (Join-Path $worktree 'package.json'))) {
      git fetch origin $branch
      if ($LASTEXITCODE -ne 0) { throw "Unable to fetch $branch" }
      git worktree add --detach $worktree "origin/$branch"
      if ($LASTEXITCODE -ne 0) { throw "Unable to create worktree for $branch" }
    }

    $branchDatabaseUrl = [System.UriBuilder]$env:POSTGRES_ADMIN_URL
    $branchDatabaseUrl.Path = "/$($branchInfo.db)"
    $env:POSTGRES_URL = $branchDatabaseUrl.Uri.AbsoluteUri
    $env:DATABASE_URL = $env:POSTGRES_URL
    $env:AUTH_SECRET = 'comparison-only-secret-for-local-tests'
    $env:PLAYWRIGHT = 'True'
    $env:PORT = [string]$branchInfo.port
    $env:BASE_URL = "http://localhost:$($branchInfo.port)"
    $env:COMPARISON_BRANCH = $branch
    $env:COMPARISON_WORKTREE = $worktree
    $env:COMPARISON_ARTIFACTS = $artifactDirectory

    $unitExit = 1
    $branchUnitExit = 0
    $functionalExit = 1
    $migrationResult = 'passed'
    $server = $null
    try {
      if (-not (Test-Path (Join-Path $worktree 'node_modules\.bin\next.cmd'))) {
        Push-Location $worktree
        try {
          pnpm install --no-frozen-lockfile --lockfile=false
          if ($LASTEXITCODE -ne 0) { throw "Dependency install failed for $branch" }
        } finally {
          Pop-Location
        }
      }

      Push-Location $worktree
      try {
        pnpm db:migrate
        if ($LASTEXITCODE -ne 0) {
          $migrationResult = 'failed; trying schema push'
          pnpm exec drizzle-kit push --force
          if ($LASTEXITCODE -ne 0) {
            throw "Migration and schema push both failed for $branch"
          }
          $migrationResult = 'failed; schema push succeeded'
        }

        $seedOutput = node (Join-Path $PSScriptRoot 'seed-admin.mjs') | Out-String
        if ($LASTEXITCODE -ne 0) { throw "Admin seeding failed for $branch" }
        $seedMatch = [regex]::Match($seedOutput, 'ADMIN_USER_ID=([0-9a-fA-F-]{36})')
        if ($seedMatch.Success) {
          $env:COMPARISON_ADMIN_USER_ID = $seedMatch.Groups[1].Value
        }

        $package = Get-Content (Join-Path $worktree 'package.json') -Raw | ConvertFrom-Json
        if ($package.scripts.'test:unit') {
          pnpm run test:unit
          if ($LASTEXITCODE -ne 0) {
            Write-Warning "Branch-provided unit tests failed for $branch"
            $branchUnitExit = 1
          }
        }
      } finally {
        Pop-Location
      }

      pnpm exec tsx --test tests/comparison/unit.test.ts
      if ($LASTEXITCODE -ne 0 -or $branchUnitExit -ne 0) {
        $unitExit = 1
      } else {
        $unitExit = 0
      }

      $stdout = Join-Path $logRoot "$branch-server.out.log"
      $stderr = Join-Path $logRoot "$branch-server.err.log"
      $pnpmCommand = (Get-Command pnpm.cmd).Source
      $server = Start-Process -FilePath $pnpmCommand -ArgumentList 'exec next dev' `
        -WorkingDirectory $worktree -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr

      $ready = $false
      for ($attempt = 0; $attempt -lt 90; $attempt++) {
        if ($server.HasExited) { break }
        try {
          $response = Invoke-WebRequest -Uri $env:BASE_URL -TimeoutSec 10 -UseBasicParsing
          if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            $ready = $true
            break
          }
        } catch {
          Start-Sleep -Seconds 2
        }
      }
      if (-not $ready) {
        throw "The $branch dev server did not become ready; see $stderr"
      }

      pnpm exec playwright test --config playwright.comparison.config.ts
      $functionalExit = $LASTEXITCODE
    } catch {
      Write-Warning "${branch}: $($_.Exception.Message)"
    } finally {
      if ($server -and -not $server.HasExited) {
        $allProcesses = Get-CimInstance Win32_Process
        function Stop-ComparisonProcessTree([int]$processId) {
          $children = $allProcesses | Where-Object { $_.ParentProcessId -eq $processId }
          foreach ($child in $children) {
            Stop-ComparisonProcessTree -processId $child.ProcessId
          }
          Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        Stop-ComparisonProcessTree -processId $server.Id
      }
    }

    $results += [pscustomobject]@{
      branch = $branch
      pr = $branchInfo.pr
      model = $branchInfo.model
      migration = $migrationResult
      unitExit = $unitExit
      functionalExit = $functionalExit
    }
  }

  $results | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $resultsRoot 'run-meta.json')
  node (Join-Path $PSScriptRoot 'report.mjs')

  $results | Format-Table -AutoSize
  if ($results | Where-Object { $_.unitExit -ne 0 -or $_.functionalExit -ne 0 }) {
    Write-Warning 'One or more comparison checks failed; inspect comparison-results/COMPARISON.md and the logs.'
  }
} finally {
  Pop-Location
}
