@echo off
chcp 949 > nul
cd /d "%~dp0"
title 세진 과학 - 사이트 올리기
echo.
echo   ============================================
echo    세진 과학 - 사이트 올리기
echo   ============================================
echo.
echo   바뀐 것을 챙기는 중...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "사이트 새로 올림"
  echo   챙겼다.
) else (
  echo   바뀐 것 없다. 그대로 올린다.
)
echo.
echo   올리는 중... 1~2분 걸린다. 그냥 기다려라.
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo   ** 못 올렸다. 위에 뜬 글을 그대로 알려 줘라. **
) else (
  echo.
  echo   ============================================
  echo    다 올렸다.
  echo.
  echo    https://sejinedu.github.io
  echo.
  echo    사이트가 실제로 뜨는 데 1~2분 더 걸린다.
  echo   ============================================
)
echo.
pause