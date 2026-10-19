import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
export const stateDir=process.env.BOT_STATE_DIR||join(homedir(),'.local','share','rapicostura-bot');
const settingsFile=join(stateDir,'settings.json');
const DEFAULT_LOCAL_MODEL='qwen2.5:1.5b';
const SAVED=['GEMINI_API_KEY','GEMINI_MODEL','DATE_AI_PROVIDER','WHATSAPP_ALLOWED_JIDS','OLLAMA_MODEL','WHATSAPP_PACE','META_PHONE_NUMBER_ID','META_ACCESS_TOKEN','META_APP_SECRET','META_VERIFY_TOKEN'];
export function loadSettings(file=settingsFile){
 try {const data=JSON.parse(readFileSync(file,'utf8'));for(const key of SAVED)if(typeof data[key]==='string')process.env[key]=data[key];}catch(err){if(err.code!=='ENOENT')throw Error('No se pudo leer la configuración local.');}
}
export function saveSettings(input,file=settingsFile){
 const model=input.model?.trim()||process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
 if(!/^gemini-[a-zA-Z0-9.-]{1,80}$/.test(model))throw Error('El nombre del modelo no es válido.');
 const key=input.apiKey?.trim();if(key&&(/\s/.test(key)||key.length<20||key.startsWith('gen-lang-client-')))throw Error('Ingresa la clave API de AI Studio, no el identificador del proyecto.');
 // Vacío desactiva la IA local; el bot sigue funcionando con las preguntas frecuentes.
 const localModel=(input.ollamaModel??process.env.OLLAMA_MODEL??DEFAULT_LOCAL_MODEL).trim();
 if(localModel&&!/^[a-zA-Z0-9._\/-]{1,80}(:[a-zA-Z0-9._-]{1,40})?$/.test(localModel))throw Error('El nombre del modelo local no es válido. Ejemplo: qwen2.5:1.5b');
 const geminiKey=key||process.env.GEMINI_API_KEY||'';
 const provider=['ollama','gemini'].includes(input.provider)?input.provider:key?'gemini':process.env.DATE_AI_PROVIDER||'ollama';
 const phones=(input.phones??(process.env.WHATSAPP_ALLOWED_JIDS||'').replaceAll('@s.whatsapp.net','')).split(/[\s,;]+/).filter(Boolean).map(n=>n.replace(/^\+/,'').replace(/@s\.whatsapp\.net$/,'')).map(n=>/^9\d{8}$/.test(n)?'51'+n:n); // celular peruano sin código de país
 if(phones.some(n=>!/^\d{8,15}$/.test(n)))throw Error('Escribe números con código de país, sin espacios internos.');
 const pace=['normal','lenta','muy_lenta'].includes(input.pace)?input.pace:process.env.WHATSAPP_PACE||'lenta';
 // API oficial de Meta: los secretos vacíos conservan los guardados.
 const metaPhone=(input.metaPhoneId??process.env.META_PHONE_NUMBER_ID??'').trim();if(metaPhone&&!/^\d{5,25}$/.test(metaPhone))throw Error('El identificador del número de Meta (Phone number ID) solo tiene dígitos.');
 const metaToken=input.metaToken?.trim()||process.env.META_ACCESS_TOKEN||'';const metaSecret=input.metaAppSecret?.trim()||process.env.META_APP_SECRET||'';
 if([input.metaToken,input.metaAppSecret].some(v=>v?.trim()&&/\s/.test(v.trim())))throw Error('El token o la clave secreta de Meta no deben tener espacios.');
 const values={GEMINI_API_KEY:geminiKey,GEMINI_MODEL:model,DATE_AI_PROVIDER:provider,OLLAMA_MODEL:localModel,WHATSAPP_ALLOWED_JIDS:phones.map(n=>n+'@s.whatsapp.net').join(','),WHATSAPP_PACE:pace,
  META_PHONE_NUMBER_ID:metaPhone,META_ACCESS_TOKEN:metaToken,META_APP_SECRET:metaSecret,META_VERIFY_TOKEN:process.env.META_VERIFY_TOKEN||randomBytes(18).toString('base64url')};
 mkdirSync(dirname(file),{recursive:true,mode:0o700});writeFileSync(file+'.tmp',JSON.stringify(values),{mode:0o600});renameSync(file+'.tmp',file);Object.assign(process.env,values);
 return publicSettings();
}
export function publicSettings(){return {geminiConfigured:Boolean(process.env.GEMINI_API_KEY),model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',phones:(process.env.WHATSAPP_ALLOWED_JIDS||'').replaceAll('@s.whatsapp.net',''),provider:process.env.DATE_AI_PROVIDER||'gemini',ollamaModel:process.env.OLLAMA_MODEL??DEFAULT_LOCAL_MODEL,pace:process.env.WHATSAPP_PACE||'lenta',metaPhoneId:process.env.META_PHONE_NUMBER_ID||'',metaTokenSaved:Boolean(process.env.META_ACCESS_TOKEN),metaSecretSaved:Boolean(process.env.META_APP_SECRET),metaVerifyToken:process.env.META_VERIFY_TOKEN||''};}
