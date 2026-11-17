/* Optional authoring tool. Retains generated originals; normal builds use committed exports.
   NODE_PATH must expose playwright and sharp. --jobs PATH selects a batch; --only NAME limits it. */
const fs=require('fs'),path=require('path'),sharp=require('sharp'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),option=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
let browser;
// Sharp's PNG palette bit depths jump from16 to256 colours. Quantize to the
// requested number first so a64-colour card is actually64 colours, not just8-bit.
async function scenePalette(png,count){
  const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const histogram=new Map();
  for(let i=0;i<data.length;i+=3){const key=(data[i]<<16)|(data[i+1]<<8)|data[i+2];histogram.set(key,(histogram.get(key)||0)+1);}
  const makeBox=colors=>{const lo=[255,255,255],hi=[0,0,0];let population=0;for(const v of colors){population+=v[3];for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}}const ranges=hi.map((v,k)=>v-lo[k]),axis=ranges.indexOf(Math.max(...ranges));return {colors,population,axis,score:ranges[axis]*Math.sqrt(population)};};
  const boxes=[makeBox([...histogram].map(([k,n])=>[k>>16,(k>>8)&255,k&255,n]))];
  while(boxes.length<count){boxes.sort((a,b)=>b.score-a.score);const index=boxes.findIndex(b=>b.colors.length>1);if(index<0)break;const box=boxes.splice(index,1)[0];box.colors.sort((a,b)=>a[box.axis]-b[box.axis]);let total=0,split=1;for(let i=0;i<box.colors.length-1;i++){total+=box.colors[i][3];split=i+1;if(total>=box.population/2)break;}boxes.push(makeBox(box.colors.slice(0,split)),makeBox(box.colors.slice(split)));}
  const palette=boxes.map(b=>[0,1,2].map(k=>Math.round(b.colors.reduce((v,c)=>v+c[k]*c[3],0)/b.population))),cache=new Map();
  for(let i=0;i<data.length;i+=3){const key=(data[i]<<16)|(data[i+1]<<8)|data[i+2];let best=cache.get(key);if(!best){let distance=Infinity;for(const c of palette){const d=(c[0]-data[i])**2+(c[1]-data[i+1])**2+(c[2]-data[i+2])**2;if(d<distance){distance=d;best=c;}}cache.set(key,best);}for(let k=0;k<3;k++)data[i+k]=best[k];}
  return sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).png({palette:true,colours:count,dither:0}).toBuffer();
}
(async()=>{
  const jobs=JSON.parse(fs.readFileSync(path.join(root,option('--jobs')||'design/creatures/generation-jobs.json')));
  const config=JSON.parse(fs.readFileSync(path.join(root,'game-config.json')));
  browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:true});
  const page=await browser.newPage();
  for(const j of jobs){
    if(option('--only')&&j.name!==option('--only'))continue;
    const dir=path.join(root,j.directory),source=path.join(dir,'source.png');
    if(!fs.existsSync(source)){console.log('Pending '+j.name);continue;}
    const result=await page.evaluate(async({j,src,palette})=>{
      const im=new Image();im.src=src;await im.decode();
      const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
      const t=c.getContext('2d');t.drawImage(im,0,0);
      const raw=t.getImageData(0,0,c.width,c.height).data,native=document.createElement('canvas');
      if(j.category==='scene'){
        native.width=j.targetWidth;native.height=j.targetHeight;
        const n=native.getContext('2d');n.imageSmoothingEnabled=false;
        const ratio=native.width/native.height,sw=Math.min(im.width,im.height*ratio),sh=sw/ratio;
        n.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,0,0,native.width,native.height);
        return {png:native.toDataURL().split(',')[1],sourceSize:[im.width,im.height],width:native.width,height:native.height,frames:[]};
      }
      const crops=[];
      for(let i=0;i<j.poses.length;i++){
        if(j.sourceRects?.[i]){crops.push(j.sourceRects[i]);continue;}
        const l=Math.round(i%j.columns*c.width/j.columns),r=Math.round((i%j.columns+1)*c.width/j.columns);
        const top=j.sourceRowEdges?Math.round(j.sourceRowEdges[Math.floor(i/j.columns)]*c.height/1024):Math.round(Math.floor(i/j.columns)*c.height/j.rows);
        const b=j.sourceRowEdges?Math.round(j.sourceRowEdges[Math.floor(i/j.columns)+1]*c.height/1024):Math.round((Math.floor(i/j.columns)+1)*c.height/j.rows);
        let x0=r,y0=b,x1=-1,y1=-1;
        for(let y=top;y<b;y++)for(let x=l;x<r;x++)if(raw[(y*c.width+x)*4+3]>(j.alphaMode==='preserve'?24:210)){
          x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
        }
        if(x1<x0)throw Error('Empty frame '+j.name+':'+i);
        crops.push([x0,y0,x1-x0+1,y1-y0+1]);
      }
      const cw=Math.ceil((j.targetWidth+16)/8)*8,ch=Math.ceil((j.targetHeight+16)/8)*8;
      const globalScale=Math.min(j.targetWidth/Math.max(...crops.map(f=>f[2])),j.targetHeight/Math.max(...crops.map(f=>f[3])));
      native.width=cw*j.columns;native.height=ch*j.rows;
      const n=native.getContext('2d');n.imageSmoothingEnabled=false;
      const frames=crops.map((f,i)=>{
        const target=j.frameTargets?.[i],tile=j.tileFrames?.includes(i);
        const sc=target?Math.min(target[0]/f[2],target[1]/f[3]):j.frameWidths?.[i]?Math.min(j.frameWidths[i]/f[2],j.targetHeight/f[3]):globalScale;
        const w=tile?target[0]:Math.max(1,Math.round(f[2]*sc)),h=tile?target[1]:Math.max(1,Math.round(f[3]*sc));
        const x=i%j.columns*cw,y=Math.floor(i/j.columns)*ch,dx=Math.floor((cw-w)/2),dy=ch-8-h;
        n.drawImage(im,...f,x+dx,y+dy,w,h);
        return {name:j.poses[i],x,y,w:cw,h:ch,bodyBounds:[dx,dy,w,h],anchor:[cw/2,ch-8],source:f,...(tile?{repeatAxis:'y',tileRect:[x+dx,y+dy,w,h]}:{})};
      });
      const pix=n.getImageData(0,0,native.width,native.height),p=pix.data;
      const pal=palette.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
      for(let i=0;i<p.length;i+=4){
        if(p[i+3]<(j.alphaMode==='preserve'?16:210)){p[i+3]=0;continue;}
        let best=pal[0],d=Infinity;
        for(const v of pal){const ds=(p[i]-v[0])**2+(p[i+1]-v[1])**2+(p[i+2]-v[2])**2;if(ds<d){d=ds;best=v;}}
        p[i]=best[0];p[i+1]=best[1];p[i+2]=best[2];if(j.alphaMode!=='preserve')p[i+3]=255;
      }
      // Native tiles repeat their body rectangle, never transparent atlas gutters.
      // Make opposite edge pixels identical; preserve the generated interior texture.
      for(const f of frames)if(f.repeatAxis==='y'){
        const [x,y,w,h]=f.tileRect;
        for(let xx=0;xx<w;xx++){
          const a=(y*native.width+x+xx)*4,b=((y+h-1)*native.width+x+xx)*4;
          for(let k=0;k<4;k++)p[b+k]=p[a+k];
        }
      }
      n.putImageData(pix,0,0);
      return {png:native.toDataURL().split(',')[1],sourceSize:[im.width,im.height],width:native.width,height:native.height,cellWidth:cw,cellHeight:ch,alphaMode:j.alphaMode,animationGroups:j.animationGroups||[],frames};
    },{j,src:'data:image/png;base64,'+fs.readFileSync(source).toString('base64'),palette:config.palette});
    let png=Buffer.from(result.png,'base64');delete result.png;
    if(j.category==='scene'&&j.colors){png=await scenePalette(png,j.colors);result.colors=j.colors;}
    fs.writeFileSync(path.join(dir,'native.png'),png);
    fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify(result,null,2)+'\n');
    console.log(j.name+' '+result.width+'x'+result.height+' '+result.frames.length+' frames');
  }
  await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
