/*
 * Vireo site motion layer.
 *
 * Progressive enhancement: the page is complete without this file. Elements are
 * only hidden once this script runs, and nothing runs at all when the browser
 * lacks the Web Animations API or IntersectionObserver, or the visitor asked
 * for reduced motion.
 *
 * Markup hooks:
 *   data-motion="kind" data-delay="ms"   entrance animation (kinds in KF below)
 *   data-stagger="ms" [data-delay] [data-kind]   children enter one after another
 *   data-count="74" [data-from="12"]     number counts up (or down) on entry
 *   data-slide="74.19"                    capacity marker slides in from 0
 *   data-band, data-bar                   season bands grow, tile bars rise
 *   data-float="px"                       gentle endless bob
 *   data-vee                              Vee's idle hop on the phone
 *   data-parallax="0.05"                  scroll parallax factor
 *   data-phrase                           manifesto phrases lit by scroll
 *   data-spring, data-lift                hover and press springs
 *
 * The hero plays on load; everything else plays when it scrolls into view.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };

  if (!root.animate || typeof IntersectionObserver === 'undefined') return;
  if (mq('(prefers-reduced-motion: reduce)')) return;

  root.classList.add('js-motion');

  var OUT = 'cubic-bezier(.16,1,.3,1)';
  var BOUNCE = 'cubic-bezier(.34,1.56,.64,1)';
  var SOFT = 'cubic-bezier(.3,.9,.3,1)';

  // [keyframes, duration, easing]. Only transform and opacity, plus the two
  // short blur-ins of the draft (filter is composited, it never triggers layout).
  var KF = {
    up: [[{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 950, OUT],
    down: [[{ opacity: 0, transform: 'translateY(-28px)' }, { opacity: 1, transform: 'none' }], 900, OUT],
    rise: [[{ opacity: 0, transform: 'translateY(56px)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], 1200, OUT],
    word: [[{ opacity: 0, transform: 'translateY(0.55em) rotate(5deg)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], 1100, OUT],
    scale: [[{ opacity: 0, transform: 'scale(.82) translateY(40px)' }, { opacity: 1, transform: 'none' }], 1300, OUT],
    pop: [[{ opacity: 0, transform: 'scale(.55)' }, { opacity: 1, transform: 'none' }], 800, BOUNCE],
    phone: [[{ opacity: 0, transform: 'translateY(180px) rotate(-6deg) scale(.94)' }, { opacity: 1, transform: 'none' }], 1600, OUT],
    land: [[{ opacity: 0, transform: 'translate(60px,-200px) rotate(-30deg)' }, { opacity: 1, transform: 'translate(0,6px) rotate(6deg)', offset: 0.72 }, { opacity: 1, transform: 'none' }], 1300, SOFT],
    hop: [[{ opacity: 0, transform: 'translateY(-48px) rotate(-14deg)' }, { opacity: 1, transform: 'translateY(5px)', offset: 0.7 }, { opacity: 1, transform: 'none' }], 950, SOFT],
    bubble: [[{ opacity: 0, transform: 'scale(.4)', transformOrigin: '0 0' }, { opacity: 1, transform: 'none', transformOrigin: '0 0' }], 750, BOUNCE],
    right: [[{ opacity: 0, transform: 'translateX(70px)' }, { opacity: 1, transform: 'none' }], 1000, OUT],
    dyno: [[{ opacity: 0, transform: 'translate(-90px,160px) rotate(-14deg)' }, { opacity: 1, transform: 'none' }], 1500, OUT],
    drop: [[{ opacity: 0, transform: 'scaleY(0)', transformOrigin: 'top' }, { opacity: 1, transform: 'none', transformOrigin: 'top' }], 700, OUT],
    // The goal badge keeps its centring in the separate `translate` property.
    spin: [[{ opacity: 0, transform: 'rotate(-180deg) scale(.2)' }, { opacity: 1, transform: 'none' }], 1100, BOUNCE],
    section: [[{ opacity: 0.35, transform: 'scale(.93)' }, { opacity: 1, transform: 'none' }], 1300, OUT],
    grow: [[{ opacity: 0, transform: 'scaleX(0)', transformOrigin: 'left center' }, { opacity: 1, transform: 'none', transformOrigin: 'left center' }], 1000, OUT],
    bar: [[{ transform: 'scaleY(0)', transformOrigin: 'bottom' }, { transform: 'none', transformOrigin: 'bottom' }], 900, OUT],
    // The highlight is its own layer, so it fades in with opacity.
    hl: [[{ opacity: 0 }, { opacity: 1 }], 800, OUT]
  };

  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var num = function (el, name) { return Number(el.getAttribute(name)) || 0; };

  // Create a paused animation. fill: 'both' holds the first frame until it
  // plays, which is what hides the element; without this script it stays visible.
  var make = function (el, kind, delay) {
    var k = KF[kind];
    if (!k) return null;
    var a = el.animate(k[0], { duration: k[1], delay: delay || 0, easing: k[2], fill: 'both' });
    a.pause();
    return a;
  };

  // Stagger containers hand each child a kind and a delay.
  each(document.querySelectorAll('[data-stagger]'), function (c) {
    var step = num(c, 'data-stagger') || 80;
    var base = num(c, 'data-delay');
    var kind = c.getAttribute('data-kind') || 'up';
    each(c.children, function (ch, i) {
      if (!ch.hasAttribute('data-motion')) {
        ch.setAttribute('data-motion', kind);
        ch.setAttribute('data-delay', String(base + i * step));
      }
    });
  });

  var hero = document.querySelector('.hero');
  var inHero = function (el) { return !!hero && (el === hero || hero.contains(el)); };

  // Everything outside the hero is queued on an element and run when that
  // element scrolls into view. Things that start collapsed (scaleX/scaleY 0)
  // are watched through their stable parent, which has a real size.
  var watched = [];
  var queue = function (el, fn) {
    if (!el.__vfx) { el.__vfx = []; watched.push(el); }
    el.__vfx.push(fn);
  };
  var whenSeen = function (el, fn) { if (inHero(el)) fn(); else queue(el, fn); };
  var trigger = function (el, kind) {
    return (kind === 'drop' || kind === 'bar' || kind === 'grow') ? el.parentNode : el;
  };

  each(document.querySelectorAll('[data-motion]'), function (el) {
    var kind = el.getAttribute('data-motion');
    var a = make(el, kind, num(el, 'data-delay'));
    if (!a) return;
    if (inHero(el)) { a.play(); return; }
    queue(trigger(el, kind), function () { a.play(); });
  });

  each(document.querySelectorAll('[data-band]'), function (el, i) {
    var a = make(el, 'grow', 150 + (i % 7) * 120);
    queue(trigger(el, 'grow'), function () { a.play(); });
  });

  each(document.querySelectorAll('[data-bar]'), function (el) {
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    var a = make(el, 'bar', 350 + i * 60);
    queue(trigger(el, 'bar'), function () { a.play(); });
  });

  // The marker sits at its value inside a full-width track; moving the track
  // by -value% puts the marker at 0, so the slide is a pure transform.
  each(document.querySelectorAll('[data-slide]'), function (el) {
    var from = 'translateX(-' + el.getAttribute('data-slide') + '%)';
    var a = el.animate([{ transform: from }, { transform: 'none' }],
      { duration: 1700, delay: num(el, 'data-delay'), easing: OUT, fill: 'both' });
    a.pause();
    whenSeen(el, function () { a.play(); });
  });

  var raf = function (fn) { return requestAnimationFrame(fn); };

  each(document.querySelectorAll('[data-count]'), function (el) {
    var target = el.getAttribute('data-count');
    var to = Number(target);
    var from = num(el, 'data-from');
    var dec = (target.split('.')[1] || '').length;
    var delay = num(el, 'data-delay');
    var dur = 1600;
    var fmt = function (v) { return dec ? v.toFixed(dec) : String(Math.round(v)); };
    el.textContent = fmt(from);
    whenSeen(el, function () {
      var t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t + delay;
        var p = Math.min(1, Math.max(0, (t - t0) / dur));
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = p >= 1 ? target : fmt(from + (to - from) * e);
        if (p < 1) raf(step);
      };
      raf(step);
    });
  });

  var run = function (el) {
    (el.__vfx || []).forEach(function (f) { f(); });
    el.__vfx = null;
    io.unobserve(el);
  };
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) run(e.target); });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  watched.forEach(function (el) { io.observe(el); });

  // The last few things on the page (the footer) can never reach the -8% line
  // on a tall window, because the page ends first. At the bottom of the page,
  // play whatever is on screen and still waiting.
  var flushAtBottom = function (vh) {
    var se = document.scrollingElement || document.documentElement;
    if (se.scrollTop + vh < se.scrollHeight - 2) return;
    watched.forEach(function (el) {
      if (!el.__vfx) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) run(el);
    });
  };

  // Endless gentle movement on separate `translate`/`rotate` properties, so it
  // stacks on top of the entrance animations instead of replacing them.
  each(document.querySelectorAll('[data-float]'), function (el, i) {
    var amp = num(el, 'data-float');
    el.animate([{ translate: '0 0' }, { translate: '0 ' + (-amp) + 'px' }, { translate: '0 0' }],
      { duration: 4200 + i * 700, delay: 2200 + i * 300, iterations: Infinity, easing: 'ease-in-out' });
  });

  var vee = document.querySelector('[data-vee]');
  if (vee) vee.animate([
    { translate: '0 0', rotate: '0deg', offset: 0 },
    { translate: '0 0', rotate: '0deg', offset: 0.8 },
    { translate: '0 -14px', rotate: '-8deg', offset: 0.86 },
    { translate: '0 0', rotate: '0deg', offset: 0.92 },
    { translate: '0 -6px', rotate: '4deg', offset: 0.96 },
    { translate: '0 0', rotate: '0deg', offset: 1 }
  ], { duration: 5200, delay: 3200, iterations: Infinity, easing: 'ease-in-out' });

  // Springs. Each element keeps one live animation per property: the old one is
  // committed and cancelled before the next starts, so nothing piles up.
  var hover = mq('(hover: hover) and (pointer: fine)');
  var springTo = function (el, prop, value, dur) {
    var key = '__spring_' + prop;
    var prev = el[key];
    if (prev) {
      try { prev.commitStyles(); } catch (err) { /* element not rendered */ }
      prev.cancel();
    }
    var k = {};
    k[prop] = value;
    el[key] = el.animate([k], { duration: dur || 420, easing: BOUNCE, fill: 'forwards' });
  };

  each(document.querySelectorAll('[data-spring]'), function (el) {
    if (hover) {
      el.addEventListener('pointerenter', function () { springTo(el, 'scale', '1.05'); });
      el.addEventListener('pointerleave', function () { springTo(el, 'scale', '1'); });
    }
    el.addEventListener('pointerdown', function () { springTo(el, 'scale', '0.95', 180); });
    el.addEventListener('pointerup', function () { springTo(el, 'scale', hover ? '1.05' : '1'); });
    el.addEventListener('pointercancel', function () { springTo(el, 'scale', '1'); });
  });

  if (hover) each(document.querySelectorAll('[data-lift]'), function (el) {
    el.addEventListener('pointerenter', function () { springTo(el, 'translate', '0 -8px', 600); });
    el.addEventListener('pointerleave', function () { springTo(el, 'translate', '0 0', 600); });
  });

  // Scroll-linked: manifesto phrases light up, illustrations drift. On very
  // tall screens (the whole page nearly fits) both are left at rest.
  var big = window.innerHeight > 1500;
  var phrases = document.querySelectorAll('[data-phrase]');
  var pars = document.querySelectorAll('[data-parallax]');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    raf(function () {
      ticking = false;
      var vh = window.innerHeight;
      flushAtBottom(vh);
      if (phrases.length) {
        var r = phrases[0].parentNode.getBoundingClientRect();
        var p = big ? 1 : Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
        var n = phrases.length;
        each(phrases, function (el, i) {
          el.style.opacity = String(Math.min(1, Math.max(0.16, p * n - i + 0.16)));
        });
      }
      if (!big) {
        // Read every position first, then write, so the loop never forces a
        // style or layout pass between images.
        var shifts = Array.prototype.map.call(pars, function (el) {
          var r2 = el.getBoundingClientRect();
          var current = parseFloat((el.style.translate || '0 0').split(' ')[1]) || 0;
          var centre = r2.top - current + r2.height / 2;
          return Math.max(-60, Math.min(60, (centre - vh / 2) * -Number(el.getAttribute('data-parallax'))));
        });
        each(pars, function (el, i) { el.style.translate = '0 ' + shifts[i].toFixed(1) + 'px'; });
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
