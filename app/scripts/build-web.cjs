// Empaqueta los archivos locales sin dependencias ni herramientas de compilación externas.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../dist');
const styles=['style','worker','flow','repairs','color','team','owner','profiles','reception','guides','branches','phone-layout','phone','usability','integrated','chatbot-panel'];
const scripts=['branch-catalog','app','repairs','team','owner','profiles','reception','published-guides','guides','branches','phone','usability','integration-model','shipping-module','chatbot-module','chatbot-panel','integrated'];
let css=styles.map(n=>fs.readFileSync(path.join(dir,n+'.css'),'utf8').replace(/@import\s+url\([^)]*\);?/g,'')).join('\n');
// Tipografía local: la carga de la interfaz no espera a un proveedor de fuentes.
css=`@font-face{font-family:Manrope;src:local('Trebuchet MS');font-weight:100 900;font-display:swap}@font-face{font-family:'DM Sans';src:local('Arial');font-weight:100 900;font-display:swap}\n`+css;
let js=scripts.map(n=>{
 let s=fs.readFileSync(path.join(dir,n+'.js'),'utf8');
 // Instala todas las extensiones antes del primer dibujo de pantalla.
 if(n!=='integrated')s=s.replace(/^render\(\);?\s*$/gm,'').replace('setInterval(updatePhoneClock,60000);render();','setInterval(updatePhoneClock,60000);');
 return '// '+n+'.js\n'+s;
}).join('\n;\n');
function writeAsset(label,ext,body){const name=label+'.'+crypto.createHash('sha256').update(body).digest('hex').slice(0,12)+'.'+ext;fs.writeFileSync(path.join(dir,name),body);return name}
const style=writeAsset('web','css',css),script=writeAsset('web','js',js);
let html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
html=html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,'').replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g,'');
if(!html.includes('id="startup-colors"'))html=html.replace('</head>','<style id="startup-colors">html,body{background:#20152c;color:#faf6ff}html{color-scheme:dark}</style></head>');
if(!html.includes('id="native-shell"'))html=html.replace('<head>','<head>\n<script id="native-shell">if(navigator.userAgent.includes("RapicosturaAndroid/"))document.documentElement.classList.add("android-app");</script>');
html=html.replace('</head>',`<link rel="stylesheet" href="${style}"><script defer src="${script}"></script></head>`);
fs.writeFileSync(path.join(dir,'index.html'),html);
console.log('Web preparada: una hoja de estilos y un script; un solo render inicial.');
