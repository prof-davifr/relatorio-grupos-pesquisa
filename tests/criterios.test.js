'use strict';

// criterios.js uses `if (typeof module !== 'undefined') module.exports = { … }`
// so it can be required directly in Node without any browser shim.
const { mapProducaoToCategoria, ValidadorGrupo, SCORING_TABLE, parseLinhasPesquisa } = require('../criterios.js');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build the minimal dashboardData object that ValidadorGrupo expects. */
function makeDashboard({ minYear = 2000, maxYear = 2024 } = {}) {
    return { meta: { minYear, maxYear } };
}

/**
 * Build the minimal groupsData object.
 * `producoes` shape mirrors what build.js produces.
 */
function makeGroupsData(producoes = {}) {
    return {
        grupos: [],
        producoes: {
            bibliografica: [],
            tecnica: [],
            inovacao: [],
            concluidas: [],
            andamento: [],
            bancas: [],
            bolsas: [],
            projetos: [],
            captacao: [],
            premios: [],
            ...producoes,
        },
    };
}

/** Build a minimal grupo object for testing. */
function makeGrupo(overrides = {}) {
    return {
        Nome: 'Grupo Teste',
        Area: 'Ciência da Computação',
        Unidade: 'IFBA - Campus Salvador',
        Situacao: 'Certificado',
        Pesquisadores: '5',
        Estudantes: '2',
        ApoioTecnico: '1',
        LinhasPesquisa: 'IA; Robótica; Redes',
        UltimoEnvio: '2024',
        AnoFormacao: '2015', // 9 years → "Consolidado"
        RelatorioBienal: true,
        RegulamentoInterno: true,
        LiderAdimplente: true,
        LiderTitulacao: true,
        LiderUnico: true,
        membroIds: [],
        ...overrides,
    };
}

// ─── parseLinhasPesquisa ──────────────────────────────────────────────────────

describe('parseLinhasPesquisa', () => {
    test('returns 0 for empty string', () => {
        expect(parseLinhasPesquisa('')).toBe(0);
    });

    test('returns 0 for null / undefined', () => {
        expect(parseLinhasPesquisa(null)).toBe(0);
        expect(parseLinhasPesquisa(undefined)).toBe(0);
    });

    test('parses a pure integer string', () => {
        expect(parseLinhasPesquisa('3')).toBe(3);
        expect(parseLinhasPesquisa('0')).toBe(0);
    });

    test('counts semicolon-separated non-empty entries', () => {
        expect(parseLinhasPesquisa('IA; Robótica; Redes')).toBe(3);
        expect(parseLinhasPesquisa('IA;Robótica')).toBe(2);
    });

    test('ignores empty segments in a list', () => {
        expect(parseLinhasPesquisa(';IA;;Robótica;')).toBe(2);
    });
});

// ─── mapProducaoToCategoria ───────────────────────────────────────────────────

