'use strict';
document.getElementById('dealBtn').addEventListener('click', dealHand);
const scrollTopBtn = document.getElementById('scrollTopBtn');
scrollTopBtn.addEventListener('click', ()=>{
  window.scrollTo({top:0, behavior:'smooth'});
});
document.addEventListener('scroll', ()=>{
  scrollTopBtn.classList.toggle('visible', window.scrollY > 0);
});

/* ---- hamburger menu ---- */
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
function openMenu(){
  menuPanel.classList.add('open');
  menuBtn.classList.add('active');
  menuBtn.setAttribute('aria-expanded','true');
}
function closeMenu(){
  menuPanel.classList.remove('open');
  menuBtn.classList.remove('active');
  menuBtn.setAttribute('aria-expanded','false');
}
menuBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  if(menuPanel.classList.contains('open')) closeMenu(); else openMenu();
});
document.addEventListener('click', (e)=>{
  if(menuPanel.classList.contains('open') && !menuPanel.contains(e.target) && e.target!==menuBtn){
    closeMenu();
  }
});

function computeDerived(hand, info){
  const yakumanMult = (info.yakuman||[]).reduce((a,y)=>a+y.mult,0);
  const hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
  const hanTotal = hanFromYaku + hand.doraInHand + hand.redFiveCount + hand.uraDoraInHand;
  const fuRes = hand.isChiitoi ? computeFuChiitoi() : (hand.isKokushi ? computeFuKokushi() : computeFu(hand, info));
  const isDealer = hand.seatWind===1;
  const score = computeScore(yakumanMult>0 ? 13 : hanTotal, fuRes.fu, isDealer, hand.winMethod, yakumanMult, state.kiriage);
  return {yakumanMult, hanFromYaku, hanTotal, fu:fuRes.fu, fuDetails:fuRes.details, isDealer, score};
}

function dealHand(){
  const {hand, info} = generateValidHand();
  const derived = computeDerived(hand, info);
  state.current = {hand, info, ...derived, answered:false};
  renderHandCard();
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('resultCard').innerHTML='';
}

function windTag(n){ return WIND_NAMES[n]; }

// Attach a `.red` flag to at most one occurrence per suit (only one red-5
// tile physically exists per suit), returning a fresh tile-array structure
// that mirrors hand.groups / hand.pair for rendering purposes.
function markRedFives(groups, pair, redFiveSuits){
  const used = {};
  function maybeMark(suit, num){
    if(num===5 && redFiveSuits.includes(suit) && !used[suit]){
      used[suit]=true;
      return {suit, num, red:true};
    }
    return {suit, num};
  }
  const groupsOut = groups.map(g=>{
    if(g.kind==='seq') return [maybeMark(g.suit,g.start), maybeMark(g.suit,g.start+1), maybeMark(g.suit,g.start+2)];
    if(g.kind==='kan') return [maybeMark(g.suit,g.num), maybeMark(g.suit,g.num), maybeMark(g.suit,g.num), maybeMark(g.suit,g.num)];
    return [maybeMark(g.suit,g.num), maybeMark(g.suit,g.num), maybeMark(g.suit,g.num)];
  });
  const pairOut = [maybeMark(pair.suit,pair.num), maybeMark(pair.suit,pair.num)];
  return {groupsOut, pairOut};
}
function markRedFivesChiitoi(pairs, winIdx, redFiveSuits){
  // Redness must be decided per physical tile, not per pair-type — a pair of
  // two identical tiles can have at most one red copy (only one red-5 tile
  // exists per suit). The winning pair contributes one tile to the win slot
  // and one to the concealed row; those must be considered separately too.
  const used = {};
  function makeTile(suit, num){
    if(num===5 && redFiveSuits.includes(suit) && !used[suit]){
      used[suit] = true;
      return {suit, num, red:true};
    }
    return {suit, num};
  }
  const winTile = makeTile(pairs[winIdx].suit, pairs[winIdx].num);
  let concealed = [];
  pairs.forEach((p,i)=>{
    if(i===winIdx){
      concealed.push(makeTile(p.suit, p.num)); // the pair's other physical tile
    } else {
      concealed.push(makeTile(p.suit, p.num));
      concealed.push(makeTile(p.suit, p.num));
    }
  });
  return {winTile, concealed};
}

function handContextBitsHTML(hand){
  let contextBits = [];
  contextBits.push(`<span>Round: <b>${windTag(hand.roundWind)}</b></span>`);
  contextBits.push(`<span>Seat: <b>${windTag(hand.seatWind)}</b>${hand.seatWind===1?' <span class="tag">Dealer</span>':' <span class="tag">Non-dealer</span>'}</span>`);
  contextBits.push(`<span>Win: <b>${hand.winMethod==='tsumo'?'Tsumo (self-draw)':'Ron (discard)'}</b></span>`);
  if(hand.doubleRiichi) contextBits.push(`<span class="tag riichi">Double Riichi</span>`);
  else if(hand.riichi) contextBits.push(`<span class="tag riichi">Riichi</span>`);
  if(hand.riichi && hand.ippatsu) contextBits.push(`<span class="tag riichi">Ippatsu</span>`);
  if(hand.haitei) contextBits.push(`<span class="tag">Haitei (last tile tsumo)</span>`);
  if(hand.houtei) contextBits.push(`<span class="tag">Houtei (last discard ron)</span>`);
  if(hand.rinshan) contextBits.push(`<span class="tag">Rinshan (won on replacement tile after a kan)</span>`);
  if(hand.chankan) contextBits.push(`<span class="tag">Chankan (won on an added-kan tile)</span>`);
  if(!hand.isChiitoi && !hand.isKokushi){
    const kanCount = (hand.groups||[]).filter(g=>g.kind==='kan').length;
    if(kanCount>0) contextBits.push(`<span>Kans: <b>${kanCount}</b></span>`);
  }
  if(!hand.isChiitoi && !hand.concealed) contextBits.push(`<span>Hand: <b>Open</b></span>`);
  else contextBits.push(`<span>Hand: <b>Closed</b></span>`);
  return contextBits.join('');
}

// dora / ura-dora indicators, shown as actual tiles rather than counts.
// Each kan adds one extra dora indicator (and one extra ura indicator if
// riichi), so these are arrays — usually length 1, longer with kans.
function handIndicatorHTML(hand){
  let indicatorHTML = `<div class="indicator-row">`;
  const doraLabel = hand.doraIndicators.length>1 ? 'Dora indicators' : 'Dora indicator';
  indicatorHTML += `<div class="indicator-item"><div class="indicator-label">${doraLabel}</div>
    <div class="indicator-tiles-row">${hand.doraIndicators.map(t=>`<div class="tile indicator-tile">${tileSVG(t)}</div>`).join('')}</div></div>`;
  if(hand.riichi && hand.uraIndicators && hand.uraIndicators.length){
    const uraLabel = hand.uraIndicators.length>1 ? 'Ura dora indicators' : 'Ura dora indicator';
    indicatorHTML += `<div class="indicator-item"><div class="indicator-label">${uraLabel}</div>
      <div class="indicator-tiles-row">${hand.uraIndicators.map(t=>`<div class="tile indicator-tile">${tileSVG(t)}</div>`).join('')}</div></div>`;
  }
  indicatorHTML += `</div>`;
  return indicatorHTML;
}

