/* Arcade challenge areas built from existing creatures and terrain:
   Pied Piper's Parade, Avalanche!, The Floor Is Burrowers and Sleeping Giants.
   Planning/population hook into planEndlessRegion/populateEndlessRegion; per-step rules live in updateLevelAreas.
   Tuning is in game-config.json endless.regions.levels. */
const LEVEL_KINDS=new Set(['piedPiper','avalanche','burrowField','sleepingGiants']);
const LEVEL_NAMES={piedPiper:"Pied Piper's Parade",avalanche:'Avalanche!',burrowField:'The Floor Is Burrowers',sleepingGiants:'Sleeping Giants'};
const LEVEL_HINTS={piedPiper:'LEAD EACH YETI INTO A CROWD - A FED YETI GOES HOME',avalanche:"DON'T STOP - STEER AROUND THE SNOWBALLS",burrowField:'STAY IN THE AIR - OR ON THE ICE',sleepingGiants:'SHHH! SKI A SLOW DIAGONAL - SPEED WAKES THEM'};
function levelConfig(e){return S.endless.regions.levels[e.kind];}
function levelValue(e,range){return Array.isArray(range)?mix(range[0],range[1],e.difficulty):range;}
function levelRows(e,from,to,step,offset,callback){
  for(let row=Math.max(0,Math.ceil((from-e.startY-offset)/step));;row++){const y=e.startY+offset+row*step;if(y>=to||y>=e.endY)break;callback(y,row);}
}
function planLevelArea(e,section){
  const root=section.endlessRoot,s=e.scale,length=e.endY-e.startY,side=pick([-1,1]);
  const point=(t,x=0)=>({x:root.x+x*s,y:e.startY+t*length});
  e.noFlags=true;e.noNewPredators=true;e.level=true;e.section=section;e.title=LEVEL_NAMES[e.kind];e.centerX=root.x;
  if(e.kind==='piedPiper'){e.half=260*s;e.paths=[[point(0),point(.25,side*160),point(.5,-side*140),point(.75,side*120),point(1)]];}
  else if(e.kind==='avalanche'){e.half=300*s;e.paths=[[point(0),point(.35,side*110),point(.7,-side*110),point(1)]];}
  else if(e.kind==='burrowField'){e.half=140*s;e.paths=[[point(0),point(.5,side*90),point(1)]];}
  else {e.half=mix(100,82,e.difficulty)*s;e.paths=[Array.from({length:7},(_,i)=>point(i/6,Math.sin(i*Math.PI/2)*150))];}
  e.paths[0].linear=e.kind!=='sleepingGiants';
  e.band=Math.max(e.half+320*s,S.endless.regions.minimumWidthMetres*PX_PER_M*s/2);
}
function populateLevelArea(e,section,from,to){
  const L=levelConfig(e),s=e.scale,path=e.paths[0],own={arcadeRun:section,encounter:e},at=y=>encounterPathX(path,y);
  populateForestBoundary(e,section,from,to,{banks:false});
  const sideTrees=(per100,inner,outer)=>{if(per100>0)levelRows(e,from,to,100*PX_PER_M*s/per100,40*s,(y,row)=>{const x=at(y)+(row%2?-1:1)*range(inner,outer);entity(row%3?'pine':'fir',x,y,{...own,width:range(58,82),r:17});});};
  if(e.kind==='piedPiper'){
    sideTrees(levelValue(e,L.sideTreesPer100Metres),e.half+40*s,e.half+260*s);
    // A Yeti waits right beside the entrance, so the parade starts as soon as you arrive.
    // It stands just uphill of the entrance, so it wakes as you pass and starts right behind you.
    if(from===e.startY)levelYeti(e,section,at(e.startY)+pick([-1,1])*90*s,e.startY-60*s).opener=true;
    const yetis=Math.round(levelValue(e,L.yetis)),crowds=Math.round(levelValue(e,L.crowds)),length=e.endY-e.startY;
    // Crowds stand just beside your line, still on the way for a Yeti chasing you down it.
    for(let i=0;i<crowds;i++){const y=e.startY+length*(i+.35)/crowds;if(y>=from&&y<to)levelCrowd(e,section,at(y)+(i%2?-1:1)*120*s,y,Math.round(levelValue(e,L.crowdPeople)));}
    for(let i=0;i<yetis;i++){const y=e.startY+length*(i+.45)/(yetis+.5);if(y>=from&&y<to)levelYeti(e,section,at(y)+(i%2?-1:1)*range(110,190)*s,y);}
  }else if(e.kind==='avalanche'){
    sideTrees(levelValue(e,L.sideTreesPer100Metres),e.half+30*s,e.half+240*s);
    const trees=levelValue(e,L.fallingTreesPer100Metres);
    // Trees stand close enough to fall right across the line you are skiing.
    if(trees>0)levelRows(e,from,to,100*PX_PER_M*s/trees,140*s,(y,row)=>{if(y>e.endY-120*s)return;const side=row%2?-1:1,x=at(y)+side*range(70,110)*s;entity('fallingTree',x,y,{...own,arcadeFeature:true,fallTowardX:at(y)});});
  }else if(e.kind==='burrowField'){
    sideTrees(levelValue(e,L.sideTreesPer100Metres),e.half+20*s,e.half+200*s);
    const spacing=levelValue(e,L.jumpSpacingMetres)*PX_PER_M*s,kinds=['ramp','mogul','smallHill','rainbow','largeHill','mogul'];
    levelRows(e,from,to,spacing,90*s,(y,row)=>{
      if(y>e.endY-90*s)return;
      // Every few jumps, a small frozen pool is a safe place to touch down: burrowers cannot dig through ice.
      const every=Math.round(levelValue(e,L.icePatchEvery));if(every&&row%every===every-1){entity('ice',at(y),y,{...own,rx:range(55,75)*s,ry:range(38,50)*s,width:130*s,r:0,arcadeFeature:true});return;}
      const item=createArcadeItem(kinds[row%kinds.length],at(y),y,section);item.encounter=e;
    });
    levelRows(e,from,to,levelValue(e,L.burrowerSpacingMetres)*PX_PER_M*s,60*s,y=>{if(y<e.endY-60*s)entity('burrower',at(y),y,{...own,r:0,width:42,burrowState:'waiting',fieldBurrower:true});});
    levelRows(e,from,to,55*PX_PER_M*s,30*s,(y,row)=>{const side=row%2?-1:1;entity(row%3?'rock':'stump',at(y)+side*(e.half+range(-20,30)),y,{...own,width:44,r:13});});
  }else{
    sideTrees(levelValue(e,L.treesPer100Metres),e.half+30*s,e.half+190*s);
    if(from===e.startY)entity('shhhSign',at(e.startY+40*s)+75*s,e.startY+40*s,{...own,r:0,width:40});
    levelRows(e,from,to,100*PX_PER_M*s/levelValue(e,L.sleepersPer100Metres),80*s,(y,row)=>{
      if(y>e.endY-60*s)return;
      const side=row%2?-1:1,x=at(y)+side*(e.half+range(30,60)*s),bear=random()<levelValue(e,L.bearShare);
      if(bear)entity('bear',x,y,{...ARCADE_ITEMS.bear,...own,ai:'idle',roam:0,nextAI:Infinity,sleeper:true});
      else levelYeti(e,section,x,y).sleeper=true;
      // A second giant further back on the other side makes a dense, sleeping crowd.
      if(row%3!==2)levelYeti(e,section,at(y+30*s)-side*(e.half+range(70,140)*s),y+30*s).sleeper=true;
    });
  }
}
function levelYeti(e,section,x,y){
  const Y=S.endless.yetis,speed=levelValue(e,levelConfig(e).yetiSpeedKmh??Y.speedKmh);
  return entity('lurker',x,y,{arcadeRun:section,encounter:e,width:55,r:18,arcadeTier:speed>90?'special':speed>78?'fast':'slow',yetiSpeedKmh:speed,endlessBaseKmh:speed});
}
function levelCrowd(e,section,cx,cy,count){
  const s=e.scale,own={arcadeRun:section,encounter:e};
  for(let i=0;i<count;i++){
    const angle=i*2.4,radius=(14+i*6)*s,x=cx+Math.cos(angle)*radius*.8,y=cy+Math.sin(angle)*radius*1.8;
    if(i%3===0)entity(pick(['personRed','personGreen','personYellow']),x,y,{...own,width:30,r:10});
    // Standing around chatting until a Yeti turns up; then they scatter like anyone else.
    else entity(i%4===1?'boarder':'skier',x,y,{...own,width:42,r:12,vy:0,vx:0,endlessBaseVy:0});
  }
}
// Pied Piper: a Yeti from this area that has eaten goes home, satisfied.
function levelSatedYeti(hunter){
  if(hunter.encounter?.kind!=='piedPiper'||hunter.satedLeave)return;
  hunter.satedLeave=true;
}
function updateLevelAreas(dt){
  const p=state.p,e=state.endless?endlessEncounterAt(p.y):null;
  for(const c of state.chasers)if(c.satedLeave&&!c.leaving&&!(c.feedingUntil>clock)){c.leaving=true;say(pick(['*BURP* Lovely. I am off home.','That hit the spot. Bye!','Full! See you never!']),c,2.2);}
  if(!e?.level||!state.started)return;
  const L=levelConfig(e);
  if(e.kind==='avalanche')updateAvalanche(e,L,dt);
  else if(e.kind==='sleepingGiants')updateSleepingGiants(e,L,dt);
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
  const line=encounterPathX(e.paths[0],p.y),x=clamp(p.x+range(-220,220),line-e.half,line+e.half),y=b.top-40;
  const ball=entity('rollingSnowball',x,y,{arcadeRun:e.section,encounter:e,arcadeFeature:true,avalancheBall:true});
  const f=S.terrainFeatures.rollingSnowball,{amplitude,omega}=snowballCurve(),base=Math.max(p.vy,S.endless.playerSpeedKmh/S.physics.hudKmhPerSpeed*.6);
  // Already at full speed: the motion clock starts in the past, so shift the origin back to keep the ball where it appears.
  const started=clock-f.accelerationSeconds*4,u=snowballMotion(clock-started).distanceTime,side=Math.sign(p.x-x)||1,amp=amplitude*range(.3,1),downhill=base+levelValue(e,L.ballExtraKmh)/S.physics.hudKmhPerSpeed;
  Object.assign(ball,{rollState:'rolling',rollStarted:started,rollOriginX:x-side*amp*(1-Math.cos(omega*u)),rollOriginY:y-downhill*u,rollNominalY:y,trailX:x,trailY:y,rollSide:side,
    rollAmplitude:amp,rollOmega:omega,rollDownhillSpeed:downhill,
    travelLimit:levelValue(e,L.ballTravelMetres)*PX_PER_M,trailSeconds:levelValue(e,L.trailSeconds)});
  if(random()<.3)state.screenShake=Math.max(state.screenShake,.12);
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
    if(o.stir>=levelValue(e,L.stirSeconds)){o.giantAwake=true;say(o.type==='bear'?'GRRR... WHO IS THAT?':'WHO WOKE ME?!',o,1.6);}
  }
}
// Sleeping Giants overrides: sleepers wake only when your noise has stirred them long enough.
function levelWakeOverride(o){
  if(o.sleeper&&o.encounter?.kind==='sleepingGiants')return o.giantAwake?Infinity:-1;
  // Pied Piper: Yetis wake as you pass them, so the parade always forms behind you.
  if(o.type==='lurker'&&o.encounter?.kind==='piedPiper'){
    const p=state.p;
    // The first Yeti waits until you are properly under way, so you always get a head start, even from a standstill.
    if(o.opener)return p.y>=o.encounter.startY+150*o.encounter.scale&&Math.hypot(p.vx,p.vy)*S.physics.hudKmhPerSpeed>=60?Infinity:-1;
    return p.y>=o.y-30&&Math.abs(p.x-o.x)<700?Infinity:-1;
  }
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
  const e=state.endless?endlessEncounterAt(state.p.y):null;if(e?.kind!=='sleepingGiants')return;
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
  text('SHHH!',s.x,s.y-31,8,C.red,'center',1);text('SLOW DOWN',s.x,s.y-48,7,C.ink);
  return true;
}