describe('mapProducaoToCategoria', () => {
    // Bibliographic
    test('maps artigo with Qualis A to bibliografica 2.10', () => {
        const r = mapProducaoToCategoria('Artigo em Periódico', '', 'A1', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.10' });
    });

    test('maps artigo with Qualis B to bibliografica 2.9', () => {
        const r = mapProducaoToCategoria('Artigo em Periódico', '', 'B2', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.9' });
    });

    test('maps artigo without Qualis to bibliografica 2.8', () => {
        const r = mapProducaoToCategoria('Artigo em Periódico', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.8' });
    });

    test('maps livro to bibliografica 2.12', () => {
        const r = mapProducaoToCategoria('Livro', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.12' });
    });

    test('maps capítulo de livro to bibliografica 2.11', () => {
        // The type must contain "capítulo" but NOT "livro" to avoid the earlier livro check.
        const r = mapProducaoToCategoria('Capítulo com ISBN', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.11' });
    });

    test('maps trabalho em evento nacional to bibliografica 2.2', () => {
        const r = mapProducaoToCategoria('Trabalho em Evento Nacional', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.2' });
    });

    test('maps trabalho completo em evento nacional to bibliografica 2.6', () => {
        const r = mapProducaoToCategoria('Trabalho Completo em Evento Nacional', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.6' });
    });

    test('maps trabalho em evento internacional to bibliografica 2.3', () => {
        const r = mapProducaoToCategoria('Trabalho em Evento Internacional', '', '', undefined);
        expect(r).toEqual({ categoria: 'bibliografica', itemId: '2.3' });
    });

    // Section 6 — Events (from SUAP Produções Técnicas sheet)
    test('maps "Apresentações de Trabalho" to eventos 6.1 (national default)', () => {
        const r = mapProducaoToCategoria('Apresentações de Trabalho', 'Nacional', '', undefined);
        expect(r).toEqual({ categoria: 'eventos', itemId: '6.1' });
    });

    test('maps "Apresentações de Trabalho" internacional to eventos 6.2', () => {
        const r = mapProducaoToCategoria('Apresentações de Trabalho', 'Internacional', '', undefined);
        expect(r).toEqual({ categoria: 'eventos', itemId: '6.2' });
    });

    test('maps "Organização de Eventos" nacional to eventos 6.3', () => {
        const r = mapProducaoToCategoria('Organização de Eventos', 'Nacional', '', undefined);
        expect(r).toEqual({ categoria: 'eventos', itemId: '6.3' });
    });

    test('maps "Organização de Eventos" regional to eventos 6.4', () => {
        const r = mapProducaoToCategoria('Organização de Eventos', 'Regional', '', undefined);
        expect(r).toEqual({ categoria: 'eventos', itemId: '6.4' });
    });

    // Innovation
    test('maps software to inovacao 5.1', () => {
        const r = mapProducaoToCategoria('Software com registro', '', '', undefined);
        expect(r).toEqual({ categoria: 'inovacao', itemId: '5.1' });
    });

    test('maps patente concedida to inovacao 5.8', () => {
        const r = mapProducaoToCategoria('Patente concedida', '', '', undefined);
        expect(r).toEqual({ categoria: 'inovacao', itemId: '5.8' });
    });

    test('maps depósito de patente to inovacao 5.7', () => {
        const r = mapProducaoToCategoria('Depósito de Patente', '', '', undefined);
        expect(r).toEqual({ categoria: 'inovacao', itemId: '5.7' });
    });

    // Technical
    test('maps consultoria to tecnica 3.1', () => {
        const r = mapProducaoToCategoria('Consultoria', '', '', undefined);
        expect(r).toEqual({ categoria: 'tecnica', itemId: '3.1' });
    });

    test('maps extensão tecnológica to tecnica 3.2', () => {
        const r = mapProducaoToCategoria('Extensão Tecnológica', '', '', undefined);
        expect(r).toEqual({ categoria: 'tecnica', itemId: '3.2' });
    });

    // Orientações
    test('maps mestrado concluído to orientacoesConcluidas 7.6', () => {
        const r = mapProducaoToCategoria('Mestrado', '', '', true);
        expect(r).toEqual({ categoria: 'orientacoesConcluidas', itemId: '7.6' });
    });

    test('maps mestrado em andamento to orientacoesAndamento 8.6', () => {
        const r = mapProducaoToCategoria('Mestrado', '', '', false);
        expect(r).toEqual({ categoria: 'orientacoesAndamento', itemId: '8.6' });
    });

    test('maps coorientação de mestrado concluído to orientacoesConcluidas 7.5', () => {
        const r = mapProducaoToCategoria('Mestrado coorientação', '', '', true);
        expect(r).toEqual({ categoria: 'orientacoesConcluidas', itemId: '7.5' });
    });

    test('maps TCC graduação concluído to orientacoesConcluidas 7.2', () => {
        const r = mapProducaoToCategoria('Orientações de Graduação', '', '', true);
        expect(r).toEqual({ categoria: 'orientacoesConcluidas', itemId: '7.2' });
    });

    test('maps iniciação científica concluída to orientacoesConcluidas 7.3', () => {
        const r = mapProducaoToCategoria('Iniciação Científica Concluída', '', '', true);
        expect(r).toEqual({ categoria: 'orientacoesConcluidas', itemId: '7.3' });
    });

    // Bancas — the "orienta" guard matches any type containing "doutorado" or
    // "mestrado" BEFORE the "banca" block, so those sub-items (10.3/10.4) are
    // effectively unreachable via those keywords. Test with types that actually
    // reach the banca block.
    test('maps "banca" to bancas 10.1 (default)', () => {
        const r = mapProducaoToCategoria('banca', '', '', undefined);
        expect(r).toEqual({ categoria: 'bancas', itemId: '10.1' });
    });

    test('maps "banca graduação" to bancas 10.2', () => {
        const r = mapProducaoToCategoria('banca graduação', '', '', undefined);
        expect(r).toEqual({ categoria: 'bancas', itemId: '10.2' });
    });

    test('maps "banca especialização" routes to orientações (specialização keyword priority)', () => {
        // "especialização" is caught by the orienta block before the banca block;
        // this documents the actual routing behaviour.
        const r = mapProducaoToCategoria('banca especialização', '', '', undefined);
        expect(r?.categoria).toBe('orientacoesAndamento');
    });

    // Awards
    test('maps prêmio nacional to premios 12.2', () => {
        const r = mapProducaoToCategoria('Prêmio Nacional', 'Nacional', '', undefined);
        expect(r).toEqual({ categoria: 'premios', itemId: '12.2' });
    });

    // Projects
    test('maps projeto em andamento to projetos 1.1', () => {
        const r = mapProducaoToCategoria('Projeto de Pesquisa', '', '', undefined);
        expect(r).toEqual({ categoria: 'projetos', itemId: '1.1' });
    });

    test('maps projeto finalizado to projetos 1.2', () => {
        const r = mapProducaoToCategoria('Projeto Finalizado', '', '', undefined);
        expect(r).toEqual({ categoria: 'projetos', itemId: '1.2' });
    });

    // Bolsas
    test('maps bolsa CNPq to bolsas 9.1', () => {
        const r = mapProducaoToCategoria('Bolsa de Produtividade CNPq', '', '', undefined);
        expect(r).toEqual({ categoria: 'bolsas', itemId: '9.1' });
    });

    // Unknown type
    test('returns null for unrecognized type', () => {
        const r = mapProducaoToCategoria('Tipo desconhecido XYZ', '', '', undefined);
        expect(r).toBeNull();
    });
});

// ─── ValidadorGrupo — period bounds ──────────────────────────────────────────

describe('ValidadorGrupo._getPeriodBounds', () => {
    test('uses customPeriod when provided', () => {
        const v = new ValidadorGrupo(
            makeGrupo(), makeGroupsData(), makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2020, end: 2022 }
        );
        expect(v._getPeriodBounds()).toEqual({ startYear: 2020, endYear: 2022 });
    });

    test('falls back to meta.maxYear when no customPeriod', () => {
        const v = new ValidadorGrupo(
            makeGrupo(), makeGroupsData(), makeDashboard({ minYear: 2018, maxYear: 2024 }),
            'all', null
        );
        const { endYear } = v._getPeriodBounds();
        expect(endYear).toBe(2024);
    });
});

// ─── ValidadorGrupo — period filtering ───────────────────────────────────────

describe('ValidadorGrupo._filterByPeriod', () => {
    test('keeps records inside the period and drops those outside', () => {
        const v = new ValidadorGrupo(
            makeGrupo(), makeGroupsData(), makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const records = [
            { Ano: '2021', titulo: 'fora' },
            { Ano: '2022', titulo: 'dentro' },
            { Ano: '2024', titulo: 'dentro' },
            { Ano: '2025', titulo: 'fora' },
        ];
        const filtered = v._filterByPeriod(records);
        expect(filtered.map(r => r.titulo)).toEqual(['dentro', 'dentro']);
    });
});

// ─── ValidadorGrupo — calcularPontuacao ──────────────────────────────────────

describe('ValidadorGrupo.calcularPontuacao', () => {
    test('scores a single Qualis-A article at 18 pts', () => {
        const producoes = {
            bibliografica: [{ Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'Art1', Ano: '2023', campus: 'SSA' }],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ Unidade: 'IFBA - Campus Salvador', Pesquisadores: '2', membroIds: [] }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        expect(result.detalhamento.bibliografica).toBe(18);
        expect(result.totalPontos).toBe(18);
    });

    test('deduplicates records with the same title within a category', () => {
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'Duplicate', Ano: '2023', campus: 'SSA' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'Duplicate', Ano: '2023', campus: 'SSA' },
            ],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ membroIds: [] }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        // Should only score once
        expect(result.detalhamento.bibliografica).toBe(18);
    });

    test('calculates points per member correctly', () => {
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'A1', Ano: '2023', campus: 'SSA' },
            ],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ Pesquisadores: '2', membroIds: [] }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        // 18 pts / 2 members = 9 pts/membro
        expect(result.pontosPorMembro).toBe(9);
    });

    test('filters records by campus when no member IDs are resolved', () => {
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'SSA', Ano: '2023', campus: 'SSA' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'OTHER', Ano: '2023', campus: 'FS' },
            ],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ Unidade: 'IFBA - Campus Salvador', membroIds: [] }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        // Only SSA article should be counted
        expect(result.producoesPorCategoria.bibliografica.length).toBe(1);
    });

    test('filters records by member IDs when resolved', () => {
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'Membro', Ano: '2023', campus: 'SSA', Servidor: 'SRV001' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'Outro', Ano: '2023', campus: 'SSA', Servidor: 'SRV999' },
            ],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ membroIds: ['SRV001'] }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        expect(result.producoesPorCategoria.bibliografica.length).toBe(1);
        expect(result.producoesPorCategoria.bibliografica[0].titulo).toBe('Membro');
    });

    test('uses resolved membroIds length for member count', () => {
        const v = new ValidadorGrupo(
            makeGrupo({ membroIds: ['A', 'B', 'C'], Pesquisadores: '10' }),
            makeGroupsData(),
            makeDashboard({ maxYear: 2024 }),
            'custom', { start: 2022, end: 2024 }
        );
        const result = v.calcularPontuacao();
        expect(result.numMembros).toBe(3);
    });
});

