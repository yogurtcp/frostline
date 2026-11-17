/* Legendary creatures with generated art: thirteen behaviours, bystander reactions and the Creature Lab.
   Every creature must matter: a real danger to read, and/or something worth the risk (never points). */
const CREATURE_ART=__CREATURE_ART__;
const LEGEND_V3=new Set(['witch','ghost','unicorn','griffin','medusa','cyclops','phoenix','genie','hut','troll','thunderbird','gargoyle','wisps']);
const LEGEND_SKY=new Set(['witch','griffin','phoenix','genie','gargoyle','thunderbird']);
const LEGEND_NIGHT=new Set(['ghost','wisps']);
// Prototype tuning. Move a creature's block to game-config.json once it is approved.
const V3={
  bayMetres:{witch:650,ghost:700,unicorn:650,griffin:650,medusa:450,cyclops:700,phoenix:650,genie:650,hut:650,troll:450,thunderbird:600,gargoyle:650,wisps:650},
  witch:{seconds:20,potionEvery:1.7,fallSeconds:1,splashSeconds:6,splashRadius:34,altitude:50},
  ghost:{total:4,spawnEvery:3.5,life:11,approachRatio:.5,followRatio:.9,killRadius:16,fadeIn:.8},
  unicorn:{seconds:22,scareRadius:170,touch:22},
  griffin:{grabs:3,lockSeconds:1.2,diveSeconds:.35,carrySeconds:1.8,carryUphillRatio:.9,cooldown:2.4,altitude:150,reach:42},
  medusa:{lookSeconds:1,glareSeconds:.9,coneHalfDegrees:26,sectorDegrees:50,length:520,stoneSeconds:5,mirrorReach:75},
  cyclops:{seconds:16,throwEvery:.9,flightSeconds:1.2,hitRadius:36,spread:110,maxRocks:24},
  phoenix:{seconds:22,fireEvery:1.1,flightSeconds:.9,blastRadius:30,iceSeconds:10,ashEvery:9},
  genie:{seconds:24,flySeconds:.7,castSeconds:1,between:1.2},
  hut:{seconds:22,speedRatio:.93,catchRadius:38,stompRadius:46},
  troll:{bridgeLength:600,bridgeHalf:120,lateral:110,forward:55,catchRadius:30},
  thunderbird:{seconds:14,rowEvery:2.4,warnSeconds:1.3,spacing:90,gap:120,ringRadius:45},
  gargoyle:{seconds:15,speedRatio:.9,lungeRange:130,warnSeconds:.45,lungeSeconds:.5,lungeRatio:1.5,catchRadius:24},
  wisps:{count:3,orbitSeconds:25,lightRadius:110,scareRadius:90,shyRatio:.28}
};
const LAB_REACTIONS={
  witch:{mode:'flee',lines:['A WITCH!','Duck! Potions!','Not the hat, not the hat!']},
  ghost:{mode:'flee',lines:['GHOST!','Get to the light!','Brrrr... RUN!']},
  unicorn:{mode:'awe',lines:['A UNICORN!','Make a wish!','So shiny...','Did you see that?!']},
  griffin:{mode:'flee',lines:['GRIFFIN!','Watch the shadow!','It took Dave!']},
  medusa:{mode:'flee',lines:["DON'T LOOK AT HER!",'MEDUSA!','Eyes down!']},
  cyclops:{mode:'flee',lines:['ROCKS!','CYCLOPS!','Keep moving!']},
  phoenix:{mode:'flee',lines:['FIREBALLS!','It burns!','The snow is melting!']},
  genie:{mode:'flee',lines:['A GENIE!','He turned the tree into a YETI!','Make it stop!']},
  hut:{mode:'flee',lines:['THE HOUSE IS WALKING!','Baba Yaga!','Chicken legs?!']},
  kitsune:{mode:'awe',lines:['A white fox!','Kitsune!','So many foxes...']},
  giant:{mode:'flee',lines:['GIANT!','Hold on to your hat!','So cold!']},
  kelpie:{mode:'flee',lines:['Stay off the ice!','A water horse!']},
  troll:{mode:'flee',lines:['TROLL!','Pay the toll!']},
  thunderbird:{mode:'flee',lines:['LIGHTNING!','THUNDERBIRD!','Find the gap!']},
  gargoyle:{mode:'flee',lines:['IT MOVED!','The statue is alive!','It eats people!']},
  wisps:{mode:'awe',lines:['Pretty lights...','Catch one!']},
  dragon:{mode:'awe',lines:['DRAGON!!','Can I ride it?','WOW!']},
  mountain:{mode:'flee',lines:['ROLLING ROCK!','The mountain is awake!']}
};
const labState={yetis:true};
// Legend deaths. The scene card shows once Codex delivers assets/scenes/<key>.png (see design/CREATURE-ART-REQUESTS.md).
const LEGEND_DEATHS={GHOST:{key:'death-ghost',title:'SPIRITED AWAY',detail:'Next time, stay where the lights are on.',line:'THE GHOST GOT YOU.'},GARGOYLE:{key:'death-gargoyle',title:'STONE COLD SNACK',detail:'It was not a statue. It was never a statue.',line:'THE GARGOYLE ATE YOU.'},TROLL:{key:'death-troll',title:'TOLL UNPAID',detail:'The troll accepts gear, not excuses.',line:'THE TROLL GOT YOU.'},'BABA YAGA':{key:'death-baba-yaga',title:'INVITED IN',detail:"Baba Yaga's hut always has room for one more.",line:'THE HUT SWALLOWED YOU.'}};
const POTIONS=['green','purple','orange'],POTION_COLORS={green:'#7fb069',purple:'#9a76c4',orange:'#e59a4d'};

// ---------- art ----------
function artDraw(name,frame,x,y,{alpha=1,altitude=0,flip=false,rotate=0,scale=1}={}){
  const f=CREATURE_ART[name]?.[frame],img=images['creature:'+name];if(!f||!img||alpha<=0)return;
  const k=ZOOM/.5*scale;ctx.save();if(alpha<1)ctx.globalAlpha*=alpha;ctx.translate(Math.round(x),Math.round(y-altitude*ZOOM));if(rotate)ctx.rotate(rotate);if(flip)ctx.scale(-1,1);
  ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(-f.anchor[0]*k),Math.round(-f.anchor[1]*k),Math.round(f.w*k),Math.round(f.h*k));ctx.restore();
}
function cycleFrame(list,fps,phase=0){return list[Math.floor(clock*fps+phase)%list.length];}
// Art props (statues, boulders) and bystanders Medusa has turned to stone for a while.
function drawLegendArtProp(o,s){
  if(o.legendStoneUntil>clock&&(o.type.startsWith('person')||o.type==='skier'||o.type==='boarder')){shadow(s.x,s.y,10*ZOOM,3,.1);artDraw('medusa-props',o.type==='skier'||o.type==='boarder'?0:1,s.x,s.y);return true;}
  if(!o.legendArt)return false;if(o.eaten||o.dead)return true;shadow(s.x,s.y,o.width*.28*ZOOM,4,.1);artDraw(o.legendArt.name,o.legendArt.frame,s.x,s.y);return true;
}

