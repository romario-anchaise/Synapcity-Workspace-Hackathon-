// El presentador debe navegar aunque un video o un botón conserve el foco.
function handlePresenterKeydown(e){
 if(e.key==='Escape'){$('notes').hidden=true;$('overview').hidden=true;return}
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 const target=e.target;
 if(target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"]'))return;
 const nativeControl=target?.closest?.('button,a[href],summary');
 const forward=['ArrowRight','ArrowDown','PageDown','MediaTrackNext'];
 const backward=['ArrowLeft','ArrowUp','PageUp','MediaTrackPrevious'];
 let destination;
 if(forward.includes(e.key))destination=current+1;
 else if(backward.includes(e.key))destination=current-1;
 else if(e.key==='Home')destination=0;
 else if(e.key==='End')destination=slides.length-1;
 else if((e.key===' '||e.key==='Spacebar')&&!nativeControl)destination=current+(e.shiftKey?-1:1);
 if(destination!==undefined){
  e.preventDefault();e.stopPropagation();
  if(!e.repeat)go(destination);
  return;
 }
 if(e.repeat)return;
 if(e.key.toLowerCase()==='n')$('notesBtn').click();
 if(e.key.toLowerCase()==='i')$('mapBtn').click();
 if(e.key.toLowerCase()==='f')fullscreen();
}
document.addEventListener('keydown',handlePresenterKeydown,{capture:true});