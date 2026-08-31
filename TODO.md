# TODO — Relatório de Grupos de Pesquisa

Aplicação estática (`index.html` + `criterios.js` + `dashboard.js`) que valida e
pontua os grupos de pesquisa do IFBA pelo Regulamento Geral (CONSEPE) e publica
o resultado no Pages. Os dados vêm prontos do `dashboard-prpgi`:

```
scrapers (SUAP/DGP/INPI)  →  dashboard-prpgi (npm run build)  →  relatorio-grupos-pesquisa  →  Pages
        MANUAL/local            data.json + data-groups.json      scripts/atualizar-dados.sh     público
```

Situação em 31/08/2026: **parado desde 06/08** (último commit `76aa525`) e com
uma regeneração de dados **não commitada** na árvore de trabalho. O site segue
no ar (`https://prof-davifr.github.io/relatorio-grupos-pesquisa/`, HTTP 200,
`last-modified` 06/08/2026), servindo os dados da última publicação.

---

## 🟢 Concluído (ago/2026)

### Autonomia de dados e publicação
- [x] **Projeto autocontido** — `data.json` e `data-groups.json` versionados aqui e
      servidos pelo próprio Pages; acabou a dependência do Pages do dashboard (que
      nunca publicava o `data-groups.json` → 404 em produção).
- [x] **Symlinks quebrados corrigidos** — apontavam para `../dashboard-PRPGI/`
      (maiúsculas); trocados por arquivos reais copiados do `dashboard-prpgi`.
- [x] **Deploy no Pages** — `index.html` + `data.json` + `data-groups.json`, HTTP 200.
- [x] **Fix do fetch relativo** — `BASE=''` gerava `/data.json` (raiz do domínio) e
      quebrava no subpath do Pages; agora `BASE='.'` + `cache: 'no-cache'`.
- [x] **`scripts/sync-data.sh`** — copia os dados do dashboard local, injeta o mapa de
      nomes e roda a limpeza; **`scripts/atualizar-dados.sh`** encadeia build + sync +
      validação e imprime o resumo (datas das fontes e contagens).
- [x] **Smoke com dados reais** — `tests/smoke-real-data.js` roda o `ValidadorGrupo`
      contra os arquivos de verdade.
- [x] **E2E no Pages** — playwright headless: carregamento sem erro, tabela com 150+
      grupos, 0 erros de JS.

### Funcionalidades
- [x] **Modal de contribuições do pesquisador** — clique no nome abre meta (campus,
      líder, grupos, SIAPE), KPIs, composição e lista de produções por categoria.
- [x] **Nomes de servidores 100% resolvidos** — `scripts/gerar-mapa-nomes.js` extrai
      3.887 pares nome↔ID dos XLSX brutos (inclui IDs de 6 dígitos que o build ignora)
      e injeta como `servidores`. Antes: 2.623 sem nome; agora: 0.
- [x] **Ranking de Pesquisadores** — aba própria com pontuação individual, Top 10,
      composição por categoria e tabela ordenável (3.836 pesquisadores).
- [x] **Dashboard gerencial focado em produção por grupo** — filtro temporal (Todo /
      4 anos / 2 anos / custom), abas Ranking, Onde Pontuam, Campus & Área e
      Distribuição; pontuação dos grupos pelo validador oficial com cache de fatias.

### Auditoria de segurança e de dados
- [x] **XSS corrigido** — `escapeHtml` em todos os pontos de renderização, testado com
      payload real.
- [x] **Grupos 'Excluído' fora do ranking** — badge e linha atenuada na tabela.
- [x] **Dedup por título real / nº de registro** — `scripts/limpar-dados.js` regenera a
      chave a partir do texto Lattes; corrige o mesmo artigo pontuando duas vezes por
      citações divergentes.
- [x] **Duplicatas consolidadas** — mantido sempre o registro de maior pontuação.
- [x] **Unidades normalizadas** — 'Salvador' unificado com 'IFBA - Campus Salvador'.
- [x] **Aviso de ano parcial** no seletor de período.
- [x] **Badge 'sem líder'** para grupos sem `LiderId`.
- [x] **Ordenação de Orientações corrigida** (concluídas + andamento).
- [x] **Chart.js local** (`vendor/`) — sem CDN.
- [x] **`currentYear` ancorado em `meta.maxYear`** — não depende do relógio.

### Verificado em 31/08/2026
- [x] **Suíte verde sem tocar em dado nenhum** — `npx jest`: 2 suítes, 77 testes, 0,7 s;
      `node tests/smoke-real-data.js`: 197 grupos, 5 testados, 18 critérios cada,
      0 erros, soma 12.556 pontos.
- [x] **A troca da fonte de Inovação no dashboard não quebra a pontuação** — o
      `SHEET_MAP_DETALHADO` do `build.js` mantém `registros e patentes → inovacao`
      só no `data-groups.json` (988 registros do Lattes na geração de 24/08), enquanto
      o `data.json` público do dashboard já sai do INPI (265). O validador continua
      recebendo o que precisa; o que muda é o **significado** do número (ver backlog).

---

