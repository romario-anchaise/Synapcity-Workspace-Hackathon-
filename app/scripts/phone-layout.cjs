// Reutiliza los puntos de corte móviles dentro del marco, también en escritorio.
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../dist');
const files=['style','worker','flow','repairs','color','team','owner','profiles','reception','guides','branches'];
const rules=[];
for(const name of files){
  const css=fs.readFileSync(path.join(root,name+'.css'),'utf8');
  const re=/@media\s*([^{}]+)\{/g;let match;
  while((match=re.exec(css))){
    const start=re.lastIndex;let end=start,depth=1;
    for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--}
    if(/max-width/.test(match[1])&&!/min-width/.test(match[1]))rules.push('@container phone '+match[1]+'{'+css.slice(start,end-1)+'}');
    re.lastIndex=end;
  }
}
fs.writeFileSync(path.join(root,'phone-layout.css'),'/* Generado por scripts/phone-layout.cjs. */\n'+rules.join('\n')+'\n');
console.log(rules.length+' reglas móviles adaptadas al ancho del teléfono.');
