import { interpretDate, validateDate, naturalDate, dayPhrase, hourPhrase } from './dates.js';
import { askCompany } from './ai.js';
// Los textos siguen el prototipo (index.html de la carpeta superior).
const skill=['Sí 😊','Un poco','Todavía no'];
export const questions=[
 {key:'start',text:'¡Hola! 👋💜 ¡Qué alegría que nos escribas!\nSomos Rapicostura 🧵\n\n¿En qué te podemos ayudar hoy? Puedes responder con los botones de abajo 😊',options:['Quiero postular 🧵','Hacer consultas 💬']},
 {key:'experience',text:'¡Qué alegría que quieras trabajar con nosotros! 💜 Te haremos unas preguntas sencillas 😊\n\n¿Tienes experiencia haciendo arreglos de ropa?',options:['Sí, tengo experiencia 😊','No tengo experiencia']},
 {key:'name',text:'Primero, cuéntanos: ¿cómo te llamas? 😊',input:'text'},
 {key:'age',text:'¿Cuántos años tienes? 😊',input:'number'},
 {key:'zone',text:p=>`¡Mucho gusto, ${p.name}! 💜 ¿En qué distrito de Arequipa vives? 🏡`,input:'text'},
 ...[['recta','🧵','usar la máquina recta industrial'],['remalle','🧵','usar la remalladora'],['recubridora','🧵','usar la recubridora'],['cierres','🪡','colocar cierres en casacas'],['elastico','🪡','colocar elástico en un buzo'],['cuellos','🪡','colocar cuellos básicos'],['punos','🪡','colocar puños y pretinas'],['bolsillos','🪡','armar bolsillos']].map(([key,icon,s])=>({key,text:`${icon} ¿Sabes ${s}?`,options:skill})),
 {key:'branch',text:'¡Qué bueno! ¿Cuál de nuestros locales se acomoda para visitarnos? 📍',options:['Siglo XX · José Luis Bustamante y Rivero','Cerro Colorado','Yanahuara','Cayma','Dolores · José Luis Bustamante y Rivero','No sé cuál me queda cerca']},
 {key:'visit',text:'¿Qué te parece si agendamos una cita para conocernos y conversar sobre lo que sabes hacer? 🧵💜 La visita dura aproximadamente una hora 😊',options:['Sí, agendemos esta cita 💜','No por este momento']},
 {key:'date',text:'¡Nos encantará recibirte! 🥰\nAtendemos de lunes a sábado, de 9 de la mañana a 7 de la tarde.\n\n¿Qué día y a qué hora te queda mejor venir? 📅 Escríbelo como quieras, por ejemplo: “mañana a las 10”.',input:'date'}
];
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
// El selector de la web envía “AAAA-MM-DD HH:mm”: es exacto y no necesita confirmación aparte.
const pickerDate=text=>{const m=text.trim().match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/);return m&&{date:m[1],time:m[2]}};
const say=(q,profile)=>typeof q.text==='function'?q.text(profile):q.text;
// Detecta consultas libres (“¿cuánto pagan?”, “dónde queda”) para responderlas con la información de la empresa.
export function isQuestion(text){return /[?¿]/.test(text)||/^(que|cuanto|cuanta|cuantos|cuantas|donde|como|cuando|cual|cuales|quien|por que|porque|hay|tienen|pagan|dan|puedo|se puede|quisiera saber|quiero saber|informacion|info)\b/.test(norm(text));}
function option(text,items){const n=norm(text);if(/^\d+$/.test(n))return items[Number(n)-1];const exact=items.find(x=>norm(x)===n);if(exact)return exact;if(/^si\b/.test(n))return items.find(x=>norm(x).startsWith('si'));if(/^no\b/.test(n))return items.find(x=>norm(x).startsWith('no'));if(/^cambiar\b/.test(n))return items.find(x=>norm(x).startsWith('cambiar'));if(n==='un poco')return items.find(x=>x==='Un poco');}
const HELP='Puedes tocar un botón para responder o escribir tu respuesta. También puedes escribirnos cualquier pregunta sobre Rapicostura 😊\n\nSi prefieres ayuda de una persona, el contacto es Nelly Chávez: 957 536 688 💜';
const PAUSED='Cuando quieras, toca “Volver a la pregunta” para seguir 💜';
const ENDED=['sin_experiencia','finalizado','pendiente_confirmacion'];
const confirmOptions=['Sí, está bien 💜','Cambiar el día o la hora'];
const reviewOptions=['Sí, todo está bien 💜','Cambiar el día o la hora','Empezar de nuevo'];
// Modo consultas: cualquier mensaje se responde con la información de la empresa, sin pedir datos.
const consultOptions=['Quiero postular 🧵','Volver al menú'];
const CONSULT='Escríbenos tu consulta 😊 Te respondemos con gusto 💬';
const WELCOME=questions[0].text+'\n\nUsaremos tus respuestas solo para atenderte. Puedes escribir “ayuda” o “borrar mis datos” cuando quieras.';
const consentOptions=['Sí, pueden guardar mis datos 💜','No, gracias'];
const summary=p=>`¡Ya casi estamos, ${p.name}! 🥰\n\nAsí quedaría tu visita a Rapicostura:\n\n👤 Tu nombre: ${p.name}\n🎂 Tu edad: ${p.age} años\n🏡 Vives en: ${p.zone}\n📍 Nos visitarías en: ${p.branch}\n📅 Día y hora: ${p.appointment.label}\n\n¿Está todo bien? 💜`;
export class Bot {
 constructor(store,parse=interpretDate,ask=askCompany){this.store=store;this.parse=parse;this.askAI=ask;this.locks=new Map();}
 // Lo que el bot está esperando ahora; sirve para retomar y para repetir la pregunta tras una consulta.
 prompt(s){
  if(s.status==='confirmando_fecha')return {message:`¿Te agendamos para ${naturalDate(s.profile.appointment)}? 📅💜`,options:confirmOptions};
  if(s.status==='revisando')return {message:summary(s.profile),options:reviewOptions};
  if(s.status==='consentimiento')return {message:'¿Quieres que guardemos tus datos para comunicarnos contigo más adelante? 💜',options:consentOptions};
  if(s.status==='consultando')return {message:CONSULT,options:consultOptions};
  if(ENDED.includes(s.status))return {message:'Gracias por conversar con nosotros 💜 Si quieres, podemos volver a empezar.',options:['Volver a empezar']};
  const q=questions[s.step];return q?{message:say(q,s.profile),options:q.options||[],input:q.input}:{message:'Tu solicitud está guardada 💜',options:[]};
 }
 async resume(id){const s=this.store.get(id);if(!s.started)return this.message(id,'hola');const status=s.status||'conversando';if(s.paused)return {message:PAUSED,options:['Volver a la pregunta'],status};return {...this.prompt(s),status};}
 async ask(id,text){const r=await this.askAI(text);this.store.logQuestion(id.split(':')[0],text,r);return r.answer;}
 async message(id,text,deliveryId){const previous=this.locks.get(id)||Promise.resolve();const task=previous.catch(()=>{}).then(()=>this.handle(id,text,deliveryId));this.locks.set(id,task);try{return await task}finally{if(this.locks.get(id)===task)this.locks.delete(id)}}
 async handle(id,text,deliveryId){let state=this.store.get(id);
  // Un número elige la opción mostrada en cualquier estado (WhatsApp las numera).
  if(/^\s*\d+\s*$/.test(text)&&state.started){const shown=state.paused?['Volver a la pregunta']:this.prompt(state).options;const picked=shown[Number(text)-1];if(picked)text=picked;}
  const reply=(message,options=[])=>{const status=state.status||'conversando';const output={message,options,status};const input=questions[state.step]?.input;if(!options.length&&status==='conversando'&&!state.paused&&input)output.input=input;this.store.commit(id,state,output,deliveryId);return output};
  // Responde la consulta y vuelve a lo que estaba pendiente.
  const answerThen=async p=>reply(`${await this.ask(id,text)}\n\n${p.message}`,p.options);
  const unmatched=p=>isQuestion(text)||text.trim().split(/\s+/).length>3?answerThen(p):reply('Puedes tocar una opción o escribir su número 😊',p.options);
  const q=questions[state.step];const n=norm(text);
  // Convierte lo que entendió de la fecha en la respuesta: confirmar, proponer otra o preguntar lo que falta.
  const dateReply=(d,exact)=>{
   if(d.date&&d.time&&!d.error){delete state.profile.pendingDate;state.profile.appointment=d;state.status=exact?'revisando':'confirmando_fecha';const p=this.prompt(state);return reply(p.message,p.options)}
   if(d.suggestion){delete state.profile.pendingDate;state.profile.appointment=d.suggestion;state.status='confirmando_fecha';return reply(`${d.error} ¿Te parece ${naturalDate(d.suggestion)}? 📅`,confirmOptions)}
   if(d.partial?.date){state.profile.pendingDate=d.partial;const day=dayPhrase(d.partial.date).replace(/,$/,'');return reply(d.period==='tarde'?`¡Perfecto, ${day}! 😊 ¿A qué hora de la tarde? Te podemos recibir hasta las 6.`:d.period==='manana'?`¡Perfecto, ${day}! 😊 ¿A qué hora de la mañana? Abrimos a las 9.`:`¡Perfecto, ${day}! 😊 ¿A qué hora te queda mejor? Te podemos recibir de 9 de la mañana a 6 de la tarde.`)}
   if(d.partial?.time){state.profile.pendingDate=d.partial;return reply(`¡Genial, ${hourPhrase(d.partial.time)}! 😊 ¿Qué día te queda mejor? Atendemos de lunes a sábado.`)}
   if(d.partialSuggestion){state.profile.pendingDate=d.partialSuggestion;return reply(`${d.error} ¿Te parece ${dayPhrase(d.partialSuggestion.date).replace(/,$/,'')}? Dime a qué hora 😊`)}
   return null;
  };
  if(['reiniciar','volver a empezar','empezar de nuevo'].includes(n)){state={step:0,profile:{},started:true};return reply(WELCOME,questions[0].options)}
  if(n==='borrar mis datos'){state={step:0,profile:{},status:'borrado'};return reply('Hemos borrado los datos de tu conversación 💜 Puedes escribir “volver a empezar” cuando quieras.');}
  if(['ayuda','necesito ayuda','nelly'].includes(n)){state.paused=true;return reply(HELP,['Volver a la pregunta']);}
  if(state.paused){
   if(n!=='continuar'&&n!=='volver a la pregunta')return isQuestion(text)?answerThen({message:PAUSED,options:['Volver a la pregunta']}):reply(PAUSED,['Volver a la pregunta']);
   state.paused=false;const p=this.prompt(state);return reply(p.message,p.options);
  }
  if(!state.started){state={step:0,profile:{},started:true};return reply(WELCOME,questions[0].options)}
  if(state.status==='consultando'){
   const v=option(text,consultOptions);
   if(v===consultOptions[0]){state.status='conversando';state.step=1;return reply(questions[1].text,questions[1].options)}
   if(v===consultOptions[1]||n==='menu'){state={step:0,profile:{},started:true};return reply(questions[0].text,questions[0].options)}
   return answerThen({message:'¿Tienes otra consulta? Escríbela cuando quieras 💬',options:consultOptions});
  }
  if(ENDED.includes(state.status))return isQuestion(text)?answerThen({message:'¿Te ayudamos en algo más? 💜',options:['Volver a empezar']}):reply('Gracias por conversar con nosotros 💜 Puedes escribir “volver a empezar”, “ayuda” o “borrar mis datos”.',['Volver a empezar']);
  if(state.status==='consentimiento'){
   const v=option(text,consentOptions);if(!v)return unmatched(this.prompt(state));
   state.status='finalizado';if(v.startsWith('Sí')){state.profile.followUpConsent=true;state.profile.consentAt=new Date().toISOString();return reply('¡Gracias por permitirnos contactarte más adelante! 💜 Nos encantará conversar contigo en otro momento.\n\nPuedes pedirnos borrarlos escribiendo “borrar mis datos”.',['Volver a empezar']);}
   state.profile={};return reply('Gracias por conversar con nosotros 💜 No guardaremos tus datos para contactarte después. Cuando quieras retomar, aquí estaremos 🧵😊',['Volver a empezar']);
  }
  if(state.status==='confirmando_fecha'){
   const v=option(text,confirmOptions);
   // Si en vez de “sí” escribe otra fecha (“mejor el martes a las 11”), se propone esa.
   if(!v){const picked=pickerDate(text);const d=picked?validateDate(picked):await this.parse(text);if(d.date||d.suggestion||d.partial){state.status='conversando';delete state.profile.appointment;return dateReply(d,picked)}return unmatched(this.prompt(state))}
   if(v!==confirmOptions[0]){state.status='conversando';delete state.profile.appointment;delete state.profile.pendingDate;return reply('¡Claro! 😊 ¿Qué día y a qué hora te queda mejor?')}
   const checked=validateDate(state.profile.appointment);if(checked.error){state.status='conversando';return reply(checked.error)}
   state.profile.appointment=checked;state.status='revisando';return reply(summary(state.profile),reviewOptions);
  }
  if(state.status==='revisando'){
   const v=option(text,reviewOptions);if(!v)return unmatched(this.prompt(state));
   if(v!==reviewOptions[0]){state.status='conversando';delete state.profile.appointment;return reply(questions.at(-1).text)}
   state.status='pendiente_confirmacion';return reply(`¡Te esperamos, ${state.profile.name}! 🥰🧵\n\nNos dará mucha alegría conocerte y compartir contigo nuestra pasión por la costura. ¡Gracias por querer ser parte de nuestra familia Rapicostura! 💜\n\nTu solicitud está guardada. El equipo te confirmará la cita por este medio.`,['Volver a empezar']);
  }
  const current={message:say(q,state.profile),options:q.options||[]};
  if(q.key==='start'){
   // También entiende la intención escrita: “quiero trabajar”, “tengo una duda”.
   const v=option(text,q.options)||(/postul|trabaj|empec|costur|empleo|chamba/.test(n)?q.options[0]:/consult|duda|pregunt|informa/.test(n)?q.options[1]:null);
   if(v===q.options[1]){state.status='consultando';return isQuestion(text)?answerThen(this.prompt(state)):reply(CONSULT,consultOptions)}
   if(v===q.options[0]){state.step++;return reply(questions[state.step].text,questions[state.step].options)}
   // Tras responder, no se repite el saludo entero: basta con recordar las dos opciones.
   if(isQuestion(text)||text.trim().split(/\s+/).length>3)return answerThen({message:'¿Quieres postular o tienes otra consulta? 😊',options:q.options});
   return reply('Puedes tocar una opción o escribir su número 😊',current.options);
  }
  if(q.key==='date'){
   const picked=pickerDate(text);
   const d=picked?validateDate(picked):await this.parse(text,undefined,undefined,undefined,state.profile.pendingDate||{});
   const r=dateReply(d,picked);if(r)return r;
   if(d.none&&isQuestion(text))return answerThen(current);
   return reply(d.error);
  }
  let value=text.trim();
  if(q.options){value=option(value,q.options);if(!value)return unmatched(current)}
  else if(isQuestion(text))return answerThen(current);
  if(q.key==='experience'&&value.startsWith('No')){state.profile={};state.status='sin_experiencia';return reply('¡Gracias por tu interés en nuestra familia textil! 💜\n\nEn esta oportunidad buscamos costureras con experiencia en arreglos de ropa.\n\nTe agradecemos que hayas conversado con nosotros 🧵🤗',['Volver a empezar']);}
  if(q.key==='age'&&(!/^\d{1,3}$/.test(value)||Number(value)<1||Number(value)>120))return reply('Escribe tu edad en números, por ejemplo: 35 😊');
  if(q.key==='visit'&&value.startsWith('No')){state.status='consentimiento';return reply('Está bien, podemos esperar a otro momento 😊💜\n\n¿Quieres que guardemos tus datos para comunicarnos contigo más adelante?',consentOptions);}
  state.profile[q.key]=value;state.step++;const next=questions[state.step];return reply(say(next,state.profile),next.options);
 }
}