// All hand shapes render as: [called melds, if any][concealed tiles] in one
// wrapping block (hand-tiles-wrap), then a divider, then the win tile.
// hand-tiles-wrap flows melds/tiles left-to-right and wraps to further rows
// if it runs out of horizontal room; the win tile sits to its right and,
// once we know whether that wrap actually happened, gets vertically
// centered against the resulting block (see applyMultiRowFix) rather than
// always top-aligned.
function handTilesHTML(hand){
  let tilesHTML = '';
  if(hand.isKokushi){
    const concealed = hand.tiles.filter((t,i)=> i!==hand.pairIdx);
    const winTile = hand.tiles[hand.pairIdx];
    tilesHTML += `<p class="hand-label">Hand</p>`;
    tilesHTML += `<div class="win-wrap combined-row"><div class="hand-tiles-wrap">`;
    concealed.forEach(t=> tilesHTML += tileHTML(t));
    tilesHTML += `</div><div class="divider"></div><div>${tileHTML(winTile,'win')}<div class="win-note">${hand.winMethod==='tsumo'?'Tsumo':'Ron'}</div></div></div>`;
  } else if(hand.isChiitoi){
    const winIdx = hand.winningPairIdx;
    const {winTile, concealed: concealedRaw} = markRedFivesChiitoi(hand.pairs, winIdx, hand.redFiveSuits||[]);
    const concealed = sortTiles(concealedRaw);
    tilesHTML += `<p class="hand-label">Hand</p>`;
    tilesHTML += `<div class="win-wrap combined-row"><div class="hand-tiles-wrap">`;
    concealed.forEach(t=> tilesHTML += tileHTML(t));
    tilesHTML += `</div><div class="divider"></div><div>${tileHTML(winTile,'win')}<div class="win-note">${hand.winMethod==='tsumo'?'Tsumo':'Ron'}</div></div></div>`;
  } else {
    const {groups, pair, groupConcealed, winSlot} = hand;
    const {groupsOut, pairOut} = markRedFives(groups, pair, hand.redFiveSuits||[]);
    let concealedTiles = [];
    let openMelds = [];
    let closedKans = [];
    groupsOut.forEach((gTiles,i)=>{
      if(!groupConcealed[i]) openMelds.push(gTiles);
      else if(groups[i].kind==='kan') closedKans.push(gTiles);
      else concealedTiles = concealedTiles.concat(gTiles);
    });
    concealedTiles = concealedTiles.concat(pairOut);
    // Identify the winning tile by suit/num, then pull the actual marked
    // (possibly red-five) tile object out of the marked data, so the red
    // flag isn't lost when the winning tile happens to be a red five.
    const winIdentity = winSlot.groupIdx==='pair' ? {suit:pair.suit,num:pair.num} : winSlot.tile;
    const winMatchIdx = concealedTiles.findIndex(t=>sameTile(t,winIdentity));
    const winTile = winMatchIdx>=0 ? concealedTiles[winMatchIdx] : winIdentity;
    if(winMatchIdx>=0) concealedTiles.splice(winMatchIdx,1);
    concealedTiles = sortTiles(concealedTiles);

    tilesHTML += `<p class="hand-label">Hand</p>`;
    tilesHTML += `<div class="win-wrap combined-row"><div class="hand-tiles-wrap">`;
    openMelds.forEach(m=>{
      tilesHTML += `<div class="meld-group">`;
      // Any called group gets one tile turned sideways, matching the
      // real-table convention that marks a group as a call — it doesn't
      // matter which of the tiles, so we just pick the last one.
      m.forEach((t,ti)=>{
        const cls = ti===m.length-1 ? 'sideways' : '';
        tilesHTML += tileHTML(t, cls);
      });
      tilesHTML += `</div>`;
    });
    closedKans.forEach(m=>{
      tilesHTML += `<div class="meld-group">`;
      // Ankan (closed kan) convention: separated out like a call, but the
      // two middle tiles are turned face-down (keeping them concealed) and
      // nothing is rotated, since it wasn't called from another player —
      // only the two outer tiles are shown face-up.
      m.forEach((t,ti)=>{
        tilesHTML += (ti===1||ti===2) ? tileBackHTML() : tileHTML(t);
      });
      tilesHTML += `</div>`;
    });
    concealedTiles.forEach(t=> tilesHTML += tileHTML(t));
    tilesHTML += `</div>`;
    tilesHTML += `<div class="divider"></div><div>${tileHTML(winTile,'win')}<div class="win-note">${hand.winMethod==='tsumo'?'Tsumo':'Ron'}</div></div>`;
    tilesHTML += `</div>`;
  }
  return tilesHTML;
}

// Measure whether a rendered hand-tiles-wrap actually wrapped onto multiple
// rows; if so, center the win tile against the full block instead of
// top-aligning it against just the first row. Shared by the main hand card
// and every expanded mistake-review box.
function applyMultiRowFix(container){
  requestAnimationFrame(()=>{
    const wrap = container.querySelector('.hand-tiles-wrap');
    const winWrap = container.querySelector('.win-wrap');
    if(!wrap || !winWrap) return;
    const kids = [...wrap.children];
    if(kids.length < 2){ winWrap.classList.remove('multi-row'); return; }
    const firstTop = kids[0].offsetTop;
    // A meld-group's own compensating negative top margin (see its CSS)
    // makes its bounding box measure a few px higher than a plain tile's
    // even on a genuine single row, so the tolerance here has to clear
    // that (max 4px) — a real second row is a whole tile height away
    // (46px+), so 20px safely tells the two apart.
    const wrapped = kids.some(k=> k.offsetTop > firstTop + 20);
    winWrap.classList.toggle('multi-row', wrapped);
  });
}

function renderHandCard(){
  const {hand} = state.current;
  const card = document.getElementById('handCard');
  card.innerHTML = `
    <div class="context-bar">${handContextBitsHTML(hand)}</div>
    ${handIndicatorHTML(hand)}
    ${handTilesHTML(hand)}
    <div id="answerFormHolder"></div>
  `;
  renderAnswerForm();
  applyMultiRowFix(card);
}

function renderAnswerForm(){
  const cur = state.current;
  if(!cur) return;
  const holder = document.getElementById('answerFormHolder');
  if(!holder) return;
  const tests = activeTests();

  let formHTML = '<div class="answer-form" id="answerForm">';
  formHTML += '<div class="answer-fields">';
  if(tests.includes('han')) formHTML += `<div class="field"><label for="ansHan">Han</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansHan" min="0" autocomplete="off"></div>`;
  if(tests.includes('fu')){
    formHTML += `<div class="field"><label for="ansFu">Fu</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansFu" min="20" step="10" autocomplete="off"></div>`;
  }
  if(tests.includes('points')){
    const isTsumo = cur.hand.winMethod==='tsumo';
    if(!isTsumo){
      // Ron: a single payment from the discarder.
      formHTML += `<div class="field"><label for="ansPoints">Points</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansPoints" min="0" step="100" autocomplete="off"></div>`;
    } else if(cur.isDealer){
      // Dealer tsumo: same amount from each of the 3 other players.
      formHTML += `<div class="field"><label for="ansPointsEach">Points per player (×3)</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansPointsEach" min="0" step="100" autocomplete="off"></div>`;
    } else {
      // Non-dealer tsumo: dealer pays double what the other two each pay.
      formHTML += `<div class="field"><label for="ansPointsDealer">Points from dealer</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansPointsDealer" min="0" step="100" autocomplete="off"></div>`;
      formHTML += `<div class="field"><label for="ansPointsOthers">Points from each non-dealer</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="ansPointsOthers" min="0" step="100" autocomplete="off"></div>`;
    }
  }
  formHTML += '</div>'; // .answer-fields
  formHTML += '<div class="answer-actions">';
  formHTML += `<button class="submit-btn" id="submitBtn">Submit</button>`;
  formHTML += `<button type="button" class="clear-btn" id="clearBtn">Clear</button>`;
  formHTML += '</div>'; // .answer-actions
  formHTML += '</div>'; // .answer-form

  holder.innerHTML = formHTML;
  document.getElementById('submitBtn').addEventListener('click', submitAnswer);
  document.getElementById('clearBtn').addEventListener('click', clearAnswerForm);
  document.querySelectorAll('#answerForm input').forEach(inp=>{
    inp.value=''; // guard against browser autofill repopulating a freshly dealt hand
    inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submitAnswer(); });
  });
}

