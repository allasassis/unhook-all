(function(root) {
  'use strict';
  const youtube = {
    home: ['ytd-browse[page-subtype="home"] #contents', 'ytd-browse[page-subtype="home"] #header', 'ytm-browse[tab-identifier="FEwhat_to_watch"]'],
    sidebar: ['ytd-watch-flexy #secondary', 'ytm-watch-next-secondary-results-renderer'],
    related: ['ytd-watch-next-secondary-results-renderer #items > ytd-compact-video-renderer', 'ytd-watch-next-secondary-results-renderer #items > ytd-compact-radio-renderer', 'ytd-watch-next-secondary-results-renderer #items > ytd-item-section-renderer', 'ytm-item-section-renderer[section-identifier="related-items"]'],
    shorts: ['ytd-reel-shelf-renderer', 'ytd-rich-shelf-renderer[is-shorts]', 'ytd-reel-item-renderer', 'ytm-reel-shelf-renderer', 'yt-shorts-lockup-view-model', 'ytd-guide-entry-renderer:has(a[href^="/shorts"])', 'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])', 'ytd-rich-item-renderer:has(a[href^="/shorts/"])', 'a[title="Shorts"]'],
    comments: ['ytd-comments', 'ytm-comment-section-renderer', 'ytm-comments-entry-point-header-renderer'],
    endWall: ['.ytp-endscreen-content', '.html5-endscreen'],
    endCards: ['.ytp-ce-element'],
    liveChat: ['ytd-live-chat-frame', '#chat-container', 'ytm-live-chat-frame'],
    playlist: ['ytd-playlist-panel-renderer', 'ytm-playlist-panel-renderer'],
    mixes: ['ytd-compact-radio-renderer', 'ytd-radio-renderer', 'ytd-rich-item-renderer:has(a[href*="start_radio=1"])', 'ytd-compact-video-renderer:has(a[href*="start_radio=1"])'],
    merch: ['ytd-merch-shelf-renderer', 'ytd-ticket-shelf-renderer', 'ytd-offer-module-renderer', 'ytd-shopping-carousel-renderer', 'ytd-product-shelf-renderer'],
    info: ['ytd-watch-metadata', 'ytm-slim-video-metadata-section-renderer'],
    buttons: ['ytd-watch-metadata #actions', 'ytm-slim-video-action-bar-renderer'],
    channel: ['ytd-watch-metadata #owner', 'ytm-slim-owner-renderer'],
    description: ['ytd-watch-metadata #description', 'ytm-expandable-video-description-body-renderer'],
    header: ['#masthead-container', 'ytm-mobile-topbar-renderer'],
    notifications: ['ytd-notification-topbar-button-renderer'],
    searchExtras: ['ytd-search ytd-shelf-renderer', 'ytd-search ytd-horizontal-card-list-renderer', 'ytd-search ytd-search-refinement-card-renderer', 'ytd-search ytd-reel-shelf-renderer'],
    explore: ['ytd-guide-entry-renderer:has(a[href="/feed/trending"])', 'ytd-guide-entry-renderer:has(a[href="/feed/explore"])', 'ytd-guide-section-renderer:has(a[href="/feed/trending"])', 'a[href="/feed/explore"]', 'a[href="/feed/trending"]'],
    more: ['ytd-guide-section-renderer:has(a[href*="youtube.com/premium"])', 'ytd-guide-section-renderer:has(a[href="/premium"])'],
    subscriptions: ['ytd-guide-entry-renderer:has(a[href="/feed/subscriptions"])', 'ytd-mini-guide-entry-renderer:has(a[href="/feed/subscriptions"])', 'a[href="/feed/subscriptions"]'],
    annotations: ['.annotation', '.ytp-cards-teaser', '.ytp-cards-button', '.iv-branding', '.ytp-paid-content-overlay']
  };
  youtube.homeRedirect = youtube.home;
  const instagram = {
    feed: ['html[data-unhook-home] main article', 'html[data-unhook-home] main [role="main"] article', 'html[data-unhook-home] main div:has(> article)'],
    posts: ['main article', 'main a[href^="/p/"]', 'main a[href*="instagram.com/p/"]'],
    reels: ['a[href="/reels/"]', 'a[href="/reels"]', 'a[href="/reel/"]', 'main a[href^="/reel/"]', 'main a[href$="/reels/"]', 'svg[aria-label="Reels"]'],
    stories: ['main a[href^="/stories/"]', 'main [role="menu"]', 'main [aria-label="Stories"]', 'main [aria-label="Story Highlights"]', 'main [aria-label="Highlights"]', 'main [data-unhook-story-tray]'],
    explore: ['a[href="/explore/"]', 'a[href="/explore"]'],
    suggested: ['html[data-unhook-home] main aside', 'html[data-unhook-home] main [data-unhook-suggestions]'],
    notifications: ['a[href="/accounts/activity/"]', '[role="link"]:has(svg[aria-label="Notifications"])'],
    counts: ['main a[href$="/liked_by/"]', 'main [aria-label$=" likes"]', 'main [aria-label$=" views"]']
  };
  function css(site, features) {
    const rules = site === 'youtube' ? youtube : instagram;
    return Object.entries(rules).filter(([key]) => features[key]).map(([, selectors]) => selectors.join(',\n') + '{display:none!important;}').join('\n');
  }
  root.UnhookRules = {youtube, instagram, css};
  if (typeof module !== 'undefined') module.exports = root.UnhookRules;
})(globalThis);
