/* Creature lab: generated art for every legend, eight new folklore creatures, bystander reactions.
   Every creature must matter: a real danger to read, and/or gear worth the risk (never points). */
const CREATURE_ART=__CREATURE_ART__;
const LEGEND_V3=new Set(['witch','ghost','unicorn','griffin','medusa','cyclops','phoenix','genie']);
const LEGEND_SKY=new Set(['witch','griffin','phoenix']);
// Tuning for the lab prototypes. Move to game-config.json once a creature is approved for the real run.
const V3={
  bayMetres:{witch:700,ghost:650,unicorn:650,griffin:700,medusa:450,cyclops:450,phoenix:650,genie:500},
  witch:{seconds:22,potionEvery:1.7,fallSeconds:1,splashSeconds:6,splashRadius:34,swoopEvery:6,lowSeconds:1.1,altitude:50},
  ghost:{count:3,seconds:24,approachRatio:.45,followRatio:.97,blinkEvery:2.6,chillSeconds:.9,lampRadius:120},
  unicorn:{seconds:18,bondSeconds:2.5,near:66,touch:20,magicSeconds:6},
  griffin:{grabs:4,lockSeconds:1.2,diveSeconds:.35,carrySeconds:2.2,cooldown:2.4,altitude:150,reach:42},
  medusa:{lookSeconds:1,glareSeconds:.9,coneHalfDegrees:26,sectorDegrees:50,length:520,stoneSeconds:1.3,monsterStoneSeconds:4,mirrorReach:75},
  cyclops:{cycle:2.2,flightSeconds:1.2,hitRadius:36,maxRocks:12},
  phoenix:{seconds:24,updraftSeconds:1.1,slushSeconds:5,ashEvery:9},
  genie:{gateMetres:70,gateSpacing:150,gateHalf:44,yetis:3}
};
const LAB_REACTIONS={
  witch:{mode:'flee',lines:['A WITCH!','Duck! Potions!','Not the hat, not the hat!']},
  ghost:{mode:'flee',lines:['GHOST!','It went through the tree!','Brrrr... RUN!']},
  unicorn:{mode:'awe',lines:['A UNICORN!','Make a wish!','So shiny...','Did you see that?!']},
  griffin:{mode:'flee',lines:['GRIFFIN!','Watch the shadow!','It took Dave!']},
  medusa:{mode:'flee',lines:["DON'T LOOK AT HER!",'MEDUSA!','Eyes down!']},
  cyclops:{mode:'flee',lines:['ROCKS!','CYCLOPS!','Keep moving!']},
  phoenix:{mode:'awe',lines:['A PHOENIX!',"It's so warm!",'The snow is melting!']},
  genie:{mode:'awe',lines:['A GENIE!','Wish for hot cocoa!','Three wishes!']},
  hut:{mode:'flee',lines:['THE HOUSE IS WALKING!','Baba Yaga!','Chicken legs?!']},
  kitsune:{mode:'awe',lines:['A white fox!','Kitsune!','So many foxes...']},
  giant:{mode:'flee',lines:['GIANT!','Hold on to your hat!','So cold!']},
  kelpie:{mode:'flee',lines:['Stay off the ice!','A water horse!']},
  troll:{mode:'flee',lines:['TROLL!','Pay the toll!']},
  thunderbird:{mode:'flee',lines:['LIGHTNING!','THUNDERBIRD!']},
  gargoyle:{mode:'flee',lines:['IT MOVED!','The statue is alive!']},
  wisps:{mode:'awe',lines:['Pretty lights...','Follow the lights?']},
  dragon:{mode:'awe',lines:['DRAGON!!','Can I ride it?','WOW!']},
  mountain:{mode:'flee',lines:['ROLLING ROCK!','The mountain is awake!']}
};
const labState={yetis:true};
const POTIONS=['green','purple','orange'],POTION_COLORS={green:'#7fb069',purple:'#9a76c4',orange:'#e59a4d'};

// ---------- art ----------
function artDraw(name,frame,x,y,{alpha=1,altitude=0,flip=false,rotate=0,scale=1}={}){
  const f=CREATURE_ART[name]?.[frame],img=images['creature:'+name];if(!f||!img||alpha<=0)return;
  const k=ZOOM/.5*scale;ctx.save();if(alpha<1)ctx.globalAlpha*=alpha;ctx.translate(Math.round(x),Math.round(y-altitude*ZOOM));if(rotate)ctx.rotate(rotate);if(flip)ctx.scale(-1,1);
  ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(-f.anchor[0]*k),Math.round(-f.anchor[1]*k),Math.round(f.w*k),Math.round(f.h*k));ctx.restore();
}
function cycleFrame(list,fps,phase=0){return list[Math.floor(clock*fps+phase)%list.length];}
function drawLegendArtProp(o,s){if(!o.legendArt)return false;if(o.eaten||o.dead)return true;shadow(s.x,s.y,o.width*.28*ZOOM,4,.1);artDraw(o.legendArt.name,o.legendArt.frame,s.x,s.y);return true;}

