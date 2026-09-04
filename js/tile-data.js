'use strict';
// ===== Tile utilities =====
const SUITS = ['m','p','s'];
const KOKUSHI_TILES = [
  {suit:'m',num:1},{suit:'m',num:9},{suit:'p',num:1},{suit:'p',num:9},{suit:'s',num:1},{suit:'s',num:9},
  {suit:'z',num:1},{suit:'z',num:2},{suit:'z',num:3},{suit:'z',num:4},{suit:'z',num:5},{suit:'z',num:6},{suit:'z',num:7}
];
const TILE_UNICODE = {
  m: [null,'🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏'],
  s: [null,'🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'],
  p: [null,'🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'],
  z: [null,'🀀','🀁','🀂','🀃','🀆','🀅','🀄'] // 1E 2S 3W 4N 5White 6Green 7Red
};
const WIND_NAMES = ['','East','South','West','North'];
const DRAGON_NAMES = {5:'White Dragon',6:'Green Dragon',7:'Red Dragon'};
// English glosses for yaku/yakuman names shown in the UI (results breakdown
// and the reference popup). Riichi is deliberately omitted — it's basic
// vocabulary everyone using this trainer already knows. Names that are
// already plain English in this app (Round Wind (X), Seat Wind (X), the
// dragon names, Dora/Aka Dora/Ura Dora) aren't in here since they don't
// need translating.
const YAKU_EN_NAMES = {
  'Yakuhai':'Value Tiles',
  'Menzen Ron':'Concealed Ron',
  'Tsumo':'Self-Draw',
  'Ryanmen':'Two-Sided Wait',
  'Kanchan':'Closed Wait',
  'Penchan':'Edge Wait',
  'Shanpon':'Double Pair Wait',
  'Tanki':'Pair Wait',
  'Ippatsu':'One-Shot',
  'Menzen Tsumo':'Concealed Self-Draw',
  'Pinfu':'All Sequences',
  'Tanyao':'All Simples',
  'Haitei Raoyue':'Last Tile Draw',
  'Houtei Raoyui':'Last Discard',
  'Rinshan Kaihou':'After a Kan',
  'Chankan':'Robbing the Kan',
  'Double Riichi':'Double Ready',
  'Sanshoku Doujun':'Mixed Triple Sequence',
  'Ittsuu':'Pure Straight',
  'Chanta':'Half Outside Hand',
  'Toitoi':'All Triplets',
  'Sanankou':'Three Concealed Triplets',
  'Honroutou':'All Terminals and Honors',
  'Sankantsu':'Three Kans',
  'Chiitoitsu':'Seven Pairs',
  'Junchan':'Fully Outside Hand',
  'Honitsu':'Half Flush',
  'Iipeiko':'Pure Double Sequence',
  'Ryanpeikou':'Twice Pure Double Sequence',
  'Chinitsu':'Full Flush',
  'Shousangen':'Little Three Dragons',
  'Sanshoku Doukou':'Triple Triplets',
  'Suuankou':'Four Concealed Triplets',
  'Daisangen':'Big Three Dragons',
  'Shousuushi':'Little Four Winds',
  'Daisuushi':'Big Four Winds',
  'Tsuuiisou':'All Honors',
  'Chinroutou':'All Terminals',
  'Ryuuiisou':'All Green',
  'Suukantsu':'Four Kans',
  'Chuuren Poutou':'Nine Gates',
  'Junsei Chuuren Poutou':'Pure Nine Gates',
  'Kokushi Musou':'Thirteen Orphans',
};
// Renders a yaku's Japanese name with its English gloss on its own line
// underneath, smaller and not bold — used both in the results breakdown and
// the yaku reference popup, so the two stay visually consistent.
function yakuNameHTML(name){
  const en = YAKU_EN_NAMES[name];
  return en ? `${name}<span class="yaku-en-name">${en}</span>` : name;
}
function suitName(suit){ return suit==='m'?'Characters':suit==='p'?'Circles':suit==='s'?'Bamboos':'Honor'; }
function tileName(t){
  if(t.suit==='z'){
    if(t.num<=4) return WIND_NAMES[t.num]+' Wind';
    return DRAGON_NAMES[t.num];
  }
  return `${t.num} ${suitName(t.suit)}`;
}
function tileChar(t){ return TILE_UNICODE[t.suit][t.num]; }

