'use strict';
// Loads the app's scoring engine (js/tile-data.js + js/utils.js +
// js/hand-builder.js + js/scoring.js) into a fresh Node `vm` context, read
// fresh from the repo at call time - never a frozen copy - so this harness
// can't silently drift out of sync with the real scoring code. Those files
// are plain global-scope functions (no module.exports), which is exactly
// what `vm` is for: they populate the sandbox's global scope directly.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_FILES = ['js/tile-data.js', 'js/utils.js', 'js/hand-builder.js', 'js/scoring.js'];

function loadEngine(){
  const src = ENGINE_FILES.map(f => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8')).join('\n');
  // Only global this code actually touches is `state.handFilters` (read by
  // pickWinMethod/pickSeatWind) - stub just that instead of loading the
  // real js/state.js, which assumes a DOM/sessionStorage environment.
  const ctx = { state: { handFilters: { winMethod: 'any', seat: 'any' } } };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'engine.js' });
  return ctx;
}

module.exports = { loadEngine, REPO_ROOT, ENGINE_FILES };
