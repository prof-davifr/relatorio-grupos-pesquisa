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

// ── chave de dedup melhorada ────────────────────────────────────────────────
function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/** Título real no formato Lattes: 'AUTORES ; AUTORES . TÍTULO. PERIÓDICO, v.x...'. */
function tituloReal(pub) {
    const corpo = String(pub || '').split(/,\s*(?:v|vol)\.\s*\d/)[0] || '';
    const partes = corpo.split(' ; ');
    const ultima = partes[partes.length - 1] || '';
    const sep = ' . ';
    let resto = corpo;
    if (ultima.includes(sep)) resto = ultima.split(sep)[1] || resto;
    else if (corpo.includes(sep)) resto = corpo.split(sep)[1] || resto;
    if (resto.includes('. ')) resto = resto.split('. ')[0];
    return norm(resto);
}

/** Número de registro (patentes/softwares) — 'Número do registro: BR512020000003-7'. */
function numeroRegistro(pub) {
    const m = String(pub || '').match(/N[úu]mero do registro:\s*([^,;]+)/i);
    return m ? norm(m[1]) : '';
}

/** Chave de dedup: título real (ou nº de registro p/ inovação), min 12 chars. */
function chaveMelhorada(r) {
    const pub = r.Publicacao || r.Publicação || r.titulo || r.Título || r.Nome || '';
    const tipo = String(r.Tipo || '').toLowerCase();
    let ch = '';
    if (tipo.includes('software') || tipo.includes('patente') || tipo.includes('desenho')) {
        ch = numeroRegistro(pub) || tituloReal(pub);
    } else {
        ch = tituloReal(pub);
    }
    if (ch.length >= 12) return ch;
    return r.dedupKey || ch; // fallback: dedupKey original
}

/** Pontos de um registro (0 se não mapear). */
function pontosDe(r) {
    const m = mapProducaoToCategoria(r.Tipo || '', r.Subtipo || '', r.Estrato || '', r.concluida);
    if (!m) return 0;
    const item = SCORING_TABLE[m.categoria]?.items.find((i) => i.id === m.itemId);
    return item ? item.pontos : 0;
}

let removidos = 0, chavesMelhoradas = 0;
for (const cat of Object.keys(data.producoes || {})) {
    const arr = data.producoes[cat];
    const grupos = new Map(); // chave → {melhor, pontos}
    const ordem = [];
    for (const r of arr) {
        // dedupKey melhorado (título real / nº de registro) + Servidor + Ano
        const chave = `${chaveMelhorada(r)}|${r.Servidor || ''}|${r.Ano || ''}`;
        const pts = pontosDe(r);
        if (r.dedupKey !== chaveMelhorada(r)) chavesMelhoradas++;
        if (!grupos.has(chave)) { grupos.set(chave, { melhor: r, pts }); ordem.push(chave); }
        else {
            const g = grupos.get(chave);
            // mantém o de MAIOR pontuação; empate → o primeiro
            if (pts > g.pts) { g.melhor = r; g.pts = pts; }
            removidos++;
        }
        if (r.unidade && UNIDADE_NORM[r.unidade]) r.unidade = UNIDADE_NORM[r.unidade];
    }
    // grava o dedupKey melhorado no registro mantido
    data.producoes[cat] = ordem.map((k) => {
        const melhor = grupos.get(k).melhor;
        melhor.dedupKey = chaveMelhorada(melhor);
        return melhor;
    });
}

let gruposNorm = 0;
for (const g of data.grupos || []) {
    if (g.Unidade && UNIDADE_NORM[g.Unidade]) { g.Unidade = UNIDADE_NORM[g.Unidade]; gruposNorm++; }
}

fs.writeFileSync(FILE, JSON.stringify(data, (k, v) => v === null ? undefined : v));
const mb = (Buffer.byteLength(fs.readFileSync(FILE)) / 1024 / 1024).toFixed(1);
console.log(`✓ ${removidos} registros duplicados consolidados (mantido o de maior pontuação), ${gruposNorm} unidades normalizadas — ${mb} MB`);
