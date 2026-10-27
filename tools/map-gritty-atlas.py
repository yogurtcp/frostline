"""Map generated transparent art into runtime source rectangles; PNGs stay untouched."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def dividers(profile, count):
    length = len(profile)
    bounds = [0]
    for i in range(1, count):
        ideal = length * i / count
        lo = max(bounds[-1] + 1, int(ideal - length / count * .42))
        hi = min(length - 1, int(ideal + length / count * .42))
        candidates = [p for p in range(lo, hi) if profile[p] == 0]
        bounds.append(min(candidates, key=lambda p: abs(p - ideal)) if candidates else round(ideal))
    return bounds + [length]


def main():
    config_path = ROOT / 'game-config.json'
    config = json.loads(config_path.read_text())
    sheets = json.loads((ROOT / 'design/gritty/prompts.json').read_text())['sheets']
    aspects = json.loads((ROOT / 'design/gritty/source-aspects.json').read_text())
    found, audit = {}, {}
    for sheet in sheets:
        image = Image.open(ROOT / sheet['file']).convert('RGBA')
        alpha = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
        pixels = alpha.load()
        rows = dividers([sum(pixels[x, y] > 0 for x in range(image.width)) for y in range(image.height)], sheet['rows'])
        entries = {}
        for row in range(sheet['rows']):
            top, bottom = rows[row:row + 2]
            cols = dividers([sum(pixels[x, y] > 0 for y in range(top, bottom)) for x in range(image.width)], sheet['cols'])
            for col in range(sheet['cols']):
                name = sheet['names'][row * sheet['cols'] + col]
                left, right = cols[col:col + 2]
                bbox = alpha.crop((left, top, right, bottom)).getbbox()
                if not bbox:
                    raise ValueError(f'Empty frame: {name}')
                x0, y0, x1, y1 = bbox
                entries[name] = [left + x0, top + y0, x1 - x0, y1 - y0]
        found.update({name: ['gritty' + sheet['key'].title(), *rect] for name, rect in entries.items()})
        audit[sheet['key']] = {'size': image.size, 'rowBounds': rows, 'frames': entries}

    aliases = {'pine': 'spruceTree', 'fir': 'alpineTree', 'smallPine': 'alpineTree',
               'dogLeft': 'dog', 'dogRight': 'dog', 'yeti': 'yetiWhiteIdle',
               'yetiWalk': 'yetiWhiteRunL', 'yetiHappy': 'yetiWhiteRunR'}
    for name in config['atlas']:
        if name.startswith('person'):
            suffix = next((name[len('person' + color):] for color in ['Red', 'Yellow', 'Green'] if name.startswith('person' + color)), '')
            source = 'person' + (suffix or 'Idle0')
        else:
            source = aliases.get(name, name)
        if source not in found:
            continue
        entry = found[source][:]
        # Preserve the existing display aspect/foot baseline with transparent source padding.
        old = config['atlas'][name]
        original = aspects.get(name, old[3:5])
        ratio = original[0] / original[1]
        key, x, y, w, h = entry
        nw, nh = max(w, round(h * ratio)), max(h, round(w / ratio))
        nx, ny = x - (nw - w) // 2, y - (nh - h)
        if nx >= 0 and ny >= 0:
            entry = [key, nx, ny, nw, nh]
        config['atlas'][name] = entry

    config['colors'].update(ink='#202b43', muted='#7283a2', snow='#f1f6ff', ice='#dce7fa',
                            blue='#426f9c', teal='#345f70', red='#b94d51', gold='#d2a152', wood='#8e583d')
    config['palette'] = ['#111c2c', '#202b43', '#344663', '#60739b', '#8ea3ce', '#bbcbeb', '#dce7fa', '#f7faff',
                         '#0d292d', '#193e3d', '#2e564b', '#51765c', '#4b322e', '#714534', '#9d6140', '#bf8954',
                         '#e1ae6e', '#f5d29c', '#e4b39a', '#f3d0b0', '#74303d', '#b8444b', '#e46b57', '#dc963e',
                         '#2c4770', '#416f9d', '#6b9cbc', '#302d49', '#58456c', '#8a78a1', '#b5a4c6', '#9097a6',
                         '#c59a46', '#efd17c', '#6a7e72', '#a4b4a4']
    config['render']['fastSkierRGB'] = [156, 102, 154]
    config['render']['guestRGB'] = [52, 110, 132]
    config_path.write_text(json.dumps(config, indent=2) + '\n')
    schema_path = ROOT / 'game-config.schema.json'
    schema = json.loads(schema_path.read_text())
    for prop in schema['properties']['atlas']['properties'].values():
        allowed = prop['prefixItems'][0]['enum']
        for key in ['gritty']:
            if key not in allowed:
                allowed.append(key)
    schema_path.write_text(json.dumps(schema, indent=2) + '\n')
    (ROOT / 'design/gritty/frames.json').write_text(json.dumps(audit, indent=2) + '\n')


if __name__ == '__main__':
    main()
