/* Frostline. All navigation is physical: ski through a gate, finish, keep skiing. */
window.FROSTLINE_READY = (async () => {
  'use strict';
  const S = await window.loadFrostlineConfig();
  const canvas = document.getElementById('slope');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = S.render.width, PX_PER_M = S.world.unitsPerMetre, ZOOM = S.render.zoom, TAU = Math.PI * 2;
  let H = S.render.defaultHeight, clock = 0, lastTime = 0, accumulator = 0, audio = null;
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const mix = (a,b,t) => a + (b-a)*t;
  const ease = (a,b,s,dt) => mix(a,b,1-Math.exp(-s*dt));
  const pick = arr => arr[Math.floor(random()*arr.length)];
  let seed = S.world.seed;
  function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }
  const range = (a,b) => a + random()*(b-a);
  const C = S.colors, stages = S.courses;
  // Source rectangles in the actual generated PNG atlases. No stand-in art.
  const atlas = S.atlas;
  const images = {}, spriteCache = new Map();
  const palette = S.palette;
  const paletteRGB=palette.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
  let ready = false;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('frostline-v2') || localStorage.getItem('frostline-save') || '{}'); } catch {}
  if(!stored||typeof stored!=='object'||Array.isArray(stored))stored={};
  for(const key of ['best','times'])if(!stored[key]||typeof stored[key]!=='object'||Array.isArray(stored[key]))stored[key]={};
  const state = {
    bank:Number.isFinite(stored.bank)?Math.max(0,Math.floor(stored.bank)):0,
    best:stored.best || {}, times:stored.times || {}, muted:stored.muted ?? false, started:false, activeTime:0,
    p:newPlayer(),
    cam:{x:0,y:-H*S.render.playerScreenY/ZOOM}, zone:{kind:'start',origin:0}, course:null,
    objects:[], trails:[], chasers:[], particles:[], speech:[], messages:[],
    input:{left:false,right:false,up:false,down:false,pointer:null,jump:false},
    lastTrack:null, generated:0, gateCount:0, elevated:0, screenShake:0, finishCount:0,
    freefallAt:0,nextFastSkier:2, results:null, receipts:[], transitions:[], soundReady:false,
    chunks:new Map(),safeTrails:[],roads:[],villages:[],liftRoutes:[],plannedTown:null,deathTimer:0,liftTimer:0,deaths:0,keyboardStep:0,control:'keyboard',lastSteer:-10
  };
  function newPlayer(){return {x:0,y:0,vx:0,vy:0,speed:0,heading:Math.PI/2,desiredHeading:Math.PI/2,mode:'still',awaitingInput:false,crashObstacle:null,fall:0,shield:0,air:0,airTotal:0,jumpHeight:0,spin:0,boost:0,jumpLock:0,onIce:false,iceHeading:0,icePushPending:false,airHeading:0,airSpeed:0,airSpin:0,rainbow:0};}
  function viewBounds(){return {left:state.cam.x-W/(2*ZOOM),right:state.cam.x+W/(2*ZOOM),top:state.cam.y,bottom:state.cam.y+H/ZOOM};}
  function belowView(margin=330){return Math.max(viewBounds().bottom,state.p.y+H*(1-S.render.playerScreenY)/ZOOM)+margin;}
  function topSpeed(){return (state.course?stages[state.course.id].pace:state.zone.kind==='village'?S.physics.villagePace:S.physics.freePace)*S.physics.speedMultiplier;}
  function save() { try { localStorage.setItem('frostline-v2',JSON.stringify({bank:state.bank,best:state.best,times:state.times,muted:state.muted})); } catch {} }
  function beep(freq,duration=.07,type='sine',gain=.025) {
    if(state.muted || !state.soundReady)return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration); } catch {}
  }
  function announce(title,detail='',color=C.teal,duration=S.render.messageSeconds) { state.messages.push({title,detail,color,until:clock+duration,start:clock});if(state.messages.length>S.render.messageLimit)state.messages.shift(); }
  function say(text,o,time=S.render.speechSeconds) { state.speech.push({text,object:o,until:clock+time}); if(state.speech.length>S.render.speechLimit)state.speech.shift(); }
  function burst(x,y,color,n=12) { for(let i=0;i<n;i++)state.particles.push({x,y,vx:range(-50,50),vy:range(-65,30),life:range(.25,.75),color}); }
  function entity(type,x,y,extra={}) {
    const o={type,x,y,homeX:x,homeY:y,id:random(),width:40,r:13,phase:range(0,TAU),touched:false,...extra};
    if((type==='pine'||type==='fir')&&!o.treeVariant)o.treeVariant=pick(S.spawnTables.treeVariants);
    state.objects.push(o);return o;
  }

  function entrance(id,x,y) { return entity('entrance',x,y,{stage:id,half:S.race.entryHalfWidth,width:S.race.entryHalfWidth*2,r:0}); }
  function clearEntrances(){const gates=state.objects.filter(o=>o.type==='entrance');state.objects=state.objects.filter(o=>o.r===0||!gates.some(g=>Math.abs(o.x-g.x)<g.half+40&&o.y>g.y-160&&o.y<g.y+50));}
  function startMeadow() {
    entity('lodge',-190,100,{width:140,r:50});
    entity('pine',185,105,{width:86,r:18});entity('fir',232,190,{width:63,r:16});
    entity('bush',-222,210,{width:42,r:12});entity('personYellow',-101,138,{width:32,r:11});
    entity('dog',91,187,{width:34,r:11,roam:20});
    S.race.entryChoices.forEach((id,i)=>entrance(id,(i-(S.race.entryChoices.length-1)/2)*300,450));
    for(let i=0;i<22;i++){
      const side=i%2?1:-1,y=-280+i*65,x=side*range(375,610);
      entity(i%3?'pine':'fir',x,y,{width:range(58,91),r:17});
    }
    entity('skier',-198,840,{width:42,r:13,vy:45,vx:4});entity('mushroom',164,810,{width:37,r:12});
    clearEntrances();
  }
  function centerAt(y,run=state.course) {
    if(!run)return 0;
    return run.x + Math.sin((y-run.startY)/S.world.courseWavelength[0])*S.world.courseSway[0] + Math.sin((y-run.startY)/S.world.courseWavelength[1])*S.world.courseSway[1];
  }
  function startCourse(id,gate) {
    if(state.course)return false;
    const s=stages[id],p=state.p,paid=state.bank>=s.fee;
    if(paid){state.bank-=s.fee;save();}
    const startY=belowView(S.race.courseOffscreenMargin),endY=startY+s.length*PX_PER_M;
    const run={id,objective:s.kind==='mushroom'?'mushrooms':'gates',collected:0,totalMushrooms:0,x:gate?.x??p.x,selectionY:gate?.y??p.y,startY,endY,points:0,hits:0,cleared:0,missed:0,tricks:0,time:0,violation:!paid,left:false,finishPassed:false,finishHalf:(s.kind==='forest'?S.race.forestGateHalfWidth:S.race.gateHalfWidth)*S.race.finishWidthMultiplier};
    state.results=null;state.safeTrails.push(run);state.course=run;state.zone={kind:'course',origin:startY};state.generated=startY+S.race.terrainStartOffset;state.gateCount=0;
    for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
    if(run.objective!=='mushrooms'&&s.spacing){let count=0;for(let y=startY+S.race.gateStartOffset;y<endY-S.race.gateFinishClearance;y+=s.spacing){
      const x=centerAt(y,run)+(count%2===0?-1:1)*(s.kind==='forest'?S.race.forestGateSwing:S.race.gateSwing);
      entity('gate',x,y,{half:s.kind==='forest'?S.race.forestGateHalfWidth:S.race.gateHalfWidth,width:180,r:0,number:++count,color:count%2?C.red:C.blue,checked:false,run});
    }run.totalGates=count;}
    entity('courseStart',run.x,startY,{r:0,width:700,name:s.name});entity('finish',run.x,endY,{r:0,width:run.finishHalf*2,half:run.finishHalf});
    // Spectators exist before the finish comes into view; a perfect run activates their celebration.
    for(let i=0;i<S.race.spectators;i++)entity(i%2?'personYellow':'personRed',run.x+(i%2?1:-1)*(run.finishHalf+65+(i%3)*20),endY+80+Math.floor(i/2)*105,{width:30,r:10,cheerRun:run});
    state.plannedTown=makeVillage(endY+S.race.townAfterFinish,run.x,false);
    protectScenery();
    if(id!=='slalom'&&run.objective!=='mushrooms'){entity('ice',run.x+290,startY+940,{rx:185,ry:250,width:370,r:0});
    entity('ice',run.x-240,startY+1940,{rx:85,ry:105,width:170,r:0});
    for(let y=startY+S.race.rainbowFirstOffset;y<endY-300;y+=s.kind==='freestyle'?S.race.freestyleRainbowSpacing:S.race.rainbowSpacing)entity('rainbow',centerAt(y,run)-90,y,{width:115,r:25});}
    if(run.objective==='mushrooms')plantMushrooms(run);
    if(id==='slalom')state.objects=state.objects.filter(o=>!classicArea(o.x,o.y,70)||['gate','courseStart','finish','entrance','skier','boarder','personRed','personGreen','personYellow'].includes(o.type));
    const oldRoute=state.liftRoutes[state.liftRoutes.length-1];
    if(oldRoute&&oldRoute.y1>startY)oldRoute.y1=startY;
    state.liftRoutes.push({x0:oldRoute?liftX(oldRoute,startY):run.x+S.lift.x,x1:state.plannedTown.stationX,y0:startY,y1:state.plannedTown.stationY});
    announce(s.name.toUpperCase(),`${s.length} m ahead${s.fee?(paid?`  ·  ${s.fee} coins paid`:'  ·  Unpaid adventure!'):'  ·  Follow the flags.'}`,s.color);
    if(run.objective==='mushrooms')announce('SPORE DECISIONS',`COLLECT ${Math.ceil(run.totalMushrooms*S.mushroomHunt.minimumFraction)}/${run.totalMushrooms} MUSHROOMS - THEN FINISH${s.fee&&paid?' · '+s.fee+' PAID':''}`,s.color,5);
    if(!paid)triggerAmbush();else if(s.kind==='slow'){addChasers('slow',S.politePursuit.count,run);announce('POLITE PURSUIT',`${S.politePursuit.count} SLOW YETIS - THEY FOLLOW YOU OFF PISTE`,s.color,5);}else if(s.kind==='fast')addChasers('fast',1);
    state.transitions.push({kind:'start',id,y:p.y,paid});beep(650,.14);return true;
  }

  function nearMushroom(x,y,radius=S.mushroomHunt.obstacleClearance){return state.objects.some(o=>o.collectible&&!o.collected&&Math.hypot(o.x-x,o.y-y)<radius);}
  function plantMushrooms(run){
    const M=S.mushroomHunt,span=run.endY-run.startY,first=run.startY+Math.min(M.startClearance,span*.2),last=run.endY-Math.min(M.finishClearance,span*.2);
    let offset=range(-M.spread*.5,M.spread*.5);const pickups=[];
    for(let i=0;i<M.count;i++){
      offset=clamp(offset+range(-M.maxLateralShift,M.maxLateralShift),-M.spread,M.spread);
      const y=M.count===1?(first+last)/2:mix(first,last,i/(M.count-1));
      pickups.push(entity('mushroom',centerAt(y,run)+offset,y,{width:M.spriteWidth,r:M.pickupRadius,collectible:true,run,number:i+1}));
    }
    run.totalMushrooms=pickups.length;
    // The entire hunt is below the viewport at selection. Reserve reachable pickup pockets now.
    state.objects=state.objects.filter(o=>o.collectible||!pickups.some(m=>
      o.type==='ice'?lakeContains(o,m.x,m.y):o.r>0&&obstacleClearance(o,m.x,m.y)<M.obstacleClearance));
  }
  function collectMushroom(o){
    const run=state.course,p=state.p;
    if(o.collected||o.run!==run||run?.objective!=='mushrooms'||p.air>0||p.fall||p.awaitingInput||state.deathTimer)return;
    o.collected=true;o.r=0;run.collected++;run.points+=S.mushroomHunt.pointsEach;
    burst(o.x,o.y,C.gold,8);say('+'+S.mushroomHunt.pointsEach,o,.7);beep(660+(run.collected%5)*65,.06);
  }
  function addChasers(kind,count,chaseRun=null) {
    const speed=topSpeed()*(chaseRun?S.politePursuit.speedRatio:S.chasers.speedRatios[kind]);
    for(let i=0;i<count;i++){
      let x=state.p.x+range(-90,90),y=state.cam.y-S.chasers.spawnAbove-i*S.chasers.spawnSpacing;
      if(['fast','slow','bear'].includes(kind))while(humanArea(x,y))x+=(i%2?-1:1)*440;
      state.chasers.push({kind,x,y,speed,chaseRun,id:random(),phase:range(0,6),expires:Infinity,leaving:false,talkAt:clock+range(4,8)});
    }
  }

  function triggerAmbush(forced) {
    const kind=forced || pick(['fast','patrol','dog']);
    addChasers(kind,S.chasers.ambushCount[kind]);
    announce('UNPAID ADVENTURE',kind==='fast'?'Three yetis outside the flags. Stay on the piste!':kind==='patrol'?'Ski patrol would like a word.':'The dogs have your scent. And no other plans.',C.red,4.5);
    state.course.ambush=kind;
  }
  function formatTime(seconds){const cs=Math.max(0,Math.round(seconds*100));return `${Math.floor(cs/6000)}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
  function timingSignature(id){const c=stages[id],rules=[S.timing.recordVersion,c.length,c.spacing,c.pace,S.physics,S.race,S.controls,S.jump,S.world.courseSway,S.world.courseWavelength];if(c.kind==='mushroom')rules.push(S.mushroomHunt);if(c.kind==='slow')rules.push(S.politePursuit);return JSON.stringify(rules);}
  function courseRecord(id){const saved=state.times[id];return saved?.signature===timingSignature(id)&&Number.isFinite(saved.bestSeconds)&&saved.bestSeconds>0?saved:null;}
  function creditRun(caught=false) {
    if(caught){die('YETI');return;}
    const run=state.course;if(!run)return;
    const collection=run.objective==='mushrooms',total=collection?run.totalMushrooms:run.totalGates||0,completed=collection?run.collected:run.cleared,minimum=collection?S.mushroomHunt.minimumFraction:S.race.minimumGateFraction,required=Math.ceil(total*minimum),passed=run.finishPassed&&completed>=required;
    const perfect=passed&&total>0&&completed===total,eligible=passed&&!run.violation;
    const bonus=eligible?S.race.finishBase+(run.hits===0?S.race.cleanBonus:Math.max(0,S.race.crashedBonus-run.hits*S.race.crashPenalty)):0;
    const target=S.timing.targets[run.id],timed=S.timing.enabled&&total>0&&!!target;
    const speedBonus=eligible&&timed?Math.round(S.timing.maxBonus*clamp((target.parSeconds-run.time)/(target.parSeconds-target.goldSeconds),0,1)):0;
    const earned=eligible?run.points+bonus+speedBonus:0;
    const reason=!run.finishPassed?'MISSED THE FINISH FLAGS':completed<required?(collection?`NEED ${required}/${total} MUSHROOMS`:`NEED AT LEAST ${Math.round(minimum*100)}% OF GATES`):run.violation?'UNPAID ENTRY - NO REWARD':'';
    const prior=courseRecord(run.id),newBest=eligible&&timed&&(!prior?.bestSeconds||run.time<prior.bestSeconds);
    if(timed){
      const history=[...(Array.isArray(state.times[run.id]?.history)?state.times[run.id].history:[]),{seconds:Math.round(run.time*100)/100,objective:run.objective,cleared:completed,collected:run.collected,total,crashes:run.hits,passed,paid:!run.violation,speedBonus,date:new Date().toISOString(),signature:timingSignature(run.id)}].slice(-S.timing.historyLimit);
      state.times[run.id]={signature:timingSignature(run.id),bestSeconds:newBest?run.time:prior?.bestSeconds??null,lastSeconds:run.time,history};
    }
    if(earned){state.bank+=earned;state.best[run.id]=Math.max(state.best[run.id]||0,earned);}save();
    const result={id:run.id,earned,bonus,speedBonus,newBest,bestSeconds:courseRecord(run.id)?.bestSeconds,timed,collection,cleared:completed,total,required,missed:total-completed,hit:run.hits,tricks:run.tricks,time:run.time,points:run.points,caught:false,passed,perfect,unpaid:run.violation,reason,until:clock+S.render.resultSeconds};
    state.receipts.push(result);state.results=result;
    if(passed)state.finishCount++;
    if(perfect){
      let n=0;for(const o of state.objects)if(o.cheerRun===run){o.cheerUntil=clock+S.render.cheerSeconds;o.nextCheer=clock+(n++)*.45;}
      burst(state.p.x,state.p.y,C.gold,34);
    }
    beep(passed?880:210,.2);state.course=null;
    for(const c of state.chasers)c.expires=state.p.y+(c.kind==='dog'?1600:220);
    const town=state.plannedTown||makeVillage(belowView(300),state.p.x,false);
    state.zone={kind:'village',origin:town.origin,x:town.x,end:town.end};state.transitions.push({kind:'village',y:state.p.y});state.plannedTown=null;
  }

  function die(cause='YETI') {
    if(state.deathTimer)return;state.deathTimer=S.physics.deathSeconds;state.deaths++;
    state.p.fall=2;state.p.speed=0;state.p.vx=state.p.vy=0;
    announce(cause==='BEAR'?'BEAR HUG. TOO MUCH BEAR.':cause==='WOLF'?'THE PACK CAUGHT YOU.':'THE YETI GOT YOU.',`Back to the summit. Your ${state.bank} coins are safe.`,C.red,3);
    beep(110,.3,'triangle');save();
  }
  function resetSummit(lift=false){
    state.p=newPlayer();state.results=null;state.course=null;state.zone={kind:'start',origin:0};state.objects=[];state.trails=[];state.chasers=[];state.particles=[];state.speech=[];state.messages=[];
    state.roads=[];state.villages=[];state.safeTrails=[];state.liftRoutes=[];state.chunks.clear();state.plannedTown=null;state.generated=0;state.lastTrack=null;state.started=false;state.activeTime=0;state.keyboardStep=0;state.control='keyboard';state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};state.deathTimer=state.liftTimer=0;state.elevated=0;state.nextFastSkier=clock+2;
    state.cam={x:0,y:-H*S.render.playerScreenY/ZOOM};startMeadow();state.liftRoutes.push({x0:S.lift.x,x1:S.lift.x,y0:S.lift.startY,y1:Infinity});ensureWorld(true);
    announce(lift?'BACK AT THE SUMMIT':'ANOTHER DAY. SAME WALLET.',`${state.bank} coins  ·  Choose a trail and ski.`,C.teal,3.5);
  }

  function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
  function roadDistance(road,x,y){let d=Infinity;for(let i=1;i<road.points.length;i++)d=Math.min(d,segmentDistance(x,y,road.points[i-1],road.points[i]));return d;}
  function houseClearance(o,x,y){
    const hw=o.width*S.village.houseFootWidthRatio,hh=o.width*S.village.houseFootHeightRatio;
    const dx=Math.abs(x-o.x)-hw,dy=Math.abs(y-(o.y-hh))-hh;
    return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0);
  }
  function obstacleClearance(o,x,y){return ['lodge','rental'].includes(o.type)?houseClearance(o,x,y):Math.hypot(x-o.x,(y-o.y)*S.physics.collisionYScale)-o.r;}
  function laneRoute(start,goal,houses,town){
    const V=S.village,g=V.pathGrid,key=(x,y)=>x+','+y,cell=p=>({x:Math.round((p.x-town.x)/g),y:Math.round((p.y-town.origin)/g)}),world=n=>({x:town.x+n.x*g,y:town.origin+n.y*g});
    const a=cell(start),b=cell(goal),open=[],seen=new Map([[key(a.x,a.y),0]]),parents=new Map();
    const push=n=>{open.push(n);let i=open.length-1;while(i){const parent=(i-1)>>1;if(open[parent].score<=n.score)break;open[i]=open[parent];i=parent;}open[i]=n;};
    const pop=()=>{const best=open[0],tail=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&open[child+1].score<open[child].score)child++;if(open[child].score>=tail.score)break;open[i]=open[child];i=child;}open[i]=tail;}return best;};
    push({...a,cost:0,score:0});
    const blocked=n=>{const p=world(n);return Math.abs(p.x-town.x)>V.halfWidth||p.y<town.origin+V.roadStartY-g||p.y>town.roadEndY+g||houses.some(h=>houseClearance(h,p.x,p.y)<V.laneWidth/2+5);};
    let found=null;
    for(let count=0;open.length&&count<V.pathMaxNodes;count++){
      const n=pop();if(n.cost>seen.get(key(n.x,n.y)))continue;
      if(n.x===b.x&&n.y===b.y){found=n;break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const q={x:n.x+dx,y:n.y+dy};if(blocked(q)||dx&&dy&&(blocked({x:n.x+dx,y:n.y})||blocked({x:n.x,y:n.y+dy})))continue;
        const cost=n.cost+Math.hypot(dx,dy),k=key(q.x,q.y);if(cost>=(seen.get(k)??Infinity))continue;
        seen.set(k,cost);parents.set(k,n);push({...q,cost,score:cost+Math.hypot(q.x-b.x,q.y-b.y)});
      }
    }
    if(!found)return null;
    const points=[goal];for(let n=found;n;n=parents.get(key(n.x,n.y)))points.push(world(n));points.push(start);points.reverse();
    return points.filter((p,i)=>!i||i===points.length-1||Math.abs((p.x-points[i-1].x)*(points[i+1].y-p.y)-(p.y-points[i-1].y)*(points[i+1].x-p.x))>.1);
  }
  function makeVillage(origin,base=state.p.x,activate=true) {
    const V=S.village,R=V.randomization,varied=R.enabled;
    // Build once, below the viewport. A dedicated generator keeps each layout stable afterwards.
    const layoutSeed=R.seed?(R.seed+Math.imul(state.villages.length+1,2654435761))>>>0:Math.floor(Math.random()*4294967296)>>>0;
    let layoutState=layoutSeed;
    const rand=()=>{layoutState=(Math.imul(layoutState,1664525)+1013904223)>>>0;return layoutState/4294967296;};
    const between=(a,b)=>a+rand()*(b-a),choose=values=>values[Math.floor(rand()*values.length)];
    const shuffled=values=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
    const rowYs=[origin+V.firstRow+(varied?between(-R.firstRowJitter,R.firstRowJitter):0)];
    for(let row=1;row<V.rows;row++)rowYs.push(rowYs[row-1]+Math.max(V.corridorEntryOffset+V.corridorExitOffset+V.roadClearance*2,V.rowSpacing*(varied?between(...R.rowSpacingScale):1)));
    const lengthChange=rowYs.at(-1)-(origin+V.firstRow+(V.rows-1)*V.rowSpacing);
    const town={origin,x:base,end:origin+V.endOffset+lengthChange,roadEndY:origin+V.roadEndY+lengthChange,layoutSeed};
    town.stationX=base+(varied?choose([-1,1]):1)*(V.stationX+(varied?between(-R.stationJitterX,R.stationJitterX):0));
    town.stationY=clamp(origin+V.stationY+lengthChange+(varied?between(-R.stationJitterY,R.stationJitterY):0),rowYs.at(-1)+V.stationClearance,town.roadEndY-60);
    state.villages.push(town);
    if(activate){state.zone={kind:'village',origin,x:base,end:town.end};state.transitions.push({kind:'village',y:state.p.y});}
    entity('villageTitle',base,origin+10,{r:0,width:300});
    const phase=varied?Math.floor(rand()*V.corridorOffsets.length):0,mirror=varied?choose([-1,1]):1,reverse=varied?choose([-1,1]):1,scale=varied?between(...R.corridorScale):1;
    const centers=[],halfWidths=[],styles=[];
    const maxOffset=Math.max(0,V.halfWidth-V.corridorHalfWidth-V.houseWidth[1]);
    for(let row=0;row<V.rows;row++){
      const index=((phase+row*reverse)%V.corridorOffsets.length+V.corridorOffsets.length)%V.corridorOffsets.length;
      let offset=V.corridorOffsets[index]*mirror*scale+(varied?between(-R.corridorJitter,R.corridorJitter):0);
      if(varied&&row)offset=clamp(offset,centers[row-1]-base-R.maxBendStep,centers[row-1]-base+R.maxBendStep);
      centers.push(base+clamp(offset,-maxOffset,maxOffset));halfWidths.push(V.corridorHalfWidth*(varied?between(...R.corridorWidthScale):1));styles.push(varied?Math.floor(rand()*S.houseAnimation.trimRGB.length):row%4);
    }
    const plazaCount=varied?Math.max(0,V.plazaRows.length+Math.floor(between(-R.plazaCountVariation,R.plazaCountVariation+1))):V.plazaRows.length;
    const plazaRows=[];
    if(varied){for(const row of shuffled(Array.from({length:Math.max(0,V.rows-2)},(_,i)=>i+1))){if(plazaRows.length>=plazaCount)break;if(plazaRows.every(other=>Math.abs(other-row)>1))plazaRows.push(row);}}
    else plazaRows.push(...V.plazaRows.filter(row=>row<V.rows));
    const main={surface:V.mainRoadSurface,width:V.mainRoadWidth,points:[{x:base,y:origin+V.roadStartY}]};
    for(let row=0;row<V.rows;row++)main.points.push({x:centers[row],y:rowYs[row]-V.corridorEntryOffset},{x:centers[row],y:rowYs[row]+V.corridorExitOffset});
    main.points.push({x:base,y:town.roadEndY});
    town.route=main.points;town.plazaRows=plazaRows;
    const station={x:town.stationX,y:town.stationY};
    const nearest=main.points.reduce((a,b)=>Math.hypot(a.x-station.x,a.y-station.y)<Math.hypot(b.x-station.x,b.y-station.y)?a:b);
    const branch={surface:V.mainRoadSurface,width:V.mainRoadWidth,points:[nearest,{x:station.x,y:nearest.y},station]},roads=[main,branch],houses=[];
    const houseCount=Math.round(V.houseCount*(varied?between(...R.houseCountScale):1));
    // Fill the inner walls along the whole route first, then grow outward into blocks.
    const rings=Math.ceil(V.halfWidth*2/V.housePitch);
    for(let ring=0;ring<rings&&houses.length<houseCount;ring++)for(const row of (varied?shuffled(Array.from({length:V.rows},(_,i)=>i)):Array.from({length:V.rows},(_,i)=>i)))for(const side of [-1,1]){
      if(houses.length>=houseCount)break;
      if(varied&&ring>0&&rand()<R.outerGapChance)continue;
      const style=varied?(rand()<.7?styles[row]:Math.floor(rand()*S.houseAnimation.trimRGB.length)):(row+ring+(side>0?1:0))%4;
      const width=varied?between(...V.houseWidth):mix(V.houseWidth[0],V.houseWidth[1],((row*7+ring*3+(side>0?2:0))%5)/4);
      const x=centers[row]+side*(halfWidths[row]+V.houseWidth[1]*V.houseFootWidthRatio+ring*V.housePitch+(varied?between(0,R.houseJitterX):0)),y=rowYs[row]+(varied?between(-R.houseJitterY,R.houseJitterY):0);
      const candidate={x,y,width},hw=width*V.houseFootWidthRatio,hh=width*V.houseFootHeightRatio;
      if(Math.abs(x-base)+hw>V.halfWidth||Math.hypot(x-station.x,y-station.y)<V.stationClearance+hw)continue;
      if(houses.some(h=>Math.abs(x-h.x)<(width+h.width)*V.houseFootWidthRatio+V.houseGap&&Math.abs((y-hh)-(h.y-h.width*V.houseFootHeightRatio))<(width+h.width)*V.houseFootHeightRatio+V.houseGap))continue;
      if(roads.some(r=>r.points.some((b,i)=>{if(!i)return false;const a=r.points[i-1],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12);for(let j=0;j<=n;j++)if(houseClearance(candidate,mix(a.x,b.x,j/(n||1)),mix(a.y,b.y,j/(n||1)))<r.width/2+V.roadClearance)return true;return false;})))continue;
      houses.push(entity(varied?(rand()<.35?'lodge':'rental'):(row+ring)%3?'rental':'lodge',x,y,{width,r:hw,town,houseStyle:style}));
    }
    const network=main.points.slice();
    for(const h of houses){
      const door={x:h.x,y:h.y+V.laneWidth/2+V.pathGrid},goal=network.reduce((a,b)=>Math.hypot(a.x-door.x,a.y-door.y)<Math.hypot(b.x-door.x,b.y-door.y)?a:b);
      const points=laneRoute(door,goal,houses,town);
      if(points){points.unshift({x:h.x,y:h.y+14});roads.push({surface:'paved',width:V.laneWidth,points});network.push(...points.slice(1));}
    }
    state.roads.push(...roads);
    const decorate=(type,x,y,extra)=>{
      if(roads.some(r=>r.surface==='snow'&&roadDistance(r,x,y)<r.width/2+extra.r+12)||houses.some(h=>houseClearance(h,x,y)<extra.r+8))return;
      entity(type,x,y,{...extra,town});
    };
    for(const row of plazaRows){const x=centers[row],y=rowYs[row]+V.corridorExitOffset,half=halfWidths[row],side=varied?choose([-1,1]):1;
      for(const sign of [-1,1])decorate('lamp',x+sign*(half-22),y,{width:20,r:6});
      entity('bunting',x,y-95,{width:half*2,r:0,town});
      decorate('bench',x+side*(half-26),y+55,{width:46,r:9});
      decorate('snowman',x-side*(half-24),y+58,{width:28,r:9});
    }
    for(let i=0;i<V.walkers;i++){
      const path=pick(roads).points,at=Math.floor(random()*path.length),p=path[at];
      entity(pick(['personRed','personYellow','personGreen']),p.x,p.y,{width:30,r:10,walker:true,path,pathIndex:at,pathDir:at===path.length-1?-1:1,walkSpeed:range(...V.walkerSpeed),town});
    }
    for(let i=0;i<V.catCount;i++){const h=pick(houses)||{x:base,y:origin+V.firstRow};entity('cat',h.x+40,h.y+40,{width:27,r:8,animal:true,ai:'idle',nextAI:clock+2,climb:0,town});}
    for(let i=0;i<V.dogCount;i++){const p=pick(main.points);entity('dog',p.x+45,p.y,{width:34,r:10,roam:15,town});}
    for(let i=0;i<V.skierCount;i++){const p=pick(main.points);entity('skier',p.x,p.y,{width:42,r:12,vy:30,vx:0,town});}
    entity('lift',station.x,station.y,{width:174,r:0,half:73,used:false,town});entity('liftLabel',station.x,station.y+55,{r:0,width:160,town});
    S.race.villageChoices.forEach((id,i)=>entrance(id,base+(i-(S.race.villageChoices.length-1)/2)*V.choiceSpacing,origin+V.choiceY+lengthChange));
    entity('trailChoices',base,origin+V.choiceTitleY+lengthChange,{r:0,width:400});return town;
  }
  function drawRoads(){
    const V=S.village,unit=V.roadTileSize;
    // Snow covers side-path junctions, matching the surface priority used by physics.
    for(const r of [...state.roads].sort((a,b)=>Number(a.surface==='snow')-Number(b.surface==='snow'))){
      r.bounds??={left:Math.min(...r.points.map(p=>p.x))-r.width,right:Math.max(...r.points.map(p=>p.x))+r.width,top:Math.min(...r.points.map(p=>p.y))-r.width,bottom:Math.max(...r.points.map(p=>p.y))+r.width};
      const view=viewBounds();if(r.bounds.right<view.left||r.bounds.left>view.right||r.bounds.bottom<view.top||r.bounds.top>view.bottom)continue;
      if(!r.tiles){const cells=new Map();for(let i=1;i<r.points.length;i++){
        const a=r.points[i-1],b=r.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/V.roadSampleSpacing);
        for(let j=0;j<=steps;j++){const x=mix(a.x,b.x,j/(steps||1)),y=mix(a.y,b.y,j/(steps||1)),n=Math.ceil(r.width/2/unit);
          for(let dx=-n;dx<=n;dx++)for(let dy=-n;dy<=n;dy++){const tx=Math.floor(x/unit)+dx,ty=Math.floor(y/unit)+dy;if(segmentDistance((tx+.5)*unit,(ty+.5)*unit,a,b)<=r.width/2)cells.set(tx+','+ty,{x:tx*unit,y:ty*unit,edge:r.surface==='snow'&&roadDistance(r,(tx+.5)*unit,(ty+.5)*unit)>r.width/2-unit*.8,grain:Math.abs(tx*17+ty*31)%17,color:Math.abs(tx*17+ty*31)%7<2?V.roadColors[3]:V.roadColors[2]});}
        }
      }r.tiles=[...cells.values()];}
      for(const cell of r.tiles){
        const a=screen(cell.x,cell.y);if(a.x<-unit*ZOOM||a.x>W||a.y<-unit*ZOOM||a.y>H)continue;
        const tile=Math.ceil(unit*ZOOM)+1;
        if(r.surface==='snow'){
          const colors=V.snowRoadColors;
          box(a.x,a.y,tile,tile,cell.edge?colors[0]:colors[1]);
          if(cell.edge&&cell.grain<4)box(a.x+1,a.y+2,3,1,colors[2]);
          else if(!cell.edge&&cell.grain<3)box(a.x+1,a.y+2,Math.max(2,tile-3),1,colors[2]);
          else if(cell.grain===8)box(a.x+2,a.y+4,2,1,colors[3]);
        }else{
          box(a.x,a.y,tile,tile,V.roadColors[1]);box(a.x+1,a.y+1,Math.max(1,unit*ZOOM-1),Math.max(1,unit*ZOOM-1),cell.color);
        }
      }
    }
  }
  function liftX(route,y){return mix(route.x0,route.x1,clamp((y-route.y0)/S.lift.routeBendDistance,0,1));}
  function insideTown(x,y){return state.villages.some(t=>Math.abs(x-t.x)<S.village.halfWidth+150&&y>t.origin-70&&y<t.end);}
  // Preserve protected corridors after a run ends, including when walking back uphill.
  function humanArea(x,y){
    return (Math.abs(x)<S.world.safeSummitHalfWidth&&y>S.world.safeSummitTop&&y<S.world.safeSummitBottom)||insideTown(x,y)||state.safeTrails.some(r=>y>r.selectionY-80&&y<r.endY+350&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth);
  }
  function classicArea(x,y,margin=0){return state.safeTrails.some(r=>r.id==='slalom'&&y>r.startY-120-margin&&y<r.endY+60+margin&&Math.abs(x-centerAt(y,r))<S.world.safeCourseHalfWidth+margin);}
  function spawnWolfPack(x,y,extra={}){
    const existing=state.objects.filter(o=>o.type==='wolf'&&!o.dead);
    const nearbyPacks=new Set(existing.filter(o=>Math.hypot(o.x-x,o.y-y)<S.wildlife.packLimitRadius).map(o=>o.packId));
    if(existing.some(o=>Math.hypot(o.x-x,o.y-y)<S.wildlife.packSpawnSeparation)||nearbyPacks.size>=S.wildlife.packLimit)return [];
    const packId=random(),count=Math.floor(range(S.wildlife.packMin,S.wildlife.packMax+1)),visitor=humanArea(x,y),wolves=[];
    for(let i=0;i<count;i++){
      let xx=x+(i%2?1:-1)*i*S.wildlife.packSpacingX,yy=y+Math.floor(i/2)*S.wildlife.packSpacingY;
      if(!visitor&&humanArea(xx,yy)){xx=x;yy=y+i*18;}
      wolves.push(entity('wolf',xx,yy,{width:43,r:11,animal:true,packId,packIndex:i,humanVisitor:visitor,ai:'idle',nextAI:clock+range(1,4),...extra}));
    }return wolves;
  }
  function spawnFastSkier(){
    if(!state.started||state.p.awaitingInput||insideTown(state.p.x,state.p.y)||clock<state.nextFastSkier)return;
    state.nextFastSkier=clock+range(...S.skiers.fastSpawnSeconds);
    const y=viewBounds().top-S.skiers.fastSpawnAbove,x=state.p.x+pick([-1,1])*range(...S.skiers.fastSpawnOffsetX);
    if(insideTown(x,y))return;
    entity('skier',x,y,{width:44,r:12,fast:true,vy:topSpeed()*S.skiers.fastSpeedRatio,vx:range(-13,13)});
  }
  function ambientType(x,y){
    const roll=random();
    if(classicArea(x,y,70))return pick(['skier','skier','personGreen']);
    if(y<S.world.uphillForestY&&roll<S.world.uphillTreeChance)return pick(['pine','pine','fir']);
    if(humanArea(x,y))return roll<S.world.humanPredatorChance?(random()<S.world.wolfShareOfPredators?'wolf':'fox'):pick(S.spawnTables.human);
    return roll<S.world.wildPredatorChance?(random()<S.world.wolfShareOfPredators?'wolf':'fox'):pick(S.spawnTables.wild);
  }
  function protectScenery(){
    // Newly selected terrain is below the viewport; don't reveal replacements on screen.
    const bottom=viewBounds().bottom;
    for(const o of state.objects)if(o.y>bottom+100&&humanArea(o.x,o.y)&&['bear','lurker','fox','wolf'].includes(o.type)){
      o.type='bush';o.width=35;o.r=10;o.animal=false;o.ai='idle';
    }
  }
  function polygonContains(points,x,y){
    let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  }
  function lakeGeometry(o){
    if(o.lake)return o.lake;
    const points=[],phase=o.phase||0,shape=Math.floor((o.id||0)*4),rotation=Math.sin(phase)*.32;
    for(let i=0;i<64;i++){
      const a=i/64*TAU;
      let r=.84+.12*Math.sin(a*3+phase)+.055*Math.sin(a*7-phase);
      if(shape===0)r*=1-.4*Math.exp(-(((Math.atan2(Math.sin(a),Math.cos(a))-.5)/.48)**2));
      if(shape===1)r*=.72+.28*Math.abs(Math.cos(a));
      if(shape===2)r*=.73+.27*Math.abs(Math.sin(a));
      const x=Math.cos(a)*o.rx*r,y=Math.sin(a)*o.ry*r;
      points.push([Math.round((x*Math.cos(rotation)-y*Math.sin(rotation))/4)*4,Math.round((x*Math.sin(rotation)+y*Math.cos(rotation))/4)*4]);
    }
    const holes=[];
    if(Math.min(o.rx,o.ry)>115&&shape!==1){
      const hole=[];for(let i=0;i<12;i++){const a=i/12*TAU,r=1+.15*Math.sin(a*3+phase);hole.push([o.rx*.17+Math.cos(a)*o.rx*.17*r,-o.ry*.12+Math.sin(a)*o.ry*.14*r]);}holes.push(hole);
    }
    const radius=Math.ceil(Math.max(o.rx,o.ry)*1.15/4)*4;
    return o.lake={points,holes,radius};
  }
  function lakeContains(o,x,y){
    const dx=x-o.x,dy=y-o.y,g=lakeGeometry(o);
    if(Math.abs(dx)>g.radius||Math.abs(dy)>g.radius)return false;
    return polygonContains(g.points,dx,dy)&&!g.holes.some(h=>polygonContains(h,dx,dy));
  }
  function patchAt(x,y){return state.objects.find(o=>o.type==='ice'&&lakeContains(o,x,y));}
  function onRoad(x,y){
    // Only exposed paving slows skis. A snow-covered main road wins at intersections.
    const roads=state.roads.filter(r=>roadDistance(r,x,y)<r.width/2);
    return !roads.some(r=>r.surface==='snow')&&roads.some(r=>r.surface!=='snow');
  }
  function ensureWorld(initial=false){
    const b=viewBounds(),size=S.world.chunkSize;
    for(let tx=Math.floor((b.left-S.world.chunkMarginX)/size);tx<=Math.floor((b.right+S.world.chunkMarginX)/size);tx++)for(let ty=Math.floor((b.top-S.world.chunkMarginAbove)/size);ty<=Math.floor((b.bottom+S.world.chunkMarginBelow)/size);ty++){
      const key=tx+','+ty;if(state.chunks.has(key))continue;state.chunks.set(key,{tx,ty});
      for(let i=0;i<(ty<0?S.world.uphillCount:S.world.ambientCount);i++){
        const x=tx*size+range(65,size-65),y=ty*size+range(80,size-60);
        if(nearMushroom(x,y)||patchAt(x,y)||insideTown(x,y)||(!state.course&&state.zone.kind==='start'&&Math.abs(x)<S.world.meadowHalfWidth&&y>S.world.meadowTop&&y<S.world.meadowBottom))continue;
        if(state.objects.some(o=>(o.type==='gate'||o.type==='entrance')&&Math.abs(o.x-x)<o.half+60&&Math.abs(o.y-y)<140))continue;
        const type=ambientType(x,y);
        if(type==='wolf'){if(!spawnWolfPack(x,y,{worldChunk:key}).length)entity('fir',x,y,{width:65,r:16,worldChunk:key});continue;}
        const fast=type==='skier'&&random()<S.skiers.ambientFastChance;
        const widths={pine:range(60,90),fir:range(52,74),rock:44,pebble:28,skier:42,personGreen:30,rabbit:20,fox:39,wolf:43,bear:44,cat:25,lurker:55,bush:35};
        entity(type,x,y,{worldChunk:key,fast,width:widths[type],r:['lurker','bear'].includes(type)?18:type==='rabbit'?5:12,animal:['rabbit','fox','wolf','bear','cat'].includes(type),humanVisitor:humanArea(x,y)||random()<S.world.animalVisitorChance,ai:'idle',nextAI:clock+range(1,5),climb:0,vy:type==='skier'?(fast?range(...S.skiers.fastSpeed):range(...S.skiers.slowSpeed)):0});
      }
      if(random()<S.world.lakeChance){const x=(tx+.5)*size,y=(ty+.5)*size;if(!insideTown(x,y)&&!classicArea(x,y,360)&&y>S.world.lakeMinY&&!state.objects.some(o=>o.type==='gate'&&Math.hypot(o.x-x,o.y-y)<260||o.collectible&&Math.hypot(o.x-x,o.y-y)<360))entity('ice',x,y,{worldChunk:key,rx:range(...S.world.lakeRadiusX),ry:range(...S.world.lakeRadiusY),width:330,r:0});}
    }
    for(const [key,t] of state.chunks)if(Math.abs(t.ty*size-state.p.y) >S.world.chunkRetention||Math.abs(t.tx*size-state.p.x) >S.world.chunkRetention){state.chunks.delete(key);state.objects=state.objects.filter(o=>o.worldChunk!==key);}
  }

  function spawnTerrain() {
    const run=state.course;if(!run)return;
    const s=stages[run.id],limit=Math.min(run.endY-100,viewBounds().bottom+680);
    while(state.generated<limit){
      const y=state.generated,center=centerAt(y),nearGate=state.objects.find(o=>o.type==='gate'&&Math.abs(o.y-y)<135);
      const amount=random()<s.density*S.world.terrainDensityChance?2:1;
      for(let i=0;i<amount;i++){
        let x=center+range(-S.world.terrainOffsetX,S.world.terrainOffsetX);if(nearGate&&Math.abs(x-nearGate.x)<nearGate.half+40)x=nearGate.x+(x<nearGate.x?-1:1)*range(145,270);
        if(patchAt(x,y)||nearMushroom(x,y,S.mushroomHunt.obstacleClearance+35))continue;
        const kinds=s.kind==='slalom'?S.spawnTables.classic:s.kind==='mushroom'?S.spawnTables.mushroom:s.kind==='forest'?S.spawnTables.forest:S.spawnTables.mixed;
        const type=pick(kinds),fast=type==='skier'&&random()<S.skiers.courseFastChance,sizes={personGreen:30,personYellow:30,pine:range(63,93),fir:range(49,70),rock:47,dog:34,skier:42,boarder:43,mushroom:37,ramp:61,mogul:40,sled:45,cat:25,rainbow:130,bush:35};
        entity(type,x,y+range(-30,30),{fast,width:sizes[type],r:type==='pine'?18:type==='ramp'||type==='rainbow'?25:13,animal:type==='cat',ai:'idle',climb:0,nextAI:clock+3,vx:type==='dog'?range(-15,15):0,vy:type==='skier'?(fast?range(...S.skiers.fastSpeed):range(...S.skiers.slowSpeed)):type==='boarder'?range(...S.skiers.boarderSpeed):0});
      }
      if(s.kind==='freestyle'&&Math.floor(y/180)%2===0)entity('ramp',center+range(-105,105),y+55,{width:100,r:24});
      state.generated+=range(...S.world.terrainSpacing)/Math.max(.8,s.density);
    }
  }

  function inputVector() {
    const k=state.input;let x=0,y=0,held=false;
    if(k.pointer) {const dx=k.pointer.x-k.pointer.sx,dy=k.pointer.y-k.pointer.sy,len=Math.hypot(dx,dy);held=true;if(len>8){x=clamp(dx/S.controls.pointerScale,-1,1);y=clamp(dy/S.controls.pointerScale,-1,1);}}
    if(k.left||k.right||k.up||k.down){held=true;x=(k.right?1:0)-(k.left?1:0);y=(k.down?1:0)-(k.up?1:0);}
    return {x,y,held};
  }
  function startMoving() {
    const p=state.p;if(state.deathTimer||state.liftTimer||p.fall>0)return false;
    if(p.awaitingInput){p.awaitingInput=false;p.onIce=false;p.icePushPending=!!patchAt(p.x,p.y);p.shield=S.physics.resumeShieldSeconds;p.desiredHeading=0;p.mode='slide';state.keyboardStep=0;}
    if(!state.started){state.started=true;state.activeTime=0;}state.soundReady=true;return true;
  }
  function crash(obstacle=null,duration=S.physics.crashSeconds){
    const p=state.p;if(p.awaitingInput)return;
    if(state.course)state.course.hits++;
    p.awaitingInput=true;p.crashObstacle=obstacle;p.fall=duration;p.shield=duration;
    p.speed=p.vx=p.vy=0;p.air=p.airTotal=0;p.mode='still';state.lastTrack=null;
    state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    state.screenShake=.2;burst(p.x,p.y,'#b9d2d8',15);beep(140,.12,'triangle');
  }
  function launch(duration=S.jump.baseSeconds) {
    const p=state.p;if(p.fall||p.air||p.jumpLock>0)return;
    const multiplier=clamp(S.jump.durationBase+p.speed/S.jump.durationSpeedDivisor,S.jump.durationMin,S.jump.durationMax);
    p.air=p.airTotal=duration*multiplier;p.jumpHeight=clamp(S.jump.heightBase+p.speed*S.jump.heightPerSpeed,S.jump.heightMin,S.jump.heightMax)*duration;
    p.airHeading=p.heading;p.airSpeed=p.speed;p.airSpin=Math.abs(Math.sin(p.heading))*S.jump.spinRate;p.onIce=false;
    p.spin=0;p.jumpLock=p.airTotal+S.jump.cooldownSeconds;burst(p.x,p.y,C.ice,7);beep(520,.1);
  }

  function knockOut(o,kind){
    const p=state.p,threshold=kind==='bear'?S.wildlife.bearKnockoutKmh:['fast','slow','lurker'].includes(kind)?S.wildlife.yetiKnockoutKmh:Infinity;
    const maxAngle=kind==='bear'?S.wildlife.bearMaxImpactAngleDegrees:S.wildlife.yetiMaxImpactAngleDegrees,impactAngle=Math.atan2(Math.abs(p.vx),p.vy)*180/Math.PI;
    if(o.dead||impactAngle>maxAngle||p.air>0||p.fall||p.awaitingInput||p.speed*S.physics.hudKmhPerSpeed<=threshold||(o.x-p.x)*p.vx+(o.y-p.y)*p.vy<=0)return false;
    o.dead=true;o.r=0;o.fadeUntil=clock+S.wildlife.predatorFadeSeconds;o.running=false;p.speed*=S.wildlife.knockoutSpeedRetention;p.shield=S.wildlife.knockoutShieldSeconds;
    burst(o.x,o.y,C.gold,12);say(kind==='bear'?'BEAR DOWN!':'YETI DOWN!',o);beep(190,.12,'triangle');return true;
  }
  function hit(o) {
    if(o.collectible){collectMushroom(o);return;}
    const p=state.p;if(o.dead||o.stunnedUntil>clock||p.awaitingInput||p.shield>0||o===p.crashObstacle)return;
    if(o.type==='wolf'&&killWolf(o))return;
    if(['bear','lurker'].includes(o.type)&&knockOut(o,o.type))return;
    if(o.touched&&['ramp','mogul','mushroom','rainbow','sled','bush','cat'].includes(o.type))return;
    const uphill=p.vy<0,fast=p.speed>S.physics.fastImpactSpeed;
    if(o.type==='cat'){
      if(o.climb>8)return;
      if(fast){o.ai='flee';o.perch=null;o.calmAt=clock+S.wildlife.catSpookSeconds;o.touched=true;say('HISSS!',o);for(const n of state.objects)if((n.type==='skier'||n.type==='boarder'||n.type.startsWith('person'))&&Math.hypot(n.x-o.x,n.y-o.y)<260){n.annoyedUntil=clock+S.wildlife.catAnnoyedSeconds;n.catInterest=null;say(pick(S.dialogue.catAnnoyed),n);}}
      else if(!o.petted){o.petted=true;say('Prrrr.',o);}
      return;
    }
    if(['rabbit','fox','wolf'].includes(o.type)){o.angle=Math.atan2(o.y-p.y,o.x-p.x);o.nextAI=clock+2;o.running=true;return;}

    // Walking bumps stop against obstacles without a fall; moving away from an overlap is allowed.
    if(!p.onIce&&p.air<=0&&p.speed<=S.physics.walkingBumpLimit&&(p.mode==='traverse'||p.mode==='walk')){
      if(['ramp','mogul','mushroom','rainbow','bush'].includes(o.type))return;
      const before=p.walkOrigin;
      if(before&&obstacleClearance(o,p.x,p.y)<=obstacleClearance(o,before.x,before.y)){
        p.x=before.x;p.y=before.y;p.speed=p.vx=p.vy=0;
      }
      return;
    }
    if(o.type==='ramp'||o.type==='mogul'||o.type==='mushroom'||o.type==='rainbow'){
      if(p.air>0)return;o.touched=true;
      launch(o.type==='rainbow'?S.jump.rainbowSeconds:o.type==='mushroom'?S.jump.mushroomSeconds:o.type==='ramp'?S.jump.rampSeconds:S.jump.mogulSeconds);
      if(o.type==='rainbow'){p.rainbow=S.jump.rainbowTrailSeconds;p.boost=S.jump.rainbowBoostSeconds;announce('SOMEWHERE OVER THE RAINBOW','A spectacularly impractical shortcut.',C.blue,2.5);}
      if(o.type==='mushroom'){p.boost=S.jump.mushroomBoostSeconds;say('BOING. Bad decisions, good airtime.',o,2.1);}
      return;
    }
    if(p.air>0 && !['pine','fir','lodge','rental'].includes(o.type))return;
    o.touched=true;
    if((o.type==='pine'||o.type==='fir')&&fast&&!uphill) {
      o.type='stump';o.width=65;o.r=15;burst(o.x,o.y,'#658479',24);say('TIMBERRR!',o);beep(115,.15,'sawtooth');
    }
    if(o.type==='sled'&&fast){o.vx=90*Math.sign(p.vx||1);o.vy=240;p.speed*=S.physics.sledSpeedRetention;say('Express delivery!',o);return;}
    if(o.type==='bush'){o.flatten=true;p.speed*=S.physics.bushSpeedRetention;burst(o.x,o.y,C.gold,7);return;}
    if(['personRed','personGreen','personYellow'].includes(o.type))say(uphill?'BACKWARDS? Seriously?':pick(S.dialogue.personBumps),o);
    else if(o.type==='dog'){say('WOOF. WOOF. WOOF.',o);state.chasers.push({kind:'dog',x:o.x,y:o.y,speed:S.chasers.dogContactSpeed,phase:0,expires:p.y+S.chasers.dogContactChaseDistance,talkAt:clock+7});}
    else if(o.type==='skier'||o.type==='boarder'){say(pick(o.fast?S.dialogue.fastBumps:S.dialogue.skierBumps),o);o.speakAt=clock+S.skiers.bumpSpeechCooldownSeconds;}
    else if(o.type==='lodge'||o.type==='rental')say(uphill?'The door still works from the front.':'This is a HOUSE.',o);
    else if(uphill){say('A face full of snow. Naturally.',o);burst(p.x,p.y,'#bed9df',22);}
    else if(o.type==='rock'&&fast){say('The rock wins.',o);p.vx+=80*Math.sign(p.vx||1);}
    crash(o);
  }
  function movePlayer(dt) {
    const p=state.p,inp=inputVector();if(!state.started&&!p.awaitingInput)return;
    if(p.crashObstacle&&obstacleClearance(p.crashObstacle,p.x,p.y)>S.physics.crashSeparation)p.crashObstacle=null;
    if(p.awaitingInput){
      p.speed=p.vx=p.vy=0;p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);
      p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);return;
    }
    // Resolve the surface before release handling so ice keeps the incoming momentum.
    const ice=p.air<=0?patchAt(p.x,p.y):null;
    if(state.input.pointer&&p.air<=0){
      const t=state.input.pointer,dx=t.x-t.sx,dy=t.y-t.sy;
      if(Math.hypot(dx,dy)>S.controls.pointerDeadZone){p.desiredHeading=Math.atan2(dx,dy);const c=Math.cos(p.desiredHeading);p.mode=c>S.physics.downhillCosMinimum?'slide':c<-S.physics.downhillCosMinimum?'walk':'traverse';if(p.mode==='traverse')p.desiredHeading=Math.sign(dx)*Math.PI/2;}
    }else if((p.mode==='walk'||p.mode==='traverse')&&!inp.held&&!ice&&p.air<=0){p.mode='still';p.speed=0;}
    if(ice&&p.icePushPending){p.heading=p.desiredHeading;p.speed=p.mode==='traverse'?S.physics.traverseSpeed:p.mode==='walk'?S.physics.walkSpeed:S.physics.iceRestartSlideSpeed;p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed;p.onIce=false;p.icePushPending=false;}
    if(ice&&!p.onIce){p.iceHeading=p.speed>S.physics.iceHeadingSpeedMinimum?Math.atan2(p.vx,p.vy):p.heading;announce('BLACK ICE','No steering. Hold on to your scarf.',C.blue,2);}
    p.onIce=!!ice;
    if(p.air>0){p.heading=p.airHeading;p.speed=p.airSpeed;}
    else if(ice){
      p.heading=p.iceHeading;
      // Sideways and uphill entries coast at their entry speed. Gravity boosts downhill only.
      if(Math.cos(p.iceHeading)>S.physics.downhillCosMinimum)p.speed=Math.min(S.physics.iceTopSpeed,p.speed+S.physics.iceAcceleration*dt);
    }
    else {
      if(p.mode==='traverse')p.heading=p.desiredHeading;
      let delta=p.desiredHeading-p.heading;while(delta>Math.PI)delta-=TAU;while(delta<-Math.PI)delta+=TAU;p.heading+=delta*(1-Math.exp(-S.physics.turnFollow*dt));
      const downhill=Math.max(0,Math.cos(p.heading));let cap=topSpeed()*(S.physics.acrossSpeedFraction+S.physics.downhillSpeedFraction*downhill*downhill);
      if(p.boost>0)cap*=S.physics.boostMultiplier;
      if(p.mode==='slide'){
        if(p.air<=0){if(p.speed<cap)p.speed=Math.min(cap,p.speed+(S.physics.accelerationBase+S.physics.accelerationDownhill*downhill*downhill)*dt);else p.speed=Math.max(cap,p.speed-(p.speed>topSpeed()*S.physics.overSpeedRatio?S.physics.overSpeedDeceleration:S.physics.turnDeceleration)*dt);}
      }else if(p.mode==='walk')p.speed=ease(p.speed,S.physics.walkSpeed,S.physics.walkFollow,dt);
      else if(p.mode==='traverse')p.speed=ease(p.speed,S.physics.traverseSpeed,S.physics.traverseFollow,dt);
      else {p.speed=Math.max(0,p.speed-S.physics.brakeDeceleration*dt);if(p.speed<S.physics.stopEpsilon)p.speed=0;}
      if(onRoad(p.x,p.y)&&p.air<=0&&p.mode!=='still')p.speed=Math.min(p.speed,Math.max(p.mode==='walk'?S.physics.roadWalkSpeed:p.mode==='traverse'?S.physics.roadTraverseSpeed:S.physics.roadSlideSpeed,p.speed-S.physics.roadDeceleration*dt));
    }
    if(p.fall>0)p.speed=ease(p.speed,4,12,dt);
    p.vx=Math.sin(p.heading)*p.speed;p.vy=p.air<=0&&!p.onIce&&p.mode==='traverse'?0:Math.cos(p.heading)*p.speed;
    p.walkOrigin={x:p.x,y:p.y};
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.air=Math.max(0,p.air-dt);p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);p.rainbow=Math.max(0,p.rainbow-dt);
    if(p.air>0)p.spin+=p.airSpin*dt;
    if(p.air===0&&p.airTotal>0){const points=Math.round(S.race.jumpBasePoints+p.spin*S.race.spinPointMultiplier+p.jumpHeight*S.race.heightPointMultiplier);if(state.course){state.course.points+=points;state.course.tricks++;}p.airTotal=0;announce(p.spin>2?'STYLISH LANDING':'SOFT LANDING',`+${points} points`,C.blue,1.5);beep(710,.08);}
    if(state.input.jump){launch(S.jump.manualSeconds);state.input.jump=false;}
    if(p.air===0&&!p.fall&&(!state.lastTrack||Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)>S.render.trailSpacing)){
      if(state.lastTrack&&Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)<45)state.trails.push({x:p.x,y:p.y,px:state.lastTrack.x,py:state.lastTrack.y,angle:p.heading,rainbow:p.rainbow>0});state.lastTrack={x:p.x,y:p.y};
    }else if(p.air>0)state.lastTrack=null;
    if(p.rainbow>0&&random()<.23)burst(p.x,p.y,pick(['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb']),1);
    state.trails=state.trails.filter(t=>t.y>p.y-H/ZOOM&&t.y<p.y+H/ZOOM).slice(-S.render.trailLimit);
  }
  function releasePointer(){
    const p=state.p;state.input.pointer=null;if(p.air>0)return;
    if(p.mode==='slide'&&Math.cos(p.desiredHeading)>S.physics.downhillCosMinimum){p.desiredHeading=0;p.mode='slide';}else {p.mode='still';if(!(p.air<=0&&patchAt(p.x,p.y)))p.speed=0;}
  }
  function keyboardDirection(key,repeat=false){
    if(state.p.air>0)return;
    if(repeat&&clock-state.lastSteer<S.controls.keyRepeatSeconds)return;state.lastSteer=clock;state.control='keyboard';
    const p=state.p;
    if(key==='up'){p.desiredHeading=state.keyboardStep<0?-Math.PI:Math.PI;p.mode='walk';return;}
    if(key==='down')state.keyboardStep=0;
    else if(p.speed<S.physics.stopEpsilon||p.mode==='traverse'||Math.cos(p.desiredHeading)<-S.physics.downhillCosMinimum||(p.mode==='still'&&Math.abs(Math.cos(p.desiredHeading))<S.physics.downhillCosMinimum))state.keyboardStep=key==='left'?-3:3;
    else state.keyboardStep=clamp(state.keyboardStep+(key==='left'?-1:1),-3,3);
    p.desiredHeading=Math.abs(state.keyboardStep)===3?Math.sign(state.keyboardStep)*Math.PI/2:state.keyboardStep*S.controls.stepDegrees*Math.PI/180;
    p.mode=Math.abs(state.keyboardStep)===3?'traverse':'slide';
    if(p.mode==='traverse'&&!p.onIce)p.heading=p.desiredHeading;
  }

  function step(dt) {
    if(!ready)return;clock+=dt;
    if(state.deathTimer>0){state.deathTimer-=dt;if(state.deathTimer<=0)resetSummit();return;}
    if(state.liftTimer>0){state.liftTimer-=dt;state.p.y-=S.lift.rideSpeed*dt;state.cam.y=ease(state.cam.y,state.p.y-H*S.render.playerScreenY/ZOOM,S.render.cameraYFollow,dt);if(state.liftTimer<=0)resetSummit(true);return;}
    state.activeTime+=state.started?dt:0;
    const p=state.p,previous={x:p.x,y:p.y};movePlayer(dt);ensureWorld();spawnFastSkier();
    if(state.course){const run=state.course;if(!run.timingStarted&&p.y>=run.startY){run.timingStarted=true;run.time+=dt*clamp((p.y-run.startY)/(p.y-previous.y||1),0,1);}else if(run.timingStarted)run.time+=dt;spawnTerrain();}
    updateWildlife(dt);updateSkiers(dt);updatePedestrians(dt);
    for(const o of state.objects){
      if(!['skier','boarder'].includes(o.type)){if(o.vx&&!o.animal)o.x+=o.vx*dt;if(o.vy&&!o.animal)o.y+=o.vy*dt;}
      if(o.cheerUntil>clock&&clock>=(o.nextCheer||0)&&Math.hypot(o.x-p.x,o.y-p.y)<650){say(pick(o.cheerRun?.objective==='mushrooms'?S.dialogue.mushroomCheers:S.dialogue.cheers),o,2.2);o.nextCheer=clock+3.4+o.phase*.2;}
      if(o.roam)o.x+=Math.cos(clock*.8+o.phase)*o.roam*dt*.3;

      if(state.started&&!(o.stunnedUntil>clock)&&o.type==='lurker'&&!humanArea(o.x,o.y)&&!humanArea(p.x,p.y)&&Math.hypot(o.x-p.x,o.y-p.y)<S.wildlife.yetiWakeDistance){o.type='awakened';o.r=0;state.chasers.push({kind:'fast',x:o.x,y:o.y,speed:topSpeed()*S.wildlife.yetiWildSpeedRatio,phase:o.phase,expires:p.y+S.wildlife.yetiWildChaseDistance,talkAt:clock+6});say('Oh. Breakfast.',o);}
      if(o.type==='gate'&&o.run===state.course&&!o.checked&&previous.y<o.y&&p.y>=o.y){o.checked=true;const ratio=(o.y-previous.y)/(p.y-previous.y||1),crossX=mix(previous.x,p.x,ratio);if(state.course){if(Math.abs(crossX-o.x)<o.half){state.course.points+=S.race.gatePoints;state.course.cleared++;o.good=true;burst(o.x,o.y,C.gold,9);beep(710,.04);}else{state.course.missed++;o.good=false;beep(210,.045);}}}
      if(o.type==='entrance'&&!state.course&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){startCourse(o.stage,o);break;}
      if(o.type==='lift'&&!o.used&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){o.used=true;state.liftTimer=S.lift.rideSeconds;p.speed=0;announce('UP WE GO','Next stop: the summit.',C.teal,3);}
      if(o.r>0&&Math.abs(o.y-p.y)<Math.max(130,o.width)){const d=Math.hypot(p.x-o.x,(p.y-o.y)*.85);if(obstacleClearance(o,p.x,p.y)<S.physics.playerRadius)hit(o);else if(o.type.startsWith('person')&&!o.greeted&&d<85){o.greeted=true;say(pick(S.dialogue.greetings),o);}}
    }
    if(state.course){const off=Math.abs(p.x-centerAt(p.y))>S.race.offPisteDistance;if(off&&!state.course.left){state.course.left=true;for(const c of state.chasers)if(c.chaseRun!==state.course)c.expires=p.y+(c.kind==='dog'?2100:220);if(state.course.violation)announce('OFF PISTE',state.course.ambush==='dog'?'The dogs are still very interested.':'Ski patrol has jurisdiction issues.',C.blue,3);}const run=state.course;
      if(previous.y<run.endY&&p.y>=run.endY){
        const crossX=mix(previous.x,p.x,(run.endY-previous.y)/(p.y-previous.y||1));
        if(Math.abs(crossX-run.x)<run.finishHalf){run.time=Math.max(0,run.time-dt*(1-clamp((run.endY-previous.y)/(p.y-previous.y||1),0,1)));run.finishPassed=true;creditRun();}
        else announce('MISSED THE FINISH','Cross between the two finish flags!',C.red,3);
      }
      // Leave a short uphill recovery window; skiing on into town records an unsuccessful run.
      if(state.course&&p.y>run.endY+S.race.finishRecoveryDistance)creditRun();}
    else if(state.zone.kind==='start'&&p.y>S.world.autoCourseY)startCourse('free',{x:p.x,y:S.world.autoCourseY});
    else if(state.zone.kind==='village'&&p.y>state.zone.end)startCourse('free',{x:p.x,y:p.y});
    updateChasers(dt);
    state.objects=state.objects.filter(o=>!o.eaten&&!o.collected&&o.type!=='awakened'&&(!o.dead||clock<o.fadeUntil)&&(o.worldChunk||o.y>p.y-S.world.sceneryRetentionBehind));
    for(const q of state.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=80*dt;q.life-=dt;}state.particles=state.particles.filter(q=>q.life>0);state.speech=state.speech.filter(q=>q.until>clock);state.messages=state.messages.filter(q=>q.until>clock);
    state.cam.x=ease(state.cam.x,p.x,S.render.cameraXFollow,dt);state.cam.y=ease(state.cam.y,p.y-H*S.render.playerScreenY/ZOOM,S.render.cameraYFollow,dt);state.screenShake=Math.max(0,state.screenShake-dt);
  }
  function updatePedestrians(dt){
    const P=S.pedestrians,people=state.objects.filter(o=>o.type.startsWith('person'));
    const solids=state.objects.filter(o=>o.r>0&&['pine','fir','rock','pebble','lodge','rental','lift','bench','lamp','snowman','stump'].includes(o.type));
    const flags=state.objects.filter(o=>['gate','entrance','finish'].includes(o.type));
    for(const o of people){
      o.walking=false;
      if(Math.hypot(o.x-state.p.x,o.y-state.p.y)>P.activeRadius||o.cheerUntil>clock)continue;
      const oldX=o.x,oldY=o.y;
      if(o.walker&&o.path?.length>1){
        // Residents keep following their existing village footpaths.
        let remaining=o.walkSpeed*dt;
        for(let i=0;i<o.path.length+1&&remaining>0;i++){
          const target=o.path[o.pathIndex],d=Math.hypot(target.x-o.x,target.y-o.y),move=Math.min(d,remaining);
          if(d){o.x+=(target.x-o.x)/d*move;o.y+=(target.y-o.y)/d*move;}remaining-=move;
          if(d>move)break;
          if(o.pathIndex===o.path.length-1)o.pathDir=-1;else if(o.pathIndex===0)o.pathDir=1;
          o.pathIndex+=o.pathDir;
        }
      }else{
        const radius=o.cheerRun?P.spectatorRadius:P.roamRadius;
        const clear=(x,y)=>{
          if(Math.hypot(x-o.homeX,y-o.homeY)>radius||patchAt(x,y))return false;
          if(solids.some(h=>obstacleClearance(h,x,y)<o.r+P.obstacleMargin))return false;
          if(flags.some(f=>Math.abs(y-f.y)<P.gateClearance&&Math.abs(x-f.x)<(f.half||0)+o.r+P.obstacleMargin))return false;
          if(o.cheerRun){const run=o.cheerRun;if((x-run.x)*Math.sign(o.homeX-run.x)<run.finishHalf+o.r+P.obstacleMargin)return false;}
          return true;
        };
        if(o.stroll&&clock>=o.walkUntil){o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
        if(o.pauseUntil===undefined)o.pauseUntil=clock+o.id*P.pauseSeconds[1];
        if(!o.stroll&&clock>=o.pauseUntil){
          o.walkSpeed=range(...P.walkSpeed);const duration=range(...P.walkSeconds);
          for(let attempt=0;attempt<P.targetAttempts;attempt++){
            const angle=range(0,TAU),distance=Math.min(o.walkSpeed*duration,radius*.8),target={x:o.x+Math.cos(angle)*distance,y:o.y+Math.sin(angle)*distance};
            // Check the entire little stroll, so people don't cut through a tree or lake.
            const samples=Math.max(1,Math.ceil(distance/Math.max(4,o.r)));
            let safe=true;for(let i=1;i<=samples;i++)if(!clear(mix(o.x,target.x,i/samples),mix(o.y,target.y,i/samples))){safe=false;break;}
            if(safe){o.stroll=target;o.walkUntil=clock+distance/o.walkSpeed;break;}
          }
          if(!o.stroll)o.pauseUntil=clock+range(...P.pauseSeconds);
        }
        if(o.stroll){
          const d=Math.hypot(o.stroll.x-o.x,o.stroll.y-o.y),move=Math.min(d,o.walkSpeed*dt);
          const x=o.x+(o.stroll.x-o.x)/(d||1)*move,y=o.y+(o.stroll.y-o.y)/(d||1)*move;
          if(clear(x,y)){o.x=x;o.y=y;}else {o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
          if(d<=move){o.stroll=null;o.pauseUntil=clock+range(...P.pauseSeconds);}
        }
      }
      const distance=Math.hypot(o.x-oldX,o.y-oldY);o.walking=distance>0;
      o.walkCycle=(o.walkCycle||0)+distance*P.stridePerUnit;if(Math.abs(o.x-oldX)>.001)o.walkFacing=Math.sign(o.x-oldX);
    }
  }
  let houseCacheTime=-1,houseCache=[];
  function travel(o,angle,speed,dt,animal=false,avoidTowns=false){
    if(houseCacheTime!==clock){houseCache=state.objects.filter(h=>h.type==='lodge'||h.type==='rental');houseCacheTime=clock;}
    const A=S.wildlife,houses=houseCache;
    const valid=(x,y)=>(!avoidTowns||!insideTown(x,y))&&!patchAt(x,y)&&!houses.some(h=>houseClearance(h,x,y)<(o.r||10)+5)&&(!animal||!classicArea(x,y,35)&&(!(o.type==='bear'||(['fox','wolf'].includes(o.type)&&!o.humanVisitor))||!humanArea(x,y)));
    const probe=Math.max(A.avoidProbeDistance,speed*A.avoidLookaheadSeconds);
    const clear=a=>[Math.min(probe,speed*dt),probe*.5,probe].every(d=>valid(o.x+Math.cos(a)*d,o.y+Math.sin(a)*d));
    let heading=o.avoidUntil>clock?o.avoidHeading:angle;
    if(!clear(heading)){
      const turn=o.avoidSide??(o.id>.5?1:-1),options=A.avoidProbeDegrees.map(d=>angle+d*Math.PI/180*turn);
      let next=options.find(clear);
      // If a moving target left us inside a newly protected region, walk out continuously.
      if(next===undefined){
        if(valid(o.x,o.y)){o.running=false;o.motionVx=0;return;}
        const escape=options.find(a=>valid(o.x+Math.cos(a)*probe*2,o.y+Math.sin(a)*probe*2));
        next=escape??(o.avoidUntil>clock?o.avoidHeading:angle+Math.PI/2*turn);
      }
      heading=next;o.avoidHeading=heading;o.avoidUntil=clock+A.avoidCommitSeconds;o.avoidSide=turn;
    }
    o.motionVx=Math.cos(heading)*speed;o.angle=heading;o.x+=o.motionVx*dt;o.y+=Math.sin(heading)*speed*dt;o.running=speed>60;
  }
  function killWolf(o){
    const p=state.p,A=S.wildlife;
    if(o.dead||p.air>0||p.fall||p.awaitingInput||p.speed*S.physics.hudKmhPerSpeed<=A.wolfKillKmh||(o.x-p.x)*p.vx+(o.y-p.y)*p.vy<=0)return false;
    o.dead=true;o.animal=false;o.r=0;o.fadeUntil=clock+A.wolfFadeSeconds;p.speed*=A.knockoutSpeedRetention;p.shield=A.knockoutShieldSeconds;
    burst(o.x,o.y,C.ice,18);beep(160,.12,'triangle');
    for(const skier of state.objects){
      if(!['skier','boarder'].includes(skier.type)||Math.hypot(skier.x-o.x,skier.y-o.y)>A.rescueThanksRadius)continue;
      if(skier.threat===o||o.targetSkier===skier||skier.fearUntil>clock&&skier.threat?.packId===o.packId){
        if(clock>=(skier.thanksAt||0)){say(pick(S.dialogue.rescued),skier,3);skier.thanksAt=clock+A.rescueThanksCooldown;skier.speakAt=clock+A.npcSpeechCooldown;}
        if(skier.threat===o){skier.threat=null;skier.fearUntil=0;skier.npcFallUntil=0;}
      }
    }return true;
  }
  function frighten(skier,wolf){
    skier.threat=wolf;skier.fearUntil=clock+S.wildlife.npcFearSeconds;skier.catInterest=null;
    if(clock>=(skier.speakAt||0)){say(pick(S.dialogue.terrified),skier);skier.speakAt=clock+S.wildlife.npcSpeechCooldown;}
  }
  function updateSkiers(dt){
    const p=state.p,A=S.wildlife,K=S.skiers;
    for(const o of state.objects){
      if(!['skier','boarder'].includes(o.type)||Math.hypot(o.x-p.x,o.y-p.y)>A.activeRadius)continue;
      if(o.npcFallUntil>clock||o.catInterest)continue;
      let vx=o.vx||0,vy=o.vy||0;
      if(o.fearUntil>clock&&o.threat&&!o.threat.dead&&!humanArea(o.x,o.y)){
        const dx=o.x-o.threat.x,dy=o.y-o.threat.y,len=Math.hypot(dx,dy)||1;
        vx=clamp(dx/len*A.npcFleeSpeed,-A.npcFleeLateralSpeed,A.npcFleeLateralSpeed);vy=Math.max(A.npcFleeSpeed*.45,dy/len*A.npcFleeSpeed);
      }else{
        if(humanArea(o.x,o.y)){o.fearUntil=0;o.threat=null;}
        if(o.fast){
          const distance=Math.hypot(o.x-p.x,o.y-p.y),behind=p.y-o.y;
          const aim=behind>0&&behind<K.fastAimDistance?clamp((p.x+p.vx*K.fastAimLeadSeconds-o.x)*K.fastAimWeight,-K.fastMaxLateralSpeed,K.fastMaxLateralSpeed):0;
          vx=o.vx=ease(vx,aim,K.fastSteeringFollow,dt);
          if(distance<K.tauntDistance&&clock>=(o.speakAt||0)){say(pick(S.dialogue.fastTaunts),o);o.speakAt=clock+K.tauntCooldownSeconds;}
        }
      }
      const speed=Math.hypot(vx,vy);if(speed)travel(o,Math.atan2(vy,vx),speed,dt);
    }
  }
  function updateWildlife(dt){
    const p=state.p,A=S.wildlife,rabbits=state.objects.filter(o=>o.type==='rabbit'&&!o.eaten),cats=state.objects.filter(o=>o.type==='cat'),skis=state.objects.filter(o=>o.type==='skier'||o.type==='boarder');
    for(const o of state.objects){if(o.eaten||o.dead||o.stunnedUntil>clock||!o.animal||Math.hypot(o.x-p.x,o.y-p.y)>A.activeRadius)continue;
      if(state.started&&o.type==='bear'&&!humanArea(o.x,o.y)&&!humanArea(p.x,p.y)&&Math.hypot(o.x-p.x,o.y-p.y)<A.bearWakeDistance){o.animal=false;o.type='awakened';o.r=0;state.chasers.push({kind:'bear',x:o.x,y:o.y,speed:A.bearChaseSpeed,phase:o.phase,expires:p.y+A.bearChaseDistance,talkAt:Infinity});continue;}
      if(o.feedingUntil>clock){o.running=false;continue;}
      if(o.type==='cat'){
        if(o.ai==='flee'||o.ai==='climb'){
          if(!o.perch)o.perch=state.objects.filter(t=>['pine','fir','lodge','rental'].includes(t.type)).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
          if(o.perch){const dx=o.perch.x-o.x,dy=o.perch.y-o.y,d=Math.hypot(dx,dy);if(d>8){o.x+=dx/d*A.catFleeSpeed*dt;o.y+=dy/d*A.catFleeSpeed*dt;}else{o.ai='climb';o.climb=Math.min(o.perch.width*A.catClimbHeightRatio,(o.climb||0)+A.catClimbSpeed*dt);}}
          if(clock>(o.calmAt||Infinity)){o.ai='idle';o.climb=0;o.perch=null;}continue;
        }
        if(clock>o.nextAI){o.ai=random()<A.catRoamChance?'flee':'idle';o.nextAI=clock+range(...A.catRoamSeconds);o.calmAt=clock+A.catCalmSeconds;}continue;
      }
      let target=null,speed=o.type==='rabbit'?A.rabbitWalkSpeed:o.type==='bear'?A.bearRoamSpeed:A.roamSpeed;
      if(o.type==='wolf'&&!humanArea(p.x,p.y)&&!humanArea(o.x,o.y)&&Math.hypot(o.x-p.x,o.y-p.y)<A.wolfAlertDistance){for(const mate of state.objects)if(mate.type==='wolf'&&!mate.dead&&mate.packId===o.packId)mate.alertUntil=clock+A.wolfAlertSeconds;}
      if(o.type==='wolf'){
        const nearby=skis.filter(n=>!humanArea(n.x,n.y)&&!(n.npcFallUntil>clock)&&Math.hypot(n.x-o.x,n.y-o.y)<A.wolfSkierDetection).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
        if(o.alertUntil>clock&&!humanArea(p.x,p.y)){target=p;speed=A.wolfPlayerChaseSpeed;}
        if(nearby&&(!target||Math.hypot(nearby.x-o.x,nearby.y-o.y)<Math.hypot(p.x-o.x,p.y-o.y))){target=nearby;speed=A.wolfSkierChaseSpeed;}
        o.targetSkier=target&&target!==p?target:null;
        for(const skier of skis)if(!humanArea(skier.x,skier.y)&&Math.hypot(skier.x-o.x,skier.y-o.y)<A.npcFearDistance)frighten(skier,o);
      }
      if(o.type==='fox'||o.type==='wolf'){
        if(clock>o.nextAI){o.hunting=random()<A.huntChance;o.nextAI=clock+range(...A.huntInterval);}
        if(o.hunting&&!target){target=rabbits.filter(r=>!r.eaten&&Math.hypot(r.x-o.x,r.y-o.y)<A.rabbitDetection).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];speed=o.type==='wolf'?A.wolfHuntSpeed:A.foxHuntSpeed;}
      }
      if(o.type==='rabbit'){
        const predator=state.objects.find(q=>!q.dead&&(q.type==='fox'||q.type==='wolf')&&q.hunting&&Math.hypot(q.x-o.x,q.y-o.y)<A.rabbitFearDistance);
        if(predator){o.angle=Math.atan2(o.y-predator.y,o.x-predator.x)+Math.sin(clock*5)*.5;speed=A.rabbitFleeSpeed;}
        else if(clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(...A.rabbitTurnSeconds);}
      }else if(!target&&clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(...A.roamSeconds);}
      if(!target&&o.type==='wolf'){
        const leader=state.objects.find(q=>q.type==='wolf'&&!q.dead&&q.packId===o.packId&&q.packIndex===0);
        if(leader&&leader!==o&&Math.hypot(leader.x-o.x,leader.y-o.y)>A.packFollowDistance){o.angle=Math.atan2(leader.y-o.y,leader.x-o.x);speed=A.packFollowSpeed;}
      }
      if(target){o.angle=Math.atan2(target.y-o.y,target.x-o.x);if(Math.hypot(target.x-o.x,target.y-o.y)<A.captureDistance){
        if(target===p){if(killWolf(o))continue;if(p.shield<=0&&p.air<=0){die('WOLF');return;}}
        else if(target.type==='skier'||target.type==='boarder'){target.npcFallUntil=clock+A.npcWolfFallSeconds;say(pick(S.dialogue.wolfCaught),target);o.feedingUntil=clock+A.feedingSeconds;continue;}
        else {target.eaten=true;target.r=0;o.hunting=false;o.feedingUntil=clock+A.feedingSeconds;o.nextAI=clock+A.satedSeconds;burst(target.x,target.y,C.ice,9);say('CHOMP!',o,1.2);continue;}
      }}
      travel(o,o.angle??o.phase,speed,dt,true);
    }
    for(const o of skis){
      if(o.annoyedUntil>clock||o.fearUntil>clock||o.fast){o.catInterest=null;continue;}
      const cat=cats.find(c=>c.ai!=='flee'&&Math.hypot(c.x-o.x,c.y-o.y)<A.catCrowdRadius);
      if(cat){if(!o.catInterest&&random()<.01)say('Look! A tiny mountain cat!',o);o.catInterest=cat;const d=Math.hypot(cat.x-o.x,cat.y+35-o.y);if(d>A.catCrowdStandOff)travel(o,Math.atan2(cat.y+35-o.y,cat.x-o.x),A.catCrowdSpeed,dt);}
      else o.catInterest=null;
    }
  }

  function updateChasers(dt) {
    const p=state.p;if(!state.started)return;
    for(const c of state.chasers){
      if(c.dead)continue;
      // Course-owned pursuers have no distance leash; retire only when their run ends.
      if(c.chaseRun&&c.chaseRun!==state.course){c.leaving=true;c.y-=c.speed*dt;continue;}
      const pursuit=!!c.chaseRun&&c.chaseRun===state.course;
      if(pursuit)c.expires=Infinity;
      if(c.stunnedUntil>clock)continue;
      if(p.y>c.expires){c.leaving=true;c.speed*=.97;continue;}
      const dx=p.x-c.x,dy=p.y-c.y,len=Math.hypot(dx,dy)||1;
      const lethal=['fast','slow','bear'].includes(c.kind),nx=c.x+dx/len*c.speed*dt,ny=c.y+dy/len*c.speed*dt;
      if(pursuit){
        if(insideTown(p.x,p.y))continue;
        // The course's own yetis can enter pistes and follow far into the wilderness.
        // Reuse committed avoidance turns to route around towns, houses and lakes.
        travel(c,Math.atan2(dy,dx),c.speed,dt,false,true);
      }else{
        if(lethal&&(humanArea(p.x,p.y)||humanArea(nx,ny)))continue;
        c.x=nx;c.y=ny;
      }
      if(c.kind==='slow'&&clock>c.talkAt){say(pick(S.dialogue.politeYeti),c);c.talkAt=clock+S.chasers.slowTalkSeconds;}
      const contactDistance=Math.hypot(c.x-p.x,c.y-p.y);
      if(contactDistance<S.chasers.knockoutDistance&&knockOut(c,c.kind))continue;
      if(contactDistance<S.chasers.captureDistance&&p.shield<=0&&p.air<=0){
        if(p.awaitingInput&&!lethal)continue;
        if(['fast','slow','bear'].includes(c.kind)){if(state.course&&!p.awaitingInput)state.course.hits++;burst(p.x,p.y,C.ice,12);die(c.kind==='bear'?'BEAR':'YETI');break;}
        crash(null,S.chasers.patrolFallSeconds);announce(c.kind==='dog'?'AGGRESSIVELY LOVED':'A WORD FROM SKI PATROL',c.kind==='dog'?'Covered in slobber. Wallet intact.':'They are very disappointed.',C.red,3);for(const other of state.chasers)if(!other.chaseRun||other.chaseRun!==state.course)other.expires=p.y-1;burst(p.x,p.y,C.ice,20);break;
      }
    }
    state.chasers=state.chasers.filter(c=>(!c.dead||clock<c.fadeUntil)&&(!c.leaving||Math.abs(c.y-p.y)<H*.7));
  }

  function box(x,y,w,h,color) {ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  const glyphs={
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
    '.':['00000','00000','00000','00000','00000','00100','00100'],',':['00000','00000','00000','00000','00100','00100','01000'],':':['00000','00100','00100','00000','00100','00100','00000'],'!':['00100','00100','00100','00100','00100','00000','00100'],'?':['01110','10001','00001','00010','00100','00000','00100'],"'":['00100','00100','01000','00000','00000','00000','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'/':['00001','00001','00010','00100','01000','10000','10000'],'·':['00000','00000','00000','00100','00000','00000','00000'],'↑':['00100','01110','10101','00100','00100','00100','00100'],'↓':['00100','00100','00100','00100','10101','01110','00100'],'←':['00000','00100','01000','11111','01000','00100','00000'],'→':['00000','00100','00010','11111','00010','00100','00000'],'×':['00000','10001','01010','00100','01010','10001','00000'],'#':['01010','01010','11111','01010','11111','01010','01010'],'@':['01110','10001','10111','10101','10111','10000','01111']
  };
  function text(str,x,y,size=11,color=C.ink,align='center') {
    str=String(str).toUpperCase().replaceAll('…','...').replaceAll('’',"'");
    const scale=size>=14?2:1,width=(str.length*6-1)*scale;
    let left=Math.round(x-(align==='center'?width/2:align==='right'?width:0)),top=Math.round(y-3.5*scale);
    ctx.fillStyle=color;
    for(const char of str){const rows=glyphs[char];if(rows)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(rows[row][col]==='1')ctx.fillRect(left+col*scale,top+row*scale,scale,scale);left+=6*scale;}
  }
  function line(x,y,xx,yy,color,width=1) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
  function screen(x,y) {return {x:Math.round((x-state.cam.x)*ZOOM+W/2),y:Math.round((y-state.cam.y)*ZOOM)};}
  function sprite(name,x,y,width,opts={}) {
    const a=atlas[name],img=a&&images[a[0]];if(!a||!img)return;
    width=Math.max(2,Math.round(width*(opts.ui?1:ZOOM)));
    const h=Math.round(width*a[4]/a[3]),key=name+':'+width+(opts.guest?':guest':'')+(opts.fast?':fast':'')+(opts.houseStyle!==undefined?':house'+opts.houseStyle:'');
    if(!spriteCache.has(key)){
      const tile=document.createElement('canvas');tile.width=width;tile.height=h;
      const t=tile.getContext('2d');t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';
      t.drawImage(img,a[1],a[2],a[3],a[4],0,0,width,h);
      const pixels=t.getImageData(0,0,width,h),data=pixels.data;
      for(let i=0;i<data.length;i+=4){if(data[i+3]<S.render.spriteAlphaCutoff){data[i+3]=0;continue;}let nearest=paletteRGB[0],distance=Infinity;
        for(const rgb of paletteRGB){const d=(data[i]-rgb[0])**2+(data[i+1]-rgb[1])**2+(data[i+2]-rgb[2])**2;if(d<distance){distance=d;nearest=rgb;}}
        if(opts.fast&&nearest[1]>nearest[0]*1.25&&nearest[2]>nearest[0]*1.25&&nearest[0]<110)nearest=S.render.fastSkierRGB;
        else if(opts.guest&&nearest[1]>nearest[0]*1.25&&nearest[2]>nearest[0]*1.25&&nearest[0]<110)nearest=S.render.guestRGB;
        if(opts.houseStyle!==undefined&&nearest[0]>nearest[1]*1.25&&nearest[1]<120&&nearest[0]>125)nearest=S.houseAnimation.trimRGB[opts.houseStyle%S.houseAnimation.trimRGB.length];
        data[i]=nearest[0];data[i+1]=nearest[1];data[i+2]=nearest[2];data[i+3]=255;
      }
      t.putImageData(pixels,0,0);spriteCache.set(key,tile);
    }
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    if(opts.rotate)ctx.rotate(opts.rotate);if(opts.flip)ctx.scale(-1,1);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;
    if(opts.bodyOnly){const crop=Math.ceil(h*.62);ctx.drawImage(spriteCache.get(key),0,0,width,crop,Math.round(-width/2),-h,width,crop);}
    else ctx.drawImage(spriteCache.get(key),Math.round(-width/2),-h);
    ctx.restore();
  }
  function shadow(x,y,rx=15,ry=4,alpha=.11) {ctx.fillStyle=`rgba(41,88,106,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx*ZOOM,ry*ZOOM,0,0,TAU);ctx.fill();}
  function snow() {
    box(0,0,W,H,C.snow);
    drawRoads();
    for(const o of state.objects)if(o.type==='ice')drawIce(o);
    for(const o of state.objects)if(o.type==='ramp'||o.type==='mogul')drawObject(o);
    for(let i=0;i<60;i++){const x=((i*137-state.cam.x*.82)%W+W)%W,y=((i*197-state.cam.y*.97)%(H+80)+H+80)%(H+80)-30;box(x,y,2,1,'#c8deda');}
    const colors=['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb'];
    for(const t of state.trails){const a=screen(t.x,t.y),b=screen(t.px,t.py),offset=Math.cos(t.angle)*6*ZOOM;
      if(t.rainbow)colors.forEach((color,i)=>line(a.x+(i-2.5)*2,a.y,b.x+(i-2.5)*2,b.y,color,2));
      else{line(a.x-offset,a.y,b.x-offset,b.y,'#c5dcda',1);line(a.x+offset,a.y,b.x+offset,b.y,'#c5dcda',1);}
    }
  }
  function drawIce(o){
    const s=screen(o.x,o.y),g=lakeGeometry(o),r=g.radius*ZOOM;
    if(s.x+r<0||s.x-r>W||s.y+r<0||s.y-r>H)return;
    if(!o.iceTile){
      const tile=document.createElement('canvas');tile.width=tile.height=r*2+8;const t=tile.getContext('2d');
      const at=(x,y)=>lakeContains(o,o.x+x/ZOOM,o.y+y/ZOOM);
      for(let y=-r;y<=r;y+=2)for(let x=-r;x<=r;x+=2){
        const wet=at(x+1,y+1),near=[[-4,0],[4,0],[0,-4],[0,4]].some(([dx,dy])=>at(x+1+dx,y+1+dy)!==wet);
        if(!wet&&!near)continue;
        const edge=wet&&near,deep=wet&&!edge&&[-10,10].every(d=>at(x+d,y)&&at(x,y+d));
        const glint=((x*3+y*7+Math.floor(o.phase*50))%67+67)%67<3;
        t.fillStyle=!wet?'#d3e4dc':edge?'#e0f3ed':glint?'#d6f0ef':deep?'#84c2d8':'#addce6';
        t.fillRect(x+r+4,y+r+4,2,2);
        if(wet&&!edge&&Math.abs(y-Math.sin(x*.07+o.phase)*7-r*.25)<1.5){t.fillStyle='#67a9c2';t.fillRect(x+r+4,y+r+4,2,2);}
        if(wet&&at(x+5,y)&&Math.abs(y+r*.29+(Math.floor(x/16)%3)*2)<1.4){t.fillStyle='#edf8f1';t.fillRect(x+r+4,y+r+4,4,2);}
      }
      // Small reeds and stones hug dry banks; islands share the same collision outline.
      for(let i=3;i<g.points.length;i+=11){const a=g.points[i],x=a[0]*ZOOM,y=a[1]*ZOOM;if(at(x,y))continue;
        t.fillStyle=i%2?'#91a5a0':'#b3a788';t.fillRect(x+r+3,y+r+1,3,3);t.fillRect(x+r+4,y+r-2,1,4);
      }
      o.iceTile=tile;
    }
    ctx.drawImage(o.iceTile,s.x-r-4,s.y-r-4);
  }

  function drawLift(){
    const b=viewBounds();
    for(const route of state.liftRoutes){const low=Math.max(b.top-180,route.y0),high=Math.min(b.bottom+180,route.y1);if(low>high)continue;
      for(const side of [-1,1]){let old=null;for(let y=low;y<=high+35;y+=35){const s=screen(liftX(route,y)+side*19,y-83);if(old)line(old.x,old.y,s.x,s.y,'#85949a',1);old=s;}}
      for(let y=Math.ceil(low/S.lift.towerSpacing)*S.lift.towerSpacing;y<high;y+=S.lift.towerSpacing){const s=screen(liftX(route,y),y);box(s.x-2,s.y-47,4,48,'#78858c');box(s.x-21,s.y-45,42,3,'#536673');box(s.x-5,s.y,10,3,'#becfce');}
      for(const side of [-1,1]){const offset=(clock*S.lift.chairSpeed*side)%S.lift.chairSpacing;for(let y=Math.floor(low/S.lift.chairSpacing)*S.lift.chairSpacing+offset-S.lift.chairSpacing;y<high+S.lift.chairSpacing;y+=S.lift.chairSpacing){if(y<route.y0||y>route.y1)continue;const s=screen(liftX(route,y)+side*19,y-83);line(s.x,s.y,s.x,s.y+12,'#687981');box(s.x-8,s.y+12,16,3,'#a78257');box(s.x-7,s.y+7,14,2,'#5b737b');line(s.x-7,s.y+7,s.x-7,s.y+16,'#687981');line(s.x+7,s.y+7,s.x+7,s.y+16,'#687981');if((Math.round((y-offset)/S.lift.chairSpacing)-Math.floor(clock*S.lift.chairSpeed*side/S.lift.chairSpacing))%3!==0){box(s.x-3,s.y+1,6,4,'#35495e');box(s.x-4,s.y+5,8,7,side<0?'#b96558':'#4d9097');box(s.x-3,s.y+13,2,6,'#32444e');box(s.x+1,s.y+13,2,6,'#32444e');}}}
    }
  }
  function drawRainbow(x,y,width){
    const colors=['#db6868','#ecad65','#e7d669','#87b787','#7db5ce','#9c87b3'];
    const radius=width*ZOOM*.55;
    colors.forEach((color,i)=>{const r=radius-i*2;for(let xx=-r;xx<=r;xx+=2){const yy=Math.sqrt(Math.max(0,r*r-xx*xx));box(x+xx,y-yy,3,3,color);}});
    box(x-radius-3,y-2,10,5,'#e3ece8');box(x+radius-7,y-2,10,5,'#e3ece8');
  }

  function flag(x,y,color,side=1,good=false) {
    ctx.save();ctx.translate(x,y);ctx.scale(ZOOM,ZOOM);x=0;y=0;
    shadow(x,y,6,2);box(x-1,y-34,3,34,'#52727c');box(x-2,y-36,4,4,'#f8efe1');
    const flutter=Math.sin(clock*5+x)*2;
    ctx.fillStyle=good?'#77a581':color;ctx.beginPath();ctx.moveTo(x+side*2,y-33);ctx.lineTo(x+side*19,y-30+flutter);ctx.lineTo(x+side*18,y-18+flutter);ctx.lineTo(x+side*2,y-21);ctx.closePath();ctx.fill();box(x-3,y,7,2,'#b6cfcf');ctx.restore();
  }
  function drawEntrance(o,s) {
    const st=stages[o.stage],half=o.half*ZOOM;
    // Labels sit on the snow beside the physical start flags.
    text(st.name.toUpperCase(),s.x,s.y-39,9,st.color);
    text(st.fee?st.fee+' COINS':st.length+' m · FREE',s.x,s.y-24,8,st.fee?C.red:C.muted);
    flag(s.x-half,s.y,st.color,1);flag(s.x+half,s.y,st.color,-1);
    text('↓',s.x,s.y-4,10,'#96b8b3');
    if(Math.abs(o.y-state.p.y)<165)text(st.sub,s.x,s.y+24,7,C.muted);
    const best=courseRecord(o.stage)?.bestSeconds;if(S.timing.enabled&&best)text('BEST '+formatTime(best),s.x,s.y+39,8,C.teal);
  }
  function drawPredator(o,s){
    const moving=o.running||o.hunting||o.alertUntil>clock,cycle=(clock*(moving?10:3)+o.phase)%4,runFrame=moving&&cycle<2;
    const left=Math.cos(o.angle||0)<0,flip=o.type==='wolf'&&runFrame?!left:left;
    const bob=moving?[0,-1,-2,-1][Math.floor(cycle)]:0;
    shadow(s.x,s.y,17,4);sprite(o.type+(runFrame?'Run':''),s.x,s.y+bob,o.width,{flip});
    if(o.feedingUntil>clock)text('...',s.x,s.y-22,9,C.ink);
  }
  function drawKnockedOut(o,s,kind){
    sprite(kind==='bear'?'bearRun':'yeti',s.x,s.y,kind==='bear'?44:52,{rotate:Math.PI/2});
    for(let i=0;i<3;i++){const a=clock*4+i*TAU/3;box(s.x+Math.cos(a)*12,s.y-17+Math.sin(a)*4,2,2,C.gold);}
  }
  function drawHouse(o,s){
    const A=S.houseAnimation,w=o.width*ZOOM,a=atlas[o.type],h=w*a[4]/a[3],style=o.houseStyle??0;
    sprite(o.type,s.x,s.y,o.width,{houseStyle:style});
    // Native-pixel accents: warm windows, smoking chimneys, shop awnings and occupied doors.
    const phase=clock+o.phase*A.doorCycleSeconds,door=phase%A.doorCycleSeconds;
    const chimneyX=s.x-w*.24,chimneyY=s.y-h*.78;
    box(chimneyX-2,chimneyY-5,5,8,'#735e58');box(chimneyX-3,chimneyY-6,7,2,'#e5f0ee');
    for(let i=0;i<A.smokePuffs;i++){
      const t=((clock/A.smokeSeconds+i/A.smokePuffs+o.phase)%1),size=2+Math.floor(t*3);
      ctx.globalAlpha=(1-t)*.32;box(chimneyX+Math.sin(t*5+o.phase)*4,chimneyY-7-t*22,size,size,'#91a5ab');
    }ctx.globalAlpha=1;
    const warm=Math.sin(clock*A.lampFlickerSpeed+o.phase)>.15?'#f2c98f':'#d39b61';
    for(const side of [-1,1]){box(s.x+side*w*.19-2,s.y-h*.25,4,5,warm);box(s.x+side*w*.19,s.y-h*.25,1,5,'#714a37');}
    if(style===1||style===3){
      const y=s.y-h*.22,flap=Math.round(Math.sin(clock*A.awningSpeed+o.phase)),width=Math.round(w*.38);
      for(let x=0;x<width;x+=4){box(s.x-width/2+x,y,4,3,(x/4)%2?'#e5f0ee':style===1?'#548091':'#9b403e');box(s.x-width/2+x,y+3,4,2+flap,(x/4)%2?'#c7e0e4':'#714a37');}
    }
    if(door<A.doorOpenSeconds){
      const x=s.x-w*.045,y=s.y-h*.17;
      box(x-2,y,8,Math.max(8,h*.16),'#463735');box(x-1,y+1,5,Math.max(6,h*.14),'#d39b61');
      box(x,y+2,3,3,'#f2c98f');box(x-1,y+5,5,5,style%2?'#548091':'#9b403e');
      box(x+4,y+4+Math.round(Math.sin(clock*7+o.phase)),2,3,'#f2c98f');
    }
    const slide=(clock+o.phase*A.snowCycleSeconds)%A.snowCycleSeconds;
    if(style===2&&slide<A.snowFallSeconds){
      const t=slide/A.snowFallSeconds;
      for(let i=0;i<5;i++)box(s.x-w*.31+i*3+t*3,s.y-h*.58+t*t*h*.58,2,2,t>.85?'#c7e0e4':'#f8faf0');
    }
  }
  function drawTownDetail(o,s){
    if(o.type==='lamp'){
      box(s.x-1,s.y-26,2,26,'#375769');box(s.x-5,s.y-27,10,2,'#244451');
      box(s.x-3,s.y-25,6,6,'#714a37');box(s.x-2,s.y-24,4,4,'#f2c98f');box(s.x-4,s.y-29,8,2,'#e5f0ee');box(s.x-3,s.y,6,2,'#548091');return;
    }
    if(o.type==='bench'){
      box(s.x-11,s.y-11,22,3,'#976e4d');box(s.x-11,s.y-7,22,3,'#b0794c');box(s.x-12,s.y-3,24,3,'#714a37');box(s.x-9,s.y,2,4,'#375769');box(s.x+7,s.y,2,4,'#375769');box(s.x-10,s.y-12,19,1,'#e5f0ee');return;
    }
    if(o.type==='snowman'){
      box(s.x-6,s.y-10,12,9,'#c7e0e4');box(s.x-5,s.y-11,10,9,'#f8faf0');box(s.x-4,s.y-19,8,8,'#f8faf0');box(s.x-5,s.y-20,10,2,'#375769');box(s.x-3,s.y-23,6,4,'#244451');box(s.x-4,s.y-12,9,2,'#9b403e');box(s.x+2,s.y-16,5,2,'#e58039');box(s.x,s.y-17,1,1,'#244451');box(s.x,s.y-7,1,1,'#244451');line(s.x-5,s.y-9,s.x-11,s.y-15,'#714a37');return;
    }
    const half=o.width*ZOOM/2;line(s.x-half,s.y-34,s.x,s.y-29,'#739391');line(s.x,s.y-29,s.x+half,s.y-34,'#739391');
    for(let i=0;i<9;i++){const x=s.x-half+i*half/4,y=s.y-34+Math.sin(i/8*Math.PI)*5,wave=Math.round(Math.sin(clock*3+o.phase+i));box(x,y,5,4+wave,['#9b403e','#548091','#d39b61'][i%3]);box(x+1,y+4+wave,3,2,['#9b403e','#548091','#d39b61'][i%3]);}
  }
  function drawTree(o,s){
    const name={spruce:'spruceTree',crooked:'crookedTree',cedar:'cedarTree',alpine:'alpineTree'}[o.treeVariant]||'pine';
    sprite(name,s.x,s.y,o.width);
  }
  function drawObject(o) {
    const s=screen(o.x,o.y);if(s.x<-230||s.x>W+230||s.y<-80||s.y>H+230)return;
    if(o.dead){ctx.save();ctx.globalAlpha=clamp((o.fadeUntil-clock)/(o.type==='wolf'?S.wildlife.wolfFadeSeconds:S.wildlife.predatorFadeSeconds),0,1);if(o.type==='wolf')sprite('wolf',s.x,s.y,o.width,{rotate:Math.PI/2});else drawKnockedOut(o,s,o.type);ctx.restore();return;}
    if(o.npcFallUntil>clock){sprite('fall',s.x,s.y,o.width);return;}
    if(o.fearUntil>clock)text('!',s.x,s.y-o.width*ZOOM-10,11,C.red);
    if(o.type==='ice'||o.type==='awakened'||o.eaten||o.collected)return;
    if(o.collectible){sprite('mushroom',s.x,s.y,o.width);const glint=(clock/S.mushroomHunt.glintSeconds+o.phase)%1;if(glint<.3){box(s.x+8,s.y-12,1,5,C.gold);box(s.x+6,s.y-10,5,1,C.gold);}return;}
    if(o.stunnedUntil>clock){drawKnockedOut(o,s,o.type);return;}
    if((o.type==='pine'||o.type==='fir')&&o.treeVariant&&o.treeVariant!=='classic'){drawTree(o,s);return;}
    if(o.type==='entrance'){drawEntrance(o,s);return;}
    if(o.type==='lodge'||o.type==='rental'){drawHouse(o,s);return;}
    if(['lamp','bunting','bench','snowman'].includes(o.type)){drawTownDetail(o,s);return;}
    if(o.type==='courseStart'){text(o.name.toUpperCase()+'  ·  START',s.x,s.y-22,11,C.teal);for(let x=-220;x<220;x+=20)box(s.x+x,s.y,10,2,'#a8c7bb');return;}
    if(o.type==='rainbow'){drawRainbow(s.x,s.y,o.width);return;}
    if(o.type==='lurker'){sprite('yetiHappy',s.x,s.y,o.width);text('z',s.x+12,s.y-27,9,C.muted);return;}
    if(o.type==='bear'){sprite(o.running?'bearRun':'bear',s.x,s.y,o.width,{flip:Math.cos(o.angle||0)<0});return;}
    if(o.type==='rabbit'){sprite(o.running||Math.sin(clock*6+o.phase)>.3?'rabbitRun':'rabbit',s.x,s.y-(o.running?Math.abs(Math.sin(clock*10))*3:0),o.width,{flip:Math.cos(o.angle||0)<0});return;}
    if(o.type==='fox'||o.type==='wolf'){drawPredator(o,s);return;}
    if(o.type==='cat'){sprite(o.ai==='climb'?'catClimb':'cat',s.x,s.y-(o.climb||0)*ZOOM,o.width,{flip:o.perch?.x<o.x});return;}
    if(o.type==='trailChoices'){text('← TRAILS  ·  ALL START HERE →',s.x,s.y,10,C.teal);text('More start flags to the left and right.',s.x,s.y+17,8,C.muted);return;}

    if(o.type==='gate'){
      const a=o.checked?.6:1;ctx.globalAlpha=a;
      flag(s.x-o.half*ZOOM,s.y,o.color,1,o.good);flag(s.x+o.half*ZOOM,s.y,o.color,-1,o.good);
      if(o.checked){text(o.good?'+'+S.race.gatePoints:'×',s.x,s.y-15,10,o.good?C.teal:C.red);}else text(String(o.number).padStart(2,'0'),s.x,s.y+9,8,'#8eaaa5');
      ctx.globalAlpha=1;return;
    }
    if(o.type==='finish'){
      const half=o.half*ZOOM;
      for(let x=-half,i=0;x<half;x+=8,i++){const w=Math.min(8,half-x);box(s.x+x,s.y,w,4,i%2?'#6c9698':'#e5eee4');box(s.x+x,s.y+4,w,4,i%2?'#e5eee4':'#6c9698');}
      flag(s.x-half,s.y,C.teal,1);flag(s.x+half,s.y,C.teal,-1);
      text('FINISH',s.x,s.y-31,20,C.teal);text('BETWEEN THE FLAGS',s.x,s.y+26,9,C.muted);return;
    }
    if(o.type==='villageTitle'){text('S N O W D R I F T',s.x,s.y,22,C.teal);text('VILLAGE  ·  PLEASE DISTURB THE PEACE QUIETLY',s.x,s.y+23,8,C.muted);return;}
    if(o.type==='liftLabel'){text('SUMMIT LIFT',s.x,s.y,10,C.ink);text('SKI IN TO RIDE',s.x,s.y+15,8,C.muted);return;}
    const wiggle=o.roam?Math.sin(clock*6+o.phase)*1.2:0;
    if(o.cheerUntil>clock&&o.type.startsWith('person')){
      const wave=Math.sin(clock*11+o.phase)>0?0:3,coat=o.type==='personYellow'?'#dba45a':'#ce6855';
      sprite(o.type,s.x,s.y,30);
      for(const side of [-1,1]){box(s.x+side*5-1,s.y-15,3,4,coat);box(s.x+side*7-1,s.y-19+wave,2,5,coat);box(s.x+side*7-1,s.y-21+wave,2,2,'#f2c98f');}return;
    }
    if(o.type.startsWith('person')){
      const phase=o.walkCycle||0,bob=o.walking?Math.sin(phase*2)*.6:0;
      sprite(o.type,s.x,s.y+bob,o.width,{flip:o.walkFacing<0});
      if(o.walking){for(const side of [-1,1]){const lift=Math.sin(phase+side*Math.PI/2)>0?1:0;box(s.x+side*2-1,s.y-3-lift,2,3,'#244451');}}
      return;
    }
    if(o.type==='skier'){sprite((o.motionVx??o.vx)<-5?'left':(o.motionVx??o.vx)>5?'right':'skier',s.x,s.y,o.width,{guest:true,fast:o.fast});if(o.fast){line(s.x-5,s.y+3,s.x-5,s.y+12,C.muted);line(s.x+5,s.y+3,s.x+5,s.y+15,C.muted);}return;}
    if(o.type==='dog'){sprite((Math.sin(clock*3+o.phase)>.4?'dogLeft':'dog'),s.x,s.y+wiggle,o.width);return;}
    if(o.type==='boarder'){sprite('boarder',s.x,s.y,o.width,{rotate:Math.sin(clock+o.phase)*.08});return;}
    sprite(o.type,s.x,s.y+wiggle,o.width,{alpha:o.flatten?.55:1});

  }
  function playerPose(){
    const p=state.p;
    if(p.fall)return {name:'fall',rotation:0,flip:false};
    if(p.mode==='walk'||Math.cos(p.desiredHeading)<-S.physics.downhillCosMinimum)return {name:p.speed>3&&p.mode==='walk'?'uphill':'still',rotation:0,flip:p.desiredHeading<0};
    if(p.mode==='still'||p.mode==='traverse')return {name:'still',rotation:0,flip:Math.sin(p.desiredHeading)<0};
    const angle=Math.abs(p.heading)<.18?0:Math.sign(p.heading)*(Math.abs(p.heading)<Math.PI/4?Math.PI/6:Math.PI/3);
    return {name:'skier',skiAngle:angle,rotation:p.air>0&&p.spin>1.3?p.spin:0,flip:false};
  }
  function drawSlidingSkier(x,y,pose){
    const p=state.p,a=pose.skiAngle,dx=Math.sin(a),dy=Math.cos(a),nx=dy,ny=-dx;
    const slow=Math.abs(a)>Math.PI/4,frame=p.speed>15&&p.air<=0?Math.floor(clock*(slow?5:8))%2:0;
    const lean=Math.round(dx*(slow?1:3)),crouch=slow?-1:1,bob=crouch+frame;
    // Draw at native pixel resolution; direction changes the equipment, not the body's upright axis.
    const stroke=(x0,y0,x1,y1,color,width=1)=>{
      const count=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)))||1;
      for(let i=0;i<=count;i++)box(mix(x0,x1,i/count),mix(y0,y1,i/count),width,width,color);
    };
    ctx.save();ctx.translate(Math.round(x),Math.round(y));if(pose.rotation)ctx.rotate(pose.rotation);
    for(const side of [-1,1]){
      const bx=side*nx*3,by=-4+side*ny*3;
      stroke(bx-dx*7,by-dy*7,bx+dx*8,by+dy*8,'#142c40',2);
      stroke(bx-dx*6,by-dy*6,bx+dx*7,by+dy*7,'#1b7379');
      stroke(bx+dx*4,by+dy*4,bx+dx*7,by+dy*7,'#e58039');
      stroke(lean+side*2,-10+bob,bx,by,'#142c40',3);
      stroke(lean+side*2,-10+bob,bx,by-1,'#0c5058');
      box(bx-1,by-1,3,2,'#244451');
      const handX=lean+side*6,handY=-13+bob;
      stroke(handX,handY,bx+side*nx*7-dx*(4+frame),by+side*ny*7-dy*(4+frame),'#548091');
      box(bx+side*nx*7-dx*(4+frame),by+side*ny*7-dy*(4+frame),2,1,'#142c40');
    }
    sprite('skier',lean,bob,S.render.playerWidth,{bodyOnly:true});
    ctx.restore();
  }
  function drawPlayer(){
    const p=state.p,s=screen(p.x,p.y),jump=p.airTotal?Math.sin((1-p.air/p.airTotal)*Math.PI)*p.jumpHeight*ZOOM:0,pose=playerPose();
    shadow(s.x,s.y+7,16,4,p.air?.12:.08);
    if(pose.skiAngle!==undefined)drawSlidingSkier(s.x,s.y+16*ZOOM-jump,pose);
    else sprite(pose.name,s.x,s.y+16*ZOOM-jump,p.fall?S.render.fallWidth:S.render.playerWidth,{rotate:pose.rotation,flip:pose.flip});
    if(p.fall)text('…',s.x,s.y-26,12,C.ink);
    if(p.onIce){for(let i=0;i<3;i++)line(s.x-10+i*10,s.y+15,s.x-10+i*10,s.y+28,'#a8ced7',1);}
  }

  function drawChaser(c) {
    if(c.dead||c.stunnedUntil>clock){ctx.save();if(c.dead)ctx.globalAlpha=clamp((c.fadeUntil-clock)/S.wildlife.predatorFadeSeconds,0,1);drawKnockedOut(c,screen(c.x,c.y),c.kind);ctx.restore();return;}
    const s=screen(c.x,c.y),bob=Math.sin(clock*(c.kind==='slow'?5:9)+c.phase)*2;
    if(c.kind==='bear'){sprite(Math.sin(clock*6)>.2?'bearRun':'bear',s.x,s.y+bob,48,{flip:c.x>state.p.x});return;}
    if(c.kind==='dog')sprite(Math.sin(clock*8+c.phase)>.3?'dog':'dogLeft',s.x,s.y+bob,39);
    else if(c.kind==='patrol')sprite('boarder',s.x,s.y+bob,47);
    else {shadow(s.x,s.y,20,5);sprite(c.kind==='slow'?'yetiHappy':Math.sin(clock*7+c.phase)>.2?'yeti':'yetiWalk',s.x,s.y+bob,c.kind==='slow'?52:59);if(c.kind==='slow'){box(s.x-10,s.y-9,20,2,'#7aabc1');box(s.x+6,s.y-8,2,4,'#7aabc1');}else {text('!',s.x,s.y-37,11,C.red);}}
  }
  function drawSpeech() {
    for(const q of state.speech){const s=screen(q.object.x,q.object.y);if(s.y<-20||s.y>H+80)continue;
      const words=q.text.split(' '),lines=[''];for(const word of words){let n=lines.length-1;if((lines[n]+word).length>27)lines.push(word+' ');else lines[n]+=word+' ';}
      const width=Math.max(...lines.map(l=>l.trim().length))*6+14,height=lines.length*12+12,x=clamp(s.x-width/2,8,W-width-8),y=s.y-(q.object.width||50)*1.13*ZOOM-height-8;
      ctx.globalAlpha=clamp((q.until-clock)*3,0,1);box(x+2,y+3,width,height,'#c6d6d0');box(x,y,width,height,'#fffcef');box(clamp(s.x,x+4,x+width-8),y+height,5,4,'#fffcef');lines.forEach((l,i)=>text(l.trim(),x+width/2,y+12+i*12,9,C.ink));ctx.globalAlpha=1;
    }
  }
  function hud() {
    const p=state.p,run=state.course;
    ctx.fillStyle='rgba(243,247,240,.93)';ctx.fillRect(0,0,W,67);
    line(18,66,W-18,66,'#cfdfd7');
    text('FROSTLINE',20,24,12,C.ink,'left');
    sprite('star',W-96,31,15,{ui:true});text(state.bank.toLocaleString(),W-19,24,15,C.ink,'right');
    const name=run?stages[run.id].name+(p.y<run.startY?' · approach':''):state.zone.kind==='village'?'Snowdrift Village':'Choose your first trail';
    text(name,20,48,10,C.teal,'left');
    const right=run?`${Math.max(0,Math.floor((p.y-run.startY)/PX_PER_M))} / ${stages[run.id].length} m`:`${Math.round(S.world.summitAltitude+state.elevated-p.y/PX_PER_M)} m altitude`;
    text(right,W-20,48,10,C.muted,'right','normal');
    if(run){
      const frac=clamp((p.y-run.startY)/(run.endY-run.startY),0,1);box(18,64,(W-36)*frac,2,stages[run.id].color);
      const objective=run.objective==='mushrooms'?`${run.collected}/${run.totalMushrooms} MUSHROOMS (NEED ${Math.ceil(run.totalMushrooms*S.mushroomHunt.minimumFraction)})`:run.totalGates?`${run.cleared}/${run.totalGates} FLAGS (${Math.round(S.race.minimumGateFraction*100)}% MIN)`:'';
      text(`${run.points} PTS  ${objective}`,20,H-22,10,C.teal,'left');text(Math.round(p.speed*S.physics.hudKmhPerSpeed)+' km/h',W-20,H-22,10,C.muted,'right');
    }
    else if(state.activeTime>15){text('SKI THROUGH A GATE TO ENTER',W/2,H-23,9,C.muted);}
    if(run&&S.timing.enabled&&(run.totalGates||run.totalMushrooms)){const best=courseRecord(run.id)?.bestSeconds;text(`TIME ${formatTime(run.time)}${best?'  BEST '+formatTime(best):'  SET A BEST TIME'}`,20,H-40,10,C.ink,'left');}
    if(!state.started||state.activeTime<10&&!run?.timingStarted){const alpha=state.activeTime>7?(10-state.activeTime)/3:1;ctx.globalAlpha=alpha;text('DRAG TO SKI - SECOND FINGER TO JUMP',W/2,H-64,11,C.ink);text('ARROWS: SKI  ·  SPACE: JUMP  ·  M: SOUND',W/2,H-46,9,C.muted);ctx.globalAlpha=1;}
    if(p.awaitingInput&&p.fall===0){text('TAKE A BREATH.',W/2,91,12,C.teal);text('PRESS AN ARROW OR TOUCH TO SKI AGAIN',W/2,109,9,C.ink);}
    const result=state.results;
    if(result&&result.until>clock){
      const color=result.passed&&!result.unpaid?C.teal:C.red,y=H-207;
      ctx.globalAlpha=clamp(result.until-clock,0,1);
      box(50,y,W-100,151,'#fbf7e9');box(50,y,3,151,color);
      text(result.unpaid?'UNPAID RUN':!result.passed?'COURSE NOT COMPLETED':result.perfect?(result.collection?'FULL BASKET!':'PERFECT GATES!'):'COURSE COMPLETE',W/2,y+15,12,color);
      text(result.total?`${result.collection?'MUSHROOMS':'GATES'} ${result.cleared}/${result.total} (${(result.cleared/result.total*100).toFixed(1)}%)  MISSED ${result.missed}`:'FREESTYLE - NO GATES',W/2,y+36,9,C.ink);
      text(`CRASHES ${result.hit}  JUMPS ${result.tricks}  TIME ${formatTime(result.time)}`,W/2,y+53,9,C.ink);
      text(result.earned?`SCORE ${result.points} + FINISH ${result.bonus} + SPEED ${result.speedBonus}`:`SCORE ${result.points} - REWARD 0 COINS`,W/2,y+70,9,C.teal);
      text(`${result.earned} COINS${result.timed?'  '+(result.newBest?'NEW BEST!':result.bestSeconds?'BEST '+formatTime(result.bestSeconds):'NO QUALIFYING TIME'):''}`,W/2,y+91,9,C.teal);
      text(result.reason||'KEEP SKIING. THE COCOA IS AHEAD.',W/2,y+127,9,color);
      ctx.globalAlpha=1;
    }
    const msg=state.messages[state.messages.length-1];
    if(msg){const alpha=clamp((msg.until-clock)*2,0,1)*clamp((clock-msg.start)*5,0,1);ctx.globalAlpha=alpha;const width=Math.min(W-18,Math.max(msg.title.length*6,msg.detail.length*6)+26),x=(W-width)/2;box(x+2,83,width,49,'#bfd2cb');box(x,81,width,49,'#fbf7e9');box(x,81,3,49,msg.color);text(msg.title,W/2,98,12,msg.color);text(msg.detail,W/2,116,8,C.ink);ctx.globalAlpha=1;}
    const nearby=state.chasers.filter(c=>!c.leaving&&!c.dead);if(nearby.length){const nearest=nearby.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);const gap=Math.round(Math.hypot(nearest.x-p.x,nearest.y-p.y)/PX_PER_M);const sp=screen(nearest.x,nearest.y);if(sp.y<75)text(`↑ ${nearest.kind==='dog'?'DOGS':nearest.kind==='patrol'?'PATROL':'YETI'}  ${gap} m`,W/2,153,10,C.red);}
    if(run&&Math.abs(p.x-centerAt(p.y))>240){text(p.x<centerAt(p.y)?'COURSE →':'← COURSE',p.x<centerAt(p.y)?W-65:65,H*.55,10,C.blue);}
  }
  function touchControl() {
    const t=state.input.pointer;if(!t)return;
    text('TAP WITH ANOTHER FINGER TO JUMP',W/2,H-78,9,C.teal);
    const sx=t.sx,sy=t.sy,dx=clamp(t.x-sx,-42,42),dy=clamp(t.y-sy,-42,42);
    ctx.globalAlpha=.6;ctx.strokeStyle='#527f8c';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(sx,sy,43,0,TAU);ctx.stroke();ctx.setLineDash([]);
    for(const [x,y,label] of [[sx,sy-58,'↑'],[sx-58,sy,'←'],[sx+58,sy,'→'],[sx,sy+58,'↓']]){box(x-10,y-10,20,20,'#e1eee7');text(label,x,y,15,C.teal);}
    line(sx,sy,sx+dx,sy+dy,'#76a7af',2);ctx.fillStyle='#548f9c';ctx.beginPath();ctx.arc(sx+dx,sy+dy,7,0,TAU);ctx.fill();ctx.globalAlpha=1;
  }
  function render() {
    ctx.imageSmoothingEnabled=false;ctx.save();
    if(state.screenShake>0)ctx.translate(Math.sin(clock*71)*2,Math.cos(clock*67)*2);
    snow();drawLift();
    if(state.zone.kind==='start'){
      const s=screen(0,-128);text('S K I  I N T O  T R O U B L E',s.x,s.y,12,C.teal);text('three trails. absolutely no good judgement.',s.x,s.y+21,8,C.muted);
    }
    const layers=state.objects.filter(o=>!['ramp','mogul'].includes(o.type)&&o.y>state.cam.y-200&&o.y<state.cam.y+H/ZOOM+200).map(o=>({y:o.y,draw:()=>drawObject(o)}));
    layers.push({y:state.p.y,draw:drawPlayer});for(const c of state.chasers)layers.push({y:c.y,draw:()=>drawChaser(c)});
    layers.sort((a,b)=>a.y-b.y);for(const layer of layers)layer.draw();
    for(const q of state.particles){const s=screen(q.x,q.y);box(s.x,s.y,3,3,q.color);}
    drawSpeech();ctx.restore();hud();touchControl();
    if(state.deathTimer>0&&state.deathTimer<.5){ctx.globalAlpha=1-state.deathTimer/.5;box(0,0,W,H,C.snow);ctx.globalAlpha=1;}
  }
  function resize() {
    const r=canvas.getBoundingClientRect();H=clamp(Math.round(W*(r.height||S.render.defaultHeight)/(r.width||S.render.width)),S.render.minHeight,S.render.maxHeight);canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;state.cam.y=state.p.y-H*S.render.playerScreenY/ZOOM;
  }
  function pointerCoords(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(state.input.pointer){if(e.pointerId!==state.input.pointer.id&&!state.p.awaitingInput)state.input.jump=true;return;}if(!startMoving())return;const p=pointerCoords(e);state.control='pointer';state.input.pointer={id:e.pointerId,sx:p.x,sy:p.y,...p};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{const p=state.input.pointer;if(!p||p.id!==e.pointerId)return;e.preventDefault();Object.assign(p,pointerCoords(e));});
  const release=e=>{if(state.input.pointer?.id===e.pointerId)releasePointer();};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  window.addEventListener('keydown',e=>{const key={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(key){e.preventDefault();if((state.p.awaitingInput&&e.repeat)||!startMoving())return;state.input[key]=true;keyboardDirection(key,e.repeat);}if(e.code==='Space'){e.preventDefault();if((state.p.awaitingInput&&e.repeat)||!startMoving())return;state.input.jump=true;}if(e.key.toLowerCase()==='m'&&!e.repeat){state.muted=!state.muted;save();announce(state.muted?'SOUND OFF':'SOUND ON','',C.teal,1);}});
  window.addEventListener('keyup',e=>{const key={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(key)state.input[key]=false;});
  window.addEventListener('blur',()=>{state.input.left=state.input.right=state.input.up=state.input.down=false;if(state.input.pointer)releasePointer();});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{lastTime=0;accumulator=0;});
  function frame(t) {const elapsed=lastTime?Math.min(S.simulation.maxFrameSeconds,(t-lastTime)/1000):0;lastTime=t;if(!document.hidden){accumulator+=elapsed;while(accumulator>=S.simulation.stepSeconds){step(S.simulation.stepSeconds);accumulator-=S.simulation.stepSeconds;}render();}requestAnimationFrame(frame);}
  startMeadow();resize();state.liftRoutes.push({x0:S.lift.x,x1:S.lift.x,y0:S.lift.startY,y1:Infinity});ensureWorld(true);
  const loaded=Promise.all(Object.entries(window.FROSTLINE_ASSETS).map(([key,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(new Error('Cannot load sprite atlas: '+key));im.src=src;})));
  loaded.then(()=>{ready=true;render();requestAnimationFrame(frame);}).catch(window.showFrostlineError);
  // Kept out of the UI: deterministic hooks for simulation and renderer checks.
  window.Frostline={config:S,state,stages,atlas,loaded,step,render,startCourse,creditRun,makeVillage,hit,triggerAmbush,addChasers,startMoving,resize,launch,playerPose,keyboardDirection,releasePointer,ensureWorld,updateWildlife,die,resetSummit,patchAt,onRoad,entity,topSpeed,viewBounds,humanArea,lakeContains,get ready(){return ready;},get height(){return H;}};
})().catch(window.showFrostlineError);
