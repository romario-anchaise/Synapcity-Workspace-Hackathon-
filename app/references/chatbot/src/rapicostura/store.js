import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export class Store {
 constructor(file='data/rapicostura.sqlite'){
  if(file!==':memory:')mkdirSync(dirname(file),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(file);
  if(file!==':memory:')chmodSync(file,0o600);
  this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL); CREATE TABLE IF NOT EXISTS deliveries(id TEXT PRIMARY KEY, reply TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS incoming(id TEXT PRIMARY KEY, received TEXT NOT NULL); CREATE TABLE IF NOT EXISTS polls(id TEXT PRIMARY KEY, phone TEXT NOT NULL, secret TEXT NOT NULL, options TEXT NOT NULL, created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY, channel TEXT NOT NULL, text TEXT NOT NULL, answer TEXT NOT NULL, source TEXT NOT NULL, known INTEGER NOT NULL, created TEXT NOT NULL);`);
 }
 delivery(id){const r=this.db.prepare('SELECT reply,sent FROM deliveries WHERE id=?').get(id);return r?{reply:JSON.parse(r.reply),sent:Boolean(r.sent)}:null;}
 saveDelivery(id,reply){this.db.prepare('INSERT INTO deliveries(id,reply,created) VALUES(?,?,?)').run(id,JSON.stringify(reply),new Date().toISOString());}
 sentDelivery(id){this.db.prepare('UPDATE deliveries SET sent=1 WHERE id=?').run(id);}
 commit(id,state,reply,deliveryId){this.db.exec('BEGIN IMMEDIATE');try{this.save(id,state);if(deliveryId)this.saveDelivery(deliveryId,reply);this.db.exec('COMMIT')}catch(err){this.db.exec('ROLLBACK');throw err}}
 get(id){const row=this.db.prepare('SELECT data FROM sessions WHERE id=?').get(id);return row?JSON.parse(row.data):{step:0,profile:{}};}
 save(id,data){this.db.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').run(id,JSON.stringify(data),new Date().toISOString());}
 // Preguntas libres y lo que respondió el bot, para mejorar las preguntas frecuentes desde /setup/.
 logQuestion(channel,text,r){this.db.prepare('INSERT INTO questions(channel,text,answer,source,known,created) VALUES(?,?,?,?,?,?)').run(channel,text,r.answer,r.source,r.known?1:0,new Date().toISOString());}
 recentQuestions(limit=100){return this.db.prepare('SELECT id,channel,text,answer,source,known,created FROM questions ORDER BY id DESC LIMIT ?').all(limit).map(r=>({...r,known:Boolean(r.known)}));}
 // Clave de cada encuesta enviada: se necesita para descifrar el voto, incluso tras reiniciar.
 savePoll(id,phone,secret,options){this.db.prepare('INSERT OR REPLACE INTO polls VALUES(?,?,?,?,?)').run(id,phone,secret,JSON.stringify(options),new Date().toISOString());}
 latestPoll(phone){const r=this.db.prepare('SELECT id,secret,options FROM polls WHERE phone=? ORDER BY created DESC, rowid DESC LIMIT 1').get(phone);return r?{...r,options:JSON.parse(r.options)}:null;}
 clearPolls(phone){this.db.prepare('DELETE FROM polls WHERE phone=?').run(phone);}
 seen(id){return Boolean(this.db.prepare('SELECT id FROM incoming WHERE id=?').get(id));}
 mark(id){this.db.prepare('INSERT OR IGNORE INTO incoming VALUES(?,?)').run(id,new Date().toISOString());}
 purge(){this.db.prepare('DELETE FROM deliveries WHERE created < ?').run(new Date(Date.now()-7*86400000).toISOString());this.db.prepare('DELETE FROM sessions WHERE updated < ?').run(new Date(Date.now()-30*86400000).toISOString());this.db.prepare('DELETE FROM incoming WHERE received < ?').run(new Date(Date.now()-7*86400000).toISOString());this.db.prepare('DELETE FROM polls WHERE created < ?').run(new Date(Date.now()-7*86400000).toISOString());this.db.prepare('DELETE FROM questions WHERE created < ?').run(new Date(Date.now()-30*86400000).toISOString());}
}
