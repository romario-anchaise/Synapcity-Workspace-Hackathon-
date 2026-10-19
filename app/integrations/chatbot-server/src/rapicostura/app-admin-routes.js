import {Router,json} from 'express';
import {timingSafeEqual} from 'node:crypto';
import {publicSettings,saveSettings} from './settings.js';
import {loadKnowledge,saveKnowledge} from './knowledge.js';
import {askCompany,ollamaStatus} from './ai.js';

export function appAdminRouter(connection,{config=process.env}={}){
 const router=Router();
 const allowed=new Set((config.APP_PANEL_ORIGINS||'https://rapicostura-romario.web.app,https://rapicostura-romario.firebaseapp.com').split(',').map(s=>s.trim()));
 const failures=new Map();
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.vary('Origin');
  const origin=req.headers.origin;
  if(origin&&!allowed.has(origin))return res.status(403).json({error:'Esta dirección no está autorizada para abrir el panel.'});
  if(origin)res.set('Access-Control-Allow-Origin',origin);
  res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  const expected=config.APP_ADMIN_TOKEN||config.ADMIN_TOKEN||'';
  if(expected.length<32)return res.status(503).json({error:'Falta configurar APP_ADMIN_TOKEN en el servidor del chatbot (mínimo 32 caracteres).'});
  const key=req.ip,now=Date.now(),entry=failures.get(key);
  if(entry&&entry.until>now&&entry.count>=20)return res.status(429).json({error:'Demasiados intentos. Espera unos minutos.'});
  const supplied=req.headers.authorization?.replace(/^Bearer /,'')||'';
  if(Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))){
   failures.set(key,entry&&entry.until>now?{...entry,count:entry.count+1}:{count:1,until:now+600000});
   if(failures.size>2000)for(const [k,v]of failures)if(v.until<now)failures.delete(k);
   return res.status(401).json({error:'La clave de acceso no es correcta.'});
  }
  failures.delete(key);next();
 });
 router.use(json({limit:'256kb'}));
 const handler=fn=>async(req,res)=>{try{await fn(req,res)}catch(error){res.status(400).json({error:error.message||'No se pudo realizar la acción.'})}};
 router.get('/status',(_req,res)=>res.json({...publicSettings(),whatsapp:connection.status()}));
 router.get('/knowledge',(_req,res)=>res.json(loadKnowledge()));
 router.post('/knowledge',handler(async(req,res)=>res.json(saveKnowledge(req.body||{}))));
 router.post('/settings',handler(async(req,res)=>res.json(saveSettings(req.body||{}))));
 router.get('/questions',(_req,res)=>res.json(connection.store.recentQuestions()));
 router.get('/ai',handler(async(_req,res)=>res.json(await ollamaStatus())));
 router.post('/test-ai',handler(async(req,res)=>{
  const question=typeof req.body?.question==='string'?req.body.question.trim().slice(0,500):'¿Qué beneficios ofrecen?';
  const start=Date.now(),result=await askCompany(question,{useFaq:false});
  if(!['ollama','gemini'].includes(result.source))return res.status(400).json({error:'La IA no respondió. Revisa la configuración en el servidor.'});
  res.json({...result,seconds:Math.round((Date.now()-start)/100)/10});
 }));
 router.post('/connect',handler(async(_req,res)=>{await connection.start();res.json({ok:true})}));
 router.post('/greet',handler(async(req,res)=>{
  const phone=String(req.body?.phone||'').replace(/[\s()+-]/g,'').replace(/^9\d{8}$/,n=>'51'+n);
  if(!/^\d{8,15}$/.test(phone))throw Error('Escribe un número válido con código de país.');
  if(connection.status().status!=='connected')throw Error('Primero vincula WhatsApp con el QR.');
  const phones=(process.env.WHATSAPP_ALLOWED_JIDS||'').replaceAll('@s.whatsapp.net','').split(',').filter(Boolean);
  const saved=phones.includes(phone)?publicSettings():saveSettings({phones:[...phones,phone].join(',')});
  await connection.greet(phone);res.json({ok:true,phones:saved.phones});
 }));
 return router;
}
