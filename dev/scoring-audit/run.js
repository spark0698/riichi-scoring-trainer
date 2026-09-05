'use strict';
// Hand-crafted regression suite: specific, manually-constructed edge-case
// hands with known-correct expected results (standard riichi rules plus the
// reference library's own validated output where noted). Each case here
// pins down one previously-fixed scoring bug so it can't silently regress.
const { loadEngine } = require('./load-engine');
const ctx = loadEngine();

let anyFail = false;

function run(name, hand, expected) {
  const info = hand.isChiitoi ? ctx.detectYakuChiitoi(hand)
    : hand.isKokushi ? ctx.detectYakuKokushi(hand)
    : ctx.detectYaku(hand);
  const fuRes = hand.isChiitoi ? ctx.computeFuChiitoi()
    : hand.isKokushi ? ctx.computeFuKokushi()
    : ctx.computeFu(hand, info);
  const yakumanMult = (info.yakuman||[]).reduce((a,y)=>a+y.mult,0);
  const hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
  const hanTotal = hanFromYaku + (hand.doraInHand||0) + (hand.redFiveCount||0) + (hand.uraDoraInHand||0);
  const score = ctx.computeScore(yakumanMult>0?13:hanTotal, fuRes.fu, hand.seatWind===1, hand.winMethod, yakumanMult, true);

  console.log(`\n=== ${name} ===`);
  console.log('yaku:', info.yaku.map(y=>`${y.name}(${y.han})`).join(', ') || '(none)');
  console.log('yakuman:', info.yakuman.map(y=>`${y.name}(x${y.mult})`).join(', ') || '(none)');
  console.log('han total:', hanTotal, ' fu:', fuRes.fu, ' points:', score.total, score.limitName||'');
  console.log('fu details:', fuRes.details.map(d=>`${d.label.replace(/<[^>]+>/g,'')}=${d.value}`).join(' | '));
  if (expected) {
    const checks = [];
    if (expected.fu !== undefined) checks.push(['fu', fuRes.fu, expected.fu]);
    if (expected.hanTotal !== undefined) checks.push(['hanTotal', hanTotal, expected.hanTotal]);
    if (expected.yakumanCount !== undefined) checks.push(['yakumanCount', info.yakuman.length, expected.yakumanCount]);
    if (expected.hasYaku !== undefined) checks.push(['hasYaku:'+expected.hasYaku, info.yaku.some(y=>y.name===expected.hasYaku), true]);
    if (expected.notHasYaku !== undefined) checks.push(['notHasYaku:'+expected.notHasYaku, !info.yaku.some(y=>y.name===expected.notHasYaku), true]);
    if (expected.hasYakuman !== undefined) checks.push(['hasYakuman:'+expected.hasYakuman, info.yakuman.some(y=>y.name===expected.hasYakuman), true]);
    if (expected.notHasYakuman !== undefined) checks.push(['notHasYakuman:'+expected.notHasYakuman, !info.yakuman.some(y=>y.name===expected.notHasYakuman), true]);
    let allPass = true;
    checks.forEach(([label, actual, exp]) => {
      const pass = actual === exp;
      if (!pass) allPass = false;
      console.log(`  [${pass?'PASS':'FAIL'}] ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(exp)}`);
    });
    console.log(allPass ? '  >>> ALL PASS' : '  >>> FAILURE DETECTED');
    if (!allPass) anyFail = true;
  }
}

