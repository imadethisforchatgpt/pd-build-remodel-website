/* P&D site | 2026-10-09 audited build
   Independent components; one animation controller; no animation hides content at rest. */
(function () {
  'use strict';
  if (window.PD_SITE) return;
  var root = document.documentElement;
  var state = { version: '2026.10.09-audit-1', scripts: 'starting', engine: 'none', revealed: 0, active: 0, reduced: false, paused: false, errors: [] };
  var motion = null;
  function report(component, error) {
    state.errors.push(component + ': ' + String(error && error.message || error));
    if (window.console) console.warn('[P&D ' + component + ']', error);
    updateStatus();
  }
  function updateStatus() {
    var status = document.getElementById('preview-status');
    var allowed = !!motion && !state.reduced && !state.paused && state.engine !== 'unavailable';
    if (status) {
      var text = 'Scripts are running. ';
      if (state.errors.length) text += 'A component needs attention; content remains visible. See the browser console.';
      else if (state.reduced) text += 'Reduced Motion is enabled. Movement is intentionally off; nothing is broken.';
      else if (state.paused) text += 'Animations are paused with the site control.';
      else if (state.engine === 'unavailable') text += 'This viewer does not provide the animation API. Photos remain available.';
      else text += 'Animation engine ready. Scroll to reveal sections, or replay the visible area.';
      status.textContent = text;
      status.dataset.state = allowed ? 'ready' : 'paused';
    }
    document.querySelectorAll('[data-replay-motion]').forEach(function (b) { b.disabled = !allowed; });
    document.querySelectorAll('[data-toggle-motion]').forEach(function (b) {
      b.disabled = !motion || state.reduced || state.engine === 'unavailable';
      b.textContent = state.reduced ? 'Reduced motion enabled' : state.paused ? 'Enable animations' : 'Pause animations';
      b.setAttribute('aria-pressed', String(state.paused || state.reduced));
    });
  }
  function initMotion() {
    var media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    state.reduced = !!(media && media.matches);
    try { state.paused = localStorage.getItem('pd-motion-paused-v1') === 'true'; } catch (_) { /* Restricted file views may disallow storage. */ }
    root.classList.toggle('motion-paused', state.paused || state.reduced);
    var targets = Array.from(document.querySelectorAll('[data-motion]'));
    var done = new WeakSet();
    var waiting = new WeakSet();
    var active = new Map();
    var observer = null;
    var pending = false;
    var usable = typeof Element.prototype.animate === 'function';
    state.engine = usable ? ('IntersectionObserver' in window ? 'observer' : 'scroll-fallback') : 'unavailable';
    function allowed() { return usable && !state.paused && !state.reduced && document.visibilityState !== 'hidden'; }
    function inView(el) {
      if (!el.isConnected || el.closest('[hidden],.photo-modal') || !el.getClientRects().length) return false;
      var r = el.getBoundingClientRect();
      var h = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < h - 28 && r.width > 0 && r.height > 0;
    }
    function clearAnimation(el, animation) {
      if (active.get(el) !== animation) return;
      active.delete(el);
      el.style.removeProperty('will-change');
      state.active = active.size;
    }
    function cancelAll() {
      active.forEach(function (animation, el) {
        animation.cancel();
        el.style.removeProperty('will-change');
      });
      active.clear();
      state.active = 0;
    }
    function imageReady(el) {
      var images = el.matches('img') ? [el] : Array.from(el.querySelectorAll('img'));
      var pendingImages = images.filter(function (img) { return !img.complete; });
      if (!pendingImages.length) return true;
      if (!waiting.has(el)) {
        waiting.add(el);
        pendingImages.forEach(function (img) {
          function loaded() {
            img.removeEventListener('load', loaded);
            img.removeEventListener('error', loaded);
            waiting.delete(el);
            schedule();
          }
          img.addEventListener('load', loaded, { once: true });
          img.addEventListener('error', loaded, { once: true });
        });
      }
      return false;
    }
    function play(el, replay) {
      if (!allowed() || !inView(el) || (!replay && done.has(el)) || !imageReady(el)) return;
      if (active.has(el)) active.get(el).cancel();
      var kind = el.dataset.motion;
      var delay = replay ? 0 : Math.min(Number(el.dataset.delay) || 0, 160);
      var frames, duration = 850;
      if (kind === 'heading') {
        frames = [{ opacity: .2, transform: 'translate3d(0,46px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }];
      } else if (kind === 'photo') {
        /* A visible image throughout, with a cinematic settle instead of a brittle curtain mask. */
        frames = [{ opacity: .38, transform: 'translate3d(0,22px,0) scale(.985)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }];
        duration = 1050;
      } else if (kind === 'hero') {
        frames = [{ transform: 'scale(1.035)' }, { transform: 'scale(1)' }];
        duration = 1800;
      } else if (kind === 'copy') {
        frames = [{ opacity: .45, transform: 'translate3d(0,18px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }];
        duration = 750;
      } else {
        frames = [{ opacity: .3, transform: 'translate3d(0,30px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }];
        duration = 900;
      }
      try {
        el.style.willChange = 'transform, opacity';
        var animation = el.animate(frames, { id: 'pd-' + kind, duration: duration, delay: delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        active.set(el, animation);
        state.active = active.size;
        if (!done.has(el)) { state.revealed += 1; done.add(el); }
        el.dataset.motionPlayed = 'true';
        animation.onfinish = function () { clearAnimation(el, animation); };
        animation.oncancel = function () { clearAnimation(el, animation); };
        if (observer) observer.unobserve(el);
      } catch (error) {
        el.style.removeProperty('will-change');
        done.add(el); // Avoid repeated errors; the base content is already visible.
        report('animation', error);
      }
    }
    function scan() {
      pending = false;
      if (!allowed()) return;
      targets.forEach(function (el) { if (!done.has(el)) play(el, false); });
    }
    function schedule() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(scan);
    }
    if (usable && 'IntersectionObserver' in window) {
      try {
        observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.isIntersecting) play(entry.target, false); });
        }, { root: null, rootMargin: '0px 0px -28px 0px', threshold: .01 });
        targets.forEach(function (el) { observer.observe(el); });
      } catch (error) {
        state.engine = 'scroll-fallback';
        observer = null;
      }
    }
    if (usable && !observer) window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    window.addEventListener('pageshow', schedule);
    window.addEventListener('pagehide', cancelAll);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') cancelAll();
      else schedule();
    });
    function preferenceChanged() {
      state.reduced = !!(media && media.matches);
      root.classList.toggle('motion-paused', state.paused || state.reduced);
      if (state.reduced || state.paused) cancelAll();
      else schedule();
      updateStatus();
    }
    if (media) {
      if (media.addEventListener) media.addEventListener('change', preferenceChanged);
      else if (media.addListener) media.addListener(preferenceChanged);
    }
    window.requestAnimationFrame(function () { window.requestAnimationFrame(schedule); });
    return {
      scan: schedule,
      cancel: cancelAll,
      replay: function () { if (allowed()) targets.forEach(function (el) { play(el, true); }); },
      setPaused: function (pause) {
        state.paused = !!pause;
        try { localStorage.setItem('pd-motion-paused-v1', String(state.paused)); } catch (_) {}
        preferenceChanged();
      }
    };
  }
  function initFilters() {
    var chips = Array.from(document.querySelectorAll('.filter-chip'));
    var cards = Array.from(document.querySelectorAll('.showroom-card'));
    var count = document.getElementById('showroom-count');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var selected = chip.dataset.filter;
        var visible = 0;
        chips.forEach(function (c) {
          var on = c === chip;
          c.setAttribute('aria-pressed', String(on));
          c.classList.toggle('is-active', on);
        });
        cards.forEach(function (card) {
          card.hidden = selected !== 'all' && !(card.dataset.category || '').split(/\s+/).includes(selected);
          if (!card.hidden) visible += 1;
        });
        if (count) count.textContent = visible + (visible === 1 ? ' project view shown' : ' project views shown');
        if (motion) motion.scan();
      });
    });
  }
  function initPhotoViewer() {
    var modals = Array.from(document.querySelectorAll('.photo-modal'));
    var active = null;
    var origin = null;
    var locked = [];
    function getFromHash() {
      var id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return null; }
      return modals.find(function (m) { return m.id === id; }) || null;
    }
    function setHash(id, push) {
      try {
        var next = id ? '#' + id : location.pathname + location.search;
        if (push) history.pushState({ pdPhoto: id }, '', next);
        else history.replaceState(history.state, '', next);
      } catch (_) { location.hash = id || ''; }
    }
    function lockBackground() {
      if (locked.length) return;
      Array.from(document.body.children).forEach(function (el) {
        if (!el.matches('header,main,footer,.mobile-cta,.preview-tools,.skip-link')) return;
        locked.push({ el: el, inert: el.inert, aria: el.getAttribute('aria-hidden') });
        el.inert = true;
        el.setAttribute('aria-hidden', 'true');
      });
      document.body.classList.add('modal-open');
    }
    function unlockBackground() {
      locked.forEach(function (item) {
        item.el.inert = item.inert;
        if (item.aria === null) item.el.removeAttribute('aria-hidden');
        else item.el.setAttribute('aria-hidden', item.aria);
      });
      locked = [];
      document.body.classList.remove('modal-open');
    }
    function activate(modal) {
      if (active && active !== modal) {
        active.classList.remove('is-open');
        active.removeAttribute('aria-modal');
      }
      active = modal;
      active.classList.add('is-open');
      active.setAttribute('aria-modal', 'true');
      lockBackground();
      if (motion) motion.cancel();
      var index = modals.indexOf(modal);
      var counter = modal.querySelector('.modal-count');
      if (counter) counter.textContent = (index + 1) + ' / ' + modals.length;
      modal.querySelector('[data-photo-step="-1"]').disabled = index === 0;
      modal.querySelector('[data-photo-step="1"]').disabled = index === modals.length - 1;
      // Load the real image; do not animate the modal or clone low-resolution thumbnails.
      var image = modal.querySelector('img');
      if (image) image.loading = 'eager';
      var close = modal.querySelector('.modal-close');
      if (close) close.focus({ preventScroll: true });
    }
    function close(updateURL) {
      if (!active) return;
      active.classList.remove('is-open');
      active.removeAttribute('aria-modal');
      active = null;
      unlockBackground();
      var saved = origin;
      origin = null;
      if (updateURL) setHash(saved ? saved.hash.replace(/^#/, '') : 'gallery', false);
      if (saved) {
        window.scrollTo({ top: saved.y, left: 0, behavior: 'instant' });
        if (saved.opener && saved.opener.isConnected) saved.opener.focus({ preventScroll: true });
      }
      if (motion) motion.scan();
    }
    function move(step) {
      if (!active) return;
      var next = modals[modals.indexOf(active) + step];
      if (!next) return;
      setHash(next.id, false);
      activate(next);
    }
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (link && link.classList.contains('modal-close')) {
        event.preventDefault(); close(true); return;
      }
      if (link && !active) {
        var id = link.getAttribute('href').slice(1);
        var selected = modals.find(function (m) { return m.id === id; });
        if (selected) {
          event.preventDefault();
          origin = { hash: location.hash, y: window.scrollY, opener: link };
          setHash(id, true); activate(selected); return;
        }
      }
      var step = event.target.closest('[data-photo-step]');
      if (step && !step.disabled) move(Number(step.dataset.photoStep));
      if (active && event.target === active) close(true);
    });
    document.addEventListener('keydown', function (event) {
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'Tab') {
        var list = Array.from(active.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')).filter(function (e) { return e.getClientRects().length; });
        if (!list.length) return;
        var first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    function syncHash() {
      var target = getFromHash();
      if (target) {
        if (!origin) origin = { hash: '#gallery', y: window.scrollY, opener: null };
        activate(target);
      } else if (active) close(false);
    }
    window.addEventListener('popstate', syncHash);
    window.addEventListener('hashchange', syncHash);
    syncHash();
  }
  function init() {
    try { motion = initMotion(); } catch (error) { report('motion-init', error); }
    try { initFilters(); } catch (error) { report('filters', error); }
    try { initPhotoViewer(); } catch (error) { report('photo-viewer', error); }
    document.querySelectorAll('[data-replay-motion]').forEach(function (button) {
      button.addEventListener('click', function () { if (motion) motion.replay(); updateStatus(); });
    });
    document.querySelectorAll('[data-toggle-motion]').forEach(function (button) {
      button.addEventListener('click', function () { if (motion) motion.setPaused(!state.paused); });
    });
    state.scripts = 'ready';
    root.dataset.scripts = 'ready';
    updateStatus();
  }
  window.PD_SITE = Object.freeze({
    version: state.version,
    getStatus: function () { return JSON.parse(JSON.stringify(state)); },
    replay: function () { if (motion) motion.replay(); },
    pause: function (value) { if (motion) motion.setPaused(value); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());


/* Cinematic experiences: progressive enhancement, touch and scroll support. */
(function(){'use strict';
 function initCinema(){
 var stage=document.querySelector('.cinema-stage'), after=document.querySelector('.cinema-stage-sticky');
 if(stage&&after){var queued=false;function update(){queued=false;var rect=stage.getBoundingClientRect(),distance=Math.max(1,stage.offsetHeight-innerHeight);var p=Math.max(0,Math.min(1,-rect.top/distance));after.style.setProperty('--reveal',Math.max(0,Math.min(1,(p-.12)/.76)).toFixed(4));}function tick(){if(!queued){queued=true;requestAnimationFrame(update);}}addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick,{passive:true});addEventListener('pageshow',tick);tick();}
 var shell=document.getElementById('cabinet-shell'), doors=document.getElementById('cabinet-toggle'),drawer=document.getElementById('drawer-toggle');
 if(shell&&doors){doors.addEventListener('click',function(){var open=shell.classList.toggle('is-open');doors.setAttribute('aria-pressed',String(open));doors.textContent=open?'CLOSE THE CABINET ↗':'OPEN THE CABINET ↗';});}
 if(shell&&drawer){drawer.addEventListener('click',function(){var open=shell.classList.toggle('drawer-open');drawer.setAttribute('aria-pressed',String(open));drawer.textContent=open?'CLOSE THE DRAWER ↗':'PULL THE DRAWER ↗';});}
}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCinema,{once:true});else initCinema();
})();
