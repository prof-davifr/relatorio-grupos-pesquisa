'use strict';
/* Dashboard gerencial — PRPGI/IFBA
 * Foco: produção POR GRUPO. Não consolida produção nível IFBA (isso é do
 * dashboard-prpgi). Pergunta central: "onde os grupos mais pontuam?" — por
 * categoria, por campus/área, e quem são os grupos — com filtro temporal
 * recortando as pontuações.
 */
(function () {
    // ─── estado ────────────────────────────────────────────────────────────────
    let dados = null;        // data.json
    let groupsData = null;   // data-groups.json
    let idx = null;          // índice Servidor → produções
    let fatiasCache = null;  // fatia por grupo (independe do período)
    let gruposPontuados = [];// { grupo, resultado } no período atual
    let periodo = { start: null, end: null, label: 'todo o período' }; // null = todo
    const charts = {};
    let dashSort = { key: 'pontos', asc: false };

    const CATEGORIAS = [
        { key: 'bibliografica', label: 'Bibliográfica' },
        { key: 'tecnica', label: 'Técnica' },
        { key: 'eventos', label: 'Eventos' },
        { key: 'orientacoesConcluidas', label: 'Orientações concl.' },
        { key: 'orientacoesAndamento', label: 'Orientações and.' },
        { key: 'inovacao', label: 'Inovação' },
        { key: 'projetos', label: 'Projetos' },
        { key: 'cultural', label: 'Cultural/Artística' }
    ];
    const CORES_CATEGORIA = {
        bibliografica: '#1a73e8', tecnica: '#e8710a', eventos: '#188038',
        orientacoesConcluidas: '#9334e6', orientacoesAndamento: '#1882a8',
        inovacao: '#b31412', projetos: '#f7b500', cultural: '#5f6368'
    };

    // ─── util ──────────────────────────────────────────────────────────────────
    const fmt = (n) => (n ?? 0).toLocaleString('pt-BR');
    const fmt1 = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const truncar = (s, n = 34) => (s || '').length > n ? (s.slice(0, n - 1) + '…') : s;
    const h = escapeHtml; // alias curto: SEMPRE escapar dados externos em HTML
    const $ = (id) => document.getElementById(id);

    // Unidades canônicas: consolida variantes do mesmo campus (ex.: "Salvador" =
    // "IFBA - Campus Salvador"). Polo de Inovação é unidade própria.
    const UNIDADE_CANONICA = {
        'Salvador': 'IFBA - Campus Salvador',
        'IFBA - Campus Salvador': 'IFBA - Campus Salvador'
    };
    const unidadeCanonica = (u) => UNIDADE_CANONICA[u] || u || '—';
    const campusCurto = (u) => unidadeCanonica(u).replace('IFBA - Campus ', '');

    // ─── índice e fatias (independem do período) ──────────────────────────────
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

    function getFatias() {
        if (!fatiasCache) {
            idx = buildIndex(groupsData.producoes);
            fatiasCache = groupsData.grupos.map((g) => fatiaPorGrupo(g, idx));
        }
        return fatiasCache;
    }

    /** Recalcula a pontuação de todos os grupos para o período atual. */
    function pontuarTodos() {
        const t0 = performance.now();
        const fatias = getFatias();
        const custom = (periodo.start != null && periodo.end != null) ? { start: periodo.start, end: periodo.end } : null;
        gruposPontuados = groupsData.grupos.map((g, i) => ({
            grupo: g,
            resultado: new ValidadorGrupo(g, { grupos: [], producoes: fatias[i] }, dados, 'custom', custom).validar()
        }));
        // eslint-disable-next-line no-console
        console.log(`[dashboard] ${gruposPontuados.length} grupos × período ${periodo.label} em ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    }

    // ─── agregações genéricas ─────────────────────────────────────────────────
    function toEntries(m) { return Object.entries(m).sort((a, b) => b[1] - a[1]); }

    // ─── Chart.js ──────────────────────────────────────────────────────────────
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
        plugins: { legend: { labels: { boxWidth: 12, font: { size: 10 } } } },
        animation: { duration: 300 }
    };

    function doughnut(canvasId, labels, values) {
        makeChart(canvasId, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: PALETA, borderWidth: 1 }] },
            options: { ...BASE_OPTS, cutout: '52%', plugins: { ...BASE_OPTS.plugins, legend: { ...BASE_OPTS.plugins.legend, position: 'right' } } }
        });
    }

    function barH(canvasId, labels, values, color = PALETA[0]) {
        makeChart(canvasId, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 3 }] },
            options: { ...BASE_OPTS, indexAxis: 'y', plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }
        });
    }

    function barV(canvasId, labels, values, colors = PALETA[0]) {
        makeChart(canvasId, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 3 }] },
            options: { ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }
        });
    }

    function line(canvasId, labels, series) {
        makeChart(canvasId, {
            type: 'line',
            data: {
                labels,
                datasets: series.map((s, i) => ({
                    label: s.label, data: s.data,
                    borderColor: PALETA[i % PALETA.length],
                    backgroundColor: PALETA[i % PALETA.length] + '22',
                    fill: true, tension: 0.3, pointRadius: 1
                }))
            },
            options: { ...BASE_OPTS }
        });
    }

    function stackedBar(canvasId, labels, series) {
        makeChart(canvasId, {
            type: 'bar',
            data: {
                labels,
                datasets: series.map((s) => ({
                    label: s.label,
                    data: s.data,
                    backgroundColor: CORES_CATEGORIA[s.key],
                    stack: 'g',
                    borderRadius: 0
                }))
            },
            options: { ...BASE_OPTS, indexAxis: 'y', scales: { x: { stacked: true }, y: { stacked: true, ticks: { font: { size: 9 } } } } }
        });
    }

    // ─── KPIs ──────────────────────────────────────────────────────────────────
    function kpi(containerId, titulo, valor, detalhe = '', cor = '') {
        const el = $(containerId);
        if (!el) return;
        const card = document.createElement('div');
        card.className = 'kpi-card' + (cor ? ' kpi-card--' + cor : '');
        // tudo é texto: escapar para evitar XSS via nomes/detalhes dos dados
        card.innerHTML = `<div class="kpi-label">${h(titulo)}</div><div class="kpi-value">${h(valor)}</div>` +
            (detalhe ? `<div class="kpi-detail">${h(detalhe)}</div>` : '');
        el.appendChild(card);
    }

    // ─── helpers de pontuação ─────────────────────────────────────────────────
    function detalhe(gp) { return gp.resultado.pontuacao.detalhamento || {}; }

    function orientPontos(det) { return (det.orientacoesConcluidas || 0) + (det.orientacoesAndamento || 0); }

    /** Soma dos pontos por categoria (todos os grupos) — "onde pontuam". */
    function somaPorCategoria() {
        const m = {};
        for (const gp of gruposPontuados) {
            const det = detalhe(gp);
            for (const { key } of CATEGORIAS) m[key] = (m[key] || 0) + (det[key] || 0);
        }
        return m;
    }

    function periodoCustom() {
        return periodo.start != null ? `${periodo.start}–${periodo.end}` : 'todo o período';
    }

    // ─── render: ranking ───────────────────────────────────────────────────────
    const SITUACAO_SHORT = {
        'Certificado': 'Certificado',
        'Certificado - Não-atualizado há mais de 12 meses': 'Certificado (desat.)',
        'Em preenchimento': 'Em preenchimento',
        'Aguardando certificação': 'Aguard. certif.',
        'Excluído': 'Excluído'
    };

    function dashRows() {
        return gruposPontuados.map((gp) => {
            const g = gp.grupo;
            const p = gp.resultado.pontuacao;
            const det = detalhe(gp);
            return {
                nome: g.Nome || '',
                unidade: unidadeCanonica(g.Unidade || ''),
                area: g.Area || '',
                situacao: g.Situacao || '',
                membros: p.membros,
                pontos: p.total,
                porMembro: p.porMembro,
                minimo: p.minimoRequerido,
                atingiu: p.atingiu,
                faixa: p.faixaGrupo,
                detalhamento: det,
                grupo: g
            };
        });
    }

    function renderRankings() {
        document.querySelectorAll('.rank-period').forEach((el) => { el.textContent = `(${periodoCustom()})`; });
        // Grupos excluídos do DGP não competem no ranking de pontuação (decisão gerencial)
        const ativos = dashRows().filter((r) => r.situacao !== 'Excluído');
        const top = [...ativos].sort((a, b) => b.pontos - a.pontos).slice(0, 10);
        const risco = [...ativos].sort((a, b) => a.porMembro - b.porMembro).slice(0, 10);

        $('rank-top').innerHTML = top.map((r, i) =>
            `<li><span class="rank-pos">${i + 1}</span> <span class="rank-nome" title="${h(r.nome)}">${truncar(h(r.nome))}</span>` +
            `<span class="rank-valor"><b>${fmt(r.pontos)}</b> pts · ${h(campusCurto(r.unidade))}</span></li>`
        ).join('');

        $('rank-risco').innerHTML = risco.map((r, i) =>
            `<li><span class="rank-pos rank-pos--warn">${i + 1}</span> <span class="rank-nome" title="${h(r.nome)}">${truncar(h(r.nome))}</span>` +
            `<span class="rank-valor">${fmt1(r.porMembro)} pts/membro · ${h(SITUACAO_SHORT[r.situacao] || r.situacao)}</span></li>`
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
            let va, vb;
            if (key.startsWith('detalhamento.')) {
                const k = key.slice('detalhamento.'.length);
                // a coluna Orient. exibe concluídas + andamento; ordenar pelo mesmo total
                va = k === 'orientacoesConcluidas' ? orientPontos(a.detalhamento) : (a.detalhamento[k] || 0);
                vb = k === 'orientacoesConcluidas' ? orientPontos(b.detalhamento) : (b.detalhamento[k] || 0);
            } else {
                va = a[key]; vb = b[key];
                if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
                if (key === 'atingiu') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
            }
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return asc ? cmp : -cmp;
        });

        $('dash-group-count').textContent = `${fmt(rows.length)} de ${fmt(gruposPontuados.length)} grupos`;

        $('dash-tbody').innerHTML = rows.map((r) => {
            const det = r.detalhamento;
            const atingiuCls = r.atingiu ? 'badge badge--ok' : 'badge badge--bad';
            const atingiuTxt = r.atingiu ? 'SIM' : 'NÃO';
            const excluido = r.situacao === 'Excluído';
            const semLider = !r.grupo.LiderId;
            return `<tr${excluido ? ' class="row-excluido"' : ''}>
                <td class="td-nome" title="${h(r.nome)}">${h(r.nome)}${excluido ? ' <span class="badge badge--bad">Excluído</span>' : ''}</td>
                <td>${h(campusCurto(r.unidade))}</td>
                <td>${h(r.area)}</td>
                <td>${h(SITUACAO_SHORT[r.situacao] || r.situacao)}${semLider ? ' <span class="badge badge--warn" title="Líder não identificado no DGP — critérios de líder não avaliados">sem líder</span>' : ''}</td>
                <td class="td-num">${fmt(r.membros)}</td>
                <td class="td-num td-total">${fmt(r.pontos)}</td>
                <td class="td-num">${fmt(det.bibliografica || 0)}</td>
                <td class="td-num">${fmt(det.tecnica || 0)}</td>
                <td class="td-num">${fmt(det.eventos || 0)}</td>
                <td class="td-num">${fmt(orientPontos(det))}</td>
                <td class="td-num">${fmt(det.inovacao || 0)}</td>
                <td class="td-num">${fmt1(r.porMembro)}</td>
                <td><span class="${atingiuCls}">${atingiuTxt}</span></td>
            </tr>`;
        }).join('');
    }

    // ─── render: pesquisadores ────────────────────────────────────────────────
    const NOME_PESQ = {};    // servidor → nome
    const CAMPUS_PESQ = {};  // servidor → campus
    const LIDER_PESQ = new Set();
    const GRUPOS_PESQ = {};  // servidor → nº de grupos
    let pesqSort = { key: 'pontos', asc: false };
    let pesqCache = null;    // mapa servidor → { pontos, n, cats } no período atual

    function prepararPesquisadores() {
        // base: mapa Servidor→nome injetado dos XLSX (groupsData.servidores)
        if (groupsData.servidores) {
            for (const [id, nome] of Object.entries(groupsData.servidores)) {
                if (!NOME_PESQ[id]) NOME_PESQ[id] = nome;
            }
        }
        for (const g of groupsData.grupos) {
            const campus = campusCurto(g.Unidade);
            for (const m of (g.membrosMap || [])) {
                const s = String(m.siape);
                if (!s || s === 'null' || s === 'undefined') continue;
                if (!NOME_PESQ[s]) NOME_PESQ[s] = m.nome || s;
                if (!CAMPUS_PESQ[s]) CAMPUS_PESQ[s] = campus;
                GRUPOS_PESQ[s] = (GRUPOS_PESQ[s] || 0) + 1;
            }
            if (g.LiderId) LIDER_PESQ.add(String(g.LiderId));
        }
    }

    /** Normaliza o campo Servidor: strings sujas do tipo
     * "<VinculoQueryset [<Vinculo: Nome (268700) (Servidor)>]>" viram {id, nome}. */
    function normalizarServidor(s) {
        if (/^\d+$/.test(s)) return { id: s, nome: null };
        const mId = s.match(/\((\d{5,})\)\s*\(Servidor\)/);
        if (mId) {
            const mNome = s.match(/Vinculo: (.+?) \(\d{5,}\)/);
            return { id: mId[1], nome: mNome ? mNome[1].trim() : null };
        }
        return { id: null, nome: null };
    }

    /** Pontua cada pesquisador no período atual, replicando o validador oficial. */
    function pontuarPesquisadores() {
        const start = (periodo.start != null) ? periodo.start : dados.meta.minYear;
        const end = (periodo.end != null) ? periodo.end : dados.meta.maxYear;
        const mapa = {};
        const seen = {};

        const processar = (arr) => {
            for (const r of arr) {
                const s = r.Servidor;
                if (!s) continue;
                const ns = normalizarServidor(s);
                if (!ns.id) continue;
                const sid = ns.id;
                if (ns.nome && !NOME_PESQ[sid]) NOME_PESQ[sid] = ns.nome;
                const ano = parseInt(r.Ano, 10);
                if (isNaN(ano) || ano < start || ano > end) continue;
                const mapping = mapProducaoToCategoria(r.Tipo || '', r.Subtipo || '', r.Estrato || '', r.concluida);
                if (!mapping) continue;
                const item = SCORING_TABLE[mapping.categoria]?.items.find((i) => i.id === mapping.itemId);
                if (!item) continue;
                const dk = r.dedupKey || '';
                if (dk) {
                    const key = mapping.categoria + '|' + dk;
                    const sseen = seen[sid] || (seen[sid] = new Set());
                    if (sseen.has(key)) continue;
                    sseen.add(key);
                }
                const p = mapa[sid] || (mapa[sid] = { pontos: 0, n: 0, cats: {}, prods: [] });
                p.pontos += item.pontos;
                p.n += 1;
                p.cats[mapping.categoria] = (p.cats[mapping.categoria] || 0) + item.pontos;
                p.prods.push({
                    cat: mapping.categoria,
                    itemId: mapping.itemId,
                    itemDesc: item.desc,
                    pontos: item.pontos,
                    tipo: r.Tipo || '',
                    titulo: r.Publicacao || r.Publicação || r.titulo || r.Título || r.Nome || '',
                    periodico: r.Periodico || r.Periódico || '',
                    estrato: r.Estrato || '',
                    ano: r.Ano || ''
                });
            }
        };

        processar(groupsData.producoes.bibliografica || []);
        processar(groupsData.producoes.tecnica || []);
        processar(groupsData.producoes.inovacao || []);
        processar(groupsData.producoes.concluidas || []);
        processar(groupsData.producoes.andamento || []);
        pesqCache = mapa;
        return mapa;
    }

    function pesqRows() {
        const mapa = pesqCache || pontuarPesquisadores();
        return Object.entries(mapa)
            .map(([s, v]) => ({
                servidor: s,
                nome: nomePesq(s, NOME_PESQ[s]),
                campus: CAMPUS_PESQ[s] || '—',
                lider: LIDER_PESQ.has(s),
                grupos: GRUPOS_PESQ[s] || 0,
                pontos: v.pontos,
                n: v.n,
                cats: v.cats
            }))
            .sort((a, b) => b.pontos - a.pontos);
    }

    function orientPesq(cats) { return (cats.orientacoesConcluidas || 0) + (cats.orientacoesAndamento || 0); }

    /** Nome apresentável: cai para "Servidor <id>" se não resolvido/parse sujo. */
    function nomePesq(s, nome) {
        if (nome && !nome.includes('<') && !nome.includes('Vinculo') && nome.trim()) return nome;
        return 'Servidor ' + s;
    }

    function renderPesquisadores() {
        const rows = pesqRows();
        const totalPts = rows.reduce((s, r) => s + r.pontos, 0);
        const top10 = rows.slice(0, 10);

        $('kpi-pesq').innerHTML = '';
        kpi('kpi-pesq', 'Pesquisadores que pontuam', fmt(rows.length), periodoCustom(), 'accent');
        kpi('kpi-pesq', 'Pontos no período', fmt1(totalPts), 'soma de todos os pesquisadores');
        kpi('kpi-pesq', 'Média por pesquisador', fmt1(totalPts / (rows.length || 1)), 'dos que pontuam');
        kpi('kpi-pesq', 'Top pesquisador', fmt1(top10[0]?.pontos || 0), (top10[0]?.nome || '—').slice(0, 34));

        $('rank-pesq').innerHTML = top10.map((r, i) =>
            `<li><span class="rank-pos">${i + 1}</span> <span class="rank-nome rank-link" title="Clique para ver as contribuições" onclick="abrirPesquisador('${r.servidor}')">${truncar(h(r.nome))}</span>` +
            `<span class="rank-valor"><b>${fmt1(r.pontos)}</b> pts · ${h(r.campus)}${r.lider ? ' · líder' : ''}</span></li>`
        ).join('');

        // composição dos pontos do top 10 (soma por categoria)
        const somaCats = {};
        for (const r of top10) for (const [cat, pts] of Object.entries(r.cats)) somaCats[cat] = (somaCats[cat] || 0) + pts;
        const labels = CATEGORIAS.filter((c) => somaCats[c.key] > 0).map((c) => c.label);
        const values = CATEGORIAS.filter((c) => somaCats[c.key] > 0).map((c) => somaCats[c.key]);
        doughnut('chart-pesq-composicao', labels, values);

        renderPesqTable(rows);
    }

    function renderPesqTable(rows) {
        if (!rows) rows = pesqRows();
        const search = ($('pesq-search').value || '').toLowerCase().trim();
        let filtered = rows;
        if (search) filtered = rows.filter((r) => r.nome.toLowerCase().includes(search) || r.servidor.includes(search));

        const { key, asc } = pesqSort;
        filtered = [...filtered];
        if (key === 'pos') { filtered.sort((a, b) => rows.indexOf(a) - rows.indexOf(b)); }
        else {
            filtered.sort((a, b) => {
                let va, vb;
                if (key.startsWith('cats.')) {
                    const k = key.slice(5);
                    va = a.cats[k] || 0; vb = b.cats[k] || 0;
                } else { va = a[key]; vb = b[key]; }
                if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
                if (key === 'lider') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
                const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                return asc ? cmp : -cmp;
            });
        }

        $('pesq-count').textContent = `${fmt(filtered.length)} de ${fmt(rows.length)} pesquisadores`;
        $('pesq-tbody').innerHTML = filtered.map((r) => {
            const pos = rows.indexOf(r) + 1;
            return `<tr>
                <td class="td-num">${pos}</td>
                <td class="td-nome"><span class="td-link" title="Clique para ver as contribuições" onclick="abrirPesquisador('${r.servidor}')">${truncar(h(r.nome), 38)}</span></td>
                <td>${h(r.campus)}</td>
                <td>${r.lider ? '<span class="badge badge--ok">Líder</span>' : '—'}</td>
                <td class="td-num">${fmt(r.grupos)}</td>
                <td class="td-num td-total">${fmt1(r.pontos)}</td>
                <td class="td-num">${fmt(r.n)}</td>
                <td class="td-num">${fmt(r.cats.bibliografica || 0)}</td>
                <td class="td-num">${fmt(r.cats.tecnica || 0)}</td>
                <td class="td-num">${fmt(r.cats.eventos || 0)}</td>
                <td class="td-num">${fmt(orientPesq(r.cats))}</td>
                <td class="td-num">${fmt(r.cats.inovacao || 0)}</td>
            </tr>`;
        }).join('');
    }

    // ─── modal do pesquisador ─────────────────────────────────────────────────
    const CAT_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.key, c.label]));

    function abrirPesquisador(servidor) {
        const mapa = pesqCache || pontuarPesquisadores();
        const v = mapa[servidor];
        if (!v) return;
        const nome = nomePesq(servidor, NOME_PESQ[servidor]);
        const campus = CAMPUS_PESQ[servidor] || '—';
        const lider = LIDER_PESQ.has(servidor);
        const grupos = GRUPOS_PESQ[servidor] || 0;

        $('pesq-modal-nome').textContent = nome;
        $('pesq-modal-meta').innerHTML =
            `<span class="badge badge--ok">${campus}</span>` +
            (lider ? `<span class="badge badge--ok">Líder de grupo</span>` : '') +
            (grupos ? `<span class="badge badge--ok">Membro de ${grupos} grupo(s)</span>` : '') +
            `<span class="pesq-modal-siape">SIAPE ${servidor}</span>`;

        $('pesq-modal-kpis').innerHTML = '';
        kpi('pesq-modal-kpis', 'Pontos no período', fmt1(v.pontos), periodoCustom(), 'accent');
        kpi('pesq-modal-kpis', 'Produções pontuadas', fmt(v.n), 'após deduplicação');
        kpi('pesq-modal-kpis', 'Média pts/produção', fmt1(v.pontos / (v.n || 1)), 'intensidade média');
        const nCats = Object.keys(v.cats).length;
        kpi('pesq-modal-kpis', 'Categorias pontuadas', fmt(nCats), 'de 8 possíveis');

        const catsOrdenadas = CATEGORIAS.filter((c) => v.cats[c.key]).sort((a, b) => (v.cats[b.key] || 0) - (v.cats[a.key] || 0));
        doughnut('pesq-modal-chart',
            catsOrdenadas.map((c) => c.label),
            catsOrdenadas.map((c) => v.cats[c.key]));

        const prodsPorCat = {};
        for (const p of v.prods) (prodsPorCat[p.cat] || (prodsPorCat[p.cat] = [])).push(p);

        $('pesq-modal-producoes').innerHTML = catsOrdenadas.map((c) => {
            const prods = prodsPorCat[c.key].sort((a, b) => b.pontos - a.pontos);
            const titulo = CAT_LABEL[c.key];
            const totalCat = v.cats[c.key];
            return `<div class="pesq-cat">
                <h4 style="color:${CORES_CATEGORIA[c.key]}">${titulo} <span class="pesq-cat-pts">${fmt1(totalCat)} pts · ${fmt(prods.length)} itens</span></h4>
                <ul class="pesq-prods">${prods.map(prodHTML).join('')}</ul>
            </div>`;
        }).join('');

        $('pesq-modal').classList.remove('is-hidden');
        document.body.style.overflow = 'hidden';
    }

    function prodHTML(p) {
        const estrato = p.estrato ? `<span class="badge badge--qualis">${h(p.estrato)}</span>` : '';
        const detalhe = [p.periodico, p.tipo].filter(Boolean).join(' · ');
        return `<li class="pesq-prod">
            <span class="pesq-prod-pts">+${p.pontos}</span>
            <div class="pesq-prod-body">
                <div class="pesq-prod-titulo">${escapeHtml(p.titulo || '(sem título)')}</div>
                <div class="pesq-prod-meta">${p.ano ? `<b>${p.ano}</b>` : ''} ${detalhe ? '· ' + escapeHtml(detalhe) : ''} ${estrato} ${p.itemDesc ? '<span class="pesq-prod-item">' + escapeHtml(p.itemDesc) + '</span>' : ''}</div>
            </div>
        </li>`;
    }

    function fecharPesquisador() {
        $('pesq-modal').classList.add('is-hidden');
        document.body.style.overflow = '';
    }

    window.abrirPesquisador = abrirPesquisador;

    // ─── render: onde pontuam ─────────────────────────────────────────────────
    function renderOndePontuam() {
        const soma = somaPorCategoria();
        const total = Object.values(soma).reduce((s, v) => s + v, 0);

        $('kpi-onde').innerHTML = '';
        kpi('kpi-onde', 'Pontos no período', fmt1(total), periodoCustom(), 'accent');
        const catLider = CATEGORIAS.reduce((a, b) => (soma[b.key] || 0) > (soma[a.key] || 0) ? b : a);
        kpi('kpi-onde', 'Categoria dominante', catLider.label, `${fmt1(soma[catLider.key] || 0)} pts (${((soma[catLider.key] || 0) / total * 100).toFixed(0)}%)`);
        kpi('kpi-onde', 'Grupos que pontuam', fmt(gruposPontuados.filter((gp) => gp.resultado.pontuacao.total > 0).length), `de ${fmt(gruposPontuados.length)}`);
        kpi('kpi-onde', 'Pts/membro médio', fmt1(gruposPontuados.reduce((s, gp) => s + gp.resultado.pontuacao.porMembro, 0) / gruposPontuados.length), 'média simples entre grupos');

        const labels = CATEGORIAS.filter((c) => soma[c.key] > 0).map((c) => c.label);
        const values = CATEGORIAS.filter((c) => soma[c.key] > 0).map((c) => soma[c.key]);
        doughnut('chart-composicao-pontos', labels, values);

        // stacked: top 15 grupos, empilhado por categoria
        const top15 = [...gruposPontuados].sort((a, b) => b.resultado.pontuacao.total - a.resultado.pontuacao.total).slice(0, 15);
        const series = CATEGORIAS.map((c) => ({
            key: c.key,
            label: c.label,
            data: top15.map((gp) => detalhe(gp)[c.key] || 0)
        }));
        stackedBar('chart-stacked-grupos', top15.map((gp) => (gp.grupo.Nome || '').slice(0, 28)), series);

        // top 10 por categoria (seletor)
        const catSel = $('dash-cat-select');
        const catAtiva = catSel.value || 'bibliografica';
        catSel.innerHTML = CATEGORIAS.map((c) => `<option value="${c.key}">${c.label}</option>`).join('');
        catSel.value = catAtiva;
        renderTopCategoria(catAtiva);
    }

    function renderTopCategoria(catKey) {
        const top = [...gruposPontuados]
            .filter((gp) => (detalhe(gp)[catKey] || 0) > 0)
            .sort((a, b) => (detalhe(b)[catKey] || 0) - (detalhe(a)[catKey] || 0))
            .slice(0, 10);
        barH('chart-top-categoria',
            top.map((gp) => h((gp.grupo.Nome || '').slice(0, 30))),
            top.map((gp) => detalhe(gp)[catKey] || 0),
            CORES_CATEGORIA[catKey] || PALETA[0]);
    }

    // ─── render: campus & área ────────────────────────────────────────────────
    function renderCampusArea() {
        const rows = dashRows();

        const porCampus = {};
        for (const r of rows) {
            const c = campusCurto(r.unidade) || '(sem campus)';
            porCampus[c] = porCampus[c] || { n: 0, pts: 0, grupos: [] };
            porCampus[c].n++;
            porCampus[c].pts += r.pontos;
            porCampus[c].grupos.push(r);
        }
        const campi = Object.entries(porCampus).sort((a, b) => b[1].pts - a[1].pts);

        barH('chart-campus-pontos', campi.map(([c]) => h(c)), campi.map(([, v]) => v.pts), PALETA[0]);
        barH('chart-campus-media',
            campi.map(([c]) => h(c)),
            campi.map(([, v]) => v.pts / v.n),
            PALETA[2]);

        const porArea = {};
        for (const r of rows) {
            const a = r.area || '(sem área)';
            porArea[a] = (porArea[a] || 0) + r.pontos;
        }
        const areas = Object.entries(porArea).sort((a, b) => b[1] - a[1]).slice(0, 15);
        barH('chart-area-pontos', areas.map(([a]) => h(a.slice(0, 40))), areas.map(([, v]) => v), PALETA[4]);

        $('campus-tbody').innerHTML = campi.map(([c, v]) => {
            const melhor = [...v.grupos].sort((a, b) => b.pontos - a.pontos)[0];
            return `<tr>
                <td class="td-nome">${h(c)}</td>
                <td class="td-num">${fmt(v.n)}</td>
                <td class="td-num">${fmt1(v.pts)}</td>
                <td class="td-num">${fmt1(v.pts / v.n)}</td>
                <td title="${h(melhor ? melhor.nome : '')}">${melhor ? (h(melhor.nome.slice(0, 40)) + ' · ' + fmt(melhor.pontos) + ' pts') : '—'}</td>
            </tr>`;
        }).join('');
    }

    // ─── render: distribuição ─────────────────────────────────────────────────
    function histograma(values, nFaixas) {
        const min = Math.min(...values), max = Math.max(...values);
        if (min === max) return [{ label: String(fmt1(min)), n: values.length }];
        const passo = (max - min) / nFaixas;
        const bins = Array.from({ length: nFaixas }, (_, i) => ({ lo: min + i * passo, hi: min + (i + 1) * passo, n: 0 }));
        for (const v of values) {
            let b = Math.min(nFaixas - 1, Math.floor((v - min) / passo));
            bins[b].n++;
        }
        return bins.map((b) => ({ label: `${fmt1(b.lo)}–${fmt1(b.hi)}`, n: b.n }));
    }

    function renderDistribuicao() {
        const rows = dashRows().sort((a, b) => b.pontos - a.pontos);
        const pontos = rows.map((r) => r.pontos);
        const pm = rows.map((r) => r.porMembro);
        const totalPts = pontos.reduce((s, v) => s + v, 0);
        const top10 = rows.slice(0, Math.ceil(rows.length * 0.1));
        const ptsTop10 = top10.reduce((s, r) => s + r.pontos, 0);

        $('kpi-dist').innerHTML = '';
        kpi('kpi-dist', 'Pontos no período', fmt1(totalPts), periodoCustom(), 'accent');
        kpi('kpi-dist', 'Média por grupo', fmt1(totalPts / rows.length), `mediana ${fmt1(rows[Math.floor(rows.length / 2)].pontos)}`);
        kpi('kpi-dist', 'Top 10% concentra', `${((ptsTop10 / totalPts) * 100).toFixed(0)}%`, `dos pontos (${top10.length} grupos)`);
        kpi('kpi-dist', 'Maior pontuação', fmt1(pontos[0]), rows[0].nome.slice(0, 32));

        const h1 = histograma(pontos, 10);
        barV('chart-hist-pontos', h1.map((b) => b.label), h1.map((b) => b.n), PALETA.map((c) => c + 'cc'));

        const h2 = histograma(pm, 10);
        barV('chart-hist-pmembro', h2.map((b) => b.label), h2.map((b) => b.n), PALETA.map((c) => c + '99'));

        // concentração (curva): % acumulado de pontos pelos grupos ordenados
        let acum = 0;
        const acumulado = rows.map((r) => { acum += r.pontos; return (acum / totalPts) * 100; });
        const labels = rows.map((_, i) => `${Math.round(((i + 1) / rows.length) * 100)}%`);
        const eq = labels.map((l, i) => ((i + 1) / rows.length) * 100);
        line('chart-concentracao', labels, [
            { label: '% acumulado real', data: acumulado },
            { label: 'Igualdade perfeita', data: eq }
        ]);
    }

    // ─── período ──────────────────────────────────────────────────────────────
    function aplicarPeriodo(start, end, label) {
        periodo = { start, end, label };
        document.querySelectorAll('.dash-period-btn').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.dashPeriod === label);
        });
        const info = $('dash-period-info');
        if (info) {
            const anoCorrente = dados.meta.maxYear;
            const incluiParcial = end >= anoCorrente;
            info.textContent = `Período: ${periodoCustom()}${incluiParcial ? ' — ⚠ inclui ' + anoCorrente + ' (ano em curso, dados parciais)' : ''}`;
        }
        pesqCache = null; // invalida o ranking de pesquisadores
        const t0 = performance.now();
        pontuarTodos();
        // eslint-disable-next-line no-console
        console.log(`[dashboard] recalculado em ${((performance.now() - t0) / 1000).toFixed(1)}s`);
        renderAll();
    }

    // ─── render tudo ──────────────────────────────────────────────────────────
    function renderAll() {
        if (!dados) return;
        renderRankings();
        renderDashTable();
        renderPesquisadores();
        renderOndePontuam();
        renderCampusArea();
        renderDistribuicao();
        Object.values(charts).forEach((c) => c.resize());
    }

    function setDashTab(tab) {
        document.querySelectorAll('.dash-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.dashTab === tab));
        document.querySelectorAll('.dash-panel').forEach((p) => p.classList.toggle('is-active', p.id === 'dash-' + tab));
        Object.values(charts).forEach((c) => c.resize());
    }

    // ─── navegação entre views ────────────────────────────────────────────────
    function setView(view) {
        const isDash = view === 'dashboard';
        $('view-dashboard-btn').classList.toggle('is-active', isDash);
        $('view-validacao-btn').classList.toggle('is-active', !isDash);
        $('dashboard-view').classList.toggle('is-hidden', !isDash);

        for (const id of ['controls', 'landing-section']) {
            const el = $(id);
            if (el) el.style.display = isDash ? 'none' : '';
        }
        const aviso = $('aviso-experimental');
        if (aviso && !aviso.classList.contains('is-hidden')) {
            try { localStorage.setItem('aviso-ciencia', '1'); } catch (e) { /* noop */ }
            aviso.classList.add('is-hidden');
        }
        if (isDash) Object.values(charts).forEach((c) => c.resize());
    }

    // ─── init ──────────────────────────────────────────────────────────────────
    window.initDashboard = function (dadosDash, groups) {
        dados = dadosDash;
        groupsData = groups;
        if (!dados || !groupsData || !groupsData.grupos) return;

        const maxYear = dados.meta.maxYear;
        const minYear = dados.meta.minYear;

        prepararPesquisadores();
        // período inicial: todo
        aplicarPeriodo(minYear, maxYear, 'all');

        $('view-dashboard-btn').addEventListener('click', () => setView('dashboard'));
        $('view-validacao-btn').addEventListener('click', () => setView('validacao'));
        document.querySelectorAll('.dash-tab').forEach((b) => b.addEventListener('click', () => setDashTab(b.dataset.dashTab)));

        // botões de período
        document.querySelectorAll('.dash-period-btn').forEach((b) => {
            b.addEventListener('click', () => {
                if (b.dataset.dashPeriod === 'all') aplicarPeriodo(minYear, maxYear, 'all');
                else {
                    const n = parseInt(b.dataset.dashPeriod, 10);
                    aplicarPeriodo(maxYear - n + 1, maxYear, String(n));
                }
            });
        });
        // período custom
        $('dash-apply-period').addEventListener('click', () => {
            const s = parseInt($('dash-year-start').value, 10);
            const e = parseInt($('dash-year-end').value, 10);
            if (!isNaN(s) && !isNaN(e) && s <= e && s >= minYear && e <= maxYear) {
                aplicarPeriodo(s, e, 'custom');
            } else {
                $('dash-period-info').textContent = `Período inválido (use ${minYear}–${maxYear})`;
            }
        });

        // filtros e ordenação
        ['dash-search', 'dash-campus', 'dash-area', 'dash-situacao'].forEach((id) => {
            $(id).addEventListener('input', renderDashTable);
            $(id).addEventListener('change', renderDashTable);
        });
        $('pesq-search').addEventListener('input', () => renderPesqTable(null));
        $('pesq-modal-close').addEventListener('click', fecharPesquisador);
        $('pesq-modal').addEventListener('click', (e) => { if (e.target === $('pesq-modal')) fecharPesquisador(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('pesq-modal').classList.contains('is-hidden')) fecharPesquisador(); });
        document.querySelectorAll('#pesq-table th[data-pesq-sort]').forEach((th) => {
            th.addEventListener('click', () => {
                const key = th.dataset.pesqSort;
                if (pesqSort.key === key) pesqSort.asc = !pesqSort.asc;
                else { pesqSort.key = key; pesqSort.asc = ['nome', 'campus'].includes(key); }
                renderPesqTable(null);
            });
        });
        document.querySelectorAll('#dash-table th[data-dash-sort]').forEach((th) => {
            th.addEventListener('click', () => {
                const key = th.dataset.dashSort;
                if (dashSort.key === key) dashSort.asc = !dashSort.asc;
                else { dashSort.key = key; dashSort.asc = ['nome', 'unidade', 'area', 'situacao', 'faixa'].includes(key); }
                renderDashTable();
            });
        });
        $('dash-cat-select').addEventListener('change', (e) => renderTopCategoria(e.target.value));

        populateDashFilters();
    };

    function populateDashFilters() {
        const campi = [...new Set(groupsData.grupos.map((g) => unidadeCanonica(g.Unidade)).filter(Boolean))].sort();
        const areas = [...new Set(groupsData.grupos.map((g) => g.Area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
        const sits = [...new Set(groupsData.grupos.map((g) => g.Situacao).filter(Boolean))];

        $('dash-campus').innerHTML = '<option value="">Todos os campi</option>' + campi.map((c) => `<option value="${h(c)}">${h(campusCurto(c))}</option>`).join('');
        $('dash-area').innerHTML = '<option value="">Todas as áreas</option>' + areas.map((a) => `<option value="${h(a)}">${h(a)}</option>`).join('');
        $('dash-situacao').innerHTML = '<option value="">Todas as situações</option>' + sits.map((s) => `<option value="${h(s)}">${h(SITUACAO_SHORT[s] || s)}</option>`).join('');
    }
})();
