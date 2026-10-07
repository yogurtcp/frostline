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
        if 'exclusiveMinimum' in schema and value <= schema['exclusiveMinimum']: fail('must be positive')
    elif kind == 'boolean' and not isinstance(value, bool): fail('expected boolean')
    elif kind == 'string' and not isinstance(value, str): fail('expected string')
    if 'enum' in schema and value not in schema['enum']: fail('unknown value')
    if path == 'config':
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
        if value['wildlife']['packMin'] > value['wildlife']['packMax']: fail('packMin must not exceed packMax')
        for course in value['race']['entryChoices'] + value['race']['villageChoices']:
            if course not in value['courses']: fail(f'unknown course {course}')
