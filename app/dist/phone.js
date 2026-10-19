function scrollAppTop(){main.scrollTo({top:0,behavior:'instant'})}
function updatePhoneClock(){document.getElementById('phone-clock').textContent=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function phoneContext(){
  document.getElementById('phone-role').textContent=currentPerson==='Dueña'?'Dueña':'Trabajadora';
  const site=document.getElementById('phone-site');
  site.textContent=currentPerson==='Dueña'?(ownerBranch==='Todas'?'Todas las sedes':ownerBranch):staffProfile(currentPerson).branch;
  site.setAttribute('aria-label',currentPerson==='Dueña'?'Ver prendas de clientes por sede':'Cambiar mi sede');
}
if(['receive','receipt','envios'].includes(page))page='team';
const beforePhoneRender=render;
render=function(){beforePhoneRender();phoneContext()};
document.getElementById('phone-site').onclick=()=>currentPerson==='Dueña'?ownerNavigate('reception'):chooseStaffBranch();
document.getElementById('phone-caption').textContent='Prototipo interactivo · Trabajadoras, recepción y dueña';
updatePhoneClock();setInterval(updatePhoneClock,60000);render();