// ---------- shared helpers ----------
function labOwn(o){return {arcadeRun:o.arcadeRun,encounter:o.encounter};}
function labHumans(x,y,radius){const out=[];for(const n of viewItems(CAT_AUDIENCE_VIEW))if(!n.eaten&&!n.dead&&!n.legendCarried&&!n.foxDecoy&&Math.abs(n.x-x)<radius&&Math.abs(n.y-y)<radius&&Math.hypot(n.x-x,n.y-y)<radius)out.push(n);return out;}
function labMonsters(){const out=[];for(const c of state.chasers)if(['fast','slow','bear'].includes(c.kind)&&!c.dead&&!c.eaten&&!c.leaving)out.push(c);for(const c of objectGroups().groundHunters)if(!c.dead&&!c.eaten)out.push(c);return out;}
function knockHuman(n,cause){if(n.type==='skier'||n.type==='boarder')crashSkier(n,cause);else crashPedestrian(n,cause);}
function stunMonster(c,seconds,stone=false){c.stunnedUntil=Math.max(c.stunnedUntil||0,clock+seconds);if(stone)c.legendStoneUntil=c.stunnedUntil;c.divert=c.targetSkier=null;}
function playerFree(p=state.p){return !p.fall&&!p.awaitingInput&&!state.deathTimer&&!p.dragonRide&&!p.legendCarry;}
function inPlayerReach(x,y,r,p=state.p){return Math.hypot(p.x-x,p.y-y)<r+S.physics.playerRadius;}
function labGear(kind,o,line){legendGift(kind,o,line);}
// Pickup contact (lamp, broom): like legendContact but a protective shield does not stop you grabbing things.
function labTouch(o,previous,x,y,radius){const p=state.p,keep=p.shield;p.shield=0;const hit=legendContact(o,previous,x,y,radius);p.shield=keep;return hit;}
// Flee-type creatures count as predator threats for bystanders while they are active.
function legendNpcThreats(){
  const out=[];if(!state.started)return out;
  for(const o of legendActors()){
    if(o.eaten||o.dead||o.defeated||!o.activeAt||LAB_REACTIONS[o.legendKind]?.mode!=='flee')continue;
    o.legendLines=LAB_REACTIONS[o.legendKind].lines;
    if(o.legendKind==='ghost'){for(const g of o.ghosts||[])if(!g.banished){g.legendLines=o.legendLines;out.push(g);}}else out.push(o);
  }
  return out;
}
function labReactions(o){
  const R=LAB_REACTIONS[o.legendKind];if(!R||R.mode!=='awe'||clock<(o.aweAt||0))return;o.aweAt=clock+.5;
  for(const n of labHumans(o.x,o.y,280)){if(clock<(n.speakAt||0)||n.fearUntil>clock)continue;say(pick(R.lines),n,1.6);n.speakAt=clock+5;n.cheerUntil=clock+1.6;}
}
function labSpawnYeti(o,count=1,kmh=86,back=240){
  const p=state.p;for(let i=0;i<count;i++)state.chasers.push({kind:'fast',arcadeTier:'special',x:p.x+(i-(count-1)/2)*70,y:p.y-back-i*25,chaseRun:o?.arcadeRun||state.course,speed:kmh/S.physics.hudKmhPerSpeed,endlessBaseKmh:kmh,phase:range(0,TAU),expires:Infinity,wakeUntil:clock+.5,talkAt:clock+8,labYeti:true});
}
function labSpawnPeople(o,x,y,count=5){
  const own=labOwn(o);
  for(let i=0;i<count;i++){
    const cx=x+range(-260,260),cy=y+range(-160,420),r=range(50,120),path=[0,1,2,3].map(k=>({x:cx+Math.cos(k*Math.PI/2)*r,y:cy+Math.sin(k*Math.PI/2)*r*.7}));
    entity(pick(['personRed','personGreen','personYellow']),path[0].x,path[0].y,{...own,width:30,r:10,walker:true,path,pathIndex:1,pathDir:1,walkSpeed:range(...S.village.walkerSpeed)});
  }
  for(let i=0;i<Math.ceil(count/2);i++)entity('skier',x+range(-220,220),y-range(250,650),{...own,width:42,r:12,vy:range(...S.skiers.slowSpeed),vx:0,endlessBaseVy:30});
}

// ---------- setup ----------
function setupLegendV3(o,showcase){
  o.labScene=showcase;const kind=o.legendKind,own=labOwn(o),rock=(x,y,name,frame,r,width)=>entity('rock',x,y,{...own,r,width,legendArt:{name,frame}});
  if(kind==='witch')Object.assign(o,{width:80,altitude:V3.witch.altitude,legendState:'fly',potions:[],splashes:[],r:0});
  else if(kind==='ghost'){
    o.width=56;o.ghosts=Array.from({length:V3.ghost.count},(_,i)=>({x:o.homeX+(i-1)*190,y:o.homeY+range(-40,80),phase:i*1.3,blinkAt:clock+range(1,V3.ghost.blinkEvery),alpha:1,banished:false}));
    o.lamps=[];for(const [dy,dx] of [[150,-210],[550,190],[950,-170],[1350,200],[1750,-190]])o.lamps.push(entity('lamp',o.homeX+dx,o.homeY+dy,{...own,width:20,r:6,labLamp:true}));
  }else if(kind==='unicorn')Object.assign(o,{width:90,bond:0,legendState:'wait'});
  else if(kind==='griffin')Object.assign(o,{width:120,altitude:V3.griffin.altitude,legendState:'circle',grabs:0,nextDive:0,orbit:0});
  else if(kind==='medusa'){
    Object.assign(o,{width:80,gazeIndex:0,gazeAt:0});o.statues=[];
    for(const [angle,d] of [[-55,170],[-20,300],[15,190],[48,320],[-38,400],[0,140]]){const a=angle*Math.PI/180;o.statues.push(rock(o.homeX+Math.sin(a)*d,o.homeY-Math.cos(a)*d,'medusa-props',Math.floor(random()*3),14,44));}
  }else if(kind==='cyclops')Object.assign(o,{width:160,throwAt:0,flights:[],rocks:[]});
  else if(kind==='phoenix')Object.assign(o,{width:100,altitude:55,trail:[],legendState:'fly'});
  else if(kind==='genie')Object.assign(o,{width:80,legendState:'lamp',gates:[]});
  else if(kind==='giant')o.gift={x:o.x-170,y:o.homeY+60};
  if(!showcase)return;
  // ---- lab dressing: an audience, plus whatever makes the mechanic testable ----
  labSpawnPeople(o,o.homeX,o.homeY,6);
  if(kind==='phoenix')for(let x=-300;x<=300;x+=75)rock(o.homeX+x+range(-15,15),o.homeY+900,'cyclops-props',2,20,64);
  if(kind==='genie'){o.x=o.homeX+130;for(const [dx,dy] of [[40,-60],[220,40]])rock(o.homeX+dx,o.homeY+dy,'cyclops-props',2,20,64);}
}

