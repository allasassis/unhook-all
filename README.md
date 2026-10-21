# Unhook All

A Chrome Manifest V3 extension for a quieter YouTube and Instagram, with permanent controls, recurring schedules, and focus countdowns. No build step, account, backend, analytics, or runtime dependencies.

## Install in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select this repository's **`extension`** directory (the folder containing `manifest.json`).
4. Refresh any YouTube or Instagram tabs that were already open.
5. Pin **Unhook All** using Chrome's Extensions menu. Click its icon to customize your controls, or choose **Open full settings** for the larger view.

Alternatively, extract `dist/unhook-all.zip` into a folder and select that folder with **Load unpacked**. The ZIP contains the extension files at its root; Chrome does not load ZIPs directly. This project is ready for local installation and has not been published to the Chrome Web Store.

## What you can control

**YouTube:** homepage recommendations; the entire video sidebar or only related videos; Shorts; comments; end-screen suggestions and cards; live chat; playlists; generated mixes; merchandise and offers; video information, action buttons, channel details, and descriptions; the header; notifications; extra search suggestions; Explore and trending; additional YouTube services; subscriptions; autoplay; and annotations. Filters also run on YouTube's privacy-enhanced embeds. These controls were scoped from [Unhook's published feature list](https://chromewebstore.google.com/detail/unhook-remove-youtube-rec/khncfooichmfjbepaaaebmommgaepoid). This is an independent implementation and is not affiliated with Unhook, Google, or Meta.

**Instagram:** homepage feed; all posts (including profile tiles and direct post pages); Reels; Stories and highlights; Explore; suggested accounts; notifications; and identifiable like/view counts. Direct Messages remain accessible. Blocking Reels, Stories, Explore, or YouTube Shorts also covers direct URLs rather than only hiding navigation links. Blocked players are paused.

Controls are independent for each site. The default hides the YouTube home feed, Shorts, related videos, and Explore and disables autoplay. On Instagram, the default hides the home feed, Reels, Stories, Explore, and suggested accounts.

## Choose when controls apply

- **Always:** your enabled controls apply indefinitely.
- **On a schedule:** all enabled controls apply from hour X to hour Y. Add one or more weekly time windows per site. Choose the days, start time, and end time, then click **Add schedule**. With no saved windows, this mode applies no controls outside a focus session.
- **Off:** normal browsing, except during a focus session.

Schedules use the computer's current local time zone and follow daylight saving changes. A Monday 22:00–06:00 window ends on Tuesday morning. Equal start and end times mean the full selected calendar day. Overlapping windows combine.

The **Controls enabled** switch enables/disables the normal Always/Schedule policy for both sites. It does not end a running focus session; use **End session** for that.

## Redirect YouTube Home to Subscriptions

In the YouTube controls, enable **Home → Subscriptions**. This hides Home recommendations and sends direct Home visits, Home navigation clicks, and YouTube logo clicks to `/feed/subscriptions`. Other links keep their normal behavior. You do not need to enable the separate **Home feed** switch; the redirect option also hides the feed itself.

This option uses the site's selected Always/Schedule/Off policy, just like the other controls. For example, choose **On a schedule**, select Monday–Friday, enter **From 09:00 / Until 17:00**, and click **Add schedule**. All enabled YouTube controls, including Home redirection, apply during that window. Choose the Instagram tab to set its hours separately.

Enabling Home redirection turns off hiding Subscriptions so the destination stays accessible. Enabling **Subscriptions** hiding later turns Home redirection off. The redirect is off by default, including for existing installations.

## Focus timer

Choose YouTube, Instagram, or both. Pick a preset or enter **1–1,440 minutes**, then start the session. The selected sites' enabled distraction controls apply until the deadline, including when their normal mode is Off. Enable at least one control per selected site first. When the timer ends, each site returns to its normal Always/Schedule/Off policy. For a purely temporary block, use Off plus a focus timer.

Optionally select **Lock settings until the timer ends** before starting. The extension then rejects settings changes and early cancellation until the stored deadline. The timer and lock survive popup closure and browser restarts, and time continues while the browser is closed. Closing a tab does not reset it. This is a voluntary self-control tool: Chrome still allows disabling or uninstalling the extension, and it does not affect other browsers, incognito unless separately enabled, or native phone apps.

This timer measures elapsed focus time. It is not a daily screen-time allowance or usage counter.

## Privacy and permissions

All settings and the timer deadline are stored in `chrome.storage.local`. No browsing history, messages, or account details are collected or transmitted. There are no network requests from extension code, external assets, or remote scripts.

- `storage`: save settings and deadlines on this device.
- `alarms`: clear expired timers and update the toolbar badge after the popup closes.
- YouTube/Instagram host access: apply page styles and pause blocked players on these sites, including their matching frames.

## Development and checks

Requires Node.js 18+ for checks and Python 3 for packaging. No `npm install` is required.

```sh
npm test
npm run check
npm run package
```

The test suite contains 28 checks covering schedule boundaries, overnight and full-day windows, settings normalization, timer expiry, lock persistence, serialized edits, message authorization, route blocking, page navigation, settings propagation, autoplay behavior, scheduled Home redirects, and redirect conflict handling. Content tests use a minimal document fixture; they do not reproduce the live sites or Chrome's rendering engine.

- `extension/core.js`: feature definitions, settings validation, schedule/session policy, and blocked routes.
- `extension/rules.js`: site-specific CSS selectors.
- `extension/content.js`: live filtering, navigation handling, block screen, and autoplay controls.
- `extension/background.js`: serialized settings writes, lock enforcement, and alarm recovery.
- `extension/ui.js` / `ui.css`: shared popup and full settings interface.
- `scripts/package.py`: produces `dist/unhook-all.zip` using Python's standard library.

## Browser verification and current limits

Automated policy, background, and simulated page tests pass. Live Chrome testing was unavailable in the build environment: no Chrome executable was installed, and fetching a browser-testing package failed due to network restrictions. Exact behavior on current signed-in YouTube and Instagram layouts still needs verification. The sites change their markup frequently; generated layouts, translated labels, and experiments may require selector updates, particularly Instagram's story trays, suggestions, and counts. This extension hides UI rather than filtering network traffic; a brief initial content flash may occur before stored settings load. Browser suspension and throttling may delay visual updates until a tab resumes.

Suggested manual checks after loading:

1. Open YouTube home, a normal video, a Shorts link, a playlist, and search results. Toggle the corresponding controls and confirm each is reversible.
2. Open Instagram home, a profile, a direct post, Reels, Stories, Explore, and Direct Messages. Check that selected distractions disappear and Direct Messages remain accessible.
3. Add a schedule that starts or ends in the next minute; leave the tab open and verify the transition without a refresh. Check an overnight window too.
4. Set a site to Off, start a one-minute timer for it, close the popup, and verify that restrictions end after the deadline.
5. Start a locked one-minute session, open both popup and full settings, and verify that edits are disabled. Restart Chrome during the session and check that the deadline persists.
6. After the timer ends, verify that settings unlock and the underlying site mode resumes.
7. Enable **Home → Subscriptions**. Visit YouTube Home directly and click both Home and the YouTube logo from a video. Verify they open Subscriptions, and test that redirecting follows a scheduled start/end boundary.
