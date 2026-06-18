// criterios.js — Motor de validação de grupos de pesquisa
// Base legal: Regulamento Geral dos Grupos de Pesquisa do IFBA (CONSEPE) + CNPq/DGP

// LinhasPesquisa may be a count ("3") or a semicolon-separated list of names.
function parseLinhasPesquisa(val) {
    const s = String(val || '').trim();
    if (!s) return 0;
    const n = parseInt(s, 10);
    if (!isNaN(n) && String(n) === s) return n; // pure integer string
    // semicolon-separated list → count non-empty entries
    return s.split(';').map(x => x.trim()).filter(Boolean).length;
}

const SCORING_TABLE = {
    projetos: {
        label: "1. Projetos",
        items: [
            { id: "1.1", desc: "Projeto de pesquisa cadastrado (em andamento)", pontos: 2 },
            { id: "1.2", desc: "Projeto de pesquisa finalizado no período", pontos: 3 }
        ]
    },
    bibliografica: {
        label: "2. Produção Bibliográfica",
        items: [
            { id: "2.1", desc: "Trabalho apresentado em evento regional/local", pontos: 2 },
            { id: "2.2", desc: "Trabalho apresentado em evento nacional", pontos: 4 },
            { id: "2.3", desc: "Trabalho apresentado em evento internacional", pontos: 8 },
            { id: "2.4", desc: "Resumo expandido em evento nacional", pontos: 3 },
            { id: "2.5", desc: "Resumo expandido em evento internacional", pontos: 5 },
            { id: "2.6", desc: "Trabalho completo em evento nacional", pontos: 7 },
            { id: "2.7", desc: "Trabalho completo em evento internacional", pontos: 8 },
            { id: "2.8", desc: "Artigo completo em periódico sem Qualis ou Qualis C", pontos: 6 },
            { id: "2.9", desc: "Artigo completo em periódico com Qualis B", pontos: 12 },
            { id: "2.10", desc: "Artigo completo em periódico com Qualis A", pontos: 18 },
            { id: "2.11", desc: "Capítulo de livro com ISBN", pontos: 5 },
            { id: "2.12", desc: "Livro com ISBN", pontos: 15 },
            { id: "2.13", desc: "Partitura musical com registro", pontos: 5 }
        ]
    },
    tecnica: {
        label: "3. Produções Técnicas",
        items: [
            { id: "3.1", desc: "Assessoria e consultoria", pontos: 5 },
            { id: "3.2", desc: "Extensão tecnológica", pontos: 10 },
            { id: "3.3", desc: "Programa de computador sem registro", pontos: 5 },
            { id: "3.4", desc: "Cartas, mapas ou similares", pontos: 5 },
            { id: "3.5", desc: "Manutenção de obra artística", pontos: 5 },
            { id: "3.6", desc: "Maquete com registro", pontos: 5 }
        ]
    },
    cultural: {
        label: "4. Produções Culturais e Artísticas",
        items: [
            { id: "4.1", desc: "Artes cênicas com registro", pontos: 10 },
            { id: "4.2", desc: "Música com registro", pontos: 10 },
            { id: "4.3", desc: "Artes visuais com registro", pontos: 10 },
            { id: "4.4", desc: "Outra produção artística/cultural com registro", pontos: 10 }
        ]
    },
    inovacao: {
        label: "5. Inovação",
        items: [
            { id: "5.1", desc: "Software com registro", pontos: 20 },
            { id: "5.2", desc: "Desenho Industrial com registro", pontos: 20 },
            { id: "5.3", desc: "Topografia de Circuito Integrado com registro", pontos: 20 },
            { id: "5.4", desc: "Cultivares protegidas", pontos: 20 },
            { id: "5.5", desc: "Cultivares com registro", pontos: 20 },
            { id: "5.6", desc: "Projeto de criação/fortalecimento de marca com registro", pontos: 10 },
            { id: "5.7", desc: "Depósito de Pedido de Patente/Modelo de Utilidade", pontos: 20 },
            { id: "5.8", desc: "Propriedade intelectual concedida", pontos: 30 },
            { id: "5.9", desc: "Propriedade intelectual licenciada por empresa", pontos: 50 }
        ]
    },
    eventos: {
        label: "6. Eventos",
        items: [
            { id: "6.1", desc: "Participação como ministrante em eventos regionais/nacionais", pontos: 5 },
            { id: "6.2", desc: "Participação como ministrante em eventos internacionais", pontos: 10 },
            { id: "6.3", desc: "Organização de eventos nacionais", pontos: 15 },
            { id: "6.4", desc: "Organização de eventos regionais", pontos: 7 },
            { id: "6.5", desc: "Atuação em obras artísticas", pontos: 5 },
            { id: "6.6", desc: "Produção e coordenação de evento cultural/artístico", pontos: 10 },
            { id: "6.7", desc: "Criação/direção de espetáculo artístico", pontos: 10 },
            { id: "6.8", desc: "Produção audiovisual premiada", pontos: 10 }
        ]
    },
    orientacoesConcluidas: {
        label: "7. Orientações Concluídas",
        items: [
            { id: "7.1", desc: "Ensino médio integrado/subsequente (TCC, projeto integrador)", pontos: 3 },
            { id: "7.2", desc: "Curso superior (TCC)", pontos: 4 },
            { id: "7.3", desc: "Iniciação Científica, Tecnológica e Júnior", pontos: 7 },
            { id: "7.4", desc: "Especialização", pontos: 15 },
            { id: "7.5", desc: "Mestrado/Doutorado (coorientação)", pontos: 20 },
            { id: "7.6", desc: "Mestrado/Doutorado", pontos: 30 }
        ]
    },
    orientacoesAndamento: {
        label: "8. Orientações em Andamento",
        items: [
            { id: "8.1", desc: "Ensino médio integrado/subsequente", pontos: 1.5 },
            { id: "8.2", desc: "Curso superior (TCC)", pontos: 2 },
            { id: "8.3", desc: "Iniciação Científica, Tecnológica e Júnior", pontos: 3.5 },
            { id: "8.4", desc: "Especialização", pontos: 7.5 },
            { id: "8.5", desc: "Mestrado/Doutorado (coorientação)", pontos: 10 },
            { id: "8.6", desc: "Mestrado/Doutorado", pontos: 15 }
        ]
    },
    bolsas: {
        label: "9. Bolsa de Produtividade ou Similar",
        items: [
            { id: "9.1", desc: "Bolsa de Produtividade em Pesquisa — CNPq", pontos: 20 },
            { id: "9.2", desc: "Bolsa de Produtividade Desen. Tec. e Extensão Inovadora — CNPq", pontos: 20 },
            { id: "9.3", desc: "Outra modalidade de bolsa de produtividade", pontos: 10 }
        ]
    },
    bancas: {
        label: "10. Participação em Bancas",
        items: [
            { id: "10.1", desc: "Ensino técnico", pontos: 2 },
            { id: "10.2", desc: "Graduação/Especialização", pontos: 3 },
            { id: "10.3", desc: "Mestrado", pontos: 5 },
            { id: "10.4", desc: "Doutorado", pontos: 8 }
        ]
    },
    captacao: {
        label: "11. Captação de Recursos via Projetos",
        items: [
            { id: "11.1", desc: "Junto ao IFBA", pontos: 5 },
            { id: "11.2", desc: "Junto a órgãos públicos", pontos: 20 },
            { id: "11.3", desc: "Junto a empresas privadas", pontos: 30 }
        ]
    },
    premios: {
        label: "12. Prêmio/Título",
        items: [
            { id: "12.1", desc: "Prêmio/título local", pontos: 5 },
            { id: "12.2", desc: "Prêmio/título nacional", pontos: 10 },
            { id: "12.3", desc: "Prêmio/título internacional", pontos: 15 }
        ]
    }
};

