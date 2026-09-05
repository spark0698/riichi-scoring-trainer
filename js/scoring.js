'use strict';
function detectYaku(hand){
  const {groups, pair, groupConcealed, concealed, roundWind, seatWind, winMethod, winSlot, riichi, doubleRiichi, ippatsu, haitei, houtei, rinshan, chankan, doraInHand, redFiveCount, uraDoraInHand} = hand;
  const yaku=[]; // {name, han}
  const isOpen = !concealed;

  const waitType = winSlot.waitType;
  const winningGroupIsShanponTripRon = (waitType==='shanpon' && winMethod==='ron');

  // effective concealed-for-yaku flags (ankou requires NOT completed via shanpon-ron)
  // Kans count the same as triplets here — a concealed kan (ankan) is just as
  // "concealed" as an ankou for Sanankou/Suuankou purposes, and (unlike a
  // triplet) a kan is always already-complete before the win, so it can
  // never be the shanpon-ron exception group.
  function isAnkou(i){
    const g=groups[i];
    if(g.kind!=='trip' && g.kind!=='kan') return false;
    if(!groupConcealed[i]) return false;
    if(g.kind==='trip' && winSlot.groupIdx===i && winningGroupIsShanponTripRon) return false;
    return true;
  }

  let yakuman=[];

  // Riichi
  if(doubleRiichi) yaku.push({name:'Double Riichi', han:2});
  else if(riichi) yaku.push({name:'Riichi', han:1});
  if(riichi && ippatsu) yaku.push({name:'Ippatsu', han:1});

  // Menzen tsumo
  if(concealed && winMethod==='tsumo') yaku.push({name:'Menzen Tsumo', han:1});

  // Pinfu
  const allSeq = groups.every(g=>g.kind==='seq');
  const pairIsYakuhai = pair.suit==='z' && (pair.num>=5 || pair.num===roundWind || pair.num===seatWind);
  const pinfu = concealed && allSeq && !pairIsYakuhai && waitType==='ryanmen';
  if(pinfu) yaku.push({name:'Pinfu', han:1});

  // Tanyao
  const noTerminalHonor = groups.every(g=>{
    if(g.kind==='seq') return !(g.start===1 || g.start===7); // contains 1 or 9 if start1 or start7
    return !isTerminalOrHonor(g.suit,g.num);
  }) && !isTerminalOrHonor(pair.suit,pair.num);
  if(noTerminalHonor) yaku.push({name:'Tanyao', han:1});

  // Yakuhai
  groups.forEach((g)=>{
    if(g.kind==='trip' && g.suit==='z'){
      if(g.num>=5) yaku.push({name:DRAGON_NAMES[g.num], han:1});
      if(g.num===roundWind) yaku.push({name:'Round Wind ('+WIND_NAMES[roundWind]+')', han:1});
      if(g.num===seatWind) yaku.push({name:'Seat Wind ('+WIND_NAMES[seatWind]+')', han:1});
    }
  });

  // Sanshoku doujun
  const seqGroups = groups.filter(g=>g.kind==='seq');
  outer: for(const g of seqGroups){
    const hasM = seqGroups.some(x=>x.suit==='m'&&x.start===g.start);
    const hasP = seqGroups.some(x=>x.suit==='p'&&x.start===g.start);
    const hasS = seqGroups.some(x=>x.suit==='s'&&x.start===g.start);
    if(hasM&&hasP&&hasS){ yaku.push({name:'Sanshoku Doujun', han:isOpen?1:2}); break outer; }
  }

  // Sanshoku doukou: the same triplet number in all three suits
  const tripGroupsColor = groups.filter(g=>(g.kind==='trip'||g.kind==='kan') && g.suit!=='z');
  outerTrip: for(const g of tripGroupsColor){
    const hasM = tripGroupsColor.some(x=>x.suit==='m'&&x.num===g.num);
    const hasP = tripGroupsColor.some(x=>x.suit==='p'&&x.num===g.num);
    const hasS = tripGroupsColor.some(x=>x.suit==='s'&&x.num===g.num);
    if(hasM&&hasP&&hasS){ yaku.push({name:'Sanshoku Doukou', han:2}); break outerTrip; }
  }

  // Ittsuu
  for(const suit of SUITS){
    const starts = seqGroups.filter(g=>g.suit===suit).map(g=>g.start);
    if(starts.includes(1)&&starts.includes(4)&&starts.includes(7)){ yaku.push({name:'Ittsuu', han:isOpen?1:2}); break; }
  }

  // Chanta / Junchan
  const allGroupsTerminalish = groups.every(g=>{
    if(g.kind==='seq') return g.start===1||g.start===7;
    return isTerminalOrHonor(g.suit,g.num);
  }) && isTerminalOrHonor(pair.suit,pair.num);
  if(allGroupsTerminalish){
    const anyHonor = groups.some(g=> (g.kind==='trip'||g.kind==='kan') && g.suit==='z') || pair.suit==='z';
    if(anyHonor) yaku.push({name:'Chanta', han:isOpen?1:2});
    else yaku.push({name:'Junchan', han:isOpen?2:3});
  }

  // Toitoi (kans count as triplets here — a hand of all triplets/kans, no
  // sequences, is Toitoi regardless of which of the two it's made of)
  const allTrip = groups.every(g=>g.kind==='trip'||g.kind==='kan');
  if(allTrip) yaku.push({name:'Toitoi', han:2});

  // Honroutou (All Terminals and Honors): every group is a triplet/kan of a
  // terminal or honor tile — any sequence at all disqualifies it, since a
  // run always includes at least one non-terminal, non-honor number.
  const allTerminalHonorGroups = groups.every(g=> g.kind!=='seq' && isTerminalOrHonor(g.suit,g.num))
    && isTerminalOrHonor(pair.suit,pair.num);
  if(allTerminalHonorGroups) yaku.push({name:'Honroutou', han:2});

  // Sanankou / Suuankou
  const ankouCount = groups.reduce((acc,g,i)=> acc + (isAnkou(i)?1:0), 0);
  if(ankouCount>=4){ yakuman.push({name:'Suuankou', mult:1}); }
  else if(ankouCount===3){ yaku.push({name:'Sanankou', han:2}); }

  // Sankantsu / Suukantsu (Three/Four Kans)
  const kanCount = groups.filter(g=>g.kind==='kan').length;
  if(kanCount>=4){ yakuman.push({name:'Suukantsu', mult:1}); }
  else if(kanCount===3){ yaku.push({name:'Sankantsu', han:2}); }

  // Honitsu / Chinitsu
  const suitsUsed = new Set();
  groups.forEach(g=>{ if(g.suit!=='z') suitsUsed.add(g.suit); });
  if(pair.suit!=='z') suitsUsed.add(pair.suit);
  const anyHonorUsed = groups.some(g=>g.suit==='z') || pair.suit==='z';
  if(suitsUsed.size===1){
    if(anyHonorUsed) yaku.push({name:'Honitsu', han:isOpen?2:3});
    else yaku.push({name:'Chinitsu', han:isOpen?5:6});
  }

  // Iipeiko / Ryanpeikou — count identical sequences by (suit,start) key
  // rather than a raw pairwise scan, so three copies of the same sequence
  // (which can arise from the baseline random builder, not just the
  // dedicated Iipeiko builder) score as exactly one Iipeiko instead of two.
  // The specific case of two DISTINCT duplicated-sequence pairs using all
  // four groups is Ryanpeikou (3 han, closed only) — a single yaku that
  // replaces what would otherwise be two separate Iipeiko, not five han.
  if(concealed){
    const seqKeyCounts = {};
    seqGroups.forEach(g=>{
      const key = g.suit+'-'+g.start;
      seqKeyCounts[key] = (seqKeyCounts[key]||0) + 1;
    });
    const pairKeys = Object.entries(seqKeyCounts).filter(([k,c])=>c>=2);
    const allGroupsAreSeq = groups.length>0 && groups.every(g=>g.kind==='seq');
    if(allGroupsAreSeq && pairKeys.length===2 && pairKeys[0][1]===2 && pairKeys[1][1]===2){
      yaku.push({name:'Ryanpeikou', han:3});
    } else {
      pairKeys.forEach(([k,count])=>{
        const pairs = Math.floor(count/2);
        for(let k2=0;k2<pairs;k2++) yaku.push({name:'Iipeiko', han:1});
      });
    }
  }

  // Haitei / Houtei / Rinshan / Chankan
  if(haitei) yaku.push({name:'Haitei Raoyue', han:1});
  if(houtei) yaku.push({name:'Houtei Raoyui', han:1});
  if(rinshan) yaku.push({name:'Rinshan Kaihou', han:1});
  if(chankan) yaku.push({name:'Chankan', han:1});

  // Chuuren Poutou / Junsei Chuuren Poutou — checked against the raw
  // concealed tile multiset (three of a suit's 1, three of its 9, one each
  // of 2-8, plus one more of that suit to complete the win), not against
  // the specific group decomposition, since any valid grouping of this
  // shape still qualifies.
  if(concealed){
    const rawCounts = newCounts();
    groups.forEach(g=> groupTiles(g).forEach(t=> rawCounts[t.suit][t.num]++));
    rawCounts[pair.suit][pair.num]+=2;
    const required=[3,1,1,1,1,1,1,1,3];
    for(const suit of ['m','p','s']){
      let matchesBase=true;
      for(let n=1;n<=9;n++){ if(rawCounts[suit][n] < required[n-1]){ matchesBase=false; break; } }
      if(!matchesBase) continue;
      const otherSuitsEmpty = ['m','p','s','z'].filter(s2=>s2!==suit).every(s2=>{
        const maxN = s2==='z'?7:9;
        for(let n=1;n<=maxN;n++){ if(rawCounts[s2][n]>0) return false; }
        return true;
      });
      if(!otherSuitsEmpty) continue;
      let sum=0; for(let n=1;n<=9;n++) sum+=rawCounts[suit][n];
      if(sum!==14) continue;
      const winTile = winSlot.tile;
      const isPure = winTile.suit===suit && winTile.num>=2 && winTile.num<=8;
      yakuman.push({name: isPure?'Junsei Chuuren Poutou':'Chuuren Poutou', mult: isPure?2:1});
    }
  }

  // Yakuman checks
  const dragonTripCount = groups.filter(g=>(g.kind==='trip'||g.kind==='kan')&&g.suit==='z'&&g.num>=5).length;
  if(dragonTripCount===3) yakuman.push({name:'Daisangen', mult:1});
  else if(dragonTripCount===2 && pair.suit==='z' && pair.num>=5) yaku.push({name:'Shousangen', han:2});
  const windTripCount = groups.filter(g=>(g.kind==='trip'||g.kind==='kan')&&g.suit==='z'&&g.num<=4).length;
  if(windTripCount===4) yakuman.push({name:'Daisuushi', mult:2});
  else if(windTripCount===3 && pair.suit==='z' && pair.num<=4) yakuman.push({name:'Shousuushi', mult:1});
  const allHonorTiles = groups.every(g=> (g.kind==='trip'||g.kind==='kan')&&g.suit==='z') && pair.suit==='z';
  if(allHonorTiles) yakuman.push({name:'Tsuuiisou', mult:1});
  const allTerminalTiles = groups.every(g=> (g.kind==='trip'||g.kind==='kan') && g.suit!=='z' && (g.num===1||g.num===9)) && pair.suit!=='z' && (pair.num===1||pair.num===9);
  if(allTerminalTiles) yakuman.push({name:'Chinroutou', mult:1});
  // Ryuuiisou: all tiles green (2,3,4,6,8 sou, and green dragon)
  const greenTiles = new Set([2,3,4,6,8]);
  const allGreen = groups.every(g=>{
    if(g.kind==='trip'||g.kind==='kan'){
      if(g.suit==='z') return g.num===6; // green dragon
      return g.suit==='s' && greenTiles.has(g.num);
    } else {
      return g.suit==='s' && greenTiles.has(g.start) && greenTiles.has(g.start+1) && greenTiles.has(g.start+2);
    }
  }) && ((pair.suit==='s'&&greenTiles.has(pair.num)) || (pair.suit==='z'&&pair.num===6));
  if(allGreen) yakuman.push({name:'Ryuuiisou', mult:1});

  return {yaku, yakuman, pinfu, ankouCount};
}

