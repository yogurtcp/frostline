"""Report Arcade pursuit tuning from actual gate geometry and skiing physics.

Run: python3 calculate-pursuit.py
This is a steady skiing calculation, not a collision/playthrough simulation.
"""
import json
import math
from pathlib import Path


def calculate(config, level):
    physics, race, arcade = config['physics'], config['race'], config['arcade']
    units = config['world']['unitsPerMetre']
    top = level['topSpeedKmh'] / physics['hudKmhPerSpeed']
    spacing, end = level['gateSpacingMetres'] * units, level['lengthMetres'] * units
    swing = race['forestGateSwing'] if level['treesPer100m'] else race['gateSwing']
    finish_clearance = max(race['gateFinishClearance'], spacing * arcade['finishApproachGateSpacings'])
    points = [(0, 0)]
    y, index = race['gateStartOffset'], 0
    while y < end - finish_clearance:
        x = level['swayScale'] * sum(amplitude * math.sin(y / wavelength)
            for amplitude, wavelength in zip(config['world']['courseSway'], config['world']['courseWavelength']))
        points.append((x + (-1 if index % 2 == 0 else 1) * swing, y))
        y += spacing
        index += 1
    points.append((0, end))
    velocities = []
    for multiple in range(3):
        angle = math.radians(config['controls']['stepDegrees'] * multiple)
        if angle >= math.pi / 2:
            continue
        speed = top * (physics['acrossSpeedFraction'] + physics['downhillSpeedFraction'] * math.cos(angle)**2)
        velocities.append((math.sin(angle) * speed, math.cos(angle) * speed))
    velocities.append((physics['traverseSpeed'], 0))
    pace = top
    for (x, y), (next_x, next_y) in zip(points, points[1:]):
        dx, dy = abs(next_x - x), next_y - y
        j = 1
        while j < len(velocities) - 1 and dx * velocities[j][1] > dy * velocities[j][0]:
            j += 1
        ax, ay = velocities[j - 1]
        bx, by = velocities[j]
        determinant = ax * by - bx * ay
        # Solve a*t1 + b*t2 = (dx, dy), then include steering/settling time.
        seconds = (dx * by - bx * dy + ax * dy - dx * ay) / determinant + arcade['pursuitTurnAllowanceSeconds']
        pace = min(pace, dy / seconds)
    pace *= physics['hudKmhPerSpeed']
    return len(points) - 2, pace, pace * level['yetiGatePacePercent'] / 100, pace * level['missYetiGatePacePercent'] / 100


def report(config):
    lines = ['| Stage | Top km/h | Gate gap m | Gates | Clean downhill pace | Starting yeti | Missed-gate yeti |',
             '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for i, level in enumerate(config['arcade']['stages'], 1):
        gates, pace, yeti, missed = calculate(config, level)
        lines.append(f"| {i}. {level['name']} | {level['topSpeedKmh']} | {level['gateSpacingMetres']} | {gates} | {pace:.1f} | {yeti:.1f}" +
                     (f' | {missed:.1f} |' if level['missYetis'] else ' | — |'))
    return '\n'.join(lines)


if __name__ == '__main__':
    print(report(json.loads(Path(__file__).with_name('game-config.json').read_text())))
