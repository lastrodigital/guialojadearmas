(function () {
  'use strict';

  var config = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- Links configuráveis ---------- */
  function setupLinks() {
    if (config.checkoutUrl) {
      document.querySelectorAll('[data-checkout]').forEach(function (el) {
        el.href = config.checkoutUrl;
      });
    }
    var legal = { privacy: config.privacyUrl, terms: config.termsUrl };
    document.querySelectorAll('[data-legal]').forEach(function (el) {
      var url = legal[el.getAttribute('data-legal')];
      if (url) {
        el.href = url;
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });
  }

  /* ---------- Header: fundo após rolar + menu mobile ---------- */
  function setupHeader() {
    var header = document.querySelector('[data-header]');
    var hero = document.querySelector('.hero');
    if (!header) return;

    if (hero && 'IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
      hero.prepend(sentinel);
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    }

    var nav = header.querySelector('.nav');
    var toggle = header.querySelector('[data-nav-toggle]');
    var menu = header.querySelector('[data-nav-menu]');
    if (!toggle || !menu) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? 'Fechar menu' : 'Abrir menu';
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
    });
    desktop.addEventListener('change', function () { setOpen(false); });
  }

  /* ---------- Link ativo conforme a seção visível ---------- */
  function setupActiveNav() {
    if (!('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) map[id] = link;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        } else {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(map).forEach(function (id) { observer.observe(document.getElementById(id)); });
  }

  /* ---------- Animações de entrada ---------- */
  function setupReveal() {
    // Atraso em cascata para filhos de listas marcadas com data-stagger
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--d', (i * 90) + 'ms');
      });
    });

    var items = document.querySelectorAll('[data-reveal]');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    // Elementos que começam totalmente recortados (clip-path) não geram interseção;
    // nesses casos observamos o elemento pai.
    var targets = new Map();
    items.forEach(function (el) {
      var type = el.getAttribute('data-reveal');
      var watch = (type === 'mask' || type === 'clip') ? el.parentElement : el;
      if (!targets.has(watch)) targets.set(watch, []);
      targets.get(watch).push(el);
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        targets.get(entry.target).forEach(function (el) { el.classList.add('is-visible'); });
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    targets.forEach(function (_, watch) { observer.observe(watch); });
  }

  /* ---------- Parallax sutil (desktop, sem movimento reduzido) ---------- */
  function setupParallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length || !('IntersectionObserver' in window)) return;

    var active = new Set();
    var ticking = false;
    var enabled = false;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      requestUpdate();
    }, { rootMargin: '100px 0px' });

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      active.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var limit = rect.height * speed;
        var offset = Math.max(-limit, Math.min(limit, (rect.top + rect.height / 2 - vh / 2) * -speed));
        el.style.translate = '0 ' + offset.toFixed(1) + 'px';
      });
    }

    function requestUpdate() {
      if (!enabled || ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function setEnabled() {
      enabled = desktop.matches && !reduceMotion.matches;
      if (enabled) {
        els.forEach(function (el) { io.observe(el); });
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
        requestUpdate();
      } else {
        io.disconnect();
        active.clear();
        window.removeEventListener('scroll', requestUpdate);
        window.removeEventListener('resize', requestUpdate);
        els.forEach(function (el) { el.style.translate = ''; });
      }
    }

    desktop.addEventListener('change', setEnabled);
    reduceMotion.addEventListener('change', setEnabled);
    setEnabled();
  }

  /* ---------- FAQ: acordeão com um item aberto por vez ---------- */
  function setupAccordion() {
    document.querySelectorAll('[data-accordion]').forEach(function (accordion) {
      var items = Array.prototype.slice.call(accordion.querySelectorAll('.faq-item'));

      function setItem(item, open) {
        item.classList.toggle('is-open', open);
        item.querySelector('.faq-item__btn').setAttribute('aria-expanded', String(open));
      }

      items.forEach(function (item) {
        var btn = item.querySelector('.faq-item__btn');
        btn.addEventListener('click', function () {
          var willOpen = !item.classList.contains('is-open');
          items.forEach(function (other) { if (other !== item) setItem(other, false); });
          setItem(item, willOpen);
        });
      });
    });
  }

  /* ---------- Init ---------- */
  setupLinks();
  setupHeader();
  setupActiveNav();
  setupReveal();
  setupParallax();
  setupAccordion();

  // Dispara a sequência de entrada do hero no próximo frame
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      document.body.classList.add('is-loaded');
    });
  });
})();
