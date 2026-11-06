// Interactions du site : menu mobile, thème, agrandissement des captures, filtre des nouveautés.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
  };

  const toggle = $('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });

  $('.theme-toggle')?.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme !== 'light';
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('pt.theme', root.dataset.theme);
  });

  const box = $('.lightbox');
  if (box) {
    const img = $('img', box);
    const cap = $('figcaption', box);
    const close = () => { box.hidden = true; img.removeAttribute('src'); };
    document.addEventListener('click', (e) => {
      const t = e.target.closest('img[data-zoom]');
      if (!t) return;
      e.preventDefault();
      img.src = t.currentSrc || t.src;
      img.alt = t.alt;
      cap.textContent = t.closest('figure')?.querySelector('figcaption')?.textContent || t.alt;
      box.hidden = false;
      $('button', box).focus();
    });
    box.addEventListener('click', (e) => { if (e.target !== img) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
  }

  const chips = document.querySelectorAll('.filters .chip');
  const apply = (id) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === id)));
    document.querySelectorAll('.news-page .news-item').forEach((li) => { li.hidden = !!id && li.dataset.tool !== id; });
    document.querySelectorAll('.news-page .month').forEach((h) => {
      const list = h.nextElementSibling;
      h.hidden = list && ![...list.children].some((li) => !li.hidden);
    });
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    apply(c.dataset.filter);
    history.replaceState(null, '', c.dataset.filter ? '#' + c.dataset.filter : location.pathname);
  }));
  if (chips.length && location.hash) apply(location.hash.slice(1));

  // Sommaire du guide : met en évidence la section visible.
  const links = [...document.querySelectorAll('.toc nav a')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const obs = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('on'));
        map.get(en.target.id)?.classList.add('on');
      }
    }, { rootMargin: '-15% 0px -75% 0px' });
    map.forEach((_, id) => { const h = document.getElementById(id); if (h) obs.observe(h); });
  }
})();
