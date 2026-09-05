import json
import sys
import collections
from mahjong.hand_calculating.hand import HandCalculator
from mahjong.hand_calculating.hand_config import HandConfig, OptionalRules
from mahjong.meld import Meld

WIND_MAP = {1: 27, 2: 28, 3: 29, 4: 30}
SUIT_OFFSET = {'m': 0, 'p': 36, 's': 72, 'z': 108}
calculator = HandCalculator()

def group_tile_list(g):
    if g['kind'] == 'seq':
        return [(g['suit'], g['start']), (g['suit'], g['start'] + 1), (g['suit'], g['start'] + 2)]
    elif g['kind'] == 'trip':
        return [(g['suit'], g['num'])] * 3
    else:  # kan
        return [(g['suit'], g['num'])] * 4

class Overflow(Exception):
    """Raised when a (suit, num) needs more than the 4 physical copies that
    exist in a real set, once hand tiles + dora indicators + ura indicators
    are all counted together. This can legitimately happen since our
    generator doesn't model a shared finite wall across the hand and its
    indicators (e.g. the hand uses all 4 copies of a suit's 5, and a dora
    indicator separately also happens to land on that suit's 5) - a genuine
    representability gap in the reference library's tile encoding, not a bug
    in either engine."""
    def __init__(self, suit, num, needed):
        self.suit = suit
        self.num = num
        self.needed = needed
        super().__init__(f'{suit}{num} needs {needed} physical copies (max 4)')

def allocate_ids(sections, red_suits):
    """sections: list of (name, list_of_{'suit','num'} dicts), in priority
    order - hand tiles first, so a suit's red five (if any) is always
    assigned to a physical tile that's actually IN the hand, never to a dora
    or ura indicator (our engine never marks an indicator itself as red).
    Returns {name: [136-id, ...]} parallel to each section's input list.
    Raises Overflow if any (suit, num) needs more than 4 ids combined across
    every section - the one case that's genuinely unrepresentable, since a
    real set only has 4 physical copies of any tile.
    """
    combined_counts = collections.defaultdict(int)
    for _, entries in sections:
        for e in entries:
            combined_counts[(e['suit'], e['num'])] += 1
    for (suit, num), cnt in combined_counts.items():
        # The base id for any suit's 5 (SUIT_OFFSET+16, e.g. FIVE_RED_MAN=16)
        # is unconditionally "the red five" slot in this library's 136-id
        # scheme - it's not something we can opt out of per hand. A plain
        # (non-red) 5 must land on one of the other 3 ids, so a suit not
        # marked red can only ever supply 3 physical 5s' worth of ids, and a
        # suit marked red can supply all 4 (1 red + 3 plain) - anything past
        # that genuinely can't be encoded.
        if suit in ('m', 'p', 's') and num == 5:
            max_allowed = 4 if suit in red_suits else 3
        else:
            max_allowed = 4
        if cnt > max_allowed:
            raise Overflow(suit, num, cnt)

    plain_counts = collections.defaultdict(int)  # (suit,num) -> plain ids already handed out
    red_assigned = {s: False for s in red_suits}
    out = {}
    for name, entries in sections:
        ids = []
        for e in entries:
            suit, num = e['suit'], e['num']
            base = SUIT_OFFSET[suit] + (num - 1) * 4
            if suit in ('m', 'p', 's') and num == 5:
                if suit in red_suits and not red_assigned[suit]:
                    red_assigned[suit] = True
                    tid = base  # the one reserved red-five id (matches FIVE_RED_MAN/PIN/SOU)
                else:
                    idx = plain_counts[(suit, num)]
                    plain_counts[(suit, num)] += 1
                    tid = base + 1 + idx  # plain 5s occupy the other 3 slots - never the base id
            else:
                idx = plain_counts[(suit, num)]
                plain_counts[(suit, num)] += 1
                tid = base + idx
            ids.append(tid)
        out[name] = ids
    return out

