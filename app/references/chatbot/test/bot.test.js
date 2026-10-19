import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocal, validateDate, interpretDate, naturalDate } from '../src/rapicostura/dates.js';
import { Bot,questions } from '../src/rapicostura/flow.js';
import { Store } from '../src/rapicostura/store.js';
import { askCompany, DEFAULT_OLLAMA_MODEL } from '../src/rapicostura/ai.js';
import { findFaq } from '../src/rapicostura/knowledge.js';
const now=new Date('2026-10-17T15:00:00Z');
test('fechas en español, reloj de Lima y validación',()=>{
 assert.deepEqual(parseLocal('el martes a las diez de la mañana',now),{date:'2026-10-20',time:'10:00'});
 assert.deepEqual(parseLocal('mañana a las tres de la tarde',now),{date:'2026-10-18',time:'15:00'});
 assert.equal(parseLocal('el martes por la tarde',now),null);
 assert.deepEqual(parseLocal('el martes a las 3',now),{date:'2026-10-20',time:'15:00'},'de 1 a 6 sin periodo es de la tarde: atendemos de 9 a 18');
 assert.ok(validateDate({date:'2026-10-18',time:'10:00'},now).error);
 assert.ok(validateDate({date:'2026-10-20',time:'18:30'},now).error);
 assert.ok(validateDate({date:'2026-02-30',time:'10:00'},now).error);
 assert.ok(validateDate({date:'2026-10-16',time:'10:00'},now).error);
});
test('API solo para fechas no reconocidas; fallo seguro y datos inválidos',async()=>{
 let calls=0;const request=async(url,opts)=>{calls++;const body=JSON.parse(opts.body);assert.equal(body.messages[1].content,'pasando el feriado, después de almorzar');return {ok:true,json:async()=>({choices:[{message:{content:'{"date":null,"time":null}'}}]})}};
 await interpretDate('el martes a las 10 de la mañana',now,{GROQ_API_KEY:'test'},request);assert.equal(calls,0);
 assert.ok((await interpretDate('pasando el feriado, después de almorzar',now,{GROQ_API_KEY:'test'},request)).error);assert.equal(calls,1);
 assert.ok((await interpretDate('texto ambiguo',now,{GROQ_API_KEY:'test'},async()=>{throw Error('timeout')})).error);
});
const noAI=async()=>{throw Error('la IA no debe llamarse')};
const parseMock=async()=>({...validateDate({date:'2099-10-20',time:'10:00'}),source:'mock'});
async function prepared(ask=noAI){const store=new Store(':memory:');const bot=new Bot(store,parseMock,ask);await bot.message('a','hola');await bot.message('a','Quiero postular 🧵');await bot.message('a','sí');await bot.message('a','Ana');const zone=await bot.message('a','35');assert.match(zone.message,/Mucho gusto, Ana/);await bot.message('a','Cayma');for(let i=0;i<8;i++)await bot.message('a','1');await bot.message('a','4');return {store,bot}}
test('flujo completo con fecha escrita: confirmación y resumen antes de la solicitud',async()=>{
 const {bot,store}=await prepared();const visit=await bot.message('a','sí');assert.equal(visit.input,'date');const r=await bot.message('a','el martes a las diez');assert.match(r.message,/Te agendamos para/);assert.equal(store.get('a').status,'confirmando_fecha');const s=await bot.message('a','sí');assert.match(s.message,/Así quedaría tu visita/);assert.equal(store.get('a').status,'revisando');await bot.message('a','sí');assert.equal(store.get('a').status,'pendiente_confirmacion');assert.equal(store.get('a').profile.name,'Ana');store.db.close();
});
test('el selector de fecha de la web va directo al resumen y se valida en el servidor',async()=>{
 const {bot,store}=await prepared();await bot.message('a','sí');
 assert.match((await bot.message('a','2020-01-01 10:00')).message,/pasaron/);
 const r=await bot.message('a','2099-10-20 10:00');assert.equal(store.get('a').status,'revisando');assert.deepEqual(r.options,['Sí, todo está bien 💜','Cambiar el día o la hora','Empezar de nuevo']);
 await bot.message('a','cambiar el día o la hora');assert.equal(store.get('a').status,'conversando');store.db.close();
});
test('sin experiencia finaliza sin nombre; consentimiento negativo borra perfil',async()=>{
 const store=new Store(':memory:');const bot=new Bot(store,parseMock,noAI);await bot.message('b','hola');await bot.message('b','Quiero postular 🧵');await bot.message('b','no');assert.equal(store.get('b').status,'sin_experiencia');assert.deepEqual(store.get('b').profile,{});store.db.close();
 const p=await prepared();await p.bot.message('a','no');await p.bot.message('a','no');assert.deepEqual(p.store.get('a').profile,{});p.store.db.close();
});
test('consentimiento afirmativo, pausa y borrado',async()=>{
 const {bot,store}=await prepared();await bot.message('a','ayuda');assert.equal(store.get('a').paused,true);await bot.message('a','Volver a la pregunta');await bot.message('a','no');await bot.message('a','sí');assert.equal(store.get('a').profile.followUpConsent,true);await bot.message('a','borrar mis datos');assert.deepEqual(store.get('a').profile,{});store.db.close();
});
test('recarga no avanza; estado y respuesta de WhatsApp se guardan juntos',async()=>{
 const store=new Store(':memory:');const bot=new Bot(store,parseMock,noAI);await bot.message('a','hola','wa:1');assert.equal(store.delivery('wa:1').sent,false);await bot.message('a','Quiero postular 🧵');await bot.message('a','sí','wa:2');const before=store.get('a');const resumed=await bot.resume('a');assert.match(resumed.message,/llamas/);assert.equal(resumed.input,'text');assert.deepEqual(store.get('a'),before);store.sentDelivery('wa:2');assert.equal(store.delivery('wa:2').sent,true);store.db.close();
});
test('una pregunta libre se responde, se registra y se repite la pregunta pendiente sin avanzar',async()=>{
 const asked=[];const ask=async t=>{asked.push(t);return {answer:'Tenemos 4 sedes 📍',source:'mock',known:true}};
 const store=new Store(':memory:');const bot=new Bot(store,parseMock,ask);await bot.message('web:x','hola');await bot.message('web:x','Quiero postular 🧵');await bot.message('web:x','sí');
 const r=await bot.message('web:x','¿dónde quedan sus locales?');assert.match(r.message,/4 sedes[\s\S]*cómo te llamas/);assert.equal(store.get('web:x').step,2);assert.equal(store.get('web:x').profile.name,undefined);
 // En una pregunta con botones, un texto largo que no es opción también se consulta.
 await bot.message('web:x','Ana');await bot.message('web:x','30');await bot.message('web:x','Cayma');
 const o=await bot.message('web:x','cuanto pagan por hora');assert.deepEqual(o.options,['Sí 😊','Un poco','Todavía no']);
 assert.equal((await bot.message('web:x','sip')).message,'Puedes tocar una opción o escribir su número 😊');
 assert.deepEqual(asked,['¿dónde quedan sus locales?','cuanto pagan por hora']);
 const log=store.recentQuestions();assert.equal(log.length,2);assert.equal(log[0].channel,'web');assert.equal(log[0].text,'cuanto pagan por hora');store.db.close();
});
test('preguntas frecuentes sin IA; IA local solo con lo que sabe; contacto si no sabe o falla',async()=>{
 const kb={nombre:'Rapicostura',contacto:'Nelly al 957 536 688',empresa:'Sedes en Cayma.',faq:[{pregunta:'¿Dónde están sus sedes?',claves:'local ubicacion',respuesta:'En Cayma 📍'},{pregunta:'¿Cuál es el horario?',claves:'turno jornada',respuesta:'Mañana o tarde 😊'}]};
 assert.equal(findFaq('¿Qué horarios tienen?',kb).respuesta,'Mañana o tarde 😊');assert.equal(findFaq('¿aceptan mascotas?',kb),null);
 const fail=async()=>{throw Error('apagado')};
 assert.deepEqual(await askCompany('sedes?',{kb,request:fail}),{answer:'En Cayma 📍',source:'faq',known:true});
 assert.equal((await askCompany('¿aceptan mascotas?',{kb,request:fail})).known,false);assert.match((await askCompany('¿aceptan mascotas?',{kb,request:fail})).answer,/Nelly/);
 let body;const ollama=content=>async(url,opts)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');body=JSON.parse(opts.body);return {ok:true,json:async()=>({message:{content}})}};
 const known=await askCompany('¿Dan capacitación?',{kb,config:{},request:ollama('{"conoce":true,"respuesta":"Sí, capacitamos 💜"}')});assert.deepEqual(known,{answer:'Sí, capacitamos 💜',source:'ollama',known:true});
 assert.equal(body.model,DEFAULT_OLLAMA_MODEL);assert.match(body.messages[0].content,/En Cayma/);assert.equal(body.messages[1].content,'¿Dan capacitación?');
 assert.equal((await askCompany('¿Dan capacitación?',{kb,config:{},request:ollama('{"conoce":false,"respuesta":"Pagamos 5000"}')})).known,false);
 assert.equal((await askCompany('¿Dan capacitación?',{kb,config:{OLLAMA_MODEL:''},request:ollama('{}')})).source,'none');
});
test('IA local interpreta fechas con la fecha de hoy y el servidor la valida',async()=>{
 let body;const request=async(url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({message:{content:'{"date":"2026-10-20","time":"15:00"}'}})}};
 const result=await interpretDate('después del feriado, a media tarde',now,{},request);assert.equal(result.source,'ollama');assert.equal(result.date,'2026-10-20');assert.match(body.messages[0].content,/2026-10-17/);
 const bad=await interpretDate('el domingo en la tarde',now,{},async()=>({ok:true,json:async()=>({message:{content:'{"date":"2026-10-18","time":"15:00"}'}})}));assert.match(bad.error,/domingos/);
});
test('API devuelve fecha válida y siempre se valida fuera del modelo',async()=>{
 const request=async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"date":"2026-10-20","time":"15:00"}'}}]})});
 const result=await interpretDate('el veinte de octubre a las tres de la tarde',now,{GROQ_API_KEY:'mock'},request);assert.equal(result.date,'2026-10-20');assert.equal(result.source,'groq');assert.ok(result.label);
 assert.equal(parseLocal('a media tarde',now),null);
});
test('Gemini recibe solo la frase y valida la respuesta',async()=>{
 let body;const request=async(url,opts)=>{assert.match(url,/generativelanguage\.googleapis\.com/);assert.equal(opts.headers['x-goog-api-key'],'mock');body=JSON.parse(opts.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"date":"2026-10-20","time":"10:00"}'}]}}]})}};
 const result=await interpretDate('el veinte de octubre a las diez',now,{GEMINI_API_KEY:'mock',DATE_AI_PROVIDER:'gemini'},request);assert.equal(result.source,'gemini');assert.equal(result.time,'10:00');assert.equal(body.contents[0].parts[0].text,'el veinte de octubre a las diez');
});
test('Gemini responde preguntas con las instrucciones y la información de la empresa',async()=>{
 const kb={nombre:'Rapicostura',contacto:'Nelly',instrucciones:'Invita siempre a agendar la visita.',empresa:'Sedes en Cayma.',faq:[]};
 let body;const request=async(url,opts)=>{assert.match(url,/models\/gemini-3\.5-flash-lite:generateContent/);assert.equal(opts.headers['x-goog-api-key'],'mock');body=JSON.parse(opts.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"conoce":true,"respuesta":"Estamos en Cayma 💜"}'}]}}]})}};
 const r=await askCompany('¿Dónde quedan?',{kb,config:{GEMINI_API_KEY:'mock'},request});
 assert.deepEqual(r,{answer:'Estamos en Cayma 💜',source:'gemini',known:true});
 assert.match(body.systemInstruction.parts[0].text,/Invita siempre a agendar[\s\S]*Sedes en Cayma/);assert.equal(body.contents[0].parts[0].text,'¿Dónde quedan?');
 assert.equal((await askCompany('¿Dónde quedan?',{kb,config:{GEMINI_API_KEY:'mock'},request:async()=>({ok:false})})).source,'none');
});
test('escribir el número de la única opción también funciona (ej. 1 = Volver a empezar)',async()=>{
 const store=new Store(':memory:');const bot=new Bot(store,parseMock,noAI);await bot.message('c','hola');await bot.message('c','1');await bot.message('c','2');assert.equal(store.get('c').status,'sin_experiencia');
 const r=await bot.message('c','1');assert.match(r.message,/ayudar hoy/);assert.equal(store.get('c').step,0);assert.equal(store.get('c').status,undefined);store.db.close();
});
test('el menú inicial separa postulación y consultas; en consultas responde sin pedir datos',async()=>{
 const asked=[];const ask=async q=>{asked.push(q);return {answer:'Pagamos según el puesto 💜',source:'faq',known:true}};
 const store=new Store(':memory:');const bot=new Bot(store,parseMock,ask);await bot.message('web:c','hola');
 const c=await bot.message('web:c','Hacer consultas 💬');assert.equal(store.get('web:c').status,'consultando');assert.deepEqual(c.options,['Quiero postular 🧵','Volver al menú']);
 const r=await bot.message('web:c','cuanto pagan');assert.match(r.message,/Pagamos según el puesto[\s\S]*otra consulta/);assert.deepEqual(asked,['cuanto pagan']);assert.deepEqual(store.get('web:c').profile,{});
 const p=await bot.message('web:c','Quiero postular 🧵');assert.match(p.message,/experiencia/);assert.equal(store.get('web:c').step,1);assert.equal(store.get('web:c').status,'conversando');
 await bot.message('web:d','hola');await bot.message('web:d','tengo una duda');assert.equal(store.get('web:d').status,'consultando');
 await bot.message('web:d','Volver al menú');assert.equal(store.get('web:d').step,0);assert.equal(store.get('web:d').status,undefined);
 await bot.message('web:e','hola');const w=await bot.message('web:e','quiero trabajar');assert.match(w.message,/experiencia/);
 store.db.close();
});
test('fechas como las dice la gente: completa, por partes y con alternativa si no se puede',async()=>{
 const now=new Date('2026-10-18T15:00:00Z'); // domingo 18, 10:00 en Lima
 const parse=t=>interpretDate(t,now,{OLLAMA_MODEL:''});
 for(const [t,date,time] of [['quiero para las 9 mañana','2026-10-19','09:00'],['para mañana 9am','2026-10-19','09:00'],['mañana 4pm','2026-10-19','16:00'],['el 20 a las 11','2026-10-20','11:00'],['20 de octubre a las 3 de la tarde','2026-10-20','15:00'],['este sábado 10 y media','2026-10-24','10:30'],['el próximo martes al mediodía','2026-10-20','12:00'],['mañana a las 6 de la tarde','2026-10-19','18:00']])
  assert.deepEqual([(await parse(t)).date,(await parse(t)).time],[date,time],t);
 assert.equal(naturalDate({date:'2026-10-19',time:'09:00'},now),'mañana, lunes 19 de octubre, a las 9 de la mañana');
 assert.deepEqual((await parse('el lunes')).partial,{date:'2026-10-19',time:null});assert.deepEqual((await parse('a las 10')).partial,{date:null,time:'10:00'});
 assert.equal((await parse('el domingo a las 10')).suggestion.date,'2026-10-26');assert.equal((await parse('mañana a las 8 de la noche')).suggestion.time,'18:00');
 assert.match((await parse('el 31 de febrero a las 10')).error,/no existe/);
 const store=new Store(':memory:');const bot=new Bot(store,(t,_n,_c,_r,known)=>interpretDate(t,now,{OLLAMA_MODEL:''},undefined,known),noAI);
 await bot.message('f','hola');await bot.message('f','1');await bot.message('f','sí');await bot.message('f','Ana');await bot.message('f','35');await bot.message('f','Cayma');for(let i=0;i<8;i++)await bot.message('f','1');await bot.message('f','4');await bot.message('f','sí');
 assert.match((await bot.message('f','el lunes')).message,/Perfecto, mañana, lunes 19 de octubre! .*A qué hora/);
 assert.match((await bot.message('f','a las 9')).message,/Te agendamos para mañana, lunes 19 de octubre, a las 9 de la mañana/);
 assert.match((await bot.message('f','mejor el domingo a las 10')).message,/domingos descansamos.*Te parece el lunes 26 de octubre a las 10/);
 await bot.message('f','sí');assert.equal(store.get('f').status,'revisando');assert.equal(store.get('f').profile.appointment.label,'lunes 26 de octubre a las 10 de la mañana');
 store.db.close();
});
