// Prioriza el trabajo del día. Las herramientas de demostración se abren por URL.
const beforeSimpleRender=render,beforeSimplePersona=personaControl;
const demoMode=new URLSearchParams(location.search).get('modo')==='demo';
personaControl=function(){return demoMode?beforeSimplePersona():''};

function workCard(r){
  const action={pending:'Toca para ver qué debes hacer',working:'Toca para continuar o terminar',review:'Tu trabajo está esperando revisión',ready:'Ya revisaron tu trabajo',delivered:'Ya entregaron la prenda al cliente'}[r.stage];
  return `<button class="repair-card easy-work-card" onclick="openRepair('${r.id}')" aria-label="Ver trabajo: ${esc(r.garment)}"><span class="easy-card-top">${garmentArt(r)}<span><strong>${esc(r.garment)}</strong><span>${esc(r.task)}</span></span><span class="easy-chevron" aria-hidden="true">›</span></span><span class="easy-card-date">${icon('calendar')} Para ${esc(workDue(r))}</span><span class="easy-card-state">${esc(repairLabels[r.stage])}</span><span class="easy-card-action">${action}</span></button>`;
}
function workFilters(all){
  if(!all.length)return '';
  return `<div class="section-label easy-section"><h2>Mis prendas</h2></div><div class="repair-tabs easy-tabs" role="group" aria-label="Ver trabajos por estado">${[['pending','Por hacer'],['working','Haciendo'],['ready','Listos']].map(([key,label])=>`<button class="${repairFilter===key?'selected':''}" aria-pressed="${repairFilter===key}" onclick="setRepairFilter('${key}')">${label}<span>${all.filter(r=>group(r)===key).length}</span></button>`).join('')}</div>`;
}
repairList=function(){
  const all=myRepairs(),rows=all.filter(r=>group(r)===repairFilter);
  return `<div class="greeting easy-greeting"><p class="eyebrow">Hola, ${esc(currentPerson)}</p><h1>Mis trabajos</h1><p class="sub">${all.length?'Toca una prenda para ver qué tienes que hacer.':'Aquí verás los trabajos que tienes por hacer.'}</p></div>${incomingBanner()}${workFilters(all)}<div class="repair-list">${rows.map(workCard).join('')||`<section class="panel easy-empty"><span class="easy-empty-icon">${icon('check')}</span><h2>${all.length?'No tienes prendas en esta lista':'Por ahora no tienes trabajos'}</h2><p>${all.length?'Puedes mirar las otras listas de arriba.':staffProfile(currentPerson).canReceive?'Cuando un cliente deje una prenda, entra a Recepción para registrarla.':'Cuando una compañera te pida ayuda, podrás responder en “Compañeras”.'}</p>${!all.length?button(staffProfile(currentPerson).canReceive?'Registrar prenda de un cliente':'Ver a mis compañeras',staffProfile(currentPerson).canReceive?"openClientIntake()":"navigate('team')",true,staffProfile(currentPerson).canReceive?'plus':'team'):''}</section>`}</div><details class="easy-how"><summary>${icon('help')} ¿Cómo uso esta pantalla?</summary><ol><li>Toca una prenda y lee lo que hay que hacer.</li><li>Cuando estés lista, toca “Empezar este trabajo”.</li><li>Al acabar, toca “Terminé este trabajo”.</li></ol><p>Si tienes una dificultad, toca “Necesito ayuda”.</p></details>`;
};
colleagueSummary=function(name){const p=staffProfile(name);return `<strong>${esc(name)}</strong><p>${esc(p.availability==='Por confirmar'?'Pregúntale si puede ayudarte.':p.availability)}</p><details><summary>Ver qué sabe hacer</summary><p>${esc(p.skills.join(' · ')||'Todavía no indicó sus habilidades.')}</p><p>${esc(p.mode)}${p.schedule?' · '+esc(p.schedule):''}</p></details>`};
supportStatus=function(a){if(a.status==='pending')return a.to===currentPerson?'Te está pidiendo ayuda':a.to+' todavía debe responder';if(a.status==='accepted')return a.to===currentPerson?'Aceptaste este trabajo':a.to+' aceptó ayudarte';return a.status==='declined'?'Esta vez no pudo ayudarte':a.status==='cancelled'?'Solicitud cancelada':'Por revisar'};
repairDetail=function(){
  const r=selected();if(!r)return repairList();
  const agreement=workAgreement(r);
  const action=r.stage==='pending'?button('Empezar este trabajo','startRepair()',true,'shirt'):r.stage==='working'?button('Terminé este trabajo','finishRepair()',true,'check'):`<div class="notice">${r.stage==='review'?'Ya terminaste. Ahora falta que revisen tu trabajo.':r.stage==='ready'?'Tu trabajo ya está revisado y listo para el cliente.':'Ya entregaron esta prenda al cliente.'}</div>`;
  return `<button class="back-link" onclick="goBack()">← Volver a mis trabajos</button><div class="greeting"><p class="eyebrow">Cliente: ${esc(r.client)} · ${r.id}</p><h1>${esc(r.garment)}</h1><span class="easy-card-state">${esc(repairLabels[r.stage])}</span></div><section class="task-card"><div class="task-body"><div class="easy-instruction"><span>Qué tienes que hacer</span><h2>${esc(r.task)}</h2><p>${esc(r.instructions||'Si tienes dudas, toca Necesito ayuda.')}</p></div><div class="easy-deadline">${icon('calendar')}<span>Fecha para terminar<strong>${esc(workDue(r))}</strong></span></div><div class="worker-actions">${action}</div>${r.stage!=='delivered'?button('Necesito ayuda','help()',false,'help'):''}${r.issue?`<div class="notice"><strong>Tu aviso</strong><p>${esc(r.issue)}</p></div>`:''}<details class="easy-extra"><summary>Más datos de esta prenda</summary><p>Local del cliente: ${esc(responsibleBranch(r))}</p><p>Hace el arreglo: ${esc(holder(r.id))}</p>${agreement?'<p>Pago acordado por tu ayuda: '+repairMoney(agreement.payment)+'</p>':''}</details></div></section>`;
};
help=function(){const r=selected();modal('¿Qué ayuda necesitas?',`<p>Elige lo que te está pasando.</p><div class="help-options">${r&&['pending','working'].includes(r.stage)?button('Que una compañera me ayude',`dialog.close();composeSupport('${r.id}')`,false,'team'):''}${['No entiendo cómo hacer el arreglo','Me falta un material','Tengo un problema con la máquina','Necesito más tiempo'].map(reason=>button(reason,`helpConfirm('${reason}')`,false,'help')).join('')}</div>`)};
render=function(){
  beforeSimpleRender();
  const worker=currentPerson!=='Dueña';
  if(worker&&page==='inicio'&&!selectedRepair){main.querySelector('.complete-profile')?.remove();main.querySelector('.receive-new')?.remove()}
  if(worker&&page==='profile')main.insertAdjacentHTML('beforeend','<details class="easy-trial"><summary>Acerca de esta prueba</summary><p>Esta es una versión de prueba. Lo que registres queda en este celular o navegador. Las compañeras todavía no lo reciben en sus celulares.</p></details>');
  if(worker&&selectedRepair){
    // Pedir a una compañera y avisar dificultades están reunidos en un solo acceso.
    for(const button of main.querySelectorAll('button[onclick^="composeSupport("]'))button.remove();
  }
  for(const button of document.getElementById('mobile-nav').querySelectorAll('button')){
    const label=button.querySelector('span');
    if(label?.textContent==='Apoyos')label.textContent='Compañeras';
    if(label?.textContent==='Guías')label.textContent='Videos';
    if(button.classList.contains('active'))button.setAttribute('aria-current','page');
  }
  for(const note of main.querySelectorAll('.local-note,.owner-local-note')){
    if(!/prototipo|navegador|demostraci|no se comparten/i.test(note.textContent))continue;
    const details=document.createElement('details');details.className='easy-trial';
    const summary=document.createElement('summary');summary.textContent='Información de esta prueba';
    note.before(details);details.append(summary,note);
  }
  const site=document.getElementById('phone-site');
  if(worker&&!knownBranch(staffProfile(currentPerson).branch))site.textContent='Elegir mi local';
};
render();

