const integrationModel=window.RapicosturaIntegrationModel;
let receptionTab='clients',shippingModule=null;
function initUnifiedData(){RapicosturaBranches.migrate(state);if(Array.isArray(state.shipments))return;let legacy;try{legacy=JSON.parse(localStorage.getItem('rapicostura-prototype-v1')||'null')}catch{}integrationModel.importLegacy(state,legacy)}
initUnifiedData();
function availableShipmentWorks(){return state.repairs.filter(r=>integrationModel.canDispatchRepair(state,r,currentPerson,staffProfile(currentPerson).branch))}
function getShippingModule(){
  if(!shippingModule)shippingModule=window.createRapicosturaShipping({
    role:()=>currentPerson==='Dueña'?'admin':'worker',
    site:()=>Math.max(0,integrationModel.siteIndex(staffProfile(currentPerson).branch)),
    person:()=>currentPerson,
    sites:()=>RapicosturaBranches.sites,
    records:()=>state.shipments,
    persist:()=>integrationModel.persist(state,localStorage),
    availableWorks:availableShipmentWorks,
    workItems:ids=>state.repairs.filter(r=>ids.includes(r.id)),
    canViewLinked:ids=>ids.some(id=>holder(id)===currentPerson),
    validateLinks:(ids,origin)=>{const valid=availableShipmentWorks();return (currentPerson==='Dueña'||integrationModel.siteIndex(staffProfile(currentPerson).branch)===origin)&&ids.every(id=>valid.some(r=>r.id===id))},
    toast,scrollTop:scrollAppTop
  });
  return shippingModule;
}
function logisticsReady(){return currentPerson==='Dueña'||integrationModel.siteIndex(staffProfile(currentPerson).branch)>=0}
function chooseLogisticsSite(){chooseStaffBranch()}
let lastWorker=currentPerson==='Dueña'?'Rosa':currentPerson;
function chooseAppView(){modal('¿Qué vista quieres abrir?',`<p>Elige cómo quieres usar Rapicostura.</p><div class="help-options">${button('Trabajadora',"setAppView('worker')",currentPerson!=='Dueña','shirt')}${button('Dueña',"setAppView('owner')",currentPerson==='Dueña','team')}</div>`)}
function setAppView(view){
  if(!['worker','owner'].includes(view))return;
  if(currentPerson!=='Dueña')lastWorker=currentPerson;
  dialog.close();shippingModule?.close();selectedRepair=null;selectedGuide=null;repairFilter='pending';ownerDemo=false;ownerBranch='Todas';
  currentPerson=view==='owner'?'Dueña':lastWorker;page=view==='owner'?'overview':'inicio';
  try{localStorage.setItem('rapicostura-view',view)}catch{}
  const url=new URL(location.href);if(view==='owner')url.searchParams.set('vista','duena');else url.searchParams.delete('vista');url.searchParams.delete('seccion');url.searchParams.delete('recepcion');history.replaceState(null,'',url);
  render();scrollAppTop();
}
function showReception(tab='clients'){receptionTab=tab;page='reception';selectedRepair=null;render();scrollAppTop()}
function openClientIntake(){showReception('clients');receiveGarment()}
const beforeUnifiedReceiveGarment=receiveGarment;
receiveGarment=function(keep=false){
  if(!staffProfile(currentPerson).canReceive){toast('La dueña debe habilitarte para recibir prendas en el local.');return}
  shippingModule?.close();
  if(page!=='reception'||receptionTab!=='clients')showReception('clients');
  beforeUnifiedReceiveGarment(keep===true);
};
function showShipping(){page='shipping';selectedRepair=null;render();scrollAppTop()}
function createUnifiedShipment(id){if(!logisticsReady()){chooseLogisticsSite();return}if(page!=='shipping'||!main.querySelector('#shipping-module'))showShipping();getShippingModule().create(id?[id]:[])}
function viewWorkShipment(id){const r=state.repairs.find(r=>r.id===id);if(!r?.logistics)return;showShipping();getShippingModule().detail(r.logistics.shipmentId)}
function mountShipping(view){
  const target=main.querySelector('#shipping-slot');if(!target)return;
  if(!logisticsReady()){target.innerHTML=`<section class="profile-sheet"><h2>Primero elige tu local</h2><p>Así sabremos de dónde salen los paquetes y cuáles llegan para ti.</p>${button('Elegir mi local','chooseLogisticsSite()',true,'location')}</section>`;return}
  const module=getShippingModule();target.append(module.element);module.show(view);
}
function receptionHub(){
  return `<div class="greeting"><h1>Recepción</h1><p class="sub">¿Qué vas a recibir?</p></div><div class="reception-choices" role="group" aria-label="Tipo de recepción"><button aria-pressed="${receptionTab==='clients'}" class="${receptionTab==='clients'?'selected':''}" onclick="showReception('clients')">${icon('shirt')}<strong>Prenda de un cliente</strong><span>Registrar el arreglo que necesita.</span></button><button aria-pressed="${receptionTab==='packages'}" class="${receptionTab==='packages'?'selected':''}" onclick="showReception('packages')">${icon('box')}<strong>Paquete de otra sede</strong><span>Revisar y confirmar lo que llegó.</span></button></div>${receptionTab==='clients'?`<div class="reception-client-content">${qualityQueue()}${receptionPage()}</div>`:`${currentPerson==='Dueña'?'<p class="notice">Puedes consultar los envíos. La compañera de la sede de destino confirma la llegada.</p>':''}<div id="shipping-slot"></div>`}`;
}
function unifiedNav(){const owner=currentPerson==='Dueña';const links=owner?[['overview','home','Resumen',"ownerNavigate('overview')"],['reception','location','Recepción',"showReception('clients')"],['shipping','box','Envíos','showShipping()'],['members','team','Equipo',"ownerNavigate('members')"],['guides','play','Videos','openGuides()']]:[['inicio','orders','Trabajos',"navigate('inicio')"],['reception','location','Recepción',"showReception('clients')"],['shipping','box','Envíos','showShipping()'],['team','team','Compañeras',"navigate('team')"],['guides','play','Videos','openGuides()']];return links.map(([id,ico,label,action])=>`<button class="${page===id?'active':''}" ${page===id?'aria-current="page"':''} onclick="${action}">${icon(ico)}<span>${label}</span></button>`).join('')}
const beforeUnifiedRender=render,beforeUnifiedOwnerHome=ownerHome;
const beforeUnifiedCanReview=canReview;
canReview=function(r){if(r.logistics?.status==='transit')return false;if(r.logistics?.status==='received')return currentPerson!=='Dueña'&&staffProfile(currentPerson).canReceive&&staffProfile(currentPerson).branch===integrationModel.sites[r.logistics.destination];return beforeUnifiedCanReview(r)};
ownerHome=function(){initUnifiedData();const moving=state.shipments.filter(s=>s.status==='transit').length,received=state.shipments.filter(s=>s.status==='received').length;return beforeUnifiedOwnerHome()+`<section class="profile-sheet unified-logistics-summary"><h2>${icon('box')} Envíos del equipo</h2><p>${moving} en camino · ${received} recibidos</p>${button('Ver todos los envíos','showShipping()',true,'box')}</section>`};
render=function(){
  initUnifiedData();
  if(currentPerson!=='Dueña'){pauseChatbotPanel(true);if(page==='chatbot')page='inicio'}else if(page!=='chatbot')pauseChatbotPanel();
  if(shippingModule&&!['shipping','reception'].includes(page))shippingModule.close();
  if(['shipping','reception','chatbot'].includes(page)){
    // Estas vistas ya tienen su propio contenido; evita dibujar y borrar el inicio.
    initWorkScope();syncStaff();initBranches();
    if(guideObjectURL){URL.revokeObjectURL(guideObjectURL);guideObjectURL=null}
    const owner=currentPerson==='Dueña';
    document.body.classList.toggle('owner-view',owner);
    document.title=owner?'Rapicostura · Mi taller':'Rapicostura · Mi trabajo';
    document.querySelector('.account').innerHTML=owner?'<span class="avatar">D</span><span>Dueña<small>Mi taller</small></span>':`<button class="profile-open" onclick="openProfile()" aria-label="Abrir mi perfil"><span class="avatar">${esc(currentPerson[0])}</span><span>${esc(currentPerson)}<small>Mi perfil</small></span></button>`;
    phoneContext();
    if(!owner&&!knownBranch(staffProfile(currentPerson).branch))document.getElementById('phone-site').textContent='Elegir mi local';
  }else beforeUnifiedRender();
  if(page==='chatbot'){
    main.innerHTML=chatbotPage();mountChatbotPanel();
  }else if(page==='reception'){
    main.innerHTML=receptionHub()+personaControl();
    main.querySelector('.reception-client-content .greeting')?.remove();
    main.querySelector('.reception-client-content .back-link')?.remove();
    const intake=main.querySelector('.reception-client-content .reception-hero');
    if(intake)intake.innerHTML=`<h2>¿El cliente dejó su prenda?</h2><button onclick="receiveGarment()">${icon('plus')} Recibir prenda del cliente</button>`;
    if(receptionTab==='packages')mountShipping('reception');
  }else if(page==='shipping'){
    main.innerHTML=`<div class="greeting"><h1>${currentPerson==='Dueña'?'Envíos del equipo':'Envíos'}</h1><p class="sub">Envía materiales o prendas a otra sede.</p></div>${logisticsReady()?button('Registrar envío','createUnifiedShipment()',true,'plus'):''}<div id="shipping-slot"></div>`;
    mountShipping('shipments');
  }else if(page==='inicio'&&!selectedRepair&&currentPerson!=='Dueña'){
    main.querySelector('.greeting')?.insertAdjacentHTML('afterend',`<button class="reception-main-shortcut" onclick="showReception('clients')">${icon('location')}<span><strong>Recepción</strong><small>Registrar prendas o recibir paquetes</small></span><b>›</b></button>`);
  }
  if(selectedRepair&&currentPerson!=='Dueña'){
    const r=selected(),body=main.querySelector('.task-body');
    if(r&&body){
      if(r.logistics){const label=r.logistics.status==='transit'?'En camino a ':'Recibida en ';body.insertAdjacentHTML('beforeend',`<section class="work-shipment-info"><h3>Entrega de esta prenda</h3><p>${label}${esc(integrationModel.sites[r.logistics.destination])}</p>${button('Ver su envío',`viewWorkShipment('${r.id}')`,false,'box')}</section>`)}
      if(availableShipmentWorks().some(w=>w.id===r.id))body.insertAdjacentHTML('beforeend',button('Enviar esta prenda a otra sede',`createUnifiedShipment('${r.id}')`,false,'box'));
    }
  }
  document.getElementById('mobile-nav').innerHTML=unifiedNav();
  if(page==='chatbot'){const nav=document.getElementById('mobile-nav').querySelectorAll('button')[3];nav.classList.add('active');nav.setAttribute('aria-current','page')}
  if(currentPerson==='Dueña'&&['members','overview','inicio'].includes(page))main.querySelector('.owner-heading')?.insertAdjacentHTML('afterend',chatbotShortcut());
  const role=document.getElementById('phone-role');
  if(role.tagName!=='BUTTON')role.outerHTML='<button id="phone-role" type="button" onclick="chooseAppView()"></button>';
  const roleButton=document.getElementById('phone-role');roleButton.textContent=(currentPerson==='Dueña'?'Dueña':'Trabajadora')+' ▾';roleButton.setAttribute('aria-label','Cambiar vista: '+(currentPerson==='Dueña'?'Dueña':'Trabajadora'));
  document.getElementById('phone-caption').textContent='Rapicostura · Trabajos, recepción y envíos en una app';
};
// Los enlaces existentes siguen abriendo recepción y la vista de la dueña.
if(!new URLSearchParams(location.search).has('vista')){try{if(localStorage.getItem('rapicostura-view')==='owner'){currentPerson='Dueña';if(page==='inicio')page='overview'}}catch{}}
if(new URLSearchParams(location.search).get('seccion')==='envios')page='shipping';
if(new URLSearchParams(location.search).get('seccion')==='chatbot'&&currentPerson==='Dueña')page='chatbot';
if(new URLSearchParams(location.search).get('recepcion')==='paquetes'){page='reception';receptionTab='packages'}
render();


