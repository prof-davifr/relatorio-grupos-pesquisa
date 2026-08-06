#!/usr/bin/env bash
# Atualiza os dados do relatório a partir do dashboard local.
#
# Fluxo completo (ver README "Atualizando os dados"):
#   1. [MANUAL] Rodar os scrapers para coletar dados brutos do SUAP/DGP:
#        scraper-SUAPCNPQ  -> dados/scraper-SUAPCNPQ/*.xlsx   (login SUAP)
#        scraper-DGP       -> dados/scraper-DGP/*.csv         (coletor web)
#   2. Este script: build do dashboard + sync + validação.
#   3. [MANUAL] Revisar e publicar: git add/commit/push (o Pages publica).
#
# Uso:
#   scripts/atualizar-dados.sh            # usa os data.json já buildados
#   scripts/atualizar-dados.sh --build    # roda o build do dashboard antes
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)"
DASH="$DEST/../dashboard-prpgi"
DO_BUILD=0
if [[ "${1:-}" == "--build" ]]; then DO_BUILD=1; fi

if [[ ! -f "$DASH/data.json" || ! -f "$DASH/data-groups.json" ]]; then
  echo "ERRO: dashboard não encontrado em $DASH (data.json/data-groups.json ausentes)" >&2
  exit 1
fi

echo "── 1/4 Build do dashboard ──────────────────────────────────────────────"
if [[ "$DO_BUILD" == "1" ]]; then
  (cd "$DASH" && npm run build) || { echo "Build falhou" >&2; exit 1; }
else
  echo "  usando data.json/data-groups.json já existentes em $DASH"
fi

echo "── 2/4 Sync para o relatório ───────────────────────────────────────────"
"$DEST/scripts/sync-data.sh" "$DASH"

echo "── 3/4 Validação ───────────────────────────────────────────────────────"
(cd "$DEST" && npm test)
node "$DEST/tests/smoke-real-data.js"

echo "── 4/4 Resumo ──────────────────────────────────────────────────────────"
python3 -c "
import json
d = json.load(open('$DEST/data.json'))
g = json.load(open('$DEST/data-groups.json'))
print(f'  Gerado em:  {d[\"meta\"].get(\"generatedAt\")}')
for k, v in d['meta'].get('sourceDates', {}).items():
    print(f'  Fonte {k}: modificada em {v.get(\"modifiedAt\")}')
print(f'  Grupos: {len(g[\"grupos\"])} | Produções: ' + ', '.join(f'{c}={len(g[\"producoes\"][c])}' for c in g['producoes']))
"

echo
echo "✓ Dados atualizados. Para publicar no Pages:"
echo "  cd $DEST"
echo "  git add -A && git commit -m 'sync: dados atualizados' && git push"
echo "  (O GitHub Pages publica sozinho em 1-3 min; limite de 10 builds/hora)"