// ===== Fu calculation =====
function computeFu(hand, yakuInfo){
  const {groups, pair, groupConcealed, concealed, roundWind, seatWind, winMethod, winSlot} = hand;
  const details=[];
  let base=20;
  details.push({label:'Base', value:20});

  const waitType = winSlot.waitType;
  const winningGroupIsShanponTripRon = (waitType==='shanpon' && winMethod==='ron');

  if(concealed && winMethod==='ron'){ base+=10; details.push({label:'Menzen Ron', value:10}); }
  const isPinfu = yakuInfo.pinfu;
  if(winMethod==='tsumo' && !isPinfu){ base+=2; details.push({label:'Tsumo', value:2}); }

  if(waitType==='kanchan'){ base+=2; details.push({label:'Kanchan', value:2}); }
  else if(waitType==='penchan'){ base+=2; details.push({label:'Penchan', value:2}); }
  else if(waitType==='tanki'){ base+=2; details.push({label:'Tanki', value:2}); }
  // ryanmen / shanpon: +0 explicit wait fu

  groups.forEach((g,i)=>{
    if(g.kind==='seq') return;
    const isKan = g.kind==='kan';
    const honorTerm = isTerminalOrHonor(g.suit,g.num);
    let isConcealedForFu = groupConcealed[i];
    let note = '';
    // A kan is always fully complete before the win (it's declared during a
    // normal turn, never as the winning action itself), so unlike a triplet
    // it can never be the shanpon-ron "counts as open" exception group.
    if(!isKan && winSlot.groupIdx===i && winningGroupIsShanponTripRon){
      isConcealedForFu = false;
      note = ' — completed by ron on shanpon wait';
    }
    let val;
    if(isKan){
      val = honorTerm ? (isConcealedForFu?32:16) : (isConcealedForFu?16:8);
    } else {
      val = honorTerm ? (isConcealedForFu?8:4) : (isConcealedForFu?4:2);
    }
    details.push({label:`${tileName(g)} ${isKan?'kan':'triplet'}<span class="yaku-en-name">${isConcealedForFu?'closed':'open'}${note}</span>`, value:val});
    base+=val;
  });

  let pairFu=0; let pairLabelParts=[];
  if(pair.suit==='z'){
    if(pair.num>=5){ pairFu+=2; pairLabelParts.push('dragon'); }
    if(pair.num===roundWind){ pairFu+=2; pairLabelParts.push('round wind'); }
    if(pair.num===seatWind){ pairFu+=2; pairLabelParts.push('seat wind'); }
  }
  if(pairFu>0){ details.push({label:`Pair of ${tileName(pair)}<span class="yaku-en-name">${pairLabelParts.join(' + ')}</span>`, value:pairFu}); base+=pairFu; }

  let fu;
  if(isPinfu && winMethod==='tsumo'){
    fu=20;
    details.push({label:'Pinfu + Tsumo override', value:'fixed at 20'});
  } else if(!concealed && base===20){
    // "Kuipinfu": an open hand with the pinfu shape (all sequences, no fu
    // from the wait, no yakuhai pair) can't score pinfu itself since it's
    // open, and with no other fu source it would sit at exactly 20 - but a
    // hand can never actually score 20 fu unless it's the closed-pinfu-tsumo
    // case above, so this gets bumped to 30 instead of the usual round-up
    // (which would leave it unchanged, since 20 is already a multiple of 10).
    fu=30;
    details.push({label:'Open hand, no other fu', value:'30 (kuipinfu)'});
  } else {
    fu = Math.ceil(base/10)*10;
    if(fu>base) details.push({label:'Round up to nearest 10', value:`${base} → ${fu}`});
  }
  return {fu, details};
}

