/* Frostline. All navigation is physical: ski through a gate, finish, keep skiing. */
(() => {
  'use strict';
  const canvas = document.getElementById('slope');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = 480, PX_PER_M = 10, ZOOM = .5, TAU = Math.PI * 2;
  let H = 840, clock = 0, lastTime = 0, accumulator = 0, audio = null;
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const mix = (a,b,t) => a + (b-a)*t;
  const ease = (a,b,s,dt) => mix(a,b,1-Math.exp(-s*dt));
  const pick = arr => arr[Math.floor(random()*arr.length)];
  let seed = 48372;
  function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }
  const range = (a,b) => a + random()*(b-a);
  const C = {ink:'#244451',muted:'#739391',snow:'#f3f7f0',ice:'#dfece8',blue:'#348ea0',teal:'#24716d',red:'#ce6855',gold:'#dba45a',wood:'#976e4d'};
  const stages = {
    slalom:{name:'Slalom',sub:'THE CLASSIC',length:540,fee:0,pace:156,spacing:260,density:.8,color:C.red,kind:'slalom'},
    freestyle:{name:'Freestyle',sub:'TAKE FLIGHT',length:1040,fee:0,pace:164,spacing:0,density:.72,color:C.blue,kind:'freestyle'},
    forest:{name:'Tree slalom',sub:'MIND THE PINES',length:1040,fee:0,pace:160,spacing:285,density:1.3,color:C.teal,kind:'forest'},
    rush:{name:'Lunch Rush',sub:'FAST SLALOM',length:1200,fee:210,pace:228,spacing:315,density:1.1,color:C.red,kind:'rush'},
    mushroom:{name:'Spore Decisions',sub:'BOUNCE RESPONSIBLY',length:1200,fee:220,pace:172,spacing:285,density:1.1,color:'#b16a74',kind:'mushroom'},
    polite:{name:'Polite Pursuit',sub:'YETI OFF PISTE',length:1040,fee:235,pace:178,spacing:300,density:1,color:C.blue,kind:'slow'},
    panic:{name:'Last Lunch',sub:'DANGER OFF PISTE',length:1600,fee:245,pace:240,spacing:330,density:1.15,color:'#68779a',kind:'fast'},
    free:{name:'Free skiing',sub:'NO WRONG TURNS',length:540,fee:0,pace:160,spacing:0,density:.7,color:C.teal,kind:'free'}
  };
  // Source rectangles in the actual generated PNG atlases. No stand-in art.
  const atlas = {
    spruceTree:['trees',20,72,483,659],crookedTree:['trees',529,86,491,630],cedarTree:['trees',1055,159,560,564],alpineTree:['trees',1645,75,383,651],
    skier:['ski',46,101,244,265],left:['ski',316,105,294,282],right:['ski',646,102,286,276],fall:['ski',945,102,307,282],
    yeti:['ski',38,453,225,230],yetiWalk:['ski',276,459,216,230],yetiHappy:['ski',496,455,218,226],
    pine:['ski',710,377,222,309],fir:['ski',939,455,160,228],smallPine:['ski',1106,532,147,147],
    rock:['ski',37,718,234,185],pebble:['ski',267,769,162,139],ramp:['ski',891,728,342,192],
    snowball:['ski',31,1005,195,194],star:['ski',239,1020,136,135],flag:['ski',834,1040,99,113],
    lodge:['village',0,50,332,357],rental:['village',334,81,302,323],lift:['village',643,52,347,350],sign:['village',1004,44,230,357],
    dog:['village',49,408,232,293],dogLeft:['village',351,426,263,272],dogRight:['village',676,425,258,280],boarder:['village',990,425,245,280],
    personRed:['village',69,704,194,272],personYellow:['village',364,704,220,272],personGreen:['village',689,704,187,272],mushroom:['village',974,711,267,272],
    stump:['village',10,981,315,257],mogul:['village',324,1011,315,235],sled:['village',650,1004,326,229],bush:['village',983,986,265,254],
    bear:['wildlife',100,100,162,230],bearRun:['wildlife',452,98,188,237],rabbit:['wildlife',837,120,140,219],rabbitRun:['wildlife',1160,135,220,201],
    wolf:['wildlife',35,432,304,229],wolfRun:['wildlife',401,435,310,227],fox:['wildlife',764,431,266,229],foxRun:['wildlife',1100,440,318,215],
    cat:['wildlife',80,790,192,202],catClimb:['wildlife',438,719,179,316],still:['wildlife',770,717,255,314],uphill:['wildlife',1124,715,280,319]
  };
  const images = {}, spriteCache = new Map();
  const palette = ['#142c40','#244451','#375769','#548091','#79a5b4','#9ec9d3','#c7e0e4','#e5f0ee','#f8faf0','#0c5058','#1b7379','#399799','#65b3b0','#b0794c','#714a37','#463735','#d39b61','#f2c98f','#ffe4ae','#e58039','#f6a252','#9b403e','#cc5655','#ee8275','#403959','#70557d','#987bb1','#d3becd','#618272','#9fb4a1'];
  const paletteRGB=palette.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
  let ready = false;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('frostline-v2') || localStorage.getItem('frostline-save') || '{}'); } catch {}
  const state = {
    bank:Number.isFinite(stored.bank)?Math.max(0,Math.floor(stored.bank)):0,
    best:stored.best || {}, muted:stored.muted ?? false, started:false, activeTime:0,
    p:newPlayer(),
    cam:{x:0,y:-H*.31/ZOOM}, zone:{kind:'start',origin:0}, course:null,
    objects:[], trails:[], chasers:[], particles:[], speech:[], messages:[],
    input:{left:false,right:false,up:false,down:false,pointer:null,jump:false},
    lastTrack:null, generated:0, gateCount:0, elevated:0, screenShake:0, finishCount:0,
    freefallAt:0,nextFastSkier:2, results:null, receipts:[], transitions:[], soundReady:false,
    chunks:new Map(),safeTrails:[],roads:[],villages:[],liftRoutes:[],plannedTown:null,deathTimer:0,liftTimer:0,deaths:0,keyboardStep:0,control:'keyboard',lastSteer:-10
  };
  function newPlayer(){return {x:0,y:0,vx:0,vy:0,speed:0,heading:Math.PI/2,desiredHeading:Math.PI/2,mode:'still',awaitingInput:false,crashObstacle:null,fall:0,shield:0,air:0,airTotal:0,jumpHeight:0,spin:0,boost:0,jumpLock:0,onIce:false,iceHeading:0,icePushPending:false,airHeading:0,airSpeed:0,airSpin:0,rainbow:0};}
  function viewBounds(){return {left:state.cam.x-W/(2*ZOOM),right:state.cam.x+W/(2*ZOOM),top:state.cam.y,bottom:state.cam.y+H/ZOOM};}
  function belowView(margin=330){return Math.max(viewBounds().bottom,state.p.y+H*.69/ZOOM)+margin;}
  function topSpeed(){return (state.course?stages[state.course.id].pace:state.zone.kind==='village'?135:165)*2.9;}
  function save() { try { localStorage.setItem('frostline-v2',JSON.stringify({bank:state.bank,best:state.best,muted:state.muted})); } catch {} }
  function beep(freq,duration=.07,type='sine',gain=.025) {
    if(state.muted || !state.soundReady)return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration); } catch {}
  }
  function announce(title,detail='',color=C.teal,duration=3.2) { state.messages.push({title,detail,color,until:clock+duration,start:clock});if(state.messages.length>4)state.messages.shift(); }
  function say(text,o,time=2.5) { state.speech.push({text,object:o,until:clock+time}); if(state.speech.length>5)state.speech.shift(); }
  function burst(x,y,color,n=12) { for(let i=0;i<n;i++)state.particles.push({x,y,vx:range(-50,50),vy:range(-65,30),life:range(.25,.75),color}); }
  function entity(type,x,y,extra={}) {
    const o={type,x,y,homeX:x,homeY:y,id:random(),width:40,r:13,phase:range(0,TAU),touched:false,...extra};
    if((type==='pine'||type==='fir')&&!o.treeVariant)o.treeVariant=['classic','classic','spruce','crooked','cedar','alpine'][Math.floor(o.id*6)];
    state.objects.push(o);return o;
  }

  function entrance(id,x,y) { return entity('entrance',x,y,{stage:id,half:100,width:200,r:0}); }
  function clearEntrances(){const gates=state.objects.filter(o=>o.type==='entrance');state.objects=state.objects.filter(o=>o.r===0||!gates.some(g=>Math.abs(o.x-g.x)<g.half+40&&o.y>g.y-160&&o.y<g.y+50));}
  function startMeadow() {
    entity('lodge',-190,100,{width:140,r:50});
    entity('pine',185,105,{width:86,r:18});entity('fir',232,190,{width:63,r:16});
    entity('bush',-222,210,{width:42,r:12});entity('personYellow',-101,138,{width:32,r:11});
    entity('dog',91,187,{width:34,r:11,roam:20});
    entrance('slalom',-300,450);entrance('freestyle',0,450);entrance('forest',300,450);
    for(let i=0;i<22;i++){
      const side=i%2?1:-1,y=-280+i*65,x=side*range(375,610);
      entity(i%3?'pine':'fir',x,y,{width:range(58,91),r:17});
    }
    entity('skier',-198,840,{width:42,r:13,vy:45,vx:4});entity('mushroom',164,810,{width:37,r:12});
    clearEntrances();
  }
  function centerAt(y,run=state.course) {
    if(!run)return 0;
    return run.x + Math.sin((y-run.startY)/1200)*85 + Math.sin((y-run.startY)/3100)*55;
  }
  function startCourse(id,gate) {
    if(state.course)return false;
    const s=stages[id],p=state.p,paid=state.bank>=s.fee;
    if(paid){state.bank-=s.fee;save();}
    const startY=belowView(400),endY=startY+s.length*PX_PER_M;
    const run={id,x:gate?.x??p.x,selectionY:gate?.y??p.y,startY,endY,points:0,hits:0,cleared:0,missed:0,tricks:0,time:0,violation:!paid,left:false,finishPassed:false,finishHalf:s.kind==='forest'?156:180};
    state.results=null;state.safeTrails.push(run);state.course=run;state.zone={kind:'course',origin:startY};state.generated=startY+170;state.gateCount=0;
    for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
    if(s.spacing){let count=0;for(let y=startY+400;y<endY-180;y+=s.spacing){
      const x=centerAt(y,run)+(count%2===0?-1:1)*(s.kind==='forest'?130:150);
      entity('gate',x,y,{half:s.kind==='forest'?78:90,width:180,r:0,number:++count,color:count%2?C.red:C.blue,checked:false,run});
    }run.totalGates=count;}
    entity('courseStart',run.x,startY,{r:0,width:700,name:s.name});entity('finish',run.x,endY,{r:0,width:run.finishHalf*2,half:run.finishHalf});
    // Spectators exist before the finish comes into view; a perfect run activates their celebration.
    for(let i=0;i<6;i++)entity(i%2?'personYellow':'personRed',run.x+(i%2?1:-1)*(run.finishHalf+65+(i%3)*20),endY+80+Math.floor(i/2)*105,{width:30,r:10,cheerRun:run});
    state.plannedTown=makeVillage(endY+300,run.x,false);
    protectScenery();
    if(id!=='slalom'){entity('ice',run.x+290,startY+940,{rx:185,ry:250,width:370,r:0});
    entity('ice',run.x-240,startY+1940,{rx:85,ry:105,width:170,r:0});
    for(let y=startY+1300;y<endY-300;y+=s.kind==='freestyle'?2600:4200)entity('rainbow',centerAt(y,run)-90,y,{width:115,r:25});}
    if(id==='slalom')state.objects=state.objects.filter(o=>!classicArea(o.x,o.y,70)||['gate','courseStart','finish','entrance','skier','boarder','personRed','personGreen','personYellow'].includes(o.type));
    const oldRoute=state.liftRoutes[state.liftRoutes.length-1];
    if(oldRoute&&oldRoute.y1>startY)oldRoute.y1=startY;
    state.liftRoutes.push({x0:oldRoute?liftX(oldRoute,startY):run.x+400,x1:run.x+400,y0:startY,y1:state.plannedTown.origin+1010});
    announce(s.name.toUpperCase(),`${s.length} m ahead${s.fee?(paid?`  ·  ${s.fee} coins paid`:'  ·  Unpaid adventure!'):'  ·  Follow the flags.'}`,s.color);
    if(!paid)triggerAmbush();else if(s.kind==='slow')addChasers('slow',1);else if(s.kind==='fast')addChasers('fast',1);
    state.transitions.push({kind:'start',id,y:p.y,paid});beep(650,.14);return true;
  }

  function addChasers(kind,count) {
    const speed=topSpeed()*(kind==='fast'?.94:kind==='slow'?.62:kind==='dog'?.55:kind==='bear'?.27:.8);
    for(let i=0;i<count;i++){
      let x=state.p.x+range(-90,90),y=state.cam.y-160-i*70;
      if(['fast','slow','bear'].includes(kind))while(humanArea(x,y))x+=(i%2?-1:1)*440;
      state.chasers.push({kind,x,y,speed,phase:range(0,6),expires:Infinity,leaving:false,talkAt:clock+range(4,8)});
    }
  }

  function triggerAmbush(forced) {
    const kind=forced || pick(['fast','patrol','dog']);
    addChasers(kind,kind==='fast'?3:kind==='patrol'?4:5);
    announce('UNPAID ADVENTURE',kind==='fast'?'Three yetis outside the flags. Stay on the piste!':kind==='patrol'?'Ski patrol would like a word.':'The dogs have your scent. And no other plans.',C.red,4.5);
    state.course.ambush=kind;
  }
  function creditRun(caught=false) {
    if(caught){die('YETI');return;}
    const run=state.course;if(!run)return;
    const total=run.totalGates||0,required=Math.ceil(total*.9),passed=run.finishPassed&&run.cleared>=required;
    const perfect=passed&&total>0&&run.cleared===total;
    const bonus=passed&&!run.violation?45+(run.hits===0?50:Math.max(0,25-run.hits*4)):0;
    const earned=passed&&!run.violation?run.points+bonus:0;
    const reason=!run.finishPassed?'MISSED THE FINISH FLAGS':run.cleared<required?'NEED AT LEAST 90% OF GATES':run.violation?'UNPAID ENTRY - NO REWARD':'';
    if(earned){state.bank+=earned;state.best[run.id]=Math.max(state.best[run.id]||0,earned);save();}
    const result={id:run.id,earned,bonus,cleared:run.cleared,total,required,missed:total-run.cleared,hit:run.hits,tricks:run.tricks,time:run.time,points:run.points,caught:false,passed,perfect,unpaid:run.violation,reason,until:clock+18};
    state.receipts.push(result);state.results=result;
    if(passed)state.finishCount++;
    if(perfect){
      let n=0;for(const o of state.objects)if(o.cheerRun===run){o.cheerUntil=clock+20;o.nextCheer=clock+(n++)*.45;}
      burst(state.p.x,state.p.y,C.gold,34);
    }
    beep(passed?880:210,.2);state.course=null;
    for(const c of state.chasers)c.expires=state.p.y+(c.kind==='dog'?1600:220);
    const town=state.plannedTown||makeVillage(belowView(300),state.p.x,false);
    state.zone={kind:'village',origin:town.origin,x:town.x};state.transitions.push({kind:'village',y:state.p.y});state.plannedTown=null;
  }

  function die(cause='YETI') {
    if(state.deathTimer)return;state.deathTimer=1.4;state.deaths++;
    state.p.fall=2;state.p.speed=0;state.p.vx=state.p.vy=0;
    announce(cause==='BEAR'?'BEAR HUG. TOO MUCH BEAR.':cause==='WOLF'?'THE PACK CAUGHT YOU.':'THE YETI GOT YOU.',`Back to the summit. Your ${state.bank} coins are safe.`,C.red,3);
    beep(110,.3,'triangle');save();
  }
  function resetSummit(lift=false){
    state.p=newPlayer();state.results=null;state.course=null;state.zone={kind:'start',origin:0};state.objects=[];state.trails=[];state.chasers=[];state.particles=[];state.speech=[];state.messages=[];
    state.roads=[];state.villages=[];state.safeTrails=[];state.liftRoutes=[];state.chunks.clear();state.plannedTown=null;state.generated=0;state.lastTrack=null;state.started=false;state.activeTime=0;state.keyboardStep=0;state.control='keyboard';state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};state.deathTimer=state.liftTimer=0;state.elevated=0;state.nextFastSkier=clock+2;
    state.cam={x:0,y:-H*.31/ZOOM};startMeadow();state.liftRoutes.push({x0:400,x1:400,y0:-600,y1:Infinity});ensureWorld(true);
    announce(lift?'BACK AT THE SUMMIT':'ANOTHER DAY. SAME WALLET.',`${state.bank} coins  ·  Choose a trail and ski.`,C.teal,3.5);
  }

  function makeVillage(origin,base=state.p.x,activate=true) {
    const town={origin,x:base,end:origin+1850};state.villages.push(town);
    if(activate){state.zone={kind:'village',origin,x:base};state.transitions.push({kind:'village',y:state.p.y});}
    entity('villageTitle',base,origin+10,{r:0,width:300});
    state.roads.push({x:base-49,y:origin+160,w:98,h:1260});
    for(let row=0;row<4;row++){
      const y=origin+250+row*275;
      state.roads.push({x:base-640,y:y+32,w:1250,h:62});
      for(const col of [-2,-1,1,2]){
        if(row===3&&col===2)continue;
        const x=base+(row===3&&col===1?170:col*240+(row%2?25:-15)),type=(row+col)%3?'rental':'lodge';
        entity(type,x,y,{width:type==='lodge'?168:142,r:type==='lodge'?54:45});
        if((row+col)%2===0)entity('bush',x+95,y+2,{width:35,r:10});
      }
      for(let n=0;n<7;n++){
        const x=base+range(-540,540),type=pick(['personRed','personYellow','personGreen']);
        entity(type,x,y+65,{width:30,r:10,walker:true,walkDir:n%2?1:-1,walkSpeed:range(11,24),roadY:y+65});
      }
    }
    entity('cat',base-50,origin+525,{width:27,r:8,animal:true,ai:'idle',nextAI:clock+2,climb:0});
    for(let n=0;n<4;n++)entity('skier',base+range(-140,100),origin+range(370,650),{width:42,r:12,vy:30,vx:0});
    entity('dog',base+120,origin+410,{width:34,r:10,roam:20});
    state.roads.push({x:base+45,y:origin+990,w:390,h:47});
    entity('lift',base+400,origin+1010,{width:174,r:0,half:73,used:false});
    entity('liftLabel',base+400,origin+1065,{r:0,width:160});
    entity('sign',base-97,origin+1230,{width:40,r:8});
    // All choices share one contour line. No second row of choices down the piste.
    const choices=['slalom','freestyle','rush','mushroom','polite','panic','forest'];
    choices.forEach((id,i)=>entrance(id,base+(i-3)*265,origin+1550));
    entity('trailChoices',base,origin+1370,{r:0,width:400});
    return town;
  }
  function liftX(route,y){return mix(route.x0,route.x1,clamp((y-route.y0)/900,0,1));}
  function insideTown(x,y){return state.villages.some(t=>Math.abs(x-t.x)<1050&&y>t.origin-70&&y<t.end);}
  // Preserve protected corridors after a run ends, including when walking back uphill.
  function humanArea(x,y){
    return (Math.abs(x)<1050&&y>-700&&y<1150)||insideTown(x,y)||state.safeTrails.some(r=>y>r.selectionY-80&&y<r.endY+350&&Math.abs(x-centerAt(y,r))<490);
  }
  function classicArea(x,y,margin=0){return state.safeTrails.some(r=>r.id==='slalom'&&y>r.startY-120-margin&&y<r.endY+60+margin&&Math.abs(x-centerAt(y,r))<490+margin);}
  function spawnWolfPack(x,y,extra={}){
    const packId=random(),count=random()<.5?3:4,visitor=humanArea(x,y),wolves=[];
    for(let i=0;i<count;i++){
      let xx=x+(i%2?1:-1)*i*24,yy=y+Math.floor(i/2)*44;
      if(!visitor&&humanArea(xx,yy)){xx=x;yy=y+i*18;}
      wolves.push(entity('wolf',xx,yy,{width:43,r:11,animal:true,packId,packIndex:i,humanVisitor:visitor,ai:'idle',nextAI:clock+range(1,4),...extra}));
    }return wolves;
  }
  function spawnFastSkier(){
    if(!state.started||state.p.awaitingInput||insideTown(state.p.x,state.p.y)||clock<state.nextFastSkier)return;
    state.nextFastSkier=clock+range(5,8);
    const y=viewBounds().top-100,x=state.p.x+pick([-1,1])*range(95,240);
    if(insideTown(x,y))return;
    entity('skier',x,y,{width:44,r:12,fast:true,vy:topSpeed()*1.32,vx:range(-13,13)});
  }
  function ambientType(x,y){
    const roll=random();
    if(classicArea(x,y,70))return pick(['skier','skier','personGreen']);
    if(y<-400&&roll<.55)return pick(['pine','pine','fir']);
    if(humanArea(x,y))return roll<.008?pick(['fox','wolf']):pick(['pine','pine','fir','rock','pebble','skier','skier','personGreen','rabbit','fir','cat','bush']);
    return roll<.28?pick(['fox','wolf']):pick(['pine','pine','fir','rock','pebble','skier','rabbit','fir','bear','cat','lurker','bush']);
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
  function onRoad(x,y){return state.roads.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);}
  function ensureWorld(initial=false){
    const b=viewBounds(),size=440;
    for(let tx=Math.floor((b.left-600)/size);tx<=Math.floor((b.right+600)/size);tx++)for(let ty=Math.floor((b.top-550)/size);ty<=Math.floor((b.bottom+700)/size);ty++){
      const key=tx+','+ty;if(state.chunks.has(key))continue;state.chunks.set(key,{tx,ty});
      for(let i=0;i<(ty<0?5:3);i++){
        const x=tx*size+range(65,size-65),y=ty*size+range(80,size-60);
        if(patchAt(x,y)||insideTown(x,y)||(!state.course&&state.zone.kind==='start'&&Math.abs(x)<350&&y>-350&&y<650))continue;
        if(state.objects.some(o=>(o.type==='gate'||o.type==='entrance')&&Math.abs(o.x-x)<o.half+60&&Math.abs(o.y-y)<140))continue;
        const type=ambientType(x,y);
        if(type==='wolf'){spawnWolfPack(x,y,{worldChunk:key});continue;}
        const fast=type==='skier'&&random()<.32;
        const widths={pine:range(60,90),fir:range(52,74),rock:44,pebble:28,skier:42,personGreen:30,rabbit:20,fox:39,wolf:43,bear:44,cat:25,lurker:55,bush:35};
        entity(type,x,y,{worldChunk:key,fast,width:widths[type],r:['lurker','bear'].includes(type)?18:type==='rabbit'?5:12,animal:['rabbit','fox','wolf','bear','cat'].includes(type),humanVisitor:humanArea(x,y)||random()<.008,ai:'idle',nextAI:clock+range(1,5),climb:0,vy:type==='skier'?(fast?range(460,650):range(38,90)):0});
      }
      if(random()<.16){const x=(tx+.5)*size,y=(ty+.5)*size;if(!insideTown(x,y)&&!classicArea(x,y,360)&&y>700&&!state.objects.some(o=>o.type==='gate'&&Math.hypot(o.x-x,o.y-y)<260))entity('ice',x,y,{worldChunk:key,rx:range(65,190),ry:range(80,225),width:330,r:0});}
    }
    for(const [key,t] of state.chunks)if(Math.abs(t.ty*size-state.p.y)>6000||Math.abs(t.tx*size-state.p.x)>6000){state.chunks.delete(key);state.objects=state.objects.filter(o=>o.worldChunk!==key);}
  }

  function spawnTerrain() {
    const run=state.course;if(!run)return;
    const s=stages[run.id],limit=Math.min(run.endY-100,viewBounds().bottom+680);
    while(state.generated<limit){
      const y=state.generated,center=centerAt(y),nearGate=state.objects.find(o=>o.type==='gate'&&Math.abs(o.y-y)<135);
      const amount=random()<s.density*.55?2:1;
      for(let i=0;i<amount;i++){
        let x=center+range(-320,320);if(nearGate&&Math.abs(x-nearGate.x)<nearGate.half+40)x=nearGate.x+(x<nearGate.x?-1:1)*range(145,270);
        if(patchAt(x,y))continue;
        const kinds=s.kind==='slalom'?['skier','skier','boarder','personGreen','personYellow']:s.kind==='mushroom'?['mushroom','mushroom','sled','mogul','cat','dog','pine']:s.kind==='forest'?['pine','pine','fir','rock','dog','skier','ramp','mogul']:['pine','fir','rock','dog','skier','boarder','mushroom','ramp','mogul','bush'];
        const type=pick(kinds),fast=type==='skier'&&random()<.35,sizes={personGreen:30,personYellow:30,pine:range(63,93),fir:range(49,70),rock:47,dog:34,skier:42,boarder:43,mushroom:37,ramp:61,mogul:40,sled:45,cat:25,rainbow:130,bush:35};
        entity(type,x,y+range(-30,30),{fast,width:sizes[type],r:type==='pine'?18:type==='ramp'||type==='rainbow'?25:13,animal:type==='cat',ai:'idle',climb:0,nextAI:clock+3,vx:type==='dog'?range(-15,15):0,vy:type==='skier'?(fast?range(460,650):range(38,88)):type==='boarder'?range(330,480):0});
      }
      if(s.kind==='freestyle'&&Math.floor(y/180)%2===0)entity('ramp',center+range(-105,105),y+55,{width:100,r:24});
      state.generated+=range(125,205)/Math.max(.8,s.density);
    }
  }

  function inputVector() {
    const k=state.input;let x=0,y=0,held=false;
    if(k.pointer) {const dx=k.pointer.x-k.pointer.sx,dy=k.pointer.y-k.pointer.sy,len=Math.hypot(dx,dy);held=true;if(len>8){x=clamp(dx/68,-1,1);y=clamp(dy/68,-1,1);}}
    if(k.left||k.right||k.up||k.down){held=true;x=(k.right?1:0)-(k.left?1:0);y=(k.down?1:0)-(k.up?1:0);}
    return {x,y,held};
  }
  function startMoving() {
    const p=state.p;if(state.deathTimer||state.liftTimer||p.fall>0)return false;
    if(p.awaitingInput){p.awaitingInput=false;p.onIce=false;p.icePushPending=!!patchAt(p.x,p.y);p.shield=.15;p.desiredHeading=0;p.mode='slide';state.keyboardStep=0;}
    if(!state.started){state.started=true;state.activeTime=0;}state.soundReady=true;return true;
  }
  function crash(obstacle=null,duration=1.18){
    const p=state.p;if(p.awaitingInput)return;
    if(state.course)state.course.hits++;
    p.awaitingInput=true;p.crashObstacle=obstacle;p.fall=duration;p.shield=duration;
    p.speed=p.vx=p.vy=0;p.air=p.airTotal=0;p.mode='still';state.lastTrack=null;
    state.input={left:false,right:false,up:false,down:false,pointer:null,jump:false};
    state.screenShake=.2;burst(p.x,p.y,'#b9d2d8',15);beep(140,.12,'triangle');
  }
  function launch(duration=1.05) {
    const p=state.p;if(p.fall||p.air||p.jumpLock>0)return;
    const multiplier=clamp(.5+p.speed/260,.65,2.8);
    p.air=p.airTotal=duration*multiplier;p.jumpHeight=clamp(18+p.speed*.26,25,235)*duration;
    p.airHeading=p.heading;p.airSpeed=p.speed;p.airSpin=Math.abs(Math.sin(p.heading))*1.6;p.onIce=false;
    p.spin=0;p.jumpLock=p.airTotal+.2;burst(p.x,p.y,C.ice,7);beep(520,.1);
  }

  function knockOut(o,kind){
    const p=state.p,threshold=kind==='bear'?30:['fast','slow','lurker'].includes(kind)?60:Infinity;
    if(p.air>0||p.fall||p.awaitingInput||p.speed*.2<=threshold||(o.x-p.x)*p.vx+(o.y-p.y)*p.vy<=0)return false;
    o.stunnedUntil=clock+12;o.running=false;p.speed*=.78;p.shield=.2;
    burst(o.x,o.y,C.gold,12);say(kind==='bear'?'BEAR DOWN!':'YETI DOWN!',o);beep(190,.12,'triangle');return true;
  }
  function hit(o) {
    const p=state.p;if(o.stunnedUntil>clock||p.awaitingInput||p.shield>0||o===p.crashObstacle)return;
    if(['bear','lurker'].includes(o.type)&&knockOut(o,o.type))return;
    if(o.touched&&['ramp','mogul','mushroom','rainbow','sled','bush','cat'].includes(o.type))return;
    const uphill=p.vy<0,fast=p.speed>211;
    if(o.type==='cat'){
      if(o.climb>8)return;
      if(fast){o.ai='flee';o.perch=null;o.calmAt=clock+18;o.touched=true;say('HISSS!',o);for(const n of state.objects)if((n.type==='skier'||n.type==='boarder'||n.type.startsWith('person'))&&Math.hypot(n.x-o.x,n.y-o.y)<260){n.annoyedUntil=clock+9;n.catInterest=null;say(pick(['You scared the cat!','Oi! We were having a moment.','Slow down, you monster!']),n);}}
      else if(!o.petted){o.petted=true;say('Prrrr.',o);}
      return;
    }
    if(['rabbit','fox','wolf'].includes(o.type)){o.angle=Math.atan2(o.y-p.y,o.x-p.x);o.nextAI=clock+2;o.running=true;return;}

    // Walking bumps stop against obstacles without a fall; moving away from an overlap is allowed.
    if(!p.onIce&&p.air<=0&&p.speed<=150&&(p.mode==='traverse'||p.mode==='walk')){
      if(['ramp','mogul','mushroom','rainbow','bush'].includes(o.type))return;
      const before=p.walkOrigin;
      if(before&&Math.hypot(p.x-o.x,p.y-o.y)<=Math.hypot(before.x-o.x,before.y-o.y)){
        p.x=before.x;p.y=before.y;p.speed=p.vx=p.vy=0;
      }
      return;
    }
    if(o.type==='ramp'||o.type==='mogul'||o.type==='mushroom'||o.type==='rainbow'){
      if(p.air>0)return;o.touched=true;
      launch(o.type==='rainbow'?1.4:o.type==='mushroom'?1.35:o.type==='ramp'?1.1:.56);
      if(o.type==='rainbow'){p.rainbow=8;p.boost=2;announce('SOMEWHERE OVER THE RAINBOW','A spectacularly impractical shortcut.',C.blue,2.5);}
      if(o.type==='mushroom'){p.boost=1.5;say('BOING. Bad decisions, good airtime.',o,2.1);}
      return;
    }
    if(p.air>0 && !['pine','fir','lodge','rental'].includes(o.type))return;
    o.touched=true;
    if((o.type==='pine'||o.type==='fir')&&fast&&!uphill) {
      o.type='stump';o.width=65;o.r=15;burst(o.x,o.y,'#658479',24);say('TIMBERRR!',o);beep(115,.15,'sawtooth');
    }
    if(o.type==='sled'&&fast){o.vx=90*Math.sign(p.vx||1);o.vy=240;p.speed*=.86;say('Express delivery!',o);return;}
    if(o.type==='bush'){o.flatten=true;p.speed*=.83;burst(o.x,o.y,C.gold,7);return;}
    if(['personRed','personGreen','personYellow'].includes(o.type))say(uphill?'BACKWARDS? Seriously?':pick(['Bloody tourists!','#@! MY COCOA!','Oi! These are NEW boots!','You absolute snowplough!']),o);
    else if(o.type==='dog'){say('WOOF. WOOF. WOOF.',o);state.chasers.push({kind:'dog',x:o.x,y:o.y,speed:130,phase:0,expires:p.y+1700,talkAt:clock+7});}
    else if(o.type==='skier'||o.type==='boarder')say(pick(['I had right of way!','Excellent parking.','That was my good knee!']),o);
    else if(o.type==='lodge'||o.type==='rental')say(uphill?'The door still works from the front.':'This is a HOUSE.',o);
    else if(uphill){say('A face full of snow. Naturally.',o);burst(p.x,p.y,'#bed9df',22);}
    else if(o.type==='rock'&&fast){say('The rock wins.',o);p.vx+=80*Math.sign(p.vx||1);}
    crash(o);
  }
  function movePlayer(dt) {
    const p=state.p,inp=inputVector();if(!state.started&&!p.awaitingInput)return;
    if(p.crashObstacle&&Math.hypot(p.x-p.crashObstacle.x,p.y-p.crashObstacle.y)>p.crashObstacle.r+24)p.crashObstacle=null;
    if(p.awaitingInput){
      p.speed=p.vx=p.vy=0;p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);
      p.boost=Math.max(0,p.boost-dt);p.rainbow=Math.max(0,p.rainbow-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);return;
    }
    // Resolve the surface before release handling so ice keeps the incoming momentum.
    const ice=p.air<=0?patchAt(p.x,p.y):null;
    if(state.input.pointer&&p.air<=0){
      const t=state.input.pointer,dx=t.x-t.sx,dy=t.y-t.sy;
      if(Math.hypot(dx,dy)>11){p.desiredHeading=Math.atan2(dx,dy);const c=Math.cos(p.desiredHeading);p.mode=c>.18?'slide':c<-.18?'walk':'traverse';if(p.mode==='traverse')p.desiredHeading=Math.sign(dx)*Math.PI/2;}
    }else if((p.mode==='walk'||p.mode==='traverse')&&!inp.held&&!ice&&p.air<=0){p.mode='still';p.speed=0;}
    if(ice&&p.icePushPending){p.heading=p.desiredHeading;p.speed=p.mode==='traverse'?145:p.mode==='walk'?62:75;p.vx=Math.sin(p.heading)*p.speed;p.vy=Math.cos(p.heading)*p.speed;p.onIce=false;p.icePushPending=false;}
    if(ice&&!p.onIce){p.iceHeading=p.speed>3?Math.atan2(p.vx,p.vy):p.heading;announce('BLACK ICE','No steering. Hold on to your scarf.',C.blue,2);}
    p.onIce=!!ice;
    if(p.air>0){p.heading=p.airHeading;p.speed=p.airSpeed;}
    else if(ice){
      p.heading=p.iceHeading;
      // Sideways and uphill entries coast at their entry speed. Gravity boosts downhill only.
      if(Math.cos(p.iceHeading)>.18)p.speed=Math.min(1800,p.speed+265*dt);
    }
    else {
      if(p.mode==='traverse')p.heading=p.desiredHeading;
      let delta=p.desiredHeading-p.heading;while(delta>Math.PI)delta-=TAU;while(delta<-Math.PI)delta+=TAU;p.heading+=delta*(1-Math.exp(-10*dt));
      const downhill=Math.max(0,Math.cos(p.heading));let cap=topSpeed()*(.36+.64*downhill*downhill);
      if(p.boost>0)cap*=1.25;
      if(p.mode==='slide'){
        if(p.air<=0){if(p.speed<cap)p.speed=Math.min(cap,p.speed+(48+98*downhill*downhill)*dt);else p.speed=Math.max(cap,p.speed-(p.speed>topSpeed()*1.1?90:180)*dt);}
      }else if(p.mode==='walk')p.speed=ease(p.speed,62,8,dt);
      else if(p.mode==='traverse')p.speed=ease(p.speed,145,12,dt);
      else {p.speed=Math.max(0,p.speed-390*dt);if(p.speed<.5)p.speed=0;}
      if(onRoad(p.x,p.y)&&p.air<=0&&p.mode!=='still')p.speed=Math.min(p.speed,Math.max(p.mode==='walk'?25:p.mode==='traverse'?70:40,p.speed-255*dt));
    }
    if(p.fall>0)p.speed=ease(p.speed,4,12,dt);
    p.vx=Math.sin(p.heading)*p.speed;p.vy=p.air<=0&&!p.onIce&&p.mode==='traverse'?0:Math.cos(p.heading)*p.speed;
    p.walkOrigin={x:p.x,y:p.y};
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.air=Math.max(0,p.air-dt);p.fall=Math.max(0,p.fall-dt);p.shield=Math.max(0,p.shield-dt);p.boost=Math.max(0,p.boost-dt);p.jumpLock=Math.max(0,p.jumpLock-dt);p.rainbow=Math.max(0,p.rainbow-dt);
    if(p.air>0)p.spin+=p.airSpin*dt;
    if(p.air===0&&p.airTotal>0){const points=Math.round(12+p.spin*5+p.jumpHeight*.07);if(state.course){state.course.points+=points;state.course.tricks++;}p.airTotal=0;announce(p.spin>2?'STYLISH LANDING':'SOFT LANDING',`+${points} points`,C.blue,1.5);beep(710,.08);}
    if(state.input.jump){launch(.72);state.input.jump=false;}
    if(p.air===0&&!p.fall&&(!state.lastTrack||Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)>6)){
      if(state.lastTrack&&Math.hypot(p.x-state.lastTrack.x,p.y-state.lastTrack.y)<45)state.trails.push({x:p.x,y:p.y,px:state.lastTrack.x,py:state.lastTrack.y,angle:p.heading,rainbow:p.rainbow>0});state.lastTrack={x:p.x,y:p.y};
    }else if(p.air>0)state.lastTrack=null;
    if(p.rainbow>0&&random()<.23)burst(p.x,p.y,pick(['#dc666a','#eda859','#e7d366','#75ac79','#66b9c6','#9885bb']),1);
    state.trails=state.trails.filter(t=>t.y>p.y-H/ZOOM&&t.y<p.y+H/ZOOM).slice(-1800);
  }
  function releasePointer(){
    const p=state.p;state.input.pointer=null;if(p.air>0)return;
    if(p.mode==='slide'&&Math.cos(p.desiredHeading)>.18){p.desiredHeading=0;p.mode='slide';}else {p.mode='still';if(!(p.air<=0&&patchAt(p.x,p.y)))p.speed=0;}
  }
  function keyboardDirection(key,repeat=false){
    if(state.p.air>0)return;
    if(repeat&&clock-state.lastSteer<.17)return;state.lastSteer=clock;state.control='keyboard';
    const p=state.p;
    if(key==='up'){p.desiredHeading=state.keyboardStep<0?-Math.PI:Math.PI;p.mode='walk';return;}
    if(key==='down')state.keyboardStep=0;
    else if(p.speed<.5||p.mode==='traverse'||Math.cos(p.desiredHeading)<-.18||(p.mode==='still'&&Math.abs(Math.cos(p.desiredHeading))<.18))state.keyboardStep=key==='left'?-3:3;
    else state.keyboardStep=clamp(state.keyboardStep+(key==='left'?-1:1),-3,3);
    p.desiredHeading=state.keyboardStep*Math.PI/6;
    p.mode=Math.abs(state.keyboardStep)===3?'traverse':'slide';
    if(p.mode==='traverse'&&!p.onIce)p.heading=p.desiredHeading;
  }

  function step(dt) {
    if(!ready)return;clock+=dt;
    if(state.deathTimer>0){state.deathTimer-=dt;if(state.deathTimer<=0)resetSummit();return;}
    if(state.liftTimer>0){state.liftTimer-=dt;state.p.y-=150*dt;state.cam.y=ease(state.cam.y,state.p.y-H*.31/ZOOM,7,dt);if(state.liftTimer<=0)resetSummit(true);return;}
    state.activeTime+=state.started?dt:0;
    const p=state.p,previous={x:p.x,y:p.y};movePlayer(dt);ensureWorld();spawnFastSkier();
    if(state.course){if(p.y>=state.course.startY)state.course.time+=dt;spawnTerrain();}
    updateWildlife(dt);
    for(const o of state.objects){
      if(o.vx&&!o.animal&&!o.catInterest)o.x+=o.vx*dt;if(o.vy&&!o.animal&&!o.catInterest)o.y+=o.vy*dt;
      if(o.cheerUntil>clock&&clock>=(o.nextCheer||0)&&Math.hypot(o.x-p.x,o.y-p.y)<650){say(pick(['PERFECT RUN!','EVERY SINGLE FLAG!','BRAVO!','WHAT A LEGEND!','TEN OUT OF TEN!']),o,2.2);o.nextCheer=clock+3.4+o.phase*.2;}
      if(o.roam)o.x+=Math.cos(clock*.8+o.phase)*o.roam*dt*.3;
      if(o.walker){let nx=o.x+o.walkDir*o.walkSpeed*dt;if(Math.abs(nx-o.homeX)>190)o.walkDir*=-1;if(!patchAt(nx,o.y))o.x=nx;}
      if(o.type==='skier'||o.type==='boarder'||o.type.startsWith('person')){const pool=patchAt(o.x+(o.vx||0)*.7,o.y+(o.vy||0)*.7);if(pool){const side=o.x>=pool.x?1:-1;o.y-=(o.vy||0)*dt;o.x+=side*75*dt;o.vx=side*45;}}
      if(state.started&&!(o.stunnedUntil>clock)&&o.type==='lurker'&&!humanArea(o.x,o.y)&&!humanArea(p.x,p.y)&&Math.hypot(o.x-p.x,o.y-p.y)<175){o.type='awakened';o.r=0;state.chasers.push({kind:'fast',x:o.x,y:o.y,speed:topSpeed()*.87,phase:o.phase,expires:p.y+4400,talkAt:clock+6});say('Oh. Breakfast.',o);}
      if(o.type==='gate'&&o.run===state.course&&!o.checked&&previous.y<o.y&&p.y>=o.y){o.checked=true;const ratio=(o.y-previous.y)/(p.y-previous.y||1),crossX=mix(previous.x,p.x,ratio);if(state.course){if(Math.abs(crossX-o.x)<o.half){state.course.points+=8;state.course.cleared++;o.good=true;burst(o.x,o.y,C.gold,9);beep(710,.04);}else{state.course.missed++;o.good=false;beep(210,.045);}}}
      if(o.type==='entrance'&&!state.course&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){startCourse(o.stage,o);break;}
      if(o.type==='lift'&&!o.used&&previous.y<o.y&&p.y>=o.y&&Math.abs(p.x-o.x)<o.half){o.used=true;state.liftTimer=2.4;p.speed=0;announce('UP WE GO','Next stop: the summit.',C.teal,3);}
      if(o.r>0&&Math.abs(o.y-p.y)<130){const d=Math.hypot(p.x-o.x,(p.y-o.y)*.85);if(d<o.r+11)hit(o);else if(o.type.startsWith('person')&&!o.greeted&&d<85){o.greeted=true;say(pick(['Looking sharp!','Lovely day for poor decisions.','Save some snow for us.','The cocoa is mostly cocoa.']),o);}}
    }
    if(state.course){const off=Math.abs(p.x-centerAt(p.y))>410;if(off&&!state.course.left){state.course.left=true;for(const c of state.chasers)c.expires=p.y+(c.kind==='dog'?2100:220);if(state.course.violation)announce('OFF PISTE',state.course.ambush==='dog'?'The dogs are still very interested.':'Ski patrol has jurisdiction issues.',C.blue,3);}const run=state.course;
      if(previous.y<run.endY&&p.y>=run.endY){
        const crossX=mix(previous.x,p.x,(run.endY-previous.y)/(p.y-previous.y||1));
        if(Math.abs(crossX-run.x)<run.finishHalf){run.finishPassed=true;creditRun();}
        else announce('MISSED THE FINISH','Cross between the two finish flags!',C.red,3);
      }
      // Leave a short uphill recovery window; skiing on into town records an unsuccessful run.
      if(state.course&&p.y>run.endY+320)creditRun();}
    else if(state.zone.kind==='start'&&p.y>730)startCourse('free',{x:p.x,y:730});
    else if(state.zone.kind==='village'&&p.y>state.zone.origin+1850)startCourse('free',{x:p.x,y:p.y});
    updateChasers(dt);
    state.objects=state.objects.filter(o=>!o.eaten&&o.type!=='awakened'&&(o.worldChunk||Math.abs(o.y-p.y)<6500&&Math.abs(o.x-p.x)<6500));
    for(const q of state.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=80*dt;q.life-=dt;}state.particles=state.particles.filter(q=>q.life>0);state.speech=state.speech.filter(q=>q.until>clock);state.messages=state.messages.filter(q=>q.until>clock);
    state.cam.x=ease(state.cam.x,p.x,4,dt);state.cam.y=ease(state.cam.y,p.y-H*.31/ZOOM,7,dt);state.screenShake=Math.max(0,state.screenShake-dt);
  }
  function updateWildlife(dt){
    const p=state.p,rabbits=state.objects.filter(o=>o.type==='rabbit'&&!o.eaten),cats=state.objects.filter(o=>o.type==='cat'),skis=state.objects.filter(o=>o.type==='skier'||o.type==='boarder');
    for(const o of state.objects){if(o.eaten||o.stunnedUntil>clock||!o.animal||Math.hypot(o.x-p.x,o.y-p.y)>2100)continue;
      if(state.started&&o.type==='bear'&&!humanArea(o.x,o.y)&&!humanArea(p.x,p.y)&&Math.hypot(o.x-p.x,o.y-p.y)<180){o.animal=false;o.type='awakened';o.r=0;state.chasers.push({kind:'bear',x:o.x,y:o.y,speed:85,phase:o.phase,expires:p.y+2100,talkAt:Infinity});continue;}
      if(o.feedingUntil>clock){o.running=false;continue;}
      if(o.type==='cat'){
        if(o.ai==='flee'||o.ai==='climb'){
          if(!o.perch)o.perch=state.objects.filter(t=>['pine','fir','lodge','rental'].includes(t.type)).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
          if(o.perch){const dx=o.perch.x-o.x,dy=o.perch.y-o.y,d=Math.hypot(dx,dy);if(d>8){o.x+=dx/d*150*dt;o.y+=dy/d*150*dt;}else{o.ai='climb';o.climb=Math.min(o.perch.width*.6,(o.climb||0)+48*dt);}}
          if(clock>(o.calmAt||Infinity)){o.ai='idle';o.climb=0;o.perch=null;}continue;
        }
        if(clock>o.nextAI){o.ai=random()<.4?'flee':'idle';o.nextAI=clock+range(10,18);o.calmAt=clock+12;}
        continue;
      }
      let target=null,chasingPlayer=false,speed=o.type==='rabbit'?38:o.type==='bear'?17:30;
      if(o.type==='wolf'&&!humanArea(p.x,p.y)&&!humanArea(o.x,o.y)&&Math.hypot(o.x-p.x,o.y-p.y)<220){for(const mate of state.objects)if(mate.type==='wolf'&&mate.packId===o.packId)mate.alertUntil=clock+9;}
      if(o.type==='wolf'&&o.alertUntil>clock&&!humanArea(p.x,p.y)){target=p;chasingPlayer=true;speed=105;}
      if(o.type==='fox'||o.type==='wolf'){
        if(clock>o.nextAI){o.hunting=random()<.65;o.nextAI=clock+range(4,8);}
        if(o.hunting&&!chasingPlayer){target=rabbits.filter(r=>!r.eaten&&Math.hypot(r.x-o.x,r.y-o.y)<350).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];speed=o.type==='wolf'?160:150;}
      }
      if(o.type==='rabbit'){
        const predator=state.objects.find(q=>(q.type==='fox'||q.type==='wolf')&&q.hunting&&Math.hypot(q.x-o.x,q.y-o.y)<225);
        if(predator){const dx=o.x-predator.x,dy=o.y-predator.y;o.angle=Math.atan2(dy,dx)+Math.sin(clock*5)*.5;speed=143;}
        else if(clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(.6,2.3);}
      }else if(!target&&clock>o.nextAI){o.angle=range(0,TAU);o.nextAI=clock+range(2,5);}
      if(!target&&o.type==='wolf'){
        const leader=state.objects.find(q=>q.type==='wolf'&&q.packId===o.packId&&q.packIndex===0);
        if(leader&&leader!==o&&Math.hypot(leader.x-o.x,leader.y-o.y)>95){o.angle=Math.atan2(leader.y-o.y,leader.x-o.x);speed=65;}
      }
      if(target){o.angle=Math.atan2(target.y-o.y,target.x-o.x);if(Math.hypot(target.x-o.x,target.y-o.y)<22){
        if(chasingPlayer){if(p.shield<=0&&p.air<=0){die('WOLF');return;}}
        else {target.eaten=true;target.r=0;o.hunting=false;o.feedingUntil=clock+2.2;o.nextAI=clock+9;burst(target.x,target.y,C.ice,9);say('CHOMP!',o,1.2);continue;}
      }}
      o.angle??=o.phase;let nx=o.x+Math.cos(o.angle)*speed*dt,ny=o.y+Math.sin(o.angle)*speed*dt;
      if(classicArea(nx,ny,35)||(o.type==='bear'||(['fox','wolf'].includes(o.type)&&!o.humanVisitor))&&humanArea(nx,ny)){o.angle=(o.angle||0)+Math.PI;o.hunting=false;o.nextAI=clock+2;continue;}
      const ice=patchAt(nx,ny);if(ice){const dx=o.x-ice.x,dy=o.y-ice.y,d=Math.hypot(dx,dy)||1;o.angle=Math.atan2(dy,dx);if(patchAt(o.x,o.y)){o.x+=dx/d*speed*dt;o.y+=dy/d*speed*dt;}continue;}o.x=nx;o.y=ny;o.running=speed>60;
    }
    for(const o of skis){
      if(o.annoyedUntil>clock){o.catInterest=null;continue;}
      if(o.fast){o.catInterest=null;continue;}
      const cat=cats.find(c=>c.ai!=='flee'&&Math.hypot(c.x-o.x,c.y-o.y)<230);
      if(cat){if(!o.catInterest&&random()<.01)say('Look! A tiny mountain cat!',o);o.catInterest=cat;const dx=cat.x-o.x,dy=cat.y+35-o.y,d=Math.hypot(dx,dy);if(d>43){o.x+=dx/d*50*dt;o.y+=dy/d*50*dt;}}
      else o.catInterest=null;
    }
  }

  function updateChasers(dt) {
    const p=state.p;if(!state.started)return;
    for(const c of state.chasers){
      if(c.stunnedUntil>clock)continue;
      if(p.y>c.expires){c.leaving=true;c.speed*=.97;continue;}
      const dx=p.x-c.x,dy=p.y-c.y,len=Math.hypot(dx,dy)||1;
      const lethal=['fast','slow','bear'].includes(c.kind),nx=c.x+dx/len*c.speed*dt,ny=c.y+dy/len*c.speed*dt;
      if(lethal&&(humanArea(p.x,p.y)||humanArea(nx,ny)))continue;
      c.x=nx;c.y=ny;
      if(c.kind==='slow'&&clock>c.talkAt){say(pick(['Sorry! Just a little nibble?','I can wait.','Lovely scarf!']),c);c.talkAt=clock+7;}
      if(len<30&&knockOut(c,c.kind))continue;
      if(len<23&&p.shield<=0&&p.air<=0){
        if(p.awaitingInput&&!lethal)continue;
        if(['fast','slow','bear'].includes(c.kind)){die(c.kind==='bear'?'BEAR':'YETI');break;}
        crash(null,1.4);announce(c.kind==='dog'?'AGGRESSIVELY LOVED':'A WORD FROM SKI PATROL',c.kind==='dog'?'Covered in slobber. Wallet intact.':'They are very disappointed.',C.red,3);for(const other of state.chasers)other.expires=p.y-1;burst(p.x,p.y,C.ice,20);break;
      }
    }
    state.chasers=state.chasers.filter(c=>!c.leaving||Math.abs(c.y-p.y)<H*.7);
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
    const h=Math.round(width*a[4]/a[3]),key=name+':'+width+(opts.guest?':guest':'')+(opts.fast?':fast':'');
    if(!spriteCache.has(key)){
      const tile=document.createElement('canvas');tile.width=width;tile.height=h;
      const t=tile.getContext('2d');t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';
      t.drawImage(img,a[1],a[2],a[3],a[4],0,0,width,h);
      const pixels=t.getImageData(0,0,width,h),data=pixels.data;
      for(let i=0;i<data.length;i+=4){if(data[i+3]<100){data[i+3]=0;continue;}let nearest=paletteRGB[0],distance=Infinity;
        for(const rgb of paletteRGB){const d=(data[i]-rgb[0])**2+(data[i+1]-rgb[1])**2+(data[i+2]-rgb[2])**2;if(d<distance){distance=d;nearest=rgb;}}
        if(opts.fast&&nearest[1]>nearest[0]*1.25&&nearest[2]>nearest[0]*1.25&&nearest[0]<110)nearest=[204,86,85];
        else if(opts.guest&&nearest[1]>nearest[0]*1.25&&nearest[2]>nearest[0]*1.25&&nearest[0]<110)nearest=[112,85,125];
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
    for(const r of state.roads){const a=screen(r.x,r.y),w=r.w*ZOOM,h=r.h*ZOOM;if(a.y>H||a.y+h<0||a.x>W||a.x+w<0)continue;
      box(a.x-2,a.y-2,w+4,h+4,'#e0e2cf');box(a.x,a.y,w,h,'#c4b7a1');
      // Stable road-local cell indices: camera movement must never recolor the paving.
      const row0=Math.max(0,Math.floor(-a.y/9)),col0=Math.max(0,Math.floor(-a.x/15));
      for(let row=row0;row<Math.ceil(h/9)&&a.y+row*9<H;row++)for(let col=col0;col<Math.ceil(w/15)&&a.x+col*15<W;col++){
        const x=col*15+2,y=row*9+2,cw=Math.min(11,w-x),ch=Math.min(5,h-y);
        if(cw>0&&ch>0)box(a.x+x,a.y+y,cw,ch,(col+row)%3?'#cfc4af':'#b7aa96');
      }
    }
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
      for(let y=Math.ceil(low/380)*380;y<high;y+=380){const s=screen(liftX(route,y),y);box(s.x-2,s.y-47,4,48,'#78858c');box(s.x-21,s.y-45,42,3,'#536673');box(s.x-5,s.y,10,3,'#becfce');}
      for(const side of [-1,1]){const offset=(clock*78*side)%240;for(let y=Math.floor(low/240)*240+offset-240;y<high+240;y+=240){if(y<route.y0||y>route.y1)continue;const s=screen(liftX(route,y)+side*19,y-83);line(s.x,s.y,s.x,s.y+12,'#687981');box(s.x-8,s.y+12,16,3,'#a78257');box(s.x-7,s.y+7,14,2,'#5b737b');line(s.x-7,s.y+7,s.x-7,s.y+16,'#687981');line(s.x+7,s.y+7,s.x+7,s.y+16,'#687981');if((Math.round((y-offset)/240)-Math.floor(clock*78*side/240))%3!==0){box(s.x-3,s.y+1,6,4,'#35495e');box(s.x-4,s.y+5,8,7,side<0?'#b96558':'#4d9097');box(s.x-3,s.y+13,2,6,'#32444e');box(s.x+1,s.y+13,2,6,'#32444e');}}}
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
  function drawTree(o,s){
    const name={spruce:'spruceTree',crooked:'crookedTree',cedar:'cedarTree',alpine:'alpineTree'}[o.treeVariant]||'pine';
    sprite(name,s.x,s.y,o.width);
  }
  function drawObject(o) {
    const s=screen(o.x,o.y);if(s.x<-230||s.x>W+230||s.y<-80||s.y>H+230)return;
    if(o.type==='ice'||o.type==='awakened'||o.eaten)return;
    if(o.stunnedUntil>clock){drawKnockedOut(o,s,o.type);return;}
    if((o.type==='pine'||o.type==='fir')&&o.treeVariant&&o.treeVariant!=='classic'){drawTree(o,s);return;}
    if(o.type==='entrance'){drawEntrance(o,s);return;}
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
      if(o.checked){text(o.good?'+8':'×',s.x,s.y-15,10,o.good?C.teal:C.red);}else text(String(o.number).padStart(2,'0'),s.x,s.y+9,8,'#8eaaa5');
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
    if(o.type==='skier'){sprite(o.vx<-5?'left':o.vx>5?'right':'skier',s.x,s.y,o.width,{guest:true,fast:o.fast});if(o.fast){line(s.x-5,s.y+3,s.x-5,s.y+12,C.muted);line(s.x+5,s.y+3,s.x+5,s.y+15,C.muted);}return;}
    if(o.type==='dog'){sprite((Math.sin(clock*3+o.phase)>.4?'dogLeft':'dog'),s.x,s.y+wiggle,o.width);return;}
    if(o.type==='boarder'){sprite('boarder',s.x,s.y,o.width,{rotate:Math.sin(clock+o.phase)*.08});return;}
    sprite(o.type,s.x,s.y+wiggle,o.width,{alpha:o.flatten?.55:1});
    if((o.type==='lodge'||o.type==='rental')&&Math.sin(clock*2+o.phase)>.2){const yy=s.y-o.width*.82;ctx.globalAlpha=.2;box(s.x-o.width*.22,yy-8-(clock*8%18),5,7,'#91a9b0');ctx.globalAlpha=1;}
  }
  function playerPose(){
    const p=state.p;
    if(p.fall)return {name:'fall',rotation:0,flip:false};
    if(p.mode==='walk'||Math.cos(p.desiredHeading)<-.18)return {name:p.speed>3&&p.mode==='walk'?'uphill':'still',rotation:0,flip:p.desiredHeading<0};
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
    sprite('skier',lean,bob,44,{bodyOnly:true});
    ctx.restore();
  }
  function drawPlayer(){
    const p=state.p,s=screen(p.x,p.y),jump=p.airTotal?Math.sin((1-p.air/p.airTotal)*Math.PI)*p.jumpHeight*ZOOM:0,pose=playerPose();
    shadow(s.x,s.y+7,16,4,p.air?.12:.08);
    if(pose.skiAngle!==undefined)drawSlidingSkier(s.x,s.y+16*ZOOM-jump,pose);
    else sprite(pose.name,s.x,s.y+16*ZOOM-jump,p.fall?60:44,{rotate:pose.rotation,flip:pose.flip});
    if(p.fall)text('…',s.x,s.y-26,12,C.ink);
    if(p.onIce){for(let i=0;i<3;i++)line(s.x-10+i*10,s.y+15,s.x-10+i*10,s.y+28,'#a8ced7',1);}
  }

  function drawChaser(c) {
    if(c.stunnedUntil>clock){drawKnockedOut(c,screen(c.x,c.y),c.kind);return;}
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
    const right=run?`${Math.max(0,Math.floor((p.y-run.startY)/PX_PER_M))} / ${stages[run.id].length} m`:`${Math.round(1840+state.elevated-p.y/PX_PER_M)} m altitude`;
    text(right,W-20,48,10,C.muted,'right','normal');
    if(run){const frac=clamp((p.y-run.startY)/(run.endY-run.startY),0,1);box(18,64,(W-36)*frac,2,stages[run.id].color);text(`${run.points} PTS${run.totalGates?'   '+run.cleared+'/'+run.totalGates+' FLAGS (90% MIN)':''}`,20,H-22,10,C.teal,'left');text(Math.round(p.speed*.2)+' km/h',W-20,H-22,10,C.muted,'right');}
    else if(state.activeTime>15){text('SKI THROUGH A GATE TO ENTER',W/2,H-23,9,C.muted);}
    if(!state.started||state.activeTime<10){const alpha=state.activeTime>7?(10-state.activeTime)/3:1;ctx.globalAlpha=alpha;text('DRAG TO SKI - SECOND FINGER TO JUMP',W/2,H-64,11,C.ink);text('ARROWS: SKI  ·  SPACE: JUMP  ·  M: SOUND',W/2,H-46,9,C.muted);ctx.globalAlpha=1;}
    if(p.awaitingInput&&p.fall===0){text('TAKE A BREATH.',W/2,91,12,C.teal);text('PRESS AN ARROW OR TOUCH TO SKI AGAIN',W/2,109,9,C.ink);}
    const result=state.results;
    if(result&&result.until>clock){
      const color=result.passed&&!result.unpaid?C.teal:C.red,y=H-175;
      ctx.globalAlpha=clamp(result.until-clock,0,1);
      box(50,y,W-100,119,'#fbf7e9');box(50,y,3,119,color);
      text(result.unpaid?'UNPAID RUN':!result.passed?'COURSE NOT COMPLETED':result.perfect?'PERFECT GATES!':'COURSE COMPLETE',W/2,y+15,12,color);
      text(result.total?`GATES ${result.cleared}/${result.total} (${(result.cleared/result.total*100).toFixed(1)}%)  MISSED ${result.missed}`:'FREESTYLE - NO GATES',W/2,y+36,9,C.ink);
      text(`CRASHES ${result.hit}  JUMPS ${result.tricks}  TIME ${result.time.toFixed(1)}s`,W/2,y+53,9,C.ink);
      text(result.earned?`SCORE ${result.points} + BONUS ${result.bonus} = ${result.earned} COINS`:`SCORE ${result.points} - REWARD 0 COINS`,W/2,y+70,9,C.teal);
      text(result.reason||'KEEP SKIING. THE COCOA IS AHEAD.',W/2,y+96,9,color);
      ctx.globalAlpha=1;
    }
    const msg=state.messages[state.messages.length-1];
    if(msg){const alpha=clamp((msg.until-clock)*2,0,1)*clamp((clock-msg.start)*5,0,1);ctx.globalAlpha=alpha;const width=Math.min(W-18,Math.max(msg.title.length*6,msg.detail.length*6)+26),x=(W-width)/2;box(x+2,83,width,49,'#bfd2cb');box(x,81,width,49,'#fbf7e9');box(x,81,3,49,msg.color);text(msg.title,W/2,98,12,msg.color);text(msg.detail,W/2,116,8,C.ink);ctx.globalAlpha=1;}
    const nearby=state.chasers.filter(c=>!c.leaving);if(nearby.length){const nearest=nearby.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);const gap=Math.round(Math.hypot(nearest.x-p.x,nearest.y-p.y)/PX_PER_M);const sp=screen(nearest.x,nearest.y);if(sp.y<75)text(`↑ ${nearest.kind==='dog'?'DOGS':nearest.kind==='patrol'?'PATROL':'YETI'}  ${gap} m`,W/2,153,10,C.red);}
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
    const r=canvas.getBoundingClientRect();H=clamp(Math.round(W*(r.height||840)/(r.width||480)),620,1120);canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;state.cam.y=state.p.y-H*.31/ZOOM;
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
  function frame(t) {const elapsed=lastTime?Math.min(.05,(t-lastTime)/1000):0;lastTime=t;if(!document.hidden){accumulator+=elapsed;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}render();}requestAnimationFrame(frame);}
  startMeadow();resize();state.liftRoutes.push({x0:400,x1:400,y0:-600,y1:Infinity});ensureWorld(true);
  const loaded=Promise.all(Object.entries(window.FROSTLINE_ASSETS).map(([key,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=reject;im.src=src;})));
  loaded.then(()=>{ready=true;render();requestAnimationFrame(frame);});
  // Kept out of the UI: deterministic hooks for simulation and renderer checks.
  window.Frostline={state,stages,atlas,loaded,step,render,startCourse,creditRun,makeVillage,hit,triggerAmbush,addChasers,startMoving,resize,launch,playerPose,keyboardDirection,releasePointer,ensureWorld,updateWildlife,die,resetSummit,patchAt,onRoad,entity,topSpeed,viewBounds,humanArea,lakeContains,get ready(){return ready;},get height(){return H;}};
})();
