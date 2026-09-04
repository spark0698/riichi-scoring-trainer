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
    const raw = sessionStorage.getItem(MISTAKES_KEY);
    state.mistakes = raw ? JSON.parse(raw) : [];
  }catch(e){ state.mistakes = []; }
}
function saveMistakes(){
  try{ sessionStorage.setItem(MISTAKES_KEY, JSON.stringify(state.mistakes)); }catch(e){ /* storage unavailable (e.g. private browsing) — fail silently, session just won't persist across a refresh */ }
}
const STATS_KEY = 'riichiTrainerStats';
function loadStats(){
  try{
    const raw = sessionStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if(parsed && typeof parsed.correct==='number' && typeof parsed.total==='number'){
      state.stats = parsed;
    }
  }catch(e){ /* keep the default {correct:0, total:0} */ }
}
function saveStats(){
  try{ sessionStorage.setItem(STATS_KEY, JSON.stringify(state.stats)); }catch(e){ /* storage unavailable — fail silently */ }
}
function uid(){ return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); }
function updateMistakesBadge(){
  const btn = document.getElementById('btnMistakes');
  if(btn) btn.textContent = `Mistakes (${state.mistakes.length})`;
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