function clearAnswerForm(){
  document.querySelectorAll('#answerForm input').forEach(inp=>{ inp.value=''; });
  const first = document.querySelector('#answerForm input');
  if(first) first.focus();
}

function submitAnswer(){
  const cur = state.current;
  if(!cur || cur.answered) return;
  cur.answered = true;
  const yakumanMult = cur.yakumanMult;
  const tests = activeTests();

  const verdicts = [];
  let allCorrect = true;
  if(tests.includes('han')){
    const inp = document.getElementById('ansHan');
    const val = parseInt(inp.value,10);
    const blank = isNaN(val);
    // A yakuman scores entirely on its own, so a blank answer is accepted —
    // but a typed-in number is still checked against hanTotal, in case
    // someone wants to practice han-counting anyway.
    const correct = (yakumanMult>0 && blank) ? true : (val === cur.hanTotal);
    if(!correct) allCorrect=false;
    verdicts.push({
      label: (yakumanMult>0 && blank) ? 'Han (a yakuman scores on its own)' : 'Han',
      given: blank ? '—' : val,
      correct: cur.hanTotal,
      ok: correct
    });
  }
  if(tests.includes('fu')){
    const inp = document.getElementById('ansFu');
    const val = parseInt(inp.value,10);
    const isLimitHand = !!cur.score.limitName; // mangan+ (incl. yakuman) : fu no longer affects the score
    const blank = isNaN(val);
    const correct = (isLimitHand && blank) ? true : (val === cur.fu);
    if(!correct) allCorrect=false;
    verdicts.push({
      label: (isLimitHand && blank) ? 'Fu (doesn\'t affect scoring here)' : 'Fu',
      given: blank ? '—' : val,
      correct: cur.fu,
      ok: correct
    });
  }
  if(tests.includes('points')){
    const isTsumo = cur.hand.winMethod==='tsumo';
    if(!isTsumo){
      const inp = document.getElementById('ansPoints');
      const val = parseInt(inp.value,10);
      const correct = val === cur.score.ronPayment;
      if(!correct) allCorrect=false;
      verdicts.push({label:'Points', given:isNaN(val)?'—':val, correct:cur.score.ronPayment, ok:correct});
    } else if(cur.isDealer){
      const inp = document.getElementById('ansPointsEach');
      const val = parseInt(inp.value,10);
      const correct = val === cur.score.dealerEach;
      if(!correct) allCorrect=false;
      verdicts.push({label:'Points (each of 3)', given:isNaN(val)?'—':val, correct:cur.score.dealerEach, ok:correct});
    } else {
      const inpD = document.getElementById('ansPointsDealer');
      const inpO = document.getElementById('ansPointsOthers');
      const valD = parseInt(inpD.value,10);
      const valO = parseInt(inpO.value,10);
      const correctD = valD === cur.score.fromDealer;
      const correctO = valO === cur.score.fromOthers;
      if(!correctD || !correctO) allCorrect=false;
      verdicts.push({label:'Points from dealer', given:isNaN(valD)?'—':valD, correct:cur.score.fromDealer, ok:correctD});
      verdicts.push({label:'Points from each non-dealer', given:isNaN(valO)?'—':valO, correct:cur.score.fromOthers, ok:correctO});
    }
  }

  state.stats.total++;
  if(allCorrect) state.stats.correct++;
  saveStats();
  document.getElementById('scoreCorrect').textContent = state.stats.correct;
  document.getElementById('scoreTotal').textContent = state.stats.total;

  // Mistake-list bookkeeping: outside replay, a wrong answer joins the list;
  // inside replay, a correct answer finally removes it, a wrong one just
  // goes back to the end of the queue (still in state.mistakes either way).
  if(state.replay){
    if(allCorrect){
      state.mistakes = state.mistakes.filter(m=>m.id!==cur.replayId);
      saveMistakes();
      updateMistakesBadge();
    } else {
      state.replay.queue.push(cur.replayId);
    }
  } else if(!allCorrect){
    addMistake(cur);
  }

  renderResults(verdicts);
}

// Builds the Yaku / Fu breakdown / Score portion shared by the post-submit
// result card and the read-only expanded view in the mistakes list.
function buildYakuFuScoreHTML(cur){
  const {hand, info, yakumanMult} = cur;
  let yakuRows = '';
  info.yaku.forEach(y=>{
    yakuRows += `<tr><td>${yakuNameHTML(y.name)}</td><td class="num">${y.han} han</td></tr>`;
  });
  if(hand.doraInHand>0) yakuRows += `<tr><td>Dora</td><td class="num">${hand.doraInHand} han</td></tr>`;
  if(hand.redFiveCount>0) yakuRows += `<tr><td>Aka Dora (red 5)</td><td class="num">${hand.redFiveCount} han</td></tr>`;
  if(hand.riichi && hand.uraDoraInHand>0) yakuRows += `<tr><td>Ura Dora</td><td class="num">${hand.uraDoraInHand} han</td></tr>`;
  (info.yakuman||[]).forEach(y=>{
    yakuRows += `<tr><td>${yakuNameHTML(y.name)}</td><td class="num">${y.mult>1?y.mult+'x ':''}Yakuman</td></tr>`;
  });
  yakuRows += `<tr class="total"><td>Total</td><td class="num">${yakumanMult>0? (yakumanMult>1?yakumanMult+'x Yakuman':'Yakuman') : cur.hanTotal+' han'}</td></tr>`;

  let fuRows='';
  cur.fuDetails.forEach(d=>{
    fuRows += `<tr><td>${yakuNameHTML(d.label)}</td><td class="num">${typeof d.value==='number' ? (d.value>0?'+':'')+d.value : d.value}</td></tr>`;
  });
  fuRows += `<tr class="total"><td>Total</td><td class="num">${cur.fu} fu</td></tr>`;

  const limitBadge = cur.score.limitName ? `<span class="limit-badge">${cur.score.limitName}</span>` : '';

  return `
    <div class="section-title">Yaku</div>
    ${yakumanMult>0 ? '<p class="hint" style="color:var(--red)">A yakuman was found — it scores on its own, so the other yaku listed below do not add extra han or points.</p>' : ''}
    <table class="breakdown"><tbody>${yakuRows}</tbody></table>
    ${yakumanMult>0 ? '' : `
    <div class="section-title">Fu breakdown</div>
    <table class="breakdown"><tbody>${fuRows}</tbody></table>
    `}
    <div class="section-title">Score</div>
    <div class="score-line">${cur.score.desc}</div>
    <div class="score-total">${cur.score.total} points ${limitBadge}</div>
  `;
}