// ---------- update ----------
function labTick(o){
  if(!o.labScene||!o.activeAt)return;
  if(!o.labYetis){o.labYetis=true;if(labState.yetis&&o.legendKind!=='dragon')labSpawnYeti(o,2,80,450);}
}
function updateLegendV3(o,dt,previous){
  labReactions(o);labTick(o);
  const k=o.legendKind;
  if(k==='witch')updateWitch(o,dt,previous);else if(k==='ghost')updateGhosts(o,dt,previous);else if(k==='unicorn')updateUnicorn(o,dt,previous);
  else if(k==='griffin')updateGriffin(o,dt,previous);else if(k==='medusa')updateMedusa(o,dt,previous);else if(k==='cyclops')updateCyclops(o,dt,previous);
  else if(k==='phoenix')updatePhoenix(o,dt,previous);else if(k==='genie')updateGenie(o,dt,previous);
}
// Player status effects applied after normal movement.
function updateLegendPlayerEffects(dt){
  const p=state.p;
  if(p.legendDizzyUntil>clock&&!p.air)p.heading+=Math.sin(clock*5.5)*1.7*dt;
  if(p.legendChillUntil>clock){p.heading=p.desiredHeading=p.legendChillHeading;p.speed=Math.min(p.speed,topSpeed()*.6);}
  if(p.legendSlush>clock&&!p.air){p.speed=Math.min(p.speed,topSpeed()*.55);}
  if(p.legendUnicornUntil>clock){for(const c of labMonsters())if(Math.hypot(c.x-p.x,c.y-p.y)<34){if(state.chasers.includes(c)){stunMonster(c,3);}else knockDownByTerrain(c);burst(c.x,c.y,pick(['#dc666a','#e7d366','#66b9c6']),10);say('BONK!',c,.8);}}
}
// Movement override: turned to stone, or carried by the griffin. Returns true when it owns this frame.
function moveLegendCarry(p,dt){
  if(p.legendStoneUntil>clock&&p.legendStoneAt){
    p.x=p.legendStoneAt.x;p.y=p.legendStoneAt.y;p.speed=p.vx=p.vy=0;p.air=0;
    p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);return true;
  }
  const g=p.legendCarry;if(!g)return false;
  if(g.eaten||!state.objects.includes(g)||state.deathTimer){dropLegendCarry(p,g);return false;}
  p.walkOrigin={x:p.x,y:p.y};p.x=g.x;p.y=g.y-(g.altitude||0)+14;p.speed=topSpeed();p.vx=g.motionVx||0;p.vy=g.motionVy||p.speed;
  p.air=1;p.airTotal=0;p.onIce=false;p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);
  p.impactMotion={stamp:clock,x:p.walkOrigin.x,y:p.walkOrigin.y,vx:p.vx,vy:p.vy,speed:p.speed,heading:p.heading,mode:p.mode,air:1,fall:0,awaitingInput:false};return true;
}
function dropLegendCarry(p,g){
  if(p.legendCarry!==g)return;delete p.legendCarry;
  p.x=g.x;p.y=g.y;p.air=p.airTotal=0;p.heading=p.desiredHeading=0;p.mode='slide';p.speed=topSpeed()*.7;p.vx=0;p.vy=p.speed;state.lastTrack=null;
  const a=state.endless||state.arcade;
  if(a?.shields>0){a.shields--;p.shield=Math.max(p.shield,1);burst(p.x,p.y,C.gold,12);say('SHIELD SOFTENED THE DROP',p,1.6);}
  else{crash(null);say('OOF!',p,1);}
}

// Witch: potion splashes change everyone who skis through; her low swoop is the chance to grab the broom.
function updateWitch(o,dt,previous){
  const p=state.p,W=V3.witch,t=clock-o.activeAt;
  if(o.legendState==='gone'){o.y+=topSpeed()*1.3*dt;o.x+=180*dt;o.altitude+=40*dt;if(clock-o.goneAt>4)o.eaten=true;return;}
  if(t>W.seconds){o.legendState='gone';o.goneAt=clock;say('Hehehe! Next time!',o,1.6);return;}
  const ox=o.x,oy=o.y;
  if(o.legendState==='fly'){
    const gx=p.x+Math.sin(t*1.1)*220,gy=p.y+260+Math.sin(t*2.2)*70;o.x=ease(o.x,gx,2.5,dt);o.y=ease(o.y,gy,2.5,dt);o.altitude=ease(o.altitude,W.altitude,3,dt);
    if(clock>=(o.potionAt||o.activeAt+1.2)){o.potionAt=clock+W.potionEvery;o.throwAt=clock;
      const tx=p.x+p.vx*W.fallSeconds+range(-45,45),ty=p.y+p.vy*W.fallSeconds+range(-20,40),color=pick(POTIONS);
      o.potions.push({x0:o.x,y0:o.y,a0:o.altitude,x:tx,y:ty,at:clock,land:clock+W.fallSeconds,color});}
    if(clock>=(o.swoopAt||o.activeAt+4)){o.legendState='swoop';o.swoopStart=clock;o.swoopFrom={x:o.x,y:o.y};o.swoopPoint={x:p.x+p.vx*1.3,y:p.y+Math.max(240,p.vy*1.3)};say('Hee hee hee!',o,1.2);}
  }else if(o.legendState==='swoop'){
    const s=clamp((clock-o.swoopStart)/1.1,0,1),P=o.swoopPoint;o.x=mix(o.swoopFrom.x,P.x,s);o.y=mix(o.swoopFrom.y,P.y,s);o.altitude=mix(W.altitude,4,s);
    if(s>=1){o.legendState='low';o.lowUntil=clock+W.lowSeconds;}
  }else if(o.legendState==='low'){
    o.altitude=4;o.y+=topSpeed()*.25*dt;
    if(playerFree()&&!p.air&&labTouch(o,previous,o.x,o.y,24)){o.defeated=true;o.defeatedAt=clock;o.potions=[];labGear('sword',o,'THE BROOM IS YOURS!');say('MY BROOM!',o,1.5);return;}
    if(clock>=o.lowUntil){o.legendState='fly';o.swoopAt=clock+W.swoopEvery;}
  }
  o.motionVx=(o.x-ox)/dt;o.motionVy=(o.y-oy)/dt;
  for(const q of o.potions)if(!q.landed&&clock>=q.land){q.landed=true;o.splashes.push({x:q.x,y:q.y,color:q.color,until:clock+W.splashSeconds,hit:new Set()});burst(q.x,q.y,POTION_COLORS[q.color],12);beep(300,.06);}
  o.potions=o.potions.filter(q=>!q.landed);o.splashes=o.splashes.filter(q=>q.until>clock);
  for(const q of o.splashes){
    if(p.air<=0&&playerFree()&&Math.hypot(p.x-q.x,p.y-q.y)<W.splashRadius+S.physics.playerRadius){
      if(q.color==='green')p.legendSlush=clock+.15;
      else if(q.color==='purple'){if(!(p.legendDizzyUntil>clock)){p.legendDizzyUntil=clock+2.5;say('WHOA... DIZZY',p,1.4);}}
      else if(!q.hit.has(p)){q.hit.add(p);p.boost=Math.max(p.boost,1.4);p.speed=Math.max(p.speed,topSpeed()*1.2);say('ZOOM!',p,1);}
    }
    for(const c of labMonsters())if(!q.hit.has(c)&&Math.hypot(c.x-q.x,c.y-q.y)<W.splashRadius+12){q.hit.add(c);if(state.chasers.includes(c))stunMonster(c,1.8);else knockDownByTerrain(c);say(q.color==='green'?'STUCK!':q.color==='purple'?'@#%?':'WAAAH!',c,1);}
    for(const n of labHumans(q.x,q.y,W.splashRadius+10))if(!q.hit.has(n)){q.hit.add(n);knockHuman(n,o);}
  }
}

