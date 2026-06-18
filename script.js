// script.js — Orquestração UI do módulo de validação de grupos de pesquisa

/**
 * Extracts just the city name from a raw DGP campus string.
 * Examples:
 *   "IFBA - Campus Salvador"                              → "Salvador"
 *   "IFBA - Campus Vitória da Conquista"                  → "Vitória da Conquista"
 *   "Instituto Federal de Educação, Ciência e Tecnologia da Bahia" → "Salvador"
 *   "Polo de Inovação Salvador"                           → "Polo de Inovação Salvador"
 *   "Salvador"                                            → "Salvador"
 */
function campusToCidade(unidade) {
    if (!unidade) return 'N/A';
    // "IFBA - Campus <city>" pattern
    const m = unidade.match(/^IFBA\s*-\s*Campus\s+(.+)$/i);
    if (m) return m[1].trim();
    // Long institutional name with no campus → HQ is Salvador
    if (/Instituto Federal/i.test(unidade)) return 'Salvador';
    // Anything else: return as-is (e.g. "Polo de Inovação Salvador", plain "Salvador")
    return unidade.trim();
}

const STATE = {
    dados: null,
    groupsData: null,
    validador: null,
    resultado: null,
    customPeriod: null,
    displayGroups: [],
    sortedGroups: [],
    selectedGroupIdx: null,
    tableSort: { key: 'nome', asc: true }
};

const PARECER_LABELS_UPPER = {
    'CERTIFICADO': 'CERTIFICADO',
    'PENDENTE': 'CERTIFICADO c/ ADVERTÊNCIAS',
    'NAO_CERTIFICADO': 'NÃO CONFORME',
    'INADIMPLENTE': 'INADIMPLENTE'
};

const PARECER_CONSEQUENCIAS = {
    'CERTIFICADO': 'Manutenção da certificação institucional.',
    'PENDENTE': 'Certificação mantida, mas com recomendações de melhoria.',
    'NAO_CERTIFICADO': 'Prazo de 2 anos para adequação com plano de ação (Art. 17).',
    'INADIMPLENTE': 'Bloqueio em programas PRPGI + perda de certificação. Efeitos cessam 3 meses após entrega (Art. 15, §4-5).'
};

const $ = id => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, durationMs = 6000, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span> ${escapeHtml(message)}`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, durationMs);
}

async function carregarDados() {
    try {
        // Check if data files exist locally first (for dev)
        const useLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const BASE = useLocal ? '' : 'https://prof-davifr.github.io/dashboard-prpgi';
        const [respDash, respGroups] = await Promise.all([
            fetch(`${BASE}/data.json`),
            fetch(`${BASE}/data-groups.json`)
        ]);
        if (!respDash.ok || !respGroups.ok) throw new Error('Arquivos de dados não encontrados');
        STATE.dados = await respDash.json();
        STATE.groupsData = await respGroups.json();
        return STATE.dados;
    } catch (e) {
        const loadingEl = $('loading');
        const spinnerEl = loadingEl?.querySelector('.spinner');
        const textEl = $('loading-text');
        if (spinnerEl) spinnerEl.style.display = 'none';
        if (textEl) {
            textEl.textContent = 'Os dados não puderam ser carregados. Em desenvolvimento local, coloque data.json e data-groups.json na raiz. Em produção, verifique se o dashboard foi publicado no GitHub Pages.';
            textEl.style.color = '#c62828';
        }
        console.error(e);
        return null;
    }
}

function popularGrupos() {
    const select = $('grupo-filter');
    if (!select) return;

    const grupos = STATE.displayGroups || [];
    const selectedValue = STATE.selectedGroupIdx == null ? '' : String(STATE.selectedGroupIdx);
    select.innerHTML = '<option value="">Selecione um grupo...</option>';

    const sorted = STATE.sortedGroups.length
        ? STATE.sortedGroups
        : sortGroupEntries(grupos, 'nome', true);

    sorted.forEach(entry => {
        const g = entry.grupo;
        const nome = g.Nome || g.nome || '';
        const area = g.Area || g.area || '';
        const unidade = g.Unidade || g.unidade || '';
        const situacao = g.Situacao || g.situacao || '';
        const option = document.createElement('option');
        option.value = String(entry.idx);
        option.textContent = nome ? `${nome} — ${unidade}` : `${area} — ${unidade}`;
        option.title = `${nome || area}\nUnidade: ${unidade}\nSituação: ${situacao}\nÁrea: ${area}\nAno: ${g.AnoFormacao || 'N/A'}\nPesquisadores: ${g.Pesquisadores || 0}\nEstudantes: ${g.Estudantes || 0}`;
        select.appendChild(option);
    });

    if (selectedValue && sorted.some(entry => String(entry.idx) === selectedValue)) {
        select.value = selectedValue;
    }
}

function sortGroupEntries(entries, key, asc) {
    const sorted = [...entries].sort((a, b) => {
        const groupA = a.grupo;
        const groupB = b.grupo;

        if (key === 'id') {
            return asc ? a.idx - b.idx : b.idx - a.idx;
        }

        let valA = '';
        let valB = '';

        switch (key) {
            case 'nome':
                valA = (groupA.Nome || groupA.nome || '').toUpperCase();
                valB = (groupB.Nome || groupB.nome || '').toUpperCase();
                break;
            case 'area':
                valA = (groupA.Area || groupA.area || '').toUpperCase();
                valB = (groupB.Area || groupB.area || '').toUpperCase();
                break;
            case 'unidade':
                valA = (groupA.Unidade || groupA.unidade || '').toUpperCase();
                valB = (groupB.Unidade || groupB.unidade || '').toUpperCase();
                break;
            case 'situacao':
                valA = (groupA.Situacao || groupA.situacao || '').toUpperCase();
                valB = (groupB.Situacao || groupB.situacao || '').toUpperCase();
                break;
            case 'pesquisadores': {
                const numA = parseInt(groupA.Pesquisadores || groupA.pesquisadores || 0, 10) || 0;
                const numB = parseInt(groupB.Pesquisadores || groupB.pesquisadores || 0, 10) || 0;
                return asc ? numA - numB : numB - numA;
            }
            case 'ano': {
                const yearA = parseInt(groupA.AnoFormacao || groupA.anoFormacao || 0, 10) || 0;
                const yearB = parseInt(groupB.AnoFormacao || groupB.anoFormacao || 0, 10) || 0;
                return asc ? yearA - yearB : yearB - yearA;
            }
            default:
                return 0;
        }

        const cmp = valA.localeCompare(valB, 'pt-BR');
        return asc ? cmp : -cmp;
    });

    return sorted;
}

function normalizeStatusClass(status) {
    return String(status || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function renderGroupsTable() {
    const countEl = $('group-count');

    const grupos = STATE.groupsData?.grupos || [];
    STATE.displayGroups = grupos.map((grupo, idx) => ({ grupo, idx }));

    STATE.sortedGroups = sortGroupEntries(
        STATE.displayGroups,
        STATE.tableSort.key,
        STATE.tableSort.asc
    );

    popularGrupos();

    renderTableRows(STATE.sortedGroups);

    if (countEl) {
        countEl.textContent = `${STATE.sortedGroups.length} grupos`;
    }
}

function renderTableRows(grupos) {
    const tbody = $('groups-tbody');
    if (!tbody) return;

    let html = '';
    grupos.forEach((entry, displayIdx) => {
        const g = entry.grupo;
        const originalIdx = entry.idx;
        const nome = g.Nome || g.nome || '(sem nome)';
        const area = g.Area || g.area || '';
        const unidade = g.Unidade || g.unidade || '';
        const situacao = g.Situacao || g.situacao || '';
        const pesquisadores = g.Pesquisadores || g.pesquisadores || '0';
        const ano = g.AnoFormacao || g.anoFormacao || 'N/A';
        const selectedClass = STATE.selectedGroupIdx === originalIdx ? ' selected' : '';
        const statusClass = normalizeStatusClass(situacao);

        html += `<tr data-idx="${originalIdx}" class="group-row${selectedClass}" tabindex="0" role="button" aria-label="Selecionar grupo ${nome}">
            <td>${displayIdx + 1}</td>
            <td class="group-name">${nome}</td>
            <td class="col-mobile-hidden">${area}</td>
            <td>${unidade}</td>
            <td><span class="status-badge status-${statusClass}" title="Situação cadastral no DGP/CNPq">${situacao || 'N/A'}</span></td>
            <td>${pesquisadores}</td>
            <td class="col-mobile-hidden">${ano}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
    tbody.querySelectorAll('.group-row').forEach(row => {
        row.addEventListener('click', () => selectGroupFromTable(row));
        row.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectGroupFromTable(row);
            }
        });
    });
}

