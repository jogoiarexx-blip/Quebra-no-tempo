#!/bin/sh
# Abre o jogo compilado (dist) em servidor local
cd "$(dirname "$0")/dist" && (python3 -m http.server 8080 || npx --yes serve -l 8080 .)
