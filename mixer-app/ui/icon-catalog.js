(function(root, factory) {
  const catalog=factory();if(typeof module==='object'&&module.exports)module.exports=catalog;else root.IconCatalog=catalog;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function search(icons,query='',category='popular',recent=[]) {
    const words=normalize(query).split(' ').filter(Boolean);
    return icons.map(icon=>{
      if(!words.length&&category==='popular'&&icon.popular<0)return null;
      if(category==='recent'&&!recent.includes(icon.name))return null;
      if(!['popular','all','recent'].includes(category)&&icon.category!==category)return null;
      const label=normalize(icon.label),name=normalize(icon.name),text=normalize([icon.label,icon.name,...icon.aliases].join(' '));
      if(!words.every(w=>text.includes(w)))return null;
      const exact=words.length&&[label,name].includes(words.join(' '));
      const score=exact?0:words.length&&words.every(w=>label.includes(w)||name.includes(w))?1:2;
      return {icon,score};
    }).filter(Boolean).sort((a,b)=>a.score-b.score||(category==='recent'?recent.indexOf(a.icon.name)-recent.indexOf(b.icon.name):((a.icon.popular<0?999:a.icon.popular)-(b.icon.popular<0?999:b.icon.popular)))||a.icon.label.localeCompare(b.icon.label,'pt-BR')).map(x=>x.icon);
  }
  function selection(channel,version,known) {
    const explicit=version===1||channel.labelMode==='icon';
    return explicit&&typeof channel.symbol==='string'&&known.has(channel.symbol)?channel.symbol:null;
  }
  return {normalize,search,selection};
});
