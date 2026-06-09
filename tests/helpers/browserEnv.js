/**
 * Helper to load browser-targeted scripts (non-module, global-scope) into a
 * Node.js vm context for unit testing without a real browser or jsdom.
 */
'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const CAMPUS_TO_CITY = {
  BAR: 'BARREIRAS', BRU: 'BRUMADO', CAM: 'CAMAÇARI', CFO: 'CAMPO FORMOSO',
  EC: 'EUCLIDES DA CUNHA', EUN: 'EUNÁPOLIS', FS: 'FEIRA DE SANTANA',
  ILH: 'ILHÉUS', IRE: 'IRECÊ', JAC: 'JACOBINA', JAG: 'JAGUAQUARA',
  JEQ: 'JEQUIÉ', SAM: 'SANTO AMARO', SEA: 'SEABRA', SF: 'SIMÕES FILHO',
  UBA: 'UBAITABA', VAL: 'VALENÇA', VC: 'VITÓRIA DA CONQUISTA',
  SAJ: 'SANTO ANTÔNIO DE JESUS', JUA: 'JUAZEIRO', PA: 'PAULO AFONSO',
  PS: 'PORTO SEGURO', SSA: 'SALVADOR',
};

const IFBA_COORDS = {
  SALVADOR: [-12.9714, -38.5014],
  'FEIRA DE SANTANA': [-12.2666, -38.9666],
  'VITÓRIA DA CONQUISTA': [-14.8661, -40.8394],
  'VITORIA DA CONQUISTA': [-14.8661, -40.8394],
  ITABUNA: [-14.7869, -39.2800],
  JEQUIÉ: [-13.8580, -40.0830],
  JEQUIE: [-13.8580, -40.0830],
  VALENÇA: [-13.3700, -39.0730],
  VALENCA: [-13.3700, -39.0730],
  CAMAÇARI: [-12.6975, -38.3241],
  CAMACARI: [-12.6975, -38.3241],
  BRUMADO: [-14.2045, -41.6663],
  JUAZEIRO: [-9.4124, -40.5055],
  'PAULO AFONSO': [-9.4005, -38.2163],
  'PORTO SEGURO': [-16.4442, -39.0644],
};

/**
 * Build a minimal mock document suitable for script initialisation.
 * Each call to getElementById/querySelectorAll returns a throwaway stub
 * that satisfies module-level code in script.js.
 */
function makeMockDocument() {
  const elem = () => ({
    textContent: '',
    innerHTML: '',
    style: {},
    value: 'all',
    checked: true,
    dataset: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false,
    },
    addEventListener: () => {},
    parentElement: { style: {} },
    appendChild: () => {},
    title: '',
  });

  return {
    getElementById: () => elem(),
    querySelectorAll: () => ({ forEach: () => {} }),
    querySelector: () => null,
    addEventListener: () => {},
    body: { style: {} },
  };
}

/**
 * Create and return a vm context that emulates the browser globals used by
 * script.js / posgraduacao.js.  Extra entries in `overrides` are merged in
 * after the defaults, so callers can supply e.g. a specific STATE.maxYear.
 */
function createBrowserContext(overrides = {}) {
  const STATE = {
    raw: {
      bibliografica: [], tecnica: [], inovacao: [],
      concluidas: [], andamento: [], grupos: [], posgraduacao: [],
    },
    filtered: {
      bibliografica: [], tecnica: [], inovacao: [],
      concluidas: [], andamento: [], grupos: [], posgraduacao: [],
    },
    charts: {},
    leafMaps: {},
    minYear: 2000,
    maxYear: 2024,
  };

  const sandbox = {
    // ── JavaScript built-ins ──────────────────────────────────────────────
    Array, Object, Set, Map, Number, String, Boolean, RegExp, Date,
    Math, JSON, parseInt, parseFloat, isNaN, isFinite,
    NaN, Infinity, undefined,
    Error, TypeError, RangeError, ReferenceError,
    Promise, Symbol, Function,
    // ── Node.js globals ───────────────────────────────────────────────────
    console,
    // ── Browser globals (minimal stubs) ──────────────────────────────────
    document: makeMockDocument(),
    window: { addEventListener: () => {} },
    // ── Dashboard-specific globals ────────────────────────────────────────
    STATE,
    CAMPUS_TO_CITY,
    IFBA_COORDS,
    // ── Third-party library stubs ─────────────────────────────────────────
    Chart: function () { this.destroy = () => {}; },
    L: {
      map: () => ({
        setView: function () { return this; },
        addLayer: () => {},
        invalidateSize: () => {},
        remove: () => {},
      }),
      tileLayer: () => ({ addTo: () => {} }),
      circleMarker: () => ({
        addTo: function () { return this; },
        bindPopup: function () { return this; },
      }),
    },
    caches: undefined,
    fetch: undefined,
    ...overrides,
  };

  vm.createContext(sandbox);
  return sandbox;
}

/**
 * Load a browser script file into an existing vm context and return the
 * (mutated) context so callers can access the functions it defined.
 */
function loadScript(ctx, scriptPath) {
  const code = fs.readFileSync(scriptPath, 'utf-8');
  vm.runInContext(code, ctx);
  return ctx;
}

module.exports = { createBrowserContext, loadScript, CAMPUS_TO_CITY, IFBA_COORDS };
