# ========================================
# ZOVA - Find Old Route Patterns Script
# ========================================
# This script searches for old routing patterns that don't use
# Expo Router v6 route groups and need to be updated
#
# Usage: .\scripts\find-old-routes.ps1
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZOVA Route Pattern Checker" -ForegroundColor Cyan
Write-Host "Searching for old route patterns..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Define patterns to search for (old patterns without route groups)
$oldPatterns = @(
    @{
        Name = "Auth Routes"
        Pattern = "/auth/"
        Correct = "/(auth)/"
    },
    @{
        Name = "Customer Routes"
        Pattern = "/customer/"
        Correct = "/(customer)/"
    },
    @{
        Name = "Provider Routes"
        Pattern = "/provider/"
        Correct = "/(provider)/"
    },
    @{
        Name = "Provider Verification Routes"
        Pattern = "/provider-verification"
        Correct = "/(provider-verification)"
    },
    @{
        Name = "Public/Onboarding Routes"
        Pattern = "/onboarding"
        Correct = "/(public)/onboarding"
    }
)

$totalIssues = 0

foreach ($patternInfo in $oldPatterns) {
    Write-Host "`n[$($patternInfo.Name)]" -ForegroundColor Yellow
    Write-Host "Searching for: $($patternInfo.Pattern)" -ForegroundColor Gray
    Write-Host "Should be: $($patternInfo.Correct)`n" -ForegroundColor Green
    
    # Search in TypeScript and JavaScript files
    $results = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" | 
        Select-String -Pattern $patternInfo.Pattern |
        Where-Object { 
            $_.Line -match "router\.|pathname:|route:|href:|destination:" -and
            $_.Line -notmatch "/(auth)/|/(customer)/|/(provider)/|/(public)/" -and
            $_.Line -notmatch "/(provider-verification)/" -and
            $_.Line -notmatch "\.md|comment|//|/\*"
        }
    
    if ($results) {
        $count = ($results | Measure-Object).Count
        $totalIssues += $count
        Write-Host "Found $count issue(s):" -ForegroundColor Red
        
        $results | ForEach-Object {
            $relativePath = $_.Path.Replace((Get-Location).Path + "\", "")
            Write-Host "  File: $relativePath" -ForegroundColor White
            Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor DarkGray
            Write-Host ""
        }
    } else {
        Write-Host "✓ No issues found" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($totalIssues -eq 0) {
    Write-Host "✓ All routes are using correct patterns!" -ForegroundColor Green
} else {
    Write-Host "⚠ Total issues found: $totalIssues" -ForegroundColor Red
    Write-Host "`nRoute Group Pattern Guide:" -ForegroundColor Yellow
    Write-Host "  Old Pattern              → New Pattern" -ForegroundColor Gray
    Write-Host "  /auth/...                → /(auth)/..." -ForegroundColor White
    Write-Host "  /customer/...            → /(customer)/..." -ForegroundColor White
    Write-Host "  /provider/...            → /(provider)/..." -ForegroundColor White
    Write-Host "  /provider-verification/  → /(provider-verification)/" -ForegroundColor White
    Write-Host "  /onboarding              → /(public)/onboarding" -ForegroundColor White
}
Write-Host "========================================`n" -ForegroundColor Cyan
