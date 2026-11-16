/* First-day introductions and shared werewolf/Yeti rivalries. Embedded by build.py. */
const INTRO_KINDS=new Set(['werewolfIntro','ravagerIntro']);
const CREATURE_INTRO={werewolf:'werewolfIntro',ravager:'ravagerIntro',burrower:'burrowField'};
function rememberCreatureIntroduction(e){
  const kind=Object.keys(CREATURE_INTRO).find(k=>CREATURE_INTRO[k]===e.kind);if(!kind)return;
  const a=state.endless;a.creatureUnlockY??={};a.creatureUnlockY[kind]??=e.endY;
}
function creatureUnlocked(kind,y){
  const a=state.endless;if(!a)return false;if(a.debug)return true;
  const R=S.endless.regions;
  if(R.creatureIntroductions.unlockAfterIntro&&R.enabled&&R.order.includes(CREATURE_INTRO[kind]))return y>=(a.creatureUnlockY?.[kind]??Infinity);
  return endlessStage((y-a.startY)/PX_PER_M)>=(kind==='ravager'?S.endless.stages.ravagerStage:S.endless.stages.introduce?.[kind]??1);
}
function creatureUnlockMetres(a){return Object.fromEntries(Object.entries(a.creatureUnlockY||{}).map(([k,y])=>[k,(y-a.startY)/PX_PER_M]));}
function resumeRegionCursor(c){
  const order=S.endless.regions.order;
  if(c.regionOrder?.join('|')===order.join('|'))return c.regionOrderIndex;
  // Towns occur once per lap in both the old and the current playlist. Preserve that lap across a playlist edit.
  const index=order.indexOf(c.kind);return index<0?c.regionOrderIndex:Math.max(0,c.visit-1)*order.length+index+1;
}
function restoreCreatureIntroductions(a,c){
  a.creatureUnlockY={};const R=S.endless.regions;
  for(const [kind,intro] of Object.entries(CREATURE_INTRO)){
    const saved=c.creatureUnlockMetres?.[kind];
    if(Number.isFinite(saved)&&saved>=0)a.creatureUnlockY[kind]=a.startY+saved*PX_PER_M;
    else if(a.regionOrderIndex>R.order.indexOf(intro)+1&&R.order.includes(intro))a.creatureUnlockY[kind]=a.startY+c.metres*PX_PER_M;
  }
}
function planCreatureIntroduction(e,section){
  const root=section.endlessRoot,length=e.endY-e.startY;
  Object.assign(e,{title:e.kind==='werewolfIntro'?'One Last Pedestrian':'Bigger Problems',noNewPredators:true,noFlags:false,half:190,band:Math.max(1000,S.endless.regions.minimumWidthMetres*PX_PER_M/2),centerX:root.x,introActors:[]});
  e.paths=[[{x:root.x,y:e.startY},{x:root.x,y:e.startY+length*.35},{x:root.x+140,y:e.startY+length*.65},{x:root.x-100,y:e.startY+length*.85},{x:root.x,y:e.endY}]];e.paths[0].linear=true;
  const road={surface:'snow',width:150,points:e.paths[0],endlessEncounter:e,endlessEndY:e.endY};state.roads.push(road);e.snowRoad=road;clearSnowRoadTrees(road);
}
function populateCreatureIntroduction(e,section,from,to){
  const path=e.paths[0],length=e.endY-e.startY,own={arcadeRun:section,encounter:e},at=t=>({x:encounterPathX(path,e.startY+length*t),y:e.startY+length*t});
  populateForestBoundary(e,section,from,to,{banks:false});
  const once=(key,t,spawn)=>{const p=at(t);if(e[key]||p.y<from||p.y>=to)return;e[key]=true;spawn(p);};
  for(let i=0;i<10;i++)once('introTree'+i,.04+i*.095,p=>{for(const side of [-1,1])entity(i%3?'pine':'fir',p.x+side*(e.kind==='werewolfIntro'?410:range(260,440)),p.y,{...own,width:70,r:18});});
  if(e.kind==='werewolfIntro'){
    for(let i=0;i<4;i++)once('introHouse'+i,.12+i*.2,p=>{for(const side of [-1,1])entity(side<0?'lodge':'rental',p.x+side*235,p.y,{...own,width:150,r:65});});
    once('introWolf',.27,p=>{e.introWolf=entity('personGreen',p.x+40,p.y,{...own,r:10,width:32,werewolf:true,werewolfState:'disguised',werewolfName:'Jim',walker:false,roam:0,pauseUntil:Infinity});});
    for(let i=0;i<4;i++)once('introWitness'+i,.27+i*.035,p=>entity(i%2?'personRed':'personYellow',p.x+(i%2?-1:1)*110,p.y,{...own,r:10,width:30,walker:true,path:[{x:p.x-110,y:p.y},{x:p.x+110,y:p.y+90}],pathIndex:1,pathDir:1,walkSpeed:18}));
  }else{
    once('introRavager',.25,p=>{const speed=S.endless.yetis.speedKmh[1]*S.endless.yetis.ravager.speedMultiplier,h=entity('lurker',p.x+70,p.y,{...own,width:55,r:18,ravager:true,introStaged:true,arcadeTier:'fast',endlessBaseKmh:speed,yetiSpeedKmh:speed,wakeSeconds:.15});h.ravagerIntroPrey=spawnRavagerPrey(h,{x:h.x+35,y:h.y+55});e.introActors.push(h);});
    once('introOrdinary',.66,p=>{const speed=S.endless.yetis.speedKmh[0],h=entity('lurker',p.x-145,p.y,{...own,width:55,r:18,introStaged:true,arcadeTier:'slow',endlessBaseKmh:speed,yetiSpeedKmh:speed,wakeSeconds:1});e.introActors.push(h);});
  }
}
function awakenYeti(o){
  if(o.type!=='lurker'||o.dead||o.eaten)return null;
  retype(o,'awakened');o.r=0;const hunter={kind:o.arcadeTier==='slow'?'slow':'fast',arcadeTier:o.arcadeTier,ravager:o.ravager,ravagerIntroPrey:o.ravagerIntroPrey,encounter:o.encounter,chaseRun:o.arcadeRun,shoreLake:o.shoreLake,endlessBaseKmh:o.endlessBaseKmh,x:o.x,y:o.y,speed:o.arcadeRun?o.yetiSpeedKmh/S.physics.hudKmhPerSpeed:topSpeed()*S.wildlife.yetiWildSpeedRatio,wakeUntil:clock+yetiWakeDelay(o),phase:o.phase,expires:state.p.y+S.wildlife.yetiWildChaseDistance,talkAt:clock+6};
  if(hunter.ravagerIntroPrey)hunter.ravagerIntroPrey.ravagerIntroFor=hunter;state.chasers.push(hunter);return hunter;
}
function updateCreatureIntroductions(){
  if(!state.endless||!state.started)return;
  for(const e of state.endless.encounters)if(INTRO_KINDS.has(e.kind))for(const h of e.introActors){
    if(!h.introStaged||h.dead||h.eaten||h.type!=='lurker')continue;const s=screen(h.x,h.y);
    if(s.x>30&&s.x<W-30&&s.y>110&&s.y<H-70&&Math.hypot(h.x-state.p.x,h.y-state.p.y)<Math.max(360,state.p.speed*1.3)){h.introStaged=false;awakenYeti(h);}
  }
}
let feudScanAt=0,feudCourse=null;
function feudAlive(o){return o&&!o.dead&&!o.eaten&&!o.leaving&&!o.retiring;}
function feudReady(o){return feudAlive(o)&&!o.waiting&&!(o.wakeUntil>clock)&&!(o.stunnedUntil>clock)&&!(o.feedingUntil>clock)&&!(o.scaredUntil>clock);}
function clearMonsterFeud(o){const other=o.monsterRival;o.monsterRival=o.monsterFight=null;if(other?.monsterRival===o)other.monsterRival=other.monsterFight=null;}
function monstersSee(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),near=nearbyFootprints((a.x+b.x)/2,(a.y+b.y)/2,d/2+30),steps=Math.ceil(d/25);
  for(let i=1;i<steps;i++)if(near.some(o=>obstacleClearance(o,a.x+dx*i/steps,a.y+dy*i/steps)<5))return false;return true;
}
function updateMonsterFeuds(){
  if(!state.started)return;if(feudCourse!==state.course){feudCourse=state.course;feudScanAt=0;}
  if(clock<feudScanAt)return;feudScanAt=clock+.25;
  const wolves=objectGroups().werewolves.filter(o=>o.werewolfState==='wolf'&&feudAlive(o)),yetis=state.chasers.filter(o=>['fast','slow'].includes(o.kind)&&feudAlive(o)),sleepers=state.objects.filter(o=>o.type==='lurker'&&!o.introStaged&&feudAlive(o));
  const live=new Set([...wolves,...yetis]);for(const o of live)if(o.monsterRival&&(!live.has(o.monsterRival)||!feudAlive(o.monsterRival)))clearMonsterFeud(o);
  const notice=S.predators.monsterFeuds.noticeMetres*PX_PER_M;
  for(const wolf of wolves){
    if(wolf.monsterRival||!feudReady(wolf))continue;let best=null,distance=notice;
    for(const yeti of [...yetis,...sleepers]){
      if(yeti.monsterRival||!feudReady(yeti)||!!activeCourseOwner(yeti)!==!!activeCourseOwner(wolf))continue;
      if(humanArea(yeti.x,yeti.y)&&!courseCreature(yeti,yeti.x,yeti.y))continue;
      const d=Math.hypot(yeti.x-wolf.x,yeti.y-wolf.y);if(d<distance&&monstersSee(wolf,yeti)){best=yeti;distance=d;}
    }
    if(!best)continue;if(best.type==='lurker'){best=awakenYeti(best);best.wakeUntil=clock;yetis.push(best);}
    wolf.monsterRival=best;best.monsterRival=wolf;for(const o of [wolf,best]){o.divert=o.obstacleDetour=null;o.avoidUntil=0;}
    say('GRRR!',wolf,1);say('YOU AGAIN!',best,1);
  }
}
function updateMonsterFeudActor(o,dt){
  const other=o.monsterRival;if(!other)return false;
  if(!feudAlive(o)||!feudAlive(other)||Math.hypot(o.x-other.x,o.y-other.y)>S.predators.monsterFeuds.noticeMetres*PX_PER_M*2){clearMonsterFeud(o);return false;}
  if(!feudReady(o)&&!o.monsterFight)return false;
  if(resolveEnemyContact(o,{ramOnly:true})){if(o.dead)clearMonsterFeud(o);return true;}
  if(!o.monsterFight){
    const distance=Math.hypot(o.x-other.x,o.y-other.y);
    if(distance>32){const speed=o.speed??S.endless.encounterEnemies.werewolf.speedKmh/S.physics.hudKmhPerSpeed;travel(o,Math.atan2(other.y-o.y,other.x-o.x),speed,dt,false,true,true,true,other);if(o.werewolf){o.gaitDistance=(o.gaitDistance||0)+speed*dt;o.werewolfFlip=other.x<o.x;}return true;}
    if(!monstersSee(o,other))return true;
    const yeti=o.werewolf?other:o,wolf=o.werewolf?o:other,fight={yeti,wolf,start:clock,until:clock+S.predators.monsterFeuds.fightSeconds};fight.winner=yeti.ravager||random()<.5?yeti:wolf;o.monsterFight=other.monsterFight=fight;
  }
  o.running=true;o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
  const fight=o.monsterFight;if(clock<fight.until)return true;
  const winner=fight.winner,loser=winner===fight.yeti?fight.wolf:fight.yeti;clearMonsterFeud(o);knockDownByTerrain(loser);state.speech=state.speech.filter(q=>q.object!==loser);winner.divert=null;winner.feedingUntil=clock+S.predators.monsterFeuds.winnerPauseSeconds;winner.nextDivertCheck=winner.feedingUntil;say('HMPH!',winner,1.2);return true;
}
function drawMonsterFight(o,s){
  const f=o.monsterFight;if(!f||!feudAlive(o)||!feudAlive(o.monsterRival))return false;
  const side=Math.sign(o.monsterRival.x-o.x)||1,phase=(clock-f.start)*12,shove=Math.sin(phase)*2;
  ctx.save();ctx.translate(Math.round(side*(1+shove)),Math.round(Math.abs(Math.cos(phase))));ctx.translate(s.x,s.y);ctx.rotate(side*.08);ctx.translate(-s.x,-s.y);
  if(o.werewolf)drawEncounterEnemy({...o,werewolfFlip:side<0,gaitDistance:(clock-f.start)*260},s,false);else drawYeti(o,s,'alert',56);ctx.restore();
  if(o===f.yeti){const x=(s.x+screen(f.wolf.x,f.wolf.y).x)/2,y=(s.y+screen(f.wolf.x,f.wolf.y).y)/2-8;for(let i=0;i<6;i++){const a=i*TAU/6+phase*.3,r=5+(phase+i*2)%9;box(x+Math.cos(a)*r,y+Math.sin(a)*r*.5,3,2,i%2?'#e9e9da':'#b8c5c6');}for(let i=0;i<2;i++){const a=phase*.4+i*Math.PI;box(x+Math.cos(a)*13,y-18+Math.sin(a)*5,2,2,C.gold);}}return true;
}
