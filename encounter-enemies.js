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
      // The skier weaves between actual gates, often far from the section's center line.
      const gates=[];
      if(!e?.town)for(const g of state.objects){
        if(g.type!=='gate'||g.run!==root||g.y<section.startY-500||g.y>endY)continue;
        const old=gates.find(q=>q.y===g.y),base=path?encounterPathX(path,g.y):root.x;
        if(!old)gates.push(g);else if(Math.abs(g.x-base)<Math.abs(old.x-base))gates[gates.indexOf(old)]=g;
      }
      gates.sort((a,b)=>a.y-b.y);
      const routeAt=at=>{
        if(e?.town?.route)return encounterPathX(e.town.route,at);
        let before,after;for(const g of gates){if(g.y<=at)before=g;else {after=g;break;}}
        if(before&&after)return mix(before.x,after.x,(at-before.y)/(after.y-before.y));
        if(before||after)return (before||after).x;
        return path?encounterPathX(path,at):root.x;
      };
      const residents=state.objects.filter(o=>o.type.startsWith('person')&&!o.werewolf&&!o.dead&&!o.eaten&&o.r>0&&!o.job&&!o.cheerRun&&o.y>=from&&o.y<endY&&Math.abs(o.x-routeAt(o.y))>=28&&Math.abs(o.x-routeAt(o.y))<=50&&surpriseAreaAllowed(endlessEncounterAt(o.y)));
      let person=residents.length?pick(residents):null;
      if(!person){
        const x=routeAt(y)+pick([-1,1])*range(32,48);
        if(patchAt(x,y)||nearbyFootprints(x,y,80).some(o=>obstacleClearance(o,x,y)<24))continue;
        person=entity(pick(['personRed','personGreen','personYellow']),x,y,{width:32,r:10,arcadeRun:section,encounter:e});
      }
      Object.assign(person,{werewolf:true,werewolfState:'disguised',werewolfName:pick(WEREWOLF_NAMES),walker:false,roam:0,stroll:null,pauseUntil:Infinity,arcadeRun:person.arcadeRun||section});return;
    }
  };
  spawn('burrower',E.burrower);spawn('werewolf',E.werewolf);
}
function burrowIntercept(o){
  const p=state.p,B=S.endless.encounterEnemies.burrower;
  if(p.air>0||p.fall||p.awaitingInput||p.speed<100)return null;
  // Arrival locks a point one full pause ahead; the mound stays harmless until it pops.
  const lead=B.pauseSeconds;
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
  o.burrowState='rushing';o.rushAt=clock;o.rushTarget=target;o.r=0;o.burrowTrail=[];
  return true;
}
function updateEncounterEnemies(dt){
  if(!state.started)return;
  const p=state.p,E=S.endless.encounterEnemies;
  let active=objectGroups().burrowers.some(o=>!o.dead&&!o.eaten&&['rushing','settled','open'].includes(o.burrowState));
  for(const o of objectGroups().burrowers){
    if(o.dead||o.eaten||!activeCourseOwner(o))continue;
    if(o.burrowState==='waiting'){
      if(!active&&clock>=(state.endless.nextBurrowAt||0)&&surpriseAreaAllowed(endlessEncounterAt(p.y))&&Math.hypot(o.x-p.x,o.y-p.y)<E.burrower.noticeMetres*PX_PER_M&&startBurrow(o)){active=true;state.endless.nextBurrowAt=clock+E.burrower.cooldownSeconds;}
      continue;
    }
    if(o.burrowState==='rushing'){
      const B=E.burrower,target=burrowIntercept(o)||o.rushTarget;o.rushTarget=target;
      const dx=target.x-o.x,dy=target.y-o.y,distance=Math.hypot(dx,dy),speed=topSpeed()*B.speedMultiplier,step=speed*dt;
      o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
      if(distance<=step){
        o.x=target.x;o.y=target.y;o.burrowState='settled';o.settleAt=clock;
        o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
      }else{
        // Fade the wave near arrival so it settles cleanly instead of orbiting the intercept.
        const sway=Math.sin((clock-o.rushAt)*TAU/B.zigzagSeconds)*B.zigzagAngleDegrees*Math.PI/180*clamp(distance/150,0,1);
        const angle=Math.atan2(dy,dx)+sway;o.x+=Math.cos(angle)*step;o.y+=Math.sin(angle)*step;
        o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;o.travelSpeed=speed;o.travelStamp=clock;
        // An evasive skier can make the interception miss; never chase underground indefinitely.
        if(clock-o.rushAt>4){o.burrowState='closing';o.closeAt=clock;}
      }
      if(clock>=(o.nextTrailAt||0)){o.burrowTrail.push({x:o.x,y:o.y,until:clock+.8});if(o.burrowTrail.length>28)o.burrowTrail.shift();o.nextTrailAt=clock+.03;}
      continue;
    }
    if(o.burrowState==='settled'){
      if(clock-o.settleAt>=E.burrower.pauseSeconds){o.burrowState='open';o.openAt=clock;o.r=E.burrower.holeRadius;burst(o.x,o.y,C.ice,10);beep(180,.08,'triangle',.015);resolveEnemyContact(o);if(state.deathTimer)return;}
      continue;
    }
    if(o.burrowState==='open'){
      if(clock-o.openAt>E.burrower.openSeconds){o.burrowState='closing';o.closeAt=clock;o.r=0;continue;}
      resolveEnemyContact(o);if(state.deathTimer)return;
    }else if(o.burrowState==='closing'&&clock-o.closeAt>.28)o.eaten=true;
  }
  for(const o of objectGroups().werewolves){
    if(o.dead||o.eaten||!activeCourseOwner(o)||o.werewolfState==='wolf')continue;
    if(o.werewolfState==='disguised'){
      const W=E.werewolf,m=p.impactMotion?.stamp===clock?p.impactMotion:p;
      const before=o.passProbe||{x:m.x,y:m.y,npcY:o.y},oldY=before.y-before.npcY,newY=p.y-o.y;
      o.passProbe={x:p.x,y:p.y,npcY:o.y};
      if(o.passedAt===undefined&&oldY<=0&&newY>=0&&newY-oldY>1e-6&&p.vy>0){
        const t=clamp(-oldY/(newY-oldY),0,1),crossX=mix(before.x,p.x,t);
        if(Math.abs(crossX-o.x)<=W.passDistanceMetres*PX_PER_M){o.passedAt=clock-dt*(1-t);o.walker=false;o.stroll=null;o.pauseUntil=clock+W.afterPassSeconds+W.transformSeconds;o.walking=false;o.roam=o.vx=o.vy=0;}
      }
      if(o.passedAt===undefined||clock-o.passedAt<W.afterPassSeconds)continue;
      o.werewolfState='transforming';o.transformAt=clock;o.socialUntil=clock+E.werewolf.transformSeconds;o.walking=false;o.roam=o.vx=o.vy=0;o.fearUntil=0;o.threat=null;
      // At most three spoken reactions, but everyone close by enters normal fear behavior.
      let voices=0;for(const n of preyActors())if(n!==o&&(n.type?.startsWith('person')||n.type==='skier'||n.type==='boarder')&&Math.hypot(n.x-o.x,n.y-o.y)<340){if(voices>=3)n.speakAt=Math.max(n.speakAt||0,clock+2.5);else n.speakAt=0;frighten(n,o);voices++;}
      say('Uh... not again.',o,1.2);continue;
    }
    // The emerging wolf bounds after the skier; the reveal is not left behind offscreen.
    const progress=clamp((clock-o.transformAt)/E.werewolf.transformSeconds,0,1);
    if(progress>.2){
      const target=endlessPursuitTarget(o,p),previous={x:o.x,y:o.y},speed=E.werewolf.speedKmh/S.physics.hudKmhPerSpeed*clamp((progress-.2)/.25,0,1);
      travel(o,Math.atan2(target.y-o.y,target.x-o.x),speed,dt,false,false,true,true,target);
      o.gaitDistance=(o.gaitDistance||0)+Math.hypot(o.x-previous.x,o.y-previous.y);if(Math.abs(o.motionVx)>35)o.werewolfFlip=o.motionVx<0;
    }
    if(clock-o.transformAt>=E.werewolf.transformSeconds){
      o.type='wolf';o.werewolfState='wolf';o.width=52;o.r=12;o.animal=true;o.ai='hunt';o.linkedChase=o.wolfAwake=true;o.alertUntil=Infinity;o.wolfSpeedKmh=E.werewolf.speedKmh;o.packId=o.id;o.packIndex=0;o.costume=null;o.job=null;o.walker=false;o.path=null;o.socialUntil=0;o.nextAI=clock;
      o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;delete o.worldChunk;burst(o.x,o.y,'#c3c7ce',8);say('AWOOOO!',o,1.5);
    }
  }
}
function werewolfRevealOffset(){
  if(!state.endless)return 0;
  let offset=0;const Ww=S.endless.encounterEnemies.werewolf,p=state.p;
  for(const o of objectGroups().werewolves){
    if(o.dead||o.eaten||o.passedAt===undefined||Math.abs(o.x-p.x)>W/ZOOM*.7)continue;
    const elapsed=clock-o.passedAt,end=Ww.afterPassSeconds+Ww.transformSeconds+.65;
    if(elapsed<.55||elapsed>end)continue;
    const strength=Math.min(clamp((elapsed-.55)/.3,0,1),clamp((end-elapsed)/.5,0,1));
    const normal=p.y-H*S.render.playerScreenY/ZOOM,look=o.y-H*.18/ZOOM;
    offset=Math.max(offset,clamp(normal-look,0,H*.16/ZOOM)*strength);
  }
  return offset;
}
const encounterArt=new Map();
function encounterTile(key,width,height,paint){
  if(encounterArt.has(key))return encounterArt.get(key);
  const tile=document.createElement('canvas');tile.width=width;tile.height=height;const c=tile.getContext('2d');
  paint(c,(x,y,w,h,color)=>{c.fillStyle=gritMaterial(color);c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));});
  if(encounterArt.size>=24)encounterArt.delete(encounterArt.keys().next().value);encounterArt.set(key,tile);return tile;
}
let werewolfRig;
const werewolfFrames=new Map(),werewolfMorphs=new Map();
function werewolfTile(frame=-1,feeding=false){
  const key=frame+':'+feeding;if(werewolfFrames.has(key))return werewolfFrames.get(key);
  if(!werewolfRig){
    const cacheKey='werewolfIdle:32';if(!spriteCache.has(cacheKey))sprite('werewolfIdle',-10000,-10000,32,{ui:true});
    const source=spriteCache.get(cacheKey),pixels=source.getContext('2d').getImageData(0,0,32,40);
    const parts=Array.from({length:5},()=>{const c=document.createElement('canvas');c.width=32;c.height=40;return c;});
    const data=parts.map(c=>c.getContext('2d').createImageData(32,40));
    const left=[13,13,13,13,13,12,11,10,9,9,9,9,10,11,12,12,11,10,9,8,7];
    const right=[25,25,25,26,26,27,28,29,28,28,28,29,28,29];
    for(let y=0;y<40;y++)for(let x=0;x<32;x++){
      const armLeft=y>=8&&y<=28&&x<=left[y-8]&&(y<22||x>=6),armRight=y>=15&&y<=28&&x>=right[y-15];
      const part=armLeft?1:armRight?2:y>=26&&x>=8?(x<19?3:4):0,i=(y*32+x)*4;
      data[part].data.set(pixels.data.subarray(i,i+4),i);
    }
    parts.forEach((c,i)=>c.getContext('2d').putImageData(data[i],0,0));werewolfRig={source,parts};
  }
  const tile=document.createElement('canvas');tile.width=40;tile.height=44;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const phase=Math.max(0,frame)/12*TAU;
  const limb=(part,start,offset,leg=false)=>{
    const a=phase+offset,swing=frame<0||feeding?0:Math.sin(a),lift=leg&&frame>=0&&!feeding?Math.max(0,Math.cos(a))*2:0;
    for(let y=start;y<40;y++){
      const u=clamp((y-start)/(leg?14:19),0,1),dx=Math.round(swing*(leg?2.7:2.2)*u),up=Math.round(lift*Math.sin(u*Math.PI/2));
      t.drawImage(werewolfRig.parts[part],0,y,32,1,4+dx,1+y-up-(feeding&&!leg?2:0),32,1);
    }
  };
  if(frame<0&&!feeding)t.drawImage(werewolfRig.source,4,1);
  else {limb(2,15,0);limb(4,26,Math.PI,true);limb(3,26,0,true);t.drawImage(werewolfRig.parts[0],4,1);limb(1,8,Math.PI);}
  if(feeding&&frame%2)t.drawImage(werewolfRig.source,19,13,10,4,23,15,10,4);
  if(werewolfFrames.size>=24)werewolfFrames.delete(werewolfFrames.keys().next().value);werewolfFrames.set(key,tile);return tile;
}
function werewolfTransformTile(o,progress){
  const frame=Math.min(9,Math.floor(progress*10)),gait=Math.floor((o.gaitDistance||0)/130*12)%12,key=(o.costume||o.type)+':'+frame+':'+gait;
  if(werewolfMorphs.has(key))return werewolfMorphs.get(key);
  const wolf=werewolfTile(progress>.55?gait:-1),tile=document.createElement('canvas');tile.width=40;tile.height=44;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  if(o.costume){const f=festivalGuestFrame(o.costume,0,0);t.drawImage(festivalGuestAtlas,f.x,f.y,32,44,9,11,22,30);}
  else {const name=o.type,cacheKey=name+':22:guest';if(!spriteCache.has(cacheKey))sprite(name,-10000,-10000,22,{ui:true,guest:true});const human=spriteCache.get(cacheKey);t.drawImage(human,9,41-human.height);}
  // Solid pixel replacement grows ears/muzzle first, then fur/limbs; no ghostly cross-fade.
  const base=t.getImageData(0,0,40,44),fur=wolf.getContext('2d').getImageData(0,0,40,44),grow=clamp((progress-.12)/.88,0,1);
  for(let y=0;y<44;y++)for(let x=0;x<40;x++){
    const zone=y<18?.04:y<30?.22:.4,threshold=zone+((x*7+y*11)%16)/16*.58,i=(y*40+x)*4;
    if(grow>=threshold)base.data.set(fur.data.subarray(i,i+4),i);
  }
  t.putImageData(base,0,0);if(werewolfMorphs.size>=64)werewolfMorphs.delete(werewolfMorphs.keys().next().value);werewolfMorphs.set(key,tile);return tile;
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
    const trail=o.burrowTrail||[];
    for(let i=1;i<trail.length;i++)if(trail[i-1].until>clock){const a=screen(trail[i-1].x,trail[i-1].y),b=screen(trail[i].x,trail[i].y);ctx.save();ctx.globalAlpha=clamp((trail[i-1].until-clock)/.8,0,.6);line(a.x,a.y,b.x,b.y,'#a7bdcb',4);line(a.x,a.y-2,b.x,b.y-2,'#eef4ed',2);ctx.restore();}
    if(o.burrowState==='rushing'||o.burrowState==='settled'){
      shadow(s.x,s.y,16,3);box(s.x-11,s.y-5,22,5,'#8ea9bc');box(s.x-8,s.y-8,15,5,'#f9faf1');box(s.x+9,s.y-3,4,2,'#8da6b7');
      if(o.burrowState==='settled'){const t=clamp((clock-o.settleAt)/S.endless.encounterEnemies.burrower.pauseSeconds,0,1);line(s.x-5,s.y-5,s.x-2,s.y-2,'#627e94',1);if(t>.45)line(s.x-2,s.y-2,s.x+4,s.y-4,'#627e94',1);}
      return true;
    }
    const tile=burrowerTile(o.burrowState==='open'||feeding,feeding?Math.floor(clock*10)%2:0),width=o.width*ZOOM;
    ctx.save();if(o.dead||o.burrowState==='closing')ctx.globalAlpha=clamp(o.dead?(o.fadeUntil-clock)/S.wildlife.predatorFadeSeconds:1-(clock-o.closeAt)/.28,0,1);const pop=o.burrowState==='open'?clamp((clock-o.openAt)/.14,0,1):1;ctx.drawImage(tile,Math.round(s.x-width/2),Math.round(s.y-width*tile.height/tile.width/2+(1-pop)*4),width,width*tile.height/tile.width);ctx.restore();return true;
  }
  if(!o.werewolf||o.werewolfState==='disguised')return false;
  const transforming=o.werewolfState==='transforming',progress=transforming?clamp((clock-o.transformAt)/S.endless.encounterEnemies.werewolf.transformSeconds,0,1):1;
  const frame=feeding?Math.floor(clock*10)%2:(o.travelSpeed||0)>1?Math.floor((o.gaitDistance||0)/130*12)%12:-1;
  const tile=transforming?werewolfTransformTile(o,progress):werewolfTile(frame,feeding),scale=(o.width&&o.width>40?o.width:52)*ZOOM/32,width=tile.width*scale,height=tile.height*scale;
  ctx.save();if(o.dead){ctx.globalAlpha=clamp((o.fadeUntil-clock)/S.wildlife.wolfFadeSeconds,0,1);ctx.translate(s.x,s.y);ctx.rotate(Math.PI/2);ctx.drawImage(tile,-width/2,-41*scale,width,height);}else {const flip=o.werewolfFlip??false;ctx.translate(Math.round(s.x),Math.round(s.y));ctx.scale(flip?-1:1,1);shadow(0,0,18,3);ctx.drawImage(tile,Math.round(-width/2),Math.round(-41*scale),width,height);}ctx.restore();return true;
}
