import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {validateMap} from '../src/map';
import {validateRule,seal} from '../src/core';
import {ingest,drain,now,type AppEnv} from '../src/meta';

test('button style defaults to quick and rejects over three attached buttons without truncation',()=>{
 const node={id:'start',type:'message',text:'Escolha',choices:Array.from({length:4},(_,i)=>({title:'Opção '+i,next:''}))};
 assert.equal(validateMap({start:'start',nodes:[node]}).nodes[0].replyStyle,'quick');
 assert.throws(()=>validateMap({start:'start',nodes:[{...node,replyStyle:'buttons'}]}),/até 3/);
 assert.equal(node.choices.length,4);
});

for(const style of ['quick','buttons'] as const)test(style+' routes a real click once and ignores wrong users and old clicks',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-09-15',d1Databases:['DB'],bindings:{LICENSE_ENFORCEMENT:'disabled',APP_KEY:'test-key',GRAPH_VERSION:'v25.0'}}));const old=globalThis.fetch;
 try{
 const env=await mf.getBindings<AppEnv>();for(const file of ['0001_initial.sql','0002_conversations.sql','0003_profiles.sql'])for(const sql of readFileSync('migrations/'+file,'utf8').split(';').map(s=>s.trim()).filter(Boolean))await env.DB.prepare(sql).run();
 await env.DB.prepare('INSERT INTO account VALUES(?,?,?,?,?)').bind('12345','test',await seal('fake',env.APP_KEY),now()+86400,now()).run();
 const r=validateRule({name:'Test',trigger:'dm',keywords:'quero',media_id:'',message:'Fluxo',link:'',public_reply:'',active:true,flow:{version:1,allPosts:true,linkEnabled:false,map:{start:'a',nodes:[{id:'a',type:'message',text:'Escolha',replyStyle:style,choices:[{title:'Primeiro',next:'b'},{title:'Segundo',next:'c'}]},{id:'b',type:'message',text:'Caminho um'},{id:'c',type:'message',text:'Caminho dois'}]}}});
 await env.DB.prepare('INSERT INTO rules(id,name,trigger,media_id,keywords,message,link,public_reply,active,created,flow) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind('r',r.name,r.trigger,r.media_id,r.keywords,r.message,r.link,r.public_reply,r.active,now(),r.flow!).run();
 const sends:any[]=[];globalThis.fetch=async(_input,init)=>{if(!init?.body)return Response.json({name:'Teste'});sends.push(JSON.parse(String(init.body)));return Response.json({message_id:'sent'+sends.length});};
 await ingest(env,{object:'instagram',entry:[{id:'12345',messaging:[{sender:{id:'222'},timestamp:Date.now(),message:{mid:'start',text:'quero'}}]}]});await drain(env);
 assert.equal(sends.length,1);const message=sends[0].message;
 if(style==='buttons'){assert.equal(message.attachment.payload.template_type,'button');assert.equal(message.attachment.payload.buttons[1].type,'postback');assert.equal(message.quick_replies,undefined);}else assert.equal(message.quick_replies[1].content_type,'text');
 const payload=style==='buttons'?message.attachment.payload.buttons[1].payload:message.quick_replies[1].payload;
 const click=(user:string,id:string)=>({object:'instagram',entry:[{id:'12345',messaging:[{sender:{id:user},timestamp:Date.now(),...(style==='buttons'?{postback:{mid:id,title:'Segundo',payload}}:{message:{mid:id,text:'Segundo',quick_reply:{payload}}})}]}]});
 await ingest(env,click('333','wrong-user'));await drain(env);assert.equal(sends.length,1);
 const event=click('222','real-click');await ingest(env,event);await drain(env);assert.equal(sends.length,2);assert.equal(sends[1].message.text,'Caminho dois');
 await ingest(env,event);await drain(env);await ingest(env,click('222','old-click'));await drain(env);assert.equal(sends.length,2);
 }finally{globalThis.fetch=old;await mf.dispose();}
});