// ===== Scoring =====
function computeScore(han, fu, isDealer, winMethod, yakumanMult, kiriage){
  if(kiriage===undefined) kiriage = true;
  let base;
  let limitName=null;
  if(yakumanMult>0){
    base = 8000*yakumanMult;
    limitName = yakumanMult>1? `${yakumanMult}x Yakuman` : 'Yakuman';
  } else {
    base = fu*Math.pow(2,2+han);
    if(han>=13){ base=8000; limitName='Yakuman'; }
    else if(han>=11){ base=6000; limitName='Sanbaiman'; }
    else if(han>=8){ base=4000; limitName='Baiman'; }
    else if(han>=6){ base=3000; limitName='Haneman'; }
    // Kiriage mangan: 4han30fu and 3han60fu both land at base=1920 (just under
    // the 2000 mangan threshold). Kiriage rounds these up to a full mangan too.
    else if((kiriage && base>=1920) || base>2000 || han>=5){ base=2000; limitName='Mangan'; }
  }
  let total, desc;
  let dealerEach=null, fromDealer=null, fromOthers=null, ronPayment=null;
  const ceil100 = x=>Math.ceil(x/100)*100;
  if(isDealer){
    if(winMethod==='tsumo'){
      const each=ceil100(base*2);
      total=each*3;
      dealerEach = each;
      desc = `Dealer tsumo: ${each} from each of 3 players`;
    } else {
      total=ceil100(base*6);
      ronPayment = total;
      desc = `Dealer ron: ${total} from discarder`;
    }
  } else {
    if(winMethod==='tsumo'){
      fromDealer=ceil100(base*2);
      fromOthers=ceil100(base*1);
      total=fromDealer+2*fromOthers;
      desc = `Non-dealer tsumo: ${fromDealer} from dealer + ${fromOthers} from each of 2 others`;
    } else {
      total=ceil100(base*4);
      ronPayment = total;
      desc = `Non-dealer ron: ${total} from discarder`;
    }
  }
  return {total, desc, limitName, base, dealerEach, fromDealer, fromOthers, ronPayment};
}