// ─── ValidadorGrupo — group age / minimum score thresholds ───────────────────

describe('ValidadorGrupo — group age faixas', () => {
    const CURRENT = new Date().getFullYear();

    function makeValidador(anoCriacao, totalPtsOverride) {
        // Build a group with a specific formation year
        const grupo = makeGrupo({ AnoFormacao: String(anoCriacao), membroIds: ['SRV1'] });

        // If we want to control total points, inject a single bibliografica article
        // with a known score and adjust expectations accordingly.
        const producoes = totalPtsOverride != null ? {
            bibliografica: [{
                Tipo: 'Artigo em Periódico',
                Estrato: totalPtsOverride >= 18 ? 'A1' : 'B1',
                Titulo: 'Test',
                Ano: String(CURRENT - 1),
                campus: 'SSA',
                Servidor: 'SRV1',
            }],
        } : {};

        return new ValidadorGrupo(
            grupo, makeGroupsData(producoes), makeDashboard({ maxYear: CURRENT }),
            'custom', { start: CURRENT - 2, end: CURRENT }
        );
    }

    test('faixa "Novo (1–2 anos)" needs 6 pts/membro, minimo=6', () => {
        const v = makeValidador(CURRENT - 1, null);
        const result = v.calcularPontuacao();
        expect(result.faixaGrupo).toBe('Novo (1–2 anos)');
        expect(result.pontuacaoMinimaRequerida).toBe(6);
    });

    test('faixa "Em consolidação (2–4 anos)" needs 12 pts/membro', () => {
        const v = makeValidador(CURRENT - 3, null);
        const result = v.calcularPontuacao();
        expect(result.faixaGrupo).toBe('Em consolidação (2–4 anos)');
        expect(result.pontuacaoMinimaRequerida).toBe(12);
    });

    test('faixa "Consolidado (> 4 anos)" needs 20 pts/membro', () => {
        const v = makeValidador(CURRENT - 10, null);
        const result = v.calcularPontuacao();
        expect(result.faixaGrupo).toBe('Consolidado (> 4 anos)');
        expect(result.pontuacaoMinimaRequerida).toBe(20);
    });

    test('atingiuMinimo is true when pts/membro >= minimum', () => {
        // Consolidado group with 1 member, 18 pts → 18 >= 20? No. Use B1 (12)
        // Let's use A1 (18 pts) for a "Em consolidação" group (needs 12)
        const v = makeValidador(CURRENT - 3, 12);
        const result = v.calcularPontuacao();
        expect(result.pontosPorMembro).toBeGreaterThanOrEqual(12);
        expect(result.atingiuMinimo).toBe(true);
    });
});

