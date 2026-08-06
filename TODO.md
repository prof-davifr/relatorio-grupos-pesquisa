# TODO — relatorio-grupos-pesquisa

## ✅ Concluído (ago/2025)

- [x] **Tornar o projeto autocontido** — `data.json` e `data-groups.json` agora são versionados neste repo e servidos pelo próprio GitHub Pages; removida dependência do Pages do dashboard (que nunca publicava `data-groups.json` → 404 em produção).
- [x] **Corrigir symlinks quebrados** — apontavam para `../dashboard-PRPGI/` (maiúsculas); substituídos por arquivos reais copiados do `dashboard-prpgi`.
- [x] **Validar compatibilidade com dados novos** — `tests/smoke-real-data.js` roda o `ValidadorGrupo` contra os dados reais (197 grupos; 5 testados, 0 erros, todos pontuando).
- [x] **Deploy no Pages** — `https://prof-davifr.github.io/relatorio-grupos-pesquisa/` servindo `index.html` + `data.json` (22MB) + `data-groups.json` (66MB) — HTTP 200.
- [x] **Script de sync** — `scripts/sync-data.sh` copia os dados do dashboard local e prepara o commit.
- [x] **Fix do fetch relativo** — `${BASE}/data.json` com `BASE=''` gerava `/data.json` (raiz do domínio) e quebrava no subpath do Pages; agora `BASE='.'` + `cache: 'no-cache'`.
- [x] **Teste E2E no Pages** — playwright (headless) validou: sem erro de carregamento, tabela com 150+ grupos, 0 erros JS em `https://prof-davifr.github.io/relatorio-grupos-pesquisa/`.
- [x] **Dashboard gerencial (foco produção por grupo)** — botão “📊 Dashboard” ao lado de “Relatório Pré-preenchido”. Removeu-se consolidação nível IFBA (é do dashboard-prpgi). **Filtro temporal ativo** (Todo / 4 anos / 2 anos / custom) recorta o ranking de pontuação. Abas: Ranking de Grupos (breakdown por categoria), Onde Pontuam (composição + stacked top 15 + top 10 por categoria), Campus & Área, Distribuição. Pontuação dos 197 grupos via validador oficial com cache de fatias (0.2s). E2E no Pages: recorte 711.354 → 27.163 pts, ranking muda, 0 erros JS.

## 🔄 Em andamento

- [ ] **Compatibilidade de formato**: `data-groups.json` novo não tem `producoes.bancas/bolsas/projetos/captacao/premios` — o validador tolera (usa `|| []`), mas os indicadores aparecem zero e um toast avisa. Decidir: adicionar essas abas no build do dashboard OU remover os indicadores do relatório.

## ⏳ Backlog

- [ ] **Teste visual humano** — conferir se as cores/formatos dos gráficos agradam; ajustar títulos de eixo e legendas se preciso.
- [ ] **Verificar peso do repo** — 89MB de dados versionados incham o git; avaliar Git LFS ou build no CI (GH Actions regenera os dados no push) se o repo crescer muito.
- [ ] **LGPD / acesso restrito** (quando for relevante) — os dados contêm PII (SIAPE, nomes). Opção futura: login com conta `@ifba.edu.br` via Google OAuth.
