import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publicSettings, saveSettings } from './settings.js';
import { interpretDate } from './dates.js';
import { askCompany, ollamaStatus, aiProvider } from './ai.js';
import { loadKnowledge, saveKnowledge } from './knowledge.js';
export function localRequest(req){
 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
 const host=req.headers.host||'';if(!local||! /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return false;
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==host)return false}catch{return false}}
 return true;
}
export function setupRouter(connection){
 const router=Router();const csrf=randomUUID();
 router.use((req,res,next)=>{if(!localRequest(req))return res.sendStatus(403);res.set('Content-Security-Policy',"frame-ancestors 'none'");res.set('X-Frame-Options','DENY');if(req.method!=='GET'&&req.headers['x-setup-token']!==csrf)return res.sendStatus(403);next()});
 router.get('/',(_req,res)=>res.sendFile(fileURLToPath(new URL('./setup.html',import.meta.url))));
 router.get('/status',(_req,res)=>res.json({...publicSettings(),whatsapp:connection.status(),csrf}));
 router.post('/settings',(req,res)=>{try{res.json(saveSettings(req.body||{}))}catch(err){res.status(400).json({error:err.message})}});
 router.post('/test-date',async(_req,res)=>{const result=await interpretDate('el veinte de octubre de 2099 a las diez de la mañana',new Date(),{...process.env,DATE_AI_PROVIDER:'gemini'});if(result.source!=='gemini'||result.error)return res.status(400).json({error:'No se pudo validar Gemini. Revisa la clave, el modelo, los permisos y la cuota de AI Studio.'});res.json({ok:true,message:'Gemini respondió correctamente. Solo se envió una fecha de prueba.'})});
 router.post('/connect',async(_req,res)=>{try{await connection.start();res.json({ok:true})}catch(err){res.status(400).json({error:err.message})}});
 // IA local e información de la empresa.
 router.get('/ai',async(_req,res)=>res.json(await ollamaStatus()));
 router.post('/test-ai',async(req,res)=>{const question=typeof req.body?.question==='string'&&req.body.question.trim()?req.body.question.trim().slice(0,500):'¿Qué beneficios ofrecen?';const started=Date.now();const result=await askCompany(question,{useFaq:false});if(!['ollama','gemini'].includes(result.source))return res.status(400).json({error:aiProvider()==='gemini'?'Gemini no respondió. Revisa la clave, el modelo y la cuota de AI Studio.':'La IA local no respondió. Revisa que Ollama esté abierto y que el modelo esté descargado.'});res.json({...result,seconds:Math.round((Date.now()-started)/100)/10})});
 router.get('/knowledge',(_req,res)=>res.json(loadKnowledge()));
 router.post('/knowledge',(req,res)=>{try{res.json(saveKnowledge(req.body||{}))}catch(err){res.status(400).json({error:err.message})}});
 // Saludo de prueba: autoriza el número (para que el bot le responda) y le escribe primero.
 router.post('/greet',async(req,res)=>{try{
  const n=String(req.body?.phone||'').replace(/[\s()+-]/g,'').replace(/^9\d{8}$/,m=>'51'+m);if(!/^\d{8,15}$/.test(n))throw Error('Escribe el número con código de país, por ejemplo 51987654321.');
  const phones=(process.env.WHATSAPP_ALLOWED_JIDS||'').replaceAll('@s.whatsapp.net','').split(',').filter(Boolean);
  const saved=phones.includes(n)?publicSettings():saveSettings({phones:[...phones,n].join(',')});
  await connection.greet(n);res.json({ok:true,phones:saved.phones});
 }catch(err){res.status(400).json({error:err.message})}});
 router.get('/questions',(_req,res)=>res.json(connection.store?.recentQuestions()||[]));
 return router;
}
