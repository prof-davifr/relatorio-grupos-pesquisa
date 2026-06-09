# Relatório de Validação de Grupos de Pesquisa — PRPGI/IFBA

Aplicação web estática para validação e geração de relatórios PDF dos grupos de pesquisa do IFBA, conforme o Regulamento Geral dos Grupos de Pesquisa (CONSEPE).

## Dependência de dados

Os dados são servidos pelo repositório [dashboard-PRPGI](https://github.com/prof-davifr/dashboard-prpgi) via GitHub Pages:

- `data.json` — dados do dashboard (grupos, métricas)
- `data-groups.json` — dados detalhados dos grupos (produções, membros, SIAPE)

Em **produção** (GitHub Pages), os arquivos são buscados automaticamente em `https://prof-davifr.github.io/dashboard-prpgi/`.

Em **desenvolvimento local**, copie `data.json` e `data-groups.json` da raiz do repo dashboard-PRPGI para a raiz deste projeto e execute:

```bash
npm install
npm start   # live-server na porta 8081
```

## Estrutura

```
├── index.html          # Interface principal
├── script.js           # Lógica UI + geração de PDF
├── criterios.js        # Motor de validação e pontuação
├── style.css           # Estilos
├── specs-validacao.html # Especificações dos critérios
└── tests/              # Testes unitários (Jest)
```

## Testes

```bash
npm test
```

## Deploy

Push para `main` → GitHub Pages em `https://prof-davifr.github.io/relatorio-grupos-pesquisa/`
