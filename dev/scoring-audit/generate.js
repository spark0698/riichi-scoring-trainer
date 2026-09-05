'use strict';
// Generates N random hands via the app's own generateValidHand(), scores
// each with our engine exactly as the UI would, and writes one JSON record
// per line - enough detail (raw groups/pairs/tiles, all scoring-relevant
// flags, our computed result) for compare.py to independently re-derive and
// cross-check the same hand against the reference library, with no need to
// go back to the generator.
const fs = require('fs');
const path = require('path');
const { loadEngine } = require('./load-engine');
const ctx = loadEngine();

const N = parseInt(process.argv[2] || '5000', 10);
const outPath = process.argv[3] || path.join(__dirname, '.data', 'hands.jsonl');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const out = fs.createWriteStream(outPath);

function computeOur(hand, info) {
  const fuRes = hand.isChiitoi ? ctx.computeFuChiitoi()
    : hand.isKokushi ? ctx.computeFuKokushi()
    : ctx.computeFu(hand, info);
  const yakumanMult = (info.yakuman||[]).reduce((a,y)=>a+y.mult,0);
  const hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
  const hanTotal = hanFromYaku + (hand.doraInHand||0) + (hand.redFiveCount||0) + (hand.uraDoraInHand||0);
  const isDealer = hand.seatWind === 1;
  const score = ctx.computeScore(yakumanMult>0?13:hanTotal, fuRes.fu, isDealer, hand.winMethod, yakumanMult, true);
  return { han: hanTotal, fu: fuRes.fu, points: score.total, limitName: score.limitName,
    yaku: info.yaku.map(y=>y.name), yakuman: (info.yakuman||[]).map(y=>y.name) };
}

let written = 0, attempts = 0;
const maxAttempts = N * 3;
while (written < N && attempts < maxAttempts) {
  attempts++;
  let hand, info;
  try {
    const r = ctx.generateValidHand();
    hand = r.hand; info = r.info;
  } catch (e) { continue; }
  let record;
  try {
    const our = computeOur(hand, info);
    if (hand.isChiitoi) {
      record = { type: 'chiitoi', pairs: hand.pairs, roundWind: hand.roundWind, seatWind: hand.seatWind,
        winMethod: hand.winMethod, riichi: hand.riichi, doubleRiichi: hand.doubleRiichi, ippatsu: hand.ippatsu,
        haitei: hand.haitei, houtei: hand.houtei, doraIndicators: hand.doraIndicators||[], uraIndicators: hand.uraIndicators||[],
        redFiveSuits: hand.redFiveSuits||[], our };
    } else if (hand.isKokushi) {
      record = { type: 'kokushi', tiles: hand.tiles, pairIdx: hand.pairIdx, roundWind: hand.roundWind, seatWind: hand.seatWind,
        winMethod: hand.winMethod, riichi: hand.riichi, doubleRiichi: hand.doubleRiichi, ippatsu: hand.ippatsu,
        haitei: hand.haitei, houtei: hand.houtei, our };
    } else {
      record = { type: 'standard', groups: hand.groups, pair: hand.pair, groupConcealed: hand.groupConcealed,
        concealed: hand.concealed, roundWind: hand.roundWind, seatWind: hand.seatWind, winMethod: hand.winMethod,
        winSlot: hand.winSlot, riichi: hand.riichi, doubleRiichi: hand.doubleRiichi, ippatsu: hand.ippatsu,
        haitei: hand.haitei, houtei: hand.houtei, rinshan: hand.rinshan, chankan: hand.chankan,
        doraIndicators: hand.doraIndicators||[], uraIndicators: hand.uraIndicators||[], redFiveSuits: hand.redFiveSuits||[],
        our };
    }
  } catch (e) {
    continue;
  }
  out.write(JSON.stringify(record) + '\n');
  written++;
}
out.end(() => {
  console.log(`wrote ${written} hands (${attempts} attempts) to ${outPath}`);
});
