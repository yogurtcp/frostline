/* Approved generated sprites, physical dragon riding, steerable stone ram and Kitsune shell game. */
const LEGEND_V2=new Set(['dragon','mountain','kitsune']),FOX_DECOYS=objectView(o=>o.foxDecoy),RAM_GATES=objectView(o=>o.type==='gate');
const legendV2Art=new Map(),ramPreyCache={time:-1,index:null};
function legendV2Config(kind){return S.endless.regions.legendary[kind==='mountain'?'ram':kind];}
function legendV2Nearby(o){if(o.legendKind==='giant')return !o.eaten&&state.p.y>o.homeY-1300&&state.p.y<o.homeY+((S.endless.regions.legendary.giantWindMetres??150)+30)*PX_PER_M;return LEGEND_V2.has(o.legendKind)||LEGEND_V3.has(o.legendKind)||o.legendKind==='kelpie'?!o.eaten&&Math.abs(state.p.y-o.y)<2100&&Math.abs(state.p.x-o.x)<1500:legendNearby(o);}
function setupLegendV2(o,showcase){
  if(!LEGEND_V2.has(o.legendKind))return;o.showcase=showcase;o.travelled=0;o.gait=0;
  if(o.legendKind==='dragon'){
    Object.assign(o,{legendState:'hover',altitude:48,rideUsed:false,flightStarted:0});
    // An actual jump is required to board. This ramp belongs to the same streamed scene.
    const ramp=entity('smallHill',o.x,o.y-280,{arcadeRun:o.arcadeRun,encounter:o.encounter,r:55,width:130,arcadeFeature:true,jumpSeconds:1.3,jumpDurationCap:1.5,dragonRamp:o});o.boardingRamp=ramp;
    if(showcase)for(const [dy,dx] of [[450,0],[1150,-70],[1900,70],[2800,0]])addLegendGate(o,o.x+dx,o.y+dy,78);
  }else if(o.legendKind==='mountain'){
    Object.assign(o,{legendState:'sleep',heading:0,targetHeading:0,rollAngle:0,ramRadius:72,r:72,nudges:0});
    if(showcase){for(let row=0;row<3;row++)for(const side of [-1,1])entity(row%2?'fir':'pine',o.x+side*(row===1?80:150),o.y+1600+row*900,{arcadeRun:o.arcadeRun,encounter:o.encounter,r:21,width:78});addLegendGate(o,o.x,o.y+1050,80);addLegendGate(o,o.x+130,o.y+2100,80);entity('lurker',o.x,o.y+1750,{arcadeRun:o.arcadeRun,encounter:o.encounter,width:55,r:18,arcadeTier:'slow',yetiSpeedKmh:68,endlessBaseKmh:68,wakeSeconds:2.5});}
  }else{
    Object.assign(o,{legendState:'watch',foxes:[],splits:0,foxLane:Math.floor(random()*3)-1,foxSpeed:range(...legendV2Config('kitsune').speedRatio),foxHeading:0});
  }
}
function addLegendGate(o,x,y,half){
  const root=o.arcadeRun.endlessRoot||state.course,number=++state.endless.gateNumber,gate=entity('gate',x,y,{r:0,half,width:half*2,run:root,number,color:C.teal,gear:'shield',gearWeight:1,encounter:o.encounter,legendTeachingGate:true});root.totalGates++;return gate;
}
function moveDragonRider(p,dt){
  const d=p.dragonRide;if(!d)return false;
  if(d.eaten||d.defeated||state.deathTimer||!state.objects.includes(d)){releaseDragonRide(d,false);return false;}
  const K=legendV2Config('dragon');p.walkOrigin={x:p.x,y:p.y};
  p.dragonOffsetX+=(Math.sin(p.desiredHeading)||0)*115*dt;
  if(Math.abs(p.dragonOffsetX)>K.deckHalfWidthMetres*PX_PER_M||Math.cos(p.desiredHeading)<-.2){releaseDragonRide(d,false);return false;}
  p.x=d.x+p.dragonOffsetX;p.y=d.y-64;p.speed=topSpeed()*K.rideSpeedRatio;p.vx=d.motionVx||0;p.vy=d.motionVy||p.speed;
  p.air=1;p.airTotal=0;p.onIce=false;p.onRugged=false;p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.gateBoost=Math.max(0,(p.gateBoost||0)-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);
  p.impactMotion={stamp:clock,x:p.walkOrigin.x,y:p.walkOrigin.y,vx:p.vx,vy:p.vy,speed:p.speed,heading:p.heading,mode:p.mode,air:1,fall:0,awaitingInput:false};return true;
}
function boardDragon(o){
  const p=state.p;if(p.dragonRide||p.fall||p.awaitingInput||p.air<=0||o.rideUsed||o.legendState==='dive'||o.legendState==='departed')return false;
  const height=p.airTotal?Math.sin((1-p.air/p.airTotal)*Math.PI)*p.jumpHeight:0;
  if(height<20||Math.abs(height-(o.altitude+48))>85||Math.abs(p.x-o.x)>90||Math.abs(p.y-(o.y-64))>80)return false;
  p.dragonRide=o;p.dragonOffsetX=clamp(p.x-o.x,-42,42);p.x=o.x+p.dragonOffsetX;p.y=o.y-64;p.air=1;p.airTotal=0;p.landingSteer=null;p.landingFeedback=null;p.onIce=false;
  o.rideUsed=true;o.legendState='riding';o.rideAt=clock;state.lastTrack=null;
  announce('DRAGON RIDER','STEER OFF A WING BEFORE IT DIVES - GATES ARE BELOW YOU',C.teal,2.7);burst(p.x,p.y,C.gold,12);return true;
}
function releaseDragonRide(o,forced=false){
  const p=state.p;if(p.dragonRide!==o)return;
  delete p.dragonRide;const side=Math.sign(p.dragonOffsetX)||Math.sign(Math.sin(p.desiredHeading))||1;
  p.heading=p.desiredHeading=side*.52;p.mode='slide';p.air=p.airTotal=0;p.jumpLock=0;p.speed=Math.max(p.speed,topSpeed()*1.12);p.onIce=false;
  launch(forced?.65:legendV2Config('dragon').exitJumpSeconds,1.5);p.dragonBoardBlockedUntil=clock+3;
  if(forced){p.dragonBadLanding=o;announce('MISSED THE EXIT','BRACE FOR A SNOWY LANDING',C.blue,1.8);}else{p.boost=Math.max(p.boost,1.2);say('WHEEE!',p,1.4);}
  o.legendState='dive';o.diveAt=clock;delete p.dragonOffsetX;
}
function updateDragon(o,dt,previous){
  const p=state.p,K=legendV2Config('dragon');
  if(o.legendState==='hover'){
    if(o.showcase&&!o.demoHunter&&p.y>o.homeY-650){o.demoHunter=true;state.chasers.push({kind:'fast',arcadeTier:'special',x:p.x-80,y:p.y-160,chaseRun:o.arcadeRun,speed:94/S.physics.hudKmhPerSpeed,endlessBaseKmh:94,phase:0,expires:Infinity,wakeUntil:clock,talkAt:clock+8});}
    if(p.y>o.homeY-500){o.flightStarted||=clock;o.y+=K.hoverKmh/S.physics.hudKmhPerSpeed*dt;}
    o.altitude=48+Math.sin(clock*2)*3;
    if(clock>=(p.dragonBoardBlockedUntil||0))boardDragon(o);
    if(!o.rideUsed&&(p.y>o.y+220||o.flightStarted&&clock-o.flightStarted>10)){o.legendState='departed';o.departAt=clock;}
  }else if(o.legendState==='riding'){
    const t=clock-o.rideAt,remaining=K.rideSeconds-t,bend=Math.sin(t*.8)*.18;o.bank=ease(o.bank||0,bend,3,dt);
    o.x+=Math.sin(o.bank)*topSpeed()*.28*dt;o.y+=topSpeed()*K.rideSpeedRatio*dt;o.altitude=ease(o.altitude,100,2,dt);
    if(p.dragonRide===o){p.x=o.x+p.dragonOffsetX;p.y=o.y-64;p.speed=topSpeed()*K.rideSpeedRatio;p.vy=p.speed;p.vx=Math.sin(o.bank)*topSpeed()*.28;}
    if(remaining<K.warnSeconds&&!o.warned){o.warned=true;say('DIVING SOON!',o,K.warnSeconds);beep(380,.15);}
    if(remaining<=0)releaseDragonRide(o,true);
  }else{
    o.y+=topSpeed()*1.1*dt;o.x+=(o.legendState==='dive'?90:35)*dt;o.altitude=ease(o.altitude,o.legendState==='dive'?5:240,2,dt);o.bank=ease(o.bank||0,.18,3,dt);
    if(p.y>o.y+1200||clock-(o.diveAt||o.departAt||clock)>9)o.eaten=true;
  }
}
function ramNearPass(o,previous){
  const p=state.p,K=legendV2Config('mountain');if(p.air||p.fall||p.awaitingInput||p.speed<topSpeed()*.65||clock<(o.nudgeUntil||0))return false;
  const px=previous.x-o.motionFromX,py=previous.y-o.motionFromY,dx=p.x-o.x,dy=p.y-o.y;
  if(py>=0||dy<0)return false;const t=clamp(-py/(dy-py||1),0,1),across=mix(px,dx,t),gap=Math.abs(across)-o.ramRadius;
  if(gap<8||gap>K.flankGapMetres*PX_PER_M)return false;
  o.targetHeading=clamp(o.targetHeading-Math.sign(across)*K.nudgeRadians,-K.maxHeadingDegrees*Math.PI/180,K.maxHeadingDegrees*Math.PI/180);o.nudgeUntil=clock+.8;o.nudges++;
  burst(o.x+Math.sign(across)*o.ramRadius,o.y,C.gold,7);say('HUP!',p,1);return true;
}
function ramHitsTerrain(o,previous){
  const radius=o.ramRadius,near=nearbyFootprints((o.x+previous.x)/2,(o.y+previous.y)/2,radius+Math.hypot(o.x-previous.x,o.y-previous.y)/2+40),samples=Math.max(1,Math.ceil(Math.hypot(o.x-previous.x,o.y-previous.y)/20));
  for(let i=0;i<=samples;i++){
    const x=mix(previous.x,o.x,i/samples),y=mix(previous.y,o.y,i/samples);
    for(const q of near){if(q===o||q.dead||q.eaten||q.r<=0||obstacleClearance(q,x,y)>=radius)continue;
      if(TREE_TYPES.has(q.type)||['stump','bush','fallenTree','fallingTree','wideLog','log'].includes(q.type)){
        q.eaten=true;entity('stump',q.x,q.y,{r:0,width:34,arcadeRun:o.arcadeRun,encounter:o.encounter});burst(q.x,q.y,'#bda986',8);o.smashed=(o.smashed||0)+1;invalidateSolidGrids();
      }else if(NPC_STATIC_SOLIDS.has(q.type)){
        const t=Math.max(0,(i-1)/samples);o.x=mix(previous.x,o.x,t);o.y=mix(previous.y,o.y,t);o.legendState='brake';o.r=o.ramRadius;invalidateSolidGrids();o.brakeAt=clock;o.rollSpeed=0;burst(o.x,o.y,C.ice,12);return;
      }
    }
  }
}
function ramHitsActors(o,previous){
  const radius=o.ramRadius+12;
  const hit=c=>!c.dead&&!c.eaten&&segmentDistance(c.x,c.y,previous,o)<radius;
  for(const c of state.chasers)if(['fast','slow','bear'].includes(c.kind)&&hit(c)){if(c.monsterRival)clearMonsterFeud(c);knockDownByTerrain(c);}
  for(const c of objectGroups().groundHunters)if(hit(c)){if(c.monsterRival)clearMonsterFeud(c);knockDownByTerrain(c);}
  for(const c of viewItems(FEUD_SLEEPERS))if(hit(c))knockDownByTerrain(c);
  if(ramPreyCache.time!==clock){ramPreyCache.time=clock;ramPreyCache.index=preyContactIndex();}
  for(const n of nearbyContactPrey(ramPreyCache.index,o,previous,radius))if(!n.dead&&!n.eaten&&!n.foxDecoy&&hit(n)){
    if(n.type==='skier'||n.type==='boarder')crashSkier(n,o);else if(n.type?.startsWith('person'))crashPedestrian(n,o);
  }
  for(const g of viewItems(RAM_GATES))if(!g.legendSmashed&&Math.abs(g.y-o.y)<radius&&Math.abs(g.x-o.x)<g.half+radius){
    // Only actual post contact smashes the opening; rolling through its centre can preserve it.
    if([-1,1].some(side=>segmentDistance(g.x+side*g.half,g.y,previous,o)<radius)){g.legendSmashed=true;burst(g.x,g.y,C.gold,8);say('MIND THE FLAGS!',o,1.3);}
  }
}
function updateStoneRam(o,dt,previous){
  const p=state.p,K=legendV2Config('mountain');
  if(o.legendState==='sleep'){
    if(p.y>o.homeY-K.noticeMetres*PX_PER_M&&p.y<o.homeY+120&&Math.abs(p.x-o.x)<(K.wakeSideMetres??60)*PX_PER_M&&p.speed>100){o.legendState='wake';o.wakeAt=clock;say('Hrrmph?',o,1.5);}legendBump(o,previous,o.x,o.y,60);return;
  }
  if(o.legendState==='wake'){if(clock-o.wakeAt<.45){legendBump(o,previous,o.x,o.y,60);return;}o.legendState='rolling';o.r=0;invalidateSolidGrids();o.rollAt=clock;o.rollSpeed=topSpeed()*K.rollSpeedRatio;say('RUMMMBLE',o,1.5);}
  if(o.legendState==='rolling'){
    o.heading=ease(o.heading,o.targetHeading,2.4,dt);const from={x:o.x,y:o.y},speed=o.rollSpeed;
    o.x+=Math.sin(o.heading)*speed*dt;o.y+=Math.cos(o.heading)*speed*dt;ramHitsTerrain(o,from);
    const moved=Math.hypot(o.x-from.x,o.y-from.y);o.travelled+=moved;o.rollAngle+=moved/o.ramRadius;
    ramNearPass(o,previous);ramHitsActors(o,from);legendBump(o,previous,o.x,o.y,o.ramRadius,false);
    if(clock>=(o.dustAt||0)&&moved){burst(o.x,o.y-35,C.ice,2);o.dustAt=clock+.12;}
    if(clock-o.rollAt>K.rollSeconds){o.legendState='brake';o.r=o.ramRadius;invalidateSolidGrids();o.brakeAt=clock;}
  }else if(o.legendState==='brake'){
    if(clock-o.brakeAt>2.5){o.legendState='rest';say('Zzz...',o,1.5);}
  }else if(o.legendState==='rest')legendBump(o,previous,o.x,o.y,52);
}
function startKitsuneSplit(o){
  const K=legendV2Config('kitsune');o.splits++;o.splitAt=clock;o.nextCross=clock+K.crossSeconds;
  if(o.foxes.length<2){for(const side of [-1,1].slice(o.foxes.length))o.foxes.push({x:o.x-side*8,y:o.y-12,oldX:o.x-side*8,oldY:o.y-12,foxHeading:o.foxHeading,foxSpeed:range(...K.speedRatio),foxLane:side,phase:range(0,TAU),r:0,gait:0});}
  // A shuffled destination permutation moves the real body into any lane without ever swapping identity.
  const lanes=[-1,0,1];for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[lanes[i],lanes[j]]=[lanes[j],lanes[i]];}
  [o,...o.foxes].forEach((f,i)=>{f.foxLane=lanes[i];f.foxSpeed=range(...K.speedRatio);f.turnAt=clock+K.crossSeconds;});
  burst(o.x,o.y,'#c9c0d4',10);
}
function updateKitsune(o,dt,previous){
  const p=state.p,K=legendV2Config('kitsune');
  if(o.rewarded){o.foxes=[];o.y+=topSpeed()*.8*dt;if(p.y>o.y+300||clock-o.caughtAt>3)o.eaten=true;return;}
  if(o.legendState==='watch'){
    if(p.y<o.y-K.noticeMetres*PX_PER_M||p.y>o.y+80||Math.abs(o.x-p.x)>(K.noticeSideMetres??70)*PX_PER_M)return;
    o.legendState='chase';o.chaseAt=clock;o.nextCross=clock+K.splitSeconds;o.foxHeading=(random()-.5)*.5;say('Catch me!',o,1.5);
  }
  if(clock-o.chaseAt>K.chaseSeconds||p.y>o.y+400){o.legendState='gone';o.eaten=true;return;}
  if(clock>=o.nextCross)startKitsuneSplit(o);
  const foxes=[o,...o.foxes];
  for(const f of foxes){f.oldX=f.x;f.oldY=f.y;
    // Give the original an observable uninterrupted start before the first copies emerge.
    const centre=o.homeX+Math.sin((clock-o.chaseAt)*.6)*55,targetX=centre+f.foxLane*145,targetY=f.y+260;
    const desired=Math.atan2(targetX-f.x,targetY-f.y);f.foxHeading=ease(f.foxHeading||0,desired,2.5,dt);
    const base=topSpeed()*f.foxSpeed,gap=f.y-p.y,targetSpeed=gap>300?Math.min(base,Math.max(80,p.vy*(.58+.17*f.foxSpeed/K.speedRatio[1]))):base;f.foxPace=ease(f.foxPace??targetSpeed,targetSpeed,5,dt);
    const speed=f.foxPace,goal={x:f.x+Math.sin(f.foxHeading)*250,y:f.y+Math.cos(f.foxHeading)*250};
    if(f.tumbleUntil>clock){f.foxPace=0;continue;}
    travel(f,Math.atan2(goal.y-f.y,goal.x-f.x),speed,dt,false,false,false,false,goal,false,false,true);
    // Foxes are solid little animals: running into a tree or rock sends them tumbling for a moment.
    if(clock>(f.tumbleImmune||0)&&nearbyFootprints(f.x,f.y,40).some(q=>q.r>0&&!q.legendBuried&&q!==o&&obstacleClearance(q,f.x,f.y)<6)){f.tumbleUntil=clock+.9;f.tumbleImmune=clock+1.8;burst(f.x,f.y,C.ice,8);say('Kyan!',f===o?o:f,.6);}
    const moved=Math.hypot(f.x-f.oldX,f.y-f.oldY);f.gait=(f.gait||0)+moved/70;if(Math.abs(f.x-f.oldX)>dt*20)f.facing=f.x<f.oldX;
  }
  // Equal opacity, size, navigation and animation for all three. No tracks or lasting visual tell.
  for(const f of o.foxes){if(f.popped)continue;const from={x:previous.x-f.oldX,y:previous.y-f.oldY},to={x:p.x-f.x,y:p.y-f.y};
    if(p.air<=0&&!p.fall&&!p.awaitingInput&&segmentDistance(0,0,from,to)<23){f.popped=true;burst(f.x,f.y,'#c8af8d',9);p.legendVeilUntil=clock+.3;say('POOF!',f,.6);}}
  o.foxes=o.foxes.filter(f=>!f.popped);
  const from={x:previous.x-o.oldX,y:previous.y-o.oldY},to={x:p.x-o.x,y:p.y-o.y};
  if(p.air<=0&&!p.fall&&!p.awaitingInput&&segmentDistance(0,0,from,to)<23){
    o.rewarded=true;o.caughtAt=clock;o.foxes=[];const a=state.endless||state.arcade;if(a)a.foxSpiritCharges=1;
    burst(o.x,o.y,C.gold,16);say('A FOX SPIRIT JOINS YOU!',p,2);beep(940,.12);if(state.endless?.legendShowcase)spawnLegendRewardHunter(o);
  }
}
function spawnLegendRewardHunter(o){
  const p=state.p,c={kind:'slow',arcadeTier:'slow',x:p.x+100,y:p.y-130,chaseRun:o.arcadeRun,speed:68/S.physics.hudKmhPerSpeed,endlessBaseKmh:68,phase:0,expires:Infinity,wakeUntil:clock+.4,talkAt:clock+9};state.chasers.push(c);
}
function updateLegendV2(o,dt,previous){
  if(LEGEND_V3.has(o.legendKind)){updateLegendV3(o,dt,previous);return true;}
  labReactions(o);labTick(o);
  if(!LEGEND_V2.has(o.legendKind))return false;
  if(o.legendKind==='dragon')updateDragon(o,dt,previous);else if(o.legendKind==='mountain')updateStoneRam(o,dt,previous);else updateKitsune(o,dt,previous);return true;
}
function keepFoxLure(hunter){
  const q=hunter.foxLure;if(!q)return false;
  if(q.dead||q.eaten||clock>=q.foxUntil){if(hunter.divert===q)hunter.divert=null;hunter.foxLure=null;hunter.nextDivertCheck=clock;return false;}
  hunter.divert=q;hunter.divertUntil=q.foxUntil;hunter.obstacleDetour=null;hunter.avoidUntil=0;return true;
}
function consumeFoxDecoy(hunter,q){hunter.motionVx=hunter.motionVy=hunter.travelSpeed=0;hunter.travelStamp=clock;q.eaten=true;q.r=0;hunter.divert=hunter.foxLure=null;hunter.feedingUntil=Math.max(clock+1,q.foxUntil);hunter.nextDivertCheck=hunter.feedingUntil;burst(q.x,q.y,'#b9d2e8',13);say('...?',hunter,1);}
function updateFoxSpirit(dt){
  const p=state.p,a=state.endless||state.arcade;
  for(const q of viewItems(FOX_DECOYS)){
    if(q.eaten)continue;if(clock>=q.foxUntil){q.eaten=true;burst(q.x,q.y,'#b9d2e8',9);continue;}
    const old={x:q.x,y:q.y},h=q.foxHunter,speed=Math.max(topSpeed()*1.04,(h?.speed||h?.wolfSpeedKmh/S.physics.hudKmhPerSpeed||topSpeed())*1.06);
    const goal={x:q.foxOriginX+q.foxSide*700,y:q.y+320};travel(q,Math.atan2(goal.y-q.y,goal.x-q.x),speed,dt,false,false,true,false,goal,false,false,true);
    q.vx=q.vy=0;q.foxGait=(q.foxGait||0)+Math.hypot(q.x-old.x,q.y-old.y);if(h)keepFoxLure(h);
  }
  if(!a?.foxSpiritCharges||p.air>0||state.sceneCard||state.deathTimer)return;
  const candidates=[...state.chasers,...objectGroups().groundHunters];let hunter=null,distance=230;
  for(const h of candidates){if(!['fast','slow','bear','wolf','zombie'].includes(enemyKind(h))||!feudReady(h)||h.monsterRival||h.foxLure||!activeCourseOwner(h)||h.type==='zombie'&&h.zombieRole!=='wanderer')continue;const d=Math.hypot(h.x-p.x,h.y-p.y);if(d<distance){hunter=h;distance=d;}}
  if(!hunter)return;const side=Math.sign(hunter.x-p.x)||1;
  const q=entity('skier',p.x+side*48,p.y-64,{arcadeRun:hunter.chaseRun||hunter.arcadeRun||state.course,foxDecoy:true,foxHunter:hunter,foxUntil:clock+legendV2Config('kitsune').spiritSeconds,foxOriginX:p.x,foxSide:side,width:42,r:12,vy:0,vx:0,foxGait:0});
  a.foxSpiritCharges=0;hunter.foxLure=q;keepFoxLure(hunter);burst(p.x,p.y,'#cabce2',12);say('OVER HERE!',q,1.5);
}
function v2Pose(name,pose=0){
  const key=name+':pose:'+pose;if(legendV2Art.has(key))return legendV2Art.get(key);
  const sizes={dragon:112,mountain:128,kitsune:48},keys={dragon:'legendDragon',mountain:'legendMountain',kitsune:'legendKitsune'},size=sizes[name],tile=document.createElement('canvas');tile.width=tile.height=size;
  tile.getContext('2d').drawImage(images[keys[name]],pose*size,0,size,size,0,0,size,size);legendV2Art.set(key,tile);return tile;
}
function dragonWingRig(){
  const key='dragon:rig';if(legendV2Art.has(key))return legendV2Art.get(key);
  const base=v2Pose('dragon'),t=base.getContext('2d'),p=t.getImageData(0,0,112,112),layers=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=c.height=112;return c;}),data=layers.map(c=>c.getContext('2d').createImageData(112,112));
  for(let y=0;y<112;y++)for(let x=0;x<112;x++){const i=(y*112+x)*4,k=y<86&&x<43?1:y<86&&x>73?2:0;data[k].data.set(p.data.subarray(i,i+4),i);}
  layers.forEach((c,i)=>c.getContext('2d').putImageData(data[i],0,0));legendV2Art.set(key,layers);return layers;
}
function dragonFlightTile(frame){
  const key='dragon:flight:'+frame;if(legendV2Art.has(key))return legendV2Art.get(key);
  const [body,left,right]=dragonWingRig(),tile=document.createElement('canvas');tile.width=tile.height=112;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const phase=frame/8*TAU,beat=Math.sin(phase),bob=Math.round(Math.cos(phase)*.7);
  for(const [part,x,side] of [[left,42,-1],[right,74,1]]){t.save();t.translate(x,76+bob);t.rotate(side*beat*.35);t.scale(1,.84+.16*Math.cos(phase));t.drawImage(part,-x,-76);t.restore();}t.drawImage(body,0,bob);legendV2Art.set(key,tile);return tile;
}
function kitsuneRunTile(frame){
  const key='kitsune:run:'+frame;if(legendV2Art.has(key))return legendV2Art.get(key);
  const phase=frame/8*TAU,base=v2Pose('kitsune',frame>=4?1:0),tile=document.createElement('canvas');tile.width=tile.height=48;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const d=base.getContext('2d').getImageData(0,0,48,48),out=t.createImageData(48,48);
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){const i=(y*48+x)*4;if(!d.data[i+3])continue;const leg=y>=33,tail=x<24&&y<33;const dx=leg?Math.round(Math.sin(phase+(x<27?Math.PI:0))*(y-32)/5):0,dy=tail?Math.round(Math.sin(phase+x*.15)):leg?-Math.round(Math.max(0,Math.cos(phase+(x<27?Math.PI:0)))):Math.round(Math.cos(phase*2)*.5);const nx=x+dx,ny=y+dy;if(nx>=0&&nx<48&&ny>=0&&ny<48)out.data.set(d.data.subarray(i,i+4),(ny*48+nx)*4);}
  t.putImageData(out,0,0);legendV2Art.set(key,tile);return tile;
}
function drawV2Tile(tile,s,cell,{flip=false,altitude=0,rotate=0,bob=0}={}){
  const scale=ZOOM/.5;ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y-altitude*ZOOM+bob));if(rotate)ctx.rotate(rotate);if(flip)ctx.scale(-1,1);ctx.drawImage(tile,Math.round(-cell/2*scale),Math.round(-(cell-8)*scale),Math.round(cell*scale),Math.round(cell*scale));ctx.restore();
}
function drawLegendV2(o,s){
  if(!LEGEND_V2.has(o.legendKind))return false;
  if(o.legendKind==='dragon'){
    shadow(s.x,s.y,30,7,.1);const diving=o.legendState==='dive',tile=diving?v2Pose('dragon',3):dragonFlightTile(Math.floor(clock*9)%8);drawV2Tile(tile,s,112,{altitude:o.altitude||0,rotate:o.bank||0});
    if(o.warned&&o.legendState==='riding'){const x=s.x+42,y=s.y-70-(o.altitude||0)*ZOOM;box(x,y,2,6,C.gold);box(x,y+8,2,2,C.gold);}
  }else if(o.legendKind==='mountain'){
    shadow(s.x,s.y,36,8,.1);
    if(o.legendState==='rolling'){
      const scale=ZOOM/.5;ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y-42*scale));ctx.rotate(o.rollAngle||0);ctx.drawImage(v2Pose('mountain',2),-64*scale,-78*scale,128*scale,128*scale);ctx.restore();
    }else{const pose=o.legendState==='sleep'||o.legendState==='rest'?0:o.legendState==='brake'?3:1;drawV2Tile(v2Pose('mountain',pose),s,128,{bob:pose===0?Math.round(Math.sin(clock*1.6)*.6):0});}
  }else{
    const splitting=clock-(o.splitAt??-100)<.23;
    const paint=f=>{const p=screen(f.x,f.y);if(f.tumbleUntil>clock){shadow(p.x,p.y,9,2,.08);artDraw('kitsune-tumble',Math.min(3,Math.floor((1-(f.tumbleUntil-clock)/.9)*4)),p.x,p.y,{flip:!!f.facing});return;}const tile=splitting?v2Pose('kitsune',3):o.rewarded?v2Pose('kitsune',2):kitsuneRunTile(Math.floor((f.gait||0)*8)%8);shadow(p.x,p.y,9,2,.08);drawV2Tile(tile,p,48,{flip:!!f.facing});};
    // Sort foxes by depth, never by real/illusion identity.
    [...o.foxes,o].sort((a,b)=>a.y-b.y).forEach(paint);
  }return true;
}
function drawLegendV2Marks(o){
  if(o.legendKind==='dragon'&&o.legendState==='hover'&&!o.rideUsed){const p=screen(o.x,o.y-64),y=p.y-(o.altitude||0)*ZOOM;for(const side of [-1,1]){const x=p.x+side*24;box(x,y-4,1,5,C.gold);box(x-2,y-2,5,1,C.gold);}}
  if(o.legendKind==='mountain'&&o.nudgeUntil>clock){const p=screen(o.x,o.y);line(p.x,p.y+5,p.x+Math.sin(o.targetHeading)*35,p.y+25,C.gold,2);}
}
function drawSmashedLegendGate(o,s){
  if(!o.legendSmashed)return false;for(const side of [-1,1]){const x=s.x+side*o.half*ZOOM;line(x,s.y,x+side*13,s.y-3,'#7a7184',2);box(x+side*8,s.y-4,7,3,o.color||C.teal);}text('X',s.x,s.y+9,8,'#8eaaa5');return true;
}
function drawFoxDecoy(o,s){
  if(!o.foxDecoy)return false;if(o.eaten||o.dead)return true;
  const a=clamp((o.foxUntil-clock)/.5,0,.65);ctx.save();ctx.globalAlpha=a;sprite('skier',s.x,s.y+8,42,{guest:true,flip:o.motionVx<0});ctx.globalAlpha=a*.8;for(let i=0;i<4;i++)box(s.x+(i-2)*4,s.y+8+i*3,2,2,'#b3c5e4');ctx.restore();return true;
}
function drawFoxSpirit(){
  const p=state.p,a=state.endless||state.arcade;if(!a?.foxSpiritCharges)return;
  const s=screen(p.x,p.y),scale=.5;ctx.save();ctx.globalAlpha=.9;const tile=v2Pose('kitsune',3);ctx.drawImage(tile,s.x+13,s.y-33,24,24);ctx.restore();
}
