/* JSON is the source of tuning values. The embedded copy keeps file:// play self-contained. */
window.loadFrostlineConfig = async function () {
  let config = window.FROSTLINE_CONFIG;
  if (['http:', 'https:'].includes(window.location.protocol)) {
    const response = await fetch(new URL('game-config.json', window.location.href), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Cannot load game-config.json (${response.status})`);
    config = await response.json();
  }
  config.endless ??= {"autoStart":false,"recordVersion":1,"playerSpeedKmh":90,"sectionMetres":240,"lookAheadMetres":180,"difficultyRampMetres":2800,"waveMetres":900,"itemSpreadMetres":55,"gates":{"spacingMetres":38,"openingMetres":[19,14],"swingMetres":[11,16],"swordEvery":8},"rates":{"trees":[0.9,3.8],"skiers":[0.8,4.8],"fastSkiers":[0,0.7],"lakes":[0.12,0.85],"jumps":[0.12,0.5]},"lakeRadiusMetres":[20,34],"firstLakeMetres":350,"yetis":{"firstMetres":700,"additionalEveryMetres":900,"intervalMetres":[650,300],"speedKmh":[68,94],"maxActive":4,"wakeSeconds":2.5,"retireBehindMetres":180}};
  config.endless.yetis.maxNearbyHunters ??= config.endless.yetis.maxActive ?? 4;
  config.endless.yetis.nearbyMetres ??= config.endless.yetis.retireBehindMetres ?? 180;
  config.endless.maxPlayerSpeedKmh ??= 130;
  config.endless.speedRampMetres ??= 2400;
  config.endless.encounters ??= {"firstMetres":450,"gapMetres":[300,480],"lengthMetres":[900,1200],"corridorWidthMetres":[14.4,23]};
  config.endless.encounters.difficultyVisits ??= 6;
  config.endless.encounters.routeSwingMetres ??= [38,55];
  config.endless.encounters.townStreetWidthMetres ??= [14.4,23];
  config.endless.encounters.townPeople ??= [18,60];
  config.endless.yetis.wakeMetres ??= 140;
  config.endless.wildlife ??= {firstMetres:650,intervalMetres:[360,200],maxNearby:6,wolfPackSize:[2,3],noticeMetres:55};
  config.skiers.crashSeconds ??= [4,5];
  config.skiers.getUpSeconds ??= .6;
  config.courses.endless ??= {"name":"Endless Mixed Slalom","sub":"ONE SLOPE. NO FINISH.","length":540,"fee":0,"pace":156,"spacing":380,"density":1,"color":"#24716d","kind":"forest"};
  config.arcade.gear.comboColors ??= ['#739391','#327f91','#bd7041'];
  config.chasers.yetiCelebrationSeconds ??= 2.2;
  config.chasers.yetiCelebrationHopsPerSecond ??= 2.4;
  config.chasers.yetiCelebrationJumpPixels ??= 14;
  config.arcade.yetiColors.special ??= '#c844a2';
  config.arcade.yetiTints.special ??= [212,30,156];
  config.village.names ??= ['Snowdrift','Pinehaven','Whitecap','Glacier Bend'];
  config.village.backRoute ??= {enabled:true,width:100,offset:310};
  config.arcade.stageFlow ??= {};
  config.arcade.stageFlow.townEveryStages ??= 3;
  config.arcade.stageFlow.linkedStageGapMetres ??= 0;
  config.predators.divertPathWidthMetres ??= 8;
  config.predators.divertReleaseWidthMetres ??= 12;
  config.predators.divertPathAngleDegrees ??= 30;
  config.predators.divertReleaseAngleDegrees ??= 45;
  function validate(value, schema, path) {
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
      for (const key of schema.required || []) if (!(key in value)) throw new Error(`${path}.${key} is missing`);
      for (const [key, item] of Object.entries(value)) {
        if (schema.properties[key]) validate(item, schema.properties[key], `${path}.${key}`);
        else if (schema.additionalProperties === false) throw new Error(`Unknown setting ${path}.${key}`);
        else if (schema.additionalProperties) validate(item, schema.additionalProperties, `${path}.${key}`);
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
  if (!Object.keys(config.arcade.stages).length) throw new Error('arcade.stages needs at least one stage');
  for (const name of Object.keys(config.arcade.stageOverrides)) if (!(name in config.arcade.stages)) throw new Error(`stageOverrides has no stage named ${name}`);
  config.arcade.stages = Object.entries(config.arcade.stages).map(([name, knobs], index) => {
    const base = config.arcade.stageDefaults, over = config.arcade.stageOverrides[name] || {};
    return { name, knobs,
      yetiColor: over.yetiColor ?? base.yetiColor,
      gates: { ...base.gates, ...(over.gates || {}) },
      tierRates: { ...base.tierRates, ...(over.tierRates || {}) },
      itemRates: { ...base.itemRates, ...(over.itemRates || {}) },
      itemSpreadMetres: over.itemSpreadMetres ?? base.itemSpreadMetres,
      endTrafficMultiplier: over.endTrafficMultiplier ?? base.endTrafficMultiplier,
      specialLayout: over.specialLayout ?? 'none',
      briefing: over.briefing ?? '',
      townAfter: over.townAfter ?? ((index+1)%config.arcade.stageFlow.townEveryStages===0),
      yetiSpeedPercent: over.yetiSpeedPercent ?? null,
      yetiSpeedKmh: over.yetiSpeedKmh ?? null,
      yetiWakeSeconds: over.yetiWakeSeconds ?? null };
  });
  for (const [id, target] of Object.entries(config.timing.targets)) {
    if (!(target.goldSeconds < target.parSeconds)) throw new Error(`timing.targets.${id}: goldSeconds must be below parSeconds`);
  }
  if(config.arcade.startStage>config.arcade.stages.length)throw new Error('arcade.startStage exceeds the number of stages');
  for(const [i,stage] of config.arcade.stages.entries()){
    if(!stage.name.trim())throw new Error(`arcade.stages[${i}]: name cannot be empty`);
    if(stage.gates.swordGateCount>stage.gates.count)throw new Error(`arcade.stages[${i}]: swordGateCount exceeds gate count`);
  }
  if(config.skiers.crashSeconds[0]>config.skiers.crashSeconds[1])throw new Error('skiers.crashSeconds must be ordered');
  if(config.endless.maxPlayerSpeedKmh<config.endless.playerSpeedKmh)throw new Error('endless.maxPlayerSpeedKmh must be at least playerSpeedKmh');
  for(const [key,pair] of Object.entries(config.endless.encounters))if(Array.isArray(pair)&&pair[0]>pair[1])throw new Error('endless.encounters.'+key+' must be ordered');
  if(config.endless.wildlife.wolfPackSize[0]>config.endless.wildlife.wolfPackSize[1])throw new Error('endless.wildlife.wolfPackSize must be ordered');
  if(config.endless.lakeRadiusMetres[0]>config.endless.lakeRadiusMetres[1])throw new Error('endless.lakeRadiusMetres must be ordered');
  if (config.wildlife.packMin > config.wildlife.packMax) throw new Error('packMin must not exceed packMax');
  if(config.predators.divertReleaseWidthMetres<config.predators.divertPathWidthMetres)throw new Error('divertReleaseWidthMetres must be at least divertPathWidthMetres');
  if(config.predators.divertReleaseAngleDegrees<config.predators.divertPathAngleDegrees)throw new Error('divertReleaseAngleDegrees must be at least divertPathAngleDegrees');
  const features=config.terrainFeatures;
  if(features.rollingSnowball.maxRadiusMetres<features.rollingSnowball.radiusMetres)throw new Error('rollingSnowball.maxRadiusMetres must be at least radiusMetres');
  if(features.logJump.radiusMetres>=features.logJump.widthMetres/2)throw new Error('logJump.radiusMetres must be less than half widthMetres');
  if(features.logJump.bumpGapMetres*config.world.unitsPerMetre<=(features.logJump.radiusMetres+.6)*config.world.unitsPerMetre+config.physics.playerRadius)throw new Error('logJump.bumpGapMetres must leave room to take off before the log');
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
