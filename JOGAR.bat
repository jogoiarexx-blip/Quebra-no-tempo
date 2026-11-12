@echo off
rem Abre o jogo ja compilado (pasta dist) em um servidor local. Requer Python OU Node.js instalado.
cd /d "%~dp0dist"
start "" http://localhost:8080/
python -m http.server 8080 2>nul || py -m http.server 8080 2>nul || npx --yes serve -l 8080 .
