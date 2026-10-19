const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'presenter-navigation.js'),'utf8');
function fixture(){
 const moves=[],actions=[],elements={notes:{hidden:false},overview:{hidden:false},notesBtn:{click(){actions.push('notes')}},mapBtn:{click(){actions.push('index')}}};
 const ctx={current:3,slides:Array(10),$:id=>elements[id],go:n=>moves.push(Math.max(0,Math.min(9,n))),fullscreen:()=>actions.push('fullscreen'),document:{addEventListener(_name,fn,options){assert.equal(options.capture,true);ctx.handler=fn}}};vm.createContext(ctx);vm.runInContext(script,ctx);
 const press=(key,{tag='DIV',editing=false,repeat=false,ctrlKey=false,altKey=false,metaKey=false,shiftKey=false}={})=>{
  const e={key,repeat,ctrlKey,altKey,metaKey,shiftKey,target:{tagName:tag,closest(selector){return selector.startsWith('input')?(editing?this:null):(['BUTTON','A','SUMMARY'].includes(tag)?this:null)}},preventDefault(){e.prevented=true},stopPropagation(){e.stopped=true}};ctx.handler(e);return e;
 };
 return {ctx,moves,actions,elements,press};
}
test('PageDown/PageUp y flechas funcionan con foco en video y botones',()=>{
 for(const tag of ['DIV','VIDEO','BUTTON'])for(const [key,n] of [['PageDown',4],['PageUp',2],['ArrowRight',4],['ArrowLeft',2],['ArrowDown',4],['ArrowUp',2]]){
  const f=fixture(),e=f.press(key,{tag});assert.deepEqual(f.moves,[n]);assert.equal(e.prevented,true);assert.equal(e.stopped,true);
 }
});
test('videos en reproducción no bloquean navegación; espacio y Shift+espacio avanzan/retroceden',()=>{
 const f=fixture();f.press(' ',{tag:'VIDEO'});f.press(' ',{tag:'VIDEO',shiftKey:true});assert.deepEqual(f.moves,[4,2]);
});
test('no captura escritura, sliders ni atajos del navegador',()=>{
 const f=fixture();for(const opts of [{editing:true},{ctrlKey:true},{altKey:true},{metaKey:true}]){const e=f.press('ArrowRight',opts);assert.equal(e.prevented,undefined)}assert.deepEqual(f.moves,[]);
});
test('espacio conserva activación nativa en botones y enlaces',()=>{
 const f=fixture();for(const tag of ['BUTTON','A','SUMMARY'])assert.equal(f.press(' ',{tag}).prevented,undefined);assert.deepEqual(f.moves,[]);
});
test('mantener pulsado no salta varias diapositivas',()=>{
 const f=fixture();const e=f.press('PageDown',{repeat:true});assert.equal(e.prevented,true);assert.deepEqual(f.moves,[]);
});
test('primera/última, teclas multimedia y límites se conservan',()=>{
 const f=fixture();for(const key of ['Home','End','MediaTrackNext','MediaTrackPrevious'])f.press(key);assert.deepEqual(f.moves,[0,9,4,2]);f.ctx.current=0;f.press('PageUp');f.ctx.current=9;f.press('PageDown');assert.deepEqual(f.moves.slice(-2),[0,9]);
});
test('notas, índice, pantalla completa y Escape siguen funcionando',()=>{
 const f=fixture();for(const key of ['n','i','f'])f.press(key);assert.deepEqual(f.actions,['notes','index','fullscreen']);f.press('Escape');assert.equal(f.elements.notes.hidden,true);assert.equal(f.elements.overview.hidden,true);
});
