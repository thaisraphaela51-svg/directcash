(() => {
 const mediaTypes={image:'imagem',video:'vídeo',audio:'áudio'};
 const safeMedia=url=>{try{const u=new URL(url,location.origin);return u.protocol==='https:'||(u.origin===location.origin&&u.pathname.startsWith('/uploads/'));}catch{return false;}};
 window.flowMediaPreview=(host,type,url)=>{
  if(!url||!safeMedia(url))return;
  const media=el(type==='image'?'img':type);media.className='fp-media';media.src=url;
  if(type==='image'){media.alt='Imagem anexada';media.loading='lazy';}else{media.controls=true;media.preload='metadata';}
  media.addEventListener('error',()=>{media.replaceWith(el('p','Prévia indisponível. Confira o arquivo ou o endereço.','small muted'));},{once:true});host.append(media);
 };
 window.flowAttachmentEditor=(host,n,rerender)=>{
  const box=el('div',null,'fp-upload'),file=el('input'),message=el('p',n.mediaUrl?'Arquivo adicionado. Você pode substituir abaixo.':'Escolha um arquivo do seu dispositivo.','small muted');
  file.type='file';file.hidden=true;file.accept=n.mediaType==='image'?'image/png,image/jpeg,image/webp':n.mediaType==='video'?'video/mp4':'audio/mpeg,audio/mp4,audio/wav,audio/ogg';
  const attach=button('📎 '+(n.mediaUrl?'Trocar ':'Anexar ')+mediaTypes[n.mediaType],()=>file.click(),'gold');
  file.onchange=async()=>{const f=file.files?.[0];if(!f)return;const targetState=mapState;if(f.size>10*1024*1024){message.textContent='Use um arquivo de até 10 MB.';file.value='';return;}attach.disabled=true;attach.textContent='Enviando…';message.textContent=f.name;
   try{const response=await fetch('/api/uploads?kind='+encodeURIComponent(n.mediaType),{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream'},body:f});const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível anexar.');if(mapState!==targetState||!mapState.map.nodes.includes(n))return;remember();n.mediaUrl=result.url;delete n.mediaDuration;rerender();toast('Arquivo anexado.');}
   catch(e){message.textContent=e.message;attach.disabled=false;attach.textContent='Tentar anexar novamente';}finally{file.value='';}
  };
  box.append(attach,file,message,el('small','Até 10 MB. O anexo será hospedado nesta instalação para envio pelo Instagram.','muted'));host.append(box);
  window.flowMediaPreview(host,n.mediaType,n.mediaUrl);
  const details=el('details',null,'fp-link-alternative');details.append(el('summary','Ou usar um link'));const l=el('label','Endereço HTTPS do arquivo'),i=el('input');i.type='url';i.value=n.mediaUrl;i.placeholder='https://…';i.maxLength=500;i.onchange=()=>{if(i.value&&!safeMedia(i.value)){toast('Use um endereço HTTPS para o arquivo.');return;}remember();n.mediaUrl=i.value;delete n.mediaDuration;rerender();};l.append(i);details.append(l);host.append(details);
 };
 function field(host,label,obj,key,rerender,max=80){const l=el('label',label),i=el('input');i.value=obj[key]||'';i.maxLength=max;i.type=key==='url'?'url':'text';if(key==='url')i.placeholder='https://…';let changed=false;i.oninput=()=>{if(!changed){remember();changed=true;}obj[key]=i.value;window.drawFlowConversation($('#fp-map-conversation'));window.drawFlowConversation($('#sf-conversation'));};i.onchange=()=>{changed=false;renderMap();};l.append(i);host.append(l);if(key==='title'||key==='label')window.flowTitleHint?.(i);}
 window.flowButtonEditor=(host,n,rerender)=>{
  const group=el('div',null,'fp-buttons');host.append(group);group.append(el('h3','Botões desta mensagem'));
  const links=n.links||[];
  const refresh=()=>{renderMap();rerender();};
  if(!n.choices.length&&!n.url&&!links.length){group.append(el('p','Escolha o que o botão faz.','small muted'),button('↗ Abrir um link',()=>{remember();n.links=[{title:'',url:''}];refresh();},'outline'),button('⑂ Continuar por uma resposta',()=>{remember();n.choices.push({title:'',next:n.next});n.next='';refresh();},'outline'));return;}
  if(n.choices.length){const styleLabel=el('label','Estilo das respostas'),style=el('select');style.add(new Option('Respostas rápidas','quick'));style.add(new Option('Botões na mensagem (como os de link)','buttons'));style.value=n.replyStyle||'quick';style.onchange=()=>{if(style.value==='buttons'&&n.choices.length>3){style.value=n.replyStyle||'quick';toast('Use até 3 respostas para escolher botões na mensagem. Nenhuma resposta foi removida.');return;}remember();n.replyStyle=style.value;refresh();};styleLabel.append(style);group.append(styleLabel);const limit=n.replyStyle==='buttons'?3:13;group.append(el('p',n.replyStyle==='buttons'?'Até 3 botões presos à mensagem. Cada um continua pelo caminho ligado no mapa.':'⑂ Até 13 respostas rápidas, cada uma com seu caminho.','small muted'));n.choices.forEach((c,i)=>{const row=el('div',null,'fp-button-row');group.append(row);field(row,'Texto da resposta '+(i+1),c,'title',refresh);row.append(button('Remover resposta',()=>{if(c.next){toast('Exclua a conexão desta resposta antes de remover o botão.');return;}remember();n.choices.splice(i,1);refresh();},'subtle'));});if(n.choices.length<limit)group.append(button('+ Resposta',()=>{remember();n.choices.push({title:'',next:''});refresh();},'outline'));group.append(el('small','Para enviar links, adicione uma mensagem de link no próximo passo.','muted'));return;}
  group.append(el('p','↗ Links: cada botão abre o endereço escolhido.','small muted'));
  if(n.url){field(group,'Texto do botão',n,'label',refresh);field(group,'Endereço do botão',n,'url',refresh,500);group.append(button('Remover botão de link',()=>{remember();n.url='';refresh();},'subtle'));}
  links.forEach((link,i)=>{const row=el('div',null,'fp-button-row');group.append(row);field(row,'Texto do botão '+(i+1),link,'title',refresh);field(row,'Endereço do botão',link,'url',refresh,500);row.append(button('Remover botão',()=>{remember();n.links.splice(i,1);refresh();},'subtle'));});
  if(links.length+(n.url?1:0)<3)group.append(button('+ Botão de link',()=>{remember();if(n.url){n.links=[{title:n.label,url:n.url},...links];n.url='';}n.links??=[];n.links.push({title:'',url:''});refresh();},'outline'));
 };
 // Keep all configuration controls, but group them by the order of a new flow.
 const setup=$('.sf-setup'),basics=el('div',null,'fp-basics'),channels=el('div',null,'fp-channels');
 basics.append($('#flow-name').closest('label'),$('#flow-active').closest('label'));
 setup.querySelector('summary').textContent='Configuração do fluxo';setup.querySelector('summary').after(basics);
 channels.append(el('h3','1. Onde a conversa começa'),el('p','Marque um ou vários canais.','small muted'));basics.after(channels);
 const conditions=$('.map-settings');conditions.before(el('h3','2. O que dispara a conversa','fp-condition-title'));
 const previousSync=syncMapSettings;syncMapSettings=function(){previousSync();const picker=$('#map-channel-settings .channel-picker');if(picker){channels.querySelector('.channel-picker')?.remove();channels.append(picker);}const reply=$('#map-channel-settings textarea')?.closest('label');if(reply){let details=$('#fp-replies');if(!details){details=el('details',null,'fp-replies');details.id='fp-replies';details.append(el('summary','Resposta pública no comentário (opcional)'));setup.append(details);}details.replaceChildren(el('summary','Resposta pública no comentário (opcional)'),reply);}else $('#fp-replies')?.remove();};
 const previousEdit=editMap;editMap=function(rule){previousEdit(rule);setup.open=!rule;};
 const inspector=$('.node-inspector'),tabs=el('div',null,'fp-inspector-tabs'),preview=el('div',null,'fp-map-preview');preview.hidden=true;preview.append(el('h3','Prévia da conversa'),el('p','Toque nas respostas para experimentar os caminhos.','small muted'));const conv=el('div');conv.id='fp-map-conversation';preview.append(conv);inspector.prepend(tabs);inspector.append(preview);
 let showingPreview=false;
 function showPreview(value){showingPreview=value;preview.hidden=!value;$('#node-fields').hidden=value;$('#node-title').hidden=value;editButton.classList.toggle('selected',!value);previewButton.classList.toggle('selected',value);if(value)window.drawFlowConversation(conv);}
 const editButton=button('Editar caixa',()=>showPreview(false),'selected'),previewButton=button('Prévia da conversa',()=>showPreview(true),'outline');tabs.append(editButton,previewButton);
 const previousInspector=renderInspector;renderInspector=function(){
  const n=mapState?.map.nodes.find(n=>n.id===selectedNode);
  if(!guidedMode&&n?.type==='message'&&!n.mediaType&&!n.parts?.length){const host=$('#node-fields');host.replaceChildren();$('#node-title').textContent='Enviar mensagem';const l=el('label','Mensagem'),t=el('textarea');t.value=n.text;t.rows=4;t.maxLength=600;let changed=false;t.oninput=()=>{if(!changed){remember();changed=true;}n.text=t.value;renderMap();};t.onblur=()=>changed=false;l.append(t);host.append(l);window.flowButtonEditor(host,n,()=>renderInspector());}else previousInspector();
  if(!guidedMode)showPreview(showingPreview);
 };
 const previousMap=renderMap;renderMap=function(){previousMap();if(showingPreview&&!guidedMode&&mapState)window.drawFlowConversation(conv);};
 const previousMode=setEditorMode;setEditorMode=function(guided){previousMode(guided);tabs.hidden=guided;preview.hidden=guided||!showingPreview;if(guided){$('#node-fields').hidden=false;$('#node-title').hidden=false;}else showPreview(showingPreview);};
 if(mapState){syncMapSettings();renderMap();renderInspector();}
})();