// ─── ValidadorGrupo — validar / parecer outcomes ─────────────────────────────

describe('ValidadorGrupo.validar — parecer outcomes', () => {
    const CURRENT = new Date().getFullYear();

    function validate(grupoOverrides, producoes = {}) {
        const grupo = makeGrupo({ AnoFormacao: String(CURRENT - 10), ...grupoOverrides });
        const v = new ValidadorGrupo(
            grupo, makeGroupsData(producoes),
            makeDashboard({ maxYear: CURRENT }),
            'custom', { start: CURRENT - 2, end: CURRENT }
        );
        return v.validar();
    }

    test('CERTIFICADO: all mandatory criteria pass and no warnings', () => {
        // A consolidado group (>4y) needs 20 pts/membro.
        // 3 members + 2 A1 articles (18 pts each = 36 total) → 12 pts/membro < 20 pts/membro
        // Use membroIds with 1 resolved member to get 36/1=36 pts/membro >= 20 ✓
        // BUT Pesquisadores must be ≥ 3 (CNPQ-02) and ≤ 10 (no CNPQ-03 warning).
        // To satisfy both: set Pesquisadores '3' and membroIds with 3 members.
        // Total score = 2 articles × 18 pts = 36 pts; 36/3 = 12 pts/membro < 20 → NAO_CERTIFICADO
        // So we need more points: 3 members × 20 min = 60 pts minimum.
        // Use 4 A1 articles (72 pts) / 3 members = 24 pts/membro ≥ 20 ✓
        // Also need: CNPQ-08 UltimoEnvio ≤ 1 year ago, LiderId matching events/pubs for IFBA-11/12.
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P1', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P2', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P3', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV2' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P4', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV2' },
            ],
            tecnica: [
                // Two events in last 2 years by the leader → satisfies IFBA-11
                { Tipo: 'Apresentações de Trabalho', Subtipo: 'Nacional', Publicacao: 'Ev1', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Apresentações de Trabalho', Subtipo: 'Nacional', Publicacao: 'Ev2', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
            ],
        };
        // UltimoEnvio must be within last year; use current year string
        // LiderId = 'SRV1' so leader events (2) and publications (4) are resolved
        const result = validate({
            membroIds: ['SRV1', 'SRV2', 'SRV3'],
            Pesquisadores: '3',
            UltimoEnvio: String(CURRENT),
            LiderId: 'SRV1',
        }, producoes);
        expect(result.resumo.parecer).toBe('CERTIFICADO');
    });

    test('NAO_CERTIFICADO: fails a mandatory criterion (min researchers < 3)', () => {
        const result = validate({ Pesquisadores: '2', membroIds: [] });
        expect(result.resumo.parecer).toBe('NAO_CERTIFICADO');
    });

    test('NAO_CERTIFICADO: group is not "Certificado" in DGP', () => {
        const result = validate({ Situacao: 'Em formação' });
        expect(result.resumo.parecer).toBe('NAO_CERTIFICADO');
    });

    test('PENDENTE: mandatory criteria pass but there are warnings (e.g. > 10 researchers)', () => {
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P1', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P2', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P3', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV2' },
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Publicacao: 'P4', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV2' },
            ],
            tecnica: [
                { Tipo: 'Apresentações de Trabalho', Subtipo: 'Nacional', Publicacao: 'Ev1', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
                { Tipo: 'Apresentações de Trabalho', Subtipo: 'Nacional', Publicacao: 'Ev2', Ano: String(CURRENT - 1), campus: 'SSA', Servidor: 'SRV1' },
            ],
        };
        // Pesquisadores > 10 → CNPQ-03 warning (advertência, not obrigatório)
        // membroIds has 3 entries so member count = 3 → 72 pts / 3 = 24 pts/membro ≥ 20 ✓
        const result = validate({
            Pesquisadores: '12',
            membroIds: ['SRV1', 'SRV2', 'SRV3'],
            UltimoEnvio: String(CURRENT),
            LiderId: 'SRV1',
        }, producoes);
        expect(result.resumo.parecer).toBe('PENDENTE');
        expect(result.resumo.advertencias).toBeGreaterThan(0);
    });

    test('resultado includes periodo from customPeriod', () => {
        const grupo = makeGrupo({ AnoFormacao: String(CURRENT - 10) });
        const v = new ValidadorGrupo(
            grupo, makeGroupsData(),
            makeDashboard({ maxYear: CURRENT }),
            'custom', { start: 2020, end: 2022 }
        );
        const result = v.validar();
        expect(result.periodo).toEqual({ startYear: 2020, endYear: 2022 });
    });

    test('criterios list contains both CNPq and IFBA entries', () => {
        const result = validate({});
        const cnpqIds = result.criterios.filter(c => c.fonte === 'CNPq').map(c => c.id);
        const ifbaIds = result.criterios.filter(c => c.fonte === 'IFBA').map(c => c.id);
        expect(cnpqIds).toContain('CNPQ-01');
        expect(ifbaIds).toContain('IFBA-01');
    });
});

