import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {appAdminRouter} from '../src/rapicostura/app-admin-routes.js';
const origin='https://rapicostura-romario.web.app',token='test-only-not-a-real-secret-123456789';
async function withServer(config,fn){const app=express();app.use('/app-admin',appAdminRouter({status:()=>({status:'idle',qr:null}),store:{recentQuestions:()=>[{text:'Pregunta de prueba',answer:'Respuesta'}]}},{config}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));try{await fn('http://127.0.0.1:'+server.address().port)}finally{await new Promise(r=>server.close(r))}}
test('el panel exige clave real y origen autorizado antes de mostrar datos',async()=>withServer({APP_ADMIN_TOKEN:token},async base=>{
 let r=await fetch(base+'/app-admin/status',{headers:{Origin:origin}});assert.equal(r.status,401);
 r=await fetch(base+'/app-admin/status',{headers:{Origin:'https://otra-pagina.example',Authorization:'Bearer '+token}});assert.equal(r.status,403);
 r=await fetch(base+'/app-admin/status',{headers:{Origin:origin,Authorization:'Bearer '+token}});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();assert.equal(data.whatsapp.status,'idle');assert.equal(data.META_ACCESS_TOKEN,undefined);assert.equal(data.GEMINI_API_KEY,undefined);
 r=await fetch(base+'/app-admin/questions',{headers:{Origin:origin,Authorization:'Bearer '+token}});assert.equal(r.status,200);assert.equal((await r.json())[0].text,'Pregunta de prueba');
}));
test('preflight permitido y escritura no autorizada bloqueada',async()=>withServer({APP_ADMIN_TOKEN:token},async base=>{
 let r=await fetch(base+'/app-admin/settings',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});assert.equal(r.status,204);assert.match(r.headers.get('access-control-allow-headers'),/Authorization/);
 r=await fetch(base+'/app-admin/settings',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({apiKey:'no-se-debe-guardar'})});assert.equal(r.status,401);
}));
test('sin configurar una clave el panel remoto permanece cerrado',async()=>withServer({},async base=>{const r=await fetch(base+'/app-admin/status',{headers:{Origin:origin}});assert.equal(r.status,503)}));
