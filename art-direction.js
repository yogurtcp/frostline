/* Option 4: world-anchored snow, native pixel shadows and shared alpine materials. */
const gritSnowTiles=new Map(),gritShadowTiles=new Map(),gritHillTiles=new Map();
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
function drawGritCastShadow(name,x,y,width,height){
  const tree=GRIT_TREES.has(name),house=GRIT_BUILDINGS.has(name),rock=name==='rock'||name==='pebble'||name==='stump';
  if(!tree&&!house&&!rock)return;
  const w=Math.round(width),h=Math.max(4,Math.round(height*(tree?.42:house?.24:.22))),key=(tree?'tree':house?'house':'rock')+w+':'+h;
  let tile=gritShadowTiles.get(key);
  if(!tile){
    tile=document.createElement('canvas');tile.width=Math.ceil(w*1.55+8);tile.height=h+6;const t=tile.getContext('2d');
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
  ctx.save();ctx.globalAlpha*=.72;ctx.drawImage(tile,Math.round(x-w*.48),Math.round(y-2));ctx.restore();
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
