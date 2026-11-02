@echo off
cd /d "%~dp0"
echo Abra http://127.0.0.1:5173 no navegador.
echo Mantenha esta janela aberta durante o jogo.
call npm run dev
pause
