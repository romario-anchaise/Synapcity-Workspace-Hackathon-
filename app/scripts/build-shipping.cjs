// Adapta el módulo del ZIP a la app compartida, sin ejecutar su página independiente.
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..'),source=path.join(base,'references/companion');
let js=fs.readFileSync(path.join(source,'app.js'),'utf8');
function span(start,end,text){const a=js.indexOf(start),b=js.indexOf(end,a);if(a<0||b<0)throw Error('No se encontró el bloque '+start);js=js.slice(0,a)+text+js.slice(b)}
js=js.replaceAll('root = document','root = scope');
js=js.replace(/^const SITES = .*;$/m,'const SITES = host.sites();');
js=js.replace(/^const SHORT = .*;$/m,"function shortSite(index){return SITES[index]}");
js=js.replaceAll('SHORT[state.site]','shortSite(state.site)').replaceAll('SHORT[record.origin]','shortSite(record.origin)').replaceAll('SHORT[record.destination]','shortSite(record.destination)');
span('function seed()','const PROFILES',`const state={get role(){return host.role()},get site(){return host.site()},get records(){return host.records()}};\nconst PROFILES`);
js=js.replace('const PROFILESconst PROFILES','const PROFILES');
js=js.replace(/^const PROFILES = .*;$/m,"function siteProfile(index){return {id:'sede-'+index,site:index,name:'Costurera · '+SITES[index],initials:(SITES[index]||'Sede').split(' ').slice(0,2).map(s=>s[0]).join('')}}");
js=js.replaceAll('PROFILES[state.site]','siteProfile(state.site)').replaceAll('PROFILES[origin]','siteProfile(origin)');
span('function persist()','function db()',`function persist(){return host.persist()}\nfunction toast(message){host.toast(message)}\n`);
span('function settings()','function destinationOptions','');
span("$$('[data-tab]')", "function updateClock()", '');
js=js.slice(0,js.indexOf('function updateClock()'));
js=js.replace('returnFocus=document.activeElement','returnFocus=scope.activeElement||document.activeElement');
js=js.replaceAll('Tu equipo ya puede ver este envío como finalizado.','El envío quedó guardado como recibido.');
js=js.replace('Este paso finaliza el proceso para todo el equipo.','Este paso confirma la llegada del paquete. El arreglo y su calidad se revisan por separado.');
js=js.replace('✓ Recepción confirmada · Proceso finalizado','✓ Paquete recibido · Envío finalizado');
js=js.replaceAll('Finalizados','Recibidos').replaceAll('Finalizado','Recibido');
js=js.replace('Confirmar recepción y finalizar ✓','Confirmar llegada ✓');
js=js.replace('<span class="field-label">Evidencia del envío</span>',`<span class="field-label">Prendas del paquete</span><div class="detail-note">\${host.workItems(record.repairIds||[]).map(r=>canReceive?'<label class="work-link"><input type="checkbox" name="receipt-item"><span>'+escapeHTML(r.garment)+'<small>'+escapeHTML(r.id)+' · '+escapeHTML(r.task)+'</small></span></label>':'<p>'+escapeHTML(r.garment)+' · '+escapeHTML(r.id)+'</p>').join('')||'Materiales o encargo sin prenda asociada.'}</div><span class="field-label">Evidencia del envío</span>`);
js=js.replace('let receivedAt;try{',()=>`if($$('input[name="receipt-item"]',sheet).some(i=>!i.checked)){$('#form-error').textContent='Marca cada prenda que llegó. Si falta alguna, anótalo y consulta antes de confirmar.';return;}let receivedAt;try{`);
js=js.replace("record.origin===state.site||record.destination===state.site;}","record.origin===state.site||record.destination===state.site||host.canViewLinked(record.repairIds||[]);}");
js=js.replace('Datos de demostración · guardado en este navegador','Versión de prueba · datos guardados en este navegador');
js=js.replace('function newShipment(){','function newShipment(repairIds=[]){');
js=js.replaceAll("draft={type:'',media:null}","draft={type:'',media:null,repairIds:[...repairIds]}");
js=js.replace('<div id="evidence-preview"></div>','<button type="button" class="gallery-button" id="outgoing-gallery">Elegir foto o video de la galería</button><div id="evidence-preview"></div>');
js=js.replace('<label for="description">Descripción','<div id="linked-work" hidden></div><label for="description">Descripción');
js=js.replace("$('#upload').onclick=()=>openCamera('outgoing');",`$('#upload').onclick=()=>openCamera('outgoing');
 $('#outgoing-gallery').onclick=()=>{evidenceTarget='outgoing';chooseGallery()};
 function updateWorkLinks(){const panel=$('#linked-work');panel.hidden=draft.type!=='work';if(panel.hidden)return;const works=host.availableWorks();panel.innerHTML='<span class="field-label">¿Qué prendas van en este paquete?</span>'+works.map(r=>'<label class="work-link"><input type="checkbox" name="shipment-repair" value="'+escapeHTML(r.id)+'" '+(draft.repairIds.includes(r.id)?'checked':'')+'><span>'+escapeHTML(r.garment)+'<small>'+escapeHTML(r.task)+' · '+escapeHTML(r.id)+'</small></span></label>').join('')+(works.length?'':'<p>Primero registra la prenda en Recepción → Prenda de un cliente.</p>');}
`);
js=js.replace("draft.type=b.dataset.type;", "draft.type=b.dataset.type;updateWorkLinks();");
js=js.replace("$('#shipment-form').onsubmit=saveShipment;", "$('#shipment-form').onsubmit=saveShipment;if(repairIds.length)$('[data-type=work]').click();");
js=js.replace("const submit=$('[type=submit]',sheet);",()=>`const repairIds=draft.type==='work'?$$('input[name="shipment-repair"]:checked',sheet).map(i=>i.value):[];
 if(draft.type==='work'&&(!repairIds.length||!host.validateLinks(repairIds,origin))){error.textContent='Elige al menos una prenda disponible para enviar.';return;}
 const submit=$('[type=submit]',sheet);`);
