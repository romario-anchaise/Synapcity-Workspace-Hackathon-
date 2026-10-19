(function(root){
  const published=[{
    id:'PUB-TUTORIAL-TALLER-20261018',title:'Tutorial del taller',folder:'costura',
    applies:'Todos los trabajos',goal:'Video de apoyo del taller. Si tienes dudas sobre el proceso, consulta a la dueña.',
    steps:'',mistakes:'',version:1,hidden:false,
    publicUrl:'videos/tutorial-74a0c17251ac.mp4',mediaName:'Tutorial del taller.mp4'
  },{
    id:'PUB-TUTORIAL-TALLER-20261018-02',title:'Tutorial del taller 2',folder:'costura',
    applies:'Todos los trabajos',goal:'Otro video de apoyo del taller. Si tienes dudas sobre el proceso, consulta a la dueña.',
    steps:'',mistakes:'',version:1,hidden:false,
    publicUrl:'videos/tutorial-8c2e92e53423.mp4',mediaName:'Mi video.mp4'
  }];
  function sync(guides,items=published){
    for(const item of items){
      const existing=guides.find(g=>g.id===item.id);
      if(!existing)guides.push({...item,publishedVersion:item.version});
      else if(existing.publicUrl&&(existing.publishedVersion||0)<item.version){
        const hidden=existing.hidden;Object.assign(existing,item,{hidden,publishedVersion:item.version});
      }
    }
  }
  const tutorials={published,sync};
  if(typeof module==='object'&&module.exports)module.exports=tutorials;else root.RapicosturaTutorials=tutorials;
})(typeof globalThis!=='undefined'?globalThis:this);
