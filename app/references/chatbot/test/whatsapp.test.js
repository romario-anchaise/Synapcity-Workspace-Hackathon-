import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { proto, aesEncryptGCM, hmacSign } from '@whiskeysockets/baileys';
import { recordarEnviado, obtenerMensaje } from '../src/whatsapp.js';
import { createIncomingHandler, textoDe, numeroDe } from '../src/rapicostura/transport.js';
import { Bot } from '../src/rapicostura/flow.js';
import { Store } from '../src/rapicostura/store.js';
const PHONE='51999999999@s.whatsapp.net';
const SECRET=randomBytes(32);
function fakeSocket({failPresence=false,lids=[]}={}){const sent=[];return {sent,onWhatsApp:async()=>lids,sendPresenceUpdate:async()=>{if(failPresence)throw Error('closed')},user:{id:'51900000000:5@s.whatsapp.net',lid:'555:5@lid'},sendMessage:async(jid,content)=>{sent.push({jid,content});return {key:{id:'out'+sent.length},message:content.poll?{messageContextInfo:{messageSecret:SECRET},pollCreationMessageV3:{name:content.poll.name,options:content.poll.values.map(optionName=>({optionName}))}}:{conversation:content.text}}}}}
function setup(opts){process.env.WHATSAPP_ALLOWED_JIDS=PHONE;const store=new Store(':memory:');const socket=fakeSocket(opts);let current=socket;const handler=createIncomingHandler(new Bot(store),store,{getSocket:()=>current,pause:async()=>{}});return {store,socket,handler,swap:s=>{current=s}}}
const msg=(id,text,key={})=>({key:{remoteJid:PHONE,id,...key},message:{conversation:text}});
test('reintentos de WhatsApp reciben el mensaje real, nunca uno vacío',async()=>{
 recordarEnviado({key:{id:'abc'},message:{conversation:'Hola'}});
 assert.deepEqual(await obtenerMensaje({id:'abc'}),{conversation:'Hola'});
 assert.equal(await obtenerMensaje({id:'desconocido'}),undefined);
});
test('lee texto de mensajes temporales y usa el número detrás de @lid',()=>{
 assert.equal(textoDe({message:{ephemeralMessage:{message:{extendedTextMessage:{text:'hola'}}}}}),'hola');
 assert.equal(numeroDe({remoteJid:'123@lid',senderPn:PHONE}),PHONE);
 assert.equal(numeroDe({remoteJid:'123@lid'}),null);
 assert.equal(numeroDe({remoteJid:PHONE}),PHONE);
});
test('responde a contactos @lid autorizados y descarta los no autorizados',async()=>{
 const {store,socket,handler}=setup();
 await handler(msg('1','hola',{remoteJid:'123@lid',senderPn:PHONE}));
 assert.equal(socket.sent.length,2);assert.equal(socket.sent[0].jid,'123@lid');assert.equal(store.get('wa:'+PHONE).started,true);
 await handler(msg('2','hola',{remoteJid:'999@lid'}));
 await handler(msg('3','hola',{remoteJid:'51111111111@s.whatsapp.net'}));
 assert.equal(socket.sent.length,2);store.db.close();
});
test('sin senderPn, resuelve el @lid preguntando a WhatsApp por los números autorizados',async()=>{
 const {store,socket,handler}=setup({lids:[{jid:PHONE,exists:true,lid:'777@lid'}]});
 await handler(msg('1','hola',{remoteJid:'777@lid'}));
 assert.equal(socket.sent.length,2);assert.equal(socket.sent[0].jid,'777@lid');assert.equal(store.get('wa:'+PHONE).started,true);
 await handler(msg('2','hola',{remoteJid:'888@lid'}));assert.equal(socket.sent.length,2);
 store.db.close();
});
test('usa el socket vigente tras reconectar y no se bloquea si falla "escribiendo…"',async()=>{
 const {store,socket,handler,swap}=setup({failPresence:true});
 await handler(msg('1','hola'));assert.equal(socket.sent.length,2);
 const nuevo=fakeSocket();swap(nuevo);
 await handler(msg('2','sí'));assert.equal(socket.sent.length,2);assert.equal(nuevo.sent.length,2,'texto + encuesta');
 assert.equal(store.delivery(PHONE+':2').sent,true);
 await handler(msg('2','sí'));assert.equal(nuevo.sent.length,2,'un mensaje repetido no se responde dos veces');
 store.db.close();
});

