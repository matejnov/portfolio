/* ==========================================================================
   CEVOX DIVE — sdílené interakce (vanilla JS, bez závislostí)
   Košík je demo (stav v paměti + localStorage) — připraveno na napojení
   na PHP backend: viz komentáře CART API níže.
   ========================================================================== */
(function () {
  'use strict';

  var FREE_SHIPPING = 5000; // Kč — doprava zdarma (reálná hodnota cevoxdive.cz)

  /* Poznámka „ukázková verze" v patičce. Pro nasazení u klienta přepnout na false. */
  var DEMO = true;
  if (DEMO) {
    document.querySelectorAll('[data-demo-note]').forEach(function (e) { e.hidden = false; });
  }

  /* ---------- C1-3 — detail objednávky: číslo z ?id= ---------- */
  (function () {
    var pole = document.querySelectorAll('[data-objednavka-cislo]');
    if (!pole.length) return;
    var id = '';
    try { id = (new URLSearchParams(window.location.search).get('id') || '').trim(); } catch (e) {}
    if (!id) return;
    var cislo = '#' + id;
    pole.forEach(function (e) { e.textContent = cislo; });
    document.title = 'Objednávka ' + cislo + ' — CEVOX Dive';
  })();

  /* ---------- C1-1 — stránka výsledků hledání: převzetí ?q= ---------- */
  (function () {
    var nadpis = document.querySelector('[data-vysledky-nadpis]');
    if (!nadpis) return;
    var meta = document.querySelector('[data-vysledky-meta]');
    var prazdno = document.querySelector('[data-vysledky-prazdno]');
    var grid = document.querySelector('[data-vypis-grid]');

    var dotaz = '';
    try {
      dotaz = (new URLSearchParams(window.location.search).get('q') || '').trim();
    } catch (e) {}

    // dotaz zpátky do vyhledávacích polí, ať ho uživatel může upravit
    document.querySelectorAll('form.search input[name="q"]').forEach(function (i) { i.value = dotaz; });
    naplnFiltrKontext(dotaz);

    if (!dotaz) {
      nadpis.textContent = 'Výsledky hledání';
      if (meta) meta.textContent = 'Zadejte hledaný výraz do pole nahoře.';
      if (grid) grid.hidden = true;
      return;
    }

    nadpis.textContent = 'Výsledky pro „' + dotaz + '“';

    // DEMO: filtrování v prohlížeči nad statickými kartami. Na platformě
    // vyhledává server — tenhle blok se pak celý zahodí.
    var karty = grid ? grid.querySelectorAll('[data-product-card]') : [];
    var hledane = bezDiakritiky(dotaz);
    var pocet = 0;
    karty.forEach(function (k) {
      var znacka = k.querySelector('.product-card__brand');
      var nazev = k.querySelector('.product-card__name');
      var text = bezDiakritiky((znacka ? znacka.textContent : '') + ' ' + (nazev ? nazev.textContent : ''));
      var sedi = text.indexOf(hledane) > -1;
      k.hidden = !sedi;
      if (sedi) pocet++;
    });

    if (meta) meta.textContent = pocet + ' ' + skloňujVysledky(pocet) + ' pro „' + dotaz + '“';

    if (pocet === 0) {
      if (grid) grid.hidden = true;
      if (prazdno) {
        prazdno.hidden = false;
        var el = prazdno.querySelector('[data-vysledky-dotaz]');
        if (el) el.textContent = '„' + dotaz + '“';
      }
    }
  })();

  function bezDiakritiky(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function skloňujVysledky(n) {
    if (n === 1) return 'výsledek';
    if (n >= 2 && n <= 4) return 'výsledky';
    return 'výsledků';
  }

  /* ---------- B3 — dlaždice / řádky, volba se pamatuje ---------- */
  (function () {
    var grid = document.querySelector('[data-vypis-grid]');
    var prepinac = document.querySelector('[data-vypis-prepinac]');
    if (!grid || !prepinac) return;

    var KLIC = 'cevox-vypis';
    var zaklad = grid.classList.contains('catalog-grid') ? 'catalog-grid' : 'prod-grid';

    function nastav(rezim, uloz) {
      var radky = rezim === 'radky';
      grid.classList.toggle(zaklad + '--rows', radky);
      prepinac.querySelectorAll('[data-vypis]').forEach(function (b) {
        var aktivni = b.getAttribute('data-vypis') === rezim;
        b.classList.toggle('view-switch__btn--on', aktivni);
        b.setAttribute('aria-pressed', aktivni ? 'true' : 'false');
      });
      if (uloz) {
        try { window.localStorage.setItem(KLIC, rezim); } catch (e) {}
      }
    }

    prepinac.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-vypis]');
      if (btn) nastav(btn.getAttribute('data-vypis'), true);
    });

    var ulozeny;
    try { ulozeny = window.localStorage.getItem(KLIC); } catch (e) {}
    nastav(ulozeny === 'radky' ? 'radky' : 'dlazdice', false);
  })();

  /* ---------- výčet dopravců — jediný zdroj je js/kosik-data.js (B5) ---------- */
  (function () {
    var cile = document.querySelectorAll('[data-dopravci-seznam]');
    if (!cile.length || !window.Kosik || !Kosik.dopravci) return;
    var seznam = Kosik.dopravci().map(function (d) { return d.kratky || d.label; }).join(', ');
    cile.forEach(function (e) { e.textContent = seznam; });
  })();


  /* filtrační formulář musí zachovat kontext stránky (kategorie / značka / dotaz) */
  function naplnFiltrKontext(hodnota) {
    document.querySelectorAll('[data-filtr-kontext]').forEach(function (i) { i.value = hodnota || ''; });
  }
  /* ---------- znacka.html — texty podle slugu v URL (C1-4) ---------- */
  var ZNACKY = {
    'ammonite':   { nazev: 'Ammonite', popis: 'Ammonite System — svítilny a technické doplňky pro jeskynní a wreck potápění.' },
    'apeks':      { nazev: 'Apeks', popis: 'Britské automatiky a technické vybavení. Spolehlivost ověřená studenou vodou.' },
    'aqualung':   { nazev: 'Aqualung', popis: 'Jedna z nejstarších potápěčských značek — automatiky, vesty i kompletní sety.' },
    'atomic':     { nazev: 'Atomic Aquatics', popis: 'Prémiové automatiky a masky s důrazem na zpracování a dlouhou životnost.' },
    'beuchat':    { nazev: 'Beuchat', popis: 'Francouzská značka pro freediving, lov pod hladinou a neopreny.' },
    'bigblue':    { nazev: 'Bigblue', popis: 'Svítilny pro potápění i podvodní video — široký i úzký paprsek.' },
    'cressi':     { nazev: 'Cressi', popis: 'Italská klasika — masky, ploutve, šnorchly i počítače pro každou úroveň.' },
    'faber':      { nazev: 'Faber', popis: 'Ocelové tlakové láhve italské výroby pro rekreační i technické potápění.' },
    'hollis':     { nazev: 'Hollis', popis: 'Technické potápění — křídla, automatiky a vybavení pro náročné podmínky.' },
    'mares':      { nazev: 'Mares', popis: 'Nejširší nabídka v našem katalogu — od masek po počítače a automatiky.' },
    'omer':       { nazev: 'Omer', popis: 'Freediving a lov pod hladinou — neopreny, ploutve a harpuny.' },
    'salvimar':   { nazev: 'Salvimar', popis: 'Italské vybavení pro lov pod hladinou a freediving.' },
    'scubapro':   { nazev: 'Scubapro', popis: 'Vybavení pro rekreační i technické potápění se špičkovým servisem.' },
    'shearwater': { nazev: 'Shearwater', popis: 'Potápěčské počítače s barevným displejem — standard mezi techniky.' },
    'suunto':     { nazev: 'Suunto', popis: 'Finské počítače a kompasy. Přesnost, na kterou se dá spolehnout.' },
    'tecline':    { nazev: 'Tecline', popis: 'Technické vybavení — křídla, popruhy a příslušenství.' },
    'zeagle':     { nazev: 'Zeagle', popis: 'Modulární vesty a automatiky pro potápěče, kteří chtějí vybavení na míru.' }
  };

  (function () {
    if (document.body.getAttribute('data-page') !== 'znacka') return;
    var slug = new URLSearchParams(location.search).get('znacka');
    var z = slug && ZNACKY[slug];
    // neznámá nebo chybějící značka — zpět na katalog
    if (!z) { location.replace('katalog.html'); return; }
    document.title = z.nazev + ' — CEVOX Dive';
    naplnFiltrKontext(slug);
    document.querySelectorAll('[data-znacka-nazev]').forEach(function (e) { e.textContent = z.nazev; });
    document.querySelectorAll('[data-znacka-popis]').forEach(function (e) { e.textContent = z.popis; });
  })();


  /* C2 — druhá úroveň. Návrh taxonomie k potvrzení klientem; kategorie,
     které tu nejsou, druhou úroveň zatím nemají a řádek se nevykreslí. */
  var PODKATEGORIE = {
    'masky-ploutve': [
      { slug: 'bezramove',    nazev: 'Bezrámečkové masky' },
      { slug: 'freedivingove',nazev: 'Freedivingové masky' },
      { slug: 'detske',       nazev: 'Dětské masky' },
      { slug: 'ploutve',      nazev: 'Ploutve' },
      { slug: 'doplnky',      nazev: 'Doplňky k maskám' }
    ],
    'potapecske-pocitace': [
      { slug: 'hodinkove',    nazev: 'Hodinkové' },
      { slug: 'konzolove',    nazev: 'Konzolové' },
      { slug: 'freedivingove',nazev: 'Freedivingové' }
    ],
    'regulatory': [
      { slug: 'automatiky',   nazev: 'Automatiky' },
      { slug: 'oktopusy',     nazev: 'Oktopusy' },
      { slug: 'sety',         nazev: 'Kompletní sety' }
    ],
    'neopreny': [
      { slug: 'mokre',        nazev: 'Mokré' },
      { slug: 'polosuche',    nazev: 'Polosuché' },
      { slug: 'suche',        nazev: 'Suché' },
      { slug: 'kapuce-rukavice', nazev: 'Kapuce a rukavice' }
    ],
    'svitilny': [
      { slug: 'primarni',     nazev: 'Primární' },
      { slug: 'zalozni',      nazev: 'Záložní' },
      { slug: 'video',        nazev: 'Video' }
    ],
    'snorchly': [
      { slug: 'klasicke',     nazev: 'Klasické' },
      { slug: 'suche',        nazev: 'Suché' },
      { slug: 'detske',       nazev: 'Dětské' }
    ],
    'vyvazovaci-vesty': [
      { slug: 'jacket',       nazev: 'Jacket' },
      { slug: 'kridla',       nazev: 'Křídla' },
      { slug: 'detske',       nazev: 'Dětské' }
    ],
    'tlakove-lahve': [
      { slug: 'ocelove',      nazev: 'Ocelové' },
      { slug: 'hlinikove',    nazev: 'Hliníkové' },
      { slug: 'prislusenstvi',nazev: 'Příslušenství' }
    ]
  };
  /* ---------- kategorie.html — texty podle slugu v URL ---------- */
  var KATEGORIE = {
    'doplnky':             { nazev: 'Doplňky', popis: 'Drobné doplňky a příslušenství pro potápěče.' },
    'hadice':              { nazev: 'Hadice', popis: 'Nízkotlaké i vysokotlaké hadice k automatikám a přístrojům.' },
    'harpuny':             { nazev: 'Harpuny', popis: 'Harpuny a příslušenství pro lov pod hladinou.' },
    'kompresory':          { nazev: 'Kompresory', popis: 'Kompresory na plnění lahví stlačeným vzduchem — pro kluby i domácí použití.' },
    'masky-ploutve':       { nazev: 'Masky & ploutve', popis: 'Masky s čirým i tónovaným sklem a ploutve pro rekreační i technické potápění. Vyzkoušet můžete na prodejně.' },
    'neopreny':            { nazev: 'Neopreny', popis: 'Mokré i polosuché obleky v tloušťkách 3–7 mm. Poradíme s výběrem velikosti podle teploty vody.' },
    'novinky':             { nazev: 'Novinky', popis: 'Nově naskladněné produkty a novinky v nabídce.' },
    'noze':                { nazev: 'Potápěčské nože', popis: 'Potápěčské nože a řezáky — nerezové i titanové, s pouzdrem.' },
    'obleceni-do-vody':    { nazev: 'Oblečení do vody', popis: 'Lycrové obleky, plavky a oblečení do vody pro teplé i chladné podmínky.' },
    'plavecke-bryle':      { nazev: 'Plavecké brýle', popis: 'Plavecké brýle pro bazén i otevřenou vodu.' },
    'plavecke-doplnky':    { nazev: 'Plavecké doplňky', popis: 'Čepice, špunty, klipy a další plavecké doplňky.' },
    'potapecske-pocitace': { nazev: 'Potápěčské počítače', popis: 'Potápěčské počítače a computery pro každou disciplínu — od jednoduchých pro začátečníky po prémiové s barevným displejem a vzduchovou integrací.' },
    'rashguard-trika':     { nazev: 'RashGuard trika', popis: 'Trika a RashGuard vrstvy s UV ochranou pro vodu i pláž.' },
    'regulatory':          { nazev: 'Regulátory', popis: 'Dýchací automatiky a kompletní sety od autorizovaných značek. Servis zajišťujeme přímo u nás na prodejně.' },
    'snorchly':            { nazev: 'Šnorchly', popis: 'Šnorchly pro potápění i šnorchlování — klasické, polosuché i suché s ventilem.' },
    'svitilny':            { nazev: 'Svítilny', popis: 'Primární i záložní svítilny pro noční a jeskynní potápění. Široký i úzký paprsek, dobíjecí i na baterie.' },
    'tasky-batohy-vaky':   { nazev: 'Tašky, batohy, vaky', popis: 'Tašky, batohy a vaky na přepravu potápěčské výstroje.' },
    'tlakove-lahve':       { nazev: 'Tlakové láhve', popis: 'Potápěčské tlakové láhve různých objemů, ocelové i hliníkové.' },
    'vyvazovaci-vesty':    { nazev: 'Vyvažovací vesty', popis: 'Žakety, křídla a vyvažovací vesty pro každý styl potápění — od rekreačního po technický.' },
  };

  (function () {
    if (document.body.getAttribute('data-page') !== 'kategorie') return;
    var slug = new URLSearchParams(location.search).get('kategorie');
    var k = slug && KATEGORIE[slug];
    // neznámý nebo chybějící slug — zpět na katalog
    if (!k) { location.replace('katalog.html'); return; }
    document.title = k.nazev + ' — CEVOX Dive';
    naplnFiltrKontext(slug);
    document.querySelectorAll('[data-kat-nazev]').forEach(function (e) { e.textContent = k.nazev; });
    document.querySelectorAll('[data-kat-popis]').forEach(function (e) { e.textContent = k.popis; });

    /* C2 — druhá úroveň: řádek podkategorií, aktivní podle ?podkategorie= */
    var box = document.querySelector('[data-podkategorie]');
    var deti = PODKATEGORIE[slug];
    if (box && deti && deti.length) {
      var aktivni = new URLSearchParams(location.search).get('podkategorie') || '';
      var odkaz = function (pslug, nazev) {
        var cil = 'kategorie.html?kategorie=' + encodeURIComponent(slug) +
                  (pslug ? '&podkategorie=' + encodeURIComponent(pslug) : '');
        var je = (pslug === aktivni);
        return '<a class="subcats__item' + (je ? ' is-active' : '') + '" href="' + cil + '"' +
               (je ? ' aria-current="page"' : '') + '>' + nazev + '</a>';
      };
      box.innerHTML = odkaz('', 'Vše') + deti.map(function (d) {
        return odkaz(d.slug, d.nazev);
      }).join('');
      box.hidden = false;

      // zvolená podkategorie se propíše do nadpisu, drobečků i titulku
      var vybrana = deti.filter(function (d) { return d.slug === aktivni; })[0];
      if (vybrana) {
        document.title = vybrana.nazev + ' — ' + k.nazev + ' — CEVOX Dive';
        document.querySelectorAll('[data-kat-nazev]').forEach(function (e) { e.textContent = vybrana.nazev; });
        // nadřazená kategorie musí v drobečcích zůstat, jinak se z cesty ztratí
        var akt = document.querySelector('.breadcrumbs .breadcrumbs__current');
        if (akt && !akt.previousElementSibling.matches('[data-kat-rodic]')) {
          var sip = akt.previousElementSibling ? akt.previousElementSibling.cloneNode(true) : null;
          var rodic = document.createElement('a');
          rodic.setAttribute('data-kat-rodic', '');
          rodic.href = 'kategorie.html?kategorie=' + encodeURIComponent(slug);
          rodic.textContent = k.nazev;
          akt.parentNode.insertBefore(rodic, akt);
          if (sip) akt.parentNode.insertBefore(sip, akt);
        }
      }
      // filtry nesmí podkategorii ztratit
      var skryte = document.querySelector('form.filters__form');
      if (skryte && aktivni && !skryte.querySelector('[name="podkategorie"]')) {
        var i = document.createElement('input');
        i.type = 'hidden'; i.name = 'podkategorie'; i.value = aktivni;
        skryte.insertBefore(i, skryte.firstChild);
      }
    }
  })();

  /* ---------- pomocné ---------- */
  function czk(n) {
    return n.toLocaleString('cs-CZ').replace(/ /g, ' ') + ' Kč';
  }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function icon(name, size, sw, extra) {
    return '<svg class="ic" width="' + size + '" height="' + size + '"' +
      ' style="stroke-width:' + (sw || 2) + (extra ? ';' + extra : '') + '">' +
      '<use href="#' + name + '"/></svg>';
  }

  /* ---------- stav košíku ----------
     Data drží js/kosik-data.js, tady se jen čte a vykresluje. */
  function cartItems() { return Kosik.polozky(); }
  function cartCount() { return Kosik.pocetKusu(); }
  function cartSum() { return Kosik.mezisoucet(); }

  function updateCartIndicators() {
    document.querySelectorAll('[data-cart-count]').forEach(function (n) { n.textContent = cartCount(); });
    document.querySelectorAll('[data-cart-sum]').forEach(function (n) { n.textContent = czk(cartSum()); });
  }

  /* ---------- scrim (společné pozadí overlayů) ---------- */
  var scrim = el('<div class="scrim"></div>');
  document.body.appendChild(scrim);
  var openOverlays = [];
  function openOverlay(node) {
    node.classList.add('is-open');
    scrim.classList.add('is-open');
    document.body.classList.add('overlay-open');
    if (openOverlays.indexOf(node) === -1) openOverlays.push(node);
  }
  function closeOverlays() {
    openOverlays.forEach(function (n) { n.classList.remove('is-open'); });
    openOverlays = [];
    scrim.classList.remove('is-open');
    document.body.classList.remove('overlay-open');
  }
  scrim.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlays(); });

  /* ---------- toast ---------- */
  var toast = el('<div class="toast" role="status"></div>');
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-open'); }, 2400);
  }

  /* ---------- mini-košík drawer (9a) ---------- */
  var drawer = el(
    '<aside class="cart-drawer" aria-label="Košík">' +
    '  <div class="cart-drawer__head">' +
    '    <div style="display:flex;align-items:center;gap:11px">' +
    '      <span class="cart-drawer__title">Váš košík</span>' +
    '      <span style="background:#EAF7FA;color:var(--teal);font-size:12px;font-weight:700;padding:3px 9px;border-radius:20px" data-drawer-count></span>' +
    '    </div>' +
    '    <button class="icon-btn" data-overlay-close aria-label="Zavřít košík">' + icon('i-x', 17, 2.2) + '</button>' +
    '  </div>' +
    '  <div class="cart-drawer__items no-scrollbar" data-drawer-items></div>' +
    '  <div class="cart-drawer__foot">' +
    '    <div class="freeship" data-drawer-freeship></div>' +
    '    <div class="cart-drawer__total">' +
    '      <span class="cart-drawer__total-label">Mezisoučet</span>' +
    '      <span class="cart-drawer__total-sum" data-drawer-sum></span>' +
    '    </div>' +
    '    <a class="btn btn--primary btn--block" href="kosik.html" style="font-family:var(--font-display);font-size:15px;margin-bottom:10px">Přejít do košíku ' + icon('i-arrow-right', 18, 2.2) + '</a>' +
    '    <div style="text-align:center;font-size:13px;color:var(--teal);font-weight:600;cursor:pointer" data-overlay-close>Pokračovat v nákupu</div>' +
    '  </div>' +
    '</aside>');
  document.body.appendChild(drawer);

  function freeshipHTML(sum) {
    if (sum >= FREE_SHIPPING) {
      return '<div class="freeship__label" style="display:flex;align-items:center;justify-content:space-between">' +
        '<span style="display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#1F7A45">' + icon('i-check', 16, 2.2, 'color:#2FA35D') + ' Máte dopravu zdarma</span>' +
        '<span style="font-size:12.5px;font-weight:700;color:#2FA35D">100 %</span></div>' +
        '<div class="freeship__track"><div class="freeship__fill" style="width:100%;background:#2FA35D"></div></div>';
    }
    var missing = FREE_SHIPPING - sum;
    var pct = Math.min(99, Math.round(sum / FREE_SHIPPING * 100));
    return '<div class="freeship__label">Zbývá <strong style="color:var(--red-sale)">' + czk(missing) + '</strong> do <strong>dopravy zdarma</strong></div>' +
      '<div class="freeship__track"><div class="freeship__fill" style="width:' + pct + '%"></div></div>';
  }

  function renderDrawer() {
    var box = drawer.querySelector('[data-drawer-items]');
    box.innerHTML = '';
    if (!cartItems().length) {
      box.innerHTML = '<p style="padding:24px 0;color:var(--muted);font-size:14px">Košík je prázdný.</p>';
    }
    cartItems().forEach(function (item) {
      var row = el(
        '<div class="cart-item" data-id="' + item.id + '">' +
        '  <div class="cart-item__thumb"><img src="' + item.obrazek + '" alt=""></div>' +
        '  <div class="cart-item__body">' +
        '    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
        '      <div style="min-width:0">' +
        '        <div class="cart-item__brand">' + item.znacka + '</div>' +
        '        <div class="cart-item__name">' + item.nazev + '</div>' +
        '      </div>' +
        '      <button class="cart-item__remove" title="Odebrat z košíku" data-remove>' + icon('i-trash', 16, 1.9) + '</button>' +
        '    </div>' +
        '    <div class="cart-item__row">' +
        '      <span class="qty">' +
        '        <button class="qty__btn" data-qty="-1" aria-label="Méně">−</button>' +
        '        <span class="qty__num">' + item.pocet + '</span>' +
        '        <button class="qty__btn" data-qty="1" aria-label="Více">+</button>' +
        '      </span>' +
        '      <span class="cart-item__price">' + czk(item.cena * item.pocet) + '</span>' +
        '    </div>' +
        '  </div>' +
        '</div>');
      box.appendChild(row);
    });
    drawer.querySelector('[data-drawer-count]').textContent =
      cartCount() + ' ' + (cartCount() === 1 ? 'položka' : cartCount() < 5 ? 'položky' : 'položek');
    drawer.querySelector('[data-drawer-sum]').textContent = czk(cartSum());
    drawer.querySelector('[data-drawer-freeship]').innerHTML = freeshipHTML(cartSum());
  }

  drawer.addEventListener('click', function (e) {
    var row = e.target.closest('.cart-item');
    if (!row) return;
    var id = row.getAttribute('data-id');
    var item = cartItems().find(function (i) { return i.id === id; });
    if (!item) return;
    if (e.target.closest('[data-remove]')) {
      Kosik.odeber(id);
    } else if (e.target.closest('[data-qty]')) {
      var krok = parseInt(e.target.closest('[data-qty]').getAttribute('data-qty'), 10);
      Kosik.zmenPocet(id, Math.max(1, item.pocet + krok));
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-open]')) {
      e.preventDefault();
      renderDrawer();
      openOverlay(drawer);
    }
    if (e.target.closest('[data-overlay-close]')) closeOverlays();
    if (e.target.closest('[data-menu-open]')) {
      var menu = document.getElementById('mobile-menu');
      if (menu) openOverlay(menu);
    }
    if (e.target.closest('[data-menu-close]')) closeOverlays();
    var catTrig = e.target.closest('[data-catalog-trigger]');
    if (catTrig) {
      // klik na "Katalog" v headeru otevře vyjížděcí panel kategorií místo navigace
      e.preventDefault();
      var menu2 = document.getElementById('mobile-menu');
      if (menu2) openOverlay(menu2);
    }
  });

  /* ---------- mezikošík — „Přidáno do košíku" (8d desktop / 8e bottom sheet) ---------- */
  var addedModal = el(
    '<div class="added-modal" role="dialog" aria-label="Přidáno do košíku">' +
    '  <div class="added-modal__head">' +
    '    <span class="added-modal__check">' + icon('i-check', 18, 2.6) + '</span>' +
    '    <div class="added-modal__title">Přidáno do košíku</div>' +
    '    <button class="added-modal__close" data-overlay-close aria-label="Zavřít">' + icon('i-x', 17, 2.4) + '</button>' +
    '  </div>' +
    '  <div class="added-modal__ship" data-am-ship></div>' +
    '  <div class="added-modal__product" data-am-product></div>' +
    '  <div class="added-modal__foot">' +
    '    <div class="added-modal__sum">' +
    '      <span class="added-modal__sum-label">V košíku: <strong data-am-count></strong></span>' +
    '      <span class="added-modal__sum-price" data-am-sum></span>' +
    '    </div>' +
    '    <div class="added-modal__actions">' +
    '      <button class="btn btn--ghost" data-overlay-close>Pokračovat v nákupu</button>' +
    '      <a class="btn btn--primary" href="kosik.html">Přejít do košíku ' + icon('i-arrow-right', 17, 2.2) + '</a>' +
    '    </div>' +
    '  </div>' +
    '</div>');
  // na krocích pokladny není žádné [data-add-to-cart], mezikošík by byl mrtvý prvek
  if (!document.querySelector('.co-mobile')) document.body.appendChild(addedModal);

  function renderAddedModal(product) {
    addedModal.querySelector('[data-am-ship]').innerHTML =
      '<div class="added-modal__ship-label">' + icon('i-truck', 18, 1.8) +
      (cartSum() >= FREE_SHIPPING
        ? '<span><strong style="color:#1F7A45">Máte dopravu zdarma</strong></span>'
        : '<span>Zbývá jen <strong class="left">' + czk(FREE_SHIPPING - cartSum()) + '</strong> do <strong>dopravy zdarma</strong></span>') +
      '</div>' +
      '<div class="added-modal__ship-track"><div class="added-modal__ship-fill" style="width:' +
      Math.min(100, Math.round(cartSum() / FREE_SHIPPING * 100)) + '%"></div></div>';

    addedModal.querySelector('[data-am-product]').innerHTML =
      '<div class="added-modal__thumb"><img src="' + product.img + '" alt=""></div>' +
      '<div style="flex:1;min-width:0">' +
      '  <div class="added-modal__p-brand">' + product.brand + '</div>' +
      '  <div class="added-modal__p-name">' + product.name + '</div>' +
      '  <div class="added-modal__p-variant">' + (product.variant ? product.variant + ' · ' : '') + '1 ks</div>' +
      '</div>' +
      '<div class="added-modal__p-price">' + czk(product.price) + '</div>';

    addedModal.querySelector('[data-am-count]').textContent =
      cartCount() + ' ' + (cartCount() === 1 ? 'položka' : cartCount() < 5 ? 'položky' : 'položek');
    addedModal.querySelector('[data-am-sum]').textContent = czk(cartSum());
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    var p = {
      id:      btn.getAttribute('data-product-id') || '',
      brand:   btn.getAttribute('data-brand') || '',
      name:    btn.getAttribute('data-name') || '',
      variant: btn.getAttribute('data-variant') || '',
      price:   parseInt(btn.getAttribute('data-price') || '0', 10),
      img:     btn.getAttribute('data-img') || ''
    };
    Kosik.pridej({ id: p.id, znacka: p.brand, nazev: p.name, varianta: p.variant, cena: p.price, pocet: 1, obrazek: p.img });
    renderAddedModal(p);
    openOverlay(addedModal);
  });

  /* ---------- karusely: ukazatel posunu (posouvá se nativně, viz scroll-snap v CSS) ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.parentElement.querySelector('[data-scroll-line]');
    var line = track && track.querySelector('.scroll-line__fill');
    var thumbW = 26; // % — přepočítá updateLine()

    function maxScroll() { return car.scrollWidth - car.clientWidth; }
    function updateLine() {
      if (!line) return;
      var max = maxScroll();
      var visible = car.clientWidth / car.scrollWidth;
      var pos = max > 0 ? car.scrollLeft / max : 0;
      thumbW = Math.max(10, visible * 100);
      line.style.width = thumbW + '%';
      line.style.marginLeft = (pos * (100 - thumbW)) + '%';
    }
    car.addEventListener('scroll', updateLine, { passive: true });
    window.addEventListener('resize', updateLine);
    updateLine();

    /* Ukazatel je zároveň ovladač — táhnutím se posouvá karusel.
       Karty samotné se netáhnou, ty řeší nativní posun + scroll-snap v CSS. */
    if (track) {
      var tahne = false, cekaSnimek = false, posledniX = 0;
      function naPozici(clientX) {
        var r = track.getBoundingClientRect();
        var sirkaPalce = (thumbW / 100) * r.width;
        var volno = r.width - sirkaPalce;
        if (volno <= 0) return;
        var pomer = Math.min(1, Math.max(0, (clientX - r.left - sirkaPalce / 2) / volno));
        car.scrollLeft = pomer * maxScroll();
      }
      track.addEventListener('pointerdown', function (e) {
        tahne = true;
        track.classList.add('is-grabbing');
        // scroll-snap během tažení dorovnává na dlaždice a pohyb pak seká
        car.classList.add('is-dragging');
        try { track.setPointerCapture(e.pointerId); } catch (_) {}
        naPozici(e.clientX);
        e.preventDefault();
      });
      track.addEventListener('pointermove', function (e) {
        if (!tahne) return;
        posledniX = e.clientX;
        if (cekaSnimek) return;
        cekaSnimek = true;
        requestAnimationFrame(function () { cekaSnimek = false; naPozici(posledniX); });
      });
      function konec() {
        if (!tahne) return;
        tahne = false;
        track.classList.remove('is-grabbing');
        car.classList.remove('is-dragging');   // po puštění se zarovná na dlaždici
      }
      track.addEventListener('pointerup', konec);
      track.addEventListener('pointercancel', konec);
    }
  });

  /* ---------- taby (PDP) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var btns = group.querySelectorAll('[data-tab-btn]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var target = b.getAttribute('data-tab-btn');
        // tab „Recenze" jen sroluje na sekci recenzí
        if (target === 'recenze-tab') {
          var sec = document.getElementById('recenze');
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        btns.forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        document.querySelectorAll('[data-tabs-panels="' + group.getAttribute('data-tabs') + '"] [data-tab-panel]')
          .forEach(function (p) { p.hidden = p.getAttribute('data-tab-panel') !== target; });
      });
    });
  });

  /* ---------- FAQ akordeon (chevrony, otevřená = aqua) ---------- */
  document.querySelectorAll('[data-acc-item]').forEach(function (item) {
    var head = item.querySelector('[data-acc-head]');
    if (!head) return;
    head.addEventListener('click', function () {
      var open = item.classList.contains('is-open');
      var group = item.closest('[data-acc-group]');
      if (group) group.querySelectorAll('[data-acc-item].is-open').forEach(function (o) { o.classList.remove('is-open'); });
      if (!open) item.classList.add('is-open');
    });
  });

  /* ---------- galerie (PDP) ---------- */
  var mainImg = document.querySelector('[data-gallery-main]');
  if (mainImg) {
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-gallery-thumb]'));
    var dots = document.querySelectorAll('[data-gallery-dots] span');
    var current = 0;
    function showImage(i) {
      current = (i + thumbs.length) % thumbs.length;
      mainImg.src = thumbs[current].querySelector('img').src;
      thumbs.forEach(function (t, j) { t.classList.toggle('is-active', j === current); });
      dots.forEach(function (d, j) { d.classList.toggle('is-active', j === current); });
    }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { showImage(i); });
    });
    var prev = document.querySelector('[data-gallery-prev]');
    var next = document.querySelector('[data-gallery-next]');
    if (prev) prev.addEventListener('click', function () { showImage(current - 1); });
    if (next) next.addEventListener('click', function () { showImage(current + 1); });
  }

  /* ---------- quantity steppery mimo drawer (PDP, checkout) ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]');
    if (!b) return;
    var wrap = b.closest('[data-stepper]');
    var num = wrap && wrap.querySelector('[data-step-num]');
    if (!num) return;
    var v = Math.max(1, parseInt(num.textContent, 10) + parseInt(b.getAttribute('data-step'), 10));
    num.textContent = v;
  });

  /* ---------- aktivní položka spodní tab-bar ---------- */
  var page = document.body.getAttribute('data-page');
  document.querySelectorAll('.tab-bar__item[data-tab]').forEach(function (t) {
    if (t.getAttribute('data-tab') === page) t.classList.add('tab-bar__item--active');
  });

  /* ---------- filtry: rozbalení panelu (samotné filtrování řeší server) ---------- */
  var filtersToggle = document.querySelector('[data-filters-toggle]');
  if (filtersToggle) {
    filtersToggle.addEventListener('click', function () {
      document.querySelector('.filters').classList.toggle('is-open');
    });
  }

  /* šipky karuselu kategorií */
  document.querySelectorAll('[data-scroll-prev],[data-scroll-next]').forEach(function (b) {
    b.addEventListener('click', function () {
      var strip = b.parentElement.querySelector('[data-carousel]');
      if (!strip) return;
      var dir = b.hasAttribute('data-scroll-next') ? 1 : -1;
      strip.scrollBy({ left: dir * 328, behavior: 'smooth' });
    });
  });

  /* aktivní položka mega navigace */
  if (page === 'kategorie' || page === 'produkt') {
    var navLink = document.querySelector('.mega-nav a[data-nav="pocitace"]');
    if (navLink) navLink.classList.add('is-active');
  }

  /* ---------- stín sticky hlavičky až po odscrollování ---------- */
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    // práh = spodní hrana utility pruhu nad hlavičkou
    var stuckThreshold = Math.max(0, siteHeader.getBoundingClientRect().top + window.scrollY - 2);
    var onScroll = function () {
      siteHeader.classList.toggle('is-stuck', window.scrollY > stuckThreshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- zobrazit / skrýt heslo ---------- */
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.parentElement && btn.parentElement.querySelector('input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.classList.toggle('is-on');
    });
  });

  /* ---------- auth formuláře (demo proklik: přihlášení / registrace) ---------- */
  document.querySelectorAll('form[data-auth-go]').forEach(function (form) {
    var target = form.getAttribute('data-auth-go');
    var email = form.querySelector('input[type="email"]');
    if (email) {
      // vlastní hláška, když v e-mailu chybí @
      email.addEventListener('input', function () { email.setCustomValidity(''); });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (email && email.value.indexOf('@') === -1) {
        email.setCustomValidity('E-mail musí obsahovat @');
        email.reportValidity();
        return;
      }
      // shoda hesel (jen když existují obě pole)
      var pw = form.querySelector('[data-pw]');
      var pw2 = form.querySelector('[data-pw2]');
      if (pw && pw2 && pw.value !== pw2.value) {
        pw2.setCustomValidity('Hesla se neshodují');
        pw2.reportValidity();
        return;
      }
      window.location.href = target;
    });
    // reset hlášky o shodě při psaní
    var pw2reset = form.querySelector('[data-pw2]');
    if (pw2reset) pw2reset.addEventListener('input', function () { pw2reset.setCustomValidity(''); });
  });

  /* ---------- sociální přihlášení / registrace (demo proklik) ---------- */
  document.querySelectorAll('[data-social-go]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.href = btn.getAttribute('data-social-go');
    });
  });


  // modul ohlásí každou změnu — odznak i drawer se překreslí samy
  Kosik.naZmenu(function () {
    updateCartIndicators();
    renderDrawer();
  });
  updateCartIndicators();
})();


