/* Museum: a marked trail on the ordinary slope below the summit MUSEUM gate. It zigzags across the hill at a
   shallow angle, so you ski mostly sideways past every exhibit and can read the note written on the snow under it.
   You ski it normally. Exhibits are statues: built with the game's own constructors so they look exactly like the
   real thing, then kept out of the simulation, so nothing moves, hunts or collides. Wording lives in
   game-config.json `museum.exhibits`; this file only decides how each exhibit is staged. */
// Each stager places objects around (x,y), the exhibit's ground point. Ids without a stager become text-only notes.
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
  chairlift:(x,y)=>{museumItem('lift',x,y,{width:174,r:0,half:73,used:false});state.liftRoutes.push({x0:x,x1:x,y0:y-420,y1:y,museum:true});}
};
let museumStatues=null;
function museumItem(type,x,y,extra={}){const spec={...extra};delete spec.type;return entity(type,x,y,{...spec,museum:true});}
function museumChaser(c,x,y){const o={x,y,phase:0,talkAt:Infinity,expires:Infinity,gaitDistance:0,travelSpeed:0,...c,museum:true};museumStatues.push(o);return o;}
function museumLines(str,max){
  const words=String(str).split(/\s+/),lines=[''];
  for(const word of words){const i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
  return lines;
}
// The trail: shallow switchbacks starting below the gate, away from the summit trail row.
function museumTrail(gate){
  const M=S.museum,list=M.exhibits,legs=Math.ceil(list.length/M.exhibitsPerLeg),points=[{x:gate.x,y:gate.y+40}];
  let dir=-1;for(let i=0;i<legs;i++){const last=points.at(-1);points.push({x:last.x+dir*M.legWidth,y:last.y+M.legDrop});dir=-dir;}
  return points;
}
function museumArea(x,y,pad=0){
  const m=state.museum;if(!m||y<m.top-200-pad||y>m.bottom+600+pad)return false;
  for(let i=1;i<m.trail.length;i++)if(segmentDistance(x,y,m.trail[i-1],m.trail[i])<S.museum.clearanceWidth+pad)return true;
  return false;
}
function startMuseum(gate){
  if(state.course||state.endless||state.arcade||state.museum)return false;
  const M=S.museum,trail=museumTrail(gate),exhibits=[];
  const keep=new Set(state.objects);museumStatues=[];
  M.exhibits.forEach((entry,i)=>{
    const leg=Math.floor(i/M.exhibitsPerLeg),slot=i%M.exhibitsPerLeg,a=trail[leg],b=trail[leg+1],t=(slot+.6)/(M.exhibitsPerLeg+.2);
    const x=mix(a.x,b.x,t),y=mix(a.y,b.y,t)+M.exhibitDrop;MUSEUM_STAGERS[entry.id]?.(x,y);
    exhibits.push({...entry,x,y,lines:museumLines(entry.text,M.wrapCharacters)});
  });
  // Exhibits leave the simulation entirely: drawn like the real thing, but they never move, hunt or collide.
  for(const o of state.objects)if(!keep.has(o))museumStatues.push(o);
  state.objects=state.objects.filter(o=>keep.has(o));
  state.museum={exhibits,statues:museumStatues,trail,top:trail[0].y,bottom:trail.at(-1).y,road:{surface:'snow',width:M.trailWidth,points:trail.map(p=>({...p})),museum:true}};
  museumStatues=null;state.roads.push(state.museum.road);
  // Keep the trail clear of the summit forest and anything already standing in it.
  state.objects=state.objects.filter(o=>o.type==='entrance'||!museumArea(o.x,o.y,o.type==='ice'?Math.max(o.rx||0,o.ry||0):0));
  state.zone={kind:'museum',origin:gate.y};
  for(const o of state.objects)if(o.type==='entrance')o.selected=o===gate;
  announce('THE FROSTLINE MUSEUM','FOLLOW THE TRAIL ACROSS THE SLOPE',C.teal,4);
  return true;
}
function updateMuseum(){
  const m=state.museum,p=state.p;if(!m||state.zone.kind!=='museum')return;
  // Ski past the last exhibit and the mountain carries on as ordinary free skiing.
  if(p.y>m.bottom+250){state.zone={kind:'start',origin:0};announce('MUSEUM EXIT','THE MOUNTAIN IS ALL YOURS',C.teal,3);}
}
function museumProgress(){
  const m=state.museum;return m.exhibits.filter(e=>e.y-S.museum.exhibitDrop<state.p.y+40).length+' / '+m.exhibits.length+' EXHIBITS';
}
function museumStatuesInView(top,bottom){return state.museum?state.museum.statues.filter(o=>o.y>top&&o.y<bottom&&Math.abs(o.x-state.cam.x)<W/(2*ZOOM)+300):[];}
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
