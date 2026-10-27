/* Authored Arcade areas. build.py embeds this inside the game closure. */
const SPECIAL_KINDS=new Set(['rivalRace']);
const specialArt=new Map();
const RIVAL_PROFILES=[
  {name:'NINA',color:'#3d8eaa',offset:0,lane:-1,style:'smooth'},
  {name:'BO',color:'#dbaf50',offset:-.025,lane:1,style:'wide'},
  {name:'MAX',color:'#b95765',offset:.03,lane:0,style:'pushy'},
  {name:'LIV',color:'#7466a3',offset:.05,lane:-1,style:'smooth'},
  {name:'IZZY',color:'#589476',offset:-.01,lane:1,style:'weave'},
  {name:'OZ',color:'#a45d91',offset:.015,lane:-1,style:'wide'},
  {name:'BEN',color:'#c38748',offset:-.035,lane:1,style:'smooth'},
  {name:'TAO',color:'#54818e',offset:.04,lane:0,style:'pushy'}
];
function planSpecialArea(e,section){
  const A=S.endless.regions.specialAreas,scale=e.scale,length=e.endY-e.startY,root=section.endlessRoot;
  e.specialArea=true;e.centerX=root.x;e.band=A.widthScreens*W/ZOOM/2;e.noNewPredators=!A.rivalRace.predators;e.noFlags=false;
  e.entryHalf=320*scale;e.half=240*scale;
  e.title='Rival Race';
  const path=[{x:root.x,y:e.startY}];
  if(e.kind==='rivalRace'){
    const bends=6+Math.round(e.difficulty*2),swing=mix(260,390,e.difficulty)*scale;
    for(let i=1;i<bends;i++)path.push({x:root.x+(i%2?1:-1)*swing,y:e.startY+i/bends*length});
    path.push({x:root.x,y:e.endY});e.racers=[];e.raceGates=[];
  }
  e.paths=[path];
}
function populateSpecialArea(e,section,from,to){
  const scale=e.scale,own={arcadeRun:section,encounter:e},center=e.centerX,A=S.endless.regions.specialAreas;
  const fence=(ax,ay,bx,by)=>entity('areaBarrier',(ax+bx)/2,(ay+by)/2,{...own,r:8,width:Math.abs(bx-ax)+12,depth:Math.abs(by-ay)+12,ax,ay,bx,by});
  const entry=e.startY+100*scale,exit=e.endY-100*scale;
  for(const y of [entry,exit])if(y===entry?from===e.startY:to===e.endY)for(const side of [-1,1]){
    const a=center+side*e.entryHalf,b=center+side*e.band,n=Math.ceil(Math.abs(b-a)/320);
    for(let i=0;i<n;i++)fence(mix(a,b,i/n),y,mix(a,b,(i+1)/n),y);
  }
  for(let y=Math.max(entry,from);y<Math.min(exit,to);y+=300)for(const side of [-1,1])fence(center+side*e.band,y,center+side*e.band,Math.min(y+300,to,exit));
  if(e.kind==='rivalRace'){
    if(!e.racers.length){
      const n=Math.round(mix(...A.rivalRace.count,e.difficulty));
      for(let i=0;i<n;i++){
        const profile=RIVAL_PROFILES[i%RIVAL_PROFILES.length],y=entry+280*scale+i*45*scale;
        e.racers.push(entity('skier',encounterPathX(e.paths[0],y)+(i-(n-1)/2)*45*scale,y,{...own,width:42,r:12,vy:0,vx:0,rival:profile,raceSpeed:0,raceLane:profile.lane*(45+i*8)*scale,raceRatio:mix(...A.rivalRace.speedRatio,e.difficulty)+profile.offset}));
      }
    }
    for(let y=e.startY+350*scale;y<e.endY-200*scale;y+=420*scale){if(y<from||y>=to)continue;
      const x=encounterPathX(e.paths[0],y);
      for(const side of [-1,1]){
        entity('raceRail',x+side*e.half,y,{...own,r:0,width:80,side});
        if(Math.round((y-e.startY)/(420*scale))%2===0)entity(side<0?'personYellow':'personRed',x+side*(e.half+65*scale),y+30,{...own,r:8,width:30,cheerUntil:clock+1e8,nextCheer:clock+1e8});
        entity('fir',x+side*(e.half+180*scale),y+80,{...own,width:70,r:18});
      }
    }
  }
}
function specialSurfaceAt(x,y){const e=endlessEncounterAt(y);return e?.specialArea?{e,firm:true}:null;}
function specialActorFactor(){return 1;}
function updateSpecialPlayer(p,dt){
  const a=specialSurfaceAt(p.x,p.y);p.specialSurface=a;p.specialCap=1;p.draftTarget=null;
  if(p.air>0){p.draft=Math.max(0,(p.draft||0)-dt*2);return;}
  if(p.fall||p.awaitingInput){p.draft=0;return;}
  if(a?.e.kind==='rivalRace'&&p.mode==='slide'&&Math.cos(p.heading)>.3){
    const R=S.endless.regions.specialAreas.rivalRace,scale=a.e.scale;
    let gap=Infinity;
    for(const o of a.e.racers){
      if(o.dead||o.eaten||o.npcFallUntil>clock||o.raceDone||o.fearUntil>clock)continue;
      const dx=o.x-p.x,dy=o.y-p.y,ahead=dx*Math.sin(p.heading)+dy*Math.cos(p.heading),side=Math.abs(dx*Math.cos(p.heading)-dy*Math.sin(p.heading));
      if(ahead>=R.draftMinMetres*PX_PER_M*scale&&ahead<=R.draftRangeMetres*PX_PER_M*scale&&side<R.draftWidthMetres*PX_PER_M*scale&&ahead<gap){gap=ahead;p.draftTarget=o;}
    }
    p.draft=clamp((p.draft||0)+dt*(p.draftTarget?1/R.draftChargeSeconds:-1/1.2),0,1);
    p.specialCap=1+R.draftBoost*p.draft;
  }else p.draft=Math.max(0,(p.draft||0)-dt*2);
}
function rivalMotion(o,dt){
  const e=o.encounter,p=state.p,scale=endlessSpeedScale(o);
  if(o.raceDone){o.raceSpeed=ease(o.raceSpeed||topSpeed(),45*scale,1.2,dt);const side=Math.sign(o.raceLane)||o.rival.lane||1;return {vx:Math.abs(o.x-e.centerX)<e.half+70*scale?side*80*scale:0,vy:o.raceSpeed};}
  if(!e.raceStarted){if(p.y<e.startY+100*e.scale)return {vx:0,vy:0};e.raceStarted=true;}
  if(o.y>=e.endY-100*e.scale){o.raceDone=true;o.raceFinishAt=clock;return {vx:0,vy:o.raceSpeed||topSpeed()};}
  const target=topSpeed()*o.raceRatio;
  o.raceSpeed=Math.min(target,(o.raceSpeed||0)+(S.physics.accelerationBase+S.physics.accelerationDownhill)*scale*dt);
  let lane=o.raceLane;
  if(o.rival.style==='wide')lane*=1.5;
  if(o.rival.style==='weave')lane+=Math.sin(clock*1.3+o.phase)*50*scale;
  if(o.rival.style==='pushy'&&Math.hypot(o.x-p.x,o.y-p.y)<180*scale)lane=clamp(p.x-encounterPathX(e.paths[0],o.y),-e.half*.6,e.half*.6);
  const gateHalf=mix(...S.endless.gates.openingMetres,e.difficulty)*PX_PER_M*e.scale/2;lane=clamp(lane,-gateHalf*.65,gateHalf*.65);
  const x=encounterPathX(e.paths[0],Math.min(e.endY,o.y+o.raceSpeed*.45))+lane;
  const vx=clamp((x-o.x)*2,-o.raceSpeed*.65,o.raceSpeed*.65),vy=Math.sqrt(Math.max(0,o.raceSpeed**2-vx**2));
  o.vx=vx;o.vy=vy;return {vx,vy};
}
function updateSpecialEvents(){
  for(const e of state.endless?.encounters||[]){
    if(e.kind!=='rivalRace')continue;
    const finish=e.endY-100*e.scale;
    if(state.p.y>=e.startY+100*e.scale)e.raceStarted=true;
    if(!e.raceStarted)continue;
    for(const o of e.racers)if(!o.raceDone&&!o.dead&&!o.eaten&&o.y>=finish){o.raceDone=true;o.raceFinishAt=clock;}
    if(e.raceResult||state.p.y<finish)continue;
    const rank=1+e.racers.filter(o=>o.raceDone).length,passed=e.raceGates.filter(g=>g.good).length;
    const qualified=!e.raceGates.length||passed/e.raceGates.length>=S.endless.regions.specialAreas.rivalRace.gateQuota;
    state.specialResultUntil=clock+3;
    e.raceResult={rank,qualified,passed,total:e.raceGates.length};const reward=qualified?Math.max(0,e.racers.length+1-rank)*3:0;
    if(reward&&!state.endless.debug){state.bank+=reward;save();}
    announce(qualified?'RIVAL RACE - '+rank+'/'+(e.racers.length+1):'RIVAL RACE - OFF COURSE',!qualified?'FOLLOW MORE GATES NEXT TIME':state.endless.debug?'DEBUG RACE - KEEP SKIING':reward?'+'+reward+' COINS - KEEP SKIING':'NEXT TIME, CATCH A SLIPSTREAM',C.teal,3);
  }
}
function specialGateX(e,y,number,path){return encounterPathX(path,y);}
function specialTile(key,width,height,paint){
  let tile=specialArt.get(key);if(tile)return tile;
  tile=document.createElement('canvas');tile.width=Math.ceil(width);tile.height=Math.ceil(height);const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const px=(x,y,w,h,c)=>{t.fillStyle=gritMaterial(c);t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const polygon=(points,c)=>{t.fillStyle=c;t.beginPath();points.forEach(([x,y],i)=>i?t.lineTo(Math.round(x/2)*2,Math.round(y/2)*2):t.moveTo(Math.round(x/2)*2,Math.round(y/2)*2));t.closePath();t.fill();};
  paint(t,px,polygon);specialArt.set(key,tile);if(specialArt.size>24)specialArt.delete(specialArt.keys().next().value);return tile;
}
function specialEllipse(x,y,rx,ry,steps=32){return Array.from({length:steps},(_,i)=>{const a=i/steps*TAU;return [x+Math.cos(a)*rx,y+Math.sin(a)*ry];});}
function drawSpecialAreas(){
  const view=viewBounds();
  for(const e of state.endless?.encounters||[]){
    if(!e.specialArea||e.endY<view.top||e.startY>view.bottom)continue;
    const a=screen(e.centerX-e.band,e.startY),b=screen(e.centerX+e.band,e.endY),left=Math.max(0,a.x),right=Math.min(W,b.x),top=Math.max(0,a.y),bottom=Math.min(H,b.y);
    ctx.save();ctx.beginPath();ctx.rect(left,top,Math.max(0,right-left),bottom-top);ctx.clip();
    box(left,top,right-left,bottom-top,'#e7effc');
    const path=e.paths[0];for(let y=Math.max(e.startY,Math.floor(view.top/100)*100);y<Math.min(e.endY,view.bottom+100);y+=100){const at=screen(encounterPathX(path,y),y);box(at.x-e.half*ZOOM,at.y,e.half*2*ZOOM,50,'#f1f6ff');for(const side of [-1,1])box(at.x+side*(e.half-12)*ZOOM,at.y,2,22,'#b4cdd7');}
    ctx.restore();
    // Continue the entry/exit barrier across off-centre approaches, just as in the cemetery.
    for(const y of [e.startY+100*e.scale,e.endY-100*e.scale])if(y>view.top-50&&y<view.bottom+50)for(const side of [-1,1]){
      const l=side<0?view.left-20:Math.max(view.left-20,e.centerX+e.band),r=side<0?Math.min(view.right+20,e.centerX-e.band):view.right+20;if(r<=l)continue;
      const p=screen(l,y),q=screen(r,y);line(p.x,p.y-6,q.x,q.y-6,'#71878b',4);line(p.x,p.y-9,q.x,q.y-9,'#eaf1e9',3);
    }
  }
}
function drawAreaBarrier(o){
  const minX=Math.min(o.ax,o.bx),minY=Math.min(o.ay,o.by),w=Math.abs(o.bx-o.ax)*ZOOM+20,h=Math.abs(o.by-o.ay)*ZOOM+42;
  const tile=specialTile('barrier:'+o.encounter.kind+':'+w+':'+h,w,h,(t,px)=>{
    const ax=(o.ax-minX)*ZOOM+10,ay=(o.ay-minY)*ZOOM+32,bx=(o.bx-minX)*ZOOM+10,by=(o.by-minY)*ZOOM+32,n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/9));
    for(let i=0;i<=n;i++){const x=mix(ax,bx,i/n),y=mix(ay,by,i/n);px(x-5,y-12,10,10,'#8299a2');px(x-5,y-15,10,4,'#edf2e8');if(i%3===0){px(x-1,y-21,3,24,'#60757c');px(x-2,y-23,5,3,'#eef4e9');}}
  });const at=screen(minX,minY);ctx.drawImage(tile,Math.round(at.x-10),Math.round(at.y-32));
}
function drawSpecialProp(o,s){
  if(o.type==='areaBarrier'){drawAreaBarrier(o);return true;}
  if(o.type==='raceRail'){for(let i=-2;i<=2;i++){box(s.x+i*8,s.y-9,8,3,i%2?'#bc6468':'#f4eee0');box(s.x+i*8,s.y-6,8,2,'#889b9d');}box(s.x-16,s.y-10,2,13,'#647e85');box(s.x+16,s.y-10,2,13,'#647e85');return true;}
  return false;
}
function drawRival(o,s){
  box(s.x-3,s.y-15,6,6,o.rival.color);box(s.x-3,s.y-24,6,2,o.rival.color);box(s.x-1,s.y-13,2,3,'#f9f4dc');
  if(Math.hypot(o.x-state.p.x,o.y-state.p.y)<330*endlessSpeedScale(o))text(o.rival.name,s.x,s.y-31,7,o.rival.color);
}
function drawSpecialEffects(){
  const p=state.p,at=screen(p.x,p.y);
  if(p.draftTarget&&p.draft>0){const target=screen(p.draftTarget.x,p.draftTarget.y);ctx.save();ctx.globalAlpha=.3+p.draft*.5;for(const side of [-1,1])line(at.x+side*6,at.y-2,target.x+side*10,target.y+6,'#79b8c4');ctx.restore();text('DRAFT',at.x,at.y+21,7,'#377c8c');}
}
