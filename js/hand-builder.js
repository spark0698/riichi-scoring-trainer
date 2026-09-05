'use strict';
function tryBuildGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<15 && !placed; attempt++){
      const useSeq = Math.random() < 0.78;
      if(useSeq){
        const suit = choice(SUITS);
        const start = randInt(1,7);
        if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
          addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
          groups.push({kind:'seq', suit, start});
          placed=true;
        }
      } else {
        const useHonor = Math.random() < 0.22;
        const suit = useHonor ? 'z' : choice(SUITS);
        const num = useHonor ? randInt(1,7) : randInt(1,9);
        // Most triplet picks stay triplets, but every so often make it a
        // kan instead — kans shouldn't only ever show up via the dedicated
        // Rinshan/Sankantsu/Suukantsu/Chuuren themes, or a person just
        // dealing hands normally would almost never see one.
        const useKan = Math.random() < 0.12;
        const qty = useKan ? 4 : 3;
        if(canAdd(counts,suit,num,qty)){
          addCount(counts,suit,num,qty);
          groups.push({kind: useKan?'kan':'trip', suit, num});
          placed=true;
        }
      }
    }
    if(!placed) return null;
  }
  // pair
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const useHonor = Math.random()<0.18;
    const suit = useHonor ? 'z' : choice(SUITS);
    const num = useHonor ? randInt(1,7) : randInt(1,9);
    if(canAdd(counts,suit,num,2)){
      addCount(counts,suit,num,2);
      pair = {suit,num};
    }
  }
  if(!pair) return null;
  return {groups, pair};
}

function groupTiles(g){
  if(g.kind==='seq') return [{suit:g.suit,num:g.start},{suit:g.suit,num:g.start+1},{suit:g.suit,num:g.start+2}];
  if(g.kind==='kan') return [{suit:g.suit,num:g.num},{suit:g.suit,num:g.num},{suit:g.suit,num:g.num},{suit:g.suit,num:g.num}];
  return [{suit:g.suit,num:g.num},{suit:g.suit,num:g.num},{suit:g.suit,num:g.num}];
}

function isTerminalOrHonor(suit,num){ return suit==='z' || num===1 || num===9; }

// Fill in `need` more groups using the normal unrestricted random logic
// (shared by the themed builders below once their signature shape is placed).
function fillRandomGroups(counts, groups, need, excludeSeq){
  for(let i=0;i<need;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useSeq = Math.random() < 0.78;
      if(useSeq){
        const suit = choice(SUITS);
        const start = randInt(1,7);
        // Don't let a "filler" pick accidentally recreate a sequence that's
        // already guaranteed elsewhere (e.g. the Iipeiko builder's forced
        // pair) — a third copy would misleadingly look like it could also
        // be scored as three triplets (the classic 444555666m ambiguity),
        // and (separately) three identical sequences is not a real second
        // Iipeiko, just one Iipeiko plus a leftover single copy.
        if(excludeSeq && suit===excludeSeq.suit && start===excludeSeq.start) continue;
        if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
          addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
          groups.push({kind:'seq', suit, start});
          placed=true;
        }
      } else {
        const useHonor = Math.random() < 0.22;
        const suit = useHonor ? 'z' : choice(SUITS);
        const num = useHonor ? randInt(1,7) : randInt(1,9);
        // Most triplet picks stay triplets, but every so often make it a
        // kan instead, same as the baseline builder above — this is the
        // "filler" path shared by most themed builders (tanyao, honitsu,
        // chanta, etc.), so this is what lets kans show up across almost
        // any hand type, not just the dedicated kan-yaku themes.
        const useKan = Math.random() < 0.12;
        const qty = useKan ? 4 : 3;
        if(canAdd(counts,suit,num,qty)){
          addCount(counts,suit,num,qty);
          groups.push({kind: useKan?'kan':'trip', suit, num});
          placed=true;
        }
      }
    }
    if(!placed) return false;
  }
  return true;
}
function fillRandomPair(counts){
  for(let attempt=0; attempt<30; attempt++){
    const useHonor = Math.random()<0.18;
    const suit = useHonor ? 'z' : choice(SUITS);
    const num = useHonor ? randInt(1,7) : randInt(1,9);
    if(canAdd(counts,suit,num,2)){
      addCount(counts,suit,num,2);
      return {suit,num};
    }
  }
  return null;
}