/* Clickable product tiles -> product detail */
document.addEventListener('click', function(e){
  if(e.target.closest('[data-add-to-cart]')) return;
  if(e.target.closest('a')) return;
  if(e.target.closest('.product-card__fav,[data-fav],[data-wishlist],button')) return;
  var card=e.target.closest('[data-product-card]');
  if(card){ var u=card.getAttribute('data-product-link'); if(u) window.location.href=u; }
});

/* Newsletter – zelené potvrzení odběru (~7 s) */
document.querySelectorAll('[data-newsletter]').forEach(function(nl){
  var form=nl.querySelector('.newsletter__form'); if(!form) return;
  var input=form.querySelector('input'); var timer=null;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v=(input.value||'').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ input.focus(); return; }
    nl.querySelectorAll('[data-nl-email]').forEach(function(x){ x.textContent=v; });
    nl.classList.add('is-success');
    if(timer) clearTimeout(timer);
    timer=setTimeout(function(){ nl.classList.remove('is-success'); input.value=''; }, 7000);
  });
});

/* ===================== Cookie lišta ===================== */
(function(){
  var KEY='cevox-cookie-consent';
  function getStored(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch(e){ return null; } }
  function store(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }
  if(getStored()) return;               // souhlas už uložen -> nic nezobrazuj

  var bar=document.createElement('div');
  bar.className='cookie-bar';
  bar.innerHTML=''
   +'<div class="cookie-bar__inner">'
   +'  <div class="cookie-bar__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><circle cx="9" cy="10" r="1"></circle><circle cx="14" cy="14" r="1"></circle><circle cx="9.5" cy="15" r="1"></circle></svg></div>'
   +'  <div class="cookie-bar__body">'
   +'    <div class="cookie-bar__title">Používáme cookies \uD83C\uDF6A</div>'
   +'    <div class="cookie-bar__text">Cookies nám pomáhají web správně zobrazit, měřit návštěvnost a s vaším souhlasem přizpůsobit nabídku. Podrobnosti najdete v <a href="ochrana-osobnich-udaju.html">Zásadách ochrany osobních údajů</a>.</div>'
   +'  </div>'
   +'  <div class="cookie-bar__actions">'
   +'    <button class="cookie-btn cookie-btn--ghost" data-ck="reject">Odmítnout</button>'
   +'    <button class="cookie-btn cookie-btn--outline" data-ck="settings"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Nastavení</button>'
   +'    <button class="cookie-btn cookie-btn--primary" data-ck="accept">Přijmout vše</button>'
   +'  </div>'
   +'</div>';
  document.body.appendChild(bar);

  function close(){ if(bar.parentNode) bar.parentNode.removeChild(bar); var m=document.querySelector('.cookie-modal'); if(m) m.parentNode.removeChild(m); }
  function acceptAll(){ store({necessary:true,analytics:true,marketing:true,ts:Date.now()}); close(); }
  function reject(){ store({necessary:true,analytics:false,marketing:false,ts:Date.now()}); close(); }

  function openSettings(){
    var m=document.createElement('div'); m.className='cookie-modal';
    m.innerHTML=''
     +'<div class="cookie-modal__card" role="dialog" aria-modal="true">'
     +'  <div class="cookie-modal__title">Nastavení cookies</div>'
     +'  <div class="cookie-modal__sub">Vyberte, které cookies smíme používat.</div>'
     +'  <div class="cookie-row"><div><div class="cookie-row__name">Nezbytné cookies</div><div class="cookie-row__desc">Košík, přihlášení a bezpečnost. Nelze vypnout.</div></div><div style="display:flex;align-items:center;gap:12px"><span class="cookie-row__on">Vždy<br>aktivní</span><button class="cookie-switch cookie-switch--nec on" aria-disabled="true"></button></div></div>'
     +'  <div class="cookie-row"><div><div class="cookie-row__name">Analytické cookies</div><div class="cookie-row__desc">Anonymní statistika návštěvnosti webu.</div></div><button class="cookie-switch on" data-ck-toggle="analytics" aria-pressed="true"></button></div>'
     +'  <div class="cookie-row"><div><div class="cookie-row__name">Marketingové cookies</div><div class="cookie-row__desc">Personalizace nabídek a reklamy.</div></div><button class="cookie-switch" data-ck-toggle="marketing" aria-pressed="false"></button></div>'
     +'  <div class="cookie-modal__actions"><button class="cookie-btn cookie-btn--dark" data-ck="save">Uložit nastavení</button><button class="cookie-btn cookie-btn--outline" data-ck="accept" style="justify-content:center">Přijmout vše</button></div>'
     +'</div>';
    document.body.appendChild(m);
    m.querySelectorAll('[data-ck-toggle]').forEach(function(sw){
      sw.addEventListener('click', function(){ var on=sw.classList.toggle('on'); sw.setAttribute('aria-pressed', on?'true':'false'); });
    });
    m.addEventListener('click', function(e){ if(e.target===m){ m.parentNode.removeChild(m); } });
    m.querySelector('[data-ck="save"]').addEventListener('click', function(){
      var a=m.querySelector('[data-ck-toggle="analytics"]').classList.contains('on');
      var mk=m.querySelector('[data-ck-toggle="marketing"]').classList.contains('on');
      store({necessary:true,analytics:a,marketing:mk,ts:Date.now()}); close();
    });
    m.querySelector('[data-ck="accept"]').addEventListener('click', acceptAll);
  }

  bar.querySelector('[data-ck="accept"]').addEventListener('click', acceptAll);
  bar.querySelector('[data-ck="reject"]').addEventListener('click', reject);
  bar.querySelector('[data-ck="settings"]').addEventListener('click', openSettings);
})();

