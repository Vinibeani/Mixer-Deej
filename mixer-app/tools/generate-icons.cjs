const fs = require('node:fs');
const path = require('node:path');
const solid = require('@fortawesome/free-solid-svg-icons');
const brands = require('@fortawesome/free-brands-svg-icons');
const {labelFor}=require('./icon-labels-pt.cjs');
const translations = {
  'volume-high':['Volume alto','volume som audio áudio alto falante alto-falante master geral speaker sound volume up'],
  'volume-low':['Volume baixo','volume som audio áudio alto falante speaker sound volume down'],
  'volume-off':['Volume desligado','volume som audio áudio desligado speaker off'],
  'volume-xmark':['Mudo','mudo silenciar mute volume sem som audio áudio'],
  'headphones':['Fones de ouvido','fone fones headset headphones audio áudio'],
  'headphones-simple':['Fones simples','fone fones headset ouvido audio áudio'],
  'microphone':['Microfone','microfone mic voz gravacao gravação audio áudio'],
  'microphone-slash':['Microfone mudo','microfone mic mute mudo silenciar'],
  'music':['Música','musica música nota music audio áudio'],
  'sliders':['Mixer','mixer mistura audio áudio volume canais controle'],
  'gamepad':['Jogos','jogo jogos videogame game controle joystick'],
  'desktop':['Computador','computador pc desktop monitor tela sistema'],
  'video':['Vídeo','video vídeo webcam camera câmera gravacao gravação'],
  'film':['Cinema','filme filmes cinema movie'],
  'play':['Reproduzir','reproduzir tocar play musica música'],
  'pause':['Pausar','pausa pausar pause musica música'],
  'stop':['Parar','parar stop musica música'],
  'headset':['Atendimento','headset fone fones microfone voz conversa chat'],
  'guitar':['Guitarra','guitarra instrumento música musica'],
  'drum':['Bateria','bateria instrumento música musica'],
  'bell':['Notificações','notificacoes notificações alerta sino som'],
  'phone':['Telefone','telefone ligacao ligação chamada voz'],
  'radio':['Rádio','radio rádio som audio áudio'],
  'podcast':['Podcast','podcast transmissão transmissao voz'],
  'computer':['PC','computador pc sistema'],
  'display':['Monitor','monitor tela sistema computador'],
  'gear':['Configurações','configuracao configurações settings engrenagem'],
};
const popular = ['brand-discord','volume-high','volume-low','volume-xmark','microphone','headphones','brand-spotify','brand-youtube','brand-twitch','brand-steam','brand-chrome','brand-windows','gamepad','sliders','music','headset','brand-xbox','brand-playstation','brand-firefox-browser','brand-edge','brand-soundcloud','video','podcast','desktop'];
const title = name => name.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');
const map = new Map();
for(const [pack,isBrand] of [[solid,false],[brands,true]]) for(const value of Object.values(pack)) {
  if(!value?.iconName||!Array.isArray(value.icon))continue;
  const name=(isBrand?'brand-':'')+value.iconName;
  const extra=translations[value.iconName];
  const category=isBrand?'apps':/volume|microphone|headphone|headset|music|guitar|drum|radio|podcast|ear-|record|sliders|speaker|compact-disc|play|pause|stop|forward|backward/.test(name)?'audio':/game|dice|chess|puzzle|dragon|ghost|trophy|medal|crosshairs/.test(name)?'games':'other';
  const label=isBrand?title(value.iconName):extra?.[0]||labelFor(value.iconName);
  const aliases=[...(value.icon[2]||[]).filter(x=>typeof x==='string'),extra?.[1]||'',isBrand?'aplicativo app programa marca brand':'',value.iconName==='chrome'?'google navegador browser':'',value.iconName==='discord'?'chat voz conversa comunicação comunicacao':''];
  map.set(name,{name,label,category,aliases,w:value.icon[0],h:value.icon[1],path:value.icon[4],popular:popular.indexOf(name)});
}
const result=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(path.join(__dirname,'../ui/icons.json'),JSON.stringify(result));
for(const [pack,file] of [['free-solid-svg-icons','ICON-LICENSE.txt'],['free-brands-svg-icons','BRAND-ICON-LICENSE.txt']])fs.copyFileSync(path.join(__dirname,`../node_modules/@fortawesome/${pack}/LICENSE.txt`),path.join(__dirname,'../ui',file));
console.log(JSON.stringify({total:result.length,brands:result.filter(x=>x.category==='apps').length,popular:result.filter(x=>x.popular>=0).length}));
