/* Sparse course encounters. Native pixel tiles stay bounded; no extra actor-wide AI scans. */
const WEREWOLF_NAMES=['Jim','Nora','Oscar','Mia','Hugo','Elsie'];
function surpriseAreaAllowed(e){return !e||!e.noNewPredators&&!['quiet','lake','beginner'].includes(e.kind);}
function spawnEncounterEnemies(section,endY){
  const root=section.endlessRoot,E=S.endless.encounterEnemies;
  const spawn=(kind,C)=>{
    const from=Math.max(section.startY,root.startY+C.firstMetres*PX_PER_M);
    if(endY-from<180||random()>=C.chancePerSection)return;
    for(let attempt=0;attempt<8;attempt++){
      const y=range(from+60,endY-100),e=endlessEncounterAt(y);if(!surpriseAreaAllowed(e))continue;
      const path=e?.paths?.length?pick(e.paths):null,center=path?encounterPathX(path,y):root.x;
      const near=o=>(kind==='burrower'?o.type==='burrower':o.werewolf)&&!o.dead&&!o.eaten&&Math.hypot(o.x-center,o.y-y)<180*PX_PER_M;
      if(state.objects.filter(near).length>=C.maxNearby)return;
      if(kind==='burrower'){
        entity('burrower',center,y,{r:0,width:42,arcadeRun:section,encounter:e,burrowState:'waiting'});return;
      }
      const residents=state.objects.filter(o=>o.type.startsWith('person')&&!o.werewolf&&!o.dead&&!o.eaten&&o.r>0&&!o.job&&!o.cheerRun&&o.y>=from&&o.y<endY&&Math.abs(o.x-center)<350&&surpriseAreaAllowed(endlessEncounterAt(o.y)));
      let person=residents.length?pick(residents):null;
      if(!person){
        const x=center+pick([-1,1])*range(55,130);
        if(patchAt(x,y)||state.objects.some(o=>o.r>0&&!o.eaten&&!o.dead&&obstacleClearance(o,x,y)<30))continue;
        person=entity(pick(['personRed','personGreen','personYellow']),x,y,{width:32,r:10,arcadeRun:section,encounter:e});
      }
      Object.assign(person,{werewolf:true,werewolfState:'disguised',werewolfName:pick(WEREWOLF_NAMES),arcadeRun:person.arcadeRun||section});return;
    }
  };
  spawn('burrower',E.burrower);spawn('werewolf',E.werewolf);
}
function burrowIntercept(o){
  const p=state.p,B=S.endless.encounterEnemies.burrower;
  if(p.air>0||p.fall||p.awaitingInput||p.speed<100)return null;
  // Account for the skier's leading edge, so first contact leaves the full reaction window.
  const contactSpeed=Math.hypot(p.vx,p.vy*S.physics.collisionYScale)||1,lead=B.reactionSeconds+(B.holeRadius+S.physics.playerRadius)/contactSpeed;
  const point={x:p.x+p.vx*lead,y:p.y+p.vy*lead},bounds=viewBounds();
  // A warning below the viewport is not a fair warning, especially at fast ice exits.
  if(point.x<bounds.left+50||point.x>bounds.right-50||point.y<bounds.top+150||point.y>bounds.bottom-70||patchAt(point.x,point.y))return null;
  const near=nearbyFootprints(point.x,point.y,120);
  if(near.some(h=>obstacleClearance(h,point.x,point.y)<B.holeRadius+18))return null;
  const speed=Math.hypot(p.vx,p.vy)||1,nx=p.vy/speed,ny=-p.vx/speed;
  if(![-1,1].some(side=>!near.some(h=>obstacleClearance(h,point.x+nx*side*65,point.y+ny*side*65)<20)))return null;
  return point;
}
function nearbyFootprints(x,y,pad){
  // The shared solid grid already includes extended house/tree/fence footprints.
  const cell=160,grid=cachedSolidGrid(skierSolids,NPC_STATIC_SOLIDS,cell).grid,found=new Set();
  for(let ix=Math.floor((x-pad)/cell);ix<=Math.floor((x+pad)/cell);ix++)for(let iy=Math.floor((y-pad)/cell);iy<=Math.floor((y+pad)/cell);iy++)for(const o of grid.get(ix)?.get(iy)||[])if(!o.eaten&&!o.dead)found.add(o);
  return [...found];
}
function startBurrow(o){
  const target=burrowIntercept(o);if(!target)return false;
  const b=viewBounds(),side=pick([-1,1]);o.x=side<0?b.left-90:b.right+90;o.y=target.y-50;
  o.burrowState='rushing';o.rushFrom={x:o.x,y:o.y};o.rushAt=clock;o.rushTarget=target;o.r=0;o.burrowTrail=[];
  return true;
}
function updateEncounterEnemies(dt){
  if(!state.started)return;
  const p=state.p,E=S.endless.encounterEnemies;
  let active=objectGroups().burrowers.some(o=>!o.dead&&!o.eaten&&['rushing','open'].includes(o.burrowState));
  for(const o of objectGroups().burrowers){
    if(o.dead||o.eaten||!activeCourseOwner(o))continue;
    if(o.burrowState==='waiting'){
      if(!active&&clock>=(state.endless.nextBurrowAt||0)&&surpriseAreaAllowed(endlessEncounterAt(p.y))&&Math.hypot(o.x-p.x,o.y-p.y)<E.burrower.noticeMetres*PX_PER_M&&startBurrow(o)){active=true;state.endless.nextBurrowAt=clock+E.burrower.cooldownSeconds;}
      continue;
    }
    if(o.burrowState==='rushing'){
      const target=burrowIntercept(o);if(!target){o.eaten=true;continue;}
      o.rushTarget=target;const t=clamp((clock-o.rushAt)/E.burrower.rushSeconds,0,1);
      o.x=mix(o.rushFrom.x,target.x,t);o.y=mix(o.rushFrom.y,target.y,t)+Math.sin(t*Math.PI)*25;
      if(clock>=(o.nextTrailAt||0)){o.burrowTrail.push({x:o.x,y:o.y,until:clock+.42});if(o.burrowTrail.length>9)o.burrowTrail.shift();o.nextTrailAt=clock+.025;}
      if(t>=1){o.x=target.x;o.y=target.y;o.burrowState='open';o.openAt=clock;o.r=E.burrower.holeRadius;o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;burst(o.x,o.y,C.ice,7);beep(180,.08,'triangle',.015);}
      // It cannot collide on the tick it appears; the prior motion was not a player approach.
      continue;
    }
    if(o.burrowState==='open'){
      if(clock-o.openAt>E.burrower.reactionSeconds+.65){o.burrowState='closing';o.closeAt=clock;o.r=0;continue;}
      resolveEnemyContact(o);if(state.deathTimer)return;
    }else if(o.burrowState==='closing'&&clock-o.closeAt>.28)o.eaten=true;
  }
  for(const o of objectGroups().werewolves){
    if(o.dead||o.eaten||!activeCourseOwner(o)||o.werewolfState==='wolf')continue;
    if(o.werewolfState==='disguised'){
      const range=Math.max(E.werewolf.noticeMetres*PX_PER_M,p.speed*(E.werewolf.transformSeconds+1));
      if(p.air>0||Math.hypot(o.x-p.x,o.y-p.y)>range||!surpriseAreaAllowed(endlessEncounterAt(p.y)))continue;
      o.werewolfState='transforming';o.transformAt=clock;o.socialUntil=clock+E.werewolf.transformSeconds;o.walking=false;o.roam=o.vx=o.vy=0;o.fearUntil=0;o.threat=null;
      // At most three spoken reactions, but everyone close by enters normal fear behavior.
      let voices=0;for(const n of preyActors())if(n!==o&&(n.type?.startsWith('person')||n.type==='skier'||n.type==='boarder')&&Math.hypot(n.x-o.x,n.y-o.y)<340){if(voices>=3)n.speakAt=Math.max(n.speakAt||0,clock+2.5);else n.speakAt=0;frighten(n,o);voices++;}
      say('Uh... not again.',o,1.2);continue;
    }
    if(clock-o.transformAt>=E.werewolf.transformSeconds){
      o.type='wolf';o.werewolfState='wolf';o.width=48;o.r=12;o.animal=true;o.ai='hunt';o.linkedChase=o.wolfAwake=true;o.alertUntil=Infinity;o.wolfSpeedKmh=E.werewolf.speedKmh;o.packId=o.id;o.packIndex=0;o.costume=null;o.job=null;o.walker=false;o.path=null;o.socialUntil=0;o.nextAI=clock;
      o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;delete o.worldChunk;burst(o.x,o.y,'#c3c7ce',8);say('AWOOOO!',o,1.5);
    }
  }
}
const encounterArt=new Map();
function encounterTile(key,width,height,paint){
  if(encounterArt.has(key))return encounterArt.get(key);
  const tile=document.createElement('canvas');tile.width=width;tile.height=height;const c=tile.getContext('2d');
  paint(c,(x,y,w,h,color)=>{c.fillStyle=gritMaterial(color);c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));});
  if(encounterArt.size>=24)encounterArt.delete(encounterArt.keys().next().value);encounterArt.set(key,tile);return tile;
}
function werewolfTile(frame=0,feeding=false){
  return encounterTile('werewolf:'+frame+':'+feeding,30,38,(paint,px)=>{
    const ink='#28343f',fur='#687480',light='#b5bec0',coat='#685263',stride=feeding?0:Math.sin(frame*Math.PI/4)*3;
    // Hunched fur shoulders, pointed ears/muzzle and separate digitigrade feet.
    px(6,16,20,6,ink);px(9,21,13,9,ink);px(7,17,17,4,fur);px(10,21,11,7,fur);px(12,19,7,6,light);px(13,24,5,2,light);
    px(3,28,5,3,ink);px(2,26,3,3,fur); // a little swept tail
    for(const side of [-1,1]){
      const x=side<0?10:19,leg=side*stride-(feeding?0:Math.max(0,Math.cos(frame*Math.PI/4+(side<0?0:Math.PI)))*2);
      px(x,26,4,6+leg,ink);px(x+1,26,2,5+leg,fur);px(x+(side>0?0:-2),31+leg,6,3,ink);px(x+(side>0?0:-2),31+leg,4,1,fur);
      const arm=feeding?side:Math.round(-side*stride*.5),ax=side<0?4:24;px(ax,18+arm,4,6,ink);px(ax+(side<0?-1:0),23+arm,4,5,fur);px(ax+(side<0?-2:0),27+arm,5,2,ink);px(ax+(side<0?-2:0),28+arm,1,2,light);px(ax+(side<0?0:2),28+arm,1,2,light);
    }
    px(10,1,2,3,ink);px(9,3,4,5,ink);px(8,6,6,5,ink);px(10,4,2,4,coat);
    px(21,0,2,3,ink);px(20,2,4,5,ink);px(19,5,6,6,ink);px(21,3,2,5,coat);
    px(9,8,15,10,ink);px(10,8,13,9,fur);px(8,13,3,6,fur);px(10,17,3,3,fur);px(12,13,10,5,light);
    px(11,10,4,1,ink);px(19,10,4,1,ink);px(12,11,2,2,'#ebc76c');px(20,11,2,2,'#ebc76c');
    px(18,13,10,5,ink);px(18,13,8,2,light);px(26,12,3,3,ink);px(19,16,7,feeding&&frame%2?3:1,'#714957');px(20,16,1,2,'#f2ead5');px(24,16,1,2,'#f2ead5');
    px(10,21,3,4,coat);px(19,23,4,3,coat); // torn scraps of the villager's clothes
  });
}
function burrowerTile(open=true,chew=0){
  return encounterTile('burrow-mouth:'+open+':'+chew,36,22,(paint,px)=>{
    px(2,9,32,10,'#b2c5d1');px(0,10,36,6,'#e6eeeb');px(3,6,30,10,'#f7f7ed');px(6,5,24,12,'#69778c');px(8,7,20,9,'#273347');
    if(open){px(11,8,14,8+chew,'#604753');for(let x=8;x<29;x+=5){px(x,7,2,4,'#f1e7cb');px(x+1,14+chew,2,3,'#f1e7cb');}px(8,2,5,5,'#65768c');px(23,2,5,5,'#65768c');px(9,3,3,2,'#ecc86d');px(24,3,3,2,'#ecc86d');}
    else {px(7,9,22,3,'#d0dfe0');px(4,14,28,4,'#eff4eb');}
    px(3,17,6,2,'#f7faf1');px(26,18,6,2,'#f7faf1');
  });
}
function drawEncounterEnemy(o,s,feeding=false){
  if(o.type==='burrower'){
    if(o.burrowState==='waiting')return true;
    for(const t of o.burrowTrail||[])if(t.until>clock){const q=screen(t.x,t.y);ctx.save();ctx.globalAlpha=clamp((t.until-clock)/.42,0,.55);box(q.x-7,q.y-2,14,4,'#9bafbf');box(q.x-5,q.y-4,10,3,'#eef4ee');ctx.restore();}
    if(o.burrowState==='rushing'){shadow(s.x,s.y,16,3);box(s.x-11,s.y-5,22,5,'#b8ccd6');box(s.x-8,s.y-8,15,5,'#f9faf1');box(s.x+9,s.y-3,4,2,'#8da6b7');return true;}
    const tile=burrowerTile(o.burrowState==='open'||feeding,feeding?Math.floor(clock*10)%2:0),width=o.width*ZOOM;
    ctx.save();if(o.dead||o.burrowState==='closing')ctx.globalAlpha=clamp(o.dead?(o.fadeUntil-clock)/S.wildlife.predatorFadeSeconds:1-(clock-o.closeAt)/.28,0,1);ctx.drawImage(tile,Math.round(s.x-width/2),Math.round(s.y-width*tile.height/tile.width/2),width,width*tile.height/tile.width);ctx.restore();return true;
  }
  if(!o.werewolf||o.werewolfState==='disguised')return false;
  if(o.werewolfState==='transforming'){
    const t=clamp((clock-o.transformAt)/S.endless.encounterEnemies.werewolf.transformSeconds,0,1);o.costume?drawFestivalGuest(o,s):sprite(o.type,s.x,s.y,32,{guest:true});
    const tile=werewolfTile();ctx.save();ctx.globalAlpha=t;ctx.drawImage(tile,Math.round(s.x-12),Math.round(s.y-33),25,34);ctx.restore();
    for(const side of [-1,1])box(s.x+side*(11+t*4),s.y-10,2,4,'#c7cdd0');return true;
  }
  const frame=feeding?Math.floor(clock*10)%2:(o.travelSpeed||0)>1?Math.floor((o.gaitDistance||0)/10)%8:0,tile=werewolfTile(frame,feeding),width=(o.width||48)*ZOOM,height=width*tile.height/tile.width;
  ctx.save();if(o.dead){ctx.globalAlpha=clamp((o.fadeUntil-clock)/S.wildlife.wolfFadeSeconds,0,1);ctx.translate(s.x,s.y);ctx.rotate(Math.PI/2);ctx.drawImage(tile,-width/2,-height,width,height);}else {const flip=o.werewolfFlip??false;ctx.translate(Math.round(s.x),Math.round(s.y));ctx.scale(flip?-1:1,1);shadow(0,0,18,3);ctx.drawImage(tile,Math.round(-width/2),Math.round(-height),width,height);}ctx.restore();return true;
}
const encounterCardCache=new Map();
function encounterDeathCard(key,night){
  if(!['death-burrower','death-werewolf'].includes(key))return null;
  const cacheKey=key+night;if(encounterCardCache.has(cacheKey))return encounterCardCache.get(cacheKey);
  const tile=document.createElement('canvas');tile.width=320;tile.height=200;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
  const px=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  px(0,0,320,200,night?'#25364d':'#b9d7de');px(0,108,320,92,night?'#abbfcf':'#f0f1e4');
  for(let i=0;i<5;i++){const x=i*81-20;px(x,71,70,46,night?'#405971':'#8daeb9');px(x+10,52,50,25,night?'#405971':'#8daeb9');px(x+23,43,25,15,'#e1e8df');}
  px(262,18,18,18,night?'#f2dfaf':'#fff0c2');
  for(const [x,y] of [[18,94],[255,89]]){px(x,y,48,43,'#866a66');px(x-6,y-10,60,13,'#e9e9df');px(x+5,y+10,12,14,'#f2cd88');px(x+29,y+10,12,14,'#f2cd88');px(x+21,y+27,11,16,'#604f57');}
  for(let i=0;i<23;i++)px((i*97)%320,140+(i*31)%58,3,1,night?'#d1dbe0':'#cad8d7');
  if(key==='death-werewolf'){c.drawImage(werewolfTile(0,true),126,53,75,95);px(168,91,8,8,'#c06460');px(170,88,13,5,'#bd5658');}
  else c.drawImage(burrowerTile(true,1),105,112,108,66);
  const bx=key==='death-werewolf'?179:153,by=key==='death-werewolf'?94:148;
  for(const side of [-1,1]){px(bx+side*7,by,5,17,'#3d566d');px(bx+side*7-2,by+15,10,5,'#273947');}
  px(85,168,81,3,'#9c6c59');px(181,176,69,3,'#9c6c59');px(206,138,13,10,'#b85158');px(203,147,20,3,'#d58a80');
  // A mitten waved like a little surrender flag: playful, never gruesome.
  px(98,131,3,23,'#ad9870');px(101,129,14,10,'#e6c674');px(103,128,3,13,'#d5aa5c');
  encounterCardCache.set(cacheKey,tile);return tile;
}
