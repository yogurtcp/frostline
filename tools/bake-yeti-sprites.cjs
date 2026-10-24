/* Optional art-authoring step: npm package @napi-rs/canvas is needed only to rebake.
   Normal build.py and the game use the committed tiny PNG, without Node dependencies. */
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'game-config.json')));
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const spriteCode=source.slice(source.indexOf('  function sprite('),source.indexOf('  function shadow('));
const palette=config.palette.map(color=>[1,3,5].map(at=>parseInt(color.slice(at,at+2),16)));
const images={},atlas={},cache=new Map(),document={createElement:()=>createCanvas(1,1)};
const sprite=new Function('S','images','atlas','spriteCache','paletteRGB','document','ctx','ZOOM',spriteCode+';return sprite;')(config,images,atlas,cache,palette,document,createCanvas(1,1).getContext('2d'),config.render.zoom);
const designs=[
 {id:'white',source:'white-fang',rects:[[24,47,603,697],[651,57,588,719],[1265,57,590,722]]},
 {id:'avalanche',source:'avalanche',rects:[[8,16,674,679],[702,22,643,716],[1365,26,673,712]]},
 {id:'stalker',source:'night-stalker',rects:[[39,101,552,684],[623,97,533,730],[1220,97,522,718]]}
];
(async()=>{
 const output=createCanvas(270,34),ctx=output.getContext('2d');ctx.imageSmoothingEnabled=false;
 const frames={};
 for(let design=0;design<designs.length;design++){
  const entry=designs[design];images[entry.id]=await loadImage(path.join(root,'design','yeti-'+entry.source+'.png'));
  for(let frame=0;frame<3;frame++){
   const rect=entry.rects[frame],name='yeti'+entry.id[0].toUpperCase()+entry.id.slice(1)+['Idle','RunL','RunR'][frame];
   atlas[name]=[entry.id,...rect];const worldWidth=Math.min(60,68*rect[2]/rect[3]);
   sprite(name,0,0,worldWidth,{height:68});
   const tile=cache.get(name+':'+Math.round(worldWidth*config.render.zoom)+':height34');
   const x=(design*3+frame)*30;ctx.drawImage(tile,x+Math.round((30-tile.width)/2),34-tile.height);
   frames[name]=['yetis',x,0,30,34];
  }
 }
 fs.writeFileSync(path.join(root,'assets','yeti-sprites.png'),output.toBuffer('image/png'));
 fs.writeFileSync(path.join(root,'assets','yeti-sprites.frames.json'),JSON.stringify(frames,null,2)+'\n');
 console.log('Baked 9 game-size Yeti poses into 270x34 pixels.');
})().catch(error=>{console.error(error);process.exitCode=1;});
