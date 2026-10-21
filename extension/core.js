(function (root) {
  'use strict';
  const features = {
    youtube: [
      ['home', 'Home feed', 'Keep the search bar. Lose the endless recommendations.'],
      ['homeRedirect', 'Home → Subscriptions', 'Hide the Home feed and redirect Home visits and clicks to Subscriptions. Turns off hiding Subscriptions.'],
      ['sidebar', 'Video sidebar', 'Hide the entire sidebar beside a video.'],
      ['related', 'Related videos', 'Hide recommendations while keeping playlists and chat.'],
      ['shorts', 'Shorts', 'Hide Shorts shelves and block the Shorts player.'],
      ['comments', 'Comments', 'Leave the conversation out of your watch time.'],
      ['endWall', 'End-screen video wall', 'Hide the suggestions shown when a video ends.'],
      ['endCards', 'End-screen cards', 'Hide clickable video and channel cards.'],
      ['liveChat', 'Live chat', 'Hide live chat and replays.'],
      ['playlist', 'Playlist panel', 'Hide the playlist beside the player.'],
      ['mixes', 'Mix and radio playlists', 'Hide automatically generated mixes.'],
      ['merch', 'Merchandise and offers', 'Hide merchandise, tickets and promotional offers.'],
      ['info', 'Video information', 'Hide the video title and information below the player.'],
      ['buttons', 'Video action buttons', 'Hide likes, share, save and other action buttons.'],
      ['channel', 'Channel and subscribe button', 'Hide the channel details below a video.'],
      ['description', 'Video description', 'Hide the description below the player.'],
      ['header', 'Top header', 'Hide the top navigation, including search.'],
      ['notifications', 'Notification bell', 'Hide notification entry points.'],
      ['searchExtras', 'Extra search suggestions', 'Hide related searches and recommendation shelves in search.'],
      ['explore', 'Explore and trending', 'Hide navigation links and block Explore and trending pages.'],
      ['more', 'More from YouTube', 'Hide the additional YouTube services section.'],
      ['subscriptions', 'Subscriptions', 'Hide the subscriptions link and block the subscriptions feed.'],
      ['autoplay', 'Disable autoplay', 'Switch off the next-video autoplay toggle.'],
      ['annotations', 'Annotations and cards', 'Hide annotation overlays and information cards.']
    ],
    instagram: [
      ['feed', 'Home feed', 'Hide home posts while keeping navigation and messages.'],
      ['posts', 'All posts', 'Hide posts in feeds and profiles; block direct post pages.'],
      ['reels', 'Reels', 'Hide Reels links and grids; block the Reels player.'],
      ['stories', 'Stories and highlights', 'Hide story trays and highlights; block story viewers.'],
      ['explore', 'Explore', 'Hide Explore navigation and block the discovery page.'],
      ['suggested', 'Suggested accounts', 'Hide the suggested accounts sidebar.'],
      ['notifications', 'Notifications', 'Hide notification entry points.'],
      ['counts', 'Like and view counts', 'Hide identifiable like and view count labels.']
    ]
  };
  function defaults() {
    const sites = {};
    for (const site of Object.keys(features)) {
      sites[site] = {mode: 'always', features: Object.fromEntries(features[site].map(([key]) => [key, ['home', 'shorts', 'related', 'feed', 'reels', 'stories', 'explore', 'suggested', 'autoplay'].includes(key)])), schedules: []};
    }
    return {version: 1, enabled: true, sites, session: null};
  }
  function normalize(raw) {
    const out = defaults();
    if (!raw || typeof raw !== 'object') return out;
    out.enabled = raw.enabled !== false;
    for (const site of Object.keys(features)) {
      const s = raw.sites?.[site];
      if (!s) continue;
      if (['always', 'scheduled', 'off'].includes(s.mode)) out.sites[site].mode = s.mode;
      for (const [key] of features[site]) if (typeof s.features?.[key] === 'boolean') out.sites[site].features[key] = s.features[key];
      out.sites[site].schedules = Array.isArray(s.schedules) ? s.schedules.filter(validSchedule).slice(0, 30).map(s => ({id: String(s.id || ''), days: [...new Set(s.days)], start: s.start, end: s.end})) : [];
    }
    // A redirect must never lead to a feed that our own settings block.
    if (out.sites.youtube.features.homeRedirect) out.sites.youtube.features.subscriptions = false;
    const s = raw.session;
    if (s && Number.isFinite(s.endsAt) && Array.isArray(s.sites)) out.session = {endsAt: s.endsAt, sites: s.sites.filter(x => Object.hasOwn(features, x)), locked: s.locked === true};
    return out;
  }
  function validSchedule(s) {
    return s && Array.isArray(s.days) && s.days.length > 0 && s.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6) && [s.start, s.end].every(t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  }
  function minutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
  function inSchedule(s, date = new Date()) {
    if (!validSchedule(s)) return false;
    const now = date.getHours() * 60 + date.getMinutes(), day = date.getDay();
    const start = minutes(s.start), end = minutes(s.end);
    if (start === end) return s.days.includes(day); // Explicit full calendar day.
    if (start < end) return s.days.includes(day) && now >= start && now < end;
    return (s.days.includes(day) && now >= start) || (s.days.includes((day + 6) % 7) && now < end);
  }
  function locked(settings, now = Date.now()) { return !!(settings.session?.locked && settings.session.endsAt > now); }
  function active(settings, site, date = new Date()) {
    const session = settings.session;
    if (session?.endsAt > date.getTime() && session.sites.includes(site)) return true;
    if (!settings.enabled) return false;
    const s = settings.sites[site];
    return s.mode === 'always' || (s.mode === 'scheduled' && s.schedules.some(x => inSchedule(x, date)));
  }
  function blockedRoute(site, pathname, f) {
    if (site === 'youtube') {
      if (f.shorts && /^\/shorts(?:\/|$)/.test(pathname)) return 'Shorts';
      if (f.explore && /^\/feed\/(explore|trending)(?:\/|$)/.test(pathname)) return 'Explore';
      if (f.subscriptions && /^\/feed\/subscriptions(?:\/|$)/.test(pathname)) return 'Subscriptions';
    } else {
      if (f.reels && /^\/reels?(?:\/|$)/.test(pathname)) return 'Reels';
      if (f.stories && /^\/stories(?:\/|$)/.test(pathname)) return 'Stories';
      if (f.explore && /^\/explore(?:\/|$)/.test(pathname)) return 'Explore';
      if (f.posts && /^\/p(?:\/|$)/.test(pathname)) return 'Posts';
    }
    return null;
  }
  const api = {features, defaults, normalize, validSchedule, inSchedule, active, locked, blockedRoute};
  root.UnhookCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
