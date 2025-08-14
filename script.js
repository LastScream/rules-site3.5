// McGround — Rules page scripts (стабильное оглавление + поиск по коду)

(function () {
  const TRANSITION_MS = 500;
  const items = Array.from(document.querySelectorAll('.acc-item'));
  let isAnimating = false; // Флаг для отслеживания анимации

  // ---------------- helpers ----------------
  function setAria(item, expanded) {
    const btn = item.querySelector('.acc-summary');
    const panel = item.querySelector('.acc-panel');
    if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (panel) panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  }

  function openItem(item) {
    const panel = item.querySelector('.acc-panel');
    if (!panel || item.classList.contains('active') || isAnimating) return;

    isAnimating = true;
    item.classList.add('active');
    setAria(item, true);

    panel.style.overflow = 'hidden';
    panel.style.maxHeight = 'none';
    const full = panel.scrollHeight;
    panel.style.maxHeight = '0px';

    requestAnimationFrame(() => { 
      panel.style.maxHeight = full + 'px'; 
      
      const onEnd = () => {
        if (item.classList.contains('active')) panel.style.maxHeight = 'none';
        isAnimating = false;
        panel.removeEventListener('transitionend', onEnd);
      };
      
      panel.addEventListener('transitionend', onEnd, { once: true });
    });
  }
  

  function closeItem(item) {
    if (!item.classList.contains('active')) return;
    const panel = item.querySelector('.acc-panel');
    if (!panel || isAnimating) return;

    isAnimating = true;
    setAria(item, false);

    if (getComputedStyle(panel).maxHeight === 'none') {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
    
    requestAnimationFrame(() => { 
      panel.style.maxHeight = '0px'; 
      
      const onEnd = () => {
        item.classList.remove('active');
        isAnimating = false;
        panel.removeEventListener('transitionend', onEnd);
      };
      
      panel.addEventListener('transitionend', onEnd, { once: true });
    });
  }

  function toggleItem(item) {
    if (isAnimating) return;
    item.classList.contains('active') ? closeItem(item) : openItem(item);
  }


  function smoothCenterScroll(targetEl) {
    if (!targetEl) return;
    if (targetEl.scrollIntoView) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const top = targetEl.getBoundingClientRect().top + window.scrollY
              - (window.innerHeight / 2) + (targetEl.offsetHeight / 2);
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function scrollToCategoryStartAfterSettled(item) {
    const summary = item.querySelector('.acc-summary');
    if (!summary) return;
    requestAnimationFrame(() => {
      setTimeout(() => { smoothCenterScroll(summary); }, TRANSITION_MS + 40);
    });
  }


  items.forEach((item) => {
    const summary = item.querySelector('.acc-summary');
    const panel = item.querySelector('.acc-panel');

    if (panel) { panel.style.maxHeight = '0px'; item.classList.remove('active'); setAria(item, false); }
    if (!summary) return;

    if (panel && !panel.id) panel.id = 'panel-' + Math.random().toString(36).slice(2);
    summary.setAttribute('aria-controls', panel ? panel.id : '');

    summary.addEventListener('click', (ev) => {
      if (isAnimating) return;
      
      const willOpen = !item.classList.contains('active');
      if (!ev.altKey) items.forEach((it) => { if (it !== item) closeItem(it); });
      if (willOpen) { openItem(item); scrollToCategoryStartAfterSettled(item); }
      else { closeItem(item); }

      selectTocByItem(item);
    });
  });


  window.addEventListener('resize', () => {
    const open = items.find((it) => it.classList.contains('active'));
    if (!open) return;
    const panel = open.querySelector('.acc-panel');
    if (panel && getComputedStyle(panel).maxHeight !== 'none') {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });


  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('acc-item')) {
      items.forEach((it) => { if (it !== target) closeItem(it); });
      openItem(target);
      setTimeout(() => scrollToCategoryStartAfterSettled(target), 60);
      // актив в оглавлении
      setTimeout(() => selectTocByItem(target), 80);
    }
  }


  const btnExpandAll = document.getElementById('expandAll');
  const btnCollapseAll = document.getElementById('collapseAll');
  btnExpandAll && btnExpandAll.addEventListener('click', () => items.forEach(openItem));
  btnCollapseAll && btnCollapseAll.addEventListener('click', () => items.forEach(closeItem));



document.querySelectorAll('.copy-link').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.currentTarget.closest('.acc-item');
    const id = item?.id || '';
    if (!id) return;
    
    const url = location.origin + location.pathname + '#' + id;
    navigator.clipboard.writeText(url).then(() => {
      // Добавляем класс "copied"
      btn.classList.add('copied');
      
      // Удаляем класс через 2 секунды
      setTimeout(() => {
        btn.classList.remove('copied');
      }, 2000);
      
      // Можно добавить всплывающее уведомление
      const tooltip = document.createElement('div');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = 'Ссылка скопирована!';
      btn.appendChild(tooltip);
      
      setTimeout(() => {
        tooltip.remove();
      }, 2000);
    });
  });
});


  let selectTocByItem = () => {};
  (function toc() {
    const nav = document.querySelector('.toc-nav');
    if (!nav) return;

    nav.innerHTML = '';
    const idToLink = new Map();

    items.forEach((it, i) => {
      if (!it.id) it.id = 'sec-' + (i + 1);
      const title = it.querySelector('.cat-title')?.textContent?.trim() || ('Раздел ' + (i + 1));
      const a = document.createElement('a');
      a.href = '#' + it.id;
      a.innerHTML = `<span class="idx">${i + 1}.</span><span>${title}</span>`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        items.forEach(x => { if (x !== it) closeItem(x); });
        openItem(it);
        const summary = it.querySelector('.acc-summary');
        if (summary) smoothCenterScroll(summary);
        nav.querySelectorAll('a.active').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        history.replaceState(null, '', '#' + it.id);
      });
      idToLink.set(it.id, a);
      nav.appendChild(a);
    });


    selectTocByItem = (it) => {
      if (!it || !it.id) return;
      const link = idToLink.get(it.id);
      if (!link) return;
      nav.querySelectorAll('a.active').forEach(x => x.classList.remove('active'));
      link.classList.add('active');
    };


    if (location.hash) {
      const l = idToLink.get(location.hash.slice(1));
      if (l) { nav.querySelectorAll('a.active').forEach(x => x.classList.remove('active')); l.classList.add('active'); }
    }
  })();


  (function codeSearch() {
    const input = document.getElementById('ruleSearch');
    const clearBtn = document.getElementById('clearSearch');
    if (!input) return;


    items.forEach((catEl, i) => {
      const cat = i + 1;
      catEl.querySelectorAll('.points > li').forEach((li, j) => {
        li.dataset.num = `${cat}.${j + 1}`;
      });
    });

    function clearHits() {
      document.querySelectorAll('.mg-hit').forEach(el => el.classList.remove('mg-hit'));
    }

    function openAndCenter(catEl, targetEl) {
      items.forEach(it => { if (it !== catEl) closeItem(it); });
      if (!catEl.classList.contains('active')) openItem(catEl);
      setTimeout(() => { smoothCenterScroll(targetEl || catEl.querySelector('.acc-summary')); }, 40);
      selectTocByItem(catEl); // фикс активного пункта в оглавлении
    }

    function parseCode(raw) {
      const m = String(raw).trim().match(/^(\d+)(?:\s*[.\-]\s*(\d+))?$/); // 3  |  3.2 / 3-2
      if (!m) return null;
      const cat = parseInt(m[1], 10);
      const item = m[2] ? parseInt(m[2], 10) : null;
      return { cat, item };
    }

    function findByCode({ cat, item }) {
      const catEl = items[cat - 1] || null;
      if (!catEl) return { catEl: null, li: null };
      if (item == null) return { catEl, li: null };
      const li = catEl.querySelector(`.points > li[data-num="${cat}.${item}"]`);
      return { catEl, li };
    }

    function applyCodeSearch(raw) {
      clearHits();
      const code = parseCode(raw);
      if (!code) {
        input.classList.add('mg-bad'); setTimeout(() => input.classList.remove('mg-bad'), 250);
        return;
      }
      const { catEl, li } = findByCode(code);
      if (!catEl) {
        input.classList.add('mg-bad'); setTimeout(() => input.classList.remove('mg-bad'), 250);
        return;
      }
      catEl.classList.add('mg-hit');
      if (li) li.classList.add('mg-hit');
      openAndCenter(catEl, li || undefined);
    }


    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      const code = parseCode(input.value);
      if (!code) { clearHits(); return; }
      t = setTimeout(() => applyCodeSearch(input.value), 100);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyCodeSearch(input.value); }
      if (e.key === 'Escape') { clearHits(); input.value = ''; }
    });

    clearBtn && clearBtn.addEventListener('click', () => {
      input.value = ''; clearHits(); input.focus();
    });

    // Ctrl/⌘ + K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); input.focus(); input.select();
      }
    });
  })();


  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const activeIdx = items.findIndex(it => it.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(items.length - 1, activeIdx >= 0 ? activeIdx + 1 : 0)];
      if (next) { items.forEach(it => { if (it !== next) closeItem(it); });
        openItem(next); scrollToCategoryStartAfterSettled(next); selectTocByItem(next); }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[Math.max(0, activeIdx > 0 ? activeIdx - 1 : 0)];
      if (prev) { items.forEach(it => { if (it !== prev) closeItem(it); });
        openItem(prev); scrollToCategoryStartAfterSettled(prev); selectTocByItem(prev); }
    }

    if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault(); toggleItem(items[activeIdx]); selectTocByItem(items[activeIdx]);
    }

    if (e.key === 'Home') {
      e.preventDefault();
      const first = items[0];
      if (first) { items.forEach(it => { if (it !== first) closeItem(it); });
        openItem(first); scrollToCategoryStartAfterSettled(first); selectTocByItem(first); }
    }

    if (e.key === 'End') {
      e.preventDefault();
      const last = items[items.length - 1];
      if (last) { items.forEach(it => { if (it !== last) closeItem(it); });
        openItem(last); scrollToCategoryStartAfterSettled(last); selectTocByItem(last); }
    }
  });


  (function readingProgress(){
    const bar = document.querySelector('.reading-progress .bar');
    if (!bar) return;
    function onScroll(){
      const doc = document.documentElement;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const pct = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.height = (pct * 100).toFixed(2) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();

})();


(function keepTocUnderHeader(){
  const header = document.querySelector('.site-header');
  if (!header) return;

  const root = document.documentElement;
  const set = () => {
    const h = Math.ceil(header.getBoundingClientRect().height);
    root.style.setProperty('--header-h', h + 'px');
  };
  set();
  window.addEventListener('resize', set);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(set).observe(header);
  }
})();

// Плавное появление элементов
function revealOnScroll() {
    let reveals = document.querySelectorAll(".reveal");
    for (let i = 0; i < reveals.length; i++) {
        let windowHeight = window.innerHeight;
        let elementTop = reveals[i].getBoundingClientRect().top;
        let elementVisible = 100;

        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}
window.addEventListener("scroll", revealOnScroll);
revealOnScroll();

