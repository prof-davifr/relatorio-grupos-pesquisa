#!/usr/bin/env node
/* Limpeza de dados do data-groups.json:
 * 1. Deduplica registros com a MESMA chave (dedupKey + Servidor + Ano), mantendo
 *    o de MAIOR pontuação (via mapProducaoToCategoria + SCORING_TABLE) — quando o
 *    mesmo trabalho foi raspado 2x com Qualis/Tipo divergentes, prevalece o melhor.
 * 2. Normaliza nomes de unidades ("Salvador" → "IFBA - Campus Salvador").
 *
 * Uso: node scripts/limpar-dados.js [caminho-do-data-groups.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(__dirname, '..', 'data-groups.json');
const { mapProducaoToCategoria, SCORING_TABLE } = require('../criterios.js');

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const UNIDADE_NORM = { 'Salvador': 'IFBA - Campus Salvador' };

/** Pontos de um registro (0 se não mapear). */
function pontosDe(r) {
    const m = mapProducaoToCategoria(r.Tipo || '', r.Subtipo || '', r.Estrato || '', r.concluida);
    if (!m) return 0;
    const item = SCORING_TABLE[m.categoria]?.items.find((i) => i.id === m.itemId);
    return item ? item.pontos : 0;
}

let removidos = 0;
for (const cat of Object.keys(data.producoes || {})) {
    const arr = data.producoes[cat];
    const grupos = new Map(); // chave → {melhor, pontos}
    const ordem = [];
    for (const r of arr) {
        const chave = `${r.dedupKey || ''}|${r.Servidor || ''}|${r.Ano || ''}`;
        const pts = pontosDe(r);
        if (!grupos.has(chave)) { grupos.set(chave, { melhor: r, pts }); ordem.push(chave); }
        else {
            const g = grupos.get(chave);
            // mantém o de MAIOR pontuação; empate → o primeiro
            if (pts > g.pts) { g.melhor = r; g.pts = pts; }
            removidos++;
        }
        if (r.unidade && UNIDADE_NORM[r.unidade]) r.unidade = UNIDADE_NORM[r.unidade];
    }
    data.producoes[cat] = ordem.map((k) => grupos.get(k).melhor);
}

let gruposNorm = 0;
for (const g of data.grupos || []) {
    if (g.Unidade && UNIDADE_NORM[g.Unidade]) { g.Unidade = UNIDADE_NORM[g.Unidade]; gruposNorm++; }
}

fs.writeFileSync(FILE, JSON.stringify(data, (k, v) => v === null ? undefined : v));
const mb = (Buffer.byteLength(fs.readFileSync(FILE)) / 1024 / 1024).toFixed(1);
console.log(`✓ ${removidos} registros duplicados consolidados (mantido o de maior pontuação), ${gruposNorm} unidades normalizadas — ${mb} MB`);