// ---------- shared helpers ----------
function labOwn(o){return {arcadeRun:o.arcadeRun,encounter:o.encounter};}
function labHumans(x,y,radius){const out=[];for(const n of viewItems(CAT_AUDIENCE_VIEW))if(!n.eaten&&!n.dead&&!n.legendCarried&&!n.foxDecoy&&!(n.legendStoneUntil>clock)&&Math.abs(n.x-x)<radius&&Math.abs(n.y-y)<radius&&Math.hypot(n.x-x,n.y-y)<radius)out.push(n);return out;}
function labMonsters(){const out=[];for(const c of state.chasers)if(['fast','slow','bear'].includes(c.kind)&&!c.dead&&!c.eaten&&!c.leaving)out.push(c);for(const c of objectGroups().groundHunters)if(!c.dead&&!c.eaten&&!c.legendCarried)out.push(c);return out;}
function knockHuman(n,cause){if(n.type==='skier'||n.type==='boarder')crashSkier(n,cause);else crashPedestrian(n,cause);}
function stunMonster(c,seconds,stone=false){c.stunnedUntil=Math.max(c.stunnedUntil||0,clock+seconds);if(stone)c.legendStoneUntil=c.stunnedUntil;c.divert=c.targetSkier=null;}
function fryMonster(c){if(state.chasers.includes(c)){c.dead=true;c.fadeUntil=clock+S.wildlife.predatorFadeSeconds;}else knockDownByTerrain(c);burst(c.x,c.y,'#f0a050',12);}
function scareMonster(c,from,seconds=.6){c.scaredUntil=Math.max(c.scaredUntil||0,clock+seconds);c.dogFearOrigin={x:from.x,y:from.y};c.divert=c.targetSkier=null;}
function playerFree(p=state.p){return !p.fall&&!p.awaitingInput&&!state.deathTimer&&!p.dragonRide&&!p.legendCarry&&!(p.legendStoneUntil>clock);}
function labGear(kind,o,line){legendGift(kind,o,line);}
function labTouch(o,previous,x,y,radius){const p=state.p,keep=p.shield;p.shield=0;const hit=legendContact(o,previous,x,y,radius);p.shield=keep;return hit;}
// A legend that catches you: a sword beats it, a shield buys an escape, otherwise it is the end of the run.
function legendCatch(o,cause){
  const p=state.p,a=state.endless||state.arcade,G=S.arcade.gear;if(p.shield>0||state.deathTimer)return 'none';
  if(a?.swords>0){a.swords--;a.swordsUsed=(a.swordsUsed||0)+1;p.shield=G.protectionSeconds;a.gearEffect={kind:'sword',start:clock,until:clock+G.effectSeconds,angle:Math.atan2(o.y-p.y,o.x-p.x)};burst(o.x,o.y,G.swordColor,20);beep(980,.1,'triangle');return 'sword';}
  if(a?.shields>0){a.shields--;p.shield=G.protectionSeconds;a.gearEffect={kind:'shield',start:clock,until:clock+G.effectSeconds};burst(p.x,p.y,G.shieldColor,20);beep(620,.14,'triangle');return 'shield';}
  die(cause,o);return 'dead';
}
// Light sources ghosts will not enter: lamps, houses, torches, skiers, festive lights, glowing legends.
function legendLights(){
  if(state.legendLightAt===clock)return state.legendLights;
  const p=state.p,R=S.night.lightReachMultiplier,list=[],near=o=>Math.abs(o.x-p.x)<900&&Math.abs(o.y-p.y)<1100;
  for(const o of viewItems(NIGHT_STATIC_VIEW)){if(o.dead||o.eaten||o.labLampOut||!near(o))continue;
    const r=o.type==='lamp'?(o.lightRadiusWorld??S.night.lampRadiusMetres*PX_PER_M):HOUSE_TYPES.has(o.type)?(o.width||80)*.8:o.type==='christmasTree'?128/ZOOM:o.type==='jackLantern'?44/ZOOM:['gate','entrance','finish'].includes(o.type)?43/ZOOM:60/ZOOM;list.push({x:o.x,y:o.y,r:r*R});}
  for(const n of viewItems(CAT_AUDIENCE_VIEW))if(!n.dead&&!n.eaten&&near(n)){if(carriesTorch(n))list.push({x:n.x,y:n.y,r:S.night.pedestrianRadiusMetres*PX_PER_M*R});else if(n.type==='skier'||n.type==='boarder')list.push({x:n.x,y:n.y,r:S.night.skierRadiusMetres*PX_PER_M*R});}
  for(const o of legendActors()){if(o.eaten)continue;if(o.legendKind==='phoenix')list.push({x:o.x,y:o.y,r:90});if(o.legendKind==='wisps'){for(const w of o.wisps||[])if(!w.taken)list.push({x:w.x,y:w.y,r:60});}}
  if(wispsOrbiting())list.push({x:p.x,y:p.y,r:V3.wisps.lightRadius,player:true});
  state.legendLightAt=clock;state.legendLights=list;return list;
}
function litAt(x,y,pad=0){for(const l of legendLights())if(Math.hypot(x-l.x,y-l.y)<l.r+pad)return l;return null;}
// Flee-type creatures count as predator threats for bystanders while they are active.
function legendNpcThreats(){
  const out=[];if(!state.started)return out;
  for(const o of legendActors()){
    if(o.eaten||o.dead||o.defeated||!o.activeAt||LAB_REACTIONS[o.legendKind]?.mode!=='flee')continue;
    o.legendLines=LAB_REACTIONS[o.legendKind].lines;
    if(o.legendKind==='ghost'){for(const g of o.ghosts||[])if(!g.gone){g.legendLines=o.legendLines;out.push(g);}}else out.push(o);
  }
  return out;
}
function labReactions(o){
  const R=LAB_REACTIONS[o.legendKind];if(!R||R.mode!=='awe'||clock<(o.aweAt||0))return;o.aweAt=clock+.5;
  for(const n of labHumans(o.x,o.y,280)){if(clock<(n.speakAt||0)||n.fearUntil>clock)continue;say(pick(R.lines),n,1.6);n.speakAt=clock+5;n.cheerUntil=clock+1.6;}
}
function legendChaser(kind,x,y,kmh,extra={}){const c={kind,arcadeTier:'special',x,y,chaseRun:state.course,speed:kmh/S.physics.hudKmhPerSpeed,endlessBaseKmh:kmh,phase:range(0,TAU),expires:Infinity,wakeUntil:clock+.4,talkAt:clock+8,...extra};state.chasers.push(c);return c;}
function labSpawnYeti(o,count=1,kmh=86,back=240){const p=state.p;for(let i=0;i<count;i++)legendChaser('fast',p.x+(i-(count-1)/2)*70,p.y-back-i*25,kmh,{labYeti:true,chaseRun:o?.arcadeRun||state.course});}
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
    Object.assign(o,{width:56,ghosts:[],spawned:0});
    // Lamps along the way: the light ghosts will not enter.
    for(const [dy,dx] of [[-100,170],[250,-190],[600,180],[950,-170],[1300,190],[1650,-180],[2000,170]])entity('lamp',o.homeX+dx,o.homeY+dy,{...own,width:20,r:6,labLamp:true});
  }else if(kind==='unicorn')Object.assign(o,{width:90,legendState:'wait'});
  else if(kind==='griffin')Object.assign(o,{width:120,altitude:V3.griffin.altitude,legendState:'circle',grabs:0,nextDive:0,orbit:0});
  else if(kind==='medusa'){
    Object.assign(o,{width:80});o.statues=[];
    for(const [angle,d] of [[-55,170],[-20,300],[15,190],[48,320],[-38,400],[0,140]]){const a=angle*Math.PI/180;o.statues.push(rock(o.homeX+Math.sin(a)*d,o.homeY-Math.cos(a)*d,'medusa-props',Math.floor(random()*3),14,44));}
  }else if(kind==='cyclops'){o.x=o.homeX+260;Object.assign(o,{width:160,flights:[],rocks:[]});}
  else if(kind==='phoenix')Object.assign(o,{width:100,altitude:60,fireballs:[],legendState:'fly'});
  else if(kind==='genie')Object.assign(o,{width:80,legendState:'lamp',altitude:0,changed:0});
  else if(kind==='hut'){o.x=o.homeX+pick([-1,1])*230;Object.assign(o,{width:165,legendState:'crouching'});}
  else if(kind==='troll'){const T=V3.troll;o.bridge={x:o.homeX,y:o.homeY,half:T.bridgeHalf,length:T.bridgeLength};o.x=o.homeX;o.y=o.homeY+T.bridgeLength/2-40;Object.assign(o,{width:90,legendState:'waiting'});
    filterObjects(q=>q===o||!NPC_STATIC_SOLIDS.has(q.type)||Math.abs(q.x-o.bridge.x)>720||Math.abs(q.y-o.bridge.y)>T.bridgeLength/2+40);invalidateSolidGrids();}
  else if(kind==='thunderbird')Object.assign(o,{width:120,altitude:110,marks:[]});
  else if(kind==='gargoyle'){o.x=o.homeX+130;Object.assign(o,{width:70,legendState:'perched',altitude:0,perch:{x:o.homeX+130,y:o.homeY}});if(showcase)entity('lodge',o.homeX+300,o.homeY+60,{...own,width:180,r:75,buildingKind:'inn'});}
  else if(kind==='wisps')Object.assign(o,{width:44,wisps:[],orbit:0});
  else if(kind==='giant')o.gift={x:o.x-170,y:o.homeY+60};
  if(!showcase)return;
  labSpawnPeople(o,o.homeX,o.homeY+(kind==='troll'?V3.troll.bridgeLength/2+250:0),6);
}

