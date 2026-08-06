#!/usr/bin/env node
/* Gera o mapa Servidor→nome a partir dos XLSX brutos do dashboard-prpgi/dados
 * e injeta no data-groups.json como `servidores`. Resolve IDs de 6 dígitos que
 * o build.js não captura (regex dele exige 7+) e servidores fora dos grupos.
 *
 * Uso: node scripts/gerar-mapa-nomes.js [caminho-do-dashboard]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DASH = process.argv[2] || path.join(__dirname, '..', '..', 'dashboard-prpgi');
const DEST = path.join(__dirname, '..', 'data-groups.json');
const RE_VINCULO = /<Vinculo: (.+?) \((\d{5,})\) \(Servidor\)/g;

let XLSX;
try { XLSX = require('xlsx'); }
catch { XLSX = require(path.join(DASH, 'node_modules', 'xlsx')); }

const mapa = new Map(); // id → nome

function processar(file) {
    try {
        const wb = XLSX.readFile(file);
        for (const sheet of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { raw: false, defval: null });
            for (const r of rows) {
                const v = r['Servidor'] || r['Vinculo'] || '';
                if (!v) continue;
                for (const m of v.matchAll(RE_VINCULO)) {
                    const id = m[2];
                    const nome = m[1].trim();
                    if (!mapa.has(id)) mapa.set(id, nome);
                }
            }
        }
    } catch { /* arquivo corrompido/incompatível: pula */ }
}

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.xlsx?$/i.test(e.name)) processar(p);
    }
}

if (!fs.existsSync(path.join(DASH, 'dados'))) {
    console.error(`ERRO: pasta ${path.join(DASH, 'dados')} não encontrada`);
    process.exit(1);
}
walk(path.join(DASH, 'dados'));
console.log(`Pares nome↔ID extraídos: ${mapa.size}`);

const groupsData = JSON.parse(fs.readFileSync(DEST, 'utf8'));
groupsData.servidores = Object.fromEntries(mapa);
fs.writeFileSync(DEST, JSON.stringify(groupsData, (k, v) => v === null ? undefined : v));
const mb = (Buffer.byteLength(fs.readFileSync(DEST)) / 1024 / 1024).toFixed(1);
console.log(`data-groups.json atualizado com 'servidores' (${Object.keys(groupsData.servidores).length} nomes) — ${mb} MB`);
