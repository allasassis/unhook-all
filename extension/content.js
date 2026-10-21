(() => {
  'use strict';
  const C = UnhookCore;
  const site = /(^|\.)instagram\.com$/.test(location.hostname) ? 'instagram' : 'youtube';
  let settings = C.defaults(), loaded = false, scheduled = false, overlay, shadow, previousBlocked = false, redirecting = false;
  const style = document.createElement('style');
  style.id = 'unhook-all-rules';
  function mount() {
    if (!document.documentElement) return;
    if (!style.isConnected) document.documentElement.append(style);
  }
  function showBlocked(reason) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'unhook-all-block';
      shadow = overlay.attachShadow({mode: 'closed'});
      shadow.innerHTML = `<style>:host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;background:#f5f6f0!important;color:#172c24!important;font:16px/1.6 system-ui,sans-serif!important}section{max-width:440px;padding:36px;text-align:center}span{font-size:38px}h1{font-size:30px;line-height:1.2;margin:18px 0}p{color:#58665e}a{display:inline-block;background:#326b56;color:white;border-radius:30px;text-decoration:none;padding:12px 25px;margin-top:14px}small{display:block;margin-top:24px;color:#58665e}</style><section><span aria-hidden="true">✦</span><h1></h1><p>You chose a little less distraction. Take a breath and get back to what matters.</p><a href="/">Back to home</a><small>Change your controls in the Unhook All extension.</small></section>`;
    }
    shadow.querySelector('h1').textContent = `${reason} is hidden`;
    if (!overlay.isConnected) document.documentElement.append(overlay);
  }
  function markInstagram() {
    // Use stable links and accessible roles rather than Instagram's generated class names.
    document.querySelectorAll('main a[href^="/stories/"]').forEach(link => {
      const tray = link.closest('[role="menu"], [role="list"], section');
      if (tray && !tray.querySelector('article')) tray.setAttribute('data-unhook-story-tray', '');
    });
    document.querySelectorAll('main a[href="/explore/people/"]').forEach(link => {
      const panel = link.closest('aside, section');
      if (panel && !panel.querySelector('article')) panel.setAttribute('data-unhook-suggestions', '');
    });
  }
  function apply() {
    scheduled = false;
    if (!loaded || !document.documentElement) return;
    mount();
    const on = C.active(settings, site);
    const features = on ? settings.sites[site].features : {};
    const path = location.pathname;
    document.documentElement.toggleAttribute('data-unhook-home', path === '/');
    const reason = C.blockedRoute(site, path, features);
    // Hide blocked content beneath the overlay, including after site SPA navigation.
    let css = on ? UnhookRules.css(site, features) : '';
    if (reason) css += '\nhtml > body{visibility:hidden!important}';
    if (style.textContent !== css) style.textContent = css;
    if (site === 'youtube' && features.homeRedirect && path === '/') {
      if (!redirecting) {
        redirecting = true;
        location.replace('/feed/subscriptions');
      }
    } else redirecting = false;
    if (reason) {
      showBlocked(reason);
      document.querySelectorAll('video,audio').forEach(media => { if (!media.paused) media.pause(); });
    } else if (overlay?.isConnected) overlay.remove();
    if (reason && !previousBlocked) document.activeElement?.blur();
    previousBlocked = !!reason;
    if (site === 'youtube' && features.autoplay) {
      // Click only a known enabled toggle. Never toggle an unknown or already-off control.
      const toggle = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"], button[data-tooltip-target-id="ytp-autonav-toggle-button"][aria-checked="true"]');
      if (toggle) toggle.click();
    }
    if (site === 'instagram' && on) markInstagram();
  }
  function queue() { if (!scheduled) { scheduled = true; requestAnimationFrame(apply); } }
  chrome.storage.local.get('settings').then(({settings: raw}) => { settings = C.normalize(raw); loaded = true; apply(); }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) { settings = C.normalize(changes.settings.newValue); loaded = true; apply(); }
  });
  new MutationObserver(records => {
    if (records.some(record => record.target !== style && !style.contains(record.target) && record.target !== overlay && !overlay?.contains(record.target))) queue();
  }).observe(document, {childList: true, subtree: true});
  // Catch Home and logo clicks before YouTube's client-side router handles them.
  document.addEventListener('click', event => {
    if (site !== 'youtube' || !loaded || !C.active(settings, site) || !settings.sites.youtube.features.homeRedirect) return;
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== '/') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign('/feed/subscriptions');
  }, true);
  document.addEventListener('play', event => {
    if (loaded && C.active(settings, site) && C.blockedRoute(site, location.pathname, settings.sites[site].features)) event.target.pause?.();
  }, true);
  document.addEventListener('yt-navigate-finish', queue);
  window.addEventListener('popstate', queue);
  window.addEventListener('pageshow', queue);
  document.addEventListener('visibilitychange', queue);
  // Compare wall time on every tick: schedules and timers recover after suspension.
  setInterval(() => { if (loaded) apply(); }, 1000);
  mount();
})();