/* Wishlist srdíčka – přepínání (oranžové) */
document.addEventListener('click', function(e){
  var fav = e.target.closest('[data-fav]');
  if(!fav) return;
  e.preventDefault(); e.stopPropagation();
  fav.classList.toggle('is-fav');
});

/* Kategorie & disciplíny (.catpage) – vyjížděcí filtry (mobil) */
(function(){
  if(!document.body.matches('.catpage')) return;
  var panel=document.querySelector('[data-filter-panel]');
  var grid=document.querySelector('.prod-grid');
  if(!panel || !grid) return;
  var fab=document.createElement('button');
  fab.className='filter-fab'; fab.type='button'; fab.setAttribute('aria-label','Filtrovat');
  fab.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>';
  document.body.appendChild(fab);                 /* do body -> fixed vůči viewportu */
  var head=document.createElement('div'); head.className='filter-drawer__head';
  head.innerHTML='<strong>Filtry</strong><button class="filter-drawer__close" type="button" aria-label="Zavřít"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>';
  panel.insertBefore(head, panel.firstChild);
  var apply=document.createElement('button'); apply.className='filter-drawer__apply'; apply.type='button'; apply.textContent='Zobrazit produkty';
  panel.appendChild(apply);
  var bd=document.createElement('div'); bd.className='filter-backdrop';
  document.body.appendChild(bd);
  function open(){ panel.classList.add('is-open'); bd.classList.add('is-open'); document.body.classList.add('filter-open'); }
  function shut(){ panel.classList.remove('is-open'); bd.classList.remove('is-open'); document.body.classList.remove('filter-open'); }
  fab.addEventListener('click', open);
  bd.addEventListener('click', shut);
  head.querySelector('.filter-drawer__close').addEventListener('click', shut);
  apply.addEventListener('click', function(){
    var form = panel.querySelector('form.filters__form');
    if (form) { form.submit(); return; }   // filtruje server
    shut();
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && panel.classList.contains('is-open')) shut(); });
})();



