/* Optional art-authoring step: NODE_PATH must expose playwright; CHROME_PATH can select Chrome.
   This samples generated art into game-sized frames. Normal build.py uses the committed PNG. */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'game-config.json')));
const sheets=JSON.parse(fs.readFileSync(path.join(root,'design/gritty/prompts.json'))).sheets;
const sources=Object.fromEntries(sheets.map(s=>['gritty'+s.key[0].toUpperCase()+s.key.slice(1),'data:image/png;base64,'+fs.readFileSync(path.join(root,s.file)).toString('base64')]));
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    const result=await page.evaluate(async({config,sources})=>{
      const images=Object.fromEntries(await Promise.all(Object.entries(sources).map(async([key,src])=>{const img=new Image();img.src=src;await img.decode();return [key,img];})));
      const entries=Object.entries(config.atlas).filter(([,a])=>a[0].startsWith('gritty'));
      if(entries.some(([,a])=>!images[a[0]]))throw Error('Run map-gritty-atlas.py before baking');
      const output=document.createElement('canvas');output.width=1024;output.height=Math.ceil(entries.length/8)*128;const t=output.getContext('2d');t.imageSmoothingEnabled=false;
      const palette=config.palette.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),frames={};
      for(const [i,[name,a]] of entries.entries()){
        const kind=a[0],w=kind==='grittyBuildings'?80:kind==='grittyTerrain'?42:kind==='grittyMonsters'?(name.startsWith('yeti')?30:name.startsWith('bear')?36:28):name.startsWith('person')?18:name==='dog'||name.startsWith('dog')?24:name==='fall'?28:Math.round(config.render.playerWidth*config.render.zoom);
        const h=Math.round(w*a[4]/a[3]),x=i%8*128,y=Math.floor(i/8)*128;
        if(h>128)throw Error('Frame too tall '+name);
        t.drawImage(images[a[0]],a[1],a[2],a[3],a[4],x,y,w,h);
        const pixels=t.getImageData(x,y,w,h),d=pixels.data;
        for(let p=0;p<d.length;p+=4){
          if(d[p+3]<config.render.spriteAlphaCutoff){d[p+3]=0;continue;}
          let nearest=palette[0],distance=Infinity;
          for(const c of palette){const n=(d[p]-c[0])**2+(d[p+1]-c[1])**2+(d[p+2]-c[2])**2;if(n<distance){distance=n;nearest=c;}}
          [d[p],d[p+1],d[p+2]]=nearest;d[p+3]=255;
        }
        t.putImageData(pixels,x,y);frames[name]=['gritty',x,y,w,h];
      }
      return {frames,png:output.toDataURL('image/png').split(',')[1]};
    },{config,sources});
    fs.writeFileSync(path.join(root,'assets/gritty-sprites.png'),Buffer.from(result.png,'base64'));
    Object.assign(config.atlas,result.frames);fs.writeFileSync(path.join(root,'game-config.json'),JSON.stringify(config,null,2)+'\n');
    fs.writeFileSync(path.join(root,'design/gritty/runtime-frames.json'),JSON.stringify(result.frames,null,2)+'\n');
    const icons=await page.evaluate(async svg=>{
      const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode();
      return [192,512,180].map(size=>{const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(image,0,0,size,size);return [size,c.toDataURL('image/png').split(',')[1]];});
    },fs.readFileSync(path.join(root,'assets/icon.svg'),'utf8'));
    for(const [size,png] of icons)fs.writeFileSync(path.join(root,'assets',size===180?'apple-touch-icon.png':'icon-'+size+'.png'),Buffer.from(png,'base64'));
    console.log('Baked '+Object.keys(result.frames).length+' frames into assets/gritty-sprites.png');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