const CRITERIOS_CNPQ = [
    { id: "CNPQ-01", nome: "Situação do grupo", regra: (g) => g.Situacao === "Certificado", obrigatorio: true, ref: "DGP" },
    { id: "CNPQ-02", nome: "Mínimo de pesquisadores", regra: (g) => parseInt(g.Pesquisadores || 0) >= 3, obrigatorio: true, ref: "Art. 2, §1" },
    { id: "CNPQ-03", nome: "Máximo de pesquisadores", regra: (g) => parseInt(g.Pesquisadores || 0) <= 10, obrigatorio: false, ref: "Art. 2, §2" },
    { id: "CNPQ-04", nome: "Área de conhecimento", regra: (g) => (g.Area || "").trim() !== "", obrigatorio: true, ref: "DGP" },
    { id: "CNPQ-05", nome: "Linhas de pesquisa", regra: (g) => { const n = parseLinhasPesquisa(g.LinhasPesquisa || g.linhasPesquisa); return n >= 1 && n <= 5; }, obrigatorio: false, ref: "Art. 1, p.único" },
    { id: "CNPQ-06", nome: "Estudantes vinculados", regra: (g) => parseInt(g.Estudantes || 0) >= 1, obrigatorio: false, ref: "Art. 2, §2" },
    { id: "CNPQ-07", nome: "Apoio técnico", regra: (g) => parseInt(g.ApoioTecnico || 0) >= 1, obrigatorio: false, ref: "Art. 2, §2" },
    { id: "CNPQ-08", nome: "Atualização do DGP", regra: (g, ctx) => {
        if (!g.UltimoEnvio) return false;
        const match = (g.UltimoEnvio || "").match(/(\d{4})/);
        if (!match) return false;
        return (ctx.currentYear - parseInt(match[1])) <= 1;
    }, obrigatorio: false, ref: "DGP" }
];

// Tipos from SUAP "Produções Técnicas" sheet that map to scoring section 6 (Eventos).
const SECTION6_TIPOS = new Set([
    "apresentações de trabalho", "apresentacoes de trabalho",
    "organização de eventos", "organizacao de eventos",
    "cursos de curta duração ministrados", "cursos de curta duracao ministrados"
]);

const CRITERIOS_IFBA_ESTRUTURAIS = [
    { id: "IFBA-01", nome: "Vínculo institucional", regra: (g, ctx) => {
        const u = (g.Unidade || "").toUpperCase();
        return u.includes("IFBA") || ctx.mappedCampus !== null;
    }, obrigatorio: true, ref: "Art. 1" },
    { id: "IFBA-02", nome: "Relatório bienal entregue", regra: (g) => {
        // Placeholder: depends on data availability
        return (g.RelatorioBienal || g.relatorioBienal) === true;
    }, obrigatorio: true, ref: "Art. 15" },
    { id: "IFBA-03", nome: "Participação em evento PRPGI", regra: (g, ctx) => {
        return (ctx.producao.eventos || []).length >= 1;
    }, obrigatorio: true, ref: "Art. 16, II" },
    { id: "IFBA-04", nome: "Regulamento interno próprio", regra: (g) => {
        return (g.RegulamentoInterno || g.regulamentoInterno) === true;
    }, obrigatorio: false, ref: "Art. 15, §7" },
    { id: "IFBA-05", nome: "Líder adimplente PRPGI", regra: (g, ctx) => {
        return (g.LiderAdimplente || g.liderAdimplente) === true;
    }, obrigatorio: true, ref: "Art. 4, §5" },
    { id: "IFBA-06", nome: "Líder com titulação adequada", regra: (g, ctx) => {
        return (g.LiderTitulacao || g.liderTitulacao) === true;
    }, obrigatorio: true, ref: "Art. 4" },
    { id: "IFBA-07", nome: "Líder único", regra: (g) => {
        return (g.LiderUnico || g.liderUnico) === true;
    }, obrigatorio: true, ref: "Art. 4, §2" }
];