// ===== Chiitoitsu (Seven Pairs) =====
function detectYakuChiitoi(hand){
  const {pairs, roundWind, riichi, doubleRiichi, ippatsu, haitei, houtei} = hand;
  const yaku=[{name:'Chiitoitsu', han:2}];
  if(doubleRiichi) yaku.push({name:'Double Riichi', han:2});
  else if(riichi) yaku.push({name:'Riichi', han:1});
  if(riichi && ippatsu) yaku.push({name:'Ippatsu', han:1});
  if(hand.winMethod==='tsumo') yaku.push({name:'Menzen Tsumo', han:1});
  const noTerminalHonor = pairs.every(p=>!isTerminalOrHonor(p.suit,p.num));
  if(noTerminalHonor) yaku.push({name:'Tanyao', han:1});
  const suitsUsed = new Set(pairs.filter(p=>p.suit!=='z').map(p=>p.suit));
  const anyHonor = pairs.some(p=>p.suit==='z');
  if(suitsUsed.size===1){
    if(anyHonor) yaku.push({name:'Honitsu', han:3});
    else yaku.push({name:'Chinitsu', han:6});
  }
  const allTerminalHonor = pairs.every(p=>isTerminalOrHonor(p.suit,p.num));
  if(allTerminalHonor) yaku.push({name:'Honroutou', han:2});
  if(haitei) yaku.push({name:'Haitei Raoyue', han:1});
  if(houtei) yaku.push({name:'Houtei Raoyui', han:1});
  return {yaku, yakuman:[], pinfu:false};
}
function computeFuChiitoi(){
  return {fu:25, details:[{label:'Chiitoitsu', value:25}]};
}

