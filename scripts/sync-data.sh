#!/usr/bin/env bash
# Sincroniza os dados gerados pelo dashboard-prpgi/build.js para este repo.
# Este projeto é autocontido: versiona os próprios dados e os publica no Pages.
#
# Uso:
#   scripts/sync-data.sh              # copia do dashboard local
#   scripts/sync-data.sh /caminho     # copia de outro local
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$(cd "$DEST/../dashboard-prpgi" 2>/dev/null && pwd)}"

if [[ ! -f "$SRC/data.json" || ! -f "$SRC/data-groups.json" ]]; then
  echo "ERRO: não encontrei data.json/data-groups.json em $SRC" >&2
  echo "Rode primeiro o build do dashboard: cd ../dashboard-prpgi && npm run build" >&2
  exit 1
fi

cp "$SRC/data.json" "$SRC/data-groups.json" "$DEST/"

# Injeta o mapa Servidor→nome extraído dos XLSX brutos (resolve nomes que o
# build.js não captura: IDs de 6 dígitos, servidores fora dos grupos)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/gerar-mapa-nomes.js" "$SRC"

echo "Dados sincronizados:"
ls -la "$DEST"/data*.json
echo
echo "Próximos passos: npm test && git add -A && git commit -m 'sync: dados do dashboard' && git push"