const CRITERIOS_IFBA_PONTUACAO = [
    { id: "IFBA-08", nome: "Pontuação mínima: 1–2 anos", faixa: [1, 2], minimo: 6, ref: "Art. 16, IV-a" },
    { id: "IFBA-09", nome: "Pontuação mínima: 2–4 anos", faixa: [2, 4], minimo: 12, ref: "Art. 16, IV-b" },
    { id: "IFBA-10", nome: "Pontuação mínima: >4 anos", faixa: [4, Infinity], minimo: 20, ref: "Art. 16, IV-c" }
];

const CRITERIOS_LIDER = [
    { id: "IFBA-11", nome: "Eventos do líder (últimos 2 anos)", regra: (ctx) => (ctx.liderEventos2Anos || 0) >= 2, obrigatorio: false, ref: "Art. 4, §7-a" },
    { id: "IFBA-12", nome: "Publicação do líder (últimos 4 anos)", regra: (ctx) => (ctx.liderPublicacoes4Anos || 0) >= 1, obrigatorio: true, ref: "Art. 4, §7-b" }
];

function getPontuacaoMinima(tempoFormacao) {
    if (tempoFormacao < 1) return null; // Não pontua
    if (tempoFormacao < 2) return 6;
    if (tempoFormacao <= 4) return 12;
    return 20;
}

function getFaixaGrupo(tempoFormacao) {
    if (tempoFormacao < 1) return "Novo (< 1 ano)";
    if (tempoFormacao < 2) return "Novo (1–2 anos)";
    if (tempoFormacao <= 4) return "Em consolidação (2–4 anos)";
    return "Consolidado (> 4 anos)";
}

