/* Option 4: world-anchored snow, native pixel shadows and shared alpine materials. */
const gritSnowTiles=new Map(),gritShadowTiles=new Map(),gritHillTiles=new Map(),gritTreeTiles=new Map();
const GRIT_MATERIALS={'#142c40':'#111c2c','#244451':'#202b43','#375769':'#344663','#548091':'#60739b','#79a5b4':'#8ea3ce','#9ec9d3':'#bbcbeb','#c7e0e4':'#dce7fa','#e5f0ee':'#e8efff','#f8faf0':'#f7faff','#0c5058':'#0d292d','#1b7379':'#193e3d','#399799':'#2e564b','#65b3b0':'#51765c','#b0794c':'#bf8954','#714a37':'#714534','#463735':'#4b322e','#d39b61':'#d4a267','#f2c98f':'#f5d29c','#9b403e':'#74303d','#cc5655':'#b8444b','#ee8275':'#e46b57','#403959':'#302d49','#70557d':'#58456c','#987bb1':'#8a78a1','#d3becd':'#b5a4c6','#dfe8e5':'#dce7fa','#a9bcbe':'#adbfdd','#b9c9c8':'#bbcae4','#78858a':'#7888a4','#526672':'#51617f','#44545f':'#344159','#b9c7c5':'#becbe1','#a9b7bb':'#acbbd2','#6c7e89':'#526582','#bbc9bf':'#bdcce1','#d2ddd2':'#d9e3f3','#edf3ed':'#f1f6ff','#e4ebe4':'#e4edfc','#dbe6df':'#dce7fa','#dce6df':'#dce7fa'};
Object.assign(GRIT_MATERIALS,{'#a4b4b4':'#aab9d4','#5c6c79':'#455371','#829592':'#6e80a1','#8fa19e':'#8598b9','#637983':'#526886','#c1ccc5':'#c5d2e8','#dfe7dc':'#e2ebfb','#687b85':'#5d7194','#60747b':'#516582','#233c45':'#1c293f','#647a80':'#586b8b'});
function gritMaterial(color){return GRIT_MATERIALS[color]||color;}
function gritTextureNative(t,x,y,w,h,stone=false){
  const pixels=t.getImageData(x,y,w,h),d=pixels.data;
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){
    const i=(row*w+col)*4;if(d[i+3]<220)continue;
    const n=gritHash(col,row),bright=Math.max(d[i],d[i+1],d[i+2]);if(bright>235)continue;
    const neutral=bright-Math.min(d[i],d[i+1],d[i+2])<45;
    if(stone&&neutral){d[i]=Math.max(0,d[i]-7);d[i+2]=Math.min(255,d[i+2]+13);}
    if((n&15)>2)continue;const delta=(n&1)?9:-10;
    for(let c=0;c<3;c++)d[i+c]=clamp(d[i+c]+delta,0,255);
  }
  t.putImageData(pixels,x,y);
}
const GRIT_TREES=new Set(['pine','fir','smallPine','spruceTree','crookedTree','cedarTree','alpineTree']);
const GRIT_BUILDINGS=new Set(['lodge','rental','bakeryFacade','cocoaFacade','toyFacade','lift']);
function gritHash(x,y){let n=(Math.imul(x+93,374761393)^Math.imul(y+571,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
function gritSnowTile(index){
  let tile=gritSnowTiles.get(index);if(tile)return tile;
  tile=document.createElement('canvas');tile.width=tile.height=256;const t=tile.getContext('2d');
  const px=(x,y,w,h,c)=>{t.fillStyle=c;t.fillRect(x,y,w,h);};
  for(let i=0;i<5;i++){
    const n=gritHash(index+19,i),cx=30+n%190,cy=20+(n>>>8)%210,rx=14+(n>>>16)%17,ry=5+(n>>>23)%7;
    for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){
      const d=x*x/(rx*rx)+y*y/(ry*ry),grain=gritHash(x+i*37,y+index*11);
      if(d<1&&(grain&7)<(1-d)*5)px(cx+x,cy+y+Math.floor(x*.3),1,1,(grain&15)===0?'#b6c8e8':'#d1def3');
    }
  }
  // Small broken wind ridges, with quiet stretches between them. No simulation RNG is used.
  for(let i=0;i<34;i++){
    const n=gritHash(index,i),x=8+n%213,y=8+(n>>>9)%235,length=8+(n>>>17)%30;
    for(let j=0;j<length;j++){
      const yy=y+Math.floor(j*.25)+Math.floor(Math.sin(j*.22+i)*2);
      if((gritHash(i,j+index)&7)>1)px(x+j,yy,1,1,'#d6e1f6');
      if(j>3&&j<length-3&&(j+i)%3)px(x+j,yy-1,1,1,'#fcfdff');
      if((j+i)%7===0)px(x+j+1,yy+1,1,1,'#bdcdec');
    }
  }
  for(let i=0;i<100;i++){
    const n=gritHash(index+67,i),x=n%256,y=(n>>>11)%256;
    px(x,y,1,1,i%5?'#dce6f8':'#c8d6ef');if(i%6===0)px(x+1,y-1,1,1,'#fcfdff');
  }
  gritSnowTiles.set(index,tile);return tile;
}
function drawGritSnow(){
  const left=state.cam.x*ZOOM-W/2,top=state.cam.y*ZOOM,size=256;
  ctx.save();ctx.globalAlpha=1-(state.nightBlend||0)*.6;
  for(let ty=Math.floor(top/size);ty*size<top+H;ty++)for(let tx=Math.floor(left/size);tx*size<left+W;tx++){
    ctx.drawImage(gritSnowTile(gritHash(tx,ty)%16),Math.round(tx*size-left),Math.round(ty*size-top));
  }
  ctx.restore();
}
function gritCastShadowTile(name,width,height){
  const tree=GRIT_TREES.has(name),house=GRIT_BUILDINGS.has(name),rock=name==='rock'||name==='pebble'||name==='stump';
  if(!tree&&!house&&!rock)return;
  const w=Math.round(width),h=Math.max(4,Math.round(height*(tree?.42:house?.12:.22))),key=(tree?'tree':house?'house':'rock')+w+':'+h;
  let tile=gritShadowTiles.get(key);
  if(!tile){
    tile=document.createElement('canvas');tile.width=Math.ceil(w*1.55+8);tile.height=h+6;const t=tile.getContext('2d');
    if(house){
      t.fillStyle='rgba(91,112,151,.24)';t.beginPath();t.moveTo(w*.08,1);t.lineTo(w*.87,1);t.lineTo(w*1.08,h*.62);t.lineTo(w*.28,h*.85);t.closePath();t.fill();
      t.fillStyle='rgba(69,91,128,.12)';t.fillRect(Math.round(w*.14),1,Math.round(w*.68),2);
      if(gritShadowTiles.size>=128)gritShadowTiles.delete(gritShadowTiles.keys().next().value);gritShadowTiles.set(key,tile);return tile;
    }
    t.save();t.beginPath();
    if(tree){t.moveTo(w*.24,2);t.lineTo(w*.65,0);t.lineTo(w*1.45,h*.72);t.lineTo(w*.9,h);}
    else{t.moveTo(2,2);t.lineTo(w,0);t.lineTo(w*1.45,h*.72);t.lineTo(w*.42,h);}
    t.closePath();t.clip();
    for(let row=0;row<tile.height;row++)for(let col=0;col<tile.width;col++){
      const edge=row>h*.75,n=gritHash(col,row);if(edge&&(n&3)===0)continue;
      t.fillStyle=(n&7)===0?'#a7bce2':'#b9caeb';t.fillRect(col,row,1,1);
    }
    t.restore();if(gritShadowTiles.size>=128)gritShadowTiles.delete(gritShadowTiles.keys().next().value);gritShadowTiles.set(key,tile);
  }
  return tile;
}
function drawGritCastShadow(name,x,y,width,height){
  const tile=gritCastShadowTile(name,width,height);if(!tile)return;
  const w=Math.round(width),alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*.72;ctx.drawImage(tile,Math.round(x-w*.48),Math.round(y-2));ctx.globalAlpha=alpha;
}
function drawCachedGritTree(key,name,source,x,y,w,h){
  let cached=gritTreeTiles.get(key);
  if(!cached){
    const shade=gritCastShadowTile(name,w,h),sx=Math.round(-w*.48),sy=-2,bx=Math.round(-w/2),by=-h,left=Math.min(sx,bx),top=Math.min(sy,by),right=Math.max(sx+shade.width,bx+w),bottom=Math.max(sy+shade.height,0);
    const tile=document.createElement('canvas');tile.width=right-left;tile.height=bottom-top;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;t.globalAlpha=.72;t.drawImage(shade,sx-left,sy-top);t.globalAlpha=1;t.drawImage(source,bx-left,by-top);
    cached={tile,left,top};if(gritTreeTiles.size>=192)gritTreeTiles.delete(gritTreeTiles.keys().next().value);gritTreeTiles.set(key,cached);
  }
  ctx.drawImage(cached.tile,x+cached.left,y+cached.top);
}
function gritClothing(rgb,target){
  const shade=clamp((rgb[0]+rgb[1]+rgb[2])/310,.55,1.3);return target.map(v=>Math.min(255,Math.round(v*shade)));
}
function grittyHillTile(big,ratio){
  const key=big+':'+ratio;let tile=gritHillTiles.get(key);if(tile)return tile;
  tile=document.createElement('canvas');tile.width=big?64:48;tile.height=Math.max(12,Math.round(tile.width*ratio));
  const t=tile.getContext('2d'),w=tile.width,h=tile.height,points=[[1,h*.76],[w*.14,h*.48],[w*.38,h*.2],[w*.6,h*.12],[w*.8,h*.39],[w-2,h*.72],[w*.72,h*.91],[w*.25,h*.94]];
  t.beginPath();points.forEach(([x,y],i)=>i?t.lineTo(Math.round(x),Math.round(y)):t.moveTo(Math.round(x),Math.round(y)));t.closePath();t.fillStyle='#d8e3f7';t.fill();t.save();t.clip();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const ridge=h*(.21+Math.abs(x/w-.47)*.45),n=gritHash(x,y);
    t.fillStyle=y<ridge+2?'#fcfdff':y>h*.73?'#a8bcdf':x>w*.6?'#c0cfee':'#edf3ff';
    if((n&15)===0&&y>ridge+2)t.fillStyle='#b4c6e8';t.fillRect(x,y,1,1);
  }
  t.restore();gritHillTiles.set(key,tile);return tile;
}
const yetiRigs=new Map(),yetiStrideTiles=new Map();
function yetiRig(family,tier){
  const key=family+':'+tier;let rig=yetiRigs.get(key);if(rig)return rig;
  const name='yeti'+family+'Idle',cacheKey=name+':30:yeti'+tier;
  if(!spriteCache.has(cacheKey)){ctx.save();ctx.translate(-10000,-10000);sprite(name,0,0,30,{ui:true,yetiTier:tier});ctx.restore();}
  const source=spriteCache.get(cacheKey),body=document.createElement('canvas');body.width=30;body.height=34;
  const t=body.getContext('2d');t.drawImage(source,0,0,30,34);
  t.clearRect(0,26,30,8);t.clearRect(0,14,10,20);t.clearRect(23,15,7,19);
  const legRects=family==='White'?[[6,24,10,10],[16,24,11,10]]:family==='Avalanche'?[[0,25,10,9],[10,25,13,9]]:[[0,25,10,9],[11,25,12,9]];
  const part=(rect,leg=false)=>{
    const [x,y,w,h]=rect,tile=document.createElement('canvas');tile.width=w;tile.height=h;const p=tile.getContext('2d');p.drawImage(source,x,y,w,h,0,0,w,h);
    let used=h;if(leg){const a=p.getImageData(0,0,w,h).data;while(used>1&&!a.slice((used-1)*w*4,used*w*4).some((v,i)=>i%4===3&&v))used--;}
    return {tile,x,y,w,h,used};
  };
  rig={body,legs:legRects.map(r=>part(r,true)),arms:[part([0,12,11,16]),part([23,14,7,14])]};yetiRigs.set(key,rig);return rig;
}
function yetiStrideTile(family,tier,frame){
  const key=family+':'+tier+':'+frame;let tile=yetiStrideTiles.get(key);if(tile)return tile;
  const rig=yetiRig(family,tier),phase=frame/8*TAU;tile=document.createElement('canvas');tile.width=34;tile.height=36;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const limb=(part,a,leg=false)=>{
    const swing=Math.sin(a),lift=leg?Math.round(Math.max(0,Math.cos(a))*2):0;
    for(let row=0;row<part.h;row++){
      const sourceRow=leg?Math.min(part.used-1,Math.floor(row*part.used/part.h)):row;
      const dx=Math.round(swing*row*(leg?.2:.18));
      t.drawImage(part.tile,0,sourceRow,part.w,1,part.x+2+dx,part.y+row-lift,part.w,1);
    }
  };
  limb(rig.arms[1],phase);limb(rig.legs[1],phase+Math.PI,true);limb(rig.legs[0],phase,true);
  t.drawImage(rig.body,2,0);limb(rig.arms[0],phase+Math.PI);
  if(yetiStrideTiles.size>=64)yetiStrideTiles.delete(yetiStrideTiles.keys().next().value);yetiStrideTiles.set(key,tile);return tile;
}
function yetiLocomotion(o,pose){
  const gait=o.yetiGait??={x:o.x,y:o.y,time:clock,phase:((o.phase||0)/TAU)%1,active:false,flip:false};
  const dt=clock-gait.time,distance=Math.hypot(o.x-gait.x,o.y-gait.y),vx=o.motionVx||0;
  if(dt>0){
    gait.active=pose==='run'&&distance>.01;
    if(gait.active){const scale=endlessSpeedScale(o),speed=distance/dt,stride=mix(75,150,clamp(speed/(420*scale),0,1))*scale;gait.phase=(gait.phase+distance/stride)%1;}
    gait.x=o.x;gait.y=o.y;gait.time=clock;
  }
  if(pose!=='run')gait.active=false;
  if(vx<-25)gait.flip=true;else if(vx>25)gait.flip=false;
  return gait;
}
function drawYetiStride(o,s,family,tier,width,gait){
  const tile=yetiStrideTile(family,tier,Math.floor(gait.phase*8)%8),scale=width*ZOOM/30,w=Math.round(34*scale),h=Math.round(36*scale),top=-Math.round(34*scale);
  if(gait.flip){ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y));ctx.scale(-1,1);ctx.drawImage(tile,-Math.round(w/2),top,w,h);ctx.restore();}
  else ctx.drawImage(tile,Math.round(s.x)-Math.round(w/2),Math.round(s.y)+top,w,h);
}

