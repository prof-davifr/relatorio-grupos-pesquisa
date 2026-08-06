'use strict';
/* Dashboard gerencial — PRPGI/IFBA
 * Todas as informações são tratadas como validadas (sem workflow de parecer).
 * Reutiliza o ValidadorGrupo oficial (criterios.js) para pontuar os grupos,
 * com otimização: índice por Servidor → fatia pequena por grupo → validação.
 */
(function () {
    // ─── estado ────────────────────────────────────────────────────────────────
    let dados = null;       // data.json
    let groupsData = null;  // data-groups.json
    let gruposPontuados = []; // { grupo, pontuacao } para todos os grupos
    let idx = null;          // índice Servidor → produções
    const charts = {};
    let dashSort = { key: 'pontos', asc: false };

    // ─── util ──────────────────────────────────────────────────────────────────
    const fmt = (n) => (n ?? 0).toLocaleString('pt-BR');
    const fmt1 = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const $ = (id) => document.getElementById(id);

    // ─── índice por Servidor ───────────────────────────────────────────────────
    function buildIndex(producoes) {
        const idx = {};
        for (const cat of Object.keys(producoes)) {
            idx[cat] = {};
            for (const r of producoes[cat]) {
                const s = r.Servidor;
                if (!s) continue;
                if (!idx[cat][s]) idx[cat][s] = [];
                idx[cat][s].push(r);
            }
        }
        return idx;
    }

    /** Fatia as produções de um grupo (registros cujo autor é membro). */
    function fatiaPorGrupo(g, idx) {
        const fatia = {};
        const membros = g.membroIds || [];
        for (const cat of Object.keys(idx)) {
            const arr = [];
            for (const m of membros) {
                const sub = idx[cat][m];
                if (sub) arr.push(...sub);
            }
            fatia[cat] = arr;
        }
        return fatia;
    }

    // ─── pontuação de todos os grupos ──────────────────────────────────────────
    function pontuarTodos() {
        const t0 = performance.now();
        idx = buildIndex(groupsData.producoes);
        gruposPontuados = groupsData.grupos.map((g) => {
            const fatia = fatiaPorGrupo(g, idx);
            const validador = new ValidadorGrupo(g, { grupos: [], producoes: fatia }, dados, 'custom', null);
            return { grupo: g, resultado: validador.validar() };
        });
        // eslint-disable-next-line no-console
        console.log(`[dashboard] ${gruposPontuados.length} grupos pontuados em ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    }

    // ─── agregações ────────────────────────────────────────────────────────────
    function contar(arr, campo) {
        const m = {};
        for (const r of arr) {
            const k = r[campo] || '(sem ' + campo + ')';
            m[k] = (m[k] || 0) + 1;
        }
        return m;
    }

    function contarPorAno(arr, campoAno = 'Ano') {
        const m = {};
        for (const r of arr) {
            const a = parseInt(r[campoAno], 10);
            if (isNaN(a)) continue;
            m[a] = (m[a] || 0) + 1;
        }
        return m;
    }

    function toEntries(m) {
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }

    function serieAnos(minYear, maxYear, m) {
        const anos = [];
        for (let a = minYear; a <= maxYear; a++) anos.push(a);
        return anos.map((a) => ({ ano: a, n: m[a] || 0 }));
    }

    function pesquisadoresUnicos() {
        const set = new Set();
        for (const g of groupsData.grupos) for (const id of (g.membroIds || [])) set.add(id);
        return set.size;
    }

    // ─── gráficos (Chart.js) ───────────────────────────────────────────────────
    const PALETA = ['#1a73e8', '#e8710a', '#188038', '#b31412', '#9334e6', '#1882a8', '#f7b500', '#5f6368', '#d01884', '#0b8043', '#6c757d', '#ad5c00'];

    function makeChart(canvasId, config) {
        const el = $(canvasId);
        if (!el) return;
        if (charts[canvasId]) charts[canvasId].destroy();
        charts[canvasId] = new Chart(el.getContext('2d'), config);
    }

    const BASE_OPTS = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
        animation: { duration: 500 }
    };

    function doughnut(canvasId, labels, values, title) {
        makeChart(canvasId, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: PALETA, borderWidth: 1 }] },
            options: { ...BASE_OPTS, cutout: '55%', plugins: { ...BASE_OPTS.plugins, title: { display: !!title, text: title } } }
        });
    }

    function barH(canvasId, labels, values, color = PALETA[0]) {
        makeChart(canvasId, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 3 }] },
            options: { ...BASE_OPTS, indexAxis: 'y', plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }
        });
    }

    function barV(canvasId, labels, values, color = PALETA[0]) {
        makeChart(canvasId, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 3 }] },
            options: { ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }
        });
    }

    function line(canvasId, labels, series) {
        makeChart(canvasId, {
            type: 'line',
            data: {
                labels,
                datasets: series.map((s, i) => ({
                    label: s.label,
                    data: s.data,
                    borderColor: PALETA[i % PALETA.length],
                    backgroundColor: PALETA[i % PALETA.length] + '22',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1
                }))
            },
            options: { ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { ...BASE_OPTS.plugins.legend, display: series.length > 1 } } }
        });
    }

    // ─── KPIs ──────────────────────────────────────────────────────────────────
    function kpi(containerId, titulo, valor, detalhe = '', cor = '') {
        const el = $(containerId);
        if (!el) return;
        const card = document.createElement('div');
        card.className = 'kpi-card' + (cor ? ' kpi-card--' + cor : '');
        card.innerHTML = `<div class="kpi-label">${titulo}</div><div class="kpi-value">${valor}</div>` +
            (detalhe ? `<div class="kpi-detail">${detalhe}</div>` : '');
        el.appendChild(card);
    }

    // ─── render: visão geral ───────────────────────────────────────────────────
    function renderVisaoGeral() {
        const g = gruposPontuados;
        const totalPts = g.reduce((s, x) => s + x.resultado.pontuacao.total, 0);
        const cert = groupsData.grupos.filter((x) => (x.Situacao || '').includes('Certificado')).length;
        const atingem = g.filter((x) => x.resultado.pontuacao.atingiu).length;
        const totalProducoes = Object.values(groupsData.producoes).reduce((s, a) => s + a.length, 0);

        $('kpi-geral').innerHTML = '';
        kpi('kpi-geral', 'Grupos de Pesquisa', fmt(groupsData.grupos.length), `${cert} certificados`);
        kpi('kpi-geral', 'Pesquisadores', fmt(pesquisadoresUnicos()), 'em grupos certificados');
        kpi('kpi-geral', 'Produções Registradas', fmt(totalProducoes), 'biblio + técnica + inovação + orientações');
        kpi('kpi-geral', 'Pontuação Total', fmt1(totalPts), 'soma de todos os grupos', 'accent');
        kpi('kpi-geral', 'Atingem o Mínimo', fmt(atingem), `de ${fmt(g.length)} grupos avaliáveis`, atingem === g.length ? 'success' : 'warn');
        kpi('kpi-geral', 'Inovação', fmt(groupsData.producoes.inovacao.length), 'patentes + softwares + DI');

        const sit = toEntries(contar(groupsData.grupos, 'Situacao'));
        doughnut('chart-situacao', sit.map(([k]) => k), sit.map(([, v]) => v));

        const campus = toEntries(contar(groupsData.grupos, 'Unidade')).slice(0, 12);
        barH('chart-campus', campus.map(([k]) => k), campus.map(([, v]) => v));

        const { minYear, maxYear } = dados.meta;
        const biblio = serieAnos(minYear, maxYear, contarPorAno(groupsData.producoes.bibliografica));
        const tec = serieAnos(minYear, maxYear, contarPorAno(groupsData.producoes.tecnica));
        const inov = serieAnos(minYear, maxYear, contarPorAno(groupsData.producoes.inovacao));
        const orient = serieAnos(minYear, maxYear, contarPorAno(groupsData.producoes.concluidas));
        line('chart-evolucao', biblio.map((x) => x.ano), [
            { label: 'Bibliográfica', data: biblio.map((x) => x.n) },
            { label: 'Técnica', data: tec.map((x) => x.n) },
            { label: 'Inovação', data: inov.map((x) => x.n) },
            { label: 'Orientações concl.', data: orient.map((x) => x.n) }
        ]);
    }

    // ─── render: produção ──────────────────────────────────────────────────────
    function renderProducao() {
        const p = groupsData.producoes;
        $('kpi-producao').innerHTML = '';
        kpi('kpi-producao', 'Bibliográfica', fmt(p.bibliografica.length), 'artigos, livros, eventos');
        kpi('kpi-producao', 'Técnica', fmt(p.tecnica.length), 'cursos, organização, consultoria');
        kpi('kpi-producao', 'Orientações Concluídas', fmt(p.concluidas.length), 'todas os níveis');
        kpi('kpi-producao', 'Orientações em Andamento', fmt(p.andamento.length), 'capacidade futura');
        kpi('kpi-producao', 'Inovação', fmt(p.inovacao.length), 'patentes + softwares', 'accent');

        doughnut('chart-composicao',
            ['Bibliográfica', 'Técnica', 'Inovação', 'Orientações concl.', 'Orientações and.'],
            [p.bibliografica.length, p.tecnica.length, p.inovacao.length, p.concluidas.length, p.andamento.length]);

        const tb = toEntries(contar(p.bibliografica, 'Tipo')).slice(0, 8);
        barV('chart-tipos-biblio', tb.map(([k]) => k), tb.map(([, v]) => v), PALETA[0]);

        const estratoOrdem = ['A1', 'A2', 'B1', 'B2', 'B3', 'B4', 'B5', 'C', '-'];
        const artigosPeriodicos = p.bibliografica.filter((r) => (r.Tipo || '').toLowerCase().includes('periódicos') || (r.Tipo || '').toLowerCase().includes('periodicos'));
        const contagemEstrato = {};
        for (const r of artigosPeriodicos) {
            const e = (r.Estrato || '').trim().toUpperCase();
            contagemEstrato[e || 'SEM ESTRATO'] = (contagemEstrato[e || 'SEM ESTRATO'] || 0) + 1;
        }
        const qualisLabels = estratoOrdem.filter((e) => contagemEstrato[e] !== undefined);
        const qualisResto = contagemEstrato['SEM ESTRATO'] || 0;
        const qualisLabelsFinal = [...qualisLabels, ...(qualisResto ? ['SEM ESTRATO'] : [])];
        barV('chart-qualis', qualisLabelsFinal, qualisLabelsFinal.map((e) => contagemEstrato[e] || 0), PALETA[2]);

        const tt = toEntries(contar(p.tecnica, 'Tipo')).slice(0, 8);
        barV('chart-tipos-tecnicos', tt.map(([k]) => k), tt.map(([, v]) => v), PALETA[1]);
    }

    // ─── render: inovação ──────────────────────────────────────────────────────
    function renderInovacao() {
        const p = groupsData.producoes.inovacao;
        const tipos = contar(p, 'Tipo');
        const patentes = (tipos['Patente'] || 0) + (tipos['Patente de Invenção'] || 0) + (tipos['Patente de Modelo de Utilidade'] || 0);
        const softwares = (tipos['Software'] || 0) + (tipos['Softwares'] || 0);
        const di = tipos['Desenho Insdustrial'] || tipos['Desenho Industrial'] || 0;

        $('kpi-inovacao').innerHTML = '';
        kpi('kpi-inovacao', 'Patentes', fmt(patentes), 'depósitos/registros', 'accent');
        kpi('kpi-inovacao', 'Softwares', fmt(softwares), 'registros de programa');
        kpi('kpi-inovacao', 'Desenho Industrial', fmt(di), 'registros');
        kpi('kpi-inovacao', 'Total Inovação', fmt(p.length), 'todas as modalidades');

        doughnut('chart-inov-tipo',
            ['Patente', 'Software', 'Desenho Industrial'],
            [patentes, softwares, di]);

        const inovComCampus = p.filter((r) => r.campus);
        const porCampus = toEntries(contar(inovComCampus, 'campus')).slice(0, 12);
        barH('chart-inov-campus', porCampus.map(([k]) => k), porCampus.map(([, v]) => v), PALETA[3]);

        const { minYear, maxYear } = dados.meta;
        const serie = serieAnos(minYear, maxYear, contarPorAno(p));
        line('chart-inov-evolucao', serie.map((x) => x.ano), [{ label: 'Inovação', data: serie.map((x) => x.n) }]);
    }

    // ─── render: grupos ────────────────────────────────────────────────────────
    const SITUACAO_SHORT = {
        'Certificado': 'Certificado',
        'Certificado - Não-atualizado há mais de 12 meses': 'Certificado (desatualizado)',
        'Em preenchimento': 'Em preenchimento',
        'Aguardando certificação': 'Aguardando certif.',
        'Excluído': 'Excluído'
    };

    function dashRows() {
        return gruposPontuados.map(({ grupo: g, resultado }) => {
            const p = resultado.pontuacao;
            return {
                nome: g.Nome || '',
                unidade: g.Unidade || '',
                area: g.Area || '',
                situacao: g.Situacao || '',
                membros: p.membros,
                pontos: p.total,
                porMembro: p.porMembro,
                minimo: p.minimoRequerido,
                atingiu: p.atingiu,
                faixa: p.faixaGrupo,
                grupo: g
            };
        });
    }

    function renderRankings() {
        const rows = dashRows();
        const top = [...rows].sort((a, b) => b.pontos - a.pontos).slice(0, 10);
        const risco = [...rows].sort((a, b) => a.porMembro - b.porMembro).slice(0, 10);

        $('rank-top').innerHTML = top.map((r, i) =>
            `<li><span class="rank-pos">${i + 1}</span> <span class="rank-nome">${r.nome}</span> <span class="rank-valor">${fmt(r.pontos)} pts · ${r.unidade.replace('IFBA - Campus ', '')}</span></li>`
        ).join('');

        $('rank-risco').innerHTML = risco.map((r, i) =>
            `<li><span class="rank-pos rank-pos--warn">${i + 1}</span> <span class="rank-nome">${r.nome}</span> <span class="rank-valor">${fmt1(r.porMembro)} pts/membro · ${r.situacao}</span></li>`
        ).join('');
    }

    function renderDashTable() {
        const search = ($('dash-search').value || '').toLowerCase().trim();
        const campus = $('dash-campus').value;
        const area = $('dash-area').value;
        const sit = $('dash-situacao').value;

        let rows = dashRows().filter((r) => {
            if (search && !r.nome.toLowerCase().includes(search) && !r.area.toLowerCase().includes(search)) return false;
            if (campus && r.unidade !== campus) return false;
            if (area && r.area !== area) return false;
            if (sit && r.situacao !== sit) return false;
            return true;
        });

        const { key, asc } = dashSort;
        rows.sort((a, b) => {
            let va = a[key], vb = b[key];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (key === 'atingiu') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return asc ? cmp : -cmp;
        });

        $('dash-group-count').textContent = `${fmt(rows.length)} de ${fmt(gruposPontuados.length)} grupos`;

        $('dash-tbody').innerHTML = rows.map((r) => {
            const atingiuCls = r.atingiu ? 'badge badge--ok' : 'badge badge--bad';
            const atingiuTxt = r.atingiu ? 'SIM' : 'NÃO';
            const minTxt = r.minimo === null ? '—' : fmt1(r.minimo);
            return `<tr>
                <td class="td-nome">${r.nome}</td>
                <td>${r.unidade.replace('IFBA - Campus ', '')}</td>
                <td>${r.area}</td>
                <td>${SITUACAO_SHORT[r.situacao] || r.situacao}</td>
                <td class="td-num">${fmt(r.membros)}</td>
                <td class="td-num">${fmt(r.pontos)}</td>
                <td class="td-num">${fmt1(r.porMembro)}</td>
                <td class="td-num">${minTxt}</td>
                <td><span class="${atingiuCls}">${atingiuTxt}</span></td>
                <td>${r.faixa}</td>
            </tr>`;
        }).join('');
    }

    function populateDashFilters() {
        const campi = [...new Set(groupsData.grupos.map((g) => g.Unidade).filter(Boolean))].sort();
        const areas = [...new Set(groupsData.grupos.map((g) => g.Area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
        const sits = [...new Set(groupsData.grupos.map((g) => g.Situacao).filter(Boolean))];

        $('dash-campus').innerHTML = '<option value="">Todos os campi</option>' + campi.map((c) => `<option value="${c}">${c.replace('IFBA - Campus ', '')}</option>`).join('');
        $('dash-area').innerHTML = '<option value="">Todas as áreas</option>' + areas.map((a) => `<option value="${a}">${a}</option>`).join('');
        $('dash-situacao').innerHTML = '<option value="">Todas as situações</option>' + sits.map((s) => `<option value="${s}">${SITUACAO_SHORT[s] || s}</option>`).join('');
    }

    // ─── render: orientações ───────────────────────────────────────────────────
    const NIVEL_LABEL = {
        'Orientações de Graduação': 'Graduação (TCC)',
        'Orientações de Iniciação Científica': 'Iniciação Científica',
        'Orientações de Aperfeiçoamento/Especialização': 'Especialização',
        'Orientações de Mestrado': 'Mestrado',
        'Orientações de Doutorado': 'Doutorado',
        'Orientações de Pós-Doutorado': 'Pós-Doutorado',
        'Outras Orientações': 'Outras'
    };

    function renderOrientacoes() {
        const p = groupsData.producoes;
        const concl = contar(p.concluidas, 'Tipo');
        const and = contar(p.andamento, 'Tipo');
        const mestradoDocConcl = (concl['Orientações de Mestrado'] || 0) + (concl['Orientações de Doutorado'] || 0) + (concl['Orientações de Pós-Doutorado'] || 0);
        const mestradoDocAnd = (and['Orientações de Mestrado'] || 0) + (and['Orientações de Doutorado'] || 0) + (and['Orientações de Pós-Doutorado'] || 0);

        $('kpi-orientacoes').innerHTML = '';
        kpi('kpi-orientacoes', 'Concluídas', fmt(p.concluidas.length), 'todas os níveis');
        kpi('kpi-orientacoes', 'Em Andamento', fmt(p.andamento.length), 'disponibilidade futura');
        kpi('kpi-orientacoes', 'Mestrado/Doutorado Concluídos', fmt(mestradoDocConcl), 'formação stricto sensu', 'accent');
        kpi('kpi-orientacoes', 'Mestrado/Doutorado em Andamento', fmt(mestradoDocAnd), 'pipeline de mestres/doutores');

        const ordem = ['Orientações de Graduação', 'Orientações de Iniciação Científica', 'Orientações de Aperfeiçoamento/Especialização', 'Orientações de Mestrado', 'Orientações de Doutorado', 'Orientações de Pós-Doutorado', 'Outras Orientações'];
        const labels = ordem.map((k) => NIVEL_LABEL[k] || k);
        const valsConcl = ordem.map((k) => concl[k] || 0);
        const valsAnd = ordem.map((k) => and[k] || 0);
        barV('chart-orient-concluidas', labels, valsConcl, PALETA[0]);
        barV('chart-orient-andamento', labels, valsAnd, PALETA[1]);

        const { minYear, maxYear } = dados.meta;
        const serie = serieAnos(minYear, maxYear, contarPorAno(p.concluidas));
        line('chart-orient-evolucao', serie.map((x) => x.ano), [{ label: 'Concluídas', data: serie.map((x) => x.n) }]);
    }

    // ─── navegação entre views ─────────────────────────────────────────────────
    function setView(view) {
        const isDash = view === 'dashboard';
        $('view-dashboard-btn').classList.toggle('is-active', isDash);
        $('view-validacao-btn').classList.toggle('is-active', !isDash);
        $('dashboard-view').classList.toggle('is-hidden', !isDash);

        // esconde a validação
        const valEls = ['controls', 'landing-section'];
        for (const id of valEls) {
            const el = $(id);
            if (el) el.style.display = isDash ? 'none' : '';
        }
        // evita o overlay de aviso atrapalhar no dashboard
        const aviso = $('aviso-experimental');
        if (aviso && !aviso.classList.contains('is-hidden')) {
            try { localStorage.setItem('aviso-ciencia', '1'); } catch (e) { /* noop */ }
            aviso.classList.add('is-hidden');
        }
        if (isDash) renderAllCharts();
    }

    function setDashTab(tab) {
        document.querySelectorAll('.dash-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.dashTab === tab));
        document.querySelectorAll('.dash-panel').forEach((p) => p.classList.toggle('is-active', p.id === 'dash-' + tab));
        renderAllCharts();
    }

    function renderAllCharts() {
        if (!dados) return;
        // Chart.js recalcula tamanho quando visível
        Object.values(charts).forEach((c) => c.resize());
    }

    // ─── init ──────────────────────────────────────────────────────────────────
    window.initDashboard = function (dadosDash, groups) {
        dados = dadosDash;
        groupsData = groups;
        if (!dados || !groupsData || !groupsData.grupos) return;

        const t0 = performance.now();
        pontuarTodos();
        // eslint-disable-next-line no-console
        console.log(`[dashboard] agregação pronta em ${((performance.now() - t0) / 1000).toFixed(1)}s`);

        $('view-dashboard-btn').addEventListener('click', () => setView('dashboard'));
        $('view-validacao-btn').addEventListener('click', () => setView('validacao'));
        document.querySelectorAll('.dash-tab').forEach((b) => b.addEventListener('click', () => setDashTab(b.dataset.dashTab)));

        // filtros e ordenação da tabela
        ['dash-search', 'dash-campus', 'dash-area', 'dash-situacao'].forEach((id) => {
            $(id).addEventListener('input', renderDashTable);
            $(id).addEventListener('change', renderDashTable);
        });
        document.querySelectorAll('#dash-table th[data-dash-sort]').forEach((th) => {
            th.addEventListener('click', () => {
                const key = th.dataset.dashSort;
                if (dashSort.key === key) dashSort.asc = !dashSort.asc;
                else { dashSort.key = key; dashSort.asc = key === 'nome' || key === 'unidade' || key === 'area' || key === 'situacao' || key === 'faixa'; }
                renderDashTable();
            });
        });

        populateDashFilters();
        renderVisaoGeral();
        renderProducao();
        renderInovacao();
        renderOrientacoes();
        renderRankings();
        renderDashTable();
    };
})();
