/* Arcade challenge areas built from existing creatures and terrain:
   Pied Piper's Parade, Avalanche!, The Floor Is Burrowers and Sleeping Giants.
   Planning/population hook into planEndlessRegion/populateEndlessRegion; per-step rules live in updateLevelAreas.
   Tuning is in game-config.json endless.regions.levels. */
const LEVEL_KINDS=new Set(['piedPiper','avalanche','burrowField','sleepingGiants']);
const LEVEL_NAMES={piedPiper:"Pied Piper's Parade",avalanche:'Avalanche!',burrowField:'The Floor Is Burrowers',sleepingGiants:'Sleeping Giants'};
const LEVEL_HINTS={piedPiper:'TEN YETIS ARE AFTER YOU - SKIERS MAKE A SNACK, ICE MAKES YOU FAST',avalanche:'EYES UP AND DOWN - SNOWBALLS FROM ABOVE, BEASTS BELOW',burrowField:'THEY COME FROM THE SIDES - TURN, JUMP OR FIND ICE',sleepingGiants:'WEAVE BETWEEN THE SLEEPERS - THE FASTER YOU GO, THE MORE YOU WAKE'};
function levelConfig(e){return S.endless.regions.levels[e.kind];}
function levelValue(e,range){return Array.isArray(range)?mix(range[0],range[1],e.difficulty):range;}
function levelRows(e,from,to,step,offset,callback){
  for(let row=Math.max(0,Math.ceil((from-e.startY-offset)/step));;row++){const y=e.startY+offset+row*step;if(y>=to||y>=e.endY)break;callback(y,row);}
}
function planLevelArea(e,section){
  const root=section.endlessRoot,s=e.scale,length=e.endY-e.startY,side=pick([-1,1]);
  const point=(t,x=0)=>({x:root.x+x*s,y:e.startY+t*length});
  e.noFlags=true;e.noNewPredators=true;e.level=true;e.section=section;e.title=LEVEL_NAMES[e.kind];e.centerX=root.x;
  // A gentle zigzag with bends a fixed distance apart, however long the area is.
  const zig=(metres,amp)=>{const n=Math.max(2,Math.round(length/(metres*PX_PER_M*s)));return Array.from({length:n+1},(_,i)=>point(i/n,i===0||i===n?0:(i%2?side:-side)*amp));};
  if(e.kind==='piedPiper'){e.half=300*s;e.paths=[zig(250,150)];}
  else if(e.kind==='avalanche'){e.half=300*s;e.paths=[zig(280,110)];}
  else if(e.kind==='burrowField'){e.half=160*s;e.paths=[zig(320,90)];}
  else {e.half=levelValue(e,levelConfig(e).fieldHalfMetres)*PX_PER_M*s;e.paths=[zig(300,60)];}
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
    per(L.wolfPacksPer100Metres,470,y=>{const x=spot(y),packId=random(),count=Math.floor(range(S.wildlife.packMin,S.wildlife.packMax+1));
      for(let i=0;i<count;i++)entity('wolf',x+(i%2?1:-1)*i*18,y+Math.floor(i/2)*25,{...ARCADE_ITEMS.wolf,...own,packId,packIndex:i,nextAI:clock+range(1,4)});});
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
    sideTrees(L.treesPer100Metres,e.half+30*s,e.half+190*s);
    if(from===e.startY)entity('shhhSign',at(e.startY+40*s)+75*s,e.startY+40*s,{...own,r:0,width:40});
    // A wide field of sleepers on a loose staggered grid: there is always a gap, but at full speed your noise reaches into it.
    const gap=levelValue(e,L.sleeperSpacingMetres)*PX_PER_M*s,rowGap=gap*.8;
    levelRows(e,from,to,rowGap,600*s,(y,row)=>{ // a 60 m runway past the sign to settle your speed
      if(y>e.endY-80*s)return;
      const line=at(y),shift=row%2?gap/2:0;
      for(let x=line-e.half+shift+gap*range(.1,.3);x<line+e.half;x+=gap){
        const px=x+range(-.08,.08)*gap,py=y+range(-.1,.1)*rowGap;
        if(random()<levelValue(e,L.bearShare))entity('bear',px,py,{...ARCADE_ITEMS.bear,...own,ai:'idle',roam:0,nextAI:Infinity,sleeper:true});
        else levelYeti(e,section,px,py).sleeper=true;
      }
    });
  }
}
function levelYeti(e,section,x,y,kmh){
  const speed=kmh??levelValue(e,levelConfig(e).yetiSpeedKmh??S.endless.yetis.speedKmh);
  return entity('lurker',x,y,{arcadeRun:section,encounter:e,width:55,r:18,arcadeTier:speed>90?'special':speed>78?'fast':'slow',yetiSpeedKmh:speed,endlessBaseKmh:speed});
}
// A Yeti that is already running when you arrive, a little uphill of you.
function levelChaser(e,x,y,kmh){
  const c={kind:kmh>78?'fast':'slow',arcadeTier:kmh>90?'special':kmh>78?'fast':'slow',encounter:e,chaseRun:e.section,endlessBaseKmh:kmh,x,y,speed:kmh/S.physics.hudKmhPerSpeed,
    wakeUntil:clock+range(.2,.6),phase:range(0,6),expires:Infinity,leaving:false,talkAt:clock+range(3,8)};
  state.chasers.push(c);return c;
}
function releaseLevelChasers(e,count,kmh,spread,lines){
  const p=state.p,s=e.scale;
  for(let i=0;i<count;i++){const c=levelChaser(e,p.x+range(-220,220)*s,p.y-range(20,55)*PX_PER_M*s,kmh+range(-spread,spread));if(i<2)say(pick(lines),c,1.8);}
}
// A Yeti from a challenge area that has eaten goes home, satisfied.
function levelSatedYeti(hunter){
  if(!hunter.encounter?.level||hunter.satedLeave)return;
  hunter.satedLeave=true;
}
function updateLevelAreas(dt){
  const p=state.p,e=state.endless?endlessEncounterAt(p.y):null;
  for(const c of state.chasers)if(c.satedLeave&&!c.leaving&&!(c.feedingUntil>clock)){c.leaving=true;say(pick(['*BURP* Lovely. I am off home.','That hit the spot. Bye!','Full! See you never!']),c,2.2);}
  if(!e?.level||!state.started)return;
  const L=levelConfig(e),s=e.scale;
  // The pack is let loose once you are properly under way and 70 m in, so it starts on open slope inside the area.
  if(!e.chasersReleased&&(e.kind==='piedPiper'||e.kind==='avalanche')&&p.y>e.startY+700*s&&!p.fall&&!p.awaitingInput&&Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed>=50){
    e.chasersReleased=true;const count=Math.round(levelValue(e,L.chasingYetis));
    releaseLevelChasers(e,count,levelValue(e,L.chaserSpeedKmh),levelValue(e,L.chaserSpeedSpreadKmh??0),['THERE! GET HIM!','BREAKFAST IS LEAVING!','RUN, LITTLE SKIER!']);
    if(e.kind==='piedPiper')announce(count+' YETIS ARE RIGHT BEHIND YOU','LOSE THEM: SKIERS ARE TASTIER THAN YOU',C.red,3);
  }
  if(e.kind==='piedPiper')e.onTail=state.chasers.filter(c=>c.encounter===e&&!c.dead&&!c.eaten&&!c.leaving&&!c.satedLeave&&c.y>p.y-S.endless.yetis.nearbyMetres*PX_PER_M*s).length;
  else if(e.kind==='avalanche')updateAvalanche(e,L,dt);
  else if(e.kind==='burrowField')updateBurrowField(e,L);
  else if(e.kind==='sleepingGiants')updateSleepingGiants(e,L,dt);
}
// Pied Piper Yetis are greedy: a skier well off their route still draws them in.
function levelDivertWidth(hunter){return hunter?.encounter?.level?2:1;}
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
  const tx=clamp(p.x+p.vx*ahead+range(-25,25),b.left+40,b.right-40),ty=p.y+p.vy*ahead,sx=side<0?b.left-40:b.right+40,sy=ty+range(-80,30);
  entity('burrower',sx,sy,{arcadeRun:e.section,encounter:e,r:0,width:42,fieldBurrower:true,burrowState:'rushing',rushAt:clock,burrowTrail:[],
    targetX:tx,targetY:ty,rushSpeed:Math.hypot(tx-sx,ty-sy)/travel,strikePause:pause});
  beep(side<0?140:160,.06,'triangle',.012);
}
// It runs straight for the spot it chose: steer off your line, take a jump or reach ice and it misses.
function rushFieldBurrower(o,dt){
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
function levelNoiseRadius(e,L){
  const p=state.p,kmh=Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed;
  return (levelValue(e,L.baseRadiusMetres)+Math.max(0,kmh-levelValue(e,L.quietKmh))*levelValue(e,L.metresPerKmh))*PX_PER_M;
}
function updateSleepingGiants(e,L,dt){
  const p=state.p,radius=p.fall||p.awaitingInput?levelValue(e,L.baseRadiusMetres)*PX_PER_M:levelNoiseRadius(e,L);
  for(const o of state.objects){
    if(!o.sleeper||o.encounter!==e||o.giantAwake||o.dead||o.eaten||(o.type!=='lurker'&&o.type!=='bear'))continue;
    const inside=Math.hypot(o.x-p.x,o.y-p.y)<radius;
    o.stir=Math.max(0,(o.stir||0)+(inside?dt:-dt*.5));
    if(o.stir>=levelValue(e,L.stirSeconds)){o.giantAwake=true;say(o.type==='bear'?'GRRR!':pick(['WHO WOKE ME?!','ROAAAR!','FOOD?!']),o,1.4);}
  }
  // A woken giant charges hard, but only for a few seconds: then it is too sleepy to care and wanders off to lie down.
  // Waking one ahead of you is deadly; waking one behind costs nothing if you keep your speed.
  for(const c of state.chasers){
    if(c.encounter!==e||c.leaving||c.dead||c.eaten)continue;
    c.chargeUntil??=clock+levelValue(e,L.chargeSeconds);
    if(clock>c.chargeUntil){c.leaving=true;say(pick(['Zzz... too sleepy.','Ugh. Not worth it.','*YAWN* Back to bed.']),c,1.8);}
  }
}
// Sleeping Giants overrides: sleepers wake only when your noise has stirred them long enough.
function levelWakeOverride(o){
  if(o.sleeper&&o.encounter?.kind==='sleepingGiants')return o.giantAwake?Infinity:-1;
  return null;
}
function levelSpeedWarning(){
  const e=state.endless?endlessEncounterAt(state.p.y):null;if(e?.kind!=='sleepingGiants')return false;
  return Math.hypot(state.p.vx,state.p.vy)*S.physics.hudKmhPerSpeed>levelValue(e,levelConfig(e).quietKmh);
}
function drawLevelGround(){
  const e=state.endless?endlessEncounterAt(state.p.y):null;if(e?.kind!=='sleepingGiants'||!state.started)return;
  const L=levelConfig(e),r=levelNoiseRadius(e,L)*ZOOM,s=screen(state.p.x,state.p.y),loud=levelSpeedWarning();
  ctx.save();ctx.globalAlpha=loud?.55:.3;ctx.strokeStyle=loud?C.red:C.teal;ctx.lineWidth=2;ctx.setLineDash([4,5]);
  ctx.beginPath();ctx.ellipse(s.x,s.y,r,r*.8,0,0,TAU);ctx.stroke();ctx.restore();
}
function drawLevelMarks(){
  drawAvalancheWarnings();
  const e=state.endless?endlessEncounterAt(state.p.y):null;
  if(e?.kind==='piedPiper'&&e.chasersReleased&&state.started)text('YETIS ON YOUR TAIL: '+e.onTail,W/2,84,10,e.onTail?C.red:C.teal,'center',1);
  if(e?.kind!=='sleepingGiants')return;
  const L=levelConfig(e);
  for(const o of state.objects){
    if(!o.sleeper||o.encounter!==e||o.dead||o.eaten||o.giantAwake||(o.type!=='lurker'&&o.type!=='bear'))continue;
    const s=screen(o.x,o.y);if(s.y<-40||s.y>H+40||s.x<-40||s.x>W+40)continue;
    const t=(o.stir||0)/levelValue(e,L.stirSeconds),top=s.y-(o.width||50)*ZOOM-6;
    if(t>.65)text('!',s.x,top,12,C.red,'center',1);
    else if(t>.15)text('?',s.x,top,11,C.gold,'center',1);
    else{const k=(clock*.6+o.phase)%1;ctx.save();ctx.globalAlpha=.8*Math.sin(k*Math.PI);text('Z',s.x+6+k*6,top-k*10,8,C.muted);ctx.restore();}
  }
}
function drawLevelProp(o,s){
  if(o.type!=='shhhSign')return false;
  shadow(s.x,s.y,6,2);box(s.x-1,s.y-28,3,28,'#6b4f3c');box(s.x-24,s.y-40,48,14,'#e9d9b8');box(s.x-24,s.y-27,48,1,'#8e6a4e');
  text('SHHH!',s.x,s.y-31,8,C.red,'center',1);text('SPEED IS NOISE',s.x,s.y-48,7,C.ink);
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
