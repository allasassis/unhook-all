'use strict';
importScripts('core.js');
const C = UnhookCore;
// Serialize mutations so simultaneous popup and options edits cannot overwrite each other.
let pending = Promise.resolve();
function enqueue(fn) {
  const result = pending.then(fn);
  pending = result.catch(() => {});
  return result;
}
async function state() { return C.normalize((await chrome.storage.local.get('settings')).settings); }
async function refresh() {
  const s = await state();
  const focusing = s.session?.endsAt > Date.now();
  await chrome.action.setBadgeText({text: focusing ? 'ON' : ''});
  await chrome.action.setBadgeBackgroundColor({color: '#326b56'});
  if (focusing) await chrome.alarms.create('session-end', {when: s.session.endsAt});
  else await chrome.alarms.clear('session-end');
}
async function mutate(message) {
  const s = await state();
  const isLocked = C.locked(s);
  if (isLocked) throw new Error('This focus session is locked. Settings unlock when the timer ends.');
  switch (message.type) {
    case 'enabled':
      if (typeof message.value !== 'boolean') throw new Error('Invalid enabled setting.');
      s.enabled = message.value; break;
    case 'feature':
      if (!s.sites[message.site] || !Object.hasOwn(s.sites[message.site].features, message.key) || typeof message.value !== 'boolean') throw new Error('Invalid feature.');
      s.sites[message.site].features[message.key] = message.value;
      if (message.site === 'youtube' && message.value) {
        if (message.key === 'homeRedirect') s.sites.youtube.features.subscriptions = false;
        if (message.key === 'subscriptions') s.sites.youtube.features.homeRedirect = false;
      }
      break;
    case 'mode':
      if (!s.sites[message.site] || !['always', 'scheduled', 'off'].includes(message.value)) throw new Error('Invalid mode.');
      s.sites[message.site].mode = message.value; break;
    case 'add-schedule':
      if (!s.sites[message.site] || !C.validSchedule(message.schedule)) throw new Error('Choose at least one day and valid times.');
      if (s.sites[message.site].schedules.length >= 30) throw new Error('A site can have up to 30 schedules.');
      s.sites[message.site].schedules.push({...message.schedule, id: crypto.randomUUID()}); break;
    case 'remove-schedule':
      if (!s.sites[message.site]) throw new Error('Invalid site.');
      s.sites[message.site].schedules = s.sites[message.site].schedules.filter(x => x.id !== message.id); break;
    case 'start': {
      const duration = Number(message.minutes);
      const sites = [...new Set((Array.isArray(message.sites) ? message.sites : []).filter(x => Object.hasOwn(s.sites, x)))];
      if (!Number.isFinite(duration) || duration < 1 || duration > 1440 || !sites.length) throw new Error('Choose a site and a duration from 1 to 1,440 minutes.');
      if (sites.some(site => !Object.values(s.sites[site].features).some(Boolean))) throw new Error('Enable at least one distraction control for each selected site.');
      s.session = {endsAt: Date.now() + duration * 60000, sites, locked: message.locked === true};
      break;
    }
    case 'stop': s.session = null; break;
    case 'reset': await chrome.storage.local.set({settings: C.defaults()}); await refresh(); return;
    default: throw new Error('Unknown action.');
  }
  await chrome.storage.local.set({settings: C.normalize(s)});
  await refresh();
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  // Only packaged UI pages may change settings, never content scripts or web pages.
  const uiPages = ['popup.html', 'options.html'].map(path => chrome.runtime.getURL(path));
  if (sender.id !== chrome.runtime.id || !uiPages.includes(sender.url?.split(/[?#]/)[0])) return;
  enqueue(() => mutate(message)).then(() => reply({ok: true}), error => reply({ok: false, error: error.message}));
  return true;
});
chrome.runtime.onInstalled.addListener(() => enqueue(async () => {
  await chrome.storage.local.set({settings: await state()});
  await refresh();
}));
chrome.runtime.onStartup.addListener(() => enqueue(refresh));
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== 'session-end') return;
  enqueue(async () => {
    const s = await state();
    if (s.session && s.session.endsAt <= Date.now()) {
      s.session = null;
      await chrome.storage.local.set({settings: s});
    }
    await refresh();
  });
});
refresh().catch(console.error);