/* Katalog – rychlé vyhledávání kategorií */
(function(){
  if(!document.body.matches('[data-page="katalog"]')) return;
  var root = document.querySelector('[data-catsearch]');
  var grid = document.querySelector('.cat-grid-m');
  if(!root || !grid) return;

  var input   = root.querySelector('[data-catsearch-input]');
  var clearBtn= root.querySelector('[data-catsearch-clear]');
  var countEl = root.querySelector('[data-catsearch-count]');
  var emptyEl = root.querySelector('[data-catsearch-empty]');
  var emptyTxt= root.querySelector('[data-catsearch-empty-text]');
  var showAll = root.querySelector('[data-catsearch-showall]');
  var chips   = root.querySelectorAll('[data-catsearch-chip]');

  var tiles = Array.prototype.slice.call(grid.querySelectorAll('[data-cat-tile]'));

  // normalizace: české znaky -> základní, zachovává délku (pro indexy zvýraznění)
  var MAP = {'á':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i','ň':'n','ó':'o','ř':'r','š':'s','ť':'t','ú':'u','ů':'u','ý':'y','ž':'z',
             'Á':'a','Č':'c','Ď':'d','É':'e','Ě':'e','Í':'i','Ň':'n','Ó':'o','Ř':'r','Š':'s','Ť':'t','Ú':'u','Ů':'u','Ý':'y','Ž':'z'};
  function norm(s){
    var out = '';
    for(var i=0;i<s.length;i++){ var ch=s[i]; out += (MAP[ch] !== undefined ? MAP[ch] : ch.toLowerCase()); }
    return out;
  }

  // předpočítej data pro každou dlaždici
  var data = tiles.map(function(t, idx){
    var h3 = t.querySelector('h3');
    var name = t.getAttribute('data-cat-name') || (h3? h3.textContent.trim() : '');
    return { el:t, h3:h3, name:name, normName:norm(name), htmlOrig: h3? h3.innerHTML : '', order:idx };
  });

  function czCount(n){
    if(n===1) return '1 kategorie';
    if(n>=2 && n<=4) return n+' kategorie';
    return n+' kategorií';
  }

  var kbdIndex = -1; // index v aktuálně viditelných

  function clearHighlight(d){ if(d.h3) d.h3.innerHTML = d.htmlOrig; }
  function highlight(d, start, len){
    if(!d.h3) return;
    var name = d.name;
    var before = name.slice(0, start);
    var match  = name.slice(start, start+len);
    var after  = name.slice(start+len);
    var esc = function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    d.h3.innerHTML = esc(before) + '<mark>' + esc(match) + '</mark>' + esc(after);
  }

  function apply(){
    var qRaw = input.value;
    var q = norm(qRaw.trim());
    clearBtn.hidden = qRaw.length===0;

    if(q===''){
      // reset
      data.forEach(function(d){ d.el.hidden=false; clearHighlight(d); d.el.classList.remove('is-kbd-active'); });
      // původní pořadí
      data.slice().sort(function(a,b){return a.order-b.order;}).forEach(function(d){ grid.appendChild(d.el); });
      countEl.hidden = true; emptyEl.hidden = true;
      kbdIndex = -1;
      return;
    }

    // najdi shody
    var matches = [];
    data.forEach(function(d){
      var pos = d.normName.indexOf(q);
      if(pos>=0){ matches.push({d:d, pos:pos, starts: pos===0}); }
      else { d.el.hidden = true; clearHighlight(d); d.el.classList.remove('is-kbd-active'); }
    });

    // řazení: začíná dotazem nahoru, pak ostatní, jinak původní pořadí
    matches.sort(function(a,b){
      if(a.starts!==b.starts) return a.starts? -1 : 1;
      return a.d.order - b.d.order;
    });

    // vykresli
    matches.forEach(function(m){
      m.d.el.hidden = false;
      highlight(m.d, m.pos, q.length);
      grid.appendChild(m.d.el); // přeřaď v DOM
    });

    // počet + prázdný stav
    if(matches.length===0){
      countEl.hidden = true;
      emptyEl.hidden = false;
      emptyTxt.textContent = 'Nic pro „' + qRaw.trim() + '"';
    } else {
      emptyEl.hidden = true;
      countEl.hidden = false;
      countEl.textContent = czCount(matches.length);
    }

    // reset klávesnicové aktivní
    data.forEach(function(d){ d.el.classList.remove('is-kbd-active'); });
    kbdIndex = -1;
  }

  function visibleTiles(){
    return data.filter(function(d){ return !d.el.hidden; })
               .sort(function(a,b){
                 // pořadí podle aktuálního DOM
                 return Array.prototype.indexOf.call(grid.children, a.el) - Array.prototype.indexOf.call(grid.children, b.el);
               });
  }

  function setKbd(i){
    var vis = visibleTiles();
    data.forEach(function(d){ d.el.classList.remove('is-kbd-active'); });
    if(i<0 || i>=vis.length){ kbdIndex=-1; return; }
    kbdIndex = i;
    vis[i].el.classList.add('is-kbd-active');
    vis[i].el.scrollIntoView({block:'nearest'});
  }

  input.addEventListener('input', apply);

  input.addEventListener('keydown', function(e){
    var vis = visibleTiles();
    if(e.key==='ArrowDown'){ e.preventDefault(); setKbd(Math.min((kbdIndex<0?-1:kbdIndex)+1, vis.length-1)); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setKbd(Math.max((kbdIndex<0?vis.length:kbdIndex)-1, 0)); }
    else if(e.key==='Enter'){
      if(kbdIndex>=0 && vis[kbdIndex]){ window.location.href = vis[kbdIndex].el.getAttribute('href'); }
      else if(vis.length===1){ window.location.href = vis[0].el.getAttribute('href'); }
    }
    else if(e.key==='Escape'){ input.value=''; apply(); }
  });

  clearBtn.addEventListener('click', function(){ input.value=''; apply(); input.focus(); });
  showAll.addEventListener('click', function(){ input.value=''; apply(); input.focus(); });

  chips.forEach(function(c){
    c.addEventListener('click', function(){
      input.value = c.getAttribute('data-catsearch-chip');
      apply(); input.focus();
    });
  });

  // autofocus po načtení
  input.focus();
})();

