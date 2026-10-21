const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../extension/core.js');
const date = (day, time) => new Date(`2026-10-${day}T${time}:00`); // October 19 is Monday.
const week = {days:[1,2,3,4,5],start:'09:00',end:'17:00'};
test('defaults are independent and contain every documented feature', () => {
  const a=C.defaults(), b=C.defaults(); a.sites.youtube.features.home=false;
  assert.equal(b.sites.youtube.features.home,true);
  assert.equal(C.features.youtube.length,24); assert.equal(C.features.instagram.length,8);
});
test('daytime schedules include start and exclude end', () => {
  assert.equal(C.inSchedule(week,date(19,'08:59')),false);
  assert.equal(C.inSchedule(week,date(19,'09:00')),true);
  assert.equal(C.inSchedule(week,date(19,'16:59')),true);
  assert.equal(C.inSchedule(week,date(19,'17:00')),false);
  assert.equal(C.inSchedule(week,date(18,'12:00')),false);
});
test('overnight schedules follow the selected starting day, including Sunday rollover', () => {
  const overnight={days:[0],start:'22:00',end:'06:00'};
  assert.equal(C.inSchedule(overnight,date(18,'22:00')),true);
  assert.equal(C.inSchedule(overnight,date(19,'05:59')),true);
  assert.equal(C.inSchedule(overnight,date(19,'06:00')),false);
  assert.equal(C.inSchedule(overnight,date(18,'05:00')),false);
});
test('equal start and end means a selected full calendar day', () => {
  const full={days:[1],start:'09:00',end:'09:00'};
  assert.equal(C.inSchedule(full,date(19,'00:00')),true);
  assert.equal(C.inSchedule(full,date(19,'23:59')),true);
  assert.equal(C.inSchedule(full,date(20,'08:00')),false);
});
test('active states respect modes, master switch and scoped temporary sessions', () => {
  const s=C.defaults(), now=date(19,'10:00');
  s.sites.youtube.mode='scheduled'; s.sites.youtube.schedules=[week];
  assert.equal(C.active(s,'youtube',now),true);
  s.enabled=false; assert.equal(C.active(s,'youtube',now),false);
  s.session={endsAt:now.getTime()+60000,sites:['youtube'],locked:true};
  assert.equal(C.active(s,'youtube',now),true);
  assert.equal(C.active(s,'instagram',now),false);
  assert.equal(C.locked(s,now.getTime()),true);
  assert.equal(C.active(s,'youtube',new Date(now.getTime()+60000)),false);
  assert.equal(C.locked(s,now.getTime()+60000),false);
});
test('a timer ends back at the underlying permanent or scheduled policy', () => {
  const s=C.defaults(), now=date(19,'10:00');
  s.sites.youtube.mode='off'; s.session={endsAt:now.getTime(),sites:['youtube'],locked:false};
  assert.equal(C.active(s,'youtube',now),false);
  s.sites.youtube.mode='always'; assert.equal(C.active(s,'youtube',now),true);
});
test('normalization rejects malformed schedules and unknown controls', () => {
  const s=C.normalize({sites:{youtube:{mode:'invalid',features:{home:false,unknown:true},schedules:[{...week,start:'25:00'},{...week,days:[7]},week]}},session:{endsAt:'tomorrow',sites:['youtube']}});
  assert.equal(s.sites.youtube.mode,'always'); assert.equal(s.sites.youtube.features.home,false);
  assert.equal(s.sites.youtube.features.unknown,undefined); assert.equal(s.sites.youtube.schedules.length,1);assert.equal(s.session,null);
});
test('routes block direct links without blocking messages or normal videos', () => {
  assert.equal(C.blockedRoute('instagram','/reel/123/',{reels:true}),'Reels');
  assert.equal(C.blockedRoute('instagram','/reels/',{reels:true}),'Reels');
  assert.equal(C.blockedRoute('instagram','/stories/name/123/',{stories:true}),'Stories');
  assert.equal(C.blockedRoute('instagram','/p/123/',{posts:true}),'Posts');
  assert.equal(C.blockedRoute('instagram','/direct/inbox/',{reels:true,stories:true,posts:true}),null);
  assert.equal(C.blockedRoute('youtube','/shorts/123',{shorts:true}),'Shorts');
  assert.equal(C.blockedRoute('youtube','/watch',{shorts:true}),null);
});
test('old settings keep Home redirects off and inconsistent settings keep Subscriptions accessible',()=>{
  const s=C.defaults();delete s.sites.youtube.features.homeRedirect;
  assert.equal(C.normalize(s).sites.youtube.features.homeRedirect,false);
  s.sites.youtube.features.homeRedirect=true;s.sites.youtube.features.subscriptions=true;
  assert.equal(C.normalize(s).sites.youtube.features.subscriptions,false);
});