// Map production type to scoring category
function mapProducaoToCategoria(tipo, subtipo, estrato, concluida) {
    const t = (tipo || "").toLowerCase();
    const s = (subtipo || "").toLowerCase();
    const e = (estrato || "").toUpperCase();

    if (t.includes("artigo") || t.includes("periódico") || t.includes("periodico") || t.includes("livro") || t.includes("capítulo") || t.includes("capitulo")) {
        if (e.startsWith("A")) return { categoria: "bibliografica", itemId: "2.10" };
        if (e.startsWith("B")) return { categoria: "bibliografica", itemId: "2.9" };
        if (t.includes("livro")) return { categoria: "bibliografica", itemId: "2.12" };
        if (t.includes("capítulo") || t.includes("capitulo")) return { categoria: "bibliografica", itemId: "2.11" };
        return { categoria: "bibliografica", itemId: "2.8" };
    }

    // Section 6 — Eventos: ministrante, organização, cursos (from SUAP "Produções Técnicas" sheet)
    // Must come BEFORE the generic bibliografica trabalho/evento block to avoid misrouting.
    if (
        t.includes("organização de evento") || t.includes("organizacao de evento") ||
        t === "organização de eventos" || t === "organizacao de eventos" ||
        t.includes("cursos de curta duração") || t.includes("cursos de curta duracao") ||
        t === "apresentações de trabalho" || t === "apresentacoes de trabalho"
    ) {
        if (t.includes("organiz")) {
            if (s.includes("regional") || t.includes("regional")) return { categoria: "eventos", itemId: "6.4" };
            return { categoria: "eventos", itemId: "6.3" };
        }
        // Cursos ministrados + apresentações de trabalho → ministrante
        if (s.includes("internacional") || t.includes("internacional")) return { categoria: "eventos", itemId: "6.2" };
        return { categoria: "eventos", itemId: "6.1" };
    }

    // Section 2 — Trabalhos em eventos (conference papers/presentations, from SUAP "Produções Bibliográficas" sheet)
    if (t.includes("trabalho") || t.includes("apresentação") || t.includes("apresentacao") || t.includes("evento") || t.includes("resumo")) {
        if (s.includes("internacional") || t.includes("internacional")) return { categoria: "bibliografica", itemId: t.includes("completo") ? "2.7" : "2.3" };
        if (s.includes("nacional") || t.includes("nacional")) return { categoria: "bibliografica", itemId: t.includes("completo") ? "2.6" : "2.2" };
        if (t.includes("resumo") && t.includes("expandido")) return { categoria: "bibliografica", itemId: "2.4" };
        return { categoria: "bibliografica", itemId: "2.1" };
    }

    if (t.includes("patente") || t.includes("software") || t.includes("registro") || t.includes("marca") || t.includes("desenho industrial") || t.includes("cultivar")) {
        if (t.includes("concedida") || t.includes("concedido")) return { categoria: "inovacao", itemId: "5.8" };
        if (t.includes("licenciada") || t.includes("licenciado")) return { categoria: "inovacao", itemId: "5.9" };
        if (t.includes("software")) return { categoria: "inovacao", itemId: "5.1" };
        if (t.includes("patente") || t.includes("depósito") || t.includes("deposito")) return { categoria: "inovacao", itemId: "5.7" };
        return { categoria: "inovacao", itemId: "5.6" };
    }

    if (t.includes("técnica") || t.includes("tecnica") || t.includes("consultoria") || t.includes("assessoria") || t.includes("extensão") || t.includes("extensao") || t.includes("maquete") || t.includes("carta") || t.includes("mapa")) {
        if (t.includes("consultoria") || t.includes("assessoria")) return { categoria: "tecnica", itemId: "3.1" };
        if (t.includes("extensão") || t.includes("extensao")) return { categoria: "tecnica", itemId: "3.2" };
        if (t.includes("computador") || t.includes("software")) return { categoria: "tecnica", itemId: "3.3" };
        if (t.includes("carta") || t.includes("mapa")) return { categoria: "tecnica", itemId: "3.4" };
        if (t.includes("maquete")) return { categoria: "tecnica", itemId: "3.6" };
        return { categoria: "tecnica", itemId: "3.1" };
    }

    // Orientações — matches both singular "orientação" and plural "orientações".
    // The isConcluida flag comes from the record's .concluida field (set in build.js
    // based on which XLSX sheet the record came from), falling back to Tipo string.
    if (
        t.includes("orienta") || t.includes("tcc") ||
        t.includes("mestrado") || t.includes("doutorado") ||
        t.includes("especialização") || t.includes("especializacao") ||
        t.includes("iniciação") || t.includes("iniciacao") ||
        t.includes("graduação de") || t.includes("pós-doutorado") || t.includes("pos-doutorado")
    ) {
        // Use explicit concluida flag when available (reliable); fall back to Tipo text
        const isConcluida = concluida !== undefined && concluida !== null
            ? Boolean(concluida)
            : (t.includes("conclu") || t.includes("concluí"));
        const cat = isConcluida ? "orientacoesConcluidas" : "orientacoesAndamento";
        const prefix = isConcluida ? "7." : "8.";

        if (t.includes("pós-doutorado") || t.includes("pos-doutorado")) return { categoria: cat, itemId: prefix + "6" };
        if (t.includes("doutorado")) {
            if (t.includes("coorient")) return { categoria: cat, itemId: prefix + "5" };
            return { categoria: cat, itemId: prefix + "6" };
        }
        if (t.includes("mestrado")) {
            if (t.includes("coorient")) return { categoria: cat, itemId: prefix + "5" };
            return { categoria: cat, itemId: prefix + "6" };
        }
        if (t.includes("especializ") || t.includes("aperfeiçoamento") || t.includes("aperfeicoamento")) return { categoria: cat, itemId: prefix + "4" };
        if (t.includes("iniciação") || t.includes("iniciacao") || t.includes("iniciação científica") || t.includes("ic")) return { categoria: cat, itemId: prefix + "3" };
        // "Orientações de Graduação" → TCC / curso superior
        if (t.includes("graduação") || t.includes("graduacao") || t.includes("tcc") || t.includes("superior")) return { categoria: cat, itemId: prefix + "2" };
        // "Outras Orientações" → ensino médio/técnico
        return { categoria: cat, itemId: prefix + "1" };
    }

    if (t.includes("banca")) {
        if (t.includes("doutorado")) return { categoria: "bancas", itemId: "10.4" };
        if (t.includes("mestrado")) return { categoria: "bancas", itemId: "10.3" };
        if (t.includes("graduação") || t.includes("graduacao") || t.includes("especialização") || t.includes("especializacao")) return { categoria: "bancas", itemId: "10.2" };
        return { categoria: "bancas", itemId: "10.1" };
    }

    if (t.includes("prêmio") || t.includes("premio") || t.includes("título") || t.includes("titulo")) {
        if (s.includes("internacional") || t.includes("internacional")) return { categoria: "premios", itemId: "12.3" };
        if (s.includes("nacional") || t.includes("nacional")) return { categoria: "premios", itemId: "12.2" };
        return { categoria: "premios", itemId: "12.1" };
    }

    if (t.includes("bolsa") || t.includes("produtividade")) {
        if (t.includes("cnpq")) return { categoria: "bolsas", itemId: "9.1" };
        if (t.includes("desen") || t.includes("extensão") || t.includes("extensao") || t.includes("inov")) return { categoria: "bolsas", itemId: "9.2" };
        return { categoria: "bolsas", itemId: "9.3" };
    }

    if (t.includes("projeto")) {
        if (t.includes("finalizado") || t.includes("conclu")) return { categoria: "projetos", itemId: "1.2" };
        return { categoria: "projetos", itemId: "1.1" };
    }

    if (t.includes("captação") || t.includes("captacao") || t.includes("recursos")) {
        if (s.includes("empresa") || t.includes("empresa")) return { categoria: "captacao", itemId: "11.3" };
        if (s.includes("órgão") || t.includes("órgão") || s.includes("orgão") || t.includes("orgão") || s.includes("público") || t.includes("público")) return { categoria: "captacao", itemId: "11.2" };
        return { categoria: "captacao", itemId: "11.1" };
    }

    if (t.includes("arte") || t.includes("cênica") || t.includes("cênica") || t.includes("música") || t.includes("musica") || t.includes("visual") || t.includes("partitura")) {
        if (t.includes("cênica") || t.includes("cênica") || t.includes("teatro")) return { categoria: "cultural", itemId: "4.1" };
        if (t.includes("música") || t.includes("musica") || t.includes("partitura")) return { categoria: "cultural", itemId: "4.2" };
        if (t.includes("visual")) return { categoria: "cultural", itemId: "4.3" };
        return { categoria: "cultural", itemId: "4.4" };
    }

    return null;
}

class ValidadorGrupo {
    constructor(grupo, groupsData, dashboardData, periodoSelecionado, customPeriod = null) {
        this.grupo = grupo;
        this.groupsData = groupsData;
        this.dashboardData = dashboardData;
        this.periodoSelecionado = periodoSelecionado;
        this.customPeriod = customPeriod;
        this.currentYear = new Date().getFullYear();
        this.mappedCampus = this._mapCampus();
    }

