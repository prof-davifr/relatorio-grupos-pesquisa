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
├── data.json               # Dados do dashboard (grupos, metricas) [dev]
├── data-groups.json        # Dados detalhados dos grupos [dev]
├── tests/                  # Testes unitarios (Jest)
├── package.json
└── regulamento_dos_grupos_de_pesquisa1.pdf  # Base legal
```

## Dependencia de dados

Os dados sao servidos pelo repositorio [dashboard-PRPGI](https://github.com/prof-davifr/dashboard-prpgi) via GitHub Pages:

- `data.json` -- dados do dashboard (grupos, metricas)
- `data-groups.json` -- dados detalhados dos grupos (producoes, membros, SIAPE)

Em **producao** (GitHub Pages), os arquivos sao buscados automaticamente de `https://prof-davifr.github.io/dashboard-prpgi/`.

Em **desenvolvimento local**, copie `data.json` e `data-groups.json` da raiz do repositorio dashboard-PRPGI para a raiz deste projeto.

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
