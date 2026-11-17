/* Native-pixel folklore encounters. One bounded scene per eligible area; no new controls required. */
const LEGEND_KINDS=['witch','ghost','unicorn','griffin','medusa','cyclops','phoenix','genie','hut','kitsune','giant','kelpie','troll','thunderbird','gargoyle','wisps','dragon','mountain'];
const LEGEND_NAMES={hut:"Baba Yaga's Walking Hut",kitsune:'Kitsune',giant:'Frost Giant',kelpie:'Kelpie',troll:'Bridge Troll',thunderbird:'Thunderbird',gargoyle:'Gargoyle',wisps:"Will-o'-the-wisps",dragon:'Snow Dragon',mountain:'Mountain Spirit',witch:'Witch',ghost:'Ghosts',unicorn:'Unicorn',griffin:'Griffin',medusa:'Medusa',cyclops:'Cyclops',phoenix:'Phoenix',genie:'Genie'};
const LEGEND_HINTS={hut:"IT CHASES YOU OVER EVERYTHING - DON'T SLOW DOWN",kitsune:'WATCH THE ORIGINAL THROUGH THE SPLIT - CATCH A FOX SPIRIT',giant:'A LONG WINDY STRETCH - ROCKS SHELTER YOU',kelpie:'IT HUNTS YOU FOR 30 SECONDS - OUTRUN IT FOR ITS BRIDLE',troll:'GET PAST HIM ON THE BRIDGE - OR PAY WITH YOUR GEAR',thunderbird:'LIGHTNING ROWS - FIND THE GAP',gargoyle:'IT HUNTS FROM THE AIR - DODGE WHEN IT SCREECHES',wisps:'CATCH THE LIGHTS - THEY KEEP THE NIGHT BACK',dragon:'JUMP ONTO ITS BACK - STEER OFF BEFORE IT DIVES',mountain:'PASS CLOSE TO EITHER FLANK TO STEER ITS ROLL',witch:'POTIONS SPLASH EVERYONE - SHE GETS BORED EVENTUALLY',ghost:'THEY KILL - STAY IN THE LIGHT',unicorn:'MONSTERS FEAR IT - STAY CLOSE, NEVER BUMP',griffin:'ITS SHADOW MARKS ITS PREY - IT CARRIES YOU UPHILL',medusa:'HIDE BEHIND STATUES - SLIP CLOSE PAST HER FOR THE MIRROR',cyclops:'BOULDERS RAIN FOR A WHILE - KEEP TURNING',phoenix:'FIREBALLS! THE MELTED SNOW IS FAST ICE',genie:'HE TURNS THINGS INTO OTHER THINGS - WATCH HIS SPELL'};
const LEGEND_VIEW=objectView(o=>o.type==='legendary');
// Which legends can appear in which area. Night-only kinds (LEGEND_NIGHT) are filtered by the area's lap.
const LEGEND_ELIGIBLE={forest:['hut','kitsune','giant','thunderbird','dragon','mountain','troll','griffin','phoenix','cyclops','unicorn'],trees:['kitsune','giant','gargoyle','unicorn','griffin','medusa','phoenix','witch','genie','cyclops'],denseForest:['hut','kitsune','ghost','witch'],lake:['kelpie','dragon','phoenix'],town:['gargoyle','wisps','genie','witch'],christmas:['genie','griffin','unicorn'],halloween:['hut','gargoyle','wisps','witch','ghost'],cemetery:['gargoyle','wisps','ghost','witch','medusa'],scramble:['cyclops','thunderbird','mountain','troll'],avalanche:['giant','dragon','griffin'],boulder:['thunderbird','griffin'],burrowField:['phoenix','witch','kitsune'],piedPiper:['unicorn','griffin','medusa'],rivalRace:['witch','thunderbird','genie']};
let legendPreviewIndex=0,legendPanel=null,legendPanelValue=-1;
function planLegendShowcase(e,section){
  e.legendIndex=(legendPreviewIndex+e.visit-1)%LEGEND_KINDS.length;e.legendKind=LEGEND_KINDS[e.legendIndex];e.title=LEGEND_NAMES[e.legendKind];if(LEGEND_V2.has(e.legendKind))e.endY=e.startY+legendV2Config(e.legendKind).showcaseMetres*PX_PER_M;else if(LEGEND_V3.has(e.legendKind))e.endY=e.startY+V3.bayMetres[e.legendKind]*PX_PER_M;
  Object.assign(e,{noFlags:true,noNewPredators:true,half:330,band:3000,centerX:section.endlessRoot.x});e.paths=[[{x:e.centerX,y:e.startY},{x:e.centerX,y:e.endY}]];
}
// Legends are rarer early on and grow more common as the run gets harder (see endless.stages).
function legendChance(e){const C=S.endless.regions.legendary,c=C.chancePerArea;return Array.isArray(c)?mix(c[0],c[1],clamp(e.levelDifficulty??e.difficulty??1,0,1)):c;}
// Beaten or outwitted legends pay out in gear, never points.
function legendGift(kind,o,line){
  const a=state.endless||state.arcade,G=S.arcade.gear;if(!a)return;
  if(kind==='sword')a.swords=Math.min((a.swords||0)+1,G.maxSwords);else a.shields=Math.min((a.shields||0)+1,G.maxShields);
  burst(o.x,o.y,C.gold,16);beep(880,.12);say(line,state.p,2);
}
function planLegendaryEncounter(e,section){
  const C=S.endless.regions.legendary,choices=LEGEND_ELIGIBLE[e.kind];
  if(e.kind==='legendarium')e.legendKind=LEGEND_KINDS[e.legendIndex];
  else{
    // One legend per active stage, starting with the second day (after the first night). Least-seen kinds first.
    const a=state.endless;if(!C.enabled||!choices||!a||a.debug||(e.lap??0)<(C.fromLap??2))return;
    a.legendStages??={};a.legendUse??={};if(a.legendStages[e.stage])return;
    const options=choices.filter(k=>!LEGEND_NIGHT.has(k)||e.night);if(!options.length)return;
    const least=Math.min(...options.map(k=>a.legendUse[k]||0));e.legendKind=pick(options.filter(k=>(a.legendUse[k]||0)===least));
    a.legendUse[e.legendKind]=(a.legendUse[e.legendKind]||0)+1;a.legendStages[e.stage]=e.legendKind;
  }
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
  }else if(kind==='gargoyle'){
    if(!e.town)prop('lodge',-260,100,{width:180,r:75,buildingKind:'inn'});
  }else if(kind==='mountain'){o.width=210;}else if(kind==='hut')o.width=165;
  else if(kind==='dragon'){o.width=165;}
  else if(kind==='thunderbird')o.width=120;
  else if(kind==='kitsune')o.width=65;
  setupLegendV2(o,scene);setupLegendV3(o,scene);
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
  if(!state.started)return;updateFoxSpirit(dt);updateLegendPlayerEffects(dt);
  for(const o of actors){
    o.temporary=o.temporary.filter(q=>{if(q.until<=clock)q.eaten=true;return !q.eaten;});
    if(o.defeated&&!o.bounty){o.bounty=true;if(o.legendKind==='cyclops')legendGift('sword',o,"THE CYCLOPS' CLUB!");}
    if(o.dead||o.eaten||o.defeated){restoreLegendSnow(o);continue;}
    // A kelpie you outran past its lake still gives up - and pays out if it never touched you.
    if(o.legendKind==='kelpie'&&o.huntUntil&&!o.gaveUp&&clock>=o.huntUntil){o.gaveUp=true;if(!o.huntHit)legendGift('shield',o,"THE KELPIE'S BRIDLE!");}
    if(!legendV2Nearby(o)){restoreLegendSnow(o);continue;}
    if(!o.announced&&Math.abs(p.y-o.homeY)<650){o.announced=true;announce(LEGEND_NAMES[o.legendKind].toUpperCase(),LEGEND_HINTS[o.legendKind],C.teal,3);}
    if(!o.activeAt&&p.y>o.homeY-850)o.activeAt=clock;
    if(!o.activeAt)continue;
    const elapsed=clock-o.activeAt; o.motionFromX=o.x;o.motionFromY=o.y;o.motionFromStamp=clock;
    if(updateLegendV2(o,dt,previous)){o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;continue;}
    if(o.legendKind==='giant'){
      // A long windy stretch around and after him: gusts every few seconds, a breeze in between. Rocks shelter.
      const cycle=elapsed%7,L=S.endless.regions.legendary;o.legendState=cycle<2?'inhale':cycle<5?'blowing':'rest';
      const inZone=y=>y>o.homeY-500&&y<o.homeY+(L.giantWindMetres??150)*PX_PER_M;o.inZone=inZone(p.y);
      const push=(o.legendState==='blowing'?L.giantGustMetresPerSecond:L.giantBreezeMetresPerSecond??2)*PX_PER_M*dt;
      if(o.inZone&&!legendSheltered(o,p.x,p.y)&&playerFree())p.x-=push;
      for(const c of labMonsters())if(inZone(c.y)&&!legendSheltered(o,c.x,c.y))c.x-=push*1.3;
      for(const n of viewItems(CAT_AUDIENCE_VIEW))if((n.type==='skier'||n.type==='boarder')&&!n.dead&&inZone(n.y)&&Math.abs(n.x-p.x)<700&&!legendSheltered(o,n.x,n.y))n.x-=push;
      for(const a of viewItems(PREY_VIEW))if(a.animal&&!a.dead&&inZone(a.y)&&Math.abs(a.x-p.x)<700)a.x-=push*1.2;
      // His frost charm sits upwind, where the gust pushes hardest.
      if(o.gift&&!o.giftTaken&&playerFree()&&p.air<=0&&Math.hypot(p.x-o.gift.x,p.y-o.gift.y)<32){o.giftTaken=true;legendGift('shield',o,'THE FROST CHARM!');}
    }else if(o.legendKind==='kelpie'){
      if(p.y>o.homeY-430){
        // The water horse hunts whoever crosses its lake. Its frozen wake is fast: ride it to get away.
        const hunting=o.huntUntil===undefined?(o.huntUntil=clock+S.endless.regions.legendary.kelpieHuntSeconds):o.huntUntil;
        const backing=o.backoffUntil>clock,goal=clock<hunting&&!p.fall&&!p.awaitingInput&&!backing?{x:p.x+p.vx*.35,y:p.y+p.vy*.35}:backing?{x:o.x+(o.x>p.x?300:-300),y:p.y+300}:{x:o.x+Math.sin(elapsed*1.1)*170,y:o.y+650};
        if(clock<hunting&&(p.fall>0||p.awaitingInput))o.huntHit=true;
        if(clock>=hunting&&!o.gaveUp){o.gaveUp=true;say('...',o,1);if(!o.huntHit)legendGift('shield',o,"THE KELPIE'S BRIDLE!");}
        if(o.gaveUp&&clock-o.huntUntil>4)o.eaten=true;
        travel(o,Math.atan2(goal.y-o.y,goal.x-o.x),topSpeed()*S.endless.regions.legendary.kelpieSpeedRatio,dt,false,false,true,false,goal,true);
        if(clock<hunting&&!backing&&legendBump(o,previous,o.x,o.y,26)){o.huntHit=true;o.backoffUntil=clock+3;}
        if(clock>=(o.wakeAt||0)){legendaryIce(o,o.x,o.y+70,36,78,9);o.wakeAt=clock+.45;}}
    }
    o.motionVx=(o.x-o.motionFromX)/dt;o.motionVy=(o.y-o.motionFromY)/dt;
  }
}
function drawLegendaryCreature(o,s){
  if(o.type!=='legendary')return false;if(drawLegendV2(o,s))return true;return drawLegendV3Creature(o,s);
}
function drawLegendaryGround(){
  const view=viewBounds();
  for(const o of legendActors()){
    if(!legendV2Nearby(o)||o.defeated)continue;
    drawLegendV2Marks(o);drawLegendV3Ground(o);
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
  for(const [label,fn] of [['‹',()=>debugLegendBay(Number(select.value)-1)],['Retry',()=>debugLegendBay(Number(select.value))],['›',()=>debugLegendBay(Number(select.value)+1)],['Day/night',()=>toggleDayNight()],['Exit',()=>{resetSummit();legendPanel.hidden=true;}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label==='‹'?'Previous creature':label==='›'?'Next creature':label);b.addEventListener('click',()=>{fn();canvas.focus({preventScroll:true});});legendPanel.append(b);}initCreatureLabButtons(legendPanel);document.querySelector('main').append(legendPanel);
}
