(() => {
  'use strict';
  const C = UnhookCore, $ = selector => document.querySelector(selector);
  let settings = C.defaults(), site = 'youtube', toastTimer;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const names = {youtube: 'YouTube', instagram: 'Instagram'};
  const switchHTML = (id, label) => `<label class="switch"><input id="${id}" type="checkbox" aria-label="${label}"><span class="switch-track"></span></label>`;
  $('#app').innerHTML = `<div class="layout"><aside class="side"><div class="brand"><span class="brand-icon" aria-hidden="true">✦</span>unhook all</div><div><p class="eyebrow">Your space</p><nav aria-label="Platforms"><button class="nav-item selected" data-site="youtube">▷ &nbsp; YouTube</button><button class="nav-item" data-site="instagram">◎ &nbsp; Instagram</button></nav></div><div class="side-note"><strong>A little less noise.<br>A lot more intention.</strong><p>Your settings stay on this device.<br>No account. No tracking.</p><span>UNHOOK ALL · 1.1</span></div></aside><main class="main"><div class="topline"><span class="eyebrow">Make room for what matters</span><span class="brand-mini"><b>✦</b>unhook all</span><div class="master"><span>Controls enabled</span>${switchHTML('enabled', 'Enable distraction controls')}</div></div><h1>Your attention, back.</h1><p class="intro">Keep the useful parts. Let the distractions go.<br>Build a quieter corner of the internet.</p><div id="lock-notice" class="lock-notice" hidden>Focus session locked. You can change these settings when the timer ends. This is a self-control aid; Chrome still allows disabling or uninstalling extensions.</div><section class="timer-card" aria-labelledby="timer-title"><div class="timer-heading"><div><span class="eyebrow">A little time for yourself</span><h2 id="timer-title">Find your focus.</h2></div><span class="timer-decoration" aria-hidden="true">◷</span></div><div class="timer-config"><p class="timer-description">Apply your selected controls for a set amount of time.</p><div class="timer-row"><button class="preset selected" data-minutes="25" aria-pressed="true">25 min</button><button class="preset" data-minutes="50" aria-pressed="false">50 min</button><button class="preset" data-minutes="90" aria-pressed="false">90 min</button><input id="minutes" aria-label="Focus duration in minutes" type="number" min="1" max="1440" value="25"><span class="unit">min</span></div><div class="site-checks"><label class="check-label"><input id="timer-youtube" type="checkbox" checked>YouTube</label><label class="check-label"><input id="timer-instagram" type="checkbox" checked>Instagram</label></div><label class="check-label lock-label"><input id="timer-lock" type="checkbox">Lock settings until the timer ends</label><div class="timer-action"><button id="start" class="primary">Start focus session &nbsp; ↗</button><small>Normal mode resumes afterward.</small></div></div><div class="session-view"><div class="countdown" id="countdown" role="timer" aria-label="Focus time remaining"></div><div id="session-detail" class="session-detail"></div><button id="stop" class="secondary">End session</button></div></section><section aria-labelledby="controls-title"><div class="section-title"><h2 id="controls-title">Distraction controls</h2><span id="status" class="status"></span></div><div class="platform-tabs" role="tablist" aria-label="Platform"><button id="tab-youtube" role="tab" aria-controls="platform-panel" aria-selected="true" class="platform-tab selected" data-site="youtube"><span class="site-icon yt" aria-hidden="true">▷</span>YouTube</button><button id="tab-instagram" role="tab" aria-controls="platform-panel" aria-selected="false" class="platform-tab" data-site="instagram"><span class="site-icon ig" aria-hidden="true">◎</span>Instagram</button></div><div id="platform-panel" role="tabpanel" aria-labelledby="tab-youtube"><div class="mode-row"><label for="mode">When to hide distractions<small id="mode-help"></small></label><select id="mode"><option value="always">Always</option><option value="scheduled">On a schedule</option><option value="off">Off</option></select></div><div id="schedule-panel" class="schedule-panel" hidden><h3>Apply all selected controls from X to Y</h3><p class="help">Every control enabled below applies during these windows, then switches off outside them unless a focus timer is running.</p><p class="help" id="timezone"></p><ul id="schedules" class="schedule-list"></ul><form id="schedule-form"><div class="days">${[1,2,3,4,5,6,0].map(day => `<label class="day"><input name="day" type="checkbox" value="${day}" ${day > 0 && day < 6 ? 'checked' : ''}>${dayNames[day]}</label>`).join('')}</div><div class="time-row"><label for="schedule-start">From</label><input id="schedule-start" type="time" value="09:00" aria-label="Schedule start" required><label for="schedule-end">Until</label><input id="schedule-end" type="time" value="17:00" aria-label="Schedule end" required><button class="secondary" type="submit">Add schedule</button></div></form><p class="help" style="margin:12px 0 0">Overnight windows end the next day. Equal start and end times cover the whole selected calendar day.</p></div><div class="features" id="features"></div></div></section><footer class="footer"><span>✧ &nbsp; Saved automatically · Only on this device</span><button class="text-button" id="open-options">Open full settings ↗</button></footer></main></div><div class="toast" role="status" id="toast" hidden></div>`;
  function notify(message) {
    $('#toast').textContent = message; $('#toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
  }
  async function send(message) {
    try {
      const result = await chrome.runtime.sendMessage(message);
      if (!result?.ok) throw new Error(result?.error || 'Could not save. Please reopen the extension.');
      settings = C.normalize((await chrome.storage.local.get('settings')).settings);
      render();
    } catch (error) { notify(error.message); render(); }
  }
  function updateClock() {
    const now = Date.now(), running = settings.session?.endsAt > now;
    $('.timer-config').classList.toggle('hidden', !!running);
    $('.session-view').classList.toggle('running', !!running);
    const locked = C.locked(settings);
    // Unlock immediately by wall time even if Chrome delays its background alarm.
    if ($('#enabled').disabled !== locked) render();
    if (running) {
      const seconds = Math.max(0, Math.ceil((settings.session.endsAt - now) / 1000));
      $('#countdown').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      $('#session-detail').textContent = `${settings.session.sites.map(x => names[x]).join(' + ')} · ${locked ? 'Settings locked' : 'Focus session active'} · Ends ${new Date(settings.session.endsAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    }
    const active = C.active(settings, site);
    $('#status').textContent = active ? 'Active now' : 'Inactive now';
    $('#status').classList.toggle('active', active);
  }
  function render() {
    const focusedId = document.activeElement?.id;
    const s = settings.sites[site], locked = C.locked(settings);
    $('#enabled').checked = settings.enabled;
    $('#enabled').disabled = locked;
    $('#lock-notice').hidden = !locked;
    $('#mode').value = s.mode; $('#mode').disabled = locked;
    $('#mode-help').textContent = {always:'Your selected controls stay on indefinitely.',scheduled:'All selected controls apply only between your chosen start and end times.',off:'Controls apply only during a focus timer.'}[s.mode];
    $('#schedule-panel').hidden = s.mode !== 'scheduled';
    $('#timezone').textContent = `Uses your device’s local time (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`;
    document.querySelectorAll('[data-site]').forEach(button => {
      const selected = button.dataset.site === site;
      button.classList.toggle('selected', selected);
      if (button.getAttribute('role') === 'tab') { button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; }
    });
    $('#platform-panel').setAttribute('aria-labelledby', `tab-${site}`);
    $('#features').replaceChildren();
    for (const [key, title, description] of C.features[site]) {
      const row = document.createElement('div'); row.className = 'feature';
      const text = document.createElement('label'); text.htmlFor = `feature-${key}`;
      const heading = document.createElement('span'); heading.className = 'feature-title'; heading.textContent = title;
      const hint = document.createElement('span'); hint.className = 'feature-description'; hint.id = `hint-${key}`; hint.textContent = description;
      text.append(heading, hint);
      const control = document.createElement('div'); control.innerHTML = switchHTML(`feature-${key}`, title);
      const input = control.querySelector('input'); input.checked = s.features[key]; input.disabled = locked; input.setAttribute('aria-describedby', hint.id);
      input.addEventListener('change', () => send({type:'feature', site, key, value:input.checked}));
      row.append(text, control.firstChild); $('#features').append(row);
    }
    $('#schedules').replaceChildren();
    if (!s.schedules.length) {
      const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = 'No schedules yet. Add a time window below.'; $('#schedules').append(empty);
    }
    for (const schedule of s.schedules) {
      const li = document.createElement('li'); li.className = 'schedule-item';
      const text = document.createElement('div');
      text.textContent = schedule.days.map(d => dayNames[d]).join(', ');
      const time = document.createElement('small'); time.textContent = schedule.start === schedule.end ? 'All day' : `${schedule.start} – ${schedule.end}${schedule.end < schedule.start ? ' (next day)' : ''}`; text.append(time);
      const remove = document.createElement('button'); remove.className = 'remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove schedule ${schedule.start} to ${schedule.end}`); remove.disabled = locked;
      remove.addEventListener('click', () => send({type:'remove-schedule',site,id:schedule.id})); li.append(text,remove); $('#schedules').append(li);
    }
    document.querySelectorAll('#schedule-form input, #schedule-form button, .timer-config input, .timer-config button').forEach(input => {input.disabled = locked;});
    $('#stop').disabled = locked; $('#stop').textContent = locked ? 'Locked until session ends' : 'End session';
    if (focusedId?.startsWith('feature-')) document.getElementById(focusedId)?.focus({preventScroll:true});
    updateClock();
  }
  document.querySelectorAll('[data-site]').forEach(button => button.addEventListener('click', () => {site = button.dataset.site; render();}));
  $('.platform-tabs').addEventListener('keydown', event => {
    if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); site = event.key === 'Home' ? 'youtube' : event.key === 'End' ? 'instagram' : site === 'youtube' ? 'instagram' : 'youtube'; render(); $(`#tab-${site}`).focus();
    }
  });
  $('#enabled').addEventListener('change', event => send({type:'enabled',value:event.target.checked}));
  $('#mode').addEventListener('change', event => send({type:'mode',site,value:event.target.value}));
  function selectPreset() { document.querySelectorAll('[data-minutes]').forEach(button => {const selected = button.dataset.minutes === $('#minutes').value; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected);}); }
  document.querySelectorAll('[data-minutes]').forEach(button => button.addEventListener('click', () => {$('#minutes').value = button.dataset.minutes; selectPreset();}));
  $('#minutes').addEventListener('input', selectPreset);
  $('#start').addEventListener('click', () => {
    if (!$('#minutes').reportValidity()) return;
    send({type:'start',minutes:Number($('#minutes').value),sites:Object.keys(names).filter(key => $(`#timer-${key}`).checked),locked:$('#timer-lock').checked});
  });
  $('#stop').addEventListener('click', () => send({type:'stop'}));
  $('#schedule-form').addEventListener('submit', event => {
    event.preventDefault();
    const schedule = {days:[...document.querySelectorAll('[name=day]:checked')].map(x=>Number(x.value)),start:$('#schedule-start').value,end:$('#schedule-end').value};
    if (!C.validSchedule(schedule)) return notify('Choose at least one day and valid start and end times.');
    send({type:'add-schedule',site,schedule});
  });
  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  if (!document.body.classList.contains('popup')) $('#open-options').hidden = true;
  // Disable edits until stored settings (including a possible lock) have been read.
  document.querySelectorAll('input, select, #start, #stop, #schedule-form button').forEach(el => {el.disabled = true;});
  chrome.storage.local.get('settings').then(({settings:raw}) => {settings = C.normalize(raw);render();setInterval(updateClock,1000);}).catch(error => notify(error.message));
  chrome.storage.onChanged.addListener((changes, area) => {if (area === 'local' && changes.settings) {settings = C.normalize(changes.settings.newValue);render();}});
})();