def convert_standard(rec):
    groups = rec['groups']
    pair = rec['pair']
    group_concealed = rec['groupConcealed']
    win_slot = rec['winSlot']
    red_suits = set(rec.get('redFiveSuits', []))

    tile_records = []  # {'suit','num','group': idx or 'pair'}
    for gi, g in enumerate(groups):
        for (suit, num) in group_tile_list(g):
            tile_records.append({'suit': suit, 'num': num, 'group': gi})
    tile_records.append({'suit': pair['suit'], 'num': pair['num'], 'group': 'pair'})
    tile_records.append({'suit': pair['suit'], 'num': pair['num'], 'group': 'pair'})

    dora_recs = [{'suit': d['suit'], 'num': d['num']} for d in rec.get('doraIndicators', [])]
    ura_recs = [{'suit': d['suit'], 'num': d['num']} for d in rec.get('uraIndicators', [])]

    allocated = allocate_ids([('hand', tile_records), ('dora', dora_recs), ('ura', ura_recs)], red_suits)
    for tr, tid in zip(tile_records, allocated['hand']):
        tr['id136'] = tid

    tiles_136 = [tr['id136'] for tr in tile_records]

    # win tile: first physical tile matching the win_slot's group+suit+num
    win_group = win_slot['groupIdx']
    win_suit = win_slot['tile']['suit']
    win_num = win_slot['tile']['num']
    win_tile = None
    for tr in tile_records:
        if tr['group'] == win_group and tr['suit'] == win_suit and tr['num'] == win_num:
            win_tile = tr['id136']
            break
    if win_tile is None:
        # fallback: any tile matching suit/num anywhere
        for tr in tile_records:
            if tr['suit'] == win_suit and tr['num'] == win_num:
                win_tile = tr['id136']
                break

    melds = []
    for gi, g in enumerate(groups):
        is_open_meld = not group_concealed[gi]
        is_kan = g['kind'] == 'kan'
        if not is_open_meld and not is_kan:
            continue  # fully concealed non-kan group: let the library re-derive it itself
        gtiles = [tr['id136'] for tr in tile_records if tr['group'] == gi]
        if g['kind'] == 'seq':
            mtype = Meld.CHI
        elif g['kind'] == 'trip':
            mtype = Meld.PON
        else:
            mtype = Meld.KAN
        melds.append(Meld(meld_type=mtype, tiles=gtiles, opened=is_open_meld))

    return tiles_136, win_tile, melds, allocated['dora'], allocated['ura']

def convert_chiitoi(rec):
    pairs = rec['pairs']
    red_suits = set(rec.get('redFiveSuits', []))
    tile_records = []
    for pi, p in enumerate(pairs):
        tile_records.append({'suit': p['suit'], 'num': p['num'], 'group': pi})
        tile_records.append({'suit': p['suit'], 'num': p['num'], 'group': pi})

    dora_recs = [{'suit': d['suit'], 'num': d['num']} for d in rec.get('doraIndicators', [])]
    ura_recs = [{'suit': d['suit'], 'num': d['num']} for d in rec.get('uraIndicators', [])]

    allocated = allocate_ids([('hand', tile_records), ('dora', dora_recs), ('ura', ura_recs)], red_suits)
    for tr, tid in zip(tile_records, allocated['hand']):
        tr['id136'] = tid
    tiles_136 = [tr['id136'] for tr in tile_records]
    # win tile: arbitrary - any one physical tile (chiitoi scoring/fu doesn't depend on which pair completed it
    # beyond needing SOME valid win tile present in the 14; use the last pair's first tile)
    win_tile = tile_records[-2]['id136']
    return tiles_136, win_tile, [], allocated['dora'], allocated['ura']

def convert_kokushi(rec):
    tiles = rec['tiles']
    pair_idx = rec['pairIdx']
    tile_records = []
    for i, t in enumerate(tiles):
        n = 2 if i == pair_idx else 1
        for _ in range(n):
            tile_records.append({'suit': t['suit'], 'num': t['num'], 'group': i})
    allocated = allocate_ids([('hand', tile_records)], set())
    for tr, tid in zip(tile_records, allocated['hand']):
        tr['id136'] = tid
    tiles_136 = [tr['id136'] for tr in tile_records]
    win_tile = tile_records[-1]['id136']  # arbitrary; see KNOWN_WAIT_DOUBLE_YAKU_NAMES handling
    return tiles_136, win_tile, [], [], []

