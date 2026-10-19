const path=require('node:path');
const base=path.resolve(__dirname,'..');
// Datos de esta instalación; nunca se sirven desde la web ni se incluyen en el ZIP.
process.env.BOT_STATE_DIR=path.join(base,'.local-data','chatbot-qr');
process.env.BOT_DB=path.join(process.env.BOT_STATE_DIR,'rapicostura.sqlite');
process.env.WHATSAPP_AUTH_DIR=path.join(process.env.BOT_STATE_DIR,'whatsapp-auth');
process.env.BOT_APP_DIR=path.join(base,'dist');
process.env.BOT_HOST='127.0.0.1';
process.env.BOT_PORT='8091';
process.env.PORT='8091';
process.env.WHATSAPP_ENABLED='false';
process.env.OLLAMA_MODEL='';
delete process.env.K_SERVICE;
console.log('Panel local: http://127.0.0.1:8091/app/?vista=duena&seccion=chatbot');
import('../integrations/chatbot-server/src/rapicostura/server.js').catch(()=>{console.error('No se pudo iniciar el bot. Revisa que el puerto 8091 esté libre y que las dependencias estén instaladas.');process.exitCode=1});
