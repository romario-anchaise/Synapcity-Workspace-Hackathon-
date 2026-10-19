(function(root){
  const oldSites=['José Luis Bustamante y Rivero (Av. Dolores)','José Luis Bustamante y Rivero (Siglo XX)','Cerro Colorado','Yanahuara','Cayma','Avelino Cáceres'];
  // Nombres del selector del chatbot; se mantienen los índices históricos de los envíos.
  const siglo='Siglo XX · José Luis Bustamante y Rivero';
  const dolores='Dolores · José Luis Bustamante y Rivero';
  const sites=[dolores,siglo,...oldSites.slice(2,5)];
  function normalize(name){if(typeof name!=='string')return name;const value=name.trim();if(['José Luis Bustamante y Rivero (Siglo XX)','Siglo XX','Avelino Cáceres','Avelino Cáceres (Siglo XX)',siglo].includes(value))return siglo;if(['José Luis Bustamante y Rivero (Av. Dolores)','Av. Dolores','Dolores',dolores].includes(value))return dolores;return value}
  function extend(names){for(const name of names||[]){if(typeof name!=='string')continue;const value=normalize(name);if(value&&!['Por confirmar','Sin sede'].includes(value)&&!sites.includes(value))sites.push(value)}return sites}
  function migrate(state){
    const previous=state.branchCatalog||oldSites;
    extend(previous);
    if(state.branchCatalogVersion>=3)return false;
    for(const p of Object.values(state.staffProfiles||{}))extend([p.branch]);
    for(const r of state.repairs||[])extend([r.branch,r.responsibleBranch,r.currentLocation?.branch,r.currentLocation?.destination]);
    const index=value=>Number.isInteger(value)&&previous[value]?sites.indexOf(normalize(previous[value])):value;
    for(const s of state.shipments||[]){s.origin=index(s.origin);s.destination=index(s.destination)}
    for(const p of Object.values(state.staffProfiles||{}))if(p.branch)p.branch=normalize(p.branch);
    for(const r of state.repairs||[]){
      if(r.branch)r.branch=normalize(r.branch);if(r.responsibleBranch)r.responsibleBranch=normalize(r.responsibleBranch);
      if(r.currentLocation){if(r.currentLocation.branch)r.currentLocation.branch=normalize(r.currentLocation.branch);if(r.currentLocation.destination)r.currentLocation.destination=normalize(r.currentLocation.destination)}
      if(r.logistics){r.logistics.origin=index(r.logistics.origin);r.logistics.destination=index(r.logistics.destination)}
    }
    state.branchCatalog=[...sites];state.branchCatalogVersion=3;return true;
  }
  const catalog={sites,extend,normalize,migrate};
  if(typeof module==='object'&&module.exports)module.exports=catalog;else root.RapicosturaBranches=catalog;
})(typeof globalThis!=='undefined'?globalThis:this);

