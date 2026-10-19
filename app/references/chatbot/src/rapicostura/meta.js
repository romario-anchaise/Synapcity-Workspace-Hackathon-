import { Router, raw } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
// Canal oficial: WhatsApp Cloud API de Meta. Con ella sí hay botones y listas reales, sin riesgo de bloqueo por usar un cliente no oficial.
export const metaConfigured=(c=process.env)=>Boolean(c.META_PHONE_NUMBER_ID&&c.META_ACCESS_TOKEN&&c.META_APP_SECRET);
const graphUrl=c=>`https://graph.facebook.com/${c.META_GRAPH_VERSION||'v23.0'}/${c.META_PHONE_NUMBER_ID}/messages`;
// Hasta 3 opciones cortas → botones; hasta 10 → lista; si no, texto numerado.
export function metaPayload(to,reply){
 const opts=reply.options||[];const base={messaging_product:'whatsapp',recipient_type:'individual',to};
 if(opts.length&&opts.length<=3&&opts.every(o=>o.length<=20)&&reply.message.length<=1024)
  return {...base,type:'interactive',interactive:{type:'button',body:{text:reply.message},action:{buttons:opts.map(o=>({type:'reply',reply:{id:o,title:o}}))}}};
 if(opts.length&&opts.length<=10&&reply.message.length<=4096)
  return {...base,type:'interactive',interactive:{type:'list',body:{text:reply.message},action:{button:'Ver opciones',sections:[{title:'Elige una opción',rows:opts.map(o=>({id:o.slice(0,200),title:o.length<=24?o:o.slice(0,23)+'…',...(o.length>24?{description:o.slice(0,72)}:{})}))}]}}};
 const numbered=opts.length?'\n\n'+opts.map((o,i)=>`${i+1}. ${o}`).join('\n'):'';
 return {...base,type:'text',text:{body:(reply.message+numbered).slice(0,4096)}};
}
// El id de cada botón o fila es el texto completo de la opción: el bot lo recibe como si lo hubieran escrito.
export function textoMeta(m){
 if(m.type==='text')return m.text?.body;
 if(m.type==='interactive')return m.interactive?.button_reply?.id||m.interactive?.list_reply?.id;
 if(m.type==='button')return m.button?.text;
}
export function metaRouter(bot,store,{request=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const router=Router();const queue=new Map();
 const api=async payload=>{const c=process.env;const response=await request(graphUrl(c),{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${c.META_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok)throw Error(`Meta respondió ${response.status}`);return response.json()};
 // Verificación del webhook al configurarlo en developers.facebook.com.
 router.get('/',(req,res)=>{const token=process.env.META_VERIFY_TOKEN;if(req.query['hub.mode']==='subscribe'&&token&&req.query['hub.verify_token']===token)return res.type('text/plain').send(String(req.query['hub.challenge']||''));res.sendStatus(403)});
 router.post('/',raw({type:'*/*',limit:'512kb'}),(req,res)=>{
  const c=process.env;if(!metaConfigured(c))return res.sendStatus(503);
  // Solo se aceptan avisos firmados por Meta con la clave secreta de la app.
  const signature=String(req.headers['x-hub-signature-256']||'');const expected='sha256='+createHmac('sha256',c.META_APP_SECRET).update(Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0)).digest('hex');
  if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return res.sendStatus(401);
  res.sendStatus(200); // Meta reintenta si no respondemos rápido; el trabajo sigue en segundo plano.
  let body;try{body=JSON.parse(req.body)}catch{return}
  for(const entry of body.entry||[])for(const change of entry.changes||[])for(const m of change.value?.messages||[])
   handle(m).catch(err=>console.error('[Meta] No se pudo responder un mensaje:',err.message));
 });
 async function handle(m){
  const text=textoMeta(m);if(!text||text.length>500||!/^\d{8,15}$/.test(m.from||''))return;
  const id='meta:'+m.id;const phone=m.from;
  const previous=queue.get(phone)||Promise.resolve();
  const job=previous.catch(()=>{}).then(async()=>{
   const saved=store.delivery(id);if(saved?.sent)return;
   const reply=saved?.reply||await bot.message('meta:'+phone,text,id);
   // Marca como leído y muestra “escribiendo…” (dura hasta 25 s o hasta que llega la respuesta).
   await api({messaging_product:'whatsapp',status:'read',message_id:m.id,typing_indicator:{type:'text'}}).catch(()=>{});
   await pause(Math.min(8000,1200+reply.message.length*25));
   await api(metaPayload(phone,reply));store.sentDelivery(id);
  });queue.set(phone,job);try{await job}finally{if(queue.get(phone)===job)queue.delete(phone)}
 }
 return router;
}