// ---------- update ----------
function labTick(o){
  if(!o.labScene||!o.activeAt)return;
  if(!o.labYetis){o.labYetis=true;if(labState.yetis&&!['dragon','troll'].includes(o.legendKind))labSpawnYeti(o,2,80,450);}
}
function updateLegendV3(o,dt,previous){
  labReactions(o);labTick(o);const ox=o.x,oy=o.y,k=o.legendKind;
  ({witch:updateWitch,ghost:updateGhosts,unicorn:updateUnicorn,griffin:updateGriffin,medusa:updateMedusa,cyclops:updateCyclops,phoenix:updatePhoenix,genie:updateGenie,hut:updateHut,troll:updateTroll,thunderbird:updateThunderbird,gargoyle:updateGargoyle,wisps:updateWisps})[k](o,dt,previous);
  if(!['ghost'].includes(k)){o.motionVx=(o.x-ox)/dt;o.motionVy=(o.y-oy)/dt;}
}
function updateLegendPlayerEffects(dt){
  const p=state.p;
  if(p.legendDizzyUntil>clock&&!p.air)p.heading+=Math.sin(clock*5.5)*1.7*dt;
  if(p.legendSlush>clock&&!p.air){p.speed=Math.min(p.speed,topSpeed()*.55);}
  updateWispOrbit();
}
// Movement override: turned to stone, or carried by the griffin. Returns true when it owns this frame.
function moveLegendCarry(p,dt){
  if(p.legendStoneUntil>clock&&p.legendStoneAt){
    p.x=p.legendStoneAt.x;p.y=p.legendStoneAt.y;p.speed=p.vx=p.vy=0;p.air=0;
    p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);return true;
  }
  const g=p.legendCarry;if(!g)return false;
  if(g.eaten||!state.objects.includes(g)||state.deathTimer){dropLegendCarry(p,g);return false;}
  p.walkOrigin={x:p.x,y:p.y};p.x=g.x;p.y=g.y-(g.altitude||0)+14;p.speed=topSpeed();p.vx=g.motionVx||0;p.vy=g.motionVy||0;
  p.air=1;p.airTotal=0;p.onIce=false;p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);
  p.impactMotion={stamp:clock,x:p.walkOrigin.x,y:p.walkOrigin.y,vx:p.vx,vy:p.vy,speed:p.speed,heading:p.heading,mode:p.mode,air:1,fall:0,awaitingInput:false};return true;
}
function dropLegendCarry(p,g){
  if(p.legendCarry!==g)return;delete p.legendCarry;
  p.x=g.x;p.y=g.y;p.air=p.airTotal=0;p.heading=p.desiredHeading=0;p.mode='slide';p.speed=topSpeed()*.3;p.vx=0;p.vy=p.speed;state.lastTrack=null;
  const a=state.endless||state.arcade;
  if(a?.shields>0){a.shields--;p.shield=Math.max(p.shield,1);burst(p.x,p.y,C.gold,12);say('SHIELD SOFTENED THE DROP',p,1.6);}
  else{crash(null);say('OOF!',p,1);}
}

// Witch: an annoying visitor. Her potions splash everyone who skis through, then she gets bored and leaves.
function updateWitch(o,dt){
  const p=state.p,W=V3.witch,t=clock-o.activeAt;
  if(o.legendState==='gone'){o.y+=topSpeed()*1.3*dt;o.x+=180*dt;o.altitude+=40*dt;if(clock-o.goneAt>4)o.eaten=true;return;}
  if(t>W.seconds){o.legendState='gone';o.goneAt=clock;say('Hehehe! Bye bye!',o,1.6);return;}
  const gx=p.x+Math.sin(t*1.1)*220,gy=p.y+260+Math.sin(t*2.2)*70;o.x=ease(o.x,gx,2.5,dt);o.y=ease(o.y,gy,2.5,dt);o.altitude=ease(o.altitude,W.altitude,3,dt);
  if(clock>=(o.potionAt||o.activeAt+1.2)){o.potionAt=clock+W.potionEvery;o.throwAt=clock;
    const tx=p.x+p.vx*W.fallSeconds+range(-45,45),ty=p.y+p.vy*W.fallSeconds+range(-20,40);o.potions.push({x0:o.x,y0:o.y,a0:o.altitude,x:tx,y:ty,at:clock,land:clock+W.fallSeconds,color:pick(POTIONS)});
    if(random()<.25)say(pick(['Hee hee hee!','Try this one!','Bottoms up!']),o,1);}
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

// Ghosts: one at a time, through trees, deadly to touch. They will not enter light - lamps, houses, torches, skiers.
function updateGhosts(o,dt){
  const p=state.p,G=V3.ghost,t=clock-o.activeAt;
  if(o.spawned<G.total&&t>=o.spawned*G.spawnEvery){o.spawned++;
    let x=p.x+pick([-1,1])*range(160,260),y=p.y+range(330,480);for(let i=0;i<6&&litAt(x,y,20);i++){x=p.x+range(-280,280);y=p.y+range(330,520);}
    o.ghosts.push({x,y,born:clock,phase:range(0,TAU),alpha:0});say('Wooooo...',o.ghosts.at(-1),1.2);}
  let cx=0,cy=0,n=0;
  for(const g of o.ghosts){
    if(g.gone){continue;}
    const age=clock-g.born;if(age>G.life||p.y>g.y+1400){g.gone=true;g.goneAt=clock;continue;}
    g.alpha=clamp(age/G.fadeIn,0,1)*clamp((G.life-age)/.8,0,1);
    const behind=g.y<p.y-10,speed=behind?Math.max(topSpeed()*G.approachRatio,p.speed*G.followRatio):topSpeed()*G.approachRatio,tx=p.x+p.vx*.5,ty=p.y+p.vy*.5,d=Math.hypot(tx-g.x,ty-g.y)||1;
    let nx=g.x+(tx-g.x)/d*speed*dt+Math.sin(clock*2+g.phase)*20*dt,ny=g.y+(ty-g.y)/d*speed*dt;
    // Light pushes a ghost back out: hiding in a pool of light is the counterplay.
    const lit=litAt(nx,ny,6);if(lit){const a=Math.atan2(ny-lit.y,nx-lit.x);nx=lit.x+Math.cos(a)*(lit.r+7);ny=lit.y+Math.sin(a)*(lit.r+7);g.recoil=clock;}
    g.vx=(nx-g.x)/dt;g.x=nx;g.y=ny;
    if(g.alpha>.6&&playerFree()&&p.air<=0&&Math.hypot(p.x-g.x,p.y-g.y)<G.killRadius+S.physics.playerRadius&&!litAt(p.x,p.y)){const r=legendCatch(g,'GHOST');if(r!=='none'&&r!=='dead'){g.gone=true;g.goneAt=clock;burst(g.x,g.y,'#e8f6ff',14);}}
    for(const h of labHumans(g.x,g.y,22))if(g.alpha>.6&&(h.type==='skier'||h.type==='boarder'))knockHuman(h,o);
    cx+=g.x;cy+=g.y;n++;
  }
  if(n){o.x=cx/n;o.y=cy/n;}else if(o.spawned>=G.total&&o.ghosts.every(g=>g.gone&&clock-g.goneAt>1))o.eaten=true;
}

// Unicorn: monsters will not come near it. Stay close and the Yetis back off - but never bump it.
function updateUnicorn(o,dt){
  const p=state.p,U=V3.unicorn,t=clock-o.activeAt;
  if(o.legendState==='wait'){o.legendState='run';o.anchorX=p.x;o.x=p.x+pick([-1,1])*320;o.y=p.y+160;say('Neigh!',o,1);}
  if(o.legendState==='leave'){o.x+=Math.sign(o.x-p.x||1)*topSpeed()*.9*dt;o.y+=topSpeed()*1.2*dt;if(clock-o.leaveAt>3)o.eaten=true;return;}
  if(t>U.seconds){o.legendState='leave';o.leaveAt=clock;say('Neigh!',o,1);return;}
  const bolting=o.boltUntil>clock,goal={x:o.anchorX+Math.sin(t*.45)*200,y:p.y+(bolting?260:30)+Math.sin(t*1.3)*40};
  const gx=goal.x-o.x,gy=goal.y-o.y,gd=Math.hypot(gx,gy)||1,fix=Math.min(gd*2.5,topSpeed()*(bolting?.9:.5));o.x+=gx/gd*fix*dt;o.y+=(Math.max(0,p.vy)+gy/gd*fix)*dt;
  for(const c of labMonsters())if(Math.hypot(c.x-o.x,c.y-o.y)<U.scareRadius){scareMonster(c,o,.7);if(clock>=(c.unicornSayAt||0)){c.unicornSayAt=clock+3;say(pick(['EEK!','Not the horn!','?!']),c,1);}}
  if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-o.x,p.y-o.y)<U.touch+S.physics.playerRadius&&!bolting){o.boltUntil=clock+1.2;crash(o);say('NEIGH!!',o,1);}
}

