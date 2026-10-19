import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import { metaRouter, metaPayload, textoMeta } from '../src/rapicostura/meta.js';
import { Bot } from '../src/rapicostura/flow.js';
import { Store } from '../src/rapicostura/store.js';
import { typingTime, PACES } from '../src/rapicostura/transport.js';
const ENV={META_PHONE_NUMBER_ID:'111',META_ACCESS_TOKEN:'token',META_APP_SECRET:'secreto',META_VERIFY_TOKEN:'verifica'};
test('botones (≤3 cortas), lista (≤10) o texto numerado',()=>{
 assert.equal(metaPayload('51999',{message:'¿Sabes?',options:['Sí 😊','Un poco','Todavía no']}).interactive.type,'button');
 const list=metaPayload('51999',{message:'¿Local?',options:['Siglo XX · José Luis Bustamante y Rivero','Cayma']});assert.equal(list.interactive.type,'list');
 const row=list.interactive.action.sections[0].rows[0];assert.equal(row.id,'Siglo XX · José Luis Bustamante y Rivero');assert.ok(row.title.length<=24);
 assert.equal(metaPayload('51999',{message:'Hola',options:[]}).type,'text');
 assert.equal(textoMeta({type:'interactive',interactive:{type:'list_reply',list_reply:{id:'Cayma'}}}),'Cayma');
});
async function server(env=ENV){
 const previous={...process.env};Object.assign(process.env,env);
 const store=new Store(':memory:');const calls=[];const request=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body),auth:opts.headers.Authorization});return {ok:true,json:async()=>({})}};
 const bot=new Bot(store,async()=>({error:'x'}),async()=>({answer:'ok',source:'mock',known:true}));
 const app=express();app.use('/webhook/meta',metaRouter(bot,store,{request,pause:async()=>{}}));
 const listener=await new Promise(r=>{const l=app.listen(0,'127.0.0.1',()=>r(l))});const base=`http://127.0.0.1:${listener.address().port}/webhook/meta`;
 return {base,calls,store,close:()=>{listener.close();store.db.close();for(const k of Object.keys(process.env))if(!(k in previous))delete process.env[k];Object.assign(process.env,previous)}};
}
const signed=(body,secret='secreto')=>({method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':'sha256='+createHmac('sha256',secret).update(body).digest('hex')},body});
const incoming=(id,text)=>JSON.stringify({entry:[{changes:[{value:{messages:[{from:'51999999999',id,type:'text',text:{body:text}}]}}]}]});
test('webhook: verificación, firma obligatoria, responde con botones y no repite reintentos',async()=>{
 const s=await server();
 try{
  assert.equal(await (await fetch(s.base+'?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=42')).text(),'42');
  assert.equal((await fetch(s.base+'?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=42')).status,403);
  assert.equal((await fetch(s.base,signed(incoming('m1','hola'),'falso'))).status,401);
  assert.equal((await fetch(s.base,signed(incoming('m1','hola')))).status,200);
  await new Promise(r=>setTimeout(r,50));
  const sent=s.calls.filter(c=>c.body.to);assert.equal(sent.length,1);assert.equal(sent[0].url,'https://graph.facebook.com/v23.0/111/messages');assert.equal(sent[0].auth,'Bearer token');
  assert.equal(sent[0].body.interactive.type,'button');assert.equal(sent[0].body.interactive.action.buttons[0].reply.id,'Quiero postular 🧵');
  assert.ok(s.calls.some(c=>c.body.status==='read'&&c.body.message_id==='m1'));
  await fetch(s.base,signed(incoming('m1','hola')));await new Promise(r=>setTimeout(r,50));assert.equal(s.calls.filter(c=>c.body.to).length,1,'Meta reintentó: no se responde dos veces');
  const tap=JSON.stringify({entry:[{changes:[{value:{messages:[{from:'51999999999',id:'m2',type:'interactive',interactive:{type:'button_reply',button_reply:{id:'Quiero postular 🧵'}}}]}}]}]});
  await fetch(s.base,signed(tap));await new Promise(r=>setTimeout(r,50));assert.equal(s.store.get('meta:51999999999').step,1);
 }finally{s.close()}
});
test('sin configurar, el webhook no acepta mensajes',async()=>{
 const s=await server({META_PHONE_NUMBER_ID:'',META_ACCESS_TOKEN:'',META_APP_SECRET:'',META_VERIFY_TOKEN:''});
 try{assert.equal((await fetch(s.base,signed(incoming('m1','hola')))).status,503)}finally{s.close()}
});
test('ritmo humano: “escribiendo…” depende del largo y la opción lenta tarda más',()=>{
 const long='a'.repeat(200);
 assert.ok(typingTime(long,PACES.lenta)>typingTime(long,PACES.normal));
 assert.ok(typingTime('hola',PACES.lenta)>=2500);assert.ok(typingTime('a'.repeat(5000),PACES.lenta)<=PACES.lenta.max);
});