## 📋 Backlog

- [ ] **Decidir o que fazer com a regeneração pendente de `data.json` e
      `data-groups.json` — está na árvore de trabalho desde 14/08 e já nasceu velha.**
      Os dois arquivos são JSON de uma linha só, então o `git diff --stat` mostra
      `2 files changed, 2 insertions, 2 deletions` e não ajuda; o que muda é o
      conteúdo: `data.json` 20,29 MB → 19,11 MB (−1,18 MB) e `data-groups.json`
      55,19 MB → 52,77 MB (−2,42 MB). As datas das fontes são idênticas às do commit —
      é a mesma coleta reprocessada, com técnica 77.868 → 68.716 (−11,8 %),
      bibliográfica 48.359 → 47.510 e inovação 935 → 931. Enquanto isso o dashboard
      seguiu em frente: a geração de 24/08 tem **210 grupos** (14 ainda ausentes aqui,
      13 certificados e 1 em preenchimento), 50.700 bibliográficas e 26.131 orientações.
      Comitar a pendência publica um retrato intermediário; o caminho provável é
      descartá-la (`git checkout -- data.json data-groups.json`) e rodar
      `scripts/atualizar-dados.sh` contra o dashboard atual. Decisão humana: preferir
      o dado novo ou preservar a queda de 11,8 % em técnica para auditoria antes.
- [ ] **Compatibilidade de formato: `producoes.bancas/bolsas/projetos/captacao/premios`
      continuam ausentes.** Confirmado em 31/08 também na geração mais recente do
      dashboard — o `data-groups.json` traz apenas `bibliografica`, `tecnica`,
      `inovacao`, `concluidas` e `andamento`. O validador tolera (`|| []`), mas os
      indicadores dessas categorias aparecem zerados e um toast avisa. Decidir:
      pedir essas abas no build do dashboard ou remover os indicadores do relatório.
- [ ] **Inovação: o dashboard mudou de fonte e o relatório não — alinhar o critério.**
      Desde 24/08 a aba Inovação do dashboard vem do INPI (265 registros sob o CNPJ da
      instituição), enquanto a pontuação dos grupos aqui continua sobre a autodeclaração
      do Lattes (988). Os dois números vão divergir em público, no mesmo assunto e com
      a mesma marca. Falta decidir com a PRPGI o que o Regulamento manda contar —
      se for o INPI, o `data-groups.json` precisa carregar o campo e a
      `chaveMelhorada` de `limpar-dados.js` muda (o registro do INPI não tem
      `Publicacao`, a chave é o próprio número).
- [ ] **LGPD: este repositório publica mais dado pessoal do que o dashboard.** O
      `data-groups.json` servido no Pages (baixável direto, HTTP 206 em teste de faixa)
      traz nome do líder, `LiderId` (SIAPE), e-mail de contato, `PesquisadoresNomes`,
      `membrosMap` com SIAPE e o mapa `servidores` com **3.887 nomes**. O dashboard
      corrigiu vazamento equivalente em 24/08 (`2ce9fda`) e hoje pseudonimiza tudo no
      arquivo público. Falta decidir o modelo: acesso restrito (login `@ifba.edu.br`),
      pseudonimização com o nome resolvido só na sessão, ou parecer formal de que o
      dado do DGP já é público e pode ficar como está.
- [ ] **Peso do repositório: 87 MB de `.git` medidos em 31/08, e boa parte é
      desnecessária.** Cada sincronização versiona ~72 MB de JSON e o histórico só
      cresce (sem pack: `git count-objects` acusa tudo solto). O `data.json` de 19 MB é
      o pior caso — a aplicação inteira lê dele **apenas `meta`** (uma referência em
      `script.js`, cinco a `dados.meta` em `dashboard.js`); trocá-lo por um `meta.json`
      de poucos bytes corta ~20 MB por sincronização sem mudar nada na tela. Depois
      disso, reavaliar Git LFS ou geração no CI para o `data-groups.json`.
- [ ] **Mapa de campus local desatualizado e sem normalização de acento.** O
      `CAMPUS_TO_CITY` de `criterios.js` é cópia própria, tem 25 campi (falta ITA /
      Itabuna, incorporado ao dashboard em 21/08) e compara `unidade.includes(city)`
      com as cidades sem acento contra uma `Unidade` acentuada: **60 dos 197 grupos**
      (Vitória da Conquista, Eunápolis, Ilhéus, Valença, Camaçari, Jequié, Simões
      Filho, Irecê, Santo Antônio de Jesus) resolvem para `null`. Hoje é latente —
      todos os grupos têm `membroIds`, e a filtragem por campus só é usada como
      fallback —, mas é o mesmo defeito de acento que o dashboard já documentou, e ele
      volta a morder no primeiro grupo sem membros resolvidos. Corrigir normalizando
      texto e, de preferência, consumindo o `src/shared.js` do dashboard em vez de
      manter cópia.
- [ ] **Teste visual humano dos gráficos** — conferir cores, formatos, títulos de eixo
      e legendas com quem usa o relatório. Nenhum teste automatizado cobre render.