/* GDPR / Obchodní podmínky – klikací obsah (TOC): zvýraznění aktivní položky při kliku */
(function(){
  if(!document.body.matches('[data-page="gdpr"]') && !document.body.matches('[data-page="obchodni-podminky"]')) return;
  var links = document.querySelectorAll('a[href^="#sekce-"]');
  if(!links.length) return;
  function setActive(el){
    links.forEach(function(a){
      a.style.background=''; a.style.color='#3A4A50'; a.style.fontWeight='';
      var num=a.querySelector('span'); if(num) num.style.color='#8FB0BB';
    });
    el.style.background='#F0F8FA'; el.style.color='#04323F'; el.style.fontWeight='600';
    var num=el.querySelector('span'); if(num) num.style.color='#0E6E86';
  }
  links.forEach(function(a){
    a.addEventListener('click', function(){ setActive(a); });
  });
})();

/* Checkout – nákup na firmu (rozbalení fakturačních údajů) */
(function(){
  var box = document.querySelector('[data-company]');
  if(!box) return;
  var toggle = box.querySelector('[data-company-toggle]');


  // rozbalení boxu
  toggle.addEventListener('change', function(){
    box.classList.toggle('is-open', toggle.checked);

  });
  // box je vždy defaultně zavřený


  // segment Ano/Ne (plátce DPH)
  var seg = box.querySelector('[data-dph-seg]');
  if(seg){
    seg.querySelectorAll('.seg__btn').forEach(function(b){
      b.addEventListener('click', function(){
        seg.querySelectorAll('.seg__btn').forEach(function(x){x.classList.remove('is-on');});
        b.classList.add('is-on');
      });
    });
  }
})();

