@echo off
echo ========================================
echo Fixing Hardcoded Secrets in Code
echo ========================================
echo.
echo This will:
echo 1. Remove hardcoded API keys from config.ts
echo 2. Update .gitignore
echo 3. Remove sensitive files from git
echo.
pause

cd /d %~dp0

REM Backup current files
echo Creating backups...
copy mcp-console\src\app\config.ts mcp-console\src\app\config.ts.backup
copy .gitignore .gitignore.backup

echo.
echo Updating .gitignore...
echo .claude/mcp-servers.json >> .gitignore

echo.
echo Removing hardcoded keys from git cache...
git rm --cached .claude/mcp-servers.json 2>nul

echo.
echo ========================================
echo MANUAL STEPS REQUIRED:
echo ========================================
echo.
echo 1. Edit mcp-console/src/app/config.ts:
echo    - Remove the hardcoded fallback: 'Iwant@newpass007'
echo    - Change to: hubApiKey: import.meta.env.VITE_HUB_API_KEY
echo.
echo 2. Add error handling for missing keys
echo.
echo 3. Commit changes:
echo    git add .gitignore mcp-console/src/app/config.ts
echo    git commit -m "fix: Remove hardcoded API keys, add to .gitignore"
echo    git push
echo.
echo 4. Verify no secrets remain:
echo    git grep -i "Iwant@newpass007"
echo.
pause
