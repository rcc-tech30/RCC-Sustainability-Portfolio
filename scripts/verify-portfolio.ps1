$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Require-File([string]$RelativePath) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $RelativePath) -PathType Leaf)) {
        $failures.Add("Missing required file: $RelativePath")
    }
}

function Require-Text([string]$RelativePath, [string]$Pattern, [string]$Message) {
    $path = Join-Path $repoRoot $RelativePath
    if ((Test-Path -LiteralPath $path -PathType Leaf) -and
        -not (Select-String -LiteralPath $path -Pattern $Pattern -Quiet)) {
        $failures.Add($Message)
    }
}

function Require-AbsentText([string]$RelativePath, [string]$Pattern, [string]$Message) {
    $path = Join-Path $repoRoot $RelativePath
    if ((Test-Path -LiteralPath $path -PathType Leaf) -and
        (Select-String -LiteralPath $path -Pattern $Pattern -Quiet)) {
        $failures.Add($Message)
    }
}

Require-File 'README.md'
Require-File '.gitignore'
Require-File 'index.html'
Require-File 'dashboards/company-x-ghg/index.html'
Require-File 'dashboards/company-x-ghg/README.md'
Require-Text 'README.md' 'fictional' 'README must disclose fictional content.'
Require-Text 'README.md' 'illustrative' 'README must disclose illustrative data.'
Require-Text 'README.md' 'dashboards/company-x-ghg/' 'README must link to the featured dashboard.'
Require-Text 'README.md' 'https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/dashboards/company-x-ghg/' 'README must provide a direct live-dashboard link.'
Require-Text 'index.html' 'View dashboard' 'Landing page must provide a clear dashboard action.'
Require-AbsentText 'index.html' 'http-equiv="refresh"' 'Landing page must not automatically redirect visitors.'
Require-Text 'dashboards/company-x-ghg/index.html' 'Illustrative portfolio data' 'Dashboard must show its illustrative-data badge.'
Require-Text 'dashboards/company-x-ghg/README.md' 'View the live dashboard' 'Project README must explain how to view the live sample.'
Require-Text '.gitignore' '^\.env\*$' '.gitignore must exclude environment files.'

$licenseFiles = Get-ChildItem -LiteralPath $repoRoot -File | Where-Object Name -Match '^LICENSE(?:\..+)?$'
if ($licenseFiles) { $failures.Add('A license file is present, contrary to the approved design.') }

$trackedCandidates = Get-ChildItem -LiteralPath $repoRoot -Recurse -File |
    Where-Object FullName -NotMatch '[\\/]\.git[\\/]'
$secretPattern = '(?i)(api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["''][^"'']{8,}["'']'
foreach ($file in $trackedCandidates) {
    if (Select-String -LiteralPath $file.FullName -Pattern $secretPattern -Quiet -ErrorAction SilentlyContinue) {
        $failures.Add("Possible embedded secret: $($file.FullName.Substring($repoRoot.Length + 1))")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { [Console]::Error.WriteLine($_) }
    exit 1
}

Write-Host 'Portfolio verification passed.'