// Ghosts: drift through trees toward you; touching one chills you stiff. Lead them into lamplight to banish them.
function updateGhosts(o,dt,previous){
  const p=state.p,G=V3.ghost,t=clock-o.activeAt,live=o.ghosts.filter(g=>!g.banished);
  if(!live.length||t>G.seconds||p.y>o.homeY+2600){for(const g of live){g.banished=true;g.fadeOut=clock;}if(clock-(o.endAt??=clock)>1)o.eaten=true;return;}
  let cx=0,cy=0;
  for(const g of live){
    const behind=g.y<p.y-10,speed=behind?Math.max(topSpeed()*G.approachRatio,p.speed*G.followRatio):topSpeed()*G.approachRatio,tx=p.x+p.vx*.5,ty=p.y+p.vy*.5,d=Math.hypot(tx-g.x,ty-g.y)||1;
    const gvx=behind?(tx-g.x)/d*speed:(tx-g.x)/d*speed,gvy=behind?(ty-g.y)/d*speed:(ty-g.y)/d*speed;
    g.x+=gvx*dt+Math.sin(clock*2+g.phase)*20*dt;g.y+=gvy*dt;g.vx=gvx;
    if(clock>=g.blinkAt){g.fadeAt=clock;g.blinkAt=clock+G.blinkEvery+range(-.4,.4);g.jumpDone=false;}
    const fading=clock-(g.fadeAt??-9)<.55;if(fading&&!g.jumpDone&&clock-g.fadeAt>.28){g.jumpDone=true;g.x+=pick([-1,1])*range(45,70);}
    g.alpha=fading?Math.abs(1-(clock-g.fadeAt)/.28):1;
    if(!fading&&clock>=(g.touchCool||0)&&playerFree()&&p.air<=0&&Math.hypot(p.x-g.x,p.y-g.y)<20+S.physics.playerRadius&&!(p.shield>0)){g.touchCool=clock+3;g.fadeAt=clock;g.jumpDone=true;g.x=p.x+range(-60,60);g.y=p.y-170;if(!(p.legendChillUntil>clock-.6)){p.legendChillUntil=clock+G.chillSeconds;p.legendChillHeading=p.heading;burst(p.x,p.y,'#cfe8f2',12);say('BRRR!',p,1);}}
    for(const n of labHumans(g.x,g.y,24))if(n.type==='skier'||n.type==='boarder')knockHuman(n,o);
    for(const lamp of o.lamps)if(!lamp.eaten&&!lamp.labLampOut&&Math.hypot(lamp.x-g.x,lamp.y-g.y)<G.lampRadius){g.banished=true;g.fadeOut=clock;lamp.labLampOut=true;burst(g.x,g.y,'#f0e6a8',16);say('EEEEK!',g,1);break;}
    cx+=g.x;cy+=g.y;
  }
  const left=o.ghosts.filter(g=>!g.banished).length;
  if(!left&&!o.rewarded){o.rewarded=true;labGear('shield',o,'SPIRIT WARD!');}
  if(left){o.x=cx/live.length;o.y=cy/live.length;}
}

// Unicorn: ride close beside it (without touching) to share its magic - a few seconds where nothing can touch you.
function updateUnicorn(o,dt,previous){
  const p=state.p,U=V3.unicorn,t=clock-o.activeAt,ox=o.x,oy=o.y;
  if(o.legendState==='wait'){o.legendState='run';o.anchorX=p.x;o.x=p.x+pick([-1,1])*320;o.y=p.y+160;say('Neigh!',o,1);}
  if(o.legendState==='leave'){o.x+=Math.sign(o.x-p.x||1)*topSpeed()*.9*dt;o.y+=topSpeed()*1.2*dt;if(clock-o.leaveAt>3)o.eaten=true;}
  else{
    if(t>U.seconds){o.legendState='leave';o.leaveAt=clock;return;}
    o.anchorX??=o.homeX;const bolting=o.boltUntil>clock,goal={x:o.anchorX+Math.sin(t*.45)*200,y:p.y+(bolting?260:30)+Math.sin(t*1.3)*40};
    // Magical gait: it springs over obstacles and eases onto its line instead of path-finding.
    const gx=goal.x-o.x,gy=goal.y-o.y,gd=Math.hypot(gx,gy)||1,fix=Math.min(gd*2.5,topSpeed()*(bolting?.9:.5));o.x+=gx/gd*fix*dt;o.y+=(Math.max(0,p.vy)+gy/gd*fix)*dt;
    const d=Math.hypot(p.x-o.x,p.y-o.y);
    if(playerFree()&&!p.air&&d<U.touch+S.physics.playerRadius){if(!bolting){o.boltUntil=clock+1;o.bond=Math.max(0,o.bond-.6);say('NEIGH!',o,.8);}}
    else if(playerFree()&&d<U.near)o.bond+=dt;
    if(o.bond>=U.bondSeconds){o.legendState='leave';o.leaveAt=clock;p.shield=Math.max(p.shield,U.magicSeconds);p.rainbow=Math.max(p.rainbow,U.magicSeconds);p.legendUnicornUntil=clock+U.magicSeconds;announce('UNICORN MAGIC','Nothing can touch you - plough through them!',C.blue,2.2);burst(p.x,p.y,C.gold,18);}
  }
  o.motionVx=(o.x-ox)/dt;o.motionVy=(o.y-oy)/dt;
}

