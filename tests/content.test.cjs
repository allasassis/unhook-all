const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../extension/core.js');
const rules = require('../extension/rules.js');
function page(hostname='www.youtube.com', pathname='/watch', initial=C.defaults(), initialTime=Date.now()) {
  const elements=[], intervals=[], storageListeners=[], navigations=[], listeners={};
  let pauses=0, clicks=0, reads=0, now=initialTime;
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  function element(tag) {
    const e={tag,textContent:'',isConnected:false,contains:()=>false,remove(){this.isConnected=false;},setAttribute(){},append(child){child.isConnected=true;elements.push(child);},attachShadow(){
      const title={textContent:''};return {innerHTML:'',querySelector:()=>title};
    }};return e;
  }
  const attrs=new Set(), root=element('html'); root.toggleAttribute=(name,on)=>on?attrs.add(name):attrs.delete(name);
  const document={documentElement:root,activeElement:{blur(){}},createElement:element,addEventListener(name,fn){(listeners[name]??=[]).push(fn);},querySelector(selector){
    if(selector.includes('ytp-autonav')) {reads++;return clicks===0?{click(){clicks++;}}:null;}return null;
  },querySelectorAll(selector){return selector==='video,audio'?[{paused:false,pause(){pauses++;}}]:[];}};
  const location={hostname,pathname,origin:`https://${hostname}`,href:`https://${hostname}${pathname}`,replace:path=>navigations.push(['replace',path]),assign:path=>navigations.push(['assign',path])};
  const chrome={storage:{local:{get:async()=>({settings:initial})},onChanged:{addListener(fn){storageListeners.push(fn);}}}};
  const context={Date:Clock,URL,document,location,chrome,console,MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),setInterval:fn=>{intervals.push(fn);},window:{addEventListener(){}}};
  vm.createContext(context);
  for (const file of ['core','rules','content']) vm.runInContext(fs.readFileSync(require.resolve(`../extension/${file}.js`),'utf8'),context);
  return {elements,root,location,attrs,navigations,click:(href,extra={})=>{
    const link={href:new URL(href,location.origin).href,target:'',hasAttribute:()=>false};
    const event={target:{closest:()=>link},button:0,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
    for(const listener of listeners.click||[])listener(event);
    return event;
  },advance:ms=>{now+=ms;},ready:()=>new Promise(resolve=>setImmediate(resolve)),tick:()=>intervals.forEach(fn=>fn()),change:s=>storageListeners.forEach(fn=>fn({settings:{newValue:s}},'local')),style:()=>elements.find(e=>e.tag==='style'),blocked:()=>elements.some(e=>e.id==='unhook-all-block'&&e.isConnected),pauses:()=>pauses,clicks:()=>clicks,reads:()=>reads};
}
test('content applies filters, updates from storage and clears styles when disabled',async()=>{
  const p=page();await p.ready();
  assert.match(p.style().textContent,/ytd-reel-shelf-renderer/);
  const s=C.defaults();s.enabled=false;p.change(s);
  assert.equal(p.style().textContent,'');
});
test('direct Shorts routes block playback; SPA navigation restores normal content',async()=>{
  const p=page('www.youtube.com','/shorts/123');await p.ready();
  assert.equal(p.blocked(),true);assert.ok(p.pauses()>0);assert.match(p.style().textContent,/visibility:hidden/);
  p.location.pathname='/watch';p.tick();
  assert.equal(p.blocked(),false);assert.doesNotMatch(p.style().textContent,/visibility:hidden/);
});
test('Instagram direct story viewer blocks while direct messages remain accessible',async()=>{
  const p=page('www.instagram.com','/stories/name/123');await p.ready();assert.equal(p.blocked(),true);
  p.location.pathname='/direct/inbox/';p.tick();assert.equal(p.blocked(),false);
});
test('Instagram homepage selectors are scoped so navigating to profiles removes scope',async()=>{
  const p=page('www.instagram.com','/');await p.ready();assert.equal(p.attrs.has('data-unhook-home'),true);
  p.location.pathname='/somebody/';p.tick();assert.equal(p.attrs.has('data-unhook-home'),false);
});
test('expiry removes a temporary route block without relying on background alarm delivery',async()=>{
  const s=C.defaults();s.sites.youtube.mode='off';s.session={endsAt:Date.now()+60000,sites:['youtube'],locked:false};
  const p=page('www.youtube.com','/shorts/123',s);await p.ready();assert.equal(p.blocked(),true);
  p.advance(61000);p.tick();assert.equal(p.blocked(),false);assert.equal(p.style().textContent,'');
});
test('autoplay is turned off only when toggle is enabled and its feature is active',async()=>{
  const p=page();await p.ready();assert.equal(p.clicks(),1);p.tick();assert.equal(p.clicks(),1);
  const s=C.defaults();s.sites.youtube.features.autoplay=false;p.change(s);
  const before=p.reads();p.tick();assert.equal(p.reads(),before);
});
test('every hiding control has a corresponding rule; autoplay is behavioral',()=>{
  for(const site of Object.keys(C.features)) for(const [key] of C.features[site]) {
    if(key==='autoplay')continue;
    assert.ok(rules[site][key]?.length,`${site}.${key} must have selectors`);
    assert.match(rules.css(site,{[key]:true}),/display:none!important/);
  }
});
test('Home redirect hides recommendations on direct entry without a navigation loop',async()=>{
  const s=C.defaults();s.sites.youtube.features.home=false;s.sites.youtube.features.homeRedirect=true;
  const p=page('www.youtube.com','/',s);await p.ready();
  assert.match(p.style().textContent,/ytd-browse\[page-subtype="home"\]/);
  assert.deepEqual(p.navigations,[['replace','/feed/subscriptions']]);
  p.tick();assert.equal(p.navigations.length,1);
  p.location.pathname='/feed/subscriptions';p.tick();assert.equal(p.blocked(),false);
  p.location.pathname='/';p.tick();assert.equal(p.navigations.length,2);
});
test('Home and logo clicks redirect while other links and modified clicks remain unchanged',async()=>{
  const s=C.defaults();s.sites.youtube.features.homeRedirect=true;
  const p=page('www.youtube.com','/watch',s);await p.ready();
  const click=p.click('/?app=desktop');assert.equal(click.prevented,true);assert.equal(click.stopped,true);
  assert.deepEqual(p.navigations,[['assign','/feed/subscriptions']]);
  for(const [href,extra] of [['/watch?v=123',{}],['https://example.com/',{}],['/',{ctrlKey:true}],['/',{metaKey:true}],['/',{button:1}]]) {
    assert.equal(p.click(href,extra).prevented,undefined);
  }
  assert.equal(p.navigations.length,1);
});
test('a scheduled Home redirect starts at X and stops at Y',async()=>{
  const s=C.defaults();s.sites.youtube.mode='scheduled';s.sites.youtube.features.homeRedirect=true;
  s.sites.youtube.schedules=[{days:[1],start:'09:00',end:'17:00'}];
  const p=page('www.youtube.com','/',s,new Date('2026-10-19T08:59:00').getTime());await p.ready();
  assert.equal(p.style().textContent,'');assert.equal(p.navigations.length,0);
  assert.equal(p.click('/').prevented,undefined);
  p.advance(60000);p.tick();assert.equal(p.navigations.length,1);assert.notEqual(p.style().textContent,'');
  p.location.pathname='/watch';p.tick();assert.equal(p.click('/').prevented,true);
  p.advance(8*60*60000);p.tick();assert.equal(p.style().textContent,'');assert.equal(p.click('/').prevented,undefined);
});
test('all selected visual controls apply from X to Y on both sites without reloading',async()=>{
  for(const site of ['youtube','instagram']) {
    const s=C.defaults();s.sites[site].mode='scheduled';
    s.sites[site].features=Object.fromEntries(C.features[site].map(([key])=>[key,true]));
    s.sites[site].schedules=[{days:[1],start:'09:00',end:'17:00'}];
    const normalized=C.normalize(s);
    const p=page(`www.${site}.com`,site==='youtube'?'/watch':'/direct/inbox/',s,new Date('2026-10-19T08:59:00').getTime());await p.ready();
    assert.equal(p.style().textContent,'');p.advance(60000);p.tick();
    assert.equal(p.style().textContent,rules.css(site,normalized.sites[site].features));
    p.advance(8*60*60000);p.tick();assert.equal(p.style().textContent,'');
  }
});