const dogWalkTiles=new Map();
function dogWalkTile(frame){
  if(dogWalkTiles.has(frame))return dogWalkTiles.get(frame);
  const key='dogRight:24';if(!spriteCache.has(key))sprite('dogRight',-10000,-10000,24,{ui:true});
  const source=spriteCache.get(key),tile=document.createElement('canvas');tile.width=26;tile.height=28;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(source,1,1);
  if(frame<8){
    const phase=frame/8*TAU;
    const feet=[[2,15,5,7],[8,17,4,7],[12,20,7,6]];
    // Clear all original feet first so a swinging neighbour cannot erase another leg.
    for(const [x,y,w,h] of feet)t.clearRect(x+1,y+1,w,h);
    for(const [i,[x,y,w,h]] of feet.entries()){
      const swing=Math.sin(phase+(i===1?0:Math.PI)),lift=Math.round(Math.max(0,Math.cos(phase+(i===1?0:Math.PI)))*2);
      for(let row=0;row<h;row++)t.drawImage(source,x,y+row,w,1,x+1+Math.round(swing*row*.34),y+row+1-lift,w,1);
    }
  }
  dogWalkTiles.set(frame,tile);return tile;
}
function drawDog(o,s,width=o.width||39){
  const gait=o.dogGait??={x:o.x,y:o.y,time:clock,phase:0,active:false,flip:false},dt=clock-gait.time,dx=o.x-gait.x,dy=o.y-gait.y;
  if(dt>0){const distance=Math.hypot(dx,dy);gait.active=distance>.01;if(gait.active){gait.phase=(gait.phase+distance/Math.max(28,width*1.3))%1;if(dx/dt<-12)gait.flip=true;else if(dx/dt>12)gait.flip=false;}gait.x=o.x;gait.y=o.y;gait.time=clock;}
  const tile=dogWalkTile(gait.active?Math.floor(gait.phase*8):8),w=Math.round(width*ZOOM*26/24),h=Math.round(w*28/26),hop=o.hopUntil>clock?Math.sin((1-(o.hopUntil-clock)/1.2)*Math.PI)*7:0;
  shadow(s.x,s.y,11,3,.1);ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y-hop));if(gait.flip)ctx.scale(-1,1);ctx.drawImage(tile,-Math.round(w/2),-h+1,w,h);ctx.restore();
  if(o.dogTreatAt!==undefined&&clock-o.dogTreatAt<.7){
    const t=clamp((clock-o.dogTreatAt)/.45,0,1),from=screen(o.dogTreatFrom.x,o.dogTreatFrom.y),x=mix(from.x,s.x,t),y=mix(from.y,s.y-10,t)-Math.sin(t*Math.PI)*15;
    if(t<1){box(x-2,y-2,4,3,'#9b403e');box(x+1,y-3,2,2,'#f2c98f');}
    else{box(s.x-2,s.y-29,2,3,'#cc5655');box(s.x+1,s.y-29,2,3,'#cc5655');box(s.x-1,s.y-27,3,2,'#cc5655');}
  }
  if(o.barkAt!==undefined&&clock-o.barkAt<.8){const r=5+(clock-o.barkAt)*19,side=o.retreatAngle&&Math.cos(o.retreatAngle)<0?-1:1;for(const dy of [-3,0,3])box(s.x+side*r,s.y-12+dy,2,1,'#dba45a');}
}

