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
  'expenses-nemotron-3-5-lightning' = @{ db = 'fcmp_nemotron'; port = 3111 }
  'expenses-hy4' = @{ db = 'fcmp_hy4'; port = 3112 }
  'expenses-gpt-6-2-sol' = @{ db = 'fcmp_sol'; port = 3113 }
  'expenses-gpt-6-2-astra' = @{ db = 'fcmp_astra'; port = 3114 }
  'expenses-big-pickle' = @{ db = 'fcmp_pickle'; port = 3115 }
  'expenses-copilot-luna-6' = @{ db = 'fcmp_luna'; port = 3116 }
}

if (-not $env:POSTGRES_ADMIN_URL) {
  throw 'Set POSTGRES_ADMIN_URL to a local Postgres admin URL before running the comparison.'
}

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
    $branchSlug = $branch -replace '[^a-zA-Z0-9-]', '-'
    $artifactDirectory = Join-Path $resultsRoot $branchSlug
    New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null

    Write-Host "`n=== $branch ==="
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
          pnpm db:push
          if ($LASTEXITCODE -ne 0) {
            throw "Migration and schema push both failed for $branch"
          }
          $migrationResult = 'failed; schema push succeeded'
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

      $stdout = Join-Path $logRoot "$branchSlug-server.out.log"
      $stderr = Join-Path $logRoot "$branchSlug-server.err.log"
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
      Branch = $branch
      Migration = $migrationResult
      UnitExit = $unitExit
      FunctionalExit = $functionalExit
      Screenshots = $artifactDirectory
    }
  }

  $results | Format-Table -AutoSize
  $lines = @(
    '# Comparison run results',
    '',
    '| Branch | Migration | Unit suite exit | Browser suite exit | Screenshots |',
    '| --- | --- | ---: | ---: | --- |'
  )
  foreach ($result in $results) {
    $relative = $result.Screenshots.Substring($repoRoot.Length).TrimStart('\').Replace('\', '/')
    $lines += "| ``$($result.Branch)`` | $($result.Migration) | $($result.UnitExit) | $($result.FunctionalExit) | [$relative]($relative) |"
  }
  Set-Content -Path (Join-Path $resultsRoot 'run-summary.md') -Value $lines

  if ($results | Where-Object { $_.UnitExit -ne 0 -or $_.FunctionalExit -ne 0 }) {
    Write-Warning "One or more comparison checks failed; inspect run-summary.md and logs under $logRoot."
  }
} finally {
  Pop-Location
}