    _mapCampus() {
        const CAMPUS_TO_CITY = {
            "BAR": "BARREIRAS", "BRU": "BRUMADO", "CAM": "CAMACARI", "CFO": "CAMPO FORMOSO",
            "EC": "EUCLIDES DA CUNHA", "EUN": "EUNAPOLIS", "FS": "FEIRA DE SANTANA",
            "ILH": "ILHEUS", "IRE": "IRECE", "JAC": "JACOBINA", "JAG": "JAGUAQUARA",
            "JEQ": "JEQUIE", "LF": "LAURO DE FREITAS", "SAM": "SANTO AMARO", "SEA": "SEABRA",
            "SF": "SIMOES FILHO", "UBA": "UBAITABA", "VAL": "VALENCA", "VC": "VITORIA DA CONQUISTA",
            "SAJ": "SANTO ANTONIO DE JESUS", "JUA": "JUAZEIRO", "PA": "PAULO AFONSO",
            "PIS": "POLO DE INOVACAO SALVADOR", "PS": "PORTO SEGURO", "SSA": "SALVADOR"
        };
        const unidade = (this.grupo.Unidade || "").toUpperCase();
        for (const [code, city] of Object.entries(CAMPUS_TO_CITY)) {
            if (unidade.includes(city)) return code;
        }
        return null;
    }

    _getPeriodBounds() {
        const meta = this.dashboardData.meta;
        const endYear = meta.maxYear || this.currentYear;

        if (
            this.customPeriod
            && Number.isInteger(this.customPeriod.start)
            && Number.isInteger(this.customPeriod.end)
        ) {
            return { startYear: this.customPeriod.start, endYear: this.customPeriod.end };
        }

        const val = this.periodoSelecionado;
        let startYear;
        if (val === "all") {
            startYear = meta.minYear || endYear;
        } else if (val === "custom") {
            startYear = meta.minYear || endYear;
        } else if (val === "0") {
            startYear = endYear;
        } else {
            const n = parseInt(val);
            startYear = endYear - n + 1;
        }
        return { startYear, endYear };
    }

    _filterByPeriod(arr) {
        const { startYear, endYear } = this._getPeriodBounds();
        return arr.filter(r => {
            const y = parseInt(r.Ano || r.ano || 0);
            return !isNaN(y) && y >= startYear && y <= endYear;
        });
    }

    _filterByCampus(arr) {
        if (!this.mappedCampus) return arr;
        return arr.filter(r => r.campus === this.mappedCampus);
    }

    _filterByMembers(arr) {
        const ids = this.grupo.membroIds;
        // Only filter when the group has a resolved member list; otherwise fall
        // back to campus-wide (avoids silently zeroing out groups with no map).
        if (!ids || ids.length === 0) return arr;
        const memberSet = new Set(ids);
        return arr.filter(r => r.Servidor && memberSet.has(r.Servidor));
    }

    _getProducaoPorCategoria() {
        const prods = this.groupsData.producoes || {};
        const hasMemberIds = this.grupo.membroIds && this.grupo.membroIds.length > 0;
        // When member IDs are resolved, filter by member only (no campus restriction —
        // orientações and other records may be registered under a different campus than
        // the group's home campus, but the Servidor ID is authoritative).
        // When no member IDs, fall back to campus-wide filtering.
        const filtered = hasMemberIds
            ? (arr) => this._filterByMembers(this._filterByPeriod(arr))
            : (arr) => this._filterByCampus(this._filterByPeriod(arr));

        // Section-6 event tipos live in the SUAP "Produções Técnicas" sheet.
        // Pull them into their own bucket so scoreItems routes them to the
        // "eventos" scoring category and IFBA-11 (líder eventos) can count them.
        const isSection6 = (r) => SECTION6_TIPOS.has((r.Tipo || "").toLowerCase());

        const allTecnica = prods.tecnica || [];
        const allBiblio = prods.bibliografica || [];

        return {
            bibliografica: filtered(allBiblio),
            tecnica: filtered(allTecnica.filter(r => !isSection6(r))),
            inovacao: filtered(prods.inovacao || []),
            orientacoesConcluidas: filtered(prods.concluidas || []),
            orientacoesAndamento: filtered(prods.andamento || []),
            // eventos = section-6 types (ministrante/organização) from tecnica only
            eventos: filtered(allTecnica.filter(isSection6)),
            bancas: filtered(prods.bancas || []),
            bancasIndisponivel: prods.bancas === undefined,
            bolsas: filtered(prods.bolsas || []),
            projetos: filtered(prods.projetos || []),
            captacao: filtered(prods.captacao || []),
            premios: filtered(prods.premios || [])
        };
    }