// Field burrowers prowl under the snow as small moving mounds, so the field looks infested before anything attacks.
function prowlFieldBurrower(o){
  if(o.prowlX===undefined)o.prowlX=o.x;
  o.x=o.prowlX+Math.sin(clock*.9+o.phase*3)*70*(o.encounter?.scale||1);
}
function drawProwlingBurrower(o,s){
  const wobble=Math.sin(clock*6+o.phase)*1;
  box(s.x-8,s.y-3+wobble,16,4,'#d7e3ec');box(s.x-5,s.y-6+wobble,10,3,'#f6f9f4');box(s.x+7,s.y-1,3,2,'#9fb4c4');
}

// Field burrowers hunt like sharks under the snow: they follow you, and strike only while you are on open snow.
function startFieldHunt(o){
  const p=state.p,b=viewBounds();if(p.air>0||p.fall||p.awaitingInput)return false;
  const side=Math.sign(o.x-p.x)||pick([-1,1]);o.x=side<0?Math.max(b.left-60,o.x):Math.min(b.right+60,o.x);o.y=Math.max(o.y,p.y-80);
  o.burrowState='rushing';o.rushAt=clock;o.r=0;o.burrowTrail=[];return true;
}
function huntFieldBurrower(o,dt){
  const p=state.p,e=o.encounter,F=levelConfig(e),lead=.3,tx=p.x+p.vx*lead,ty=p.y+p.vy*lead;
  const dx=tx-o.x,dy=ty-o.y,dist=Math.hypot(dx,dy),speed=Math.max(topSpeed(),Math.hypot(p.vx,p.vy))*levelValue(e,F.huntSpeed),step=speed*dt;
  o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
  const grounded=p.air<=0&&!p.fall&&!p.awaitingInput&&!patchAt(p.x,p.y);
  if(dist<=Math.max(step,40)&&grounded){
    o.x=tx;o.y=ty;o.burrowState='settled';o.settleAt=clock;o.strikePause=levelValue(e,F.strikePause);
    o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;return false;
  }
  // While you fly or glide on ice it shadows you from just behind, waiting for you to touch snow again.
  const hold=!grounded&&dist<160,angle=Math.atan2(dy,dx)+Math.sin((clock-o.rushAt)*6+o.phase)*.35;
  const move=hold?Math.min(step,Math.max(0,dist-120)):step;o.x+=Math.cos(angle)*move;o.y+=Math.sin(angle)*move;
  o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;o.travelSpeed=speed;o.travelStamp=clock;
  if(clock>=(o.nextTrailAt||0)){o.burrowTrail.push({x:o.x,y:o.y,until:clock+.8});if(o.burrowTrail.length>28)o.burrowTrail.shift();o.nextTrailAt=clock+.03;}
  if(clock-o.rushAt>levelValue(e,F.huntSeconds)){o.burrowState='closing';o.closeAt=clock;o.r=0;}
  return false;
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
