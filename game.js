/* Frostline. All navigation is physical: ski through a gate, finish, keep skiing. */
window.FROSTLINE_READY = (async () => {
  'use strict';
  if(window.FROSTLINE_BOOT)await window.FROSTLINE_BOOT;
  const S = await window.loadFrostlineConfig();
  const canvas = document.getElementById('slope');
  const skiingLabel=canvas.getAttribute('aria-label');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = S.render.width, PX_PER_M = S.world.unitsPerMetre, ZOOM = S.render.zoom, TAU = Math.PI * 2;
  let H = S.render.defaultHeight, clock = 0, lastTime = 0, accumulator = 0, audio = null;
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const mix = (a,b,t) => a + (b-a)*t;
  const ease = (a,b,s,dt) => mix(a,b,1-Math.exp(-s*dt));
  const pick = arr => arr[Math.floor(random()*arr.length)];
  let seed = Math.floor(Math.random()*4294967296) >>> 0;
  function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }
  const range = (a,b) => a + random()*(b-a);
  const C = S.colors, stages = S.courses;
  const MONSTER_KINDS=new Set(['wolf','bear','lurker','zombie','fast','slow']);
  const ENDLESS_DEBUG_AREAS=['forest','trees','town','crowd','quiet','cemetery','lake','denseForest','scramble','rivalRace','christmas','halloween'];
  const WIDE_REGIONS=new Set(['town','christmas','halloween','trees','cemetery','denseForest','scramble','crowd','beginner']);
  // __SPECIAL_AREAS_CODE__
  // __SEASONAL_AREAS_CODE__
  // __ART_DIRECTION_CODE__
  // Source rectangles in the actual generated PNG atlases. No stand-in art.
  const atlas = S.atlas;
  const images = {}, spriteCache = new Map();
  const palette = S.palette;
  const paletteRGB=palette.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
  const exactPalette=new Map(paletteRGB.map(rgb=>[(rgb[0]<<16)|(rgb[1]<<8)|rgb[2],rgb]));
  let ready = false;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('frostline-v2') || localStorage.getItem('frostline-save') || '{}'); } catch {}
  if(!stored||typeof stored!=='object'||Array.isArray(stored))stored={};
  for(const key of ['best','times'])if(!stored[key]||typeof stored[key]!=='object'||Array.isArray(stored[key]))stored[key]={};
  const state = {
    bank:Number.isFinite(stored.bank)?Math.max(0,Math.floor(stored.bank)):0,
    nightOverride:null,nightBlend:0,cocoaShields:Number.isFinite(stored.cocoaShields)?Math.max(0,Math.floor(stored.cocoaShields)):0,sceneCard:null,cocoaEffect:null,
    best:stored.best || {}, times:stored.times || {}, muted:stored.muted ?? false, started:false, activeTime:0,
    p:newPlayer(),arcade:null,arcadeResult:null,arcadeRecord:stored.arcadeRecord?.campaignVersion===S.arcade.campaignVersion?stored.arcadeRecord:{campaignVersion:S.arcade.campaignVersion,previousCampaign:stored.arcadeRecord||null},
    endless:null,endlessResult:null,endlessDebug:{selection:null,visits:{},seeds:{}},endlessRecord:stored.endlessRecord?.version===S.endless.recordVersion?stored.endlessRecord:{version:S.endless.recordVersion,distance:0,previousVersion:stored.endlessRecord||null},
    cam:{x:0,y:-H*S.render.playerScreenY/ZOOM}, zone:{kind:'start',origin:0}, course:null,
    objects:[], trails:[], snowballTrails:[], chasers:[], patrolPenalty:null, particles:[], speech:[], messages:[],
    input:{left:false,right:false,up:false,down:false,pointer:null,jump:false},
    lastTrack:null, generated:0, gateCount:0, elevated:0, screenShake:0, finishCount:0,
    freefallAt:0,nextFastSkier:2, results:null, receipts:[], transitions:[], soundReady:false,
    chunks:new Map(),safeTrails:[],roads:[],villages:[],liftRoutes:[],plannedTown:null,deathTimer:0,liftTimer:0,deaths:0,keyboardStep:0,control:'keyboard',lastSteer:-10
  };
  function newPlayer(){return {x:0,y:0,vx:0,vy:0,speed:0,heading:Math.PI/2,desiredHeading:Math.PI/2,mode:'still',awaitingInput:false,crashObstacle:null,slowContacts:new Set(),fall:0,shield:0,air:0,airTotal:0,jumpHeight:0,spin:0,boost:0,gateBoost:0,jumpLock:0,onIce:false,iceHeading:0,icePushPending:false,airHeading:0,airSpeed:0,airSpin:0,airPose:0,airTuck:0,landingSteer:null,onRugged:false,rainbow:0};}
  function viewBounds(){return {left:state.cam.x-W/(2*ZOOM),right:state.cam.x+W/(2*ZOOM),top:state.cam.y,bottom:state.cam.y+H/ZOOM};}
  function belowView(margin=330){return Math.max(viewBounds().bottom,state.p.y+H*(1-S.render.playerScreenY)/ZOOM)+margin;}
  function topSpeed(){return (state.course?stages[state.course.id].pace:state.zone.kind==='village'?S.physics.villagePace:S.physics.freePace)*S.physics.speedMultiplier;}
  function save() { try { localStorage.setItem('frostline-v2',JSON.stringify({bank:state.bank,cocoaShields:state.cocoaShields,best:state.best,times:state.times,muted:state.muted,arcadeRecord:state.arcadeRecord,endlessRecord:state.endlessRecord})); } catch {} }
  function beep(freq,duration=.07,type='sine',gain=.025) {
    if(state.muted || !state.soundReady)return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration); } catch {}
  }
  function announce(title,detail='',color=C.teal,duration=S.render.messageSeconds) { state.messages.push({title,detail,color,until:clock+duration,start:clock});if(state.messages.length>S.render.messageLimit)state.messages.shift(); }
  function say(text,o,time=S.render.speechSeconds) { state.speech.push({text,object:o,until:clock+time}); if(state.speech.length>S.render.speechLimit)state.speech.shift(); }
  function burst(x,y,color,n=12) { for(let i=0;i<n;i++)state.particles.push({x,y,vx:range(-50,50),vy:range(-65,30),life:range(.25,.75),color}); }
  function filterObjects(keep){
    const source=state.objects;let result=null;
    for(let i=0;i<source.length;i++){const o=source[i];if(keep(o)){if(result)result.push(o);}else if(!result)result=source.slice(0,i);}
    if(result)state.objects=result;
  }
  function entity(type,x,y,extra={}) {
    const o={type,x,y,homeX:x,homeY:y,id:random(),width:40,r:13,phase:range(0,TAU),touched:false,...extra};
    if((type==='pine'||type==='fir')&&!o.treeVariant)o.treeVariant=pick(S.spawnTables.treeVariants);
    if(type==='fallingTree'){
      const f=S.terrainFeatures.fallingTree,a=atlas.fallingTree;
      o.treeLength=f.heightMetres*PX_PER_M;o.width=o.treeLength*a[3]/a[4];o.r=f.trunkRadiusMetres*PX_PER_M;o.fallState='standing';
    }
    if(type==='wideLog'){
      const f=S.terrainFeatures.logJump;
      o.width=f.widthMetres*PX_PER_M;o.height=f.heightMetres*PX_PER_M;o.r=f.radiusMetres*PX_PER_M;
      const bump=entity('logBump',x,y-f.bumpGapMetres*PX_PER_M,{width:f.bumpWidthMetres*PX_PER_M,r:.6*PX_PER_M,arcadeRun:o.arcadeRun,arcadeFeature:true,log:o});o.bump=bump;
    }
    if(type==='rollingSnowball'){
      const f=S.terrainFeatures.rollingSnowball;
      o.r=f.radiusMetres*PX_PER_M;o.width=o.r*2;o.rollState='waiting';o.rollSide=extra.rollSide||pick([-1,1]);o.rollDistance=0;o.rollAngle=0;
    }
    state.objects.push(o);if(type==='ice')iceCacheTime=-1;return o;
  }

  function entrance(id,x,y) { return entity('entrance',x,y,{stage:id,half:S.race.entryHalfWidth,width:S.race.entryHalfWidth*2,r:0}); }
  function clearEntrances(){const gates=state.objects.filter(o=>o.type==='entrance');state.objects=state.objects.filter(o=>o.r===0||!gates.some(g=>Math.abs(o.x-g.x)<g.half+40&&o.y>g.y-160&&o.y<g.y+50));}
  function startMeadow() {
    entity('lodge',-190,100,{width:140,r:50});
    entity('pine',185,105,{width:86,r:18});entity('fir',232,190,{width:63,r:16});
    entity('bush',-222,210,{width:42,r:12});entity('personYellow',-101,138,{width:32,r:11});
    entity('dog',91,187,{width:34,r:11,roam:20});
    const choices=S.race.entryChoices,spacing=Math.min(S.arcade.entranceSpacing,(W-24)/ZOOM/choices.length);
    const half=Math.min(S.race.entryHalfWidth,spacing*.42);
    choices.forEach((id,i)=>Object.assign(entrance(id,(i-(choices.length-1)/2)*spacing,450),{half,width:half*2,summit:true}));
    for(let i=0;i<22;i++){
      const side=i%2?1:-1,y=-280+i*65,x=side*range(375,610);
      entity(i%3?'pine':'fir',x,y,{width:range(58,91),r:17});
    }
    entity('skier',-198,840,{width:42,r:13,vy:45,vx:4});entity('mushroom',164,810,{width:37,r:12});
    clearEntrances();
  }
  function centerAt(y,run=state.course) {
    if(!run)return 0;
    if(run.arcade)return run.x;
    return run.x + (Math.sin((y-run.startY)/S.world.courseWavelength[0])*S.world.courseSway[0] + Math.sin((y-run.startY)/S.world.courseWavelength[1])*S.world.courseSway[1]);
  }
  function arcadePathX(run,y){
    if(run.arcade.specialLayout==='momentum'&&run.gateYs){
      const ys=run.gateYs,xs=run.gateXs,last=ys.length-1;
      if(y<ys[0])return mix(run.x,xs[0],clamp((y-run.startY)/(ys[0]-run.startY),0,1));
      if(y>=ys[last])return mix(xs[last],run.x,clamp((y-ys[last])/(run.endY-ys[last]),0,1));
      const i=arcadeGateGap(run,y);return mix(xs[i],xs[i+1],(y-ys[i])/(ys[i+1]-ys[i]));
    }
    const g=run.arcade.gates,first=run.startY+g.firstGateMetres*PX_PER_M,spacing=run.arcade.spacing,swing=g.horizontalDistanceMetres*PX_PER_M/2;
    const n=(y-first)/spacing,last=g.count-1;
    if(n<0)return mix(run.x,run.x-swing,clamp((y-run.startY)/(first-run.startY),0,1));
    if(n>=last)return mix(run.x+(last%2?1:-1)*swing,run.x,clamp((y-first-last*spacing)/(run.endY-first-last*spacing),0,1));
    const i=Math.floor(n);return run.x+mix((i%2?1:-1)*swing,(i%2?-1:1)*swing,n-i);
  }
  function arcadeEncounterY(run,y){
    if(run.arcade.specialLayout==='momentum'&&run.gateYs.length>1){const i=arcadeGateGap(run,y);return (run.gateYs[i]+run.gateYs[i+1])/2;}
    const first=run.startY+run.arcade.gates.firstGateMetres*PX_PER_M;
    if(run.arcade.gates.count<2)return (first+run.endY)/2;
    const gap=clamp(Math.floor((y-first)/run.arcade.spacing),0,run.arcade.gates.count-2);
    return first+(gap+.5)*run.arcade.spacing;
  }
  function arcadeGateGap(run,y){
    const ys=run.gateYs;let low=0,high=ys.length-1;
    while(low+1<high){const middle=(low+high)>>1;if(ys[middle]<=y)low=middle;else high=middle;}
    return Math.min(low,ys.length-2);
  }
  function momentumJumpPlans(gateCount){
    const gaps=gateCount-1,count=Math.floor(gaps/3),plans=[];
    for(let n=0;n<count;n++){
      const first=Math.floor(n*gaps/count),last=Math.floor((n+1)*gaps/count)-1;
      plans.push({gap:Math.floor(range(first+1,last+1)),kind:n%2?'rainbow':'largeHill',risky:false});
    }
    // Keep the big-jump mix, but vary both its order and which encounters compete with a gate.
    const kinds=plans.map(p=>p.kind),candidates=plans.slice(1,-1);
    for(let i=kinds.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    plans.forEach((p,i)=>p.kind=kinds[i]);
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    candidates.slice(0,Math.floor(count/3)).forEach(p=>p.risky=true);
    return plans;
  }
  function momentumJumpCap(kind){return kind==='largeHill'?S.jump.hillDurationMax:Math.min(1.3,S.jump.durationMax);}
  function momentumJumpDuration(kind){return (kind==='largeHill'?S.jump.largeHillSeconds:S.jump.rainbowSeconds)*momentumJumpCap(kind);}
  const ARCADE_ITEMS={
    "pine":{"type":"pine","width":70,"r":14,"treeVariant":"classic"},
    "fir":{"type":"fir","width":70,"r":14,"treeVariant":"classic"},
    "smallPine":{"type":"pine","width":48,"r":14,"treeVariant":"classic","smallPine":true},
    "spruceTree":{"type":"pine","width":70,"r":17,"treeVariant":"spruce"},
    "crookedTree":{"type":"pine","width":70,"r":17,"treeVariant":"crooked"},
    "cedarTree":{"type":"pine","width":70,"r":17,"treeVariant":"cedar"},
    "alpineTree":{"type":"pine","width":70,"r":17,"treeVariant":"alpine"},
    "rock":{"type":"rock","width":47,"r":13},
    "pebble":{"type":"pebble","width":28,"r":10},
    "stump":{"type":"stump","width":45,"r":13},
    "bush":{"type":"bush","width":35,"r":10},
    "mushroom":{"type":"mushroom","width":37,"r":13},
    "sled":{"type":"sled","width":45,"r":13},
    "snowball":{"type":"snowball","width":34,"r":12},
    "fallingTree":{"type":"fallingTree","width":70,"r":12,"arcadeFeature":true},
    "logJump":{"type":"wideLog","width":50,"r":6,"arcadeFeature":true},
    "rollingSnowball":{"type":"rollingSnowball","width":40,"r":20,"arcadeFeature":true},
    "ramp":{"type":"ramp","width":65,"r":22,"arcadeFeature":true},
    "mogul":{"type":"mogul","width":40,"r":20,"arcadeFeature":true},
    "rainbow":{"type":"rainbow","width":115,"r":25,"arcadeFeature":true},
    "smallHill":{"type":"smallHill","width":55,"r":24,"arcadeFeature":true},
    "largeHill":{"type":"largeHill","width":110,"r":45,"arcadeFeature":true},
    "smallLake":{"type":"ice","width":170,"r":0,"rx":85,"ry":105,"arcadeFeature":true},
    "largeLake":{"type":"ice","width":370,"r":0,"rx":185,"ry":250,"arcadeFeature":true},
    "rugged":{"type":"rugged","width":220,"r":0,"rx":110,"ry":80},
    "skier":{"type":"skier","width":42,"r":12,"fast":false},
    "fastSkier":{"type":"skier","width":42,"r":12,"fast":true},
    "overtakingSkier":{"type":"skier","width":42,"r":12,"fast":true},
    "boarder":{"type":"boarder","width":42,"r":12,"fast":false},
    "personRed":{"type":"personRed","width":30,"r":10},
    "personYellow":{"type":"personYellow","width":30,"r":10},
    "personGreen":{"type":"personGreen","width":30,"r":10},
    "dog":{"type":"dog","width":34,"r":10,"roam":15},
    "cat":{"type":"cat","width":27,"r":8,"animal":true,"ai":"idle","climb":0},
    "rabbit":{"type":"rabbit","width":20,"r":5,"animal":true,"ai":"idle","climb":0},
    "fox":{"type":"fox","width":39,"r":10,"animal":true,"ai":"idle","climb":0},
    "wolf":{"type":"wolf","width":43,"r":11,"animal":true,"ai":"idle","climb":0},
    "bear":{"type":"bear","width":60,"r":18,"animal":true,"ai":"idle","climb":0},
    "wolfPack":{"type":"wolf","width":43,"r":11,"animal":true,"ai":"idle"},
    "yetiTeal":{"type":"lurker","width":55,"r":18,"arcadeTier":"slow"},
    "yetiOrange":{"type":"lurker","width":55,"r":18,"arcadeTier":"fast"},
    "yetiViolet":{"type":"lurker","width":55,"r":18,"arcadeTier":"elite"},
    // Town flavor: houses, props, decor and paths never scatter on arcade courses (courses are forest).
    "lodge":{"type":"lodge","width":150,"r":67,"buildingKind":"cottage","floors":1,"noCourse":true},
    "rental":{"type":"rental","width":150,"r":67,"buildingKind":"rental","floors":1,"noCourse":true},
    "cottage":{"type":"lodge","width":150,"r":67,"buildingKind":"cottage","floors":1,"noCourse":true},
    "chalet":{"type":"lodge","width":150,"r":67,"buildingKind":"chalet","floors":1,"noCourse":true},
    "inn":{"type":"rental","width":150,"r":67,"buildingKind":"inn","floors":1,"noCourse":true},
    "cafe":{"type":"rental","width":150,"r":67,"buildingKind":"cafe","floors":1,"noCourse":true},
    "hotel":{"type":"lodge","width":150,"r":67,"buildingKind":"hotel","floors":2,"noCourse":true},
    "skiShop":{"type":"rental","width":150,"r":67,"buildingKind":"rental","floors":1,"noCourse":true},
    "lamp":{"type":"lamp","width":20,"r":6,"noCourse":true},
    "bench":{"type":"bench","width":46,"r":9,"noCourse":true},
    "snowman":{"type":"snowman","width":28,"r":9,"noCourse":true},
    "bunting":{"type":"bunting","width":180,"r":0,"noCourse":true},
    "powderPile":{"type":"powderPile","width":45,"r":23,"villageDetail":true,"mischief":true,"noCourse":true},
    "pigeons":{"type":"pigeons","width":50,"r":25,"villageDetail":true,"mischief":true,"noCourse":true},
    "breadStand":{"type":"breadStand","width":70,"r":23,"villageDetail":true,"noCourse":true},
    "skiRack":{"type":"skiRack","width":70,"r":23,"villageDetail":true,"noCourse":true},
    "lift":{"type":"lift","width":174,"r":0,"half":73,"used":false,"noCourse":true},
    "sign":{"type":"sign","width":50,"r":0,"noCourse":true},
    "flag":{"type":"flag","width":30,"r":0,"noCourse":true},
    "star":{"type":"star","width":20,"r":0,"noCourse":true},
    "snowPath":{"type":"path","width":56,"r":0,"surface":"snow","noCourse":true},
    "pavedPath":{"type":"path","width":56,"r":0,"surface":"paved","noCourse":true}
  };
  const yetiTierForColor={teal:'slow',orange:'fast',violet:'elite',magenta:'special'};
  function arcadeItemRate(stage,key){const override=stage.itemRates?.[key];if(override!==undefined)return override;const tier=S.arcade.itemTiers[key];return tier==='common'?S.arcade.knobLevels.obstacles[stage.knobs[0]-1]:stage.tierRates[tier];}
  function arcadeStage(index){
    const a=S.arcade.stages[index],K=S.arcade.knobLevels,[,lc,lm,ls,li]=a.knobs;
    const top=K.speed[ls-1],baseChaseSpeed=K.chaseSpeedPercent[lc-1]*top/100,chaseSpeed=a.yetiSpeedKmh??(a.yetiSpeedPercent===null?baseChaseSpeed:a.yetiSpeedPercent*top/100),gs=K.gateSpacing;
    const straight=a.specialLayout==='jumpLine';
    const g={count:a.gates.count,swordGateCount:a.gates.swordGateCount,icePercent:K.iceGatePercent[li-1],
      horizontalDistanceMetres:straight?0:top*gs.horizontalPercent/100,verticalDistanceMetres:top*gs.verticalPercent/100,
      openingWidthMetres:top*gs.openingPercent/100,firstGateMetres:top*gs.firstPercent/100,
      finishAfterLastGateMetres:top*gs.finishPercent/100};
    return {...a,gates:g,length:g.firstGateMetres+(g.count-1)*g.verticalDistanceMetres+g.finishAfterLastGateMetres,
      pace:top/(S.physics.speedMultiplier*S.physics.hudKmhPerSpeed),spacing:g.verticalDistanceMetres*PX_PER_M,
      trees:Object.keys(ARCADE_ITEMS).some(key=>arcadeItemRate(a,key)>0&&ARCADE_ITEMS[key].treeVariant),
      yetiTier:yetiTierForColor[a.yetiColor],yetis:K.chaseCount[lc-1],yetiSpeedKmh:chaseSpeed,
      missPercent:K.missGatePercent[lm-1],missWolves:K.missWolves,wolfSpeedKmh:baseChaseSpeed};
  }
  function arcadeTrafficMultiplier(run,y){return mix(1,run.arcade.endTrafficMultiplier,clamp((y-run.startY)/(run.endY-run.startY),0,1));}
  function planArcadeStage(index,x,startY,selectionY,block,linked){
    const level=arcadeStage(index),townAfter=level.townAfter||index===S.arcade.stages.length-1;
    const g=level.gates={...level.gates};
    // Two half-spacing run-outs keep gate rhythm across a join, rather than two finish/start straights.
    if(linked)g.firstGateMetres=g.verticalDistanceMetres/2+S.arcade.stageFlow.linkedStageGapMetres;
    if(!townAfter)g.finishAfterLastGateMetres=g.verticalDistanceMetres/2;
    level.length=g.firstGateMetres+(g.count-1)*g.verticalDistanceMetres+g.finishAfterLastGateMetres;
    const run={id:'arcade',arcade:level,stageIndex:index+1,block,townAfter,objective:'gates',collected:0,totalMushrooms:0,x,selectionY,startY,endY:startY+level.length*PX_PER_M,points:0,hits:0,cleared:0,missed:0,tricks:0,time:0,violation:false,left:false,finishPassed:false,finishHalf:g.openingWidthMetres*PX_PER_M/2*S.race.finishWidthMultiplier,totalGates:g.count};
    state.safeTrails.push(run);block.runs.push(run);
    run.gateYs=[];run.gateXs=[];
    run.momentumJumps=level.specialLayout==='momentum'?momentumJumpPlans(g.count):[];
    for(let i=0;i<g.count;i++){
      const momentum=level.specialLayout==='momentum',jump=momentum&&i?run.momentumJumps.find(p=>p.gap===i-1):null;
      let y=startY+(g.firstGateMetres+i*g.verticalDistanceMetres)*PX_PER_M;
      if(momentum&&i){
        const flight=level.pace*S.physics.speedMultiplier*S.jump.speedBoost*(jump?momentumJumpDuration(jump.kind):0);
        y=run.gateYs[i-1]+Math.max(level.spacing,jump?flight+380:0);
      }
      const gx=x+(i%2?1:-1)*g.horizontalDistanceMetres*PX_PER_M/2;
      run.gateYs.push(y);run.gateXs.push(gx);
      entity('gate',gx,y,{half:g.openingWidthMetres*PX_PER_M/2,width:g.openingWidthMetres*PX_PER_M,r:0,number:i+1,color:i%2?C.blue:C.red,checked:false,run});
    }
    if(level.specialLayout==='momentum'){run.endY=run.gateYs.at(-1)+g.finishAfterLastGateMetres*PX_PER_M;level.length=(run.endY-startY)/PX_PER_M;}
    markArcadeGearGates(run);
    if(!linked)entity('courseStart',x,startY,{r:0,width:700,name:run.stageIndex+'. '+level.name});
    if(townAfter){
      entity('finish',x,run.endY,{r:0,width:run.finishHalf*2,half:run.finishHalf});
      for(let i=0;i<S.race.spectators;i++)entity(i%2?'personYellow':'personRed',x+(i%2?1:-1)*(run.finishHalf+65+(i%3)*20),run.endY+80+Math.floor(i/2)*105,{width:30,r:10,cheerRun:run});
    }
    return run;
  }
  function activateArcadeStage(run,linked=false){
    const level=run.arcade;
    stages.arcade={...S.courses.slalom,...level,fee:0,kind:level.trees?'forest':'slalom',color:S.arcade.yetiColors[level.yetiTier]||C.teal,name:run.stageIndex+'. '+level.name};
    state.course=run;state.zone={kind:'course',origin:run.startY};state.generated=run.startY+S.race.terrainStartOffset;state.gateCount=0;
    state.results=null;state.arcadeResult=null;
    announce(stages.arcade.name.toUpperCase(),level.briefing||(run.next?'KEEP GOING - THE SLOPE CONTINUES':run.stageIndex===S.arcade.stages.length?'REACH THE FINAL FINISH':'REACH THE FINISH - TOWN AHEAD'),stages.arcade.color,linked?2.5:5);
    state.transitions.push({kind:linked?'linkedStage':'start',id:'arcade',stage:run.stageIndex,y:state.p.y,paid:true});
    if(!linked)beep(650,.14);
  }
  function startArcadeBlock(gate){
    const p=state.p;
    if(!state.arcade){state.arcade={stage:S.arcade.startStage,startStage:S.arcade.startStage,practice:S.arcade.startStage>1,completed:0,startY:p.y,furthestY:p.y,cleared:0,missed:0,hits:0,shields:0,swords:0,shieldCharge:0,swordCharge:0,shieldsUsed:0,swordsUsed:0,combo:0};state.patrolPenalty=null;state.chasers=[];state.arcadeResult=null;}
    const block={runs:[]},x=gate?.x??p.x,selectionY=gate?.y??p.y,startY=belowView(S.race.courseOffscreenMargin);
    // Prepare the connected slope before it comes into view: joins never reveal fresh objects.
    let previous=null;
    for(let index=state.arcade.stage-1;index<S.arcade.stages.length;index++){
      const run=planArcadeStage(index,x,previous?.endY??startY,previous?.endY??selectionY,block,!!previous);
      if(previous)previous.next=run;
      previous=run;if(run.townAfter)break;
    }
    const first=block.runs[0],last=block.runs.at(-1),previousTown=state.villages.filter(t=>t.end<=startY&&t.origin<selectionY).at(-1);
    if(previousTown){previousTown.approachEndY=startY;const road=previousTown.approachRoad;road.points=[{x:previousTown.x,y:previousTown.roadEndY},{x:previousTown.x,y:Math.max(previousTown.roadEndY,startY-200)},{x,y:startY}];delete road.tiles;delete road.bounds;}
    state.plannedTown=block.town=makeVillage(last.endY+S.race.townAfterFinish,x,false);
    for(const o of state.objects){if(o.type==='entrance')o.selected=o===gate;if(o.type==='trailChoices'&&o.y>block.town.origin&&o.y<block.town.end)o.arcadeNext=last.stageIndex+1;}
    protectScenery();
    for(const run of block.runs){armPenaltyGates(run);prepareArcadeTerrain(run);spawnArcadeYetis(run,run.arcade.yetiTier,run.arcade.yetis);}
    const oldRoute=state.liftRoutes.at(-1);
    if(oldRoute&&oldRoute.y1>startY)oldRoute.y1=startY;
    state.liftRoutes.push({x0:oldRoute?liftX(oldRoute,startY):x+S.lift.x,x1:block.town.stationX,y0:startY,y1:block.town.stationY});
    activateArcadeStage(first);return true;
  }
  function activeCourseOwner(o){
    const run=o?.arcadeRun||o?.chaseRun,current=state.course;
    return !!run&&!!current&&(run===current||!!run.block&&run.block===current.block);
  }
  function endlessPressure(metres){
    const E=S.endless,t=1-Math.exp(-Math.max(0,metres)/E.difficultyRampMetres),phase=Math.max(0,metres)/E.waveMetres;
    const wave=.82+.18*Math.sin(phase*TAU-Math.PI/2),forest=.75+.45*(.5+.5*Math.sin(phase*2.1)),lakes=.65+.85*(.5+.5*Math.sin(phase*1.7+1.3));
    return {t,wave,forest,lakes};
  }
  // Difficulty progresses through layouts and populations; downhill pace stays at its starting value.
  function endlessScaleAt(){return 1;}
  function endlessSpeedScale(o=null){return state.endless&&(!o||activeCourseOwner(o))?state.endless.speedScale:1;}
  function updateEndlessSpeed(){
    const a=state.endless;if(!a)return;
    a.speedScale=endlessScaleAt((Math.max(a.furthestY,state.p.y)-a.startY)/PX_PER_M);
    stages.endless.pace=S.endless.playerSpeedKmh*a.speedScale/(S.physics.speedMultiplier*S.physics.hudKmhPerSpeed);
  }
  function endlessEncounterAt(y){return state.endless?.encounters.find(e=>y>=e.startY&&y<=e.endY);}
  function cemeteryYScale(x,y){
    const e=endlessEncounterAt(y);if(e?.kind!=='cemetery')return 1;
    const C=S.endless.regions.cemetery,blend=C.blendMetres*PX_PER_M*e.scale;
    const edge=Math.min(y-e.startY,e.endY-y,e.band-Math.abs(x-(e.centerX??state.course.x)));
    return mix(1,C.ySpeedScale,blend?clamp(edge/blend,0,1):edge>=0?1:0);
  }
  function cemeteryPoint(e,distance){
    const r=e.cemeteryRoute,d=clamp(distance,0,r.length);
    for(let i=1;i<r.points.length;i++)if(d<=r.lengths[i]){const t=(d-r.lengths[i-1])/(r.lengths[i]-r.lengths[i-1]||1);return {x:mix(r.points[i-1].x,r.points[i].x,t),y:mix(r.points[i-1].y,r.points[i].y,t)};}
    return r.points.at(-1);
  }
  function cemeteryProjection(e,x,y){
    const r=e.cemeteryRoute;let best={distance:Infinity,along:0};
    for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),px=a.x+t*dx,py=a.y+t*dy,distance=Math.hypot(x-px,y-py);if(distance<best.distance)best={x:px,y:py,distance,along:mix(r.lengths[i-1],r.lengths[i],t)};}
    return best;
  }
  function cemeteryHalfAt(e,along){return e.half;}
  function mausoleumForecourt(e,x,y,margin=0){
    const m=e.mausoleum;return !!m&&Math.abs(x-m.x)<m.width*.55+60*e.scale+margin&&y>m.y-m.width*.6-margin&&y<m.y+150*e.scale+margin;
  }
  function cemeteryZombie(x,y,extra){
    const e=extra.encounter;let grave=null,best=Infinity;
    for(const o of state.objects)if(o.encounter===e&&o.type==='grave'&&!o.restingOccupant){const distance=Math.hypot(o.x-x,o.y-y);if(distance<best){grave=o;best=distance;}}
    if(!grave||best>230*e.scale){
      const side=(extra.zombieStyle??0)%2?1:-1;
      let gx=x+side*(e.half+34*e.scale);if(mausoleumForecourt(e,gx,y,16))gx=e.mausoleum.x+(Math.sign(gx-e.mausoleum.x)||side)*(e.mausoleum.width*.55+100*e.scale);
      grave=entity('grave',gx,y,{arcadeRun:extra.arcadeRun,encounter:e,worldChunk:extra.worldChunk,regionFlank:extra.regionFlank,width:32,r:10,style:(extra.zombieStyle??0)%6});
    }
    const dx=x-grave.x;
    const nearby=state.objects.filter(o=>o.r>0&&['grave','mausoleum','cemeteryFence','areaBarrier','cemeteryPillar','zombie'].includes(o.type)&&Math.abs(o.x-grave.x)<200&&Math.abs(o.y-grave.y)<200);
    let spot=null;
    for(const radius of [36,52,72,100]){
      for(const angle of [Math.PI/4,Math.PI*.75,Math.PI/2,0,Math.PI,-Math.PI/4,-Math.PI*.75]){
        const p={x:grave.x+Math.cos(angle)*radius*(Math.sign(dx)||1),y:grave.y+Math.sin(angle)*radius};
        if((!e.openCemetery||Math.abs(p.x-e.centerX)<e.band-30)&&nearby.every(o=>obstacleClearance(o,p.x,p.y)>=13)){spot=p;break;}
      }
      if(spot)break;
    }
    x=spot?.x??grave.x+24;y=spot?.y??grave.y+52;
    const o=entity('zombie',x,y,{...extra,zombieRole:extra.zombieRole??'ambusher',zombieState:'resting',hideGrave:grave,homeX:x,homeY:y,awake:false,r:10});grave.restingOccupant=o;return o;
  }
  function cemeteryCluster(e,x,y,own,random){
    const scale=e.scale,angle=(random()-.5)*1.1,cos=Math.cos(angle),sin=Math.sin(angle),cols=3+Math.floor(random()*3),rows=random()<.7?2:1,crypt=random()<.28;
    const at=(dx,dy)=>({x:x+(dx*cos-dy*sin)*scale,y:y+(dx*sin+dy*cos)*scale});
    const prop=(type,p,extra)=>{
      if(p.y<e.startY+210*scale||p.y>e.endY-210*scale||Math.abs(p.x-e.centerX)>e.band-70*scale)return;
      if(encounterClearance(e,p.x,p.y,extra.r,extra.r)<10*scale||mausoleumForecourt(e,p.x,p.y,extra.r))return;
      return entity(type,p.x,p.y,{...own,...extra});
    };
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const p=at((col-(cols-1)/2)*34+(random()-.5)*9,(row-.5)*42+(random()-.5)*12);
      prop('grave',p,{width:28+random()*9,r:10,style:Math.floor(random()*6)});
    }
    if(crypt)prop('mausoleum',at((random()-.5)*90,-76),{width:74+random()*14,r:30,style:Math.floor(random()*3)});
  }
  function encounterPathX(path,y){
    if(y<=path[0].y)return path[0].x;
    for(let i=1;i<path.length;i++)if(y<=path[i].y){const t=clamp((y-path[i-1].y)/(path[i].y-path[i-1].y),0,1);return mix(path[i-1].x,path[i].x,path.linear?t:t*t*(3-2*t));}
    return path.at(-1).x;
  }
  function encounterHalf(e,y){return e.half;}
  function encounterClearance(e,x,y,hw=0,hh=0){
    if(e.cemeteryRoute){const p=cemeteryProjection(e,x,y);return p.distance-cemeteryHalfAt(e,p.along)-Math.hypot(hw,hh);}
    const cache=e.clearanceRows??=new Map(),key=y+'|'+hh;let bands=cache.get(key);
    if(!bands){
      bands=e.paths.map(path=>{
        let left=Infinity,right=-Infinity;
        const sample=at=>{const px=encounterPathX(path,at),half=encounterHalf(e,at);left=Math.min(left,px-half);right=Math.max(right,px+half);};
        sample(y-hh);sample(y);sample(y+hh);for(const p of path)if(p.y>y-hh&&p.y<y+hh)sample(p.y);
        return [left,right];
      });cache.set(key,bands);
    }
    let clearance=Infinity;for(const [left,right] of bands)clearance=Math.min(clearance,Math.max(left-x,x-right)-hw);return clearance;
  }
  function endlessTownAt(x,y){return state.villages.find(t=>t.endlessRun===state.course&&y>t.origin-70&&y<t.end&&Math.abs(x-t.x)<t.halfWidth);}
  function nextEndlessRegionKind(a,startY){
    const R=S.endless.regions,C=R.crowd,metres=(startY-a.startY)/PX_PER_M;
    const last=a.lastCrowdEndY,elapsed=last===undefined?metres:(startY-last)/PX_PER_M;
    const eligible=C.chance>0&&metres>=C.firstMetres&&(last===undefined||elapsed>=C.minimumGapMetres)&&['quiet','forest'].includes(a.lastEncounterKind);
    if(eligible&&(elapsed>=C.maximumGapMetres||random()<C.chance))return 'crowd';
    const index=a.regionOrderIndex||0;a.regionOrderIndex=index+1;
    return R.order[index%R.order.length];
  }
  function planEndlessEncounter(section,startY){
    const a=state.endless,Cf=S.endless.encounters,root=section.endlessRoot;
    const R=S.endless.regions,forcedKind=a.debugNextKind;delete a.debugNextKind;
    const kind=forcedKind??(R.enabled?nextEndlessRegionKind(a,startY):a.encounterCount?(a.lastEncounterKind==='town'?'trees':'town'):'town');
    const visit=a.themeVisits[kind]=(a.themeVisits[kind]||0)+1,difficulty=clamp((visit-1)/(Cf.difficultyVisits-1),0,1);
    const scale=endlessScaleAt((startY-a.startY)/PX_PER_M),length=range(...((R.enabled||forcedKind)&&(R.lengthMetres[kind]||(kind==='crowd'?R.lengthMetres.beginner:null))||Cf.lengthMetres))*PX_PER_M*scale*(kind==='christmas'?R.festivals.christmasParade.lengthMultiplier:1);
    const townKind=kind==='town'||FESTIVAL_KINDS.has(kind),widths=townKind?Cf.townStreetWidthMetres:Cf.corridorWidthMetres;
    const streetWidths=kind==='christmas'?R.festivals.christmasParade.streetWidthMetres:widths;
    const half=mix(streetWidths[1],streetWidths[0],difficulty)*PX_PER_M*(townKind?1:scale)/2;
    const variant=Math.floor(random()*3),cycles=5+Math.round(difficulty),e={id:++a.encounterCount,kind,visit,difficulty,variant,scale,startY,endY:startY+length,half,paths:[],band:1000,chamberLength:length/cycles,generatedY:startY};
    e.night=!!(Math.floor(Math.max(0,(a.regionOrderIndex||1)-1)/R.order.length)%2);
    a.encounters.push(e);a.lastEncounterKind=kind;if(kind==='crowd')a.lastCrowdEndY=e.endY;
    if(townKind){
      let names=S.village.names.filter(name=>!a.townNames.includes(name));if(!names.length){a.townNames=[];names=S.village.names;}const name=pick(names);a.townNames.push(name);
      const town=kind==='christmas'?makeChristmasParade(e,root,name):makeVillage(startY,root.x,false,{endlessRun:root,name,layoutSeed:FESTIVAL_KINDS.has(kind)?Math.floor(random()*4294967296):undefined,festival:FESTIVAL_KINDS.has(kind)?kind:null,lengthWorld:length,deferLanes:true,people:Math.round(mix(...Cf.townPeople,difficulty)*(FESTIVAL_KINDS.has(kind)?R.festivals.peopleMultiplier:1)),village:{corridorHalfWidth:half,mainRoadWidth:S.village.mainRoadWidth*half/S.village.corridorHalfWidth}});
      e.town=town;town.encounter=e;e.title=town.name;e.band=town.halfWidth;
      for(const route of [town.route,town.backRoute?.points].filter(Boolean)){
        const path=[{x:root.x,y:startY},...route,{x:root.x,y:e.endY}];path.linear=true;e.paths.push(path);
      }
      e.checkpoints=[town.route[0].y,town.backRoute?.points.at(-1).y??town.roadEndY];e.chamberLength=length/e.checkpoints.length;
      for(const o of state.objects)if(o.town===town){o.arcadeRun=section;o.encounter=e;if(['skier','boarder'].includes(o.type))o.endlessBaseVy=o.vy;}
      for(const road of state.roads)if(road.town===town){road.endlessEncounter=e;road.endlessEndY=e.endY;}
      if(FESTIVAL_KINDS.has(kind))decorateFestival(e,section);
      addEndlessLift(town,section,e);
      e.generatedY=e.endY;
    }else if(kind!=='trees'){
      planEndlessRegion(e,section);
    }else{
      const mirror=pick([-1,1]),bend=range(...Cf.routeSwingMetres)*PX_PER_M*scale;
      const point=(t,x)=>({x:root.x+x,y:startY+t*length});e.paths=[[],[]];
      for(let i=0;i<cycles;i++)for(let branch=0;branch<2;branch++){
        const path=e.paths[branch],side=(i%2?-1:1)*mirror,offset=side*bend*((variant===1?.75:1)+(branch?.8:0));if(!i)path.push(point(0,0));
        path.push(point((i+mix(.38,.3,difficulty))/cycles,offset),point((i+.68)/cycles,offset),point((i+1)/cycles,0));
      }
      if(variant===1)e.paths.pop();e.title=['Forked Pines','Winding Grove','Forest Islands'][variant];
      e.band=Math.max(...e.paths.flat().map(p=>Math.abs(p.x-root.x)))+e.half+350*scale;
    }
    e.coreBand=e.band;
    if(kind!=='cemetery'&&!SPECIAL_KINDS.has(kind)&&(WIDE_REGIONS.has(kind)||kind==='lake'))e.band=Math.max(e.band,R.minimumWidthMetres*PX_PER_M*scale/2);
    if(e.town){e.town.halfWidth=e.band;if(kind!=='christmas')populateForestBoundary(e,section,e.startY,e.endY,{banks:false});}
    if(WIDE_REGIONS.has(kind)||kind==='lake')state.objects=state.objects.filter(o=>!o.worldChunk||o.arcadeRun||o.y<e.startY||o.y>e.endY||Math.abs(o.x-(e.centerX??root.x))>e.band);
    return e;
  }
  function planEndlessRegion(e,section){
    const root=section.endlessRoot,R=S.endless.regions,point=(t,x=0)=>({x:root.x+x,y:e.startY+t*(e.endY-e.startY)});
    e.noFlags=['quiet','lake','denseForest','scramble'].includes(e.kind);
    e.noNewPredators=['quiet','lake','denseForest','scramble','cemetery'].includes(e.kind);
    e.half=e.kind==='cemetery'?mix(...R.cemeteryOpeningMetres.slice().reverse(),e.difficulty)*PX_PER_M*e.scale/2:e.kind==='denseForest'?mix(55,35,e.difficulty)*e.scale:550*e.scale;
    e.band=1000*e.scale;e.paths=[[point(0),point(1)]];
    if(['crowd','beginner'].includes(e.kind)){e.centerX=e.kind==='crowd'?state.p.x:root.x;e.crowdWidthMetres=Math.max(e.kind==='crowd'?R.crowd.widthMetres:0,R.minimumWidthMetres);e.half=e.crowdWidthMetres*PX_PER_M*e.scale/2-60;e.band=e.half+200;e.paths=[[{x:e.centerX,y:e.startY},{x:e.centerX,y:e.endY}]];}
    const names={crowd:'Rush Hour Slope',beginner:'Rush Hour Slope',quiet:'Snowy Trail',lake:'Stillwater Lake',denseForest:'Close Pines',scramble:'Wild Patch',forest:'Open Pines',cemetery:'Frost Rest Cemetery'};e.title=names[e.kind];
    if(SPECIAL_KINDS.has(e.kind)){planSpecialArea(e,section);}
    else if(e.kind==='cemetery'){
      const C=R.cemetery,length=e.endY-e.startY,side=pick([-1,1]);e.openCemetery=true;e.centerX=root.x;
      e.clusterSpacing=mix(...C.clusterSpacingMetres.slice().reverse(),e.difficulty)*PX_PER_M*e.scale;
      // A loose clear line guarantees fair gaps; it is neither painted nor fenced in.
      const path=[point(0),point(.28,side*210*e.scale),point(.65,-side*170*e.scale),point(1)];path.linear=true;e.paths=[path];
      const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths.at(-1)+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y));e.cemeteryRoute={points:path,lengths,length:lengths.at(-1)};
      e.band=C.widthScreens*W/ZOOM/2;e.checkpoints=[e.startY+100*e.scale,e.endY-100*e.scale];e.chamberLength=length/2;
      const at=cemeteryPoint(e,e.cemeteryRoute.length*.42),width=280,cryptSide=e.variant%2?-1:1;
      e.mausoleum=entity('mausoleum',at.x+cryptSide*(e.half+width*.45+60*e.scale),at.y,{arcadeRun:section,encounter:e,width,r:width*.45,grandMausoleum:true,waveSize:Math.round(mix(...C.mausoleum.count,e.difficulty)),released:0});
    }else if(e.kind==='quiet'){
      const previous=state.endless.encounters.at(-2)?.town,side=pick([-1,1]);
      // Continue Arcade's actual village-exit road, including an off-centre approach.
      const entry=previous&&state.p.y>previous.origin?clamp(state.p.x,previous.x-previous.halfWidth*.8,previous.x+previous.halfWidth*.8):root.x;
      e.centerX=entry;e.paths=[[{x:entry,y:e.startY},point(.3,(entry-root.x)*.75+side*55*e.scale),point(.65,(entry-root.x)*.35-side*35*e.scale),point(1)]];e.paths[0].linear=true;
      const road=previous?.approachRoad??{surface:'snow',width:S.village.mainRoadWidth};
      road.surface='snow';road.width=S.village.mainRoadWidth;
      road.points=[...(previous?[{x:previous.x,y:previous.roadEndY}]:[]),...e.paths[0]];road.endlessEncounter=e;road.endlessEndY=e.endY;
      delete road.tiles;delete road.bounds;delete road.tileRows;delete road.tileRowsFor;
      if(previous){previous.approachEndY=e.endY;for(const path of previous.encounter.paths)if(path.at(-1).y===previous.end)path.at(-1).x=entry;}
      else state.roads.push(road);
      e.snowRoad=road;clearSnowRoadTrees(road);
    }else if(e.kind==='scramble'){
      e.band=900*e.scale;e.half=600*e.scale;
    }else if(e.kind==='denseForest'){
      e.paths=[Array.from({length:9},(_,i)=>point(i/8,Math.sin(i*Math.PI/2)*190*e.scale))];
    }else if(e.kind==='lake'){
      const length=e.endY-e.startY;
      const lake=entity('ice',root.x,(e.startY+e.endY)/2,{rx:Math.max(R.minimumWidthMetres*PX_PER_M*e.scale/2,e.band,length*.65),ry:length/2,width:Math.max(R.minimumWidthMetres*PX_PER_M*e.scale/2,e.band,length*.65)*2,r:0,transitionLake:true,arcadeRun:section,encounter:e,arcadeFeature:true});
      addLakeExitSprings(e,section,lake);
    }
    state.objects=state.objects.filter(o=>!o.worldChunk||o.arcadeRun||o.y<e.startY||o.y>e.endY||(e.kind==='quiet'?Math.abs(o.x-encounterPathX(e.paths[0],o.y))>410:Math.abs(o.x-(e.centerX??root.x))>e.band));
  }
  function addLakeExitSprings(e,section,lake){
    const J=S.endless.regions.lakeExitSprings,width=J.widthMetres*PX_PER_M,span=lake.rx*2-width;
    const count=Math.max(2,Math.ceil(span/(J.spacingMetres*PX_PER_M))+1),points=lakeGeometry(lake).points;
    e.exitSprings=[];
    for(let i=0;i<count;i++){
      const x=lake.x-span/2+span*i/(count-1),local=x-lake.x;let shore=-Infinity;
      for(let j=0;j<points.length;j++){
        const a=points[j],b=points[(j+1)%points.length];if(local<Math.min(a[0],b[0])||local>Math.max(a[0],b[0]))continue;
        const t=b[0]===a[0]?0:(local-a[0])/(b[0]-a[0]);shore=Math.max(shore,mix(a[1],b[1],t));
      }
      e.exitSprings.push(entity('spring',x,lake.y+shore+J.shoreGapMetres*PX_PER_M,{width,r:width/2,arcadeRun:section,encounter:e,arcadeFeature:true,lakeExitSpring:true,jumpSeconds:J.jumpSeconds,jumpDurationCap:J.durationCap}));
    }
  }
  function nearLakeExitSpring(x,y,pad=0){
    for(const e of state.endless?.encounters||[]){
      const row=e.exitSprings;if(!row?.length)continue;const first=row[0],last=row.at(-1),radius=first.width/2+pad;
      if(x<first.x-radius||x>last.x+radius)continue;
      const index=Math.round((x-first.x)/(last.x-first.x)*(row.length-1));
      for(let i=Math.max(0,index-1);i<=Math.min(row.length-1,index+1);i++)if(Math.abs(x-row[i].x)<radius&&Math.abs(y-row[i].y)<radius+30)return true;
    }
    return false;
  }
  const SPRING_CLEAR_SCENERY=new Set(['pine','fir','smallPine','spruceTree','crookedTree','cedarTree','alpineTree','rock','pebble','bush','stump']);
  function clearLakeExitSpringApproaches(){
    if(!state.endless?.encounters.some(e=>e.exitSprings))return;
    filterObjects(o=>o.forestBoundary||!SPRING_CLEAR_SCENERY.has(o.type)||!nearLakeExitSpring(o.x,o.y,Math.max(o.r||0,(o.width||0)*.4)+22));
  }
  function populateEndlessRegion(e,section,from,to){
    const R=S.endless.regions,scale=e.scale,length=e.endY-e.startY,root=section.endlessRoot,own={arcadeRun:section,encounter:e};
    if(from===e.startY)entity('encounterTitle',e.centerX??root.x,e.startY-60*scale,{...own,r:0,width:300});
    const rows=(step,callback,offset=0)=>{for(let row=Math.max(0,Math.ceil((from-e.startY-offset)/step));;row++){const y=e.startY+offset+row*step;if(y>=to||y>=e.endY)break;callback(y,row);}};
    if(e.specialArea){populateSpecialArea(e,section,from,to);return;}
    if(e.kind==='beginner'||e.kind==='crowd'){
      const crowd=e.kind==='crowd',center=e.centerX??root.x;
      populateForestBoundary(e,section,from,to,{banks:crowd});
      const count=Math.min(600,Math.round(crowd?mix(...R.crowd.people,e.difficulty):mix(...R.beginnerPeople,e.difficulty)*e.crowdWidthMetres/240)),step=(length-300*scale)/Math.max(1,count);
      if(count>0&&length>300*scale)rows(step,(y,row)=>{if(row>=count||y<e.startY+200*scale||y>e.endY-100*scale)return;const type=row%(crowd?17:5)===0?pick(['personRed','personYellow','personGreen']):row%7===0?'boarder':'skier',base=range(...S.skiers.slowSpeed);
        const spread=e.half+1,lane=(row*5)%13,jitter=lane===0?range(.01,.2):lane===12?range(.8,.99):range(.08,.92);
        const x=center-spread+(lane+jitter)*spread*2/13;
        entity(type,x,y,{...own,width:type.startsWith('person')?30:42,r:10,vy:type.startsWith('person')?0:base*scale,vx:0,endlessBaseVy:type.startsWith('person')?undefined:base});},200*scale);
      const y=e.startY+Math.min(length*.55,180*PX_PER_M*scale);
      if(!e.introYeti&&to>y){e.introYeti=true;const live=state.chasers.filter(c=>activeCourseOwner(c)&&!c.ravager&&!c.dead&&!c.leaving&&Math.abs(c.y-state.p.y)<S.endless.yetis.nearbyMetres*PX_PER_M*scale).length;
        if(live<S.endless.yetis.maxNearbyHunters){const speed=crowd?mix(...S.endless.yetis.speedKmh,endlessPressure((e.startY-state.endless.startY)/PX_PER_M).t):S.endless.yetis.speedKmh[0];entity('lurker',center+pick([-1,1])*170*scale,y,{...own,width:55,r:18,arcadeTier:speed>90?'special':speed>78?'fast':'slow',yetiSpeedKmh:speed*scale,endlessBaseKmh:speed,wakeSeconds:S.endless.yetis.wakeSeconds});}}
    }else if(e.kind==='quiet'){
      const path=e.paths[0];
      if(R.quietTreesPer100Metres>0)rows(100*PX_PER_M*scale/Math.max(.01,R.quietTreesPer100Metres),(y,row)=>entity(row%3?'pine':'fir',encounterPathX(path,y)+(row%2?-1:1)*range(110,310),y,{...own,width:range(58,78),r:17}));
      rows(70*PX_PER_M*scale,(y,row)=>{
        if(y>e.endY-100*scale)return;
        const side=row%2?-1:1,offset=side*range(24,38),walkPath=[-55,55].map(dy=>({x:encounterPathX(path,y+dy)+offset,y:y+dy}));
        entity(pick(['personRed','personGreen','personYellow']),walkPath[0].x,walkPath[0].y,{...own,width:30,r:10,walker:true,path:walkPath,pathIndex:1,pathDir:1,walkSpeed:range(...S.village.walkerSpeed)});
      },160*scale);
      rows(110*PX_PER_M*scale,(y,row)=>{if(y>e.endY-120*scale)return;entity('skier',encounterPathX(path,y)+(row%2?-1:1)*12,y,{...own,width:42,r:12,vy:30*scale,vx:0,endlessBaseVy:30});},350*scale);
      rows(95*PX_PER_M*scale,(y,row)=>{
        if(y>e.endY-130*scale)return;const side=row%2?-1:1,x=encounterPathX(path,y)+side*78;
        entity(row%2?'snowman':'bench',x,y,{...own,width:row%2?28:46,r:9});
        if(row===0){entity('lamp',x+side*18,y-55,{...own,width:20,r:6});entity('personYellow',encounterPathX(path,y)-side*42,y+25,{...own,width:30,r:10});}
      },260*scale);
    }else if(e.kind==='forest'){
      const rate=mix(...R.forestTreesPer100Metres,e.difficulty),clear=(Math.max(...S.endless.gates.swingMetres)+Math.max(...S.endless.gates.openingMetres)/2)*PX_PER_M*scale+45;
      if(rate>0)rows(100*PX_PER_M*scale/Math.max(.1,rate),(y,row)=>{const x=root.x+pick([-1,1])*range(clear,850*scale);entity(row%3?'pine':'fir',x,y,{...own,width:range(60,86),r:18});});
      const entry=endlessPressure((e.startY-state.endless.startY)/PX_PER_M).t,fastRate=mix(...S.endless.rates.fastSkiers,entry),skierRate=mix(...S.endless.rates.skiers,entry);
      rows(450*scale,y=>{const fast=random()<fastRate/Math.max(.01,skierRate+fastRate),base=range(...(fast?S.skiers.fastSpeed:S.skiers.slowSpeed));entity('skier',root.x+range(-300,300)*scale,y,{...own,fast,width:42,r:12,vy:base*scale,vx:0,endlessBaseVy:base});});
      const jumps=mix(...S.endless.rates.jumps,entry);
      if(jumps>0)rows(100*PX_PER_M*scale/jumps,y=>{if(y>e.endY-250*scale)return;const x=root.x+range(-160,160)*scale;if(patchAt(x,y))return;const hill=createArcadeItem(pick(['smallHill','smallHill','largeHill','rainbow']),x,y,section);hill.encounter=e;},150*scale);
    }else if(e.kind==='denseForest'){
      populateForestBoundary(e,section,from,to,{banks:false});
      const density=Math.sqrt(mix(...R.denseForestDensity,e.difficulty));
      rows(90/density,(y,row)=>{const spacing=78/density;for(let x=root.x-e.coreBand*.65+(row%2)*spacing/2;x<root.x+e.coreBand*.65;x+=spacing){const xx=x+range(-12,12),yy=y+range(-8,8);if(Math.abs(xx-encounterPathX(e.paths[0],yy))<e.half+36||yy<e.startY+80*scale||yy>e.endY-80*scale)continue;entity(random()<.3?'fir':'pine',xx,yy,{...own,width:range(65,86),r:19});}});
    }else if(e.kind==='scramble'){
      populateForestBoundary(e,section,from,to,{banks:false});
      const density=Math.sqrt(mix(...R.scrambleDensity,e.difficulty)),spacing=118/density;
      const pool=['pine','fir','smallPine','spruceTree','crookedTree','cedarTree','alpineTree','rock','rock','stump','bush','pebble','sled','mogul','smallHill','mushroom','skier','boarder'];
      // Jittered scatter with passable physical gaps, rather than a reserved winding corridor.
      rows(spacing,(y,row)=>{
        if(y<e.startY+90*scale||y>e.endY-100*scale)return;
        for(let x=root.x-e.half+range(0,spacing);x<root.x+e.half;x+=spacing){
          if(random()<.18)continue;const xx=x+range(-spacing*.3,spacing*.3),yy=clamp(y+range(-spacing*.3,spacing*.3),e.startY+90*scale,e.endY-100*scale),key=pick(pool);
          const radius=ARCADE_ITEMS[key].r;
          if(state.objects.some(o=>o.encounter===e&&o.r>0&&Math.abs(o.y-yy)<90&&Math.hypot(o.x-xx,o.y-yy)<o.r+radius+30))continue;
          const item=createArcadeItem(key,xx,yy,section);item.encounter=e;
        }
      });
    }else if(e.kind==='cemetery'){
      const spacing=e.clusterSpacing;
      const columns=Math.ceil(e.band/spacing);
      for(let row=0;e.startY+260*scale+row*spacing<e.endY-220*scale;row++)for(let col=-columns;col<=columns;col++){
        let seed=(Math.imul(e.id,73856093)^Math.imul(row+1,19349663)^Math.imul(col+7,83492791))>>>0;
        const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const x=root.x+col*spacing+(random()-.5)*spacing*.65,y=e.startY+260*scale+row*spacing+(random()-.5)*spacing*.3;
        if(y<from||y>=to)continue;cemeteryCluster(e,x,y,own,random);
      }
      // One entrance and exit; continuous perimeter fencing encloses the whole graveyard.
      for(const exit of [false,true])if(exit?to===e.endY:from===e.startY)for(const side of [-1,1]){
        const y=exit?e.endY-100*scale:e.startY+100*scale,gap=220*scale;
        const a=root.x+side*gap,b=root.x+side*e.band,n=Math.ceil(Math.abs(b-a)/360);
        for(let i=0;i<n;i++){const ax=mix(a,b,i/n),bx=mix(a,b,(i+1)/n);entity('cemeteryFence',(ax+bx)/2,y,{...own,r:5,width:Math.abs(bx-ax)+10,depth:10,ax,ay:y,bx,by:y,solidWall:true,perimeter:true});}
        entity('cemeteryPillar',root.x+side*gap,y,{...own,width:36,r:14,entry:!exit});
      }
      const entry=e.startY+100*scale,exit=e.endY-100*scale;
      for(let y=Math.max(entry,from);y<Math.min(exit,to);y+=300)for(const side of [-1,1]){
        const end=Math.min(y+300,exit,to),x=root.x+side*e.band;
        entity('cemeteryFence',x,(y+end)/2,{...own,r:5,width:10,depth:end-y+10,ax:x,ay:y,bx:x,by:end,perimeter:true});
      }
      const burialPoint=(i,count,offset)=>{
        const p=cemeteryPoint(e,mix(260*scale,e.cemeteryRoute.length-260*scale,(i+offset)/count)),lane=i%3-1;
        // All three screen-wide burial bands carry threats, with a central entrance apron.
        p.x=lane?root.x+lane*e.band*.64:p.x;return p;
      };
      const count=Math.round(mix(...R.zombies.count,e.difficulty));
      for(let i=0;i<count;i++){const p=burialPoint(i,count,.5);if(p.y<from||p.y>=to)continue;cemeteryZombie(p.x,p.y,{...own,zombieStyle:2,width:34,zombieBaseKmh:mix(...R.zombies.speedKmh,e.difficulty),phase:random()*TAU});}
      const wanderers=Math.round(mix(...R.zombies.wandererCount,e.difficulty));
      for(let i=0;i<wanderers;i++){
        const p=burialPoint(i,wanderers,.55);if(p.y<from||p.y>=to)continue;
        cemeteryZombie(p.x,p.y,{...own,zombieRole:'wanderer',zombieStyle:i%4,width:[32,36,30,34][i%4],phase:random()*TAU,zombieBaseKmh:mix(...R.zombies.wandererSpeedKmh,e.difficulty)});
      }
      const roamers=Math.round(mix(...R.zombies.roamerCount,e.difficulty));
      for(let i=0;i<roamers;i++){
        const p=burialPoint(i,roamers,.7);if(p.y<from||p.y>=to)continue;
        const center=p.x,side=i%2?-1:1;
        const candidates=[{x:center+side*e.half*.2,y:p.y},{x:center,y:p.y},{x:p.x-side*e.half*.35,y:p.y+25*scale},{x:p.x,y:p.y},{x:p.x,y:p.y-45*scale},{x:p.x,y:p.y+50*scale}];
        for(const radius of [40,70,100,140])for(let j=0;j<8;j++)candidates.push({x:p.x+Math.cos(j*Math.PI/4)*radius,y:p.y+Math.sin(j*Math.PI/4)*radius});
        const nearby=state.objects.filter(o=>o.r>0&&!o.dead&&!o.eaten&&Math.abs(o.x-p.x)<300*scale&&Math.abs(o.y-p.y)<300*scale);
        const spot=candidates.find(p=>!mausoleumForecourt(e,p.x,p.y,16)&&Math.abs(p.x-root.x)<e.band-35&&p.y>entry+100*scale&&p.y<exit-100*scale&&nearby.every(o=>obstacleClearance(o,p.x,p.y)>=14));if(!spot)continue;
        entity('zombie',spot.x,spot.y,{...own,zombieRole:'wanderer',zombieRoamer:true,zombieState:'wandering',zombieStyle:i%4,width:[32,36,30,34][i%4],r:10,awake:false,homeX:spot.x,homeY:spot.y,phase:random()*TAU,zombieBaseKmh:mix(...R.zombies.wandererSpeedKmh,e.difficulty)});
      }
    }
  }
  function populateForestBoundary(e,section,from,to,{banks=true}={}){
    const own={arcadeRun:section,encounter:e,forestBoundary:true},root={x:e.centerX??section.endlessRoot.x},seen=new Set(),radius=23,spacing=60;
    const tree=(x,y,kind)=>{
      const key=Math.round(x/10)+','+Math.round(y/10);if(seen.has(key)||encounterClearance(e,x,y,radius,radius)<14)return;
      seen.add(key);entity(random()<.3?'fir':'pine',x,y,{...own,forestBoundaryKind:kind,width:range(66,87),r:radius});
    };
    // Physical tree spacing stays fixed as pace rises, so gaps do not turn into side exits.
    const edge=(path,y,side)=>{
      const xs=[encounterPathX(path,y-radius),encounterPathX(path,y),encounterPathX(path,y+radius)];
      return {x:(side<0?Math.min(...xs):Math.max(...xs))+side*(e.half+radius+14),y};
    };
    const step=50,first=Math.max(0,Math.floor((from-e.startY)/step)),last=Math.ceil((to-e.startY)/step);
    if(banks)for(let row=first;row<last;row++)for(const path of e.paths)for(const side of [-1,1]){
      const a=edge(path,e.startY+row*step,side),b=edge(path,Math.min(e.endY,e.startY+(row+1)*step),side);
      const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/spacing));
      for(let i=0;i<count;i++){const y=mix(a.y,b.y,i/count);if(y>=from&&y<to)tree(mix(a.x,b.x,i/count),y,'bank');}
    }
    const mouth=exit=>{
      for(let row=0;row<3;row++)for(let x=root.x-e.band+(row%2)*spacing/2;x<=root.x+e.band;x+=spacing){
        const wing=Math.min(90*e.scale,Math.abs(x-root.x)/e.band*90*e.scale);
        const y=exit?e.endY-(130+row*32)*e.scale+wing:e.startY+(130+row*32)*e.scale-wing;
        tree(x,y,exit?'exit':'entry');
      }
    };
    if(from===e.startY)mouth(false);
    if(to===e.endY)mouth(true);
  }
  function populateEndlessEncounter(e,section,toY){
    const scale=e.scale,from=e.generatedY,to=Math.min(e.endY,toY);if(to<=from)return;if(e.kind!=='trees'){populateEndlessRegion(e,section,from,to);if(e.kind==='quiet'){clearSnowRoadTrees(e.snowRoad);addRouteLamps(e.paths[0],null,from,to,e);}e.generatedY=to;return;}
    const own={arcadeRun:section,encounter:e},root=section.endlessRoot;
    if(from===e.startY)entity('encounterTitle',root.x,e.startY-60*scale,{...own,r:0,width:300});
    populateForestBoundary(e,section,from,to);
    const stepX=mix(62,47,e.difficulty)*scale,stepY=mix(75,54,e.difficulty)*scale,rowStart=e.startY+120*scale,extent=mix(140,210,e.difficulty)*scale;
    for(let y=rowStart+Math.max(0,Math.ceil((from-rowStart)/stepY))*stepY;y<to&&y<e.endY-90*scale;y+=stepY){
      const xs=e.paths.map(path=>encounterPathX(path,y)),minX=Math.min(...xs),maxX=Math.max(...xs);
      for(let x=root.x+Math.floor((minX-root.x-e.half-extent)/stepX)*stepX;x<maxX+e.half+extent;x+=stepX){
        const d=encounterClearance(e,x,y,23*scale,23*scale);if(d<60||d>extent)continue;
        entity(random()<.3?'fir':'pine',x,y,{...own,width:range(66,87),r:23});
      }
      if(random()<.1){const path=pick(e.paths),x=encounterPathX(path,y),vy=range(...S.skiers.slowSpeed);entity('skier',x+range(-.4,.4)*e.half,y,{...own,width:42,r:12,vx:0,vy:vy*scale,endlessBaseVy:vy});}
    }
    e.generatedY=to;delete e.clearanceRows;
  }
  function endlessPursuitRoute(c,target){
    if(!state.endless||!activeCourseOwner(c))return null;
    const e=endlessEncounterAt(c.y+80*state.endless.speedScale);if(!e||e.openCemetery||['beginner','crowd','quiet','lake','forest','scramble'].includes(e.kind)||target.y<e.startY)return null;
    if(e.kind==='christmas'&&Math.abs(c.x-e.town.x)<e.half-20&&Math.abs(target.x-e.town.x)<e.half-20){c.encounterRoute=null;return null;}
    // The expanded side terrain is playable too; do not pull its hunters back to the central lane.
    if(encounterClearance(e,target.x,clamp(target.y,e.startY,e.endY))>180*e.scale){c.encounterRoute=null;return null;}
    if(e.kind==='cemetery'&&e.cemeteryRoute)return {encounter:e,index:0,cemetery:true};
    if(target.y<c.y)return null;
    if(c.encounterRoute?.encounter!==e){
      const y=clamp(c.y,e.startY,e.endY),goal=Math.min(e.endY,c.y+600*e.scale);
      const costs=e.paths.map(path=>Math.abs(encounterPathX(path,y)-c.x)+.35*Math.abs(encounterPathX(path,goal)-target.x));
      c.encounterRoute={encounter:e,index:costs.indexOf(Math.min(...costs))};
    }
    return c.encounterRoute;
  }
  function endlessPursuitTarget(c,target){
    const route=endlessPursuitRoute(c,target);
    if(!route||Math.hypot(target.x-c.x,target.y-c.y)<180)return target;
    const e=route.encounter;
    if(route.cemetery){const from=cemeteryProjection(e,c.x,c.y),to=cemeteryProjection(e,target.x,clamp(target.y,e.startY,e.endY));return cemeteryPoint(e,from.along+Math.sign(to.along-from.along)*Math.min(65*e.scale,Math.abs(to.along-from.along)));}
    const y=Math.min(e.endY,c.y+Math.min(65*e.scale,e.half*.3));
    return {x:encounterPathX(e.paths[route.index],y),y};
  }
  function recordEndless(reason){
    const a=state.endless;if(!a||a.debug)return;
    const distance=Math.max(0,Math.floor((a.furthestY-a.startY)/PX_PER_M)),best=Math.max(state.endlessRecord.distance||0,distance);
    state.endlessRecord={version:S.endless.recordVersion,distance:best,previousVersion:state.endlessRecord.previousVersion||null,last:{distance,cleared:state.course?.cleared||0,missed:state.course?.missed||0,reason}};
    state.endlessResult={distance,best,reason,until:clock+6};save();
  }
  function startEndless(gate,debugKind=null,debugVisit=1){
    const E=S.endless,p=state.p,startY=belowView(S.race.courseOffscreenMargin),pace=E.playerSpeedKmh/(S.physics.speedMultiplier*S.physics.hudKmhPerSpeed);
    stages.endless={...S.courses.endless,pace,length:Infinity};
    const block={},run={id:'endless',endless:true,arcade:{trees:true},block,x:gate?.x??p.x,selectionY:gate?.y??p.y,startY,endY:Infinity,objective:'gates',points:0,hits:0,cleared:0,missed:0,tricks:0,time:0,totalGates:0,shieldGateCharge:S.arcade.gear.shieldsPerStage/35};
    state.endless={startY,furthestY:startY,plannedY:startY,nextGateY:startY+300,nextLakeY:startY+E.firstLakeMetres*PX_PER_M,nextYetiY:startY+E.yetis.firstMetres*PX_PER_M,nextWildlifeY:startY+E.wildlife.firstMetres*PX_PER_M,wildlifeNumber:0,sections:[],encounters:[],encounterCount:0,themeVisits:{},townNames:[],nextEncounterY:startY+(E.regions.enabled?E.regions.firstMetres:E.encounters.firstMetres)*PX_PER_M,speedScale:1,gateNumber:0,shields:0,swords:0,shieldCharge:0,swordCharge:0,shieldsUsed:0,swordsUsed:0,combo:0,savedMetres:0};
    if(debugKind){state.endless.debug=true;state.endless.debugVisit=debugVisit;state.endless.themeVisits[debugKind]=debugVisit-1;state.endless.debugNextKind=debugKind;state.endless.nextEncounterY=startY;state.endless.nextGateY=startY+80;state.endless.regionOrderIndex=Math.max(0,E.regions.order.indexOf(debugKind)+1);}
    state.course=run;state.zone={kind:'course',origin:startY};state.safeTrails.push(run);state.chasers=[];state.patrolPenalty=null;state.plannedTown=null;state.results=null;state.arcadeResult=null;state.endlessResult=null;
    // The course schedules its own reachable threats; unrelated ambient sleepers add dead space.
    state.objects=state.objects.filter(o=>o.arcadeRun||!['lurker','wolf','bear'].includes(o.type)||o.dead||o.eaten);
    for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
    entity('courseStart',run.x,startY,{r:0,width:700,name:'ARCADE'});
    const route=state.liftRoutes.at(-1);if(route)route.y1=Math.min(route.y1,startY);
    state.endless.liftTail={x0:run.x+S.lift.x,x1:run.x+S.lift.x,y0:startY,y1:Infinity,endlessRun:run};state.liftRoutes.push(state.endless.liftTail);
    extendEndless();
    if(debugKind){
      const a=state.endless,e=a.encounters[0],y=e.startY+20*e.scale;
      Object.assign(p,{x:encounterPathX(e.paths[0],y),y,heading:0,desiredHeading:0,mode:'slide',speed:0,vx:0,vy:0});
      state.cam={x:p.x,y:p.y-H*S.render.playerScreenY/ZOOM};a.furthestY=p.y;e.entered=true;
      extendEndless();ensureWorld();announce('DEBUG - '+e.title.toUpperCase(),'VISIT '+debugVisit+'/'+E.encounters.difficultyVisits+' - ARROWS TO SKI',C.teal,4);
    }else announce('ARCADE','GATES FOR GEAR - HOW FAR CAN YOU GO?',stages.endless.color,5);
    state.transitions.push({kind:'start',id:'endless',y:p.y,paid:true});return true;
  }
  function debugEndlessArea(number,visit=null){
    const kind=ENDLESS_DEBUG_AREAS[number-1];
    if(!ready||!kind||state.deathTimer||state.sceneCard||!state.endless&&(state.course||state.zone.kind!=='start'))return false;
    const preview=state.endlessDebug,requested=visit??preview.visits[kind]??1;
    const step=clamp(Number.isFinite(requested)?Math.round(requested):1,1,S.endless.encounters.difficultyVisits);
    if(state.endless){
      state.endless.furthestY=Math.max(state.endless.furthestY,state.p.y);
      recordEndless('DEBUG SHORTCUT');state.endless.debug=true;
    }
    preview.selection=number;preview.visits[kind]=step;preview.seeds[kind]??=seed;
    seed=preview.seeds[kind];resetSummit(false,kind,step);return true;
  }
  function debugEndlessDifficulty(delta){
    const preview=state.endlessDebug,number=preview.selection,kind=ENDLESS_DEBUG_AREAS[number-1];
    if(!ready||!kind||!Number.isFinite(delta)||!delta||state.deathTimer||state.sceneCard||!state.endless&&(state.course||state.zone.kind!=='start'))return false;
    const limit=S.endless.encounters.difficultyVisits,current=preview.visits[kind]??1,next=clamp(current+Math.sign(delta),1,limit);
    if(next===current){announce('VISIT '+current+'/'+limit,current===1?'ALREADY AT THE EASIEST VISIT':'ALREADY AT THE HARDEST VISIT',C.teal,2);return true;}
    return debugEndlessArea(number,next);
  }
  function ravagerPreySpot(hunter){
    const side=pick([-1,1]),near=state.objects.filter(o=>o!==hunter&&o.r>0&&!o.dead&&!o.eaten&&Math.abs(o.x-hunter.x)<150+Math.max(o.width||0,o.r,o.treeLength||0)&&Math.abs(o.y-hunter.y)<150+Math.max(o.width||0,o.depth||0,o.r,o.treeLength||0));
    for(const [dx,dy] of [[side*65,60],[-side*65,60],[0,95],[side*90,0],[-side*90,0],[0,-75],[side*35,30],[-side*35,30]]){
      const p={x:hunter.x+dx,y:hunter.y+dy};
      if([.25,.5,.75,1].every(t=>{const x=hunter.x+dx*t,y=hunter.y+dy*t;return !patchAt(x,y)&&!near.some(o=>obstacleClearance(o,x,y)<14);}))return p;
    }
    return null;
  }
  function spawnRavagerPrey(hunter,spot=ravagerPreySpot(hunter)){
    if(!spot)return null;
    return entity('rabbit',spot.x,spot.y,{width:26,r:5,animal:true,arcadeRun:hunter.arcadeRun||hunter.chaseRun,encounter:hunter.encounter,ravagerIntroFor:hunter,ai:'idle',angle:0,nextAI:clock+1});
  }
  function spawnEndlessRavager(section,endY){
    const a=state.endless,R=S.endless.yetis.ravager,scale=section.endlessScale;
    const from=Math.max(section.startY,a.startY+R.firstMetres*PX_PER_M);
    if(endY-from<180*scale||random()>=R.chancePerSection)return;
    for(let attempt=0;attempt<10;attempt++){
      const y=range(from+80*scale,endY-100*scale),e=endlessEncounterAt(y);
      if(e?.town||e?.noNewPredators||['quiet','lake','beginner'].includes(e?.kind))continue;
      const path=e?pick(e.paths):null;
      const x=path?encounterPathX(path,y)+pick([-1,1])*e.half*range(.15,.45):section.x+range(-200,200)*scale;
      if(patchAt(x,y)||state.objects.some(o=>o.r>0&&!o.dead&&!o.eaten&&obstacleClearance(o,x,y)<40))continue;
      const radius=S.endless.yetis.nearbyMetres*PX_PER_M*scale;
      const near=o=>o.ravager&&!o.dead&&!o.eaten&&!o.leaving&&activeCourseOwner(o)&&Math.hypot(o.x-x,o.y-y)<radius;
      if(state.chasers.filter(near).length+state.objects.filter(near).length>=R.maxNearby)return;
      const spot=ravagerPreySpot({x,y});if(!spot)continue;
      const speed=S.endless.yetis.speedKmh[1]*R.speedMultiplier;
      const hunter=entity('lurker',x,y,{arcadeRun:section,encounter:e,width:55,r:18,ravager:true,arcadeTier:'fast',endlessBaseKmh:speed,yetiSpeedKmh:speed*scale,wakeSeconds:S.endless.yetis.wakeSeconds});
      hunter.ravagerIntroPrey=spawnRavagerPrey(hunter,spot);
      return;
    }
  }
  function yetiWakeDistance(o){
    if(!state.endless||!activeCourseOwner(o))return S.wildlife.yetiWakeDistance*endlessSpeedScale(o);
    return Math.max(S.endless.yetis.wakeMetres*PX_PER_M*endlessSpeedScale(o),state.p.speed*((o.wakeSeconds||0)+.8));
  }
  function yetiWakeDelay(o){
    const delay=o.wakeSeconds||0;if(!state.endless||!activeCourseOwner(o)||state.p.vy<=0)return delay;
    // Fast ice must not carry the skier past a hunter's entire wake animation.
    return Math.min(delay,Math.max(.35,(o.y-state.p.y)/state.p.vy-.7));
  }
  function endlessAnimalNotice(o,base){return state.endless&&activeCourseOwner(o)?Math.max(S.endless.wildlife.noticeMetres*PX_PER_M*endlessSpeedScale(o),state.p.speed*.9):base;}
  function spawnEndlessWildlife(section,endY,pressure){
    const a=state.endless,Wl=S.endless.wildlife,scale=section.endlessScale,root=section.endlessRoot;
    while(a.nextWildlifeY<endY){
      const e=endlessEncounterAt(a.nextWildlifeY);
      if(e&&(e.town||e.noNewPredators||['beginner','crowd'].includes(e.kind))){a.nextWildlifeY=e.endY+1;continue;}
      const near=o=>o.y>state.p.y-S.endless.yetis.nearbyMetres*PX_PER_M*scale;
      const live=state.chasers.filter(o=>o.kind==='bear'&&activeCourseOwner(o)&&!o.dead&&!o.leaving&&near(o)).length+state.objects.filter(o=>['wolf','bear'].includes(o.type)&&activeCourseOwner(o)&&!o.dead&&!o.eaten&&near(o)).length;
      if(live<Wl.maxNearby){
        const kind=a.wildlifeNumber%2?'bear':'wolf',path=e?pick(e.paths):null,side=pick([-1,1]);
        let y=Math.max(section.startY+100,a.nextWildlifeY),x;
        for(let i=0;i<12;i++,y+=25*scale){
          x=path?encounterPathX(path,y)+side*e.half*.5:root.x+side*range(150,250)*scale;
          const clear=(xx,yy)=>!endlessTownAt(xx,yy)&&!patchAt(xx,yy)&&!state.objects.some(o=>o.r>0&&!o.dead&&obstacleClearance(o,xx,yy)<32);
          const count=kind==='bear'?1:Math.min(Wl.maxNearby-live,Math.floor(range(...[Wl.wolfPackSize[0],Wl.wolfPackSize[1]+1])));
          if(!Array.from({length:count},(_,j)=>clear(x+(j%2?1:-1)*j*18,y+j*22)).every(Boolean))continue;
          const packId=random();for(let j=0;j<count;j++)entity(kind,x+(j%2?1:-1)*j*18,y+j*22,{arcadeRun:section,width:kind==='bear'?60:43,r:kind==='bear'?18:11,animal:true,humanVisitor:true,packId,packIndex:j,ai:'idle',nextAI:clock+range(1,4)});
          a.wildlifeNumber++;break;
        }
      }
      a.nextWildlifeY=Math.max(a.nextWildlifeY,section.startY)+mix(...Wl.intervalMetres,pressure.t)*PX_PER_M*scale;
    }
  }
  function extendEndless(){
    const a=state.endless,root=state.course,E=S.endless;if(!a||!root?.endless)return;
    const horizon=Math.max(viewBounds().bottom,state.p.y+H*(1-S.render.playerScreenY)/ZOOM)+E.lookAheadMetres*PX_PER_M*a.speedScale;
    while(a.plannedY<horizon){
      const startY=a.plannedY,distance=(startY-root.startY)/PX_PER_M,scale=endlessScaleAt(distance),endY=startY+E.sectionMetres*PX_PER_M*scale;
      const P=endlessPressure(distance),rate=key=>mix(...E.rates[key],P.t)*P.wave/(scale*scale);
      const itemRates=Object.fromEntries(Object.keys(ARCADE_ITEMS).map(key=>[key,0]));
      const trees=rate('trees')*P.forest;
      Object.assign(itemRates,{pine:trees,fir:trees*.6,spruceTree:trees*.25,smallPine:trees*.3,skier:rate('skiers'),fastSkier:rate('fastSkiers'),smallHill:rate('jumps'),largeHill:rate('jumps')*.35,rainbow:rate('jumps')*.25});
      const section={id:'endless',endlessRoot:root,endlessScale:scale,block:root.block,x:root.x,startY,endY,finishHalf:0,arcade:{knobs:[1,1,1,1,1],trees:true,specialLayout:'none',gates:{count:0,swordGateCount:0,icePercent:0,openingWidthMetres:mix(...E.gates.openingMetres,P.t)},spacing:E.gates.spacingMetres*PX_PER_M*scale,pace:E.playerSpeedKmh*scale/(S.physics.speedMultiplier*S.physics.hudKmhPerSpeed),itemSpreadMetres:E.itemSpreadMetres*scale,itemRates,tierRates:{slightlyRare:0,veryRare:0},endTrafficMultiplier:1}};
      while(a.nextEncounterY<endY+1200*scale){const e=planEndlessEncounter(section,a.nextEncounterY);a.nextEncounterY=e.endY+range(...(E.regions.enabled?E.regions.gapMetres:E.encounters.gapMetres))*PX_PER_M*e.scale;}
      for(const e of a.encounters)if(e.startY<endY&&e.endY>startY)populateEndlessEncounter(e,section,endY);
      while(a.nextGateY<endY){
        const encounter=endlessEncounterAt(a.nextGateY);
        if(encounter?.noFlags){a.nextGateY=encounter.endY+1;continue;}
        if(E.regions.enabled&&encounter?.kind==='trees'&&a.nextGateY<encounter.startY+200*encounter.scale){a.nextGateY=encounter.startY+200*encounter.scale;if(a.nextGateY>=endY)break;}
        const landmark=!!encounter?.town||encounter?.kind==='cemetery';
        let checkpoint=0;
        if(landmark){
          // One clear checkpoint at each rejoin, rather than flags down both side routes.
          checkpoint=encounter.checkpoints.findIndex(y=>y>=a.nextGateY-1e-7)+1;
          if(!checkpoint){a.nextGateY=encounter.endY+E.gates.spacingMetres*PX_PER_M*encounter.scale;continue;}
          a.nextGateY=encounter.checkpoints[checkpoint-1];
          if(a.nextGateY>=endY)break;
        }
        const number=++a.gateNumber,metres=(a.nextGateY-root.startY)/PX_PER_M;
        const t=encounter?encounter.difficulty:endlessPressure(metres).t,gateScale=encounter?encounter.scale:endlessScaleAt(metres);
        const gear=landmark?(checkpoint%2?'shield':'sword'):(number%E.gates.swordEvery===0?'sword':'shield');
        // Keep approximately the same equipment supply per metre with fewer visible gates.
        const gearWeight=landmark?encounter.chamberLength/(E.gates.spacingMetres*PX_PER_M*gateScale)*2*(gear==='sword'?1/E.gates.swordEvery:1-1/E.gates.swordEvery):1;
        const forest=encounter?.kind==='trees';
        const half=forest?encounter.half*mix(.28,.24,t):encounter?.kind==='cemetery'?encounter.half-8*gateScale:Math.min(mix(...E.gates.openingMetres,t)*PX_PER_M*gateScale/2,encounter?encounterHalf(encounter,a.nextGateY)-22*encounter.scale:Infinity);
        const offset=forest?(number%2?-1:1)*Math.max(0,encounter.half-half-14*gateScale):['beginner','crowd','forest'].includes(encounter?.kind)?(number%2?-1:1)*mix(...E.gates.swingMetres,t)*PX_PER_M*gateScale:0;
        const raw=encounter?encounter.paths.map(path=>(encounter.specialArea?specialGateX(encounter,a.nextGateY,number,path):encounterPathX(path,a.nextGateY))+offset):[root.x+(number%2?-1:1)*mix(...E.gates.swingMetres,t)*PX_PER_M*gateScale];
        const spread=Math.max(...raw)-Math.min(...raw),merged=raw.length>1&&spread<half*2.3;
        const positions=merged?[raw.reduce((a,b)=>a+b,0)/raw.length]:raw,opening=merged&&!forest?half+spread*.3:half;
        const group={members:[],checked:false};
        for(const x of positions){
          const gate=entity('gate',x,a.nextGateY,{half:opening,width:opening*2,r:0,number,color:number%2?C.red:C.blue,checked:false,run:root,gateGroup:group,gear,gearWeight,encounter});group.members.push(gate);
          if(encounter?.kind==='rivalRace'&&gate.y>=encounter.startY+800*encounter.scale&&gate.y<=encounter.endY-180*encounter.scale)encounter.raceGates.push(gate);
        }
        section.arcade.gates.count++;root.totalGates++;a.nextGateY+=E.gates.spacingMetres*PX_PER_M*gateScale;
      }
      while(a.nextLakeY<endY){
        const metres=(a.nextLakeY-root.startY)/PX_PER_M,p=endlessPressure(metres),r=E.lakeRadiusMetres;
        const lakeScale=endlessScaleAt(metres),rx=range(r[0],mix(r[0]+2,r[1],p.t))*PX_PER_M*lakeScale,ry=rx*range(.75,1);
        if(!a.encounters.some(e=>e.kind!=='forest'&&a.nextLakeY+ry>e.startY-100*lakeScale&&a.nextLakeY-ry<e.endY+100*lakeScale)){
          const lake=entity('ice',root.x+range(-140,140)*lakeScale,a.nextLakeY,{rx,ry,width:rx*2,r:0,arcadeRun:section,arcadeFeature:true});
          // Natural forest lakes keep their open water footprint even when streamed after trees.
          state.objects=state.objects.filter(o=>o.encounter?.kind!=='forest'||!TREE_TYPES.has(o.type)&&!['smallHill','largeHill','rainbow'].includes(o.type)||!lakeContains(lake,o.x,o.y));
        }
        const density=Math.max(.02,mix(...E.rates.lakes,p.t)*p.wave*p.lakes);
        a.nextLakeY+=Math.max(110,100/density*range(.8,1.2))*PX_PER_M*lakeScale;
      }
      prepareArcadeTerrain(section);
      const live=state.chasers.filter(c=>activeCourseOwner(c)&&!c.ravager&&!c.dead&&!c.leaving&&c.y>state.p.y-E.yetis.nearbyMetres*PX_PER_M*scale).length+state.objects.filter(o=>o.type==='lurker'&&!o.ravager&&activeCourseOwner(o)&&!o.dead&&!o.eaten).length;
      const desired=Math.min(E.yetis.maxNearbyHunters,1+Math.floor(Math.max(0,distance-E.yetis.firstMetres)/E.yetis.additionalEveryMetres));
      if(a.nextYetiY<endY){
        const scheduledRegion=endlessEncounterAt(a.nextYetiY);
        if(live<desired&&!scheduledRegion?.town&&!scheduledRegion?.noNewPredators&&!['beginner','crowd'].includes(scheduledRegion?.kind)){
          const y=Math.max(startY+100,a.nextYetiY),near=state.objects.find(o=>o.type==='ice'&&o.arcadeRun&&o.y>y-350&&o.y<y+350),side=pick([-1,1]);
          let x=near?near.x+side*(near.rx*.65+65):root.x+side*range(170,290)*scale,at=near?near.y+near.ry+65:y;
          const corridor=endlessEncounterAt(at),path=corridor&&!corridor.town?pick(corridor.paths):null;
          if(path)x=encounterPathX(path,at)+side*corridor.half*.68;
          for(let i=0;i<8&&(patchAt(x,at)||state.objects.some(o=>o.r>0&&obstacleClearance(o,x,at)<40||o.type==='gate'&&Math.abs(o.x-x)<o.half+45&&Math.abs(o.y-at)<80));i++){
            at+=25*scale;x=path?encounterPathX(path,at)+side*corridor.half*(i%2?.68:-.68):x+side*35*scale;
          }
          const speed=mix(...E.yetis.speedKmh,P.t);
          if(!endlessTownAt(x,at)&&!patchAt(x,at)&&!state.objects.some(o=>o.r>0&&obstacleClearance(o,x,at)<40))entity('lurker',x,at,{width:55,r:18,arcadeRun:section,arcadeTier:speed>90?'special':speed>78?'fast':'slow',yetiSpeedKmh:speed*scale,endlessBaseKmh:speed,shoreLake:near,wakeSeconds:E.yetis.wakeSeconds});
        }
        a.nextYetiY=Math.max(a.nextYetiY,endY)+mix(...E.yetis.intervalMetres,P.t)*PX_PER_M*scale;
      }
      spawnEndlessWildlife(section,endY,P);spawnEndlessRavager(section,endY);clearLakeExitSpringApproaches();
      a.sections.push(section);a.plannedY=endY;
    }
    extendEndlessTownLanes();
    a.sections=a.sections.filter(r=>r.endY>state.p.y-S.world.sceneryRetentionBehind);
    a.encounters=a.encounters.filter(e=>e.endY>state.p.y-S.world.sceneryRetentionBehind||state.chasers.some(c=>activeCourseOwner(c)&&!c.dead&&!c.leaving&&c.y>=e.startY-200*e.scale&&c.y<=e.endY)||state.objects.some(o=>(o.type==='wolf'&&o.linkedChase||o.type==='zombie'&&(o.awake||o.graveWakeAt!==undefined)&&o.zombieState!=='spent')&&activeCourseOwner(o)&&o.y>=e.startY-200*e.scale&&o.y<=e.endY));
  }
  function updateEndless(){
    const a=state.endless;if(!a)return;
    state.liftRoutes=state.liftRoutes.filter(r=>!r.endlessRun||r.y1>state.p.y-S.world.sceneryRetentionBehind);
    a.furthestY=Math.max(a.furthestY,state.p.y);const distance=Math.max(0,(a.furthestY-a.startY)/PX_PER_M);
    if(distance>=a.savedMetres+250){a.savedMetres=distance;recordEndless('RUNNING');state.endlessResult=null;}
    const active=endlessEncounterAt(state.p.y);
    if(active&&!active.entered&&!(state.specialResultUntil>clock)){active.entered=true;announce(active.festival?active.title.toUpperCase():active.town?active.town.name.toUpperCase():active.title.toUpperCase(),active.kind==='christmas'?'MIND THE SLEIGH - FIND THE MISTLETOE':active.kind==='halloween'?'SOME COSTUMES ARE NOT COSTUMES':active.town?'ENTRY / EXIT FLAGS - YETIS CAN FOLLOW':active.kind==='quiet'?'FOLLOW THE SNOW PATH - TAKE A BREATH':active.kind==='scramble'?'FIND A GAP - OR JUMP':active.kind==='cemetery'?'PICK YOUR GAP - WATCH THE BONES':active.kind==='rivalRace'?'FOLLOW THE GATES - DRAFT TO OVERTAKE':['beginner','crowd'].includes(active.kind)?'SKI THROUGH THE CROWD':active.noFlags?'NO FLAGS - FOLLOW THE SLOPE':active.paths.length>1?'CHOOSE A BRANCH - EITHER GATE COUNTS':'WIND THROUGH THE PINES',C.teal,3);}
    state.roads=state.roads.filter(r=>!r.endlessEncounter||(r.endlessEndY??r.endlessEncounter.endY)>state.p.y-S.world.sceneryRetentionBehind);
    state.villages=state.villages.filter(t=>!t.endlessRun||t.end>state.p.y-S.world.sceneryRetentionBehind);
    const view=viewBounds();
    for(const o of state.objects){
      if(o.endlessBaseVy!==undefined&&activeCourseOwner(o)&&!(o.npcFallUntil>clock))o.vy=o.endlessBaseVy*a.speedScale;
      if(o.type==='ice'&&o.iceTile&&o.y+o.lake.radius<view.top-200)o.iceTile=null;
    }
    const far=o=>o.y<state.p.y-S.endless.yetis.nearbyMetres*PX_PER_M*a.speedScale;
    const dormant=o=>!o.dead&&!o.eaten&&(o.type==='lurker'||['wolf','bear'].includes(o.type)&&!o.linkedChase&&!o.wolfAwake&&!(o.alertUntil>clock)&&!o.divert&&!(o.feedingUntil>clock));
    // Discard missed, unengaged threats once offscreen. Awake hunters keep physically pursuing.
    filterObjects(o=>!((dormant(o)&&(far(o)||o.y<view.top-100))||(['skier','boarder'].includes(o.type)&&o.y>a.plannedY+800*a.speedScale))||!activeCourseOwner(o));
  }
  function retireArcadeBlock(run){
    const owned=o=>{const owner=o.arcadeRun||o.chaseRun;return owner&&(owner===run||run?.block&&owner.block===run.block);};
    // A finished block has no hostile role in the protected town/run-out.
    state.chasers=state.chasers.filter(c=>!owned(c));
    state.objects=state.objects.filter(o=>!owned(o)||!MONSTER_KINDS.has(enemyKind(o)));
    state.speech=state.speech.filter(s=>!owned(s.object));
  }
  function startCourse(id,gate) {
    if(id==='arcade')id='endless'; // Public Arcade now launches the infinite slope.
    if(state.course||state.endless||state.arcade&&id!=='arcade')return false;
    if(id==='endless')return startEndless(gate);
    state.endlessResult=null;
    const s=stages[id],p=state.p,paid=state.bank>=s.fee;
    if(paid){state.bank-=s.fee;save();}
    const startY=belowView(S.race.courseOffscreenMargin),endY=startY+s.length*PX_PER_M;
    const run={id,arcade:null,objective:s.kind==='mushroom'?'mushrooms':'gates',collected:0,totalMushrooms:0,x:gate?.x??p.x,selectionY:gate?.y??p.y,startY,endY,points:0,hits:0,cleared:0,missed:0,tricks:0,time:0,violation:!paid,left:false,finishPassed:false,finishHalf:(s.kind==='forest'?S.race.forestGateHalfWidth:S.race.gateHalfWidth)*(s.gateScale||1)*S.race.finishWidthMultiplier};
    const previousTown=state.villages.filter(t=>t.end<=startY&&t.origin<run.selectionY).at(-1);
    if(previousTown){previousTown.approachEndY=startY;const road=previousTown.approachRoad;road.points=[{x:previousTown.x,y:previousTown.roadEndY},{x:previousTown.x,y:Math.max(previousTown.roadEndY,startY-200)},{x:run.x,y:startY}];delete road.tiles;delete road.bounds;}
    state.results=null;state.safeTrails.push(run);state.course=run;state.zone={kind:'course',origin:startY};state.generated=startY+S.race.terrainStartOffset;state.gateCount=0;
    for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
    if(run.objective!=='mushrooms'&&s.spacing){let count=0;for(let y=startY+S.race.gateStartOffset;y<endY-S.race.gateFinishClearance;y+=s.spacing){
      const x=centerAt(y,run)+(count%2===0?-1:1)*(s.kind==='forest'?S.race.forestGateSwing:S.race.gateSwing);
      entity('gate',x,y,{half:(s.kind==='forest'?S.race.forestGateHalfWidth:S.race.gateHalfWidth)*(s.gateScale||1),width:180,r:0,number:++count,color:count%2?C.red:C.blue,checked:false,run});
    }run.totalGates=count;}
    entity('courseStart',run.x,startY,{r:0,width:700,name:s.name});entity('finish',run.x,endY,{r:0,width:run.finishHalf*2,half:run.finishHalf});
    // Spectators exist before the finish comes into view; a perfect run activates their celebration.
    for(let i=0;i<S.race.spectators;i++)entity(i%2?'personYellow':'personRed',run.x+(i%2?1:-1)*(run.finishHalf+65+(i%3)*20),endY+80+Math.floor(i/2)*105,{width:30,r:10,cheerRun:run});
    state.plannedTown=makeVillage(endY+S.race.townAfterFinish,run.x,false);
    protectScenery();
    if(id!=='slalom'&&run.objective!=='mushrooms'){entity('ice',run.x+290,startY+940,{rx:185,ry:250,width:370,r:0});
    entity('ice',run.x-240,startY+1940,{rx:85,ry:105,width:170,r:0});
    for(let y=startY+S.race.rainbowFirstOffset;y<endY-300;y+=s.kind==='freestyle'?S.race.freestyleRainbowSpacing:S.race.rainbowSpacing)entity('rainbow',centerAt(y,run)-90,y,{width:115,r:25});}
    if(run.objective==='mushrooms')plantMushrooms(run);
    if(id==='slalom')state.objects=state.objects.filter(o=>!classicArea(o.x,o.y,70)||['gate','courseStart','finish','entrance','skier','boarder','personRed','personGreen','personYellow'].includes(o.type));
    const oldRoute=state.liftRoutes[state.liftRoutes.length-1];
    if(oldRoute&&oldRoute.y1>startY)oldRoute.y1=startY;
    state.liftRoutes.push({x0:oldRoute?liftX(oldRoute,startY):run.x+S.lift.x,x1:state.plannedTown.stationX,y0:startY,y1:state.plannedTown.stationY});
    announce(s.name.toUpperCase(),`${Math.round(s.length)} m ahead${s.fee?(paid?`  ·  ${s.fee} coins paid`:'  ·  Unpaid adventure!'):'  ·  Follow the flags.'}`,s.color);
    if(run.objective==='mushrooms')announce('SPORE DECISIONS',`COLLECT ${Math.ceil(run.totalMushrooms*S.mushroomHunt.minimumFraction)}/${run.totalMushrooms} MUSHROOMS - THEN FINISH${s.fee&&paid?' · '+s.fee+' PAID':''}`,s.color,5);
    if(!paid)triggerAmbush();else if(s.kind==='slow'){addChasers('slow',S.politePursuit.count,run);announce('POLITE PURSUIT',`${S.politePursuit.count} SLOW YETIS - THEY FOLLOW YOU OFF PISTE`,s.color,5);}else if(s.kind==='fast')addChasers('fast',1);
    state.transitions.push({kind:'start',id,y:p.y,paid});beep(650,.14);return true;
  }

  function markArcadeGearGates(run){
    const gates=state.objects.filter(o=>o.type==='gate'&&o.run===run),G=S.arcade.gear;
    const count=run.arcade.gates.swordGateCount;
    for(let i=0;i<count;i++)gates[Math.floor((i+1)*gates.length/(count+1))].gear='sword';
    run.shieldGateCharge=G.shieldsPerStage/Math.max(1,gates.length-count);
  }
  function collectArcadeGear(gate){
    const a=state.arcade||state.endless,G=S.arcade.gear,kind=gate.gear==='sword'?'sword':'shield',stock=kind+'s',charge=kind+'Charge',cap=kind==='sword'?G.maxSwords:G.maxShields;
    if(!a)return;
    a.combo=Math.min(3,(a.combo||0)+1);gate.comboLevel=a.combo;
    if(a[stock]>=cap){gate.gearFull=true;return;}
    const needed=kind==='sword'?G.swordGatesPerSword:1;
    const added=(kind==='sword'?1:gate.run.shieldGateCharge)*(gate.gearWeight??1)*a.combo/3;
    a[charge]+=added;gate.gearPercent=Math.round(added/needed*100);
    let ready=false;
    while(a[stock]<cap&&a[charge]+1e-9>=needed){a[stock]++;a[charge]=a[stock]>=cap?0:Math.max(0,a[charge]-needed);ready=true;}
    if(ready){say(kind.toUpperCase()+' READY!',state.p,1.5);burst(state.p.x,state.p.y,kind==='sword'?G.swordColor:G.shieldColor,12);beep(kind==='sword'?980:820,.12);}
    a.gearFlash={kind,until:clock+.4};
  }
  function useObstacleShield(obstacle){
    const a=state.arcade||state.endless,p=state.p,G=S.arcade.gear;
    if((!a?.shields&&!state.cocoaShields)||insideTown(p.x,p.y)&&!endlessTownAt(p.x,p.y)||safeApproach(p.x,p.y)||p.awaitingInput||tooSlowForObstacle(obstacle))return false;
    if(a?.shields)a.shields--;else{state.cocoaShields--;save();}if(a)a.shieldsUsed++;p.shield=Math.max(p.shield,G.protectionSeconds);
    if(obstacle)p.slowContacts.add(obstacle);
    const effect={kind:'shield',start:clock,until:clock+G.effectSeconds};if(a)a.gearEffect=effect;else state.cocoaEffect=effect;
    burst(p.x,p.y,G.shieldColor,20);beep(620,.14,'triangle');return true;
  }
  function useArcadeSword(target){
    const a=state.arcade||state.endless,p=state.p,G=S.arcade.gear;
    if(!a||!a.swords||target.dead||p.air>0||state.deathTimer||p.shield>0)return false;
    a.swords--;a.swordsUsed++;target.dead=true;target.animal=false;target.running=false;target.r=0;target.vx=target.vy=target.roam=0;
    target.fadeUntil=clock+(target.type==='wolf'?S.wildlife.wolfFadeSeconds:S.wildlife.predatorFadeSeconds);
    p.shield=G.protectionSeconds;
    a.gearEffect={kind:'sword',start:clock,until:clock+G.effectSeconds,angle:Math.atan2(target.y-p.y,target.x-p.x)};
    burst(target.x,target.y,G.swordColor,20);beep(980,.1,'triangle');
    for(const skier of state.objects){
      if(skier.threat===target){skier.threat=null;skier.fearUntil=0;say(pick(S.dialogue.rescued),skier,2);}
    }
    return true;
  }

  function arcadeTerrainAt(run,y){return run.arcade||{trees:false};}
  function nearArcadeFeature(x,y,allowGateIce=false){return state.objects.some(o=>o.arcadeFeature&&(!allowGateIce||!o.gateIce)&&(Math.hypot(o.x-x,o.y-y)<S.arcade.featureClearance||['ramp','mogul','smallHill','largeHill','logBump'].includes(o.type)&&y>o.y&&y<(o.landingY??o.y+S.arcade.landingClearanceLength)&&Math.abs(x-o.x)<S.arcade.landingClearanceHalfWidth));}
  function courseCreature(o,x,y){return activeCourseOwner(o)&&(!insideTown(x,y)||!!endlessTownAt(x,y));}
  function createArcadeItem(key,x,y,run){
    const spec=ARCADE_ITEMS[key],extra={...spec,arcadeRun:run,nextAI:clock+range(1,4),humanVisitor:true};delete extra.type;
    if(key==='fallingTree'&&Math.abs(x-arcadePathX(run,y))<=S.terrainFeatures.fallingTree.heightMetres*PX_PER_M*.75)extra.fallTowardX=arcadePathX(run,y);
    if(key==='rollingSnowball')extra.rollSide=x>run.x?-1:1;
    if(key==='overtakingSkier')return entity('arcadeOvertaker',x,y,{r:0,arcadeRun:run});
    if(key==='wolfPack'){
      const packId=random(),count=Math.floor(range(S.wildlife.packMin,S.wildlife.packMax+1));
      for(let i=0;i<count;i++)entity('wolf',x+(i%2?1:-1)*i*18,y+Math.floor(i/2)*25,{...extra,packId,packIndex:i});return;
    }
    if(key==='wolf'){extra.packId=random();extra.packIndex=0;}
    if(spec.type==='lurker')extra.yetiSpeedKmh=run.arcade.yetiSpeedKmh;
    if(spec.type==='skier')extra.vy=extra.fast?run.arcade.pace*S.physics.speedMultiplier*range(...S.arcade.trafficFastSpeedRatio):range(...S.skiers.slowSpeed);
    if(spec.type==='boarder')extra.vy=range(...S.skiers.boarderSpeed);
    if(run.endlessRoot&&['skier','boarder'].includes(spec.type)){if(!extra.fast)extra.vy*=run.endlessScale;extra.endlessBaseVy=extra.vy/run.endlessScale;}
    if(spec.type==='lodge'||spec.type==='rental')extra.houseStyle=Math.floor(random()*S.houseAnimation.trimRGB.length);
    if(spec.type==='path')state.roads.push({surface:spec.surface,width:spec.width,points:[{x,y:y-70},{x,y:y+70}]});
    return entity(spec.type,x,y,extra);
  }
  // Knob densities were tuned at +/-32m; placement counts scale with spread to hold per-area density.
  const SPREAD_REFERENCE_METRES=32;
  function prepareArcadeSpecialLayout(run){
    const layout=run.arcade.specialLayout,g=run.arcade.gates,spacing=run.arcade.spacing;
    const first=run.startY+g.firstGateMetres*PX_PER_M;
    run.encounterClearings=[];
    const reserve=(x,from,to,half)=>run.encounterClearings.push({x,from,to,half});
    const place=(key,x,y)=>createArcadeItem(key,x,y,run);
    if(layout==='yetiIntro'){
      // Learn the chase across three clear gates before adding normal forest and traffic.
      reserve(run.x,run.startY-100,first+Math.min(2,g.count-1)*spacing+60,S.arcade.landingClearanceHalfWidth);
    }else if(layout==='momentum'){
      let hills=0;
      for(const plan of run.momentumJumps){
        const {gap:i,kind,risky}=plan,from=run.gateYs[i],to=run.gateYs[i+1];
        const y=risky?to-range(320,440):mix(from,to,range(.16,.32));
        // The risky branch stays on the previous gate's side, opposite the imminent gate.
        // Taking it downhill trades that gate/combo for escape speed; the other jumps are aimable.
        const x=risky?run.gateXs[i]+Math.sign(run.gateXs[i]-run.x)*range(95,140):arcadePathX(run,y)+pick([-1,1])*range(65,115);
        const target=Math.min(g.count-1,i+(risky?2:1)),targetX=run.gateXs[target],targetY=run.gateYs[target];
        const jump=place(kind,x,y);jump.jumpDurationCap=momentumJumpCap(kind);
        jump.landingY=risky?run.gateYs[Math.min(g.count-1,i+3)]-180:Math.min(run.endY-180,(run.gateYs[i+2]??run.endY)-180);
        plan.x=x;plan.y=y;
        const flight=run.arcade.pace*S.physics.speedMultiplier*S.jump.speedBoost*momentumJumpDuration(kind);
        const landing=Math.min(y+flight,jump.landingY),landingX=x+(targetX-x)*(landing-y)/(targetY-y);
        const low=Math.min(x,targetX,landingX),high=Math.max(x,targetX,landingX);
        reserve((low+high)/2,y-120,landing+100,(high-low)/2+150);
        if(kind==='largeHill'&&hills++%2===1){
          const roughY=y+(landing-y)*.45,roughX=x+(landingX-x)*.45;
          const rough=place('rugged',roughX,roughY);rough.ry=55;
        }
      }
    }else if(layout==='jumpLine'){
      const hill='largeHill',duration=S.jump.largeHillSeconds*S.jump.hillDurationMax;
      const speed=run.arcade.pace*S.physics.speedMultiplier,flight=speed*S.jump.speedBoost*duration;
      const stride=Math.max(3,Math.ceil((flight+220)/spacing));
      for(let i=1,n=0;i<g.count-3;i+=stride,n++){
        const y=first+(i+1.5)*spacing-180;
        if(y+flight+100>run.endY-100)break;
        place(hill,run.x,y);
        reserve(run.x,y-120,y+flight+100,S.arcade.landingClearanceHalfWidth);
        if(n%2===0)place('logJump',run.x,y+180);
        else for(let dx=-140;dx<=140;dx+=70)place('pine',run.x+dx,y+180);
      }
    }else if(layout==='iceChaos'){
      // Irregular lakes interrupt the route; predators stay on the snowy far banks.
      for(let i=2;i<g.count-3;i+=Math.floor(range(3,5))){
        const y=first+(i+range(.25,.75))*spacing,x=arcadePathX(run,y)+range(-90,90),rx=range(220,340),ry=range(220,310);
        const lake=entity('ice',x,y,{rx,ry,width:rx*2,r:0,arcadeFeature:true,arcadeRun:run});
        reserve(x,y-ry-60,y+ry+60,rx+50);
        // Traffic starts on the near bank and carries its incoming heading onto the ice.
        for(let n=0;n<3;n++)place(n===2?'boarder':'skier',x+(n-1)*45,y-ry-65);
        for(let n=0;n<2;n++){
          let xx=x+(n?1:-1)*rx*.45,yy=y+ry+45;
          while(patchAt(xx,yy))yy+=25;
          const guard=place(n?'yetiOrange':'wolf',xx,yy);guard.shoreLake=lake;
          if(guard.type==='wolf'){guard.shoreWaiting=true;guard.angle=-Math.PI/2;}
        }
      }
    }else if(layout==='iceIslands'){
      // Short ice crossings with a full snow gap for choosing the next heading.
      for(let i=1;i<g.count-2;i+=2){
        const y=first+(i+.5)*spacing,x=arcadePathX(run,y),rx=g.openingWidthMetres*PX_PER_M/2+30,ry=Math.min(spacing*.2,70);
        entity('ice',x,y,{rx,ry,width:rx*2,r:0,arcadeFeature:true,arcadeRun:run});
        reserve(x,y-ry-45,y+ry+45,rx+30);
      }
    }else if(layout==='snowballs'||layout==='timber'){
      const stride=layout==='snowballs'?2:1,key=layout==='snowballs'?'rollingSnowball':'fallingTree';
      for(let i=1,n=0;i<g.count-2;i+=stride,n++){
        const y=first+(i+.5)*spacing,path=arcadePathX(run,y),side=n%2?1:-1;
        const x=path+side*(layout==='snowballs'?18:6)*PX_PER_M;
        place(key,x,y);reserve(path,y-80,y+80,100);
      }
    }
  }
  function prepareArcadeTerrain(run){
    // Plan every configured object below the viewport; no hidden mixed spawn tables.
    state.objects=state.objects.filter(o=>run.endlessRoot&&o.worldChunk&&endlessEncounterAt(o.y)?.kind==='quiet'&&Math.abs(o.x-encounterPathX(endlessEncounterAt(o.y).paths[0],o.y))>410||o.arcadeRun&&(o.arcadeRun!==run||run.endlessRoot)||o.y<run.startY-100||o.y>run.endY||Math.abs(o.x-centerAt(o.y,run))>S.world.safeCourseHalfWidth+100||o.penaltyGate||!o.worldChunk&&['gate','courseStart','finish','entrance','personRed','personGreen','personYellow'].includes(o.type));
    const gates=state.objects.filter(o=>o.type==='gate'&&o.run===(run.endlessRoot||run)&&o.y>=run.startY&&o.y<run.endY);
    const iceGates=[...gates];for(let i=iceGates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[iceGates[i],iceGates[j]]=[iceGates[j],iceGates[i]];}
    for(const g of iceGates.slice(0,Math.round(gates.length*(run.arcade.gates.icePercent||0)/100)))entity('ice',g.x,g.y,{gateIce:true,arcadeFeature:true,arcadeRun:run,rx:g.half+45,ry:Math.min(run.arcade.spacing*.25,80),width:(g.half+45)*2,r:0});
    prepareArcadeSpecialLayout(run);
    const openings=run.endlessRoot?gates:[...gates,{x:run.x,y:run.startY,half:run.arcade.gates.openingWidthMetres*PX_PER_M/2},{x:run.x,y:run.endY,half:run.finishHalf}];
    const entries=Object.keys(ARCADE_ITEMS).map(key=>[key,arcadeItemRate(run.arcade,key)]).filter(([key,n])=>n>0&&(!ARCADE_ITEMS[key].noCourse||run.arcade.itemRates?.[key]!==undefined)).sort(([a],[b])=>Number(!!ARCADE_ITEMS[b].arcadeFeature)-Number(!!ARCADE_ITEMS[a].arcadeFeature));
    const spreadScale=SPREAD_REFERENCE_METRES/run.arcade.itemSpreadMetres;
    for(const [key,density] of entries){
      const spec=ARCADE_ITEMS[key],spacing=100*PX_PER_M/density*spreadScale,traffic=['skier','fastSkier','overtakingSkier','boarder'].includes(key);
      let y=run.startY+S.race.terrainStartOffset+spacing*range(.25,.75);
      while(y<run.endY-100){
        let at=y;y+=spacing/(traffic?arcadeTrafficMultiplier(run,at):1)*range(1-S.arcade.spawnJitter,1+S.arcade.spawnJitter);
        if(key==='overtakingSkier'){createArcadeItem(key,run.x,at,run);continue;}
        const feature=key==='fallingTree'?S.terrainFeatures.fallingTree:key==='logJump'?S.terrainFeatures.logJump:key==='rollingSnowball'?S.terrainFeatures.rollingSnowball:null;
        const animated=key==='fallingTree'||key==='rollingSnowball',onPath=key==='logJump'||animated&&random()<feature.pathPlacementChance;
        if(onPath)at=arcadeEncounterY(run,at);
        if(run.endlessRoot&&endlessEncounterAt(at))continue; // Encounters own their traffic as well as scenery.
        const plannedAt=at;
        const rx=key==='fallingTree'?(feature.heightMetres+feature.trunkRadiusMetres)*PX_PER_M:key==='logJump'?Math.max(feature.widthMetres,feature.bumpWidthMetres)*PX_PER_M/2+S.physics.playerRadius:key==='rollingSnowball'?feature.maxRadiusMetres*PX_PER_M:key==='wolfPack'?80:spec.rx||Math.max(spec.r,spec.width*.45);
        const ry=key==='fallingTree'?feature.fallenRadiusMetres*PX_PER_M+S.physics.playerRadius:key==='logJump'?feature.bumpGapMetres*PX_PER_M+S.physics.playerRadius:spec.ry||rx;
        for(let attempt=0;attempt<8;attempt++){
          let x;
          if(key==='logJump'){
            // Keep the trunk midpoint on the route; retry neighbouring gaps if occupied.
            at=plannedAt+(attempt?Math.ceil(attempt/2)*(attempt%2?-1:1)*run.arcade.spacing:0);
            if(at<arcadeEncounterY(run,run.startY)||at>arcadeEncounterY(run,run.endY))continue;
            x=arcadePathX(run,at);
          }else if(onPath){
            const cap=key==='fallingTree'?feature.heightMetres*.75:feature.swayAmplitudeMetres*1.5;
            const offset=range(...feature.pathOffsetMetres.map(n=>Math.min(n,cap)))*PX_PER_M;
            x=arcadePathX(run,at)+(random()<.5?-1:1)*offset;
          }else if(key==='rollingSnowball'){
            const reach=Math.max(0,2*feature.swayAmplitudeMetres-feature.maxRadiusMetres-S.physics.playerRadius/PX_PER_M),spread=Math.min(run.arcade.itemSpreadMetres,reach);
            x=arcadePathX(run,at)+range(-spread,spread)*PX_PER_M;
          }else x=run.x+range(-run.arcade.itemSpreadMetres,run.arcade.itemSpreadMetres)*PX_PER_M;
          if(run.encounterClearings.some(q=>at+ry>q.from&&at-ry<q.to&&Math.abs(x-q.x)<q.half+rx))continue;
          if(openings.some(g=>Math.abs(g.y-at)<ry+30&&Math.abs(g.x-x)<g.half+rx+20))continue;
          if(nearArcadeFeature(x,at,onPath)||patchAt(x,at))continue;
          if(spec.r>0&&state.objects.some(o=>{
            if((run.endlessRoot?!activeCourseOwner(o):o.arcadeRun!==run)||o.r<=0)return false;
            if(key==='logJump'){
              const trunk={type:'wideLog',x,y:at,width:feature.widthMetres*PX_PER_M,r:feature.radiusMetres*PX_PER_M};
              const bump={type:'logBump',x,y:at-feature.bumpGapMetres*PX_PER_M,width:feature.bumpWidthMetres*PX_PER_M,r:.6*PX_PER_M};
              return obstacleClearance(trunk,o.x,o.y)<o.r+8||obstacleClearance(bump,o.x,o.y)<o.r+8;
            }
            return (o.type==='wideLog'||o.type==='logBump'?obstacleClearance(o,x,at):Math.hypot(o.x-x,o.y-at)-o.r)<rx+8;
          }))continue;
          createArcadeItem(key,x,at,run);break;
        }
      }
    }
  }
  function spawnArcadeYetis(run,tier,count){
    if(!count||tier==='none')return;
    const active=state.chasers.filter(c=>(c.kind==='fast'||c.kind==='slow')&&!c.dead&&!c.leaving).length;
    for(let i=0;i<Math.min(count,S.arcade.maxActiveYetis-active);i++){
      const side=i%2?1:-1,row=Math.floor(i/2);
      const kind=tier==='slow'?'slow':'fast',x=run.x+side*(S.arcade.startLineSideOffsetMetres+row*S.arcade.startLineRowOffsetMetres)*PX_PER_M;
      const y=run.startY+S.arcade.startLineDownhillOffsetMetres*PX_PER_M;
      state.chasers.push({kind,arcadeTier:tier,x,y,waiting:true,speed:run.arcade.yetiSpeedKmh/S.physics.hudKmhPerSpeed,chaseRun:run,id:random(),phase:range(0,6),expires:Infinity,leaving:false,talkAt:clock+6});
    }
  }
  function armPenaltyGates(run){
    const gates=state.objects.filter(o=>o.type==='gate'&&o.run===run),armed=[...gates];
    for(let i=armed.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[armed[i],armed[j]]=[armed[j],armed[i]];}
    for(const gate of armed.slice(0,Math.round(gates.length*(run.arcade.missPercent||0)/100))){
      const side=random()<.5?-1:1;gate.penaltyArmed=true;gate.penaltyWolves=[];
      for(let i=0;i<run.arcade.missWolves;i++){
        gate.penaltyWolves.push(entity('wolf',gate.x+side*(gate.half+55+i*40),gate.y-10+i*35,{width:43,r:11,animal:true,ai:'idle',climb:0,arcadeRun:run,penaltyGate:gate,wolfSpeedKmh:run.arcade.wolfSpeedKmh,packId:'penalty'+run.stageIndex+':'+gate.number,packIndex:i,nextAI:clock+range(1,2.5),humanVisitor:true}));
      }
    }
  }
  function wakePenaltyWolves(gate){
    if(!gate.penaltyWolves)return;
    for(const o of gate.penaltyWolves){if(o.dead||o.type!=='wolf')continue;o.wolfAwake=true;o.nextAI=clock+2;burst(o.x,o.y,'#8a8f98',10);}
    const live=gate.penaltyWolves.find(o=>!o.dead&&o.type==='wolf');
    if(live)say('Awrooo!',live);
  }
  function arcadeSnapshot(reason,ended=false){
    const a=state.arcade,r=state.course;
    return {reason,ended,practice:!!a.practice,startStage:a.startStage||1,stage:a.stage,name:S.arcade.stages[a.stage-1].name,completed:a.completed,distance:Math.max(0,Math.floor((Math.max(a.furthestY,state.p.y)-a.startY)/PX_PER_M)),cleared:a.cleared+(r?.arcade?r.cleared:0),missed:a.missed+(r?.arcade?r.missed:0),hits:a.hits+(r?.arcade?r.hits:0),until:clock+S.arcade.resultSeconds};
  }
  function recordArcade(reason){
    const result=arcadeSnapshot(reason,true),old=state.arcadeRecord;
    state.arcadeResult=result;
    if(state.arcade.practice)return;
    const distance=Number.isFinite(old.distance)?old.distance:0,completed=Number.isFinite(old.completed)?old.completed:0;
    state.arcadeRecord={campaignVersion:S.arcade.campaignVersion,previousCampaign:old.previousCampaign||null,distance:Math.max(distance,result.distance),completed:Math.max(completed,result.completed),stage:Math.max(Number.isFinite(old.stage)?old.stage:0,result.stage),last:{...result,date:new Date().toISOString()}};save();
  }
  function endArcade(reason){
    if(!state.arcade)return;
    const run=state.course,town=state.plannedTown;
    recordArcade(reason);state.arcadeResult.stayOnSlope=true;
    state.arcade=null;state.course=null;state.results=null;state.plannedTown=null;
    retireArcadeBlock(run);
    if(town){
      state.zone={kind:'village',origin:town.origin,x:town.x,end:town.end};
      // Reuse the existing town; restore normal choices at its still-unseen downhill exit.
      const choiceY=town.end-S.village.endOffset+S.village.choiceY;
      if(choiceY>viewBounds().bottom)S.race.villageChoices.forEach((id,i)=>entrance(id,town.x+(i-(S.race.villageChoices.length-1)/2)*S.village.choiceSpacing,choiceY));
      for(const o of state.objects)if(o.type==='trailChoices'&&o.arcadeNext&&o.y>town.origin&&o.y<town.end)o.arcadeNext=0;
    }else state.zone={kind:'free',origin:state.p.y};
    announce('ARCADE FAILED',reason+' - KEEP SKIING',C.red,4);
  }
  function finishArcadeStage(run){
    if(!run.finishPassed){endArcade('MISSED THE FINISH');return;}
    const a=state.arcade;a.completed++;a.cleared+=run.cleared;a.missed+=run.missed;a.hits+=run.hits;a.furthestY=Math.max(a.furthestY,state.p.y);
    state.course=null;
    if(run.cleared===run.totalGates){let n=0;for(const o of state.objects)if(o.cheerRun===run){o.cheerUntil=clock+S.render.cheerSeconds;o.nextCheer=clock+n++*.45;}}
    recordArcade(a.stage===S.arcade.stages.length?'ALL '+S.arcade.stages.length+' STAGES COMPLETE!':'STAGE '+a.stage+' COMPLETE');
    state.arcadeResult.ended=false;
    if(a.stage===S.arcade.stages.length){a.endReason='ALL '+S.arcade.stages.length+' STAGES COMPLETE!';showSceneCard('victory','THE WHOLE MOUNTAIN!','Every stage conquered. Cocoa for everybody.','summit');return;}
    if(run.next){a.stage++;activateArcadeStage(run.next,true);return;}
    retireArcadeBlock(run);
    const town=state.plannedTown;state.zone={kind:'village',origin:town.origin,x:town.x,end:town.end,name:town.name};state.plannedTown=null;
    announce('STAGE '+a.stage+' COMPLETE',town.name.toUpperCase()+' - KEEP SKIING FOR STAGE '+(a.stage+1),C.teal,4);beep(880,.2);
    const perfect=run.totalGates>0&&run.cleared===run.totalGates;showSceneCard(perfect?'perfect':'finish',perfect?'PERFECT GATES!':'STAGE COMPLETE!','A well-earned stop before '+town.name+'.');
  }

  function nearMushroom(x,y,radius=S.mushroomHunt.obstacleClearance){return state.objects.some(o=>o.collectible&&!o.collected&&Math.hypot(o.x-x,o.y-y)<radius);}
  function plantMushrooms(run){
    const M=S.mushroomHunt,span=run.endY-run.startY,first=run.startY+Math.min(M.startClearance,span*.2),last=run.endY-Math.min(M.finishClearance,span*.2);
    let offset=range(-M.spread*.5,M.spread*.5);const pickups=[];
    for(let i=0;i<M.count;i++){
      offset=clamp(offset+range(-M.maxLateralShift,M.maxLateralShift),-M.spread,M.spread);
      const y=M.count===1?(first+last)/2:mix(first,last,i/(M.count-1));
      pickups.push(entity('mushroom',centerAt(y,run)+offset,y,{width:M.spriteWidth,r:M.pickupRadius,collectible:true,run,number:i+1}));
    }
    run.totalMushrooms=pickups.length;
    // The entire hunt is below the viewport at selection. Reserve reachable pickup pockets now.
    state.objects=state.objects.filter(o=>o.collectible||!pickups.some(m=>
      o.type==='ice'?lakeContains(o,m.x,m.y):o.r>0&&obstacleClearance(o,m.x,m.y)<M.obstacleClearance));
  }
  function collectMushroom(o){
    const run=state.course,p=state.p;
    if(o.collected||o.run!==run||run?.objective!=='mushrooms'||p.air>0||p.fall||p.awaitingInput||state.deathTimer)return;
    o.collected=true;o.r=0;run.collected++;run.points+=S.mushroomHunt.pointsEach;
    burst(o.x,o.y,C.gold,8);say('+'+S.mushroomHunt.pointsEach,o,.7);beep(660+(run.collected%5)*65,.06);
  }
  function addChasers(kind,count,chaseRun=null) {
    if(kind==='patrol'){spawnPatrolWave(count);return;}
    const speed=kind==='bear'?S.wildlife.bearChaseSpeed:topSpeed()*(chaseRun?S.politePursuit.speedRatio:S.chasers.speedRatios[kind]);
    for(let i=0;i<count;i++){
      let x=state.p.x+range(-90,90),y=state.cam.y-S.chasers.spawnAbove-i*S.chasers.spawnSpacing;
      if(['fast','slow','bear'].includes(kind))while(humanArea(x,y))x+=(i%2?-1:1)*440;
      state.chasers.push({kind,x,y,speed,chaseRun,id:random(),phase:range(0,6),expires:kind==='bear'?state.p.y+S.wildlife.bearChaseDistance:Infinity,leaving:false,talkAt:clock+range(4,8)});
    }
  }

  function triggerAmbush(forced) {
    const kind=forced || pick(['fast','patrol','dog']);
    if(kind==='patrol')state.patrolPenalty={remaining:S.chasers.patrolWaves.durationSeconds,nextWave:S.chasers.patrolWaves.intervalSeconds,nextSpeech:clock};
    addChasers(kind,S.chasers.ambushCount[kind]);
    announce('UNPAID ADVENTURE',kind==='fast'?'Three yetis outside the flags. Stay on the piste!':kind==='patrol'?'Four skiers. Every few seconds. They remember unpaid tickets.':'The dogs have your scent. And no other plans.',C.red,4.5);
    state.course.ambush=kind;
  }
  function formatTime(seconds){const cs=Math.max(0,Math.round(seconds*100));return `${Math.floor(cs/6000)}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
  function timingSignature(id){const c=stages[id],rules=[S.timing.recordVersion,c.length,c.spacing,c.pace,S.physics,S.race,S.controls,S.jump,S.world.courseSway,S.world.courseWavelength];if(c.kind==='mushroom')rules.push(S.mushroomHunt);if(c.kind==='slow')rules.push(S.politePursuit);return JSON.stringify(rules);}
  function courseRecord(id){const saved=state.times[id];return saved?.signature===timingSignature(id)&&Number.isFinite(saved.bestSeconds)&&saved.bestSeconds>0?saved:null;}
  function creditRun(caught=false) {
    if(caught){die('YETI');return;}
    const run=state.course;if(!run)return;
    if(run.endless)return;
    if(run.arcade){finishArcadeStage(run);return;}
    const collection=run.objective==='mushrooms',total=collection?run.totalMushrooms:run.totalGates||0,completed=collection?run.collected:run.cleared,minimum=collection?S.mushroomHunt.minimumFraction:S.race.minimumGateFraction,required=Math.ceil(total*minimum),passed=run.finishPassed&&completed>=required;
    const perfect=passed&&total>0&&completed===total,eligible=passed&&!run.violation;
    const bonus=eligible?S.race.finishBase+(run.hits===0?S.race.cleanBonus:Math.max(0,S.race.crashedBonus-run.hits*S.race.crashPenalty)):0;
    const target=S.timing.targets[run.id],timed=S.timing.enabled&&total>0&&!!target;
    const speedBonus=eligible&&timed?Math.round(S.timing.maxBonus*clamp((target.parSeconds-run.time)/(target.parSeconds-target.goldSeconds),0,1)):0;
    const earned=eligible?run.points+bonus+speedBonus:0;
    const reason=!run.finishPassed?'MISSED THE FINISH FLAGS':completed<required?(collection?`NEED ${required}/${total} MUSHROOMS`:`NEED AT LEAST ${Math.round(minimum*100)}% OF GATES`):run.violation?'UNPAID ENTRY - NO REWARD':'';
    const prior=courseRecord(run.id),newBest=eligible&&timed&&(!prior?.bestSeconds||run.time<prior.bestSeconds);
    if(timed){
      const history=[...(Array.isArray(state.times[run.id]?.history)?state.times[run.id].history:[]),{seconds:Math.round(run.time*100)/100,objective:run.objective,cleared:completed,collected:run.collected,total,crashes:run.hits,passed,paid:!run.violation,speedBonus,date:new Date().toISOString(),signature:timingSignature(run.id)}].slice(-S.timing.historyLimit);
      state.times[run.id]={signature:timingSignature(run.id),bestSeconds:newBest?run.time:prior?.bestSeconds??null,lastSeconds:run.time,history};
    }
    if(earned){state.bank+=earned;state.best[run.id]=Math.max(state.best[run.id]||0,earned);}save();
    const result={id:run.id,earned,bonus,speedBonus,newBest,bestSeconds:courseRecord(run.id)?.bestSeconds,timed,collection,cleared:completed,total,required,missed:total-completed,hit:run.hits,tricks:run.tricks,time:run.time,points:run.points,caught:false,passed,perfect,unpaid:run.violation,reason,until:clock+S.render.resultSeconds};
    state.receipts.push(result);state.results=result;
    if(passed)state.finishCount++;
    if(perfect){
      let n=0;for(const o of state.objects)if(o.cheerRun===run){o.cheerUntil=clock+S.render.cheerSeconds;o.nextCheer=clock+(n++)*.45;}
      burst(state.p.x,state.p.y,C.gold,34);
    }
    beep(passed?880:210,.2);state.course=null;
    for(const c of state.chasers)if(!c.patrolPass&&(c.kind!=='bear'||c.chaseRun))c.expires=state.p.y+(c.kind==='dog'?1600:220);
    const town=state.plannedTown||makeVillage(belowView(300),state.p.x,false);
    state.zone={kind:'village',origin:town.origin,x:town.x,end:town.end,name:town.name};state.transitions.push({kind:'village',y:state.p.y});state.plannedTown=null;
    if(passed)showSceneCard(perfect?'perfect':'finish',perfect?'PERFECT GATES!':'COURSE COMPLETE!','This slope has been thoroughly skied.');
  }

  function die(cause='YETI',attacker=null) {
    if(state.deathTimer)return;
    const animated=['YETI','WOLF','BEAR','ZOMBIE'].includes(cause),scene=animated?deathScene(cause,attacker):null;
    state.deathYeti=null;state.deathTimer=animated?3:S.physics.deathSeconds;state.deaths++;
    state.p.fall=2;state.p.speed=0;state.p.vx=state.p.vy=0;state.p.draft=0;state.p.draftTarget=null;state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    if(state.arcade)state.arcade.endReason='CAUGHT BY '+cause;
    if(state.endless)recordEndless('CAUGHT BY '+cause);
    announce(cause==='BEAR'?'THE BEAR CAUGHT YOU.':cause==='WOLF'?'THE PACK CAUGHT YOU.':cause==='ZOMBIE'?'THE DEAD CAUGHT YOU.':'THE YETI GOT YOU.',scene?.detail||`Your ${state.bank} coins are safe.`,C.red,3);
    beep(110,.3,'triangle');save();
    if(animated){
      const actor=attacker||(cause==='YETI'?state.chasers.find(c=>!c.dead&&['fast','slow'].includes(c.kind)):null)||{kind:cause==='YETI'?'fast':cause.toLowerCase(),type:cause.toLowerCase(),zombieRole:'wanderer',zombieStyle:0,width:34,phase:0};
      state.deathAnimation={cause,actor,x:state.p.x,y:state.p.y,remaining:3,shown:false,scene};
    }else if(scene)showSceneCard(scene.key,scene.title,scene.detail,'summit');
  }
  function autoStartArcade(){
    if(!startCourse('arcade',{x:state.p.x,y:state.p.y}))return;
    state.p.x=state.course.x;state.p.y=state.course.startY-200;
    state.cam={x:state.p.x,y:state.p.y-H*S.render.playerScreenY/ZOOM};
  }
  function resetSummit(lift=false,debugKind=null,debugVisit=1){
    window.FrostlineApp?.playing(false);
    if(state.endless){recordEndless(state.endlessResult?.reason||'RUN ENDED');state.endless=null;}
    if(state.arcade){recordArcade(state.arcade.endReason||'RUN ENDED');state.arcade=null;}
    stages.arcade={...S.courses.slalom,fee:0,name:'Arcade',sub:S.arcade.stages.length+' STAGES - ONE RUN',color:S.arcade.yetiColors.elite};
    if(!lift)state.patrolPenalty=null;else if(state.patrolPenalty)state.patrolPenalty.nextWave=0;
    for(const cache of [houseSolids,treeSolids,skierSolids,preyCache])for(const key of Object.keys(cache))delete cache[key];
    clearSceneCard();resetNightLighting();state.pedestrianElapsed=state.villageLifeElapsed=0;activePointers.clear();state.deathAnimation=null;state.specialResultUntil=0;state.cocoaEffect=null;state.deathYeti=null;state.p=newPlayer();state.results=null;state.course=null;state.zone={kind:'start',origin:0};state.objects=[];state.trails=[];state.snowballTrails=[];state.chasers=[];state.particles=[];state.speech=[];state.messages=[];
    state.roads=[];state.villages=[];state.safeTrails=[];state.liftRoutes=[];state.chunks.clear();state.plannedTown=null;state.generated=0;state.lastTrack=null;state.started=false;state.activeTime=0;state.keyboardStep=0;state.control='keyboard';state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};state.deathTimer=state.liftTimer=0;state.elevated=0;state.nextFastSkier=clock+2;
    state.cam={x:0,y:-H*S.render.playerScreenY/ZOOM};startMeadow();state.liftRoutes.push({x0:S.lift.x,x1:S.lift.x,y0:S.lift.startY,y1:Infinity});ensureWorld(true);
    if(debugKind){startEndless({x:state.p.x,y:state.p.y},debugKind,debugVisit);return;}
    if(S.endless.autoStart){autoStartEndless();return;}
    if(S.arcade.autoStart){autoStartArcade();return;}
    announce(lift?'BACK AT THE SUMMIT':'ANOTHER DAY. SAME WALLET.',`${state.bank} coins  ·  Choose a trail and ski.`,C.teal,3.5);
  }
  function autoStartEndless(){
    if(!startCourse('endless',{x:state.p.x,y:state.p.y}))return;
    state.p.x=state.course.x;state.p.y=state.course.startY-200;state.cam={x:state.p.x,y:state.p.y-H*S.render.playerScreenY/ZOOM};
  }

  function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
  function roadDistance(road,x,y){let d=Infinity;for(let i=1;i<road.points.length;i++)d=Math.min(d,segmentDistance(x,y,road.points[i-1],road.points[i]));return d;}
  function houseFootHalfWidth(o){return o.width*S.village.houseFootWidthRatio+(o.paradeSpanX>1?(o.paradeSpanX-1)*o.paradeStepX/2:0);}
  function houseFootDepth(o){return o.width*S.village.houseFootHeightRatio*2+(o.paradeSpan>1?(o.paradeSpan-1)*o.paradeStep:0);}
  function houseClearance(o,x,y){
    const hw=houseFootHalfWidth(o),hh=houseFootDepth(o)/2;
    const dx=Math.abs(x-o.x)-hw,dy=Math.abs(y-(o.y-hh))-hh;
    return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0);
  }
  function obstacleSegmentDistance(x,y,ax,ay,bx,by){
    const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x-ax-dx*t,y-ay-dy*t);
  }
  function obstacleSegmentSeparation(ax,ay,bx,by,cx,cy,dx,dy){
    const ux=bx-ax,uy=by-ay,vx=dx-cx,vy=dy-cy,cross=ux*vy-uy*vx;
    if(Math.abs(cross)>1e-8){
      const t=((cx-ax)*vy-(cy-ay)*vx)/cross,u=((cx-ax)*uy-(cy-ay)*ux)/cross;
      if(t>=0&&t<=1&&u>=0&&u<=1)return 0;
    }
    return Math.min(obstacleSegmentDistance(ax,ay,cx,cy,dx,dy),obstacleSegmentDistance(bx,by,cx,cy,dx,dy),obstacleSegmentDistance(cx,cy,ax,ay,bx,by),obstacleSegmentDistance(dx,dy,ax,ay,bx,by));
  }
  function treeFallProgress(o){return o.fallState==='fallen'?1:o.fallState==='falling'?clamp((clock-o.fallAt)/S.terrainFeatures.fallingTree.fallSeconds,0,1):0;}
  function treeTilt(o){return (o.fallSide??(Math.cos(o.fallAngle||0)>=0?1:-1))*Math.PI/2*treeFallProgress(o)**2;}
  function obstacleSegment(o){
    if(o.type==='cemeteryFence'||o.type==='areaBarrier')return [o.ax,o.ay,o.bx,o.by];
    if(o.type==='wideLog'||o.type==='logBump'){const half=Math.max(0,o.width/2-o.r);return [o.x-half,o.y,o.x+half,o.y];}
    if(o.type==='fallingTree'&&(o.fallState==='falling'||o.fallState==='fallen')){const tilt=treeTilt(o);return [o.x,o.y,o.x+Math.sin(tilt)*o.treeLength,o.y-Math.cos(tilt)*o.treeLength];}
    return [o.x,o.y,o.x,o.y];
  }
  function obstacleClearance(o,x,y){
    if(o.type==='lodge'||o.type==='rental'||o.type==='mausoleum')return houseClearance(o,x,y);
    if(o.type==='iceBlock'||o.type==='ruinWall'){const dx=Math.abs(x-o.x)-o.width/2,dy=Math.abs(y-o.y)-o.depth/2;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0);}
    if(o.type==='wideLog'||o.type==='logBump'||o.type==='fallingTree'||o.type==='cemeteryFence'||o.type==='areaBarrier'){const [ax,ay,bx,by]=obstacleSegment(o);return obstacleSegmentDistance(x,y,ax,ay,bx,by)-o.r;}
    return Math.hypot(x-o.x,(y-o.y)*S.physics.collisionYScale)-o.r;
  }
  function laneRoute(start,goal,houses,town){
    const V=S.village,g=V.pathGrid,key=(x,y)=>x+','+y,cell=p=>({x:Math.round((p.x-town.x)/g),y:Math.round((p.y-town.origin)/g)}),world=n=>({x:town.x+n.x*g,y:town.origin+n.y*g});
    const a=cell(start),b=cell(goal),open=[],seen=new Map([[key(a.x,a.y),0]]),parents=new Map();
    const push=n=>{open.push(n);let i=open.length-1;while(i){const parent=(i-1)>>1;if(open[parent].score<=n.score)break;open[i]=open[parent];i=parent;}open[i]=n;};
    const pop=()=>{const best=open[0],tail=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&open[child+1].score<open[child].score)child++;if(open[child].score>=tail.score)break;open[i]=open[child];i=child;}open[i]=tail;}return best;};
    push({...a,cost:0,score:0});
    // Every house path queries the same fixed grid. Share clearance results across searches.
    const cells=town.laneBlocked??=new Map(),margin=V.laneWidth/2+5;
    const blocked=n=>{
      const k=key(n.x,n.y);if(cells.has(k))return cells.get(k);
      const p=world(n),value=Math.abs(p.x-town.x)>V.halfWidth||p.y<town.origin+V.roadStartY-g||p.y>town.roadEndY+g||houses.some(h=>{
        const hw=houseFootHalfWidth(h),hh=houseFootDepth(h)/2;
        return Math.abs(p.x-h.x)<=hw+margin&&Math.abs(p.y-(h.y-hh))<=hh+margin&&houseClearance(h,p.x,p.y)<margin;
      });
      cells.set(k,value);return value;
    };
    let found=null;
    for(let count=0;open.length&&count<V.pathMaxNodes;count++){
      const n=pop();if(n.cost>seen.get(key(n.x,n.y)))continue;
      if(n.x===b.x&&n.y===b.y){found=n;break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const q={x:n.x+dx,y:n.y+dy};if(blocked(q)||dx&&dy&&(blocked({x:n.x+dx,y:n.y})||blocked({x:n.x,y:n.y+dy})))continue;
        const cost=n.cost+Math.hypot(dx,dy),k=key(q.x,q.y);if(cost>=(seen.get(k)??Infinity))continue;
        seen.set(k,cost);parents.set(k,n);push({...q,cost,score:cost+Math.hypot(q.x-b.x,q.y-b.y)});
      }
    }
    if(!found)return null;
    const points=[goal];for(let n=found;n;n=parents.get(key(n.x,n.y)))points.push(world(n));points.push(start);points.reverse();
    return points.filter((p,i)=>!i||i===points.length-1||Math.abs((p.x-points[i-1].x)*(points[i+1].y-p.y)-(p.y-points[i-1].y)*(points[i+1].x-p.x))>.1);
  }
  function makeVillage(origin,base=state.p.x,activate=true,options={}) {
    const V={...S.village,...options.village},R=V.randomization,varied=R.enabled,courseRun=options.endlessRun;
    if(options.people!==undefined)V.walkers=options.people;
    // Build once, below the viewport. A dedicated generator keeps each layout stable afterwards.
    const layoutSeed=options.layoutSeed??(R.seed?(R.seed+Math.imul(state.villages.length+1,2654435761))>>>0:Math.floor(Math.random()*4294967296)>>>0);
    let layoutState=layoutSeed;
    const rand=()=>{layoutState=(Math.imul(layoutState,1664525)+1013904223)>>>0;return layoutState/4294967296;};
    const between=(a,b)=>a+rand()*(b-a),choose=values=>values[Math.floor(rand()*values.length)];
    const shuffled=values=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
    const baseRows=V.rows,lastRow=origin+V.firstRow+(baseRows-1)*V.rowSpacing;
    const rowYs=[origin+V.firstRow+(varied?between(-R.firstRowJitter,R.firstRowJitter):0)];
    const rowLimit=options.lengthWorld?origin+options.lengthWorld-(V.endOffset-(lastRow-origin)):Infinity;
    // Long course towns add ordinary rows instead of stretching their spacing and footpaths.
    for(let row=1;options.lengthWorld||row<V.rows;row++){
      const next=rowYs.at(-1)+Math.max(V.corridorEntryOffset+V.corridorExitOffset+V.roadClearance*2,V.rowSpacing*(varied?between(...R.rowSpacingScale):1));
      if(next>rowLimit)break;rowYs.push(next);
    }
    const lengthChange=rowYs.at(-1)-lastRow;
    if(options.lengthWorld){V.rows=rowYs.length;V.houseCount*=V.rows/baseRows;}
    const usedNames=new Set(state.villages.map(t=>t.name)),available=V.names.filter(name=>!usedNames.has(name)),names=available.length?available:V.names;
    const town={origin,x:base,festival:options.festival,mainRoadWidth:V.mainRoadWidth,name:options.name??names[layoutSeed%names.length],end:origin+V.endOffset+lengthChange,roadEndY:origin+V.roadEndY+lengthChange,layoutSeed};
    if(options.lengthWorld){town.end=origin+options.lengthWorld;town.roadEndY=town.end-(V.endOffset-V.roadEndY);}
    town.approachEndY=town.end+H/ZOOM+S.race.courseOffscreenMargin+500;
    town.approachRoad={surface:'snow',width:V.mainRoadWidth,points:[{x:base,y:town.roadEndY},{x:base,y:town.approachEndY}]};
    town.stationX=base+(varied?choose([-1,1]):1)*(V.stationX+(varied?between(-R.stationJitterX,R.stationJitterX):0));
    town.stationY=clamp(origin+V.stationY+lengthChange+(varied?between(-R.stationJitterY,R.stationJitterY):0),rowYs.at(-1)+V.stationClearance,town.roadEndY-60);
    if(courseRun){town.endlessRun=courseRun;town.halfWidth=V.halfWidth+150;}
    state.villages.push(town);
    if(activate){state.zone={kind:'village',origin,x:base,end:town.end,name:town.name};state.transitions.push({kind:'village',y:state.p.y});}
    entity('villageTitle',base,origin+10,{r:0,width:300,town});
    const phase=varied?Math.floor(rand()*V.corridorOffsets.length):0,mirror=varied?choose([-1,1]):1,reverse=varied?choose([-1,1]):1,scale=varied?between(...R.corridorScale):1;
    const centers=[],halfWidths=[],styles=[];
    const maxOffset=Math.max(0,V.halfWidth-V.corridorHalfWidth-V.houseWidth[1]);
    for(let row=0;row<V.rows;row++){
      const index=((phase+row*reverse)%V.corridorOffsets.length+V.corridorOffsets.length)%V.corridorOffsets.length;
      let offset=V.corridorOffsets[index]*mirror*scale+(varied?between(-R.corridorJitter,R.corridorJitter):0);
      if(varied&&row)offset=clamp(offset,centers[row-1]-base-R.maxBendStep,centers[row-1]-base+R.maxBendStep);
      centers.push(base+clamp(offset,-maxOffset,maxOffset));halfWidths.push(V.corridorHalfWidth*(varied?between(...R.corridorWidthScale):1));styles.push(varied?Math.floor(rand()*S.houseAnimation.trimRGB.length):row%4);
    }
    const plazaCount=varied?Math.max(0,V.plazaRows.length+Math.floor(between(-R.plazaCountVariation,R.plazaCountVariation+1))):V.plazaRows.length;
    const plazaRows=[];
    if(varied){for(const row of shuffled(Array.from({length:Math.max(0,V.rows-2)},(_,i)=>i+1))){if(plazaRows.length>=plazaCount)break;if(plazaRows.every(other=>Math.abs(other-row)>1))plazaRows.push(row);}}
    else plazaRows.push(...V.plazaRows.filter(row=>row<V.rows));
    const main={surface:V.mainRoadSurface,width:V.mainRoadWidth,points:[{x:base,y:origin+V.roadStartY}]};
    for(let row=0;row<V.rows;row++)main.points.push({x:centers[row],y:rowYs[row]-V.corridorEntryOffset},{x:centers[row],y:rowYs[row]+V.corridorExitOffset});
    main.points.push({x:base,y:town.roadEndY});
    town.route=main.points;town.plazaRows=plazaRows;
    if(town.festival){const row=Math.floor(V.rows*.45);town.festivalPlaza={x:centers[row],y:rowYs[row]+50};}
    const station={x:town.stationX,y:town.stationY};
    const nearest=main.points.reduce((a,b)=>Math.hypot(a.x-station.x,a.y-station.y)<Math.hypot(b.x-station.x,b.y-station.y)?a:b);
    const branch={surface:V.mainRoadSurface,width:V.mainRoadWidth,points:[nearest,{x:station.x,y:nearest.y},station]},roads=[main,branch],houses=[];
    const houseRows=new Map();
    const overlapsHouse=(x,y,hw,hh,margin,exact=false)=>{
      for(let row=Math.floor((y-2*hh-margin)/128);row<=Math.floor((y+margin)/128);row++)for(const h of houseRows.get(row)||[]){
        const otherHW=h.width*V.houseFootWidthRatio,otherHH=h.width*V.houseFootHeightRatio;
        if(Math.abs(x-h.x)<hw+otherHW+margin&&Math.abs(y-hh-h.y+otherHH)<hh+otherHH+margin&&(!exact||houseClearance(h,x,y)<margin))return true;
      }
      return false;
    };
    if(V.backRoute.enabled){
      const side=layoutSeed%2?1:-1,B=V.backRoute,entry={x:base,y:origin+V.roadStartY+10},exitY=town.roadEndY-70;
      const last=main.points.at(-2),exit={x:mix(last.x,base,clamp((exitY-last.y)/(town.roadEndY-last.y||1),0,1)),y:exitY};
      const points=[entry];
      for(let row=0;row<V.rows;row++)points.push({x:clamp(centers[row]+side*(halfWidths[row]+V.houseWidth[1]*V.houseFootWidthRatio+B.offset),base-V.halfWidth+B.width,base+V.halfWidth-B.width),y:rowYs[row]+(row?60:-70)});
      points.push(exit);town.backRoute={surface:'snow',natural:true,width:B.width,points};roads.push(town.backRoute);
    }
    // Reserve the crypt's side courtyard before houses are placed; keep both town routes clear.
    if(town.festival==='halloween')reserveHalloweenMausoleum(town,roads,layoutSeed%2?-1:1);
    const houseCount=Math.round(V.houseCount*(varied?between(...R.houseCountScale):1));
    const roadSamples=roads.map(r=>{
      const rows=new Map();for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12);for(let j=0;j<=n;j++){
        const p={x:mix(a.x,b.x,j/(n||1)),y:mix(a.y,b.y,j/(n||1))},key=Math.floor(p.y/128);let points=rows.get(key);if(!points)rows.set(key,points=[]);points.push(p);
      }}
      return {rows,margin:r.width/2+V.roadClearance};
    });
    // Fill the inner walls along the whole route first, then grow outward into blocks.
    const rings=Math.ceil(V.halfWidth*2/V.housePitch);
    for(let ring=0;ring<rings&&houses.length<houseCount;ring++)for(const row of (varied?shuffled(Array.from({length:V.rows},(_,i)=>i)):Array.from({length:V.rows},(_,i)=>i)))for(const side of [-1,1]){
      if(houses.length>=houseCount)break;
      if(varied&&ring>0&&rand()<R.outerGapChance)continue;
      const style=varied?(rand()<.7?styles[row]:Math.floor(rand()*S.houseAnimation.trimRGB.length)):(row+ring+(side>0?1:0))%4;
      const width=varied?between(...V.houseWidth):mix(V.houseWidth[0],V.houseWidth[1],((row*7+ring*3+(side>0?2:0))%5)/4);
      const x=centers[row]+side*(halfWidths[row]+V.houseWidth[1]*V.houseFootWidthRatio+ring*V.housePitch+(varied?between(0,R.houseJitterX):0)),y=rowYs[row]+(varied?between(-R.houseJitterY,R.houseJitterY):0);
      const candidate={x,y,width},hw=width*V.houseFootWidthRatio,hh=width*V.houseFootHeightRatio;
      if(Math.abs(x-base)+hw>V.halfWidth||Math.hypot(x-station.x,y-station.y)<V.stationClearance+hw)continue;
      if(town.festivalPlaza&&Math.hypot(x-town.festivalPlaza.x,y-town.festivalPlaza.y)<240+hw)continue;
      if(overlapsHouse(x,y,hw,hh,V.houseGap))continue;
      if(roadSamples.some(r=>{
        for(let row=Math.floor((y-2*hh-r.margin)/128);row<=Math.floor((y+r.margin)/128);row++)if(r.rows.get(row)?.some(p=>Math.abs(p.x-x)<=hw+r.margin&&Math.abs(p.y-(y-hh))<=hh+r.margin&&houseClearance(candidate,p.x,p.y)<r.margin))return true;
        return false;
      }))continue;
      const h=entity(varied?(rand()<.35?'lodge':'rental'):(row+ring)%3?'rental':'lodge',x,y,{width,r:hw,town,houseStyle:style,band:row});houses.push(h);
      for(let row=Math.floor((y-2*hh)/128);row<=Math.floor(y/128);row++){let entries=houseRows.get(row);if(!entries)houseRows.set(row,entries=[]);entries.push(h);}
    }
    const network=main.points.slice();
    if(options.deferLanes){
      town.pendingLanes={index:0,houses:houses.map(h=>({x:h.x,y:h.y,width:h.width})),network:main.points.map(p=>({...p})),layout:{origin:town.origin,x:town.x,roadEndY:town.roadEndY}};
    }else {
      for(const h of houses){
        const door={x:h.x,y:h.y+V.laneWidth/2+V.pathGrid},goal=network.reduce((a,b)=>Math.hypot(a.x-door.x,a.y-door.y)<Math.hypot(b.x-door.x,b.y-door.y)?a:b);
        const points=laneRoute(door,goal,houses,town);
        if(points){points.unshift({x:h.x,y:h.y+14});roads.push({surface:'paved',width:V.laneWidth,points});network.push(...points.slice(1));}
      }
    }
    delete town.laneBlocked;
    state.roads.push(...roads,town.approachRoad);
    const decorate=(type,x,y,extra)=>{
      if(roads.some(r=>{
        if(r.surface!=='snow'&&!extra.villageDetail)return false;
        const margin=r.width/2+extra.r+12;
        for(let i=1;i<r.points.length;i++){
          const a=r.points[i-1],b=r.points[i];if(x<Math.min(a.x,b.x)-margin||x>Math.max(a.x,b.x)+margin||y<Math.min(a.y,b.y)-margin||y>Math.max(a.y,b.y)+margin)continue;
          if(segmentDistance(x,y,a,b)<margin)return true;
        }
        return false;
      })||overlapsHouse(x,y,0,0,extra.r+8,true))return;
      return entity(type,x,y,{...extra,town});
    };
    for(const row of plazaRows){const x=centers[row],y=rowYs[row]+V.corridorExitOffset,half=halfWidths[row],side=varied?choose([-1,1]):1;
      if(!courseRun)entity('bunting',x,y-95,{width:half*2,r:0,town});
      decorate('bench',x+side*(half-26),y+55,{width:46,r:9});
      decorate('snowman',x-side*(half-24),y+58,{width:28,r:9});
    }
    for(let i=0;i<V.walkers;i++){
      const path=pick(roads).points,at=Math.floor(random()*path.length),p=path[at];
      entity(pick(['personRed','personYellow','personGreen']),p.x,p.y,{width:30,r:10,walker:true,path,pathIndex:at,pathDir:at===path.length-1?-1:1,walkSpeed:range(...V.walkerSpeed),town});
    }
    for(let i=0;i<V.catCount;i++){const h=pick(houses)||{x:base,y:origin+V.firstRow};entity('cat',h.x+40,h.y+40,{width:27,r:8,animal:true,ai:'idle',nextAI:clock+2,climb:0,town});}
    const dogSpots=[];for(const p of shuffled(main.points)){if(dogSpots.length>=V.dogCount)break;if(dogSpots.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<80))continue;dogSpots.push(p);entity('dog',p.x+45,p.y,{width:34,r:10,roam:15,town});}
    for(let i=0;i<V.skierCount;i++){const p=pick(main.points);entity('skier',p.x,p.y,{width:42,r:12,vy:30,vx:0,town});}
    populateVillageLife(town,houses,rowYs,centers,decorate,shuffled);
    if(!courseRun){
      entity('lift',station.x,station.y,{width:174,r:0,half:73,used:false,town});entity('liftLabel',station.x,station.y+55,{r:0,width:160,town});
      if(!state.arcade)S.race.villageChoices.forEach((id,i)=>entrance(id,base+(i-(S.race.villageChoices.length-1)/2)*V.choiceSpacing,origin+V.choiceY+lengthChange));
      entity('trailChoices',base,origin+V.choiceTitleY+lengthChange,{r:0,width:400,arcadeNext:state.arcade?state.arcade.stage+1:0});
    }
    if(options.people!==undefined){
      const people=state.objects.filter(o=>o.town===town&&o.type.startsWith('person')),vendors=shuffled(people.filter(o=>!o.walker)).slice(0,Math.floor(options.people/4));
      const walkers=shuffled(people.filter(o=>o.walker)).slice(0,Math.max(0,options.people-vendors.length)),keep=new Set([...vendors,...walkers]),all=new Set(people);
      state.objects=state.objects.filter(o=>!all.has(o)||keep.has(o));
    }else {
      const count=state.objects.filter(o=>o.town===town&&o.type.startsWith('person')).length;
      for(let i=0;i<Math.round(count*(V.populationMultiplier-1));i++){
        const path=pick(roads).points,at=Math.floor(random()*path.length),point=path[at];
        entity(pick(['personRed','personYellow','personGreen']),point.x,point.y,{width:30,r:10,walker:true,path,pathIndex:at,pathDir:at===path.length-1?-1:1,walkSpeed:range(...V.walkerSpeed),town});
      }
    }
    if(courseRun){for(const road of [...roads,town.approachRoad])road.town=town;town.approachEndY=town.end;town.approachRoad.points=[{x:base,y:town.roadEndY},{x:base,y:town.end}];}
    clearSnowRoadTrees(town.approachRoad);addRouteLamps(town.route,town,town.origin,town.end);
    return town;
  }

  function extendEndlessTownLanes(){
    // Use Arcade's same path finder, spread over approaching simulation steps.
    let budget=2;
    for(const town of state.villages){
      const work=town.pendingLanes;if(!work||!budget)continue;
      while(work.index<work.houses.length&&budget>0){
        budget--;const h=work.houses[work.index++],V=S.village,door={x:h.x,y:h.y+V.laneWidth/2+V.pathGrid};
        const goal=work.network.reduce((a,b)=>Math.hypot(a.x-door.x,a.y-door.y)<Math.hypot(b.x-door.x,b.y-door.y)?a:b),points=laneRoute(door,goal,work.houses,work.layout);
        if(points){points.unshift({x:h.x,y:h.y+14});work.network.push(...points.slice(1));state.roads.push({surface:'paved',width:V.laneWidth,points,town,endlessEncounter:town.encounter,endlessEndY:town.end});}
      }
      if(work.index===work.houses.length)delete town.pendingLanes;
    }
  }
  function populateVillageLife(town,houses,rowYs,centers,decorate,shuffle){
    const L=S.villageLife,B=L.buildings,ordered=shuffle(houses);
    // Mix individual buildings along the existing road, without themed sections.
    const hotels=shuffle(houses.filter(h=>Math.abs(h.x-centers[h.band])<S.village.housePitch*2)).slice(0,B.hotelsPerTown);
    for(const [i,h] of ordered.entries()){
      h.buildingKind=hotels.includes(h)?'hotel':B.variants[i%B.variants.length];
      h.floors=h.buildingKind==='hotel'?B.hotelFloors:1;
      h.cozyStyle=i%3;
      if(h.buildingKind==='cafe'){h.houseSprite=i%2?'bakeryFacade':'cocoaFacade';h.shopName=i%2?'BUNS':'COCOA';}
      if(h.buildingKind==='inn'&&i%10===2){h.houseSprite='toyFacade';h.shopName='TOYS';decorate('personRed',h.x+h.width*.6,h.y+45,{width:30,r:0,town,job:'toys'});}
      if(h.buildingKind==='cafe'||h.buildingKind==='rental'){
        const prop=h.buildingKind==='cafe'?'breadStand':'skiRack';
        for(const side of [-1,1]){
          const placed=decorate(prop,h.x+side*(h.width*.5+36),h.y+30,{width:70,r:23,villageDetail:true});
          if(placed){entity('personYellow',placed.x,placed.y+38,{width:30,r:10,town,job:h.buildingKind==='cafe'?'bakery':'rental'});break;}
        }
      }
    }
    const cocoa=ordered.filter(h=>h.buildingKind==='cafe').sort((a,b)=>Math.abs(a.x-centers[a.band])-Math.abs(b.x-centers[b.band]))[0]||ordered[0];
    for(const h of ordered)if(h!==cocoa&&h.houseSprite==='cocoaFacade'){h.houseSprite='bakeryFacade';h.shopName='BUNS';}
    if(cocoa){cocoa.cocoaShop=true;cocoa.houseSprite='cocoaFacade';cocoa.shopName='COCOA';cocoa.buildingKind='cafe';town.cocoaShop=cocoa;town.cocoaClaimed=false;const host=state.objects.filter(o=>o.town===town&&o.job==='bakery').sort((a,b)=>Math.hypot(a.x-cocoa.x,a.y-cocoa.y)-Math.hypot(b.x-cocoa.x,b.y-cocoa.y))[0];if(host&&Math.hypot(host.x-cocoa.x,host.y-cocoa.y)<180)host.job='cocoa';}
    for(const row of town.plazaRows){
      const x=centers[row],y=rowYs[row]+S.village.corridorExitOffset;
      // Harmless play remains scattered beside the snow road.
      entity('powderPile',x+58,y+145,{width:45,r:23,town,mischief:true,villageDetail:true});
      entity('pigeons',x-60,y+100,{width:50,r:25,town,mischief:true,villageDetail:true});
    }
    if(town.backRoute)for(const [i,point] of town.backRoute.points.slice(2,-1).entries()){
      if(i%3)continue;
      const side=Math.sign(point.x-town.x)||1,x=point.x+side*(town.backRoute.width/2+65),y=point.y+105;
      decorate('snowman',x,y,{width:28,r:9,town});
      decorate('personGreen',x+side*40,y+35,{width:28,r:0,town,snowPlay:true});
      decorate('dog',x-side*15,y+85,{width:28,r:8,town,backyardPet:true,mischief:true,roam:0});
    }
    if(!town.endlessRun)for(let n=0;n<4;n++)entity(n%2?'personRed':'personGreen',town.stationX-65+n*22,town.stationY+80+n*15,{width:30,r:10,town,job:'queue'});
    const cafe=ordered.find(h=>h.buildingKind==='cafe')||{x:centers[0],y:rowYs[0]};
    for(let i=0;i<L.rabbitsPerTown;i++)entity('rabbit',cafe.x+(i?1:-1)*(cafe.width||100),cafe.y+100+i*40,{width:20,r:5,animal:true,ai:'idle',nextAI:clock+3,town,humanVisitor:true});
    if(random()<L.foxVisitChance)entity('fox',town.x+S.village.halfWidth-100,cafe.y+140,{width:39,r:10,animal:true,ai:'idle',nextAI:clock+3,town,humanVisitor:true});
  }
  function villageReaction(source,key){
    const L=S.villageLife,n=state.objects.find(o=>o.type.startsWith('person')&&Math.hypot(o.x-source.x,o.y-source.y)<L.reactionRadius&&clock>=(o.reactAt||0));
    if(n){say(pick(L.dialogue[key]),n,2);n.reactAt=clock+L.npcCooldownSeconds;n.socialUntil=clock+1.5;}
  }
  function touchVillageProp(o){
    if(clock<(o.mischiefAt||0))return;
    const L=S.villageLife;o.mischiefAt=clock+L.mischiefCooldownSeconds;
    if(o.type==='snowman'){o.hatUntil=clock+L.hatFlightSeconds;villageReaction(o,'snowman');burst(o.x,o.y,C.ice,8);}
    if(o.type==='powderPile'){o.puffedUntil=clock+L.mischiefCooldownSeconds;burst(o.x,o.y,'#c9dde0',24);villageReaction(o,'powder');}
    if(o.type==='pigeons'){o.flyingUntil=clock+L.pigeonFlightSeconds;villageReaction(o,'pigeons');beep(920,.035);}
    if(o.backyardPet){o.hopUntil=clock+1.2;say('WOOF! WOOF!',o,1.4);burst(o.x,o.y,C.gold,5);}
  }
  function greetSmallAnimal(o,touched=false){
    const p=state.p,L=S.villageLife,d=Math.hypot(o.x-p.x,o.y-p.y);
    if(d>L.animalNoticeRadius)return;
    if(p.speed>L.animalSpookSpeed&&clock>=(o.playerSpookAt||0)){o.playerSpookAt=clock+L.animalCooldownSeconds;o.fleeAngle=Math.atan2(o.y-p.y,o.x-p.x);o.socialFleeUntil=clock+L.animalFleeSeconds;o.hunting=false;o.visitUntil=0;villageReaction(o,'spooked');}
    else if(p.speed<=L.animalSpookSpeed&&clock>=(o.socialNext||0)&&(touched||p.speed<=S.physics.walkSpeed)){o.socialNext=clock+L.animalCooldownSeconds;o.visitUntil=clock+L.socialSeconds;o.hunting=false;say(o.type==='rabbit'?'Sniff sniff.':'Yip?',o,1.3);villageReaction(o,'gentle');}
  }
  function moveSocialAnimal(o,dt,hunters){
    const p=state.p,L=S.villageLife;
    // A nearby wolf/fox still takes priority over a rabbit's curiosity.
    if(o.type==='rabbit'&&hunters.some(q=>!q.dead&&(q.type==='fox'||q.type==='wolf')&&q.hunting&&Math.hypot(q.x-o.x,q.y-o.y)<S.wildlife.rabbitFearDistance))return false;
    greetSmallAnimal(o);
    if(o.socialFleeUntil>clock){travel(o,o.fleeAngle,L.animalFleeSpeed,dt,true);return true;}
    if(o.socialUntil>clock){if(o.socialPartner&&Math.hypot(o.x-o.socialPartner.x,o.y-o.socialPartner.y)>30)travel(o,Math.atan2(o.socialPartner.y-o.y,o.socialPartner.x-o.x),L.npcAnimalApproachSpeed,dt,true);else o.running=false;return true;}
    if(o.visitUntil>clock){const d=Math.hypot(o.x-p.x,o.y-p.y);if(d>28)travel(o,Math.atan2(p.y-o.y,p.x-o.x),L.animalVisitSpeed,dt,true);else o.running=false;return true;}
    return false;
  }
  function updateVillageLife(dt){
    state.villageLifeElapsed=(state.villageLifeElapsed||0)+dt;if(state.villageLifeElapsed<.05-1e-8)return;dt=state.villageLifeElapsed;state.villageLifeElapsed=0;
    const p=state.p,L=S.villageLife,near=state.objects.filter(o=>!o.dead&&!o.eaten&&Math.hypot(o.x-p.x,o.y-p.y)<S.pedestrians.activeRadius);
    const animals=near.filter(o=>['rabbit','fox','cat','dog'].includes(o.type)&&!o.dogCompanion&&!o.dogRetreat);
    for(const o of animals)if(o.type==='dog'&&o.socialUntil>clock&&o.socialPartner&&Math.hypot(o.x-o.socialPartner.x,o.y-o.socialPartner.y)>30)travel(o,Math.atan2(o.socialPartner.y-o.y,o.socialPartner.x-o.x),L.npcAnimalApproachSpeed,dt);
    for(const o of near)if(o.type==='pigeons'&&Math.hypot(o.x-p.x,o.y-p.y)<65&&state.started)touchVillageProp(o);
    for(const n of near){
      if(n.backyardPet&&!n.dogFed&&Math.hypot(n.x-p.x,n.y-p.y)<75)touchVillageProp(n);
      if(!n.type.startsWith('person')||!n.town||n.fearUntil>clock)continue;
      const distance=Math.hypot(n.x-p.x,n.y-p.y);
      if(distance<170&&clock>=(n.nextWave||0)){n.waveUntil=clock+1.8;n.nextWave=clock+12;}
      if((n.job==='bakery'||n.job==='cocoa')&&distance<105&&clock>=(n.nextServe||0)){
        n.serveUntil=clock+1.5;n.nextServe=clock+12;n.waveUntil=0;
        n.socialAnimal=null;n.animalNext=clock+2;n.socialUntil=Math.max(n.socialUntil||0,n.serveUntil);
        say(n.job==='cocoa'?'COCOA FOR COURAGE!':'FRESH BUNS. STILL WARM!',n,2);burst(n.x,n.y,C.gold,5);
      }
      if(n.job==='toys'&&distance<105&&clock>=(n.nextServe||0)){n.waveUntil=clock+1.8;n.nextServe=clock+12;say('TINY TOYS, BIG ADVENTURES!',n,2);}
      if(n.snowPlay&&distance<120&&clock>=(n.nextThrow||0)){
        n.throwUntil=clock+.8;n.nextThrow=clock+8;say('SNOWBALL FIGHT!',n,1.5);
        state.particles.push({x:n.x,y:n.y-12,vx:(p.x-n.x)/.7,vy:(p.y-n.y)/.7-28,life:.7,color:'#f8faf0',size:5});
      }
      if(n.socialUntil>clock||n.snowPlay||clock<(n.nextChat||0))continue;
      const friend=near.find(q=>q!==n&&q.town===n.town&&q.type.startsWith('person')&&!(q.fearUntil>clock)&&!(q.socialUntil>clock)&&!q.snowPlay&&Math.hypot(q.x-n.x,q.y-n.y)<90);
      n.nextChat=clock+12+n.phase;
      if(friend){n.chatUntil=friend.chatUntil=n.socialUntil=friend.socialUntil=clock+3;friend.nextChat=clock+15;friend.chatPartner=n;n.chatPartner=friend;n.socialAnimal=friend.socialAnimal=null;}
    }
    for(const n of near){
      if(!n.type.startsWith('person')||n.fearUntil>clock||n.cheerUntil>clock||clock<(n.animalNext||0))continue;
      const animal=animals.find(o=>clock>=(o.npcNext||0)&&!(o.socialFleeUntil>clock)&&!(o.ai==='flee'||o.ai==='climb')&&Math.hypot(o.x-n.x,o.y-n.y)<L.npcAnimalRadius);
      if(!animal)continue;n.animalNext=animal.npcNext=clock+L.npcCooldownSeconds;n.socialUntil=clock+L.socialSeconds;n.socialAnimal=animal;
      if(animal.type==='fox'){
        animal.visitUntil=0;animal.hunting=false;animal.fleeAngle=Math.atan2(animal.y-n.y,animal.x-n.x);animal.socialFleeUntil=clock+L.animalFleeSeconds;
        animal.carryBreadUntil=['bakery','market'].includes(n.job)?clock+L.animalFleeSeconds:0;say(pick(L.dialogue.fox),n,2);burst(n.x,n.y,C.gold,4);
      }else{
        animal.socialUntil=clock+L.socialSeconds;animal.socialPartner=n;animal.visitUntil=0;
        say(pick(L.dialogue[animal.type==='rabbit'?'rabbit':'pet']),n,2);
        if(animal.type==='rabbit'){burst(animal.x,animal.y,'#c79155',5);animal.feedingUntil=clock+L.socialSeconds;}
        else say(animal.type==='cat'?'Prrrr.':'Woof!',animal,1.4);
      }
    }
  }
  function drawVillageDetail(o,s){
    const x=s.x,y=s.y;
    if(o.type==='powderPile'){const flat=o.puffedUntil>clock;box(x-10,y-3,21,4,'#d9e7e5');box(x-7,y-(flat?3:7),15,flat?3:7,'#fdfef5');box(x-3,y-(flat?3:9),8,2,'#edf4ec');return;}
    if(o.type==='pigeons'){
      const flight=o.flyingUntil>clock?1-(o.flyingUntil-clock)/S.villageLife.pigeonFlightSeconds:0;
      for(let i=0;i<4;i++){const px=x+(i-1.5)*7+(flight?(i-1.5)*flight*48:Math.sin(clock+o.phase+i)*2),py=y+(i%2)*5-(flight?Math.sin(flight*Math.PI)*40:0);box(px-2,py-3,5,3,'#849195');box(px+2,py-5,3,3,'#516a75');box(px+5,py-4,2,1,'#b29468');if(flight){const wing=Math.sin(clock*23+i)>0?-5:1;box(px-3,py+wing,3,4,'#afbbbc');}else box(px,py,1,2,'#ac8064');}return;
    }
    shadow(x,y,18,4);
    if(o.type==='skiRack'){
      box(x-17,y-13,34,3,'#92734e');for(const side of [-1,1])box(x+side*14,y-14,2,15,'#6c6254');
      for(let i=0;i<6;i++){const px=x-12+i*5;line(px,y-25,px+3,y-1,['#66848b','#aa8064','#879471'][i%3],2);box(px,y-25,3,2,'#dce8e3');}return;
    }
    const color='#ae815b';
    box(x-18,y-12,36,12,'#92734e');box(x-19,y-13,38,3,'#c4a079');box(x-17,y-25,2,15,'#6b6558');box(x+15,y-25,2,15,'#6b6558');
    for(let i=0;i<9;i++){box(x-20+i*4,y-28,4,5,i%2?'#ece9d5':color);box(x-20+i*4,y-23,4,3+(Math.sin(clock*2+o.phase)>0?1:0),i%2?'#dedfc9':color);}
    for(let i=0;i<5;i++){box(x-13+i*6,y-17,5,3,'#d2a96a');box(x-12+i*6,y-18,3,1,'#ead5ab');}
  }

  function drawRoads(){
    const V=S.village,unit=V.roadTileSize;
    const natural=state.roads.filter(r=>r.natural);
    // Snow covers side-path junctions, matching the surface priority used by physics.
    for(const r of [...state.roads].sort((a,b)=>Number(a.surface==='snow')-Number(b.surface==='snow'))){
      if(r.natural)continue;
      r.bounds??=roadBBox(r);
      const view=viewBounds();if(r.bounds.right<view.left||r.bounds.left>view.right||r.bounds.bottom<view.top||r.bounds.top>view.bottom)continue;
      if(r.cemeteryPath){
        ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#d9e2db';ctx.lineWidth=r.width*ZOOM;ctx.beginPath();r.points.forEach((p,i)=>{const at=screen(p.x,p.y);i?ctx.lineTo(at.x,at.y):ctx.moveTo(at.x,at.y);});ctx.stroke();ctx.restore();
        for(let y=Math.max(r.points[0].y,Math.floor(view.top/35)*35);y<Math.min(r.points.at(-1).y,view.bottom);y+=35){const x=encounterPathX(r.points,y),at=screen(x+(Math.floor(y/35)%2?8:-8),y);box(at.x,at.y,2,1,'#bdcdc3');}continue;
      }
      if(!r.tiles&&r.endlessEncounter){
        // Rasterize each short route segment directly, without oversampling the whole long town.
        const cells=new Map(),half=r.width/2;
        for(let i=1;i<r.points.length;i++){
          const a=r.points[i-1],b=r.points[i];
          for(let tx=Math.floor((Math.min(a.x,b.x)-half)/unit);tx<=Math.floor((Math.max(a.x,b.x)+half)/unit);tx++)for(let ty=Math.floor((Math.min(a.y,b.y)-half)/unit);ty<=Math.floor((Math.max(a.y,b.y)+half)/unit);ty++){
            const distance=segmentDistance((tx+.5)*unit,(ty+.5)*unit,a,b);if(distance>half)continue;
            const key=tx+','+ty,prior=cells.get(key);if(prior){prior.distance=Math.min(prior.distance,distance);continue;}
            cells.set(key,{x:tx*unit,y:ty*unit,grain:Math.abs(tx*17+ty*31)%17,color:Math.abs(tx*17+ty*31)%7<2?V.roadColors[3]:V.roadColors[2],distance});
          }
        }
        r.tiles=[...cells.values()].filter(cell=>r.surface==='snow'||!natural.some(path=>roadDistance(path,cell.x+unit/2,cell.y+unit/2)<path.width/2));for(const cell of r.tiles)cell.edge=r.surface==='snow'&&cell.distance>half-unit*.8;
      }
      if(!r.tiles){const cells=new Map();for(let i=1;i<r.points.length;i++){
        const a=r.points[i-1],b=r.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/V.roadSampleSpacing);
        for(let j=0;j<=steps;j++){const x=mix(a.x,b.x,j/(steps||1)),y=mix(a.y,b.y,j/(steps||1)),n=Math.ceil(r.width/2/unit);
          for(let dx=-n;dx<=n;dx++)for(let dy=-n;dy<=n;dy++){const tx=Math.floor(x/unit)+dx,ty=Math.floor(y/unit)+dy,k=tx+','+ty;if(!cells.has(k)&&segmentDistance((tx+.5)*unit,(ty+.5)*unit,a,b)<=r.width/2)cells.set(k,{x:tx*unit,y:ty*unit,grain:Math.abs(tx*17+ty*31)%17,color:Math.abs(tx*17+ty*31)%7<2?V.roadColors[3]:V.roadColors[2]});}
        }
      }r.tiles=[...cells.values()].filter(cell=>r.surface==='snow'||!natural.some(path=>roadDistance(path,cell.x+unit/2,cell.y+unit/2)<path.width/2));
        for(const cell of r.tiles)cell.edge=r.surface==='snow'&&roadDistance(r,cell.x+unit/2,cell.y+unit/2)>r.width/2-unit*.8;
      }
      const chunk=unit*24;
      if(r.paintFor!==r.tiles){
        r.paintFor=r.tiles;r.paintGroups=new Map();r.paintTiles=new Map();
        for(const cell of r.tiles){const key=Math.floor(cell.x/chunk)+','+Math.floor(cell.y/chunk);let list=r.paintGroups.get(key);if(!list)r.paintGroups.set(key,list=[]);list.push(cell);}
      }
      for(let cy=Math.floor(view.top/chunk);cy<=Math.floor(view.bottom/chunk);cy++)for(let cx=Math.floor(view.left/chunk);cx<=Math.floor(view.right/chunk);cx++){
        const key=cx+','+cy,cells=r.paintGroups.get(key);if(!cells)continue;let tile=r.paintTiles.get(key);
        if(!tile){
          tile=document.createElement('canvas');
          const size=Math.ceil(unit*ZOOM)+1,left=Math.min(...cells.map(c=>Math.round((c.x-cx*chunk)*ZOOM))),top=Math.min(...cells.map(c=>Math.round((c.y-cy*chunk)*ZOOM)));
          tile.paintX=left;tile.paintY=top;tile.width=Math.max(...cells.map(c=>Math.round((c.x-cx*chunk)*ZOOM)+size))-left;tile.height=Math.max(...cells.map(c=>Math.round((c.y-cy*chunk)*ZOOM)+size))-top;
          const t=tile.getContext('2d'),box=(x,y,w,h,color)=>{t.fillStyle=gritMaterial(color);t.fillRect(Math.round(x)-left,Math.round(y)-top,Math.round(w),Math.round(h));};
          for(const cell of cells){const x=(cell.x-cx*chunk)*ZOOM,y=(cell.y-cy*chunk)*ZOOM;
            if(r.surface==='snow'){
              const colors=V.snowRoadColors;box(x,y,size,size,cell.edge?colors[0]:colors[1]);
              if(cell.edge&&cell.grain<4)box(x+1,y+2,3,1,colors[2]);else if(!cell.edge&&cell.grain<3)box(x+1,y+2,Math.max(2,size-3),1,colors[2]);else if(cell.grain===8)box(x+2,y+4,2,1,colors[3]);
            }else{box(x,y,size,size,V.roadColors[1]);box(x+1,y+1,Math.max(1,unit*ZOOM-1),Math.max(1,unit*ZOOM-1),cell.color);}
          }
          if(r.paintTiles.size>=64)r.paintTiles.delete(r.paintTiles.keys().next().value);r.paintTiles.set(key,tile);
        }
        const at=screen(cx*chunk,cy*chunk);ctx.drawImage(tile,at.x+tile.paintX,at.y+tile.paintY);
      }
    }
  }
  function addEndlessLift(town,section,e){
    if(town.arcadeLift)return;
    const a=state.endless,root=section.endlessRoot||state.course;
    if(town.parade){
      const side=town.layoutSeed%2?1:-1;
      town.stationX=town.x+side*(e.half+300);town.stationY=town.liftGapY;
      const road={surface:'snow',width:36,points:[{x:town.x,y:town.stationY},{x:town.stationX,y:town.stationY}],town,endlessEncounter:e,endlessEndY:e.endY};
      state.roads.push(road);
    }
    const own={town,arcadeRun:section,encounter:e};
    town.arcadeLift=entity('lift',town.stationX,town.stationY,{...own,width:174,r:0,half:73,used:false});
    entity('liftLabel',town.stationX,town.stationY+55,{...own,r:0,width:160});
    for(let i=0;i<4;i++)entity(i%2?'personRed':'personGreen',town.stationX-45+i*22,town.stationY+20,{...own,width:30,r:0,job:'queue',costume:town.festival==='christmas'?'furCoat':town.festival==='halloween'?'pumpkin':undefined});
    const tail=a.liftTail,bendStart=Math.max(tail.y0,town.stationY-S.lift.routeBendDistance),x=liftX(tail,bendStart);
    tail.y1=bendStart;
    state.liftRoutes.push({x0:x,x1:town.stationX,y0:bendStart,y1:town.stationY,endlessRun:root});
    a.liftTail={x0:town.stationX,x1:root.x+Math.sign(town.stationX-root.x)*S.lift.x,y0:town.stationY,y1:Infinity,endlessRun:root};
    state.liftRoutes.push(a.liftTail);
  }
  function liftX(route,y){return mix(route.x0,route.x1,clamp((y-route.y0)/S.lift.routeBendDistance,0,1));}
  function safeApproach(x,y){return state.villages.some(t=>!t.endlessRun&&y>=t.roadEndY&&y<=t.approachEndY&&Math.abs(x-t.x)<S.village.halfWidth+150);}
  function insideTown(x,y){return state.villages.some(t=>Math.abs(x-t.x)<(t.halfWidth??S.village.halfWidth+150)&&y>t.origin-70&&y<t.end);}
  // Preserve protected corridors after a run ends, including when walking back uphill.
  function humanArea(x,y){
    return (Math.abs(x)<S.world.safeSummitHalfWidth&&y>S.world.safeSummitTop&&y<S.world.safeSummitBottom)||insideTown(x,y)||safeApproach(x,y)||state.safeTrails.some(r=>y>r.selectionY-80&&y<r.endY+350&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth);
  }
  function classicArea(x,y,margin=0){return state.safeTrails.some(r=>(r.id==='slalom'||r.arcade&&!r.arcade.trees)&&y>r.startY-120-margin&&y<r.endY+60+margin&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth+margin);}
  function spawnWolfPack(x,y,extra={}){
    const owner={arcadeRun:extra.arcadeRun};
    if(humanArea(x,y)&&!courseCreature(owner,x,y))return [];
    const existing=state.objects.filter(o=>o.type==='wolf'&&!o.dead);
    const nearbyPacks=new Set(existing.filter(o=>Math.hypot(o.x-x,o.y-y)<S.wildlife.packLimitRadius).map(o=>o.packId));
    if(existing.some(o=>Math.hypot(o.x-x,o.y-y)<S.wildlife.packSpawnSeparation)||nearbyPacks.size>=S.wildlife.packLimit)return [];
    const packId=random(),count=Math.floor(range(S.wildlife.packMin,S.wildlife.packMax+1)),visitor=humanArea(x,y),wolves=[];
    for(let i=0;i<count;i++){
      let xx=x+(i%2?1:-1)*i*S.wildlife.packSpacingX,yy=y+Math.floor(i/2)*S.wildlife.packSpacingY;
      if(!visitor&&humanArea(xx,yy)){xx=x;yy=y+i*18;}
      if(humanArea(xx,yy)&&!courseCreature(owner,xx,yy))continue;
      wolves.push(entity('wolf',xx,yy,{width:43,r:11,animal:true,packId,packIndex:i,humanVisitor:visitor,ai:'idle',nextAI:clock+range(1,4),...extra}));
    }return wolves;
  }
  function spawnFastSkier(){
    if(state.arcade||state.endless||!state.started||state.p.awaitingInput||insideTown(state.p.x,state.p.y)||clock<state.nextFastSkier)return;
    state.nextFastSkier=clock+range(...S.skiers.fastSpawnSeconds);
    const y=viewBounds().top-S.skiers.fastSpawnAbove,x=state.p.x+pick([-1,1])*range(...S.skiers.fastSpawnOffsetX);
    if(insideTown(x,y))return;
    entity('skier',x,y,{width:44,r:12,fast:true,vy:topSpeed()*S.skiers.fastSpeedRatio,vx:range(-13,13)});
  }
  function ambientType(x,y){
    const roll=random(),arcadeRun=state.safeTrails.find(r=>r.arcade&&y>r.startY-120&&y<r.endY+60&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth+100);
    if(arcadeRun)return arcadeTerrainAt(arcadeRun,y).trees?pick(['skier','skier','pine','fir']):'skier';
    if(classicArea(x,y,70))return pick(['skier','skier','personGreen']);
    if(y<S.world.uphillForestY&&roll<S.world.uphillTreeChance)return pick(['pine','pine','fir']);
    if(humanArea(x,y))return roll<S.world.humanPredatorChance&&random()>=S.world.wolfShareOfPredators?'fox':pick(S.spawnTables.human);
    return roll<S.world.wildPredatorChance?(random()<S.world.wolfShareOfPredators?'wolf':'fox'):pick(S.spawnTables.wild);
  }
  function removeInactiveEnemies(){
    const blocked=o=>{
      if(!MONSTER_KINDS.has(enemyKind(o))||o.dead||o.eaten)return false;
      if(o.retiring||o.leaving)return true;
      if(o.arcadeRun||o.chaseRun)return !activeCourseOwner(o)||!courseCreature(o,o.x,o.y);
      return humanArea(o.x,o.y);
    };
    let removed;
    const keep=o=>{if(!blocked(o))return true;(removed??=new Set()).add(o);return false;};
    filterObjects(keep);state.chasers=state.chasers.filter(keep);
    if(removed)state.speech=state.speech.filter(s=>!removed.has(s.object));
  }
  function pruneDistantEnemies(){
    const p=state.p,range=S.chasers.despawnScreens*H/ZOOM,range2=range*range;
    let removed;
    const keep=(o,chaser=false)=>{
      const monster=chaser||MONSTER_KINDS.has(enemyKind(o));
      // An old mausoleum must not keep producing enemies outside the chase boundary.
      if(!monster&&!(o.grandMausoleum&&o.y<p.y-range))return true;
      const dx=o.x-p.x,dy=o.y-p.y;
      if(dx*dx+dy*dy<=range2){if(monster)o.enemyRangeEntered=true;return true;}
      // Terrain is authored ahead of the skier. Preserve unvisited future enemies.
      if(monster&&dy>=0&&!o.enemyRangeEntered&&(!chaser||o.waiting))return true;
      (removed??=new Set()).add(o);o.eaten=true;o.r=0;o.divert=null;o.obstacleDetour=null;
      return false;
    };
    filterObjects(o=>keep(o));
    // Retain the array when nothing is removed so actor/contact caches remain reusable.
    let kept=null;
    for(let i=0;i<state.chasers.length;i++){
      const c=state.chasers[i];if(keep(c,true)){if(kept)kept.push(c);}else if(!kept)kept=state.chasers.slice(0,i);
    }
    if(kept)state.chasers=kept;
    if(removed){
      state.speech=state.speech.filter(s=>!removed.has(s.object));
      const releaseTarget=o=>{if(removed.has(o.divert)){o.divert=o.divertOrigin=o.obstacleDetour=null;o.avoidUntil=0;o.nextDivertCheck=0;}};
      for(const o of state.objects){releaseTarget(o);if(removed.has(o.socialAnimal)){o.socialAnimal=null;o.socialUntil=0;}}
      for(const c of state.chasers)releaseTarget(c);
      for(const o of removed)p.slowContacts.delete(o);
      if(removed.has(p.crashObstacle))p.crashObstacle=null;
    }
  }
  function protectScenery(){
    removeInactiveEnemies();
    // Newly selected terrain is below the viewport; don't reveal replacements on screen.
    const bottom=viewBounds().bottom;
    for(const o of state.objects)if(!o.arcadeRun&&o.y>bottom+100&&humanArea(o.x,o.y)&&['bear','lurker','fox','wolf'].includes(o.type)){
      o.type='bush';o.width=35;o.r=10;o.animal=false;o.ai='idle';
    }
  }
  function polygonContains(points,x,y){
    let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  }
  function lakeGeometry(o){
    if(o.lake)return o.lake;
    if(o.transitionLake){const rounded=v=>Math.sign(v)*Math.abs(v)**.35,points=Array.from({length:64},(_,i)=>[rounded(Math.cos(i/64*TAU))*o.rx,rounded(Math.sin(i/64*TAU))*o.ry]);return o.lake={points,holes:[],radius:Math.max(o.rx,o.ry)};}
    if(o.gateIce){const x=o.rx,y=o.ry;return o.lake={points:[[-x,-y*.5],[-x*.75,-y],[x*.65,-y],[x,-y*.55],[x,y*.6],[x*.7,y],[-x*.7,y],[-x,y*.5]],holes:[],radius:Math.ceil(Math.max(x,y)*1.15/4)*4};}
    const points=[],phase=o.phase||0,shape=Math.floor((o.id||0)*4),rotation=Math.sin(phase)*.32;
    for(let i=0;i<64;i++){
      const a=i/64*TAU;
      let r=.84+.12*Math.sin(a*3+phase)+.055*Math.sin(a*7-phase);
      if(shape===0)r*=1-.4*Math.exp(-(((Math.atan2(Math.sin(a),Math.cos(a))-.5)/.48)**2));
      if(shape===1)r*=.72+.28*Math.abs(Math.cos(a));
      if(shape===2)r*=.73+.27*Math.abs(Math.sin(a));
      const x=Math.cos(a)*o.rx*r,y=Math.sin(a)*o.ry*r;
      points.push([Math.round((x*Math.cos(rotation)-y*Math.sin(rotation))/4)*4,Math.round((x*Math.sin(rotation)+y*Math.cos(rotation))/4)*4]);
    }
    const holes=[];
    if(Math.min(o.rx,o.ry)>115&&shape!==1){
      const hole=[];for(let i=0;i<12;i++){const a=i/12*TAU,r=1+.15*Math.sin(a*3+phase);hole.push([o.rx*.17+Math.cos(a)*o.rx*.17*r,-o.ry*.12+Math.sin(a)*o.ry*.14*r]);}holes.push(hole);
    }
    const radius=Math.ceil(Math.max(o.rx,o.ry)*1.15/4)*4;
    return o.lake={points,holes,radius};
  }
  function lakeContains(o,x,y){
    const dx=x-o.x,dy=y-o.y,g=lakeGeometry(o);
    if(Math.abs(dx)>g.radius||Math.abs(dy)>g.radius)return false;
    return polygonContains(g.points,dx,dy)&&!g.holes.some(h=>polygonContains(h,dx,dy));
  }
  // Edible creatures for opportunistic predators. Predator kinds (wolf, fox, bear, lurkers)
  // are deliberately absent: predators never hunt each other.
  const CREATURE_TYPES=new Set(['skier','boarder','personRed','personYellow','personGreen','dog','cat','rabbit']);
  function ediblePrey(o){
    const chasingNpc=o.kind==='dog'||o.kind==='patrol',type=o.type||(chasingNpc?(o.kind==='dog'?'dog':'skier'):null);
    return CREATURE_TYPES.has(type)&&!o.eaten&&!o.dead&&!o.leaving&&(!o.patrolPass||o.remaining>0)&&(!chasingNpc||!(state.p.y>o.expires))&&((o.r??(chasingNpc?12:0))>0||type.startsWith('person'));
  }
  const objectGroupCache={};
  function objectGroups(){
    const c=objectGroupCache;
    if(c.time===clock&&c.source===state.objects&&c.length===state.objects.length)return c.groups;
    const groups={wildlife:[],animals:[],dogs:[],skiers:[],zombies:[],mausoleums:[],groundHunters:[],terrainFeatures:[],ground:[],plots:[],sleighs:[]};
    for(const o of state.objects){
      const type=o.type;
      if(o.animal||o.retiring||type==='wolf')groups.animals.push(o);
      if(o.grandMausoleum)groups.mausoleums.push(o);if(o.santaSleigh)groups.sleighs.push(o);
      switch(type){
        case 'dog':groups.dogs.push(o);break;
        case 'rabbit':case 'cat':case 'fox':groups.wildlife.push(o);break;
        case 'wolf':groups.wildlife.push(o);groups.groundHunters.push(o);break;
        case 'skier':case 'boarder':groups.wildlife.push(o);groups.skiers.push(o);break;
        case 'zombie':groups.zombies.push(o);groups.groundHunters.push(o);break;
        case 'fallingTree':groups.terrainFeatures.push(o);break;
        case 'rollingSnowball':groups.terrainFeatures.push(o);break;
        case 'cemeteryPlot':groups.plots.push(o);break;
        case 'ice':case 'rugged':case 'ramp':case 'mogul':case 'smallHill':case 'largeHill':case 'logBump':groups.ground.push(o);break;
      }
    }
    Object.assign(c,{time:clock,source:state.objects,length:state.objects.length,groups});return groups;
  }
  const preyCache={};
  function preyActors(){
    if(preyCache.time!==clock||preyCache.objects!==state.objects||preyCache.length!==state.objects.length||preyCache.chasers!==state.chasers||preyCache.chaserLength!==state.chasers.length){
      preyCache.time=clock;preyCache.objects=state.objects;preyCache.length=state.objects.length;preyCache.chasers=state.chasers;preyCache.chaserLength=state.chasers.length;
      preyCache.actors=state.objects.filter(ediblePrey);for(const c of state.chasers)if((c.kind==='dog'||c.kind==='patrol')&&ediblePrey(c))preyCache.actors.push(c);
    }
    return preyCache.actors;
  }
  function preyOnPlayerPath(hunter,prey,committed=false){
    // Any edible NPC is fair game along a hunter's route toward the player.
    if(!['fast','slow','bear'].includes(hunter?.kind)&&hunter?.type!=='wolf'&&hunter?.type!=='zombie')return true;
    const p=state.p,P=S.predators;
    const width=(committed?P.divertReleaseWidthMetres:P.divertPathWidthMetres)*PX_PER_M*endlessSpeedScale(hunter);
    const angle=(committed?P.divertReleaseAngleDegrees:P.divertPathAngleDegrees)*Math.PI/180;
    // Finish a nearby committed catch even if a stopped/fallen target slips just behind us.
    if(committed&&Math.hypot(prey.x-hunter.x,prey.y-hunter.y)<S.chasers.captureDistance*2)return true;
    const route=endlessPursuitRoute(hunter,p),e=route?.encounter;
    if(route?.cemetery){const h=cemeteryProjection(e,hunter.x,hunter.y),q=cemeteryProjection(e,prey.x,prey.y),goal=cemeteryProjection(e,p.x,p.y),direction=Math.sign(goal.along-h.along)||1,along=(q.along-h.along)*direction;return q.distance<=width&&(!committed||h.distance<=width)&&along>0&&along<=Math.abs(goal.along-h.along)+width;}
    const path=e&&!route.cemetery&&hunter.y>=e.startY&&prey.y>=e.startY&&prey.y<=e.endY?e.paths[route.index]:null;
    const origin=committed&&hunter.divertOrigin||hunter,routeX=p.x-origin.x,routeY=p.y-origin.y,routeLength=Math.hypot(routeX,routeY)||1;
    const goal=path?{x:encounterPathX(path,prey.y),y:prey.y}:{x:p.x+routeX/routeLength*width,y:p.y+routeY/routeLength*width};
    const dx=goal.x-hunter.x,dy=goal.y-hunter.y,length=Math.hypot(dx,dy);
    if(length<1)return false;
    const qx=prey.x-hunter.x,qy=prey.y-hunter.y,along=(qx*dx+qy*dy)/length,across=Math.abs(qx*dy-qy*dx)/length;
    // Nearby prey can be a short sidestep away; the approach cone must not shrink to zero.
    const angleReach=Math.max(along,width);
    if(along<=0||across>width||across>angleReach*Math.tan(angle))return false;
    if(path){
      if(prey.y<=hunter.y||prey.y>p.y+width||Math.abs(prey.x-goal.x)>width)return false;
      if(committed&&Math.abs(hunter.x-encounterPathX(path,hunter.y))>width)return false;
      return true;
    }
    // A close snack just beyond the player is still on the same route, not a distant detour.
    if(along>length)return false;
    if(committed){
      // A moving hunter-to-player line alone would forgive gradual sideways drift.
      // Keep the diversion bounded relative to its starting point and the live player.
      if(segmentDistance(hunter.x,hunter.y,origin,p)>width||segmentDistance(prey.x,prey.y,origin,p)>width)return false;
    }
    return true;
  }
  function nearestPrey(x,y,radius,hunter){
    let best=null,bestD=radius;
    for(const o of preyActors()){
      const dx=o.x-x,dy=o.y-y;if(Math.abs(dx)>=bestD||Math.abs(dy)>=bestD)continue;
      if(!ediblePrey(o))continue;
      const d=Math.hypot(dx,dy);
      if(d>=bestD||humanArea(o.x,o.y)&&!courseCreature(hunter,o.x,o.y))continue;
      if(!preyOnPlayerPath(hunter,o))continue;
      bestD=d;best=o;
    }
    return best;
  }
  function updatePreyTarget(hunter){
    const P=S.predators,prey=hunter.divert;
    if(prey){
      if(!ediblePrey(prey)||humanArea(prey.x,prey.y)&&!courseCreature(hunter,prey.x,prey.y))hunter.divert=null;
      else if(!preyOnPlayerPath(hunter,prey,true)){
        hunter.divert=null;hunter.divertOrigin=null;
        hunter.avoidUntil=0;hunter.obstacleDetour=null;
        // Return to the player immediately, rather than choosing another NPC this frame.
        hunter.nextDivertCheck=clock+P.divertRecheckSeconds;return;
      }
      else {
        const distance=Math.hypot(prey.x-hunter.x,prey.y-hunter.y);
        // Keep a committed hunt while closing the gap; only time out stalled pursuits.
        if(hunter.divertBestDistance===undefined||distance<=hunter.divertBestDistance-1){
          hunter.divertBestDistance=distance;hunter.divertUntil=clock+P.divertTimeoutSeconds;
        }
        if(clock>hunter.divertUntil)hunter.divert=null;
      }
    }
    if(hunter.divert||clock<=(hunter.nextDivertCheck||0))return;
    const next=nearestPrey(hunter.x,hunter.y,P.divertRadiusMetres*PX_PER_M*endlessSpeedScale(hunter),hunter);
    // An empty scan must not hide a fast encounter for the whole decision interval.
    hunter.nextDivertCheck=clock+(next?P.divertRecheckSeconds:Math.min(.2,P.divertRecheckSeconds));
    if(next&&(P.divertChance>=1||Math.random()<P.divertChance)){
      hunter.divert=next;hunter.divertBestDistance=Math.hypot(next.x-hunter.x,next.y-hunter.y);hunter.divertUntil=clock+P.divertTimeoutSeconds;
      hunter.divertOrigin={x:hunter.x,y:hunter.y};
    }
  }
  // Build per predator-only phase: NPC movement between phases gets a fresh swept index.
  // Index both ends of prey motion so fast crossing skiers remain candidates.
  function preyContactIndex(){
    const actors=preyActors(),grid=new Map(),large=[],cell=160;
    for(let i=0;i<actors.length;i++){
      const o=actors[i],moving=o.motionFromStamp===clock,px=moving?o.motionFromX:o.x,py=moving?o.motionFromY:o.y;
      const x0=Math.floor(Math.min(px,o.x)/cell),x1=Math.floor(Math.max(px,o.x)/cell),y0=Math.floor(Math.min(py,o.y)/cell),y1=Math.floor(Math.max(py,o.y)/cell);
      if((x1-x0+1)*(y1-y0+1)>64){large.push(i);continue;}
      for(let x=x0;x<=x1;x++){let col=grid.get(x);if(!col)grid.set(x,col=new Map());for(let y=y0;y<=y1;y++){let list=col.get(y);if(!list)col.set(y,list=[]);list.push(i);}}
    }
    return {actors,grid,large,cell,marks:new Uint32Array(actors.length),epoch:0};
  }
  function nearbyContactPrey(index,hunter,previous,radius){
    const {actors,grid,cell,marks}=index,x0=Math.floor((Math.min(previous.x,hunter.x)-radius)/cell),x1=Math.floor((Math.max(previous.x,hunter.x)+radius)/cell),y0=Math.floor((Math.min(previous.y,hunter.y)-radius)/cell),y1=Math.floor((Math.max(previous.y,hunter.y)+radius)/cell);
    if((x1-x0+1)*(y1-y0+1)>256)return actors;
    if(index.epoch>=0xffffffff){marks.fill(0);index.epoch=0;}const epoch=++index.epoch,found=[...index.large];for(const i of found)marks[i]=epoch;
    for(let x=x0;x<=x1;x++){const col=grid.get(x);if(!col)continue;for(let y=y0;y<=y1;y++)for(const i of col.get(y)||[]){if(marks[i]===epoch)continue;marks[i]=epoch;found.push(i);}}
    // Retain the linear scan's tie order when two prey have the same contact time.
    found.sort((a,b)=>a-b);return found.map(i=>actors[i]);
  }
  function contactPrey(hunter,previous,radius=S.chasers.captureDistance,index=null,actors=null,eligible=ediblePrey){
    let meal=null,best=Infinity;
    for(const o of index?nearbyContactPrey(index,hunter,previous,radius):actors||preyActors()){
      const moving=o.motionFromStamp===clock,px=moving?o.motionFromX:o.x,py=moving?o.motionFromY:o.y;
      const sx=previous.x-px,sy=previous.y-py,dx=hunter.x-o.x,dy=hunter.y-o.y;
      if(sx>radius&&dx>radius||sx< -radius&&dx< -radius||sy>radius&&dy>radius||sy< -radius&&dy< -radius)continue;
      if(!eligible(o))continue;
      const vx=dx-sx,vy=dy-sy,t=clamp(-(sx*vx+sy*vy)/(vx*vx+vy*vy||1),0,1);
      if(Math.hypot(sx+vx*t,sy+vy*t)>=radius)continue;
      if(humanArea(o.x,o.y)&&!courseCreature(hunter,o.x,o.y))continue;
      if(t<best){meal=o;best=t;}
    }
    return meal;
  }
  function eatChaserPrey(hunter,meal,previous,pause=S.predators.mealPauseSeconds){
    const dx=hunter.x-previous.x,dy=hunter.y-previous.y,t=clamp(((meal.x-previous.x)*dx+(meal.y-previous.y)*dy)/(dx*dx+dy*dy||1),0,1);
    hunter.x=previous.x+dx*t;hunter.y=previous.y+dy*t;
    hunter.motionVx=hunter.motionVy=hunter.travelSpeed=0;hunter.travelStamp=clock;hunter.running=false;hunter.hunting=false;hunter.targetSkier=null;
    meal.eaten=true;meal.r=0;meal.walking=false;meal.socialUntil=meal.fearUntil=0;
    state.speech=state.speech.filter(q=>q.object!==meal);
    hunter.divert=null;hunter.divertOrigin=null;hunter.obstacleDetour=null;hunter.avoidUntil=0;
    hunter.feedingUntil=clock+pause;hunter.nextDivertCheck=hunter.feedingUntil;
    say('CHOMP!',hunter,1.2);burst(meal.x,meal.y,C.ice,9);
  }
  function consumeNearbyPrey(hunter,previous,pause=S.predators.mealPauseSeconds,radius=S.chasers.captureDistance,contacts=null){
    if(hunter.dead||hunter.eaten||hunter.retiring||hunter.leaving||hunter.stunnedUntil>clock||hunter.feedingUntil>clock)return false;
    if(resolveEnemyContact(hunter,{ramOnly:true}))return false;
    const index=contacts&&(contacts.index??=preyContactIndex()),meal=contactPrey(hunter,previous,radius,index);if(!meal)return false;
    eatChaserPrey(hunter,meal,previous,pause);return true;
  }
  function resolveGroundPredatorPrey(){
    const contacts={};
    for(const o of objectGroups().groundHunters){
      const wolf=o.type==='wolf'&&o.animal&&(!o.penaltyGate||o.wolfAwake),walker=o.type==='zombie'&&o.zombieRole==='wanderer'&&o.zombieState==='wandering'&&(o.awake||o.zombieRoamer);
      if(!wolf&&!walker)continue;
      const previous=o.motionFromStamp===clock?{x:o.motionFromX,y:o.motionFromY}:o;
      consumeNearbyPrey(o,previous,wolf?S.wildlife.feedingSeconds:S.predators.mealPauseSeconds,wolf?S.wildlife.captureDistance:S.chasers.captureDistance,contacts);
    }
  }
  const ravagerCache={};
  function ravagerPrey(o,hunter){
    if(o===hunter||o.eaten||o.dead||o.retiring||o.leaving||o.type==='awakened')return false;
    if(ediblePrey(o))return true;
    const kind=enemyKind(o);
    return (kind==='fox'||MONSTER_KINDS.has(kind))&&(o.r>0||o.kind==='fast'||o.kind==='slow'||o.kind==='bear')&&!(kind==='zombie'&&o.zombieState==='spent');
  }
  function ravagerActors(){
    const c=ravagerCache;
    if(c.time!==clock||c.source!==state.objects||c.length!==state.objects.length||c.chasers!==state.chasers||c.chaserLength!==state.chasers.length){
      Object.assign(c,{time:clock,source:state.objects,length:state.objects.length,chasers:state.chasers,chaserLength:state.chasers.length});
      c.actors=state.objects.filter(o=>ravagerPrey(o,null));for(const o of state.chasers)if(ravagerPrey(o,null))c.actors.push(o);
    }
    return c.actors;
  }
  function updateRavagerTarget(hunter){
    const old=hunter.divert,R=S.endless.yetis.ravager;
    if(hunter.ravagerIntroPrey){
      let prey=hunter.ravagerIntroPrey;delete hunter.ravagerIntroPrey;
      if(!state.objects.includes(prey)||!ravagerPrey(prey,hunter)||Math.hypot(prey.x-hunter.x,prey.y-hunter.y)>R.noticeMetres*PX_PER_M*endlessSpeedScale(hunter))prey=spawnRavagerPrey(hunter);
      if(prey){delete prey.ravagerIntroFor;hunter.divert=prey;hunter.ravagerDivertUntil=clock+R.divertSeconds;hunter.avoidUntil=0;hunter.obstacleDetour=null;return;}
    }
    if(clock<(hunter.ravagerPursueUntil||0)){hunter.divert=null;return;}
    if(old){
      const distance=Math.hypot(old.x-hunter.x,old.y-hunter.y);
      if(clock<(hunter.ravagerDivertUntil||0)&&distance<=R.noticeMetres*1.5*PX_PER_M*endlessSpeedScale(hunter)&&ravagerPrey(old,hunter)&&(!humanArea(old.x,old.y)||courseCreature(hunter,old.x,old.y)))return;
      // A hard detour limit, rather than extending the hunt every time it makes progress.
      hunter.divert=hunter.divertOrigin=hunter.obstacleDetour=null;hunter.avoidUntil=0;
      hunter.ravagerPursueUntil=clock+R.pursueSeconds;return;
    }
    if(clock<(hunter.nextDivertCheck||0))return;
    hunter.nextDivertCheck=clock+.5;
    let best=null,distance=R.noticeMetres*PX_PER_M*endlessSpeedScale(hunter);
    for(const o of ravagerActors()){
      if(!ravagerPrey(o,hunter)||Math.abs(o.x-hunter.x)>=distance||Math.abs(o.y-hunter.y)>=distance)continue;
      const d=Math.hypot(o.x-hunter.x,o.y-hunter.y);
      if(d<distance&&(!humanArea(o.x,o.y)||courseCreature(hunter,o.x,o.y))){best=o;distance=d;}
    }
    if(best){hunter.divert=best;hunter.ravagerDivertUntil=clock+R.divertSeconds;hunter.avoidUntil=0;hunter.obstacleDetour=null;}
  }
  function ravagerContact(hunter,previous){
    return contactPrey(hunter,previous,S.chasers.captureDistance,null,ravagerActors(),o=>ravagerPrey(o,hunter));
  }
  function eatRavagerPrey(hunter,meal,previous){
    const hostile=MONSTER_KINDS.has(enemyKind(meal));
    eatChaserPrey(hunter,meal,previous,hostile?1.2:S.predators.mealPauseSeconds);
    hunter.ravagerPursueUntil=(hunter.feedingUntil||clock)+S.endless.yetis.ravager.pursueSeconds;
    if(hostile){meal.eaten=false;meal.dead=true;meal.animal=false;meal.vx=meal.vy=meal.roam=0;meal.motionVx=meal.motionVy=meal.travelSpeed=0;meal.travelStamp=clock;meal.fadeUntil=clock+.6;burst(meal.x,meal.y,'#93a6c7',10);}
  }
  function feedDog(o,previous){
    const p=state.p,D=S.chasers.dogCompanion;
    if(o.type!=='dog'||o.dogFed||o.eaten||o.dead||p.air>0||p.fall||p.awaitingInput||p.speed<S.physics.walkingBumpLimit)return false;
    const distance=segmentDistance(o.x,o.y,previous,p);
    if(distance<=(o.r||10)+S.physics.playerRadius+3||distance>D.feedMetres*PX_PER_M)return false;
    const friend=objectGroups().dogs.find(q=>q!==o&&q.dogCompanion&&!q.eaten&&!q.dead),side=friend?-(friend.dogSide||((friend.id||0)>.5?1:-1)):((o.id||0)>.5?1:-1);
    Object.assign(o,{dogFed:true,dogCompanion:true,dogRetreat:false,dogMood:'follow',dogSide:side,roam:0,vx:0,vy:0,socialUntil:0,visitUntil:0,hopUntil:clock+1.2,arcadeRun:state.course,dogTreatAt:clock,dogTreatFrom:{x:p.x,y:p.y-16},dogReplyAt:clock+1.9});
    delete o.worldChunk;o.socialPartner=null;
    for(const n of state.objects)if(n.socialAnimal===o){n.socialAnimal=null;n.socialUntil=0;}
    say("Here's a snack. Come along!",p,1.8);burst(o.x,o.y,C.gold,5);return true;
  }
  function stopDog(o){o.dogVx=o.dogVy=o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;}
  function dogGoal(o,x,y){
    const pad=(o.r||10)+8,grid=cachedSolidGrid(houseSolids,HOUSE_TYPES,HOUSE_CELL,HOUSE_REACH).grid;
    // Shift the destination out of building feet rather than orbit an unreachable spot.
    for(let pass=0;pass<2;pass++)for(const h of grid.get(Math.floor(x/HOUSE_CELL))?.get(Math.floor(y/HOUSE_CELL))||[]){
      const b=h.solidBounds;if(x<=b[0]-pad||x>=b[2]+pad||y<=b[1]-pad||y>=b[3]+pad)continue;
      const gaps=[x-b[0]+pad,b[2]+pad-x,y-b[1]+pad,b[3]+pad-y],side=gaps.indexOf(Math.min(...gaps));
      if(side===0)x=b[0]-pad;else if(side===1)x=b[2]+pad;else if(side===2)y=b[1]-pad;else y=b[3]+pad;
    }
    return {x,y};
  }
  function moveDog(o,target,maxSpeed,dt,leader=null){
    const D=S.chasers.dogCompanion,dx=target.x-o.x,dy=target.y-o.y,d=Math.hypot(dx,dy),scale=endlessSpeedScale(o);
    if(!leader&&d<2){stopDog(o);return;}
    let vx=dx*3.5,vy=dy*3.5,n=Math.hypot(vx,vy),correction=leader?D.catchUpSpeedKmh/S.physics.hudKmhPerSpeed*scale:maxSpeed;
    if(n>correction){vx*=correction/n;vy*=correction/n;}
    vx+=leader?.vx||0;vy+=leader?.vy||0;n=Math.hypot(vx,vy);
    if(n>maxSpeed){vx*=maxSpeed/n;vy*=maxSpeed/n;}
    o.dogVx=ease(o.dogVx??o.motionVx??0,vx,8,dt);o.dogVy=ease(o.dogVy??o.motionVy??0,vy,8,dt);
    const speed=Math.hypot(o.dogVx,o.dogVy),limited=leader?speed:Math.min(speed,d/dt);
    if(limited<.5){stopDog(o);return;}
    travel(o,Math.atan2(o.dogVy/cemeteryYScale(o.x,o.y),o.dogVx),limited,dt,false,false,true,false,target,true,false,true);
    o.dogVx=o.motionVx;o.dogVy=o.motionVy;
  }
  function leaveDog(o){
    Object.assign(o,{dogCompanion:false,dogRetreat:true,leaving:true,dogMood:'flee',retreatUntil:clock+S.chasers.dogCompanion.retreatSeconds,retreatAngle:Math.atan2(-.35,o.x>=state.p.x?1:-1)});
    delete o.dogChallengeTarget;delete o.dogChallengeUntil;delete o.dogReplyAt;
  }
  function dogThreat(o){
    const p=state.p,D=S.chasers.dogCompanion;let threat=null,gap=D.scareMetres*PX_PER_M*endlessSpeedScale(o);
    for(const c of state.chasers){
      if(!['fast','slow'].includes(c.kind)||c.dead||c.eaten||c.leaving||c.waiting||c.wakeUntil>clock||c.stunnedUntil>clock||c.feedingUntil>clock||c.scaredUntil>clock)continue;
      const d=Math.hypot(c.x-p.x,c.y-p.y),toDog=Math.hypot(c.x-o.x,c.y-o.y);
      if(c.divert&&c.divert!==o&&d>S.chasers.captureDistance*3)continue;
      const approaching=(p.x-c.x)*(c.motionVx||0)+(p.y-c.y)*(c.motionVy||0)>0||c.y<=p.y;
      if(approaching&&d<gap&&toDog<D.barkMetres*PX_PER_M*endlessSpeedScale(o)){gap=d;threat=c;}
    }
    return threat;
  }
  function challengeYeti(o,c){
    const D=S.chasers.dogCompanion;
    c.scaredUntil=clock+D.scareSeconds;c.dogFearOrigin={x:o.x,y:o.y};c.divert=c.divertOrigin=null;c.obstacleDetour=null;c.avoidUntil=0;c.nextDivertCheck=c.scaredUntil;
    c.motionVx=c.motionVy=c.travelSpeed=0;c.travelStamp=clock;
    Object.assign(o,{dogGuardSpent:true,dogMood:'challenge',dogChallengeTarget:c,dogChallengeUntil:clock+D.challengeSeconds,barkAt:clock});
    delete o.dogReplyAt;o.avoidUntil=0;o.obstacleDetour=null;
    say('WOOF! WOOF!',o,1.25);burst(o.x,o.y,C.gold,8);beep(210,.08,'square');
  }
  function updateDogCompanions(dt,previous){
    const p=state.p,D=S.chasers.dogCompanion,dogs=objectGroups().dogs,playerSpeed=Math.hypot(p.vx,p.vy);
    let following=0;for(const o of dogs)if(o.dogCompanion&&!o.dead&&!o.eaten)following++;
    for(const o of dogs){
      if(o.eaten||o.dead)continue;
      if(!o.dogCompanion&&!o.dogRetreat&&following<D.maxFollowing&&feedDog(o,previous))following++;
      if(!o.dogCompanion&&!o.dogRetreat)continue;
      if(o.dogReplyAt!==undefined&&clock>=o.dogReplyAt){say('WOOF!',o,2.2);delete o.dogReplyAt;}
      const scale=endlessSpeedScale(o),cruise=D.cruiseSpeedKmh/S.physics.hudKmhPerSpeed*scale;
      if(o.dogRetreat){
        moveDog(o,{x:o.x+Math.cos(o.retreatAngle)*100,y:o.y+Math.sin(o.retreatAngle)*100},cruise*1.5,dt);
        if(clock>=o.retreatUntil){o.eaten=true;o.r=0;}continue;
      }
      if(o.dogChallengeTarget){
        const c=o.dogChallengeTarget;
        if(clock>=o.dogChallengeUntil||c.dead||c.eaten||c.leaving){leaveDog(o);continue;}
        const dx=c.x-o.x,dy=c.y-o.y,d=Math.hypot(dx,dy)||1,goal=dogGoal(o,c.x-dx/d*34,c.y-dy/d*34);
        o.dogMood='challenge';moveDog(o,goal,D.challengeSpeedKmh/S.physics.hudKmhPerSpeed*scale,dt,{vx:c.motionVx||0,vy:c.motionVy||0});continue;
      }
      const threat=!o.dogGuardSpent&&dogThreat(o);
      if(threat){challengeYeti(o,threat);continue;}
      const down=p.fall>0||p.awaitingInput&&!!p.crashObstacle;
      if(down){
        if(!o.dogConcerned){o.dogConcerned=true;delete o.dogReplyAt;say('Whine...',o,1.2);o.avoidUntil=0;o.obstacleDetour=null;}
        const side=o.dogSide||((o.id||0)>.5?1:-1),goal=dogGoal(o,p.x+side*20,p.y+8),d=Math.hypot(goal.x-o.x,goal.y-o.y);
        if(d>8){o.dogMood='comfort';moveDog(o,goal,cruise*1.4,dt);}
        else{o.dogMood='lick';stopDog(o);if(clock>=(o.nextLickSound||0)){say('Slurp!',o,1.2);o.nextLickSound=clock+4;}}continue;
      }
      o.dogConcerned=false;
      if(playerSpeed>cruise*.65){
        const heading=Math.atan2(p.vy,p.vx),old=o.dogHeading??heading,delta=Math.atan2(Math.sin(heading-old),Math.cos(heading-old));o.dogHeading=old+delta*(1-Math.exp(-10*dt));
        const dx=Math.cos(o.dogHeading),dy=Math.sin(o.dogHeading),side=o.dogSide||((o.id||0)>.5?1:-1),distance=D.followDistanceMetres*PX_PER_M+(side>0?8:0);
        const goal=dogGoal(o,p.x-dx*distance-dy*side*12,p.y-dy*distance+dx*side*12);
        o.dogMood='follow';o.dogPlayGoal=null;
        moveDog(o,goal,playerSpeed+D.catchUpSpeedKmh/S.physics.hudKmhPerSpeed*scale,dt,{vx:p.vx,vy:p.vy});
      }else{
        if(!o.dogPlayGoal||clock>=(o.dogPlayUntil||0)||Math.hypot(o.dogPlayGoal.x-p.x,o.dogPlayGoal.y-p.y)>D.playRadiusMetres*PX_PER_M*1.5){
          const angle=range(0,TAU),radius=range(.35,1)*D.playRadiusMetres*PX_PER_M;
          o.dogPlayGoal=dogGoal(o,p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius);o.dogPlayUntil=clock+range(2,3.5);o.dogSniffUntil=0;
          if(clock>(o.nextDogHop||0)){o.hopUntil=clock+1.2;o.nextDogHop=clock+range(6,10);}
        }
        const d=Math.hypot(o.dogPlayGoal.x-o.x,o.dogPlayGoal.y-o.y);
        if(d<6||o.dogSniffUntil>clock){o.dogMood='sniff';stopDog(o);if(!o.dogSniffUntil)o.dogSniffUntil=clock+range(.6,1.2);}
        else{o.dogMood='play';moveDog(o,o.dogPlayGoal,cruise,dt);}
      }
    }
  }
  function patchAt(x,y){return freshIceCache().find(o=>lakeContains(o,x,y));}
  function ruggedAt(x,y){return state.objects.find(o=>o.type==='rugged'&&lakeContains(o,x,y));}
  function clearSnowRoadTrees(road){
    if(!road?.points?.length||road.surface!=='snow')return;
    state.objects=state.objects.filter(o=>{
      if(!GRIT_TREES.has(o.type))return true;
      const margin=road.width/2+Math.max(o.r||0,(o.width||40)*.32)+18;
      return roadDistance(road,o.x,o.y)>=margin&&roadDistance(road,o.x,o.y-(o.width||40)*.4)>=margin;
    });
  }
  function roadBBox(r){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of r.points){if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;}return r.bounds={left:x0-r.width,right:x1+r.width,top:y0-r.width,bottom:y1+r.width};}
  function onRoad(x,y){
    // Only exposed paving slows skis. A snow-covered main road wins at intersections.
    const roads=state.roads.filter(r=>{const b=r.bounds||roadBBox(r);return x>b.left&&x<b.right&&y>b.top&&y<b.bottom&&roadDistance(r,x,y)<r.width/2;});
    return !roads.some(r=>r.surface==='snow')&&roads.some(r=>r.surface!=='snow');
  }
  function populateEndlessFlanks(chunk,key){
    if(!state.endless)return;
    const size=S.world.chunkSize,x0=chunk.tx*size,x1=x0+size,y0=chunk.ty*size,y1=y0+size,root=state.course;
    for(const e of state.endless.encounters){
      const center=e.centerX??root.x;
      if(!WIDE_REGIONS.has(e.kind)||['crowd','beginner','cemetery'].includes(e.kind)||y1<=e.startY||y0>=e.endY||x1<center-e.band||x0>center+e.band||chunk.themes?.has(e.id))continue;
      (chunk.themes??=new Set()).add(e.id);
      let flankSeed=(Math.imul(e.id,73856093)^Math.imul(chunk.tx,19349663)^Math.imul(chunk.ty,83492791))>>>0;
      const random=()=>{flankSeed=(Math.imul(flankSeed,1664525)+1013904223)>>>0;return flankSeed/4294967296;},range=(a,b)=>mix(a,b,random()),pick=items=>items[Math.floor(random()*items.length)];
      const own={arcadeRun:root,encounter:e,worldChunk:key,regionFlank:true},scale=e.scale;
      const clear=(x,y,hw=0,hh=0)=>{
        if(nearLakeExitSpring(x,y,Math.max(hw,hh)+45))return false;
        if(y-hh<e.startY+220*scale||y+hh>e.endY-220*scale||Math.abs(x-center)+hw>e.band-60)return false;
        if(e.town)return Math.abs(x-center)-hw>e.coreBand+60;
        if(e.kind==='trees')return encounterClearance(e,x,y,hw,hh)>mix(140,210,e.difficulty)*scale+80;
        return Math.abs(x-center)-hw>(e.kind==='denseForest'?e.coreBand*.65:e.half)+90;
      };
      const grid=(spacing,fn,rowSpacing=spacing)=>{for(let row=Math.ceil((y0-e.startY)/rowSpacing);;row++){const y=e.startY+row*rowSpacing;if(y>=y1)break;for(let col=Math.ceil((x0-center)/spacing);;col++){const x=center+col*spacing;if(x>=x1)break;fn(x,y,row,col);}}};
      if(e.town){
        grid(310,(x,y,row,col)=>{
          const xx=x+range(-75,75),yy=y+range(-24,24);if(!clear(xx,yy,115,110))return;
          const width=range(...S.village.houseWidth),town=e.town;
          entity((row+col)%3?'lodge':'rental',xx,yy,{...own,town,width,r:width*S.village.houseFootWidthRatio,houseStyle:Math.abs(col)%4,buildingKind:(row+col)%4?'chalet':'inn',cozyStyle:Math.abs(row)%3});
          if((row+col)%3===0)entity('snowman',xx+95,yy+60,{...own,town,width:28,r:9});
        },S.village.rowSpacing);
      }else{
        const scatter=e.kind==='scramble',dense=e.kind==='denseForest',density=Math.sqrt(mix(...S.endless.regions[dense?'denseForestDensity':'scrambleDensity'],e.difficulty)),spacing=(scatter?125:dense?115:140)/density;
        grid(spacing,(x,y,row,col)=>{
          const xx=x+range(-18,18),yy=y+range(-18,18);if(!clear(xx,yy,35,35))return;
          if(scatter){const key=pick(['pine','fir','smallPine','spruceTree','rock','stump','bush','sled','mogul','smallHill']);const o=createArcadeItem(key,xx,yy,root);Object.assign(o,own);}
          else entity((row+col)%3?'pine':'fir',xx,yy,{...own,width:range(64,86),r:20});
        });
      }
    }
  }
  function ensureWorld(initial=false){
    const b=viewBounds(),size=S.world.chunkSize;
    for(let tx=Math.floor((b.left-S.world.chunkMarginX)/size);tx<=Math.floor((b.right+S.world.chunkMarginX)/size);tx++)for(let ty=Math.floor((b.top-S.world.chunkMarginAbove)/size);ty<=Math.floor((b.bottom+S.world.chunkMarginBelow)/size);ty++){
      const key=tx+','+ty;if(state.chunks.has(key)){populateEndlessFlanks(state.chunks.get(key),key);continue;}state.chunks.set(key,{tx,ty});
      for(let i=0;i<(ty<0?S.world.uphillCount:S.world.ambientCount);i++){
        const x=tx*size+range(65,size-65),y=ty*size+range(80,size-60);
        // Arcade owns all in-course scenery; ambient chunks only populate the surrounding forest.
        const encounter=endlessEncounterAt(y),forest=encounter?.kind==='trees';
        const forestBank=forest&&(Math.min(y-encounter.startY,encounter.endY-y)<240*encounter.scale&&Math.abs(x-state.course.x)<encounter.band+60||encounter.paths.some(path=>Math.abs(x-encounterPathX(path,y))<encounter.half+mix(140,210,encounter.difficulty)*encounter.scale+80));
        const forestOutside=encounter?.kind==='quiet'?Math.abs(x-encounterPathX(encounter.paths[0],y))>410:forest&&!forestBank||encounter&&encounter.kind!=='trees'&&!encounter.town&&Math.abs(x-(encounter.centerX??state.course.x))>encounter.band+60;
        if(encounter&&!forestOutside)continue;
        if(state.safeTrails.some(r=>!(forestOutside&&r===state.course)&&r.arcade&&y>r.startY-120&&y<r.endY+60&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth+100))continue;
        if(nearArcadeFeature(x,y)||nearMushroom(x,y)||patchAt(x,y)||insideTown(x,y)||state.villages.some(t=>roadDistance(t.approachRoad,x,y)<t.approachRoad.width/2+60)||(!state.course&&state.zone.kind==='start'&&Math.abs(x)<S.world.meadowHalfWidth&&y>S.world.meadowTop&&y<S.world.meadowBottom))continue;
        if(state.objects.some(o=>(o.type==='gate'||o.type==='entrance')&&Math.abs(o.x-x)<o.half+60&&Math.abs(o.y-y)<140))continue;
        const type=forestOutside?pick(['pine','pine','pine','fir','fir','bush','rock','rabbit']):ambientType(x,y);
        if(MONSTER_KINDS.has(type)&&(state.endless||humanArea(x,y)))continue;
        if(type==='wolf'){if(!spawnWolfPack(x,y,{worldChunk:key}).length)entity('fir',x,y,{width:65,r:16,worldChunk:key});continue;}
        const fast=type==='skier'&&random()<(state.course?.arcade?.fastChance??S.skiers.ambientFastChance);
        const widths={pine:range(60,90),fir:range(52,74),rock:44,pebble:28,skier:42,personGreen:30,rabbit:20,fox:39,wolf:43,bear:60,cat:25,lurker:55,bush:35};
        entity(type,x,y,{worldChunk:key,fast,width:widths[type],r:['lurker','bear'].includes(type)?18:type==='rabbit'?5:12,animal:['rabbit','fox','wolf','bear','cat'].includes(type),humanVisitor:humanArea(x,y)||random()<S.world.animalVisitorChance,ai:'idle',nextAI:clock+range(1,5),climb:0,vy:type==='skier'?(fast?range(...S.skiers.fastSpeed):range(...S.skiers.slowSpeed)):0});
      }
      populateEndlessFlanks(state.chunks.get(key),key);
      if(random()<S.world.lakeChance){const x=(tx+.5)*size,y=(ty+.5)*size;if(!endlessEncounterAt(y)&&!insideTown(x,y)&&!safeApproach(x,y)&&!classicArea(x,y,360)&&!state.safeTrails.some(r=>r.arcade&&y>r.startY-360&&y<r.endY+360&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth+360)&&y>S.world.lakeMinY&&!state.objects.some(o=>o.type==='gate'&&Math.hypot(o.x-x,o.y-y)<260||o.collectible&&Math.hypot(o.x-x,o.y-y)<360))entity('ice',x,y,{worldChunk:key,rx:range(...S.world.lakeRadiusX),ry:range(...S.world.lakeRadiusY),width:330,r:0});}
    }
    for(const [key,t] of state.chunks)if(Math.abs(t.ty*size-state.p.y) >S.world.chunkRetention||Math.abs(t.tx*size-state.p.x) >S.world.chunkRetention){state.chunks.delete(key);state.objects=state.objects.filter(o=>o.worldChunk!==key);}
    // Only keep streamed flank props near the generation window; authored routes stay intact.
    const expired=new Set();
    for(const [key,chunk] of state.chunks)if(chunk.themes?.size&&(chunk.tx*size+size<b.left-S.world.chunkMarginX-size||chunk.tx*size>b.right+S.world.chunkMarginX+size||chunk.ty*size+size<b.top-S.world.chunkMarginAbove-size||chunk.ty*size>b.bottom+S.world.chunkMarginBelow+size)){expired.add(key);chunk.themes.clear();}
    if(expired.size)state.objects=state.objects.filter(o=>!o.regionFlank||!o.worldChunk||!expired.has(o.worldChunk));
    removeInactiveEnemies();
  }

  function spawnTerrain() {
    const run=state.course;if(!run)return;
    const s=stages[run.id],limit=Math.min(run.endY-100,viewBounds().bottom+680);
    if(run.arcade)return;
    while(state.generated<limit){
      const y=state.generated,center=centerAt(y),nearGate=state.objects.find(o=>o.type==='gate'&&Math.abs(o.y-y)<135);
      const amount=random()<s.density*S.world.terrainDensityChance?2:1;
      for(let i=0;i<amount;i++){
        let x=center+range(-S.world.terrainOffsetX,S.world.terrainOffsetX);if(nearGate&&Math.abs(x-nearGate.x)<nearGate.half+40)x=nearGate.x+(x<nearGate.x?-1:1)*range(145,270);
        if(nearArcadeFeature(x,y)||patchAt(x,y)||nearMushroom(x,y,S.mushroomHunt.obstacleClearance+35))continue;
        const kinds=s.kind==='slalom'?S.spawnTables.classic:s.kind==='mushroom'?S.spawnTables.mushroom:s.kind==='forest'?S.spawnTables.forest:S.spawnTables.mixed;
        const type=pick(kinds),fast=type==='skier'&&random()<S.skiers.courseFastChance,sizes={personGreen:30,personYellow:30,pine:range(63,93),fir:range(49,70),rock:47,dog:34,skier:42,boarder:43,mushroom:37,ramp:61,mogul:40,sled:45,cat:25,rainbow:130,bush:35};
        if(GRIT_TREES.has(type)&&state.roads.some(r=>r.surface==='snow'&&roadDistance(r,x,y)<r.width/2+Math.max(20,(sizes[type]||70)*.32)+48))continue;
        entity(type,x,y+range(-30,30),{fast,width:sizes[type],r:type==='pine'?18:type==='ramp'||type==='rainbow'?25:13,animal:type==='cat',ai:'idle',climb:0,nextAI:clock+3,vx:type==='dog'?range(-15,15):0,vy:type==='skier'?(fast?range(...S.skiers.fastSpeed):range(...S.skiers.slowSpeed)):type==='boarder'?range(...S.skiers.boarderSpeed):0});
      }
      if(s.kind==='freestyle'&&Math.floor(y/180)%2===0)entity('ramp',center+range(-105,105),y+55,{width:100,r:24});
      state.generated+=range(...S.world.terrainSpacing)/Math.max(.8,s.density);
    }
  }

  function inputVector() {
    const k=state.input;let x=0,y=0,held=false;
    if(k.tap?.until>clock){held=true;x=k.tap.key==='left'?-1:k.tap.key==='right'?1:0;y=k.tap.key==='down'?1:0;}else if(k.tap)delete k.tap;
    if(k.pointer?.direction){held=true;x=k.pointer.direction==='right'?1:k.pointer.direction==='left'?-1:0;y=k.pointer.direction==='down'?1:k.pointer.direction==='up'?-1:0;}
    if(k.left||k.right||k.up||k.down){held=true;x=(k.right?1:0)-(k.left?1:0);y=(k.down?1:0)-(k.up?1:0);}
    return {x,y,held};
  }
  function showSceneCard(key,title,detail,after='resume'){
    if(state.sceneCard)return false;
    activePointers.clear();state.sceneCard={key,title,detail,after,night:isNight(),minimumRemaining:3,shown:false};window.FrostlineApp?.playing(true);
    canvas.setAttribute('role','button');canvas.setAttribute('aria-label',title+'. '+detail);canvas.focus({preventScroll:true});
    state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    return true;
  }
  function clearSceneCard(){
    state.sceneCard=null;canvas.removeAttribute('role');canvas.setAttribute('aria-label',skiingLabel);
  }
  function dismissSceneCard(){
    const card=state.sceneCard;if(!card||card.minimumRemaining>1e-8)return;
    clearSceneCard();
    state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    if(card.after==='summit')resetSummit();
    canvas.focus({preventScroll:true});render();
  }
  function deathScene(cause,attacker){
    if(cause!=='YETI')return {key:'death-'+cause.toLowerCase(),title:{WOLF:'PACKED LUNCH',BEAR:'BEAR-LY A SNACK',ZOMBIE:'DEAD TIRED'}[cause],detail:{WOLF:'The pack insists you were complimentary.',BEAR:'The beanie was apparently the cherry on top.',ZOMBIE:'They came for the boots. Stayed for lunch.'}[cause]};
    const hunter=attacker||state.chasers.find(c=>!c.dead&&['fast','slow'].includes(c.kind))||{},look=yetiAppearance(hunter);
    const variant=look.family==='Stiltwalker'?'stiltwalker':look.family==='White'?'white':look.family==='Avalanche'?'avalanche':look.rank>=3?'burgundy':'violet';
    return {key:'death-yeti-'+variant,title:'AN ABOMINABLE SNACK',detail:'Your skis made excellent chopsticks.'};
  }
  function tryCocoaShop(o){
    const p=state.p;if(!o.cocoaShop||o.town.cocoaClaimed||p.air>0||p.fall>0||p.awaitingInput||state.deathTimer)return false;
    if(Math.hypot(p.x-o.x,p.y-(o.y+52))>38)return false;
    o.town.cocoaClaimed=true;
    const gear=state.arcade||state.endless;
    if(gear&&gear.shields<S.arcade.gear.maxShields)gear.shields++;
    else state.cocoaShields++;
    save();beep(660,.12,'triangle');
    return showSceneCard('cocoa','HOT CHOCOLATE BREAK','Warm hands. One extra shield.');
  }
  function startMoving() {
    const p=state.p;if(state.sceneCard||state.deathTimer||state.liftTimer||p.fall>0)return false;
    p.releasing=false;window.FrostlineApp?.playing(true);
    if(p.awaitingInput){p.awaitingInput=false;p.onIce=false;p.icePushPending=!!patchAt(p.x,p.y);p.shield=S.physics.resumeShieldSeconds;p.desiredHeading=0;p.mode='slide';state.keyboardStep=0;}
    if(!state.started){state.started=true;state.activeTime=0;}state.soundReady=true;return true;
  }
  function crash(obstacle=null,duration=S.physics.crashSeconds,animal=false){
    const p=state.p;if(p.awaitingInput)return;
    if(!animal&&useObstacleShield(obstacle))return false;
    if(state.course)state.course.hits++;
    // Obstacle contacts are already suppressed while down. A fall does not protect against predators.
    p.awaitingInput=true;p.crashObstacle=obstacle;p.fall=duration;p.shield=0;
    p.speed=p.vx=p.vy=0;p.air=p.airTotal=0;p.landingSteer=null;p.mode='still';state.lastTrack=null;
    state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    state.screenShake=.2;burst(p.x,p.y,'#b9d2d8',15);beep(140,.12,'triangle');return true;
  }
  function launch(duration=S.jump.baseSeconds,multCap=S.jump.durationMax) {
    const p=state.p;if(p.fall||p.air||p.jumpLock>0)return;
    const downhill=Math.cos(p.heading)>S.physics.downhillCosMinimum;
    const normal=downhill?topSpeed():p.mode==='walk'?S.physics.walkSpeed:p.mode==='traverse'?S.physics.traverseSpeed:topSpeed()*S.physics.acrossSpeedFraction;
    const base=p.speed>0?Math.max(p.speed,normal):0;
    const multiplier=Math.min(multCap,clamp(S.jump.durationBase+base/S.jump.durationSpeedDivisor,S.jump.durationMin,S.jump.durationMax));
    p.air=p.airTotal=duration*multiplier;p.jumpHeight=clamp(S.jump.heightBase+base*S.jump.heightPerSpeed,S.jump.heightMin,S.jump.heightMax)*duration;
    // Downhill jumps always beat the normal speed cap, including takeoffs from rough snow.
    // Carry an already faster flight without multiplying its speed again on every jump.
    p.airPose=0;p.airTuck=0;p.onRugged=false;p.airHeading=p.heading;p.airSpeed=p.speed>0?Math.max(p.speed,normal*S.jump.speedBoost):0;p.airSpin=Math.abs(Math.sin(p.heading))*S.jump.spinRate;p.onIce=false;
    p.speed=p.airSpeed;p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed*cemeteryYScale(p.x,p.y);
    p.spin=0;p.jumpLock=p.airTotal+S.jump.cooldownSeconds;burst(p.x,p.y,C.ice,7);beep(520,.1);
  }

  function monsterContact(o){
    const p=state.p;if(o.type==='zombie'&&(['hidden','emerging'].includes(o.zombieState)||o.zombieState==='leaping'&&(o.leapProgress||0)<.82))return false;if(p.air>0||o.dead||o.eaten||o.retiring||o.leaving)return false;
    const body=o.r>0,radius=body?o.r+S.physics.playerRadius:S.chasers.captureDistance,ys=body?S.physics.collisionYScale:1;
    const dx=p.x-o.x,dy=(p.y-o.y)*ys;
    if(dx*dx+dy*dy<radius*radius)return true;
    const m=p.impactMotion;if(m?.stamp!==clock||m.air>0)return false;
    const moved=o.motionFromStamp===clock,sx=m.x-(moved?o.motionFromX:o.x),sy=(m.y-(moved?o.motionFromY:o.y))*ys;
    if(sx>radius&&dx>radius||sx< -radius&&dx< -radius||sy>radius&&dy>radius||sy< -radius&&dy< -radius)return false;
    // Relative swept contact catches fast ice/glancing hits between simulation samples.
    return obstacleSegmentDistance(0,0,sx,sy,dx,dy)<radius;
  }
  function canRamMonster(o,kind=o.type||o.kind){
    const p=state.p,m=p.impactMotion?.stamp===clock?p.impactMotion:p;
    if(!MONSTER_KINDS.has(kind)||o.dead||o.eaten||p.air>0||m.fall||m.awaitingInput)return false;
    if(!monsterContact(o))return false;
    const from=o.motionFromStamp===clock?{x:o.motionFromX,y:o.motionFromY}:o;
    const dx=from.x-m.x,dy=from.y-m.y,length=Math.hypot(dx,dy);
    if(length<.001)return false;
    const nx=dx/length,ny=dy/length,toward=m.vx*nx+m.vy*ny;
    const downhill=Math.max(0,Math.cos(m.heading??p.heading));
    let cap=topSpeed()*(S.physics.acrossSpeedFraction+S.physics.downhillSpeedFraction*downhill*downhill)*S.physics.hudKmhPerSpeed;
    if((m.mode??p.mode)==='traverse'&&!(m.onIce??p.onIce))cap=Math.min(cap,S.physics.traverseSpeed*S.physics.hudKmhPerSpeed);
    // One reachable full-speed rule; old species gates could require 100% of an unreachable cap.
    cap*=Math.hypot(Math.sin(m.heading??p.heading),Math.cos(m.heading??p.heading)*cemeteryYScale(m.x,m.y));
    const required=cap*S.wildlife.ramSpeedFraction;
    if(Math.hypot(m.vx,m.vy)*S.physics.hudKmhPerSpeed+1e-7<required)return false;
    const [vx,vy]=objectVelocity(o),closing=(m.vx-vx)*nx+(m.vy-vy)*ny;
    // Use the real impact, not perfect centre aim or the speed after another collision.
    return toward*S.physics.hudKmhPerSpeed>S.physics.minimumCollisionKmh&&closing*S.physics.hudKmhPerSpeed>S.physics.minimumCollisionKmh;
  }
  function enemyKind(o){return o.kind||o.type;}
  function resolveEnemyContact(o,{passive=o.waiting||o.wakeUntil>clock||o.stunnedUntil>clock||o.type==='lurker'||o.type==='bear'||o.type==='wolf'&&!(o.wolfAwake||o.alertUntil>clock||o.linkedChase),ramOnly=false}={}){
    const kind=enemyKind(o),monster=MONSTER_KINDS.has(kind),p=state.p,A=S.wildlife;
    if(!monster||state.deathTimer||!monsterContact(o))return false;
    if(canRamMonster(o,kind)){
      // A physical ram defeats the creature AND causes the normal skier crash.
      // This is not a sword/shield save: neither inventory nor immunity cancels the fall.
      o.dead=true;o.animal=false;o.running=false;o.r=0;o.vx=o.vy=o.roam=0;
      o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
      o.fadeUntil=clock+(kind==='wolf'?A.wolfFadeSeconds:A.predatorFadeSeconds);
      crash(o,S.physics.crashSeconds,true);
      burst(o.x,o.y,kind==='wolf'?C.ice:C.gold,kind==='wolf'?18:12);
      say(kind==='wolf'?'WOLF DOWN!':kind==='bear'?'BEAR DOWN!':kind==='zombie'?'ZOMBIE DOWN!':'YETI DOWN!',o);
      if(kind==='wolf')thankWolfRescue(o);
      return true;
    }
    if(ramOnly)return false;
    if(p.shield>0)return true;
    if(passive){
      if(kind==='wolf'){o.wolfAwake=true;o.angle=Math.atan2(o.y-p.y,o.x-p.x);o.nextAI=clock+2;o.running=true;}
      if(!p.awaitingInput&&!p.slowContacts.has(o)&&!tooSlowForObstacle(o))crash(o);
      return true;
    }
    if(useArcadeSword(o))return true;
    if(state.course&&!p.awaitingInput)state.course.hits++;
    if(kind==='zombie'&&o.zombieState&&o.zombieRole!=='wanderer'){
      if(o===p.crashObstacle||o.zombieState==='rising'&&(p.awaitingInput||p.fall))return true;
      if(!p.awaitingInput&&!p.fall){if(!tooSlowForObstacle(o)||o.zombieState==='leaping')crash(o);return true;}
    }
    if(kind==='zombie')o.feedingUntil=clock+3;
    burst(p.x,p.y,C.ice,12);
    die(kind==='wolf'?'WOLF':kind==='bear'?'BEAR':kind==='zombie'?'ZOMBIE':'YETI',o);
    return true;
  }
  function objectVelocity(o){
    if(o.type==='rollingSnowball'&&o.rollState==='rolling')return [o.vx,o.vy];
    if(o.type==='fallingTree'&&o.fallState==='falling')return [Math.cos(o.fallAngle)*o.treeLength/S.terrainFeatures.fallingTree.fallSeconds,Math.sin(o.fallAngle)*o.treeLength/S.terrainFeatures.fallingTree.fallSeconds];
    if(o.travelStamp!==undefined&&clock-o.travelStamp<=S.simulation.stepSeconds*1.5)return [o.motionVx??Math.cos(o.angle)*(o.travelSpeed||0),o.motionVy??Math.sin(o.angle)*(o.travelSpeed||0)];
    return [0,0];
  }
  function tooSlowToCrash(o){
    const p=state.p;let dx=p.vx||0,dy=p.vy||0;
    if(o){const v=objectVelocity(o);dx-=v[0];dy-=v[1];}
    return Math.hypot(dx,dy)*S.physics.hudKmhPerSpeed<=S.physics.minimumCollisionKmh;
  }
  // Obstacles (trees, skiers, boarders, dogs, villagers): gentle only when BOTH sides
  // are slow in absolute terms. A fast skier cruising behind a same-speed boarder
  // must still crash - matched closing speed is not a free pass for solid objects.
  // Chasers keep the closing-speed rule above (outrunning them is escaping).
  function tooSlowForObstacle(o){
    const p=state.p;
    if(Math.hypot(p.vx||0,p.vy||0)*S.physics.hudKmhPerSpeed>S.physics.minimumCollisionKmh)return false;
    if(!o)return true;
    const v=objectVelocity(o);
    return Math.hypot(v[0],v[1])*S.physics.hudKmhPerSpeed<=S.physics.minimumCollisionKmh;
  }
  function hit(o) {
    if(o.dogCompanion||o.dogRetreat)return;
    if(o.mischief||o.type==='snowman'){if(!state.p.fall&&state.p.air<=0)touchVillageProp(o);return;}
    if(o.collectible){collectMushroom(o);return;}
    const p=state.p;if(o.dead||o.stunnedUntil>clock&&!['wolf','bear','lurker','zombie'].includes(o.type))return;
    if(p.air>0&&['wideLog','fallingTree','rollingSnowball'].includes(o.type))return;
    if(o.type==='logBump'){
      if(p.awaitingInput||p.fall||p.air>0||p.vy<=S.physics.walkingBumpLimit)return;
      launch(S.terrainFeatures.logJump.jumpSeconds);
      if(p.air>0){
        const distance=o.log.y-p.y+o.log.r+S.physics.playerRadius+8,downhill=Math.cos(p.airHeading)*p.airSpeed;
        if(downhill>0){p.air=p.airTotal=Math.max(p.air,distance/downhill+.08);p.jumpLock=p.airTotal+S.jump.cooldownSeconds;}
      }
      return;
    }
    // Recovery protection does not suppress helpful jump surfaces.
    if(o.type==='spring'||o.type==='ramp'||o.type==='mogul'||o.type==='mushroom'||o.type==='rainbow'||o.type==='smallHill'||o.type==='largeHill'){
      if(p.awaitingInput||p.fall||p.air>0||p.jumpLock>0||o.touched)return;
      if(tooSlowForObstacle(o))p.slowContacts.add(o);
      if(p.slowContacts.has(o)||!p.onIce&&p.speed<=S.physics.walkingBumpLimit&&(p.mode==='traverse'||p.mode==='walk'))return;
      o.touched=true;if(o.type==='spring')o.springAt=clock;
      launch(o.jumpSeconds??(o.type==='spring'?S.endless.regions.lakeExitSprings.jumpSeconds:o.arcadeFeature&&['ramp','mogul'].includes(o.type)?S.arcade.rampSeconds:o.type==='rainbow'?S.jump.rainbowSeconds:o.type==='mushroom'?S.jump.mushroomSeconds:o.type==='smallHill'?S.jump.smallHillSeconds:o.type==='largeHill'?S.jump.largeHillSeconds:o.type==='ramp'?S.jump.rampSeconds:S.jump.mogulSeconds),o.jumpDurationCap??(o.type==='spring'?S.endless.regions.lakeExitSprings.durationCap:o.type==='smallHill'||o.type==='largeHill'?S.jump.hillDurationMax:S.jump.durationMax));
      if(o.landingY!==undefined&&p.air>0){
        const downhill=Math.cos(p.airHeading)*p.airSpeed;
        if(downhill>0){p.air=p.airTotal=Math.min(p.air,Math.max(.12,(o.landingY-p.y)/downhill));p.jumpLock=p.airTotal+S.jump.cooldownSeconds;}
      }
      if(o.type==='spring'&&p.air>0){p.jumpHeight=Math.min(p.jumpHeight,Math.max(80,(H*S.render.playerScreenY-90)/ZOOM));say('BOING!',p,1.2);}
      if(o.type==='rainbow'){p.rainbow=S.jump.rainbowTrailSeconds;p.boost=S.jump.rainbowBoostSeconds;announce('SOMEWHERE OVER THE RAINBOW','A spectacularly impractical shortcut.',C.blue,2.5);}
      if(o.type==='mushroom'){p.boost=S.jump.mushroomBoostSeconds;say('BOING. Bad decisions, good airtime.',o,2.1);}
      return;
    }
    // Remember slow overlaps during recovery too, until the player moves fully clear.
    if(tooSlowForObstacle(o))p.slowContacts.add(o);
    if(['wolf','bear','lurker','zombie'].includes(o.type)){resolveEnemyContact(o);return;}
    if(o.solidWall){
      const before=p.walkOrigin??p,[ax,ay,bx,by]=obstacleSegment(o),dx=bx-ax,dy=by-ay,length2=dx*dx+dy*dy||1;
      const t=clamp(((p.x-ax)*dx+(p.y-ay)*dy)/length2,0,1),x=ax+t*dx,y=ay+t*dy;
      const side=Math.sign((before.x-ax)*-dy+(before.y-ay)*dx)||-1;
      let nx=t>0&&t<1?-dy*side:before.x-x,ny=t>0&&t<1?dx*side:before.y-y,d=Math.hypot(nx,ny);if(d<.001){nx=-dy*side;ny=dx*side;d=Math.hypot(nx,ny)||1;}
      const pad=o.r+S.physics.playerRadius+.5;p.x=x+nx/d*pad;p.y=y+ny/d*pad;
      if(!p.awaitingInput&&!p.fall&&p.shield<=0&&!tooSlowForObstacle(o))crash(o);
      p.speed=p.vx=p.vy=0;p.air=p.airTotal=0;return;
    }
    if(p.awaitingInput||p.shield>0||o===p.crashObstacle)return;
    if(o.touched&&['sled','bush','cat'].includes(o.type))return;
    const uphill=p.vy<0,fast=p.speed>S.physics.fastImpactSpeed;
    if(o.type==='cat'){
      if(o.climb>8)return;
      if(fast){o.ai='flee';o.perch=null;o.calmAt=clock+S.wildlife.catSpookSeconds;o.touched=true;say('HISSS!',o);for(const n of state.objects)if((n.type==='skier'||n.type==='boarder'||n.type.startsWith('person'))&&Math.hypot(n.x-o.x,n.y-o.y)<260){n.annoyedUntil=clock+S.wildlife.catAnnoyedSeconds;n.catInterest=null;say(pick(S.dialogue.catAnnoyed),n);}}
      else if(!o.petted){o.petted=true;say('Prrrr.',o);}
      return;
    }
    if(['rabbit','fox'].includes(o.type)){greetSmallAnimal(o,true);return;}

    // Accelerating inside an existing slow contact must not cause another fall.
    if(p.slowContacts.has(o))return;

    // Walking bumps stop against obstacles without a fall; moving away from an overlap is allowed.
    const movingTerrain=o.type==='rollingSnowball'&&o.rollState==='rolling'||o.type==='fallingTree'&&o.fallState==='falling';
    if(!movingTerrain&&!p.onIce&&p.air<=0&&p.speed<=S.physics.walkingBumpLimit&&(p.mode==='traverse'||p.mode==='walk')){
      if(o.type==='bush')return;
      const before=p.walkOrigin;
      if(before&&obstacleClearance(o,p.x,p.y)<=obstacleClearance(o,before.x,before.y)){
        p.x=before.x;p.y=before.y;p.speed=p.vx=p.vy=0;
      }
      return;
    }
    // Cliff faces and standing castle walls require an opening; low rubble stays jumpable.
    if(p.air>0 && !['lodge','rental','mausoleum','iceBlock','ruinWall','areaBarrier'].includes(o.type))return;
    o.touched=true;
    if((o.type==='pine'||o.type==='fir')&&fast&&!uphill) {
      o.type='stump';o.width=65;o.r=15;invalidateSolidGrids();burst(o.x,o.y,'#658479',24);say('TIMBERRR!',o);beep(115,.15,'sawtooth');
    }
    if(o.type==='sled'&&fast){o.vx=90*Math.sign(p.vx||1);o.vy=240;p.speed*=S.physics.sledSpeedRetention;say('Express delivery!',o);return;}
    if(o.type==='bush'){o.flatten=true;p.speed*=S.physics.bushSpeedRetention;burst(o.x,o.y,C.gold,7);return;}
    if(['personRed','personGreen','personYellow'].includes(o.type))say(uphill?'BACKWARDS? Seriously?':pick(S.dialogue.personBumps),o);
    else if(o.type==='dog'){
      // A bumped town pet remains a pet; only a clean snack pass recruits a companion.
      o.hopUntil=clock+1.2;say('YIP!',o,1.4);
      if(p.speed<=S.physics.walkingBumpLimit)return;
    }
    else if(o.type==='skier'||o.type==='boarder'){say(pick(o.fast?S.dialogue.fastBumps:S.dialogue.skierBumps),o);o.speakAt=clock+S.skiers.bumpSpeechCooldownSeconds;}
    else if(o.type==='lodge'||o.type==='rental')say(uphill?'The door still works from the front.':'This is a HOUSE.',o);
    else if(uphill){say('A face full of snow. Naturally.',o);burst(p.x,p.y,'#bed9df',22);}
    else if(o.type==='rock'&&fast){say('The rock wins.',o);p.vx+=80*Math.sign(p.vx||1);}
    if((o.type==='skier'||o.type==='boarder')&&crash(o))crashSkier(o,null);
    else if(o.type!=='skier'&&o.type!=='boarder')crash(o);
  }
  function constrainCemeteryMotion(p,from){
    const radius=S.physics.playerRadius;
    for(const e of state.endless?.encounters||[]){
      if((e.kind!=='cemetery'&&!e.specialArea)||Math.max(p.y,from.y)<e.startY||Math.min(p.y,from.y)>e.endY)continue;
      const center=e.centerX??state.course.x,entry=e.startY+100*e.scale,exit=e.endY-100*e.scale,gap=(e.specialArea?e.entryHalf:220*e.scale)-radius;
      for(const y of [entry,exit]){
        const direction=Math.sign(p.y-from.y),stop=y-direction*radius;
        if(!direction||(from.y-stop)*direction>0||(p.y-stop)*direction<=0)continue;
        const x=mix(from.x,p.x,(stop-from.y)/(p.y-from.y));
        if(Math.abs(x-center)>gap){p.y=stop;p.vy=0;}
      }
      if(p.y>=entry-radius&&p.y<=exit+radius&&from.y>=entry-radius&&from.y<=exit+radius&&Math.abs(from.x-center)<=e.band-radius+.01){
        const x=clamp(p.x,center-e.band+radius,center+e.band-radius);
        if(x!==p.x){p.x=x;p.vx=0;}
      }
    }
  }
  function constrainParadeBuildings(p,from){
    const e=endlessEncounterAt(p.y)||endlessEncounterAt(from.y);if(e?.kind!=='christmas')return;
    const grid=cachedSolidGrid(houseSolids,HOUSE_TYPES,HOUSE_CELL,HOUSE_REACH).grid,seen=new Set(),radius=S.physics.playerRadius,dx=p.x-from.x,dy=p.y-from.y;let first=1,wall=null;
    for(let x=Math.floor((Math.min(from.x,p.x)-radius)/HOUSE_CELL);x<=Math.floor((Math.max(from.x,p.x)+radius)/HOUSE_CELL);x++)for(let y=Math.floor((Math.min(from.y,p.y)-radius)/HOUSE_CELL);y<=Math.floor((Math.max(from.y,p.y)+radius)/HOUSE_CELL);y++)for(const h of grid.get(x)?.get(y)||[]){
      if(seen.has(h)||h.town!==e.town)continue;seen.add(h);const b=solidBounds(h),box=[b[0]-radius,b[1]-radius,b[2]+radius,b[3]+radius];
      if(from.x>box[0]&&from.x<box[2]&&from.y>box[1]&&from.y<box[3])continue;
      let enter=0,leave=1,valid=true;
      for(const [pos,delta,lo,hi] of [[from.x,dx,box[0],box[2]],[from.y,dy,box[1],box[3]]]){
        if(Math.abs(delta)<1e-9){if(pos<=lo||pos>=hi)valid=false;continue;}
        const a=(lo-pos)/delta,z=(hi-pos)/delta;enter=Math.max(enter,Math.min(a,z));leave=Math.min(leave,Math.max(a,z));
      }
      if(valid&&enter<leave&&enter>=0&&enter<first){first=enter;wall=h;}
    }
    if(wall){const t=Math.max(0,first-.001);p.x=from.x+dx*t;p.y=from.y+dy*t;hit(wall);p.speed=p.vx=p.vy=0;p.air=p.airTotal=0;}
  }
  function movePlayer(dt) {
    const p=state.p,inp=inputVector();if(!state.started&&!p.awaitingInput)return;
    updateSpecialPlayer(p,dt);
    for(const o of p.slowContacts)if(o.dead||obstacleClearance(o,p.x,p.y)>Math.max(S.physics.playerRadius,S.physics.crashSeparation))p.slowContacts.delete(o);
    if(p.crashObstacle&&obstacleClearance(p.crashObstacle,p.x,p.y)>S.physics.crashSeparation)p.crashObstacle=null;
    if(p.awaitingInput){
      p.speed=p.vx=p.vy=0;p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);
      p.boost=Math.max(0,p.boost-dt);p.gateBoost=Math.max(0,(p.gateBoost||0)-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);return;
    }
    // Resolve the surface before release handling so ice keeps the incoming momentum.
    const ice=p.air<=0?patchAt(p.x,p.y):null;
    p.onRugged=p.air<=0&&!ice&&!!ruggedAt(p.x,p.y);
    if((p.mode==='walk'||p.mode==='traverse')&&!inp.held&&!ice&&p.air<=0){p.mode='still';p.desiredHeading=p.heading;p.releasing=true;}
    if(ice&&p.icePushPending){p.heading=p.desiredHeading;p.speed=p.mode==='traverse'?S.physics.traverseSpeed:p.mode==='walk'?S.physics.walkSpeed:S.physics.iceRestartSlideSpeed;p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed;p.onIce=false;p.icePushPending=false;}
    if(ice&&!p.onIce){p.iceHeading=p.heading;announce('BLACK ICE','No steering. Hold on to your scarf.',C.blue,2);}
    p.onIce=!!ice;
    if(p.air>0){p.heading=p.airHeading;p.speed=p.airSpeed;p.airPose=ease(p.airPose,inp.x,9,dt);p.airTuck=ease(p.airTuck,inp.y,9,dt);}
    else if(ice){
      p.heading=p.iceHeading;
      // Sideways and uphill entries coast at their entry speed. Gravity boosts downhill only.
      if(Math.cos(p.iceHeading)>S.physics.downhillCosMinimum)p.speed=Math.min(S.physics.iceTopSpeed*endlessSpeedScale(),p.speed+S.physics.iceAcceleration*endlessSpeedScale()*dt);
    }
    else {
      let delta=p.desiredHeading-p.heading;while(delta>Math.PI)delta-=TAU;while(delta<-Math.PI)delta+=TAU;p.heading+=delta*(1-Math.exp(-(p.releasing?S.physics.releaseTurnFollow:S.physics.turnFollow)*dt));
      const downhill=Math.max(0,Math.cos(p.heading));let cap=topSpeed()*(S.physics.acrossSpeedFraction+S.physics.downhillSpeedFraction*downhill*downhill)*(p.specialCap??1);
      if(p.boost>0||p.gateBoost>0)cap*=Math.max(p.boost>0?S.physics.boostMultiplier:1,p.gateBoost>0?S.race.gateBoost.multiplier:1);
      if(p.mode==='slide'){
        if(p.air<=0){if(p.speed<cap)p.speed=Math.min(cap,p.speed+(S.physics.accelerationBase+S.physics.accelerationDownhill*downhill*downhill)*endlessSpeedScale()*dt);else p.speed=Math.max(cap,p.speed-(p.speed>topSpeed()*S.physics.overSpeedRatio?S.physics.overSpeedDeceleration:S.physics.turnDeceleration)*dt);}
      }else if(p.mode==='walk')p.speed=ease(p.speed,S.physics.walkSpeed,S.physics.walkFollow,dt);
      else if(p.mode==='traverse')p.speed=ease(p.speed,S.physics.traverseSpeed,S.physics.traverseFollow,dt);
      else {p.speed=Math.max(0,p.speed-S.physics.brakeDeceleration*dt);if(p.speed<S.physics.stopEpsilon)p.speed=0;}
      if(onRoad(p.x,p.y)&&p.air<=0&&p.mode!=='still')p.speed=Math.min(p.speed,Math.max(p.mode==='walk'?S.physics.roadWalkSpeed:p.mode==='traverse'?S.physics.roadTraverseSpeed:S.physics.roadSlideSpeed,p.speed-S.physics.roadDeceleration*dt));
      if(p.onRugged)p.speed=Math.min(p.speed,topSpeed()*S.physics.ruggedSpeedRatio);
    }
    if(p.fall>0)p.speed=ease(p.speed,4,12,dt);
    p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed*cemeteryYScale(p.x,p.y);
    p.walkOrigin={x:p.x,y:p.y};
    p.impactMotion={stamp:clock,x:p.x,y:p.y,vx:p.vx,vy:p.vy,speed:p.speed,heading:p.heading,mode:p.mode,onIce:p.onIce,air:p.air,fall:p.fall,awaitingInput:p.awaitingInput};
    p.x+=p.vx*dt;p.y+=p.vy*dt;constrainCemeteryMotion(p,p.walkOrigin);
    p.air=Math.max(0,p.air-dt);p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.gateBoost=Math.max(0,(p.gateBoost||0)-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);p.rainbow=Math.max(0,p.rainbow-dt);
    if(p.air>0)p.spin+=p.airSpin*dt;
    if(p.air===0&&p.airTotal>0){if(p.landingSteer){p.mode=p.landingSteer.mode;state.input.tap={key:p.landingSteer.key,until:clock+.14};p.landingSteer=null;}const points=Math.round(S.race.jumpBasePoints+p.spin*S.race.spinPointMultiplier+p.jumpHeight*S.race.heightPointMultiplier);if(state.course){state.course.points+=points;state.course.tricks++;}p.airTotal=0;p.landingFeedback={title:p.spin>2?'STYLISH LANDING':'SOFT LANDING',points};}
    if(state.input.jump){launch(S.jump.manualSeconds);state.input.jump=false;}
    if(p.air===0&&!p.fall&&(!state.lastTrack||Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)>S.render.trailSpacing)){
      if(state.lastTrack&&Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)<45)state.trails.push({x:p.x,y:p.y,px:state.lastTrack.x,py:state.lastTrack.y,angle:p.heading,rainbow:p.rainbow>0});state.lastTrack={x:p.x,y:p.y};
    }else if(p.air>0)state.lastTrack=null;
    if(p.rainbow>0&&random()<.23)burst(p.x,p.y,pick(['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb']),1);
    state.trails=state.trails.filter(t=>t.y>p.y-H/ZOOM&&t.y<p.y+H/ZOOM).slice(-S.render.trailLimit);
  }
  function releasePointer(){
    // A swipe releases its virtual key. Diagonal/downhill steering persists like the keyboard.
    state.input.pointer=null;
  }
  function pointerSteer(key,pulse=false){
    if(!startMoving())return false;
    delete state.input.tap;keyboardDirection(key);state.control='pointer';if(pulse)state.input.tap={key,until:clock+.14};return true;
  }
  function updateSwipe(e){
    const t=state.input.pointer;if(!t||t.id!==e.pointerId)return;
    Object.assign(t,pointerCoords(e));if(t.multiTouch||t.handled)return;
    const dx=e.clientX-t.clientStartX,dy=e.clientY-t.clientStartY;
    if(Math.abs(dy)>=S.controls.swipeShortPixels&&Math.abs(dy)>Math.abs(dx)&&pointerSteer('down')){t.direction='down';t.presses=1;t.handled=true;}
  }
  function tapDirection(t){return t.sy>=H*(1-S.controls.tapBottomFraction)?'down':t.sx<W/2?'left':'right';}
  function finishPointerTap(e){
    const t=state.input.pointer;if(!t||t.multiTouch||t.handled)return;
    // A horizontal drift is still one tap; vertical swipes were handled above.
    pointerSteer(tapDirection(t),true);
  }
  function keyboardDirection(key,repeat=false){
    if(state.sceneCard)return;
    if(repeat&&clock-state.lastSteer<S.controls.keyRepeatSeconds)return;state.lastSteer=clock;state.control='keyboard';
    const p=state.p,mode=p.landingSteer?.mode??p.mode;p.releasing=false;
    const setMode=next=>{if(p.air>0)p.landingSteer={key,mode:next};else p.mode=next;};
    // Airborne input changes the landing plan; flight keeps its takeoff heading.
    if(key==='up'){p.desiredHeading=state.keyboardStep<0?-Math.PI:Math.PI;setMode('walk');return;}
    if(key==='down')state.keyboardStep=0;
    else if(p.speed<S.physics.stopEpsilon||mode==='traverse'||Math.cos(p.desiredHeading)<-S.physics.downhillCosMinimum||(mode==='still'&&Math.abs(Math.cos(p.desiredHeading))<S.physics.downhillCosMinimum))state.keyboardStep=key==='left'?-3:3;
    else state.keyboardStep=clamp(state.keyboardStep+(key==='left'?-1:1),-3,3);
    p.desiredHeading=Math.abs(state.keyboardStep)===3?Math.sign(state.keyboardStep)*Math.PI/2:state.keyboardStep*S.controls.stepDegrees*Math.PI/180;
    setMode(Math.abs(state.keyboardStep)===3?'traverse':'slide');
  }

  function knockDownByTerrain(o){
    if(o.dead)return;
    o.dead=true;o.r=0;o.running=false;o.vx=o.vy=0;o.fadeUntil=clock+(o.type==='wolf'?S.wildlife.wolfFadeSeconds:S.wildlife.predatorFadeSeconds);
    burst(o.x,o.y,C.ice,8);
  }
  function terrainHitsPredators(feature,swept=null){
    let hitAny=false;
    const contact=o=>swept?obstacleSegmentDistance(o.x,o.y,...swept)-feature.r:obstacleClearance(feature,o.x,o.y);
    for(const o of state.objects)if((o.type==='wolf'||o.type==='bear'||o.type==='lurker'||o.type==='zombie')&&!o.dead&&!o.eaten&&Math.abs(o.y-feature.y)<(feature.treeLength||feature.width)+50&&contact(o)<(o.r||12)){knockDownByTerrain(o);hitAny=true;}
    for(const c of state.chasers)if((c.kind==='fast'||c.kind==='slow'||c.kind==='bear')&&!c.dead&&Math.abs(c.y-feature.y)<(feature.treeLength||feature.width)+50&&contact(c)<S.chasers.knockoutDistance){knockDownByTerrain(c);hitAny=true;}
    return hitAny;
  }
  function snowballMotion(time){
    const f=S.terrainFeatures.rollingSnowball,decay=Math.exp(-time/f.accelerationSeconds);
    return {distanceTime:time-(1-f.initialSpeedRatio)*f.accelerationSeconds*(1-decay),speedRatio:1-(1-f.initialSpeedRatio)*decay};
  }
  function snowballCurve(){
    const f=S.terrainFeatures.rollingSnowball,amplitude=f.swayAmplitudeMetres*PX_PER_M;
    return {amplitude,omega:Math.min(TAU/f.swayPeriodSeconds,f.lateralSpeedKmh/S.physics.hudKmhPerSpeed/amplitude)};
  }
  function snowballIntercept(o,delay){
    const p=state.p,f=S.terrainFeatures.rollingSnowball;
    if(p.awaitingInput||p.fall||p.vy<=S.physics.walkingBumpLimit)return null;
    const side=p.x+p.vx*delay>=o.x?1:-1,{amplitude,omega}=snowballCurve(),vy=f.downhillSpeedKmh/S.physics.hudKmhPerSpeed;
    const crossing=t=>side*(o.x+side*amplitude*(1-Math.cos(omega*snowballMotion(t).distanceTime))-p.x-p.vx*(delay+t));
    let lo=0,hi=0;
    // Find the first crossing on the opening bend, rather than aiming again in flight.
    for(hi=.125;hi<=12;hi+=.125){if(omega*snowballMotion(lo).distanceTime>Math.PI)return null;if(crossing(hi)>=0)break;lo=hi;}
    if(hi>12)return null;
    for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(crossing(mid)<0)lo=mid;else hi=mid;}
    const time=(lo+hi)/2,u=snowballMotion(time).distanceTime;
    if(vy*u+2*amplitude>f.travelMetres*PX_PER_M)return null;
    return {side,amplitude,omega,vy,time,u,gap:o.y+vy*u*cemeteryYScale(o.x,o.y)-p.y-p.vy*(delay+time)};
  }
  function breakSnowball(o){
    if(o.rollState==='breaking')return;
    o.rollState='breaking';o.breakAt=clock;o.breakRadius=o.r;o.r=0;o.vx=o.vy=0;
    for(let i=0;i<28;i++){
      const life=range(.55,1.1);
      state.particles.push({x:o.x+range(-o.breakRadius,o.breakRadius),y:o.y-o.breakRadius*.5,vx:range(-140,140),vy:range(-140,40),life,totalLife:life,size:range(2,6),color:pick([C.ice,'#f8faf0','#9ebbc5'])});
    }
    beep(75,.16,'triangle');
  }
  function snowballHitsScenery(o,oldX,oldY){
    // Sample the short swept step using each object's actual footprint (including houses and trunks).
    const samples=Math.max(1,Math.ceil(Math.hypot(o.x-oldX,o.y-oldY)/Math.max(1,o.r*.35)));
    for(const other of state.objects){
      if(other===o||other.r<=0||other.eaten||other.dead||other.collected||['logBump','ramp','mogul','smallHill','largeHill','mushroom','rainbow','ice','rugged'].includes(other.type))continue;
      const extent=other.treeLength||other.width||other.r;
      if(Math.abs(other.x-o.x)>extent+o.r+Math.abs(o.x-oldX)||Math.abs(other.y-o.y)>extent+o.r+Math.abs(o.y-oldY))continue;
      for(let i=0;i<=samples;i++){
        const x=mix(oldX,o.x,i/samples),y=mix(oldY,o.y,i/samples);
        if(obstacleClearance(other,x,y)<o.r){
          o.x=x;o.y=y;
          if(['wolf','bear','lurker','zombie'].includes(other.type))knockDownByTerrain(other);
          breakSnowball(o);return true;
        }
      }
    }
    return false;
  }
  function updateTerrainFeatures(dt,previous=state.p){
    const p=state.p;
    for(const o of objectGroups().terrainFeatures){
      if(o.eaten)continue;
      if(o.type==='fallingTree'){
        const f=S.terrainFeatures.fallingTree;
        if(state.started&&o.fallState==='standing'&&Math.hypot(p.x-o.x,p.y-o.y)<f.triggerRadiusMetres*PX_PER_M){
          const targetX=o.fallTowardX??p.x;
          o.fallSide=targetX<o.x?-1:targetX>o.x?1:Math.sign(p.vx)||(o.id>.5?1:-1);
          o.fallState='warning';o.fallAt=clock+f.warningSeconds;o.fallAngle=o.fallSide>0?0:Math.PI;
          burst(o.x,o.y-o.treeLength*.7,C.ice,5);say('CREAK...',o,Math.min(f.warningSeconds,1));beep(100,.15,'sawtooth');
        }
        if(o.fallState==='warning'&&clock>=o.fallAt){o.fallState='falling';o.r=f.fallenRadiusMetres*PX_PER_M;p.slowContacts.delete(o);}
        if(o.fallState==='falling')terrainHitsPredators(o);
        if(o.fallState==='falling'&&treeFallProgress(o)>=1){
          o.fallState='fallen';const [,,tx,ty]=obstacleSegment(o);burst(tx,ty,C.ice,18);state.screenShake=.15;beep(75,.18,'triangle');terrainHitsPredators(o);
        }
      }else if(o.type==='rollingSnowball'){
        const f=S.terrainFeatures.rollingSnowball;
        if(o.rollState==='breaking'){if(clock-o.breakAt>1.1)o.eaten=true;continue;}
        if(o.rollState==='waiting'&&state.started&&o.y>=p.y-f.radiusMetres*PX_PER_M&&o.y-p.y<f.triggerDistanceMetres*PX_PER_M&&Math.abs(o.x-p.x)<f.triggerDistanceMetres*PX_PER_M){
          const plan=snowballIntercept(o,f.warningSeconds);
          if(plan&&plan.gap<=0&&plan.gap>=-p.vy*f.warningSeconds){o.rollState='warning';o.rollAt=clock+f.warningSeconds;beep(95,.12,'triangle');}
        }
        if(o.rollState==='warning'){
          const plan=snowballIntercept(o,0);
          if(!plan)o.rollState='waiting';
          else if(clock>=o.rollAt&&plan.gap<=0){
            o.rollState='rolling';o.rollStarted=clock;o.rollOriginX=o.x;o.rollOriginY=o.y;
            o.trailX=o.x;o.trailY=o.y;
            o.rollSide=plan.side;o.rollAmplitude=plan.amplitude;o.rollOmega=plan.omega;
            // Lock the whole accelerating curve at release. Later steering and jumps can evade it.
            o.rollDownhillSpeed=plan.u>.001?clamp((p.y+p.vy*plan.time-o.y)/(plan.u*cemeteryYScale(o.x,o.y)),0,plan.vy*1.25):plan.vy;
            p.slowContacts.delete(o);
          }
        }
        if(o.rollState!=='rolling')continue;
        const oldX=o.x,oldY=o.y,{distanceTime:u,speedRatio}=snowballMotion(clock-o.rollStarted),angle=o.rollOmega*u;
        o.x=o.rollOriginX+o.rollSide*o.rollAmplitude*(1-Math.cos(angle));const nominalY=o.rollOriginY+o.rollDownhillSpeed*u,flat=cemeteryYScale(o.x,oldY);o.y=oldY+(nominalY-(o.rollNominalY??o.rollOriginY))*flat;o.rollNominalY=nominalY;
        o.vx=o.rollSide*o.rollAmplitude*o.rollOmega*Math.sin(angle)*speedRatio;o.vy=o.rollDownhillSpeed*speedRatio*flat;
        const move=Math.hypot(o.x-oldX,o.y-oldY);o.rollDistance+=move;o.rollAngle+=move/o.r*o.rollSide;
        o.r=Math.min(f.maxRadiusMetres*PX_PER_M,f.radiusMetres*PX_PER_M+o.rollDistance*f.radiusGrowthPerMetre);o.width=o.r*2;
        if(Math.hypot(o.x-o.trailX,o.y-o.trailY)>=Math.max(3,o.r*.3)){
          state.snowballTrails.push({ax:o.trailX,ay:o.trailY,bx:o.x,by:o.y,r:o.r,until:clock+f.trailSeconds});o.trailX=o.x;o.trailY=o.y;
        }
        if(snowballHitsScenery(o,oldX,oldY))continue;
        if(obstacleSegmentDistance(0,0,previous.x-oldX,previous.y-oldY,p.x-o.x,p.y-o.y)<o.r+S.physics.playerRadius)hit(o);
        if(terrainHitsPredators(o,[oldX,oldY,o.x,o.y])){breakSnowball(o);continue;}
        if(clock>(o.nextPowder||0)){burst(o.x-o.vx*.04,o.y,C.ice,2);o.nextPowder=clock+.12;}
        if(o.rollDistance>=f.travelMetres*PX_PER_M||insideTown(o.x,o.y)||safeApproach(o.x,o.y))breakSnowball(o);
      }
    }
  }
  function boostThroughGate(p){
    if(p.fall||p.awaitingInput||p.speed<=0||p.vy<=0)return;
    const G=S.race.gateBoost,cap=topSpeed()*(p.air>0?S.jump.speedBoost:1)*G.multiplier;
    p.speed=Math.max(p.speed,Math.min(cap,p.speed*G.multiplier));
    if(p.air>0)p.airSpeed=Math.max(p.airSpeed,p.speed);
    p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed*cemeteryYScale(p.x,p.y);
    p.gateBoost=Math.max(p.gateBoost||0,G.seconds);
  }
  function crossCourseGate(o,previous,p){
    const run=state.course,group=o.gateGroup,members=group?group.members:[o];if(!run||o.checked||group?.checked)return;
    const ratio=(o.y-previous.y)/(p.y-previous.y||1),crossX=mix(previous.x,p.x,ratio),chosen=members.find(g=>Math.abs(crossX-g.x)<g.half);
    if(group)group.checked=true;
    for(const g of members){g.checked=true;g.checkedAt=clock;g.good=!!chosen;g.alternativeSkipped=!!chosen&&g!==chosen;}
    if(chosen){boostThroughGate(p);run.points+=S.race.gatePoints;run.cleared++;if(run.arcade)collectArcadeGear(chosen);burst(chosen.x,chosen.y,C.gold,9);beep(710,.04);}
    else{run.missed++;if(run.arcade)(state.arcade||state.endless).combo=0;beep(210,.045);if(run.arcade)wakePenaltyWolves(o);}
  }
  function updateFeedback(dt){
    for(const q of state.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=80*dt;q.life-=dt;}
    state.particles=state.particles.filter(q=>q.life>0);state.speech=state.speech.filter(q=>q.until>clock);state.messages=state.messages.filter(q=>q.until>clock);
    state.screenShake=Math.max(0,state.screenShake-dt);
  }
  function step(dt) {
    if(!ready)return;
    if(state.sceneCard){if(state.sceneCard.shown)state.sceneCard.minimumRemaining=Math.max(0,state.sceneCard.minimumRemaining-dt);return;}
    clock+=dt;updateDayNight(dt);
    if(state.deathTimer>0){
      const a=state.deathAnimation;
      if(a){
        updateFeedback(dt);
        if(a.shown)a.remaining=Math.max(0,a.remaining-dt);
        state.deathTimer=Math.max(.001,a.remaining);
        if(a.remaining<=1e-8){state.deathAnimation=null;showSceneCard(a.scene.key,a.scene.title,a.scene.detail,'summit');}
      }else {state.deathTimer-=dt;if(state.deathTimer<=0)resetSummit();}
      return;
    }
    if(state.liftTimer>0){state.liftTimer-=dt;state.p.y-=S.lift.rideSpeed*dt;state.cam.y=ease(state.cam.y,state.p.y-H*S.render.playerScreenY/ZOOM,S.render.cameraYFollow,dt);if(state.liftTimer<=0)resetSummit(true);return;}
    state.activeTime+=state.started?dt:0;
    updateEndlessSpeed();
    const p=state.p,previous={x:p.x,y:p.y};movePlayer(dt);constrainParadeBuildings(p,previous);pruneDistantEnemies();extendEndless();ensureWorld();spawnFastSkier();
    if(state.course){const run=state.course;if(!run.timingStarted&&p.y>=run.startY){run.timingStarted=true;run.time+=dt*clamp((p.y-run.startY)/(p.y-previous.y||1),0,1);}else if(run.timingStarted)run.time+=dt;spawnTerrain();}
    updateTerrainFeatures(dt,previous);updateVillageLife(dt);updateWildlife(dt);if(state.sceneCard||state.deathTimer)return;updateZombies(dt);if(state.sceneCard||state.deathTimer)return;updateFestivalTraffic(dt);updateSkiers(dt);updateSleighTeams(dt);resolveGroundPredatorPrey();updatePedestrians(dt);updateSpecialEvents();
    for(const o of state.objects){
      if(o.type==='mistletoe'&&tryMistletoe(o)||o.cocoaShop&&tryCocoaShop(o))return;
      if(o.type!=='skier'&&o.type!=='boarder'&&o.type!=='rollingSnowball'&&!o.animal&&(o.vx||o.vy)){o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;o.motionVx=o.vx||0;o.motionVy=(o.vy||0)*cemeteryYScale(o.x,o.y);o.x+=o.motionVx*dt;o.y+=o.motionVy*dt;o.travelSpeed=Math.hypot(o.motionVx,o.motionVy);o.travelStamp=clock;if(NPC_STATIC_SOLIDS.has(o.type))invalidateSolidGrids();}
      if(o.cheerUntil>clock&&clock>=(o.nextCheer||0)&&Math.hypot(o.x-p.x,o.y-p.y)<650){say(pick(o.cheerRun?.objective==='mushrooms'?S.dialogue.mushroomCheers:S.dialogue.cheers),o,2.2);o.nextCheer=clock+3.4+o.phase*.2;}
      if(o.roam&&!o.dogCompanion&&!o.dogRetreat&&!(o.socialUntil>clock))o.x+=Math.cos(clock*.8+o.phase)*o.roam*dt*.3;

      if(o.type==='arcadeOvertaker'&&o.arcadeRun===state.course&&p.y>=o.y&&!o.collected){
        o.collected=true;entity('skier',p.x+pick([-1,1])*range(...S.skiers.fastSpawnOffsetX),viewBounds().top-S.skiers.fastSpawnAbove,{width:44,r:12,fast:true,vy:topSpeed()*S.skiers.fastSpeedRatio,vx:range(-13,13),arcadeRun:o.arcadeRun});
      }
      const creature=o.type==='wolf'||o.type==='bear'||o.type==='lurker'||o.type==='zombie';
      if(creature&&monsterContact(o))hit(o);
      if(state.sceneCard||state.deathTimer)return;
      if(o.dead)continue;
      if(state.started&&!(o.stunnedUntil>clock)&&!o.retiring&&o.type==='lurker'&&(courseCreature(o,p.x,p.y)||!humanArea(o.x,o.y)&&!humanArea(p.x,p.y))&&(Math.hypot(o.x-p.x,o.y-p.y)<yetiWakeDistance(o)||o.shoreLake&&state.objects.some(q=>['skier','boarder'].includes(q.type)&&!q.eaten&&!q.dead&&q.r>0&&Math.hypot(q.x-o.x,q.y-o.y)<S.wildlife.yetiWakeDistance*endlessSpeedScale(o)&&!patchAt(q.x,q.y)))){o.type='awakened';o.r=0;const hunter={kind:o.arcadeTier==='slow'?'slow':'fast',arcadeTier:o.arcadeTier,ravager:o.ravager,ravagerIntroPrey:o.ravagerIntroPrey,encounter:o.encounter,chaseRun:o.arcadeRun,shoreLake:o.shoreLake,endlessBaseKmh:o.endlessBaseKmh,x:o.x,y:o.y,speed:o.arcadeRun?o.yetiSpeedKmh/S.physics.hudKmhPerSpeed:topSpeed()*S.wildlife.yetiWildSpeedRatio,wakeUntil:clock+yetiWakeDelay(o),phase:o.phase,expires:p.y+S.wildlife.yetiWildChaseDistance,talkAt:clock+6};if(hunter.ravagerIntroPrey)hunter.ravagerIntroPrey.ravagerIntroFor=hunter;state.chasers.push(hunter);say('Oh. Breakfast.',o);}
      if(o.type==='gate'&&o.run===state.course&&!o.checked&&previous.y<o.y&&p.y>=o.y)crossCourseGate(o,previous,p);
      if(o.type==='entrance'&&!state.course&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){startCourse(o.stage,o);break;}
      if(!state.arcade&&!state.endless&&o.type==='lift'&&!o.used&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){o.used=true;state.liftTimer=S.lift.rideSeconds;p.speed=0;announce('UP WE GO','Next stop: the summit.',C.teal,3);}
      if(!creature&&o.r>0&&Math.abs(o.y-p.y)<Math.max(130,o.width,o.depth||0,(o.treeLength||0)+o.r+S.physics.playerRadius)&&Math.abs(p.x-o.x)<Math.max(130+o.r,o.width,(o.treeLength||0)+o.r+S.physics.playerRadius)){const d=Math.hypot(p.x-o.x,(p.y-o.y)*.85);if(obstacleClearance(o,p.x,p.y)<S.physics.playerRadius)hit(o);else if(o.type.startsWith('person')&&!o.greeted&&d<85){o.greeted=true;say(pick(S.dialogue.greetings),o);}}
    }
    if(state.course){const off=!state.endless&&Math.abs(p.x-centerAt(p.y))>S.race.offPisteDistance;if(off&&!state.course.left){state.course.left=true;for(const c of state.chasers)if(!c.patrolPass&&c.kind!=='bear'&&!activeCourseOwner(c))c.expires=p.y+(c.kind==='dog'?2100:220);if(state.course.violation)announce('OFF PISTE',state.course.ambush==='dog'?'The dogs are still very interested.':state.course.ambush==='patrol'?'Ski patrol follows you off piste. Pay next time!':'You left the marked course.',C.blue,3);}const run=state.course;
      if(previous.y<run.endY&&p.y>=run.endY){
        const crossX=mix(previous.x,p.x,(run.endY-previous.y)/(p.y-previous.y||1));
        if(run.next||Math.abs(crossX-run.x)<run.finishHalf){run.time=Math.max(0,run.time-dt*(1-clamp((run.endY-previous.y)/(p.y-previous.y||1),0,1)));run.finishPassed=true;creditRun();if(state.sceneCard||state.deathTimer)return;}
        else announce('MISSED THE FINISH','Cross between the two finish flags!',C.red,3);
      }
      if(state.p!==p)return;
      if(state.arcade&&state.course===run&&!run.finishPassed&&previous.y<run.endY&&p.y>=run.endY){endArcade('MISSED THE FINISH');return;}
      // Leave a short uphill recovery window; skiing on into town records an unsuccessful run.
      if(state.course===run&&p.y>run.endY+S.race.finishRecoveryDistance)creditRun();}
    else if(state.zone.kind==='start'&&p.y>S.world.autoCourseY)startCourse('free',{x:p.x,y:S.world.autoCourseY});
    else if(state.zone.kind==='village'&&p.y>state.zone.end){if(state.arcade){state.arcade.stage++;startCourse('arcade',{x:state.zone.x,y:p.y});}else startCourse('free',{x:p.x,y:p.y});}
    if(state.arcade)state.arcade.furthestY=Math.max(state.arcade.furthestY,p.y);
    updateEndless();updateDogCompanions(dt,previous);updateChasers(dt);if(state.sceneCard||state.deathTimer)return;
    // Confirm landing feedback after obstacles and chasers have resolved this step.
    if(p.landingFeedback){
      const landing=p.landingFeedback;p.landingFeedback=null;
      if(state.p===p&&!p.fall&&!p.awaitingInput&&!state.deathTimer){announce(landing.title,`+${landing.points} points`,C.blue,1.5);beep(710,.08);}
    }
    filterObjects(o=>!o.eaten&&!o.collected&&o.type!=='awakened'&&(!o.dead||clock<o.fadeUntil)&&(o.dogCompanion||o.dogRetreat||o.worldChunk||o.grandMausoleum&&o.triggerAt!==undefined&&o.released<o.waveSize||(o.type==='wolf'&&o.linkedChase||o.type==='zombie'&&(o.awake||o.graveWakeAt!==undefined)&&o.zombieState!=='spent')&&activeCourseOwner(o)||o.y>p.y-S.world.sceneryRetentionBehind));
    state.snowballTrails=state.snowballTrails.filter(t=>t.until>clock&&t.by>p.y-S.world.sceneryRetentionBehind);
    updateFeedback(dt);
    state.cam.x=ease(state.cam.x,p.x,S.render.cameraXFollow,dt);state.cam.y=ease(state.cam.y,p.y-H*S.render.playerScreenY/ZOOM,S.render.cameraYFollow,dt);
  }
  const PED_SOLIDS=new Set(['pine','fir','rock','pebble','lodge','rental','lift','bench','lamp','snowman','stump','breadStand','skiRack','grave','mausoleum','cemeteryFence','areaBarrier','cemeteryPillar','christmasTree']),PED_FLAGS=new Set(['gate','entrance','finish']);
  function movePedestrianSafely(o,target,speed,dt,solids){
    const dx=target.x-o.x,dy=target.y-o.y,move=Math.min(speed*dt,Math.hypot(dx,dy)),radius=Math.max(8,o.r)+S.pedestrians.obstacleMargin;
    if(!move)return;
    const reach=radius+move;
    const near=solids.filter(h=>{if(h===o)return false;const b=h.solidBounds||solidBounds(h);return b[0]<=o.x+reach&&b[2]>=o.x-reach&&b[1]<=o.y+reach&&b[3]>=o.y-reach;});
    const clear=(x,y)=>!patchAt(x,y)&&near.every(h=>{const d=obstacleClearance(h,x,y);return d>=radius||d>obstacleClearance(h,o.x,o.y)+.001;});
    const desired=Math.atan2(dy,dx),angles=[0,.25,-.25,.5,-.5,.75,-.75,1].map(turn=>desired+turn*Math.PI);
    if(o.pedAvoidUntil>clock)angles.unshift(o.pedAvoidHeading);
    for(const angle of angles){
      const x=o.x+Math.cos(angle)*move,y=o.y+Math.sin(angle)*move*cemeteryYScale(o.x,o.y),steps=Math.max(1,Math.ceil(move/6));let safe=true;
      for(let i=1;i<=steps;i++)if(!clear(mix(o.x,x,i/steps),mix(o.y,y,i/steps))){safe=false;break;}
      if(!safe)continue;
      if(angle!==desired&&!(o.pedAvoidUntil>clock)){o.pedAvoidHeading=angle;o.pedAvoidUntil=clock+.4;}
      o.x=x;o.y=y;return;
    }
  }
  function updatePedestrians(dt){
    state.pedestrianElapsed=(state.pedestrianElapsed||0)+dt;if(state.pedestrianElapsed<1/30-1e-8)return;dt=state.pedestrianElapsed;state.pedestrianElapsed=0;
    const P=S.pedestrians,people=[],solids=[],flags=[],p=state.p;let threats;
    const reach=P.activeRadius*endlessSpeedScale()+Math.max(P.roamRadius,P.spectatorRadius)+P.walkSpeed[1]*3*dt*endlessSpeedScale()+64;
    snapshotSolids();
    for(const o of state.objects){
      if(o.eaten||o.dead)continue;if(o.type.startsWith('person'))people.push(o);
      if(o.r>0&&PED_SOLIDS.has(o.type)){
        const b=o.solidBounds||solidBounds(o);
        if(b[0]<=p.x+reach&&b[2]>=p.x-reach&&b[1]<=p.y+reach&&b[3]>=p.y-reach)solids.push(o);
      }
      if(PED_FLAGS.has(o.type)&&Math.abs(o.y-p.y)<=reach)flags.push(o);
    }
    for(const o of people){
      o.walking=false;
      if(Math.hypot(o.x-state.p.x,o.y-state.p.y)>P.activeRadius*endlessSpeedScale(o))continue;
      const oldX=o.x,oldY=o.y;
      if(updateNpcFear(o,threats??=npcPredatorThreats())){
        const dx=o.x-o.threat.x,dy=o.y-o.threat.y,distance=Math.hypot(dx,dy)||1;
        o.panicDisplaced=true;o.fleeReturn=null;o.stroll=null;
        movePedestrianSafely(o,{x:o.x+dx/distance*100,y:o.y+(dy||1)/distance*100},P.walkSpeed[1]*3*endlessSpeedScale(o),dt,solids);
      }else if(o.panicDisplaced){
        if(!o.fleeReturn){
          const index=o.walker&&o.path?.length?o.path.reduce((best,p,i)=>Math.hypot(p.x-o.x,p.y-o.y)<Math.hypot(o.path[best].x-o.x,o.path[best].y-o.y)?i:best,0):null;
          o.fleeReturn=index===null?{x:o.homeX,y:o.homeY}:{...o.path[index],index};o.pedAvoidUntil=0;
        }
        movePedestrianSafely(o,o.fleeReturn,o.walkSpeed||P.walkSpeed[1],dt,solids);
        if(Math.hypot(o.fleeReturn.x-o.x,o.fleeReturn.y-o.y)<3){if(o.fleeReturn.index!==undefined)o.pathIndex=o.fleeReturn.index;o.fleeReturn=null;o.panicDisplaced=false;o.pauseUntil=clock+1;}
      }else if(o.socialUntil>clock||o.cheerUntil>clock)continue;
      else if(o.walker&&o.path?.length>1){
        // Residents keep following their existing village footpaths.
        let remaining=o.walkSpeed*dt;
        for(let i=0;i<o.path.length+1&&remaining>0;i++){
          const target=o.path[o.pathIndex],d=Math.hypot(target.x-o.x,target.y-o.y),move=Math.min(d,remaining);
          if(d){o.x+=(target.x-o.x)/d*move;o.y+=(target.y-o.y)/d*move*cemeteryYScale(o.x,o.y);}remaining-=move;
          if(Math.hypot(target.x-o.x,target.y-o.y)>.1)break;
          if(o.pathIndex===o.path.length-1)o.pathDir=-1;else if(o.pathIndex===0)o.pathDir=1;
          o.pathIndex+=o.pathDir;
        }
      }else{
        const radius=o.job==='mistletoe'?24:o.cheerRun?P.spectatorRadius:P.roamRadius;
        const clear=(x,y)=>{
          if(Math.hypot(x-o.homeX,y-o.homeY)>radius||freshIceCache().some(h=>lakeContains(h,x,y)))return false;
          if(solids.some(h=>obstacleClearance(h,x,y)<o.r+P.obstacleMargin))return false;
          if(flags.some(f=>Math.abs(y-f.y)<P.gateClearance&&Math.abs(x-f.x)<(f.half||0)+o.r+P.obstacleMargin))return false;
          if(o.cheerRun){const run=o.cheerRun;if((x-run.x)*Math.sign(o.homeX-run.x)<run.finishHalf+o.r+P.obstacleMargin)return false;}
          return true;
        };
        if(o.stroll&&clock>=o.walkUntil){o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
        if(o.pauseUntil===undefined)o.pauseUntil=clock+o.id*P.pauseSeconds[1];
        if(!o.stroll&&clock>=o.pauseUntil){
          o.walkSpeed=range(...P.walkSpeed);const duration=range(...P.walkSeconds);
          for(let attempt=0;attempt<P.targetAttempts;attempt++){
            const angle=range(0,TAU),distance=Math.min(o.walkSpeed*duration,radius*.8),target={x:o.x+Math.cos(angle)*distance,y:o.y+Math.sin(angle)*distance};
            // Check the entire little stroll, so people don't cut through a tree or lake.
            const samples=Math.max(1,Math.ceil(distance/Math.max(4,o.r)));
            let safe=true;for(let i=1;i<=samples;i++)if(!clear(mix(o.x,target.x,i/samples),mix(o.y,target.y,i/samples))){safe=false;break;}
            if(safe){o.stroll=target;o.walkUntil=clock+distance/o.walkSpeed;break;}
          }
          if(!o.stroll)o.pauseUntil=clock+range(...P.pauseSeconds);
        }
        if(o.stroll){
          const d=Math.hypot(o.stroll.x-o.x,o.stroll.y-o.y),move=Math.min(d,o.walkSpeed*dt);
          const x=o.x+(o.stroll.x-o.x)/(d||1)*move,y=o.y+(o.stroll.y-o.y)/(d||1)*move*cemeteryYScale(o.x,o.y);
          if(clear(x,y)){
            o.x=x;o.y=y;
            if(Math.hypot(o.stroll.x-o.x,o.stroll.y-o.y)<.1){o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
          }else {o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
        }
      }
      const distance=Math.hypot(o.x-oldX,o.y-oldY);o.walking=distance>0;
      o.walkCycle=(o.walkCycle||0)+distance*P.stridePerUnit;if(Math.abs(o.x-oldX)>.5)o.walkFacing=Math.sign(o.x-oldX);
    }
  }
  let iceCacheTime=-1,iceCache=[],iceCacheObjects=null,iceCacheLength=-1;
  const HOUSE_CELL=128,HOUSE_REACH=64,TREE_CELL=96;
  const HOUSE_TYPES=new Set(['lodge','rental','mausoleum','iceBlock','ruinWall']);
  const TREE_TYPES=new Set(['pine','fir','smallPine','spruceTree','crookedTree','cedarTree','alpineTree','wideLog','fallingTree','christmasTree','grave','cemeteryFence','areaBarrier','cemeteryPillar']);
  const TIGHT_DRAW_TYPES=new Set([...HOUSE_TYPES,...TREE_TYPES,'skier','boarder','personRed','personYellow','personGreen','dog','cat','wolf','bear','rabbit','fox'].filter(type=>!['fallingTree','wideLog','cemeteryFence','areaBarrier'].includes(type)));
  const houseSolids={},treeSolids={},skierSolids={};
  function solidBounds(o){
    if(['wideLog','fallingTree','cemeteryFence','areaBarrier'].includes(o.type)){const [ax,ay,bx,by]=obstacleSegment(o);return [Math.min(ax,bx)-o.r,Math.min(ay,by)-o.r,Math.max(ax,bx)+o.r,Math.max(ay,by)+o.r];}
    if(['lodge','rental','mausoleum'].includes(o.type)){const hw=houseFootHalfWidth(o);return [o.x-hw,o.y-houseFootDepth(o),o.x+hw,o.y];}
    if(o.type==='iceBlock'||o.type==='ruinWall')return [o.x-o.width/2,o.y-o.depth/2,o.x+o.width/2,o.y+o.depth/2];
    const radius=o.r||0;return [o.x-radius,o.y-radius/S.physics.collisionYScale,o.x+radius,o.y+radius/S.physics.collisionYScale];
  }
  const solidBoundsCache=new WeakMap();
  function retainedSolidBounds(o,old=solidBoundsCache.get(o)){
    // Immutable fences/logs can reuse endpoints; only a tree actually falling changes each tick.
    if(old&&old.type===o.type&&old.x===o.x&&old.y===o.y&&old.r===o.r){
      let same=false;
      switch(old.shape){
        case 0:same=old.ys===S.physics.collisionYScale;break;
        case 1:same=old.hwr===S.village.houseFootWidthRatio&&old.hhr===S.village.houseFootHeightRatio&&old.width===o.width&&old.span===o.paradeSpan&&old.step===o.paradeStep&&old.spanX===o.paradeSpanX&&old.stepX===o.paradeStepX;break;
        case 2:same=old.width===o.width&&old.depth===o.depth;break;
        case 3:same=old.ax===o.ax&&old.ay===o.ay&&old.bx===o.bx&&old.by===o.by;break;
        case 4:same=old.width===o.width;break;
        case 5:same=o.fallState!=='falling'&&old.fallState===o.fallState&&old.fallSide===o.fallSide&&old.fallAngle===o.fallAngle&&old.treeLength===o.treeLength;break;
      }
      if(same)return old.bounds;
    }
    const shape=o.type==='lodge'||o.type==='rental'||o.type==='mausoleum'?1:o.type==='iceBlock'||o.type==='ruinWall'?2:o.type==='cemeteryFence'||o.type==='areaBarrier'?3:o.type==='wideLog'?4:o.type==='fallingTree'?5:0;
    const fresh=solidBounds(o),same=old&&old.bounds[0]===fresh[0]&&old.bounds[1]===fresh[1]&&old.bounds[2]===fresh[2]&&old.bounds[3]===fresh[3],bounds=same?old.bounds:fresh;
    solidBoundsCache.set(o,{type:o.type,shape,hwr:S.village.houseFootWidthRatio,hhr:S.village.houseFootHeightRatio,x:o.x,y:o.y,r:o.r,width:o.width,depth:o.depth,span:o.paradeSpan,step:o.paradeStep,spanX:o.paradeSpanX,stepX:o.paradeStepX,ys:S.physics.collisionYScale,ax:o.ax,ay:o.ay,bx:o.bx,by:o.by,fallState:o.fallState,fallSide:o.fallSide,fallAngle:o.fallAngle,treeLength:o.treeLength,bounds});return bounds;
  }
  const solidGroups=new Map();
  let solidRevision=0;
  function invalidateSolidGrids(){solidRevision++;solidSnapshot.time=-1;}
  const solidSnapshot={time:-1,source:null,length:-1,groups:null,entries:null};
  function snapshotSolids(){
    const c=solidSnapshot;
    if(c.source===state.objects&&c.length===state.objects.length){
      if(c.time===clock)return c;
      let same=true;
      for(const entry of c.entries){
        const o=entry.o;if(o.type!==entry.type){same=false;break;}
        if(!entry.mask)continue;
        const active=!o.eaten&&!o.dead&&o.r>0;
        if(active!==entry.active){same=false;break;}
        if(active){const bounds=retainedSolidBounds(o,entry.record);if(bounds!==o.solidBounds){same=false;break;}}
      }
      if(same){c.time=clock;return c;}
    }
    const groups=new Map([[HOUSE_TYPES,[]],[TREE_TYPES,[]],[NPC_STATIC_SOLIDS,[]]]),entries=[];
    for(const o of state.objects){
      const mask=(HOUSE_TYPES.has(o.type)?1:0)|(TREE_TYPES.has(o.type)?2:0)|(NPC_STATIC_SOLIDS.has(o.type)?4:0),active=!o.eaten&&!o.dead&&o.r>0;
      const entry={o,type:o.type,mask,active,record:null};entries.push(entry);if(!mask||!active)continue;o.solidBounds=retainedSolidBounds(o);entry.record=solidBoundsCache.get(o);
      if(mask&1)groups.get(HOUSE_TYPES).push(o);if(mask&2)groups.get(TREE_TYPES).push(o);if(mask&4)groups.get(NPC_STATIC_SOLIDS).push(o);
    }
    for(const [type,items] of groups){
      const old=solidGroups.get(type);let same=old&&old.items.length===items.length;
      if(same)for(let i=0;i<items.length;i++)if(old.items[i]!==items[i]||old.bounds[i]!==items[i].solidBounds){same=false;break;}
      if(same)groups.set(type,old.items);else solidGroups.set(type,{items,bounds:items.map(o=>o.solidBounds)});
    }
    Object.assign(c,{time:clock,source:state.objects,length:state.objects.length,groups,entries});return c;
  }
  function cachedSolidGrid(cache,types,cell,padding=0){
    if(cache.revision===solidRevision&&cache.time===clock&&cache.source===state.objects&&cache.length===state.objects.length)return cache;
    cache.revision=solidRevision;cache.time=clock;cache.source=state.objects;cache.length=state.objects.length;
    const snapshot=snapshotSolids(),shared=snapshot.groups.get(types),items=shared||state.objects.filter(o=>types.has(o.type)&&!o.eaten&&!o.dead&&o.r>0);let changed=!cache.records;
    if(shared&&cache.items===items)return cache;cache.items=items;
    for(const o of items){
      const b=shared?o.solidBounds:(o.solidBounds=solidBounds(o)),old=cache.records?.get(o);
      if(!old||old[0]!==b[0]||old[1]!==b[1]||old[2]!==b[2]||old[3]!==b[3])changed=true;
    }
    if(!changed&&items.length===cache.records.size)return cache;
    cache.records=new Map();cache.grid=new Map();cache.objects=new Set(items);cache.builds=(cache.builds||0)+1;
    for(const o of items){const b=o.solidBounds;cache.records.set(o,b);
      for(let x=Math.floor((b[0]-padding)/cell);x<=Math.floor((b[2]+padding)/cell);x++){let col=cache.grid.get(x);if(!col)cache.grid.set(x,col=new Map());for(let y=Math.floor((b[1]-padding)/cell);y<=Math.floor((b[3]+padding)/cell);y++){let a=col.get(y);if(!a)col.set(y,a=[]);a.push(o);}}
    }
    return cache;
  }
  function freshIceCache(){if(iceCacheTime!==clock||iceCacheObjects!==state.objects||iceCacheLength!==state.objects.length){iceCache=state.objects.filter(h=>h.type==='ice');iceCacheTime=clock;iceCacheObjects=state.objects;iceCacheLength=state.objects.length;}return iceCache;}
  function chaseVelocity(vx,vy){const ratio=S.predators.offDownhillSpeedRatio;return [vx*ratio,vy*(vy>0?1:ratio)];}
  function travel(o,angle,speed,dt,animal=false,avoidTowns=false,avoidTrees=false,chasing=false,target=null,allowIce=false,groundApplied=false,worldPace=false){
    if(!groundApplied)speed*=specialActorFactor(o,dt);
    o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
    const houseGrid=cachedSolidGrid(houseSolids,HOUSE_TYPES,HOUSE_CELL,HOUSE_REACH).grid;
    const trees=cachedSolidGrid(treeSolids,TREE_TYPES,TREE_CELL),treeGrid=trees.grid,treeObjects=trees.objects;
    const ice=freshIceCache();
    const A=S.wildlife,Vh=S.village,hwr=Vh.houseFootWidthRatio,rm=(o.r||10)+5;
    const nearHouse=(x,y)=>{
      const col=houseGrid.get(Math.floor(x/HOUSE_CELL));if(!col)return false;
      const a=col.get(Math.floor(y/HOUSE_CELL));if(!a)return false;
      for(const h of a){const block=h.type==='iceBlock'||h.type==='ruinWall',hw=block?h.width/2:houseFootHalfWidth(h);if(Math.abs(x-h.x)>hw+rm)continue;if(block){if(obstacleClearance(h,x,y)<rm)return true;}else{const dy=h.y-y;if(dy>-rm&&dy<houseFootDepth(h)+rm&&houseClearance(h,x,y)<rm)return true;}}
      return false;
    };
    const nearTree=(x,y,solidOnly=false)=>{
      const gx=Math.floor(x/TREE_CELL),gy=Math.floor(y/TREE_CELL);
      for(let ix=gx-1;ix<=gx+1;ix++){const col=treeGrid.get(ix);if(!col)continue;
        for(let iy=gy-1;iy<=gy+1;iy++){const a=col.get(iy);if(!a)continue;
          for(const t of a){
            if(solidOnly&&!t.solidWall)continue;
            if(t.type==='wideLog'||t.type==='fallingTree'||t.type==='cemeteryFence'||t.type==='areaBarrier'){const [ax,ay,bx,by]=obstacleSegment(t);if(obstacleSegmentDistance(x,y,ax,ay,bx,by)<t.r+rm)return true;}
            else if(Math.hypot(x-t.x,y-t.y)<(t.r||12)+rm)return true;
          }}}
      return false;
    };
    const nearIce=(x,y)=>ice.some(h=>{const g=h.lake||lakeGeometry(h);return Math.abs(x-h.x)<=g.radius+rm&&Math.abs(y-h.y)<=g.radius+rm&&lakeContains(h,x,y);});
    const valid=(x,y)=>(!avoidTowns||!insideTown(x,y)||activeCourseOwner(o)&&!!endlessTownAt(x,y))&&(allowIce||!nearIce(x,y))&&!nearHouse(x,y)&&!nearTree(x,y,!avoidTrees)&&(!animal||courseCreature(o,x,y)||!o.arcadeRun&&!classicArea(x,y,35)&&(!(o.type==='bear'||(['fox','wolf'].includes(o.type)&&!o.humanVisitor))||!humanArea(x,y)));
    const motion=a=>{
      const [vx,rawVy]=chasing?chaseVelocity(Math.cos(a)*speed,Math.sin(a)*speed):[Math.cos(a)*speed,Math.sin(a)*speed];
      const vy=rawVy*cemeteryYScale(o.x,o.y),actualSpeed=Math.hypot(vx,vy);
      // Companions use the player's already-scaled world motion, including flat graveyards.
      if(worldPace&&actualSpeed){const ratio=speed/actualSpeed;return {vx:vx*ratio,vy:vy*ratio,speed,ux:vx/actualSpeed,uy:vy/actualSpeed,probe:Math.max(A.avoidProbeDistance,speed*A.avoidLookaheadSeconds)};}
      return {vx,vy,speed:actualSpeed,ux:vx/(actualSpeed||1),uy:vy/(actualSpeed||1),probe:Math.max(A.avoidProbeDistance,actualSpeed*A.avoidLookaheadSeconds)};
    };
    // Long trunks need two committed corners; local turns alone steer back into their middle.
    if(avoidTrees&&target){
      const geometry=t=>{
        const [ax,ay,bx,by]=obstacleSegment(t),length=Math.hypot(bx-ax,by-ay);if(length<1)return null;
        const tx=(bx-ax)/length,ty=(by-ay)/length,padding=t.r+rm+Math.max(12,A.avoidProbeDistance*.5);
        return {ax,ay,bx,by,tx,ty,nx:-ty,ny:tx,padding};
      };
      let route=o.obstacleDetour;
      if(route){
        const g=geometry(route.obstacle);
        if(!g||route.obstacle.eaten||route.obstacle.dead||!treeObjects.has(route.obstacle))route=null;
        else {
          const here=(o.x-g.ax)*g.nx+(o.y-g.ay)*g.ny,there=(target.x-g.ax)*g.nx+(target.y-g.ay)*g.ny;
          if(here*there>0&&Math.min(Math.abs(here),Math.abs(there))>g.padding)route=null;
        }
        if(!route)o.avoidUntil=0;
      }
      if(!route){
        const reach=Math.max(A.avoidProbeDistance,speed*A.avoidLookaheadSeconds)+rm*2,seen=new Set();let blocker=null,best=Infinity;
        const gx0=Math.floor((o.x-reach)/TREE_CELL),gx1=Math.floor((o.x+reach)/TREE_CELL),gy0=Math.floor((o.y-reach)/TREE_CELL),gy1=Math.floor((o.y+reach)/TREE_CELL);
        for(let gx=gx0;gx<=gx1;gx++){const col=treeGrid.get(gx);if(!col)continue;
          for(let gy=gy0;gy<=gy1;gy++)for(const t of col.get(gy)||[]){
            if(seen.has(t)||t.dead||t.eaten||(t.type!=='wideLog'&&t.type!=='fallingTree'&&t.type!=='cemeteryFence'&&t.type!=='areaBarrier'))continue;seen.add(t);
            const g=geometry(t);if(!g)continue;
            const distance=obstacleSegmentDistance(o.x,o.y,g.ax,g.ay,g.bx,g.by);
            if(distance>reach||distance>=best||obstacleSegmentSeparation(o.x,o.y,target.x,target.y,g.ax,g.ay,g.bx,g.by)>=t.r+rm)continue;
            best=distance;blocker={obstacle:t,g};
          }}
        if(blocker){
          const {obstacle,g}=blocker,side=((o.x-g.ax)*g.nx+(o.y-g.ay)*g.ny)<0?-1:1;
          const cost=end=>{
            const x=(end<0?g.ax:g.bx)+end*g.tx*g.padding,y=(end<0?g.ay:g.by)+end*g.ty*g.padding;
            const from={x:x+g.nx*side*g.padding,y:y+g.ny*side*g.padding},to={x:x-g.nx*side*g.padding,y:y-g.ny*side*g.padding};
            return Math.hypot(from.x-o.x,from.y-o.y)+Math.hypot(to.x-target.x,to.y-target.y)+(valid(from.x,from.y)&&valid(to.x,to.y)?0:1e6);
          };
          route={obstacle,side,end:cost(-1)<=cost(1)?-1:1,index:0};o.avoidUntil=0;
        }
      }
      if(route){
        const g=geometry(route.obstacle),x=(route.end<0?g.ax:g.bx)+route.end*g.tx*g.padding,y=(route.end<0?g.ay:g.by)+route.end*g.ty*g.padding;
        let side=route.index===0?route.side:-route.side,wx=x+g.nx*side*g.padding,wy=y+g.ny*side*g.padding;
        if(Math.hypot(wx-o.x,wy-o.y)<Math.max(6,Math.min(rm,g.padding*.2))){
          route.index++;o.avoidUntil=0;
          if(route.index>1)route=null;
          else {side=-route.side;wx=x+g.nx*side*g.padding;wy=y+g.ny*side*g.padding;}
        }
        if(route)angle=Math.atan2(wy-o.y,wx-o.x);
      }
      o.obstacleDetour=route;
    }else o.obstacleDetour=null;
    // A wall beyond nearby prey must not block the approach to that prey.
    // Chase waypoints retain full lookahead; companions may finish at their close goal.
    const closingTarget=target&&(worldPace||chasing&&(target===state.p||target.type||target.kind));
    const arrivalReach=closingTarget?Math.max(0,Math.hypot(target.x-o.x,target.y-o.y)-(chasing?Math.max(0,Math.min(S.chasers.captureDistance,S.wildlife.captureDistance)-1):0)):Infinity;
    const clear=a=>{const m=motion(a),probe=Math.max(m.speed*dt,Math.min(m.probe,arrivalReach));return [Math.min(probe,m.speed*dt),probe*.5,probe].every(d=>valid(o.x+m.ux*d,o.y+m.uy*d));};
    let heading=o.avoidUntil>clock?o.avoidHeading:angle,approachClear=false;
    if(closingTarget&&arrivalReach<Math.max(A.avoidProbeDistance,speed*A.avoidLookaheadSeconds)&&!o.obstacleDetour&&o.avoidUntil>clock&&clear(angle)){heading=angle;o.avoidUntil=0;approachClear=true;}
    if(!approachClear&&!clear(heading)){
      const turn=o.avoidSide??(o.id>.5?1:-1),options=A.avoidProbeDegrees.map(d=>angle+d*Math.PI/180*turn);
      let next=options.find(clear);
      // If a moving target left us inside a newly protected region, walk out continuously.
      if(next===undefined){
        if(valid(o.x,o.y)){o.running=false;o.motionVx=o.motionVy=0;o.travelSpeed=0;o.travelStamp=clock;return;}
        const escape=options.find(a=>{const m=motion(a);return valid(o.x+m.ux*m.probe*2,o.y+m.uy*m.probe*2);});
        next=escape??(o.avoidUntil>clock?o.avoidHeading:angle+Math.PI/2*turn);
      }
      heading=next;o.avoidHeading=heading;o.avoidUntil=clock+A.avoidCommitSeconds;o.avoidSide=turn;
    }
    const m=motion(heading);o.motionVx=m.vx;o.motionVy=m.vy;o.angle=chasing?Math.atan2(m.vy,m.vx):heading;o.x+=m.vx*dt;o.y+=m.vy*dt;o.running=m.speed>60;o.travelSpeed=m.speed;o.travelStamp=clock;
  }
  function thankWolfRescue(o){
    const A=S.wildlife;
    for(const skier of state.objects){
      if(!['skier','boarder'].includes(skier.type)||Math.hypot(skier.x-o.x,skier.y-o.y)>A.rescueThanksRadius)continue;
      if(skier.threat===o||o.targetSkier===skier||skier.fearUntil>clock&&skier.threat?.type==='wolf'&&skier.threat.packId===o.packId){
        if(clock>=(skier.thanksAt||0)){say(pick(S.dialogue.rescued),skier,3);skier.thanksAt=clock+A.rescueThanksCooldown;skier.speakAt=clock+A.npcSpeechCooldown;}
        if(skier.threat===o){skier.threat=null;skier.fearUntil=0;}
      }
    }
  }
  function npcPredatorThreats(){
    const threats=state.objects.filter(o=>(o.type==='wolf'||o.type==='bear'||o.type==='zombie'&&(o.awake||o.zombieRoamer)&&o.zombieState!=='spent')&&!o.eaten&&!o.dead&&!o.retiring&&o.r>0&&!(o.stunnedUntil>clock)&&(!o.penaltyGate||o.wolfAwake));
    if(state.started)for(const c of state.chasers)if(['fast','slow','bear'].includes(c.kind)&&!c.dead&&!c.leaving&&!c.waiting&&!(c.wakeUntil>clock)&&!(c.stunnedUntil>clock)&&(!c.chaseRun||activeCourseOwner(c))&&(c.chaseRun||!(state.p.y>c.expires)))threats.push(c);
    return threats;
  }
  function updateNpcFear(o,threats){
    const protectedArea=humanArea(o.x,o.y);
    if(o.threat&&(!threats.includes(o.threat)||protectedArea&&!courseCreature(o.threat,o.x,o.y))){o.threat=null;o.fearUntil=0;}
    let nearest=null,distance=S.wildlife.npcFearDistance*endlessSpeedScale(o);
    for(const threat of threats){if(protectedArea&&!courseCreature(threat,o.x,o.y))continue;const d=Math.hypot(threat.x-o.x,threat.y-o.y);if(d<distance){distance=d;nearest=threat;}}
    if(nearest)frighten(o,nearest);
    return !!o.threat&&o.fearUntil>clock;
  }
  function frighten(skier,threat){
    skier.threat=threat;skier.fearUntil=clock+S.wildlife.npcFearSeconds;skier.catInterest=null;skier.socialUntil=0;
    skier.chatUntil=skier.waveUntil=skier.serveUntil=skier.throwUntil=skier.cheerUntil=0;skier.socialAnimal=null;
    const lines=threat.type==='zombie'?['ZOMBIES!','RUN! THE DEAD!']:threat.type==='bear'||threat.kind==='bear'?S.dialogue.bearTerrified:threat.kind==='fast'||threat.kind==='slow'?S.dialogue.yetiTerrified:S.dialogue.terrified;
    if(clock>=(skier.speakAt||0)){say(pick(lines),skier);skier.speakAt=clock+S.wildlife.npcSpeechCooldown;}
  }
  function crashSkier(o,obstacle){
    if(o.eaten||o.dead||o.npcFallUntil>clock)return;
    o.npcFallAt=clock;o.npcFallUntil=clock+range(...S.skiers.crashSeconds);
    o.npcResumeVy=Math.max(25,o.vy||o.iceCoastVy||S.skiers.slowSpeed[0]);
    o.npcCrashSide=Math.sign(o.x-(obstacle?.x??o.x))||pick([-1,1]);o.npcCrashObstacle=obstacle;
    o.vx=o.vy=o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;o.onIce=false;delete o.iceCoastVy;
    o.socialUntil=0;o.catInterest=null;burst(o.x,o.y,C.ice,9);
  }
  const NPC_CRASH_SOLIDS=new Set(['pine','fir','rock','pebble','stump','wideLog','fallingTree','rollingSnowball','lodge','rental','mausoleum','grave','cemeteryFence','areaBarrier','cemeteryPillar','christmasTree','sled','skier','boarder','iceBlock','ruinWall']);
  const NPC_STATIC_SOLIDS=new Set([...NPC_CRASH_SOLIDS].filter(type=>type!=='skier'&&type!=='boarder'));
  function skierCollisionGrid(){
    const grid=new Map(),cell=160,p=state.p;grid.staticGrid=cachedSolidGrid(skierSolids,NPC_STATIC_SOLIDS,cell).grid;
    for(const o of state.objects){
      if(!['skier','boarder'].includes(o.type)||o.r<=0||o.eaten||o.dead||Math.abs(o.y-p.y)>S.wildlife.activeRadius*endlessSpeedScale(o)+1200)continue;
      const b=solidBounds(o);for(let x=Math.floor(b[0]/cell);x<=Math.floor(b[2]/cell);x++){let col=grid.get(x);if(!col)grid.set(x,col=new Map());for(let y=Math.floor(b[1]/cell);y<=Math.floor(b[3]/cell);y++){let a=col.get(y);if(!a)col.set(y,a=[]);a.push(o);}}
    }
    return grid;
  }
  function moveSkier(o,vx,vy,dt,grid,ice){
    const ground=specialActorFactor(o,dt);vx*=ground;vy*=ground;
    const rawVy=vy;vy*=cemeteryYScale(o.x,o.y);
    const dx=vx*dt,dy=vy*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(4,o.r*.7)));
    if(o.npcCrashObstacle&&obstacleClearance(o.npcCrashObstacle,o.x,o.y)>o.r+8)o.npcCrashObstacle=null;
    const seen=new Set(),pad=o.r+25,grids=grid.staticGrid?[grid,grid.staticGrid]:[grid];
    for(let x=Math.floor((Math.min(o.x,o.x+dx)-pad)/160);x<=Math.floor((Math.max(o.x,o.x+dx)+pad)/160);x++)for(let y=Math.floor((Math.min(o.y,o.y+dy)-pad)/160);y<=Math.floor((Math.max(o.y,o.y+dy)+pad)/160);y++){
      for(const layer of grids)for(const other of layer.get(x)?.get(y)||[]){
        if(other===o||seen.has(other)||other===o.npcCrashObstacle||other.eaten||other.dead)continue;seen.add(other);
        const skier=other.type==='skier'||other.type==='boarder';
        const ov=skier&&!(other.npcFallUntil>clock)?[other.motionVx??other.vx??0,other.motionVy??((other.iceCoastVy??other.vy??0)*cemeteryYScale(other.x,other.y))]:objectVelocity(other);
        if(Math.hypot(vx-ov[0],vy-ov[1])*S.physics.hudKmhPerSpeed<=S.physics.minimumCollisionKmh)continue;
        for(let i=1;i<=steps;i++)if(obstacleClearance(other,o.x+dx*i/steps,o.y+dy*i/steps)<o.r){
          o.x+=dx*(i-1)/steps;o.y+=dy*(i-1)/steps;crashSkier(o,other);if(skier)crashSkier(other,o);return;
        }
      }
    }
    const field=o.encounter,crowd=field?.kind==='crowd'&&o.y>=field.startY&&o.y<=field.endY;
    if(ice||crowd){
      // The swept grid already handled crowd-field collisions; there are no buildings to route around.
      o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;o.x+=dx;o.y+=dy;o.motionVx=vx;o.motionVy=vy;
      o.angle=ice?o.iceHeading:Math.atan2(vy,vx);o.travelSpeed=Math.hypot(vx,vy);o.travelStamp=clock;o.running=o.travelSpeed>60;
    }else {const speed=Math.hypot(vx,rawVy);if(speed)travel(o,Math.atan2(rawVy,vx),speed,dt,false,false,false,false,null,true,true);}
  }
  function updateSkiers(dt){
    const p=state.p,A=S.wildlife,K=S.skiers;
    let collisionGrid,threats;
    // Bears/yetis live in the chaser list after waking; wolves and roaming bears are scenery.
    for(const o of objectGroups().skiers){
      if((o.type!=='skier'&&o.type!=='boarder')||o.eaten||o.dead||o.sleighRoot||!o.rival&&Math.hypot(o.x-p.x,o.y-p.y)>A.activeRadius*endlessSpeedScale(o))continue;
      const distance=Math.hypot(o.x-p.x,o.y-p.y);
      o.skierElapsed=(o.skierElapsed||0)+dt;
      if(distance>800*endlessSpeedScale(o)&&!o.rival&&!o.santaSleigh&&!o.onIce&&o.skierElapsed+1e-8<1/30)continue;
      const elapsed=o.skierElapsed;o.skierElapsed=0;
      if(o.npcFallUntil>clock){specialActorFactor(o,elapsed);o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;continue;}
      if(o.npcFallUntil){
        o.npcFallUntil=0;o.vy=o.npcResumeVy;o.vx=o.npcCrashSide*Math.max(35,o.vy*.6);
        o.skiLaneX=o.x;o.nextSkiTurn=clock+1.2;o.npcRecoveryUntil=clock+1.2;o.skiTurn=o.npcCrashSide;
      }
      updateNpcFear(o,threats??=npcPredatorThreats());
      collisionGrid??=skierCollisionGrid();
      const ice=patchAt(o.x,o.y);
      if(!ice&&(o.catInterest||o.socialUntil>clock))continue;
      let vx=o.vx||0,vy=o.vy||0;
      if(ice){
        if(!o.onIce){const mx=o.motionVx??vx,my=(o.motionVy??vy)/cemeteryYScale(o.x,o.y);o.iceHeading=o.travelSpeed>0?Math.atan2(my,mx):Math.atan2(vy,vx);o.iceSpeed=o.travelSpeed>0?Math.hypot(mx,my):Math.hypot(vx,vy);o.onIce=true;say('I CANNOT TURN!',o,1.8);}
        if(Math.sin(o.iceHeading)>S.physics.downhillCosMinimum)o.iceSpeed=Math.min(S.physics.iceTopSpeed*endlessSpeedScale(o),o.iceSpeed+S.physics.iceAcceleration*endlessSpeedScale(o)*dt);
        vx=Math.cos(o.iceHeading)*o.iceSpeed;vy=Math.sin(o.iceHeading)*o.iceSpeed;
        // NPCs obey the same steering lock as the player, including when frightened.
        moveSkier(o,vx,vy,elapsed,collisionGrid,true);
        continue;
      }
      if(o.onIce){o.onIce=false;o.vx=Math.cos(o.iceHeading)*o.iceSpeed;o.iceCoastVy=Math.sin(o.iceHeading)*o.iceSpeed;vx=o.vx;}
      if(o.fearUntil>clock&&o.threat&&!o.threat.dead&&(courseCreature(o.threat,o.x,o.y)||!humanArea(o.x,o.y))){
        const dx=o.x-o.threat.x,dy=o.y-o.threat.y,len=Math.hypot(dx,dy)||1;
        const scale=endlessSpeedScale(o);vx=clamp(dx/len*A.npcFleeSpeed,-A.npcFleeLateralSpeed,A.npcFleeLateralSpeed)*scale;vy=Math.max(A.npcFleeSpeed*.45,dy/len*A.npcFleeSpeed)*scale;
        o.skiLaneX=o.x;o.nextSkiTurn=0;
      }else{
        if(humanArea(o.x,o.y)&&!courseCreature(o.threat,o.x,o.y)){o.fearUntil=0;o.threat=null;}
        if(o.santaSleigh){const motion=sleighMotion(o,elapsed);vx=motion.vx;vy=motion.vy;}
        else if(o.rival){const motion=rivalMotion(o,elapsed);vx=motion.vx;vy=motion.vy;}
        else if(o.fast){
          const distance=Math.hypot(o.x-p.x,o.y-p.y);
          const aim=distance<K.fastAimDistance*endlessSpeedScale(o)?clamp((p.x+p.vx*K.fastAimLeadSeconds-o.x)*K.fastAimWeight,-K.fastMaxLateralSpeed*endlessSpeedScale(o),K.fastMaxLateralSpeed*endlessSpeedScale(o)):0;
          vx=o.vx=ease(vx,aim,K.fastSteeringFollow,elapsed);
          if(distance<K.tauntDistance&&clock>=(o.speakAt||0)){say(pick(S.dialogue.fastTaunts),o);o.speakAt=clock+K.tauntCooldownSeconds;}
        }else if(o.type==='skier'&&vy>0){
          o.skiLaneX??=o.x;
          if(clock>=(o.nextSkiTurn||0)){
            o.skiTurn=random()<K.slowTurnChance?(random()<.5?-1:1):0;
            o.nextSkiTurn=clock+range(...K.slowTurnSeconds);
          }
          const offset=o.x-o.skiLaneX,limit=K.slowTurnMaxOffsetMetres*PX_PER_M*endlessSpeedScale(o);
          if(Math.abs(offset)>limit)o.skiTurn=-Math.sign(offset);
          vx=o.vx=ease(vx,o.skiTurn*vy*K.slowTurnLateralRatio,K.slowSteeringFollow,elapsed);
        }
      }
      if(o.iceCoastVy!==undefined){o.iceCoastVy=ease(o.iceCoastVy,vy,S.physics.turnFollow,elapsed);vy=o.iceCoastVy;if(Math.abs(o.iceCoastVy-(o.vy||0))<1)delete o.iceCoastVy;}
      if(o.npcRecoveryUntil>clock)vx=o.vx=o.npcCrashSide*Math.max(35,vy*.6);
      moveSkier(o,vx,vy,elapsed,collisionGrid,false);
    }
  }
  function updateMausoleums(){
    const p=state.p,M=S.endless.regions.cemetery.mausoleum;
    for(const m of objectGroups().mausoleums){
      if(!m.grandMausoleum||!activeCourseOwner(m))continue;
      const scale=m.encounter.scale;
      if(m.triggerAt===undefined){
        if(Math.hypot(p.x-m.x,p.y-(m.y+20))>M.noticeMetres*PX_PER_M*scale)continue;
        m.triggerAt=clock;m.nextRelease=clock+M.windupSeconds;burst(m.x,m.y,'#b8c3b0',8);beep(125,.18,'triangle');
      }
      while(m.released<m.waveSize&&clock>=m.nextRelease){
        const i=m.released++,x=m.x+(i%3-1)*12,y=m.y+2;
        entity('zombie',x,y,{arcadeRun:m.arcadeRun,encounter:m.encounter,width:[34,36,32,34][i%4],r:0,zombieRole:'wanderer',zombieState:'emerging',zombieStyle:i%4,mausoleumSpawn:m,emergeAt:clock,emergeX:x,emergeY:y,awake:true,zombieSpeedMultiplier:M.speedMultiplier,zombieBaseKmh:mix(...S.endless.regions.zombies.wandererSpeedKmh,m.encounter.difficulty)});
        m.nextRelease+=M.releaseSeconds;
      }
    }
  }
  function wakeGraveWave(origin){
    const Z=S.endless.regions.zombies,G=Z.graveWake,e=origin.encounter,scale=endlessSpeedScale(origin);
    const count=Math.round(mix(...G.count,e?.difficulty??0)),radius=G.radiusMetres*PX_PER_M*scale;
    const candidates=state.objects.filter(o=>o.type==='zombie'&&o.zombieRole==='wanderer'&&o.zombieState==='resting'&&!o.dead&&!o.eaten&&o.graveWakeAt===undefined&&o.encounter===e&&Math.hypot(o.x-origin.x,o.y-origin.y)<=radius);
    candidates.sort((a,b)=>a===origin?-1:b===origin?1:Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
    let at=Math.max(clock,e?.nextGraveWakeAt??clock);
    for(const o of candidates.slice(0,count)){o.graveWakeAt=at;at+=G.intervalSeconds;}
    if(e)e.nextGraveWakeAt=at;
  }
  function updateZombies(dt){
    if(!state.started)return;
    updateMausoleums();
    const p=state.p,Z=S.endless.regions.zombies,A=Z.ambush,contacts={};
    for(const o of objectGroups().zombies){
      if(o.type!=='zombie'||o.dead||o.eaten)continue;
      o.zombieState??='hidden';const scale=endlessSpeedScale(o);
      if(o.zombieRole==='wanderer'){
        o.zombieRushing=false;
        if(o.zombieState==='emerging'){
          const t=clamp((clock-o.emergeAt)/.5,0,1);o.x=o.emergeX+(o.emergeX-o.mausoleumSpawn.x)*t;o.y=o.emergeY+58*t;
          o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
          if(t<1)continue;
          o.zombieState='wandering';o.r=10;
        }
        if(o.zombieState==='resting'){
          o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
          if(o.graveWakeAt===undefined&&Math.hypot(o.x-p.x,o.y-p.y)<=Z.noticeMetres*PX_PER_M*scale)wakeGraveWave(o);
          if(o.graveWakeAt===undefined||clock+1e-8<o.graveWakeAt){resolveEnemyContact(o);if(state.deathTimer)return;continue;}
          o.zombieState='stirring';o.riseAt=clock;o.awake=true;delete o.graveWakeAt;delete o.worldChunk;burst(o.x,o.y,'#a5b0a0',4);
        }
        if(o.zombieState==='stirring'){
          o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
          if(clock-o.riseAt<Z.ambush.windupSeconds){resolveEnemyContact(o);if(state.deathTimer)return;continue;}
          o.zombieState='wandering';o.hideGrave=null;
        }
        if(o.feedingUntil>clock){o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;resolveEnemyContact(o);if(state.deathTimer)return;continue;}
        const distance=Math.hypot(o.x-p.x,o.y-p.y);
        if(distance<Z.noticeMetres*PX_PER_M*scale){o.awake=true;delete o.worldChunk;}
        o.wanderElapsed=(o.wanderElapsed||0)+dt;
        const cadence=distance>1200*scale?.25:distance>600*scale?1/30:0;
        if(o.wanderElapsed+1e-8<cadence)continue;
        const elapsed=o.wanderElapsed;o.wanderElapsed=0;
        if(o.awake||o.zombieRoamer)updatePreyTarget(o);
        let target;
        if(o.awake||o.divert)target=endlessPursuitTarget(o,o.divert||p);
        else {
          if(!o.wanderTarget||Math.hypot(o.x-o.wanderTarget.x,o.y-o.wanderTarget.y)<8||clock>(o.nextWander||0)){
            o.wanderTarget=o.encounter?.openCemetery?{x:o.homeX+Math.sin(clock*.5+o.phase)*70*scale,y:o.homeY+Math.cos(clock*.35+o.phase)*45*scale}:cemeteryPoint(o.encounter,clamp((o.homeAlong??0)+Math.sin(clock*.5+o.phase)*65*scale,0,o.encounter.cemeteryRoute.length));o.nextWander=clock+range(3,6);
          }
          target=o.wanderTarget;
        }
        o.zombieRushing=o.awake&&p.fall>0&&distance<Z.noticeMetres*PX_PER_M*scale;
        const speed=(o.zombieBaseKmh??Z.wandererSpeedKmh[0])*(o.zombieSpeedMultiplier??1)*scale/S.physics.hudKmhPerSpeed*(o.zombieRushing?Z.downedSpeedMultiplier:1);
        const previous={x:o.x,y:o.y};
        if(Math.hypot(target.x-o.x,target.y-o.y)>4)travel(o,Math.atan2(target.y-o.y,target.x-o.x),speed,elapsed,false,false,true,true,target,true);
        else {o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;}
        if(resolveEnemyContact(o,{ramOnly:true}))continue;
        if(consumeNearbyPrey(o,previous,S.predators.mealPauseSeconds,S.chasers.captureDistance,contacts))continue;
        resolveEnemyContact(o);if(state.deathTimer)return;continue;
      }
      if(o.zombieState==='hidden'||o.zombieState==='resting'){
        o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
        if(Math.hypot(o.x-p.x,o.y-p.y)>A.rangeMetres*PX_PER_M*scale||state.objects.some(w=>w.solidWall&&obstacleSegmentSeparation(o.x,o.y,p.x,p.y,w.ax,w.ay,w.bx,w.by)<w.r+5))continue;
        o.zombieState='rising';o.riseAt=clock;o.awake=true;delete o.worldChunk;burst(o.x,o.y,C.ice,4);beep(100,.12,'triangle',.01);
      }
      if(o.zombieState==='rising'&&clock-o.riseAt>=A.windupSeconds){
        o.zombieState='leaping';o.leapAt=clock;o.leapElapsed=0;o.leapDuration=A.leapSeconds*Z.speedKmh[0]/(o.zombieBaseKmh??Z.speedKmh[0]);
        const dx=p.x+p.vx*o.leapDuration-o.x,dy=(p.y+p.vy*o.leapDuration-o.y)/cemeteryYScale(o.x,o.y),distance=Math.hypot(dx,dy),limit=A.maxLeapMetres*PX_PER_M*scale;
        o.leapVx=dx/(o.leapDuration||1)*Math.min(1,limit/(distance||1));o.leapVy=dy/(o.leapDuration||1)*Math.min(1,limit/(distance||1));o.leapProgress=0;
      }
      if(o.zombieState==='leaping'){
        const elapsed=Math.min(dt,Math.max(0,o.leapDuration-o.leapElapsed)),speed=Math.hypot(o.leapVx,o.leapVy);
        o.leapElapsed+=elapsed;o.leapProgress=clamp(o.leapElapsed/o.leapDuration,0,1);
        if(speed)travel(o,Math.atan2(o.leapVy,o.leapVx),speed,elapsed,false,false,false,false,p,true);
        resolveEnemyContact(o);if(state.deathTimer)return;
        if(o.dead)continue;
        if(o.leapProgress>=1){o.zombieState='spent';o.landAt=clock;o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;burst(o.x,o.y,C.ice,5);}
      }else {o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;resolveEnemyContact(o);if(state.deathTimer)return;}
    }
  }
  function updateWildlife(dt){
    const p=state.p,A=S.wildlife,rabbits=[],cats=[],skis=[],hunters=[];
    for(const o of objectGroups().wildlife){const t=o.type;if(t==='rabbit'){if(!o.eaten)rabbits.push(o);}else if(t==='cat')cats.push(o);else if(t==='skier'||t==='boarder')skis.push(o);else if(t==='fox'||t==='wolf')hunters.push(o);}
    for(const o of objectGroups().animals){
      if(o.ravagerIntroFor){
        const h=o.ravagerIntroFor;
        if(!h.dead&&!h.eaten&&!h.leaving&&(h.type==='lurker'||h.wakeUntil>clock)){o.running=false;o.motionVx=o.motionVy=o.travelSpeed=0;o.nextAI=clock+1;continue;}
        delete o.ravagerIntroFor;
      }
      if(o.type==='wolf'&&activeCourseOwner(o)&&!state.started)continue;
      if(o.retiring){o.y-=A.roamSpeed*dt;o.running=true;if(o.y<viewBounds().top-100)o.eaten=true;continue;}
      if(state.endless&&o.type==='wolf'&&(o.wolfAwake||o.alertUntil>clock)&&!activeCourseOwner(o)){o.arcadeRun=state.course;o.linkedChase=true;delete o.worldChunk;}
      const linkedWolf=o.type==='wolf'&&activeCourseOwner(o)&&(o.linkedChase||o.wolfAwake||o.alertUntil>clock);
      if(linkedWolf)o.linkedChase=true;
      if(o.eaten||o.dead||o.stunnedUntil>clock||!o.animal||o.penaltyGate&&!o.wolfAwake||!linkedWolf&&Math.hypot(o.x-p.x,o.y-p.y)>A.activeRadius)continue;
      if(o.type==='bear'){resolveEnemyContact(o,{passive:true});if(o.dead)continue;}
      if(state.started&&o.type==='bear'&&(courseCreature(o,p.x,p.y)||!humanArea(o.x,o.y)&&!humanArea(p.x,p.y))&&Math.hypot(o.x-p.x,o.y-p.y)<endlessAnimalNotice(o,A.bearWakeDistance)){o.animal=false;o.type='awakened';o.r=0;state.chasers.push({kind:'bear',chaseRun:o.arcadeRun,x:o.x,y:o.y,speed:A.bearChaseSpeed,endlessBaseKmh:state.endless&&activeCourseOwner(o)?A.bearChaseSpeed*S.physics.hudKmhPerSpeed:undefined,phase:o.phase,expires:p.y+A.bearChaseDistance,talkAt:Infinity});continue;}
      if(['rabbit','fox'].includes(o.type)&&moveSocialAnimal(o,dt,hunters))continue;
      if(o.feedingUntil>clock){o.running=false;continue;}
      if(o.type==='cat'){
        if(o.socialUntil>clock&&o.socialPartner){if(Math.hypot(o.x-o.socialPartner.x,o.y-o.socialPartner.y)>30)travel(o,Math.atan2(o.socialPartner.y-o.y,o.socialPartner.x-o.x),S.villageLife.npcAnimalApproachSpeed,dt);continue;}
        if(o.ai==='flee'||o.ai==='climb'){
          if(!o.perch)o.perch=state.objects.filter(t=>['pine','fir','lodge','rental'].includes(t.type)).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
          if(o.perch){const dx=o.perch.x-o.x,dy=o.perch.y-o.y,d=Math.hypot(dx,dy);if(d>8){o.x+=dx/d*A.catFleeSpeed*dt;o.y+=dy/d*A.catFleeSpeed*cemeteryYScale(o.x,o.y)*dt;}else{o.ai='climb';o.climb=Math.min(o.perch.width*A.catClimbHeightRatio,(o.climb||0)+A.catClimbSpeed*dt);}}
          if(clock>(o.calmAt||Infinity)){o.ai='idle';o.climb=0;o.perch=null;}continue;
        }
        if(clock>o.nextAI){o.ai=random()<A.catRoamChance?'flee':'idle';o.nextAI=clock+range(...A.catRoamSeconds);o.calmAt=clock+A.catCalmSeconds;}continue;
      }
      let target=null,speed=o.type==='rabbit'?A.rabbitWalkSpeed:o.type==='bear'?A.bearRoamSpeed:A.roamSpeed;
      if(o.type==='wolf'&&(courseCreature(o,p.x,p.y)||!humanArea(p.x,p.y)&&!humanArea(o.x,o.y))&&Math.hypot(o.x-p.x,o.y-p.y)<endlessAnimalNotice(o,A.wolfAlertDistance)){for(const mate of hunters)if(mate.type==='wolf'&&!mate.dead&&mate.packId===o.packId)mate.alertUntil=clock+A.wolfAlertSeconds;}
      if(o.type==='wolf'){
        updatePreyTarget(o);
        if(o.shoreWaiting){
          const exposed=[p,...skis].some(q=>!q.eaten&&Math.hypot(q.x-o.x,q.y-o.y)<A.wolfAlertDistance&&!patchAt(q.x,q.y));
          if(!exposed&&(!o.divert||patchAt(o.divert.x,o.divert.y))){o.running=false;continue;}
          o.shoreWaiting=false;o.alertUntil=clock+A.wolfAlertSeconds;
        }
        if((o.alertUntil>clock||linkedWolf)&&(courseCreature(o,p.x,p.y)||!humanArea(p.x,p.y))){target=p;speed=o.wolfSpeedKmh?o.wolfSpeedKmh/S.physics.hudKmhPerSpeed:A.wolfPlayerChaseSpeed;}
        if(o.divert){target=o.divert;speed=A.wolfSkierChaseSpeed;}
        o.hunting=!!o.divert||o.alertUntil>clock||linkedWolf;
        o.targetSkier=target&&target!==p?target:null;
      }
      if(o.type==='fox'){
        if(clock>o.nextAI){o.hunting=random()<A.huntChance;o.nextAI=clock+range(...A.huntInterval);}
        if(o.hunting&&!target){target=rabbits.filter(r=>!r.eaten&&Math.hypot(r.x-o.x,r.y-o.y)<A.rabbitDetection).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];speed=o.type==='wolf'?A.wolfHuntSpeed:A.foxHuntSpeed;}
      }
      if(o.type==='rabbit'){
        const predator=hunters.find(q=>!q.dead&&(q.type==='fox'||q.type==='wolf')&&q.hunting&&Math.hypot(q.x-o.x,q.y-o.y)<A.rabbitFearDistance);
        if(predator){o.angle=Math.atan2(o.y-predator.y,o.x-predator.x)+Math.sin(clock*5)*.5;speed=A.rabbitFleeSpeed;}
        else if(clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(...A.rabbitTurnSeconds);}
      }else if(!target&&clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(...A.roamSeconds);}
      if(!target&&o.type==='wolf'){
        const leader=hunters.find(q=>q.type==='wolf'&&!q.dead&&q.packId===o.packId&&q.packIndex===0);
        if(leader&&leader!==o&&Math.hypot(leader.x-o.x,leader.y-o.y)>A.packFollowDistance){o.angle=Math.atan2(leader.y-o.y,leader.x-o.x);speed=A.packFollowSpeed;}
      }
      if(target){o.angle=Math.atan2(target.y-o.y,target.x-o.x);if(Math.hypot(target.x-o.x,target.y-o.y)<A.captureDistance){
        if(target===p){if(resolveEnemyContact(o)){if(state.deathTimer)return;continue;}}
        else {if(o.type==='wolf'){if(!resolveEnemyContact(o,{ramOnly:true}))eatChaserPrey(o,target,{x:o.x,y:o.y},A.feedingSeconds);continue;}target.eaten=true;target.r=0;o.divert=null;o.hunting=false;o.feedingUntil=clock+A.feedingSeconds;o.nextAI=clock+A.satedSeconds;burst(target.x,target.y,C.ice,9);say('CHOMP!',o,1.2);continue;}
      }}
      if(o.type==='wolf')speed*=endlessSpeedScale(o);
      const route=target&&o.type==='wolf'?endlessPursuitTarget(o,target):target;
      if(route)o.angle=Math.atan2(route.y-o.y,route.x-o.x);
      const previous={x:o.x,y:o.y};
      travel(o,o.angle??o.phase,speed,dt,true,false,o.type==='wolf'||o.type==='bear',o.type==='wolf'&&!!target,o.type==='wolf'?route:null);
      if(o.type==='wolf')consumeNearbyPrey(o,previous,A.feedingSeconds,A.captureDistance);
    }
    for(const o of skis){
      if(o.annoyedUntil>clock||o.fearUntil>clock||o.fast||o.onIce){o.catInterest=null;continue;}
      const cat=cats.find(c=>c.ai!=='flee'&&Math.hypot(c.x-o.x,c.y-o.y)<A.catCrowdRadius);
      if(cat){if(!o.catInterest&&random()<.01)say('Look! A tiny mountain cat!',o);o.catInterest=cat;const d=Math.hypot(cat.x-o.x,cat.y+35-o.y);if(d>A.catCrowdStandOff)travel(o,Math.atan2(cat.y+35-o.y,cat.x-o.x),A.catCrowdSpeed,dt);}
      else o.catInterest=null;
    }
  }

  function spawnPatrolWave(count=S.chasers.ambushCount.patrol){
    const p=state.p,K=S.chasers.patrolWaves;
    for(let i=0;i<count;i++){
      const lane=(i-(count-1)/2)*K.laneSpacing;
      state.chasers.push({kind:'patrol',patrolPass:true,x:p.x+lane,y:viewBounds().top-S.chasers.spawnAbove-i*S.chasers.spawnSpacing,
        vx:0,lane,passed:false,bumped:false,taunted:false,remaining:K.passLifetimeSeconds,width:42,r:12,id:random(),phase:range(0,TAU)});
    }
  }
  function updatePatrolWaves(dt){
    const penalty=state.patrolPenalty;if(!penalty)return;
    penalty.remaining-=dt;penalty.nextWave-=dt;
    if(penalty.remaining<=0){state.patrolPenalty=null;return;}
    if(penalty.nextWave<=0){spawnPatrolWave();penalty.nextWave+=S.chasers.patrolWaves.intervalSeconds;}
  }
  function updatePatrolPass(c,dt){
    const p=state.p,K=S.chasers.patrolWaves;c.remaining-=dt;
    // Aim only on approach, then commit to the pass. Never home back onto the player.
    if(c.y>=p.y-K.commitDistance)c.passed=true;
    const targetVx=c.passed?0:clamp((p.x+p.vx*K.leadSeconds+c.lane-c.x)*K.steeringFollow,-K.maxLateralSpeed,K.maxLateralSpeed);
    c.vx=ease(c.vx,targetVx,K.steeringFollow,dt);
    const vy=Math.max(topSpeed()*K.speedRatio,Math.max(0,p.vy)+K.overtakeSpeed);
    const previous={x:c.x,y:c.y};
    travel(c,Math.atan2(vy,c.vx),Math.hypot(vy,c.vx),dt,false,false,false,true);
    const distance=Math.hypot(c.x-p.x,c.y-p.y),penalty=state.patrolPenalty;
    if(!c.taunted&&distance<K.tauntDistance&&(!penalty||clock>=penalty.nextSpeech)){
      say(pick(S.dialogue.patrolTaunts),c,K.speechSeconds);c.taunted=true;
      if(penalty)penalty.nextSpeech=clock+K.speechSpacingSeconds;
    }
    if(!c.bumped&&segmentDistance(p.x,p.y,previous,c)<S.chasers.captureDistance){
      c.bumped=true;c.passed=true;
      if(!p.awaitingInput&&p.shield<=0&&p.air<=0&&!tooSlowToCrash(c)){
        crash(null,S.chasers.patrolFallSeconds);burst(p.x,p.y,C.ice,12);
        say('Should have paid for the course!',c,K.speechSeconds);
      }
    }
    if(c.y>viewBounds().bottom+K.despawnMargin)c.remaining=0;
  }

  function updateChasers(dt) {
    const p=state.p;if(!state.started)return;
    updatePatrolWaves(dt);const contacts={};
    for(const c of state.chasers){
      if(c.eaten)continue;
      if(c.patrolPass){updatePatrolPass(c,dt);contacts.index=null;continue;}
      if(c.dead||c.eaten)continue;
      if(state.endless&&!c.chaseRun&&['fast','slow','bear'].includes(c.kind)&&!c.leaving){c.chaseRun=state.course;c.expires=Infinity;}
      if(c.endlessBaseKmh!==undefined&&activeCourseOwner(c))c.speed=c.endlessBaseKmh*endlessSpeedScale(c)/S.physics.hudKmhPerSpeed;
      // Owned pursuers share linked runs; protected towns stop them, but Endless course towns do not.
      if(c.leaving||c.chaseRun&&!activeCourseOwner(c)){c.leaving=true;c.y-=c.speed*dt;continue;}
      const pursuit=!!c.chaseRun&&activeCourseOwner(c);
      if(pursuit)c.expires=Infinity;
      if(['fast','slow','bear'].includes(c.kind)&&humanArea(p.x,p.y)&&!courseCreature(c,p.x,p.y))continue;
      // Waking/waiting creatures still have physical bodies and can be rammed.
      if(resolveEnemyContact(c,{ramOnly:true}))continue;
      if(c.waiting||c.wakeUntil>clock||c.stunnedUntil>clock)resolveEnemyContact(c);
      if(c.waiting){
        if(!c.chaseRun.timingStarted)continue;
        c.waiting=false;c.wakeUntil=clock+(c.chaseRun.arcade.yetiWakeSeconds??S.arcade.wakeSeconds);c.talkAt=c.wakeUntil+S.chasers.slowTalkSeconds;
        burst(c.x,c.y,S.arcade.yetiColors[c.arcadeTier],8);
        continue;
      }
      if(c.wakeUntil>clock)continue;
      if(c.stunnedUntil>clock)continue;
      if(c.scaredUntil>clock){
        const from=c.dogFearOrigin;
        if(from)travel(c,Math.atan2(c.y-from.y,c.x-from.x),Math.min(c.speed*.3,120*endlessSpeedScale(c)),dt,false,true,true);
        else{c.motionVx=c.motionVy=c.travelSpeed=0;c.travelStamp=clock;}
        continue;
      }
      if(c.dogFearOrigin)delete c.dogFearOrigin;
      if(p.y>c.expires){c.leaving=true;c.speed*=.97;continue;}
      const feeding=c.feedingUntil>clock,previous={x:c.x,y:c.y},entryTarget=christmasYetiEntryTarget(c);
      if(!feeding&&!entryTarget&&(c.kind==='fast'||c.kind==='slow'||c.kind==='bear')){
        if(c.ravager)updateRavagerTarget(c);else updatePreyTarget(c);
      }
      const hunt=c.divert||p;
      const routeTarget=entryTarget||(c.ravager&&c.divert?hunt:endlessPursuitTarget(c,hunt)),dx=routeTarget.x-c.x,dy=routeTarget.y-c.y,len=Math.hypot(dx,dy)||1;
      const [vx,vy]=chaseVelocity(dx/len*c.speed,dy/len*c.speed);
      const lethal=['fast','slow','bear'].includes(c.kind),nx=c.x+vx*dt,ny=c.y+vy*cemeteryYScale(c.x,c.y)*dt;
      if(feeding||c.shoreLake&&patchAt(hunt.x,hunt.y)===c.shoreLake){
        c.motionVx=c.motionVy=0;c.travelSpeed=0;c.travelStamp=clock;
      }else if(pursuit){
        if(insideTown(p.x,p.y)&&!endlessTownAt(p.x,p.y))continue;
        // The course's own yetis can enter pistes and follow far into the wilderness.
        // Reuse committed avoidance turns to route around towns, houses, lakes and trees.
        travel(c,Math.atan2(dy,dx),c.speed,dt,false,true,true,true,routeTarget);
      }else{
        if(lethal&&(humanArea(p.x,p.y)||humanArea(nx,ny)))continue;
        if(lethal)travel(c,Math.atan2(dy,dx),c.speed,dt,false,true,true,true,hunt);else {c.motionFromX=c.x;c.motionFromY=c.y;c.motionFromStamp=clock;c.motionVx=vx;c.motionVy=vy*cemeteryYScale(c.x,c.y);c.travelSpeed=Math.hypot(c.motionVx,c.motionVy);c.travelStamp=clock;c.x=nx;c.y=ny;}
      }
      if(c.kind==='slow'&&clock>c.talkAt){say(pick(S.dialogue.politeYeti),c);c.talkAt=clock+S.chasers.slowTalkSeconds;}
      const contactDistance=Math.hypot(c.x-p.x,c.y-p.y);
      if(c.harmlessDog&&contactDistance>S.chasers.captureDistance*2)c.harmlessDog=false;
      if(resolveEnemyContact(c,{ramOnly:true}))continue;
      if(c.kind==='dog'||c.kind==='patrol')contacts.index=null;
      const meal=lethal&&!feeding?(c.ravager?ravagerContact(c,previous):contactPrey(c,previous,S.chasers.captureDistance,contacts.index??=preyContactIndex())):null;
      if(meal){if(c.ravager)eatRavagerPrey(c,meal,previous);else eatChaserPrey(c,meal,previous);continue;}
      if(lethal){resolveEnemyContact(c);if(state.deathTimer)break;continue;}
      if(monsterContact(c)&&p.shield<=0&&p.air<=0){
        // Slow dog contacts are harmless until separation; fast ones still tackle.
        if(c.kind==='dog'&&!p.awaitingInput){
          if(p.speed<=S.physics.walkingBumpLimit){c.harmlessDog=true;continue;}
          if(c.harmlessDog)continue;
        }
        if(!lethal&&(p.awaitingInput||tooSlowToCrash(c)))continue;
        crash(null,S.chasers.patrolFallSeconds,c.kind==='dog');announce(c.kind==='dog'?'AGGRESSIVELY LOVED':'A WORD FROM SKI PATROL',c.kind==='dog'?'Covered in slobber. Wallet intact.':'They are very disappointed.',C.red,3);for(const other of state.chasers)if(!other.patrolPass&&other.kind!=='bear'&&(!other.chaseRun||!activeCourseOwner(other)))other.expires=p.y-1;burst(p.x,p.y,C.ice,20);break;
      }
    }
    state.chasers=state.chasers.filter(c=>!c.eaten&&(!c.patrolPass||c.remaining>0)&&(!c.dead||clock<c.fadeUntil)&&!c.leaving);
  }

  function box(x,y,w,h,color) {ctx.fillStyle=gritMaterial(color);ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  const glyphs={
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
    '.':['00000','00000','00000','00000','00000','00100','00100'],',':['00000','00000','00000','00000','00100','00100','01000'],':':['00000','00100','00100','00000','00100','00100','00000'],'!':['00100','00100','00100','00100','00100','00000','00100'],'?':['01110','10001','00001','00010','00100','00000','00100'],"'":['00100','00100','01000','00000','00000','00000','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'/':['00001','00001','00010','00100','01000','10000','10000'],'·':['00000','00000','00000','00100','00000','00000','00000'],'↑':['00100','01110','10101','00100','00100','00100','00100'],'↓':['00100','00100','00100','00100','10101','01110','00100'],'←':['00000','00100','01000','11111','01000','00100','00000'],'→':['00000','00100','00010','11111','00010','00100','00000'],'×':['00000','10001','01010','00100','01010','10001','00000'],'#':['01010','01010','11111','01010','11111','01010','01010'],'@':['01110','10001','10111','10101','10111','10000','01111'],'%':['11000','11010','00010','00100','01000','01011','00011'],'(':['00010','00100','01000','01000','01000','00100','00010'],')':['01000','00100','00010','00010','00010','00100','01000'],'|':['00100','00100','00100','00100','00100','00100','00100']
  };
  const textTiles=new Map();
  function text(str,x,y,size=11,color=C.ink,align='center',weight=0) {
    str=String(str).toUpperCase().replaceAll('…','...').replaceAll('’',"'");if(!str.length)return;
    const scale=size>=14?2:1,width=(str.length*6-1)*scale,key=str+'|'+scale+'|'+color+'|'+weight;
    let tile=textTiles.get(key);
    if(!tile){
      tile=document.createElement('canvas');tile.width=width+(weight>=1?1:0);tile.height=7*scale+(weight>=2?1:0);const paint=tile.getContext('2d');paint.fillStyle=gritMaterial(color);
      let left=0;for(const char of str){const rows=glyphs[char];if(rows)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(rows[row][col]==='1')paint.fillRect(left+col*scale,row*scale,scale+(weight>=1?1:0),scale+(weight>=2?1:0));left+=6*scale;}
      if(textTiles.size>=256)textTiles.delete(textTiles.keys().next().value);textTiles.set(key,tile);
    }
    ctx.drawImage(tile,Math.round(x-(align==='center'?width/2:align==='right'?width:0)),Math.round(y-3.5*scale));
  }
  function line(x,y,xx,yy,color,width=1) {ctx.strokeStyle=gritMaterial(color);ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
  function screen(x,y) {return {x:Math.round((x-state.cam.x)*ZOOM+W/2),y:Math.round((y-state.cam.y)*ZOOM)};}
  function sprite(name,x,y,width,opts={}) {
    const a=atlas[name],img=a&&images[a[0]];if(!a||!img)return;
    width=Math.max(2,Math.round(width*(opts.ui?1:ZOOM)));
    const h=opts.height===undefined?Math.round(width*a[4]/a[3]):Math.max(2,Math.round(opts.height*(opts.ui?1:ZOOM))),key=name+':'+width+(opts.height!==undefined?':height'+h:'')+(opts.repeatMiddle?':repeat':'')+(opts.yetiTier?':yeti'+opts.yetiTier:'')+(opts.zombie?':zombie':'')+(opts.guest?':guest':'')+(opts.fast?':fast':'')+(opts.houseStyle!==undefined?':house'+opts.houseStyle:'');
    if(!spriteCache.has(key)){
      const tile=document.createElement('canvas');tile.width=width;tile.height=h;
      const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
      if(opts.repeatMiddle){
        const sourceCap=Math.min(Math.round(a[4]*1.1),Math.floor(a[3]/3)),cap=Math.min(Math.round(sourceCap*h/a[4]),Math.floor(width/3));
        t.drawImage(img,a[1],a[2],sourceCap,a[4],0,0,cap,h);
        const sourceMiddle=a[3]-sourceCap*2,span=Math.max(1,Math.round(sourceMiddle*h/a[4]));
        for(let left=cap;left<width-cap;left+=span){const n=Math.min(span,width-cap-left);t.drawImage(img,a[1]+sourceCap,a[2],sourceMiddle*n/span,a[4],left,0,n,h);}
        t.drawImage(img,a[1]+a[3]-sourceCap,a[2],sourceCap,a[4],width-cap,0,cap,h);
      }else t.drawImage(img,a[1],a[2],a[3],a[4],0,0,width,h);
      const pixels=t.getImageData(0,0,width,h),data=pixels.data;
      for(let i=0;i<data.length;i+=4){if(data[i+3]<S.render.spriteAlphaCutoff){data[i+3]=0;continue;}let nearest=exactPalette.get((data[i]<<16)|(data[i+1]<<8)|data[i+2]),distance=Infinity;
        if(!nearest)for(const rgb of paletteRGB){const d=(data[i]-rgb[0])**2+(data[i+1]-rgb[1])**2+(data[i+2]-rgb[2])**2;if(d<distance){distance=d;nearest=rgb;}}
        if(opts.zombie){const [r,g,b]=nearest;if(r>125&&g>85&&b<r*.9)nearest=[130,157,116];else if(g>r*1.1)nearest=[100,124,109];else if(r>100)nearest=[105,105,121];}
        const redCoat=nearest[0]>nearest[1]*1.5&&nearest[2]>nearest[1]*.8&&nearest[1]<105;
        if(opts.fast&&redCoat)nearest=gritClothing(nearest,S.render.fastSkierRGB);
        else if(opts.guest&&redCoat)nearest=gritClothing(nearest,S.render.guestRGB);
        const person=name.match(/^person(Yellow|Green)/);
        if(person&&redCoat)nearest=gritClothing(nearest,person[1]==='Yellow'?[192,143,63]:[62,112,79]);
        if(opts.houseStyle!==undefined&&redCoat)nearest=gritClothing(nearest,S.houseAnimation.trimRGB[opts.houseStyle%S.houseAnimation.trimRGB.length]);
        if(opts.yetiTier&&nearest[0]>145&&nearest[1]>145&&nearest[2]>145){const tint=S.arcade.yetiTints[opts.yetiTier];nearest=nearest.map((v,j)=>Math.round(v*.35+tint[j]*.65));}
        data[i]=nearest[0];data[i+1]=nearest[1];data[i+2]=nearest[2];data[i+3]=255;
      }
      t.putImageData(pixels,0,0);spriteCache.set(key,tile);
    }
    if(GRIT_TREES.has(name)&&!opts.ui&&!opts.rotate&&!opts.flip&&!opts.center&&!opts.bodyOnly&&!(opts.floors>1)&&(opts.alpha===undefined||opts.alpha===1)&&ctx.globalAlpha===1&&Number.isInteger(x)&&Number.isInteger(y)){
      drawCachedGritTree(key,name,spriteCache.get(key),x,y,width,h);return;
    }
    if(!opts.ui&&!opts.rotate)drawGritCastShadow(name,x,y,width,h);
    if(!opts.rotate&&!opts.flip&&(opts.alpha===undefined||opts.alpha===ctx.globalAlpha)&&!opts.bodyOnly&&!(opts.floors>1)){
      ctx.drawImage(spriteCache.get(key),Math.round(x)+Math.round(-width/2),Math.round(y)+(opts.center?-Math.round(h/2):-h));return;
    }
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    if(opts.rotate)ctx.rotate(opts.rotate);if(opts.flip)ctx.scale(-1,1);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;
    if(opts.bodyOnly){const crop=Math.ceil(h*.62);ctx.drawImage(spriteCache.get(key),0,0,width,crop,Math.round(-width/2),-h,width,crop);}
    else if(opts.floors>1){
      const tile=spriteCache.get(key),roof=Math.floor(h*.55),base=Math.floor(h*.87),storey=base-roof,extra=(opts.floors-1)*storey,left=Math.round(-width/2);
      ctx.drawImage(tile,0,0,width,roof,left,-h-extra,width,roof);
      for(let floor=0;floor<opts.floors;floor++)ctx.drawImage(tile,0,roof,width,storey,left,-h-extra+roof+floor*storey,width,storey);
      ctx.drawImage(tile,0,base,width,h-base,left,base-h,width,h-base);
    }else ctx.drawImage(spriteCache.get(key),Math.round(-width/2),opts.center?-Math.round(h/2):-h);
    ctx.restore();
  }
  const shadowTiles=new Map();
  function shadow(x,y,rx=15,ry=4,alpha=.11){
    const w=Math.max(3,Math.round(rx*ZOOM)),h=Math.max(2,Math.round(ry*ZOOM)),key=w+':'+h;
    let tile=shadowTiles.get(key);
    if(!tile){
      tile=document.createElement('canvas');tile.width=(w+h)*2;tile.height=h*2+1;const t=tile.getContext('2d');t.fillStyle='#758bb4';
      for(let row=-h;row<=h;row++){const half=Math.max(1,w-Math.round(Math.abs(row)*w/(h+2)));t.fillRect(w+h-half+row,h+row,half*2,1);}
      if(shadowTiles.size>=64)shadowTiles.delete(shadowTiles.keys().next().value);shadowTiles.set(key,tile);
    }
    const before=ctx.globalAlpha;ctx.globalAlpha=before*Math.min(.5,alpha*2);
    ctx.drawImage(tile,Math.round(x)-w-h,Math.round(y)-h);ctx.globalAlpha=before;
  }
  function snow() {
    box(0,0,W,H,nightSnowColor());drawSpecialAreas();
    for(const e of state.endless?.encounters||[])if(e.kind==='cemetery'){const a=screen(state.course.x-e.band,e.startY),b=screen(state.course.x+e.band,e.endY);if(b.y>0&&a.y<H){ctx.fillStyle='#e7ecf8';ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);}}
    drawGritSnow();
    for(const e of state.endless?.encounters||[])if(e.kind==='cemetery'){
      const view=viewBounds(),center=e.centerX;
      for(const y of [e.startY+100*e.scale,e.endY-100*e.scale])if(y>=view.top-60&&y<=view.bottom+60)for(const side of [-1,1]){
        const left=side<0?view.left-20:Math.max(view.left-20,center+e.band),right=side<0?Math.min(view.right+20,center-e.band):view.right+20;
        if(right<=left)continue;const a=screen(left,y),b=screen(right,y);
        paintCemeteryFence({solidWall:true},a,b,box,line);
      }
    }
    for(const o of objectGroups().plots)if(o.type==='cemeteryPlot'&&Math.abs(o.x-state.cam.x)<W/(2*ZOOM)+o.width/2+30&&o.y+o.depth/2>state.cam.y&&o.y-o.depth/2<state.cam.y+H/ZOOM)drawCemeteryPlot(o);
    drawRoads();
    for(const o of objectGroups().ground)if(o.type==='ice')drawIce(o);else if(o.type==='rugged')drawRugged(o);
    for(const o of objectGroups().ground)if(o.type==='ramp'||o.type==='mogul'||o.type==='smallHill'||o.type==='largeHill'||o.type==='logBump')drawObject(o);
    for(const o of objectGroups().terrainFeatures)if(o.type==='fallingTree'&&o.fallState!=='standing'&&o.fallState!=='fallen'){
      const a=screen(o.x,o.y),b=screen(o.x+Math.cos(o.fallAngle)*o.treeLength,o.y+Math.sin(o.fallAngle)*o.treeLength);
      line(a.x,a.y,b.x,b.y,'#9bb0ac',Math.max(2,o.r*ZOOM));
      for(let t=.15;t<1;t+=.2)box(mix(a.x,b.x,t)-1,mix(a.y,b.y,t)-1,3,3,C.snow);
    }
    const colors=['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb'];
    for(const t of state.trails){const a=screen(t.x,t.y),b=screen(t.px,t.py),offset=Math.cos(t.angle)*6*ZOOM;
      if(t.rainbow)colors.forEach((color,i)=>line(a.x+(i-2.5)*2,a.y,b.x+(i-2.5)*2,b.y,color,2));
      else{line(a.x-offset,a.y,b.x-offset,b.y,'#b9cae7',1);line(a.x+offset,a.y,b.x+offset,b.y,'#b9cae7',1);}
    }
  }
  const cemeteryTiles=new Map();
  function cemeteryTile(width,height,paint){
    const tile=document.createElement('canvas');tile.width=Math.ceil(width);tile.height=Math.ceil(height);const t=tile.getContext('2d');
    const box=(x,y,w,h,color)=>{t.fillStyle=gritMaterial(color);t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const line=(x,y,xx,yy,color,width=1)=>{t.strokeStyle=color;t.lineWidth=width;t.beginPath();t.moveTo(x,y);t.lineTo(xx,yy);t.stroke();};
    const shadow=(x,y,rx,ry)=>{t.fillStyle='rgba(41,88,106,.11)';t.beginPath();t.ellipse(x,y,rx*ZOOM,ry*ZOOM,0,0,TAU);t.fill();};
    paint(box,line,shadow);gritTextureNative(t,0,0,tile.width,tile.height,true);return tile;
  }
  function drawCemeteryFence(o){
    const x=Math.min(o.ax,o.bx),y=Math.min(o.ay,o.by);
    if(!o.fenceTile)o.fenceTile=cemeteryTile(o.width*ZOOM+12,o.depth*ZOOM+36,(box,line)=>paintCemeteryFence(o,{x:(o.ax-x)*ZOOM+6,y:(o.ay-y)*ZOOM+30},{x:(o.bx-x)*ZOOM+6,y:(o.by-y)*ZOOM+30},box,line));
    const at=screen(x,y);ctx.drawImage(o.fenceTile,at.x-6,at.y-30);
  }
  function paintCemeteryFence(o,a,b,box,line){
    if(o.solidWall){
      const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),y=a.y;
      box(left,y-25,right-left+1,27,'#44545f');box(left,y-23,right-left+1,23,'#78858a');
      for(let row=0;row<4;row++){box(left,y-22+row*6,right-left+1,1,'#526672');for(let x=left+(row%2?9:0);x<right;x+=19)box(x,y-21+row*6,1,5,'#526672');}
      box(left-1,y-28,right-left+3,4,'#dfe8e5');box(left,y-24,right-left+1,2,'#a9bcbe');box(left,y+1,right-left+1,2,'#b9c9c8');return;
    }
    const n=Math.max(1,Math.ceil(Math.hypot(o.bx-o.ax,o.by-o.ay)/28)),extra=o.perimeter?10:0;
    line(a.x,a.y-5-extra/2,b.x,b.y-5-extra/2,'#465963',2);line(a.x,a.y-11-extra,b.x,b.y-11-extra,'#465963',1);
    for(let i=0;i<=n;i++){const x=Math.round(mix(a.x,b.x,i/n)),y=Math.round(mix(a.y,b.y,i/n));if(y<-30||y>H+30||x<-20||x>W+20)continue;
      box(x,y-14-extra,1,15+extra,'#3c505a');box(x-1,y-15-extra,3,2,'#3c505a');box(x,y-17-extra,1,2,'#82928d');box(x-2,y,5,2,'#becdc5');
      if(i%4===0){box(x-1,y-13-extra,3,14+extra,'#465963');box(x-2,y-14-extra,5,2,'#b9c9c1');}
    }
  }
  function drawCemeteryPillar(o,s){drawCachedCemetery(o,s,true);}
  function drawCemeteryObject(o,s){
    drawCachedCemetery(o,s,false);
    if(o.grandMausoleum){
      const w=Math.round(o.width*ZOOM),open=o.triggerAt===undefined?0:clamp((clock-o.triggerAt)/S.endless.regions.cemetery.mausoleum.windupSeconds,0,1),half=Math.round(w*.12*(1-open)),top=s.y-w*.47,height=w*.43;
      box(s.x-w*.12,top,half,height,'#43545b');box(s.x+w*.12-half,top,half,height,'#43545b');
      if(half>3){box(s.x-half+2,top+height*.55,1,3,'#b5a46c');box(s.x+half-3,top+height*.55,1,3,'#b5a46c');}
      if(open>0){ctx.save();ctx.globalAlpha=.25+Math.sin(clock*4)*.08;box(s.x-w*.1,s.y-4,w*.2,5,'#a5bc88');ctx.restore();}
    }
  }
  function drawCachedCemetery(o,s,pillar){
    const w=Math.round(o.width*ZOOM),key=o.type+':'+w+':'+(o.style||0)+':'+!!o.entry+':'+!!o.grandMausoleum;
    let tile=cemeteryTiles.get(key);
    const width=w+24,height=Math.ceil(w*1.8)+40,x=Math.floor(width/2),y=height-16;
    if(!tile){tile=cemeteryTile(width,height,(box,line,shadow)=>{const item={...o,width:w/ZOOM},at={x,y};pillar?paintCemeteryPillar(item,at,box):paintCemeteryObject(item,at,box,shadow);});cemeteryTiles.set(key,tile);}
    ctx.drawImage(tile,s.x-x,s.y-y);
  }
  function paintCemeteryPillar(o,s,box){
    const w=Math.round(o.width*ZOOM),h=Math.round(w*1.7),x=s.x-w/2,y=s.y;
    box(x,y-h,w,h,'#667981');box(x+2,y-h+2,w-4,h-2,'#9facaa');
    for(let yy=y-h+6;yy<y;yy+=5){box(x,yy,w,1,'#81918e');box(x+(Math.round(yy)%2?3:w-4),yy-4,1,4,'#81918e');}
    box(x-2,y-h-2,w+4,3,'#e6ede5');box(x-1,y-h-5,w+2,3,'#71858b');box(x,y-h-6,w,2,'#e6ede5');box(x-2,y,w+4,2,'#d0dcd2');
    if(o.entry){box(s.x-2,y-h-13,4,7,'#435861');box(s.x-1,y-h-12,2,4,'#d8ba78');}
  }
  function drawCemeteryPlot(o){
    const points=o.plotCorners??[{x:o.x-o.width/2,y:o.y-o.depth/2},{x:o.x+o.width/2,y:o.y-o.depth/2},{x:o.x+o.width/2,y:o.y+o.depth/2},{x:o.x-o.width/2,y:o.y+o.depth/2}];
    ctx.fillStyle='#d9e3f4';ctx.beginPath();points.forEach((p,i)=>{const a=screen(p.x,p.y);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);});ctx.closePath();ctx.fill();
  }
  function paintCemeteryObject(o,s,box,shadow){
    const w=Math.round(o.width*ZOOM),x=s.x,y=s.y;
    shadow(x,y,o.type==='grave'?16:38,4);
    if(o.grandMausoleum){
      shadow(x,y,o.width*.52,8);
      const left=x-w/2,top=y-w*.96;
      box(left-7,y+3,w+14,4,'#81918e');box(left-11,y+7,w+22,3,'#cbd7d0');
      box(left,top+23,w,w*.96-23,'#5c6c79');box(left+5,top+27,w-10,w*.96-31,'#a4b4b4');
      for(let row=0;row<8;row++){
        const yy=top+32+row*10;box(left+7,yy,w-14,1,'#829592');
        for(let xx=left+10+(row%2)*10;xx<left+w-8;xx+=22)box(xx,yy-8,1,8,'#8fa19e');
      }
      for(let i=0;i<7;i++){box(left-4+i*9,top+20-i*3,w+8-i*18,4,'#687b85');box(left-3+i*9,top+19-i*3,w+6-i*18,2,'#dce6df');}
      for(const side of [-1,1]){const cx=x+side*w*.38;box(cx-5,top+26,10,w*.96-26,'#637983');box(cx-3,top+28,6,w*.96-30,'#c1ccc5');box(cx-7,top+25,14,3,'#dfe7dc');box(cx-7,y-3,14,4,'#dfe7dc');}
      box(x-w*.16,y-w*.51,w*.32,w*.49,'#60747b');box(x-w*.12,y-w*.47,w*.24,w*.43,'#233c45');
      box(x-6,top+26,12,14,'#617c7d');box(x-4,top+28,8,10,'#a5b992');box(x-1,top+26,2,14,'#6b7e7d');box(x-6,top+32,12,2,'#6b7e7d');
      for(const side of [-1,1]){const lx=x+side*w*.26;box(lx-3,y-w*.37,6,9,'#405660');box(lx-2,y-w*.36,4,6,'#d6ba78');box(lx-1,y-w*.4,2,3,'#607780');}
      box(x-4,top-9,8,10,'#647a80');box(x-10,top-6,20,3,'#647a80');box(x-3,top-10,6,2,'#dce6df');return;
    }
    if(o.type==='grave'){
      const h=Math.round(w*1.12),left=x-Math.round(w/2),top=y-h,stone=o.style===1?'#a9b7bb':'#b9c7c5';
      box(left-2,y+1,w+4,Math.round(w*.8),'#bbc9bf');box(left,y+3,w,Math.round(w*.65),'#d2ddd2');
      if(o.style===3){box(x-3,top-5,6,h+5,'#748890');box(x-2,top-6,4,3,'#e4ebe4');box(x-6,y-3,12,3,stone);box(x-1,top+2,1,8,'#a8bab3');}
      else if(o.style===4){box(x-2,top-3,4,4,stone);box(x-3,top+2,6,h-2,stone);box(left-2,top+3,4,5,'#81969a');box(x+4,top+3,4,5,'#81969a');box(x-4,y-2,8,2,'#e4ebe4');}
      else if(o.style===5){box(left,top+8,w,h-8,'#748890');box(left+1,top+7,w-2,3,stone);box(x-3,top+1,6,6,'#91a5a5');box(x-4,top,8,2,'#e4ebe4');box(left+2,y-3,w-4,1,'#bac9c1');}
      else if(o.style===2){box(x-2,top,4,h,'#6c7e89');box(left,top+4,w,4,'#6c7e89');box(x-1,top+1,2,h-2,stone);box(left+1,top+5,w-2,2,stone);box(left,top+3,w,1,'#eef3ed');}
      else {box(left,top+3,w,h-3,'#6c7e89');box(left+2,top,w-4,3,'#6c7e89');box(left+1,top+4,w-2,h-5,stone);box(left+3,top+1,w-6,4,stone);box(left+2,top+2,w-4,2,'#edf3ed');box(x-1,top+6,2,5,'#7c8d96');box(x-3,top+7,6,1,'#7c8d96');box(left+3,y-4,w-6,1,'#91a5ab');if(o.style===1){box(x+2,top+4,1,3,'#6c7e89');box(x+1,top+7,1,3,'#6c7e89');}}
      box(left-1,y,w+2,2,'#dbe6df');
    }else{
      const left=x-w/2,h=Math.round(w*.9),top=y-h;
      box(left,top+8,w,h-8,'#657482');box(left+2,top+9,w-4,h-10,'#afbfbe');
      for(let row=0;row<4;row++)box(left+row*3,top+6-row*2,w-row*6,2,'#73848e');
      box(left+3,top+4,w-6,2,'#e6eeea');box(left+7,top+1,w-14,2,'#e6eeea');
      box(left+4,top+11,3,h-12,'#81939d');box(left+w-7,top+11,3,h-12,'#81939d');
      box(x-5,top+17,10,h-18,'#354855');box(x-4,top+15,8,3,'#354855');box(x+2,top+20,1,2,'#8f9f97');
      box(left-2,y,w+4,3,'#c5d3ce');box(left-4,y+3,w+8,2,'#e2eae3');
    }
  }
  const zombieTiles=new Map();
  function zombieTile(style,frame,role='wanderer',fast=false){
    const key=role+':'+style+':'+frame+':'+fast;if(zombieTiles.has(key))return zombieTiles.get(key);
    const tile=document.createElement('canvas'),crawl=style===4;tile.width=crawl?24:18;tile.height=crawl?13:24;
    const t=tile.getContext('2d'),px=(x,y,w,h,c)=>{t.fillStyle=gritMaterial(c);t.fillRect(x,y,w,h);},ink='#334a4d',skin=['#91a77b','#8b9e88','#8c9b77','#a1aea0','#91a797'][style],coat=['#786273','#5c7466','#788a85','#9baba3','#776e58'][style];
    if(frame===4||frame===5){
      const chew=frame-4;
      if(crawl){
        px(2,6,14,5,ink);px(3,6,11,3,coat);px(1,10,8,3,ink);
        px(14,3+chew,8,7,ink);px(15,3+chew,6,5,skin);px(17,4+chew,2,1,ink);
        px(18,7+chew,4,1+chew,ink);px(19,7+chew,1,1,'#e1d8ba');
        px(10,9,8,2,skin);px(17,10,5,2,skin);
      }else{
        // Bent knees, a forward head and hands lifted to the jaw: a small, readable chomp.
        px(3,19,6,4,ink);px(10,19,5,3,ink);px(2,22,7,2,ink);px(11,22,5,2,ink);
        px(4,11,10,9,ink);px(5,11,8,8,coat);px(5,17,4,2,skin);
        px(7+chew,6+chew,9,9,ink);px(8+chew,7+chew,7,6,skin);
        px(9+chew,8+chew,2,1,ink);px(13+chew,8+chew,2,1,ink);
        px(11+chew,12+chew,5,1+chew,ink);px(12+chew,12+chew,1,1,'#e1d8ba');
        px(2,14+chew,5,3,coat);px(5,14+chew,5,2,skin);
        px(12,16,5,3,coat);px(13,14+chew,4,2,skin);
        if(style===0){px(7+chew,5+chew,8,3,'#526477');px(6+chew,7+chew,11,1,'#526477');}
        if(style===1){px(6+chew,5+chew,11,3,'#645f50');px(9+chew,4+chew,6,2,'#645f50');}
        if(style===2){px(7+chew,6+chew,9,2,'#8c9b77');px(7,12,2,5,'#77725c');}
        if(style===3){px(6+chew,5+chew,11,3,'#bdc7ba');px(6+chew,8+chew,2,7,'#bdc7ba');px(4,17,10,3,'#a8b7aa');}
      }
      if(fast)px(crawl?18:10+chew,crawl?4+chew:8+chew,1,1,'#d8e8a1');
      gritTextureNative(t,0,0,tile.width,tile.height);zombieTiles.set(key,tile);return tile;
    }
    if(role==='ambusher'){
      tile.width=22;tile.height=24;const bone='#d7d0b2',shade='#a9ae9c',dark='#3b4b50';
      if(frame===2){
        px(2,11,8,8,dark);px(3,11,6,6,bone);px(4,13,2,2,dark);px(7,13,2,2,dark);px(5,17,4,1,dark);
        px(10,16,8,2,bone);px(11,18,1,3,shade);px(14,18,1,3,shade);px(17,18,1,3,shade);px(9,21,8,1,bone);px(17,21,4,2,bone);px(8,20,2,3,bone);
      }else{
        const crouch=frame===3?4:0,head=frame===1?1:2+crouch;
        px(7,head,8,8,dark);px(8,head,6,7,bone);px(8,head+2,2,2,dark);px(12,head+2,2,2,dark);px(10,head+4,1,2,dark);px(9,head+6,4,1,dark);
        px(10,head+8,2,8,bone);for(let i=0;i<3;i++){px(6,head+8+i*2,11,1,bone);px(6,head+9+i*2,1,1,shade);px(16,head+9+i*2,1,1,shade);}
        px(7,head+15,9,2,bone);
        if(frame===1){px(3,7,2,7,bone);px(1,5,4,2,bone);px(18,6,2,7,bone);px(18,4,4,2,bone);px(5,18,2,4,bone);px(2,21,5,2,bone);px(15,18,2,4,bone);px(16,22,5,2,bone);}
        else {px(4,head+9,2,7,bone);px(2,head+15,4,1,bone);px(17,head+9,2,6,bone);px(17,head+14,4,1,bone);px(7,head+17,2,Math.max(1,5-crouch),bone);px(14,head+17,2,Math.max(1,5-crouch),bone);px(5,23,5,1,shade);px(14,23,5,1,shade);}
      }
      gritTextureNative(t,0,0,tile.width,tile.height);zombieTiles.set(key,tile);return tile;
    }
    if(frame===2||frame===3){
      const raised=frame===3?3:0,coatColor=['#786273','#5c7466','#77725c','#9baba3'][style%4];
      px(4,7-raised,8,8,ink);px(5,7-raised,6,6,skin);px(5,9-raised,2,1,ink);px(9,9-raised,2,1,ink);px(7,12-raised,3,1,'#53615b');
      px(3,15-raised,11,6+raised,ink);px(4,15-raised,9,5+raised,coatColor);px(2,17-raised,3,4,skin);px(12,16-raised,4,3,skin);
      px(6,21,10,2,ink);px(13,22,5,2,ink);px(3,22,6,2,'#53615b');
      if(style===0){px(3,6-raised,10,2,'#526477');px(6,4-raised,6,3,'#526477');}
      if(style===1){px(3,6-raised,10,2,'#645f50');px(5,4-raised,7,3,'#645f50');}
      if(style===3){px(2,5-raised,12,3,'#bdc7ba');px(2,8-raised,2,10,'#bdc7ba');}
      gritTextureNative(t,0,0,tile.width,tile.height);zombieTiles.set(key,tile);return tile;
    }
    if(crawl){
      px(2,5,14,6,ink);px(3,5,12,4,coat);px(3,10,7,2,'#4d625c');px(frame?0:2,11,6,2,ink);
      px(15,2,7,7,ink);px(16,2,5,5,skin);px(18,3,2,1,'#293b3b');px(19,6,3,1,'#293b3b');
      px(12,8,7,3,skin);px(frame?18:16,10,6,2,skin);px(7,5,2,2,'#a2ac94');
    }else{
      const lean=style===0?frame:0,bob=style===1?frame:0;
      px(5+lean,2+bob,8,8,ink);px(6+lean,3+bob,6,6,skin);px(6+lean,5+bob,2,1,'#293b3b');px(10+lean,5+bob,2,1,'#293b3b');px(8+lean,8+bob,3,1,'#53615b');
      px(4,10+bob,10,9,ink);px(5,10+bob,8,8,coat);px(6,18,3,5-frame,ink);px(11,18,3,4+frame,ink);px(4,22-frame,5,2,ink);px(10,22,5,2,ink);
      px(1,11+frame,5,3,coat);px(0,13+frame,3,2,skin);px(12,12-frame,5,3,coat);px(15,14-frame,3,2,skin);
      if(style===0){px(6+lean,1,7,3,'#526477');px(4+lean,3,10,2,'#526477');px(7,10,2,7,'#a38b6c');px(6,16,3,2,skin);}
      if(style===1){px(4,1+bob,11,3,'#645f50');px(6,0+bob,7,2,'#645f50');px(7,10,4,8,'#4b5b57');px(13,8,1,15,'#927e5d');px(11,20,5,4,'#778e92');px(12,20,3,1,'#bdcac1');}
      if(style===2){px(5,2,9,7,'#8c9b77');px(6,4,2,1,ink);px(11,4,2,1,ink);px(4,11,10,7,'#77725c');px(6,16,2,3,'#8c9b77');px(11,14,3,2,'#8c9b77');}
      if(style===3){px(3,1,12,3,'#bdc7ba');px(3,4,2,9,'#bdc7ba');px(13,4,2,12,'#829891');px(4,14,10,6,'#a8b7aa');px(3,19,4,3,'#a8b7aa');px(9,19,5,2+frame,'#a8b7aa');px(7,13,1,4,'#6d8882');}
    }
    if(fast){const lean=style===0?frame:0,bob=style===1?frame:0;px(6+lean,style===2?4:5+bob,2,1,'#d8e8a1');px(style===2?11:10+lean,style===2?4:5+bob,2,1,'#d8e8a1');px(6,10,6,2,'#8a5267');}
    gritTextureNative(t,0,0,tile.width,tile.height);zombieTiles.set(key,tile);return tile;
  }
  function drawZombie(o,s){
    if(!o.dead&&o.feedingUntil>clock){drawZombieFeeding(o,s);return;}
    const resting=['hidden','resting'].includes(o.zombieState)&&!o.dead,stirring=['rising','stirring'].includes(o.zombieState)&&!o.dead,leaping=o.zombieState==='leaping'&&!o.dead;
    const walkRate=Math.min(10,2*(o.zombieBaseKmh??S.endless.regions.zombies.wandererSpeedKmh[0])/5*(o.zombieRushing?2:1)*(o.mausoleumSpawn?2:1));
    const role=o.zombieRole??'ambusher',frame=resting||role==='ambusher'&&o.zombieState==='spent'?2:stirring?(clock-o.riseAt<S.endless.regions.zombies.ambush.windupSeconds*.5?2:3):leaping?1:role==='wanderer'&&o.travelSpeed>1?Math.floor(clock*walkRate+o.phase)%2:0;
    const tile=zombieTile(o.zombieStyle??0,frame,role,!!o.mausoleumSpawn),width=Math.round(o.width*ZOOM),height=Math.round(width*tile.height/tile.width),lift=leaping?Math.sin((o.leapProgress||0)*Math.PI)*S.endless.regions.zombies.ambush.heightWorld*ZOOM:0;
    shadow(s.x,s.y,resting?14:10,3);ctx.save();ctx.translate(s.x,s.y-lift);if(!o.dead&&(o.zombieRushing||o.mausoleumSpawn)&&o.travelSpeed>1)ctx.translate(0,Math.floor(clock*8)%2?-1:0);if((o.motionVx||o.leapVx||0)<-2)ctx.scale(-1,1);
    if(o.zombieState==='emerging')ctx.globalAlpha=.35+.65*clamp((clock-o.emergeAt)/.5,0,1);
    if(o.dead||o.stunnedUntil>clock)ctx.rotate(Math.PI/2);ctx.drawImage(tile,-Math.round(width/2),-height,width,height);ctx.restore();
  }
  function drawZombieFeeding(o,s,worldWidth=o.width||34){
    const chew=Math.floor(clock*7+(o.phase||0))%2,tile=zombieTile(o.zombieStyle??0,4+chew,'wanderer',!!o.mausoleumSpawn);
    const width=Math.round(worldWidth*ZOOM),height=Math.round(width*tile.height/tile.width);
    shadow(s.x,s.y,12,3);ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y));
    if((o.motionVx||0)<-2)ctx.scale(-1,1);
    ctx.drawImage(tile,-Math.round(width/2),-height,width,height);ctx.restore();
  }
  function drawTransitionLake(o){
    const g=lakeGeometry(o),s=screen(o.x,o.y);
    ctx.save();ctx.translate(s.x,s.y);ctx.beginPath();g.points.forEach((p,i)=>i?ctx.lineTo(p[0]*ZOOM,p[1]*ZOOM):ctx.moveTo(p[0]*ZOOM,p[1]*ZOOM));ctx.closePath();
    ctx.fillStyle='#a6bce5';ctx.fill();ctx.strokeStyle='#e2eeeb';ctx.lineWidth=4;ctx.stroke();ctx.clip();
    const view=viewBounds(),top=Math.max(-o.ry,(view.top-o.y)),bottom=Math.min(o.ry,view.bottom-o.y);
    for(let y=Math.floor(top/170)*170;y<bottom;y+=170){ctx.strokeStyle=(Math.round(y/170)%3)?'#c8d7ef':'#8fa8d4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-o.rx*ZOOM,y*ZOOM);ctx.lineTo(-o.rx*.2*ZOOM,(y+18)*ZOOM);ctx.lineTo(o.rx*.45*ZOOM,(y-12)*ZOOM);ctx.lineTo(o.rx*ZOOM,(y+8)*ZOOM);ctx.stroke();}
    for(let row=Math.floor(top/420);row*420<bottom;row++){
      const x=Math.sin(row*2.37)*o.rx*.18,y=row*420;ctx.strokeStyle='#dde6f8';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo((x-85)*ZOOM,(y-60)*ZOOM);ctx.lineTo(x*ZOOM,y*ZOOM);ctx.lineTo((x-28)*ZOOM,(y+85)*ZOOM);ctx.lineTo((x+55)*ZOOM,(y+175)*ZOOM);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x*ZOOM,y*ZOOM);ctx.lineTo((x+130)*ZOOM,(y+40)*ZOOM);ctx.lineTo((x+205)*ZOOM,(y+18)*ZOOM);ctx.stroke();
    }
    ctx.restore();
  }
  function drawIce(o){
    if(o.transitionLake){drawTransitionLake(o);return;}
    const s=screen(o.x,o.y),g=lakeGeometry(o),r=g.radius*ZOOM;
    if(s.x+r<0||s.x-r>W||s.y+r<0||s.y-r>H)return;
    if(!o.iceTile){
      // Canvas rasterizes the exact shoreline/islands once. Avoid hundreds of thousands
      // of JS polygon queries when a fast descent brings a new lake into view.
      const small=document.createElement('canvas'),size=Math.ceil(r+4),center=(r+4)/2;
      small.width=small.height=size;const t=small.getContext('2d');t.beginPath();
      for(const shape of [g.points,...g.holes]){for(let i=0;i<shape.length;i++){const x=center+shape[i][0]*ZOOM/2,y=center+shape[i][1]*ZOOM/2;if(i)t.lineTo(x,y);else t.moveTo(x,y);}t.closePath();}
      t.lineJoin='round';t.strokeStyle='#cbdedb';t.lineWidth=4;t.stroke();t.fillStyle='#8faed9';t.fill('evenodd');
      t.save();t.clip('evenodd');t.strokeStyle='#bccdea';t.lineWidth=10;t.stroke();t.strokeStyle='#e7f2e9';t.lineWidth=3;t.stroke();
      // Muted depth bands, broken fractures and tiny highlights remain crisp at game zoom.
      for(let row=9;row<size;row+=13){
        t.fillStyle=row%3?'#98b7de':'#a3bfe4';t.fillRect(0,row,size,1);
      }
      for(let crack=0;crack<3;crack++){
        const start=center+(crack-1)*o.ry*ZOOM*.18;t.beginPath();
        for(let x=2;x<size;x+=8){const y=start+Math.sin(x*.065+o.phase+crack)*3+(Math.floor(x/24)%3)*1.5;if(x===2)t.moveTo(x,y);else t.lineTo(x,y);}
        t.strokeStyle=crack%2?'#c8d9f3':'#7396c3';t.lineWidth=.65;t.stroke();
      }
      t.fillStyle='#e3edfc';for(let i=0;i<64;i++){const x=(i*137+Math.floor(o.phase*11))%size,y=(i*73+Math.floor(o.phase*17))%size;t.fillRect(x,y,i%5?1:2,.6);}
      t.restore();
      const tile=document.createElement('canvas');tile.width=tile.height=size*2;const paint=tile.getContext('2d');paint.imageSmoothingEnabled=false;paint.drawImage(small,0,0,size*2,size*2);o.iceTile=tile;
    }
    ctx.drawImage(o.iceTile,s.x-r-4,s.y-r-4);
  }
  // Small, crisp snowdrift assets share the existing hill footprint and ground layer.
  function drawHill(o,s){
    const big=o.type==='largeHill',img=images[big?'hillLarge':'hillSmall'];if(!img)return;
    const width=Math.max(1,Math.round(o.width*ZOOM)),height=Math.round(width*img.height/img.width);
    ctx.drawImage(grittyHillTile(big,img.height/img.width),Math.round(s.x-width/2),Math.round(s.y-height*.65),width,height);
  }
  // Cached, pixel-snapped churned snow. The edge uses the actual slow-zone polygon.
  function drawRugged(o){
    const s=screen(o.x,o.y),g=o.lake||lakeGeometry(o),r=Math.ceil(g.radius*ZOOM);
    if(s.x+r<0||s.x-r>W||s.y+r<0||s.y-r>H)return;
    if(!o.ruggedTile){
      const tile=document.createElement('canvas');tile.width=tile.height=r*2+4;
      const t=tile.getContext('2d'),offset=r+2;
      const inside=(x,y)=>polygonContains(g.points,x/ZOOM,y/ZOOM)&&!g.holes.some(h=>polygonContains(h,x/ZOOM,y/ZOOM));
      const pixel=(x,y,color)=>{if(inside(x,y)){t.fillStyle=gritMaterial(color);t.fillRect(x+offset,y+offset,1,1);}};
      for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(inside(x,y)){
        const edge=!inside(x-2,y)||!inside(x+2,y)||!inside(x,y-2)||!inside(x,y+2);
        pixel(x,y,edge?'#d6e0f2':'#e6edf9');
      }
      // Little wind-packed ridges: lit crest, grey-blue cut, broken powder clumps.
      const ridge=['..hhh....','hhhhhh...','.lllllld.','..dddd...'];
      const palette={h:'#fbfcf4',l:'#bbcae4',d:'#91a8cc'};
      for(let row=0,y=-r+3;y<r;y+=9,row++)for(let col=0,x=-r+3;x<r;x+=13,col++){
        const n=Math.abs(Math.sin(row*127.1+col*311.7+(o.phase||0))*43758.5453)%1;
        const xx=x+Math.floor(n*6)+(row%2)*4,yy=y+Math.floor(n*4);
        for(let j=0;j<ridge.length;j++)for(let i=0;i<ridge[j].length;i++){const color=palette[ridge[j][i]];if(color)pixel(xx+i,yy+j,color);}
        pixel(xx-2,yy+5,'#bbcae4');pixel(xx+4,yy+6,'#f6f9f0');
      }
      o.ruggedTile=tile;
    }
    ctx.drawImage(o.ruggedTile,s.x-r-2,s.y-r-2);
  }

  function drawLift(){
    const b=viewBounds();
    for(const route of state.liftRoutes){const low=Math.max(b.top-180,route.y0),high=Math.min(b.bottom+180,route.y1);if(low>high)continue;
      for(const side of [-1,1]){let old=null;for(let y=low;y<=high+35;y+=35){const s=screen(liftX(route,y)+side*19,y-83);if(old)line(old.x,old.y,s.x,s.y,'#85949a',1);old=s;}}
      for(let y=Math.ceil(low/S.lift.towerSpacing)*S.lift.towerSpacing;y<high;y+=S.lift.towerSpacing){const s=screen(liftX(route,y),y);box(s.x-2,s.y-47,4,48,'#78858c');box(s.x-21,s.y-45,42,3,'#536673');box(s.x-5,s.y,10,3,'#becfce');}
      for(const side of [-1,1]){const offset=(clock*S.lift.chairSpeed*side)%S.lift.chairSpacing;for(let y=Math.floor(low/S.lift.chairSpacing)*S.lift.chairSpacing+offset-S.lift.chairSpacing;y<high+S.lift.chairSpacing;y+=S.lift.chairSpacing){if(y<route.y0||y>route.y1)continue;const s=screen(liftX(route,y)+side*19,y-83);line(s.x,s.y,s.x,s.y+12,'#687981');box(s.x-8,s.y+12,16,3,'#a78257');box(s.x-7,s.y+7,14,2,'#5b737b');line(s.x-7,s.y+7,s.x-7,s.y+16,'#687981');line(s.x+7,s.y+7,s.x+7,s.y+16,'#687981');if((Math.round((y-offset)/S.lift.chairSpacing)-Math.floor(clock*S.lift.chairSpeed*side/S.lift.chairSpacing))%3!==0){box(s.x-3,s.y+1,6,4,'#35495e');box(s.x-4,s.y+5,8,7,side<0?'#b96558':'#4d9097');box(s.x-3,s.y+13,2,6,'#32444e');box(s.x+1,s.y+13,2,6,'#32444e');}}}
    }
  }
  function drawRainbow(x,y,width){
    const colors=['#db6868','#ecad65','#e7d669','#87b787','#7db5ce','#9c87b3'];
    const radius=width*ZOOM*.55;
    colors.forEach((color,i)=>{const r=radius-i*2;for(let xx=-r;xx<=r;xx+=2){const yy=Math.sqrt(Math.max(0,r*r-xx*xx));box(x+xx,y-yy,3,3,color);}});
    box(x-radius-3,y-2,10,5,'#e3ece8');box(x+radius-7,y-2,10,5,'#e3ece8');
  }

  function flag(x,y,color,side=1,good=false) {
    ctx.save();ctx.translate(x,y);ctx.scale(ZOOM,ZOOM);x=0;y=0;
    shadow(x,y,6,2);box(x-1,y-34,3,34,'#52727c');box(x-2,y-36,4,4,'#f8efe1');
    const flutter=Math.sin(clock*5+x)*2;
    ctx.fillStyle=good?'#77a581':color;ctx.beginPath();ctx.moveTo(x+side*2,y-33);ctx.lineTo(x+side*19,y-30+flutter);ctx.lineTo(x+side*18,y-18+flutter);ctx.lineTo(x+side*2,y-21);ctx.closePath();ctx.fill();box(x-3,y,7,2,'#b6cfcf');ctx.restore();
  }
  function drawEntrance(o,s) {
    const st=stages[o.stage],half=o.half*ZOOM;
    // Labels sit on the snow beside the physical start flags.
    text(['arcade','endless'].includes(o.stage)?'ARCADE':st.name.toUpperCase(),s.x,s.y-39,9,st.color);
    text(o.stage==='endless'?'DISTANCE RECORD':o.stage==='arcade'?S.arcade.stages.length+(o.summit?' STAGES':' STAGES - NO COINS'):st.fee?st.fee+' COINS':st.length+' m · FREE',s.x,s.y-24,8,st.fee?C.red:C.muted);
    flag(s.x-half,s.y,st.color,1);flag(s.x+half,s.y,st.color,-1);
    text('↓',s.x,s.y-4,10,'#96b8b3');
    if(Math.abs(o.y-state.p.y)<165&&(!o.summit||Math.abs(o.x-state.p.x)<o.half))text(o.stage==='endless'?'GATES FOR GEAR - JUMPS FOR SPEED':o.stage==='arcade'?S.arcade.stages.length+' STAGES - ONE RUN':st.sub,s.x,s.y+24,7,C.muted);
    const best=courseRecord(o.stage)?.bestSeconds;if(S.timing.enabled&&best)text('BEST '+formatTime(best),s.x,s.y+39,8,C.teal);
  }
  // Curled-up gate wolves breathe slowly until their existing wake trigger fires.
  const sleepingWolfPixels=[
    '........................',
    '....oo..........o.......',
    '...oggo........ogo......',
    '..oggggooooo..oggo......',
    '.oghhgggggggooogggo.....',
    'oghhhhhgggggggghhggo....',
    'oghhlhhhgggggghlhggo....',
    'oghlhhhgggggghhohhggo...',
    'oghhhhgggggghhllhhhoo...',
    '.oghhgggggggghllllhno...',
    '..oggggggggggghllhho....',
    '...oohhhhhhhhhhhoo......',
    '.....oooooooooo.........'
  ];
  function drawSleepingWolf(o,s){
    const colors={o:'#465765',g:'#77858d',h:'#a3adb0',l:'#d1d7d1',n:'#293e49'};
    const unit=Math.max(1,Math.round(o.width*ZOOM/24)),breath=Math.sin(clock*1.8+o.phase)>.35?1:0;
    const left=s.x-12*unit,top=s.y-12*unit;
    shadow(s.x,s.y,19,4);
    for(let row=0;row<sleepingWolfPixels.length;row++)for(let col=0;col<24;col++){
      const color=colors[sleepingWolfPixels[row][col]];if(!color)continue;
      box(left+col*unit,top+row*unit-(row<8?breath:0),unit,unit+(row===7?breath:0),color);
    }
    // A closed eyelid, tucked muzzle and drifting Zs distinguish sleep from idling.
    box(left+17*unit,top+8*unit,2*unit,unit,colors.o);
    const alpha=ctx.globalAlpha;
    for(let i=0;i<2;i++){const t=(clock*.35+o.phase/TAU+i*.5)%1;ctx.globalAlpha=alpha*Math.sin(t*Math.PI)*.75;text('Z',s.x+10+t*8,s.y-18-t*17,9,C.muted);}
    ctx.globalAlpha=alpha;
  }
  function drawPredator(o,s){
    if(o.type==='wolf'&&o.penaltyGate&&!o.wolfAwake){drawSleepingWolf(o,s);return;}
    if(o.type==='wolf'&&o.feedingUntil>clock){drawAnimalFeeding('WOLF',o,s,o.width||43);return;}
    const moving=o.running||o.hunting||o.alertUntil>clock,cycle=(clock*(moving?10:3)+o.phase)%4,runFrame=moving&&cycle<2;
    const left=Math.cos(o.angle||0)<0,flip=o.type==='wolf'&&runFrame?!left:left;
    const bob=moving?[0,-1,-2,-1][Math.floor(cycle)]:0;
    shadow(s.x,s.y,17,4);sprite(o.type+(runFrame?'Run':''),s.x,s.y+bob,o.width,{flip});
    if(o.feedingUntil>clock)text('...',s.x,s.y-22,9,C.ink);
  }
  function yetiAppearance(o){
    if(o.ravager)return {rank:1,tier:'fast',family:'Stiltwalker'};
    const tiers=['slow','fast','elite','special'];
    const rawSpeed=o.speed??(o.type==='lurker'?topSpeed()*S.wildlife.yetiWildSpeedRatio:0);
    const speed=o.endlessBaseKmh??o.yetiSpeedKmh??(rawSpeed*S.physics.hudKmhPerSpeed/endlessSpeedScale(o));
    const tier=o.arcadeTier||(speed>=90?'special':speed>=80?'elite':speed>=72?'fast':'slow');
    const rank=Math.max(tiers.indexOf(tier),speed>=90?3:speed>=80?2:0);
    return {rank,tier:tiers[rank],family:['White','Avalanche','Stalker','Stalker'][rank]};
  }
  function drawYeti(o,s,pose='run',width=58){
    const {tier,family}=yetiAppearance(o);
    const frame='Idle',gait=yetiLocomotion(o,pose);
    const feeding=pose==='feed',down=pose==='down';
    const bob=feeding?(Math.sin(clock*15)>0?1:0):pose==='idle'?(Math.sin(clock*1.7+(o.phase||0))>.65?1:0):0;
    const lean=down?0:clamp(Math.round((o.motionVx||0)/180),-1,1),x=s.x+lean,y=s.y+bob;
    if(!down)shadow(s.x,s.y,19,5);
    // Preserve the selected narrow 24x38 silhouette instead of fitting the gorilla rig.
    if(family==='Stiltwalker'){
      drawStiltwalker(o,{x,y},pose,gait);return;
    }
    if(pose==='run'&&gait.active)drawYetiStride(o,{x,y},family,tier,width,gait);
    else sprite('yeti'+family+frame,x,y,width,{yetiTier:tier,rotate:down?Math.PI/2:0});
    if(feeding){
      const w=Math.max(2,Math.round(width*ZOOM)),h=Math.round(w*34/30);
      const mouthY=Math.round(y-h+h*(family==='Stalker'?.42:.41));
      // A two-pixel bite, rather than a cheerful full-body eating bounce.
      box(x-2,mouthY,4,Math.sin(clock*15)>0?2:1,'#352c3b');
      box(x-2,mouthY,1,1,'#e8dec3');box(x+1,mouthY,1,1,'#e8dec3');
    }
  }
  function drawKnockedOut(o,s,kind){
    if(kind==='zombie'){drawZombie(o,s);return;}
    if(['bear','dog','wolf'].includes(kind))sprite(kind==='bear'?'bearRun':kind==='dog'?'dogRight':kind,s.x,s.y,kind==='bear'?60:52,{rotate:Math.PI/2});
    else drawYeti(o,s,'down',52);
    for(let i=0;i<3;i++){const a=clock*4+i*TAU/3;box(s.x+Math.cos(a)*12,s.y-17+Math.sin(a)*4,2,2,C.gold);}
  }
  function drawAnimalFeeding(cause,o,s,width){
    const chew=Math.floor(clock*12)%2,bear=cause==='BEAR';shadow(s.x,s.y,bear?25:20,4);
    sprite(bear?(chew?'bearWalkAlt':'bear'):'wolf',s.x,s.y+chew,width);
    const mouthX=s.x+(bear?12:10),mouthY=s.y-(bear?10:9)+chew;
    box(mouthX,mouthY,4,chew?2:1,'#293d43');box(mouthX+1,mouthY,1,1,'#e9e2cb');
  }
  function drawDeathAnimation(){
    const a=state.deathAnimation;if(!a)return;a.shown=true;
    const s=screen(a.x,a.y),t=3-a.remaining,yeti=a.cause==='YETI',zombie=a.cause==='ZOMBIE',width=yeti?62:zombie?40:a.cause==='BEAR'?72:54;
    const crawl=zombie&&a.actor.zombieStyle===4,biteScale=zombie?width*ZOOM/(crawl?24:18):1,biteSide=(a.actor.motionVx||0)<-2?-1:1;
    const stiltwalker=yeti&&yetiAppearance(a.actor).family==='Stiltwalker',stiltScale=ZOOM/.5;
    const stiltMouthX=stiltwalker?3*stiltScale*(a.actor.yetiGait?.flip?-1:1)+clamp(Math.round((a.actor.motionVx||0)/180),-1,1):0;
    const mouthX=s.x+(yeti?stiltMouthX:zombie?(crawl?7:4)*biteScale*biteSide:a.cause==='BEAR'?14:11),mouthY=s.y-(yeti?(stiltwalker?33*stiltScale:21):zombie?(crawl?5:10)*biteScale:9),lift=clamp(t/.8,0,1);
    // A wobbling skier, discarded skis, kicking boots and a flying hat: no gore.
    for(const side of [-1,1])line(s.x+side*10,s.y+5,s.x+side*18,s.y+9,'#b48b54',2);
    if(t<.85){sprite('fall',mix(s.x,mouthX,lift),mix(s.y,mouthY+5,lift),42*(1-lift*.35),{rotate:Math.sin(t*12)*.12});}
    if(yeti)drawYeti(a.actor,s,'feed',width);else if(zombie)drawZombieFeeding(a.actor,s,width);else drawAnimalFeeding(a.cause,a.actor,s,width);
    if(t>=.65&&t<2.4){
      const length=8*(1-clamp((t-1.1)/1.3,0,1)),kick=Math.sin(t*21)*2;
      for(const side of [-1,1]){box(mouthX+side*2,mouthY+2,2,length+kick*side,'#405664');box(mouthX+side*2-1,mouthY+2+length+kick*side,4,2,'#283e4a');}
    }
    if(t>1&&t<2.4)for(let i=0;i<3;i++){const phase=(t*3+i/3)%1;box(mouthX+(i-1)*5,mouthY-3-phase*8,2,2,'#eef4e9');}
    if(t>=2.35){const u=clamp((t-2.35)/.65,0,1),x=s.x+10+u*17,y=s.y-30-Math.sin(u*Math.PI)*15+u*25;box(x-4,y,8,3,'#b94e5b');box(x-2,y-3,5,3,'#b94e5b');box(x+1,y-5,2,2,'#f1dfb8');}
  }
  function drawBear(o,s,chasing=false){
    if(o.feedingUntil>clock){drawAnimalFeeding('BEAR',o,s,o.width||60);return;}
    const moving=o.travelStamp===clock&&o.travelSpeed>.5,run=chasing&&moving;
    const alternate=moving&&Math.floor(clock*(run?8:4)+(o.phase||0))%2;
    const frame=run?(alternate?'bearRunAlt':'bearRun'):(alternate?'bearWalkAlt':'bear');
    const flip=(o.motionVx??Math.cos(o.angle||0))<0;
    shadow(s.x,s.y,22,4);
    sprite(frame,s.x,s.y-(run&&alternate?1:0),o.width||60,{flip});
  }
  let cocoaCupTile;
  function drawCocoaPickup(o){
    if(!cocoaCupTile){
      // One native-pixel tile, enlarged with the same crisp edges as the game sprites.
      cocoaCupTile=document.createElement('canvas');cocoaCupTile.width=16;cocoaCupTile.height=15;
      const t=cocoaCupTile.getContext('2d'),b=(x,y,w,h,c)=>{t.fillStyle=gritMaterial(c);t.fillRect(x,y,w,h);};
      b(2,13,12,1,'#9b7155');b(1,12,14,1,'#fff0cc');
      b(11,4,4,6,'#72503e');b(12,5,2,4,'#f9e5b8');b(12,6,1,2,'#72503e');
      b(2,3,10,8,'#72503e');b(3,4,8,7,'#fff0cc');b(4,11,6,1,'#c59b72');
      b(3,3,8,2,'#f9d9a0');b(4,3,6,1,'#623d32');b(5,4,4,1,'#93614a');
      b(3,6,2,4,'#ffffff');b(7,7,3,2,'#c55d54');b(8,6,1,4,'#c55d54');
    }
    const at=screen(o.x,o.y+52),phase=clock*2+(o.phase||0),x=Math.round(at.x),y=Math.round(at.y-7+Math.sin(phase)*2);
    ctx.save();ctx.globalAlpha=.22;box(x-15,at.y-2,30,4,'#dbb653');ctx.globalAlpha=1;
    ctx.drawImage(cocoaCupTile,x-16,y-28,32,30);
    for(let i=0;i<3;i++){
      const rise=(clock*.65+i/3)%1,sx=Math.round(x-6+i*5+Math.sin(rise*6+i)*2),sy=Math.round(y-31-rise*14);
      ctx.globalAlpha=(1-rise)*.8;box(sx,sy,2,4,'#fff8df');box(sx+1,sy-2,2,2,'#fff8df');
    }
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2+phase*.22,sx=Math.round(x+Math.cos(angle)*24),sy=Math.round(y-15+Math.sin(angle)*18),shine=(Math.sin(phase*2+i*1.7)+1)/2;
      ctx.globalAlpha=.35+shine*.65;const arm=shine>.6?3:2;
      box(sx-arm,sy,arm*2+1,1,'#e6b741');box(sx,sy-arm,1,arm*2+1,'#e6b741');box(sx,sy,1,1,'#fffdf0');
    }
    ctx.restore();
  }
  const houseFacadeTiles=new Map();
  function houseLabelTile(label,color){
    const str=String(label).toUpperCase().replaceAll('…','...').replaceAll('’',"'"),key=str+'|1|'+color+'|0';
    if(!textTiles.has(key))text(str,-10000,-10000,7,color);return textTiles.get(key);
  }
  function houseFacadeTile(o,warm,flap){
    const name=o.houseSprite||o.type,w=Math.round(o.width*ZOOM),a=atlas[name],h=w*a[4]/a[3],style=o.houseStyle??0,floors=o.floors||1,pixelH=Math.round(h),storey=Math.floor(pixelH*.87)-Math.floor(pixelH*.55),extra=(floors-1)*storey;
    const key=[name,w,style,floors,o.cozyStyle,o.buildingKind,o.shopName,o.festival,warm,flap].join(':');
    let entry=houseFacadeTiles.get(key);if(entry){houseFacadeTiles.delete(key);houseFacadeTiles.set(key,entry);return entry;}
    const sourceKey=name+':'+w+':house'+style;
    if(!spriteCache.has(sourceKey))sprite(name,-10000,-10000,w,{ui:true,houseStyle:style});
    const base=spriteCache.get(sourceKey),tile=document.createElement('canvas');tile.width=w+24;tile.height=Math.ceil(h+extra)+30;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
    const s={x:Math.ceil(w/2)+12,y:tile.height-6},left=s.x+Math.round(-w/2);
    if(floors>1){const roof=Math.floor(pixelH*.55),bottom=Math.floor(pixelH*.87);t.drawImage(base,0,0,w,roof,left,s.y-pixelH-extra,w,roof);for(let floor=0;floor<floors;floor++)t.drawImage(base,0,roof,w,storey,left,s.y-pixelH-extra+roof+floor*storey,w,storey);t.drawImage(base,0,bottom,w,pixelH-bottom,left,s.y+bottom-pixelH,w,pixelH-bottom);}
    else t.drawImage(base,left,s.y-pixelH);
    const box=(x,y,w,h,c)=>{t.fillStyle=gritMaterial(c);t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const line=(x,y,xx,yy,c,width=1)=>{t.strokeStyle=gritMaterial(c);t.lineWidth=width;t.beginPath();t.moveTo(x,y);t.lineTo(xx,yy);t.stroke();};
    const text=(str,x,y,size,c)=>{const glyph=houseLabelTile(str,c);t.drawImage(glyph,Math.round(x-glyph.width/2),Math.round(y-3.5));};
    drawFestivalHouse(o,s,{box,line});
    for(const side of [-1,1]){box(s.x+side*w*.19-2,s.y-h*.25,4,5,warm);box(s.x+side*w*.19,s.y-h*.25,1,5,'#714a37');}
    if(o.cozyStyle===0)for(const side of [-1,1]){
      const x=s.x+side*w*.19;box(x-4,s.y-h*.25+5,9,3,'#916951');
      for(let i=-2;i<=2;i+=2){box(x+i,s.y-h*.25+3,1,3,'#668f70');box(x+i-1,s.y-h*.25+1,3,2,i?'#cf8b9e':'#e4c584');}
    }
    if(o.cozyStyle===1){line(s.x-w*.32,s.y-h*.45-extra,s.x+w*.32,s.y-h*.45-extra,'#796c59');for(let i=0;i<7;i++)box(s.x-w*.3+i*w*.1,s.y-h*.45-extra+1,2,3,i%2?'#e8b788':'#e7d4a1');}
    if(o.cozyStyle===2){const x=s.x+(o.houseSprite?w*.24:0),y=s.y-h*(o.houseSprite?.31:.14);box(x-3,y-3,6,1,'#668f70');box(x-4,y-2,1,5,'#668f70');box(x+3,y-2,1,5,'#668f70');box(x-3,y+3,6,1,'#668f70');box(x-1,y+3,3,2,'#b97877');}
    if(!o.houseSprite&&(o.buildingKind==='cafe'||o.buildingKind==='rental')){
      const y=s.y-h*.22,width=Math.round(w*.38);
      for(let x=0;x<width;x+=4){box(s.x-width/2+x,y,4,3,(x/4)%2?'#e5f0ee':style===1?'#548091':'#9b403e');box(s.x-width/2+x,y+3,4,2+flap,(x/4)%2?'#c7e0e4':'#714a37');}
    }
    if(o.buildingKind==='hotel'||o.buildingKind==='chalet'){
      const levels=o.buildingKind==='hotel'?floors:1;
      for(let floor=0;floor<levels;floor++){
        const by=s.y-h*.18-floor*storey;
        box(s.x-w*.31,by,w*.62,3,'#6c6254');box(s.x-w*.32,by-7,w*.64,2,'#a48c70');
        for(let i=0;i<7;i++)box(s.x-w*.3+i*w*.1,by-5,1,5,'#766956');
        if(floor>0)for(const side of [-1,1]){box(s.x+side*w*.19-2,by-14,5,6,warm);box(s.x+side*w*.19,by-14,1,6,'#735e58');}
      }
    }
    const label=o.shopName||{hotel:'HOTEL',inn:'INN',cafe:'CAFE',rental:'SKIS'}[o.buildingKind];
    if(label){
      const ly=s.y-h*.41-extra*.2,sw=label.length*5+6;
      box(s.x-sw/2-1,ly-7,sw+2,11,'#725f50');box(s.x-sw/2,ly-6,sw,8,'#ebe0c4');
      text(label,s.x,ly,7,'#53675f');box(s.x-sw/2-1,ly-8,sw+2,2,'#f3f7ee');
    }
    entry={tile,x:s.x,y:s.y};if(houseFacadeTiles.size>=192)houseFacadeTiles.delete(houseFacadeTiles.keys().next().value);houseFacadeTiles.set(key,entry);return entry;
  }
  const paradeBlockTiles=new Map();
  function drawParadeBlock(o,s){
    const w=Math.round(o.width*ZOOM),span=o.paradeSpan||1,across=o.paradeSpanX||1,stepX=Math.round((o.paradeStepX||0)*ZOOM),step=Math.round((o.paradeStep||0)*ZOOM),warm=(state.nightBlend||0)>.003?'#f2bc78':'#f2c98f';
    const key=[o.type,w,o.houseStyle,span,step,across,stepX,warm].join(':');let cached=paradeBlockTiles.get(key);
    if(!cached){
      const facade=houseFacadeTile(o,warm,0),a=atlas[o.type],h=Math.round(w*a[4]/a[3]),shade=gritCastShadowTile(o.type,w,h),tile=document.createElement('canvas');
      tile.width=Math.ceil(w*2+48)+(across-1)*stepX;tile.height=facade.tile.height+(span-1)*step+shade.height+8;
      const t=tile.getContext('2d'),x=Math.ceil(w/2)+16+(across-1)*stepX/2,y=tile.height-shade.height-4;t.imageSmoothingEnabled=false;
      for(let i=span-1;i>=0;i--)for(let j=0;j<across;j++){const at=y-i*step,xx=x+(j-(across-1)/2)*stepX;t.globalAlpha=.72;t.drawImage(shade,Math.round(xx-w*.48),at-2);t.globalAlpha=1;t.drawImage(facade.tile,xx-facade.x,at-facade.y);}
      cached={tile,x,y};if(paradeBlockTiles.size>=96)paradeBlockTiles.delete(paradeBlockTiles.keys().next().value);paradeBlockTiles.set(key,cached);
    }
    // Rear rows can span twelve houses; submit only the visible part of the cached strip.
    const x=Math.round(s.x)-cached.x,y=Math.round(s.y)-cached.y,left=Math.max(0,-16-x),top=Math.max(0,-16-y),right=Math.min(cached.tile.width,W+16-x),bottom=Math.min(cached.tile.height,H+16-y);
    if(right>left&&bottom>top)ctx.drawImage(cached.tile,left,top,right-left,bottom-top,x+left,y+top,right-left,bottom-top);
  }
  function drawHouse(o,s){
    if(o.paradeBoundary){drawParadeBlock(o,s);return;}
    const A=S.houseAnimation,w=o.width*ZOOM,a=atlas[o.houseSprite||o.type],h=w*a[4]/a[3],style=o.houseStyle??0;
    const floors=o.floors||1,pixelH=Math.round(Math.round(w)*a[4]/a[3]),storey=Math.floor(pixelH*.87)-Math.floor(pixelH*.55),extra=(floors-1)*storey;
    const warm=(state.nightBlend||0)>.003?'#f2bc78':Math.sin(clock*A.lampFlickerSpeed+o.phase)>.15?'#f2c98f':'#d39b61';
    const flap=!o.houseSprite&&['cafe','rental'].includes(o.buildingKind)?Math.round(Math.sin(clock*A.awningSpeed+o.phase)):0,facade=houseFacadeTile(o,warm,flap);
    drawGritCastShadow(o.houseSprite||o.type,s.x,s.y,Math.round(w),pixelH);ctx.drawImage(facade.tile,Math.round(s.x)-facade.x,Math.round(s.y)-facade.y);
    // Native-pixel accents: warm windows, smoking chimneys, shop awnings and occupied doors.
    const phase=clock+o.phase*A.doorCycleSeconds,door=phase%A.doorCycleSeconds;
    const chimneyX=s.x+w*(o.houseSprite?.24:o.type==='lodge'?.26:-.2),chimneyY=s.y-h*.94-extra;
    for(let i=0;i<A.smokePuffs;i++){
      const t=((clock/A.smokeSeconds+i/A.smokePuffs+o.phase)%1),size=2+Math.floor(t*3);
      ctx.globalAlpha=(1-t)*.32;box(chimneyX+Math.sin(t*5+o.phase)*4,chimneyY-7-t*22,size,size,'#91a5ab');
    }ctx.globalAlpha=1;
    if(o.cocoaShop){if(!o.town.cocoaClaimed)drawCocoaPickup(o);else{const at=screen(o.x,o.y+52);text('THANK YOU!',at.x,at.y+10,8,C.muted);}}
    if(door<A.doorOpenSeconds){
      const x=s.x+(o.houseSprite?w*.24:-w*.045),y=s.y-h*(o.houseSprite?.4:.17);
      box(x-2,y,8,Math.max(8,h*.16),'#463735');box(x-1,y+1,5,Math.max(6,h*.14),'#d39b61');
      box(x,y+2,3,3,'#f2c98f');box(x-1,y+5,5,5,style%2?'#548091':'#9b403e');
      box(x+4,y+4+Math.round(Math.sin(clock*7+o.phase)),2,3,'#f2c98f');
    }
    const slide=(clock+o.phase*A.snowCycleSeconds)%A.snowCycleSeconds;
    if(style===2&&slide<A.snowFallSeconds){
      const t=slide/A.snowFallSeconds;
      for(let i=0;i<5;i++)box(s.x-w*.31+i*3+t*3,s.y-h*.58-extra+t*t*(h*.58+extra),2,2,t>.85?'#c7e0e4':'#f8faf0');
    }
  }
  function drawTownDetail(o,s){
    if(o.type==='lamp'){
      box(s.x-1,s.y-26,2,26,'#375769');box(s.x-5,s.y-27,10,2,'#244451');
      box(s.x-3,s.y-25,6,6,'#714a37');box(s.x-2,s.y-24,4,4,isNight()?'#f2c98f':'#a6b9bc');box(s.x-4,s.y-29,8,2,'#e5f0ee');box(s.x-3,s.y,6,2,'#548091');return;
    }
    if(o.type==='bench'){
      box(s.x-11,s.y-11,22,3,'#976e4d');box(s.x-11,s.y-7,22,3,'#b0794c');box(s.x-12,s.y-3,24,3,'#714a37');box(s.x-9,s.y,2,4,'#375769');box(s.x+7,s.y,2,4,'#375769');box(s.x-10,s.y-12,19,1,'#e5f0ee');return;
    }
    if(o.type==='snowman'){
      box(s.x-6,s.y-10,12,9,'#c7e0e4');box(s.x-5,s.y-11,10,9,'#f8faf0');box(s.x-4,s.y-19,8,8,'#f8faf0');const hat=clock<(o.hatUntil||0)?(1-(o.hatUntil-clock)/S.villageLife.hatFlightSeconds):0,hx=hat?Math.sin(hat*Math.PI)*24:0,hy=hat?-Math.sin(hat*Math.PI)*28:0;box(s.x-5+hx,s.y-20+hy,10,2,'#375769');box(s.x-3+hx,s.y-23+hy,6,4,'#244451');box(s.x-4,s.y-12,9,2,'#9b403e');box(s.x+2,s.y-16,5,2,'#e58039');box(s.x,s.y-17,1,1,'#244451');box(s.x,s.y-7,1,1,'#244451');line(s.x-5,s.y-9,s.x-11,s.y-15,'#714a37');return;
    }
    const half=o.width*ZOOM/2;line(s.x-half,s.y-34,s.x,s.y-29,'#739391');line(s.x,s.y-29,s.x+half,s.y-34,'#739391');
    for(let i=0;i<9;i++){const x=s.x-half+i*half/4,y=s.y-34+Math.sin(i/8*Math.PI)*5,wave=Math.round(Math.sin(clock*3+o.phase+i));box(x,y,5,4+wave,['#9b403e','#548091','#d39b61'][i%3]);box(x+1,y+4+wave,3,2,['#9b403e','#548091','#d39b61'][i%3]);}
  }
  function drawTree(o,s){
    const name={spruce:'spruceTree',crooked:'crookedTree',cedar:'cedarTree',alpine:'alpineTree'}[o.treeVariant]||'pine';
    sprite(name,s.x,s.y,o.width);
  }
  function drawSkierFall(o,s){
    const elapsed=clock-o.npcFallAt,remaining=o.npcFallUntil-clock,side=o.npcCrashSide||1;
    const opts={guest:true,fast:o.fast},standing=o.type==='boarder'?'boarder':'skier',fallen=o.type==='boarder'?'boarder':'left';
    if(elapsed<.35){
      const t=elapsed/.35;sprite(standing,s.x+side*t*4,s.y+Math.sin(t*Math.PI)*-5,o.width,{...opts,rotate:side*t*1.5});
    }else if(remaining<S.skiers.getUpSeconds){
      const t=1-remaining/S.skiers.getUpSeconds;
      ctx.save();ctx.globalAlpha=1-t;sprite(fallen,s.x,s.y,o.width,{...opts,rotate:side*Math.PI/2});ctx.globalAlpha=t;
      sprite(standing,s.x,s.y+(1-t)*6,o.width,{...opts,rotate:side*(1-t)*.8});ctx.restore();
    }else{
      sprite(fallen,s.x,s.y,o.width,{...opts,rotate:side*(Math.PI/2+Math.sin(clock*2)*.035)});
      for(const n of [-1,1]){const a=clock*2+n*Math.PI;box(s.x+Math.cos(a)*7,s.y-14+Math.sin(a)*2,2,2,C.muted);}
    }
    if(o.type==='skier'&&elapsed>.35){const spread=Math.min(1,elapsed/.5);line(s.x-12*spread,s.y+2,s.x-8*spread,s.y+12,C.muted);line(s.x+9*spread,s.y,s.x+13*spread,s.y+9,C.muted);}
  }
  function drawObject(o) {
    if(state.deathAnimation?.actor===o)return;
    const s=screen(o.x,o.y);
    const margin=o.paradeSpanX?Math.max(230,(houseFootHalfWidth(o)+o.width)*ZOOM):['wideLog','logBump','cemeteryFence','areaBarrier'].includes(o.type)?Math.max(230,o.width*ZOOM/2):230,vertical=o.paradeSpan?Math.max(0,o.depth*ZOOM-230):['cemeteryFence','areaBarrier'].includes(o.type)?o.depth*ZOOM/2:0;
    if(s.x<-margin||s.x>W+margin||s.y<-80-vertical||s.y>H+230+vertical)return;
    // Ordinary bodies do not need the long-obstacle drawing margin. Keep harnesses and moving trunks broad.
    if(TIGHT_DRAW_TYPES.has(o.type)&&!o.santaSleigh){const half=(o.paradeSpanX?houseFootHalfWidth(o)*ZOOM:(o.width||40)*ZOOM*.75)+24+(GRIT_BUILDINGS.has(o.houseSprite||o.type)?12:0);if(s.x+half<0||s.x-half>W)return;}
    if(drawSeasonalProp(o,s)||drawSpecialProp(o,s))return;
    if(o.villageDetail){drawVillageDetail(o,s);return;}
    if(o.type==='encounterTitle'){text(o.encounter.title.toUpperCase(),s.x,s.y,13,C.teal);return;}
    if(o.dead){ctx.save();ctx.globalAlpha=clamp((o.fadeUntil-clock)/(o.type==='wolf'?S.wildlife.wolfFadeSeconds:S.wildlife.predatorFadeSeconds),0,1);if(o.type==='wolf')sprite('wolf',s.x,s.y,o.width,{rotate:Math.PI/2});else drawKnockedOut(o,s,o.type);ctx.restore();return;}
    if(o.npcFallUntil>clock){drawSkierFall(o,s);return;}
    if(o.fearUntil>clock)text('!',s.x,s.y-o.width*ZOOM-10,11,C.red);
    if(o.type==='ice'||o.type==='rugged'||o.type==='awakened'||o.eaten||o.collected)return;
    if(o.collectible){sprite('mushroom',s.x,s.y,o.width);const glint=(clock/S.mushroomHunt.glintSeconds+o.phase)%1;if(glint<.3){box(s.x+8,s.y-12,1,5,C.gold);box(s.x+6,s.y-10,5,1,C.gold);}return;}
    if(o.stunnedUntil>clock){drawKnockedOut(o,s,o.type);return;}
    if(o.type==='fallingTree'){
      const warning=o.fallState==='warning'?Math.sin(clock*35)*.045:0;
      sprite('fallingTree',s.x,s.y,o.width,{rotate:treeTilt(o)+warning});return;
    }
    if(o.type==='wideLog'){sprite('wideLog',s.x,s.y,o.width,{height:o.height,repeatMiddle:true,center:true});return;}
    if(o.type==='logBump'){sprite('mogul',s.x,s.y+o.r*ZOOM,o.width,{height:o.r*2});return;}
    if(o.type==='rollingSnowball'){
      if(o.rollState==='breaking'){
        const t=clamp((clock-o.breakAt)/.55,0,1);ctx.save();ctx.globalAlpha=1-t;
        sprite('rollingSnowball',s.x,s.y-o.breakRadius*ZOOM*(1-t),o.width*(1-t*.65),{rotate:o.rollAngle+t,center:true});ctx.restore();return;
      }
      shadow(s.x,s.y,o.r,o.r*.3,.15);
      const shake=o.rollState==='warning'?Math.sin(clock*30)*1.5:0;
      sprite('rollingSnowball',s.x+shake,s.y-o.r*ZOOM,o.width,{rotate:o.rollAngle,center:true});
      if(o.rollState==='warning')text('!',s.x,s.y-o.width*ZOOM-7,11,C.red);return;
    }
    if(o.type==='pine'&&o.smallPine){sprite('smallPine',s.x,s.y,o.width);return;}
    if((o.type==='pine'||o.type==='fir')&&o.treeVariant&&o.treeVariant!=='classic'){drawTree(o,s);return;}
    if(o.type==='entrance'){drawEntrance(o,s);return;}
    if(o.type==='lodge'||o.type==='rental'){drawHouse(o,s);return;}
    if(['lamp','bunting','bench','snowman'].includes(o.type)){drawTownDetail(o,s);return;}
    if(o.type==='cemeteryFence'){drawCemeteryFence(o);return;}
    if(o.type==='cemeteryPillar'){drawCemeteryPillar(o,s);return;}
    if(o.type==='cemeteryPlot')return;
    if(o.type==='grave'||o.type==='mausoleum'){drawCemeteryObject(o,s);return;}
    if(o.type==='zombie'){drawZombie(o,s);return;}
    if(o.type==='courseStart'){text(o.name.toUpperCase()+'  ·  START',s.x,s.y-22,11,C.teal);for(let x=-220;x<220;x+=20)box(s.x+x,s.y,10,2,'#a8c7bb');return;}
    if(o.type==='rainbow'){drawRainbow(s.x,s.y,o.width);return;}
    if(o.type==='smallHill'||o.type==='largeHill'){drawHill(o,s);return;}
    if(o.type==='lurker'){drawYeti(o,s,'idle',o.width);return;}
    if(o.type==='bear'){drawBear(o,s);return;}
    if(o.type==='rabbit'){sprite(o.running||Math.sin(clock*6+o.phase)>.3?'rabbitRun':'rabbit',s.x,s.y-(o.running?Math.abs(Math.sin(clock*10))*3:0),o.width,{flip:Math.cos(o.angle||0)<0});return;}
    if(o.type==='fox'||o.type==='wolf'){drawPredator(o,s);if(o.carryBreadUntil>clock)box(s.x+(Math.cos(o.angle||0)<0?-9:7),s.y-5,5,3,'#c69a63');return;}
    if(o.type==='cat'){sprite(o.ai==='climb'?'catClimb':'cat',s.x,s.y-(o.climb||0)*ZOOM,o.width,{flip:o.perch?.x<o.x});return;}
    if(o.type==='trailChoices'&&o.arcadeNext){text(o.arcadeNext<=S.arcade.stages.length?'NEXT: '+o.arcadeNext+'. '+S.arcade.stages[o.arcadeNext-1].name:'ARCADE FINISH',s.x,s.y,10,C.teal);text('KEEP SKIING DOWN THE SNOW ROAD',s.x,s.y+17,8,C.muted);return;}
    if(o.type==='trailChoices'){text('← TRAILS  ·  ALL START HERE →',s.x,s.y,10,C.teal);text('More start flags to the left and right.',s.x,s.y+17,8,C.muted);return;}

    if(o.type==='gate'){
      const a=o.checked?.6:1;ctx.globalAlpha=a;
      const color=o.gear==='sword'?S.arcade.gear.swordColor:o.color;
      flag(s.x-o.half*ZOOM,s.y,color,1,o.good);flag(s.x+o.half*ZOOM,s.y,color,-1,o.good);
      if(o.penaltyArmed)text('!',s.x,s.y-44,14,C.red);
      if(o.gear==='sword'){gearIcon('sword',s.x-o.half*ZOOM,s.y-31,2);gearIcon('sword',s.x+o.half*ZOOM,s.y-31,2);}
      if(o.checked&&!o.alternativeSkipped){if(o.good&&o.run.arcade){const fade=clamp(((o.checkedAt??clock)+2.5-clock)*1.5,0,1);if(fade>0){ctx.globalAlpha=a*fade;comboText(o.gearFull?'FULL':'+'+o.gearPercent+'% '+(o.gear==='sword'?'SWORD':'SHIELD'),s.x,s.y-15,o.comboLevel);ctx.globalAlpha=a;}}else text(o.good?'+'+S.race.gatePoints:'×',s.x,s.y-15,10,o.good?C.teal:C.red);}else if(!o.checked)text(String(o.number).padStart(2,'0'),s.x,s.y+9,8,'#8eaaa5');
      ctx.globalAlpha=1;return;
    }
    if(o.type==='finish'){
      const half=o.half*ZOOM;
      for(let x=-half,i=0;x<half;x+=8,i++){const w=Math.min(8,half-x);box(s.x+x,s.y,w,4,i%2?'#6c9698':'#e5eee4');box(s.x+x,s.y+4,w,4,i%2?'#e5eee4':'#6c9698');}
      flag(s.x-half,s.y,C.teal,1);flag(s.x+half,s.y,C.teal,-1);
      text('FINISH',s.x,s.y-31,20,C.teal);text('BETWEEN THE FLAGS',s.x,s.y+26,9,C.muted);return;
    }
    if(o.type==='villageTitle'){text(o.town.name.toUpperCase().split('').join(' '),s.x,s.y,22,C.teal);text(o.town.endlessRun?'COURSE TOWN - YETIS CAN FOLLOW':'VILLAGE  ·  PLEASE DISTURB THE PEACE QUIETLY',s.x,s.y+23,8,C.muted);return;}
    if(o.type==='liftLabel'&&o.town?.endlessRun){text('CHAIRLIFT',s.x,s.y,10,C.ink);return;}
    if(o.type==='liftLabel'){text('SUMMIT LIFT',s.x,s.y,10,C.ink);text(state.arcade?'ARCADE: KEEP SKIING DOWN':'SKI IN TO RIDE',s.x,s.y+15,8,C.muted);return;}
    const wiggle=o.roam?Math.sin(clock*6+o.phase)*1.2:0;
    if(o.type.startsWith('person')){drawPerson(o,s);return;}
    if(o.type==='skier'){sprite((o.motionVx??o.vx)<-5?'left':(o.motionVx??o.vx)>5?'right':'skier',s.x,s.y,o.width,{guest:true,fast:o.fast});if(o.rival)drawRival(o,s);if(o.fast){line(s.x-5,s.y+3,s.x-5,s.y+12,C.muted);line(s.x+5,s.y+3,s.x+5,s.y+15,C.muted);}return;}
    if(o.type==='dog'){drawDog(o,s);return;}
    if(o.type==='boarder'){sprite('boarder',s.x,s.y,o.width,{rotate:Math.sin(clock+o.phase)*.08});return;}
    sprite(o.type,s.x,s.y+wiggle,o.width,{alpha:o.flatten?.55:1});

  }
  function playerPose(){
    const p=state.p;
    if(p.fall>0)return {name:'fall',rotation:0,flip:false};
    if(p.air>0)return {name:'skier',skiAngle:p.airPose*Math.PI/3,rotation:p.airPose*.18,tuck:p.airTuck,flip:false};
    // Ice locks the real heading while controls change intent; braking also retains momentum.
    // Neither should leave a moving skier in a standing or requested-direction pose.
    if(p.awaitingInput||p.speed<=3)return {name:'still',rotation:0,flip:Math.sin(p.heading)<0};
    if(!p.onIce&&Math.cos(p.heading)<-S.physics.downhillCosMinimum)return {name:'uphill',rotation:0,flip:p.heading<0,step:Math.floor(clock*6)%2};
    const heading=Math.atan2(p.vx,p.vy),magnitude=Math.abs(heading),angle=p.onIce&&magnitude>Math.PI/2?Math.round(heading/(Math.PI/6))*Math.PI/6:magnitude<.18?0:Math.sign(heading)*(magnitude<Math.PI/4?Math.PI/6:magnitude<5*Math.PI/12?Math.PI/3:Math.PI/2);
    return {name:'skier',skiAngle:angle,rotation:0,flip:false};
  }
  function drawSlidingSkier(x,y,pose){
    const p=state.p,a=pose.skiAngle,dx=Math.sin(a),dy=Math.cos(a),nx=dy,ny=-dx;
    const slow=Math.abs(a)>Math.PI/4,frame=p.speed>15&&p.air<=0?Math.floor(clock*(slow?5:8))%2:0;
    const lean=Math.round(dx*(slow?1:3)),crouch=pose.tuck!==undefined?-pose.tuck*3:slow?-1:1,bob=crouch+frame;
    // Draw at native pixel resolution; direction changes the equipment, not the body's upright axis.
    const stroke=(x0,y0,x1,y1,color,width=1)=>{
      const count=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)))||1;
      for(let i=0;i<=count;i++)box(mix(x0,x1,i/count),mix(y0,y1,i/count),width,width,color);
    };
    ctx.save();ctx.translate(Math.round(x),Math.round(y));if(pose.rotation)ctx.rotate(pose.rotation);
    for(const side of [-1,1]){
      const skiAngle=a+side*Math.max(0,pose.tuck||0)*.48,dx=Math.sin(skiAngle),dy=Math.cos(skiAngle);
      const bx=side*nx*3,by=-4+side*ny*3;
      stroke(bx-dx*7,by-dy*7,bx+dx*8,by+dy*8,'#202b43',2);
      stroke(bx-dx*6,by-dy*6,bx+dx*7,by+dy*7,'#dce7fa');
      stroke(bx+dx*4,by+dy*4,bx+dx*7,by+dy*7,'#b8444b');
      stroke(lean+side*2,-10+bob,bx,by,'#202b43',3);
      stroke(lean+side*2,-10+bob,bx,by-1,'#2c4770');
      box(bx-1,by-1,3,2,'#244451');
      const handX=lean+side*6,handY=-13+bob;
      stroke(handX,handY,bx+side*nx*7-dx*(4+frame),by+side*ny*7-dy*(4+frame),'#60739b');
      box(bx+side*nx*7-dx*(4+frame),by+side*ny*7-dy*(4+frame),2,1,'#202b43');
    }
    sprite('skier',lean,bob,S.render.playerWidth,{bodyOnly:true});
    ctx.restore();
  }
  const gearPixels={
    shield:['011111110','122222221','122323221','122333221','122323221','122222221','012222210','001222100','000111000'],
    sword:['000000110','000001210','000012100','000121000','101210000','011100000','001110000','012001000','110000000']
  };
  function gearIcon(kind,x,y,scale=2){
    const pixels=gearPixels[kind],color=kind==='shield'?S.arcade.gear.shieldColor:S.arcade.gear.swordColor;
    for(let row=0;row<pixels.length;row++)for(let col=0;col<pixels[row].length;col++){
      const pixel=pixels[row][col];if(pixel!=='0')box(x+(col-4)*scale,y+(row-4)*scale,scale,scale,pixel==='1'?C.ink:pixel==='3'?C.gold:color);
    }
  }
  function comboText(label,x,y,level){text(label,x,y,10,S.arcade.gear.comboColors[Math.max(0,(level||1)-1)],'center',Math.max(0,(level||1)-1));}
  const gearHudTiles=new Map();
  function gearHudTile(kind,fill,ready){
    const filled=Math.round(fill*18),G=S.arcade.gear,color=kind==='shield'?G.shieldColor:G.swordColor,key=kind+':'+filled+':'+ready+':'+color;
    let tile=gearHudTiles.get(key);if(tile)return tile;
    tile=document.createElement('canvas');tile.width=tile.height=18;const t=tile.getContext('2d'),pixels=gearPixels[kind],amount=filled/18;
    const paint=(x,y,w,h,c)=>{t.fillStyle=gritMaterial(c);t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    for(let row=0;row<9;row++)for(let col=0;col<9;col++){
      const pixel=pixels[row][col];if(pixel==='0')continue;const x=col*2,y=row*2;
      t.globalAlpha=1;paint(x,y,2,2,pixel==='1'?'#acbfbb':'#dce6df');
      const height=clamp(amount*9-(8-row),0,1)*2;
      if(height>0){t.globalAlpha=ready?1:.55;paint(x,y+2-height,2,height,pixel==='1'?C.ink:pixel==='3'?C.gold:color);}
      if(ready&&pixel==='2'&&row<2){t.globalAlpha=1;paint(x,y,2,1,'#fff9d9');}
    }
    if(gearHudTiles.size>=96)gearHudTiles.delete(gearHudTiles.keys().next().value);gearHudTiles.set(key,tile);return tile;
  }
  function drawGearHUD(){
    const a=state.arcade||state.endless,G=S.arcade.gear,y=24;
    let x=(W-((G.maxShields+G.maxSwords-1)*25+14))/2;
    for(const kind of ['shield','sword']){
      const stock=a[kind+'s'],cap=kind==='shield'?G.maxShields:G.maxSwords;
      const progress=clamp(kind==='shield'?a.shieldCharge:a.swordCharge/G.swordGatesPerSword,0,1);
      for(let slot=0;slot<cap;slot++){
        const ready=slot<stock,fill=ready?1:slot===stock?progress:0;
        ctx.drawImage(gearHudTile(kind,fill,ready),Math.round(x)-8,y-8);
        x+=25;
      }
      if(kind==='sword'&&stock>cap)text('+'+(stock-cap),x-10,y+21,8,C.gold);
      x+=14;
    }
  }
  function drawGearEffect(){
    const fx=(state.arcade||state.endless)?.gearEffect||state.cocoaEffect;if(!fx||clock>=fx.until)return;
    const t=(clock-fx.start)/S.arcade.gear.effectSeconds,s=screen(state.p.x,state.p.y),G=S.arcade.gear;
    ctx.save();ctx.globalAlpha=1-t*.8;
    if(fx.kind==='shield'){
      const radius=20+t*25;for(let i=0;i<16;i++){const angle=i*TAU/16;box(s.x+Math.cos(angle)*radius,s.y-10+Math.sin(angle)*radius,3,3,G.shieldColor);}
      gearIcon('shield',s.x,s.y-15,3);text('BLOCKED!',s.x,s.y-53,10,G.shieldColor);
    }else{
      for(let i=0;i<7;i++){const angle=fx.angle-1+t*2.5-i*.09;box(s.x+Math.cos(angle)*30,s.y-12+Math.sin(angle)*30,4,4,i<3?C.gold:G.swordColor);}
      ctx.save();ctx.translate(s.x,s.y-12);ctx.rotate(fx.angle+t*2-.5);gearIcon('sword',20,0,3);ctx.restore();text('SLASH!',s.x,s.y-53,10,G.swordColor);
    }
    ctx.restore();
  }

  function drawPlayer(){
    if(state.deathAnimation||state.deathYeti&&state.deathTimer>0)return;
    const p=state.p,s=screen(p.x,p.y),jump=p.airTotal?Math.sin((1-p.air/p.airTotal)*Math.PI)*p.jumpHeight*ZOOM:0,pose=playerPose();
    shadow(s.x,s.y+7,16,4,p.air?.12:.08);
    const rough=p.onRugged&&p.air<=0&&!p.fall&&!p.awaitingInput&&p.speed>15;
    if(rough){
      const dx=Math.sin(p.heading),dy=Math.cos(p.heading),nx=dy,ny=-dx;
      for(let i=0;i<8;i++){const t=(clock*2.8+i/8)%1,side=i%2?1:-1;
        const x=s.x-dx*(5+t*18)+nx*side*(4+t*9),y=s.y-dy*(5+t*18)+ny*side*(4+t*9)-Math.sin(t*Math.PI)*4;
        box(x,y,2,2,i%3?'#fbfcf4':'#a8bfc2');
      }
      ctx.save();ctx.translate(Math.sin(clock*43),Math.round(Math.sin(clock*34)));
    }
    if(pose.skiAngle!==undefined)drawSlidingSkier(s.x,s.y+16*ZOOM-jump,pose);
    else sprite(pose.name,s.x,s.y+16*ZOOM-jump-(pose.step||0),p.fall?S.render.fallWidth:S.render.playerWidth,{rotate:pose.rotation,flip:pose.flip});
    if(rough)ctx.restore();
    if(p.fall)text('…',s.x,s.y-26,12,C.ink);
    if(p.onIce){for(let i=0;i<3;i++)line(s.x-10+i*10,s.y+15,s.x-10+i*10,s.y+28,'#a8ced7',1);}
  }

  function drawChaser(c) {
    if(state.deathAnimation?.actor===c)return;
    if(c.eaten)return;
    if(c===state.deathYeti&&state.deathTimer>0){drawYeti(c,screen(c.x,c.y),'feed',59);return;}
    if(c.dead||c.stunnedUntil>clock){ctx.save();if(c.dead)ctx.globalAlpha=clamp((c.fadeUntil-clock)/S.wildlife.predatorFadeSeconds,0,1);drawKnockedOut(c,screen(c.x,c.y),c.kind);ctx.restore();return;}
    const s=screen(c.x,c.y),bob=Math.sin(clock*(c.kind==='slow'?5:9)+c.phase)*2;
    if(c.waiting||c.wakeUntil>clock){
      drawYeti(c,s,c.waiting?'idle':'alert',56);
      text(c.waiting?'...':'!',s.x+(c.waiting?0:18),s.y-(c.waiting?28:18),c.waiting?9:15,c.waiting?C.muted:C.red);return;
    }
    if(c.scaredUntil>clock){drawYeti(c,s,c.dogFearOrigin?'run':'alert',52);text('!',s.x+15,s.y-35,12,C.gold);return;}
    if(c.feedingUntil>clock&&(c.kind==='fast'||c.kind==='slow')){drawYeti(c,s,'feed',56);return;}
    if(c.kind==='bear'){drawBear(c,s,true);return;}
    if(c.kind==='dog')drawDog(c,s,39);
    else if(c.kind==='patrol'){sprite(c.motionVx<-5?'left':c.motionVx>5?'right':'skier',s.x,s.y+bob,42,{guest:true,fast:true});line(s.x-5,s.y+3,s.x-5,s.y+12,C.muted);}
    else drawYeti(c,s,'run',c.kind==='slow'?52:59);
  }
  function drawSpeech() {
    for(const q of state.speech){const s=screen(q.object.x,q.object.y);if(s.y<-20||s.y>H+80)continue;
      const words=q.text.split(' '),lines=[''];for(const word of words){let n=lines.length-1;if((lines[n]+word).length>27)lines.push(word+' ');else lines[n]+=word+' ';}
      const width=Math.max(...lines.map(l=>l.trim().length))*6+14,height=lines.length*12+12,x=clamp(s.x-width/2,8,W-width-8),y=s.y-(q.object.width||50)*1.13*ZOOM-height-8;
      ctx.globalAlpha=clamp((q.until-clock)*3,0,1);box(x+2,y+3,width,height,'#c6d6d0');box(x,y,width,height,'#fffcef');box(clamp(s.x,x+4,x+width-8),y+height,5,4,'#fffcef');lines.forEach((l,i)=>text(l.trim(),x+width/2,y+12+i*12,9,C.ink));ctx.globalAlpha=1;
    }
  }
  // Picks the chaser named by the offscreen warning: among pursuers above the view,
  // a lethal one (yeti/bear) outranks nearer dogs, so a trailing dog can't mask the yeti.
  function pickWarningChaser(list,p){
    const nearby=state.endless?S.endless.yetis.nearbyMetres*PX_PER_M*state.endless.speedScale:Infinity;
    const unseen=list.filter(c=>!c.leaving&&!c.dead&&!c.waiting&&screen(c.x,c.y).y<75&&Math.hypot(c.x-p.x,c.y-p.y)<nearby);
    if(!unseen.length)return null;
    const lethal=unseen.filter(c=>['fast','slow','bear'].includes(c.kind));
    const pool=lethal.length?lethal:unseen;
    return pool.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);
  }
  function hud() {
    const p=state.p,run=state.course;
    ctx.fillStyle='rgba(241,246,255,.93)';ctx.fillRect(0,0,W,67);
    line(18,66,W-18,66,'#cfdfd7');
    text('FROSTLINE',20,24,12,C.ink,'left');
    if(state.endless)text('ARCADE',W-19,24,12,C.teal,'right');else if(state.arcade)text((state.arcade.practice?'PRACTICE ':'ARCADE ')+state.arcade.stage+'/'+S.arcade.stages.length,W-19,24,12,C.teal,'right');else{sprite('star',W-96,31,15,{ui:true});text(state.bank.toLocaleString(),W-19,24,15,C.ink,'right');}
    const region=run?.endless?endlessEncounterAt(p.y):null;
    const name=region?(region.festival?region.title+' / '+region.town.name:region.town?.name||region.title):run?stages[run.id].name+(p.y<run.startY?' · approach':''):state.zone.kind==='village'?state.zone.name+' Village':'Choose your first trail';
    text(name,20,48,10,C.teal,'left');
    const right=run?.endless?Math.max(0,Math.floor((state.endless.furthestY-run.startY)/PX_PER_M))+' m':run?`${Math.max(0,Math.floor((p.y-run.startY)/PX_PER_M))} / ${Math.round(stages[run.id].length)} m`:`${Math.round(S.world.summitAltitude+state.elevated-p.y/PX_PER_M)} m altitude`;
    text(right,W-20,48,10,C.muted,'right','normal');
    if(run){
      const frac=run.endless?endlessPressure((state.endless.furthestY-run.startY)/PX_PER_M).t:clamp((p.y-run.startY)/(run.endY-run.startY),0,1);box(18,64,(W-36)*frac,2,stages[run.id].color);
      const objective=run.endless?`${run.cleared} FLAGS - ${run.missed} MISSED`:run.objective==='mushrooms'?`${run.collected}/${run.totalMushrooms} MUSHROOMS (NEED ${Math.ceil(run.totalMushrooms*S.mushroomHunt.minimumFraction)})`:run.totalGates?`${run.cleared}/${run.totalGates} FLAGS${run.arcade?'':' ('+Math.round(S.race.minimumGateFraction*100)+'% MIN)'}`:'';
      text(`${run.arcade?'':run.points+' PTS  '}${objective}`,20,H-22,10,C.teal,'left');text(Math.round(Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed)+' km/h',W-20,H-22,10,C.muted,'right');
    }
    else if(state.activeTime>15){text(state.arcade?'NEXT STAGE AT THE END OF TOWN':'SKI THROUGH A GATE TO ENTER',W/2,H-23,9,C.muted);}
    if(run&&!run.arcade&&S.timing.enabled&&(run.totalGates||run.totalMushrooms)){const best=courseRecord(run.id)?.bestSeconds;text(`TIME ${formatTime(run.time)}${best?'  BEST '+formatTime(best):'  SET A BEST TIME'}`,20,H-40,10,C.ink,'left');}
    if(state.endless)text(state.endless.debug?'DEBUG VISIT '+Math.min(region?.visit??state.endless.debugVisit,S.endless.encounters.difficultyVisits)+'/'+S.endless.encounters.difficultyVisits+' - NO RECORD':'BEST '+Math.max(state.endlessRecord.distance||0,Math.floor((state.endless.furthestY-state.endless.startY)/PX_PER_M))+' m',20,H-40,10,C.ink,'left');
    if(state.arcade)text('DISTANCE '+Math.floor((state.arcade.furthestY-state.arcade.startY)/PX_PER_M)+' m  -  BEST '+(state.arcadeRecord.distance||0)+' m',20,H-40,10,C.ink,'left');
    if(!state.started||state.activeTime<10&&!run?.timingStarted){const alpha=state.activeTime>7?(10-state.activeTime)/3:1;ctx.globalAlpha=alpha;text('TAP SIDES: TURN - TAP BOTTOM: DOWN',W/2,H-(state.arcade||state.endless?155:64),11,C.ink);text('SWIPE UP/DOWN: DOWN - TWO FINGERS: JUMP',W/2,H-(state.arcade||state.endless?137:46),9,C.muted);ctx.globalAlpha=1;}
    if(p.awaitingInput&&p.fall===0){text('TAKE A BREATH.',W/2,91,12,C.teal);text('PRESS AN ARROW OR TOUCH TO SKI AGAIN',W/2,109,9,C.ink);}
    if(state.arcade||state.endless)drawGearHUD();
    if(state.cocoaShields){gearIcon('shield',26,H-63,1);text('COCOA +'+state.cocoaShields,37,H-63,9,C.teal,'left');}
    const er=state.endlessResult;
    if(er&&er.until>clock){const y=H-188;box(45,y,W-90,87,'#fbf7e9');box(45,y,3,87,C.teal);text('ARCADE RUN - '+er.distance+' m',W/2,y+20,12,C.teal);text('BEST '+er.best+' m',W/2,y+41,10,C.ink);text('SKI THROUGH ARCADE TO TRY AGAIN',W/2,y+65,9,C.teal);}
    const ar=state.arcadeResult;
    if(ar&&ar.until>clock){
      const y=H-245;box(35,y,W-70,112,'#fbf7e9');box(35,y,3,112,C.teal);
      text(ar.reason,W/2,y+18,12,C.teal);
      text('STAGE '+ar.stage+' - '+ar.name,W/2,y+39,9,C.ink);
      text(ar.distance+' m  |  '+ar.cleared+' FLAGS  |  '+ar.missed+' MISSED',W/2,y+58,9,C.ink);
      text(ar.hits+' CRASHES  |  BEST '+(state.arcadeRecord.distance||0)+' m',W/2,y+77,9,C.ink);
      text(ar.stayOnSlope?'KEEP SKIING - LIFT RETURNS TO SUMMIT':ar.ended?'SKI THROUGH ARCADE TO TRY AGAIN':'NEXT STAGE BEYOND THE VILLAGE',W/2,y+97,9,C.teal);
    }
    const result=state.results;
    if(result&&result.until>clock){
      const color=result.passed&&!result.unpaid?C.teal:C.red,y=H-207;
      ctx.globalAlpha=clamp(result.until-clock,0,1);
      box(50,y,W-100,151,'#fbf7e9');box(50,y,3,151,color);
      text(result.unpaid?'UNPAID RUN':!result.passed?'COURSE NOT COMPLETED':result.perfect?(result.collection?'FULL BASKET!':'PERFECT GATES!'):'COURSE COMPLETE',W/2,y+15,12,color);
      text(result.total?`${result.collection?'MUSHROOMS':'GATES'} ${result.cleared}/${result.total} (${(result.cleared/result.total*100).toFixed(1)}%)  MISSED ${result.missed}`:'FREESTYLE - NO GATES',W/2,y+36,9,C.ink);
      text(`CRASHES ${result.hit}  JUMPS ${result.tricks}  TIME ${formatTime(result.time)}`,W/2,y+53,9,C.ink);
      text(result.earned?`SCORE ${result.points} + FINISH ${result.bonus} + SPEED ${result.speedBonus}`:`SCORE ${result.points} - REWARD 0 COINS`,W/2,y+70,9,C.teal);
      text(`${result.earned} COINS${result.timed?'  '+(result.newBest?'NEW BEST!':result.bestSeconds?'BEST '+formatTime(result.bestSeconds):'NO QUALIFYING TIME'):''}`,W/2,y+91,9,C.teal);
      text(result.reason||'KEEP SKIING. THE COCOA IS AHEAD.',W/2,y+127,9,color);
      ctx.globalAlpha=1;
    }
    const msg=state.messages[state.messages.length-1];
    if(msg){const alpha=clamp((msg.until-clock)*2,0,1)*clamp((clock-msg.start)*5,0,1);ctx.globalAlpha=alpha;const width=Math.min(W-18,Math.max(msg.title.length*6,msg.detail.length*6)+26),x=(W-width)/2;box(x+2,83,width,49,'#bfd2cb');box(x,81,width,49,'#fbf7e9');box(x,81,3,49,msg.color);text(msg.title,W/2,98,12,msg.color);text(msg.detail,W/2,116,8,C.ink);ctx.globalAlpha=1;}
    const nearest=pickWarningChaser(state.chasers,p);if(nearest){const gap=Math.round(Math.hypot(nearest.x-p.x,nearest.y-p.y)/PX_PER_M);text(`↑ ${nearest.kind==='dog'?'DOGS':nearest.kind==='patrol'?'PATROL':'YETI'}  ${gap} m`,W/2,153,10,C.red);}
    if(run&&!run.endless&&Math.abs(p.x-centerAt(p.y))>S.race.offPisteDistance){text(p.x<centerAt(p.y)?'COURSE →':'← COURSE',p.x<centerAt(p.y)?W-65:65,H*.55,10,C.blue);}
  }
  function touchControl() {
    const t=state.input.pointer;if(!t)return;
    const dx=clamp(t.x-t.sx,-70,70),dy=clamp(t.y-t.sy,-70,70);
    ctx.globalAlpha=.7;
    line(t.sx,t.sy,t.sx+dx,t.sy+dy,'#76a7af',2);
    ctx.fillStyle='#548f9c';ctx.beginPath();ctx.arc(t.sx+dx,t.sy+dy,5,0,TAU);ctx.fill();
    if(t.direction)text({left:'LEFT',right:'RIGHT',up:'UP',down:'DOWN'}[t.direction]+(t.presses===2?' x2':''),t.sx+dx,t.sy+dy-18,9,C.teal);
    ctx.globalAlpha=1;
  }
  function drawSceneCard(){
    ctx.globalAlpha=1;
    const card=state.sceneCard,img=images['scene:'+card.key+(card.night?'-night':'')]||images['scene:'+card.key],width=W-40,height=Math.round(width*200/320),caption=110,top=Math.round((H-height-caption)/2),left=20;
    box(0,0,W,H,'#18333f');
    for(let i=0;i<35;i++)box((i*137)%W,(i*197)%H,2,1,i%3?'#45606c':'#73938f');
    box(left-5,top-5,width+10,height+caption+10,'#0e2632');box(left-3,top-3,width+6,height+caption+6,'#c7a474');
    box(left,top,width,height+caption,'#f3ead5');
    if(img){ctx.imageSmoothingEnabled=false;ctx.drawImage(img,left,top,width,height);}else box(left,top,width,height,'#dbe5d9');
    text(card.title,W/2,top+height+25,14,C.teal);
    const words=card.detail.split(' '),lines=[''],maxChars=Math.floor((width-36)/12);for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).length>maxChars)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
    lines.slice(0,2).forEach((line,i)=>text(line,W/2,top+height+58+i*21,14,C.ink));
    card.shown=true;
  }
  function render() {
    if(state.sceneCard){drawSceneCard();return;}
    ctx.imageSmoothingEnabled=false;ctx.save();
    if(state.screenShake>0)ctx.translate(Math.sin(clock*71)*2,Math.cos(clock*67)*2);
    snow();drawLift();
    ctx.save();ctx.lineCap='round';
    for(const [color,width] of [['#9ebbc5',1.7],['#dce9e7',1.25]])for(const t of state.snowballTrails){
      const a=screen(t.ax,t.ay),b=screen(t.bx,t.by);if(Math.max(a.y,b.y)<0||Math.min(a.y,b.y)>H)continue;
      ctx.globalAlpha=Math.min(1,(t.until-clock)/2)*.65;
      line(a.x,a.y,b.x,b.y,color,t.r*ZOOM*width);
    }
    ctx.restore();
    if(state.zone.kind==='start'){
      const s=screen(0,-128);text('S K I  I N T O  T R O U B L E',s.x,s.y,12,C.teal);text('CHOOSE A TRAIL. OR KEEP GOING FOREVER.',s.x,s.y+21,8,C.muted);
    }
    const layers=[],groundLights=[],top=state.cam.y-200,bottom=state.cam.y+H/ZOOM+200;
    for(const o of state.objects){
      if(['ramp','mogul','smallHill','largeHill','logBump','rugged','cemeteryPlot'].includes(o.type)){if(o.type==='ramp')groundLights.push(o);continue;}
      const extent=o.paradeSpan?o.depth:o.type==='christmasTree'?o.width*1.5:o.grandMausoleum?o.width*1.1:['cemeteryFence','areaBarrier'].includes(o.type)?(o.depth||0)/2:0;
      if(o.y+extent<=top||o.y-extent>=bottom||Math.abs(o.x-state.cam.x)>=W/(2*ZOOM)+Math.max(460,o.paradeSpanX?houseFootHalfWidth(o)+o.width:0,(o.width||0)/2+60,o.treeLength||0))continue;layers.push(o);
    }
    for(const c of state.chasers)if(c.y>top&&c.y<bottom&&Math.abs(c.x-state.cam.x)<W/(2*ZOOM)+230)layers.push(c);
    layers.push(state.p);layers.sort((a,b)=>a.y-b.y);for(const o of layers)if(o===state.p)drawPlayer();else if(o.type)drawObject(o);else drawChaser(o);
    for(const q of state.particles){const s=screen(q.x,q.y);ctx.globalAlpha=q.totalLife?clamp(q.life/q.totalLife,0,1):1;box(s.x,s.y,q.size||3,q.size||3,q.color);}ctx.globalAlpha=1;
    drawDeathAnimation();drawSpecialEffects();drawGearEffect();drawSpeech();drawNightLighting(layers.concat(groundLights));ctx.restore();hud();touchControl();
    if(state.deathTimer>0&&state.deathTimer<.5&&!state.deathAnimation){ctx.globalAlpha=1-state.deathTimer/.5;box(0,0,W,H,C.snow);ctx.globalAlpha=1;}
  }
  function resize() {
    const r=canvas.getBoundingClientRect();H=clamp(Math.round(W*(r.height||S.render.defaultHeight)/(r.width||S.render.width)),S.render.minHeight,S.render.maxHeight);canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;state.cam.y=state.p.y-H*S.render.playerScreenY/ZOOM;
  }
  function pointerCoords(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  const activePointers=new Set();
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();activePointers.add(e.pointerId);
    if(state.deathAnimation)return;
    if(state.sceneCard){dismissSceneCard();return;}
    if(state.deathTimer||state.liftTimer||state.p.fall>0)return;
    if(activePointers.size>1){if(state.input.pointer)state.input.pointer.multiTouch=true;if(startMoving())state.input.jump=true;return;}
    const p=pointerCoords(e);state.control='pointer';
    state.input.pointer={id:e.pointerId,sx:p.x,sy:p.y,...p,clientStartX:e.clientX,clientStartY:e.clientY,direction:null,presses:0,handled:false,multiTouch:false};canvas.setPointerCapture(e.pointerId);
    if(e.pointerType==='mouse'){const t=state.input.pointer;t.handled=pointerSteer(tapDirection(t),true);}
  });
  // Screen-reader activation has no pointerdown; ignore a held ski gesture's trailing click.
  canvas.addEventListener('click',e=>{if(state.sceneCard&&e.detail===0)dismissSceneCard();});
  canvas.addEventListener('pointermove',e=>{if(state.input.pointer?.id!==e.pointerId)return;e.preventDefault();updateSwipe(e);});
  canvas.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);if(state.input.pointer?.id!==e.pointerId)return;e.preventDefault();updateSwipe(e);finishPointerTap(e);releasePointer();});const cancel=e=>{activePointers.delete(e.pointerId);if(state.input.pointer?.id===e.pointerId)releasePointer();};canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);window.addEventListener('pointerup',e=>activePointers.delete(e.pointerId));window.addEventListener('pointercancel',e=>activePointers.delete(e.pointerId));
  const sceneHeldKeys=new Set();
  window.addEventListener('keydown',e=>{if(state.deathAnimation){e.preventDefault();sceneHeldKeys.add(e.code);return;}if(state.sceneCard&&!e.target?.closest?.('dialog,#install-app')){e.preventDefault();sceneHeldKeys.add(e.code);if(!e.repeat&&!['Shift','Control','Alt','Meta'].includes(e.key))dismissSceneCard();return;}if(sceneHeldKeys.has(e.code)){e.preventDefault();return;}if(e.target?.closest?.('button,dialog,a,input,textarea,select,[contenteditable]'))return;if(e.code==='KeyP'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)toggleDayNight();return;}const difficultyStep=['[','-'].includes(e.key)?-1:[']','+','='].includes(e.key)?1:e.code==='BracketLeft'||e.code==='NumpadSubtract'?-1:e.code==='BracketRight'||e.code==='NumpadAdd'?1:0;if(difficultyStep&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(!e.shiftKey||['+','[',']'].includes(e.key))){if(!e.repeat&&debugEndlessDifficulty(difficultyStep)){e.preventDefault();return;}}const letter={q:10,w:11,e:12}[e.key.toLowerCase()]??{KeyQ:10,KeyW:11,KeyE:12}[e.code];if(letter&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){if(e.repeat&&(state.endless||!state.course&&state.zone.kind==='start')){e.preventDefault();return;}if(!e.repeat&&debugEndlessArea(letter)){e.preventDefault();return;}}const number=Number(e.key)||Number(e.code.match(/^(?:Digit|Numpad)([1-9])$/)?.[1]);if(number>=1&&number<=9&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){if(!e.repeat&&debugEndlessArea(number)){e.preventDefault();return;}}const key={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(key){e.preventDefault();if((state.p.awaitingInput&&e.repeat)||!startMoving())return;state.input[key]=true;keyboardDirection(key,e.repeat);}if(e.code==='Space'){e.preventDefault();if((state.p.awaitingInput&&e.repeat)||!startMoving())return;state.input.jump=true;}if(e.key.toLowerCase()==='m'&&!e.repeat){state.muted=!state.muted;save();announce(state.muted?'SOUND OFF':'SOUND ON','',C.teal,1);}});
  window.addEventListener('keyup',e=>{sceneHeldKeys.delete(e.code);const key={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(key)state.input[key]=false;});
  window.addEventListener('blur',()=>{activePointers.clear();delete state.input.tap;sceneHeldKeys.clear();state.input.left=state.input.right=state.input.up=state.input.down=false;if(state.input.pointer)releasePointer();});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{lastTime=0;accumulator=0;});
  function frame(t) {const elapsed=lastTime?Math.min(S.simulation.maxFrameSeconds,(t-lastTime)/1000):0;lastTime=t;if(!document.hidden){accumulator+=elapsed;while(accumulator>=S.simulation.stepSeconds){step(S.simulation.stepSeconds);accumulator-=S.simulation.stepSeconds;}render();}requestAnimationFrame(frame);}
  startMeadow();resize();state.liftRoutes.push({x0:S.lift.x,x1:S.lift.x,y0:S.lift.startY,y1:Infinity});ensureWorld(true);
  // Keep embedded fallbacks for editable atlases, but decode only textures this config uses.
  const requiredTextures=new Set([...Object.values(atlas).map(frame=>frame[0]),'hillSmall','hillLarge']);
  const loaded=Promise.all(Object.entries(window.FROSTLINE_ASSETS).filter(([key])=>requiredTextures.has(key)||key.startsWith('scene:')).map(([key,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(new Error('Cannot load sprite atlas: '+key));im.src=src;})));
  loaded.then(()=>{ready=true;window.FrostlineApp?.ready();if(S.endless.autoStart)autoStartEndless();else if(S.arcade.autoStart)autoStartArcade();render();requestAnimationFrame(frame);}).catch(window.showFrostlineError);
  // Kept out of the UI: deterministic hooks for simulation and renderer checks.
  window.Frostline={debugEndlessDifficulty,debugEndlessArea,debugAreas:ENDLESS_DEBUG_AREAS,config:S,state,stages,atlas,loaded,step,render,startCourse,creditRun,makeVillage,hit,triggerAmbush,addChasers,startMoving,resize,launch,playerPose,keyboardDirection,releasePointer,ensureWorld,updateWildlife,updateSkiers,crashSkier,endlessPressure,endlessScaleAt,obstacleClearance,encounterPathX,encounterClearance,endlessTownAt,extendEndless,die,resetSummit,patchAt,onRoad,entity,topSpeed,viewBounds,humanArea,lakeContains,pickWarningChaser,isNight,toggleDayNight,get ready(){return ready;},get height(){return H;}};
})().catch(window.showFrostlineError);
