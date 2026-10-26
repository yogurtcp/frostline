/* Authored Arcade areas. build.py embeds this inside the game closure. */
const SPECIAL_KINDS=new Set(['rivalRace','marsh','bowls']);
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
  e.specialArea=true;e.centerX=root.x;e.band=A.widthScreens*W/ZOOM/2;e.noNewPredators=true;e.noFlags=false;
  e.entryHalf=(e.kind==='marsh'?200:e.kind==='bowls'?720:320)*scale;e.half=(e.kind==='rivalRace'?240:180)*scale;
  e.title={rivalRace:'Rival Race',marsh:'Frozen Marsh',bowls:'Powder Bowls'}[e.kind];
  const path=[{x:root.x,y:e.startY}];
  if(e.kind==='rivalRace'){
    const bends=6+Math.round(e.difficulty*2),swing=mix(260,390,e.difficulty)*scale;
    for(let i=1;i<bends;i++)path.push({x:root.x+(i%2?1:-1)*swing,y:e.startY+i/bends*length});
    path.push({x:root.x,y:e.endY});e.racers=[];e.raceGates=[];
  }else if(e.kind==='marsh'){
    const M=A.marsh,spacing=360*scale,rx=mix(...M.islandRadiusMetres,e.difficulty)*PX_PER_M*scale;
    e.islands=[];e.bridges=[];e.bridgeHalf=mix(...M.boardwalkWidthMetres,e.difficulty)*PX_PER_M*scale/2;
    let previous={x:root.x,y:e.startY+150*scale};path.push(previous);
    for(let i=0,y=e.startY+360*scale;y<e.endY-180*scale;i++,y+=spacing){
      const x=root.x+Math.sin(i*1.8)*260*scale,p={x,y};path.push(p);e.bridges.push({a:previous,b:p});previous=p;
      for(const lane of [-1,0,1])e.islands.push({x:x+lane*620*scale,y:y+(lane?Math.sin(i+lane)*65*scale:0),rx:rx*(lane?.9:1),ry:rx*1.05,style:(i+lane+9)%3});
    }
    const end={x:root.x,y:e.endY-100*scale};e.bridges.push({a:previous,b:end});path.push(end,{x:root.x,y:e.endY});path.linear=true;
  }else{
    const B=A.bowls,rx=mix(...B.radiusMetres,e.difficulty)*PX_PER_M*scale,ry=560*scale;
    e.bowls=[];
    for(let i=0,y=e.startY+680*scale;y<e.endY-540*scale;i++,y+=B.spacingMetres*PX_PER_M*scale){
      const side=i%2?-1:1,x=root.x+side*110*scale,b={x,y,rx,ry,side,index:i};e.bowls.push(b);
      path.push({x:x+side*rx*.78,y:y-ry*.32},{x:x+side*rx*.78,y:y+ry*.32},{x:root.x,y:y+ry*.85});
    }
    path.push({x:root.x,y:e.endY});
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
  }else if(e.kind==='marsh'){
    for(let row=0,y=e.startY+280*scale;y<e.endY-180*scale;row++,y+=270*scale){if(y<from||y>=to)continue;
      for(let col=-3;col<=3;col++){
        const x=center+col*400+(Math.sin(row*7+col*3)*85),yy=y+Math.cos(col*5+row)*55*scale;
        if(specialSurfaceAt(x,yy,e).firm)continue;
        entity('marshReeds',x,yy,{...own,r:0,width:42,style:(row+col+30)%3});
      }
    }
  }else{
    for(const b of e.bowls){const y=b.y+b.ry*.7;if(y<from||y>=to)continue;
      const hill=createArcadeItem('largeHill',b.x+b.side*b.rx*.55,y,section);Object.assign(hill,{encounter:e,bowlLip:true,width:190,r:60});
      for(const side of [-1,1])entity('pine',b.x+side*(b.rx+110*scale),b.y,{...own,width:75,r:20});
    }
  }
}
function marshIslandShape(angle,style){return .94+Math.sin(angle*3+style*1.7)*.055+Math.cos(angle*5-style)*.035;}
function marshIslandPoints(x,y,rx,ry,style){return Array.from({length:40},(_,i)=>{const a=i/40*TAU,r=marshIslandShape(a,style);return [x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r];});}
function specialSurfaceAt(x,y,known=null){
  const e=known??endlessEncounterAt(y);if(!e?.specialArea)return null;
  if(y<e.startY+220*e.scale||y>e.endY-160*e.scale)return {e,firm:true,apron:true};
  if(e.kind==='marsh'){
    for(const p of e.islands)if(Math.abs(x-p.x)<=p.rx*1.04&&Math.abs(y-p.y)<=p.ry*1.04&&Math.hypot((x-p.x)/p.rx,(y-p.y)/p.ry)<=marshIslandShape(Math.atan2((y-p.y)/p.ry,(x-p.x)/p.rx),p.style))return {e,firm:true};
    for(const b of e.bridges)if(y>=Math.min(b.a.y,b.b.y)-e.bridgeHalf&&y<=Math.max(b.a.y,b.b.y)+e.bridgeHalf&&obstacleSegmentDistance(x,y,b.a.x,b.a.y,b.b.x,b.b.y)<=e.bridgeHalf)return {e,firm:true};
    return {e,firm:false};
  }
  if(e.kind==='bowls'){
    let best=null,delta=Infinity;
    for(const b of e.bowls){const r=Math.hypot((x-b.x)/b.rx,(y-b.y)/b.ry),d=Math.abs(r-.86);if(d<delta){delta=d;best={e,b,r,bank:r>=.68&&r<=1.08};}}
    return best??{e,firm:true};
  }
  return {e,firm:true};
}
function specialActorFactor(o,dt,surface=null){
  if(o.air>0||o.zombieState==='leaping'){o.marshSink=Math.max(0,(o.marshSink||0)-dt*3);return 1;}
  const a=surface??specialSurfaceAt(o.x,o.y);if(o.specialStamp===clock)return o.specialFactor??1;
  o.specialStamp=clock;o.specialFactor=1;
  if(a?.e.kind==='marsh'){
    const M=S.endless.regions.specialAreas.marsh;
    o.marshSink=clamp((o.marshSink||0)+(a.firm?-dt*3:dt/mix(...M.sinkSeconds,a.e.difficulty)),0,1);
    o.specialFactor=a.firm?1:mix(1,mix(...M.minimumSpeedRatio,a.e.difficulty),o.marshSink);
  }else{
    o.marshSink=Math.max(0,(o.marshSink||0)-dt*3);
    if(a?.e.kind==='bowls'&&!a.apron)o.specialFactor=a.bank?1:mix(...S.endless.regions.specialAreas.bowls.powderSpeedRatio,a.e.difficulty);
  }
  return o.specialFactor;
}
function updateSpecialPlayer(p,dt){
  const a=specialSurfaceAt(p.x,p.y);p.specialSurface=a;p.specialCap=1;p.draftTarget=null;
  if(p.air>0){p.marshSink=Math.max(0,(p.marshSink||0)-dt*3);p.draft=Math.max(0,(p.draft||0)-dt*2);p.carve=0;return;}
  const factor=specialActorFactor(p,dt,a);
  if(p.fall||p.awaitingInput){p.draft=0;p.carve=0;return;}
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
  if(a?.e.kind==='marsh')p.specialCap=factor;
  if(a?.e.kind==='bowls'&&!a.apron){
    let alignment=0;
    if(a.bank){let tx=-(p.y-a.b.y)/(a.b.ry*a.b.ry),ty=(p.x-a.b.x)/(a.b.rx*a.b.rx);if(ty<0){tx=-tx;ty=-ty;}const length=Math.hypot(tx,ty)||1;alignment=(Math.sin(p.heading)*tx+Math.cos(p.heading)*ty)/length;}
    const carving=a.bank&&alignment>.65&&p.mode==='slide'&&Math.cos(p.heading)>.15&&p.speed>topSpeed()*.25;
    p.carve=clamp((p.carve||0)+dt*(carving?1.3:-2),0,1);
    p.specialCap=carving?1+mix(...S.endless.regions.specialAreas.bowls.bankBoost,a.e.difficulty)*p.carve:factor;
  }else p.carve=Math.max(0,(p.carve||0)-dt*3);
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
function specialGateX(e,y,number,path){return e.kind==='bowls'&&number%3===0?e.centerX:encounterPathX(path,y);}
function specialTile(key,width,height,paint){
  let tile=specialArt.get(key);if(tile)return tile;
  tile=document.createElement('canvas');tile.width=Math.ceil(width);tile.height=Math.ceil(height);const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const px=(x,y,w,h,c)=>{t.fillStyle=c;t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
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
    box(left,top,right-left,bottom-top,e.kind==='marsh'?'#344e58':e.kind==='bowls'?'#e0e9e8':'#e8efec');
    if(e.kind==='marsh'){
      for(let row=Math.floor(view.top/180);row*180<Math.min(view.bottom,e.endY);row++)for(let col=Math.floor((view.left-e.centerX)/260);col*260+e.centerX<view.right;col++){
        const at=screen(e.centerX+col*260+Math.sin(row*4+col)*50,row*180);line(at.x-12,at.y,at.x+13,at.y,'#55717a');box(at.x+18,at.y+17,6,1,'#6b8588');
      }
      for(const p of e.islands){if(p.y+p.ry<view.top||p.y-p.ry>view.bottom||p.x+p.rx<view.left||p.x-p.rx>view.right)continue;
        const rx=p.rx*ZOOM,ry=p.ry*ZOOM,tile=specialTile('island:'+rx+':'+ry+':'+p.style,rx*2+12,ry*2+14,(t,px,poly)=>{
          poly(marshIslandPoints(rx+6,ry+9,rx+4,ry+3,p.style),'#1d353f');poly(marshIslandPoints(rx+6,ry+5,rx,ry,p.style),'#9eafb0');poly(marshIslandPoints(rx+6,ry+3,rx-3,ry-3,p.style),'#eaf1e9');
          for(let i=0;i<11;i++){const a=i*2.4,r=.77,xx=rx+6+Math.cos(a)*rx*r,yy=ry+4+Math.sin(a)*ry*r;px(xx,yy,3,2,i%2?'#c3cfc0':'#98a99c');if(i%3===0)px(xx,yy-2,2,3,'#b6a878');}
          for(let i=0;i<7;i++)px(7+i*rx*.25,ry+Math.sin(i*3)*ry*.5,3,1,'#ceded7');
        });const at=screen(p.x,p.y);ctx.drawImage(tile,Math.round(at.x-rx-6),Math.round(at.y-ry-5));
      }
      for(const bridge of e.bridges){if(Math.max(bridge.a.y,bridge.b.y)<view.top-30||Math.min(bridge.a.y,bridge.b.y)>view.bottom+30)continue;
        const dx=bridge.b.x-bridge.a.x,dy=bridge.b.y-bridge.a.y,length=Math.hypot(dx,dy),nx=-dy/length*e.bridgeHalf,ny=dx/length*e.bridgeHalf,n=Math.ceil(length/15);
        for(let i=0;i<n;i++){const t=(i+.5)/n,p=screen(mix(bridge.a.x,bridge.b.x,t),mix(bridge.a.y,bridge.b.y,t));line(p.x-nx*ZOOM,p.y-ny*ZOOM,p.x+nx*ZOOM,p.y+ny*ZOOM,i%3?'#b29b72':'#8b8065',5);line(p.x-nx*ZOOM,p.y-ny*ZOOM-2,p.x+nx*ZOOM,p.y+ny*ZOOM-2,'#d4c3a0');}
      }
      for(const [y,depth] of [[e.startY,220*e.scale],[e.endY-160*e.scale,160*e.scale]]){const at=screen(e.centerX,y);box(at.x-e.entryHalf*ZOOM,at.y,e.entryHalf*2*ZOOM,depth*ZOOM,'#eaf1e9');}
    }else if(e.kind==='bowls'){
      for(const bowl of e.bowls){if(bowl.y+bowl.ry<view.top||bowl.y-bowl.ry>view.bottom)continue;
        const rx=bowl.rx*ZOOM,ry=bowl.ry*ZOOM,tile=specialTile('bowl:'+rx+':'+ry+':'+bowl.side,rx*2+30,ry*2+30,(t,px,poly)=>{
          const x=rx+15,y=ry+15;poly(specialEllipse(x,y+6,rx,ry),'#adc9d8');poly(specialEllipse(x,y,rx,ry),'#f8faf2');poly(specialEllipse(x,y+5,rx*.92,ry*.91),'#9bbdcf');poly(specialEllipse(x-bowl.side*rx*.045,y+ry*.08,rx*.72,ry*.73),'#c7dce3');poly(specialEllipse(x-bowl.side*rx*.07,y+ry*.11,rx*.60,ry*.62),'#eff4ec');
          for(let i=0;i<430;i++){
            const a=i*2.399963,r=.7+(i%37)/100,xx=x+Math.cos(a)*rx*r,yy=y+Math.sin(a)*ry*r;
            if(r<1)px(xx,yy,i%3===0?3:1,1,i%2?'#d9e8e9':'#8fb3c6');
          }
          for(const offset of [-2,2]){t.strokeStyle='#d8e7e7';t.lineWidth=1;t.beginPath();for(let i=0;i<=30;i++){const a=-1.15+i/30*2.3,xx=Math.round(x+bowl.side*Math.cos(a)*rx*.85+offset),yy=Math.round(y+Math.sin(a)*ry*.85);i?t.lineTo(xx,yy):t.moveTo(xx,yy);}t.stroke();}
          for(let i=0;i<25;i++){const a=i/25*TAU,xx=x+Math.cos(a)*rx*.97,yy=y+Math.sin(a)*ry*.97;px(xx,yy,7,2,'#f9fcf2');}

        });const at=screen(bowl.x,bowl.y);ctx.drawImage(tile,Math.round(at.x-rx-15),Math.round(at.y-ry-15));
      }
    }else{
      const path=e.paths[0];for(let y=Math.max(e.startY,Math.floor(view.top/100)*100);y<Math.min(e.endY,view.bottom+100);y+=100){const at=screen(encounterPathX(path,y),y);box(at.x-e.half*ZOOM,at.y,e.half*2*ZOOM,50,'#f5f8ee');for(const side of [-1,1])box(at.x+side*(e.half-12)*ZOOM,at.y,2,22,'#b4cdd7');}
    }
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
    for(let i=0;i<=n;i++){const x=mix(ax,bx,i/n),y=mix(ay,by,i/n);px(x-5,y-12,10,10,o.encounter.kind==='marsh'?'#796a52':'#8299a2');px(x-5,y-15,10,4,'#edf2e8');if(i%3===0){px(x-1,y-21,3,24,'#60757c');px(x-2,y-23,5,3,'#eef4e9');}}
  });const at=screen(minX,minY);ctx.drawImage(tile,Math.round(at.x-10),Math.round(at.y-32));
}
function drawSpecialProp(o,s){
  if(o.type==='areaBarrier'){drawAreaBarrier(o);return true;}
  if(o.type==='raceRail'){for(let i=-2;i<=2;i++){box(s.x+i*8,s.y-9,8,3,i%2?'#bc6468':'#f4eee0');box(s.x+i*8,s.y-6,8,2,'#889b9d');}box(s.x-16,s.y-10,2,13,'#647e85');box(s.x+16,s.y-10,2,13,'#647e85');return true;}
  if(o.type==='marshReeds'){
    const tile=specialTile('reeds:'+o.style,30,38,(t,px)=>{for(let i=0;i<7;i++){const x=3+i*3,y=5+(i*7+o.style*3)%13;px(x,y,1,31-y,'#a6a079');px(x-1,y-5,3,7,'#b4985c');px(x-2,y-6,4,2,'#e4d3a2');px(x+1,y+10,4,1,'#8f9978');}px(1,31,26,2,'#516c70');});ctx.drawImage(tile,s.x-15,s.y-33);return true;
  }
  return false;
}
function drawRival(o,s){
  box(s.x-3,s.y-15,6,6,o.rival.color);box(s.x-3,s.y-24,6,2,o.rival.color);box(s.x-1,s.y-13,2,3,'#f9f4dc');
  if(Math.hypot(o.x-state.p.x,o.y-state.p.y)<330*endlessSpeedScale(o))text(o.rival.name,s.x,s.y-31,7,o.rival.color);
}
function drawSpecialEffects(){
  const p=state.p,at=screen(p.x,p.y);
  if(p.draftTarget&&p.draft>0){const target=screen(p.draftTarget.x,p.draftTarget.y);ctx.save();ctx.globalAlpha=.3+p.draft*.5;for(const side of [-1,1])line(at.x+side*6,at.y-2,target.x+side*10,target.y+6,'#79b8c4');ctx.restore();text('DRAFT',at.x,at.y+21,7,'#377c8c');}
  if(p.carve>.15&&p.air<=0){ctx.save();ctx.globalAlpha=p.carve;for(let i=0;i<5;i++)box(at.x-Math.sin(p.heading)*(i*5+5)+Math.cos(clock*8+i)*3,at.y-Math.cos(p.heading)*(i*5+5),3,2,'#faffef');ctx.restore();text('CARVE',at.x,at.y+21,7,'#5089a4');}
  if(p.marshSink>.12&&p.specialSurface?.e.kind==='marsh'&&!p.specialSurface.firm&&p.air<=0){line(at.x-8,at.y+1,at.x+8,at.y+1,'#587a7e',2);}
}