// Griffin: its shadow locks on whoever is nearest the circle - you, a Yeti or a bystander - and carries them away.
function updateGriffin(o,dt,previous){
  const p=state.p,G=V3.griffin,ox=o.x,oy=o.y,centre={x:p.x,y:p.y-110};
  if(o.legendState==='leave'){o.y+=topSpeed()*1.2*dt;o.altitude+=60*dt;if(clock-o.leaveAt>4)o.eaten=true;}
  else if(o.legendState==='circle'){
    o.orbit+=dt*1.6;o.x=ease(o.x,centre.x+Math.cos(o.orbit)*170,3,dt);o.y=ease(o.y,centre.y+Math.sin(o.orbit)*90,3,dt);o.altitude=ease(o.altitude,G.altitude,2,dt);
    if(o.grabs>=G.grabs||p.y>o.homeY+3500){o.legendState='leave';o.leaveAt=clock;}
    else if(clock>=Math.max(o.nextDive,o.activeAt+1.5)){
      // Nearest candidate to the griffin's ground position. Keep Yetis between you and it.
      let best=null,bd=520;const consider=(q,kind)=>{const d=Math.hypot(q.x-o.x,q.y-o.y);if(d<bd){bd=d;best={q,kind};}};
      if(playerFree()&&!p.air)consider(p,'player');for(const c of labMonsters())consider(c,'monster');for(const n of labHumans(o.x,o.y,520))consider(n,'human');
      if(best){o.legendState='lock';o.lockAt=clock;o.lockTarget=best;o.lockPoint={x:best.q.x,y:best.q.y};say(best.kind==='player'?'SKREEE!':'Skree?',o,.9);}
    }
  }else if(o.legendState==='lock'){
    const s=(clock-o.lockAt)/G.lockSeconds,q=o.lockTarget.q;
    if(s<.7){const lead=(1-s)*G.lockSeconds+G.diveSeconds,vx=q===p?p.vx:(q.motionVx??q.vx??0),vy=q===p?p.vy:(q.motionVy??q.vy??0);o.lockPoint.x=ease(o.lockPoint.x,q.x+vx*lead,8,dt);o.lockPoint.y=ease(o.lockPoint.y,q.y+vy*lead,8,dt);}
    o.x=ease(o.x,o.lockPoint.x,4,dt);o.y=ease(o.y,o.lockPoint.y-60,4,dt);o.altitude=ease(o.altitude,G.altitude*.8,3,dt);
    if(s>=1){o.legendState='dive';o.diveAt=clock;o.diveFrom={x:o.x,y:o.y,a:o.altitude};}
  }else if(o.legendState==='dive'){
    const s=clamp((clock-o.diveAt)/G.diveSeconds,0,1),L=o.lockPoint;o.x=mix(o.diveFrom.x,L.x,s);o.y=mix(o.diveFrom.y,L.y,s);o.altitude=mix(o.diveFrom.a,6,s);
    if(s>=1)griffinGrab(o);
  }else if(o.legendState==='carry'){
    const C2=o.carry;o.x=ease(o.x,(o.encounter?.centerX??o.x)+Math.sin(clock)*60,.6,dt);o.y+=topSpeed()*1.25*dt;o.altitude=ease(o.altitude,70,3,dt);
    if(C2.kind==='human'&&C2.q){C2.q.x=o.x;C2.q.y=o.y;}
    if(clock>=o.carryUntil){
      if(C2.kind==='player')dropLegendCarry(p,o);
      else if(C2.kind==='human'&&C2.q){C2.q.legendCarried=false;C2.q.x=o.x;C2.q.y=o.y+20;knockHuman(C2.q,o);say('PUT ME DOWN!',C2.q,1.2);}
      else if(C2.kind==='hunter'&&C2.q){C2.q.legendCarried=false;C2.q.x=o.x+300;knockDownByTerrain(C2.q);}
      o.carry=null;o.legendState='circle';o.nextDive=clock+G.cooldown;
    }
  }
  o.motionVx=(o.x-ox)/dt;o.motionVy=(o.y-oy)/dt;
}
function griffinGrab(o){
  const p=state.p,G=V3.griffin,L=o.lockPoint;let got=null;
  if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-L.x,p.y-L.y)<G.reach+S.physics.playerRadius)got={kind:'player',q:p};
  if(!got)for(const c of labMonsters())if(Math.hypot(c.x-L.x,c.y-L.y)<G.reach+12){got=state.chasers.includes(c)?{kind:'yeti',q:c}:{kind:'hunter',q:c};break;}
  if(!got)for(const n of labHumans(L.x,L.y,G.reach+10)){got={kind:'human',q:n};break;}
  o.grabs++;
  if(!got){o.legendState='circle';o.nextDive=clock+G.cooldown*.6;burst(L.x,L.y,C.ice,8);say('Skree...',o,.8);return;}
  o.carry=got;o.legendState='carry';o.carryUntil=clock+G.carrySeconds;burst(L.x,L.y,C.ice,12);beep(600,.08);
  if(got.kind==='player'){p.legendCarry=o;p.dragonBoardBlockedUntil=clock+3;announce('CARRIED OFF!','The griffin drops you far downhill',C.blue,1.8);}
  else if(got.kind==='yeti'){const i=state.chasers.indexOf(got.q);if(i>=0)state.chasers.splice(i,1);say('ROAAR?!',got.q,1);}
  else{got.q.legendCarried=true;if(got.kind==='human')say('HEEELP!',got.q,1.4);}
}

// Medusa: her glare sweeps the slope in three sectors. Statues block it. Slip past close by for her mirror shield.
function medusaSector(o){const M=V3.medusa,seq=[-1,0,1,0],phase=(clock-o.activeAt)/(M.lookSeconds+M.glareSeconds),i=Math.floor(phase),glaring=phase-i>M.lookSeconds/(M.lookSeconds+M.glareSeconds);return {sector:seq[i%4],glaring,next:seq[(i+1)%4]};}
function medusaSees(o,x,y,sector){
  const M=V3.medusa,dx=x-o.x,dy=y-o.y,d=Math.hypot(dx,dy);if(dy>-15||d>M.length||d<10)return false;
  const angle=Math.atan2(dx,-dy)*180/Math.PI;if(Math.abs(angle-sector*M.sectorDegrees)>M.coneHalfDegrees)return false;
  for(const s of o.statues)if(!s.eaten&&Math.hypot(s.x-o.x,s.y-o.y)<d&&segmentDistance(s.x,s.y,{x:o.x,y:o.y},{x,y})<(s.r||14)+6)return false;
  return true;
}
function updateMedusa(o,dt,previous){
  const p=state.p,M=V3.medusa;if(p.y>o.homeY+1400){o.eaten=true;return;}
  legendBump(o,previous,o.x,o.y-8,26);
  const g=medusaSector(o);o.gaze=g;
  if(g.glaring){
    if(playerFree()&&!p.air&&!(p.shield>0)&&clock>=(p.legendStoneImmune||0)&&medusaSees(o,p.x,p.y,g.sector)){p.legendStoneUntil=clock+M.stoneSeconds;p.legendStoneImmune=clock+M.stoneSeconds+1.2;p.legendStoneAt={x:p.x,y:p.y};burst(p.x,p.y,'#9aa39a',12);say('...STONE!',p,1.2);}
    for(const c of labMonsters())if(!(c.legendStoneUntil>clock)&&medusaSees(o,c.x,c.y,g.sector)){if(state.chasers.includes(c))stunMonster(c,M.monsterStoneSeconds,true);else{c.legendStoneUntil=clock+M.monsterStoneSeconds;c.stunnedUntil=c.legendStoneUntil;}burst(c.x,c.y,'#9aa39a',8);}
    for(const n of labHumans(o.x,o.y,M.length))if(medusaSees(o,n.x,n.y,g.sector)){n.eaten=true;o.statues.push(entity('rock',n.x,n.y,{...labOwn(o),r:13,width:44,legendArt:{name:'medusa-props',frame:Math.floor(random()*3)}}));burst(n.x,n.y,'#9aa39a',10);}
  }
  if(!o.rewarded&&playerFree()&&!(p.legendStoneUntil>clock)&&Math.hypot(p.x-o.x,p.y-o.y)<M.mirrorReach){o.rewarded=true;labGear('shield',o,'HER MIRROR SHIELD!');say('Thief!',o,1.2);}
}

