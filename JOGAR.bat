@echo off
rem Abre o jogo num servidor local (o navegador bloqueia modulos e modelos em file://). Requer Python OU Node.js.
cd /d "%~dp0"
start "" http://localhost:8080/
python -m http.server 8080 2>nul || py -m http.server 8080 2>nul || npx --yes serve -l 8080 .