    calcularPontuacao() {
        const producao = this._getProducaoPorCategoria();
        const detalhamento = {};
        const producoesPorCategoria = {};
        let totalPontos = 0;

        const scoreItems = (items, categoria) => {
            // Per-category dedup: same item can score in multiple categories
            // (e.g. "Trabalhos em Eventos" scores both as bibliografica 2.x and eventos 6.x).
            const seenInCat = new Set();
            let catPontos = 0;
            const producoes = [];
            items.forEach(item => {
                const key = item.dedupKey || (item.Titulo || item.titulo || "").substring(0, 150).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "");
                if (key && seenInCat.has(key)) return;
                if (key) seenInCat.add(key);

                const rawTipo = item.Tipo || item.tipo || "";
                const rawSubtipo = item.Subtipo || item.subtipo || "";
                // "Trabalhos em Eventos" (bibliografica sheet) also scores as event
                // participation (section 6) when processed in the eventos bucket.
                const tipoForMapping = (
                    categoria === "eventos" &&
                    rawTipo.toLowerCase().includes("trabalhos em eventos")
                ) ? "Apresentações de Trabalho" : rawTipo;
                const mapping = mapProducaoToCategoria(tipoForMapping, rawSubtipo, item.Estrato || item.estrato || "", item.concluida);
                if (mapping && mapping.categoria === categoria) {
                    const scoreItem = SCORING_TABLE[categoria]?.items.find(i => i.id === mapping.itemId);
                    if (scoreItem) {
                        catPontos += scoreItem.pontos;
                        producoes.push({
                            ano: item.Ano || item.ano || "",
                            tipo: item.Tipo || item.tipo || "",
                            titulo: item.Publicacao || item.Publicação || item.titulo || item.Título || "",
                            periodico: item.Periodico || item.Periódico || "",
                            estrato: item.Estrato || item.estrato || "",
                            issn: item.ISSN || "",
                            itemId: scoreItem.id,
                            itemDesc: scoreItem.desc,
                            pontos: scoreItem.pontos
                        });
                    }
                }
            });
            producoesPorCategoria[categoria] = producoes;
            return catPontos;
        };

        const categorias = Object.keys(SCORING_TABLE);
        categorias.forEach(cat => {
            const items = producao[cat] || [];
            detalhamento[cat] = scoreItems(items, cat);
            totalPontos += detalhamento[cat];
        });

        // numMembros: use resolved member list length (already deduped in build.js) when
        // available; otherwise count unique names from PesquisadoresNomes; last resort is
        // the raw DGP Pesquisadores integer (may include duplicates in source data).
        const membroIdsResolvidos = (this.grupo.membroIds || []).length;
        const nomesUnicos = membroIdsResolvidos === 0
            ? new Set((this.grupo.PesquisadoresNomes || '').split(';').map(n => n.trim()).filter(Boolean)).size
            : 0;
        const numMembros = membroIdsResolvidos > 0
            ? membroIdsResolvidos
            : nomesUnicos > 0
                ? nomesUnicos
                : parseInt(this.grupo.Pesquisadores || 0);
        const pontosPorMembro = numMembros > 0 ? totalPontos / numMembros : 0;

        const anoCriacao = parseInt(this.grupo.AnoFormacao || this.grupo.anoCriacao || this.grupo.AnoCriacao || 0);
        const tempoFormacao = anoCriacao > 0 ? this.currentYear - anoCriacao : 0;
        const pontuacaoMinima = getPontuacaoMinima(tempoFormacao);
        const atingiuMinimo = pontuacaoMinima !== null && pontosPorMembro >= pontuacaoMinima;