// Cyclops: lobs boulders exactly where you are now (no lead), and they stay. Ram his shins at full speed to topple him.
function updateCyclops(o,dt,previous){
  const p=state.p,K=V3.cyclops;if(p.y>o.homeY+1200){o.eaten=true;return;}
  legendBump(o,previous,o.x,o.y-6,32,true);if(o.defeated)return;
  const engaged=p.y>o.homeY-1100&&p.y<o.homeY-60&&playerFree()&&!(p.shield>0)&&p.speed>topSpeed()*.5;
  if(engaged){o.throwPhase=(o.throwPhase??0)+dt;if(o.throwPhase>=K.cycle){o.throwPhase=0;o.thrown=false;}
    if(!o.thrown&&o.throwPhase>=1.6){o.thrown=true;o.flights.push({x0:o.x-20,y0:o.y-10,x:p.x,y:p.y,at:clock});say(pick(['HRAAH!','RAAA!','UNGH!']),o,.7);}}
  for(const f of o.flights)if(!f.done&&clock-f.at>=K.flightSeconds){
    f.done=true;burst(f.x,f.y,'#a7a29b',14);state.screenShake=Math.max(state.screenShake||0,.15);beep(110,.1,'triangle');
    if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-f.x,p.y-f.y)<K.hitRadius+S.physics.playerRadius)crash(o);
    for(const c of labMonsters())if(Math.hypot(c.x-f.x,c.y-f.y)<K.hitRadius+12){if(state.chasers.includes(c))stunMonster(c,3);else knockDownByTerrain(c);}
    for(const n of labHumans(f.x,f.y,K.hitRadius+8))knockHuman(n,o);
    if(o.rocks.length<K.maxRocks&&!nearbyFootprints(f.x,f.y,40).some(q=>q.r>0&&obstacleClearance(q,f.x,f.y)<10))o.rocks.push(entity('rock',f.x,f.y,{...labOwn(o),r:20,width:64,legendArt:{name:'cyclops-props',frame:2}}));
  }
  o.flights=o.flights.filter(f=>!f.done);
}

// Phoenix: its burning stripe turns the snow to slush, but the hot air right behind it launches you over everything.
function updatePhoenix(o,dt,previous){
  const p=state.p,P=V3.phoenix,t=clock-o.activeAt,ox=o.x,oy=o.y;
  if(o.legendState==='leave'){o.y+=topSpeed()*1.4*dt;o.altitude+=50*dt;if(clock-o.leaveAt>4)o.eaten=true;}
  else{
    if(t>P.seconds){o.legendState='leave';o.leaveAt=clock;}
    const cyc=Math.floor(t/P.ashEvery),local=t-cyc*P.ashEvery;
    if(cyc>0&&local<1){o.legendState='ash';}else if(cyc>0&&local<1.6){if(o.legendState==='ash'){o.x=p.x+pick([-1,1])*200;o.y=p.y+320;burst(o.x,o.y-o.altitude,'#f0a050',16);}o.legendState='reborn';}else o.legendState='fly';
    if(o.legendState!=='ash'){const tri=Math.abs(((t/4)%2)-1)*2-1;o.x=ease(o.x,(o.encounter?.centerX??p.x)+tri*320,2.2,dt);o.y=ease(o.y,p.y+300,2,dt);}
    if(o.legendState==='fly'&&clock>=(o.trailAt||0)){o.trailAt=clock+.06;o.trail.push({x:o.x,y:o.y,at:clock});}
  }
  o.trail=o.trail.filter(q=>clock-q.at<P.slushSeconds);
  if(playerFree()&&p.air<=0)for(const q of o.trail)if(Math.hypot(p.x-q.x,p.y-q.y)<22+S.physics.playerRadius){
    if(clock-q.at<P.updraftSeconds&&p.jumpLock<=0){launch(1.4,2.2);burst(p.x,p.y,'#f0a050',14);say('WHOOSH!',p,1);if(!o.rewarded){o.rewarded=true;labGear('shield',o,'A PHOENIX FEATHER!');}}
    else p.legendSlush=clock+.15;break;}
  o.motionVx=(o.x-ox)/dt;o.motionVy=(o.y-oy)/dt;
}

// Genie: touch the lamp, then choose a wish gate. The greedy middle gate gives both prizes - and three Yetis.
function updateGenie(o,dt,previous){
  const p=state.p,G=V3.genie;
  if(o.legendState==='lamp'){
    if(playerFree()&&!p.air&&labTouch(o,previous,o.x,o.y,14)){o.legendState='emerge';o.stateAt=clock;burst(o.x,o.y,'#8fb0e0',16);beep(700,.12);
      const y=o.y+G.gateMetres*PX_PER_M,x=clamp(p.x,o.homeX-120,o.homeX+120);o.gates=[['shield',-1],['greed',0],['sword',1]].map(([kind,i])=>({kind,x:x+i*G.gateSpacing,y,half:G.gateHalf}));
      announce('YOUR WISH, MY COMMAND','SHIELD  -  GREED  -  SWORD',C.blue,2.4);say('Choose wisely!',o,1.6);}
    else if(p.y>o.y+200){o.legendState='done';o.eaten=true;}
    return;
  }
  if(o.legendState==='emerge'&&clock-o.stateAt>.6)o.legendState='follow';
  if(o.legendState==='follow'){
    o.x=ease(o.x,p.x+90,4,dt);o.y=ease(o.y,p.y-30,4,dt);
    for(const g of o.gates)if(!o.chosen&&previous.y<g.y&&p.y>=g.y&&Math.abs(p.x-g.x)<g.half){o.chosen=g.kind;
      if(g.kind==='greed'){labGear('shield',o,'GREEDY...');labGear('sword',o,'...AND GREEDIER');labSpawnYeti(o,G.yetis,88);announce('GREED HAS A PRICE','Three Yetis are on your tail',C.red,2.4);}
      else labGear(g.kind,o,g.kind==='shield'?'WISH GRANTED: SHIELD':'WISH GRANTED: SWORD');}
    if(o.chosen||p.y>o.gates[0].y+60){if(!o.chosen)say('No wish? Suit yourself.',o,1.6);o.legendState='return';o.stateAt=clock;}
  }
  if(o.legendState==='return'){o.x=ease(o.x,p.x+90,4,dt);o.y=ease(o.y,p.y-30,4,dt);if(clock-o.stateAt>1.2)o.eaten=true;}
}

