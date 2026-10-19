import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {webChatRouter,serverAddress} from '../src/rapicostura/web-routes.js';
const ID='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
async function server(config={}){
 const calls=[];const bot={message:async(id,text)=>{calls.push({id,text});return {message:'ok',options:[]}},resume:async id=>{calls.push({id,resume:true});return {message:'pendiente',options:[]}}};
 const app=express();app.use(express.json());app.use('/api',webChatRouter(bot,{config,uuid:()=>ID}));
 const listener=await new Promise(resolve=>{const l=app.listen(0,'127.0.0.1',()=>resolve(l))});
 const url=`http://127.0.0.1:${listener.address().port}/api/chat`;
 return {calls,post:(body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}),close:()=>new Promise(resolve=>listener.close(resolve))};
}
test('Hosting: crea __session HttpOnly y conserva una sesión al recargar',async()=>{
 const s=await server();try{
  const r=await s.post({text:'hola'});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');
  assert.match(cookie,/^__session=/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.equal(r.headers.get('cache-control'),'no-store');
  const r2=await s.post({text:'hola',init:true},{Cookie:cookie.split(';')[0]});assert.equal(r2.status,200);assert.equal(r2.headers.get('set-cookie'),null);assert.deepEqual(s.calls,[{id:'web:'+ID,text:'hola'},{id:'web:'+ID,resume:true}]);
 }finally{await s.close()}
});
test('nube: acepta dominio permitido con Host interno, cookie Secure y rechaza Origin ajeno',async()=>{
 const s=await server({K_SERVICE:'rapicostura-bot',ALLOWED_ORIGINS:'https://rapicostura-romario.web.app'});try{
  const r=await s.post({text:'hola'},{Origin:'https://rapicostura-romario.web.app',Host:'internal.run.app'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Secure/);
  for(const origin of ['https://evil.example','null','http://rapicostura-romario.web.app'])assert.equal((await s.post({text:'hola'},{Origin:origin})).status,403);
  assert.equal(s.calls.length,1);
 }finally{await s.close()}
});
test('chat valida cuerpo y no usa cookies antiguas o IDs arbitrarios',async()=>{
 const s=await server();try{
  for(const body of [{},{text:4},{text:' '},{text:'x'.repeat(501)}])assert.equal((await s.post(body)).status,400);
  const r=await s.post({text:'hola'},{Cookie:'rapi_session=11111111-2222-3333-4444-555555555555; __session=inventado'});assert.match(r.headers.get('set-cookie'),new RegExp(ID));assert.equal(s.calls[0].id,'web:'+ID);
 }finally{await s.close()}
});
test('puerto y origen se validan antes de publicar en nube',()=>{
 assert.deepEqual(serverAddress({}),{port:8090,host:'127.0.0.1'});
 assert.deepEqual(serverAddress({K_SERVICE:'bot',PORT:'8080',BOT_PORT:'8090',BOT_HOST:'127.0.0.1'}),{port:8080,host:'0.0.0.0'});
 assert.throws(()=>serverAddress({PORT:'mal'}));assert.throws(()=>webChatRouter({}, {config:{K_SERVICE:'bot'}}));
});
