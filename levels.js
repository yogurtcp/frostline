/* Arcade challenge areas built from existing creatures and terrain:
   Pied Piper's Parade, Avalanche!, The Floor Is Burrowers and Sleeping Giants.
   Planning/population hook into planEndlessRegion/populateEndlessRegion; per-step rules live in updateLevelAreas.
   Tuning is in game-config.json endless.regions.levels. */
const LEVEL_KINDS=new Set(['piedPiper','avalanche','burrowField','boulder']);
const LEVEL_NAMES={piedPiper:"Pied Piper's Parade",avalanche:'Avalanche!',burrowField:'The Floor Is Burrowers',boulder:'The Boulder'};
const LEVEL_HINTS={piedPiper:'TEN YETIS ARE AFTER YOU - GRAB FLAGS, USE THE ICE, WATCH FOR AMBUSHES',avalanche:'EYES UP AND DOWN - SNOWBALLS FROM ABOVE, BEASTS BELOW',burrowField:'THEY COME FROM THE SIDES - TURN, JUMP OR FIND ICE',boulder:'A GIANT SNOWBALL IS RIGHT BEHIND YOU - KEEP A CLEAN, FAST LINE'};
function levelConfig(e){return S.endless.regions.levels[e.kind];}
function levelValue(e,range){return Array.isArray(range)?mix(range[0],range[1],e.difficulty):range;}
function levelRows(e,from,to,step,offset,callback){
  for(let row=Math.max(0,Math.ceil((from-e.startY-offset)/step));;row++){const y=e.startY+offset+row*step;if(y>=to||y>=e.endY)break;callback(y,row);}
}
function planLevelArea(e,section){
  const root=section.endlessRoot,s=e.scale,length=e.endY-e.startY,side=pick([-1,1]);
  const point=(t,x=0)=>({x:root.x+x*s,y:e.startY+t*length});
  e.noFlags=e.kind!=='piedPiper';e.noNewPredators=true;e.level=true;e.section=section;e.title=LEVEL_NAMES[e.kind];e.centerX=root.x;
  // A gentle zigzag with bends a fixed distance apart, however long the area is.
  const zig=(metres,amp)=>{const n=Math.max(2,Math.round(length/(metres*PX_PER_M*s)));return Array.from({length:n+1},(_,i)=>point(i/n,i===0||i===n?0:(i%2?side:-side)*amp));};
  if(e.kind==='piedPiper'){e.half=280*s;e.paths=[zig(250,120)];e.baseEndY=e.endY;}
  else if(e.kind==='avalanche'){e.half=300*s;e.paths=[zig(280,110)];}
  else if(e.kind==='burrowField'){e.half=160*s;e.paths=[zig(320,90)];}
  else {e.half=260*s;e.paths=[zig(220,120)];}
  e.paths[0].linear=true;
  e.band=Math.max(e.half+320*s,S.endless.regions.minimumWidthMetres*PX_PER_M*s/2);
}
function populateLevelArea(e,section,from,to){
  const L=levelConfig(e),s=e.scale,path=e.paths[0],own={arcadeRun:section,encounter:e},at=y=>encounterPathX(path,y);
  populateForestBoundary(e,section,from,to,{banks:false});
  const per=(value,offset,callback)=>{const n=levelValue(e,value);if(n>0)levelRows(e,from,to,100*PX_PER_M*s/n,offset*s,(y,row)=>{if(y<e.endY-60*s)callback(y,row);});};
  const sideTrees=(per100,inner,outer)=>per(per100,40,(y,row)=>{const x=at(y)+(row%2?-1:1)*range(inner,outer);entity(row%3?'pine':'fir',x,y,{...own,width:range(58,82),r:17});});
  // Lone skiers and boarders going about their day: obstacles to you, a snack to anything chasing you.
  const skiers=(per100)=>per(per100,120,y=>{const item=createArcadeItem(pick(['skier','skier','boarder']),at(y)+range(-.9,.9)*e.half,y,section);item.encounter=e;});
  if(e.kind==='piedPiper'){
    sideTrees(L.sideTreesPer100Metres,e.half+40*s,e.half+260*s);
    skiers(L.skiersPer100Metres);
    // A real course: rocks, stumps and trees all over the slope (cleared out of each flag's opening once flags are placed).
    per(L.obstaclesPer100Metres,70,y=>{const x=at(y)+range(-1,1)*e.half,k=pick(['pine','fir','rock','rock','stump','smallPine']);const o=createArcadeItem(k,x,y,section);o.encounter=e;o.levelObstacle=true;});
    // Bears and wolf packs already on the slope; more turn up as you go (ambushes).
    const spot=y=>at(y)+pick([-1,1])*range(.2,.9)*e.half;
    per(L.bearsPer100Metres,330,y=>entity('bear',spot(y),y,{...ARCADE_ITEMS.bear,...own,nextAI:clock+range(1,4)}));
    per(L.wolfPacksPer100Metres,470,y=>levelWolfPack(e,spot(y),y));
    // Sparse black ice: no steering, but it speeds you downhill, away from the pack.
    per(L.icePer100Metres,260,y=>{const rx=range(50,80)*s;entity('ice',at(y)+range(-80,80)*s,y,{...own,rx,ry:rx*range(1.2,1.5),width:rx*2,r:0,arcadeFeature:true});});
  }else if(e.kind==='avalanche'){
    sideTrees(L.sideTreesPer100Metres,e.half+30*s,e.half+240*s);
    // Trees stand close enough to fall right across the line you are skiing.
    per(L.fallingTreesPer100Metres,140,(y,row)=>{const side=row%2?-1:1;entity('fallingTree',at(y)+side*range(70,110)*s,y,{...own,arcadeFeature:true,fallTowardX:at(y)});});
    skiers(L.skiersPer100Metres);
    // Slow Yetis, bears and wolf packs waiting on the slope itself: they wake as you come near.
    const spot=y=>at(y)+pick([-1,1])*range(.25,.9)*e.half;
    per(L.lurkersPer100Metres,200,y=>levelYeti(e,section,spot(y),y,levelValue(e,L.lurkerSpeedKmh)));
    per(L.bearsPer100Metres,330,y=>entity('bear',spot(y),y,{...ARCADE_ITEMS.bear,...own,nextAI:clock+range(1,4)}));
    per(L.wolfPacksPer100Metres,470,y=>levelWolfPack(e,spot(y),y));
  }else if(e.kind==='burrowField'){
    sideTrees(L.sideTreesPer100Metres,e.half+20*s,e.half+200*s);
    // A sparse line of jumps and small frozen pools: places to be safe for a moment. Burrowers cannot strike through ice or the air.
    const spacing=levelValue(e,L.jumpSpacingMetres)*PX_PER_M*s,kinds=['ramp','mogul','smallHill','rainbow','largeHill','mogul'];
    levelRows(e,from,to,spacing,90*s,(y,row)=>{
      if(y>e.endY-90*s)return;
      const every=Math.round(levelValue(e,L.icePatchEvery));if(every&&row%every===every-1){entity('ice',at(y),y,{...own,rx:range(55,75)*s,ry:range(38,50)*s,width:130*s,r:0,arcadeFeature:true});return;}
      const item=createArcadeItem(kinds[row%kinds.length],at(y),y,section);item.encounter=e;
    });
  }else{
    // The Boulder: a busy slope where every hit costs you speed, with a few jumps and ice pools to win some back.
    sideTrees(L.sideTreesPer100Metres,e.half+20*s,e.half+220*s);
    per(L.obstaclesPer100Metres,90,y=>{const o=createArcadeItem(pick(['pine','fir','smallPine','rock','rock','stump','bush','bush','sled']),at(y)+range(-1,1)*e.half,y,section);o.encounter=e;});
    per(L.jumpsPer100Metres,200,y=>{const o=createArcadeItem(pick(['ramp','mogul','smallHill']),at(y)+range(-.5,.5)*e.half,y,section);o.encounter=e;});
    per(L.icePer100Metres,330,y=>{const rx=range(55,85)*s;entity('ice',at(y)+range(-.5,.5)*e.half,y,{...own,rx,ry:rx*range(1.1,1.4),width:rx*2,r:0,arcadeFeature:true});});
    skiers(L.skiersPer100Metres);
    per(L.bearsPer100Metres,450,y=>entity('bear',at(y)+pick([-1,1])*range(.3,.9)*e.half,y,{...ARCADE_ITEMS.bear,...own,nextAI:clock+range(1,4)}));
  }
}
function levelYeti(e,section,x,y,kmh){
  const speed=kmh??levelValue(e,levelConfig(e).yetiSpeedKmh??S.endless.yetis.speedKmh);
  return entity('lurker',x,y,{arcadeRun:section,encounter:e,width:55,r:18,arcadeTier:speed>90?'special':speed>78?'fast':'slow',yetiSpeedKmh:speed,endlessBaseKmh:speed});
}
function levelWolfPack(e,x,y){
  const packId=random(),count=Math.floor(range(S.wildlife.packMin,S.wildlife.packMax+1));
  for(let i=0;i<count;i++)entity('wolf',x+(i%2?1:-1)*i*18,y+Math.floor(i/2)*25,{...ARCADE_ITEMS.wolf,arcadeRun:e.section,encounter:e,packId,packIndex:i,nextAI:clock+range(1,4)});
}
// Flags go on the line after the slope is populated: clear any obstacle out of the opening.
function clearLevelGate(group){
  const pad=50;
  filterObjects(o=>!o.levelObstacle||!group.members.some(g=>Math.abs(o.y-g.y)<70&&Math.abs(o.x-g.x)<g.half+pad));
}
// Surprise enemies: a Yeti bursting in from the side, or a bear or wolf pack just below the screen.
function updateAmbushes(e,L){
  const p=state.p,every=levelValue(e,L.ambushSeconds??0);if(!every||p.fall||p.awaitingInput||p.y>e.endY-150*e.scale)return;
  if(!e.nextAmbush){e.nextAmbush=clock+every*range(.5,1);return;}
  if(clock<e.nextAmbush)return;
  e.nextAmbush=clock+every*range(.7,1.3);
  const b=viewBounds(),s=e.scale,line=encounterPathX(e.paths[0],p.y),roll=random();
  const yetiOk=e.kind!=='piedPiper'; // Pied Piper is the ten from the start, nothing more
  if(roll<.45&&yetiOk){const side=pick([-1,1]),c=levelChaser(e,side<0?b.left-30:b.right+30,p.y+range(10,35)*PX_PER_M*s,levelValue(e,L.chaserSpeedKmh)-5);say(pick(['SURPRISE!','HELLO THERE!','THOUGHT YOU WERE SAFE?']),c,1.4);}
  else{const x=clamp(p.x+range(-160,160),line-e.half*.9,line+e.half*.9),y=b.bottom+60;
    if(roll<.75)entity('bear',x,y,{...ARCADE_ITEMS.bear,arcadeRun:e.section,encounter:e,nextAI:clock+range(.5,2)});else levelWolfPack(e,x,y);}
}
// A Yeti that is already running when you arrive, a little uphill of you.
function levelChaser(e,x,y,kmh,wake=[1.5,2.5]){
  // Same look-by-speed as free-ski Yetis: grey from 72 km/h, purple from 80.
  const tier=kmh>=90?'special':kmh>=80?'elite':kmh>=72?'fast':'slow';
  const c={kind:tier==='slow'?'slow':'fast',arcadeTier:tier,encounter:e,chaseRun:e.section,endlessBaseKmh:kmh,x,y,speed:kmh/S.physics.hudKmhPerSpeed,
    wakeUntil:clock+range(wake[0],wake[1]),phase:range(0,6),expires:Infinity,leaving:false,talkAt:clock+range(3,8)};
  state.chasers.push(c);return c;
}
function releaseLevelChasers(e,count,kmh,spread,lines){
  const p=state.p,s=e.scale,pack=[];
  // Pied Piper is a pursuit: the pack starts on screen right behind you and is running almost at once.
  const [near,far]=e.kind==='avalanche'?[45,90]:[15,35],wake=e.kind==='piedPiper'?[.3,.7]:[1.5,2.5];
  for(let i=0;i<count;i++){const c=levelChaser(e,p.x+range(-220,220)*s,p.y-range(near,far)*PX_PER_M*s,kmh+range(-spread,spread),wake);pack.push(c);if(i<2)say(pick(lines),c,1.8);}
  return pack;
}
function updateLevelAreas(dt){
  const p=state.p,e=state.endless?endlessEncounterAt(p.y):null;
  if(!e?.level||!state.started)return;
  const L=levelConfig(e),s=e.scale;
  // The pack is let loose once you are properly under way and 70 m in, so it starts on open slope inside the area.
  if(!e.chasersReleased&&(e.kind==='piedPiper'||e.kind==='avalanche')&&p.y>e.startY+700*s&&!p.fall&&!p.awaitingInput&&Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed>=50){
    e.chasersReleased=true;const count=Math.round(levelValue(e,L.chasingYetis));
    // Pied Piper's pack runs at 90.5 km/h: barely enough to catch up, so every mistake counts.
    releaseLevelChasers(e,count,levelValue(e,L.chaserSpeedKmh),levelValue(e,L.chaserSpeedSpreadKmh??0),['THERE! GET HIM!','BREAKFAST IS LEAVING!','RUN, LITTLE SKIER!']);
    if(e.kind==='piedPiper')announce(count+' YETIS ARE RIGHT BEHIND YOU','FLAGS ARM YOU - ICE SPEEDS YOU AWAY',C.red,3);
  }
  if(e.kind==='piedPiper'||e.kind==='avalanche')updateAmbushes(e,L);
  if(e.kind==='piedPiper'){
    e.onTail=piedPiperChasing(e);
    if(e.chasersReleased&&!e.released&&e.onTail===0){e.released=true;if(p.y>e.baseEndY-300*s)announce('YOU LOST THEM','THE WAY OUT IS OPEN',C.teal,3);}
  }
  else if(e.kind==='avalanche')updateAvalanche(e,L,dt);
  else if(e.kind==='burrowField')updateBurrowField(e,L);
  else if(e.kind==='boulder')updateBoulderArea(e,L,dt);
}
// Pied Piper: a Yeti that falls 180 m behind has lost you for good and is removed, so the count only ever goes down.
function piedPiperChasing(e){
  const p=state.p,far=S.endless.yetis.nearbyMetres*PX_PER_M*e.scale;
  state.chasers=state.chasers.filter(c=>c.encounter!==e||c.dead||c.eaten||c.leaving||c.y>p.y-far);
  return state.chasers.filter(c=>c.encounter===e&&!c.dead&&!c.eaten&&!c.leaving).length;
}
// Called while planning ahead: while the pack is still on you, the area keeps stretching downhill, so the next area never starts.
function holdLevelExit(a,horizon,scale){
  const e=a.encounters.at(-1);if(e?.kind!=='piedPiper'||e.released)return;
  const need=horizon+2600*scale;if(e.endY>=need)return;
  const gap=a.nextEncounterY-e.endY,old=e.endY,s=e.scale,path=e.paths[0];
  e.endY=need+600*s;a.nextEncounterY=e.endY+gap;
  for(let y=path.at(-1).y;y<e.endY;){y+=250*PX_PER_M*s;path.push({x:e.centerX+(path.length%2?1:-1)*range(80,120)*s,y});}
  state.objects=state.objects.filter(o=>!o.worldChunk||o.arcadeRun||o.y<old||o.y>e.endY+200*s||Math.abs(o.x-e.centerX)>e.band);
}
function updateAvalanche(e,L,dt){
  const p=state.p,b=viewBounds(),s=e.scale;
  // Balls that have rolled well past you are done; no tracks scrolling in from below.
  for(const o of objectGroups().terrainFeatures)if(o.avalancheBall&&!o.eaten&&o.y>b.bottom+200)o.eaten=true;
  if(p.y>e.endY-80*s||p.y<e.startY+60*s){return;}
  if(!e.nextBall){e.nextBall=clock+.8;state.screenShake=.4;announce('RUMBLE...','THE MOUNTAIN IS LETTING GO',C.red,2);}
  if(clock<e.nextBall)return;
  e.nextBall=clock+levelValue(e,L.ballSeconds)*range(.75,1.25);
  // Balls roll in over the top of the screen, clearly faster than you, and curve across your line as they pass.
  // Every few balls, a volley of three sweeps the whole corridor.
  const line=encounterPathX(e.paths[0],p.y);e.balls=(e.balls||0)+1;
  if(e.balls%Math.max(2,Math.round(levelValue(e,L.volleyEvery)))===0){for(const k of [-1,0,1])spawnAvalancheBall(e,L,line+k*e.half*.7+range(-30,30),b.top-40-range(0,90));state.screenShake=Math.max(state.screenShake,.3);}
  else spawnAvalancheBall(e,L,clamp(p.x+range(-220,220),line-e.half,line+e.half),b.top-40);
  if(random()<.3)state.screenShake=Math.max(state.screenShake,.12);
}
function spawnAvalancheBall(e,L,x,y){
  const p=state.p,ball=entity('rollingSnowball',x,y,{arcadeRun:e.section,encounter:e,arcadeFeature:true,avalancheBall:true});
  const f=S.terrainFeatures.rollingSnowball,{amplitude,omega}=snowballCurve(),base=Math.max(p.vy,topSpeed());
  // Already at full speed: the motion clock starts in the past, so shift the origin back to keep the ball where it appears.
  const started=clock-f.accelerationSeconds*4,u=snowballMotion(clock-started).distanceTime,side=Math.sign(p.x-x)||1,amp=amplitude*range(.3,1),downhill=base+levelValue(e,L.ballExtraKmh)/S.physics.hudKmhPerSpeed;
  Object.assign(ball,{rollState:'rolling',rollStarted:started,rollOriginX:x-side*amp*(1-Math.cos(omega*u)),rollOriginY:y-downhill*u,rollNominalY:y,trailX:x,trailY:y,rollSide:side,
    rollAmplitude:amp,rollOmega:omega,rollDownhillSpeed:downhill,
    travelLimit:levelValue(e,L.ballTravelMetres)*PX_PER_M,trailSeconds:levelValue(e,L.trailSeconds)});
}
// The Floor Is Burrowers: burrowers streak in under the snow from the edges of the screen, aimed at where you will be.
function updateBurrowField(e,L){
  const p=state.p,s=e.scale;
  if(p.y<e.startY+80*s||p.y>e.endY-120*s||p.fall||p.awaitingInput)return;
  if(!e.nextBurrow){e.nextBurrow=clock+1.2;announce('THE GROUND IS MOVING','WATCH BOTH SIDES',C.red,2);return;}
  if(clock<e.nextBurrow)return;
  e.nextBurrow=clock+levelValue(e,L.spawnSeconds)*range(.7,1.3);
  for(const side of random()<levelValue(e,L.pincerChance)?[-1,1]:[pick([-1,1])])spawnFieldBurrower(e,L,side);
}
function spawnFieldBurrower(e,L,side){
  const p=state.p,b=viewBounds(),travel=levelValue(e,L.arriveSeconds)*range(.85,1.15),pause=levelValue(e,L.strikePause),ahead=travel+pause;
  const tx=clamp(p.x+p.vx*ahead,b.left+40,b.right-40),ty=p.y+p.vy*ahead,sx=side<0?b.left-40:b.right+40,sy=ty+range(-80,30);
  entity('burrower',sx,sy,{arcadeRun:e.section,encounter:e,r:0,width:42,fieldBurrower:true,burrowState:'rushing',rushAt:clock,burrowTrail:[],
    targetX:tx,targetY:ty,rushSpeed:Math.hypot(tx-sx,ty-sy)/travel,strikePause:pause,aimFollow:levelValue(e,L.aimFollowMetresPerSecond)*PX_PER_M,commitSeconds:levelValue(e,L.commitSeconds)});
  beep(side<0?140:160,.06,'triangle',.012);
}
// It keeps re-aiming at where you will be, but its aim only shifts so fast, and in the last moment it commits:
// a late, sharp change of line makes it miss, as does a jump or ice.
function rushFieldBurrower(o,dt){
  const p=state.p;
  if(!o.committed){
    const left=Math.hypot(o.targetX-o.x,o.targetY-o.y)/o.rushSpeed;
    if(left<o.commitSeconds)o.committed=true;
    else{const t=left+o.strikePause,ax=p.x+p.vx*t,ay=p.y+p.vy*t,mx=ax-o.targetX,my=ay-o.targetY,shift=Math.hypot(mx,my),max=o.aimFollow*dt;
      if(shift>0){const k=Math.min(1,max/shift);o.targetX+=mx*k;o.targetY+=my*k;}}
  }
  const dx=o.targetX-o.x,dy=o.targetY-o.y,dist=Math.hypot(dx,dy),step=o.rushSpeed*dt;
  o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
  if(dist<=step){
    o.x=o.targetX;o.y=o.targetY;o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
    if(patchAt(o.x,o.y)){o.burrowState='closing';o.closeAt=clock;o.r=0;}else{o.burrowState='settled';o.settleAt=clock;}
    return;
  }
  const angle=Math.atan2(dy,dx)+Math.sin((clock-o.rushAt)*9+o.phase)*.18*clamp(dist/150,0,1);
  o.x+=Math.cos(angle)*step;o.y+=Math.sin(angle)*step;
  o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;o.travelSpeed=o.rushSpeed;o.travelStamp=clock;
  if(clock>=(o.nextTrailAt||0)){o.burrowTrail.push({x:o.x,y:o.y,until:clock+.8});if(o.burrowTrail.length>28)o.burrowTrail.shift();o.nextTrailAt=clock+.03;}
}
// Hooks the game calls for every level (kept for future levels): no level overrides wake rules or the speed readout now.
function levelWakeOverride(o){return null;}
function levelSpeedWarning(){return false;}
function drawLevelGround(){}
// With the boulder rolling, or the pack on your tail, the camera sits you lower on the screen so you can see it coming.
function levelPlayerScreenY(){const e=state.endless?endlessEncounterAt(state.p.y):null;return e?.kind==='boulder'&&e.boulder||e?.kind==='piedPiper'&&e.chasersReleased&&e.onTail>0?levelValue(e,levelConfig(e).playerScreenY):null;}
// The Boulder: a giant snowball rolls after you from just inside the area, growing as it goes and flattening everything.
function updateBoulderArea(e,L,dt){
  const p=state.p,s=e.scale;
  if(!e.boulder){
    if(e.boulderDone||clock<(e.nextBoulderAt||0)||p.y<e.startY+600*s||p.y>e.endY-400*s||p.fall||p.awaitingInput||!e.nextBoulderAt&&Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed<50)return;
    const r=levelValue(e,L.radiusMetres)*PX_PER_M;
    e.boulder=entity('boulder',p.x,p.y-levelValue(e,L.startBehindMetres)*PX_PER_M*s,{arcadeRun:e.section,encounter:e,r:0,width:r*2,radius:r,speed:e.nextBoulderAt?topSpeed()*levelValue(e,L.topSpeedRatio):levelValue(e,L.startKmh)/S.physics.hudKmhPerSpeed,spin:0,travelled:0,trailX:p.x,trailY:p.y});
    e.boulder.trailY=e.boulder.y;state.screenShake=Math.max(state.screenShake,.6);beep(70,.5,'sawtooth',.03);
    announce('RUMBLE...','A GIANT SNOWBALL IS COMING - GO!',C.red,2.5);return;
  }
  updateBoulder(e,L,dt);
}
function updateBoulder(e,L,dt){
  const b=e.boulder,p=state.p,s=e.scale,gap=p.y-b.y;
  // It builds to just below your top speed, so a clean line slowly pulls away; fall far ahead and it speeds up to keep the pressure on.
  const cruise=topSpeed()*levelValue(e,L.topSpeedRatio),keep=levelValue(e,L.catchUpMetres)*PX_PER_M*s;
  const want=cruise*(1+Math.max(0,gap-keep)/(PX_PER_M*s)*levelValue(e,L.catchUpPerMetre));
  b.speed=Math.min(want,b.speed+levelValue(e,L.accelerationKmhPerSecond)/S.physics.hudKmhPerSpeed*dt);
  // It leans harder toward you the closer it gets, so a last-second sidestep is hard.
  const lean=gap<20*PX_PER_M*s?.6:.3,lateral=clamp((p.x-b.x)*2,-b.speed*lean,b.speed*lean);
  const ox=b.x,oy=b.y;b.x+=lateral*dt;b.y+=b.speed*dt;
  const moved=Math.hypot(b.x-ox,b.y-oy);b.travelled+=moved;b.spin+=moved/Math.max(10,b.radius);
  // It grows as it rolls, up to a limit.
  b.radius=Math.min(levelValue(e,L.maxRadiusMetres)*PX_PER_M,b.radius+moved*levelValue(e,L.growthMetresPer100Metres)/100);b.width=b.radius*2;
  if(Math.hypot(b.x-b.trailX,b.y-b.trailY)>=b.radius*.5){state.snowballTrails.push({ax:b.trailX,ay:b.trailY,bx:b.x,by:b.y,r:b.radius*.8,until:clock+2});b.trailX=b.x;b.trailY=b.y;}
  // Everything in its way is flattened: trees, rocks, creatures, skiers, Yetis.
  const reach=b.radius*.9;let smashed=0;
  const flattens=o=>o!==b&&o.type!=='ice'&&o.type!=='rugged'&&o.type!=='entrance'&&Math.abs(o.y-b.y)<=reach+40&&Math.hypot(o.x-b.x,o.y-b.y)<=reach+(o.r||0)&&(o.r>0||['ramp','mogul','smallHill','largeHill','bush'].includes(o.type));
  // Look first, rebuild the object list only when something is actually in its way.
  if(state.objects.some(flattens))filterObjects(o=>{
    if(!flattens(o))return true;
    burst(o.x,o.y,'#ffffff',10);smashed++;
    if(['skier','boarder','bear','wolf','lurker'].includes(o.type)&&random()<.5)say(pick(['WHOAAA!','NOT AGAIN!','AAAH!']),{x:o.x,y:o.y-30},1);
    return false;
  });
  if(state.chasers.some(c=>Math.hypot(c.x-b.x,c.y-b.y)<=reach+20))state.chasers=state.chasers.filter(c=>{if(Math.hypot(c.x-b.x,c.y-b.y)>reach+20)return true;burst(c.x,c.y,'#ffffff',16);smashed++;return false;});
  if(smashed){state.screenShake=Math.max(state.screenShake,.35);if(clock>(b.nextCrunch||0)){beep(90,.12,'triangle',.02);b.nextCrunch=clock+.15;}}
  if(gap<keep*.6)state.screenShake=Math.max(state.screenShake,.08+.25*(1-gap/(keep*.6)));
  // Dodge it and it rolls past you, shatters, and the next one comes down behind you: no hiding in its cleared lane.
  if(b.y>p.y+b.radius+20*s){burst(b.x,b.y,'#ffffff',50);state.screenShake=.5;filterObjects(o=>o!==b);e.boulder=null;e.nextBoulderAt=clock+levelValue(e,L.nextBoulderSeconds);
    announce('IT SHATTERED...','...AND HERE COMES ANOTHER ONE!',C.red,2);return;}
  // At the bottom it hits the trees and bursts.
  if(b.y>e.endY-200*s){burst(b.x,b.y,'#ffffff',60);state.screenShake=.8;filterObjects(o=>o!==b);e.boulder=null;e.boulderDone=true;announce('THE BOULDER BURST','YOU OUTRAN IT',C.teal,2.5);return;}
  if(!state.deathTimer&&Math.hypot(p.x-b.x,p.y-b.y)<b.radius*.85+S.physics.playerRadius)die('BOULDER');
}
function drawLevelMarks(){
  drawAvalancheWarnings();
  const e=state.endless?endlessEncounterAt(state.p.y):null;
  if(e?.kind==='piedPiper'&&e.chasersReleased&&state.started){
    text('YETIS ON YOUR TAIL: '+e.onTail,W/2,84,10,e.onTail?C.red:C.teal,'center',1);
    if(e.onTail&&state.p.y>e.baseEndY)text('NO WAY OUT UNTIL YOU LOSE THEM',W/2,100,8,C.ink,'center',1);
  }
  // The Boulder: how far behind it is, pinned to the top edge while it is above the screen.
  const b=e?.kind==='boulder'?e.boulder:null;if(!b||!state.started)return;
  const s=screen(b.x,b.y),gap=Math.max(0,(state.p.y-b.y)/(PX_PER_M*e.scale)-b.radius/PX_PER_M);
  const close=gap<20,x=clamp(s.x,30,W-30);
  if(s.y+b.radius*ZOOM<80)text('↑ BOULDER '+Math.round(gap)+' m',x,84,10,close?C.red:C.ink,'center',1);
  else text(Math.round(gap)+' m',x,Math.max(84,s.y-b.radius*2*ZOOM-8),9,close?C.red:C.ink,'center',1);
}
function drawLevelProp(o,s){
  if(o.type!=='boulder')return false;
  // Drawn in size steps: every new pixel width would build a fresh sprite image while it grows.
  const size=Math.max(16,Math.round(o.radius*2/16)*16),r=size/2*ZOOM;shadow(s.x,s.y,size*.52,size*.16,.2);
  sprite('rollingSnowball',s.x,s.y-r,size,{rotate:o.spin,center:true});
  return true;
}

// Avalanche balls still above the screen show a red marker on the top edge where they will roll in.
function drawAvalancheWarnings(){
  const top=70;
  for(const o of objectGroups().terrainFeatures){
    if(!o.avalancheBall||o.eaten||o.rollState!=='rolling')continue;
    const s=screen(o.x,o.y);if(s.y>top+10||s.y<top-260||s.x<-20||s.x>W+20)continue;
    const x=clamp(s.x,12,W-12),pulse=.6+.4*Math.sin(clock*14),near=clamp(1-(top-s.y)/260,0,1);
    ctx.save();ctx.globalAlpha=pulse*(.5+.5*near);ctx.fillStyle=C.red;ctx.beginPath();ctx.moveTo(x-7-near*4,top+2);ctx.lineTo(x+7+near*4,top+2);ctx.lineTo(x,top+12+near*6);ctx.closePath();ctx.fill();ctx.restore();
  }
}