// Griffin: its shadow locks on the nearest prey and leads its aim. It carries its catch UP the slope - back toward the Yetis.
function updateGriffin(o,dt){
  const p=state.p,G=V3.griffin,centre={x:p.x,y:p.y-110};
  if(o.legendState==='leave'){o.y+=topSpeed()*1.2*dt;o.altitude+=60*dt;if(clock-o.leaveAt>4)o.eaten=true;}
  else if(o.legendState==='circle'){
    o.orbit+=dt*1.6;o.x=ease(o.x,centre.x+Math.cos(o.orbit)*170,3,dt);o.y=ease(o.y,centre.y+Math.sin(o.orbit)*90,3,dt);o.altitude=ease(o.altitude,G.altitude,2,dt);
    if(o.grabs>=G.grabs){o.legendState='leave';o.leaveAt=clock;}
    else if(clock>=Math.max(o.nextDive,o.activeAt+1.5)){
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
    const K=o.carry;o.y-=topSpeed()*G.carryUphillRatio*dt;o.x+=Math.sin(clock*1.3)*40*dt;o.altitude=ease(o.altitude,70,3,dt);
    if(K.kind==='human'&&K.q){K.q.x=o.x;K.q.y=o.y;}
    if(clock>=o.carryUntil){
      if(K.kind==='player')dropLegendCarry(p,o);
      else if(K.kind==='human'&&K.q){K.q.legendCarried=false;K.q.x=o.x;K.q.y=o.y+20;knockHuman(K.q,o);say('PUT ME DOWN!',K.q,1.2);}
      else if(K.kind==='hunter'&&K.q){K.q.legendCarried=false;K.q.x=o.x+300;knockDownByTerrain(K.q);}
      o.carry=null;o.legendState='circle';o.nextDive=clock+G.cooldown;
    }
  }
}
function griffinGrab(o){
  const p=state.p,G=V3.griffin,L=o.lockPoint;let got=null;
  if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-L.x,p.y-L.y)<G.reach+S.physics.playerRadius)got={kind:'player',q:p};
  if(!got)for(const c of labMonsters())if(Math.hypot(c.x-L.x,c.y-L.y)<G.reach+12){got=state.chasers.includes(c)?{kind:'yeti',q:c}:{kind:'hunter',q:c};break;}
  if(!got)for(const n of labHumans(L.x,L.y,G.reach+10)){got={kind:'human',q:n};break;}
  o.grabs++;
  if(!got){o.legendState='circle';o.nextDive=clock+G.cooldown*.6;burst(L.x,L.y,C.ice,8);say('Skree...',o,.8);return;}
  o.carry=got;o.legendState='carry';o.carryUntil=clock+G.carrySeconds;burst(L.x,L.y,C.ice,12);beep(600,.08);
  if(got.kind==='player'){p.legendCarry=o;p.dragonBoardBlockedUntil=clock+3;announce('CARRIED OFF!','...back up the hill',C.red,1.8);}
  else if(got.kind==='yeti'){const i=state.chasers.indexOf(got.q);if(i>=0)state.chasers.splice(i,1);say('ROAAR?!',got.q,1);}
  else{got.q.legendCarried=true;if(got.kind==='human')say('HEEELP!',got.q,1.4);}
}

// Medusa: her glare sweeps the slope in three sectors; statues block it. Five seconds of stone for anyone it catches.
function medusaSector(o){const M=V3.medusa,seq=[-1,0,1,0],phase=(clock-o.activeAt)/(M.lookSeconds+M.glareSeconds),i=Math.floor(phase),glaring=phase-i>M.lookSeconds/(M.lookSeconds+M.glareSeconds);return {sector:seq[i%4],glaring};}
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
    if(playerFree()&&!p.air&&!(p.shield>0)&&clock>=(p.legendStoneImmune||0)&&medusaSees(o,p.x,p.y,g.sector)){p.legendStoneUntil=clock+M.stoneSeconds;p.legendStoneImmune=clock+M.stoneSeconds+1.5;p.legendStoneAt={x:p.x,y:p.y};burst(p.x,p.y,'#9aa39a',12);say('...STONE!',p,1.2);}
    for(const c of labMonsters())if(!(c.legendStoneUntil>clock)&&clock>=(c.legendStoneImmune||0)&&medusaSees(o,c.x,c.y,g.sector)){stunMonster(c,M.stoneSeconds,true);c.legendStoneImmune=clock+M.stoneSeconds+1.5;burst(c.x,c.y,'#9aa39a',8);}
    for(const n of labHumans(o.x,o.y,M.length))if(clock>=(n.legendStoneImmune||0)&&medusaSees(o,n.x,n.y,g.sector)){knockHuman(n,o);n.npcFallUntil=clock+M.stoneSeconds;n.legendStoneUntil=clock+M.stoneSeconds;n.legendStoneImmune=clock+M.stoneSeconds+1.5;burst(n.x,n.y,'#9aa39a',10);}
  }
  if(!o.rewarded&&playerFree()&&Math.hypot(p.x-o.x,p.y-o.y)<M.mirrorReach){o.rewarded=true;labGear('shield',o,'HER MIRROR SHIELD!');say('Thief!',o,1.2);}
}

// Cyclops: a bombardment zone. Boulders land around and ahead of you, stay as rocks, and keep coming after he is out of sight.
function updateCyclops(o,dt,previous){
  const p=state.p,K=V3.cyclops,t=clock-o.activeAt;
  if(!o.hidden&&p.y>o.homeY+250){o.hidden=true;}
  if(!o.hidden)legendBump(o,previous,o.x,o.y-6,32,true);if(o.defeated)return;
  if(t<K.seconds&&clock>=(o.throwAt||o.activeAt+.6)){o.throwAt=clock+K.throwEvery*range(.8,1.2);o.windAt=clock;
    const tx=p.x+p.vx*K.flightSeconds*.85+range(-K.spread,K.spread),ty=p.y+p.vy*K.flightSeconds*.85+range(-50,70);
    const from=o.hidden?{x:o.homeX+260,y:p.y-560}:{x:o.x-20,y:o.y-30};o.flights.push({x0:from.x,y0:from.y,x:tx,y:ty,at:clock});if(!o.hidden&&random()<.4)say(pick(['HRAAH!','RAAA!','UNGH!']),o,.7);}
  if(t>=K.seconds&&!o.flights.length&&o.hidden)o.eaten=true;
  for(const f of o.flights)if(!f.done&&clock-f.at>=K.flightSeconds){
    f.done=true;burst(f.x,f.y,'#a7a29b',14);state.screenShake=Math.max(state.screenShake||0,.12);beep(110,.1,'triangle');
    if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-f.x,p.y-f.y)<K.hitRadius+S.physics.playerRadius)crash(o);
    for(const c of labMonsters())if(Math.hypot(c.x-f.x,c.y-f.y)<K.hitRadius+12){if(state.chasers.includes(c))stunMonster(c,3);else knockDownByTerrain(c);}
    for(const n of labHumans(f.x,f.y,K.hitRadius+8))knockHuman(n,o);
    if(o.rocks.length<K.maxRocks&&!nearbyFootprints(f.x,f.y,40).some(q=>q.r>0&&obstacleClearance(q,f.x,f.y)<10))o.rocks.push(entity('rock',f.x,f.y,{...labOwn(o),r:20,width:64,legendArt:{name:'cyclops-props',frame:2}}));
  }
  o.flights=o.flights.filter(f=>!f.done);
}