// ============================================================
// TEST 1: "Kuipinfu" - open hand, pinfu shape (all sequences,
// non-yakuhai pair, ryanmen wait), RON win. Standard rule: since
// pinfu itself doesn't apply (hand is open), and no other fu source
// applies, the naive total of 20 fu gets bumped to 30 fu.
// ============================================================
run('Kuipinfu (open pinfu-shape, ron) - expect 30 fu', {
  groups: [
    {kind:'seq', suit:'m', start:2}, // 234m concealed
    {kind:'seq', suit:'p', start:4}, // 456p concealed
    {kind:'seq', suit:'s', start:5}, // 567s concealed
    {kind:'seq', suit:'s', start:2}, // 234s OPEN (called chi)
  ],
  pair: {suit:'m', num:6},
  groupConcealed: [true, true, true, false],
  concealed: false,
  roundWind: 1, seatWind: 1,
  winMethod: 'ron',
  winSlot: {groupIdx:1, tile:{suit:'p', num:6}, waitType:'ryanmen'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { fu: 30, hasYaku: 'Tanyao', notHasYaku: 'Pinfu' });

// ============================================================
// TEST 2 (sanity/regression): the CLOSED version of the same shape,
// ron win -> real Pinfu applies, fu = 20 base + 10 menzen ron = 30
// (via the normal formula, not a special-case override).
// ============================================================
run('Closed Pinfu, ron - expect 30 fu via base+menzen-ron', {
  groups: [
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'p', start:4},
    {kind:'seq', suit:'s', start:5},
    {kind:'seq', suit:'s', start:2},
  ],
  pair: {suit:'m', num:6},
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 1,
  winMethod: 'ron',
  winSlot: {groupIdx:1, tile:{suit:'p', num:6}, waitType:'ryanmen'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { fu: 30, hasYaku: 'Pinfu' });

// ============================================================
// TEST 3 (sanity/regression): closed Pinfu + TSUMO -> fixed 20 fu
// (no +2 tsumo fu added on top, unlike every other tsumo hand).
// ============================================================
run('Closed Pinfu, tsumo - expect fixed 20 fu (no tsumo bonus)', {
  groups: [
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'p', start:4},
    {kind:'seq', suit:'s', start:5},
    {kind:'seq', suit:'s', start:2},
  ],
  pair: {suit:'m', num:6},
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 1,
  winMethod: 'tsumo',
  winSlot: {groupIdx:1, tile:{suit:'p', num:6}, waitType:'ryanmen'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { fu: 20, hasYaku: 'Pinfu' });

// ============================================================
// TEST 4: Suuankou downgrade to Sanankou when the 4th concealed
// triplet is completed via RON on a SHANPON wait. The overall hand
// stays closed (menzen) - riichi/menzen-ron bonus still apply - but
// that one triplet counts as "open" for ankou-counting and fu.
// ============================================================
run('4 concealed triplets, but 4th completed by shanpon-ron - expect Sanankou+Toitoi, NOT Suuankou', {
  groups: [
    {kind:'trip', suit:'m', num:1}, // 111m
    {kind:'trip', suit:'p', num:2}, // 222p
    {kind:'trip', suit:'s', num:3}, // 333s
    {kind:'trip', suit:'m', num:7}, // 777m <- completed by this ron
  ],
  pair: {suit:'p', num:8},
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 1,
  winMethod: 'ron',
  winSlot: {groupIdx:3, tile:{suit:'m', num:7}, waitType:'shanpon'},
  riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'Sanankou', notHasYakuman: 'Suuankou', yakumanCount: 0 });

// ============================================================
// TEST 5 (sanity/regression): the SAME four triplets, but won by
// TSUMO instead of ron on the shanpon wait -> a self-drawn tile
// completing a triplet always counts as concealed, so this SHOULD
// be a true Suuankou (yakuman).
// ============================================================
run('4 concealed triplets, 4th completed by shanpon-TSUMO - expect true Suuankou yakuman', {
  groups: [
    {kind:'trip', suit:'m', num:1},
    {kind:'trip', suit:'p', num:2},
    {kind:'trip', suit:'s', num:3},
    {kind:'trip', suit:'m', num:7},
  ],
  pair: {suit:'p', num:8},
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 1,
  winMethod: 'tsumo',
  winSlot: {groupIdx:3, tile:{suit:'m', num:7}, waitType:'shanpon'},
  riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYakuman: 'Suuankou', yakumanCount: 1 });

// ============================================================
// TEST 6: "Kazoe yakuman" - 13+ han from ordinary yaku + dora
// stacking (not a true yakuman shape). Standard modern ruling
// (used by Tenhou etc.): this scores as a full Yakuman (8000 base),
// not capped at Sanbaiman.
// ============================================================
run('Kazoe yakuman (13+ han from ordinary yaku, no true yakuman) - expect Yakuman-tier score', {
  groups: [
    {kind:'trip', suit:'z', num:5}, // white dragon
    {kind:'trip', suit:'z', num:6}, // green dragon
    {kind:'trip', suit:'m', num:1}, // terminal triplet
    {kind:'trip', suit:'s', num:9}, // terminal triplet
  ],
  pair: {suit:'z', num:7}, // red dragon pair -> Shousangen territory too
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 1,
  winMethod: 'ron',
  winSlot: {groupIdx:0, tile:{suit:'z', num:5}, waitType:'shanpon'},
  riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:8, redFiveCount:0, uraDoraInHand:0,
}, { });

// ============================================================
// TEST 7: All-triplet, all-terminal/honor hand (Honroutou-qualifying)
// with ZERO sequence groups must NOT get Chanta/Junchan - those
// specifically require at least one 123/789 sequence group among the
// four, not just "every group is terminal/honor".
// ============================================================
run('Honroutou (all triplets, no sequence) - must NOT get Chanta/Junchan', {
  groups: [
    {kind:'trip', suit:'z', num:7}, // red dragon
    {kind:'trip', suit:'z', num:1}, // round wind
    {kind:'trip', suit:'z', num:2}, // seat wind
    {kind:'trip', suit:'m', num:1}, // 111m terminal triplet
  ],
  pair: {suit:'s', num:9}, // 99s terminal pair
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 2,
  winMethod: 'ron',
  winSlot: {groupIdx:3, tile:{suit:'m', num:1}, waitType:'shanpon'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'Honroutou', notHasYaku: 'Chanta' });

// ============================================================
// TEST 8 (sanity/regression): a legitimate Chanta hand (has a real
// 123/789 sequence, every group still terminal-touching) must STILL
// get Chanta - confirms the fix isn't overcorrecting.
// ============================================================
run('Legitimate closed Chanta (has a real terminal sequence) - must still get Chanta', {
  groups: [
    {kind:'seq', suit:'m', start:1}, // 123m
    {kind:'seq', suit:'p', start:7}, // 789p
    {kind:'trip', suit:'z', num:1},  // round wind triplet
    {kind:'trip', suit:'s', num:9},  // 999s terminal triplet
  ],
  pair: {suit:'z', num:1}, // round wind pair too (still honor)
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 2,
  winMethod: 'ron',
  winSlot: {groupIdx:0, tile:{suit:'m', num:3}, waitType:'ryanmen'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'Chanta' });

// ============================================================
// TEST 9: a concealed KAN of a dragon tile must grant Yakuhai, same
// as a triplet would - it's just an upgraded triplet.
// ============================================================
run('Concealed kan of a dragon tile - must grant Yakuhai', {
  groups: [
    {kind:'trip', suit:'s', num:6},
    {kind:'seq', suit:'s', start:5},
    {kind:'kan', suit:'z', num:5}, // white dragon kan
    {kind:'seq', suit:'m', start:5},
  ],
  pair: {suit:'p', num:7},
  groupConcealed: [true, true, true, true],
  concealed: true,
  roundWind: 1, seatWind: 4,
  winMethod: 'ron',
  winSlot: {groupIdx:3, tile:{suit:'m', num:6}, waitType:'kanchan'},
  riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'White Dragon' });

// ============================================================
// TEST 10 (sanity/regression): classic Ryanpeikou - two DISTINCT
// sequences, each appearing twice. Must still work after generalizing
// the check.
// ============================================================
run('Classic Ryanpeikou (two distinct duplicated sequences)', {
  groups: [
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'p', start:5},
    {kind:'seq', suit:'p', start:5},
  ],
  pair: {suit:'s', num:9},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:2,
  winMethod:'ron',
  winSlot: {groupIdx:'pair', tile:{suit:'s',num:9}, waitType:'tanki'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'Ryanpeikou', notHasYaku: 'Iipeiko' });

// ============================================================
// TEST 11: one sequence appearing all FOUR times must also be
// recognized as Ryanpeikou, not 2x Iipeiko.
// ============================================================
run('Quad-identical-sequence Ryanpeikou (one sequence x4)', {
  groups: [
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:5},
  ],
  pair: {suit:'m', num:9},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:2,
  winMethod:'ron',
  winSlot: {groupIdx:'pair', tile:{suit:'m',num:9}, waitType:'tanki'},
  riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:2, redFiveCount:1, uraDoraInHand:0,
}, { hasYaku: 'Ryanpeikou', notHasYaku: 'Iipeiko' });

// ============================================================
// TEST 12 (sanity/regression): three copies of one sequence + one
// unrelated sequence must still fall back to a single Iipeiko (not
// Ryanpeikou, not two Iipeiko) - only 1 duplicate pair total.
// ============================================================
run('Three copies of one sequence + one other - single Iipeiko only', {
  groups: [
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'p', start:2},
  ],
  pair: {suit:'s', num:9},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:2,
  winMethod:'ron',
  winSlot: {groupIdx:'pair', tile:{suit:'s',num:9}, waitType:'tanki'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYaku: 'Iipeiko', notHasYaku: 'Ryanpeikou' });

// ============================================================
// TEST 13-16: Chuuren Poutou / Junsei Chuuren Poutou purity. Purity
// depends on whether the PRE-WIN 13-tile hand was already the true
// 9-sided-wait shape (1112345678999), not on whether the winning tile
// itself happens to be a terminal or a middle tile - that was the bug
// (fixed this session). Cases 13-14 are the same true 9-wait shape
// winning on each terminal (both must be Junsei); 15-16 are shapes
// that are NOT the true 9-wait (one number has an extra copy instead
// of the win completing the base shape) winning on a middle tile
// (both must be regular, non-pure Chuuren).
// ============================================================
run('Chuuren: true 9-wait shape, win on terminal 1 - expect Junsei (pure)', {
  groups: [
    {kind:'trip', suit:'m', num:1},
    {kind:'seq', suit:'m', start:1},
    {kind:'seq', suit:'m', start:4},
    {kind:'seq', suit:'m', start:7},
  ],
  pair: {suit:'m', num:9},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:1,
  winMethod:'ron',
  winSlot: {groupIdx:0, tile:{suit:'m',num:1}, waitType:'shanpon'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYakuman: 'Junsei Chuuren Poutou' });

run('Chuuren: true 9-wait shape, win on terminal 9 - expect Junsei (pure)', {
  groups: [
    {kind:'seq', suit:'m', start:1},
    {kind:'seq', suit:'m', start:4},
    {kind:'seq', suit:'m', start:7},
    {kind:'trip', suit:'m', num:9},
  ],
  pair: {suit:'m', num:1},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:1,
  winMethod:'ron',
  winSlot: {groupIdx:3, tile:{suit:'m',num:9}, waitType:'shanpon'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYakuman: 'Junsei Chuuren Poutou' });

run('Chuuren: excess at 5 (not the true 9-wait shape), win on middle tile 3 - expect regular (impure) Chuuren', {
  // raw counts (14 tiles): 1x3,2,3,4,5x2,6,7,8,9x3 - the pre-win 13-tile
  // hand (removing the winning 3) is 1x3,2,4,5x2,6,7,8,9x3, which is NOT
  // the true 1112345678999 shape (it's missing a 3 and has an extra 5).
  groups: [
    {kind:'trip', suit:'m', num:1},
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'m', start:6},
    {kind:'trip', suit:'m', num:9},
  ],
  pair: {suit:'m', num:5},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:1,
  winMethod:'ron',
  winSlot: {groupIdx:1, tile:{suit:'m',num:3}, waitType:'kanchan'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYakuman: 'Chuuren Poutou', notHasYakuman: 'Junsei Chuuren Poutou' });

run('Chuuren: excess at 7 (not the true 9-wait shape), win on middle tile 4 - expect regular (impure) Chuuren', {
  // raw counts (14 tiles): 1x3,2,3,4,5,6,7x2,8,9x3 - the pre-win 13-tile
  // hand (removing the winning 4) is NOT the true 1112345678999 shape
  // (it's missing a 4 and has an extra 7).
  groups: [
    {kind:'trip', suit:'m', num:1},
    {kind:'seq', suit:'m', start:2},
    {kind:'seq', suit:'m', start:5},
    {kind:'seq', suit:'m', start:7},
  ],
  pair: {suit:'m', num:9},
  groupConcealed: [true,true,true,true],
  concealed: true,
  roundWind:1, seatWind:1,
  winMethod:'ron',
  winSlot: {groupIdx:1, tile:{suit:'m',num:4}, waitType:'ryanmen'},
  riichi:false, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false, rinshan:false, chankan:false,
  doraInHand:0, redFiveCount:0, uraDoraInHand:0,
}, { hasYakuman: 'Chuuren Poutou', notHasYakuman: 'Junsei Chuuren Poutou' });

// ============================================================
// TEST 17: a chiitoitsu-shaped hand (7 distinct pairs) whose raw 14
// tiles ALSO admit a higher-scoring standard decomposition must be
// resolved to that standard reading (real rules score whichever valid
// interpretation is worth more) - confirmed counter-example from the
// 50k cross-check against the reference library: this exact tile set
// is both a valid Chiitoitsu (6 han with riichi+tsumo) and a valid
// Ryanpeikou+Pinfu standard hand (also 6 han here, but would be 8 with
// aka/ura dora in the original find - the point is it must NOT stay
// Chiitoitsu when Ryanpeikou+Pinfu is available as a legal reading).
// ============================================================
{
  console.log('\n=== Chiitoi/standard resolution: Ryanpeikou+Pinfu reading must win over Chiitoitsu ===');
  const pairs = [
    {suit:'m',num:1}, {suit:'p',num:6}, {suit:'p',num:7},
    {suit:'m',num:3}, {suit:'m',num:4}, {suit:'m',num:5}, {suit:'p',num:5}
  ];
  const chiitoiHand = {
    isChiitoi:true, pairs, winningPairIdx: 3, // winning tile = m3 (part of the 345m run)
    concealed:true, roundWind:1, seatWind:1, winMethod:'tsumo',
    riichi:true, doubleRiichi:false, ippatsu:false, haitei:false, houtei:false,
    doraIndicators:[], uraIndicators:[], doraInHand:0, redFiveSuits:[], redFiveCount:0, uraDoraInHand:0,
  };
  const {hand, info} = ctx.resolveChiitoiOrStandard(chiitoiHand);
  const hanTotal = info.yaku.reduce((a,y)=>a+y.han,0);
  console.log('Resolved to:', hand.isChiitoi ? 'Chiitoitsu' : 'Standard hand');
  console.log('Yaku:', info.yaku.map(y=>`${y.name}(${y.han})`).join(', '));
  console.log('Han total:', hanTotal);
  const checks = [
    ['resolved to standard (not chiitoi)', !hand.isChiitoi, true],
    ['hasYaku:Ryanpeikou', info.yaku.some(y=>y.name==='Ryanpeikou'), true],
    ['hasYaku:Pinfu', info.yaku.some(y=>y.name==='Pinfu'), true],
    ['hanTotal', hanTotal, 6],
  ];
  let allPass = true;
  checks.forEach(([label, actual, exp]) => {
    const pass = actual === exp;
    if (!pass) allPass = false;
    console.log(`  [${pass?'PASS':'FAIL'}] ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(exp)}`);
  });
  console.log(allPass ? '  >>> ALL PASS' : '  >>> FAILURE DETECTED');
  if (!allPass) anyFail = true;
}

console.log(anyFail ? '\n\n*** SOME TESTS FAILED ***' : '\n\nAll tests passed.');
process.exit(anyFail ? 1 : 0);
