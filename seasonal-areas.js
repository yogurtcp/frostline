/* Holiday towns and shared day/night lighting. Embedded by build.py. */
const FESTIVAL_KINDS=new Set(['christmas','halloween']);
function isNight(){
  if(!S.night.enabled)return false;
  if(state.nightOverride!==null)return state.nightOverride;
  return !!(S.night.dayNightRounds&&state.endless&&(endlessEncounterAt(state.p.y)?.night??state.endless.nightPhase));
}
function toggleDayNight(){
  if(!ready||!S.night.enabled||state.sceneCard||state.deathTimer||state.liftTimer)return false;
  state.nightOverride=!isNight();state.nightBlend=state.nightOverride?1:0;nightMaskStamp=-Infinity;
  announce(state.nightOverride?'NIGHT FALLS':'DAYLIGHT','',C.teal,1.5);render();return true;
}
function updateDayNight(dt){
  const area=state.endless&&endlessEncounterAt(state.p.y);if(area)state.endless.nightPhase=area.night;
  state.nightBlend=ease(state.nightBlend||0,isNight()?1:0,4/S.night.transitionSeconds,dt);
}
function addRouteLamps(path,town,from,to,encounter=null){
  if(!path?.length)return;
  const spacing=S.night.lampSpacingMetres*PX_PER_M,roadWidth=town?.mainRoadWidth??S.village.mainRoadWidth;
  const first=Math.max(path[0].y,from),last=Math.min(path.at(-1).y,to);
  for(let y=Math.ceil(first/spacing)*spacing;y<last;y+=spacing)for(const side of [-1,1]){
    const x=encounterPathX(path,y)+side*(roadWidth/2+24);
    if(state.objects.some(o=>(HOUSE_TYPES.has(o.type)&&houseClearance(o,x,y)<16)||(o.type==='lamp'&&Math.hypot(o.x-x,o.y-y)<45)))continue;
    entity('lamp',x,y,{width:20,r:5,town,encounter:encounter??town?.encounter,arcadeRun:town?.endlessRun,roadLamp:true});
  }
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
function decorateFestival(e,section){
  const town=e.town,F=S.endless.regions.festivals,own={town,encounter:e,arcadeRun:section};
  e.festival=true;e.allowPredators=true;town.festival=e.kind;e.title=e.kind==='christmas'?'Christmas Party':'Halloween Town';
  const guests=state.objects.filter(o=>o.town===town&&o.type.startsWith('person'));
  for(const [i,o] of guests.entries()){
    o.costume=e.kind==='christmas'?(((i*37)%100)/100<F.santaFraction?'santa':['velvet','evening','tuxedo','furCoat'][i%4]):['witch','vampire','pumpkin','ghost','skeletonSuit'][i%5];
    if(o.costume==='santa'){o.width=44;o.r=18;}
    // Guests mingle on the existing footpath network and retain ordinary fear/feeding behavior.
    if(o.walker)o.walkSpeed*=1.15;
  }
  const houses=state.objects.filter(o=>o.town===town&&HOUSE_TYPES.has(o.type));
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
    e.nextSleighY=e.startY+80*PX_PER_M*e.scale;
  }else{
    const points=e.paths[0],lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));e.cemeteryRoute={points,lengths,length:lengths.at(-1)};
    e.mausoleum=entity('mausoleum',plaza.x,plaza.y,{...own,width:280,r:126,grandMausoleum:true,waveSize:Math.round(mix(...S.endless.regions.cemetery.mausoleum.count,e.difficulty)),released:0});
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
function updateFestivalTraffic(dt){
  if(!state.endless||!state.started)return;
  const p=state.p,F=S.endless.regions.festivals;
  for(const e of state.endless.encounters){
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
  for(const root of state.objects){
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
function drawFestivalGuest(o,s){
  const kind=o.costume,santa=kind==='santa',step=o.walking?Math.sin(clock*8+o.phase):0,skin=['#e2b68b','#b98465','#f0cbaa'][Math.floor(o.phase*3)%3];
  const coat={velvet:'#386b58',evening:'#813e65',tuxedo:'#314556',furCoat:'#b5a28a',witch:'#57456c',vampire:'#643641',pumpkin:'#d27938',ghost:'#e5e5d9',skeletonSuit:'#35404a',santa:'#b4444a'}[kind];
  const x=Math.round(s.x),y=Math.round(s.y),half=santa?9:5,bob=o.walking&&step>0?-1:0;
  shadow(x,y,santa?11:7,2);
  for(const side of [-1,1]){box(x+side*(santa?4:2)-1,y-4+(step*side>0?1:0),3,5,'#283c49');box(x+side*(santa?4:2)-2,y+(step*side>0?1:0),4,2,'#223342');}
  box(x-half+1,y-18+bob,half*2-2,14,santa?'#803642':coat);box(x-half,y-14+bob,half*2,9,coat);
  box(x-half-2,y-15+bob,3,9,coat);box(x+half-1,y-15+bob,3,9,coat);
  for(const side of [-1,1])box(x+side*(half+1)-1,y-7+bob+Math.round(step*side),2,3,skin);
  box(x-3,y-25+bob,6,7,skin);box(x-3,y-26+bob,6,2,'#755443');box(x+2,y-23+bob,1,1,'#33404a');
  if(santa){
    box(x-4,y-29+bob,7,5,'#b4444a');box(x-5,y-25+bob,10,2,'#fff0d9');box(x+3,y-28+bob,3,3,'#fff0d9');
    box(x-4,y-20+bob,8,5,'#f4ecd8');box(x-2,y-15+bob,4,2,'#f4ecd8');box(x-half,y-9,half*2,3,'#303d43');box(x-2,y-9,4,3,'#d2ad59');box(x-1,y-8,2,1,'#5f5444');box(x-half+1,y-5,half*2-2,2,'#eee4ce');
  }else if(kind==='tuxedo'){box(x-2,y-18+bob,4,7,'#efe6d1');box(x-3,y-17+bob,6,2,'#a85260');box(x-1,y-14+bob,2,7,'#e8dbbd');}
  else if(kind==='evening'){box(x-5,y-9,10,7,coat);box(x-4,y-27+bob,7,2,'#b79b58');box(x+3,y-21+bob,1,2,'#d6b85b');box(x-4,y-18+bob,9,2,'#e6d6b5');}
  else if(kind==='furCoat'){box(x-5,y-18+bob,10,3,'#efe6d1');box(x-3,y-28+bob,7,4,'#d6c5a8');box(x-1,y-14+bob,1,8,'#725b50');}
  else if(kind==='witch'){box(x-7,y-25+bob,14,2,'#333248');box(x-4,y-29+bob,8,4,'#403448');box(x-2,y-34+bob,4,6,'#403448');box(x-1,y-36+bob,2,3,'#403448');box(x-4,y-27+bob,8,2,'#bd7d47');}
  else if(kind==='vampire'){box(x-7,y-20+bob,3,13,'#393346');box(x+4,y-20+bob,3,13,'#393346');box(x-2,y-18+bob,4,7,'#eee2c6');box(x-2,y-18+bob,4,2,'#b14858');}
  else if(kind==='pumpkin'){box(x-6,y-17+bob,12,10,'#dc8b41');for(const side of [-1,1])box(x+side*3-1,y-14+bob,2,2,'#4b3c3e');box(x-2,y-10+bob,4,1,'#4b3c3e');box(x-3,y-28+bob,7,3,'#d27938');box(x,y-30+bob,2,3,'#50734f');}
  else if(kind==='ghost'){box(x-5,y-27+bob,10,8,'#e7e9de');box(x-3,y-24+bob,6,5,skin);box(x-6,y-6,12,3,'#e7e9de');}
  else if(kind==='skeletonSuit'){box(x-1,y-17+bob,2,11,'#d6d9cc');for(let i=0;i<3;i++)box(x-4,y-16+bob+i*3,8,1,'#d6d9cc');box(x-3,y-27+bob,6,2,'#bbc6c1');}
  else{box(x-5,y-20+bob,10,3,'#d6b263');box(x+3,y-18+bob,2,5,'#d6b263');}
}
function drawFestivalHouse(o,s){
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
let nightMaskStamp=-Infinity,nightMaskCam={x:0,y:0},cachedNightLights=[];
const nightMask=document.createElement('canvas'),nightMaskCtx=nightMask.getContext('2d'),nightGlow=document.createElement('canvas'),nightGlowCtx=nightGlow.getContext('2d'),lightTiles=new Map();
function glowTile(color='white'){
  if(lightTiles.has(color))return lightTiles.get(color);
  const tile=document.createElement('canvas');tile.width=tile.height=128;const t=tile.getContext('2d'),g=t.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,color);g.addColorStop(.32,color);g.addColorStop(.65,color==='white'?'rgba(255,255,255,.48)':color+'88');g.addColorStop(1,color==='white'?'rgba(255,255,255,0)':color+'00');t.fillStyle=g;t.fillRect(0,0,128,128);lightTiles.set(color,tile);return tile;
}
function nightLights(layers){
  const lights=[],add=(x,y,r,color=null,strength=1,core=false)=>{if(x+r<0||x-r>W||y+r<0||y-r>H)return;const light={x,y,r,color,strength,core};lights.push(light);return light;};
  const at=screen(state.p.x,state.p.y),lift=state.p.air>0&&state.p.airTotal?Math.sin(state.p.air/state.p.airTotal*Math.PI)*state.p.jumpHeight*ZOOM:0;add(at.x,at.y-8-lift,S.night.playerRadiusMetres*PX_PER_M*ZOOM,null,1);
  for(const o of layers){
    if(o===state.p||o.dead||o.eaten||o.collected)continue;const s=screen(o.x,o.y),w=(o.width||40)*ZOOM;
    if(o.type==='lamp')add(s.x,s.y-22,S.night.lampRadiusMetres*PX_PER_M*ZOOM,'#ffd29a',1,true);
    else if(o.grandMausoleum){add(s.x-w*.35,s.y-w*.35,58,'#c8bfdf',1,true);add(s.x+w*.35,s.y-w*.35,58,'#c8bfdf',1,true);}
    else if(HOUSE_TYPES.has(o.type)){
      add(s.x,s.y-w*.34,w*.8+12,'#ffd29a',1);for(const side of [-1,1])add(s.x+side*w*.19,s.y-w*.25,20,'#ffd29a',.9,true);
      if(o.festival)for(const side of [-1,0,1])add(s.x+side*w*.3,s.y-w*.49,30,o.festival==='christmas'?(side?'#ffbd8c':'#b7d9be'):'#d0b2eb',.8,true);
    }else if(['gate','entrance','finish'].includes(o.type)){
      for(const side of [-1,1])add(s.x+side*(o.half??(o.width||80)/2)*ZOOM,s.y-27,43,'#ffe4b0',1,true);
    }else if(o.type==='courseStart'||o.type==='raceRail')add(s.x,s.y-8,38,'#c5dcf1',.95,true);
    else if(o.type==='skier'||o.type==='boarder')add(s.x,s.y-10,S.night.skierRadiusMetres*PX_PER_M*ZOOM,'#c2d7ef',1);
    else if(o.type==='christmasTree'){
      add(s.x,s.y-80,128,'#ead2a1',1);const star=add(s.x,s.y-165,42,'#ffe3a0',1,true);if(star)star.star=true;
      for(let i=0;i<12;i++){const y=s.y-135+i*10,x=s.x+Math.sin(i*2.4)*(12+i*3);add(x,y,22,['#ffc0a5','#d1b4e9','#c0e7bb','#fbe0a3'][i%4],1,true);}
    }else if(o.type==='jackLantern')add(s.x,s.y-6,44,'#ffa95f',1,true);
    else if(o.type==='mistletoe')add(s.x,s.y-24,60,'#f2bfd2',1);
    else if(['ramp','rainbow','lift','liftLabel','trailChoices'].includes(o.type))add(s.x,s.y-10,40,'#cad7e7',1,true);
  }
  return lights;
}
function nightSnowColor(){
  const amount=state.nightBlend||0;if(amount<.003)return C.snow;
  const day=C.snow.slice(1),rgb=[0,2,4].map(i=>parseInt(day.slice(i,i+2),16));
  return 'rgb('+rgb.map((v,i)=>Math.round(mix(v,[127,147,179][i],amount))).join(',')+')';
}
function drawNightLighting(layers){
  const blend=state.nightBlend||0;if(blend<.003)return;
  const resolution=3,mw=Math.ceil(W/resolution),mh=Math.ceil(H/resolution);
  const resize=nightMask.width!==mw||nightMask.height!==mh;
  if(resize){nightMask.width=nightGlow.width=mw;nightMask.height=nightGlow.height=mh;}
  const shiftX=(nightMaskCam.x-state.cam.x)*ZOOM,shiftY=(nightMaskCam.y-state.cam.y)*ZOOM;
  if(resize||clock-nightMaskStamp>=1/30||Math.abs(shiftX)>14||Math.abs(shiftY)>14){
    const t=nightMaskCtx,glow=nightGlowCtx,lights=nightLights(layers),hole=glowTile();cachedNightLights=lights;
    t.globalCompositeOperation='source-over';t.globalAlpha=1;t.fillStyle='#071329';t.fillRect(0,0,mw,mh);t.globalCompositeOperation='destination-out';
    for(const l of lights){t.globalAlpha=l.strength;t.drawImage(hole,(l.x-l.r)/resolution,(l.y-l.r)/resolution,l.r*2/resolution,l.r*2/resolution);}
    t.globalAlpha=1;t.globalCompositeOperation='source-over';glow.clearRect(0,0,mw,mh);
    for(const l of lights)if(l.color){glow.globalAlpha=l.strength;glow.drawImage(glowTile(l.color),(l.x-l.r)/resolution,(l.y-l.r)/resolution,l.r*2/resolution,l.r*2/resolution);}glow.globalAlpha=1;
    // Bounded color bloom in the small mask; one ordinary composite on the game canvas.
    t.globalAlpha=.12;t.drawImage(nightGlow,0,0);t.globalAlpha=1;
    nightMaskStamp=clock;nightMaskCam={...state.cam};
  }
  ctx.save();ctx.globalAlpha=S.night.ambientOpacity*blend;ctx.drawImage(nightMask,0,0,W,H);
  const dx=(nightMaskCam.x-state.cam.x)*ZOOM,dy=(nightMaskCam.y-state.cam.y)*ZOOM;
  ctx.globalAlpha=blend;for(const l of cachedNightLights)if(l.core){const x=l.x+dx,y=l.y+dy;if(l.star){box(x-1,y-5,2,10,'#ffe9a3');box(x-5,y-1,10,2,'#ffe9a3');box(x-2,y-2,4,4,'#fff2ca');}else box(x-1,y-1,2,2,l.color||'#f4e4be');}ctx.restore();
}
