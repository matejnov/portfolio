/* CEVOX Dive — sdílený stav košíku.
   Jediné místo, které drží položky. Při napojení na backend se mění
   jen nacti() a uloz() na volání serveru, zbytek zůstane. */
(function (window) {
'use strict';

var KLIC = 'cevox-kosik';
var KLIC_STARY = 'cevox-cart';

/* B5 — jediný seznam dopravců pro mobil i desktop.
   Načítá se na všech stránkách, takže z něj může čerpat i produkt.html.
   Backend ho nahradí, tvar položky zůstane. */
var DOPRAVCI = [
  { id: 'pickup', title: 'Osobní odběr — prodejna Pardubice', sub: 'Sladkovského 486 · připraveno dnes do 2 h',
    fee: 0, icon: 'store', label: 'osobní odběr', kratky: 'Osobní odběr' },
  { id: 'ppl', title: 'PPL — doručení na adresu', sub: 'Doručení do 2 pracovních dnů',
    fee: 0, icon: 'truck', label: 'PPL', kratky: 'PPL' }
];

var polozky = [];
var nacteno = false;
var posluchaci = [];

/* Položka: { id, sku, znacka, nazev, varianta, dostupnost, cena, cenaPuvodni, pocet, obrazek } */
function normalizuj(p) {
  return {
    id:          String(p.id),
    sku:         p.sku || '',
    znacka:      p.znacka || '',
    nazev:       p.nazev || '',
    varianta:    p.varianta || '',
    dostupnost:  p.dostupnost || '',
    cena:        Number(p.cena) || 0,
    cenaPuvodni: p.cenaPuvodni == null ? null : (Number(p.cenaPuvodni) || null),
    pocet:       Math.max(1, Math.round(Number(p.pocet) || 1)),
    obrazek:     p.obrazek || ''
  };
}

function najdi(id) {
  for (var i = 0; i < polozky.length; i++) {
    if (polozky[i].id === String(id)) return i;
  }
  return -1;
}

/* privátní — mutace si ukládají samy, volající to řešit nemusí */
function uloz() {
  try { window.localStorage.setItem(KLIC, JSON.stringify(polozky)); } catch (e) {}
}

function oznam() {
  for (var i = 0; i < posluchaci.length; i++) {
    try { posluchaci[i](); } catch (e) { console.error('Kosik: posluchač selhal.', e); }
  }
}

var Kosik = {

  nacti: function () {
    // starý demo formát už nikdo nečte — ať nezůstává viset v prohlížeči
    try { window.localStorage.removeItem(KLIC_STARY); } catch (e) {}
    try {
      var syrove = JSON.parse(window.localStorage.getItem(KLIC));
      polozky = Array.isArray(syrove) ? syrove.map(normalizuj) : [];
    } catch (e) {
      polozky = [];
    }
    nacteno = true;
    return polozky;
  },

  pridej: function (polozka) {
    if (!nacteno) Kosik.nacti();
    if (!polozka || polozka.id == null || polozka.id === '') {
      console.error('Kosik.pridej: položka nemá id, nepřidávám.', polozka);
      return null;
    }
    var nova = normalizuj(polozka);
    var i = najdi(nova.id);
    if (i > -1) {
      polozky[i].pocet += nova.pocet;
    } else {
      polozky.push(nova);
      i = polozky.length - 1;
    }
    uloz();
    oznam();
    return polozky[i];
  },

  zmenPocet: function (id, pocet) {
    if (!nacteno) Kosik.nacti();
    var i = najdi(id);
    if (i === -1) return null;
    var n = Math.round(Number(pocet) || 0);
    if (n < 1) return Kosik.odeber(id);
    polozky[i].pocet = n;
    uloz();
    oznam();
    return polozky[i];
  },

  odeber: function (id) {
    if (!nacteno) Kosik.nacti();
    var i = najdi(id);
    if (i === -1) return null;
    polozky.splice(i, 1);
    uloz();
    oznam();
    return null;
  },

  polozky: function () {
    if (!nacteno) Kosik.nacti();
    return polozky;
  },

  mezisoucet: function () {
    return Kosik.polozky().reduce(function (s, p) { return s + p.cena * p.pocet; }, 0);
  },

  pocetKusu: function () {
    return Kosik.polozky().reduce(function (s, p) { return s + p.pocet; }, 0);
  },

  naZmenu: function (callback) {
    if (typeof callback === 'function') posluchaci.push(callback);
  },

  /* seznam dopravců — čte kosik.js i statické stránky */
  dopravci: function () {
    return DOPRAVCI;
  }

};

window.Kosik = Kosik;

})(window);
