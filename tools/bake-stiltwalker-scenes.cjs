/* Optional authoring step; normal builds use the committed PNGs. Requires sharp. */
const path=require('path'),sharp=require('sharp'),root=path.resolve(__dirname,'..');
(async()=>{
  for(const time of ['day','night']){
    const file='death-yeti-stiltwalker'+(time==='night'?'-night':'')+'.png';
    await sharp(path.join(root,'design/scenes/stiltwalker-'+time+'-source.png'))
      .resize(320,200,{fit:'fill',kernel:'nearest'})
      .png({palette:true,colours:64,dither:0}).toFile(path.join(root,'assets/scenes',file));
    console.log(file+' — 320x200, 64-color palette');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
