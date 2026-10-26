"""Validate the editor schema during the offline build (standard library only)."""
def validate(value, schema, path='config'):
    kind = schema['type']
    def fail(message):
        raise ValueError(f'{path}: {message}')
    if kind == 'object':
        if not isinstance(value, dict): fail('expected object')
        for key in schema.get('required', []):
            if key not in value: fail(f'missing {key}')
        for key, item in value.items():
            child = schema['properties'].get(key)
            if child: validate(item, child, f'{path}.{key}')
            elif schema.get('additionalProperties') is False: fail(f'unknown setting {key}')
            elif isinstance(schema.get('additionalProperties'), dict): validate(item, schema['additionalProperties'], f'{path}.{key}')
    elif kind == 'array':
        if not isinstance(value, list): fail('expected array')
        if not schema.get('minItems', 0) <= len(value) <= schema.get('maxItems', float('inf')): fail('invalid array length')
        for i, item in enumerate(value):
            child = schema['prefixItems'][i] if 'prefixItems' in schema else schema['items']
            validate(item, child, f'{path}[{i}]')
    elif kind in ('number', 'integer'):
        import math
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value): fail('expected finite number')
        if kind == 'integer' and value != int(value): fail('expected integer')
        if not schema.get('minimum', -float('inf')) <= value <= schema.get('maximum', float('inf')): fail('out of range')
        if 'exclusiveMinimum' in schema and value <= schema['exclusiveMinimum']: fail(f'must be greater than {schema["exclusiveMinimum"]}')
    elif kind == 'boolean' and not isinstance(value, bool): fail('expected boolean')
    elif kind == 'string' and not isinstance(value, str): fail('expected string')
    if 'enum' in schema and value not in schema['enum']: fail('unknown value')
    if path == 'config':
        controls = value['controls']
        if controls.get('swipeLongPixels', 88) <= controls.get('swipeShortPixels', 22): fail('controls.swipeLongPixels must exceed swipeShortPixels')
        for course, target in value['timing']['targets'].items():
            if target['goldSeconds'] >= target['parSeconds']: fail(f'{course}: goldSeconds must be below parSeconds')
        if not value['arcade']['stages']: fail('arcade.stages needs at least one stage')
        for name in value['arcade']['stageOverrides']:
            if name not in value['arcade']['stages']: fail(f'stageOverrides has no stage named {name}')
        if value['arcade']['startStage'] > len(value['arcade']['stages']): fail('arcade.startStage exceeds the number of stages')
        base = value['arcade']['stageDefaults']
        for name in value['arcade']['stages']:
            if not name.strip(): fail('arcade.stages: name cannot be empty')
            over = value['arcade']['stageOverrides'].get(name, {})
            gates = {**base['gates'], **over.get('gates', {})}
            if gates['swordGateCount'] > gates['count']: fail(f'arcade.stages.{name}: swordGateCount exceeds gate count')
        crash_seconds = value['skiers'].get('crashSeconds', [4, 5])
        if crash_seconds[0] > crash_seconds[1]: fail('skiers.crashSeconds must be ordered')
        endless = value.get('endless')
        if endless and endless.get('maxPlayerSpeedKmh', 130) < endless['playerSpeedKmh']: fail('endless.maxPlayerSpeedKmh must be at least playerSpeedKmh')
        for key, pair in (endless or {}).get('encounters', {}).items():
            if isinstance(pair, list) and pair[0] > pair[1]: fail('endless.encounters.' + key + ' must be ordered')
        regions = (endless or {}).get('regions', {})
        ranges = [regions.get(key, []) for key in ['gapMetres', 'beginnerPeople', 'forestTreesPer100Metres', 'cemeteryOpeningMetres', 'denseForestDensity', 'scrambleDensity']]
        ranges += [regions.get('crowd', {}).get('people', [])]
        ranges += [regions.get('cemetery', {}).get(key, []) for key in ['crossingMetres', 'rows', 'chokeWidthMetres', 'clusterSpacingMetres']]
        ranges.append(regions.get('cemetery', {}).get('mausoleum', {}).get('count', []))
        ranges.append(regions.get('zombies', {}).get('graveWake', {}).get('count', []))
        special = regions.get('specialAreas', {}).get('rivalRace', {})
        ranges += [special.get('count', []), special.get('speedRatio', [])]
        if special.get('draftRangeMetres', 28) <= special.get('draftMinMetres', 4): fail('draftRangeMetres must exceed draftMinMetres')
        crowd = regions.get('crowd', {})
        if crowd.get('maximumGapMetres', 4200) < crowd.get('minimumGapMetres', 1600): fail('crowd maximumGapMetres must be at least minimumGapMetres')
        ranges += list(regions.get('lengthMetres', {}).values()) + list(regions.get('zombies', {}).get(key, []) for key in ['count', 'speedKmh', 'wandererCount', 'wandererSpeedKmh', 'roamerCount'])
        for pair in ranges:
            if pair and pair[0] > pair[1]: fail('endless.regions ranges must be ordered')
        wildlife = (endless or {}).get('wildlife', {})
        pack = wildlife.get('wolfPackSize', [2, 3])
        if pack[0] > pack[1]: fail('endless.wildlife.wolfPackSize must be ordered')
        if endless and endless['lakeRadiusMetres'][0] > endless['lakeRadiusMetres'][1]: fail('endless.lakeRadiusMetres must be ordered')
        if value['wildlife']['packMin'] > value['wildlife']['packMax']: fail('packMin must not exceed packMax')
        predators = value['predators']
        if predators.get('divertReleaseWidthMetres', 16) < predators.get('divertPathWidthMetres', 12): fail('divertReleaseWidthMetres must be at least divertPathWidthMetres')
        if predators.get('divertReleaseAngleDegrees', 60) < predators.get('divertPathAngleDegrees', 45): fail('divertReleaseAngleDegrees must be at least divertPathAngleDegrees')
        features = value['terrainFeatures']
        if features['rollingSnowball']['maxRadiusMetres'] < features['rollingSnowball']['radiusMetres']: fail('rollingSnowball.maxRadiusMetres must be at least radiusMetres')
        log = features['logJump']; units = value['world']['unitsPerMetre']
        if log['radiusMetres'] >= log['widthMetres'] / 2: fail('logJump.radiusMetres must be less than half widthMetres')
        if log['bumpGapMetres'] * units <= (log['radiusMetres'] + .6) * units + value['physics']['playerRadius']: fail('logJump.bumpGapMetres must leave room to take off before the log')
        for course in value['race']['entryChoices'] + value['race']['villageChoices']:
            if course not in value['courses']: fail(f'unknown course {course}')