function selectGroupFromTable(row) {
    if (!row) return;
    const idx = parseInt(row.dataset.idx, 10);
    if (isNaN(idx)) return;

    STATE.selectedGroupIdx = idx;
    const groupSelect = $('grupo-filter');
    if (groupSelect) {
        groupSelect.value = String(idx);
    }

    executarValidacao();
}

function filterGroupsTable() {
    const searchInput = $('group-search');
    const researcherInput = $('researcher-search');
    const statusFilterEl = $('status-filter');
    const countEl = $('group-count');
    const source = STATE.sortedGroups || [];

    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const researcherTerm = (researcherInput?.value || '').toLowerCase().trim();
    const statusFilter = statusFilterEl?.value || '';

    const filtered = source.filter(entry => {
        const g = entry.grupo;
        const nome = (g.Nome || g.nome || '').toLowerCase();
        const area = (g.Area || g.area || '').toLowerCase();
        const situacao = g.Situacao || g.situacao || '';

        const matchesSearch = !searchTerm || nome.includes(searchTerm) || area.includes(searchTerm);
        const matchesStatus = !statusFilter || situacao === statusFilter;

        let matchesResearcher = true;
        if (researcherTerm) {
            const nomes = (g.PesquisadoresNomes || '').toLowerCase();
            const membros = (g.membrosMap || []).map(m => (m.nome || '').toLowerCase()).join(';');
            matchesResearcher = nomes.includes(researcherTerm) || membros.includes(researcherTerm);
        }

        return matchesSearch && matchesStatus && matchesResearcher;
    });

    renderTableRows(filtered);

    if (countEl) {
        countEl.textContent = `${filtered.length} de ${source.length} grupos`;
    }
}

function setupColumnSorting() {
    const headers = document.querySelectorAll('#groups-table th.sortable');
    if (!headers.length) return;

    const applyHeaderState = () => {
        headers.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
            h.removeAttribute('aria-sort');
        });
        const active = Array.from(headers).find(h => h.dataset.sort === STATE.tableSort.key);
        if (active) {
            active.classList.add(STATE.tableSort.asc ? 'sort-asc' : 'sort-desc');
            active.setAttribute('aria-sort', STATE.tableSort.asc ? 'ascending' : 'descending');
        }
    };

    applyHeaderState();

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (!key) return;

            if (STATE.tableSort.key === key) {
                STATE.tableSort.asc = !STATE.tableSort.asc;
            } else {
                STATE.tableSort.key = key;
                STATE.tableSort.asc = true;
            }

            STATE.sortedGroups = sortGroupEntries(STATE.sortedGroups, STATE.tableSort.key, STATE.tableSort.asc);
            applyHeaderState();
            filterGroupsTable();
        });
    });
}

function executarValidacao() {
    const groupSelect = $('grupo-filter');
    const reportButton = $('gerar-relatorio-btn');

    if (!groupSelect) return;

    const grupoIdx = groupSelect.value;
    if (grupoIdx === "") {
        STATE.selectedGroupIdx = null;
        if (reportButton) reportButton.disabled = true;
        renderTableRows(filterCurrentTableRows());
        return;
    }

    const grupoOriginalIdx = parseInt(grupoIdx, 10);
    if (isNaN(grupoOriginalIdx)) return;

    STATE.selectedGroupIdx = grupoOriginalIdx;

    const grupos = STATE.groupsData?.grupos || [];
    const grupo = grupos[grupoOriginalIdx];
    if (!grupo) return;

    // Period is always driven by STATE.customPeriod (set by period buttons or custom inputs)
    STATE.validador = new ValidadorGrupo(grupo, STATE.groupsData, STATE.dados, 'custom', STATE.customPeriod);
    STATE.resultado = STATE.validador.validar();

    if (reportButton) reportButton.disabled = false;

    renderTableRows(filterCurrentTableRows());
}

function filterCurrentTableRows() {
    const searchInput = $('group-search');
    const researcherInput = $('researcher-search');
    const statusFilterEl = $('status-filter');
    const source = STATE.sortedGroups || [];
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const researcherTerm = (researcherInput?.value || '').toLowerCase().trim();
    const statusFilter = statusFilterEl?.value || '';

    return source.filter(entry => {
        const g = entry.grupo;
        const nome = (g.Nome || g.nome || '').toLowerCase();
        const area = (g.Area || g.area || '').toLowerCase();
        const situacao = g.Situacao || g.situacao || '';
        const matchesSearch = !searchTerm || nome.includes(searchTerm) || area.includes(searchTerm);
        const matchesStatus = !statusFilter || situacao === statusFilter;

        let matchesResearcher = true;
        if (researcherTerm) {
            const nomes = (g.PesquisadoresNomes || '').toLowerCase();
            const membros = (g.membrosMap || []).map(m => (m.nome || '').toLowerCase()).join(';');
            matchesResearcher = nomes.includes(researcherTerm) || membros.includes(researcherTerm);
        }

        return matchesSearch && matchesStatus && matchesResearcher;
    });
}

