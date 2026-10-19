import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stateDir } from './settings.js';
// Información de la empresa que usa la IA. Se edita en /setup/ y se guarda fuera del directorio web.
export const defaultKnowledge=JSON.parse(readFileSync(new URL('./empresa.default.json',import.meta.url),'utf8'));
export const knowledgeFile=()=>process.env.BOT_KNOWLEDGE||join(stateDir,'empresa.json');
let cache=null;
const text=(value,max,field)=>{if(typeof value!=='string')throw Error(`Falta ${field}.`);const v=value.trim();if(v.length>max)throw Error(`${field} es demasiado largo (máximo ${max} caracteres).`);return v;};
export function normalizeKnowledge(input){
 const faq=Array.isArray(input?.faq)?input.faq:[];if(faq.length>80)throw Error('Máximo 80 preguntas frecuentes.');
 return {nombre:text(input?.nombre??'',80,'El nombre')||'la empresa',contacto:text(input?.contacto??'',120,'El contacto'),instrucciones:text(input?.instrucciones??'',3000,'Las instrucciones'),empresa:text(input?.empresa??'',8000,'La información de la empresa'),
  faq:faq.map(f=>({pregunta:text(f?.pregunta??'',300,'La pregunta'),claves:text(f?.claves??'',300,'Las palabras clave'),respuesta:text(f?.respuesta??'',1000,'La respuesta')})).filter(f=>f.pregunta&&f.respuesta)};
}
export function loadKnowledge(file=knowledgeFile()){
 if(cache?.file===file)return cache.kb;let kb=defaultKnowledge;
 try{kb=normalizeKnowledge(JSON.parse(readFileSync(file,'utf8')))}catch(err){if(err.code!=='ENOENT')console.error('[Rapicostura] empresa.json no es válido; se usan los datos de ejemplo.')}
 cache={file,kb};return kb;
}
export function saveKnowledge(input,file=knowledgeFile()){
 const kb=normalizeKnowledge(input);mkdirSync(dirname(file),{recursive:true,mode:0o700});
 writeFileSync(file+'.tmp',JSON.stringify(kb,null,1),{mode:0o600});renameSync(file+'.tmp',file);cache={file,kb};return kb;
}
const STOP=new Set('que cual cuales como donde cuando cuanto cuanta cuantos cuantas quien para por con los las una uno unos unas del al el la lo le les mas muy hay tienen tiene ustedes usted puedo pueden quiero quisiera saber seria esta estan este eso esa son ser hola buenas buenos dias tardes noches gracias favor porfa tambien'.split(' '));
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
// Raíz corta para que "sedes", "sede" o "horarios", "horario" coincidan sin un modelo.
const roots=s=>new Set(norm(s).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.slice(0,5)));
// Busca la pregunta frecuente más parecida. Funciona aunque no haya IA instalada.
export function findFaq(question,kb=loadKnowledge()){
 const q=roots(question);if(!q.size)return null;let best=null;
 for(const f of kb.faq){const t=roots(`${f.pregunta} ${f.claves}`);let hits=0;for(const w of q)if(t.has(w))hits++;const score=hits/q.size;if(hits&&(!best||score>best.score))best={...f,score};}
 return best&&best.score>=0.34?best:null;
}