function renderResults(verdicts){
  const cur = state.current;
  const box = document.getElementById('resultCard');

  let verdictHTML = '<div class="verdicts">';
  verdicts.forEach(v=>{
    verdictHTML += `<div class="verdict ${v.ok?'correct':'wrong'}">
      <div class="k">${v.label} — you said</div>
      <div class="v">${v.given}${v.ok?' ✓':' ✗'}</div>
      ${v.ok?'':`<div class="correct-answer">Correct: ${v.correct}</div>`}
    </div>`;
  });
  verdictHTML += '</div>';

  box.innerHTML = `
    ${verdictHTML}
    ${buildYakuFuScoreHTML(cur)}
    <div class="result-actions">
      <button class="next-btn" id="nextBtn">${state.replay ? 'Next mistake' : 'Deal next hand'}</button>
      <button class="mistakes-nav-btn nav-mistakes-btn" id="goToMistakesBtn">Mistakes (${state.mistakes.length})</button>
    </div>
  `;
  box.classList.add('show');
  document.getElementById('nextBtn').addEventListener('click', state.replay ? nextReplayHand : dealHand);
  document.getElementById('goToMistakesBtn').addEventListener('click', ()=> renderRoute('/review'));
  if(typeof box.scrollIntoView === 'function'){
    try{ box.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){}
  }
}