function gerarRelatorio(edits) {
    if (!STATE.resultado) return;

    const meta = STATE.dados.meta;

    const resultadoBase = STATE.resultado;
    const editsApplied = edits ? aplicarEdicoes(resultadoBase, edits) : null;
    const resultado = editsApplied || resultadoBase;
    const metricas = editsApplied ? computarMetricas(editsApplied) : STATE.validador.getMetricas();
    const pont = editsApplied ? computarPontuacao(editsApplied) : resultadoBase.pontuacao;

    const criteriosCNPQ = resultado.criterios.filter(c => c.fonte === 'CNPq');
    const criteriosIFBA = resultado.criterios.filter(c => c.fonte === 'IFBA');

    const declaracao = edits && edits.declaracao ? edits.declaracao : null;

    const renderChecklistHTML = (criterios) => {
        const th = 'border:1px solid #ddd;padding:4px 8px;background:#f5f5f5;font-weight:600;font-size:8pt;text-transform:uppercase;';
        const td = 'border:1px solid #ddd;padding:4px 8px;vertical-align:top;';
        let html = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9pt;">
<thead><tr>
  <th style="${th}width:12%;text-align:center;">ID</th>
  <th style="${th}width:32%;">Critério</th>
  <th style="${th}width:8%;text-align:center;">Status</th>
  <th style="${th}width:36%;">Detalhe</th>
  <th style="${th}width:12%;">Ref.</th>
</tr></thead><tbody>`;
        criterios.forEach(c => {
            let icon, color;
            if (c.detalhe === "Não verificado") {
                icon = '○';
                color = '#aaa';
            } else if (c.passou) {
                icon = '✓';
                color = '#2e7d32';
            } else if (c.tipo === 'obrigatorio') {
                icon = '✗';
                color = '#d46b6b';
            } else {
                icon = '⚠';
                color = '#f57f17';
            }
            html += `<tr>
  <td style="${td}text-align:center;font-family:'SF Mono','Fira Code',monospace;font-size:8pt;word-break:break-all;">${c.id}</td>
  <td style="${td}word-wrap:break-word;">${c.nome}</td>
  <td style="${td}text-align:center;color:${color};font-weight:700;font-size:11pt;">${icon}</td>
  <td style="${td}font-size:8.5pt;word-wrap:break-word;">${c.detalhe}</td>
  <td style="${td}font-style:italic;color:#888;font-size:8pt;word-wrap:break-word;">${c.artigoRef}</td>
</tr>`;
        });
        html += '</tbody></table>';
        return html;
    };

    const renderPontuacaoHTML = () => {
        const thS = 'border:1px solid #ddd;padding:4px 8px;text-align:left;background:#f5f5f5;';
        const thR = 'border:1px solid #ddd;padding:4px 8px;text-align:right;background:#f5f5f5;';
        const td = 'border:1px solid #ddd;padding:4px 8px;';
        const tdR = 'border:1px solid #ddd;padding:4px 8px;text-align:right;';
        let html = `<table style="width:100%;border-collapse:collapse;font-size:9pt;">
<thead><tr>
  <th style="${thS}width:3.5rem;">Item</th>
  <th style="${thS}">Descrição</th>
  <th style="${thR}width:4.5rem;">Pts/Item</th>
  <th style="${thR}width:3.5rem;">Qtd</th>
  <th style="${thR}width:4.5rem;">Total</th>
</tr></thead><tbody>`;

        const producoes = pont.producoesPorCategoria || {};
        let grandTotal = 0;

        Object.keys(SCORING_TABLE).forEach(cat => {
            const info = SCORING_TABLE[cat];
            const items = producoes[cat] || [];
            // Count per itemId
            const countById = {};
            items.forEach(p => { countById[p.itemId] = (countById[p.itemId] || 0) + 1; });

            // Section header row
            html += `<tr style="background:#eef6ef;">
  <td colspan="5" style="${td}font-weight:700;">${info.label}</td>
</tr>`;

            info.items.forEach(scoreItem => {
                const qty = countById[scoreItem.id] || 0;
                if (qty === 0) return; // only show rows with scored items
                const subtotal = qty * scoreItem.pontos;
                grandTotal += subtotal;
                html += `<tr>
  <td style="${td}font-family:monospace;">${scoreItem.id}</td>
  <td style="${td}">${scoreItem.desc}</td>
  <td style="${tdR}">${scoreItem.pontos}</td>
  <td style="${tdR}">${qty}</td>
  <td style="${tdR};font-weight:600;">${subtotal}</td>
</tr>`;
            });
        });

        html += `<tr style="background:#e8f5e9;">
  <td colspan="4" style="${td}font-weight:700;">Total de Pontos</td>
  <td style="${tdR}font-weight:700;">${grandTotal}</td>
</tr>`;
        html += `<tr>
  <td colspan="4" style="${td}">Número de membros</td>
  <td style="${tdR}">${pont.membros}</td>
</tr>`;
        html += `<tr style="background:#fff8e1;">
  <td colspan="4" style="${td}font-weight:700;">Pontos por Membro</td>
  <td style="${tdR}font-weight:700;">${pont.porMembro.toFixed(1)}</td>
</tr>`;
        if (pont.minimoRequerido !== null) {
            html += `<tr>
  <td colspan="4" style="${td}">Mínimo Requerido (${pont.faixaGrupo})</td>
  <td style="${tdR}">${pont.minimoRequerido} pts/membro</td>
</tr>`;
            const atingiuColor = pont.atingiu ? '#2e7d32' : '#c62828';
            const atingiuLabel = pont.atingiu ? 'CONFORME' : 'NÃO CONFORME';
            html += `<tr style="background:#e8f5e9;">
  <td colspan="4" style="${td}font-weight:700;">Resultado</td>
  <td style="${tdR}font-weight:700;color:${atingiuColor};">${atingiuLabel}</td>
</tr>`;
        }
        html += '</tbody></table>';
        return html;
    };

    const renderAnexosHTML = () => {
        const producoesPorCategoria = pont.producoesPorCategoria || {};

        // Each annex: { id, title, key }
        const anexos = [
            { id: 'A', title: 'Produções Bibliográficas', key: 'bibliografica' },
            { id: 'B', title: 'Produções Técnicas', key: 'tecnica' },
            { id: 'C', title: 'Produções Culturais e Artísticas', key: 'cultural' },
            { id: 'D', title: 'Inovação (Registros e Patentes)', key: 'inovacao' },
            { id: 'E', title: 'Eventos (Apresentações e Organização)', key: 'eventos' },
            { id: 'F', title: 'Orientações Concluídas', key: 'orientacoesConcluidas' },
            { id: 'G', title: 'Orientações em Andamento', key: 'orientacoesAndamento' },
            { id: 'H', title: 'Bancas', key: 'bancas' },
            { id: 'I', title: 'Projetos de Pesquisa', key: 'projetos' },
            { id: 'J', title: 'Bolsas de Produtividade', key: 'bolsas' },
        ].filter(a => (producoesPorCategoria[a.key] || []).length > 0);

        if (anexos.length === 0) return '';

        const tdStyle = 'border:1px solid #ddd;padding:3px 6px;vertical-align:top;';
        const thStyle = 'border:1px solid #ddd;padding:4px 6px;text-align:left;background:#f5f5f5;';

        let html = '';

        anexos.forEach(anexo => {
            const items = (producoesPorCategoria[anexo.key] || [])
                .slice()
                .sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0));

            html += `<h2 class="annex-header">Anexo ${anexo.id} — ${anexo.title} (${items.length})</h2>`;
            html += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:1.5rem;">`;
            html += `<thead><tr>
                <th style="${thStyle}width:3.5rem;">Ano</th>
                <th style="${thStyle}width:4rem;">Item</th>
                <th style="${thStyle}">Título / Referência</th>
                ${anexo.key === 'bibliografica' ? `<th style="${thStyle}width:5rem;">Estrato</th>` : ''}
                <th style="${thStyle}width:4rem;text-align:right;">Pontos</th>
            </tr></thead><tbody>`;

            items.forEach((r, i) => {
                const rowBg = i % 2 === 0 ? '' : 'background:#fafafa;';
                const titulo = escapeHtml(r.titulo || '-');
                const periodico = r.periodico ? ` — <em>${escapeHtml(r.periodico)}</em>` : '';
                html += `<tr style="${rowBg}">
                    <td style="${tdStyle}text-align:center;">${escapeHtml(r.ano || '-')}</td>
                    <td style="${tdStyle}text-align:center;font-family:monospace;" title="${escapeHtml(r.itemDesc || '')}">${escapeHtml(r.itemId || '-')}</td>
                    <td style="${tdStyle}">${titulo}${periodico}</td>
                    ${anexo.key === 'bibliografica' ? `<td style="${tdStyle}text-align:center;">${escapeHtml(r.estrato || '-')}</td>` : ''}
                    <td style="${tdStyle}text-align:right;font-weight:600;">${r.pontos != null ? r.pontos : '-'}</td>
                </tr>`;
            });

            const totalAnexo = items.reduce((s, r) => s + Number(r.pontos || 0), 0);
            const colspan = anexo.key === 'bibliografica' ? 4 : 3;
            html += `<tr style="background:#e8f5e9;">
                <td colspan="${colspan}" style="${tdStyle}font-weight:700;">Total do Anexo ${anexo.id}</td>
                <td style="${tdStyle}text-align:right;font-weight:700;">${totalAnexo}</td>
            </tr>`;

            html += '</tbody></table>';
        });

        return html;
    };

    const relatorioHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Validação — ${resultado.grupo.nome}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #222; font-size: 10pt; line-height: 1.5; }
        h1 { font-size: 1.4rem; color: #32a041; border-bottom: 3px solid #32a041; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.1rem; color: #32a041; border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; margin: 1.5rem 0 0.75rem; }
        h3 { font-size: 0.95rem; color: #444; margin: 1rem 0 0.5rem; }
        .header-info { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }
        .badge { display: inline-block; padding: 0.3rem 0.8rem; border-radius: 4px; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; }
        .badge-certificado { background: #e8f5e9; color: #2e7d32; }
        .badge-pendente { background: #fff8e1; color: #f57f17; }
        .badge-nao-certificado { background: #ffebee; color: #c62828; }
        .badge-inadimplente { background: #ffebee; color: #c62828; border: 2px solid #c62828; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin: 1rem 0; }
        .info-item { padding: 0.5rem; background: #f9f9f9; border-radius: 4px; }
        .info-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }
        .info-value { font-size: 1rem; font-weight: 700; color: #32a041; }
        .consequencia { background: #f9f9f9; padding: 0.75rem; border-radius: 4px; margin: 0.75rem 0; font-size: 0.9rem; }
        .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.75rem; color: #888; }
        .btn-print { position: fixed; top: 1rem; right: 1rem; background: #32a041; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .btn-print:hover { background: #2a8a36; }
        @page { margin: 1.5cm; }
        @media print {
            .btn-print { display: none; }
            body { max-width: 100%; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h2 { break-after: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; }
            h2.annex-header { break-before: page; }
        }
    </style>
</head>
<body>
    <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>

    <h1>Relatório de Validação de Grupo de Pesquisa</h1>
    <p class="header-info">IFBA — PRPGI | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>

    <h2>1. Dados do Grupo</h2>
    <div class="info-grid">
        <div class="info-item"><div class="info-label">Nome</div><div class="info-value">${resultado.grupo.nome}</div></div>
        <div class="info-item"><div class="info-label">Área</div><div class="info-value">${resultado.grupo.area}</div></div>
        <div class="info-item"><div class="info-label">Campus</div><div class="info-value">${campusToCidade(resultado.grupo.unidade)}</div></div>
        <div class="info-item"><div class="info-label">Situação DGP</div><div class="info-value">${resultado.grupo.situacao}</div></div>
        <div class="info-item"><div class="info-label">Ano de Criação</div><div class="info-value">${resultado.grupo.anoCriacao || 'N/A'}</div></div>
        <div class="info-item"><div class="info-label">Tempo de Formação</div><div class="info-value">${pont.tempoFormacao} anos (${pont.faixaGrupo})</div></div>
        <div class="info-item"><div class="info-label">Pesquisadores</div><div class="info-value">${metricas.pesquisadores}</div></div>
        <div class="info-item"><div class="info-label">Estudantes</div><div class="info-value">${metricas.estudantes}</div></div>
    </div>

    <h2>2. Pesquisadores do Grupo</h2>
    <div style="columns:2;column-gap:1rem;font-size:9pt;">
        ${(() => {
            const lista = resultado.membros || [];
            if (lista.length === 0) return '<p style="color:#888;font-style:italic;">Nomes não disponíveis na fonte de dados.</p>';
            const liderId = resultado.grupo.LiderId || null;
            return lista.map((m, i) => {
                const siapeStr = m.siape ? ` <span style="font-family:monospace;color:#555;font-size:8pt;">[SIAPE: ${m.siape}]</span>` : ' <span style="color:#aaa;font-size:8pt;">[SIAPE não resolvido]</span>';
                const liderStr = (m.siape && m.siape === liderId) ? ' <strong style="color:#32a041;">(Líder)</strong>' : '';
                return `<div style="padding:2px 0;border-bottom:1px solid #eee;">${i + 1}. ${escapeHtml(m.nome)}${liderStr}${siapeStr}</div>`;
            }).join('');
        })()}
    </div>

    <h2>3. Produção no Período (${resultado.periodo.startYear}–${resultado.periodo.endYear})</h2>
    <div class="info-grid">
        <div class="info-item"><div class="info-label">Bibliográfica</div><div class="info-value">${metricas.porTipo.bibliografica}</div></div>
        <div class="info-item"><div class="info-label">Técnica</div><div class="info-value">${metricas.porTipo.tecnica}</div></div>
        <div class="info-item"><div class="info-label">Inovação</div><div class="info-value">${metricas.porTipo.inovacao}</div></div>
        <div class="info-item"><div class="info-label">Orientações</div><div class="info-value">${metricas.porTipo.orientacoes}</div></div>
        <div class="info-item"><div class="info-label">Eventos</div><div class="info-value">${metricas.porTipo.eventos}</div></div>
        <div class="info-item"><div class="info-label">Bancas</div><div class="info-value">${metricas.bancasIndisponivel ? '<span style="color:#888;font-size:0.85rem;">Dado não disponível†</span>' : metricas.porTipo.bancas}</div></div>
    </div>
    ${metricas.bancasIndisponivel ? '<p style="font-size:0.8rem;color:#888;margin-top:0.25rem;">† Dados de participação em bancas ainda não disponíveis na fonte atual (SUAP/Lattes). O indicador será incluído em versão futura da base.</p>' : ''}

    <h2>4. Pontuação (Anexo I)</h2>
    ${renderPontuacaoHTML()}

    <h2>5. Validação — Critérios CNPq/DGP</h2>
    ${renderChecklistHTML(criteriosCNPQ)}

    <h2>6. Validação — Critérios IFBA</h2>
    ${renderChecklistHTML(criteriosIFBA)}

    <h2>7. Declaração do Líder</h2>
    <p style="margin-bottom:0.75rem;">
        <input type="checkbox" ${declaracao && declaracao.checked ? 'checked' : ''} disabled>
        Declaro que as informações prestadas neste relatório são verdadeiras e refletem a produção do grupo no período indicado.
    </p>
    ${declaracao && declaracao.observacoes ? '<div style="background:#f9f9f9;border-left:3px solid #32a041;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:9pt;border-radius:0 4px 4px 0;"><strong>Observações:</strong> ' + escapeHtml(declaracao.observacoes) + '</div>' : ''}
    <div style="margin-top:1rem;font-size:10pt;">
        <div style="margin-bottom:0.5rem;">
            <span style="font-weight:600;">Assinatura (gov.br):</span>
        </div>
        <div style="border:1px solid #999;border-radius:4px;min-height:80px;padding:0.5rem;margin-bottom:0.5rem;background:#fff;">&nbsp;</div>
    </div>

    <h2 style="margin-top:3rem;">8. Campo reservado à PRPGI</h2>
    <p style="color:#888;font-style:italic;">Parecer a ser preenchido pela Pró-Reitoria de Pesquisa, Pós-Graduação e Inovação</p>
    <div style="border:1px solid #ddd;border-radius:8px;padding:1.25rem 1.5rem;margin-top:0.75rem;background:#fafafa;">
        <p style="font-weight:600;margin-bottom:0.75rem;">Parecer:</p>
        <div style="display:flex;gap:2rem;">
            <div style="flex:3;">
                <label style="display:block;margin-bottom:0.4rem;font-size:9pt;"><input type="checkbox" disabled style="margin-right:0.35rem;"> Certificado</label>
                <label style="display:block;margin-bottom:0.4rem;font-size:9pt;"><input type="checkbox" disabled style="margin-right:0.35rem;"> Certificado com ressalvas</label>
                <label style="display:block;margin-bottom:0.4rem;font-size:9pt;"><input type="checkbox" disabled style="margin-right:0.35rem;"> Pendente</label>
            </div>
            <div style="flex:2;">
                <label style="display:block;margin-bottom:0.4rem;font-size:9pt;"><input type="checkbox" disabled style="margin-right:0.35rem;"> Não certificado</label>
                <label style="display:block;margin-bottom:0.4rem;font-size:9pt;"><input type="checkbox" disabled style="margin-right:0.35rem;"> Inadimplente</label>
            </div>
        </div>
        <div style="margin-top:0.75rem;">
            <p style="font-weight:600;margin-bottom:0.4rem;">Observações:</p>
            <div style="border:1px solid #ccc;border-radius:4px;min-height:60px;padding:0.5rem;font-size:9pt;color:#aaa;">&nbsp;</div>
        </div>
        <div style="margin-top:1rem;font-size:9pt;">
            <div style="margin-bottom:0.5rem;">
                <span style="font-weight:600;">Assinatura PRPGI (gov.br):</span>
            </div>
            <div style="border:1px solid #999;border-radius:4px;min-height:80px;padding:0.5rem;margin-bottom:0.5rem;background:#fff;">&nbsp;</div>
        </div>
    </div>

    <h2 style="margin-top:3rem;border-top:2px solid #32a041;padding-top:1rem;">9. Anexos — Produções Pontuadas (${resultado.periodo.startYear}–${resultado.periodo.endYear})</h2>
    <p style="font-size:9pt;color:#666;margin-bottom:1rem;">Registros pontuados por categoria, com Item do Anexo I e pontos atribuídos. Cada produção é contada uma única vez.</p>
    ${renderAnexosHTML()}

     <div class="footer">
        <p>Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Dados processados (build) em: ${meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('pt-BR') : 'N/A'}</p>
        ${(() => {
            const sd = meta.sourceDates || {};
            return Object.entries(sd).map(([key, info]) => {
                const dt = info.modifiedAt ? new Date(info.modifiedAt).toLocaleString('pt-BR') : 'N/A';
                const label = info.label || key;
                return `<p>Fonte ${label}: ${dt}</p>`;
            }).join('');
        })()}
        <p>Versão do motor de validação: 1.0.0</p>
        <p>Base legal: Regulamento Geral dos Grupos de Pesquisa do IFBA — aprovado pelo CONSEPE + CNPq/DGP</p>
    </div>
</body>
</html>`;

    const blob = new Blob([relatorioHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
        showToast('Pop-up bloqueado. Permita pop-ups para gerar o relatório.', 6000, 'warning');
    }
}

function aplicarEdicoes(base, edits) {
    var r = JSON.parse(JSON.stringify(base));
    if (edits.membrosAtivos) {
        r.membros = base.membros.filter(function(_, i) { return edits.membrosAtivos[i]; });
    }
    if (edits.producoesAtivas) {
        r.producoes = {};
        Object.keys(base.producoes).forEach(function(cat) {
            var items = base.producoes[cat] || [];
            var active = edits.producoesAtivas[cat] || [];
            r.producoes[cat] = items.filter(function(_, i) { return active[i]; });
        });
    }
    if (edits.criteriosOverride) {
        r.criterios = base.criterios.map(function(c) {
            var val = edits.criteriosOverride[c.id];
            if (val === 'sim') { c = JSON.parse(JSON.stringify(c)); c.passou = true; c.detalhe = 'Atendido (avaliador)'; }
            else if (val === 'nao') { c = JSON.parse(JSON.stringify(c)); c.passou = false; c.detalhe = 'Nao atendido (avaliador)'; }
            return c;
        });
    }
    if (edits.dadosGrupo) { r.grupo = Object.assign({}, r.grupo, edits.dadosGrupo); }
    return r;
}

function computarMetricas(r) {
    var total = 0, ptsPorCat = {};
    Object.keys(r.producoes).forEach(function(cat) {
        (r.producoes[cat] || []).forEach(function(p) { total += Number(p.pontos || 0); });
    });
    var porMembro = r.membros.length > 0 ? total / r.membros.length : 0;
    var tf = computarTempoFormacao(r);
    var minimo = getPontuacaoMinima(tf);
    return {
        pesquisadores: r.membros.length,
        estudantes: r.grupo.estudantes || 0,
        porTipo: {
            bibliografica: (r.producoes.bibliografica || []).length,
            tecnica: (r.producoes.tecnica || []).length,
            inovacao: (r.producoes.inovacao || []).length,
            orientacoes: ((r.producoes.orientacoesConcluidas || []).length + (r.producoes.orientacoesAndamento || []).length),
            eventos: (r.producoes.eventos || []).length,
            bancas: (r.producoes.bancas || []).length
        },
        bancasIndisponivel: false,
        total: total,
        porMembro: porMembro,
        minimo: minimo,
        atingiu: minimo !== null ? porMembro >= minimo : true
    };
}

function computarTempoFormacao(r) {
    var ano = Number(r.grupo.anoCriacao) || 0;
    if (!ano || ano <= 0) return 0;
    return new Date().getFullYear() - ano;
}

function computarPontuacao(r) {
    var tf = computarTempoFormacao(r);
    var minimo = getPontuacaoMinima(tf);
    var faixa = getFaixaGrupo ? getFaixaGrupo(tf) : 'Consolidado';
    var producoesPorCategoria = {};
    Object.keys(r.producoes).forEach(function(cat) {
        producoesPorCategoria[cat] = r.producoes[cat] || [];
    });
    var total = 0;
    Object.keys(producoesPorCategoria).forEach(function(cat) {
        (producoesPorCategoria[cat] || []).forEach(function(p) { total += Number(p.pontos || 0); });
    });
    var membros = r.membros.length || 1;
    var porMembro = total / membros;
    return {
        producoesPorCategoria: producoesPorCategoria,
        membros: membros,
        porMembro: porMembro,
        minimoRequerido: minimo,
        faixaGrupo: faixa,
        tempoFormacao: tf,
        atingiu: minimo !== null ? porMembro >= minimo : true
    };
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const dados = await carregarDados();
    if (!dados) return;

    // ── Period button group ────────────────────────────────────────────────────
    // Build biennial windows (even-year pairs) ending at maxYear, going 4 windows back.
    // e.g. maxYear=2026 → 2024-2026, 2022-2024, 2020-2022, 2018-2020 (newest first)
    const maxYear = Number(dados.meta?.maxYear || new Date().getFullYear());
    const minYear = Number(dados.meta?.minYear || maxYear - 10);

    // Snap maxYear up to next even number for window end boundary
    const windowEnd = maxYear % 2 === 0 ? maxYear : maxYear + 1;

    const biennialWindows = [];
    for (let end = windowEnd; end - 2 >= minYear && biennialWindows.length < 5; end -= 2) {
        biennialWindows.push({ start: end - 2, end });
    }
    // biennialWindows is newest-first; display newest-first (left to right)

    // Default: most recent window
    STATE.customPeriod = biennialWindows[0] || { start: maxYear - 1, end: maxYear };

    const periodBtnGroup = $('period-btn-group');
    const customPeriodEl = $('custom-period');
    const yearStartEl = $('year-start');
    const yearEndEl = $('year-end');

    if (yearStartEl) { yearStartEl.min = String(minYear); yearStartEl.max = String(maxYear); yearStartEl.value = String(STATE.customPeriod.start); }
    if (yearEndEl)   { yearEndEl.min = String(minYear);   yearEndEl.max = String(maxYear);   yearEndEl.value = String(STATE.customPeriod.end); }

    let isCustomMode = false;

    function setActivePeriodBtn(btnEl) {
        if (!periodBtnGroup) return;
        periodBtnGroup.querySelectorAll('.period-btn').forEach(b => b.classList.remove('period-btn--active'));
        if (btnEl) btnEl.classList.add('period-btn--active');
    }

    function renderPeriodButtons() {
        if (!periodBtnGroup) return;
        periodBtnGroup.innerHTML = '';

        biennialWindows.forEach((win, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'period-btn' + (i === 0 && !isCustomMode ? ' period-btn--active' : '');
            btn.textContent = `${win.start}–${win.end}`;
            btn.dataset.start = win.start;
            btn.dataset.end = win.end;
            btn.addEventListener('click', () => {
                isCustomMode = false;
                STATE.customPeriod = { start: win.start, end: win.end };
                if (customPeriodEl) customPeriodEl.style.display = 'none';
                setActivePeriodBtn(btn);
                executarValidacao();
            });
            periodBtnGroup.appendChild(btn);
        });

        // Custom button
        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'period-btn' + (isCustomMode ? ' period-btn--active' : '');
        customBtn.id = 'period-btn-custom';
        customBtn.textContent = 'Personalizado';
        customBtn.addEventListener('click', () => {
            isCustomMode = true;
            // Don't activate the button visually yet — only after Aplicar is clicked
            if (customPeriodEl) customPeriodEl.style.display = 'flex';
        });
        periodBtnGroup.appendChild(customBtn);
    }

    renderPeriodButtons();

    // ── Apply custom period ────────────────────────────────────────────────────
    const applyCustomPeriodBtn = $('apply-custom-period');
    if (applyCustomPeriodBtn) {
        applyCustomPeriodBtn.addEventListener('click', () => {
            const start = Number(yearStartEl?.value);
            const end = Number(yearEndEl?.value);
            if (!Number.isInteger(start) || !Number.isInteger(end)) {
                showToast('Informe anos válidos para o período personalizado.', 6000, 'error');
                return;
            }
            if (start > end) {
                showToast('Ano inicial não pode ser maior que o ano final.', 6000, 'error');
                return;
            }
            if (start < minYear || end > maxYear) {
                showToast(`Período fora dos limites da base (${minYear}–${maxYear}).`, 6000, 'error');
                return;
            }
            STATE.customPeriod = { start, end };
            setActivePeriodBtn($('period-btn-custom'));
            executarValidacao();
        });
    }

    // ── Other event listeners ──────────────────────────────────────────────────
    renderGroupsTable();
    setupColumnSorting();
    filterGroupsTable();

    // Warn if bancas data is absent from the source
    if (STATE.groupsData?.producoes && STATE.groupsData.producoes.bancas === undefined) {
        showToast('Atenção: dados de participação em bancas ainda não disponíveis — o indicador aparecerá como zero até atualização da base.', 8000, 'warning');
    }

    const grupoFilter = $('grupo-filter');
    const gerarRelatorioBtn = $('gerar-relatorio-btn');
    const groupSearch = $('group-search');
    const researcherSearch = $('researcher-search');
    const statusFilter = $('status-filter');

    if (grupoFilter) grupoFilter.addEventListener('change', executarValidacao);
    if (gerarRelatorioBtn) gerarRelatorioBtn.addEventListener('click', mostrarEditor);
    if (groupSearch) groupSearch.addEventListener('input', filterGroupsTable);
    if (researcherSearch) researcherSearch.addEventListener('input', filterGroupsTable);
    if (statusFilter) statusFilter.addEventListener('change', filterGroupsTable);

    const loading = $('loading');
    if (loading) loading.style.display = 'none';

    // ── Aviso experimental ─────────────────────────────────────────────────────
    const avisoCiencia = $('aviso-ciencia');
    const avisoOverlay = $('aviso-experimental');
    if (avisoCiencia && avisoOverlay) {
        avisoCiencia.addEventListener('click', () => {
            avisoOverlay.classList.add('is-hidden');
            avisoCiencia.focus();
        });
        avisoOverlay.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                avisoOverlay.classList.add('is-hidden');
            }
        });
        // Move focus to the button
        avisoCiencia.focus();
    }
});

// ── Interactive Editor Overlay ─────────────────────────────────────────
var _editState = null;

function mostrarEditor() {
    if (!STATE.resultado) return;
    _editState = { original: JSON.parse(JSON.stringify(STATE.resultado)) };
    var r = _editState.original;
    var esc = function(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };

    var overlay = document.createElement('div');
    overlay.id = 'editor-overlay';
    overlay.innerHTML = [
        '<div class="editor-modal"><div class="editor-modal-header">',
        '<span class="editor-title">Revisao e Edicao do Relatorio</span>',
        '<span class="editor-status" id="edit-status">Modo de revisao</span>',
        '<button class="editor-close" onclick="fecharEditor()">&times;</button></div>',
        '<div class="editor-body">',
        // Section 1: Dados
        '<div class="edit-section"><div class="edit-section-title">1. Dados do Grupo</div>',
        '<div class="edit-grid-2">',
        '<div class="edit-field"><label>Nome</label><input id="edit-nome" value="'+esc(r.grupo.nome)+'"></div>',
        '<div class="edit-field"><label>Campus</label><input id="edit-campus" value="'+esc(campusToCidade(r.grupo.unidade))+'"></div>',
        '<div class="edit-field"><label>Area</label><input id="edit-area" value="'+esc(r.grupo.area)+'"></div>',
        '<div class="edit-field"><label>Ano de Criacao</label><input id="edit-ano" type="number" value="'+(r.grupo.anoCriacao||'')+'"></div>',
        '</div></div>',
        // Section 2: Membros
        '<div class="edit-section"><div class="edit-section-title">2. Pesquisadores</div><div class="membros-list">',
        (function() {
            var h = '';
            var liderId = r.grupo.LiderId || null;
            (r.membros || []).forEach(function(m, i) {
                var ehLider = m.siape && liderId && m.siape === liderId;
                h += '<label class="membro-item'+(ehLider?' membro-item--lider':'')+'">' +
                    '<input type="checkbox" class="membro-checkbox" data-idx="'+i+'" checked onchange="recalcularEditor()">' +
                    esc(m.nome) +
                    (ehLider ? ' <span class="membro-lider">(Lider)</span>' : '') +
                    (m.siape ? ' <span class="membro-siape">[SIAPE: '+esc(m.siape)+']</span>' : '') +
                    '</label>';
            });
            return h;
        })() +
        '</div><div class="edit-membro-count"><strong id="count-membros">'+(r.membros||[]).length+'</strong> pesquisador(es) ativo(s)</div></div>',
        // Section 3: Producao
        '<div class="edit-section"><div class="edit-section-title">3. Producao no Periodo</div>',
        (function() {
            var h = '';
            Object.keys(r.producoes).forEach(function(cat) {
                var items = r.producoes[cat] || [];
                if (items.length === 0) return;
                h += '<div class="prod-categoria" data-cat="'+cat+'">' +
                    '<div class="prod-cat-title"><strong>'+cat.charAt(0).toUpperCase()+cat.slice(1)+'</strong> &mdash; <span class="prod-cat-pts">0</span> pts (<span class="prod-cat-count">0</span> itens)</div>' +
                    '<table class="prod-table"><thead><tr><th class="col-incluir">Incluir</th><th class="col-ano">Ano</th><th class="col-itemid">Item</th><th class="col-titulo">Titulo</th><th class="col-estrato">Estrato</th><th class="col-pts">Pts</th></tr></thead><tbody>';
                items.forEach(function(p, i) {
                    h += '<tr class="prod-row"><td class="col-incluir"><input type="checkbox" class="prod-checkbox" data-cat="'+cat+'" data-idx="'+i+'" checked onchange="recalcularEditor()"></td>' +
                        '<td class="col-ano">'+esc(p.ano)+'</td>' +
                        '<td class="col-itemid">'+esc(p.itemId)+'</td>' +
                        '<td class="col-titulo">'+esc(p.titulo)+(p.periodico?'<br><em style="font-size:0.75rem;color:#888;">'+esc(p.periodico)+'</em>':'')+'</td>' +
                        '<td class="col-estrato">'+esc(p.estrato||'-')+'</td>' +
                        '<td class="col-pts">'+(p.pontos||'0')+'</td></tr>';
                });
                h += '</tbody></table></div>';
            });
            return h;
        })() +
        '</div>',
        // Section 4: Pontuacao
        '<div class="edit-section"><div class="edit-section-title">4. Pontuacao (Anexo I)</div><div class="pontuacao-sumario">' +
        '<div class="pont-item"><span class="pont-label">Total</span><span class="pont-valor" id="pont-total">0</span></div>' +
        '<div class="pont-item"><span class="pont-label">Membros Ativos</span><span class="pont-valor" id="pont-membros">0</span></div>' +
        '<div class="pont-item"><span class="pont-label">Pontos/Membro</span><span class="pont-valor" id="pont-por-membro">0</span></div>' +
        '<div class="pont-item"><span class="pont-label">Minimo</span><span class="pont-valor" id="pont-minimo">&mdash;</span></div>' +
        '<div class="pont-item"><span class="pont-label">Resultado</span><span class="pont-valor" id="pont-resultado">&mdash;</span></div>' +
        '</div></div>',
        // Section 5: Criterios CNPq
        '<div class="edit-section"><div class="edit-section-title">5. Criterios CNPq/DGP</div>',
        buildCriteriosTable(r.criterios.filter(function(c) { return c.fonte === 'CNPq'; }), esc),
        '</div>',
        // Section 6: Criterios IFBA
        '<div class="edit-section"><div class="edit-section-title">6. Criterios IFBA</div>',
        buildCriteriosTable(r.criterios.filter(function(c) { return c.fonte === 'IFBA'; }), esc),
        '</div>',
        // Section 7: Declaracao
        '<div class="edit-section"><div class="edit-section-title">7. Declaracao do Lider</div>',
        '<div style="padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">',
        '<label style="display:flex;align-items:center;gap:0.5rem;font-weight:600;">' +
        '<input type="checkbox" id="edit-declaracao"> Declaro que as informacoes prestadas neste relatorio sao verdadeiras e refletem a producao do grupo no periodo indicado.</label>',
        '<div class="edit-field"><label>Observacoes (opcional)</label><textarea id="edit-observacoes" rows="3"></textarea></div>',
        '</div></div>',
        '</div>',
        // Footer with buttons
        '<div class="editor-footer">',
        '<button class="btn-secundario" onclick="fecharEditor()">Cancelar</button>',
        '<button class="btn-primario" id="btn-gerar-pdf" onclick="gerarPDFComEdicao()">Gerar Relatório</button>',
        '</div></div>'
    ].join('\n');

    document.body.appendChild(overlay);
    recalcularEditor();
}

function buildCriteriosTable(criterios, esc) {
    if (criterios.length === 0) return '<p style="padding:1rem;color:#888;font-style:italic;">Nenhum criterio.</p>';
    var h = '<table class="criterios-table"><thead><tr><th style="width:3.5rem;">ID</th><th>Criterio</th><th style="width:4rem;">Status</th><th>Detalhe</th><th style="width:8rem;">Avaliacao Manual</th></tr></thead><tbody>';
    criterios.forEach(function(c) {
        var isNaoVerif = c.detalhe === 'Nao verificado' || !c.verificado;
        h += '<tr class="'+(isNaoVerif?'criterio-naoverif':'')+'">' +
            '<td style="font-family:monospace;">'+esc(c.id)+'</td>' +
            '<td>'+esc(c.nome)+'</td>' +
            '<td style="text-align:center;"><span class="status-display" data-criterio-id="'+esc(c.id)+'" style="color:'+(isNaoVerif?'#aaa':'#2e7d32')+';font-weight:700;">'+(isNaoVerif?'O Nao verificado':'V Atendido')+'</span></td>' +
            '<td style="font-size:0.8rem;">'+esc(c.detalhe)+'</td>' +
            '<td>' +
            (isNaoVerif ? '<select class="manual-criterio" data-criterio-id="'+esc(c.id)+'" onchange="atualizarStatusCriterio(this)"><option value="">Nao verificado</option><option value="sim">Atendido</option><option value="nao">Nao atendido</option></select>' :
            '<span style="color:#888;font-size:0.8rem;">Automatico</span>') +
            '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
}

function atualizarStatusCriterio(sel) {
    var id = sel.dataset.criterioId;
    var el = document.querySelector('.status-display[data-criterio-id="'+id+'"]');
    if (el) {
        if (sel.value === 'sim') { el.innerHTML = 'V Atendido (avaliador)'; el.style.color = '#2e7d32'; }
        else if (sel.value === 'nao') { el.innerHTML = 'X Nao atendido (avaliador)'; el.style.color = '#c62828'; }
        else { el.innerHTML = 'O Nao verificado'; el.style.color = '#aaa'; }
    }
    recalcularEditor();
}

function recalcularEditor() {
    if (!_editState) return;
    var total = 0;
    document.querySelectorAll('#editor-overlay .prod-checkbox:checked').forEach(function(cb) {
        var p = _editState.original.producoes[cb.dataset.cat][parseInt(cb.dataset.idx)];
        total += Number(p.pontos || 0);
    });
    var membros = document.querySelectorAll('#editor-overlay .membro-checkbox:checked').length;
    if (membros === 0) membros = 1;
    var porMembro = total / membros;
    var anoEl = document.getElementById('edit-ano');
    var ano = anoEl ? parseInt(anoEl.value) : 0;
    var tf = (!ano || isNaN(ano) || ano <= 0) ? (_editState.original.pontuacao.tempoFormacao || 0) : new Date().getFullYear() - ano;
    var minimo = getPontuacaoMinima(tf);
    var faixaLabel = getFaixaGrupo ? getFaixaGrupo(tf) : 'Consolidado';
    var atingiu = minimo !== null && porMembro >= minimo;

    document.getElementById('pont-total').textContent = total;
    document.getElementById('pont-membros').textContent = membros;
    document.getElementById('pont-por-membro').textContent = porMembro.toFixed(1);
    if (minimo !== null) {
        document.getElementById('pont-minimo').textContent = minimo + ' pts/membro ('+faixaLabel+')';
        var el = document.getElementById('pont-resultado');
        el.textContent = atingiu ? 'CONFORME' : 'NAO CONFORME';
        el.style.color = atingiu ? '#2e7d32' : '#c62828';
    }
    document.getElementById('count-membros').textContent = membros;

    // Update criterio status display for IFBA scoring
    var ids = ['IFBA-08','IFBA-09','IFBA-10'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.querySelector('#editor-overlay .status-display[data-criterio-id="'+ids[i]+'"]');
        if (el) {
            var txt = (atingiu ? 'V' : 'X') + ' ' + porMembro.toFixed(1) + ' pts/membro ' + (atingiu ? '>=' : '<') + ' ' + (minimo || 0);
            el.innerHTML = txt;
            el.style.color = atingiu ? '#2e7d32' : '#c62828';
            break;
        }
    }
}

function coletarEdicoes() {
    var e = {
        dadosGrupo: {
            nome: document.getElementById('edit-nome').value,
            campus: document.getElementById('edit-campus').value,
            area: document.getElementById('edit-area').value,
            anoCriacao: parseInt(document.getElementById('edit-ano').value) || ''
        },
        membrosAtivos: [],
        producoesAtivas: {},
        criteriosOverride: {},
        declaracao: {
            checked: document.getElementById('edit-declaracao').checked,
            observacoes: document.getElementById('edit-observacoes').value
        }
    };
    document.querySelectorAll('#editor-overlay .membro-checkbox').forEach(function(cb) {
        e.membrosAtivos.push(cb.checked);
    });
    document.querySelectorAll('#editor-overlay .prod-categoria').forEach(function(div) {
        var cat = div.dataset.cat;
        e.producoesAtivas[cat] = [];
        div.querySelectorAll('.prod-checkbox').forEach(function(cb) {
            e.producoesAtivas[cat].push(cb.checked);
        });
    });
    document.querySelectorAll('#editor-overlay .manual-criterio').forEach(function(sel) {
        if (sel.value) e.criteriosOverride[sel.dataset.criterioId] = sel.value;
    });
    return e;
}

function gerarPDFComEdicao() {
    var declaracaoCheck = document.getElementById('edit-declaracao');
    if (!declaracaoCheck || !declaracaoCheck.checked) {
        alert('Marque a declaração de veracidade antes de gerar o relatório.');
        return;
    }
    var edits = coletarEdicoes();
    gerarRelatorio(edits);
    fecharEditor();
}

function fecharEditor() {
    var el = document.getElementById('editor-overlay');
    if (el) el.remove();
    _editState = null;
}