def make_config(rec, is_open_hand):
    opts = OptionalRules(has_aka_dora=True, has_open_tanyao=True, kiriage=True, fu_for_open_pinfu=True, fu_for_pinfu_tsumo=False)
    return HandConfig(
        is_tsumo=(rec['winMethod'] == 'tsumo'),
        is_riichi=bool(rec.get('riichi')) and not bool(rec.get('doubleRiichi')),
        is_daburu_riichi=bool(rec.get('doubleRiichi')),
        is_ippatsu=bool(rec.get('ippatsu')),
        is_rinshan=bool(rec.get('rinshan')),
        is_chankan=bool(rec.get('chankan')),
        is_haitei=bool(rec.get('haitei')),
        is_houtei=bool(rec.get('houtei')),
        player_wind=WIND_MAP[rec['seatWind']],
        round_wind=WIND_MAP[rec['roundWind']],
        options=opts,
    )

# These two yaku are specifically about a WAIT completing the winning hand,
# not the hand shape itself - our engine doesn't track wait-based yakuman
# doubling at all (always mult:1), so a mismatch involving exactly one of
# these is a known, deliberate rule-variant divergence, not a bug. Verified
# by reading the reference library's own source (yaku.__str__ returns
# self.name; these are the exact `name` strings from
# hand_calculating/yaku_list/yakuman/suuankou_tanki.py and
# .../daburu_kokushi.py). This does NOT cover chuuren's 9-sided-wait double
# (Junsei Chuuren Poutou), which our engine already implements correctly -
# any mismatch naming that yaku should still be flagged as a real bug.
KNOWN_WAIT_DOUBLE_YAKU_NAMES = {"Suu Ankou Tanki", "Kokushi Musou Juusanmen Matchi"}

def is_chuuren_related(rec, ref_yaku_names):
    our_names = set(rec.get('our', {}).get('yaku', [])) | set(rec.get('our', {}).get('yakuman', []))
    if any('Chuuren' in n for n in our_names):
        return True
    if any('Chuuren' in n for n in ref_yaku_names):
        return True
    return False