        return {
            totalPontos,
            numMembros,
            pontosPorMembro,
            pontuacaoMinimaRequerida: pontuacaoMinima,
            atingiuMinimo,
            tempoFormacao,
            faixaGrupo: getFaixaGrupo(tempoFormacao),
            detalhamento,
            producoesPorCategoria
        };
    }

    validar() {
        const pontuacao = this.calcularPontuacao();
        const producao = this._getProducaoPorCategoria();

        const ctx = {
            currentYear: this.currentYear,
            mappedCampus: this.mappedCampus,
            producao,
            pontuacao,
            liderEventos2Anos: 0,
            liderPublicacoes4Anos: 0
        };

        // Compute leader-specific metrics from production data.
        // LiderId is resolved in build.js via servidorNameToId.
        const liderId = this.grupo.LiderId || null;
        if (liderId) {
            const allProds = this.groupsData.producoes || {};
            const lider2Start = this.currentYear - 2;
            const lider4Start = this.currentYear - 4;

            // Eventos do líder nos últimos 2 anos (todos os campus):
            // section-6 types from tecnica + conference presentations (Trabalhos em Eventos) from bibliografica
            const isConferenceWork = (r) => (r.Tipo || "").toLowerCase().includes("trabalhos em eventos");
            const eventosLider = [
                ...(allProds.tecnica || []).filter(r => SECTION6_TIPOS.has((r.Tipo || "").toLowerCase())),
                ...(allProds.bibliografica || []).filter(isConferenceWork)
            ].filter(r => r.Servidor === liderId && parseInt(r.Ano || 0) >= lider2Start);
            ctx.liderEventos2Anos = eventosLider.length;

            // Publicações do líder nos últimos 4 anos: bibliografica + tecnica + inovacao
            const pubsLider = [
                ...(allProds.bibliografica || []),
                ...(allProds.tecnica || []),
                ...(allProds.inovacao || [])
            ].filter(r => r.Servidor === liderId && parseInt(r.Ano || 0) >= lider4Start);
            ctx.liderPublicacoes4Anos = pubsLider.length;
        }

        const criterios = [];

        CRITERIOS_CNPQ.forEach(c => {
            const passou = c.regra(this.grupo, ctx);
            const pesq = parseInt(this.grupo.Pesquisadores || 0);
            const estud = parseInt(this.grupo.Estudantes || 0);
            const apoio = parseInt(this.grupo.ApoioTecnico || 0);
            const linhas = parseLinhasPesquisa(this.grupo.LinhasPesquisa || this.grupo.linhasPesquisa);
            const area = (this.grupo.Area || "").trim();
            const situacao = this.grupo.Situacao || "";
            const ultimoEnvio = this.grupo.UltimoEnvio || "";

            let tooltip = "";
            switch (c.id) {
                case "CNPQ-01":
                    tooltip = `Situação do grupo: "${situacao}". Requer "Certificado".`;
                    break;
                case "CNPQ-02":
                    tooltip = `Pesquisadores: ${pesq}. Mínimo requerido: 3.`;
                    break;
                case "CNPQ-03":
                    tooltip = `Pesquisadores: ${pesq}. Máximo recomendado: 10.`;
                    break;
                case "CNPQ-04":
                    tooltip = `Área: "${area || "(vazio)"}". Não pode estar vazia.`;
                    break;
                case "CNPQ-05":
                    tooltip = `Linhas de pesquisa: ${linhas}. Deve ser entre 1 e 5.`;
                    break;
                case "CNPQ-06":
                    tooltip = `Estudantes vinculados: ${estud}. Recomendado: ≥ 1.`;
                    break;
                case "CNPQ-07":
                    tooltip = `Apoio técnico: ${apoio}. Recomendado: ≥ 1.`;
                    break;
                case "CNPQ-08":
                    tooltip = `Último envio DGP: "${ultimoEnvio || "não informado"}". Deve ser dentro dos últimos 12 meses.`;
                    break;
            }

            criterios.push({
                id: c.id,
                nome: c.nome,
                fonte: "CNPq",
                tipo: c.obrigatorio ? "obrigatorio" : "advertencia",
                passou,
                verificado: true,
                detalhe: passou ? "Atendido" : "Não atendido",
                tooltip,
                artigoRef: c.ref
            });
        });

        CRITERIOS_IFBA_ESTRUTURAIS.forEach(c => {
            const passou = c.regra(this.grupo, ctx);
            const prod = ctx.producao;
            const totalBib = (prod.bibliografica || []).length;
            const totalTec = (prod.tecnica || []).length;
            const totalInov = (prod.inovacao || []).length;
            const totalOrient = (prod.orientacoesConcluidas || []).length + (prod.orientacoesAndamento || []).length;
            const totalEventos = (prod.eventos || []).length;
            const totalBancas = (prod.bancas || []).length;
            const totalProducoes = totalBib + totalTec + totalInov + totalOrient + totalEventos + totalBancas;
            const unidade = this.grupo.Unidade || "";
            const mapped = this.mappedCampus;

            let tooltip = "";
            let detalhe = "Atendido";
            let verificado = true;

            switch (c.id) {
                case "IFBA-01":
                    tooltip = `Unidade: "${unidade}". Campus mapeado: ${mapped || "não mapeado"}. Deve ser um campus IFBA válido.`;
                    if (!passou) detalhe = "Não atendido";
                    break;
                case "IFBA-02":
                    verificado = false;
                    tooltip = `Relatório bienal: dado não disponível na fonte DGP. Obrigatório conforme Art. 15.`;
                    detalhe = "Não verificado";
                    break;
                case "IFBA-03":
                    tooltip = `Participações em eventos PRPGI: ${totalEventos}. Mínimo: 1 por ano.`;
                    if (!passou) detalhe = "Não atendido";
                    break;
                case "IFBA-04":
                    verificado = false;
                    tooltip = `Regulamento interno: dado não disponível na fonte DGP. Obrigatório na 1ª avaliação (Art. 15, §7).`;
                    detalhe = "Não verificado";
                    break;
                case "IFBA-05":
                    verificado = false;
                    tooltip = `Líder adimplente PRPGI: dado não disponível na fonte DGP. Obrigatório (Art. 4, §5).`;
                    detalhe = "Não verificado";
                    break;
                case "IFBA-06":
                    verificado = false;
                    tooltip = `Líder com titulação adequada: dado não disponível na fonte DGP. Requer doutorado ou mestrado + produção (Art. 4).`;
                    detalhe = "Não verificado";
                    break;
                case "IFBA-07":
                    verificado = false;
                    tooltip = `Líder único: dado não disponível na fonte DGP. Líder deve estar vinculado a apenas 1 grupo (Art. 4, §2).`;
                    detalhe = "Não verificado";
                    break;
            }

            criterios.push({
                id: c.id,
                nome: c.nome,
                fonte: "IFBA",
                tipo: c.obrigatorio ? "obrigatorio" : "advertencia",
                passou,
                verificado,
                detalhe,
                tooltip,
                artigoRef: c.ref
            });
        });

        const criterioPontuacao = CRITERIOS_IFBA_PONTUACAO.find(cp => {
            const [min, max] = cp.faixa;
            return pontuacao.tempoFormacao >= min && pontuacao.tempoFormacao < max;
        });

        if (criterioPontuacao) {
            const passou = pontuacao.atingiuMinimo;
            const detalhePorCategoria = Object.entries(pontuacao.detalhamento || {})
                .filter(([, pts]) => pts > 0)
                .map(([cat, pts]) => {
                    const label = SCORING_TABLE[cat]?.label || cat;
                    return `${label}: ${pts}`;
                }).join("; ");

            criterios.push({
                id: criterioPontuacao.id,
                nome: criterioPontuacao.nome,
                fonte: "IFBA",
                tipo: "obrigatorio",
                passou,
                detalhe: passou
                    ? `${pontuacao.pontosPorMembro.toFixed(1)} pts/membro >= ${criterioPontuacao.minimo} pts/membro`
                    : `${pontuacao.pontosPorMembro.toFixed(1)} pts/membro < ${criterioPontuacao.minimo} pts/membro`,
                tooltip: `Tempo de formação: ${pontuacao.tempoFormacao} anos (${pontuacao.faixaGrupo}). Total: ${pontuacao.total} pts / ${pontuacao.membros} membros = ${pontuacao.pontosPorMembro.toFixed(1)} pts/membro. Mínimo: ${criterioPontuacao.minimo}. ${detalhePorCategoria ? "Detalhamento: " + detalhePorCategoria : ""}`,
                artigoRef: criterioPontuacao.ref
            });
        }

        CRITERIOS_LIDER.forEach(c => {
            const passou = c.regra(ctx);
            const eventos2 = ctx.liderEventos2Anos || 0;
            const pubs4 = ctx.liderPublicacoes4Anos || 0;

            let tooltip = "";
            switch (c.id) {
                case "IFBA-11":
                    tooltip = `Eventos do líder nos últimos 2 anos: ${eventos2}. Mínimo requerido: 2. (Art. 4, §7-a)`;
                    break;
                case "IFBA-12":
                    tooltip = `Publicações do líder nos últimos 4 anos: ${pubs4}. Mínimo requerido: 1. (Art. 4, §7-b)`;
                    break;
            }

            criterios.push({
                id: c.id,
                nome: c.nome,
                fonte: "IFBA",
                tipo: c.obrigatorio ? "obrigatorio" : "advertencia",
                passou,
                verificado: true,
                detalhe: passou ? "Atendido" : "Não atendido",
                tooltip,
                artigoRef: c.ref
            });
        });

        const obrigatoriosPassados = criterios.filter(c => c.tipo === "obrigatorio" && c.passou).length;
        const obrigatoriosFalhos = criterios.filter(c => c.tipo === "obrigatorio" && !c.passou && c.verificado !== false).length;
        const naoVerificados = criterios.filter(c => c.verificado === false).length;
        const advertencias = criterios.filter(c => c.tipo === "advertencia" && !c.passou && c.verificado !== false).length;

        let parecer;
        const relatorioBienal = criterios.find(c => c.id === "IFBA-02");
        if (relatorioBienal && !relatorioBienal.passou && relatorioBienal.verificado !== false) {
            parecer = "INADIMPLENTE";
        } else if (obrigatoriosFalhos > 0) {
            parecer = "NAO_CERTIFICADO";
        } else if (advertencias > 0) {
            parecer = "PENDENTE";
        } else {
            parecer = "CERTIFICADO";
        }

        const membrosList = (this.grupo.membrosMap && this.grupo.membrosMap.length > 0)
            ? this.grupo.membrosMap
            : (this.grupo.PesquisadoresNomes || this.grupo.pesquisadoresNomes || '')
                .split(';')
                .map(n => ({ nome: n.trim(), siape: null }))
                .filter(m => m.nome);

        return {
            grupo: {
                nome: this.grupo.Nome || this.grupo.nome || this.grupo.Area || this.grupo.area || "Não informado",
                area: this.grupo.Area || this.grupo.area || "Não informada",
                unidade: this.grupo.Unidade || this.grupo.unidade || "Não informada",
                situacao: this.grupo.Situacao || this.grupo.situacao || "Não informada",
                anoCriacao: parseInt(this.grupo.AnoFormacao || this.grupo.anoCriacao || this.grupo.AnoCriacao || 0),
                LiderId: this.grupo.LiderId || null,
                estudantes: parseInt(this.grupo.Estudantes || 0)
            },
            membros: membrosList,
            producoes: pontuacao.producoesPorCategoria,
            criterios,
            pontuacao: {
                total: pontuacao.totalPontos,
                membros: pontuacao.numMembros,
                porMembro: pontuacao.pontosPorMembro,
                minimoRequerido: pontuacao.pontuacaoMinimaRequerida,
                atingiu: pontuacao.atingiuMinimo,
                tempoFormacao: pontuacao.tempoFormacao,
                faixaGrupo: pontuacao.faixaGrupo,
                detalhamento: pontuacao.detalhamento,
                producoesPorCategoria: pontuacao.producoesPorCategoria
            },
            resumo: {
                totalCriterios: criterios.length,
                obrigatoriosPassados,
                obrigatoriosFalhos,
                naoVerificados,
                advertencias,
                parecer
            },
            periodo: this._getPeriodBounds(),
            geradoEm: new Date().toISOString()
        };
    }

    getProducaoCruzada() {
        return this._getProducaoPorCategoria();
    }

    getMetricas() {
        const producao = this._getProducaoPorCategoria();
        const totalProducoes = Object.values(producao).reduce((sum, val) => sum + (Array.isArray(val) ? val.length : 0), 0);

        const porAno = {};
        Object.values(producao).forEach(val => {
            if (!Array.isArray(val)) return;
            val.forEach(r => {
                const y = r.Ano || r.ano;
                if (y) porAno[y] = (porAno[y] || 0) + 1;
            });
        });

        const anoCriacao = parseInt(this.grupo.AnoFormacao || this.grupo.anoCriacao || this.grupo.AnoCriacao || 0);

        return {
            totalProducoes,
            porAno,
            porTipo: {
                bibliografica: producao.bibliografica.length,
                tecnica: producao.tecnica.length,
                inovacao: producao.inovacao.length,
                orientacoes: producao.orientacoesConcluidas.length + producao.orientacoesAndamento.length,
                eventos: producao.eventos.length,
                bancas: producao.bancas.length
            },
            bancasIndisponivel: producao.bancasIndisponivel === true,
            pesquisadores: parseInt(this.grupo.Pesquisadores || 0),
            estudantes: parseInt(this.grupo.Estudantes || 0),
            apoioTecnico: parseInt(this.grupo.ApoioTecnico || 0),
            linhasPesquisa: parseLinhasPesquisa(this.grupo.LinhasPesquisa || this.grupo.linhasPesquisa),
            anoCriacao,
            tempoFormacaoAnos: anoCriacao > 0 ? this.currentYear - anoCriacao : 0
        };
    }
}

if (typeof module !== 'undefined') module.exports = { mapProducaoToCategoria, ValidadorGrupo, SCORING_TABLE, parseLinhasPesquisa };
