/* Optional authoring step; generated source PNGs/prompts stay in design/. Requires sharp. */
const path=require('path'),fs=require('fs'),sharp=require('sharp'),root=path.resolve(__dirname,'..');
(async()=>{
  const source=path.join(root,'design/werewolf-v2/source.png'),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=96){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const crop={left,top,width:right-left+1,height:bottom-top+1};
  await sharp(source).extract(crop).resize(32,40,{fit:'contain',background:'#00000000',kernel:'nearest'}).png({palette:true,colours:64,dither:0}).toFile(path.join(root,'assets/werewolf.png'));
  fs.writeFileSync(path.join(root,'design/werewolf-v2/native.json'),JSON.stringify({crop,width:32,height:40,colors:64},null,2)+'\n');
  for(const kind of ['werewolf','burrower'])for(const time of ['day','night']){
    const file='death-'+kind+(time==='night'?'-night':'')+'.png';
    await sharp(path.join(root,'design/scenes/encounter-enemies/'+kind+'-'+time+'-source.png')).resize(320,200,{fit:'fill',kernel:'nearest'}).png({palette:true,colours:64,dither:0}).toFile(path.join(root,'assets/scenes',file));
    console.log(file+' — 320x200, 64 colors');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