js=js.replace("type:draft.type,title:","type:draft.type,repairIds,createdByPerson:host.person(),title:");
js=js.replace("record.receivedByProfile=PROFILES[state.site].id;","record.receivedByProfile=PROFILES[state.site].id;record.receivedByPerson=host.person();");
js=js.replace("$('#main').innerHTML=", "$('#main').innerHTML=");
js=js.replace("$$('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail));", ()=>"$$('[data-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.detail));host.scrollTop();");
// Un único encabezado y navegación visibles: los nodos auxiliares no se presentan.
const markup=`<div hidden><button id="role-switch"></button><button id="site-switch"></button><button id="profile"></button><nav class="bottom-nav"><button class="nav-item" data-tab="shipments"></button><button class="nav-item" data-tab="reception"></button></nav></div><div id="main"></div><dialog id="sheet" class="sheet"><div id="sheet-content"></div></dialog><dialog id="camera-dialog" class="sheet camera-sheet"><div class="sheet-head"><h2>Tu foto o video</h2><button id="close-camera" class="icon-button" aria-label="Cerrar cámara">×</button></div><p id="camera-message"></p><video id="camera-feed" autoplay muted playsinline></video><div class="camera-actions"><button id="take-photo" class="primary">Tomar foto</button><button id="record-video" class="secondary">Grabar video</button></div><button id="camera-gallery" class="gallery-button">Elegir foto o video de la galería</button></dialog><input type="file" id="gallery" accept="image/*,video/*" hidden><input type="file" id="native-camera" accept="image/*,video/*" capture="environment" hidden>`;
const prefix=`window.createRapicosturaShipping=function(host){const element=document.createElement('section');element.id='shipping-module';const scope=element.attachShadow({mode:'open'});scope.innerHTML='<link rel="stylesheet" href="shipping-module.css">'+${JSON.stringify(markup)};\n`;
const suffix=`\nreturn {element,show(view){tab=view;render()},create(ids=[]){newShipment(ids)},detail(id){showDetail(id)},close(){for(const d of scope.querySelectorAll('dialog[open]'))d.close();stopCamera();releaseURLs()}};};\n`;
let css=fs.readFileSync(path.join(source,'styles.css'),'utf8').replaceAll(':root',':host');
css+=`\n:host{display:block;font:17px/1.65 'Trebuchet MS',Arial,sans-serif;color:#faf6ff}#main{padding:0;overflow:visible}.hero{min-height:160px}.hero p,.greeting,.hero-label{font-size:14px}.hero h3{font-size:24px}.card-top h3{font-size:18px}.card-top small,.date,.badge,.route,.route small,.stat small,.section-title span,.step-labels,.demo-note{font-size:14px}.section-title h3{font-size:20px}.text-button,.filter{font-size:16px;min-height:48px}.route{line-height:1.7}.card-top{flex-wrap:wrap}.badge{margin-left:0}.sheet{font-size:17px}.sheet p,.hint,.detail-note,label,.field-label,.optional{font-size:16px!important;line-height:1.7}.sheet input,.sheet select,.sheet textarea{font-size:17px;min-height:54px}.primary,.secondary,.upload,.gallery-button{font-size:17px;min-height:56px}.sheet-head h2{font-size:24px}.icon-button{width:44px;height:44px}.two-fields{grid-template-columns:1fr}.type-grid{gap:8px}.face,.back,.back b,.back strong{font-size:16px}.type-choice,.flip{min-height:175px;height:175px}.face{line-height:1.5}.upload small{font-size:14px}.evidence-name{font-size:14px}.work-link{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #b88bdd55;border-radius:12px;background:#372846}.work-link input{width:24px;min-height:24px;flex-shrink:0}.work-link small{display:block;font-size:14px;color:#c0adc9}.sheet .primary{margin-top:18px}.camera-actions{flex-wrap:wrap}.hero-art{opacity:.6}.step-labels{gap:10px}.profile-summary{display:none}.sheet .form-error{font-size:16px}.card-bottom{gap:12px;flex-wrap:wrap}@media(max-width:480px){.sheet{padding:22px;max-height:92dvh}}\n`;
// Las tarjetas de historial no necesitan animaciones continuas fuera de pantalla.
css+='\n.shipment-card :is(.truck,.wheel,.smoke,.box-lid,.check-path){animation:none}.shipment-card .check-path{stroke-dashoffset:0}.sheet[open]{animation:none}.sheet::backdrop{backdrop-filter:none;background:#120b20d9}.type-choice{perspective:none}.flip{transform:none!important;transition:none;transform-style:flat}.face.back{display:none;transform:none}.type-choice[aria-pressed=true] .face:not(.back){background:#483055;border:2px solid var(--brand)}.type-choice[aria-pressed=true] .face:not(.back)::after{content:"✓ Seleccionado";font-size:14px;color:var(--green)}\n';
fs.writeFileSync(path.join(base,'dist/shipping-module.css'),css);
// Los estilos viajan con el módulo: nunca aparece primero como texto sin formato.
fs.writeFileSync(path.join(base,'dist/shipping-module.js'),prefix.replace("'<link rel=\"stylesheet\" href=\"shipping-module.css\">'",JSON.stringify('<style>'+css+'</style>'))+js+suffix);
console.log('Módulo del compañero adaptado con perfil, datos y navegación compartidos.');