// Phoenix: an enemy. It shoots fireballs at you, bystanders and other monsters; the blasts melt the snow into fast ice.
function updatePhoenix(o,dt){
  const p=state.p,P=V3.phoenix,t=clock-o.activeAt;
  if(o.legendState==='leave'){o.y+=topSpeed()*1.4*dt;o.altitude+=50*dt;if(clock-o.leaveAt>4&&!o.fireballs.length)o.eaten=true;}
  else{
    if(t>P.seconds){o.legendState='leave';o.leaveAt=clock;}
    const cyc=Math.floor(t/P.ashEvery),local=t-cyc*P.ashEvery;
    if(cyc>0&&local<1)o.legendState='ash';else if(cyc>0&&local<1.6){if(o.legendState==='ash'){o.x=p.x+pick([-1,1])*200;o.y=p.y+320;burst(o.x,o.y-o.altitude,'#f0a050',16);}o.legendState='reborn';}else o.legendState='fly';
    if(o.legendState!=='ash'){const tri=Math.abs(((t/4)%2)-1)*2-1;o.x=ease(o.x,p.x+tri*260,2.2,dt);o.y=ease(o.y,p.y+330,2,dt);}
    if(o.legendState==='fly'&&clock>=(o.fireAt||o.activeAt+1)){o.fireAt=clock+P.fireEvery;o.shotAt=clock;
      // Mostly at you; sometimes at whoever else is closest.
      let target=p;if(random()<.4){let best=650;for(const q of [...labMonsters(),...labHumans(o.x,o.y,650)]){const d=Math.hypot(q.x-o.x,q.y-o.y);if(d<best){best=d;target=q;}}}
      const vx=target===p?p.vx:(target.motionVx??target.vx??0),vy=target===p?p.vy:(target.motionVy??target.vy??0);
      o.fireballs.push({x0:o.x,y0:o.y,a0:o.altitude,x:target.x+vx*P.flightSeconds*.9,y:target.y+vy*P.flightSeconds*.9,at:clock});}
  }
  for(const f of o.fireballs)if(!f.done&&clock-f.at>=P.flightSeconds){
    f.done=true;burst(f.x,f.y,'#f0a050',16);burst(f.x,f.y,'#f7d27a',8);beep(160,.08,'sawtooth');
    if(playerFree()&&!p.air&&!(p.shield>0)&&Math.hypot(p.x-f.x,p.y-f.y)<P.blastRadius+S.physics.playerRadius){crash(o);say('HOT HOT HOT!',p,1.2);}
    for(const c of labMonsters())if(Math.hypot(c.x-f.x,c.y-f.y)<P.blastRadius+14){fryMonster(c);say('FRIED!',c,1);}
    for(const n of labHumans(f.x,f.y,P.blastRadius+8))knockHuman(n,o);
    legendaryIce(o,f.x,f.y,42,64,P.iceSeconds);
  }
  o.fireballs=o.fireballs.filter(f=>!f.done);
}

// Genie: swoops to something near your line and, after a one-second spell, turns it into something else. Never tree to rock.
function genieTarget(o){
  const p=state.p,ahead=q=>q.y>p.y+160&&q.y<p.y+560&&Math.abs(q.x-p.x)<300,options=[];
  for(const q of nearbyFootprints(p.x,p.y+360,320))if(!q.eaten&&!q.dead&&ahead(q)&&(TREE_TYPES.has(q.type)||q.type==='rock')&&!q.genieCursed)options.push(q);
  for(const c of labMonsters())if(Math.hypot(c.x-p.x,c.y-p.y)<500&&!c.genieCursed)options.push(c,c);
  for(const n of labHumans(p.x,p.y+300,400))if(!n.genieCursed)options.push(n);
  return options.length?pick(options):null;
}
function genieTransform(o,q){
  const p=state.p,own=labOwn(o);burst(q.x,q.y,'#8fb0e0',18);burst(q.x,q.y,C.gold,10);beep(820,.1,'triangle');
  if(state.chasers.includes(q)||q.type==='lurker'||q.type==='wolf'||q.type==='bear'||q.type==='zombie'){
    if(state.chasers.includes(q))state.chasers.splice(state.chasers.indexOf(q),1);else{q.eaten=true;}
    const r=entity('rock',q.x,q.y,{...own,r:20,width:64,legendArt:{name:'cyclops-props',frame:2},genieCursed:true});say('...rock?',r,1);
  }else if(TREE_TYPES.has(q.type)){q.eaten=true;invalidateSolidGrids();const c=legendChaser(random()<.7?'fast':'bear',q.x,q.y,random()<.7?86:82,{genieCursed:true});say('ROAR!',c,1);}
  else if(q.type==='rock'){q.eaten=true;invalidateSolidGrids();const c=legendChaser('bear',q.x,q.y,82,{genieCursed:true});say('GRRR!',c,1);}
  else{q.eaten=true;const c=legendChaser('fast',q.x,q.y,86,{genieCursed:true});say('...WHY ME?!',c,1.2);}
  o.changed++;
}
function updateGenie(o,dt){
  const p=state.p,G=V3.genie,t=clock-o.activeAt;
  if(o.legendState==='lamp'){o.legendState='emerge';o.stateAt=clock;burst(o.x,o.y,'#8fb0e0',16);say('FREEDOM! Now... let us have FUN!',o,2);return;}
  if(o.legendState==='emerge'){o.altitude=ease(o.altitude,30,3,dt);if(clock-o.stateAt>.8){o.legendState='idle';o.nextAt=clock+.4;}return;}
  if(o.legendState==='leave'){o.altitude+=40*dt;o.y+=topSpeed()*1.1*dt;if(clock-o.stateAt>2)o.eaten=true;return;}
  if(t>G.seconds&&o.legendState==='idle'){o.legendState='leave';o.stateAt=clock;say('Enough fun for today!',o,1.6);return;}
  if(o.legendState==='idle'){o.x=ease(o.x,p.x+120,3,dt);o.y=ease(o.y,p.y+150,3,dt);o.altitude=ease(o.altitude,30,3,dt);
    if(clock>=o.nextAt){const q=genieTarget(o);if(q){o.target=q;q.genieCursed=true;o.legendState='fly';o.stateAt=clock;o.from={x:o.x,y:o.y};}else o.nextAt=clock+.5;}}
  else if(o.legendState==='fly'){const q=o.target,s=clamp((clock-o.stateAt)/G.flySeconds,0,1);o.x=mix(o.from.x,q.x+40,s);o.y=mix(o.from.y,q.y-20,s);if(s>=1){o.legendState='cast';o.stateAt=clock;say(pick(['ALAKAZAM!','ABRACADABRA!','SHAZAM!']),o,1);}}
  else if(o.legendState==='cast'){const q=o.target;o.x=q.x+40;o.y=q.y-20;if(q.eaten||q.dead){o.legendState='idle';o.nextAt=clock+.3;}else if(clock-o.stateAt>=G.castSeconds){genieTransform(o,q);o.legendState='idle';o.nextAt=clock+G.between;}}
}

// Baba Yaga's hut: rises when you pass and chases you on its chicken legs, striding straight over everything.
function updateHut(o,dt){
  const p=state.p,H=V3.hut,t=clock-o.activeAt;
  if(o.legendState==='crouching'){if(p.y>o.y-120){o.legendState='rising';o.stateAt=clock;say('*CREAK*',o,1);beep(90,.2,'triangle');}return;}
  if(o.legendState==='rising'){if(clock-o.stateAt>.6){o.legendState='chasing';o.stateAt=clock;}return;}
  if(o.legendState==='tired'){return;}
  if(o.legendState==='chasing'){
    if(clock-o.stateAt>H.seconds||p.y>o.y+1500){o.legendState='tired';o.wasCrouched=false;return;}
    const d=Math.hypot(p.x-o.x,p.y-o.y)||1,speed=topSpeed()*H.speedRatio;o.x+=(p.x-o.x)/d*speed*dt;o.y+=(p.y-o.y)/d*speed*dt;
    if(clock>=(o.stompAt||0)){o.stompAt=clock+.35;state.screenShake=Math.max(state.screenShake||0,.05);
      for(const n of labHumans(o.x,o.y,H.stompRadius))knockHuman(n,o);for(const c of labMonsters())if(Math.hypot(c.x-o.x,c.y-o.y)<H.stompRadius){if(state.chasers.includes(c))stunMonster(c,2);else knockDownByTerrain(c);}}
    if(playerFree()&&!p.air&&d<H.catchRadius+S.physics.playerRadius){const r=legendCatch(o,'BABA YAGA');if(r==='sword'){o.legendState='tired';o.defeatedAt=clock;say('*CRASH*',o,1);}else if(r==='shield'){o.y-=120;}}
  }
}