/* Checkout – výběr dopravy/platby (vizuální zvýraznění dlaždice) */
(function(){
  var tiles = document.querySelectorAll('.opt-tile input[type="radio"]');
  if(!tiles.length) return;
  function sync(){
    document.querySelectorAll('.opt-tile').forEach(function(t){
      var r = t.querySelector('input[type="radio"]');
      t.classList.toggle('is-sel', !!(r && r.checked));
    });
  }
  tiles.forEach(function(r){ r.addEventListener('change', sync); });
  sync();
})();

/* Můj účet — mobilní vysouvací panel + toggly */
(function(){
  // otevření/zavření panelu
  function openAccount(e){ if(e) e.preventDefault(); document.body.classList.add('account-open'); }
  function closeAccount(){ document.body.classList.remove('account-open'); }

  // tab-bar Účet (mobil) otevře panel místo navigace
  document.querySelectorAll('.tab-bar__item[data-tab="ucet"]').forEach(function(el){
    el.addEventListener('click', function(e){
      if(window.matchMedia('(max-width: 900px)').matches){ openAccount(e); }
    });
  });
  // header Účet (mobil) taky
  document.querySelectorAll('.header-action[href="prihlaseni.html"], [data-account-open]').forEach(function(el){
    el.addEventListener('click', function(e){
      if(window.matchMedia('(max-width: 900px)').matches){ openAccount(e); }
    });
  });
  // zavření
  document.querySelectorAll('[data-account-close]').forEach(function(el){ el.addEventListener('click', closeAccount); });
  // klik na overlay (::after) — zachytíme na body když je otevřeno a klik mimo panel
  document.addEventListener('click', function(e){
    if(document.body.classList.contains('account-open')){
      var panel = document.getElementById('account-menu');
      var opener = e.target.closest('.tab-bar__item[data-tab="ucet"], .header-action[href="prihlaseni.html"], [data-account-open]');
      if(panel && !panel.contains(e.target) && !opener){ closeAccount(); }
    }
  });
  // Esc
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAccount(); });

  // toggly v nastavení komunikace
  document.querySelectorAll('.aswitch[data-toggle]').forEach(function(sw){
    sw.addEventListener('click', function(){ sw.classList.toggle('is-on'); });
  });
})();
