const path=require('node:path');
const rcedit=require('rcedit');
module.exports=async context=>{
  if(context.electronPlatformName!=='win32')return;
  const info=context.packager.appInfo;
  await rcedit(path.join(context.appOutDir,info.productFilename+'.exe'),{
    icon:path.join(__dirname,'../assets/icon.ico'),
    'version-string':{ProductName:'Mixer de Áudio',FileDescription:'Mixer de Áudio',CompanyName:'',InternalName:'Mixer de Áudio'},
    'file-version':info.version,
    'product-version':info.version
  });
};
