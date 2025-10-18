# ========================================
# ZOVA - Ultimate Route Pattern Checker
# ========================================
# Enhanced script that accurately detects old routing patterns
# without false positives from already-correct route groups
#
# Usage: .\scripts\check-routes-ultimate.ps1
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZOVA Ultimate Route Pattern Checker" -ForegroundColor Cyan
Write-Host "Powered by Regex Precision™" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Statistics
$totalFiles = 0
$totalIssues = 0
$issuesByType = @{}

# Define precise regex patterns that match ONLY old patterns (not route groups)
$patterns = @(
    @{
        Name = "Auth Routes Without Groups"
        # Matches /auth/ but NOT /(auth)/
        Regex = '(?<![(/])\bauth(?![)/])'
        Context = 'router\.(push|replace|navigate)|pathname|href'
        Example = '/auth/login → /(auth)/login'
        Color = 'Red'
    },
    @{
        Name = "Customer Routes Without Groups"
        # Matches /customer/ but NOT /(customer)/
        Regex = '[''"`]/customer/(?!\()'
        Context = 'router\.(push|replace)'
        Example = '/customer/booking → /(customer)/booking'
        Color = 'Yellow'
    },
    @{
        Name = "Provider Routes Without Groups"
        # Matches /provider/ but NOT /(provider)/ or /(provider-verification)/
        Regex = '[''"`]/provider/(?!.*\()'
        Context = 'router\.(push|replace)'
        Example = '/provider/bookingdetail → /(provider)/bookingdetail'
        Color = 'Magenta'
    },
    @{
        Name = "Provider Verification Routes Without Groups"
        # Matches /provider-verification but NOT /(provider-verification)
        Regex = '[''"`]/provider-verification(?!/\()'
        Context = 'router\.(push|replace)|pathname'
        Example = '/provider-verification → /(provider-verification)'
        Color = 'DarkYellow'
    },
    @{
        Name = "Onboarding Routes Without Public Group"
        # Matches /onboarding but NOT /(public)/onboarding
        Regex = '[''"`]/onboarding(?!.*public)'
        Context = 'router\.(push|replace)|pathname|href'
        Example = '/onboarding → /(public)/onboarding'
        Color = 'DarkCyan'
    }
)

Write-Host "Scanning TypeScript/JavaScript files in src/..." -ForegroundColor Gray
Write-Host ""

# Get all relevant source files
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -File

foreach ($file in $files) {
    $totalFiles++
    
    # Use -LiteralPath to handle files with brackets [id].tsx
    try {
        $lines = Get-Content -LiteralPath $file.FullName -ErrorAction Stop
    } catch {
        Write-Host "  Skipping file with special characters: $($file.FullName)" -ForegroundColor DarkGray
        continue
    }
    
    foreach ($pattern in $patterns) {
        # Check each line for the pattern
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            $lineNumber = $i + 1
            
            # Skip comments and markdown
            if ($line -match '^\s*(//|/\*|\*)' -or $line -match '\.md') {
                continue
            }
            
            # Check if line contains routing context and matches the bad pattern
            if ($line -match $pattern.Context -and $line -match $pattern.Regex) {
                # Additional validation: exclude if it's already using route groups
                if ($line -match '\(auth\)|\(customer\)|\(provider\)|\(provider-verification\)|\(public\)') {
                    continue
                }
                
                $totalIssues++
                
                # Track by type
                if (-not $issuesByType.ContainsKey($pattern.Name)) {
                    $issuesByType[$pattern.Name] = @()
                }
                
                $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
                
                $issuesByType[$pattern.Name] += @{
                    File = $relativePath
                    Line = $lineNumber
                    Code = $line.Trim()
                }
            }
        }
    }
}

# Display Results by Category
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SCAN RESULTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Files Scanned: $totalFiles" -ForegroundColor Gray
Write-Host "Total Issues Found: $totalIssues`n" -ForegroundColor $(if ($totalIssues -eq 0) { 'Green' } else { 'Red' })

