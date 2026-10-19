import { normalizeMessageContent, decryptPollVote, jidNormalizedUser } from '@whiskeysockets/baileys';
import { createHash } from 'node:crypto';
import { conectar, setIncomingHandler, obtenerSocket, recordarEnviado } from '../whatsapp.js';
// Desenvuelve mensajes temporales o de "ver una vez" para leer el texto.
export function textoDe(message){const m=normalizeMessageContent(message.message);return m?.conversation||m?.extendedTextMessage?.text;}
// Las opciones se envían como encuesta para marcarlas con un toque (los botones no funcionan con Baileys).
// WhatsApp exige al menos 2 opciones.
export const usaEncuesta=options=>options.length>=2&&options.length<=12;
const hash=text=>createHash('sha256').update(text).digest('hex');
// El voto llega cifrado. Se prueba con los identificadores posibles (número o @lid) del bot y de quien vota.
export function votoDe(message,store,me,phone){
 const update=normalizeMessageContent(message.message)?.pollUpdateMessage;if(!update?.vote)return null;
 const pollId=update.pollCreationMessageKey?.id;const poll=store.latestPoll(phone);
 // solo cuenta la encuesta de la pregunta actual
 if(!poll||poll.id!==pollId){console.log(`[Rapicostura] Voto descartado: ${poll?'es de una encuesta anterior':'no hay encuesta guardada'}`);return null}
 const creators=[me?.id,me?.lid].filter(Boolean).map(jidNormalizedUser);
 const voters=[...new Set([message.key.participant,message.key.remoteJid,message.key.senderPn,message.key.senderLid,phone].filter(Boolean).map(jidNormalizedUser))];
 for(const pollCreatorJid of creators)for(const voterJid of voters){
  let vote;try{vote=decryptPollVote(update.vote,{pollEncKey:Buffer.from(poll.secret,'base64'),pollCreatorJid,pollMsgId:pollId,voterJid})}catch{continue}
  const chosen=(vote.selectedOptions||[]).map(h=>Buffer.from(h).toString('hex'));
  return poll.options.find(o=>chosen.includes(hash(o)))||null; // sin selección = quitó su voto
 }
 console.log(`[Rapicostura] Voto descartado: no se pudo descifrar (bot ${creators.join(' ')}; votante ${voters.join(' ')})`);
 return null;
}
// Con @lid WhatsApp oculta el número; Baileys lo entrega en senderPn cuando lo conoce.
export function numeroDe(key){const jid=key.remoteJid;return jid?.endsWith('@lid')?key.senderPn||null:jid;}
// Si WhatsApp no manda senderPn, se le pregunta el @lid de cada número autorizado (con caché).
export function createLidResolver(getSocket,{ttl=60000}={}){
 let cache={key:'',map:new Map(),at:0};
 return async(lid,phones)=>{
  lid=lid.replace(/:\d+@/,'@');const key=phones.join(',');
  if(cache.key!==key||(!cache.map.has(lid)&&Date.now()-cache.at>ttl)){
   const found=await getSocket()?.onWhatsApp(...phones).catch(()=>null);
   cache={key,map:found?new Map(found.filter(x=>x.lid).map(x=>[x.lid.replace(/:\d+@/,'@'),x.jid])):cache.map,at:Date.now()};
  }
  return cache.map.get(lid)||null;
 };
}
// Ritmo de persona para reducir el riesgo de bloqueo: leer, pensar y escribir despacio,
// con espacio entre envíos. Se elige en /setup/ (WHATSAPP_PACE).
export const PACES={
 normal:{cps:14,read:[1000,2500],think:[800,1800],max:12000,gap:1500},
 lenta:{cps:7,read:[2500,6000],think:[1500,4000],max:25000,gap:3000},
 muy_lenta:{cps:4,read:[5000,12000],think:[3000,7000],max:40000,gap:6000}
};
export const pace=()=>PACES[process.env.WHATSAPP_PACE]||PACES.lenta;
const between=([min,max])=>min+Math.random()*(max-min);
// Tiempo “escribiendo…” según el largo del mensaje, con variación para no ser siempre igual.
export const typingTime=(text,p=pace())=>Math.round(Math.min(p.max,Math.max(2500,text.length/p.cps*1000*(0.8+Math.random()*0.4))));
const FLOOD_WINDOW=5*60000,FLOOD_MAX=15;
export function createIncomingHandler(bot,store,{getSocket=obtenerSocket,resolveLid=createLidResolver(getSocket),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const queue=new Map();const recent=new Map();let nextSlot=0;
 // Espacio mínimo entre dos envíos cualesquiera, aunque escriban varias personas a la vez.
 const gap=async()=>{const slot=Math.max(Date.now(),nextSlot);nextSlot=slot+pace().gap;if(slot>Date.now())await pause(slot-Date.now())};
 // Escribe a velocidad de persona y envía el texto y, si hay opciones, la encuesta.
 const send=async(jid,phone,reply)=>{
  const p=pace();
  // Se usa el socket vigente: tras una reconexión el anterior ya está cerrado.
  const presence=state=>getSocket()?.sendPresenceUpdate(state,jid).catch(()=>{});
  // Con una sola opción se agrega una segunda útil para que también sea encuesta y se pueda marcar.
  const choices=reply.options.length===1?[...reply.options,reply.options[0]==='Volver a la pregunta'?'Volver a empezar':'Necesito ayuda']:reply.options;
  const poll=usaEncuesta(choices);
  const options=poll?'':choices.map((s,i)=>`${i+1}. ${s}`).join('\n');
  const body=reply.message+(options?'\n\n'+options:'');
  try{
   await presence('composing');await pause(typingTime(body,p));await gap();
   const socket=getSocket();if(!socket)throw Error('WhatsApp no está conectado.');
   recordarEnviado(await socket.sendMessage(jid,{text:body}));
   if(poll){
    await presence('composing');await pause(between([1500,3500]));await gap();
    const sent=await getSocket().sendMessage(jid,{poll:{name:'👇 Marca una opción (o escríbela)',values:choices,selectableCount:1}});recordarEnviado(sent);store.savePoll(sent.key.id,phone,Buffer.from(sent.message.messageContextInfo.messageSecret).toString('base64'),choices);
   }
   else store.clearPolls(phone);
  }finally{await presence('paused')}
 };
 const handler=async message=>{
  const jid=message.key.remoteJid;
  const allowed=new Set((process.env.WHATSAPP_ALLOWED_JIDS||'').split(',').map(s=>s.trim()).filter(Boolean));
  if(message.key.fromMe||!jid||jid==='status@broadcast')return;
  const phone=numeroDe(message.key)||(jid.endsWith('@lid')&&allowed.size?await resolveLid(jid,[...allowed]):null);
  const ignore=reason=>console.log(`[Rapicostura] Mensaje ignorado (${reason}) de …${(phone||jid).split('@')[0].slice(-3)}`);
  if(!jid.endsWith('@s.whatsapp.net')&&!jid.endsWith('@lid'))return ignore('no es un chat individual');
  if(!phone?.endsWith('@s.whatsapp.net'))return ignore('WhatsApp no compartió el número');
  if(!allowed.has(phone))return ignore('número no autorizado');
  const text=textoDe(message)||votoDe(message,store,getSocket()?.user,phone);
  if(!text||text.length>500)return ignore(text?'texto muy largo':'no es texto ni un voto vigente');
  // Demasiados mensajes seguidos de un mismo chat: se deja de responder un rato en vez de seguirle el ritmo.
  const now=Date.now();const times=(recent.get(phone)||[]).filter(t=>now-t<FLOOD_WINDOW);times.push(now);recent.set(phone,times);
  if(times.length>FLOOD_MAX)return ignore('demasiados mensajes seguidos');
  const id=phone+':'+message.key.id;
  const previous=queue.get(phone)||Promise.resolve();
  const job=previous.catch(()=>{}).then(async()=>{
   const saved=store.delivery(id);if(saved?.sent)return;
   const reply=saved?.reply||await bot.message('wa:'+phone,text,id);
   const p=pace();
   // 1) Leer: espera y marca como leído (✓✓ azul). 2) Pensar. 3) Escribir a velocidad de persona.
   await pause(between(p.read));
   await Promise.resolve(getSocket()?.readMessages?.([message.key])).catch(()=>{});
   await pause(between(p.think));
   await send(jid,phone,reply);store.sentDelivery(id);
  });queue.set(phone,job);try{await job}finally{if(queue.get(phone)===job)queue.delete(phone)}
 };
 // Saludo de prueba desde el panel: el bot escribe primero a un número y reinicia su conversación.
 handler.greet=async number=>{
  const phone=number.replace(/\D/g,'')+'@s.whatsapp.net';
  const [found]=await getSocket()?.onWhatsApp(phone)||[];if(!found?.exists)throw Error('Ese número no tiene WhatsApp o no está bien escrito.');
  const jid=jidNormalizedUser(found.jid);
  const previous=queue.get(jid)||Promise.resolve();
  const job=previous.catch(()=>{}).then(async()=>send(jid,jid,await bot.message('wa:'+jid,'volver a empezar')));
  queue.set(jid,job);try{await job}finally{if(queue.get(jid)===job)queue.delete(jid)}
 };
 return handler;
}
let current=null;
export async function saludar(number){if(!current||!obtenerSocket())throw Error('Primero vincula WhatsApp con el QR.');await current.greet(number)}
export async function startWhatsApp(bot,store){
 current=createIncomingHandler(bot,store);setIncomingHandler(current);await conectar();
}
