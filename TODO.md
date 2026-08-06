# TODO — relatorio-grupos-pesquisa

## ✅ Concluído (ago/2025)

- [x] **Tornar o projeto autocontido** — `data.json` e `data-groups.json` agora são versionados neste repo e servidos pelo próprio GitHub Pages; removida dependência do Pages do dashboard (que nunca publicava `data-groups.json` → 404 em produção).
- [x] **Corrigir symlinks quebrados** — apontavam para `../dashboard-PRPGI/` (maiúsculas); substituídos por arquivos reais copiados do `dashboard-prpgi`.
- [x] **Validar compatibilidade com dados novos** — `tests/smoke-real-data.js` roda o `ValidadorGrupo` contra os dados reais (197 grupos; 5 testados, 0 erros, todos pontuando).
- [x] **Deploy no Pages** — `https://prof-davifr.github.io/relatorio-grupos-pesquisa/` servindo `index.html` + `data.json` (22MB) + `data-groups.json` (66MB) — HTTP 200.
- [x] **Script de sync** — `scripts/sync-data.sh` copia os dados do dashboard local e prepara o commit.
- [x] **Fix do fetch relativo** — `${BASE}/data.json` com `BASE=''` gerava `/data.json` (raiz do domínio) e quebrava no subpath do Pages; agora `BASE='.'` + `cache: 'no-cache'`.
- [x] **Teste E2E no Pages** — playwright (headless) validou: sem erro de carregamento, tabela com 150+ grupos, 0 erros JS em `https://prof-davifr.github.io/relatorio-grupos-pesquisa/`.
- [x] **Modal de contribuições do pesquisador** — clique no nome (top 10 ou tabela) abre modal com meta (campus, líder, grupos, SIAPE), KPIs, doughnut de composição e lista de produções por categoria (título, ano, periódico, estrato, pontos). Fechar via botão/fora/Esc.
- [x] **Nomes de servidores 100% resolvidos** — `scripts/gerar-mapa-nomes.js` extrai pares nome↔ID dos XLSX brutos do dashboard (3.887 nomes, inclui IDs de 6 dígitos que o build ignora) e injeta como `servidores` no data-groups.json; dashboard normaliza registros com Servidor sujo (`<VinculoQueryset...>`). Antes: 2.623 sem nome; agora: 0. SUAP não foi necessário (XLSX cobre tudo) — fica como fallback futuro.
- [x] **Ranking de Pesquisadores** — aba própria com pontuação individual (mesma regra do validador, dedup por categoria), Top 10, composição por categoria, tabela ordenável/buscável (3.836 pesquisadores), badge de líder, recorte temporal ativo.
- [x] **Dashboard gerencial (foco produção por grupo)** — botão “📊 Dashboard” ao lado de “Relatório Pré-preenchido”. Removeu-se consolidação nível IFBA (é do dashboard-prpgi). **Filtro temporal ativo** (Todo / 4 anos / 2 anos / custom) recorta o ranking de pontuação. Abas: Ranking de Grupos (breakdown por categoria), Onde Pontuam (composição + stacked top 15 + top 10 por categoria), Campus & Área, Distribuição. Pontuação dos 197 grupos via validador oficial com cache de fatias (0.2s). E2E no Pages: recorte 711.354 → 27.163 pts, ranking muda, 0 erros JS.

## ✅ Auditoria concluída (ago/2025)

- [x] **XSS corrigido** — escapeHtml em todos os pontos de renderização; testado com payload real (executou como texto, 0 HTML cru).
- [x] **Excluídos fora do ranking** — grupos 'Excluído' não competem no Top 10/risco; badge + linha atenuada na tabela.
- [x] **Dedup por título real/nº de registro** — `limpar-dados.js` regenera o dedupKey (título extraído do formato Lattes; nº de registro p/ inovação). Corrige o mesmo artigo com citações divergentes pontuando 2x (caso Davi Franco Rego). 11.539 duplicatas consolidadas; soma de pontos 711.657→655.220.
- [x] **Duplicatas consolidadas** — `scripts/limpar-dados.js` (4.865 registros; mantido o de maior pontuação); inovação 935→765; soma pontos 711.354→711.657 (corrigida).
- [x] **Unidades normalizadas** — 'Salvador' unificado (94 grupos); `unidadeCanonica` no dashboard.
- [x] **Aviso de ano parcial** no período (2026 em curso).
- [x] **Badge 'sem líder'** (14 grupos sem LiderId).
- [x] **Sort Orient. corrigido** (concluídas+andamento).
- [x] **Chart.js local** (vendor/) — fim da dependência de CDN.
- [x] **currentYear ancorado em meta.maxYear** (não depende do relógio).

## 🔄 Em andamento

- [ ] **Compatibilidade de formato**: `data-groups.json` novo não tem `producoes.bancas/bolsas/projetos/captacao/premios` — o validador tolera (usa `|| []`), mas os indicadores aparecem zero e um toast avisa. Decidir: adicionar essas abas no build do dashboard OU remover os indicadores do relatório.

## ⏳ Backlog

- [ ] **Teste visual humano** — conferir se as cores/formatos dos gráficos agradam; ajustar títulos de eixo e legendas se preciso.
- [ ] **Verificar peso do repo** — 89MB de dados versionados incham o git; avaliar Git LFS ou build no CI (GH Actions regenera os dados no push) se o repo crescer muito.
- [ ] **LGPD / acesso restrito** (quando for relevante) — os dados contêm PII (SIAPE, nomes). Opção futura: login com conta `@ifba.edu.br` via Google OAuth.