// Cifra un voto igual que el celular de quien vota.
function vote(id,pollId,option,voterJid=PHONE,creatorJid='51900000000@s.whatsapp.net'){
 const sign=Buffer.concat([Buffer.from(pollId),Buffer.from(creatorJid),Buffer.from(voterJid),Buffer.from('Poll Vote'),new Uint8Array([1])]);
 const key=hmacSign(sign,hmacSign(SECRET,new Uint8Array(32),'sha256'),'sha256');const iv=randomBytes(12);
 const payload=proto.Message.PollVoteMessage.encode({selectedOptions:option?[createHash('sha256').update(option).digest()]:[]}).finish();
 return {key:{remoteJid:PHONE,id},message:{pollUpdateMessage:{pollCreationMessageKey:{id:pollId,fromMe:true,remoteJid:PHONE},vote:{encPayload:aesEncryptGCM(payload,key,iv,Buffer.from(`${pollId}\u0000${voterJid}`)),encIv:iv}}}};
}
test('las opciones llegan como encuesta y el voto marcado avanza la conversación',async()=>{
 const {store,socket,handler}=setup();
 await handler(msg('1','hola'));assert.deepEqual(socket.sent[1].content.poll.values,['Quiero postular 🧵','Hacer consultas 💬'],'el menú inicial llega como encuesta');
 await handler(msg('2','1'));const poll=socket.sent.at(-1);assert.deepEqual(poll.content.poll.values,['Sí, tengo experiencia 😊','No tengo experiencia']);assert.doesNotMatch(socket.sent.at(-2).content.text,/1\./);
 const pollId='out'+socket.sent.length;
 await handler(vote('v0',pollId,null));assert.equal(store.get('wa:'+PHONE).step,1,'quitar el voto no responde');
 await handler(vote('v1',pollId,'Sí, tengo experiencia 😊'));assert.equal(store.get('wa:'+PHONE).step,2);assert.match(socket.sent.at(-1).content.text,/llamas/);
 await handler(vote('v2',pollId,'No tengo experiencia'));assert.equal(store.get('wa:'+PHONE).step,2,'un voto en una encuesta vieja no cuenta');
 store.db.close();
});
test('descifra votos de chats @lid (bot y contacto con identificador oculto)',async()=>{
 const {store,socket,handler}=setup();const lid='123@lid';const key={remoteJid:lid,senderPn:PHONE};
 await handler(msg('1','hola',key));await handler(msg('2','1',key));const pollId='out'+socket.sent.length;
 const v=vote('v1',pollId,'Sí, tengo experiencia 😊',lid,'555@lid');v.key={...v.key,...key};
 await handler(v);assert.equal(store.get('wa:'+PHONE).profile.experience,'Sí, tengo experiencia 😊');store.db.close();
});
test('lee, espera y escribe antes de responder; frena a quien manda demasiados mensajes',async()=>{
 process.env.WHATSAPP_ALLOWED_JIDS=PHONE;const store=new Store(':memory:');const socket=fakeSocket();const log=[];
 socket.readMessages=async keys=>{log.push('leído '+keys[0].id)};const presence=socket.sendPresenceUpdate;socket.sendPresenceUpdate=async s=>{log.push(s);return presence(s)};
 const handler=createIncomingHandler(new Bot(store),store,{getSocket:()=>socket,pause:async ms=>{log.push(Math.round(ms))}});
 await handler(msg('1','hola'));
 const read=log.indexOf('leído 1'),typing=log.indexOf('composing');
 assert.ok(read>0&&typeof log[read-1]==='number','espera antes de marcar como leído');assert.ok(typing>read,'escribe después de leer');assert.ok(log[typing+1]>=2500,'escribiendo al menos 2,5 s');
 for(let i=2;i<=20;i++)await handler(msg(String(i),'hola'));
 assert.ok(socket.sent.length<40,'deja de responder tras 15 mensajes en 5 minutos');store.db.close();
});
test('el saludo de prueba escribe primero con el menú y reinicia la conversación',async()=>{
 const {store,socket,handler}=setup({lids:[{jid:PHONE,exists:true}]});
 await handler(msg('1','hola'));await handler(msg('2','1'));assert.equal(store.get('wa:'+PHONE).step,1);
 await handler.greet('51999999999');assert.equal(store.get('wa:'+PHONE).step,0);
 assert.match(socket.sent.at(-2).content.text,/ayudar hoy/);assert.deepEqual(socket.sent.at(-1).content.poll.values,['Quiero postular 🧵','Hacer consultas 💬']);
 await assert.rejects(setup().handler.greet('51111111111'),/no tiene WhatsApp/);
 store.db.close();
});
