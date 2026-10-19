const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=__dirname;
http.createServer((req,res)=>{
 const original=req.url.startsWith('/original');
 let html=fs.readFileSync(path.join(dir,original?'original.html':'index.html'),'utf8');
 // Solo la vista de prueba carga los recursos existentes del sitio; no se copian videos.
 html=html.replaceAll('src="assets/','src="https://aquamarine-pika-1dbd4a.netlify.app/assets/').replaceAll('poster="assets/','poster="https://aquamarine-pika-1dbd4a.netlify.app/assets/');
 html=html.replace(/<script async src="\/\.netlify\/[\s\S]*?<\/script>/g,'');
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
}).listen(4182,'127.0.0.1',()=>console.log('Prueba de presentación en http://127.0.0.1:4182/'));