// ─── ValidadorGrupo — getMetricas ─────────────────────────────────────────────

describe('ValidadorGrupo.getMetricas', () => {
    test('returns correct counts per type', () => {
        const CURRENT = new Date().getFullYear();
        const producoes = {
            bibliografica: [
                { Tipo: 'Artigo em Periódico', Estrato: 'A1', Titulo: 'B1', Ano: String(CURRENT - 1), campus: 'SSA' },
            ],
            concluidas: [
                { Tipo: 'Mestrado', Titulo: 'O1', Ano: String(CURRENT - 1), campus: 'SSA', concluida: true },
            ],
        };
        const v = new ValidadorGrupo(
            makeGrupo({ membroIds: [], Pesquisadores: '4', Estudantes: '3', ApoioTecnico: '2', LinhasPesquisa: '2' }),
            makeGroupsData(producoes),
            makeDashboard({ maxYear: CURRENT }),
            'custom', { start: CURRENT - 2, end: CURRENT }
        );
        const m = v.getMetricas();
        expect(m.porTipo.bibliografica).toBe(1);
        expect(m.porTipo.orientacoes).toBe(1);
        expect(m.pesquisadores).toBe(4);
        expect(m.estudantes).toBe(3);
        expect(m.linhasPesquisa).toBe(2);
    });
});