// Bridge troll: the only way over the gorge. He walks up the bridge mirroring you; get past him, or pay with your gear.
function updateTroll(o,dt,previous){
  const p=state.p,T=V3.troll,b=o.bridge;
  if(Math.abs(p.y-b.y)<b.length/2&&Math.abs(p.x-b.x)>b.half&&!p.air)legendBump(o,previous,p.x,p.y,5);
  if(o.legendState==='paid'){o.x=ease(o.x,b.x+(o.x<b.x?-1:1)*(b.half-18),4,dt);return;}
  if(p.y>o.y+60){o.legendState='waiting';return;}
  if(p.y>b.y-b.length/2-250){
    o.legendState=Math.abs(o.motionVx||0)>20?'charging':'aiming';
    o.x+=clamp(p.x-o.x,-T.lateral*dt,T.lateral*dt);o.x=clamp(o.x,b.x-b.half+18,b.x+b.half-18);
    o.y=Math.max(b.y-b.length/2+20,o.y-T.forward*dt);
  }
  if(playerFree()&&!p.air&&Math.hypot(p.x-o.x,p.y-o.y)<T.catchRadius+S.physics.playerRadius){
    const r=legendCatch(o,'TROLL');if(r==='sword'){o.defeated=true;o.defeatedAt=clock;say('OOF!',o,1);}else if(r==='shield'){o.legendState='paid';say('TOLL PAID. PASS.',o,1.6);}
  }
}

// Thunderbird: calls down rows of lightning across the slope ahead, each with one gap. Strikes topple trees and fry monsters.
function updateThunderbird(o,dt,previous){
  const p=state.p,T=V3.thunderbird,t=clock-o.activeAt;
  if(t<T.seconds){o.x=ease(o.x,p.x+Math.sin(t*.8)*160,1.5,dt);o.y=ease(o.y,p.y+380,2,dt);
    if(clock>=(o.rowAt||o.activeAt+1)){o.rowAt=clock+T.rowEvery;say('KRAAA!',o,.8);
      const y=p.y+Math.max(260,p.vy*(T.warnSeconds+.2)),gapX=p.x+range(-200,200);
      for(let x=p.x-400;x<=p.x+400;x+=T.spacing)if(Math.abs(x-gapX)>T.gap/2+20)o.marks.push({x:x+range(-12,12),y:y+range(-25,25),at:clock+T.warnSeconds});}}
  else{o.y+=topSpeed()*.5*dt;o.altitude+=30*dt;if(!o.feather){o.feather=true;if(!o.struckPlayer)labGear('sword',o,'A THUNDER FEATHER!');}if(t>T.seconds+3&&!o.marks.some(m=>!m.struck))o.eaten=true;}
  for(const m of o.marks)if(!m.struck&&clock>=m.at){m.struck=true;m.fade=clock+.65;if(legendBump(o,previous,m.x,m.y,T.ringRadius))o.struckPlayer=true;burst(m.x,m.y,'#b3d9eb',10);
    for(const c of labMonsters())if(Math.hypot(c.x-m.x,c.y-m.y)<T.ringRadius+12){fryMonster(c);say('ZZAP!',c,.8);}for(const n of labHumans(m.x,m.y,T.ringRadius+8))knockHuman(n,o);
    for(const q of nearbyFootprints(m.x,m.y,90))if(TREE_TYPES.has(q.type)&&!q.eaten&&Math.hypot(q.x-m.x,q.y-m.y)<70){q.eaten=true;const f=entity('fallingTree',q.x,q.y,{arcadeRun:o.arcadeRun,encounter:o.encounter,fallTowardX:m.x});Object.assign(f,{legendLightning:true,fallState:'falling',fallAt:clock,fallSide:m.x<f.x?-1:1,r:S.terrainFeatures.fallingTree.fallenRadiusMetres*PX_PER_M});break;}}
  o.marks=o.marks.filter(m=>!m.struck||m.fade>clock);
}

// Gargoyle: wakes as you pass, flies after you and lunges (screech first). If it gets you, it eats you.
function updateGargoyle(o,dt){
  const p=state.p,G=V3.gargoyle,t=clock-o.activeAt;
  if(o.legendState==='perched'){if(p.y>o.y-200&&Math.abs(p.x-o.x)<500){o.legendState='chase';o.stateAt=clock;say('SCREEEE!',o,1.2);}return;}
  if(o.legendState==='home'){const P=o.perch;o.x=ease(o.x,P.x,2,dt);o.y=ease(o.y,P.y,2,dt);o.altitude=ease(o.altitude,0,2,dt);if(Math.hypot(o.x-P.x,o.y-P.y)<5){o.legendState='done';}return;}
  if(o.legendState==='done')return;
  if(clock-o.stateAt>G.seconds&&o.legendState==='chase'){o.legendState='leave';o.stateAt=clock;}
  if(o.legendState==='leave'){o.y+=topSpeed()*1.2*dt;o.altitude+=40*dt;if(clock-o.stateAt>3)o.eaten=true;return;}
  const d=Math.hypot(p.x-o.x,p.y-o.y)||1;
  if(o.legendState==='chase'){o.altitude=ease(o.altitude,40,3,dt);const speed=topSpeed()*G.speedRatio;o.x+=(p.x-o.x)/d*speed*dt;o.y+=(p.y-o.y)/d*speed*dt;
    if(d<G.lungeRange&&playerFree()){o.legendState='warn';o.stateAt2=clock;o.lungeTarget={x:p.x+p.vx*(G.warnSeconds+.25),y:p.y+p.vy*(G.warnSeconds+.25)};say('!',o,.5);beep(1200,.06,'square');}}
  else if(o.legendState==='warn'){o.x+=(p.x-o.x)/d*topSpeed()*.7*dt;o.y+=(p.y-o.y)/d*topSpeed()*.7*dt;if(clock-o.stateAt2>=G.warnSeconds){o.legendState='lunge';o.stateAt2=clock;}}
  else if(o.legendState==='lunge'){const L=o.lungeTarget,ld=Math.hypot(L.x-o.x,L.y-o.y)||1,speed=topSpeed()*G.lungeRatio;o.x+=(L.x-o.x)/ld*Math.min(ld/dt,speed)*dt;o.y+=(L.y-o.y)/ld*Math.min(ld/dt,speed)*dt+p.vy*.2*dt;o.altitude=ease(o.altitude,8,8,dt);
    if(playerFree()&&!p.air&&Math.hypot(p.x-o.x,p.y-o.y)<G.catchRadius+S.physics.playerRadius){const r=legendCatch(o,'GARGOYLE');if(r==='sword'){o.defeated=true;o.defeatedAt=clock;}else if(r==='shield'){o.legendState='recover';o.stateAt2=clock;}}
    if(clock-o.stateAt2>=G.lungeSeconds){o.legendState='recover';o.stateAt2=clock;}}
  else if(o.legendState==='recover'){o.altitude=ease(o.altitude,40,3,dt);o.y+=p.vy*.5*dt;if(clock-o.stateAt2>.7)o.legendState='chase';}
}

