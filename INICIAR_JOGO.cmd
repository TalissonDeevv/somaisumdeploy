@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "release\win-unpacked\Só Mais Um Deploy.exe" (
  start "" "release\win-unpacked\Só Mais Um Deploy.exe"
) else (
  echo Execute npm run desktop:pack para gerar o jogo Windows.
  pause
)