// Native articulated residents: the coat/head never swap shape between poses.
const personMotionTiles=new Map();
function personMotionTile(type,action,frame){
  const key=type+':'+action+':'+frame;if(personMotionTiles.has(key))return personMotionTiles.get(key);
  const a=atlas[type],source=document.createElement('canvas');source.width=a[3];source.height=a[4];const src=source.getContext('2d');src.drawImage(images[a[0]],a[1],a[2],a[3],a[4],0,0,a[3],a[4]);
  const tile=document.createElement('canvas');tile.width=a[3]+8;tile.height=a[4]+5;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
  const w=a[3],h=a[4],phase=frame/8*TAU,walking=action==='walk',legY=h-7,armY=9,armH=h-15;
  t.drawImage(source,4,3);t.clearRect(4,legY+3,w,7);t.clearRect(4,armY+3,4,armH);t.clearRect(w,armY+3,4,armH);
  for(const side of [0,1]){
    const swing=walking?Math.sin(phase+side*Math.PI):0,lift=walking?Math.round(Math.max(0,Math.cos(phase+side*Math.PI))*2):0,x=side?10:4;
    for(let y=0;y<7;y++)t.drawImage(source,x,legY+y,5,1,x+4+Math.round(swing*y*.28),legY+y+3-lift,5,1);
  }
  const limb=(x,y,xx,yy,width,color)=>{t.fillStyle=color;const steps=Math.max(Math.abs(xx-x),Math.abs(yy-y),1);for(let i=0;i<=steps;i++)t.fillRect(Math.round(mix(x,xx,i/steps))-Math.floor(width/2),Math.round(mix(y,yy,i/steps))-Math.floor(width/2),width,width);};
  for(const side of [0,1]){
    const dir=side?1:-1,x=4+(side?w-4:3),y=3+armY+1;
    let upper=walking?Math.sin(phase+side*Math.PI)*.25:0,lower=upper;
    if(side&&action==='wave'){upper=1.1+Math.cos(phase)*.3;lower=2.4+Math.sin(phase)*.5;}
    if(side&&action==='chat'){upper=.7+Math.cos(phase)*.2;lower=1.2+Math.sin(phase)*.4;}
    if(side&&action==='serve'){upper=1+Math.cos(phase)*.2;lower=1.5+Math.sin(phase)*.3;}
    if(action==='cheer'){upper=2+Math.sin(phase)*.3;lower=2.6+Math.cos(phase)*.3;}
    const ex=x+dir*Math.sin(upper)*3.5,ey=y+Math.cos(upper)*3.5,hx=ex+dir*Math.sin(lower)*3,hy=ey+Math.cos(lower)*3;
    limb(x,y,ex,ey,4,'#202b43');limb(ex,ey,hx,hy,3,'#202b43');limb(x,y,ex,ey,2,'#a53b4c');limb(ex,ey,hx,hy,2,'#b8444b');t.fillStyle='#e6b784';t.fillRect(Math.round(hx)-1,Math.round(hy),2,2);
  }
  if(personMotionTiles.size>=144)personMotionTiles.delete(personMotionTiles.keys().next().value);personMotionTiles.set(key,tile);return tile;
}
function drawPerson(o,s){
  const action=o.cheerUntil>clock?'cheer':o.serveUntil>clock?'serve':o.waveUntil>clock||o.throwUntil>clock?'wave':o.chatUntil>clock?'chat':o.walking?'walk':'idle';
  const phase=action==='walk'?(o.walkCycle||0)/TAU:action==='idle'?0:clock*.9+(o.phase||0)/TAU,frame=action==='idle'?0:Math.floor(phase*8)%8;
  const tile=personMotionTile(o.type,action,frame),scale=o.width*ZOOM/atlas[o.type][3],w=Math.round(tile.width*scale),h=Math.round(tile.height*scale),flip=action==='serve'?state.p.x<o.x:action==='chat'&&o.chatPartner?o.chatPartner.x<o.x:o.walkFacing<0;
  ctx.save();ctx.translate(s.x,s.y);if(flip)ctx.scale(-1,1);ctx.drawImage(tile,-Math.round(w/2),-h+2,w,h);ctx.restore();
  if(o.socialUntil>clock&&o.socialAnimal){const side=Math.sign(o.socialAnimal.x-o.x)||1;line(s.x+side*3,s.y-9,s.x+side*7,s.y-8-Math.round(Math.sin(clock*5)), '#d8af83',2);if(o.socialAnimal.type==='rabbit')box(s.x+side*8,s.y-7,3,2,'#be965e');}
  if(o.job==='bakery'||o.job==='market')box(s.x+(flip?-5:2),s.y-10,4,3,'#e9dfc8');
}
