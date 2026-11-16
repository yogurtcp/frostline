/* Physical animal encounters and close passes. No input interception or player steering. */
const BONUS_RABBITS=objectView(o=>o.type==='rabbit');
function pathLength(points){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return n;}
function routeProjection(points,x,y){
  let best={distance:Infinity,along:0},along=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(len*len||1),0,1),distance=Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
    if(distance<best.distance)best={distance,along:along+len*t};along+=len;
  }return best;
}
function planShortcutCat(town){
  if(!town.backRoute||town.festival)return;
  const C=S.wildlife.catGuide,solids=state.objects.filter(o=>o.town===town&&o.r>0&&(NPC_STATIC_SOLIDS.has(o.type)||PED_SOLIDS.has(o.type)||TREE_TYPES.has(o.type))),pad=S.physics.playerRadius+C.pathPadding;
  const cells=new Map(),cell=160;
  for(const o of solids){const b=solidBounds(o);for(let x=Math.floor((b[0]-pad)/cell);x<=Math.floor((b[2]+pad)/cell);x++)for(let y=Math.floor((b[1]-pad)/cell);y<=Math.floor((b[3]+pad)/cell);y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(o);}}
  const clear=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/10));for(let i=0;i<=steps;i++){const x=mix(a.x,b.x,i/steps),y=mix(a.y,b.y,i/steps),near=cells.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[];if(near.some(o=>obstacleClearance(o,x,y)<pad))return false;}return true;};
  const simplify=points=>{const out=[points[0]];let i=0;while(i<points.length-1){let next=i+1;for(let j=points.length-1;j>i;j--)if(clear(points[i],points[j])){next=j;break;}if(!clear(points[i],points[next]))return null;out.push(points[next]);i=next;}return out;};
  const back=town.backRoute.points,entry=back[0],exit=back.at(-1),main=[entry,...town.route.filter(p=>p.y>entry.y&&p.y<exit.y),exit];
  const candidates=[simplify(back),simplify(main)].filter(p=>p&&p.length>1),route=candidates.sort((a,b)=>pathLength(a)-pathLength(b))[0];
  if(!route)return;
  const cats=state.objects.filter(o=>o.town===town&&o.type==='cat');if(!cats.length)return;
  const cat=cats[0],start=route[0],offset=town.mainRoadWidth/2+22;
  const spots=[{x:start.x+offset,y:start.y+30},{x:start.x-offset,y:start.y+30},start];
  const spot=spots.find(p=>clear(p,route[1]));if(!spot)return;
  Object.assign(cat,{x:spot.x,y:spot.y,homeX:spot.x,homeY:spot.y,catGuide:true,guideState:'waiting',guidePoints:[spot,...route.slice(1)],guideIndex:1,guideAlong:0,guideTracks:[],ai:'idle',nextAI:Infinity});
  town.catGuide=cat;town.catRoute=route;
}
function updateShortcutCat(o,dt){
  const p=state.p,G=S.wildlife.catGuide;
  o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
  if(o.guideState==='waiting'){
    if(!state.started||p.air>0||p.fall||p.awaitingInput||p.y>o.y+G.noticeRadius||Math.hypot(p.x-o.x,p.y-o.y)>G.noticeRadius)return;
    o.guideState='leading';say('MEOW! FOLLOW ME!',o,2.2);announce('FOLLOW THE CAT','A narrow snow route through the houses.',C.gold,2);
  }
  if(o.guideState!=='leading')return;
  const points=o.guidePoints,projection=routeProjection(points,p.x,p.y);
  if(p.y>points.at(-1).y+150){o.guideState='done';return;}
  if(p.fall||p.awaitingInput||projection.distance>G.followDistance||o.guideAlong>projection.along+G.leadDistance)return;
  let budget=Math.min(S.physics.freePace*S.physics.speedMultiplier*1.5,Math.max(100,p.speed*1.12+40))*dt;
  while(budget>0&&o.guideIndex<points.length){
    const goal=points[o.guideIndex],d=Math.hypot(goal.x-o.x,goal.y-o.y);
    if(d<3){o.guideIndex++;continue;}
    const distance=Math.min(budget,d),before={x:o.x,y:o.y};
    travel(o,Math.atan2(goal.y-o.y,goal.x-o.x),distance/dt,dt,false,false,true,false,goal,false,false,true);
    const moved=Math.hypot(o.x-before.x,o.y-before.y);o.guideAlong+=moved;budget-=distance;
    if(Math.abs(o.x-before.x)>1)o.catFacing=o.x<before.x;
    const last=o.guideTracks.at(-1);if(moved&&(!last||Math.hypot(last.x-o.x,last.y-o.y)>20))o.guideTracks.push({x:o.x,y:o.y,until:clock+8});
    if(o.guideTracks.length>48)o.guideTracks.shift();if(moved<distance*.8)break;
  }
  if(o.guideIndex>=points.length){o.guideState='done';say('Mrrp!',o,1.5);}
}
function setupBonusRabbit(o,row){
  if(row%S.wildlife.bonusRabbit.everyRabbits!==1)return;
  o.bonusRabbit=true;o.bonusKind=((o.encounter?.id||0)+Math.floor(row/S.wildlife.bonusRabbit.everyRabbits))%2?'sword':'shield';o.bonusState='waiting';o.bonusOriginY=o.y;
}
function awardRabbitBonus(o){
  const a=state.endless||state.arcade,p=state.p;if(!o.bonusRabbit||o.eaten||o.dead||p.air>0||p.fall||p.awaitingInput||!a)return false;
  const kind=o.bonusKind,stock=kind+'s',cap=kind==='sword'?S.arcade.gear.maxSwords:S.arcade.gear.maxShields;
  o.bonusRabbit=false;o.bonusCollected=true;o.bonusState='collected';o.ai='idle';o.nextAI=clock+1;
  if(a[stock]<cap){a[stock]++;a.gearFlash={kind,until:clock+.6};say(kind.toUpperCase()+' FOUND!',p,1.6);}
  else {if(state.course)state.course.points+=S.wildlife.bonusRabbit.fullStockPoints;say('BONUS POINTS!',p,1.4);}
  burst(o.x,o.y,kind==='sword'?S.arcade.gear.swordColor:S.arcade.gear.shieldColor,10);beep(820,.1);return true;
}
function updateBonusRabbit(o,dt){
  const p=state.p,R=S.wildlife.bonusRabbit,e=o.encounter;
  if(o.bonusState==='waiting'){
    o.running=false;o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;
    if(!state.started||p.y>o.y+80||Math.hypot(o.x-p.x,o.y-p.y)>R.noticeRadius)return;
    o.bonusState='running';o.bonusUntil=clock+R.chaseSeconds;say('A shiny parcel!',p,1.5);
  }
  if(p.y>o.y+250||clock>o.bonusUntil){o.bonusRabbit=false;o.ai='idle';o.nextAI=clock+1;return;}
  const y=o.y+120,path=e?.paths?.[0],center=path?encounterPathX(path,clamp(y,e.startY,e.endY)):o.homeX;
  const width=Math.min(R.weaveWidth,e?.half?e.half*.65:R.weaveWidth),x=center+Math.sin((o.y-o.bonusOriginY)/R.weaveLength)*width;
  const before={x:o.x,y:o.y},speed=topSpeed()*R.speedRatio;
  travel(o,Math.atan2(y-o.y,x-o.x),speed,dt,false,false,true,false,{x,y},false,false,true);
  o.running=Math.hypot(o.x-before.x,o.y-before.y)>.1;o.angle=Math.atan2(o.y-before.y,o.x-before.x);
}
function sweptRelativePass(o,previous){
  const p=state.p,moving=o.motionFromStamp===clock,ox=moving?o.motionFromX:o.x,oy=moving?o.motionFromY:o.y,ys=S.physics.collisionYScale;
  const ax=previous.x-ox,ay=(previous.y-oy)*ys,bx=p.x-o.x,by=(p.y-o.y)*ys,dx=bx-ax,dy=by-ay,t=clamp(-(ax*dx+ay*dy)/(dx*dx+dy*dy||1),0,1);
  return {distance:Math.hypot(ax+dx*t,ay+dy*t),passed:ay<0&&by>=0};
}
function updateClosePasses(previous){
  const p=state.p,K=S.skiers.closePass,downhill=Math.max(0,Math.cos(p.heading));
  if(p.fall||p.awaitingInput||p.air>0||p.mode!=='slide'&&!p.onIce||downhill<K.minimumDownhill)return;
  const cap=topSpeed()*(S.physics.acrossSpeedFraction+S.physics.downhillSpeedFraction*downhill*downhill);
  if(p.speed<cap*K.speedFraction||p.speed*S.physics.hudKmhPerSpeed<K.minimumKmh)return;
  for(const o of objectGroups().skiers){
    if(o.foxDecoy||o.fast||o.rival||o.santaSleigh||o.sleighRoot||o.dead||o.eaten||o.npcFallUntil>clock||o.nearPassUntil>clock||Math.abs(o.y-p.y)>250)continue;
    const relative=Math.hypot(p.vx-(o.motionVx??o.vx??0),p.vy-(o.motionVy??o.vy??0))*S.physics.hudKmhPerSpeed;
    if(relative<K.relativeKmh)continue;
    const pass=sweptRelativePass(o,previous),touch=S.physics.playerRadius+o.r;
    if(!pass.passed||pass.distance<=touch||pass.distance>touch+K.edgeGap)continue;
    crashSkier(o,null);o.nearPassUntil=clock+8;o.npcCrashSide=Math.sign(o.x-p.x)||1;say('WHOA!',o,1.3);
  }
}
function updateAnimalPickups(previous){
  if(state.p.air>0||state.p.fall||state.p.awaitingInput)return;
  for(const o of viewItems(BONUS_RABBITS))if(o.bonusRabbit&&!o.dead&&!o.eaten&&Math.abs(o.y-state.p.y)<300&&sweptRelativePass(o,previous).distance<S.physics.playerRadius+o.r+S.wildlife.bonusRabbit.grabPadding)awardRabbitBonus(o);
}
function drawAnimalTracks(){
  for(const o of viewItems(CAT_VIEW))if(o.catGuide){o.guideTracks=o.guideTracks.filter(t=>t.until>clock);for(const t of o.guideTracks){const s=screen(t.x,t.y);if(s.x<0||s.x>W||s.y<0||s.y>H)continue;box(s.x-3,s.y-1,2,2,'#899793');box(s.x+1,s.y+2,2,2,'#899793');}}
}
function drawAnimalMarker(o,s){
  if(o.catGuide&&o.guideState!=='done'){const y=s.y-o.width*ZOOM-8;box(s.x-1,y,3,6,C.gold);box(s.x-4,y+3,3,2,C.gold);box(s.x+2,y+3,3,2,C.gold);}
  if(o.bonusRabbit){
    const y=s.y-o.width*ZOOM-7-Math.sin(clock*2)*1.5;
    box(s.x-4,y-3,8,7,'#c69b61');box(s.x-1,y-3,2,7,o.bonusKind==='sword'?S.arcade.gear.swordColor:S.arcade.gear.shieldColor);box(s.x-4,y,8,1,'#f4deb0');
    gearIcon(o.bonusKind,s.x,y-9,1);
    box(s.x+7,y-5,1,5,'#f3d999');box(s.x+5,y-3,5,1,'#f3d999');
  }
}
