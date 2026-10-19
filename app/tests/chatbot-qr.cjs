const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/chatbot-module.js'),'utf8');
const handler=source.match(/\$\('connect'\)\.onclick=(async\(\)=>\{[\s\S]*?finally\{await refresh\(\)\}\});/)[1];
function setup(status,{fail=false}={}){
 const calls=[],notices=[],button={disabled:false};let scrolled=false;
 const context={$:id=>id==='connect'?button:{scrollIntoView(){scrolled=true}},request:async(route,body)=>{calls.push(route);if(fail)throw Error('Servidor apagado');return {whatsapp:{status}}},refresh:async()=>{button.disabled=false},save:()=>{throw Error('No debe guardar IA para mostrar QR')},notice:text=>notices.push(text)};
 vm.createContext(context);vm.runInContext('run='+handler,context);
 return {click:()=>context.run(),calls,notices,button,get scrolled(){return scrolled}};
}
test('un QR existente se muestra sin reiniciar WhatsApp ni guardar los ajustes de IA',async()=>{
 const s=setup('qr');await s.click();assert.deepEqual(s.calls,['status']);assert.equal(s.scrolled,true);assert.equal(s.button.disabled,false);
});
test('sin sesión se solicita un QR y se vuelve a habilitar el botón',async()=>{
 const s=setup('idle');await s.click();assert.deepEqual(s.calls,['status','connect']);assert.equal(s.scrolled,true);assert.equal(s.button.disabled,false);
});
test('un fallo del servidor se informa y permite reintentar',async()=>{
 const s=setup('idle',{fail:true});await s.click();assert.deepEqual(s.notices,['Servidor apagado']);assert.equal(s.scrolled,false);assert.equal(s.button.disabled,false);
});
