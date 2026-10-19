const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
function setup(legacy=false){
 const c=vm.createContext({console,Date,Intl});
 vm.runInContext(`
 const state={repairs:[{id:'RC-1',client:'Prueba',garment:'Pantalón',task:'Basta',branch:'Cayma',responsible:'Rosa',receivedBy:'Rosa',stage:'pending',currentLocation:{type:'branch',branch:'Cayma'}}],activity:[],staffProfiles:{Rosa:{name:'Rosa',branch:'Cayma',canReceive:true},Carmen:{name:'Carmen',branch:'Yanahuara',canReceive:false},Lucía:{name:'Lucía',branch:'Yanahuara',canReceive:true}}};
 const paths={},main={innerHTML:''},dialog={close(){}},localStorage={setItem(){}};
 const staffBranches=['Por confirmar','Cayma','Yanahuara'];
 const icon=()=>'',esc=s=>String(s),button=()=>'',toast=()=>{},modal=()=>{},scrollAppTop=()=>{},save=message=>{if(message)state.activity.push({message})},staffProfile=name=>state.staffProfiles[name];
 function responsibleBranch(r){return r.responsibleBranch||r.branch||'Por confirmar'}
 function saveIntake(){} function receiveGarment(){} function staffCard(){return ''} function memberCard(){return ''} function ownerData(){return {repairs:state.repairs,agreements:state.supportRequests}} function receptionCard(){return ''}
 const document={getElementById(){return {}},querySelector(){return {innerHTML:''}}};
 `,c);
 if(legacy)vm.runInContext(`state.repairs[0].stage='return_route';state.teamParcels=[{id:'PAQ-OLD',from:'Rosa',to:'Carmen',stage:'received',due:'2026-10-20',payment:8,note:'Acuerdo anterior',history:[],items:[{repairId:'RC-1',receipt:'received'}]}]`,c);
 for(const f of ['repairs.js','team.js','branches.js']){
  let code=fs.readFileSync(path.join(__dirname,'../dist',f),'utf8');
  if(f==='branches.js')code=code.replace(/\nrender\(\);\s*$/,'');
  vm.runInContext(code,c);
 }
 return code=>vm.runInContext(code,c);
}
test('conserva datos anteriores sin crear otro registro logístico ni afirmar una llegada',()=>{
 const run=setup(true);
 assert.equal(run(`state.repairs[0].stage`),'review');
 assert.equal(run(`holder('RC-1')`),'Carmen');
 assert.equal(run(`state.repairs[0].currentLocation.branch`),'Cayma');
 assert.equal(run(`state.teamParcels[0].id`),'PAQ-OLD');
 assert.equal(run(`state.supportRequests.length`),1);
 run(`initWorkScope();initWorkScope()`);
 assert.equal(run(`state.supportRequests.length`),1);
 assert.equal(run(`state.supportRequests[0].legacyParcelId`),'PAQ-OLD');
});
test('un acuerdo espera aceptación y no requiere foto ni crea envíos',()=>{
 const run=setup();run(`composeDraft={selected:['RC-1'],to:'Carmen',due:'2026-10-20',payment:8,note:'Hacer la basta'};saveWorkSupport()`);
 assert.equal(run(`state.supportRequests.length`),1);
 assert.equal(run(`holder('RC-1')`),'Rosa');
 assert.equal(run(`state.supportRequests[0].status`),'pending');
 assert.equal(run(`state.teamParcels`),undefined);
 run(`saveWorkSupport()`);assert.equal(run(`state.supportRequests.length`),1);
});
test('solo la destinataria puede aceptar; asigna trabajo sin cambiar ubicación física',()=>{
 const run=setup();run(`state.supportRequests.push({id:'AP-1',from:'Rosa',to:'Carmen',repairIds:['RC-1'],status:'pending',due:'2026-10-21',payment:8});answerWorkSupport('AP-1',true)`);
 assert.equal(run(`holder('RC-1')`),'Rosa');
 run(`currentPerson='Carmen';answerWorkSupport('AP-1',true)`);
 assert.equal(run(`holder('RC-1')`),'Carmen');
 assert.equal(run(`state.repairs[0].currentLocation.branch`),'Cayma');
 assert.equal(run(`state.supportRequests[0].status`),'accepted');
 assert.equal(run(`workDue(state.repairs[0])`),'miércoles, 21 de octubre');
});
test('rechazar apoyo conserva a la responsable; no admite dos solicitudes pendientes',()=>{
 const run=setup();run(`state.supportRequests.push({id:'AP-1',from:'Rosa',to:'Carmen',repairIds:['RC-1'],status:'pending'});composeDraft={selected:['RC-1'],to:'Lucía',due:'2026-10-20',payment:8,note:'Otro apoyo'};saveWorkSupport()`);
 assert.equal(run(`state.supportRequests.length`),1);
 run(`currentPerson='Carmen';answerWorkSupport('AP-1',false)`);
 assert.equal(run(`holder('RC-1')`),'Rosa');
 assert.equal(run(`eligibleRepairs().length`),0);
 run(`currentPerson='Rosa'`);assert.equal(run(`eligibleRepairs().length`),1);
});
test('terminar trabajo lleva a revisión, no a entrega ni a transporte',()=>{
 const run=setup();run(`selectedRepair='RC-1';confirmStartRepair();confirmFinished()`);
 assert.equal(run(`state.repairs[0].stage`),'review');
 assert.equal(run(`state.repairs[0].currentLocation.branch`),'Cayma');
 assert.equal(run(`state.repairs[0].returnTransfer`),undefined);
});
test('calidad requiere encargada de la sede y comprobación; entrega solo después de aprobar',()=>{
 const run=setup();run(`state.repairs[0].stage='review';currentPerson='Lucía';finishQuality('RC-1',true)`);
 assert.equal(run(`state.repairs[0].stage`),'review');
 run(`currentPerson='Rosa';finishQuality('RC-1',false);confirmClientDelivery('RC-1')`);
 assert.equal(run(`state.repairs[0].stage`),'review');
 run(`finishQuality('RC-1',true)`);
 assert.equal(run(`state.repairs[0].stage`),'ready');
 assert.equal(run(`state.repairs[0].reviewedBy`),'Rosa');
 run(`confirmClientDelivery('RC-1')`);
 assert.equal(run(`state.repairs[0].stage`),'delivered');
});
test('las funciones operativas de transporte fueron retiradas',()=>{
 const run=setup();
 for(const name of ['dispatchParcel','confirmReceipt','dispatchBranchReturn','receiveBranchReturn','simulateTransport','newTrip'])assert.equal(run(`typeof ${name}`),'undefined');
});
