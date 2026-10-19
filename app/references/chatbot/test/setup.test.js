import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localRequest} from '../src/rapicostura/setup-routes.js';
import {saveSettings,loadSettings} from '../src/rapicostura/settings.js';
test('panel rechaza conexiones externas, Host ajeno y peticiones de otra página',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:8090',origin:'http://localhost:8090'}};assert.equal(localRequest(req),true);
 assert.equal(localRequest({...req,socket:{remoteAddress:'10.0.0.2'}}),false);
 assert.equal(localRequest({...req,headers:{host:'public.example'}}),false);
 assert.equal(localRequest({...req,headers:{...req.headers,origin:'https://evil.example'}}),false);
});
test('configuración no devuelve la clave, persiste privada y valida proyecto/números',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rapi-settings-'));const path=join(dir,'settings.json');const previous={...process.env};
 try{const result=saveSettings({apiKey:'private-test-key-1234567890',model:'gemini-3.5-flash-lite',phones:'+51999999999'},path);assert.equal(result.geminiConfigured,true);assert.ok(!JSON.stringify(result).includes('private-test'));assert.equal(statSync(path).mode&0o777,0o600);assert.equal(JSON.parse(readFileSync(path)).GEMINI_API_KEY,'private-test-key-1234567890');loadSettings(path);assert.equal(process.env.WHATSAPP_ALLOWED_JIDS,'51999999999@s.whatsapp.net');assert.throws(()=>saveSettings({apiKey:'gen-lang-client-0567376564'},path));assert.throws(()=>saveSettings({phones:'not-a-number'},path));saveSettings({phones:'987654321'},path);assert.equal(process.env.WHATSAPP_ALLOWED_JIDS,'51987654321@s.whatsapp.net');}finally{for(const k of Object.keys(process.env))if(!(k in previous))delete process.env[k];Object.assign(process.env,previous);rmSync(dir,{recursive:true,force:true})}
});