// ---------- drawing ----------
function legendFrame(o){
  const k=o.legendKind,st=o.legendState,since=clock-(o.stateSince??0);
  if(o.lastDrawState!==st){o.lastDrawState=st;o.stateSince=clock;}
  if(k==='hut'){if(st==='crouching')return since<.35?3:4;return since<.35&&o.wasCrouched?5:Math.abs(o.motionVx||0)>8?cycleFrame([1,2],3):0;}
  if(k==='giant'){if(st==='inhale')return since<1?1:2;if(st==='blowing')return since<.4?3:4;return since<.6?5:0;}
  if(k==='kelpie'){if(o.gaveUp)return 7;if(o.huntUntil&&clock-(o.huntUntil-S.endless.regions.legendary.kelpieHuntSeconds)<.6)return 6;return cycleFrame([0,1,2,3,4,5],10);}
  if(k==='troll'){if(o.defeated)return 5;if(st==='aiming')return 1;if(st==='charging')return cycleFrame([2,3],8);if(st==='recover')return 4;return 0;}
  if(k==='thunderbird'){const vx=o.motionVx||0;if(Math.abs(vx)>140)return vx<0?6:7;return cycleFrame([0,1,2,3,4,5],9);}
  if(k==='gargoyle'){if(o.defeated)return 5;if(st==='swooping'||st==='returning')return cycleFrame([2,3],8);if(st==='landed')return 4;return Math.hypot(state.p.x-o.x,state.p.y-o.y)<500?1:0;}
  if(k==='wisps')return Math.abs(o.motionVx||0)>10?2:cycleFrame([0,1,0,1,3],4,o.phase);
  return 0;
}
function drawLegendV3Creature(o,s){
  const k=o.legendKind;if(LEGEND_SKY.has(k)||k==='ghost')return true;
  const alpha=o.defeated?clamp(1-(clock-o.defeatedAt)/1.5,0,1):1,flip=(o.motionVx||0)<-6;
  if(['hut','giant','kelpie','troll','thunderbird','gargoyle','wisps'].includes(k)){
    if(k==='hut'&&o.legendState==='crouching')o.wasCrouched=true;
    const frame=legendFrame(o),air=k==='thunderbird'?45+Math.sin(clock*3)*3:(o.altitude||0);
    if(k==='gargoyle'&&o.legendState==='waiting')artDraw('medusa-props',4,s.x,s.y+4);
    shadow(s.x,s.y,o.width*.22*ZOOM,5,.1);artDraw(k,frame,s.x,s.y,{alpha,altitude:air,flip:k==='kelpie'||k==='troll'?flip:false});
    if(k==='troll'&&o.legendState==='aiming')text('!',s.x,s.y-58*ZOOM,15,C.gold);
    if(k==='wisps'&&o.gift&&!o.rewarded){const p=screen(o.gift.x,o.gift.y);gearIcon('shield',p.x,p.y-14,2);}
    return true;
  }
  if(k==='unicorn'){shadow(s.x,s.y,20*ZOOM,5,.1);artDraw('unicorn',cycleFrame([0,1,2,3,4,5],11),s.x,s.y,{flip});
    if(o.bond>0&&o.legendState==='run'){const f=clamp(o.bond/V3.unicorn.bondSeconds,0,1);ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,s.y,V3.unicorn.near*ZOOM,V3.unicorn.near*.55*ZOOM,0,-Math.PI/2,-Math.PI/2+f*TAU);ctx.stroke();}
    if(random()<.3)burst(o.x+range(-20,20),o.y-range(10,40),pick(['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb']),1);return true;}
  if(k==='medusa'){const g=o.gaze,frame=!g?0:g.glaring?(g.sector<0?3:g.sector>0?4:0):(g.sector<0?1:g.sector>0?2:5);shadow(s.x,s.y,22*ZOOM,5,.1);artDraw('medusa',frame,s.x,s.y);return true;}
  if(k==='cyclops'){const ph=o.throwPhase??0,frame=o.defeated?5:ph<.5?0:ph<.9?1:ph<1.3?2:ph<1.6?3:ph<1.9?4:5;shadow(s.x,s.y,40*ZOOM,8,.12);artDraw('cyclops',frame,s.x,s.y,{alpha,rotate:o.defeated?Math.min(1.4,(clock-o.defeatedAt)*2):0});return true;}
  if(k==='genie'){
    if(o.legendState==='lamp'){shadow(s.x,s.y,10*ZOOM,3,.1);artDraw('genie',0,s.x,s.y);if(Math.floor(clock*3)%2)box(s.x+6,s.y-14,2,2,C.gold);return true;}
    const frame=o.legendState==='emerge'?1:o.legendState==='return'?5:o.chosen?(o.chosen==='sword'?4:3):2;artDraw('genie',frame,s.x,s.y,{altitude:20,alpha:o.legendState==='return'?clamp(1.2-(clock-o.stateAt),0,1):1});return true;}
  return false;
}
// Ground layer: splashes, cones, trails, lamps, gates, landing shadows.
function drawLegendV3Ground(o){
  const k=o.legendKind;
  if(k==='giant'&&o.gift&&!o.giftTaken){const p=screen(o.gift.x,o.gift.y);gearIcon('shield',p.x,p.y-14,2);}
  if(k==='witch'){
    for(const q of o.splashes){const p=screen(q.x,q.y),fade=clamp((q.until-clock)/1,0,1);ctx.save();ctx.globalAlpha=fade;artDraw('witch-props',q.color==='green'?3:q.color==='purple'?4:5,p.x,p.y+10*ZOOM,{scale:V3.witch.splashRadius/30});ctx.restore();}
    for(const q of o.potions){const s=clamp((clock-q.at)/(q.land-q.at),0,1),p=screen(q.x,q.y);shadow(p.x,p.y,(4+s*8)*ZOOM,(2+s*3)*ZOOM,.08+s*.12);}
    if(o.legendState==='swoop'||o.legendState==='low'){const p=screen(o.swoopPoint.x,o.swoopPoint.y);text('!',p.x,p.y-14,12,C.gold);}
  }
  if(k==='ghost')for(const lamp of o.lamps||[])if(!lamp.eaten&&!lamp.labLampOut){const p=screen(lamp.x,lamp.y);ctx.save();ctx.globalAlpha=.16+.04*Math.sin(clock*3);ctx.fillStyle='#f3e7a2';ctx.beginPath();ctx.ellipse(p.x,p.y,V3.ghost.lampRadius*ZOOM,V3.ghost.lampRadius*.55*ZOOM,0,0,TAU);ctx.fill();ctx.restore();}
  if(k==='medusa'&&o.gaze&&o.activeAt){
    const M=V3.medusa,g=o.gaze,c=screen(o.x,o.y-10),a=g.sector*M.sectorDegrees*Math.PI/180,h=M.coneHalfDegrees*Math.PI/180,L=M.length*ZOOM;
    ctx.save();ctx.globalAlpha=g.glaring?.32:.1+.06*Math.sin(clock*18);ctx.fillStyle=g.glaring?'#a8d68e':'#cfe8b8';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.sin(a-h)*L,c.y-Math.cos(a-h)*L*.75);ctx.lineTo(c.x+Math.sin(a+h)*L,c.y-Math.cos(a+h)*L*.75);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(k==='cyclops')for(const f of o.flights){const p=screen(f.x,f.y),s=clamp((clock-f.at)/V3.cyclops.flightSeconds,0,1);shadow(p.x,p.y,(8+s*20)*ZOOM,(3+s*8)*ZOOM,.08+s*.16);if(s>.4)text('!',p.x,p.y-12,11,C.red);}
  if(k==='phoenix')for(const q of o.trail){const age=clock-q.at,p=screen(q.x,q.y),hot=age<V3.phoenix.updraftSeconds;box(p.x-9*ZOOM,p.y-3*ZOOM,18*ZOOM,6*ZOOM,hot?'#f0b060':'#b7c4c4');if(hot&&random()<.08)burst(q.x,q.y-10,'#f7d27a',1);}
  if(k==='griffin'&&o.lockPoint&&['lock','dive'].includes(o.legendState)){const p=screen(o.lockPoint.x,o.lockPoint.y),s=clamp((clock-(o.lockAt||clock))/V3.griffin.lockSeconds,0,1);shadow(p.x,p.y,(26-s*12)*ZOOM,(10-s*4)*ZOOM,.12+s*.15);text('!',p.x,p.y-14,12,C.red);}
  if(k==='genie'&&o.gates&&!o.chosen&&o.legendState==='follow')for(const g of o.gates){const a=screen(g.x-g.half,g.y),b=screen(g.x+g.half,g.y),col=g.kind==='greed'?C.red:C.gold;for(const q of [a,b]){box(q.x-2,q.y-26,4,26,col);}box(a.x,a.y-26,b.x-a.x,4,col);if(g.kind==='greed'){gearIcon('shield',(a.x+b.x)/2-10,a.y-40,2);gearIcon('sword',(a.x+b.x)/2+10,a.y-40,2);text('GREED',(a.x+b.x)/2,a.y+12,9,C.red);}else gearIcon(g.kind,(a.x+b.x)/2,a.y-40,2);}
}
// Sky layer, drawn after everything on the ground: fliers, ghosts, player status overlays.
function drawLegendSky(){
  for(const o of legendActors()){
    if(o.eaten||!legendV2Nearby(o))continue;const k=o.legendKind;
    if(k==='ghost'){for(const g of o.ghosts||[]){let a=g.alpha??1;if(g.banished){a=clamp(1-(clock-(g.fadeOut||0))/.6,0,1);if(a<=0)continue;}const p=screen(g.x,g.y),near=Math.hypot(state.p.x-g.x,state.p.y-g.y)<90;shadow(p.x,p.y,10*ZOOM,3,.06*a);artDraw('ghost',a<.95?3:near?2:cycleFrame([0,1],3,g.phase),p.x,p.y,{altitude:10+Math.sin(clock*2+g.phase)*3,alpha:a*.9,flip:(g.vx||0)<0});}continue;}
    if(!LEGEND_SKY.has(k))continue;
    const s=screen(o.x,o.y),alpha=o.defeated?clamp(1-(clock-o.defeatedAt)/1.2,0,1):1,flip=(o.motionVx||0)<-6;if(alpha<=0)continue;
    shadow(s.x,s.y,(k==='griffin'?26:18)*ZOOM,6,.1*alpha);
    if(k==='witch'){
      const throwing=clock-(o.throwAt??-9),frame=throwing<.25?3:throwing<.5?4:throwing<.8?5:Math.abs(o.motionVx||0)>60?(o.motionVx<0?1:2):0;
      artDraw('witch',frame,s.x,s.y,{altitude:o.altitude,alpha,flip:flip&&frame<1,rotate:o.defeated?(clock-o.defeatedAt)*8:0});
      for(const q of o.potions){const t=clamp((clock-q.at)/(q.land-q.at),0,1),x=mix(q.x0,q.x,t),y=mix(q.y0,q.y,t),alt=mix(q.a0,0,t)+Math.sin(t*Math.PI)*30,p=screen(x,y);artDraw('witch-props',POTIONS.indexOf(q.color),p.x,p.y,{altitude:alt,rotate:t*9});}
    }else if(k==='griffin'){
      const st=o.legendState,frame=st==='carry'?cycleFrame([4,5],6):st==='dive'?3:st==='lock'?2:cycleFrame([0,1],4);
      const C2=o.carry;if(C2&&C2.kind!=='player'){const p=screen(o.x,o.y),y=p.y-(o.altitude-6)*ZOOM;if(C2.kind==='yeti')drawYeti(C2.q,{x:p.x,y},'alert',44);else if(C2.kind==='human')sprite(C2.q.type==='skier'||C2.q.type==='boarder'?'skier':C2.q.type,p.x,y,30);else sprite('wolf',p.x,y,40);}
      artDraw('griffin',frame,s.x,s.y,{altitude:o.altitude,alpha,flip});
    }else if(k==='phoenix'){
      if(o.legendState==='ash')artDraw('phoenix',6,s.x,s.y);else artDraw('phoenix',o.legendState==='reborn'?7:cycleFrame([0,1,2,3,4,5],10),s.x,s.y,{altitude:o.altitude,flip});
    }
  }
  const p=state.p,s=screen(p.x,p.y);
  if(p.legendStoneUntil>clock)artDraw('medusa-props',0,s.x,s.y+2);
  if(p.legendChillUntil>clock)for(let i=0;i<6;i++)box(s.x+Math.cos(i+clock*4)*14,s.y-14+Math.sin(i*2+clock*4)*10,2,2,'#e8f6ff');
  if(p.legendDizzyUntil>clock)for(let i=0;i<3;i++){const a=clock*6+i*TAU/3;box(s.x+Math.cos(a)*10,s.y-34+Math.sin(a)*3,3,3,'#c6a6ef');}
}
function drawLegendStoneChaser(c){if(!(c.legendStoneUntil>clock))return false;const s=screen(c.x,c.y);ctx.save();if('filter' in ctx)ctx.filter='grayscale(1) brightness(.85)';drawYeti(c,s,'alert',56);ctx.restore();return true;}

// ---------- lab panel extras ----------
function labCurrentActor(){const e=state.endless?endlessEncounterAt(state.p.y):null;return e?.legendActor||legendActors().find(o=>!o.eaten)||null;}
function initCreatureLabButtons(panel){
  const title=document.createElement('strong');title.textContent='CREATURE LAB';title.style.cssText='width:100%;font:bold 12px monospace;letter-spacing:1px';panel.prepend(title);
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{fn(b);canvas.focus({preventScroll:true});});panel.append(b);return b;};
  add('Yetis: on',b=>{labState.yetis=!labState.yetis;b.textContent='Yetis: '+(labState.yetis?'on':'off');});
  add('+Yeti',()=>labSpawnYeti(labCurrentActor(),1));
  add('+People',()=>{const o=labCurrentActor();if(o)labSpawnPeople(o,state.p.x,state.p.y+450,5);});
}