// ===== Kokushi Musou (Thirteen Orphans) =====
function detectYakuKokushi(hand){
  const {riichi, doubleRiichi, ippatsu, haitei, houtei} = hand;
  const yaku=[];
  if(doubleRiichi) yaku.push({name:'Double Riichi', han:2});
  else if(riichi) yaku.push({name:'Riichi', han:1});
  if(riichi && ippatsu) yaku.push({name:'Ippatsu', han:1});
  if(hand.winMethod==='tsumo') yaku.push({name:'Menzen Tsumo', han:1});
  if(haitei) yaku.push({name:'Haitei Raoyue', han:1});
  if(houtei) yaku.push({name:'Houtei Raoyui', han:1});
  return {yaku, yakuman:[{name:'Kokushi Musou', mult:1}], pinfu:false};
}
function computeFuKokushi(){
  return {fu:0, details:[{label:'Kokushi Musou', value:'doesn\'t apply'}]};
}

// ===== Best-decomposition search =====
// The same 14 tiles can sometimes be validly split into groups more than one
// way (the classic case: 444555666m reads as three triplets OR as three
// identical sequences). Real rules always score whichever valid reading is
// worth the most points. buildHand() only ever produces ONE fixed reading,
// so after building a standard (non-Chiitoi, non-Kokushi) hand we re-derive
// every valid way to group its CONCEALED tiles (open melds are fixed/called
// and can't be reinterpreted), re-score each one, and keep the best.