// Guarantees a Chanta/Junchan-eligible shape: every group + the pair is a
// terminal-inclusive sequence (123/789) or a terminal/honor triplet.
function tryBuildChantaGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useSeq = Math.random() < 0.5;
      if(useSeq){
        const suit = choice(SUITS);
        const start = choice([1,7]);
        if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
          addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
          groups.push({kind:'seq', suit, start});
          placed=true;
        }
      } else {
        const useHonor = Math.random() < 0.45;
        const suit = useHonor ? 'z' : choice(SUITS);
        const num = useHonor ? randInt(1,7) : choice([1,9]);
        if(canAdd(counts,suit,num,3)){
          addCount(counts,suit,num,3);
          groups.push({kind:'trip', suit, num});
          placed=true;
        }
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const useHonor = Math.random()<0.15;
    const suit = useHonor ? 'z' : choice(SUITS);
    const num = useHonor ? randInt(1,7) : choice([1,9]);
    if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Honroutou: every group and the pair is a triplet of a terminal
// (1 or 9) or honor tile — no sequences at all (a sequence always includes
// at least one non-terminal, non-honor number, so this rules them out
// entirely). This is a superset condition of Toitoi (all triplets), which
// naturally also applies to these hands, matching real rules.
function tryBuildHonroutouGroups(){
  const counts = newCounts();
  const groups = [];
  function terminalOrHonorTile(){
    if(Math.random()<0.4) return {suit:'z', num:randInt(1,7)};
    return {suit:choice(SUITS), num:choice([1,9])};
  }
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const {suit,num} = terminalOrHonorTile();
      if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const {suit,num} = terminalOrHonorTile();
    if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees an Ittsuu-eligible shape: 123/456/789 all in one suit, plus one
// more (normal, random) group and a pair.
function tryBuildIttsuuGroups(){
  const counts = newCounts();
  const groups = [];
  const suit = choice(SUITS);
  for(const start of [1,4,7]){
    addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
    groups.push({kind:'seq', suit, start});
  }
  if(!fillRandomGroups(counts, groups, 1)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a Sanshoku Doujun-eligible shape: the same sequence run in all
// three suits, plus one more (normal, random) group and a pair.
function tryBuildSanshokuGroups(){
  const counts = newCounts();
  const groups = [];
  const start = randInt(1,7);
  for(const suit of SUITS){
    addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
    groups.push({kind:'seq', suit, start});
  }
  if(!fillRandomGroups(counts, groups, 1)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a Sanshoku Doukou-eligible shape: the same triplet number in all
// three suits, plus one more (normal, random) group and a pair.
function tryBuildSanshokuDoukouGroups(){
  const counts = newCounts();
  const groups = [];
  const num = randInt(1,9);
  for(const suit of SUITS){
    if(!canAdd(counts,suit,num,3)) return null;
    addCount(counts,suit,num,3);
    groups.push({kind:'trip', suit, num});
  }
  if(!fillRandomGroups(counts, groups, 1)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a Shousangen-eligible shape: two dragon triplets plus a pair of
// the third dragon, and two more (normal, random) groups.
function tryBuildShousangenGroups(){
  const counts = newCounts();
  const groups = [];
  const dragons = shuffle([5,6,7]);
  const [tripA, tripB, pairNum] = dragons;
  addCount(counts,'z',tripA,3); groups.push({kind:'trip', suit:'z', num:tripA});
  addCount(counts,'z',tripB,3); groups.push({kind:'trip', suit:'z', num:tripB});
  // Reserve the third dragon's pair before filling the remaining groups —
  // otherwise the random filler could independently claim a third triplet
  // of that same dragon (nothing yet marks it as spoken for), and the
  // unconditional addCount below would then push it to 5 physical copies.
  addCount(counts,'z',pairNum,2);
  if(!fillRandomGroups(counts, groups, 2)) return null;
  const pair = {suit:'z', num:pairNum};
  return {groups, pair};
}

// Guarantees Toitoi: all four groups are triplets.
function tryBuildToitoiGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useHonor = Math.random()<0.15;
      const suit = useHonor ? 'z' : choice(SUITS);
      const num = useHonor ? randInt(1,7) : randInt(1,9);
      if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Tanyao: every group and the pair stay within 2-8, so no
// terminal or honor tile can appear anywhere in the hand.
function tryBuildTanyaoGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useSeq = Math.random()<0.82;
      const suit = choice(SUITS);
      if(useSeq){
        const start = randInt(2,6); // 2..6 so start+2 maxes at 8
        const isDupe = groups.some(g=>g.kind==='seq' && g.suit===suit && g.start===start);
        if(isDupe && Math.random()>0.12) continue; // avoid accidentally over-producing Iipeiko
        if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
          addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
          groups.push({kind:'seq',suit,start}); placed=true;
        }
      } else {
        const num = randInt(2,8);
        if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const suit = choice(SUITS);
    const num = randInt(2,8);
    if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Honitsu: one suit plus honors only, with at least one honor group/pair.
function tryBuildHonitsuGroups(){
  const counts = newCounts();
  const groups = [];
  const suit = choice(SUITS);
  let honorUsed = false;
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const forceHonor = (i===3 && !honorUsed);
      const useHonor = forceHonor || Math.random()<0.18;
      if(useHonor){
        const num = randInt(1,7);
        if(canAdd(counts,'z',num,3)){ addCount(counts,'z',num,3); groups.push({kind:'trip',suit:'z',num}); placed=true; honorUsed=true; }
      } else {
        const useSeq = Math.random()<0.8;
        if(useSeq){
          const start = randInt(1,7);
          const isDupe = groups.some(g=>g.kind==='seq' && g.suit===suit && g.start===start);
          if(isDupe && Math.random()>0.12) continue;
          if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
            addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
            groups.push({kind:'seq',suit,start}); placed=true;
          }
        } else {
          const num = randInt(1,9);
          if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
        }
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const useHonor = Math.random()<0.3;
    if(useHonor){
      const num = randInt(1,7);
      if(canAdd(counts,'z',num,2)){ addCount(counts,'z',num,2); pair={suit:'z',num}; }
    } else {
      const num = randInt(1,9);
      if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
    }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Chinitsu: one suit only, no honors anywhere.
function tryBuildChinitsuGroups(){
  const counts = newCounts();
  const groups = [];
  const suit = choice(SUITS);
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useSeq = Math.random()<0.6;
      if(useSeq){
        const start = randInt(1,7);
        if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
          addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
          groups.push({kind:'seq',suit,start}); placed=true;
        }
      } else {
        const num = randInt(1,9);
        if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const num = randInt(1,9);
    if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Iipeiko: two identical sequences (closed hand only — enforced by caller).
function tryBuildIipeikoGroups(){
  const counts = newCounts();
  const groups = [];
  const suit = choice(SUITS);
  const start = randInt(1,7);
  if(!canAdd(counts,suit,start,2)||!canAdd(counts,suit,start+1,2)||!canAdd(counts,suit,start+2,2)) return null;
  addCount(counts,suit,start,2); addCount(counts,suit,start+1,2); addCount(counts,suit,start+2,2);
  groups.push({kind:'seq',suit,start});
  groups.push({kind:'seq',suit,start});
  if(!fillRandomGroups(counts, groups, 2, {suit, start})) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Sanankou: three concealed triplets (closed hand only — enforced by caller).
function tryBuildSanankouGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<3;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useHonor = Math.random()<0.15;
      const suit = useHonor ? 'z' : choice(SUITS);
      const num = useHonor ? randInt(1,7) : randInt(1,9);
      if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  // Filler group is always a sequence — never a triplet — so this can never
  // silently become a 4th concealed triplet (i.e. Suuankou) by accident.
  let placedSeq=false;
  for(let attempt=0; attempt<20 && !placedSeq; attempt++){
    const suit = choice(SUITS);
    const start = randInt(1,7);
    if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
      addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
      groups.push({kind:'seq',suit,start}); placedSeq=true;
    }
  }
  if(!placedSeq) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Suuankou: four concealed triplets (closed hand only — enforced by caller).
function tryBuildSuuankouGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useHonor = Math.random()<0.15;
      const suit = useHonor ? 'z' : choice(SUITS);
      const num = useHonor ? randInt(1,7) : randInt(1,9);
      if(canAdd(counts,suit,num,3)){ addCount(counts,suit,num,3); groups.push({kind:'trip',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Sankantsu: three kans (any open/closed mix — the yaku doesn't
// care) plus one filler group and a pair. The filler is always a sequence,
// so this can never silently become a 4th kan (Suukantsu) by accident.
function tryBuildSankantsuGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<3;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useHonor = Math.random()<0.15;
      const suit = useHonor ? 'z' : choice(SUITS);
      const num = useHonor ? randInt(1,7) : randInt(1,9);
      if(canAdd(counts,suit,num,4)){ addCount(counts,suit,num,4); groups.push({kind:'kan',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  let placedSeq=false;
  for(let attempt=0; attempt<20 && !placedSeq; attempt++){
    const suit = choice(SUITS);
    const start = randInt(1,7);
    if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
      addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
      groups.push({kind:'seq',suit,start}); placedSeq=true;
    }
  }
  if(!placedSeq) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Suukantsu: four kans + a pair.
function tryBuildSuukantsuGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const useHonor = Math.random()<0.15;
      const suit = useHonor ? 'z' : choice(SUITS);
      const num = useHonor ? randInt(1,7) : randInt(1,9);
      if(canAdd(counts,suit,num,4)){ addCount(counts,suit,num,4); groups.push({kind:'kan',suit,num}); placed=true; }
    }
    if(!placed) return null;
  }
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a hand containing at least one kan (open or closed — either
// can trigger Rinshan Kaihou, winning via tsumo on the replacement tile
// drawn immediately after declaring it). buildHand() forces winMethod to
// 'tsumo' and sets hand.rinshan=true whenever this theme is chosen.
function tryBuildRinshanGroups(){
  const counts = newCounts();
  const groups = [];
  let placed=false;
  for(let attempt=0; attempt<20 && !placed; attempt++){
    const useHonor = Math.random()<0.15;
    const suit = useHonor ? 'z' : choice(SUITS);
    const num = useHonor ? randInt(1,7) : randInt(1,9);
    if(canAdd(counts,suit,num,4)){ addCount(counts,suit,num,4); groups.push({kind:'kan',suit,num}); placed=true; }
  }
  if(!placed) return null;
  if(!fillRandomGroups(counts, groups, 3)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Chuuren Poutou / Junsei Chuuren Poutou: the fixed 13-tile shape
// 1112345678999 in one suit (closed hand only — enforced by caller), plus
// one more tile of that suit to complete the win. Reuses the general
// decomposition search purely to find ONE valid grouping for rendering/fu
// purposes — detectYaku() recognizes the yaku directly from the raw tile
// counts, independent of which particular grouping gets picked here.
// `forcedWinTile` tells buildHand() which tile completed the hand, since it
// can't be inferred from a normal wait-slot scan (this shape has a 9-tile
// wait, not a 1-3 tile one).
function tryBuildChuurenGroups(){
  const suit = choice(SUITS);
  const counts = newCounts();
  counts[suit][1]=3; counts[suit][9]=3;
  for(let n=2;n<=8;n++) counts[suit][n]=1;
  const extra = randInt(1,9);
  counts[suit][extra]+=1;
  const tiles=[];
  for(let n=1;n<=9;n++) for(let k=0;k<counts[suit][n];k++) tiles.push({suit,num:n});
  const decomps = decomposeStandardHand(tiles, 4);
  if(!decomps.length) return null;
  const {groups, pair} = choice(decomps);
  return {groups, pair, forcedWinTile:{suit,num:extra}};
}

// Guarantees Daisangen: all three dragon triplets.
function tryBuildDaisangenGroups(){
  const counts = newCounts();
  const groups = [];
  for(const num of [5,6,7]){
    addCount(counts,'z',num,3);
    groups.push({kind:'trip', suit:'z', num});
  }
  if(!fillRandomGroups(counts, groups, 1)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Tsuuiisou: hand made entirely of honor tiles.
function tryBuildTsuuiisouGroups(){
  const counts = newCounts();
  const groups = [];
  const honors = shuffle([1,2,3,4,5,6,7]).slice(0,5);
  for(let i=0;i<4;i++){
    addCount(counts,'z',honors[i],3);
    groups.push({kind:'trip', suit:'z', num:honors[i]});
  }
  addCount(counts,'z',honors[4],2);
  return {groups, pair:{suit:'z', num:honors[4]}};
}

// Guarantees Chinroutou: hand made entirely of terminals (1s and 9s), no honors.
function tryBuildChinroutouGroups(){
  const counts = newCounts();
  const groups = [];
  const terminals = shuffle([{suit:'m',num:1},{suit:'m',num:9},{suit:'p',num:1},{suit:'p',num:9},{suit:'s',num:1},{suit:'s',num:9}]).slice(0,5);
  for(let i=0;i<4;i++){
    addCount(counts,terminals[i].suit,terminals[i].num,3);
    groups.push({kind:'trip', suit:terminals[i].suit, num:terminals[i].num});
  }
  addCount(counts,terminals[4].suit,terminals[4].num,2);
  return {groups, pair:{suit:terminals[4].suit, num:terminals[4].num}};
}

// Guarantees Shousuushi: three wind triplets plus a pair of the fourth wind.
function tryBuildShousuushiGroups(){
  const counts = newCounts();
  const groups = [];
  const winds = shuffle([1,2,3,4]);
  const [w1,w2,w3,pairWind] = winds;
  addCount(counts,'z',w1,3); groups.push({kind:'trip', suit:'z', num:w1});
  addCount(counts,'z',w2,3); groups.push({kind:'trip', suit:'z', num:w2});
  addCount(counts,'z',w3,3); groups.push({kind:'trip', suit:'z', num:w3});
  // Reserve the fourth wind's pair before filling the last group — same
  // reasoning as Shousangen above: otherwise the random filler could claim
  // a third triplet of that wind before the pair reservation runs.
  addCount(counts,'z',pairWind,2);
  if(!fillRandomGroups(counts, groups, 1)) return null;
  return {groups, pair:{suit:'z', num:pairWind}};
}

// Guarantees Daisuushi: all four wind triplets.
function tryBuildDaisuushiGroups(){
  const counts = newCounts();
  const groups = [];
  for(const w of [1,2,3,4]){
    addCount(counts,'z',w,3);
    groups.push({kind:'trip', suit:'z', num:w});
  }
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees Ryuuiisou: all green tiles (2/3/4/6/8 sou, and green dragon only).
function tryBuildRyuuiisouGroups(){
  const counts = newCounts();
  const groups = [];
  const greenNums = [2,3,4,6,8];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const opt = Math.random();
      if(opt<0.3){
        const start = choice([2,6]);
        if(canAdd(counts,'s',start,1)&&canAdd(counts,'s',start+1,1)&&canAdd(counts,'s',start+2,1)){
          addCount(counts,'s',start,1); addCount(counts,'s',start+1,1); addCount(counts,'s',start+2,1);
          groups.push({kind:'seq', suit:'s', start}); placed=true;
        }
      } else if(opt<0.85){
        const num = choice(greenNums);
        if(canAdd(counts,'s',num,3)){ addCount(counts,'s',num,3); groups.push({kind:'trip', suit:'s', num}); placed=true; }
      } else {
        if(canAdd(counts,'z',6,3)){ addCount(counts,'z',6,3); groups.push({kind:'trip', suit:'z', num:6}); placed=true; }
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const useGreenDragon = Math.random()<0.2;
    if(useGreenDragon){
      if(canAdd(counts,'z',6,2)){ addCount(counts,'z',6,2); pair={suit:'z',num:6}; }
    } else {
      const num = choice(greenNums);
      if(canAdd(counts,'s',num,2)){ addCount(counts,'s',num,2); pair={suit:'s',num}; }
    }
  }
  if(!pair) return null;
  return {groups, pair};
}

function isHonor(suit){ return suit==='z'; }

// Guarantees a Pinfu-eligible shape: four sequences, pair forced to a suited
// (non-honor) tile so it can never accidentally be a yakuhai pair. The
// ryanmen-wait requirement is handled by buildHand, which biases the winning
// slot toward a ryanmen wait when this theme is active.
function tryBuildPinfuGroups(){
  const counts = newCounts();
  const groups = [];
  for(let i=0;i<4;i++){
    let placed=false;
    for(let attempt=0; attempt<20 && !placed; attempt++){
      const suit = choice(SUITS);
      const start = randInt(1,7);
      const isDupe = groups.some(g=>g.suit===suit && g.start===start);
      if(isDupe && Math.random()>0.12) continue; // avoid accidentally over-producing Iipeiko
      if(canAdd(counts,suit,start,1)&&canAdd(counts,suit,start+1,1)&&canAdd(counts,suit,start+2,1)){
        addCount(counts,suit,start,1); addCount(counts,suit,start+1,1); addCount(counts,suit,start+2,1);
        groups.push({kind:'seq', suit, start});
        placed=true;
      }
    }
    if(!placed) return null;
  }
  let pair=null;
  for(let attempt=0; attempt<30 && !pair; attempt++){
    const suit = choice(SUITS);
    const num = randInt(1,9);
    if(canAdd(counts,suit,num,2)){ addCount(counts,suit,num,2); pair={suit,num}; }
  }
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a dragon Yakuhai: one dragon triplet plus three random sequences and a pair.
function tryBuildYakuhaiDragonGroups(){
  const counts = newCounts();
  const groups = [];
  const dragonNum = randInt(5,7);
  addCount(counts,'z',dragonNum,3);
  groups.push({kind:'trip', suit:'z', num:dragonNum});
  if(!fillRandomGroups(counts, groups, 3)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// Guarantees a wind Yakuhai for a specific wind number (seat or round wind,
// supplied by the caller once that value is known).
function tryBuildYakuhaiWindGroups(windNum){
  const counts = newCounts();
  const groups = [];
  addCount(counts,'z',windNum,3);
  groups.push({kind:'trip', suit:'z', num:windNum});
  if(!fillRandomGroups(counts, groups, 3)) return null;
  const pair = fillRandomPair(counts);
  if(!pair) return null;
  return {groups, pair};
}

// ===== Dora helpers =====
function randomFullTile(){
  const suit = choice(['m','p','s','z']);
  const num = suit==='z' ? randInt(1,7) : randInt(1,9);
  return {suit, num};
}
function tileCounts(tiles){
  const counts = newCounts();
  tiles.forEach(t=> addCount(counts, t.suit, t.num, 1));
  return counts;
}
// Every physical tile exists in exactly 4 copies — including a red five,
// which is still just one of that suit's four 5's, not a 5th tile. `counts`
// tracks every tile already committed to this deal (the hand itself, plus
// any indicator already picked this call or by an earlier one — kan dora
// and kan ura dora indicators draw from the same finite dead wall as the
// first dora indicator, so they all have to share one running tally, not
// each be checked only against the hand). Picking an indicator mutates
// `counts` so the next pick sees it as spoken for.
function pickIndicatorTile(counts){
  for(let attempt=0; attempt<50; attempt++){
    const t = randomFullTile();
    if(canAdd(counts, t.suit, t.num, 1)){ addCount(counts, t.suit, t.num, 1); return t; }
  }
  // Fallback: scan for any tile type with room left. Guarantees termination
  // — a 14-tile hand plus a handful of indicators can't plausibly max out
  // all 34 tile types at once.
  for(const suit of ['m','p','s','z']){
    const maxN = suit==='z' ? 7 : 9;
    for(let n=1;n<=maxN;n++){ if(canAdd(counts, suit, n, 1)){ addCount(counts, suit, n, 1); return {suit,num:n}; } }
  }
  return randomFullTile(); // unreachable in practice
}
function doraTileFromIndicator(t){
  if(t.suit==='z'){
    if(t.num<=4) return {suit:'z', num: t.num===4?1:t.num+1}; // winds cycle E S W N
    return {suit:'z', num: t.num===7?5:t.num+1}; // dragons cycle White Green Red
  }
  return {suit:t.suit, num: t.num===9?1:t.num+1};
}
// Every kan (open or closed) reveals its own extra "kan dora" indicator, on
// top of the normal one — and, if the hand is riichi, its own extra "kan
// ura dora" indicator too, revealed at the win regardless of whether the
// kan was declared before or after riichi was called. So a hand always has
// (1 + kanCount) dora indicators, and (1 + kanCount) ura indicators if
// riichi. Shared by all three hand-type builders (kanCount is always 0 for
// Chiitoitsu/Kokushi, since neither can ever contain a kan). Split into two
// small composable pieces (rather than one riichi-aware function) because
// generateValidHand() sometimes decides a hand needs riichi *after* it was
// first built — at which point only the ura half needs generating; the
// dora indicators shouldn't be re-rolled.
function computeDoraIndicators(allTiles, kanCount){
  const counts = tileCounts(allTiles);
  const doraIndicators = [];
  let doraInHand = 0;
  for(let i=0; i<1+kanCount; i++){
    const ind = pickIndicatorTile(counts);
    doraIndicators.push(ind);
    doraInHand += countTileInList(allTiles, doraTileFromIndicator(ind));
  }
  return {doraIndicators, doraInHand};
}
// `existingIndicators` are tiles already committed to the dora side of this
// same deal (passed in whenever ura indicators are rolled after the dora
// indicators already exist) — they share the same finite dead wall, so ura
// picks have to see them as taken too, not just the hand's own tiles.
function computeUraIndicators(allTiles, kanCount, existingIndicators){
  const counts = tileCounts(allTiles);
  (existingIndicators||[]).forEach(t=> addCount(counts, t.suit, t.num, 1));
  const uraIndicators = [];
  let uraDoraInHand = 0;
  for(let i=0; i<1+kanCount; i++){
    const ind = pickIndicatorTile(counts);
    uraIndicators.push(ind);
    uraDoraInHand += countTileInList(allTiles, doraTileFromIndicator(ind));
  }
  return {uraIndicators, uraDoraInHand};
}
function computeDoraInfo(allTiles, riichi, kanCount){
  const {doraIndicators, doraInHand} = computeDoraIndicators(allTiles, kanCount);
  const {uraIndicators, uraDoraInHand} = riichi ? computeUraIndicators(allTiles, kanCount, doraIndicators) : {uraIndicators:[], uraDoraInHand:0};
  return {doraIndicators, uraIndicators, doraInHand, uraDoraInHand};
}
function getAllHandTiles(hand){
  if(hand.isChiitoi){
    let tiles=[];
    hand.pairs.forEach(p=>{ tiles.push(p); tiles.push(p); });
    return tiles;
  }
  let tiles=[];
  hand.groups.forEach(g=>{ tiles = tiles.concat(groupTiles(g)); });
  tiles.push({suit:hand.pair.suit,num:hand.pair.num});
  tiles.push({suit:hand.pair.suit,num:hand.pair.num});
  return tiles;
}
function countTileInList(tiles, t){
  return tiles.filter(x=>x.suit===t.suit && x.num===t.num).length;
}
// Decide which suits get a "red five" in play, tied to fives actually present
// in the hand (there is only one red 5 per suit in a physical set - 3 plain
// copies plus 1 red). If a hand uses all 4 copies of a suit's 5, the red one
// is physically guaranteed to be among them, not just a 40% chance.
function pickRedFiveSuits(allTiles){
  const suits=[];
  ['m','p','s'].forEach(suit=>{
    const count5 = allTiles.filter(t=>t.suit===suit && t.num===5).length;
    if(count5===0) return;
    if(count5>=4 || Math.random()<0.4) suits.push(suit);
  });
  return suits;
}

// Determine wait-slot candidates: {groupIdx or 'pair', waitType, tile}.
// A kan is always fully complete before the win (declared during a normal
// turn, never as the winning action itself — see Rinshan Kaihou for the one
// exception, which is its own separate timing flag, not a wait slot), so it
// never has wait slots of its own.
function waitSlotsForGroup(idx, g){
  const slots=[];
  if(g.kind==='kan') return slots;
  if(g.kind==='seq'){
    const s=g.start;
    // last=s (smallest)
    slots.push({groupIdx:idx, tile:{suit:g.suit,num:s}, waitType: (s+1===8&&s+2===9)?'penchan':'ryanmen'});
    // careful: condition should be based on held tiles = s+1,s+2 -> penchan if those are 8,9 i.e. s=7
    // last=s+2 (largest)
    slots.push({groupIdx:idx, tile:{suit:g.suit,num:s+2}, waitType: (s===1)?'penchan':'ryanmen'});
    // last=s+1 (middle) -> kanchan always
    slots.push({groupIdx:idx, tile:{suit:g.suit,num:s+1}, waitType:'kanchan'});
  } else {
    slots.push({groupIdx:idx, tile:{suit:g.suit,num:g.num}, waitType:'shanpon'});
  }
  return slots;
}

// Respect the user's "only tsumo/ron" and "only dealer/non-dealer" filters
// when generating a hand. Falls back to fully random when set to 'any'.
function pickWinMethod(){
  const f = state.handFilters.winMethod;
  if(f==='tsumo') return 'tsumo';
  if(f==='ron') return 'ron';
  return Math.random()<0.35 ? 'tsumo':'ron';
}
function pickSeatWind(){
  const f = state.handFilters.seat;
  if(f==='dealer') return 1;
  if(f==='nondealer') return choice([2,3,4]);
  return randInt(1,4);
}

// Weighted theme table: each entry's weight is the approximate real-world
// probability (from Tenhou statistics) that a random winning hand contains
// that yaku. A weighted pick below selects at most one theme per hand;
// the remaining probability mass falls through to the plain random builder,
// which is tuned to mostly produce simple sequence-based hands (tanyao,
// pinfu, yakuhai, riichi) — matching how real hands are actually composed.
//
// Recalibration note: after adding findBestDecomposition() (which rescoes
// every hand under its best-scoring valid tile grouping, fixing cases where
// e.g. 444555666m was scored as sequences when the triplet reading is
// actually worth more), Sanankou/Suuankou/Iipeiko frequencies shifted
// slightly since the engine now organically discovers some of these yaku
// in hands that previously scored as something else. Re-simulated 300k
// hands (fixed vs. un-fixed engine) to isolate the shift:
//   iipeiko:  5.93% -> 5.83%  (small drop, some hands correctly reclassified
//             away from it) — weight nudged 0.001 -> 0.00102 to compensate.
//   sanankou: 2.30% -> 2.44%  — dedicated theme is only ~4% of this yaku's
//             total occurrences (rest is organic), so weight tuning has
//             almost no leverage here; left at 0.001, gap accepted as noise.
//   suuankou: 0.044% -> 0.059% — dedicated theme is ~19% of this yaku's
//             total, so weight was trimmed 0.00015 -> 0.0001, which helps
//             partially but can't fully close the gap without removing the
//             dedicated builder outright (not done, since that would remove
//             this rare yakuman's only guaranteed practice exposure).
//
// honroutou/sankantsu/suukantsu/rinshan/chuuren weights below are initial
// estimates (not simulation-calibrated like the rest of this table yet) —
// picked to roughly match their real-world rarity while guaranteeing some
// practice exposure; worth revisiting with the same simulate-and-adjust
// pass if their frequencies turn out off after real use.
const HAND_THEMES = [
  {name:'pinfu', weight:0.199, builder:tryBuildPinfuGroups, forceConcealed:false, preferRyanmen:true},
  {name:'tanyao', weight:0.15, builder:tryBuildTanyaoGroups, forceConcealed:false},
  {name:'yakuhai_dragon', weight:0.062, builder:tryBuildYakuhaiDragonGroups, forceConcealed:false},
  {name:'yakuhai_seatwind', weight:0.05, builder:null, forceConcealed:false}, // built after seatWind is known
  {name:'yakuhai_roundwind', weight:0.05, builder:null, forceConcealed:false}, // built after roundWind is known
  {name:'toitoi', weight:0.02, builder:tryBuildToitoiGroups, forceConcealed:false},
  {name:'honitsu', weight:0.042, builder:tryBuildHonitsuGroups, forceConcealed:false},
  {name:'chinitsu', weight:0.004, builder:tryBuildChinitsuGroups, forceConcealed:false},
  {name:'iipeiko', weight:0.00102, builder:tryBuildIipeikoGroups, forceConcealed:true},
  {name:'sanshoku', weight:0.024, builder:tryBuildSanshokuGroups, forceConcealed:false},
  {name:'sanshokudoukou', weight:0.00022, builder:tryBuildSanshokuDoukouGroups, forceConcealed:false},
  {name:'ittsuu', weight:0.0123, builder:tryBuildIttsuuGroups, forceConcealed:false},
  {name:'chanta', weight:0.0094, builder:tryBuildChantaGroups, forceConcealed:false},
  {name:'honroutou', weight:0.0006, builder:tryBuildHonroutouGroups, forceConcealed:false},
  {name:'sanankou', weight:0.001, builder:tryBuildSanankouGroups, forceConcealed:true},
  {name:'shousangen', weight:0.00071, builder:tryBuildShousangenGroups, forceConcealed:false},
  {name:'suuankou', weight:0.0001, builder:tryBuildSuuankouGroups, forceConcealed:true},
  {name:'sankantsu', weight:0.0002, builder:tryBuildSankantsuGroups, forceConcealed:false},
  {name:'suukantsu', weight:0.00003, builder:tryBuildSuukantsuGroups, forceConcealed:false},
  {name:'rinshan', weight:0.003, builder:tryBuildRinshanGroups, forceConcealed:false},
  {name:'chuuren', weight:0.00004, builder:tryBuildChuurenGroups, forceConcealed:true},
  {name:'daisangen', weight:0.00018, builder:tryBuildDaisangenGroups, forceConcealed:false},
  {name:'tsuuiisou', weight:0.00015, builder:tryBuildTsuuiisouGroups, forceConcealed:false},
  {name:'chinroutou', weight:0.00006, builder:tryBuildChinroutouGroups, forceConcealed:false},
  {name:'shousuushi', weight:0.00005, builder:tryBuildShousuushiGroups, forceConcealed:false},
  {name:'daisuushi', weight:0.00001, builder:tryBuildDaisuushiGroups, forceConcealed:false},
  {name:'ryuuiisou', weight:0.00009, builder:tryBuildRyuuiisouGroups, forceConcealed:false},
];
function pickHandTheme(){
  let r = Math.random();
  for(const t of HAND_THEMES){
    if(r < t.weight) return t;
    r -= t.weight;
  }
  return null; // falls through to the plain random builder
}

function buildHand(){
  const roundWind = choice([1,2]); // East or South round, common in modern rulesets
  const seatWind = pickSeatWind();

  let built=null;
  let forceConcealed=null;
  let preferRyanmen=false;
  let forceWinMethod=null;
  let forceRinshan=false;
  const theme = pickHandTheme();
  if(theme){
    if(theme.name==='yakuhai_seatwind') built = tryBuildYakuhaiWindGroups(seatWind);
    else if(theme.name==='yakuhai_roundwind') built = tryBuildYakuhaiWindGroups(roundWind);
    else built = theme.builder();
    if(built){
      forceConcealed = theme.forceConcealed;
      preferRyanmen = !!theme.preferRyanmen;
      if(theme.name==='rinshan'){ forceWinMethod='tsumo'; forceRinshan=true; }
    }
  }
  if(!built){
    for(let i=0;i<60 && !built; i++){ built = tryBuildGroups(); }
  }
  if(!built) return buildHand(); // retry fresh
  const {groups, pair, forcedWinTile} = built;

  const allTrip = groups.every(g=>g.kind==='trip');
  const themeWantsAnkou = theme && (theme.name==='sanankou' || theme.name==='suuankou');
  const concealed = forceConcealed===true ? true
    : (allTrip && !themeWantsAnkou) ? Math.random()<0.02
    : Math.random() < 0.50;

  // decide which groups are open melds if not concealed
  let openMeldIdx = new Set();
  if(!concealed){
    let numOpen;
    if(allTrip && !themeWantsAnkou){
      // An all-triplet hand that goes open is almost always called fairly
      // aggressively — rarely with just one meld called, since that would
      // leave 3 concealed triplets (Sanankou territory instead).
      const r = Math.random();
      numOpen = r<0.15 ? 1 : (r<0.55 ? 2 : 3);
    } else {
      numOpen = randInt(1, Math.min(3, groups.length));
    }
    const idxs = shuffle([0,1,2,3]).slice(0, numOpen);
    idxs.forEach(i=>openMeldIdx.add(i));
  }
  const groupConcealed = groups.map((g,i)=> concealed ? true : !openMeldIdx.has(i));

  let winSlot;
  if(forcedWinTile){
    // Chuuren Poutou-style: the winning tile is fixed by the builder itself
    // (any tile of the shape's suit completes it) — find which concealed
    // group or the pair contains that value and use it as the wait slot,
    // reusing the same candidate-finding logic as the decomposition search.
    const concealedIdxs = groups.map((g,i)=>i).filter(i=>groupConcealed[i]);
    const concealedGroupsOnly = concealedIdxs.map(i=>groups[i]);
    const cands = winSlotCandidatesFor(concealedGroupsOnly, pair, 0, forcedWinTile)
      .map(c=> c.groupIdx==='pair' ? c : {groupIdx:concealedIdxs[c.groupIdx], waitType:c.waitType});
    const chosen = cands.length ? choice(cands) : {groupIdx:'pair', waitType:'tanki'};
    winSlot = {groupIdx:chosen.groupIdx, tile:forcedWinTile, waitType:chosen.waitType};
  } else {
    // build wait slots — only concealed groups (and the pair) can be part of the wait;
    // called/open melds are already complete when revealed and can't be the waiting part.
    // (waitSlotsForGroup returns no slots for kan groups — those are always
    // already-complete before the win, regardless of concealed status.)
    let slots=[];
    groups.forEach((g,i)=>{ if(groupConcealed[i]) slots = slots.concat(waitSlotsForGroup(i,g)); });
    slots.push({groupIdx:'pair', tile:{suit:pair.suit,num:pair.num}, waitType:'tanki'});
    const ryanmenSlots = slots.filter(s=>s.waitType==='ryanmen');
    winSlot = (preferRyanmen && ryanmenSlots.length) ? choice(ryanmenSlots) : choice(slots);
  }

  const winMethod = forceWinMethod || pickWinMethod();
  let riichi=false, doubleRiichi=false, ippatsu=false, haitei=false, houtei=false, chankan=false;
  if(concealed){
    riichi = Math.random()<0.82;
    if(riichi){
      doubleRiichi = Math.random()<0.005;
      ippatsu = Math.random()<0.22;
    }
  }
  // Rinshan is only ever set by the dedicated rinshan theme (it requires a
  // kan to actually be present); haitei/houtei/chankan have no compositional
  // requirement, so they're just attached at random to any hand — but never
  // alongside rinshan, since a hand can't win on both the last tile and a
  // kan replacement tile at once.
  if(!forceRinshan && Math.random()<0.0094){
    if(winMethod==='tsumo') haitei=true;
    else { if(Math.random()<0.3) chankan=true; else houtei=true; }
  }

  // dora — every kan reveals its own extra indicator (kan dora), and its
  // own extra ura indicator too if riichi (kan ura dora); see computeDoraInfo.
  const handSoFar = { groups, pair };
  const allTiles = getAllHandTiles(handSoFar);
  const kanCount = groups.filter(g=>g.kind==='kan').length;
  const {doraIndicators, uraIndicators, doraInHand, uraDoraInHand} = computeDoraInfo(allTiles, riichi, kanCount);
  const redFiveSuits = pickRedFiveSuits(allTiles);

  return {
    groups, pair, groupConcealed, concealed,
    roundWind, seatWind, winMethod,
    winSlot, // {groupIdx, tile, waitType}
    riichi, doubleRiichi, ippatsu, haitei, houtei, rinshan:forceRinshan, chankan,
    doraIndicators, uraIndicators,
    doraInHand, redFiveSuits, redFiveCount: redFiveSuits.length, uraDoraInHand
  };
}

// ===== Yaku detection =====
function buildChiitoiHand(){
  const universe=[];
  for(const suit of SUITS) for(let n=1;n<=9;n++) universe.push({suit,num:n});
  for(let n=1;n<=7;n++) universe.push({suit:'z',num:n});
  const picks = shuffle(universe).slice(0,7);
  const roundWind = choice([1,2]);
  const seatWind = pickSeatWind();
  const winMethod = pickWinMethod();
  let riichi=false, doubleRiichi=false, ippatsu=false, haitei=false, houtei=false;
  riichi = Math.random()<0.82;
  if(riichi){ doubleRiichi = Math.random()<0.005; ippatsu = Math.random()<0.22; }
  if(Math.random()<0.0094){ if(winMethod==='tsumo') haitei=true; else houtei=true; }
  const winningPairIdx = randInt(0,6);

  const doraInfo = computeDoraInfo(picks.flatMap(p=>[p,p]), riichi, 0);
  const allTiles = picks.flatMap(p=>[p,p]);
  const redFiveSuits = pickRedFiveSuits(allTiles);

  return {
    isChiitoi:true, pairs: picks, winningPairIdx,
    concealed:true, roundWind, seatWind, winMethod,
    riichi, doubleRiichi, ippatsu, haitei, houtei,
    doraIndicators: doraInfo.doraIndicators, uraIndicators: doraInfo.uraIndicators,
    doraInHand: doraInfo.doraInHand, redFiveSuits, redFiveCount: redFiveSuits.length, uraDoraInHand: doraInfo.uraDoraInHand
  };
}
function buildKokushiHand(){
  const roundWind = choice([1,2]);
  const seatWind = pickSeatWind();
  const winMethod = pickWinMethod();
  // Kokushi can only ever be won on a fully closed hand — there is no
  // sequence/triplet to call that could keep the shape intact.
  let riichi=false, doubleRiichi=false, ippatsu=false, haitei=false, houtei=false;
  riichi = Math.random()<0.82;
  if(riichi){ doubleRiichi = Math.random()<0.005; ippatsu = Math.random()<0.22; }
  if(Math.random()<0.0094){ if(winMethod==='tsumo') haitei=true; else houtei=true; }
  // Pick which of the 13 types is doubled up (the tanki wait pair).
  const pairIdx = randInt(0,12);

  const allTiles = KOKUSHI_TILES.flatMap((t,i)=> i===pairIdx ? [t,t] : [t]);
  const doraInfo = computeDoraInfo(allTiles, riichi, 0);
  // Kokushi is built entirely from terminals and honors, so it never
  // contains a 5 of any suit — no red fives are possible here.

  return {
    isKokushi:true, tiles: KOKUSHI_TILES, pairIdx,
    concealed:true, roundWind, seatWind, winMethod,
    riichi, doubleRiichi, ippatsu, haitei, houtei,
    doraIndicators: doraInfo.doraIndicators, uraIndicators: doraInfo.uraIndicators,
    doraInHand: doraInfo.doraInHand, redFiveSuits:[], redFiveCount:0, uraDoraInHand: doraInfo.uraDoraInHand
  };
}
const DECOMP_SUIT_ORDER = ['m','p','s','z'];
function lowestFilledTile(counts){
  for(const suit of DECOMP_SUIT_ORDER){
    const maxNum = suit==='z' ? 7 : 9;
    for(let n=1;n<=maxNum;n++){ if(counts[suit][n]>0) return {suit,num:n}; }
  }
  return null;
}
// Recursively split whatever remains in `counts` into exactly `groupsNeeded`
// groups (triplets or sequences), always peeling from the lowest remaining
// tile so every valid split is found exactly once per branch and nothing is
// missed. Returns an array of group-lists (each a complete way to do it).
function decomposeGroups(counts, groupsNeeded){
  if(groupsNeeded===0){
    for(const suit of DECOMP_SUIT_ORDER){
      const maxNum = suit==='z' ? 7 : 9;
      for(let n=1;n<=maxNum;n++){ if(counts[suit][n]!==0) return []; }
    }
    return [[]];
  }
  const low = lowestFilledTile(counts);
  if(!low) return [];
  const {suit,num} = low;
  const results=[];
  if(counts[suit][num]>=3){
    counts[suit][num]-=3;
    decomposeGroups(counts, groupsNeeded-1).forEach(rest=>
      results.push([{kind:'trip',suit,num}, ...rest]));
    counts[suit][num]+=3;
  }
  if(suit!=='z' && num<=7 && counts[suit][num+1]>0 && counts[suit][num+2]>0){
    counts[suit][num]-=1; counts[suit][num+1]-=1; counts[suit][num+2]-=1;
    decomposeGroups(counts, groupsNeeded-1).forEach(rest=>
      results.push([{kind:'seq',suit,start:num}, ...rest]));
    counts[suit][num]+=1; counts[suit][num+1]+=1; counts[suit][num+2]+=1;
  }
  return results;
}
// All valid (groups, pair) splits of a flat tile list into `groupsNeeded`
// groups + one pair.
function decomposeStandardHand(tiles, groupsNeeded){
  const counts = newCounts();
  tiles.forEach(t=> counts[t.suit][t.num]++);
  const decomps=[];
  for(const suit of DECOMP_SUIT_ORDER){
    const maxNum = suit==='z' ? 7 : 9;
    for(let n=1;n<=maxNum;n++){
      if(counts[suit][n]>=2){
        counts[suit][n]-=2;
        decomposeGroups(counts, groupsNeeded).forEach(groups=>
          decomps.push({groups, pair:{suit,num:n}}));
        counts[suit][n]+=2;
      }
    }
  }
  return decomps;
}
// Given one (groups, pair) split of the concealed tiles, every group or the
// pair that contains the winning tile's value is a possible "this is what
// the win completed" assignment — each with its own wait type and its own
// fu/yaku consequences (e.g. a concealed triplet win via ron on shanpon
// scores differently than the same tiles read as a sequence's kanchan).
function winSlotCandidatesFor(concealedGroups, pair, openGroupCount, winTile){
  const cands=[];
  concealedGroups.forEach((g,ci)=>{
    if(g.suit!==winTile.suit) return;
    if(g.kind==='trip'){
      if(g.num===winTile.num) cands.push({groupIdx:openGroupCount+ci, waitType:'shanpon'});
    } else {
      const s=g.start;
      if(winTile.num===s) cands.push({groupIdx:openGroupCount+ci, waitType:(s===7)?'penchan':'ryanmen'});
      if(winTile.num===s+2) cands.push({groupIdx:openGroupCount+ci, waitType:(s===1)?'penchan':'ryanmen'});
      if(winTile.num===s+1) cands.push({groupIdx:openGroupCount+ci, waitType:'kanchan'});
    }
  });
  if(pair.suit===winTile.suit && pair.num===winTile.num) cands.push({groupIdx:'pair', waitType:'tanki'});
  return cands;
}
// Re-derive the best-scoring valid reading of a standard hand's re-groupable
// concealed tiles. Open melds are left untouched (fixed once called) — and
// so are kans, whether open or closed, since a kan is always exactly 4
// copies of one tile, physically locked in as a kan once declared, and can
// never be reinterpreted as a sequence or split apart. Falls back to the
// original hand unchanged if no alternate reading exists, nothing is left
// to re-decompose (e.g. a Suukantsu hand — four fixed kans, no free tiles),
// or none scores better.
function findBestDecomposition(hand){
  const fixedIdxs = hand.groups.map((g,i)=>i).filter(i=> !hand.groupConcealed[i] || hand.groups[i].kind==='kan');
  const fixedGroups = fixedIdxs.map(i=>hand.groups[i]);
  const fixedConcealedFlags = fixedIdxs.map(i=>hand.groupConcealed[i]);
  const reDecomposableGroups = hand.groups.filter((g,i)=>hand.groupConcealed[i] && g.kind!=='kan');
  if(reDecomposableGroups.length===0) return hand;

  let concealedTiles=[];
  reDecomposableGroups.forEach(g=> concealedTiles = concealedTiles.concat(groupTiles(g)));
  concealedTiles.push({suit:hand.pair.suit,num:hand.pair.num});
  concealedTiles.push({suit:hand.pair.suit,num:hand.pair.num});

  const decomps = decomposeStandardHand(concealedTiles, reDecomposableGroups.length);
  if(decomps.length===0) return hand;
  // Even a single structural grouping of the tiles can admit more than one
  // valid *win-completion* reading — e.g. a winning tile that could equally
  // complete either of two sequences (one via ryanmen, one via kanchan)
  // using the exact same final groups, which changes Pinfu eligibility and
  // the fu total without changing what the groups themselves are. So the
  // winSlot-candidate search below always runs, even when decomps.length
  // is exactly 1 - there used to be an early return here that skipped it.

  const winTile = hand.winSlot.tile;
  let best=null;
  decomps.forEach(({groups:newConcealedGroups, pair:newPair})=>{
    const slotCands = winSlotCandidatesFor(newConcealedGroups, newPair, fixedGroups.length, winTile);
    slotCands.forEach(slot=>{
      const candidateHand = Object.assign({}, hand, {
        groups: fixedGroups.concat(newConcealedGroups),
        pair: newPair,
        groupConcealed: fixedConcealedFlags.concat(newConcealedGroups.map(()=>true)),
        winSlot: {groupIdx: slot.groupIdx, tile: winTile, waitType: slot.waitType},
      });
      const info = detectYaku(candidateHand);
      const hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
      const yakumanMult = info.yakuman.reduce((a,y)=>a+y.mult,0);
      // Dora/aka counts are per physical tile, unaffected by how we group them.
      const hanTotal = hanFromYaku + hand.doraInHand + hand.redFiveCount + hand.uraDoraInHand;
      const fuRes = computeFu(candidateHand, info);
      const isDealer = candidateHand.seatWind===1;
      const score = computeScore(yakumanMult>0?13:hanTotal, fuRes.fu, isDealer, candidateHand.winMethod, yakumanMult, true);
      // Rank by (yakumanMult, hanTotal, fu) rather than by score.total: once
      // two readings are both within the same scoring tier (e.g. 6 han and
      // 7 han both cap at Haneman), their final points are identical, which
      // would otherwise hide the objectively higher-scoring reading behind
      // a tie and leave the wrong yaku/fu reported even though it doesn't
      // change the points.
      const rank = [yakumanMult, hanTotal, fuRes.fu];
      let better = !best;
      if(best){
        if(rank[0]!==best.rank[0]) better = rank[0]>best.rank[0];
        else if(rank[1]!==best.rank[1]) better = rank[1]>best.rank[1];
        else better = rank[2]>best.rank[2];
      }
      if(better){
        best = {rank, total:score.total, hand:candidateHand};
      }
    });
  });
  return best ? best.hand : hand;
}

// A chiitoitsu-shaped hand (7 distinct pairs) occasionally also admits a
// valid standard 4-groups+pair reading of the exact same 14 tiles (always
// via sequences, since no tile type has more than 2 copies in a chiitoi
// hand, ruling out triplets/kans) — e.g. two duplicated runs reading as
// Ryanpeikou instead of Chiitoitsu. Real rules score whichever valid
// interpretation is worth more, so check for a higher-scoring standard
// reading the same way findBestDecomposition() does for structural
// ambiguity within an already-standard hand, and fall back to the
// chiitoitsu reading if no standard decomposition scores higher (or none
// exists, or none has a yaku of its own to legally win with).
function resolveChiitoiOrStandard(chiitoiHand){
  const chiitoiInfo = detectYakuChiitoi(chiitoiHand);
  const chiitoiHanFromYaku = chiitoiInfo.yaku.reduce((a,y)=>a+y.han,0);
  const chiitoiHanTotal = chiitoiHanFromYaku + chiitoiHand.doraInHand + chiitoiHand.redFiveCount + chiitoiHand.uraDoraInHand;
  let best = {rank:[0, chiitoiHanTotal, computeFuChiitoi()], hand:chiitoiHand, info:chiitoiInfo};

  const winTile = chiitoiHand.pairs[chiitoiHand.winningPairIdx];
  const allTiles = chiitoiHand.pairs.flatMap(p=>[p,p]);
  decomposeStandardHand(allTiles, 4).forEach(({groups, pair})=>{
    winSlotCandidatesFor(groups, pair, 0, winTile).forEach(slot=>{
      const candidateHand = {
        groups, pair,
        groupConcealed: groups.map(()=>true),
        concealed: true,
        roundWind: chiitoiHand.roundWind, seatWind: chiitoiHand.seatWind,
        winMethod: chiitoiHand.winMethod,
        winSlot: {groupIdx: slot.groupIdx, tile: winTile, waitType: slot.waitType},
        riichi: chiitoiHand.riichi, doubleRiichi: chiitoiHand.doubleRiichi, ippatsu: chiitoiHand.ippatsu,
        haitei: chiitoiHand.haitei, houtei: chiitoiHand.houtei, rinshan:false, chankan:false,
        doraIndicators: chiitoiHand.doraIndicators, uraIndicators: chiitoiHand.uraIndicators,
        doraInHand: chiitoiHand.doraInHand, redFiveCount: chiitoiHand.redFiveCount, uraDoraInHand: chiitoiHand.uraDoraInHand,
      };
      const candInfo = detectYaku(candidateHand);
      const candHanFromYaku = candInfo.yaku.reduce((a,y)=>a+y.han,0);
      const yakumanMult = candInfo.yakuman.reduce((a,y)=>a+y.mult,0);
      if(candHanFromYaku===0 && yakumanMult===0) return; // no yaku under this reading -> not a legal win
      const candHanTotal = candHanFromYaku + chiitoiHand.doraInHand + chiitoiHand.redFiveCount + chiitoiHand.uraDoraInHand;
      const fuRes = computeFu(candidateHand, candInfo);
      const rank = [yakumanMult, candHanTotal, fuRes.fu];
      const better = rank[0]!==best.rank[0] ? rank[0]>best.rank[0]
        : rank[1]!==best.rank[1] ? rank[1]>best.rank[1]
        : rank[2]>best.rank[2];
      if(better) best = {rank, hand:candidateHand, info:candInfo};
    });
  });
  return {hand:best.hand, info:best.info};
}

function generateValidHand(){
  if(Math.random()<0.00054){
    const hand = buildKokushiHand();
    const info = detectYakuKokushi(hand);
    return {hand, info};
  }
  if(Math.random()<0.022){
    const hand = buildChiitoiHand();
    return resolveChiitoiOrStandard(hand);
  }
  for(let attempt=0; attempt<40; attempt++){
    let hand = buildHand();
    hand = findBestDecomposition(hand);
    let info = detectYaku(hand);
    let hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
    const yakumanMult = info.yakuman.reduce((a,y)=>a+y.mult,0);
    if(hanFromYaku>0 || yakumanMult>0) return {hand, info};
    if(hand.concealed){
      hand.riichi = true;
      hand.doubleRiichi = false;
      // Riichi wasn't set when buildHand() first rolled ura indicators, so
      // there weren't any yet — generate them now that riichi applies.
      const kanCount = hand.groups.filter(g=>g.kind==='kan').length;
      const {uraIndicators, uraDoraInHand} = computeUraIndicators(getAllHandTiles(hand), kanCount, hand.doraIndicators);
      hand.uraIndicators = uraIndicators;
      hand.uraDoraInHand = uraDoraInHand;
      info = detectYaku(hand);
      hanFromYaku = info.yaku.reduce((a,y)=>a+y.han,0);
      if(hanFromYaku>0) return {hand, info};
    }
    // else retry whole generation
  }
  // fallback: force a yakuhai triplet won't be reached in practice
  let hand = buildHand();
  hand = findBestDecomposition(hand);
  if(hand.concealed && !hand.riichi){
    hand.riichi = true;
    const kanCount = hand.groups.filter(g=>g.kind==='kan').length;
    const {uraIndicators, uraDoraInHand} = computeUraIndicators(getAllHandTiles(hand), kanCount, hand.doraIndicators);
    hand.uraIndicators = uraIndicators;
    hand.uraDoraInHand = uraDoraInHand;
  }
  const info = detectYaku(hand);
  return {hand, info};
}




