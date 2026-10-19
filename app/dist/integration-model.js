(function(root){
  const catalog=typeof module==='object'&&module.exports?require('./branch-catalog.js'):root.RapicosturaBranches;
  const sites=catalog.sites;
  function siteIndex(name){const direct=sites.indexOf(catalog.normalize(name));if(direct>=0)return direct;if(['Dolores','Av. Dolores'].includes(name))return 0;return -1}
  function importLegacy(state,legacy){if(!Array.isArray(state.shipments)){state.shipments=Array.isArray(legacy?.records)?legacy.records.filter(r=>sites[r.origin]&&sites[r.destination]&&r.origin!==r.destination&&['transit','received'].includes(r.status)):[]}return state.shipments}
  function canDispatchRepair(state,r,person,branch){
    if(!r||r.stage==='delivered'||state.shipments.some(s=>s.status==='transit'&&s.repairIds?.includes(r.id)))return false;
    if(person!=='Dueña'&&r.logistics?.status==='received'&&r.logistics.destination!==siteIndex(branch))return false;
    return person==='Dueña'||r.responsible===person||r.receivedBy===person&&siteIndex(r.responsibleBranch||r.branch)===siteIndex(branch)&&siteIndex(branch)>=0;
  }
  function applyLocations(state){for(const r of state.repairs){const latest=state.shipments.filter(s=>s.repairIds?.includes(r.id)).sort((a,b)=>Date.parse(b.registeredAt||b.createdAt)-Date.parse(a.registeredAt||a.createdAt))[0];if(!latest)continue;r.logistics={shipmentId:latest.id,status:latest.status,origin:latest.origin,destination:latest.destination};r.currentLocation=latest.status==='received'?{type:'branch',branch:sites[latest.destination],at:Date.parse(latest.confirmedAt||latest.receivedAt)}:{type:'transit',destination:sites[latest.destination],at:Date.parse(latest.registeredAt||latest.createdAt)}}}
  function persist(state,storage){const before=state.repairs.map(r=>({r,logistics:r.logistics,currentLocation:r.currentLocation}));applyLocations(state);try{storage.setItem('hilando-v1',JSON.stringify(state));return true}catch{for(const old of before){if(old.logistics===undefined)delete old.r.logistics;else old.r.logistics=old.logistics;if(old.currentLocation===undefined)delete old.r.currentLocation;else old.r.currentLocation=old.currentLocation}return false}}
  const model={sites,siteIndex,importLegacy,canDispatchRepair,applyLocations,persist};
  if(typeof module==='object'&&module.exports)module.exports=model;else root.RapicosturaIntegrationModel=model;
})(typeof globalThis!=='undefined'?globalThis:this);