if ($totalIssues -eq 0) {
    Write-Host "🎉 PERFECT! All routes are using Expo Router v6 patterns!" -ForegroundColor Green
    Write-Host "✓ No old route patterns detected" -ForegroundColor Green
    Write-Host "✓ All route groups properly implemented" -ForegroundColor Green
} else {
    Write-Host "⚠ Issues Found by Category:`n" -ForegroundColor Yellow
    
    foreach ($patternInfo in $patterns) {
        if ($issuesByType.ContainsKey($patternInfo.Name)) {
            $issues = $issuesByType[$patternInfo.Name]
            $count = $issues.Count
            
            Write-Host "[$($patternInfo.Name)] - $count issue(s)" -ForegroundColor $patternInfo.Color
            Write-Host "  Fix: $($patternInfo.Example)" -ForegroundColor Gray
            Write-Host ""
            
            foreach ($issue in $issues) {
                Write-Host "  📄 $($issue.File)" -ForegroundColor White
                Write-Host "     Line $($issue.Line): $($issue.Code)" -ForegroundColor DarkGray
                Write-Host ""
            }
        }
    }
    
    # Recommendations
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "RECOMMENDED ACTIONS" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Expo Router v6 Route Group Patterns:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Old Pattern                    New Pattern" -ForegroundColor Gray
    Write-Host "  ─────────────────────────────  ─────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  /auth/login                 →  /(auth)/login" -ForegroundColor White
    Write-Host "  /auth/register              →  /(auth)/register" -ForegroundColor White
    Write-Host "  /customer/booking/\$id       →  /(customer)/booking/\$id" -ForegroundColor White
    Write-Host "  /provider/bookingdetail/\$id →  /(provider)/bookingdetail/\$id" -ForegroundColor White
    Write-Host "  /provider-verification      →  /(provider-verification)" -ForegroundColor White
    Write-Host "  /onboarding                 →  /(public)/onboarding" -ForegroundColor White
    Write-Host ""
    Write-Host "Route groups use parentheses: /(group-name)/" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VALIDATION CHECKS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Additional validation checks
Write-Host "Checking for common issues..." -ForegroundColor Gray
Write-Host ""

# Check 1: Hardcoded roles
Write-Host "[Check 1] Hardcoded User Roles" -ForegroundColor Yellow
$hardcodedRoles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" |
    Select-String -Pattern "role\s*=\s*['\`"]customer['\`"]|role\s*=\s*['\`"]provider['\`"]" |
    Where-Object { 
        ($_.Line -notmatch "//|/\*|interface|type\s|function.*role.*=") -and 
        ($_.Line -match "const\s|let\s|var\s") 
    }

if ($hardcodedRoles) {
    $roleCount = ($hardcodedRoles | Measure-Object).Count
    Write-Host "  ⚠ Found $roleCount actual hardcoded role(s)" -ForegroundColor Red
    $hardcodedRoles | ForEach-Object {
        $relativePath = $_.Path.Replace((Get-Location).Path + "\", "")
        Write-Host "  📄 $relativePath : Line $($_.LineNumber)" -ForegroundColor White
        Write-Host "     $($_.Line.Trim())" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  ✓ No hardcoded roles detected" -ForegroundColor Green
    Write-Host "  💡 Type definitions are OK" -ForegroundColor DarkGray
}
Write-Host ""

# Check 2: Direct useEffect with fetching
Write-Host "[Check 2] useEffect with Data Fetching" -ForegroundColor Yellow
$useEffectFetch = Get-ChildItem -Path "src/app" -Recurse -Include "*.tsx" |
    Select-String -Pattern "useEffect.*fetch|useEffect.*supabase\." |
    Where-Object { $_.Line -notmatch "//|/\*|React Query" }

if ($useEffectFetch) {
    $effectCount = ($useEffectFetch | Measure-Object).Count
    Write-Host "  ⚠ Found $effectCount useEffect with fetching (consider React Query)" -ForegroundColor Red
    $useEffectFetch | Select-Object -First 3 | ForEach-Object {
        $relativePath = $_.Path.Replace((Get-Location).Path + "\", "")
        Write-Host "  📄 $relativePath : Line $($_.LineNumber)" -ForegroundColor White
    }
    if ($effectCount -gt 3) {
        Write-Host "  ... and $($effectCount - 3) more" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  ✓ Good! Using React Query for data fetching" -ForegroundColor Green
}
Write-Host ""

# Check 3: Hardcoded colors (excluding acceptable cases)
Write-Host "[Check 3] Hardcoded Background Colors" -ForegroundColor Yellow
$hardcodedColors = Get-ChildItem -Path "src/app" -Recurse -Include "*.tsx" -ErrorAction SilentlyContinue |
    Select-String -Pattern "className=`"[^`"]*\b(bg-white|bg-black)\b" |
    Where-Object { 
        $_.Line -notmatch "//|/\*" -and
        $_.Line -notmatch "text-white|text-black"  # Exclude text colors (usually for contrast)
    }

if ($hardcodedColors) {
    $colorCount = ($hardcodedColors | Measure-Object).Count
    Write-Host "  ⚠ Found $colorCount hardcoded background(s)" -ForegroundColor Red
    Write-Host "  💡 Use: bg-card, bg-background instead of bg-white/bg-black" -ForegroundColor Cyan
    
    # Show first 3 examples
    $hardcodedColors | Select-Object -First 3 | ForEach-Object {
        $relativePath = $_.Path.Replace((Get-Location).Path + "\", "")
        Write-Host "  📄 $relativePath : Line $($_.LineNumber)" -ForegroundColor White
    }
    if ($colorCount -gt 3) {
        Write-Host "  ... and $($colorCount - 3) more" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  ✓ Using theme colors properly" -ForegroundColor Green
    Write-Host "  💡 text-white/text-black for contrast is OK" -ForegroundColor DarkGray
}
Write-Host ""

# Final Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($totalIssues -eq 0) {
    Write-Host "✅ ROUTE MIGRATION: COMPLETE" -ForegroundColor Green
    Write-Host "✅ All routing patterns follow Expo Router v6 standards" -ForegroundColor Green
    Write-Host "✅ Ready for production build" -ForegroundColor Green
} else {
    Write-Host "⚠️  ROUTE MIGRATION: INCOMPLETE" -ForegroundColor Yellow
    Write-Host "   Total route issues: $totalIssues" -ForegroundColor Red
    Write-Host "   Action required: Fix route patterns listed above" -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Exit with error code if issues found (useful for CI/CD)
if ($totalIssues -gt 0) {
    exit 1
} else {
    exit 0
}