/* ---- reference overlays ---- */
const overlayBackdrop = document.getElementById('overlayBackdrop');
const overlayContent = document.getElementById('overlayContent');
function openOverlay(html){
  overlayContent.innerHTML = `<button class="overlay-close" id="overlayCloseBtn" aria-label="Close">✕</button>` + html;
  overlayBackdrop.classList.add('open');
  document.getElementById('overlayCloseBtn').addEventListener('click', closeOverlay);
}
function closeOverlay(){ overlayBackdrop.classList.remove('open'); overlayContent.innerHTML=''; }
overlayBackdrop.addEventListener('click', (e)=>{ if(e.target===overlayBackdrop) closeOverlay(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(); });

// Enter deals the next hand once the results card is showing (and no reference
// overlay is open on top of it), mirroring the existing Enter-to-submit behavior.
document.addEventListener('keydown', (e)=>{
  if(e.key!=='Enter') return;
  if(overlayBackdrop.classList.contains('open')) return;
  const box = document.getElementById('resultCard');
  if(!box || !box.classList.contains('show')) return;
  const nextBtn = document.getElementById('nextBtn');
  if(nextBtn) nextBtn.click();
});

function yakuRefHTML(){
  const rows = [
    ['1 han', [
      ['Riichi','1 han — closed hand only'],
      ['Ippatsu','1 han — win within one go-around of riichi, no calls in between'],
      ['Menzen Tsumo','1 han — self-draw win, closed hand only'],
      ['Pinfu','1 han — closed hand, all sequences, non-yakuhai pair, two-sided wait'],
      ['Tanyao','1 han — no terminals or honors anywhere in the hand'],
      ['Yakuhai','1 han per triplet of a dragon, your seat wind, or the round wind (double if both)'],
      ['Haitei Raoyue','1 han — win by drawing the very last tile in the wall'],
      ['Houtei Raoyui','1 han — win by ron on the very last discard of the hand'],
      ['Rinshan Kaihou','1 han — win by drawing the replacement tile right after declaring a kan'],
      ['Chankan','1 han — win by ron on a tile another player added to upgrade a triplet into a kan'],
    ]],
    ['2 han', [
      ['Double Riichi','2 han — riichi declared on your first discard'],
      ['Sanshoku Doujun','2 han closed / 1 han open — same sequence in all three suits'],
      ['Ittsuu','2 han closed / 1 han open — 1-9 straight in one suit (123 456 789)'],
      ['Chanta','2 han closed / 1 han open — every group + the pair includes a terminal or honor'],
      ['Toitoi','2 han — hand made entirely of triplets/quads'],
      ['Sanankou','2 han — three concealed triplets'],
      ['Honroutou','2 han — every group + the pair is a terminal or honor tile, no sequences at all'],
      ['Sankantsu','2 han — three kans, open or closed in any mix'],
      ['Chiitoitsu','2 han, fixed 25 fu — seven distinct pairs, closed hand only'],
    ]],
    ['3+ han', [
      ['Junchan','3 han closed / 2 han open — chanta shape, but terminals only, no honors'],
      ['Honitsu','3 han closed / 2 han open — one suit plus honors only'],
      ['Iipeiko','1 han, closed only — two identical sequences'],
      ['Ryanpeikou','3 han, closed only — two separate pairs of identical sequences (replaces Iipeiko x2)'],
      ['Chinitsu','6 han closed / 5 han open — one suit only, no honors at all'],
      ['Shousangen','2 han bonus — two dragon triplets plus a pair of the third dragon'],
      ['Sanshoku Doukou','2 han — the same triplet number in all three suits'],
    ]],
    ['Yakuman (score independently)', [
      ['Suuankou','Four concealed triplets'],
      ['Daisangen','All three dragon triplets'],
      ['Shousuushi','Three wind triplets plus a pair of the fourth wind'],
      ['Daisuushi','All four wind triplets (counts as a double yakuman)'],
      ['Tsuuiisou','Hand made entirely of honor tiles'],
      ['Chinroutou','Hand made entirely of terminals (1s and 9s), no honors'],
      ['Ryuuiisou','All green tiles — 2/3/4/6/8 sou and green dragon only'],
      ['Suukantsu','All four groups are kans'],
      ['Chuuren Poutou','1112345678999 in one suit, plus any matching tile of that suit to win'],
      ['Junsei Chuuren Poutou','Same shape, but the hand was already tenpai on all 9 tiles of that suit before winning (counts double)'],
      ['Kokushi Musou','One of each terminal/honor tile, plus a pair of one of them — closed hand only'],
    ]],
  ];
  let html = `<h2>Yaku reference</h2><div class="overlay-sub">Han values shown as closed / open where the two differ.</div>`;
  rows.forEach(([groupLabel, items])=>{
    html += `<table class="ref-table"><tbody><tr class="group-row"><td colspan="2">${groupLabel}</td></tr>`;
    items.forEach(([name, desc])=>{
      html += `<tr><td style="width:32%; font-weight:700;">${yakuNameHTML(name)}</td><td>${desc}</td></tr>`;
    });
    html += `</tbody></table>`;
  });
  return html;
}

function fuRefHTML(){
  let html = `<h2>Fu calculation</h2><div class="overlay-sub">Every standard hand starts at a base and adds fu for how it was completed and what it's made of. Chiitoitsu is the one exception — always a flat 25 fu.</div>`;
  html += `<table class="ref-table"><tbody>
    <tr class="group-row"><td colspan="2">Base &amp; completion</td></tr>
    <tr><td>Base</td><td class="valtext">20 fu, every standard hand</td></tr>
    <tr><td>${yakuNameHTML('Menzen Ron')}</td><td class="valtext">+10 fu — closed hand, won by ron</td></tr>
    <tr><td>${yakuNameHTML('Tsumo')}</td><td class="valtext">+2 fu — waived if the hand is Pinfu</td></tr>
    <tr class="group-row"><td colspan="2">Wait shape</td></tr>
    <tr><td>${yakuNameHTML('Ryanmen')}</td><td class="valtext">+0 fu — e.g. 34 waiting on 2 or 5</td></tr>
    <tr><td>${yakuNameHTML('Kanchan')}</td><td class="valtext">+2 fu — e.g. 4_6 waiting on 5</td></tr>
    <tr><td>${yakuNameHTML('Penchan')}</td><td class="valtext">+2 fu — e.g. 12 waiting on 3</td></tr>
    <tr><td>${yakuNameHTML('Shanpon')}</td><td class="valtext">+0 fu (see triplet note below)</td></tr>
    <tr><td>${yakuNameHTML('Tanki')}</td><td class="valtext">+2 fu</td></tr>
    <tr class="group-row"><td colspan="2">Triplets &amp; quads</td></tr>
    <tr><td>Simple tile (2–8), open triplet</td><td class="valtext">+2 fu</td></tr>
    <tr><td>Simple tile (2–8), closed triplet</td><td class="valtext">+4 fu</td></tr>
    <tr><td>Terminal/honor, open triplet</td><td class="valtext">+4 fu</td></tr>
    <tr><td>Terminal/honor, closed triplet</td><td class="valtext">+8 fu</td></tr>
    <tr><td>Quads: quadruple the matching triplet value</td><td class="valtext">+8/+16/+16/+32</td></tr>
    <tr class="group-row"><td colspan="2">Pair</td></tr>
    <tr><td>Pair of dragons</td><td class="valtext">+2 fu</td></tr>
    <tr><td>Pair of seat wind</td><td class="valtext">+2 fu</td></tr>
    <tr><td>Pair of round wind</td><td class="valtext">+2 fu</td></tr>
    <tr><td>Pair that is both seat &amp; round wind (double wind)</td><td class="valtext">+4 fu</td></tr>
  </tbody></table>`;
  html += `<div class="ref-note">
    <b>Shanpon exception:</b> if a shanpon wait is completed by ron, that particular triplet counts as <i>open</i> for fu purposes (and doesn't count toward Sanankou), even in an otherwise closed hand.<br><br>
    <b>Kuipinfu:</b> an open hand with the Pinfu shape (all sequences, no fu-earning wait, non-yakuhai pair) doesn't get to claim Pinfu itself since it's open — but it can't land at exactly 20 fu either. That specific case is bumped to 30 fu instead of the usual round-up.<br><br>
    <b>Rounding:</b> add everything up, then round up to the next 10. Pinfu + tsumo is the one fixed case: always exactly 20 fu, no rounding.
  </div>`;
  return html;
}

function fmtPts(n){ return n.toLocaleString(); }
function pointsRefHTML(){
  const fuList = [20,25,30,40,50,60,70,80,90,100,110];
  const hanList = [1,2,3,4];

  function buildTable(isDealer, label){
    let html = `<table class="points-table"><caption>${label}</caption><thead><tr><th>Fu</th>`;
    hanList.forEach(h=> html += `<th>${h} han</th>`);
    html += `</tr></thead><tbody>`;
    fuList.forEach(fu=>{
      // 20fu ron only valid for open pinfu-ish edge case, 25fu only chiitoitsu (no ron menzen +10 already baked into fu directly, tsumo still works)
      html += `<tr><td class="fu-col">${fu}</td>`;
      hanList.forEach(han=>{
        const ron = computeScore(han, fu, isDealer, 'ron', 0, state.kiriage);
        const tsumo = computeScore(han, fu, isDealer, 'tsumo', 0, state.kiriage);
        let tsumoDisplay;
        if(isDealer){
          const each = Math.ceil((tsumo.total/3)/100)*100;
          tsumoDisplay = `${fmtPts(each)} all`;
        } else {
          const base = tsumo.base;
          const ceil100 = x=>Math.ceil(x/100)*100;
          const fromDealer = ceil100(base*2);
          const fromOthers = ceil100(base*1);
          tsumoDisplay = `${fmtPts(fromDealer)}/${fmtPts(fromOthers)}`;
        }
        html += `<td><div class="pts-ron">${fmtPts(ron.total)}${ron.limitName?' *':''}</div><div class="pts-tsumo">${tsumoDisplay}</div></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  const kiriageNote = state.kiriage
    ? `Kiriage mangan is ON: 4 han 30 fu and 3 han 60 fu are rounded up to a full mangan.`
    : `Kiriage mangan is OFF: 4 han 30 fu and 3 han 60 fu score as their exact computed total (7700/7900), not a full mangan.`;
  let html = `<h2>Han + Fu → Points</h2><div class="overlay-sub">Each cell shows the ron total on top and tsumo payments below (dealer: each of 3 pay the same; non-dealer: dealer's share / each other player's share). * marks a cell capped by a scoring limit. ${kiriageNote}</div>`;
  html += `<div class="ref-scroll">${buildTable(false, 'Non-dealer')}</div>`;
  html += `<div class="ref-scroll">${buildTable(true, 'Dealer')}</div>`;

  const limitRows = [
    {name:'Mangan', range: state.kiriage ? '5 han (or 4 han 30+fu / 3 han 60+fu, kiriage mangan)' : '5 han (or 4 han 40+fu / 3 han 70+fu)', han:5},
    {name:'Haneman', range:'6–7 han', han:6},
    {name:'Baiman', range:'8–10 han', han:8},
    {name:'Sanbaiman', range:'11–12 han', han:11},
    {name:'Yakuman', range:'13+ han', han:13},
  ];
  function limitCell(han, isDealer){
    const ron = computeScore(han, 30, isDealer, 'ron', 0, state.kiriage);
    const tsumo = computeScore(han, 30, isDealer, 'tsumo', 0, state.kiriage);
    let tsumoDisplay;
    if(isDealer){
      const each = Math.ceil((tsumo.total/3)/100)*100;
      tsumoDisplay = `${fmtPts(each)} all`;
    } else {
      const base = tsumo.base;
      const ceil100 = x=>Math.ceil(x/100)*100;
      tsumoDisplay = `${fmtPts(ceil100(base*2))}/${fmtPts(ceil100(base*1))}`;
    }
    return `<div class="pts-ron">${fmtPts(ron.total)}</div><div class="pts-tsumo">${tsumoDisplay}</div>`;
  }
  html += `<table class="ref-table"><tbody><tr class="group-row"><td colspan="4">5+ han (fixed limits, fu no longer matters)</td></tr>
    <tr><th style="text-align:left; font-size:.7rem; color:var(--ink-soft);">Limit</th><th style="text-align:left; font-size:.7rem; color:var(--ink-soft);">Han</th><th style="font-size:.7rem; color:var(--ink-soft);">Non-dealer</th><th style="font-size:.7rem; color:var(--ink-soft);">Dealer</th></tr>
    ${limitRows.map(r=>`<tr><td style="font-weight:700;">${r.name}</td><td>${r.range}</td><td class="num">${limitCell(r.han,false)}</td><td class="num">${limitCell(r.han,true)}</td></tr>`).join('')}
  </tbody></table>`;
  return html;
}

function rulesHTML(){
  let html = `<h2>Rules &amp; test settings</h2><div class="overlay-sub">Configure scoring rules, which hands get dealt, and which fields you're quizzed on.</div>`;
  html += `<div class="rules-block">
    <div class="menu-title">Rules</div>
    <div class="chip-row">
      <div class="chip ${state.kiriage?'active':''}" id="chipKiriagePopup">Kiriage mangan</div>
    </div>
  </div>`;
  html += `<div class="rules-block">
    <div class="menu-title">Deal only</div>
    <div class="chip-row" id="winMethodChipsPopup" style="margin-bottom:8px;">
      <div class="chip ${state.handFilters.winMethod==='any'?'active':''}" data-val="any">Tsumo + Ron</div>
      <div class="chip ${state.handFilters.winMethod==='tsumo'?'active':''}" data-val="tsumo">Tsumo only</div>
      <div class="chip ${state.handFilters.winMethod==='ron'?'active':''}" data-val="ron">Ron only</div>
    </div>
    <div class="chip-row" id="seatChipsPopup">
      <div class="chip ${state.handFilters.seat==='any'?'active':''}" data-val="any">Dealer + Non-dealer</div>
      <div class="chip ${state.handFilters.seat==='dealer'?'active':''}" data-val="dealer">Dealer only</div>
      <div class="chip ${state.handFilters.seat==='nondealer'?'active':''}" data-val="nondealer">Non-dealer only</div>
    </div>
  </div>`;
  html += `<div class="rules-block">
    <div class="menu-title">Test me on</div>
    <div class="chip-row" id="testChipsPopup">
      <div class="chip ${state.pendingTest.han?'active':''}" data-key="han">Han</div>
      <div class="chip ${state.pendingTest.fu?'active':''}" data-key="fu">Fu</div>
      <div class="chip ${state.pendingTest.points?'active':''}" data-key="points">Points</div>
    </div>
  </div>`;
  html += `<button class="confirm-btn" id="confirmRulesBtn">Confirm</button>`;
  return html;
}

function openRulesOverlay(){
  openOverlay(rulesHTML());

  document.getElementById('chipKiriagePopup').addEventListener('click', (e)=>{
    state.kiriage = !state.kiriage;
    e.target.classList.toggle('active', state.kiriage);
    // Keep the currently displayed hand's score in sync with the new rule,
    // so answer-checking reflects whichever setting is active right now.
    if(state.current){
      const cur = state.current;
      cur.score = computeScore(cur.yakumanMult>0 ? 13 : cur.hanTotal, cur.fu, cur.isDealer, cur.hand.winMethod, cur.yakumanMult, state.kiriage);
    }
  });

  // Radio-style chip groups: only one selection active at a time per group.
  document.getElementById('winMethodChipsPopup').addEventListener('click', (e)=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    state.handFilters.winMethod = chip.dataset.val;
    e.currentTarget.querySelectorAll('.chip').forEach(c=> c.classList.toggle('active', c===chip));
  });
  document.getElementById('seatChipsPopup').addEventListener('click', (e)=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    state.handFilters.seat = chip.dataset.val;
    e.currentTarget.querySelectorAll('.chip').forEach(c=> c.classList.toggle('active', c===chip));
  });

  document.getElementById('testChipsPopup').addEventListener('click', (e)=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const key = chip.dataset.key;
    const willActivate = !chip.classList.contains('active');
    const activeCount = Object.values(state.pendingTest).filter(Boolean).length;
    if(!willActivate && activeCount<=1) return; // must keep at least one selected
    state.pendingTest[key] = willActivate;
    chip.classList.toggle('active', willActivate);
  });

  document.getElementById('confirmRulesBtn').addEventListener('click', ()=>{
    state.test = Object.assign({}, state.pendingTest);
    closeOverlay();
    // update the currently-displayed hand's answer inputs to match, without dealing a new one
    if(state.current && !state.current.answered) renderAnswerForm();
  });
}

function resetProgressConfirmHTML(){
  return `<h2>Reset progress?</h2>
    <div class="overlay-sub">This clears your correct/total streak and your entire mistake history. This can't be undone.</div>
    <div class="reset-confirm-actions">
      <button class="clear-btn" id="cancelResetBtn">Cancel</button>
      <button class="danger-btn" id="confirmResetBtn">Reset progress</button>
    </div>`;
}
function openResetProgressOverlay(){
  openOverlay(resetProgressConfirmHTML());
  document.getElementById('cancelResetBtn').addEventListener('click', closeOverlay);
  document.getElementById('confirmResetBtn').addEventListener('click', ()=>{
    resetProgress();
    document.getElementById('scoreCorrect').textContent = state.stats.correct;
    document.getElementById('scoreTotal').textContent = state.stats.total;
    updateMistakesBadge();
    closeOverlay();
  });
}
document.getElementById('resetProgressBtn').addEventListener('click', openResetProgressOverlay);

document.getElementById('btnHome').addEventListener('click', ()=>{ closeMenu(); renderRoute('/'); });
document.getElementById('btnHomeTop').addEventListener('click', ()=>{ closeMenu(); renderRoute('/'); });
document.getElementById('btnRules').addEventListener('click', ()=>{ closeMenu(); openRulesOverlay(); });
document.getElementById('btnYakuRef').addEventListener('click', ()=>{ closeMenu(); openOverlay(yakuRefHTML()); });
document.getElementById('btnFuRef').addEventListener('click', ()=>{ closeMenu(); openOverlay(fuRefHTML()); });
document.getElementById('btnPointsRef').addEventListener('click', ()=>{ closeMenu(); openOverlay(pointsRefHTML()); });

/* ---- flashcards: Japanese terms ---- */
const FLASHCARD_TERMS = [
  // Core actions / calls
  {cat:'Actions', term:'Riichi', kana:'リーチ', en:'Declaring a ready hand for 1000 points, locking your hand until you win or the round ends.'},
  {cat:'Actions', term:'Tsumo', kana:'ツモ', en:'Winning by drawing your own winning tile.'},
  {cat:'Actions', term:'Ron', kana:'ロン', en:"Winning off another player's discard."},
  {cat:'Actions', term:'Chi', kana:'チー', en:'Calling a sequence using a discard from the player to your left.'},
  {cat:'Actions', term:'Pon', kana:'ポン', en:'Calling a triplet using a discard from any player.'},
  {cat:'Actions', term:'Kan', kana:'カン', en:'Calling or forming a quad (four of the same tile).'},
  {cat:'Actions', term:'Ankan', kana:'暗槓', en:'A concealed kan, formed entirely from tiles in your own hand.'},
  {cat:'Actions', term:'Minkan', kana:'明槓', en:"An open kan, called using another player's discard."},
  {cat:'Actions', term:'Kakan', kana:'加槓', en:'Adding a fourth tile to an existing open triplet to upgrade it to a kan.'},
  {cat:'Actions', term:'Naki', kana:'鳴き', en:'Calling tiles from another player (chi/pon/kan), which opens your hand.'},

  // Hand states
  {cat:'Hand states', term:'Tenpai', kana:'聴牌', en:'One tile away from a complete winning hand.'},
  {cat:'Hand states', term:'Noten', kana:'ノーテン', en:'Not tenpai — not one tile away from winning.'},
  {cat:'Hand states', term:'Furiten', kana:'振聴', en:'Temporarily or permanently barred from winning by ron because a winning tile was already discarded or passed.'},
  {cat:'Hand states', term:'Agari', kana:'和了', en:'A completed, winning hand.'},
  {cat:'Hand states', term:'Menzen', kana:'面前', en:'A fully concealed hand — no open calls made.'},

  // Hand structure
  {cat:'Structure', term:'Mentsu', kana:'面子', en:'A completed group: a sequence, triplet, or quad.'},
  {cat:'Structure', term:'Jantou', kana:'雀頭', en:'The pair in a standard hand.'},
  {cat:'Structure', term:'Taatsu', kana:'塔子', en:'A partial group — two tiles that need one more to complete a sequence.'},
  {cat:'Structure', term:'Shuntsu', kana:'順子', en:'A sequence of three consecutive numbers in the same suit.'},
  {cat:'Structure', term:'Koutsu', kana:'刻子', en:'A triplet — three of the same tile.'},
  {cat:'Structure', term:'Kantsu', kana:'槓子', en:'A quad — four of the same tile.'},

  // Wait types
  {cat:'Waits', term:'Ryanmen', kana:'両面', en:'An open-ended two-sided wait, e.g. holding 2-3 and waiting on 1 or 4.'},
  {cat:'Waits', term:'Kanchan', kana:'嵌張', en:'A closed wait in the middle of a run, e.g. holding 4-6 and waiting on 5.'},
  {cat:'Waits', term:'Penchan', kana:'辺張', en:'An edge wait, e.g. holding 1-2 and waiting only on 3, or 8-9 waiting only on 7.'},
  {cat:'Waits', term:'Shanpon', kana:'双碰', en:'Waiting on either of two pairs to become the triplet/pair split.'},
  {cat:'Waits', term:'Tanki', kana:'単騎', en:'Waiting on a single tile to complete the pair.'},

  // Round / seat
  {cat:'Round & seat', term:'Kyoku', kana:'局', en:'A single hand/round of play within the game.'},
  {cat:'Round & seat', term:'Honba', kana:'本場', en:'A repeat counter, adding 300 points per honba to the winner\u2019s score.'},
  {cat:'Round & seat', term:'Oya', kana:'親', en:'The dealer for the current hand.'},
  {cat:'Round & seat', term:'Ko', kana:'子', en:'A non-dealer player.'},
  {cat:'Round & seat', term:'Bakaze', kana:'場風', en:"The round wind (e.g. East round), shared by all players."},
  {cat:'Round & seat', term:'Jikaze', kana:'自風', en:"A player's own seat wind."},

  // Tiles
  {cat:'Tiles', term:'Manzu', kana:'萬子', en:'The character/myriad suit of tiles (1-9m).'},
  {cat:'Tiles', term:'Pinzu', kana:'筒子', en:'The circle/dot suit of tiles (1-9p).'},
  {cat:'Tiles', term:'Souzu', kana:'索子', en:'The bamboo suit of tiles (1-9s).'},
  {cat:'Tiles', term:'Jihai', kana:'字牌', en:'Honor tiles — winds and dragons.'},
  {cat:'Tiles', term:'Yaochuuhai', kana:'幺九牌', en:'Terminal and honor tiles collectively (1s, 9s, winds, dragons).'},
  {cat:'Tiles', term:'Dora', kana:'ドラ', en:'A bonus tile indicated by the dora indicator; each copy in hand adds 1 han.'},
  {cat:'Tiles', term:'Aka Dora', kana:'赤ドラ', en:'A red 5 tile that counts as an extra dora regardless of the indicator.'},
  {cat:'Tiles', term:'Ura Dora', kana:'裏ドラ', en:'A hidden bonus indicator revealed only if you win having declared riichi.'},

  // Scoring
  {cat:'Scoring', term:'Han', kana:'翻', en:'The value unit from yaku and dora, used to determine the scoring tier.'},
  {cat:'Scoring', term:'Fu', kana:'符', en:'Points from hand composition (wait type, groups, win method) used with han to calculate the base score.'},
  {cat:'Scoring', term:'Yaku', kana:'役', en:'A scoring pattern/condition required to legally win a hand.'},
  {cat:'Scoring', term:'Yakuman', kana:'役満', en:'A hand at the highest scoring tier, worth a flat maximum score.'},
  {cat:'Scoring', term:'Mangan', kana:'満貫', en:'A scoring tier reached at 5 han (or capped fu/han combinations).'},
  {cat:'Scoring', term:'Haneman', kana:'跳満', en:'The scoring tier at 6\u20137 han, worth 1.5x mangan.'},
  {cat:'Scoring', term:'Baiman', kana:'倍満', en:'The scoring tier at 8\u201310 han, worth 2x mangan.'},
  {cat:'Scoring', term:'Sanbaiman', kana:'三倍満', en:'The scoring tier at 11\u201312 han, worth 3x mangan.'},
  {cat:'Scoring', term:'Kiriage Mangan', kana:'切り上げ満貫', en:'A house rule that rounds 4han30fu and 3han60fu up to a full mangan.'},

  // Special situations
  {cat:'Special', term:'Ippatsu', kana:'一発', en:'Winning within one go-around of declaring riichi, with no calls interrupting.'},
  {cat:'Special', term:'Haitei', kana:'海底摸月', en:'Winning by tsumo on the very last drawable tile of the round.'},
  {cat:'Special', term:'Houtei', kana:'河底撈魚', en:'Winning by ron on the very last discard of the round.'},
  {cat:'Special', term:'Rinshan', kana:'嶺上開花', en:'Winning off the replacement tile drawn immediately after a kan.'},
  {cat:'Special', term:'Chankan', kana:'搶槓', en:"Winning by ron off a tile another player tried to add to an existing triplet via kakan."},

  // End states
  {cat:'End states', term:'Ryuukyoku', kana:'流局', en:'An exhaustive draw \u2014 the round ends with no winner because the wall runs out.'},
  {cat:'End states', term:'Chombo', kana:'チョンボ', en:'A rules-violation penalty, such as a false win declaration.'},
  {cat:'End states', term:'Tobi', kana:'飛び', en:"Busting \u2014 a player's score drops below zero, sometimes ending the game immediately."},
];

const FLASHCARD_CATEGORIES = [...new Set(FLASHCARD_TERMS.map(t=>t.cat))];
state.flashcardCategories = new Set(FLASHCARD_CATEGORIES); // which categories to draw from; starts as all of them

function filteredFlashcardIndices(){
  return FLASHCARD_TERMS.map((_,i)=>i).filter(i=>state.flashcardCategories.has(FLASHCARD_TERMS[i].cat));
}

let flashcardDeck = shuffle(filteredFlashcardIndices());
let flashcardIdx = 0;
let flashcardFlipped = false;

function renderFlashcard(){
  const box = document.getElementById('flashcardBox');
  const progress = document.getElementById('flashcardProgress');
  if(!flashcardDeck.length) return;
  const term = FLASHCARD_TERMS[flashcardDeck[flashcardIdx]];
  progress.textContent = `${flashcardIdx+1} / ${flashcardDeck.length}`;
  if(!flashcardFlipped){
    box.innerHTML = `
      <div class="flashcard-category">${term.cat}</div>
      <div class="flashcard-term">${term.term}</div>
      <div class="flashcard-kana">${term.kana}</div>
      <div class="flashcard-flip-hint">Tap to reveal meaning</div>
    `;
  } else {
    box.innerHTML = `
      <div class="flashcard-category">${term.cat}</div>
      <div class="flashcard-en">${term.term} \u2014 ${term.kana}</div>
      <div class="flashcard-en-detail">${term.en}</div>
      <div class="flashcard-flip-hint">Tap to flip back</div>
    `;
  }
}
function flipFlashcard(){ flashcardFlipped = !flashcardFlipped; renderFlashcard(); }
function nextFlashcard(){
  flashcardIdx = (flashcardIdx+1) % flashcardDeck.length;
  flashcardFlipped = false;
  renderFlashcard();
}
function prevFlashcard(){
  flashcardIdx = (flashcardIdx-1+flashcardDeck.length) % flashcardDeck.length;
  flashcardFlipped = false;
  renderFlashcard();
}
function shuffleFlashcards(){
  flashcardDeck = shuffle(filteredFlashcardIndices());
  flashcardIdx = 0;
  flashcardFlipped = false;
  renderFlashcard();
}
function updateFlashcardCategoriesBadge(){
  const btn = document.getElementById('flashCategoriesBtn');
  if(btn) btn.textContent = `Categories (${state.flashcardCategories.size}/${FLASHCARD_CATEGORIES.length})`;
}
function flashcardCategoriesHTML(){
  let html = `<h2>Choose categories</h2><div class="overlay-sub">Pick which term categories to draw flashcards from.</div>`;
  html += `<div class="rules-block">
    <div class="chip-row" id="flashcardCatChips">
      ${FLASHCARD_CATEGORIES.map(c=>`<div class="chip ${state.flashcardCategories.has(c)?'active':''}" data-cat="${c}">${c}</div>`).join('')}
    </div>
  </div>`;
  html += `<button class="confirm-btn" id="confirmFlashcardCatsBtn">Confirm</button>`;
  return html;
}
function openFlashcardCategoriesOverlay(){
  openOverlay(flashcardCategoriesHTML());
  document.getElementById('flashcardCatChips').addEventListener('click', (e)=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const cat = chip.dataset.cat;
    const willActivate = !chip.classList.contains('active');
    if(!willActivate && state.flashcardCategories.size<=1) return; // keep at least one selected
    if(willActivate) state.flashcardCategories.add(cat); else state.flashcardCategories.delete(cat);
    chip.classList.toggle('active', willActivate);
  });
  document.getElementById('confirmFlashcardCatsBtn').addEventListener('click', ()=>{
    closeOverlay();
    updateFlashcardCategoriesBadge();
    flashcardDeck = shuffle(filteredFlashcardIndices());
    flashcardIdx = 0;
    flashcardFlipped = false;
    renderFlashcard();
  });
}
// The four top-level views (practice, replay, mistakes, flashcards) are
// mutually exclusive. Every function that shows one starts by hiding all of
// them, so adding a new view or editing one of these functions can't leave
// two views visible at once.
function hideAllViews(){
  document.getElementById('practiceBar').style.display = 'none';
  document.getElementById('replayBar').style.display = 'none';
  document.getElementById('handCard').style.display = 'none';
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('mistakesView').style.display = 'none';
  document.getElementById('flashcardsView').style.display = 'none';
}
function showFlashcardsView(){
  hideAllViews();
  document.getElementById('flashcardsView').style.display = 'block';
  renderFlashcard();
}
document.getElementById('btnFlashcards').addEventListener('click', ()=>{ closeMenu(); renderRoute('/flashcards'); });
document.getElementById('btnFlashcardsTop').addEventListener('click', ()=>{ closeMenu(); renderRoute('/flashcards'); });
document.getElementById('flashcardBox').addEventListener('click', flipFlashcard);
document.getElementById('flashFlipBtn').addEventListener('click', flipFlashcard);
document.getElementById('flashNextBtn').addEventListener('click', nextFlashcard);
document.getElementById('flashPrevBtn').addEventListener('click', prevFlashcard);
document.getElementById('flashCategoriesBtn').addEventListener('click', openFlashcardCategoriesOverlay);
document.getElementById('flashShuffleBtn').addEventListener('click', shuffleFlashcards);
document.getElementById('backFromFlashcardsBtn').addEventListener('click', ()=> renderRoute('/'));

/* ---- mistakes review & replay ---- */
function showMistakesView(){
  hideAllViews();
  document.getElementById('mistakesView').style.display = 'block';
  renderMistakesList();
}
function backToPractice(){
  hideAllViews();
  document.getElementById('practiceBar').style.display = 'flex';
  document.getElementById('handCard').style.display = '';
  dealHand();
}
function renderMistakesList(){
  const listEl = document.getElementById('mistakesList');
  document.getElementById('replayMistakesBtn').style.display = state.mistakes.length ? '' : 'none';
  if(!state.mistakes.length){
    listEl.innerHTML = '<p class="empty-note">No mistakes yet — nice work! Any hand you score wrong will show up here so you can come back to it.</p>';
    return;
  }
  listEl.innerHTML = state.mistakes.map(entry=>{
    const cur = {hand:entry.hand, info:entry.info, ...entry.derived};
    return `<div class="mistake-box" data-id="${entry.id}">
      <button class="mistake-delete-btn" data-id="${entry.id}" aria-label="Delete this mistake" title="Delete">✕</button>
      <div class="mistake-preview">${handTilesHTML(entry.hand)}</div>
      <div class="mistake-detail">
        <div class="context-bar">${handContextBitsHTML(entry.hand)}</div>
        ${handIndicatorHTML(entry.hand)}
        ${buildYakuFuScoreHTML(cur)}
      </div>
    </div>`;
  }).join('');
  document.querySelectorAll('.mistake-box').forEach(box=>{
    applyMultiRowFix(box);
    box.addEventListener('click', ()=> box.classList.toggle('expanded'));
  });
  document.querySelectorAll('.mistake-delete-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation(); // don't also toggle the box open/closed
      const id = btn.getAttribute('data-id');
      state.mistakes = state.mistakes.filter(m=>m.id!==id);
      saveMistakes();
      updateMistakesBadge();
      renderMistakesList();
    });
  });
}
function startReplay(){
  if(!state.mistakes.length) return;
  state.replay = {queue: shuffle(state.mistakes.map(m=>m.id))};
  hideAllViews();
  document.getElementById('replayBar').style.display = 'flex';
  document.getElementById('handCard').style.display = '';
  nextReplayHand();
}
function stopReplay(){
  state.replay = null;
  showMistakesView();
}
function nextReplayHand(){
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('resultCard').innerHTML = '';
  if(!state.replay || state.replay.queue.length===0){
    state.replay = null;
    showMistakesView();
    return;
  }
  document.getElementById('replayRemaining').textContent = state.replay.queue.length;
  const id = state.replay.queue.shift();
  const entry = state.mistakes.find(m=>m.id===id);
  if(!entry){ nextReplayHand(); return; } // shouldn't happen, but don't get stuck if it does
  state.current = {hand: entry.hand, info: entry.info, ...entry.derived, answered:false, replayId:id};
  renderHandCard();
}
document.getElementById('btnMistakes').addEventListener('click', ()=>{ closeMenu(); renderRoute('/review'); });
document.getElementById('btnMistakesTop').addEventListener('click', ()=>{ closeMenu(); renderRoute('/review'); });
document.getElementById('backToPracticeBtn').addEventListener('click', ()=> renderRoute('/'));
document.getElementById('replayMistakesBtn').addEventListener('click', startReplay);
document.getElementById('exitReplayBtn').addEventListener('click', stopReplay);
document.getElementById('titleHome').addEventListener('click', ()=> renderRoute('/'));
updateMistakesBadge();
updateFlashcardCategoriesBadge();
document.getElementById('scoreCorrect').textContent = state.stats.correct;
document.getElementById('scoreTotal').textContent = state.stats.total;

/* ---- routing: /, /flashcards, /review each map to a real URL ---- */
// Clicking the title, or landing on "/", always resets any in-progress
// replay and gets you back to a fresh hand on the main page.
function renderRoute(path, opts){
  opts = opts || {};
  if(path === '/flashcards'){
    showFlashcardsView();
  } else if(path === '/review'){
    showMistakesView();
  } else {
    path = '/';
    state.replay = null;
    backToPractice();
  }
  if(opts.pushHistory !== false && location.pathname !== path){
    history.pushState(null, '', path);
  }
  document.querySelectorAll('.nav-home-btn').forEach(btn=>{
    btn.style.display = path === '/' ? 'none' : '';
  });
}
window.addEventListener('popstate', ()=> renderRoute(location.pathname, {pushHistory:false}));

window.state = state; // exposed for debugging
// render whichever page the URL points to on load
renderRoute(location.pathname, {pushHistory:false});