def main():
    in_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else (in_path.rsplit('.', 1)[0] + '_mismatches.jsonl')
    matched = 0
    mismatched = 0
    double_yakuman_variant = 0
    errors = 0
    unrepresentable = 0
    mismatch_examples = []
    error_examples = []
    total = 0
    chuuren_related = 0

    mismatch_file = open(out_path, 'w')

    with open(in_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            total += 1
            try:
                if rec['type'] == 'standard':
                    tiles_136, win_tile, melds, dora_ids, ura_ids = convert_standard(rec)
                elif rec['type'] == 'chiitoi':
                    tiles_136, win_tile, melds, dora_ids, ura_ids = convert_chiitoi(rec)
                elif rec['type'] == 'kokushi':
                    tiles_136, win_tile, melds, dora_ids, ura_ids = convert_kokushi(rec)
                else:
                    continue

                config = make_config(rec, is_open_hand=bool(melds))
                result = calculator.estimate_hand_value(
                    tiles_136, win_tile, melds=melds or None,
                    dora_indicators=dora_ids or None,
                    ura_dora_indicators=ura_ids or None,
                    config=config,
                )
                if result.error:
                    errors += 1
                    is_chuuren = is_chuuren_related(rec, [])
                    if is_chuuren:
                        chuuren_related += 1
                    if len(error_examples) < 10:
                        error_examples.append({'rec': rec, 'error': result.error})
                    mismatch_file.write(json.dumps({
                        'kind': 'error', 'rec': rec, 'ref_error': result.error,
                        'chuuren_related': is_chuuren,
                    }) + '\n')
                    continue

                our = rec['our']
                ref_total = result.cost['total'] if result.cost else None
                yaku_names = [str(y) for y in (result.yaku or [])]

                # Yakuman-tier hands can never match on raw han: our engine
                # reports the pre-clamp han (e.g. 21 from stacked ordinary
                # yaku reaching kazoe yakuman) while the reference always
                # reports a fixed 13 (or 26 for a double yakuman) by
                # convention. Points are what actually matters and are
                # directly comparable either way, so use that as the primary
                # signal once either side is yakuman-tier; only compare han
                # directly (in addition to points) when neither side is.
                our_is_yakuman = our['han'] >= 13 or bool(our.get('yakuman'))
                ref_is_yakuman = (result.han or 0) >= 13
                total_match = (ref_total == our['points'])
                if our_is_yakuman or ref_is_yakuman:
                    han_match = True  # not a meaningful comparison at this tier
                else:
                    han_match = (result.han == our['han'])

                if han_match and total_match:
                    matched += 1
                else:
                    # Precise, name-based detection of the one known rule
                    # variant our engine deliberately doesn't implement
                    # (wait-based yakuman doubling) - not a blanket "any
                    # yakuman-tier mismatch" catch-all, so a genuinely
                    # different bug at yakuman tier (e.g. a real chuuren
                    # doubling bug, since that IS implemented) still gets
                    # flagged instead of hidden in this bucket.
                    is_known_wait_double_variant = (
                        our_is_yakuman and ref_is_yakuman and
                        any(name in KNOWN_WAIT_DOUBLE_YAKU_NAMES for name in yaku_names)
                    )
                    if is_known_wait_double_variant:
                        double_yakuman_variant += 1
                    else:
                        mismatched += 1
                        is_chuuren = is_chuuren_related(rec, yaku_names)
                        if is_chuuren:
                            chuuren_related += 1
                        example = {
                            'rec': rec, 'ref_han': result.han, 'ref_fu': result.fu,
                            'ref_total': ref_total, 'ref_yaku': yaku_names,
                        }
                        if len(mismatch_examples) < 50:
                            mismatch_examples.append(example)
                        mismatch_file.write(json.dumps({
                            'kind': 'mismatch', **example, 'chuuren_related': is_chuuren,
                        }) + '\n')
            except Overflow as e:
                unrepresentable += 1
                mismatch_file.write(json.dumps({
                    'kind': 'unrepresentable', 'rec': rec,
                    'reason': f'{e.suit}{e.num} needs {e.needed} physical copies (hand + dora + ura indicators combined), only 4 exist',
                }) + '\n')
            except Exception as e:
                errors += 1
                is_chuuren = is_chuuren_related(rec, [])
                if is_chuuren:
                    chuuren_related += 1
                if len(error_examples) < 10:
                    error_examples.append({'rec': rec, 'error': f'{type(e).__name__}: {e}'})
                mismatch_file.write(json.dumps({
                    'kind': 'exception', 'rec': rec, 'error': f'{type(e).__name__}: {e}',
                    'chuuren_related': is_chuuren,
                }) + '\n')

    mismatch_file.close()

    print(f'Total records: {total}')
    print(f'Unrepresentable (genuine >4-physical-copies overflow, hand+dora+ura combined): {unrepresentable}')
    print(f'Matched: {matched}')
    print(f'Mismatched (genuine): {mismatched}')
    print(f'Known wait-based yakuman-doubling rule-variant (not counted as bugs): {double_yakuman_variant}')
    print(f'Conversion/library errors (skipped): {errors}')
    print(f'Chuuren-related (mismatches+errors): {chuuren_related}')
    print(f'Full mismatch+error+unrepresentable detail written to: {out_path}')
    print()
    if mismatch_examples:
        print('=== MISMATCH EXAMPLES ===')
        for ex in mismatch_examples:
            print(json.dumps(ex, indent=2, default=str))
            print('---')
    if error_examples:
        print('=== ERROR EXAMPLES (first 10) ===')
        for ex in error_examples:
            print('ERROR:', ex['error'])
            print(json.dumps(ex['rec'], indent=2, default=str))
            print('---')

if __name__ == '__main__':
    main()