// Will-o'-the-wisps: shy lights drifting ahead on your screen. Catch them: each one orbits you, lights the dark and keeps night creatures back.
function wispsOrbiting(){const p=state.p;p.legendWisps=(p.legendWisps||[]).filter(w=>w>clock);return p.legendWisps.length;}
function updateWisps(o,dt){
  const p=state.p,W=V3.wisps,t=clock-o.activeAt;
  if(!o.wisps.length)for(let i=0;i<W.count;i++)o.wisps.push({x:p.x+(i-1)*170+range(-30,30),y:p.y+range(380,520),phase:range(0,TAU)});
  let n=0,cx=0,cy=0;
  for(const w of o.wisps){if(w.taken)continue;
    const d=Math.hypot(p.x-w.x,p.y-w.y),side=Math.sign(w.x-p.x)||1;
    // They drift downhill slower than you, so you close in - and dart sideways when you get near.
    w.y+=Math.max(0,p.vy)*.6*dt;w.x+=((d<130?side*topSpeed()*W.shyRatio:0)+Math.sin(clock*1.5+w.phase)*40)*dt;w.x=clamp(w.x,p.x-280,p.x+280);w.y=Math.min(w.y,p.y+600);
    if(w.y<p.y-150){w.y=p.y+range(450,560);w.x=p.x+range(-220,220);}
    if(playerFree()&&d<26+S.physics.playerRadius){w.taken=true;p.legendWisps=[...(p.legendWisps||[]),clock+W.orbitSeconds];burst(w.x,w.y,'#9de5b9',12);say('A wisp joins you!',p,1.2);continue;}
    cx+=w.x;cy+=w.y;n++;
  }
  if(n){o.x=cx/n;o.y=cy/n;}else{o.x=p.x;o.y=p.y;}
  if(t>30||(!n&&!wispsOrbiting()))o.eaten=true;
}
// Orbiting wisps scare night creatures away from you.
function updateWispOrbit(){
  if(!wispsOrbiting())return;const p=state.p;
  for(const c of labMonsters())if(Math.hypot(c.x-p.x,c.y-p.y)<V3.wisps.scareRadius)scareMonster(c,p,.6);
}

