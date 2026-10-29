/* JSON is the source of tuning values. The embedded copy keeps file:// play self-contained. */
window.loadFrostlineConfig = async function () {
  let config = window.FROSTLINE_CONFIG;
  if (['http:', 'https:'].includes(window.location.protocol)) {
    const url = new URL('game-config.json', window.location.href);if(window.FROSTLINE_DEV)url.searchParams.set('dev','1');
    let response;
    try { response = await fetch(url, { cache: 'no-store' }); } catch (_) { /* Network loss: the embedded snapshot is playable offline. */ }
    if(response){if (!response.ok) throw new Error(`Cannot load game-config.json (${response.status})`);config = await response.json();}
  }
  config.endless ??= {"autoStart":false,"recordVersion":1,"playerSpeedKmh":90,"sectionMetres":240,"lookAheadMetres":180,"difficultyRampMetres":2800,"waveMetres":900,"itemSpreadMetres":55,"gates":{"spacingMetres":38,"openingMetres":[19,14],"swingMetres":[11,16],"swordEvery":8},"rates":{"trees":[0.9,3.8],"skiers":[0.8,4.8],"fastSkiers":[0,0.7],"lakes":[0.12,0.85],"jumps":[0.12,0.5]},"lakeRadiusMetres":[20,34],"firstLakeMetres":350,"yetis":{"firstMetres":700,"additionalEveryMetres":900,"intervalMetres":[650,300],"speedKmh":[68,94],"maxActive":4,"wakeSeconds":2.5,"retireBehindMetres":180}};
  config.endless.yetis.maxNearbyHunters ??= config.endless.yetis.maxActive ?? 4;
  config.endless.yetis.nearbyMetres ??= config.endless.yetis.retireBehindMetres ?? 180;
  config.endless.maxPlayerSpeedKmh ??= 130;
  config.endless.speedRampMetres ??= 9600;
  config.endless.encounters ??= {"firstMetres":450,"gapMetres":[300,480],"lengthMetres":[900,1200],"corridorWidthMetres":[14.4,23]};
  config.endless.encounters.difficultyVisits ??= 6;
  config.endless.encounters.routeSwingMetres ??= [38,55];
  config.endless.encounters.townStreetWidthMetres ??= [14.4,23];
  config.endless.encounters.townPeople ??= [36,120];
  config.endless.yetis.wakeMetres ??= 140;
  config.endless.yetis.ravager ??= {};
  for(const [key,value] of Object.entries({firstMetres:1200,every:4,speedMultiplier:1.15,noticeMetres:55}))config.endless.yetis.ravager[key] ??= value;
  config.chasers.dogCompanion ??= {};
  for(const [key,value] of Object.entries({feedMetres:8,maxFollowing:2,scareMetres:18,barkMetres:14,scareSeconds:2.5,retreatSeconds:3,followDistanceMetres:3.2,playRadiusMetres:5,cruiseSpeedKmh:24,catchUpSpeedKmh:16,challengeSeconds:1,challengeSpeedKmh:42}))config.chasers.dogCompanion[key] ??= value;
  const regionDefaults = {"enabled":true,"minimumWidthMetres":600,"order":["town","quiet","trees","lake","quiet","rivalRace","forest","cemetery","denseForest","scramble","quiet","christmas","quiet","halloween","quiet"],"firstMetres":450,"gapMetres":[0,0],"lengthMetres":{"beginner":[320,400],"quiet":[180,250],"lake":[240,330],"denseForest":[110,160],"forest":[300,450],"cemetery":[650,850],"crowd":[320,400],"scramble":[70,110]},"beginnerPeople":[65,140],"quietTreesPer100Metres":8,"forestTreesPer100Metres":[12,26],"cemeteryOpeningMetres":[12,18],"zombies":{"count":[8,14],"speedKmh":[7,11],"noticeMetres":22},"crowd":{"firstMetres":1200,"chance":0.55,"minimumGapMetres":1600,"maximumGapMetres":4200,"widthMetres":240,"people":[180,280]},"denseForestDensity":[1,2],"scrambleDensity":[1,1.35]};
  config.endless.regions ??= regionDefaults;
  for(const [key,value] of Object.entries(regionDefaults))config.endless.regions[key] ??= value;
  for(const [key,value] of Object.entries(regionDefaults.lengthMetres))config.endless.regions.lengthMetres[key] ??= value;
  const specialDefaults = {"widthScreens":3.5,"rivalRace":{"count":[3,5],"speedRatio":[1,1.08],"draftMinMetres":4,"draftRangeMetres":28,"draftWidthMetres":4,"draftChargeSeconds":0.8,"draftBoost":0.24,"gateQuota":0.75,"predators":true}};
  config.endless.regions.specialAreas ??= {};
  for(const [key,value] of Object.entries(specialDefaults)){
    config.endless.regions.specialAreas[key] ??= value;
    if(value&&typeof value==='object'&&!Array.isArray(value))for(const [field,fallback] of Object.entries(value))config.endless.regions.specialAreas[key][field] ??= fallback;
  }
  for(const [key,value] of Object.entries({rivalRace:[800,1000],christmas:[900,1200],halloween:[900,1200]}))config.endless.regions.lengthMetres[key] ??= value;
  config.endless.regions.crowd ??= regionDefaults.crowd;
  for(const [key,value] of Object.entries(regionDefaults.crowd))config.endless.regions.crowd[key] ??= value;
  config.endless.regions.cemetery ??= {};
  for(const [key,value] of Object.entries({widthScreens:3.5,ySpeedScale:.7,blendMetres:25,clusterSpacingMetres:[34,42]}))config.endless.regions.cemetery[key] ??= value;
  config.endless.regions.cemetery.mausoleum ??= {};
  for(const [key,value] of Object.entries({count:[6,10],noticeMetres:75,windupSeconds:.4,releaseSeconds:.45,speedMultiplier:8}))config.endless.regions.cemetery.mausoleum[key] ??= value;
  config.endless.regions.zombies.roamerCount ??= [18,36];
  config.endless.regions.zombies.downedSpeedMultiplier ??= 2;
  config.endless.regions.zombies.wandererCount ??= [72,144];
  config.endless.regions.zombies.wandererSpeedKmh ??= [10,18];
  config.endless.regions.zombies.graveWake ??= {};
  for(const [key,value] of Object.entries({count:[8,14],radiusMetres:140,intervalSeconds:.25}))config.endless.regions.zombies.graveWake[key] ??= value;
  config.endless.regions.zombies.ambush ??= {};
  for(const [key,value] of Object.entries({rangeMetres:24,windupSeconds:.6,leapSeconds:.65,maxLeapMetres:50,heightWorld:60}))config.endless.regions.zombies.ambush[key] ??= value;
  config.endless.wildlife ??= {firstMetres:650,intervalMetres:[360,200],maxNearby:6,wolfPackSize:[2,3],noticeMetres:55};
  config.skiers.crashSeconds ??= [4,5];
  config.skiers.getUpSeconds ??= .6;
  config.courses.endless ??= {"name":"Arcade","sub":"ONE SLOPE. NO FINISH.","length":540,"fee":0,"pace":156,"spacing":380,"density":1,"color":"#24716d","kind":"forest"};
  // Keep the old infinite-run ID and records; retire campaign entrances in older configs too.
  config.courses.endless.name = 'Arcade';
  for(const key of ['entryChoices','villageChoices'])config.race[key]=[...new Set(config.race[key].map(id=>id==='arcade'?'endless':id))];
  if(config.arcade.autoStart){config.endless.autoStart=true;config.arcade.autoStart=false;}
  config.arcade.gear.comboColors ??= ['#739391','#327f91','#bd7041'];
  config.chasers.yetiCelebrationSeconds ??= 2.2;
  config.chasers.yetiCelebrationHopsPerSecond ??= 2.4;
  config.chasers.yetiCelebrationJumpPixels ??= 14;
  config.arcade.yetiColors.special ??= '#772d4b';
  config.arcade.yetiTints.special ??= [64,38,57];
  config.village.names ??= ['Snowdrift','Pinehaven','Whitecap','Glacier Bend'];
  config.village.backRoute ??= {enabled:true,width:100,offset:310};
  config.arcade.stageFlow ??= {};
  config.arcade.stageFlow.townEveryStages ??= 3;
  config.arcade.stageFlow.linkedStageGapMetres ??= 0;
  config.predators.divertPathWidthMetres ??= 12;
  config.predators.divertReleaseWidthMetres ??= 16;
  config.predators.divertPathAngleDegrees ??= 45;
  config.predators.divertReleaseAngleDegrees ??= 60;
  config.predators.mealPauseSeconds ??= .8;
  config.night ??= {};
  for(const [key,value] of Object.entries({"enabled":true,"dayNightRounds":true,"playerRadiusMetres":14,"skierRadiusMetres":5,"lampRadiusMetres":24,"lampSpacingMetres":20,"lampSetbackMetres":7,"lightReachMultiplier":3.2,"ambientOpacity":0.97,"transitionSeconds":1.8}))config.night[key] ??= value;
  config.endless.regions.festivals ??= {};
  for(const [key,value] of Object.entries({"peopleMultiplier":1.6,"treeCrowd":[10,16],"santaFraction":0.24,"sleighEveryMetres":280,"reindeerPairs":3,"yetis":[2,4],"wolves":[4,8],"zombies":[20,40],"skeletons":[8,14]}))config.endless.regions.festivals[key] ??= value;
  config.endless.regions.festivals.christmasParade ??= {};
  for(const [key,value] of Object.entries({streetWidthMetres:[28,40],people:[75,120],houseSpacingMetres:20,lengthMultiplier:5,rainbowSpacingMetres:140}))config.endless.regions.festivals.christmasParade[key] ??= value;
  config.endless.regions.festivals.christmasParade.sideYetis ??= {};
  for(const [key,value] of Object.entries({delaySeconds:5,intervalSeconds:14,staggerSeconds:1.2,count:[16,24],maxNearby:4,slowSpeedKmh:68,fastSpeedKmh:94}))config.endless.regions.festivals.christmasParade.sideYetis[key] ??= value;
  config.endless.regions.order=config.endless.regions.order.map(kind=>({marsh:"christmas",bowls:"halloween"}[kind]||kind));
  for(const kind of ['marsh','bowls']){delete config.endless.regions.specialAreas[kind];delete config.endless.regions.lengthMetres[kind];}
  config.controls.tapBottomFraction ??= .24;
  config.controls.swipeShortPixels ??= 22;
  config.controls.swipeLongPixels ??= 88;
  const yetiFrames = {"yetiWhiteIdle":["yetis",0,0,30,34],"yetiWhiteRunL":["yetis",30,0,30,34],"yetiWhiteRunR":["yetis",60,0,30,34],"yetiAvalancheIdle":["yetis",90,0,30,34],"yetiAvalancheRunL":["yetis",120,0,30,34],"yetiAvalancheRunR":["yetis",150,0,30,34],"yetiStalkerIdle":["yetis",180,0,30,34],"yetiStalkerRunL":["yetis",210,0,30,34],"yetiStalkerRunR":["yetis",240,0,30,34]};
  yetiFrames.yetiStiltwalkerIdle=['stiltwalker',0,0,24,38];
  for(const [key,frame] of Object.entries(yetiFrames))config.atlas[key] ??= frame;
  config.wildlife.ramSpeedFraction ??= .85;
  config.physics.releaseTurnFollow ??= 3;
  config.village.populationMultiplier ??= 2;
  const regionRanges = ['gapMetres','beginnerPeople','forestTreesPer100Metres','cemeteryOpeningMetres','denseForestDensity','scrambleDensity'].map(key=>config.endless.regions[key]).concat(Object.values(config.endless.regions.lengthMetres),[config.endless.regions.specialAreas.rivalRace.count,config.endless.regions.specialAreas.rivalRace.speedRatio,config.endless.regions.cemetery.clusterSpacingMetres,config.endless.regions.cemetery.mausoleum.count,config.endless.regions.zombies.wandererCount,config.endless.regions.zombies.graveWake.count,config.endless.regions.zombies.roamerCount,config.endless.regions.zombies.wandererSpeedKmh,config.endless.regions.zombies.count,config.endless.regions.zombies.speedKmh,config.endless.regions.crowd.people],['crossingMetres','rows','chokeWidthMetres'].map(key=>config.endless.regions.cemetery[key]).filter(Array.isArray));
  regionRanges.push(...Object.values(config.endless.regions.festivals).filter(Array.isArray));
  regionRanges.push(config.endless.regions.festivals.christmasParade.streetWidthMetres,config.endless.regions.festivals.christmasParade.people,config.endless.regions.festivals.christmasParade.sideYetis.count);
  if(config.endless.regions.specialAreas.rivalRace.draftRangeMetres<=config.endless.regions.specialAreas.rivalRace.draftMinMetres)throw new Error('draftRangeMetres must exceed draftMinMetres');
  if(config.endless.regions.crowd.maximumGapMetres<config.endless.regions.crowd.minimumGapMetres)throw new Error('crowd maximumGapMetres must be at least minimumGapMetres');
  if(regionRanges.some(pair=>pair[0]>pair[1]))throw new Error('endless.regions ranges must be ordered');
  if(config.controls.swipeLongPixels<=config.controls.swipeShortPixels)throw new Error('controls.swipeLongPixels must exceed swipeShortPixels');
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
  const status=document.getElementById('app-status');if(status)status.hidden=true;
  const message = document.createElement('pre');
  message.textContent = `Frostline could not start.\n${error.message}\nCheck game-config.json and reload.`;
  message.style.cssText = 'position:absolute;inset:20px;white-space:pre-wrap;font:14px monospace;color:#244451';
  document.querySelector('main').appendChild(message);
};
