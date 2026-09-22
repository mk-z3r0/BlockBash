#!/usr/bin/env python3
"""How much is happening to the player, metre by metre, in every level.

The closest thing to a playtest available without a person. For each 100px of
each level it counts how many threats can reach that spot — an enemy's patrol
span widened by what its tier can actually do (a pursuer breaks patrol at
230px, an aggressor shoots from 330), plus spike beds and pits.

It cannot tell you whether a level is FUN. What it can tell you is where a
level suddenly gets three times busier than the rest of itself, which is
usually a mistake rather than a design.

  python3 tools/pressure-profile.py          # summary for every level
  python3 tools/pressure-profile.py 6        # the profile for one level
"""
import pathlib
import re
import sys

REACH = {'passive': 0, 'pursuer': 230, 'aggressor': 330}
OCTAGON_REACH = 200
STEP = 100

ROOT = pathlib.Path(__file__).resolve().parent.parent


def parse(idx):
    s = (ROOT / f'src/levels/data/level{idx}.js').read_text()
    name = re.search(r"name: '([^']*)'", s).group(1)
    ground = re.search(r'ground: \[(.*?)\n  \],', s, re.S).group(1)
    segs = [(int(a), int(b)) for a, b in re.findall(r'\{ x: (\d+),\s+width: (\d+)', ground)]
    gaps = [(segs[j][0] + segs[j][1], segs[j + 1][0]) for j in range(len(segs) - 1)]
    end = segs[-1][0] + segs[-1][1]

    hz = re.search(r'hazards: \[(.*?)\n  \],', s, re.S)
    beds = [(int(a), int(a) + int(b)) for a, b in
            re.findall(r"type: 'spikes', x: (\d+), width: (\d+)", hz.group(1))] if hz else []

    em = re.search(r'enemies: \[(.*?)\n  \],', s, re.S).group(1)
    threats = []
    for blk in re.findall(r'\{ x: \d+,.*?\}', em, re.S):
        mn = re.search(r'minX: (\d+)', blk)
        mx = re.search(r'maxX: (\d+)', blk)
        if not mn or not mx:
            continue
        if 'boss: true' in blk:
            continue          # bosses are their own event, not ambient pressure
        if "kind: 'octagon'" in blk:
            r = OCTAGON_REACH
        else:
            t = re.search(r"tier: '(\w+)'", blk)
            r = REACH.get(t.group(1) if t else 'passive', 0)
        threats.append((int(mn.group(1)) - r, int(mx.group(1)) + r))
    return name, end, gaps, beds, threats


def profile(idx):
    name, end, gaps, beds, threats = parse(idx)
    buckets = []
    for x in range(0, end, STEP):
        n = sum(1 for a, b in threats if a <= x <= b)
        n += sum(1 for a, b in beds if a <= x <= b)
        n += sum(1 for a, b in gaps if a <= x <= b)
        buckets.append(n)
    return name, buckets


def bar(n):
    return '#' * n if n else '.'


if __name__ == '__main__':
    if len(sys.argv) > 1:
        i = int(sys.argv[1])
        name, buckets = profile(i)
        print(f'level {i}: {name}')
        for j, n in enumerate(buckets):
            print(f'  {j * STEP:>5}  {bar(n):<8} {n}')
        sys.exit(0)

    print(f"{'lvl':>3} {'name':<26} {'mean':>5} {'peak':>5} {'clear':>6} {'busiest stretch':>16}")
    for i in range(1, 8):
        name, b = profile(i)
        peak = max(b)
        clear = sum(1 for n in b if n == 0) * 100
        at = b.index(peak) * STEP
        print(f'{i:>3} {name:<26} {sum(b) / len(b):>5.2f} {peak:>5} {clear:>5}px {f"x{at}":>16}')
