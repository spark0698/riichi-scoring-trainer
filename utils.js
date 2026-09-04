'use strict';
function randInt(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function choice(arr){ return arr[randInt(0,arr.length-1)]; }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=randInt(0,i); [a[i],a[j]]=[a[j],a[i]];} return a; }

// ===== Hand generation =====
function newCounts(){
  const c = {m:Array(10).fill(0), p:Array(10).fill(0), s:Array(10).fill(0), z:Array(8).fill(0)};
  return c;
}
function canAdd(counts, suit, num, qty){ return counts[suit][num]+qty<=4; }
function addCount(counts, suit, num, qty){ counts[suit][num]+=qty; }

