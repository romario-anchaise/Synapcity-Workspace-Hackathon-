import {Router} from 'express';
import {randomUUID} from 'node:crypto';

export function serverAddress(config=process.env){
 const port=Number(config.PORT||config.BOT_PORT||8090);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('El puerto del bot no es válido.');
 return {port,host:config.K_SERVICE?'0.0.0.0':config.BOT_HOST||'127.0.0.1'};
}
export function webChatRouter(bot,{config=process.env,uuid=randomUUID}={}){
 const router=Router();
 const allowed=new Set((config.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
 if(config.K_SERVICE&&!allowed.size)throw Error('Configura ALLOWED_ORIGINS para publicar el chat.');
 router.post('/chat',async(req,res,next)=>{try{
  res.set('Cache-Control','no-store');
  const {text}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>500)return res.status(400).json({error:'Escribe un mensaje de hasta 500 caracteres.'});
  const origin=req.headers.origin;
  if(origin){
   let parsed;try{parsed=new URL(origin)}catch{return res.sendStatus(403)}
   const valid=allowed.size?allowed.has(origin):!config.K_SERVICE&&parsed.host===req.headers.host;
   if(!valid)return res.sendStatus(403);
  }
  const cookie=(req.headers.cookie||'').match(/(?:^|;\s*)__session=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:;|$)/);
  const id=cookie?.[1]||uuid();
  if(!cookie)res.cookie('__session',id,{httpOnly:true,sameSite:'strict',secure:config.COOKIE_SECURE==='true'||Boolean(config.K_SERVICE),maxAge:86400000*30,path:'/'});
  res.json(req.body.init===true?await bot.resume('web:'+id):await bot.message('web:'+id,text));
 }catch(error){next(error)}});
 return router;
}
