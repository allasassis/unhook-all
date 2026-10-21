const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../extension/core.js');
function worker(initial=C.defaults()) {
  let settings=structuredClone(initial), listener;
  const chrome={
    runtime:{id:'test',getURL:path=>`chrome-extension://test/${path}`,onMessage:{addListener:fn=>{listener=fn;}},onInstalled:{addListener(){}},onStartup:{addListener(){}}},
    storage:{local:{get:async()=>({settings:structuredClone(settings)}),set:async value=>{settings=structuredClone(value.settings);}}},
    action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'),'utf8'),{chrome,UnhookCore:C,importScripts(){},crypto:require('node:crypto').webcrypto,console});
  return {read:()=>settings, send:(message,sender={id:'test',url:'chrome-extension://test/options.html'})=>new Promise(resolve=>{if(listener(message,sender,resolve)!==true)resolve(undefined);})};
}
test('worker persists a focus timer, rejects early unlock and permits edits after expiry',async()=>{
  const w=worker();
  assert.equal((await w.send({type:'start',minutes:1,sites:['youtube'],locked:true})).ok,true);
  assert.equal(w.read().session.locked,true);
  assert.equal((await w.send({type:'stop'})).ok,false);
  assert.equal((await w.send({type:'enabled',value:false})).ok,false);
  const expired=w.read();expired.session.endsAt=Date.now()-1;
  const restored=worker(expired);
  assert.equal((await restored.send({type:'enabled',value:false})).ok,true);
  assert.equal(restored.read().enabled,false);
});
test('lock is preserved when worker restarts',async()=>{
  const s=C.defaults();s.session={endsAt:Date.now()+60000,sites:['youtube'],locked:true};
  const w=worker(s);
  assert.equal((await w.send({type:'feature',site:'youtube',key:'shorts',value:false})).ok,false);
  assert.equal((await w.send({type:'reset'})).ok,false);
});
test('content scripts cannot modify settings',async()=>{
  const w=worker();
  assert.equal(await w.send({type:'enabled',value:false},{id:'test',tab:{id:1},url:'https://www.youtube.com/'}),undefined);
  assert.equal(w.read().enabled,true);
});
test('concurrent UI edits are serialized without lost updates',async()=>{
  const w=worker();
  const responses=await Promise.all([w.send({type:'feature',site:'youtube',key:'comments',value:true}),w.send({type:'feature',site:'instagram',key:'posts',value:true})]);
  assert.ok(responses.every(x=>x.ok));
  assert.equal(w.read().sites.youtube.features.comments,true);
  assert.equal(w.read().sites.instagram.features.posts,true);
});
test('invalid timer values and empty selections are rejected',async()=>{
  const w=worker();
  for (const minutes of [0,-5,1441,'bad']) assert.equal((await w.send({type:'start',minutes,sites:['youtube']})).ok,false);
  assert.equal((await w.send({type:'start',minutes:25,sites:[]})).ok,false);
  assert.equal(w.read().session,null);
});
test('schedules can be added and removed independently per site',async()=>{
  const w=worker();
  assert.equal((await w.send({type:'add-schedule',site:'instagram',schedule:{days:[1],start:'22:00',end:'06:00'}})).ok,true);
  const id=w.read().sites.instagram.schedules[0].id;
  assert.equal(w.read().sites.youtube.schedules.length,0);
  assert.equal((await w.send({type:'remove-schedule',site:'instagram',id})).ok,true);
  assert.equal(w.read().sites.instagram.schedules.length,0);
});

test('the packaged options page can edit settings when opened in a browser tab',async()=>{
  const w=worker();
  const reply=await w.send({type:'enabled',value:false},{id:'test',tab:{id:2},url:'chrome-extension://test/options.html'});
  assert.equal(reply.ok,true);assert.equal(w.read().enabled,false);
});
test('Home redirect and hiding Subscriptions are mutually exclusive; last choice wins',async()=>{
  const w=worker();
  await w.send({type:'feature',site:'youtube',key:'subscriptions',value:true});
  await w.send({type:'feature',site:'youtube',key:'homeRedirect',value:true});
  assert.equal(w.read().sites.youtube.features.homeRedirect,true);
  assert.equal(w.read().sites.youtube.features.subscriptions,false);
  await w.send({type:'feature',site:'youtube',key:'subscriptions',value:true});
  assert.equal(w.read().sites.youtube.features.homeRedirect,false);
  assert.equal(w.read().sites.youtube.features.subscriptions,true);
});
