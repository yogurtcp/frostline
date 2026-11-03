/* Museum: a slow, sideways glide past everything on the mountain, each with a note written in the snow.
   Exhibits are built with the game's own constructors and nothing is simulated while you visit, so they stand still.
   Wording lives in game-config.json `museum.exhibits`; this file only decides how each exhibit is staged. */
const MUSEUM_ORIGIN_Y=-30000,MUSEUM_ROW_GAP=600;
// Each stager places objects around (x,y), the exhibit's ground point. Ids without a stager become text-only plaques.
const MUSEUM_STAGERS={
  sleepingYeti:(x,y)=>museumItem('lurker',x,y,{width:55,r:18,yetiSpeedKmh:45,arcadeTier:'slow'}),
  yeti:(x,y)=>museumChaser({kind:'slow',arcadeTier:'slow',speed:120},x,y),
  fastYeti:(x,y)=>museumChaser({kind:'fast',arcadeTier:'fast',speed:220},x,y),
  stiltwalker:(x,y)=>museumChaser({kind:'fast',ravager:true,arcadeTier:'elite',speed:260},x,y),
  bear:(x,y)=>museumItem('bear',x,y,ARCADE_ITEMS.bear),
  wolves:(x,y)=>{for(let i=0;i<3;i++)museumItem('wolf',x-36+i*36,y+(i%2)*14,{...ARCADE_ITEMS.wolf,packId:1,packIndex:i});},
  werewolf:(x,y)=>{museumItem('personGreen',x-40,y,{width:30,r:10});museumItem('wolf',x+40,y,{width:52,r:12,werewolf:true,werewolfState:'wolf',animal:true});},
  zombie:(x,y)=>museumItem('zombie',x,y,{width:34,r:10,zombieRole:'wanderer',zombieState:'wandering',zombieStyle:1,awake:true}),
  skeleton:(x,y)=>museumItem('zombie',x,y,{width:32,r:10,zombieRole:'ambusher',zombieState:'resting',zombieStyle:2}),
  burrower:(x,y)=>museumItem('burrower',x,y,{width:36,r:9,burrowState:'open',openAt:-9}),
  smallAnimals:(x,y)=>{museumItem('rabbit',x-40,y,ARCADE_ITEMS.rabbit);museumItem('fox',x+30,y,ARCADE_ITEMS.fox);},
  cat:(x,y)=>museumItem('cat',x,y,ARCADE_ITEMS.cat),
  dog:(x,y)=>museumItem('dog',x,y,{...ARCADE_ITEMS.dog,roam:0}),
  villagers:(x,y)=>{museumItem('personRed',x-34,y,{width:30,r:10});museumItem('personYellow',x+34,y,{width:30,r:10});},
  skiers:(x,y)=>{museumItem('skier',x-34,y,{width:42,r:12});museumItem('boarder',x+34,y,{width:42,r:12});},
  fastSkier:(x,y)=>museumItem('skier',x,y,{width:44,r:12,fast:true}),
  trees:(x,y)=>{museumItem('pine',x-40,y,{...ARCADE_ITEMS.pine,treeVariant:'classic'});museumItem('fir',x+40,y+10,{...ARCADE_ITEMS.fir,treeVariant:'classic'});},
  rocks:(x,y)=>{museumItem('rock',x-40,y,ARCADE_ITEMS.rock);museumItem('stump',x+10,y+6,ARCADE_ITEMS.stump);museumItem('pebble',x+50,y-4,ARCADE_ITEMS.pebble);},
  softStuff:(x,y)=>{museumItem('bush',x-40,y,ARCADE_ITEMS.bush);museumItem('sled',x+30,y,ARCADE_ITEMS.sled);},
  snowman:(x,y)=>museumItem('snowman',x,y,{width:34,r:12}),
  fallingTree:(x,y)=>museumItem('fallingTree',x,y,{arcadeFeature:true}),
  rollingSnowball:(x,y)=>museumItem('rollingSnowball',x,y,{arcadeFeature:true}),
  logJump:(x,y)=>{const log=museumItem('wideLog',x,y+20,{arcadeFeature:true});log.width=260;log.bump.width=120;},
  ice:(x,y)=>museumItem('ice',x,y-30,{width:170,r:0,rx:85,ry:70}),
  rugged:(x,y)=>museumItem('rugged',x,y-20,{width:200,r:0,rx:100,ry:55}),
  hills:(x,y)=>{museumItem('smallHill',x-50,y,ARCADE_ITEMS.smallHill);museumItem('largeHill',x+40,y,ARCADE_ITEMS.largeHill);},
  ramps:(x,y)=>{museumItem('ramp',x-40,y,ARCADE_ITEMS.ramp);museumItem('mogul',x+40,y,ARCADE_ITEMS.mogul);},
  rainbow:(x,y)=>museumItem('rainbow',x,y,ARCADE_ITEMS.rainbow),
  mushroom:(x,y)=>museumItem('mushroom',x,y,ARCADE_ITEMS.mushroom),
  shieldGate:(x,y)=>museumItem('gate',x,y,{half:55,width:110,r:0,number:1,color:C.red,gear:'shield',checked:false}),
  swordGate:(x,y)=>museumItem('gate',x,y,{half:55,width:110,r:0,number:2,color:C.blue,gear:'sword',checked:false}),
  checkpoint:(x,y)=>museumItem('checkpoint',x,y,{r:0,half:100,width:200,taken:false,resume:{townName:'Museum'}}),
  chairlift:(x,y)=>{museumItem('lift',x,y,{width:174,r:0,half:73,used:false});state.liftRoutes.push({x0:x,x1:x,y0:y-420,y1:y});}
};
function museumItem(type,x,y,extra={}){const spec={...extra};delete spec.type;return entity(type,x,y,{...spec,museum:true});}
function museumChaser(c,x,y){const o={x,y,phase:0,talkAt:Infinity,expires:Infinity,gaitDistance:0,travelSpeed:0,...c,museum:true};state.chasers.push(o);return o;}
function museumLines(str,max){
  const words=String(str).split(/\s+/),lines=[''];
  for(const word of words){const i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
  return lines;
}
function startMuseum(gate){
  if(state.course||state.endless||state.arcade||state.museum)return false;
  const M=S.museum,perRow=M.exhibitsPerRow,spacing=M.spacing,width=(perRow-1)*spacing,list=M.exhibits;
  state.objects=state.objects.filter(o=>o.type==='entrance');state.chasers=[];state.speech=[];
  const exhibits=[],path=[];
  list.forEach((entry,i)=>{
    const row=Math.floor(i/perRow),col=i%perRow,dir=row%2?-1:1,x=dir*(col*spacing-width/2),rowY=MUSEUM_ORIGIN_Y+row*MUSEUM_ROW_GAP;
    const ground=rowY+M.exhibitDrop;MUSEUM_STAGERS[entry.id]?.(x,ground);
    exhibits.push({...entry,x,y:ground,lines:museumLines(entry.text,M.wrapCharacters)});
  });
  const rows=Math.ceil(list.length/perRow),edge=width/2+spacing*.6;
  for(let row=0;row<rows;row++){
    const dir=row%2?-1:1,y=MUSEUM_ORIGIN_Y+row*MUSEUM_ROW_GAP;
    path.push({x:-dir*edge,y},{x:dir*edge,y});
  }
  // Arc-length table so the glide keeps a steady, readable pace around the switchbacks.
  let total=0;const marks=[0];for(let i=1;i<path.length;i++){total+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);marks.push(total);}
  state.museum={exhibits,path,marks,total,distance:0};
  state.zone={kind:'museum',origin:MUSEUM_ORIGIN_Y};
  for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
  const p=state.p;Object.assign(p,{x:path[0].x,y:path[0].y,heading:Math.PI/2,desiredHeading:Math.PI/2,mode:'traverse',speed:0,vx:0,vy:0,air:0,fall:0,awaitingInput:false});
  state.cam={x:p.x,y:p.y-H*S.render.playerScreenY/ZOOM};state.started=true;
  announce('THE FROSTLINE MUSEUM','GLIDE PAST EVERYTHING - HOLD DOWN TO HURRY, UP TO LEAVE',C.teal,5);
  return true;
}
function museumPoint(d){
  const m=state.museum,path=m.path;let i=1;while(i<path.length-1&&m.marks[i]<d)i++;
  const a=path[i-1],b=path[i],t=clamp((d-m.marks[i-1])/(m.marks[i]-m.marks[i-1]||1),0,1);
  return {x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),dx:b.x-a.x,dy:b.y-a.y};
}
function updateMuseum(dt){
  const m=state.museum,p=state.p,M=S.museum;
  if(state.input.up){state.input.up=false;resetSummit();announce('THANKS FOR VISITING','THE MOUNTAIN IS BACK THIS WAY',C.teal,3);return;}
  const speed=M.glideMetresPerSecond*PX_PER_M*(state.input.down?M.hurryMultiplier:1);
  m.distance=Math.min(m.total,m.distance+speed*dt);
  const at=museumPoint(m.distance),len=Math.hypot(at.dx,at.dy)||1;
  p.vx=at.dx/len*speed;p.vy=at.dy/len*speed;p.x=at.x;p.y=at.y;p.speed=speed;
  p.heading=p.desiredHeading=Math.atan2(at.dx/len,at.dy/len);p.mode=Math.abs(at.dx)>Math.abs(at.dy)?'traverse':'slide';
  updateFeedback(dt);
  state.cam.x=ease(state.cam.x,p.x,S.render.cameraXFollow,dt);state.cam.y=ease(state.cam.y,p.y-H*S.render.playerScreenY/ZOOM,S.render.cameraYFollow,dt);
  if(m.distance>=m.total){resetSummit();announce('THANKS FOR VISITING','NOW GO MEET THEM FOR REAL',C.teal,3);}
}
function museumProgress(){
  const m=state.museum,passed=m.exhibits.filter(e=>Math.abs(e.y-state.p.y)<MUSEUM_ROW_GAP&&museumPassed(e)||e.y<state.p.y-MUSEUM_ROW_GAP/2).length;
  return Math.min(m.exhibits.length,passed)+' / '+m.exhibits.length+' EXHIBITS';
}
function museumPassed(e){const row=Math.round((e.y-S.museum.exhibitDrop-MUSEUM_ORIGIN_Y)/MUSEUM_ROW_GAP),dir=row%2?-1:1;return (state.p.x-e.x)*dir>=0;}
function drawMuseumNotes(){
  const m=state.museum;if(!m)return;
  for(const e of m.exhibits){
    const s=screen(e.x,e.y);if(s.x<-160||s.x>W+160||s.y<-80||s.y>H+80)continue;
    // Pressed into the snow: a pale highlight under darker blue lettering.
    const top=s.y+S.museum.textOffset*ZOOM;
    text(e.title,s.x+1,top+1,10,'#ffffff');text(e.title,s.x,top,10,C.teal);
    e.lines.forEach((line,i)=>{text(line,s.x+1,top+19+i*14+1,8,'#ffffff');text(line,s.x,top+19+i*14,8,'#5d6f93');});
  }
}
