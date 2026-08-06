'use strict';
// Smoke test: roda o ValidadorGrupo real contra os dados REAIS do dashboard.
// Uso: node tests/smoke-real-data.js [índice-do-grupo]
const { ValidadorGrupo } = require('../criterios.js');
const fs = require('fs');

const dashboardData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const groupsData = JSON.parse(fs.readFileSync('data-groups.json', 'utf8'));

console.log(`data.json: meta.minYear=${dashboardData.meta.minYear} maxYear=${dashboardData.meta.maxYear}`);
console.log(`data-groups.json: ${groupsData.grupos.length} grupos, producoes keys=${Object.keys(groupsData.producoes).join(', ')}`);
console.log();

const alvos = process.argv[2] ? [parseInt(process.argv[2])] : [0, 1, 2, 100, 196];

let total = 0, comProducao = 0, erros = 0;
for (const idx of alvos) {
    const g = groupsData.grupos[idx];
    if (!g) { console.log(`[${idx}] grupo inexistente`); continue; }
    try {
        const v = new ValidadorGrupo(g, groupsData, dashboardData, 'custom', null);
        const r = v.validar();
        const totalPts = r.pontuacao?.total ?? 0;
        total += totalPts;
        if (r.pontuacao?.total > 0) comProducao++;
        const nCriterios = (r.criterios || []).length;
        console.log(`[${idx}] ${(g.Nome||'').slice(0,40).padEnd(42)} pts=${String(totalPts).padStart(5)} criterios=${nCriterios} membros=${(g.membroIds||[]).length}`);
    } catch (e) {
        erros++;
        console.log(`[${idx}] ${(g.Nome||'').slice(0,40)} ERRO: ${e.message}`);
    }
}
console.log();
console.log(`RESULTADO: ${alvos.length} grupos testados, ${comProducao} com produção>0, ${erros} erros, soma pontos=${total}`);
process.exit(erros ? 1 : 0);
