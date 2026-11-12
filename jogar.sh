#!/bin/sh
# Abre o jogo num servidor local (o navegador bloqueia modulos em file://)
cd "$(dirname "$0")" && (python3 -m http.server 8080 || npx --yes serve -l 8080 .)
