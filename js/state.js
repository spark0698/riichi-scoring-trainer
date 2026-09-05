'use strict';
function sameTile(a,b){ return a.suit===b.suit && a.num===b.num; }
function removeOne(list, tile){
  const idx = list.findIndex(t=>sameTile(t,tile));
  if(idx>=0) list.splice(idx,1);
  return list;
}

const state = {
  test: {han:true, fu:true, points:true},
  pendingTest: {han:true, fu:true, points:true},
  kiriage: true,
  handFilters: {winMethod:'any', seat:'any'},
  current: null,
  stats: {correct:0, total:0},
  mistakes: [],
  replay: null // {queue:[ids]} while actively replaying the mistake list
};

const MISTAKES_KEY = 'riichiTrainerMistakes';
function loadMistakes(){
  try{
    const raw = localStorage.getItem(MISTAKES_KEY);
    state.mistakes = raw ? JSON.parse(raw) : [];
  }catch(e){ state.mistakes = []; }
}
function saveMistakes(){
  try{ localStorage.setItem(MISTAKES_KEY, JSON.stringify(state.mistakes)); }catch(e){ /* storage unavailable (e.g. private browsing) — fail silently, progress just won't persist */ }
}
const STATS_KEY = 'riichiTrainerStats';
function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if(parsed && typeof parsed.correct==='number' && typeof parsed.total==='number'){
      state.stats = parsed;
    }
  }catch(e){ /* keep the default {correct:0, total:0} */ }
}
function saveStats(){
  try{ localStorage.setItem(STATS_KEY, JSON.stringify(state.stats)); }catch(e){ /* storage unavailable — fail silently */ }
}
// Clears the stored progress keys directly (rather than saving an empty
// state) so a manual reset can't be confused with "no progress recorded
// yet" if storage inspection ever matters — and only these two keys, not
// the whole origin's storage, in case something unrelated ever gets added
// to localStorage later.
function resetProgress(){
  state.mistakes = [];
  state.stats = {correct:0, total:0};
  try{ localStorage.removeItem(MISTAKES_KEY); }catch(e){ /* storage unavailable — fail silently */ }
  try{ localStorage.removeItem(STATS_KEY); }catch(e){ /* storage unavailable — fail silently */ }
}
function uid(){ return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); }
function updateMistakesBadge(){
  document.querySelectorAll('.nav-mistakes-btn').forEach(btn=>{
    btn.textContent = `Mistakes (${state.mistakes.length})`;
  });
}
function addMistake(cur){
  state.mistakes.push({
    id: uid(),
    hand: cur.hand, info: cur.info,
    derived: {yakumanMult:cur.yakumanMult, hanFromYaku:cur.hanFromYaku, hanTotal:cur.hanTotal, fu:cur.fu, fuDetails:cur.fuDetails, isDealer:cur.isDealer, score:cur.score}
  });
  saveMistakes();
  updateMistakesBadge();
}
loadMistakes();
loadStats();

function activeTests(){
  const keys = Object.keys(state.test).filter(k=>state.test[k]);
  return keys;
}

