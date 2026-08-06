# Relatorio de Validacao de Grupos de Pesquisa -- PRPGI/IFBA

Aplicacao web estatica para validacao e geracao de relatorios PDF dos grupos de pesquisa do IFBA, conforme o Regulamento Geral dos Grupos de Pesquisa (CONSEPE) e as regras do Diretorio de Grupos de Pesquisa do CNPq (DGP).

## Funcionalidades

- Importacao automatica dos dados dos grupos de pesquisa via GitHub Pages
- Validacao de grupos conforme criterios pre-definidos (producoes, projetos, membros, grupos)
- Pontuacao por categorias (projetos, producao bibliografica, producao tecnica, orientacoes)
- Visualizacao por campus com totais agregados e graficos
- Geracao de relatorio PDF individual por grupo
- Filtros por status, campus, periodo e busca textual
- Exibicao de especificacoes detalhadas dos criterios de validacao

## Tecnologias

- HTML5 + CSS3 (vanilla, sem frameworks)
- JavaScript (ES6) puro
- html2pdf.js para exportacao PDF
- Chart.js para graficos
- Jest para testes unitarios
- live-server para desenvolvimento local
- GitHub Pages para deploy

## Estrutura

```
├── index.html              # Interface principal
├── script.js               # Logica UI, filtros e geracao de PDF
├── criterios.js            # Motor de validacao e pontuacao (853 linhas)
├── style.css               # Estilos da aplicacao
├── specs-validacao.html    # Pagina com especificacoes dos criterios
├── data.json               # Dados versionados (producoes, metricas)
├── data-groups.json        # Dados versionados (grupos detalhados, producoes)
├── scripts/sync-data.sh    # Sincroniza dados do dashboard local
├── tests/                  # Testes unitarios (Jest) + smoke test com dados reais
├── package.json
└── regulamento_dos_grupos_de_pesquisa1.pdf  # Base legal
```

## Dependencia de dados

Este repositorio e **autocontido**: os arquivos `data.json` e `data-groups.json` sao
versionados aqui e servidos pelo proprio GitHub Pages deste projeto, ao lado do
`index.html`. Nao ha dependencia do Pages do dashboard.

- `data.json` -- producao academica compilada (bibliografica, tecnica, inovacao, orientacoes)
- `data-groups.json` -- grupos com lideres, membros, area, unidade e producoes detalhadas

Ambos sao gerados por `dashboard-PRPGI/build.js` (a partir dos scrapers SUAP/CNPq + DGP)
e sincronizados para ca com:

```bash
scripts/sync-data.sh        # copia data.json e data-groups.json do dashboard local
npm test                    # testes unitarios + smoke test com dados reais
git add -A && git commit -m "sync: dados do dashboard" && git push
```

Em **desenvolvimento local**, os dados ja estao na raiz (versionados), basta `npm start`.

## Desenvolvimento

### Pre-requisitos

- Node.js (para ferramentas de desenvolvimento)

### Setup

```bash
npm install
npm start     # live-server na porta 8081
```

### Testes

```bash
npm test      # Jest
```

## Deploy

Push para `main` -> GitHub Pages em `https://prof-davifr.github.io/relatorio-grupos-pesquisa/`

## Base legal

- Regulamento Geral dos Grupos de Pesquisa do IFBA (CONSEPE)
- Diretorio de Grupos de Pesquisa do CNPq (DGP)

## Projetos relacionados

- [dashboard-PRPGI](https://github.com/prof-davifr/dashboard-prpgi) -- fornece os dados de entrada
- [scraper-DGP](https://github.com/prof-davifr/scraper-DGP) -- coleta dos dados do DGP/CNPq
