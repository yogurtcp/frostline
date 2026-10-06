/* JSON is the source of tuning values. The embedded copy keeps file:// play self-contained. */
window.loadFrostlineConfig = async function () {
  let config = window.FROSTLINE_CONFIG;
  if (['http:', 'https:'].includes(window.location.protocol)) {
    const response = await fetch(new URL('game-config.json', window.location.href), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Cannot load game-config.json (${response.status})`);
    config = await response.json();
  }
  function validate(value, schema, path) {
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
      for (const key of schema.required || []) if (!(key in value)) throw new Error(`${path}.${key} is missing`);
      for (const [key, item] of Object.entries(value)) {
        if (schema.properties[key]) validate(item, schema.properties[key], `${path}.${key}`);
        else if (schema.additionalProperties === false) throw new Error(`Unknown setting ${path}.${key}`);
      }
    } else if (schema.type === 'array') {
      if (!Array.isArray(value) || value.length < (schema.minItems || 0) || value.length > (schema.maxItems ?? Infinity)) throw new Error(`${path} has an invalid length`);
      value.forEach((item, i) => validate(item, schema.prefixItems?.[i] || schema.items, `${path}[${i}]`));
    } else {
      const type = schema.type;
      if (type === 'number' || type === 'integer') {
        if (!Number.isFinite(value) || type === 'integer' && !Number.isInteger(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity) || schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) throw new Error(`${path} is out of range`);
      } else if (typeof value !== type) throw new Error(`${path} must be ${type}`);
      if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} has an unknown value`);
    }
  }
  validate(config, window.FROSTLINE_SCHEMA, 'config');
  for (const [id, target] of Object.entries(config.timing.targets)) {
    if (!(target.goldSeconds < target.parSeconds)) throw new Error(`timing.targets.${id}: goldSeconds must be below parSeconds`);
  }
  for (const [i, stage] of config.arcade.stages.entries()) {
    if (stage.yetis > 0 && (stage.yetiTier === 'none' || stage.yetiGatePacePercent <= 0)) throw new Error(`arcade.stages[${i}]: starting yetis need a tier and positive yetiGatePacePercent`);
    if (stage.missYetis > 0 && (stage.missTier === 'none' || stage.missYetiGatePacePercent <= 0)) throw new Error(`arcade.stages[${i}]: missed-gate yetis need a missTier and positive missYetiGatePacePercent`);
  }
  if (config.wildlife.packMin > config.wildlife.packMax) throw new Error('packMin must not exceed packMax');
  for (const id of [...config.race.entryChoices, ...config.race.villageChoices]) if (!config.courses[id]) throw new Error(`Unknown course ${id}`);
  return config;
};
window.showFrostlineError = function (error) {
  console.error(error);
  const message = document.createElement('pre');
  message.textContent = `Frostline could not start.\n${error.message}\nCheck game-config.json and reload.`;
  message.style.cssText = 'position:absolute;inset:20px;white-space:pre-wrap;font:14px monospace;color:#244451';
  document.querySelector('main').appendChild(message);
};