// ---------- drawing ----------
function legendFrame(o){
  const k=o.legendKind,st=o.legendState,since=clock-(o.stateSince??0);
  if(o.lastDrawState!==st){o.lastDrawState=st;o.stateSince=clock;}
  if(k==='hut'){if(st==='crouching'||st==='tired')return since<.35&&st==='tired'?3:4;if(st==='rising')return 5;return cycleFrame([1,2],3.5);}
  if(k==='giant'){if(st==='inhale')return since<1?1:2;if(st==='blowing')return since<.4?3:4;return since<.6?5:0;}
  if(k==='kelpie'){if(o.gaveUp)return 7;if(o.huntUntil&&clock-(o.huntUntil-S.endless.regions.legendary.kelpieHuntSeconds)<.6)return 6;return cycleFrame([0,1,2,3,4,5],10);}
  if(k==='troll'){if(o.defeated)return 5;if(st==='paid')return 4;if(st==='aiming')return 1;if(st==='charging')return cycleFrame([2,3],8);return 0;}
  if(k==='wisps')return cycleFrame([0,1,0,1,3],4,o.phase);
  return 0;
}
function drawLegendV3Creature(o,s){
  const k=o.legendKind;if(LEGEND_SKY.has(k)||k==='ghost'||k==='wisps')return true;
  const alpha=o.defeated?clamp(1-(clock-o.defeatedAt)/1.5,0,1):1,flip=(o.motionVx||0)<-6;
  if(['hut','giant','kelpie','troll'].includes(k)){
    shadow(s.x,s.y,o.width*.22*ZOOM,5,.1);artDraw(k,legendFrame(o),s.x,s.y,{alpha,flip:k==='kelpie'||k==='troll'?flip:false});
    if(k==='troll'&&['aiming','charging'].includes(o.legendState)&&Math.abs(state.p.y-o.y)<200)text('!',s.x,s.y-58*ZOOM,15,C.gold);
    return true;
  }
  if(k==='unicorn'){
    ctx.save();ctx.globalAlpha=.10+.04*Math.sin(clock*4);ctx.fillStyle='#f6e6a6';ctx.beginPath();ctx.ellipse(s.x,s.y,V3.unicorn.scareRadius*ZOOM,V3.unicorn.scareRadius*.55*ZOOM,0,0,TAU);ctx.fill();ctx.restore();
    shadow(s.x,s.y,20*ZOOM,5,.1);artDraw('unicorn',cycleFrame([0,1,2,3,4,5],11),s.x,s.y,{flip});
    if(random()<.3)burst(o.x+range(-20,20),o.y-range(10,40),pick(['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb']),1);return true;}
  if(k==='medusa'){const g=o.gaze,frame=!g?0:g.glaring?(g.sector<0?3:g.sector>0?4:0):(g.sector<0?1:g.sector>0?2:5);shadow(s.x,s.y,22*ZOOM,5,.1);artDraw('medusa',frame,s.x,s.y);return true;}
  if(k==='cyclops'){if(o.hidden&&!o.defeated)return true;const ph=clock-(o.windAt??-9),frame=o.defeated?5:ph<.15?3:ph<.35?4:ph<.6?5:ph<.75?0:ph<.85?1:2;shadow(s.x,s.y,40*ZOOM,8,.12);artDraw('cyclops',frame,s.x,s.y,{alpha,rotate:o.defeated?Math.min(1.4,(clock-o.defeatedAt)*2):0});return true;}
  return false;
}
// Ground layer: splashes, cones, landing shadows, wind.
function drawLegendV3Ground(o){
  const k=o.legendKind;
  if(k==='giant'&&o.gift&&!o.giftTaken){const p=screen(o.gift.x,o.gift.y);gearIcon('shield',p.x,p.y-14,2);}
  if(k==='witch'){
    for(const q of o.splashes){const p=screen(q.x,q.y),fade=clamp((q.until-clock)/1,0,1);ctx.save();ctx.globalAlpha=fade;artDraw('witch-props',q.color==='green'?3:q.color==='purple'?4:5,p.x,p.y+10*ZOOM,{scale:V3.witch.splashRadius/30});ctx.restore();}
    for(const q of o.potions){const s=clamp((clock-q.at)/(q.land-q.at),0,1),p=screen(q.x,q.y);shadow(p.x,p.y,(4+s*8)*ZOOM,(2+s*3)*ZOOM,.08+s*.12);}
  }
  if(k==='medusa'&&o.gaze&&o.activeAt){
    const M=V3.medusa,g=o.gaze,c=screen(o.x,o.y-10),a=g.sector*M.sectorDegrees*Math.PI/180,h=M.coneHalfDegrees*Math.PI/180,L=M.length*ZOOM;
    ctx.save();ctx.globalAlpha=g.glaring?.32:.1+.06*Math.sin(clock*18);ctx.fillStyle=g.glaring?'#a8d68e':'#cfe8b8';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.sin(a-h)*L,c.y-Math.cos(a-h)*L*.75);ctx.lineTo(c.x+Math.sin(a+h)*L,c.y-Math.cos(a+h)*L*.75);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(k==='cyclops')for(const f of o.flights){const p=screen(f.x,f.y),s=clamp((clock-f.at)/V3.cyclops.flightSeconds,0,1);shadow(p.x,p.y,(8+s*20)*ZOOM,(3+s*8)*ZOOM,.08+s*.16);if(s>.4)text('!',p.x,p.y-12,11,C.red);}
  if(k==='phoenix')for(const f of o.fireballs){const p=screen(f.x,f.y),s=clamp((clock-f.at)/V3.phoenix.flightSeconds,0,1);shadow(p.x,p.y,(6+s*14)*ZOOM,(3+s*6)*ZOOM,.08+s*.14);if(s>.35)text('!',p.x,p.y-12,11,C.red);}
  if(k==='griffin'&&o.lockPoint&&['lock','dive'].includes(o.legendState)){const p=screen(o.lockPoint.x,o.lockPoint.y),s=clamp((clock-(o.lockAt||clock))/V3.griffin.lockSeconds,0,1);shadow(p.x,p.y,(26-s*12)*ZOOM,(10-s*4)*ZOOM,.12+s*.15);text('!',p.x,p.y-14,12,C.red);}
  if(k==='genie'&&o.legendState==='cast'&&o.target){const p=screen(o.target.x,o.target.y),s=clamp(clock-o.stateAt,0,1);ctx.save();ctx.strokeStyle='#9cc0f0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,(40-s*18)*ZOOM,(22-s*10)*ZOOM,0,0,TAU);ctx.stroke();ctx.restore();for(let i=0;i<4;i++){const a=clock*6+i*TAU/4;box(p.x+Math.cos(a)*30*ZOOM*(1-s*.5),p.y-20+Math.sin(a)*10,3,3,i%2?C.gold:'#cfe0ff');}}
  if(k==='gargoyle'&&o.legendState==='warn'&&o.lungeTarget){const p=screen(o.lungeTarget.x,o.lungeTarget.y);shadow(p.x,p.y,16*ZOOM,6*ZOOM,.2);text('!',p.x,p.y-14,12,C.red);}
  if(k==='giant'&&o.inZone&&o.legendState==='blowing')for(let i=0;i<22;i++){const p=screen(state.p.x+((i*97-clock*520)%900+900)%900-450,state.p.y-350+(i*83)%900);line(p.x,p.y,p.x-14,p.y+1,'#a2c9cd',1);}
}
// Sky layer, drawn after everything on the ground: fliers, ghosts, wisps, player status overlays.
function drawLegendSky(){
  for(const o of legendActors()){
    if(o.eaten||!legendV2Nearby(o))continue;const k=o.legendKind;
    if(k==='ghost'){for(const g of o.ghosts||[]){let a=g.alpha??1;if(g.gone){a=clamp(1-(clock-(g.goneAt||0))/.6,0,1)*.9;}if(a<=0)continue;const p=screen(g.x,g.y),near=Math.hypot(state.p.x-g.x,state.p.y-g.y)<90;shadow(p.x,p.y,10*ZOOM,3,.06*a);artDraw('ghost',a<.6||clock-(g.recoil||-9)<.3?3:near?2:cycleFrame([0,1],3,g.phase),p.x,p.y,{altitude:10+Math.sin(clock*2+g.phase)*3,alpha:a*.9,flip:(g.vx||0)<0});}continue;}
    if(k==='wisps'){for(const w of o.wisps||[])if(!w.taken){const p=screen(w.x,w.y);artDraw('wisps',cycleFrame([0,1,0,3],4,w.phase),p.x,p.y,{altitude:14+Math.sin(clock*2+w.phase)*4,scale:.7});}continue;}
    if(!LEGEND_SKY.has(k))continue;
    const s=screen(o.x,o.y),alpha=o.defeated?clamp(1-(clock-o.defeatedAt)/1.2,0,1):1,flip=(o.motionVx||0)<-6;if(alpha<=0)continue;
    if(k==='gargoyle'&&['perched','done'].includes(o.legendState)){artDraw('medusa-props',4,s.x,s.y+4);artDraw('gargoyle',Math.hypot(state.p.x-o.x,state.p.y-o.y)<500?1:0,s.x,s.y);continue;}
    if(k==='genie'&&o.legendState==='lamp'){artDraw('genie',0,s.x,s.y);continue;}
    shadow(s.x,s.y,(k==='griffin'?26:18)*ZOOM,6,.1*alpha);
    if(k==='witch'){
      const throwing=clock-(o.throwAt??-9),frame=throwing<.25?3:throwing<.5?4:throwing<.8?5:Math.abs(o.motionVx||0)>60?(o.motionVx<0?1:2):0;
      artDraw('witch',frame,s.x,s.y,{altitude:o.altitude,alpha,flip:flip&&frame<1});
      for(const q of o.potions){const t=clamp((clock-q.at)/(q.land-q.at),0,1),x=mix(q.x0,q.x,t),y=mix(q.y0,q.y,t),alt=mix(q.a0,0,t)+Math.sin(t*Math.PI)*30,p=screen(x,y);artDraw('witch-props',POTIONS.indexOf(q.color),p.x,p.y,{altitude:alt,rotate:t*9});}
    }else if(k==='griffin'){
      const st=o.legendState,frame=st==='carry'?cycleFrame([4,5],6):st==='dive'?3:st==='lock'?2:cycleFrame([0,1],4);
      const K=o.carry;if(K&&K.kind!=='player'){const p=screen(o.x,o.y),y=p.y-(o.altitude-6)*ZOOM;if(K.kind==='yeti')drawYeti(K.q,{x:p.x,y},'alert',44);else if(K.kind==='human')sprite(K.q.type==='skier'||K.q.type==='boarder'?'skier':K.q.type,p.x,y,30);else sprite('wolf',p.x,y,40);}
      artDraw('griffin',frame,s.x,s.y,{altitude:o.altitude,alpha,flip});
    }else if(k==='phoenix'){
      if(o.legendState==='ash')artDraw('phoenix',6,s.x,s.y);else artDraw('phoenix',o.legendState==='reborn'?7:cycleFrame([0,1,2,3,4,5],10),s.x,s.y,{altitude:o.altitude,flip});
      for(const f of o.fireballs){const t=clamp((clock-f.at)/V3.phoenix.flightSeconds,0,1),p=screen(mix(f.x0,f.x,t),mix(f.y0,f.y,t)),alt=mix(f.a0,0,t)+Math.sin(t*Math.PI)*25,y=p.y-alt*ZOOM;box(p.x-4,y-4,8,8,'#e8743c');box(p.x-2,y-2,4,4,'#f7d27a');if(random()<.5)burst(mix(f.x0,f.x,t),mix(f.y0,f.y,t)-alt,'#f0a050',1);}
    }else if(k==='genie'){
      const frame=o.legendState==='emerge'?1:o.legendState==='leave'?5:o.legendState==='cast'?(Math.floor(clock*3)%2?3:4):2;artDraw('genie',frame,s.x,s.y,{altitude:o.altitude,alpha:o.legendState==='leave'?clamp(1-(clock-o.stateAt)/2,0,1):1,flip:o.target&&o.legendState==='cast'?o.target.x>o.x:false});
    }else if(k==='gargoyle'){
      const st=o.legendState,frame=o.defeated?5:st==='lunge'?3:st==='warn'?4:cycleFrame([2,3],8);artDraw('gargoyle',frame,s.x,s.y,{altitude:o.altitude,alpha,flip});
    }else if(k==='thunderbird'){
      const vx=o.motionVx||0;artDraw('thunderbird',Math.abs(vx)>140?(vx<0?6:7):cycleFrame([0,1,2,3,4,5],9),s.x,s.y,{altitude:o.altitude});
    }
  }
  const p=state.p,s=screen(p.x,p.y);
  if(p.legendStoneUntil>clock)artDraw('medusa-props',0,s.x,s.y+2);
  if(p.legendDizzyUntil>clock)for(let i=0;i<3;i++){const a=clock*6+i*TAU/3;box(s.x+Math.cos(a)*10,s.y-34+Math.sin(a)*3,3,3,'#c6a6ef');}
  const orbit=wispsOrbiting();for(let i=0;i<orbit;i++){const a=clock*2.2+i*TAU/orbit;artDraw('wisps',cycleFrame([0,1],4,i),s.x+Math.cos(a)*26*ZOOM,s.y+Math.sin(a)*12*ZOOM,{altitude:16,scale:.45});}
}
function drawLegendStoneChaser(c){if(!(c.legendStoneUntil>clock))return false;const s=screen(c.x,c.y);ctx.save();if('filter' in ctx)ctx.filter='grayscale(1) brightness(.85)';if(c.kind==='bear')drawBear(c,s,false);else drawYeti(c,s,'alert',56);ctx.restore();return true;}

// ---------- lab panel extras ----------
function labCurrentActor(){const e=state.endless?endlessEncounterAt(state.p.y):null;return e?.legendActor||legendActors().find(o=>!o.eaten)||null;}
function initCreatureLabButtons(panel){
  const title=document.createElement('strong');title.textContent='CREATURE LAB';title.style.cssText='width:100%;font:bold 12px monospace;letter-spacing:1px';panel.prepend(title);
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{fn(b);canvas.focus({preventScroll:true});});panel.append(b);return b;};
  add('Yetis: on',b=>{labState.yetis=!labState.yetis;b.textContent='Yetis: '+(labState.yetis?'on':'off');});
  add('+Yeti',()=>labSpawnYeti(labCurrentActor(),1));
  add('+People',()=>{const o=labCurrentActor();if(o)labSpawnPeople(o,state.p.x,state.p.y+450,5);});
}
