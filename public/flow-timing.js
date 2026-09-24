/* Shared deterministic timing policy. These settings are local drafts until engine integration. */
(function(root){
 const count=text=>Array.from(String(text||'').replace(/\{\{\s*first_name\s*\}\}/g,'Ana').trim()).length;
 const automatic=n=>{
  if(n.mediaType==='audio')return Number.isFinite(n.mediaDuration)&&n.mediaDuration>0?Math.ceil(n.mediaDuration):null;
  if(n.mediaType)return 2;
  return count(n.text)?Math.min(30,Math.max(2,Math.ceil(count(n.text)/12))):0;
 };
 const seconds=n=>n.sendDelay?.mode==='manual'?Math.max(0,Math.min(82800,Math.round(Number(n.sendDelay.seconds)||0))):automatic(n);
 const label=n=>{const s=seconds(n);return s===null?'Aguardando duração do áudio':s===0?'Envio sem pausa':'Enviar após '+s+' s';};
 root.FlowTiming={count,automatic,seconds,label};
})(globalThis);
