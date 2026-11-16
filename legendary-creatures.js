/* Native-pixel folklore encounters. One bounded scene per eligible area; no new controls required. */
const LEGEND_KINDS=['hut','kitsune','giant','kelpie','troll','thunderbird','gargoyle','wisps','dragon','mountain'];
const LEGEND_NAMES={hut:"Baba Yaga's Walking Hut",kitsune:'Kitsune',giant:'Frost Giant',kelpie:'Kelpie',troll:'Bridge Troll',thunderbird:'Thunderbird',gargoyle:'Gargoyle',wisps:"Will-o'-the-wisps",dragon:'Snow Dragon',mountain:'Mountain Spirit'};
const LEGEND_HINTS={hut:'PASS BETWEEN ITS LEGS WHILE THE HOUSE IS UP',kitsune:'WATCH THE ORIGINAL THROUGH THE SPLIT - CATCH A FOX SPIRIT',giant:'HIDE BEHIND ROCKS WHEN THE GIANT BLOWS',kelpie:'ITS FROZEN WAKE IS FAST - CHOOSE YOUR HEADING FIRST',troll:'BAIT ITS CHARGE, THEN TAKE THE OTHER SIDE OF THE BRIDGE',thunderbird:'SPARKS WARN YOU - LIGHTNING TOPPLES NEARBY TREES',gargoyle:'PASS SLOWLY TO LEAVE IT ASLEEP - WATCH ITS LANDING SHADOW',wisps:'FOLLOW THE LIGHT OFF THE ROAD TO FIND ITS GIFT',dragon:'JUMP ONTO ITS BACK - STEER OFF BEFORE IT DIVES',mountain:'PASS CLOSE TO EITHER FLANK TO STEER ITS ROLL'};
const LEGEND_VIEW=objectView(o=>o.type==='legendary'),LEGEND_ELIGIBLE={forest:['hut','kitsune','giant','thunderbird','dragon','mountain','troll'],trees:['kitsune','giant','gargoyle'],denseForest:['hut','kitsune'],lake:['kelpie','dragon'],town:['gargoyle','wisps'],halloween:['hut','gargoyle','wisps'],cemetery:['gargoyle','wisps'],avalanche:['giant','dragon'],boulder:['thunderbird','mountain']};
let legendPreviewIndex=0,legendPanel=null,legendPanelValue=-1;
function planLegendShowcase(e,section){
  e.legendIndex=(legendPreviewIndex+e.visit-1)%LEGEND_KINDS.length;e.legendKind=LEGEND_KINDS[e.legendIndex];e.title=LEGEND_NAMES[e.legendKind];if(LEGEND_V2.has(e.legendKind))e.endY=e.startY+legendV2Config(e.legendKind).showcaseMetres*PX_PER_M;
  Object.assign(e,{noFlags:true,noNewPredators:true,half:330,band:3000,centerX:section.endlessRoot.x});e.paths=[[{x:e.centerX,y:e.startY},{x:e.centerX,y:e.endY}]];
}
function planLegendaryEncounter(e,section){
  const C=S.endless.regions.legendary,choices=LEGEND_ELIGIBLE[e.kind];
  if(e.kind==='legendarium')e.legendKind=LEGEND_KINDS[e.legendIndex];
  else{if(!C.enabled||!choices||(e.startY-state.endless.startY)/PX_PER_M<C.firstMetres||random()>=C.chancePerArea)return;const options=choices.filter(k=>k!=='wisps'||e.night);if(!options.length)return;e.legendKind=pick(options);}
  const y=e.startY+(e.endY-e.startY)*(e.kind==='legendarium'?.3:.55),path=e.paths[0];e.legendPlan={kind:e.legendKind,x:encounterPathX(path,y),y,spawned:false};if(e.town)populateLegendaryEncounter(e,section,e.startY,e.endY);
}
function populateLegendShowcase(e,section,from,to){
  const own={arcadeRun:section,encounter:e},step=240;
  for(let n=Math.ceil((from-e.startY)/step);;n++){const y=e.startY+n*step;if(y>=to)break;for(const side of [-1,1])entity(n%3?'pine':'fir',e.centerX+side*440,y,{...own,width:70,r:18});}
  populateLegendaryEncounter(e,section,from,to);
}
function populateLegendaryEncounter(e,section,from,to){
  const p=e.legendPlan;if(!p||p.spawned||p.y>=to||p.y<from)return;p.spawned=true;
  if(e.kind!=='legendarium'&&legendActors().filter(q=>!q.eaten&&!q.defeated&&Math.abs(q.homeY-p.y)<1300).length>=S.endless.regions.legendary.maxActive)return;
  const own={arcadeRun:section,encounter:e},scene=e.kind==='legendarium',kind=p.kind;
  // Keep the play space clear before dressing it. This also avoids a creature materializing inside a house.
  if(scene||!e.town)filterObjects(o=>o.arcadeRun!==section||o.encounter!==e||!NPC_STATIC_SOLIDS.has(o.type)||Math.abs(o.x-p.x)>330||Math.abs(o.y-p.y)>420||o.forestBoundary);
  let point={x:p.x,y:p.y};
  if(e.town){const path=e.town.route;point={x:encounterPathX(path,p.y),y:p.y};}
  const o=entity('legendary',point.x,point.y,{...own,r:0,width:80,legendKind:kind,homeX:point.x,homeY:point.y,phase:range(0,TAU),legendState:'waiting',tracks:[],temporary:[],marks:[],copies:[],buried:[],nextAt:0});e.legendActor=o;
  const prop=(type,x,y,extra={})=>entity(type,point.x+x,point.y+y,{...own,...extra});
  if(kind==='kelpie'){
    let lake=state.objects.find(q=>q.type==='ice'&&lakeContains(q,point.x,point.y));
    if(!lake)lake=prop('ice',0,30,{rx:330,ry:400,width:660,r:0});o.lake=lake;o.x-=120;o.width=90;
  }else if(kind==='giant'){
    o.x+=340;o.width=200;for(const [x,y] of [[-105,-30],[110,170],[-160,370]])prop('rock',x,y,{width:85,r:34});
  }else if(kind==='troll'){
    o.x-=75;o.width=90;o.bridge={x:point.x,y:point.y,half:120,length:300};
    for(const side of [-1,1])for(const dy of [-180,180])prop('rock',side*180,dy,{width:90,r:35});
  }else if(kind==='gargoyle'){
    o.x+=105;o.width=70;if(scene||!e.town)prop('lodge',-260,100,{width:180,r:75,buildingKind:'inn'});prop('rock',125,10,{width:50,r:18});
  }else if(kind==='mountain'){o.width=210;}else if(kind==='hut')o.width=165;
  else if(kind==='dragon'){o.width=165;}
  else if(kind==='thunderbird')o.width=120;
  else if(kind==='wisps'){o.width=44;const y=point.y+540,path=e.town?.backRoute?.points;o.gift={x:path?encounterPathX(path,y):point.x+260,y};for(const dx of [0,45,-45,90,-90])if(!nearbyFootprints(o.gift.x+dx,y,80).some(q=>obstacleClearance(q,o.gift.x+dx,y)<25)){o.gift.x+=dx;break;}}
  else if(kind==='kitsune')o.width=65;
  setupLegendV2(o,scene);
}
function legendActors(){return viewItems(LEGEND_VIEW);}
function legendaryIce(o,x,y,rx=45,ry=80,seconds=8){
  const q=entity('ice',x,y,{arcadeRun:o.arcadeRun,encounter:o.encounter,rx,ry,width:rx*2,r:0,legendIce:true,until:clock+seconds});o.temporary.push(q);
  while(o.temporary.length>16){const old=o.temporary.shift();old.eaten=true;}return q;
}
function legendNearby(o){return Math.abs(state.p.y-o.homeY)<1300&&Math.abs(state.p.x-o.homeX)<1100;}
function legendContact(o,previous,x=o.x,y=o.y,radius=28){
  const p=state.p;if(p.air>0||p.fall||p.awaitingInput||p.shield>0||clock<(o.hitUntil||0))return false;
  const start=x===o.x&&y===o.y&&o.motionFromStamp===clock?{x:o.motionFromX,y:o.motionFromY}:{x,y},dx=(p.x-x)-(previous.x-start.x),dy=(p.y-y)-(previous.y-start.y),sx=previous.x-start.x,sy=previous.y-start.y,t=clamp(-(sx*dx+sy*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(sx+dx*t,sy+dy*t)<radius+S.physics.playerRadius;
}
function legendBump(o,previous,x=o.x,y=o.y,radius=28,rammable=false){
  if(!legendContact(o,previous,x,y,radius))return false;
  o.hitUntil=clock+2;const p=state.p;
  if(rammable&&p.speed>=topSpeed()*.85&&Math.hypot(p.vx-(o.motionVx||0),p.vy-(o.motionVy||0))>topSpeed()*.65){o.defeated=true;o.defeatedAt=clock;say('OOF!',o,1);}
  crash(o);burst(x,y,C.ice,12);return true;
}
function legendSheltered(o,x,y){
  const side=Math.sign(o.x-x)||1,near=nearbyFootprints(x+side*160,y,220);
  return near.some(q=>!q.legendBuried&&Math.sign(q.x-x)===side&&Math.abs(q.x-x)<360&&obstacleClearance(q,q.x,y)<15&&Math.abs(q.y-y)<Math.max(q.r||0,(q.width||0)*.24)+25);
}
function restoreLegendSnow(o){for(const [q,r] of o.buried){if(q.legendBuried===o){q.r=r;delete q.legendBuried;}}if(o.buried.length)invalidateSolidGrids();o.buried=[];}
function updateLegendaryCreatures(dt,previous){
  const p=state.p,actors=legendActors(),current=state.endless?endlessEncounterAt(p.y):null;
  if(legendPanel){legendPanel.hidden=!state.endless?.legendShowcase;if(!legendPanel.hidden&&current?.legendIndex!==legendPanelValue){legendPanelValue=current?.legendIndex??0;legendPanel.querySelector('select').value=legendPanelValue;}}
  if(!state.started)return;updateFoxSpirit(dt);
  for(const o of actors){
    o.temporary=o.temporary.filter(q=>{if(q.until<=clock)q.eaten=true;return !q.eaten;});
    if(o.dead||o.eaten||o.defeated){restoreLegendSnow(o);continue;}
    if(!legendV2Nearby(o)){restoreLegendSnow(o);continue;}
    if(!o.announced&&Math.abs(p.y-o.homeY)<650){o.announced=true;announce(LEGEND_NAMES[o.legendKind].toUpperCase(),LEGEND_HINTS[o.legendKind],C.teal,3);}
    if(!o.activeAt&&p.y>o.homeY-850)o.activeAt=clock;
    if(!o.activeAt)continue;
    const elapsed=clock-o.activeAt; o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
    if(updateLegendV2(o,dt,previous)){o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;continue;}
    if(o.legendKind==='hut'){
      const cycle=elapsed%16,moving=cycle<5||cycle>=8&&cycle<13;o.legendState=moving?'standing':'crouching';const shift=cycle<5?-Math.cos(cycle/5*Math.PI):cycle<8?1:cycle<13?Math.cos((cycle-8)/5*Math.PI):-1;o.x=o.homeX+shift*145;o.y=o.homeY;
      if(o.legendState==='crouching')legendBump(o,previous,o.x,o.y,75);else for(const side of [-1,1])legendBump(o,previous,o.x+side*66,o.y,16);
    }else if(o.legendKind==='giant'){
      const cycle=elapsed%7;o.legendState=cycle<2?'inhale':cycle<5?'blowing':'rest';
      if(o.legendState==='blowing'&&Math.abs(p.y-o.homeY)<650&&!legendSheltered(o,p.x,p.y)&&p.air<=0){p.x-=135*dt;}
    }else if(o.legendKind==='kelpie'){
      if(p.y>o.homeY-430){const x=o.homeX+Math.sin(elapsed*1.1)*170,y=o.homeY+clamp((elapsed-1)*110,0,650);const goal={x,y};travel(o,Math.atan2(goal.y-o.y,goal.x-o.x),190,dt,false,false,true,false,goal,true);
        if(clock>=(o.wakeAt||0)){legendaryIce(o,o.x,o.y+70,36,78,9);o.wakeAt=clock+.45;}}
    }else if(o.legendKind==='troll'){
      if(!o.legendState||o.legendState==='waiting'){if(Math.abs(p.y-o.homeY)<480){o.legendState='aiming';o.until=clock+1;}}
      if(o.legendState==='aiming'){o.aimX=clamp(p.x,o.homeX-100,o.homeX+100);if(clock>=o.until){o.legendState='charging';o.chargeTarget={x:o.aimX,y:o.homeY-250};o.until=clock+1.2;}}
      if(o.legendState==='charging'){const g=o.chargeTarget;travel(o,Math.atan2(g.y-o.y,g.x-o.x),topSpeed()*1.12,dt,false,false,true,true,g);legendBump(o,previous,o.x,o.y,30,true);if(clock>=o.until||Math.hypot(g.x-o.x,g.y-o.y)<20){o.legendState='recover';o.until=clock+2.8;}}
      if(o.legendState==='recover'&&clock>=o.until){o.legendState='waiting';o.homeY=o.bridge.y;o.chargeTarget=null;}
      legendBump(o,previous,o.x,o.y,28,true);
      if(Math.abs(p.y-o.bridge.y)<o.bridge.length/2&&Math.abs(p.x-o.bridge.x)>o.bridge.half)legendBump(o,previous,p.x,p.y,5);
    }else if(o.legendKind==='thunderbird'){
      o.x=o.homeX+Math.sin(elapsed*.8)*200;o.y=o.homeY+Math.sin(elapsed*.4)*70;
      if(clock>=o.nextAt&&Math.abs(p.y-o.homeY)<850){o.marks.push({x:clamp(p.x+p.vx*1.4,o.homeX-320,o.homeX+320),y:p.y+Math.max(180,p.vy*1.4),at:clock+1.4});o.nextAt=clock+3.8;}
      for(const m of o.marks)if(!m.struck&&clock>=m.at){m.struck=true;m.fade=clock+.65;legendBump(o,previous,m.x,m.y,48);burst(m.x,m.y,'#b3d9eb',14);
        let n=0;for(const t of nearbyFootprints(m.x,m.y,150))if(TREE_TYPES.has(t.type)&&Math.hypot(t.x-m.x,t.y-m.y)<130&&n++<2){t.eaten=true;const f=entity('fallingTree',t.x,t.y,{arcadeRun:o.arcadeRun,encounter:o.encounter,fallTowardX:m.x});f.legendLightning=true;Object.assign(f,{fallState:'falling',fallAt:clock,fallSide:m.x<f.x?-1:1,r:S.terrainFeatures.fallingTree.fallenRadiusMetres*PX_PER_M});}}
      o.marks=o.marks.filter(m=>!m.struck||m.fade>clock).slice(-4);
    }else if(o.legendKind==='gargoyle'){
      if(o.legendState==='waiting'&&p.speed>220&&Math.hypot(p.x-o.x,p.y-o.y)<460){o.legendState='swooping';o.flyAt=clock;o.from={x:o.x,y:o.y};const y=p.y+Math.max(250,p.vy*1.5);let x=p.x+p.vx*1.5;for(const offset of [0,80,-80,160,-160])if(!nearbyFootprints(x+offset,y,70).some(q=>obstacleClearance(q,x+offset,y)<35)){x+=offset;break;}o.landing={x,y};if(nearbyFootprints(x,y,70).some(q=>obstacleClearance(q,x,y)<35)){o.legendState='waiting';delete o.landing;continue;}}
      if(o.legendState==='swooping'){const t=clamp((clock-o.flyAt)/1.5,0,1);o.x=mix(o.from.x,o.landing.x,t);o.y=mix(o.from.y,o.landing.y,t);o.altitude=Math.sin(t*Math.PI)*100;if(t>=1){o.legendState='landed';o.until=clock+2.5;}}
      if(o.legendState==='landed'){legendBump(o,previous,o.x,o.y,28,true);if(clock>=o.until){o.legendState='returning';o.until=clock+1.5;}}
      if(o.legendState==='returning'){o.x=ease(o.x,o.homeX,4,dt);o.y=ease(o.y,o.homeY,4,dt);o.altitude=45;if(clock>=o.until){o.x=o.homeX;o.y=o.homeY;o.altitude=0;o.legendState='waiting';}}
    }else if(o.legendKind==='wisps'){
      if(p.y>o.homeY-450){o.x=ease(o.x,o.gift.x,1.1,dt);o.y=ease(o.y,o.gift.y,1.1,dt);if(!o.rewarded&&p.air<=0&&Math.hypot(p.x-o.gift.x,p.y-o.gift.y)<35){o.rewarded=true;const a=state.endless||state.arcade;if(a)a.shields=Math.min(a.shields+1,S.arcade.gear.maxShields);p.boost=Math.max(p.boost,1);burst(o.x,o.y,C.gold,15);say('A GIFT FOR A BRAVE SOUL',o,2);}}

    }
    o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;
  }
}
const legendTiles=new Map();
function legendTile(kind,frame=0){
  const key=kind+':'+frame;if(legendTiles.has(key))return legendTiles.get(key);
  const tile=document.createElement('canvas');tile.width=72;tile.height=80;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
  const px=(x,y,w,h,color)=>{c.fillStyle=gritMaterial(color);c.fillRect(x,y,w,h);},ink='#344b53',snow='#edf1df',shade='#a6bec5',teal='#508d92',gold='#e4bd6f';
  const eye=(x,y,color=gold)=>{px(x,y,3,2,ink);px(x+1,y,1,1,color);};
  const step=frame%2?2:0;
  if(kind==='hut'){
    const low=frame>=2?12:0;
    for(const [x,shift] of [[18,step],[49,-step]]){px(x,52+low,4,19-low,'#b79457');px(x-2+shift,70,8,3,'#bd9a59');px(x-4+shift,73,12,2,'#ab8754');}
    px(8,20+low,56,33,ink);px(11,23+low,50,28,'#90705c');for(let y=27;y<51;y+=7)px(12,y+low,48,1,'#664e48');
    for(let i=0;i<7;i++){px(5+i*4,19-i*2+low,62-i*8,3,'#664e55');px(5+i*4,17-i*2+low,62-i*8,2,snow);}
    px(31,32+low,12,20,'#514642');px(33,34+low,8,12,teal);px(40,44+low,1,2,gold);
    for(const x of [16,49]){px(x,29+low,8,10,ink);px(x+1,30+low,6,7,gold);px(x+3,30+low,1,7,'#957a57');}px(54,4+low,6,13,'#786b64');px(53,3+low,8,2,snow);
  }else if(kind==='kitsune'){
    for(let i=0;i<5;i++){const x=12+i*6;px(x,37-i%2*4,6,19,'#c3ceca');px(x,33-i%2*4,4,7,snow);px(x+2,48,6,8,snow);}
    px(24,41,27,16,snow);px(41,29,16,21,snow);px(41,23,5,11,'#c8d4cf');px(53,22,5,12,'#c8d4cf');px(43,26,2,7,'#b46c67');px(54,25,2,7,'#b46c67');
    eye(44,37,'#d5785a');eye(53,37,'#d5785a');px(48,42,5,3,ink);px(25,53,4,10-step,shade);px(43,54,4,9+step,shade);px(37,44,12,3,'#b97165');
  }else if(kind==='giant'||kind==='mountain'){
    const rock=kind==='mountain',skin=rock?'#8b9c9d':'#a6c9d0';px(13,10,46,49,ink);px(9,20,54,35,skin);px(15,9,42,12,skin);px(8,52,56,15,rock?'#71878b':'#759ca8');
    for(let i=0;i<5;i++)px(11+i*10,8-i%2*4,12,9,snow);px(22,26,8,4,ink);px(43,26,8,4,ink);px(24,28,4,2,gold);px(44,28,4,2,gold);px(32,31,7,11,shade);
    px(25,47,24,frame?12:4,ink);if(frame){px(27,47,5,4,snow);px(42,47,5,4,snow);}for(const x of [18,45])px(x,37,8,3,rock?'#a4ac9e':'#6c9aab');
    if(!rock){px(5,47,10,21,'#90b6c0');px(57,47,10,21,'#90b6c0');px(13,65,18,7,ink);px(43,65,18,7,ink);}else{px(6,61,60,9,'#6c8289');for(let i=0;i<5;i++)px(9+i*12,56-i%2*6,10,9,snow);}
  }else if(kind==='kelpie'){
    px(18,39,36,15,ink);px(20,40,32,11,teal);px(42,20,11,28,teal);px(44,17,18,15,teal);px(57,25,9,8,teal);px(45,11,4,8,ink);px(54,13,4,6,ink);eye(56,23,'#bbe5c4');
    for(let i=0;i<5;i++)px(39-i%2*3,19+i*5,5,7,'#a0d1cb');for(const x of [22,44]){px(x,51,4,14-step,teal);px(x-1,64-step,7,3,ink);}px(10,37,9,6,'#9dd6d0');px(8,42,5,13,'#83bfbf');
  }else if(kind==='troll'){
    px(16,28,40,29,'#698c72');px(20,13,33,25,'#779b7b');px(12,20,10,9,'#779b7b');px(52,20,10,9,'#779b7b');px(13,19,5,4,'#a4b68a');px(57,20,5,4,'#a4b68a');eye(27,25);eye(43,25);px(32,31,12,5,'#52745f');px(28,39,21,5,ink);px(30,38,3,5,snow);px(43,38,3,5,snow);px(10,38,9,20,teal);px(54,38,9,20,teal);px(17,55,16,11+step,ink);px(41,55,15,13-step,ink);px(19,47,35,9,'#8c7056');px(26,47,5,9,gold);
  }else if(kind==='thunderbird'||kind==='dragon'){
    const dragon=kind==='dragon',body=dragon?'#8bb7c1':'#637d9b',wing=dragon?'#b5d2ce':'#bd945e',up=frame%2?6:0;
    for(const side of [-1,1])for(let i=0;i<5;i++){const x=side<0?4+i*5:44+i*4,y=22+Math.abs(2-i)*3-up;px(x,y,10,8+i,wing);px(x,y,9,2,snow);}
    px(29,25,16,27,body);px(31,17,13,15,body);eye(39,22);px(43,26,7,4,dragon?'#d1e0d7':gold);px(31,50,6,12,body);px(35,58,6,7,body);px(30,45,10,4,gold);
    if(dragon){px(30,12,3,8,snow);px(42,12,3,8,snow);for(let i=0;i<4;i++)px(29,29+i*5,3,3,snow);}else{px(30,14,4,5,gold);px(35,11,3,8,gold);px(40,14,3,5,gold);px(31,33,8,3,snow);px(29,41,12,3,snow);}
  }else if(kind==='gargoyle'){
    const color='#839699';for(const side of [-1,1]){const x=side<0?9:47;px(x,30-frame%2*5,16,15,color);px(x+3,27-frame%2*5,5,5,shade);}px(26,29,21,27,color);px(26,14,22,21,color);px(25,10,5,10,shade);px(44,9,5,11,shade);eye(29,24,'#b8cb8d');eye(41,24,'#b8cb8d');px(31,32,13,4,ink);px(27,53,7,12,ink);px(41,53,7,12,ink);px(20,65,34,5,'#a8b4b1');
  }else if(kind==='wisps'){
    for(let i=0;i<3;i++){const x=15+i*18,y=30+(i%2)*10+step;px(x-2,y,9,12,'#739e9a');px(x,y-5,5,18,'#9ad6ba');px(x+1,y-9,3,16,'#d4ebc4');px(x,y+2,2,2,ink);px(x+4,y+2,2,2,ink);}
  }
  legendTiles.set(key,tile);return tile;
}
function drawLegendaryCreature(o,s){
  if(o.type!=='legendary')return false;if(drawLegendV2(o,s))return true;const kind=o.legendKind,frame=kind==='hut'?(o.legendState==='crouching'?2:Math.floor(clock*4)%2):['giant','mountain'].includes(kind)?(['inhale','blowing','sneeze'].includes(o.legendState)?1:0):Math.floor(clock*5)%2;
  const tile=legendTile(kind,frame),width=o.width*ZOOM,height=width*80/72;
  const paint=(x,y,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha*(o.defeated?clamp(1-(clock-o.defeatedAt)/1.5,0,1):1);ctx.drawImage(tile,Math.round(x-width/2),Math.round(y-height-(o.altitude||0)*ZOOM),Math.round(width),Math.round(height));ctx.restore();};
  if(kind==='kitsune')for(const q of o.copies){const p=screen(q.x,q.y);paint(p.x,p.y,.8);}
  if(['dragon','thunderbird'].includes(kind)){shadow(s.x,s.y,25,6);paint(s.x,s.y-45-Math.sin(clock*3)*3);}else paint(s.x,s.y);
  if(kind==='troll'&&o.legendState==='aiming')text('!',s.x,s.y-height-7,15,C.gold);
  if(kind==='wisps'&&o.gift&&!o.rewarded){const p=screen(o.gift.x,o.gift.y);gearIcon('shield',p.x-6,p.y-17,12);}
  return true;
}
function drawLegendaryGround(){
  const view=viewBounds();
  for(const o of legendActors()){
    if(!legendV2Nearby(o)||o.defeated)continue;
    drawLegendV2Marks(o);
    for(const q of o.tracks){const p=screen(q.x,q.y);box(p.x-4,p.y,2,3,'#819f9d');box(p.x+3,p.y+3,2,3,'#819f9d');}
    if(o.legendKind==='giant'&&o.legendState==='blowing')for(let i=0;i<18;i++){const x=o.homeX+360-((clock*400+i*67)%800),y=o.homeY-350+(i*83)%900,p=screen(x,y);line(p.x,p.y,p.x+12,p.y-2,'#a2c9cd',1);}
    if(o.bridge){const b=o.bridge,a=screen(b.x-700,b.y-b.length/2),z=screen(b.x+700,b.y+b.length/2);box(a.x,a.y,z.x-a.x,z.y-a.y,'#688e9e');box(a.x,a.y,z.x-a.x,5,'#c2d9d7');for(let y=b.y-b.length/2;y<b.y+b.length/2;y+=30){const p=screen(b.x-b.half,y);box(p.x,p.y,b.half*2*ZOOM,10,'#ad8864');line(p.x,p.y,p.x+b.half*2*ZOOM,p.y,'#725e51');}for(const side of [-1,1]){const p=screen(b.x+side*b.half,b.y-b.length/2),q=screen(b.x+side*b.half,b.y+b.length/2);line(p.x,p.y,q.x,q.y,'#6b6760',2);}}
    for(const m of o.marks){const p=screen(m.x,m.y),r=48*ZOOM;ctx.strokeStyle=m.struck?'#e7e8c4':'#b49a5d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.55,0,0,TAU);ctx.stroke();if(m.struck){line(p.x-8,p.y-90,p.x+3,p.y-40,'#e8e9bc',3);line(p.x+3,p.y-40,p.x,p.y,'#e8e9bc',3);}else{box(p.x-2,p.y-5,4,10,'#a18854');box(p.x-5,p.y-1,10,2,'#a18854');}}
    if(o.landing&&o.legendState==='swooping'){const p=screen(o.landing.x,o.landing.y);shadow(p.x,p.y,18,8);text('!',p.x,p.y-12,12,C.gold);}
    if(o.breath&&!o.breath.frozen){const b=o.breath,a=screen(b.ax,b.ay),z=screen(b.bx,b.by);line(a.x,a.y,z.x,z.y,'#8eb9c4',5);for(let i=0;i<8;i++){const t=i/7;box(mix(a.x,z.x,t),mix(a.y,z.y,t),2,3,'#e9f2db');}}
    if(o.waveAt&&clock-o.waveAt<3.5){const y=o.homeY-240+(clock-o.waveAt)*250,p=screen(o.homeX-400,y);for(let i=0;i<12;i++)box(p.x+i*29,p.y+Math.sin(i+clock*4)*4,30,13,'#d2e3df');}
    // Buried obstacles remain faint silhouettes rather than disappearing without explanation.
    for(const [q] of o.buried){const p=screen(q.x,q.y);box(p.x-18,p.y-5,36,8,'#d7e5df');box(p.x-12,p.y-9,24,5,'#e9f0df');}
  }
}
function drawLegendaryVeil(){
  const remaining=(state.p.legendVeilUntil||0)-clock;if(remaining<=0)return;ctx.save();ctx.globalAlpha=Math.min(.65,remaining*.7);for(let i=0;i<22;i++){const x=(i*83+clock*65)%W,y=(i*61+clock*90)%H;box(x,y,9,4,i%2?'#a77a56':'#cba563');}ctx.restore();
}
function debugLegendBay(index=0){
  if(!ready||!Number.isFinite(index))return false;legendPreviewIndex=(Math.round(index)+LEGEND_KINDS.length)%LEGEND_KINDS.length;
  state.endlessDebug.selection=ENDLESS_DEBUG_AREAS.indexOf('legendarium')+1;state.endlessDebug.visits.legendarium=1;resetSummit(false,'legendarium',1);state.nightOverride=false;state.nightBlend=0;legendPanelValue=-1;
  if(legendPanel){legendPanel.hidden=false;legendPanel.querySelector('select').value=legendPreviewIndex;}canvas.focus({preventScroll:true});render();return true;
}
function initLegendShowcaseControls(){
  if(legendPanel)return;legendPanel=document.createElement('div');legendPanel.id='legend-showcase';legendPanel.hidden=true;
  legendPanel.style.cssText='position:absolute;z-index:4;left:8px;right:8px;top:76px;padding:7px;background:#eef2dfee;border:1px solid #829b99;border-radius:5px;font:12px monospace;color:#344b53;display:flex;gap:4px;flex-wrap:wrap';
  // Explicit hidden styling keeps this debug panel out of ordinary play despite display:flex.
  const style=document.createElement('style');style.textContent='#legend-showcase[hidden]{display:none!important}#legend-showcase button,#legend-showcase select{font:12px monospace;min-height:32px;border:1px solid #8aa09d;background:#e4ecdf;color:#344b53;border-radius:3px}#legend-showcase select{flex:1;min-width:130px}';document.head.append(style);
  const select=document.createElement('select');select.setAttribute('aria-label','Legendary creature');LEGEND_KINDS.forEach((kind,index)=>{const option=document.createElement('option');option.value=index;option.textContent=(index+1)+'. '+LEGEND_NAMES[kind];select.append(option);});select.addEventListener('change',()=>debugLegendBay(Number(select.value)));legendPanel.append(select);
  for(const [label,fn] of [['‹',()=>debugLegendBay(Number(select.value)-1)],['Retry',()=>debugLegendBay(Number(select.value))],['›',()=>debugLegendBay(Number(select.value)+1)],['Day/night',()=>toggleDayNight()],['Exit',()=>{resetSummit();legendPanel.hidden=true;}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label==='‹'?'Previous creature':label==='›'?'Next creature':label);b.addEventListener('click',()=>{fn();canvas.focus({preventScroll:true});});legendPanel.append(b);}document.querySelector('main').append(legendPanel);
}
