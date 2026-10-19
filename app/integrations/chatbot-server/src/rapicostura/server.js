import 'dotenv/config';
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from './store.js';
import { Bot } from './flow.js';
import { loadSettings, stateDir } from './settings.js';
import { setupRouter,localRequest } from './setup-routes.js';
import { appAdminRouter } from './app-admin-routes.js';
import { webChatRouter,serverAddress } from './web-routes.js';
import QRCode from 'qrcode';
import { ollamaModel } from './ai.js';
import { metaRouter, metaConfigured } from './meta.js';
loadSettings();

const app=express();const store=new Store(process.env.BOT_DB||stateDir+'/rapicostura.sqlite');const bot=new Bot(store);
store.purge();const cleanup=setInterval(()=>store.purge(),3600000);cleanup.unref();
app.disable('x-powered-by');
// Webhook de la API oficial de Meta: va antes de express.json porque necesita el cuerpo original para verificar la firma.
app.use('/webhook/meta',metaRouter(bot,store));
// El panel remoto tiene autenticación propia. /setup sigue siendo exclusivamente local.
app.use('/app-admin',appAdminRouter({status:()=>whatsapp,start:()=>connectWhatsApp(),store,greet:async phone=>{if(whatsapp.status!=='connected')throw Error('Primero vincula WhatsApp con el QR.');const {saludar}=await import('./transport.js');await saludar(phone)}}));
app.use(express.json({limit:'4kb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Cache-Control','no-store');next()});
const rates=new Map();
app.use('/api',(req,res,next)=>{const now=Date.now();const key=req.ip;const entry=rates.get(key);if(!entry||entry.until<now)rates.set(key,{until:now+60000,count:1});else if(++entry.count>40)return res.status(429).json({error:'Espera un momento antes de escribir de nuevo 😊'});if(rates.size>5000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);next()});
let whatsapp={status:'idle',qr:null};let connecting=false;let qrVersion=0;
async function connectWhatsApp(){
 if(connecting||['connected','qr','reconnecting','connecting'].includes(whatsapp.status))return;
 connecting=true;whatsapp={status:'connecting',qr:null};
 try{const {setConnectionListener}=await import('../whatsapp.js');setConnectionListener(async event=>{const version=++qrVersion;whatsapp={status:event.status,qr:null};if(event.qr){const image=await QRCode.toDataURL(event.qr,{width:300,margin:4});if(version===qrVersion)whatsapp={status:'qr',qr:image};}});const {startWhatsApp}=await import('./transport.js');await startWhatsApp(bot,store);}
 catch {whatsapp={status:'error',qr:null};throw Error('No pudimos conectar WhatsApp. Revisa la conexión e intenta de nuevo.');}
 finally{connecting=false;}
}
app.use('/setup',setupRouter({status:()=>whatsapp,start:connectWhatsApp,store,greet:async phone=>{if(whatsapp.status!=='connected')throw Error('Primero vincula WhatsApp con el QR.');const {saludar}=await import('./transport.js');await saludar(phone)}}));
app.get('/health',(_req,res)=>res.json({ok:true,mode:whatsapp.status==='connected'?'whatsapp':'web',dateAIConfigured:Boolean(process.env.GEMINI_API_KEY||process.env.GROQ_API_KEY||ollamaModel()),localAI:ollamaModel()||null,metaAPI:metaConfigured()}));
app.use('/api',webChatRouter(bot));
// Acceso local autenticado para revisión humana; no se expone en la página.
app.get('/admin/requests',(req,res)=>{const expected=process.env.ADMIN_TOKEN;const supplied=req.headers.authorization?.replace(/^Bearer /,'')||'';if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))return res.sendStatus(401);const rows=store.db.prepare('SELECT id,data,updated FROM sessions ORDER BY updated DESC LIMIT 100').all();res.json(rows.map(r=>({...r,data:JSON.parse(r.data)})));});
if(process.env.BOT_APP_DIR)app.use('/app',(req,res,next)=>localRequest(req)?next():res.sendStatus(403),express.static(process.env.BOT_APP_DIR,{index:'index.html',dotfiles:'deny',setHeaders:res=>res.set('Cache-Control','no-store')}));
app.use(express.static(fileURLToPath(new URL('../../public/',import.meta.url)),{index:'index.html',dotfiles:'deny'}));
app.use((_err,_req,res,_next)=>res.status(500).json({error:'No pudimos responder ahora. Intenta otra vez 💜'}));
const {port,host}=serverAddress();const server=app.listen(port,host,()=>console.log(`Rapicostura: http://localhost:${port}`));
// Si ya se vinculó WhatsApp antes (hay credenciales guardadas), se reconecta solo al arrancar.
const linked=existsSync(join(process.env.WHATSAPP_AUTH_DIR||join(stateDir,'whatsapp-auth'),'creds.json'));
if(process.env.WHATSAPP_ENABLED==='true'||(linked&&process.env.WHATSAPP_ENABLED!=='false')){
 console.log('[WhatsApp] Reconectando la sesión guardada…');
 await connectWhatsApp().catch(err=>console.error('[WhatsApp]',err.message));
}
function shutdown(){server.close(()=>{store.db.close();process.exit(0)});setTimeout(()=>process.exit(0),3000).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

