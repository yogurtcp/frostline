/* Holiday towns and shared day/night lighting. Embedded by build.py. */
const FESTIVAL_KINDS=new Set(['christmas','halloween']);
function isNight(){
  if(!S.night.enabled)return false;
  if(state.nightOverride!==null)return state.nightOverride;
  return !!(S.night.dayNightRounds&&state.endless&&(endlessEncounterAt(state.p.y)?.night??state.endless.nightPhase));
}
function toggleDayNight(){
  if(!ready||!S.night.enabled||state.sceneCard||state.deathTimer||state.liftTimer)return false;
  state.nightOverride=!isNight();state.nightBlend=state.nightOverride?1:0;
  announce(state.nightOverride?'NIGHT FALLS':'DAYLIGHT','',C.teal,1.5);render();return true;
}
function updateDayNight(dt){
  const area=state.endless&&endlessEncounterAt(state.p.y);if(area)state.endless.nightPhase=area.night;
  state.nightBlend=ease(state.nightBlend||0,isNight()?1:0,4/S.night.transitionSeconds,dt);
}
function routeLampBlockers(){
  const grid=new Map(),cell=256;
  const add=o=>{
    let b;
    if(HOUSE_TYPES.has(o.type)){
      const hw=houseFootHalfWidth(o),hh=houseFootDepth(o)/2;
      b=[o.x-hw-16,o.y-hh*2-16,o.x+hw+16,o.y+16];
    }else if(TREE_TYPES.has(o.type)){
      const pad=16*Math.max(1,1/S.physics.collisionYScale),bounds=solidBounds(o);b=[bounds[0]-pad,bounds[1]-pad,bounds[2]+pad,bounds[3]+pad];
    }else if(o.type==='lamp')b=[o.x-45,o.y-45,o.x+45,o.y+45];
    else return;
    for(let x=Math.floor(b[0]/cell);x<=Math.floor(b[2]/cell);x++){let col=grid.get(x);if(!col)grid.set(x,col=new Map());for(let y=Math.floor(b[1]/cell);y<=Math.floor(b[3]/cell);y++){let items=col.get(y);if(!items)col.set(y,items=[]);items.push(o);}}
  };
  for(const o of state.objects)add(o);
  return {add,near:(x,y)=>grid.get(Math.floor(x/cell))?.get(Math.floor(y/cell))||[]};
}
function addRouteLamps(path,town,from,to,encounter=null){
  if(!path?.length)return;
  const spacing=S.night.lampSpacingMetres*PX_PER_M,roadWidth=town?.mainRoadWidth??S.village.mainRoadWidth,setback=S.night.lampSetbackMetres*PX_PER_M;
  const first=Math.max(path[0].y,from),last=Math.min(path.at(-1).y,to),route={points:path,width:roadWidth};
  const roads=town?state.roads.filter(r=>r.town===town&&r.points!==path):[],blockers=routeLampBlockers();
  for(let nominal=Math.ceil(first/spacing)*spacing;nominal<last;nominal+=spacing)for(const side of [-1,1]){
    // Shift along the shoulder to find a gap between houses instead of pushing a pole into the street.
    for(const shift of [0,spacing*.25,-spacing*.25,spacing*.45,-spacing*.45]){
      const y=clamp(nominal+shift,path[0].y,path.at(-1).y-.01),i=path.findIndex((p,index)=>index>0&&p.y>=y);if(i<1)continue;
      const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!length||!dy)continue;
      const x=mix(a.x,b.x,clamp((y-a.y)/dy,0,1)),offset=roadWidth/2+setback;
      const px=x+side*dy/length*offset,py=y-side*dx/length*offset;
      if(roadDistance(route,px,py)<offset-.01||roads.some(r=>roadDistance(r,px,py)<r.width/2+24))continue;
      if(blockers.near(px,py).some(o=>(HOUSE_TYPES.has(o.type)&&houseClearance(o,px,py)<16)||(TREE_TYPES.has(o.type)&&obstacleClearance(o,px,py)<16)||(o.type==='lamp'&&Math.hypot(o.x-px,o.y-py)<45)))continue;
      const plaza=town?.festivalPlaza;if(plaza&&Math.hypot(px-plaza.x,py-plaza.y)<(town.festival==='halloween'?165:75))continue;
      // A broad parade needs light to reach across the avenue while its posts stay on the shoulders.
      const lightRadiusWorld=town?.parade?Math.max(S.night.lampRadiusMetres*PX_PER_M,Math.hypot(offset,spacing/2)+40):undefined;
      const lamp=entity('lamp',px,py,{width:20,r:5,town,encounter:encounter??town?.encounter,arcadeRun:town?.endlessRun,roadLamp:true,lightRadiusWorld});blockers.add(lamp);break;
    }
  }
}
function encloseChristmasParade(e,town,houses,rowYs){
  const width=160,foot=width*S.village.houseFootWidthRatio;
  const inner=Math.abs(houses[0].x-town.x),band=Math.max(e.band,S.endless.regions.minimumWidthMetres*PX_PER_M*e.scale/2),own={town,paradeBoundary:true,r:foot,width};
  const place=(x,y,style,extra={})=>entity(style%3?'rental':'lodge',x,y,{...own,houseStyle:style%S.houseAnimation.trimRGB.length,...extra});
  // Horizontal rows extend outward from each street facade, leaving the avenue open.
  const pitch=foot*2-4,run=12;
  // Consecutive strips use the same facade (12 repeats both type and trim); merge their solids.
  const across=run%S.houseAnimation.trimRGB.length===0?Math.max(1,Math.ceil((band+width-inner-pitch)/(run*pitch)))*run:run;
  for(const side of [-1,1])for(const y of [e.startY+140,...rowYs,e.endY-40]){
    for(let first=inner+pitch;first<band+width;first+=across*pitch){
      const x=town.x+side*(first+(across-1)*pitch/2);
      place(x,y,Math.round((y-e.startY)/200)+Math.round(first/pitch),{paradeSpanX:across,paradeStepX:pitch,r:foot+(across-1)*pitch/2});
    }
  }
  // Keep existing shopkeepers, stalls and animals clear of the new rear buildings.
  const buildings=state.objects.filter(o=>o.town===town&&HOUSE_TYPES.has(o.type)).map(h=>({h,b:solidBounds(h)}));
  const blocked=(x,y,r,boundaryOnly=false)=>buildings.some(({h,b})=>(!boundaryOnly||h.paradeBoundary)&&x>b[0]-r&&x<b[2]+r&&y>b[1]-r&&y<b[3]+r&&houseClearance(h,x,y)<r);
  for(const o of state.objects){
    if(o.town!==town||HOUSE_TYPES.has(o.type)||!(o.r>0||o.type.startsWith('person')||o.animal))continue;
    const r=Math.max(8,o.r||0)+4,side=Math.sign(o.x-town.x)||1;
    if(!blocked(o.x,o.y,r,true))continue;
    for(const offset of [inner+foot*.7,inner,e.half-r-15]){
      const x=town.x+side*offset;if(blocked(x,o.y,r))continue;
      const dx=x-o.x;o.x=o.homeX=x;if(o.path)o.path=o.path.map(p=>({...p,x:p.x+dx}));break;
    }
  }
}
function makeChristmasParade(e,root,name){
  const P=S.endless.regions.festivals.christmasParade,V=S.village,base=root.x,half=e.half;
  const town={origin:e.startY,x:base,name,festival:'christmas',parade:true,mainRoadWidth:half*2,end:e.endY,roadEndY:e.endY-120,approachEndY:e.endY,endlessRun:root,halfWidth:V.halfWidth+150,plazaRows:[],layoutSeed:Math.floor(random()*4294967296)};
  town.route=[{x:base,y:e.startY+120},{x:base,y:town.roadEndY}];
  town.approachRoad={surface:'snow',width:town.mainRoadWidth,points:[town.route.at(-1),{x:base,y:e.endY}],town};
  town.festivalPlaza={x:base,y:mix(e.startY,e.endY,.53)};
  state.villages.push(town);
  // Small render sections keep a five-kilometre street from building/scanning one huge tile cache.
  for(let y=town.route[0].y;y<town.roadEndY;y+=100*PX_PER_M)state.roads.push({surface:'snow',width:town.mainRoadWidth,points:[{x:base,y},{x:base,y:Math.min(y+100*PX_PER_M,town.roadEndY)}],town});
  state.roads.push(town.approachRoad);
  entity('villageTitle',base,e.startY+10,{r:0,width:300,town});
  // The two facades stay exactly aligned; variety belongs to the buildings, not the street plan.
  const width=160,houseX=half+width*V.houseFootWidthRatio+35,step=P.houseSpacingMetres*PX_PER_M,houses=[],rowYs=[],centers=[];
  for(let y=e.startY+340,row=0;y<e.endY-220;y+=step,row++){
    rowYs.push(y);centers.push(base);
    for(const side of [-1,1])houses.push(entity((row+(side>0?1:0))%3?'rental':'lodge',base+side*houseX,y,{width,r:width*V.houseFootWidthRatio,town,houseStyle:(row+(side>0?2:0))%S.houseAnimation.trimRGB.length,band:row}));
    if(row%6===1)entity('paradeGarland',base,y-22,{town,width:houseX*2,r:0});
  }
  town.liftGapY=(rowYs.at(-1)+e.endY-40-width*V.houseFootHeightRatio*2)/2;
  const decorate=(type,x,y,extra)=>{
    if(Math.abs(x-base)<half+(extra.r||0)+12||houses.some(h=>houseClearance(h,x,y)<(extra.r||0)+8))return;
    return entity(type,x,y,{...extra,town});
  };
  const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  populateVillageLife(town,houses,rowYs,centers,decorate,shuffle);
  // Thin facade-side residents too, while keeping the cocoa host available.
  let resident=0;
  state.objects=state.objects.filter(o=>o.town!==town||!o.type.startsWith('person')||resident++%2===0||o.job==='cocoa');
  // Population is per base-length parade, so extending the street preserves its intended density.
  const n=Math.round(mix(...P.people,e.difficulty)*P.lengthMultiplier),first=e.startY+260,last=e.endY-220;
  for(let i=0;i<n;i++){
    const side=i%2?1:-1,y=mix(first,last,(i+.25+random()*.5)/n),crossing=i%4===0&&Math.abs(y-town.festivalPlaza.y)>190;
    const edge=half-range(28,52),x=base+(crossing?range(-edge,edge):side*edge),p={x,y};
    // Short local paths keep a continuous audience and crossings all the way down the avenue.
    const path=crossing?[{x:base-edge,y:y-45},{x:base+edge,y:y+45}]:[p,{x:base+side*(edge-range(0,24)),y:Math.min(last,y+range(45,100))}];
    entity(['personRed','personGreen','personYellow'][i%3],x,y,{town,width:32,r:10,paradeGuest:true,paradeCrossing:crossing,walker:true,path,pathIndex:crossing?(i%8?0:1):1,pathDir:i%8?-1:1,walkSpeed:range(...V.walkerSpeed)});
  }
  encloseChristmasParade(e,town,houses,rowYs);
  // Enter from behind a roof, then cross the real opening between its row and the one above.
  e.sideYetiEntries=houses.filter(h=>h.band>0).map(h=>{
    const side=Math.sign(h.x-base),back=h.y-h.width*V.houseFootHeightRatio*2;
    return {side,x:h.x,y:back-30,gapY:(rowYs[h.band-1]+back)/2,insideX:base+side*(half-40)};
  }).filter(p=>p.gapY>=e.startY+180&&p.gapY<e.endY-220);
  addRouteLamps(town.route,town,town.origin,town.end);
  return town;
}
function festivalPoint(e,t,side=0,pathIndex=0){
  const y=mix(e.startY+300,e.endY-300,t),x=encounterPathX(e.paths[pathIndex]||e.paths[0],y)+side*e.half*.65;return {x,y};
}
function clearFestivalSpot(e,p,radius){
  return p.y>e.startY+200&&p.y<e.endY-180&&!state.objects.some(o=>o.r>0&&!o.type.startsWith('person')&&o.type!=='skier'&&o.type!=='boarder'&&obstacleClearance(o,p.x,p.y)<radius+8);
}
function festivalGuest(town,p,index,extra={}){
  const christmas=town.festival==='christmas',santa=christmas&&((index*37)%100)/100<S.endless.regions.festivals.santaFraction;
  return entity(['personRed','personGreen','personYellow'][index%3],p.x,p.y,{town,width:santa?44:32,r:santa?18:10,costume:santa?'santa':christmas?['velvet','evening','tuxedo','furCoat'][index%4]:['witch','vampire','pumpkin','ghost','skeletonSuit'][index%5],...extra});
}
function reserveHalloweenMausoleum(town,roads,side){
  const plaza=town.festivalPlaza,width=town.mausoleumWidth=280;
  const clearance=Math.max(...roads.map(r=>r.width))/2+S.village.roadClearance+S.physics.playerRadius+12;
  const top=plaza.y-width*S.village.houseFootHeightRatio*2-clearance,bottom=plaza.y+clearance;
  let edge=plaza.x;
  // Include every bend across the building's feet, not just the road at its door.
  for(const road of roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i];
    if(Math.max(a.y,b.y)<top||Math.min(a.y,b.y)>bottom)continue;
    const dy=b.y-a.y;
    const xs=dy?[top,bottom].map(y=>mix(a.x,b.x,clamp((y-a.y)/dy,0,1))):[a.x,b.x];
    for(const x of xs)edge=side>0?Math.max(edge,x):Math.min(edge,x);
  }
  plaza.x=edge+side*(width/2+clearance);
}
function decorateFestival(e,section){
  warmFestivalGuestAtlas(e.kind);
  const town=e.town,F=S.endless.regions.festivals,own={town,encounter:e,arcadeRun:section};
  e.festival=true;e.allowPredators=true;town.festival=e.kind;e.title=e.kind==='christmas'?'Christmas Party':'Halloween Town';
  const guests=state.objects.filter(o=>o.town===town&&o.type.startsWith('person'));
  for(const [i,o] of guests.entries()){
    o.costume=e.kind==='christmas'?(((i*37)%100)/100<F.santaFraction?'santa':['velvet','evening','tuxedo','furCoat'][i%4]):['witch','vampire','pumpkin','ghost','skeletonSuit'][i%5];
    if(o.costume==='santa'){o.width=44;o.r=18;}
    // Guests mingle on the existing footpath network and retain ordinary fear/feeding behavior.
    if(o.walker)o.walkSpeed*=1.15;
  }
  const houses=state.objects.filter(o=>o.town===town&&HOUSE_TYPES.has(o.type)&&!o.paradeBoundary);
  for(const [i,h] of houses.entries()){
    h.festival=e.kind;
    if(i%2===0)entity(e.kind==='christmas'?'holidayGift':'jackLantern',h.x+(i%4?1:-1)*h.width*.39,h.y+23,{...own,width:24,r:0,style:i%3});
  }
  const plaza=town.festivalPlaza;
  if(e.kind==='christmas'){
    town.christmasTree=entity('christmasTree',plaza.x,plaza.y,{...own,width:240,r:44});
    const n=Math.round(mix(...F.treeCrowd,e.difficulty));
    for(let i=0,placed=0;i<n*6&&placed<n;i++){
      const angle=i*2.399963,radius=90+(i%5)*26,p={x:plaza.x+Math.cos(angle)*radius,y:plaza.y+Math.sin(angle)*radius*.66+30};
      if(!clearFestivalSpot(e,p,18))continue;
      placed++;festivalGuest(town,p,27+i,{...own,walker:true,path:[p,{x:plaza.x+Math.cos(angle+.6)*radius,y:plaza.y+Math.sin(angle+.6)*radius*.66+30}],pathIndex:1,pathDir:1,walkSpeed:range(8,16),treeGuest:true});
    }
    const kiss={x:plaza.x+Math.min(e.half*.7,210),y:plaza.y+190};
    town.mistletoe=entity('mistletoe',kiss.x,kiss.y,{...own,width:82,r:0});
    town.mistletoe.partner=festivalGuest(town,{x:kiss.x+15,y:kiss.y+2},3,{...own,costume:'evening',job:'mistletoe'});
    const spacing=F.christmasParade.rainbowSpacingMetres*PX_PER_M*e.scale;
    for(let y=e.startY+160*PX_PER_M*e.scale,i=0;y<e.endY-160*PX_PER_M*e.scale;y+=spacing,i++){
      // Alternate the invitation to jump, leaving a clear approach to the tree and mistletoe.
      if(Math.abs(y-plaza.y)<65*PX_PER_M*e.scale)continue;
      const jump=createArcadeItem('rainbow',town.x+[-.45,0,.45][i%3]*e.half,y,section);jump.town=town;jump.encounter=e;
    }
    e.nextSleighY=e.startY+80*PX_PER_M*e.scale;
  }else{
    const points=e.paths[0],lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));e.cemeteryRoute={points,lengths,length:lengths.at(-1)};
    const width=town.mausoleumWidth;
    e.mausoleum=entity('mausoleum',plaza.x,plaza.y,{...own,width,r:width*S.village.houseFootWidthRatio,grandMausoleum:true,waveSize:Math.round(mix(...S.endless.regions.cemetery.mausoleum.count,e.difficulty)),released:0});
    for(let i=0,n=Math.round(mix(12,20,e.difficulty));i<n;i++){
      const angle=i*2.399963,p={x:plaza.x+Math.cos(angle)*(180+i%3*30),y:plaza.y+180+Math.sin(angle)*65};
      if(!clearFestivalSpot(e,p,14))continue;
      festivalGuest(town,p,i,{...own,walker:true,path:[p,{x:p.x+Math.cos(angle+.5)*45,y:p.y+35}],pathIndex:1,pathDir:1,walkSpeed:range(8,15)});
    }
    // Ordinary cemetery roles, including visibly resting skeleton jumpers and grave wake waves.
    for(const [role,n] of [['wanderer',Math.round(mix(...F.zombies,e.difficulty))],['ambusher',Math.round(mix(...F.skeletons,e.difficulty))]])for(let i=0;i<n;i++){
      let p;
      for(let j=0;j<9;j++){p=festivalPoint(e,(i+.5)/n,Math.sin(i*2.4)*.9,i%4===0?1:0);p.y+=(j-4)*28;if(clearFestivalSpot(e,p,40)&&!mausoleumForecourt(e,p.x,p.y,30))break;p=null;}
      if(!p)continue;
      const g=entity('grave',p.x+(i%2?34:-34),p.y-22,{...own,width:28,r:9,style:i%6});
      const z=entity('zombie',p.x,p.y,{...own,width:[32,36,30,34][i%4],r:10,zombieRole:role,zombieStyle:role==='ambusher'?2:i%4,zombieState:'resting',hideGrave:g,homeX:p.x,homeY:p.y,awake:false,zombieBaseKmh:mix(...(role==='wanderer'?S.endless.regions.zombies.wandererSpeedKmh:S.endless.regions.zombies.speedKmh),e.difficulty)});g.restingOccupant=z;z.homeAlong=cemeteryProjection(e,z.x,z.y).along;
      if(role==='wanderer'&&i%3===0){z.zombieState='wandering';z.zombieRoamer=true;z.wanderTarget={x:p.x+30,y:p.y+60};}
    }
  }
  // A finite authored cast in these towns; ordinary safe towns remain protected from new spawns.
  for(const [kind,n] of [['lurker',Math.round(mix(...F.yetis,e.difficulty))],['wolf',Math.round(mix(...F.wolves,e.difficulty))]])for(let i=0;i<n;i++){
    let p;
    for(let j=0;j<12;j++){p=festivalPoint(e,(i+.65)/(n+.3),(i%2?1:-1)*(.45+j*.035));p.y+=j*26;if(clearFestivalSpot(e,p,30))break;p=null;}
    if(!p)continue;
    const speed=mix(...S.endless.yetis.speedKmh,e.difficulty),scale=e.scale;
    entity(kind,p.x,p.y,{...own,width:kind==='wolf'?43:55,r:kind==='wolf'?11:18,animal:kind==='wolf',wolfAwake:false,linkedChase:false,alertUntil:0,nextAI:clock+2,packId:'festival-'+e.id+'-'+Math.floor(i/2),packIndex:i%2,yetiSpeedKmh:speed*scale,endlessBaseKmh:speed,wakeSeconds:S.endless.yetis.wakeSeconds});
  }
}
function sleighMotion(o,dt){
  const e=o.encounter,y=Math.min(e.endY,o.y+180*e.scale),lane=Math.sin(clock*.48+o.phase)*e.half*.45;
  const x=encounterPathX(e.paths[0],y)+lane,target=topSpeed()*o.sleighPace;
  o.sleighSpeed=Math.min(target,(o.sleighSpeed||topSpeed()*.7)+220*e.scale*dt);
  const vx=clamp((x-o.x)*1.1,-target*.36,target*.36);return {vx,vy:Math.sqrt(Math.max(0,o.sleighSpeed**2-vx**2))};
}
function updateChristmasYetis(e,dt){
  const p=state.p,Y=S.endless.regions.festivals.christmasParade.sideYetis;
  if(p.y<e.startY||p.y>=e.endY||Math.abs(p.x-e.town.x)>e.band)return;
  e.sideYetiElapsed=(e.sideYetiElapsed||0)+dt;
  e.nextSideYetiAt??=Y.delaySeconds;e.sideYetiCount??=0;
  if(e.sideYetiElapsed+1e-8<e.nextSideYetiAt||e.sideYetiCount>=Math.round(mix(...Y.count,e.difficulty)))return;
  const nearby=state.chasers.filter(c=>c.christmasArrival&&!c.dead&&!c.leaving&&Math.hypot(c.x-p.x,c.y-p.y)<S.endless.yetis.nearbyMetres*PX_PER_M*state.endless.speedScale).length;
  if(nearby>=Y.maxNearby){e.nextSideYetiAt=e.sideYetiElapsed+1;return;}
  const number=e.sideYetiCount,side=number%2?1:-1,fast=number%4===1||number%4===2,base=fast?Y.fastSpeedKmh:Y.slowSpeedKmh;
  const speed=base*state.endless.speedScale/S.physics.hudKmhPerSpeed,crossing=(e.half+120)/(speed*S.predators.offDownhillSpeedRatio)+.35;
  const lead=clamp(Math.max(p.vy,topSpeed()*.7)*crossing,220,900),goal=p.y+lead;
  let entry=null,best=Infinity;
  for(const point of e.sideYetiEntries){
    if(point.side!==side||point.gapY<p.y+140||point.gapY>e.endY-220)continue;
    const distance=Math.abs(point.gapY-goal);if(distance<best){entry=point;best=distance;}
  }
  if(!entry){e.nextSideYetiAt=e.sideYetiElapsed+1;return;}
  state.chasers.push({kind:fast?'fast':'slow',arcadeTier:fast?'fast':'slow',endlessBaseKmh:base,speed,x:entry.x,y:entry.y,chaseRun:state.course,christmasArrival:e.id,christmasEntry:{encounter:e,x:entry.insideX,y:entry.gapY},phase:range(0,TAU),id:random(),expires:Infinity,talkAt:clock+6});
  e.sideYetiCount++;e.nextSideYetiAt=e.sideYetiElapsed+(e.sideYetiCount%2?Y.staggerSeconds:Y.intervalSeconds);
}
function christmasYetiEntryTarget(c){
  const entry=c.christmasEntry;if(!entry)return null;
  if(Math.abs(c.x-entry.encounter.town.x)<=entry.encounter.half-24){c.christmasEntry=null;return null;}
  return entry;
}
function updateFestivalTraffic(dt){
  if(!state.endless||!state.started)return;
  const p=state.p,F=S.endless.regions.festivals;
  for(const e of state.endless.encounters){
    if(e.kind==='christmas')updateChristmasYetis(e,dt);
    if(e.kind!=='christmas'||p.y<e.nextSleighY||p.y>e.endY-320)continue;
    e.nextSleighY=p.y+F.sleighEveryMetres*PX_PER_M*e.scale;
    const y=p.y-320*e.scale,x=encounterPathX(e.paths[0],clamp(y,e.startY,e.endY));
    const root=entity('skier',x,y,{arcadeRun:state.course,encounter:e,town:e.town,width:76,r:24,santaSleigh:true,sleighPace:range(.99,1.07),sleighSpeed:topSpeed()*.85,vy:topSpeed(),vx:0});
    root.team=[];
    for(let row=0;row<F.reindeerPairs;row++)for(const side of [-1,1])root.team.push(entity('boarder',x+side*27,y+90+row*70,{arcadeRun:state.course,encounter:e,town:e.town,width:40,r:15,reindeer:true,sleighRoot:root,teamRow:row,teamSide:side,vy:topSpeed(),vx:0}));
    say('HO HO HOLD MY COCOA!',root,2);
  }
}
function updateSleighTeams(dt){
  for(const root of objectGroups().sleighs){
    if(!root.santaSleigh)continue;
    for(const o of root.team){
      if(o.eaten||o.dead)continue;
      if(root.eaten||root.dead){o.sleighRoot=null;continue;}
      if(o.npcFallUntil>clock&&!(root.npcFallUntil>clock))crashSkier(root,o);
      if(root.npcFallUntil>clock){o.motionVx=o.motionVy=o.travelSpeed=0;o.travelStamp=clock;continue;}
      o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
      const y=root.y+90+o.teamRow*70,x=root.x+(encounterPathX(root.encounter.paths[0],Math.min(root.encounter.endY,y))-encounterPathX(root.encounter.paths[0],Math.min(root.encounter.endY,root.y)))+o.teamSide*27;
      o.x=ease(o.x,x,7,dt);o.y=y;o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;o.travelSpeed=Math.hypot(o.motionVx,o.motionVy);o.travelStamp=clock;
    }
  }
}
function tryMistletoe(o){
  if(o.type!=='mistletoe'||o.town.kissClaimed||o.partner?.eaten||o.partner?.dead||state.sceneCard||state.deathTimer)return false;
  const p=state.p,a=state.endless||state.arcade;if(!a||p.air>0||p.fall||p.awaitingInput||Math.hypot(p.x-o.x,p.y-o.y)>52||o.partner&&Math.hypot(p.x-o.partner.x,p.y-o.partner.y)>42)return false;
  o.town.kissClaimed=true;a.swords++;save();burst(o.x,o.y,'#e5a0b2',20);
  showSceneCard('mistletoe','A LITTLE MISTLETOE MAGIC','A kiss, a lucky sword, and back to the party.');return true;
}
const festivalGuestTiles=new Map(),festivalGuestAtlas=document.createElement('canvas');
festivalGuestAtlas.width=512;festivalGuestAtlas.height=528;const festivalGuestCtx=festivalGuestAtlas.getContext('2d');
function festivalGuestFrame(kind,skinIndex,step){
  const key=kind+':'+skinIndex+':'+step,santa=kind==='santa';let tile=festivalGuestTiles.get(key);
  if(!tile){
    if(festivalGuestTiles.size>=192){festivalGuestTiles.clear();festivalGuestCtx.clearRect(0,0,512,528);}
    const slot=festivalGuestTiles.size;tile={x:slot%16*32,y:Math.floor(slot/16)*44};const t=festivalGuestCtx;t.save();t.translate(tile.x,tile.y);
    const px=(x,y,w,h,color)=>{t.fillStyle=gritMaterial(color);t.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const skin=['#e2b68b','#b98465','#f0cbaa'][skinIndex];
    const coat={velvet:'#386b58',evening:'#813e65',tuxedo:'#314556',furCoat:'#b5a28a',witch:'#57456c',vampire:'#643641',pumpkin:'#d27938',ghost:'#e5e5d9',skeletonSuit:'#35404a',santa:'#b4444a'}[kind];
    const x=16,y=40,half=santa?9:5,bob=step>0?-1:0;
    for(const side of [-1,1]){px(x+side*(santa?4:2)-1,y-4+(step*side>0?1:0),3,5,'#283c49');px(x+side*(santa?4:2)-2,y+(step*side>0?1:0),4,2,'#223342');}
    px(x-half+1,y-18+bob,half*2-2,14,santa?'#803642':coat);px(x-half,y-14+bob,half*2,9,coat);
    px(x-half-2,y-15+bob,3,9,coat);px(x+half-1,y-15+bob,3,9,coat);
    for(const side of [-1,1])px(x+side*(half+1)-1,y-7+bob+Math.round(step*side),2,3,skin);
    px(x-3,y-25+bob,6,7,skin);px(x-3,y-26+bob,6,2,'#755443');px(x+2,y-23+bob,1,1,'#33404a');
    if(santa){
      px(x-4,y-29+bob,7,5,'#b4444a');px(x-5,y-25+bob,10,2,'#fff0d9');px(x+3,y-28+bob,3,3,'#fff0d9');
      px(x-4,y-20+bob,8,5,'#f4ecd8');px(x-2,y-15+bob,4,2,'#f4ecd8');px(x-half,y-9,half*2,3,'#303d43');px(x-2,y-9,4,3,'#d2ad59');px(x-1,y-8,2,1,'#5f5444');px(x-half+1,y-5,half*2-2,2,'#eee4ce');
    }else if(kind==='tuxedo'){px(x-2,y-18+bob,4,7,'#efe6d1');px(x-3,y-17+bob,6,2,'#a85260');px(x-1,y-14+bob,2,7,'#e8dbbd');}
    else if(kind==='evening'){px(x-5,y-9,10,7,coat);px(x-4,y-27+bob,7,2,'#b79b58');px(x+3,y-21+bob,1,2,'#d6b85b');px(x-4,y-18+bob,9,2,'#e6d6b5');}
    else if(kind==='furCoat'){px(x-5,y-18+bob,10,3,'#efe6d1');px(x-3,y-28+bob,7,4,'#d6c5a8');px(x-1,y-14+bob,1,8,'#725b50');}
    else if(kind==='witch'){px(x-7,y-25+bob,14,2,'#333248');px(x-4,y-29+bob,8,4,'#403448');px(x-2,y-34+bob,4,6,'#403448');px(x-1,y-36+bob,2,3,'#403448');px(x-4,y-27+bob,8,2,'#bd7d47');}
    else if(kind==='vampire'){px(x-7,y-20+bob,3,13,'#393346');px(x+4,y-20+bob,3,13,'#393346');px(x-2,y-18+bob,4,7,'#eee2c6');px(x-2,y-18+bob,4,2,'#b14858');}
    else if(kind==='pumpkin'){px(x-6,y-17+bob,12,10,'#dc8b41');for(const side of [-1,1])px(x+side*3-1,y-14+bob,2,2,'#4b3c3e');px(x-2,y-10+bob,4,1,'#4b3c3e');px(x-3,y-28+bob,7,3,'#d27938');px(x,y-30+bob,2,3,'#50734f');}
    else if(kind==='ghost'){px(x-5,y-27+bob,10,8,'#e7e9de');px(x-3,y-24+bob,6,5,skin);px(x-6,y-6,12,3,'#e7e9de');}
    else if(kind==='skeletonSuit'){px(x-1,y-17+bob,2,11,'#d6d9cc');for(let i=0;i<3;i++)px(x-4,y-16+bob+i*3,8,1,'#d6d9cc');px(x-3,y-27+bob,6,2,'#bbc6c1');}
    else{px(x-5,y-20+bob,10,3,'#d6b263');px(x+3,y-18+bob,2,5,'#d6b263');}
    t.restore();gritTextureNative(t,tile.x,tile.y,32,44);festivalGuestTiles.set(key,tile);
  }
  return tile;
}
function warmFestivalGuestAtlas(kind){
  const styles=kind==='christmas'?['santa','velvet','evening','tuxedo','furCoat']:['witch','vampire','pumpkin','ghost','skeletonSuit'];
  for(const style of styles)for(let skin=0;skin<3;skin++)for(const step of [-1,-.25,0,.25,1])festivalGuestFrame(style,skin,step);
}
function drawFestivalGuest(o,s){
  const raw=o.walking?Math.sin(o.walkCycle||0):0,step=raw===0?0:Math.sign(raw)*(Math.abs(raw)>=.5?1:.25);
  const tile=festivalGuestFrame(o.costume,Math.floor(o.phase*3)%3,step),x=Math.round(s.x),y=Math.round(s.y);
  shadow(x,y,o.costume==='santa'?11:7,2);ctx.drawImage(festivalGuestAtlas,tile.x,tile.y,32,44,x-16,y-40,32,44);
}
function drawFestivalHouse(o,s,paint={box,line}){
  const {box,line}=paint;
  if(!o.festival)return;
  const w=o.width*ZOOM,y=s.y-w*.48,christmas=o.festival==='christmas';
  line(s.x-w*.38,y,s.x,y+5,christmas?'#416654':'#51445d',2);line(s.x,y+5,s.x+w*.38,y,christmas?'#416654':'#51445d',2);
  for(let i=0;i<9;i++){const x=s.x-w*.36+i*w*.09,yy=y+Math.sin(i/8*Math.PI)*5;box(x,yy,2,3,(christmas?['#b44c55','#d6ba6e','#5d9a76','#7897b4']:['#d88c46','#b198c6','#d88c46'])[i%(christmas?4:3)]);}
  if(christmas){box(s.x-3,y+4,6,6,'#46735b');box(s.x-1,y+6,2,2,'#b94c59');}
  else{const x=s.x-w*.3,by=s.y-w*.7;line(x,by,x+13,by+8,'#c0bdc9');line(x,by,x+2,by+15,'#c0bdc9');line(x+2,by+6,x+8,by+5,'#c0bdc9');line(x+3,by+11,x+12,by+8,'#c0bdc9');box(s.x+w*.24,s.y-w*.21,7,5,'#d87e37');box(s.x+w*.24+1,s.y-w*.21+1,1,1,'#efd891');box(s.x+w*.24+4,s.y-w*.21+1,1,1,'#efd891');}
}
function drawSeasonalProp(o,s){
  if(o.eaten||o.dead)return false;
  if(o.costume){drawFestivalGuest(o,s);return true;}
  if(o.type==='paradeGarland'){
    const width=Math.round(o.width*ZOOM),half=width/2;
    const tile=specialTile('parade-garland:'+width,width+16,40,(t,px)=>{
      const x=(width+16)/2,y=7;
      t.strokeStyle=gritMaterial('#3b6b53');t.lineWidth=3;
      for(let i=0;i<12;i++){const a=i/12,b=(i+1)/12;t.beginPath();t.moveTo(x-half+a*width,y+Math.sin(a*Math.PI)*14);t.lineTo(x-half+b*width,y+Math.sin(b*Math.PI)*14);t.stroke();}
      for(let i=1;i<12;i++){const xx=x-half+i/12*width,yy=y+Math.sin(i/12*Math.PI)*14;px(xx-1,yy,3,4,['#cf6870','#e5c477','#7fa790'][i%3]);}
      for(const side of [-1,1]){const xx=x+side*half*.5;px(xx-6,y+8,5,5,'#b74d59');px(xx+1,y+8,5,5,'#b74d59');px(xx-1,y+8,3,9,'#dfb66e');}
    });
    ctx.drawImage(tile,Math.round(s.x)-tile.width/2,Math.round(s.y)-60);return true;
  }
  if(o.type==='christmasTree'){
    const tile=specialTile('christmas-tree',96,138,(t,px,poly)=>{
      px(44,117,9,17,'#705943');px(39,128,21,5,'#957251');
      for(let row=4;row>=0;row--){const y=20+row*20,half=13+row*8;poly([[48,y-17],[48-half,y+23],[48+half,y+23]],row%2?'#2f644f':'#396f57');for(let i=0;i<5;i++)px(48-half+i*half*.45,y+19,5,2,'#d8e7da');}
      for(let i=0;i<28;i++){const y=25+(i*29)%88,half=12+(y-20)*.36,x=48+Math.sin(i*2.4)*half*.8;px(x,y,3,3,['#d8b35d','#bd5a63','#779fb3','#c4bb7b'][i%4]);px(x,y-1,1,1,'#f4dd9e');}
      px(47,0,3,17,'#e6c76b');px(41,7,15,3,'#e6c76b');px(44,4,9,9,'#f2dd9d');px(40,10,4,3,'#bf9952');px(53,10,4,3,'#bf9952');
      for(let i=0;i<5;i++){const x=17+i*14,y=124+(i%2)*5;px(x,y,11,8,['#a34d57','#487865','#a7874d'][i%3]);px(x+5,y,2,8,'#dec48b');px(x-1,y,13,2,'#e7d2a7');}
    });shadow(s.x,s.y,55,7);ctx.drawImage(tile,Math.round(s.x-60),Math.round(s.y-170),120,172);return true;
  }
  if(o.type==='holidayGift'){box(s.x-5,s.y-9,11,9,['#a64c54','#477964','#b69a58'][o.style]);box(s.x-1,s.y-9,2,9,'#e8d5a9');box(s.x-6,s.y-10,13,3,'#dbc49b');box(s.x-3,s.y-13,3,3,'#d3b579');box(s.x+1,s.y-13,3,3,'#d3b579');return true;}
  if(o.type==='jackLantern'){box(s.x-6,s.y-10,12,8,'#a95835');box(s.x-5,s.y-12,10,11,'#d58b41');box(s.x-1,s.y-15,3,4,'#4d6b4c');for(const side of [-1,1])box(s.x+side*3-1,s.y-9,2,2,'#f3d285');box(s.x-3,s.y-4,6,1,'#f3d285');box(s.x-1,s.y-5,2,2,'#f3d285');return true;}
  if(o.type==='mistletoe'){
    const claimed=o.town.kissClaimed;for(const side of [-1,1]){box(s.x+side*19-1,s.y-39,3,42,'#806550');box(s.x+side*20-3,s.y-42,7,4,'#e5eee3');}
    line(s.x-20,s.y-41,s.x,s.y-48,'#806550',4);line(s.x,s.y-48,s.x+20,s.y-41,'#806550',4);
    for(let i=-2;i<=2;i++){box(s.x+i*4,s.y-42+Math.abs(i)*2,5,3,'#49775c');box(s.x+i*4+1,s.y-41+Math.abs(i)*2,1,1,'#f0e3bb');}
    if(!claimed&&o.partner&&!o.partner.eaten&&!o.partner.dead&&Math.hypot(o.partner.x-o.x,o.partner.y-o.y)<70){const y=s.y-57+Math.round(Math.sin(clock*3)*2);box(s.x-4,y,3,3,'#d4778e');box(s.x+1,y,3,3,'#d4778e');box(s.x-3,y+2,6,3,'#d4778e');box(s.x-1,y+5,2,2,'#d4778e');if(Math.sin(clock*7)>.2){box(s.x-12,y-1,1,5,'#e1bf72');box(s.x-14,y+1,5,1,'#e1bf72');}}
    return true;
  }
  if(o.santaSleigh){
    const fallen=o.npcFallUntil>clock;ctx.save();ctx.translate(s.x,s.y);if(fallen)ctx.rotate(.32);line(-18,4,20,4,'#c9ae6e',2);line(-18,4,-23,0,'#c9ae6e',2);box(-19,-9,37,10,'#873b49');box(-17,-10,33,6,'#b55259');box(-18,-18,5,15,'#873b49');box(-12,-20,14,11,'#b64a51');box(-11,-26,12,8,'#e0b383');box(-12,-22,14,6,'#eee5ce');box(-11,-28,11,3,'#b64a51');box(-13,-26,15,2,'#eee5ce');box(6,-20,14,11,'#50755a');box(9,-22,9,4,'#b8a16e');box(-7,-12,9,2,'#d1af6b');ctx.restore();
    for(const d of o.team||[])if(!d.eaten&&!d.dead){const to=screen(d.x,d.y);line(s.x+(d.teamSide*9),s.y-5,to.x,to.y-5,'#a99165');}return true;
  }
  if(o.reindeer){
    ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y));if(o.npcFallUntil>clock)ctx.rotate(Math.PI*.35);
    const stride=Math.sin(clock*11+o.phase);box(-5,-13,10,10,'#92704e');box(-3,-12,6,9,'#b08b60');box(-4,-20,8,8,'#a47f55');box(-2,-14,5,4,'#d5c5a0');box(3,-17,4,3,'#685340');box(5,-16,2,2,o.teamRow===2?'#bc4d59':'#373d40');box(-3,-25,2,7,'#776347');box(2,-25,2,7,'#776347');box(-6,-26,4,2,'#776347');box(3,-26,4,2,'#776347');box(-5,-29,1,4,'#776347');box(5,-29,1,4,'#776347');
    for(const side of [-1,1]){box(side*3-1,-4,2,5+(stride*side>0?1:0),'#654f3b');box(side*5-1,-7,2,5+(stride*side<0?1:0),'#654f3b');}box(-5,-11,10,2,'#a9444a');box(-1,-11,2,3,'#d9b362');ctx.restore();return true;
  }
  return false;
}
// Static light is cached in world coordinates. Moving bodies are lit every render.
const NIGHT_TILE_SIZE=256,NIGHT_LIGHT_RESOLUTION=4,NIGHT_TILE_LIMIT=96;
const NIGHT_STATIC_TYPES=new Set(['lamp','lodge','rental','mausoleum','iceBlock','ruinWall','gate','entrance','finish','courseStart','raceRail','christmasTree','paradeGarland','jackLantern','mistletoe','ramp','rainbow','lift','liftLabel','trailChoices']);
const nightMask=document.createElement('canvas'),nightMaskCtx=nightMask.getContext('2d'),nightGlow=document.createElement('canvas'),nightGlowCtx=nightGlow.getContext('2d');
const nightTileGlow=document.createElement('canvas'),nightTileGlowCtx=nightTileGlow.getContext('2d');
nightTileGlow.width=nightTileGlow.height=NIGHT_TILE_SIZE/NIGHT_LIGHT_RESOLUTION;
const lightTiles=new Map(),nightLightObjects=new Map(),nightLightBuckets=new Map(),nightStaticTiles=new Map(),nightTilePool=[];
let nightLightEpoch=0,nightLightSerial=0;
const nightLightingStats={tileBuilds:0,tileHits:0,staticSources:0,dynamicSources:0};
function resetNightLighting(){
  for(const tile of nightStaticTiles.values())if(nightTilePool.length<NIGHT_TILE_LIMIT)nightTilePool.push(tile.canvas);
  nightStaticTiles.clear();nightLightObjects.clear();nightLightBuckets.clear();
  nightLightingStats.staticSources=nightLightingStats.dynamicSources=0;
}
function glowTile(color='white'){
  if(lightTiles.has(color))return lightTiles.get(color);
  const tile=document.createElement('canvas');tile.width=tile.height=128;const t=tile.getContext('2d'),g=t.createRadialGradient(64,64,0,64,64,64);
  const rgb=color==='white'?[255,255,255]:[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  // Gaussian spill keeps a similar bright area, then a much longer dim penumbra.
  // Taper only the nearly invisible final quarter to remove the texture boundary.
  for(let i=0;i<=64;i++){const r=i/64,u=clamp((r-.75)/.25,0,1),alpha=Math.exp(-7*r*r)*(1-u*u*(3-2*u));g.addColorStop(r,'rgba('+rgb.join(',')+','+alpha+')');}
  t.fillStyle=g;t.fillRect(0,0,128,128);lightTiles.set(color,tile);return tile;
}
function appendNightLights(o,lights){
  if(o.dead||o.eaten||o.collected)return;
  const x=o.x*ZOOM,y=o.y*ZOOM,w=(o.width||40)*ZOOM;
  const add=(px,py,r,color='#ffc277',strength=1,core=false)=>{const light={x:px,y:py,r:r*S.night.lightReachMultiplier,color,strength,core};lights.push(light);return light;};
  if(o===state.p){const lift=o.air>0&&o.airTotal?Math.sin(o.air/o.airTotal*Math.PI)*o.jumpHeight*ZOOM:0;add(x,y-8-lift,S.night.playerRadiusMetres*PX_PER_M*ZOOM,'#efc48b');}
  else if(o.type==='lamp')add(x,y-22,(o.lightRadiusWorld??S.night.lampRadiusMetres*PX_PER_M)*ZOOM,'#ffbd70',1,true);
  else if(o.grandMausoleum){add(x-w*.35,y-w*.35,58,'#dcb0a1',1,true);add(x+w*.35,y-w*.35,58,'#dcb0a1',1,true);}
  else if(o.paradeBoundary)add(x,y-houseFootDepth(o)*ZOOM/2,Math.max(w*.8+12,houseFootDepth(o)*ZOOM*.6),'#ffc277');
  else if(HOUSE_TYPES.has(o.type)){
    add(x,y-w*.34,w*.8+12,'#ffc277');for(const side of [-1,1])add(x+side*w*.19,y-w*.25,20,'#ffd28d',.9,true);
    if(o.festival)for(const side of [-1,0,1])add(x+side*w*.3,y-w*.49,30,o.festival==='christmas'?(side?'#ffb784':'#bfce9c'):'#d7acc5',.8,true);
  }else if(['gate','entrance','finish'].includes(o.type)){
    for(const side of [-1,1])add(x+side*(o.half??(o.width||80)/2)*ZOOM,y-27,43,'#ffd18b',1,true);
  }else if(o.type==='courseStart'||o.type==='raceRail')add(x,y-8,38,'#eac28c',.95,true);
  else if(o.type==='skier'||o.type==='boarder')add(x,y-10,S.night.skierRadiusMetres*PX_PER_M*ZOOM,'#edc890');
  else if(o.type==='christmasTree'){
    add(x,y-80,128,'#eac28b');add(x,y-165,42,'#ffda87',1,true).star=true;
    for(let i=0;i<12;i++)add(x+Math.sin(i*2.4)*(12+i*3),y-135+i*10,22,['#ffb692','#d2a1c8','#bfda9a','#f9cf85'][i%4],1,true);
  }else if(o.type==='paradeGarland'){
    for(let i=1;i<12;i++)add(x-w/2+i/12*w,y-53+Math.sin(i/12*Math.PI)*14,26,['#ecaa96','#f4d08b','#bfd1a1'][i%3],.8,true);
  }else if(o.type==='jackLantern')add(x,y-6,44,'#ffab5b',1,true);
  else if(o.type==='mistletoe')add(x,y-24,60,'#eeb0b3');
  else if(['ramp','rainbow','lift','liftLabel','trailChoices'].includes(o.type))add(x,y-10,40,'#e8c18d',1,true);
}
function nightLights(layers){
  const lights=[];appendNightLights(state.p,lights);for(const o of layers)if(o!==state.p)appendNightLights(o,lights);
  return lights.map(l=>({...l,x:l.x-state.cam.x*ZOOM+W/2,y:l.y-state.cam.y*ZOOM}));
}
function removeNightLightEntry(entry){
  for(const source of entry.sources)for(const key of source.cells){
    const bucket=nightLightBuckets.get(key);if(!bucket)continue;bucket.sources.delete(source.id);bucket.version++;
    if(!bucket.sources.size){
      nightLightBuckets.delete(key);const old=nightStaticTiles.get(key);
      if(old){nightStaticTiles.delete(key);if(nightTilePool.length<NIGHT_TILE_LIMIT)nightTilePool.push(old.canvas);}
    }
  }
}
function syncNightStaticLights(){
  const epoch=++nightLightEpoch;
  for(const o of state.objects){
    if(!NIGHT_STATIC_TYPES.has(o.type)||o.dead||o.eaten||o.collected)continue;
    const old=nightLightObjects.get(o);
    if(old&&old.x===o.x&&old.y===o.y&&old.width===o.width&&old.half===o.half&&old.type===o.type&&old.festival===o.festival&&old.grand===o.grandMausoleum&&old.lampRadius===S.night.lampRadiusMetres&&old.lightRadiusWorld===o.lightRadiusWorld&&old.lightReachMultiplier===S.night.lightReachMultiplier){old.seen=epoch;continue;}
    if(old)removeNightLightEntry(old);
    const sources=[];appendNightLights(o,sources);
    for(const source of sources){
      source.id=++nightLightSerial;source.cells=[];
      for(let y=Math.floor((source.y-source.r)/NIGHT_TILE_SIZE);y<=Math.floor((source.y+source.r)/NIGHT_TILE_SIZE);y++)for(let x=Math.floor((source.x-source.r)/NIGHT_TILE_SIZE);x<=Math.floor((source.x+source.r)/NIGHT_TILE_SIZE);x++){
        const key=x+','+y;let bucket=nightLightBuckets.get(key);if(!bucket){bucket={x,y,version:0,sources:new Map()};nightLightBuckets.set(key,bucket);}
        bucket.sources.set(source.id,source);bucket.version++;source.cells.push(key);
      }
    }
    nightLightObjects.set(o,{x:o.x,y:o.y,width:o.width,half:o.half,type:o.type,festival:o.festival,grand:o.grandMausoleum,lampRadius:S.night.lampRadiusMetres,lightRadiusWorld:o.lightRadiusWorld,lightReachMultiplier:S.night.lightReachMultiplier,sources,seen:epoch});
  }
  let count=0;for(const [o,entry] of nightLightObjects)if(entry.seen!==epoch){removeNightLightEntry(entry);nightLightObjects.delete(o);}else count+=entry.sources.length;
  nightLightingStats.staticSources=count;
}
function staticNightTile(key,bucket){
  let cached=nightStaticTiles.get(key);
  if(cached&&cached.version===bucket.version){nightStaticTiles.delete(key);nightStaticTiles.set(key,cached);nightLightingStats.tileHits++;return cached.canvas;}
  let tile=cached?.canvas;
  if(!tile){
    tile=nightTilePool.pop();
    if(!tile&&nightStaticTiles.size>=NIGHT_TILE_LIMIT){const oldest=nightStaticTiles.keys().next().value;tile=nightStaticTiles.get(oldest).canvas;nightStaticTiles.delete(oldest);}
    if(!tile){tile=document.createElement('canvas');tile.width=tile.height=NIGHT_TILE_SIZE/NIGHT_LIGHT_RESOLUTION;}
  }
  const t=tile.getContext('2d'),res=NIGHT_LIGHT_RESOLUTION,left=bucket.x*NIGHT_TILE_SIZE,top=bucket.y*NIGHT_TILE_SIZE,hole=glowTile(),glow=nightTileGlowCtx;
  t.globalAlpha=1;t.globalCompositeOperation='source-over';t.fillStyle='#09162a';t.fillRect(0,0,tile.width,tile.height);t.globalCompositeOperation='destination-out';glow.clearRect(0,0,tile.width,tile.height);
  for(const l of bucket.sources.values()){
    const x=(l.x-l.r-left)/res,y=(l.y-l.r-top)/res,size=l.r*2/res;t.globalAlpha=l.strength;t.drawImage(hole,x,y,size,size);
    glow.globalAlpha=l.strength;glow.drawImage(glowTile(l.color),x,y,size,size);
  }
  glow.globalAlpha=1;t.globalCompositeOperation='source-over';t.globalAlpha=.24;t.drawImage(nightTileGlow,0,0);t.globalAlpha=1;
  cached={canvas:tile,version:bucket.version};nightStaticTiles.delete(key);nightStaticTiles.set(key,cached);nightLightingStats.tileBuilds++;return tile;
}
function nightSnowColor(){
  const amount=state.nightBlend||0;if(amount<.003)return C.snow;
  const day=C.snow.slice(1),rgb=[0,2,4].map(i=>parseInt(day.slice(i,i+2),16));
  return 'rgb('+rgb.map((v,i)=>Math.round(mix(v,[150,148,143][i],amount))).join(',')+')';
}
function drawNightLighting(layers){
  const blend=state.nightBlend||0;if(blend<.003)return;
  syncNightStaticLights();
  const res=NIGHT_LIGHT_RESOLUTION,mw=Math.ceil(W/res)+4,mh=Math.ceil(H/res)+4;
  if(nightMask.width!==mw||nightMask.height!==mh){nightMask.width=nightGlow.width=mw;nightMask.height=nightGlow.height=mh;}
  const viewLeft=state.cam.x*ZOOM-W/2,viewTop=state.cam.y*ZOOM,left=Math.floor(viewLeft/res)*res-res,top=Math.floor(viewTop/res)*res-res;
  const t=nightMaskCtx,glow=nightGlowCtx,cores=new Map();t.globalCompositeOperation='source-over';t.globalAlpha=1;t.fillStyle='#09162a';t.fillRect(0,0,mw,mh);
  // Tile composition stays on the same world pixel grid, including across tile boundaries.
  for(let y=Math.floor(top/NIGHT_TILE_SIZE);y<=Math.floor((top+mh*res)/NIGHT_TILE_SIZE);y++)for(let x=Math.floor(left/NIGHT_TILE_SIZE);x<=Math.floor((left+mw*res)/NIGHT_TILE_SIZE);x++){
    const key=x+','+y,bucket=nightLightBuckets.get(key);if(!bucket)continue;
    const tileX=(x*NIGHT_TILE_SIZE-left)/res,tileY=(y*NIGHT_TILE_SIZE-top)/res;
    t.clearRect(tileX,tileY,NIGHT_TILE_SIZE/res,NIGHT_TILE_SIZE/res);t.drawImage(staticNightTile(key,bucket),tileX,tileY);
    for(const l of bucket.sources.values())if(l.core)cores.set(l.id,l);
  }
  const dynamic=[];appendNightLights(state.p,dynamic);
  for(const o of layers)if(o!==state.p&&(o.type==='skier'||o.type==='boarder'))appendNightLights(o,dynamic);
  t.globalCompositeOperation='destination-out';const hole=glowTile();glow.clearRect(0,0,mw,mh);
  for(const l of dynamic){
    if(l.x+l.r<viewLeft||l.x-l.r>viewLeft+W||l.y+l.r<viewTop||l.y-l.r>viewTop+H)continue;
    const x=(l.x-l.r-left)/res,y=(l.y-l.r-top)/res,size=l.r*2/res;t.globalAlpha=l.strength;t.drawImage(hole,x,y,size,size);glow.globalAlpha=l.strength;glow.drawImage(glowTile(l.color),x,y,size,size);
  }
  glow.globalAlpha=1;t.globalCompositeOperation='source-over';t.globalAlpha=.24;t.drawImage(nightGlow,0,0);t.globalAlpha=1;nightLightingStats.dynamicSources=dynamic.length;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=S.night.ambientOpacity*blend;ctx.drawImage(nightMask,left-viewLeft,top-viewTop,mw*res,mh*res);
  ctx.imageSmoothingEnabled=false;ctx.globalAlpha=blend;
  for(const l of cores.values()){
    const x=l.x-viewLeft,y=l.y-viewTop;if(x< -6||x>W+6||y< -6||y>H+6)continue;
    if(l.star){box(x-1,y-5,2,10,'#ffda87');box(x-5,y-1,10,2,'#ffda87');box(x-2,y-2,4,4,'#ffe2a2');}else box(x-1,y-1,2,2,l.color);
  }
  ctx.restore();
}
