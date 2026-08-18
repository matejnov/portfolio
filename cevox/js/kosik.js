/* CEVOX Dive — mobilní košík (5 obrazovek, vanilla JS SPA) */
(function(){
'use strict';

// jediné místo s kupónem — backend ho bude ověřovat serverem
var KUPON = { kod: 'LETO700', sleva: 700 };

// volby pokladny (doprava/platba/kupón) — musí přežít přechod mezi kroky,
// každý krok je samostatné HTML. Backend to převezme spolu s košíkem.
var KLIC_VOLBY = 'cevox-pokladna';

var state = {
  screen: 'cart',           // cart | shipping | payment | summary | done
  company: false,
  vatPayer: true,
  terms: true,
  noteOpen: false,
  couponApplied: false,
  couponError: false,
  delivery: null,           // pickup | ppl
  payment: null,            // cod | cash | transfer
  openMenu: null
};

// položky drží js/kosik-data.js
function items(){ return Kosik.polozky(); }
// „Barva: Černá" → „Černá"
function varHodnota(v){ var i = String(v || '').indexOf(':'); return i > -1 ? v.slice(i + 1).trim() : (v || ''); }

function fmt(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
function kc(n){ return fmt(n) + '\u00a0Kč'; }
function cap(s){ return s.charAt(0) + s.slice(1).toLowerCase(); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// české skloňování
function czProducts(n){ return n===1?'produkt':(n<5?'produkty':'produktů'); }
function czPieces(n){ return n===1?'kus':(n<5?'kusy':'kusů'); }

// dopravci — jediný zdroj je js/kosik-data.js (B5)
var shippingDefs = Kosik.dopravci();
var paymentDefs = [
  { id:'cod', title:'Dobírkou', sub:'Zaplatíte při převzetí zásilky', fee:45, icon:'cod' },
  { id:'cash', title:'Hotově', sub:'Platba při osobním odběru na prodejně', fee:0, icon:'cash' },
  { id:'transfer', title:'Bankovním převodem', sub:'Odešleme po připsání platby (1–2 dny)', fee:0, icon:'bank' }
];

var ICON = {
  store:'<path d="M3.2 8l1-4h11.6l1 4" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.2 8v8h13.6V8" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.2 8h13.6" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  truck:'<path d="M2 6h8v8H2z" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8h4l3 3v3h-7z" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="15.5" r="1.5" stroke="#0d2e35" stroke-width="1.5"/><circle cx="14" cy="15.5" r="1.5" stroke="#0d2e35" stroke-width="1.5"/>',
  cod:'<path d="M2.5 6h15v8h-15z" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.3" stroke="#0d2e35" stroke-width="1.5"/>',
  cash:'<path d="M3 5h11a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8h3v6a2 2 0 01-2 2H6" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="2" stroke="#0d2e35" stroke-width="1.5"/>',
  bank:'<path d="M3 8l7-4 7 4" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 8v6M8 8v6M12 8v6M15.5 8v6" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h14" stroke="#0d2e35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
};
function icon(name){ return '<svg width="18" height="18" viewBox="0 0 20 20" fill="none">'+ICON[name]+'</svg>'; }

// ── výpočty ──
function calc(){
  var subtotal = Kosik.mezisoucet();
  var discount = state.couponApplied ? KUPON.sleva : 0;
  var total = subtotal - discount;
  var totalQty = Kosik.pocetKusu();
  var nProducts = items().length;
  var selShip = shippingDefs.filter(function(o){ return o.id===state.delivery; })[0] || null;
  var selPay = paymentDefs.filter(function(o){ return o.id===state.payment; })[0] || null;
  var grandTotal = total + (selShip?selShip.fee:0) + (selPay?selPay.fee:0);
  return { subtotal:subtotal, discount:discount, total:total, totalQty:totalQty, nProducts:nProducts, selShip:selShip, selPay:selPay, grandTotal:grandTotal };
}

// expose to renderers below
window.__cart = { state:state, fmt:fmt, kc:kc, cap:cap, esc:esc, czProducts:czProducts, czPieces:czPieces, shippingDefs:shippingDefs, paymentDefs:paymentDefs, icon:icon, calc:calc };

// ══════════ STEPPER ══════════
var STEPS = [
  { key:'cart', label:'Košík' },
  { key:'shipping', label:'Dodací údaje' },
  { key:'payment', label:'Doprava a platba' },
  { key:'summary', label:'Shrnutí' }
];
function stepIndex(screen){ for(var i=0;i<STEPS.length;i++){ if(STEPS[i].key===screen) return i; } return 0; }

function renderStepper(){
  var active = stepIndex(state.screen);
  // šířka zeleného fillu: mezi středy kroků. 4 kroky, střed prvního ~52px, poslední ~ (šířka-52). Použijeme % podle active.
  var fillW = active<=0 ? 0 : (active/(STEPS.length-1))*100;
  var checkSvg = '<svg width="14" height="14" viewBox="0 0 20 20"><path d="M5 10.2l3 3L15 6.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var cols = STEPS.map(function(s, i){
    var numCls, labCls, inner;
    if(i < active){ numCls='cstep__num--done'; labCls='cstep__label--done'; inner=checkSvg; }
    else if(i === active){ numCls='cstep__num--active'; labCls='cstep__label--on'; inner=String(i+1); }
    else { numCls='cstep__num--todo'; labCls='cstep__label--todo'; inner=String(i+1); }
    return '<button class="cstep" data-goto="'+s.key+'"><span class="cstep__num '+numCls+'">'+inner+'</span><span class="cstep__label '+labCls+'">'+s.label+'</span></button>';
  }).join('');
  return '<div class="stepper">'+
    '<div class="stepper__line"></div>'+
    '<div class="stepper__fill" style="width:'+Math.min(100,fillW)+'%;max-width:calc(100% - 104px)"></div>'+
    '<div class="stepper__row">'+cols+'</div>'+
    '</div>';
}

// položka souhrnu (mini řádek)
function miniItem(it, withQty){
  var casti = [varHodnota(it.varianta), cap(it.znacka)];
  if (withQty) casti.push(it.pocet + ' ks');
  var line = casti.filter(Boolean).join(' · ');
  return '<div class="mini-row">'+
    '<div class="mini-row__thumb"></div>'+
    '<div class="mini-row__body"><div class="mini-row__name">'+esc(it.nazev)+'</div>'+
    '<div class="mini-row__meta">'+esc(line)+'</div></div>'+
    '<div class="mini-row__price">'+kc(it.cena*it.pocet)+'</div></div>';
}

// souhrnové řádky (mezisoučet/sleva/doprava)
function summaryRows(c, opts){
  opts = opts || {};
  var h = '';
  h += '<div class="srow"><span class="srow__k">Mezisoučet</span><span class="srow__v">'+kc(c.subtotal)+'</span></div>';
  if(state.couponApplied) h += '<div class="srow"><span class="srow__k srow__k--sale">Sleva ('+KUPON.kod+')</span><span class="srow__v srow__v--sale">\u2212'+kc(c.discount)+'</span></div>';
  if(opts.shipLine){
    var sl = c.selShip ? ('Doprava ('+c.selShip.label+')') : 'Doprava';
    var sv = c.selShip ? (c.selShip.fee>0?kc(c.selShip.fee):'Zdarma') : 'Nevybráno';
    var sc = c.selShip ? (c.selShip.fee>0?'srow__v--ink':'srow__v--free') : 'srow__v--none';
    h += '<div class="srow"><span class="srow__k">'+sl+'</span><span class="srow__v '+sc+'">'+sv+'</span></div>';
    if(c.selPay && c.selPay.fee>0) h += '<div class="srow"><span class="srow__k">Platba ('+c.selPay.title.toLowerCase()+')</span><span class="srow__v srow__v--ink">'+kc(c.selPay.fee)+'</span></div>';
  } else {
    h += '<div class="srow"><span class="srow__k">Doprava</span><span class="srow__v srow__v--free">Zdarma</span></div>';
  }
  return h;
}

// ══════════ OBRAZOVKA 1 · KOŠÍK ══════════
function renderEmptyCart(){
  return renderStepper() +
    '<div class="scroll empty-cart">'+
      '<svg class="empty-cart__icon" width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 6L5 2H2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4" stroke="currentColor" stroke-width="1.3"/><circle cx="18" cy="20" r="1.4" stroke="currentColor" stroke-width="1.3"/></svg>'+
      '<div class="scr-title empty-cart__title">Košík je prázdný</div>'+
      '<div class="empty-cart__text">Zatím jste si nic nevybrali. Podívejte se do katalogu — poradíme s výběrem vybavení.</div>'+
      '<button class="cta empty-cart__cta" data-shop="1">POKRAČOVAT DO KATALOGU</button>'+
    '</div>';
}

function renderCart(){
  if(!items().length) return renderEmptyCart();
  var c = calc();
  var countStr = c.nProducts+' '+czProducts(c.nProducts)+' · '+c.totalQty+' '+czPieces(c.totalQty);

  var itemsHtml = items().map(function(it){
    var menuOpen = state.openMenu===it.id;
    var oldPrice = it.cenaPuvodni ? '<div class="cart-card__old">'+kc(it.cenaPuvodni*it.pocet)+'</div>' : '';
    var menu = menuOpen ? (
      '<div class="card-menu">'+
        '<button class="card-menu__item" data-fav="'+it.id+'"><svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M10 17S3 12.5 3 7.8A3.8 3.8 0 0110 5.4 3.8 3.8 0 0117 7.8C17 12.5 10 17 10 17z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Vložit do oblíbených</button>'+
        '<button class="card-menu__item card-menu__item--danger" data-remove="'+it.id+'"><svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 5.5l.8 10a1.5 1.5 0 001.5 1.4h4.4a1.5 1.5 0 001.5-1.4l.8-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Odebrat z košíku</button>'+
      '</div>') : '';
    return '<div class="cart-swipe">'+
      '<div class="cart-card" data-card="'+it.id+'">'+
        '<div class="cart-card__top">'+
          '<div class="cart-card__thumb"><span class="cart-card__thumb-label">produkt</span></div>'+
          '<div class="cart-card__body">'+
            '<div class="cart-card__brand">'+esc(it.znacka)+'</div>'+
            '<div class="cart-card__name">'+esc(it.nazev)+'</div>'+
            '<div class="cart-card__variant">'+esc(it.varianta)+'</div>'+
            '<div class="cart-card__stock"><span class="cart-card__dot"></span><span>'+esc(it.dostupnost)+'</span></div>'+
          '</div>'+
          '<div class="cart-card__menuwrap">'+
            '<button class="cart-card__menubtn" data-menu="'+it.id+'"><svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.7" fill="currentColor"/><circle cx="10" cy="10" r="1.7" fill="currentColor"/><circle cx="10" cy="16" r="1.7" fill="currentColor"/></svg></button>'+
            menu+
          '</div>'+
        '</div>'+
        '<div class="cart-card__foot">'+
          '<div class="co-qty">'+
            '<button class="co-qty__btn" data-dec="'+it.id+'">\u2212</button>'+
            '<span class="co-qty__num">'+it.pocet+'</span>'+
            '<button class="co-qty__btn" data-inc="'+it.id+'">+</button>'+
          '</div>'+
          '<div class="cart-card__prices">'+oldPrice+'<div class="cart-card__price">'+kc(it.cena*it.pocet)+'</div></div>'+
        '</div>'+
      '</div></div>';
  }).join('');

  var xsellRow = function(nazev, cena){
    return '<div class="co-xsell-row"><div class="co-xsell-row__thumb"></div>'+
      '<div class="co-xsell-row__body"><div class="co-xsell-row__name">'+nazev+'</div>'+
      '<div class="co-xsell-row__price">'+cena+'</div></div>'+
      '<button class="co-xsell-row__btn">Přidat</button></div>';
  };
  var recommended = '<div class="co-xsell"><div class="co-xsell__title">Často kupováno společně</div><div class="co-xsell__list">'+
    xsellRow('Antifog sprej na masku', '199 Kč')+
    xsellRow('Neoprenový popruh na masku', '349 Kč')+
    '</div></div>';

  var couponCheck = state.couponApplied ? '<svg class="coupon__check" width="13" height="13" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
  var couponBox =
    '<div class="coupon"><div class="coupon__field">'+
      '<input data-coupon-input value="'+(state.couponApplied ? esc(KUPON.kod) : '')+'"'+(state.couponApplied ? ' readonly' : '')+' placeholder="Slevový kód" class="inp coupon__input">'+
    '</div>'+couponCheck+
    (state.couponApplied
      ? '<button class="coupon__btn coupon__btn--off" data-coupon-off="1">Zrušit</button>'
      : '<button class="coupon__btn" data-coupon="1">Použít</button>')+
    '</div>'+
    (state.couponError ? '<div class="coupon__error">Tento kód neznáme.</div>' : '');

  return renderStepper() +
    '<div class="scroll">'+
      '<div class="cart-head"><div class="scr-title">Košík</div><div class="cart-head__count">'+countStr+'</div></div>'+
      '<div class="ship-note"><div class="ship-note__row"><svg class="ship-note__ic" width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="ship-note__text">Máte nárok na <strong>dopravu zdarma</strong>. Objednávku odešleme do 24 hodin.</div></div><div class="ship-note__track"><div class="ship-note__fill"></div></div></div>'+
      '<div class="co-list">'+itemsHtml+'</div>'+
      '<div class="backlink" data-shop="1"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Pokračovat v nákupu</div>'+
      recommended+
      '<div class="sum-card">'+
        '<div class="sum-card__title">Souhrn objednávky</div>'+
        couponBox+
        '<div class="divider"></div>'+
        summaryRows(c, {})+
        '<div class="divider"></div>'+
        '<div class="grand"><span class="grand__k">Celkem <em>vč. DPH</em></span><span class="grand__v">'+kc(c.total)+'</span></div>'+
      '</div>'+
      '<div class="scroll__tail"></div>'+
    '</div>'+
    '<div class="footer-bar"><div class="footer-bar__left"><div class="footer-bar__total-label">Celkem vč. DPH</div><div class="footer-bar__total">'+kc(c.total)+'</div></div>'+
    '<button class="cta" data-goto="shipping">POKRAČOVAT K ÚDAJŮM <svg width="16" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 7h15M11 2l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
}

// ══════════ OBRAZOVKA 2 · DODACÍ ÚDAJE ══════════
function renderShipping(){
  var c = calc();

  var companyFields = '';
  if(state.company){
    var vatYes = state.vatPayer ? ' vat-btn--on' : '';
    var vatNo = !state.vatPayer ? ' vat-btn--on' : '';
    companyFields = '<div><div class="divider"></div>'+
      '<div class="biz-head"><div class="biz-head__title">Fakturační údaje</div></div>'+
      '<div class="fields">'+
        '<div><div class="fld-label">Název firmy <span class="co-req">*</span></div><input placeholder="Název společnosti" class="inp" data-cname></div>'+
        '<div class="fld-row"><div class="fld-col"><div class="fld-label">IČO <span class="co-req">*</span></div><input placeholder="12345678" class="inp" data-icom></div><div class="fld-col"><div class="fld-label">DIČ</div><input placeholder="CZ12345678" class="inp" data-dic></div></div>'+
        '<div><div class="fld-label">Plátce DPH</div><div class="vat-switch"><button class="vat-btn'+vatYes+'" data-vat="yes">Ano</button><button class="vat-btn'+vatNo+'" data-vat="no">Ne</button></div></div>'+
        '<div><div class="fld-label">Sídlo firmy</div><input placeholder="Ulice a číslo popisné, město, PSČ" class="inp" data-caddr></div>'+
      '</div></div>';
  }

  var recap = items().map(function(it){ return miniItem(it, false); }).join('');

  return renderStepper() +
    '<div class="scroll">'+
      '<div class="scr-head"><div class="scr-title">Dodací údaje</div></div>'+
      // firemní karta
      '<div class="card card-pad">'+
        '<div class="biz">'+
          '<div class="biz__ic"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 3h6l3 3v11H4V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 3v3h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></div>'+
          '<div class="biz__body"><div class="biz__title">Nakupuji na firmu</div><div class="biz__sub">Doplňte fakturační údaje pro nákup na IČO</div></div>'+
          '<button class="co-toggle'+(state.company?' co-toggle--on':'')+'" data-company="1"><span class="co-toggle__knob"></span></button>'+
        '</div>'+ companyFields +
      '</div>'+
      // kontaktní údaje
      '<div class="card card-pad">'+
        '<div class="sum-card__title">Kontaktní a dodací údaje</div>'+
        '<div class="fields">'+
          '<div><div class="fld-label">Jméno a příjmení</div><input placeholder="Jméno a příjmení" class="inp"></div>'+
          '<div><div class="fld-label">Telefon</div><input value="+420" class="inp"></div>'+
          '<div><div class="fld-label">E-mail</div><input placeholder="vas@email.cz" class="inp"></div>'+
          '<div><div class="fld-label">Ulice a číslo popisné</div><input placeholder="Ulice a č. p." class="inp"></div>'+
          '<div class="fld-row"><div class="fld-col fld-col--wide"><div class="fld-label">Město</div><input placeholder="Město" class="inp"></div><div class="fld-col"><div class="fld-label">PSČ</div><input placeholder="000 00" class="inp"></div></div>'+
        '</div>'+
      '</div>'+
      // recap objednávky
      '<div class="card card-pad">'+
        '<div class="recap-head"><div class="recap-head__title">Vaše objednávka</div><button class="recap-head__edit" data-goto="cart">Upravit</button></div>'+
        recap +
        '<div class="divider"></div>'+ summaryRows(c, {}) +
        '<div class="divider"></div>'+
        '<div class="grand"><span class="grand__k">Celkem <em>vč. DPH</em></span><span class="grand__v">'+kc(c.total)+'</span></div>'+
      '</div>'+
      '<div class="backlink" data-goto="cart"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Zpět do košíku</div>'+
    '</div>'+
    '<div class="footer-bar"><div class="footer-bar__left"><div class="footer-bar__total-label">Celkem vč. DPH</div><div class="footer-bar__total">'+kc(c.total)+'</div></div>'+
    '<button class="cta" data-goto="payment">POKRAČOVAT K DOPRAVĚ <svg width="16" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 7h15M11 2l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
}

// ══════════ OBRAZOVKA 3 · DOPRAVA A PLATBA ══════════
function optCard(o, selected, group){
  var priceStr = o.fee>0 ? ('+'+kc(o.fee)) : 'Zdarma';
  var priceCls = o.fee>0 ? 'opt__price' : 'opt__price opt__price--free';
  return '<button class="opt'+(selected?' opt--on':'')+'" data-opt="'+group+':'+o.id+'">'+
    '<span class="opt__radio"><span class="opt__dot"></span></span>'+
    '<span class="opt__icon">'+icon(o.icon)+'</span>'+
    '<span class="opt__body"><span class="opt__title">'+esc(o.title)+'</span><span class="opt__sub">'+esc(o.sub)+'</span></span>'+
    '<span class="'+priceCls+'">'+priceStr+'</span>'+
  '</button>';
}

function renderPayment(){
  var c = calc();
  var ship = shippingDefs.map(function(o){ return optCard(o, state.delivery===o.id, 'delivery'); }).join('');
  var pay = paymentDefs.map(function(o){ return optCard(o, state.payment===o.id, 'payment'); }).join('');
  var recap = items().map(function(it){ return miniItem(it, false); }).join('');

  return renderStepper() +
    '<div class="scroll">'+
      '<div class="scr-head scr-head--tight"><div class="scr-title">Doprava a platba</div></div>'+
      '<div class="delivery-note"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 6h9v7H2zM11 8h4l3 3v2h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="15" r="1.6" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="15" r="1.6" stroke="currentColor" stroke-width="1.5"/></svg><div class="delivery-note__text">Doručení již <strong>zítra, čt 11. 7.</strong> při objednávce do 22:00.</div></div>'+
      // sekce doprava
      '<div class="card card-pad">'+
        '<div class="sec-head"><span class="sec-head__num">1</span><span class="sec-head__label">Doprava</span></div>'+
        ship+
      '</div>'+
      // sekce platba
      '<div class="card card-pad">'+
        '<div class="sec-head sec-head--split"><div class="sec-head__group"><span class="sec-head__num">2</span><span class="sec-head__label">Platba</span></div><div class="sec-head__secure"><svg width="12" height="14" viewBox="0 0 13 15" fill="none"><rect x="1" y="6" width="11" height="8" rx="1.6" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 6V4a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4"/></svg><span>Šifrovaná platba</span></div></div>'+
        pay+
      '</div>'+
      // poznámka
      '<div class="card card-pad">'+
        '<div class="note-card__title">Poznámka k objednávce <span class="note-card__hint">(nepovinné)</span></div>'+
        '<textarea placeholder="Např. nechte zásilku u sousedů…" class="inp note-card__area"></textarea>'+
      '</div>'+
      // recap
      '<div class="card card-pad">'+
        '<div class="recap-head"><div class="recap-head__title">Vaše objednávka</div><button class="recap-head__edit" data-goto="cart">Upravit</button></div>'+
        recap+
        '<div class="divider"></div>'+ summaryRows(c, {shipLine:true}) +
        '<div class="divider"></div>'+
        '<div class="grand"><span class="grand__k">Celkem <em>vč. DPH</em></span><span class="grand__v">'+kc(c.grandTotal)+'</span></div>'+
      '</div>'+
      '<div class="backlink" data-goto="shipping"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Zpět na dodací údaje</div>'+
    '</div>'+
    '<div class="footer-bar"><div class="footer-bar__left"><div class="footer-bar__total-label">Celkem vč. DPH</div><div class="footer-bar__total">'+kc(c.grandTotal)+'</div></div>'+
    '<button class="cta" data-goto="summary">POKRAČOVAT KE SHRNUTÍ <svg width="16" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 7h15M11 2l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
}

// ══════════ OBRAZOVKA 4 · SHRNUTÍ ══════════
function renderSummary(){
  var c = calc();
  var recap = items().map(function(it){ return miniItem(it, true); }).join('');
  var selShip = c.selShip, selPay = c.selPay;
  var shipTitle = selShip ? selShip.title : 'Doprava nevybrána';
  var shipSub = selShip ? (selShip.sub + ' · ' + (selShip.fee>0?kc(selShip.fee):'Zdarma')) : 'Zvolte způsob dopravy';
  var payTitle = selPay ? selPay.title : 'Platba nevybrána';
  var paySub = selPay ? (selPay.fee>0 ? ('+'+kc(selPay.fee)+' při převzetí') : 'Zdarma') : 'Zvolte způsob platby';
  var shipIcon = selShip ? selShip.icon : 'truck';
  var payIcon = selPay ? selPay.icon : 'bank';

  function roField(k, v){
    return '<div><div class="ro-field__k">'+k+'</div><div class="ro-field__v">'+v+'</div></div>';
  }
  function methodRow(ic, title, sub, extraCls){
    return '<div class="method-row'+(extraCls||'')+'"><span class="method-row__ic">'+icon(ic)+'</span>'+
      '<div class="method-row__body"><div class="method-row__title">'+esc(title)+'</div>'+
      '<div class="method-row__sub">'+esc(sub)+'</div></div></div>';
  }

  var noteBlock = state.noteOpen ?
    '<div class="card card-pad"><div class="note-open__head"><div class="note-open__title">Poznámka k objednávce</div><button class="note-open__cancel" data-note="close">Zrušit</button></div><textarea placeholder="Např. nechte zásilku u sousedů…" class="inp note-open__area"></textarea></div>' :
    '<div class="note-stub"><svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 4h14v9H8l-4 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="note-stub__text">Bez poznámky k objednávce</span><button class="note-stub__btn" data-note="open">Přidat</button></div>';

  return renderStepper() +
    '<div class="scroll">'+
      '<div class="scr-head"><div class="scr-title">Shrnutí objednávky</div></div>'+
      // kontaktní údaje read-only
      '<div class="card card-pad">'+
        '<div class="recap-head"><div class="recap-head__title">Kontaktní a dodací údaje</div><button class="recap-head__edit" data-goto="shipping">Upravit</button></div>'+
        '<div class="ro-list">'+
          roField('Jméno a příjmení', 'Tomáš Dvořák')+
          roField('Telefon', '+420 731 456 890')+
          roField('E-mail', 'tomas.dvorak@email.cz')+
          roField('Doručovací adresa', 'Palackého třída 2547, 530 02 Pardubice')+
        '</div>'+
      '</div>'+
      // doprava+platba recap
      '<div class="card card-pad">'+
        '<div class="recap-head"><div class="recap-head__title">Doprava a platba</div><button class="recap-head__edit" data-goto="payment">Změnit</button></div>'+
        methodRow(shipIcon, shipTitle, shipSub, ' method-row--gap')+
        methodRow(payIcon, payTitle, paySub)+
      '</div>'+
      noteBlock+
      // objednávka + souhlas
      '<div class="card card-pad">'+
        '<div class="sum-card__title sum-card__title--tight">Vaše objednávka</div>'+
        recap+
        '<div class="divider"></div>'+ summaryRows(c, {shipLine:true}) +
        '<div class="divider"></div>'+
        '<div class="grand grand--lg"><span class="grand__k">Celkem <em>vč. DPH</em></span><span class="grand__v grand__v--lg">'+kc(c.grandTotal)+'</span></div>'+
        '<div class="terms'+(state.terms?' terms--on':'')+'" data-terms="1"><span class="terms__box"><svg width="12" height="12" viewBox="0 0 20 20"><path d="M5 10.2l3 3L15 6.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="terms__text">Souhlasím s <a href="obchodni-podminky.html">obchodními podmínkami</a> a zpracováním osobních údajů.</span></div>'+
      '</div>'+
      '<div class="backlink" data-goto="payment"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Zpět na dopravu a platbu</div>'+
    '</div>'+
    '<div class="footer-bar footer-bar--stack">'+
      '<button class="cta cta--pay" data-pay="1"><svg width="15" height="17" viewBox="0 0 13 15" fill="none"><rect x="1" y="6" width="11" height="8" rx="1.6" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 6V4a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5"/></svg> ZAPLATIT '+kc(c.grandTotal)+'</button>'+
      '<div class="pay-disclaimer">Objednávkou se zavazujete k platbě. Bránu provozuje ČSOB.</div>'+
    '</div>';
}

// ══════════ OBRAZOVKA 5 · POTVRZENÍ ══════════
function renderDone(){
  var c = calc();
  var recap = items().map(function(it){ return miniItem(it, true); }).join('');
  var trackerStep = function(mod, iconSvg, title, time, line){
    var lineEl = line ? '<div class="trk__line'+(mod==='done'?' trk__line--done':'')+'"></div>' : '';
    return '<div class="trk'+(mod?' trk--'+mod:'')+'"><div class="trk__rail"><div class="trk__bullet">'+iconSvg+'</div>'+lineEl+'</div>'+
      '<div class="trk__body"><div class="trk__title">'+title+'</div><div class="trk__time">'+time+'</div></div></div>';
  };
  var checkW = '<svg width="15" height="15" viewBox="0 0 20 20"><path d="M5 10.2l3 3L15 6.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return '<div class="scroll done-screen">'+
    '<div class="done-hero"><div class="done-hero__badge"><svg width="36" height="36" viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'+
    '<div class="done-hero__title">Děkujeme za objednávku!</div>'+
    '<div class="done-hero__text">Objednávku <strong>#2024-00131</strong> jsme přijali. Potvrzení jsme poslali na <strong class="done-hero__mail">tomas.dvorak@email.cz</strong>.</div></div>'+
    // info karty
    '<div class="done-tiles">'+
      '<div class="card info-tile"><div class="info-tile__head"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 6h9v7H2zM11 8h4l3 3v2h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="15" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="15" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg><span class="info-tile__label">Doprava</span></div><div class="info-tile__title">PPL — doručení na adresu</div><div class="info-tile__sub">Palackého třída 2547, Pardubice</div><div class="info-tile__stock"><span class="info-tile__dot"></span><span>Doručení čt 11. 7.</span></div></div>'+
      '<div class="card info-tile"><div class="info-tile__head"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="5" width="15" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 8.5h15" stroke="currentColor" stroke-width="1.5"/></svg><span class="info-tile__label">Platba</span></div><div class="info-tile__title">Bankovním převodem</div><div class="info-tile__sub">Pokyny k platbě jsou v e-mailu</div><div class="info-tile__chip"><svg width="12" height="12" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#3f9e6a"/><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Přijato</span></div></div>'+
      '<div class="card info-tile"><div class="info-tile__head"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M6 3h6l3 3v11H4V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 3v3h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="info-tile__label">Doklady</span></div><div class="info-tile__title">Faktura č. 2024-00131</div><div class="info-tile__sub">Najdete ji i ve svém účtu</div><a href="#" class="info-tile__link"><svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 16h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Stáhnout PDF</a></div>'+
    '</div>'+
    // tracker
    '<div class="card tracker">'+
      '<div class="tracker__title">Co bude následovat</div>'+
      trackerStep('done', checkW, 'Přijato', 'dnes 14:32', true)+
      trackerStep('now', '<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M4 6.5L10 3l6 3.5v7L10 17l-6-3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 6.5L10 10l6-3.5M10 10v7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>', 'Balíme', 'do 24 hodin', true)+
      trackerStep('muted', '<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 6h9v7H2zM11 8h4l3 3v2h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="15" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="15" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>', 'Předáno dopravci', 'zítra', true)+
      trackerStep('muted', '<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M4 9l6-5 6 5v7H4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>', 'Doručeno', 'čt 11. 7.', false)+
    '</div>'+
    // souhrn
    '<div class="card done-sum">'+
      '<div class="done-sum__head"><div class="done-sum__title">Souhrn objednávky</div><div class="done-sum__meta">'+c.nProducts+' '+czProducts(c.nProducts)+'</div></div>'+
      recap+
      '<div class="divider"></div>'+
      '<div class="srow"><span class="srow__k">Mezisoučet</span><span class="srow__v">'+kc(c.subtotal)+'</span></div>'+
      '<div class="srow"><span class="srow__k">Doprava</span><span class="srow__v srow__v--free">Zdarma</span></div>'+
      (state.couponApplied ? '<div class="srow"><span class="srow__k srow__k--sale">Sleva ('+KUPON.kod+')</span><span class="srow__v srow__v--sale">\u2212'+kc(c.discount)+'</span></div>' : '')+
      '<div class="divider"></div>'+
      '<div class="grand"><span class="grand__k">Celkem <em>vč. DPH</em></span><span class="grand__v grand__v--md">'+kc(c.grandTotal)+'</span></div>'+
    '</div>'+
    // akce
    '<div class="done-actions">'+
      '<button class="btn-ghost"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M6 3h6l3 3v11H4V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 3v3h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Zobrazit objednávku</button>'+
      '<button class="cta cta--done" data-reset="1">Zpět do obchodu <svg width="16" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 7h15M11 2l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '</div>'+
    '<div class="done-help">Máte dotaz k objednávce? Zavolejte <strong>604 152 114</strong> nebo napište na <a href="#">cevoxdive@cevoxdive.cz</a>.</div>'+
  '</div>';
}

// ══════════ MOUNT (multi-page) + EVENTY ══════════
// mapa: data-page stránky -> obrazovka + navigace na další/předchozí HTML
var PAGE_MAP = {
  'kosik': { screen:'cart', next:'dodaci-udaje.html' },
  'dodaci-udaje': { screen:'shipping', next:'doprava-platba.html' },
  'doprava-platba': { screen:'payment', next:'shrnuti.html' },
  'shrnuti': { screen:'summary', next:'dekujeme.html' },
  'dekujeme': { screen:'done', next:null }
};
var STEP_HREF = { cart:'kosik.html', shipping:'dodaci-udaje.html', payment:'doprava-platba.html', summary:'shrnuti.html' };

// volby dopravy/platby/kupónu přežívají přechod mezi kroky (viz nactiVolby níž)
if (PAGE_MAP[document.body.getAttribute('data-page')]) nactiVolby();

var root = document.getElementById('co-mobile-root');
if(root){
  var dp = document.body.getAttribute('data-page');
  var cfg = PAGE_MAP[dp] || PAGE_MAP['kosik'];
  state.screen = cfg.screen;

  function renderPage(){
    ulozVolby();   // volby (doprava/platba/kupón) ať přežijí přechod na další krok
    var html;
    switch(state.screen){
      case 'cart': html = renderCart(); break;
      case 'shipping': html = renderShipping(); break;
      case 'payment': html = renderPayment(); break;
      case 'summary': html = renderSummary(); break;
      case 'done': html = renderDone(); break;
      default: html = renderCart();
    }
    root.innerHTML = html;
  }

  // navigace: přechod na jinou HTML stránku
  function nav(href){ if(href) window.location.href = href; }

  root.addEventListener('click', function(e){
    var t = e.target.closest('[data-goto],[data-inc],[data-dec],[data-menu],[data-remove],[data-fav],[data-opt],[data-company],[data-vat],[data-terms],[data-note],[data-pay],[data-reset],[data-coupon],[data-coupon-off],[data-shop]');
    if(!t){ if(state.openMenu){ state.openMenu=null; renderPage(); } return; }
    // stepper klik / CTA / backlink → navigace na jinou stránku
    if(t.hasAttribute('data-goto')){
      var scr = t.getAttribute('data-goto');
      nav(STEP_HREF[scr] || 'kosik.html'); return;
    }
    if(t.hasAttribute('data-inc')){ var id=t.getAttribute('data-inc'); var p=Kosik.polozky().find(function(x){return x.id===id;}); if(p) Kosik.zmenPocet(id, p.pocet+1); return; }
    if(t.hasAttribute('data-dec')){ var id2=t.getAttribute('data-dec'); var p2=Kosik.polozky().find(function(x){return x.id===id2;}); if(p2) Kosik.zmenPocet(id2, Math.max(1, p2.pocet-1)); return; }
    if(t.hasAttribute('data-menu')){ var id3=t.getAttribute('data-menu'); state.openMenu = state.openMenu===id3?null:id3; renderPage(); return; }
    if(t.hasAttribute('data-remove')){ var id4=t.getAttribute('data-remove'); state.openMenu=null; Kosik.odeber(id4); return; }
    if(t.hasAttribute('data-fav')){ state.openMenu=null; renderPage(); return; }
    if(t.hasAttribute('data-opt')){ var pr=t.getAttribute('data-opt').split(':'); state[pr[0]]=pr[1]; renderPage(); return; }
    if(t.hasAttribute('data-company')){ state.company=!state.company; renderPage(); return; }
    if(t.hasAttribute('data-vat')){ state.vatPayer=t.getAttribute('data-vat')==='yes'; renderPage(); return; }
    if(t.hasAttribute('data-terms')){ state.terms=!state.terms; renderPage(); return; }
    if(t.hasAttribute('data-note')){ state.noteOpen=t.getAttribute('data-note')==='open'; renderPage(); return; }
    if(t.hasAttribute('data-pay')){ nav('dekujeme.html'); return; }
    if(t.hasAttribute('data-reset')){ nav('index.html'); return; }
    if(t.hasAttribute('data-coupon')){
      var pole = root.querySelector('[data-coupon-input]');
      var kod = pole ? pole.value.trim().toUpperCase() : '';
      state.couponApplied = (kod === KUPON.kod);
      state.couponError = !state.couponApplied;
      renderPage(); return;
    }
    if(t.hasAttribute('data-coupon-off')){ state.couponApplied=false; state.couponError=false; renderPage(); return; }
    if(t.hasAttribute('data-shop')){ nav('katalog.html'); return; }
  });

  Kosik.naZmenu(renderPage);
  renderPage();
}

// ══════════ DESKTOPOVÁ POKLADNA (nad 768px) — vykreslení z dat ══════════
// Statické HTML mělo ceny i položky vepsané natvrdo. Tady se plní z Kosik.*
// do háčků data-co-*. Markup i třídy zůstávají shodné s původním HTML.

// hodnoty radiů v desktopovém HTML -> definice dopravy/platby výše
var DESKTOP_SHIP = { 'osobni-odber': 'pickup', 'ppl': 'ppl' };
var DESKTOP_PAY  = { 'dobirka': 'cod', 'hotove': 'cash', 'prevod': 'transfer' };

// Volby si desktop musí pamatovat mezi stránkami — klíč je nahoře u KUPON.
function nactiVolby(){
  try {
    var v = JSON.parse(window.localStorage.getItem(KLIC_VOLBY)) || {};
    if (v.delivery) state.delivery = v.delivery;
    if (v.payment) state.payment = v.payment;
    if (v.couponApplied) state.couponApplied = true;
  } catch (e) {}
}
function ulozVolby(){
  try {
    window.localStorage.setItem(KLIC_VOLBY, JSON.stringify({
      delivery: state.delivery, payment: state.payment, couponApplied: state.couponApplied
    }));
  } catch (e) {}
}

// řádek položky v desktopovém košíku (krok 1)
function desktopLine(it){
  var meta = [];
  if (varHodnota(it.varianta)) meta.push(esc(it.varianta));
  var metaHtml = meta.length ? '<div class="co-line__meta">' + meta.join(' · ') + '</div>' : '';
  var stockHtml = it.dostupnost
    ? '<div class="co-line__stock"><span class="co-line__dot"></span><span>' + esc(it.dostupnost) + '</span></div>' : '';
  var oldHtml = it.cenaPuvodni
    ? '<span class="co-line__old">' + kc(it.cenaPuvodni * it.pocet) + '</span>' : '';
  return '<div class="co-line">' +
    '<div class="co-line__thumb"></div>' +
    '<div class="co-line__body">' +
      '<div class="co-line__brand">' + esc(String(it.znacka).toUpperCase()) + '</div>' +
      '<div class="co-line__name">' + esc(it.nazev) + '</div>' +
      metaHtml + stockHtml +
    '</div>' +
    '<div class="co-line__qty">' +
      '<button type="button" class="co-qty2__btn" data-dec="' + it.id + '" aria-label="Snížit počet">\u2212</button>' +
      '<span class="co-qty2__num">' + it.pocet + '</span>' +
      '<button type="button" class="co-qty2__btn" data-inc="' + it.id + '" aria-label="Zvýšit počet">+</button>' +
    '</div>' +
    '<div class="co-line__prices">' + oldHtml +
      '<span class="co-line__price">' + kc(it.cena * it.pocet) + '</span>' +
    '</div>' +
    '<button type="button" class="co-line__remove" data-remove="' + it.id + '" aria-label="Odebrat z košíku" title="Odebrat z košíku">' +
      '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 5.5l.8 10a1.5 1.5 0 001.5 1.4h4.4a1.5 1.5 0 001.5-1.4l.8-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</button>' +
  '</div>';
}

// mini řádek v souhrnu (kroky 2–5) — třídy z main.css
function desktopMini(it){
  var casti = [varHodnota(it.varianta), cap(it.znacka)];
  if (it.pocet > 1) casti.push(it.pocet + ' ks');
  var line = casti.filter(Boolean).join(' · ');
  return '<div class="mini-item">' +
    '<div class="mini-item__thumb"><img src="' + esc(it.obrazek) + '" alt=""></div>' +
    '<div class="mini-item__body"><div class="mini-item__name">' + esc(it.nazev) + '</div>' +
    '<div class="mini-item__variant">' + esc(line) + '</div></div>' +
    '<div class="mini-item__price">' + kc(it.cena * it.pocet) + '</div></div>';
}

// aktuální počet kusů dané položky
function pocetPolozky(id){
  var n = 0;
  items().forEach(function (i) { if (i.id === id) n = i.pocet; });
  return n;
}

function desktopEmpty(){
  return '<div class="co-empty">' +
    '<div class="co-empty__title">Košík je prázdný</div>' +
    '<div class="co-empty__text">Zatím jste si nic nevybrali. Podívejte se do katalogu — poradíme s výběrem vybavení.</div>' +
    '<a class="btn btn--primary" href="katalog.html">POKRAČOVAT DO KATALOGU</a></div>';
}

// souhrnové řádky v desktopové kartě
function desktopTotals(c, withFees){
  var h = '<div class="totals__row"><span>Mezisoučet</span><span>' + kc(c.subtotal) + '</span></div>';
  if (state.couponApplied) {
    h += '<div class="totals__row totals__row--discount"><span>Sleva (' + KUPON.kod + ')</span>' +
         '<span>\u2212' + kc(c.discount) + '</span></div>';
  }
  if (withFees) {
    var sl = c.selShip ? ('Doprava (' + c.selShip.label + ')') : 'Doprava';
    h += '<div class="totals__row"><span>' + sl + '</span>' + (c.selShip
      ? (c.selShip.fee > 0 ? '<span>' + kc(c.selShip.fee) + '</span>'
                           : '<span class="totals__free">Zdarma</span>')
      : '<span>Nevybráno</span>') + '</div>';
    if (c.selPay && c.selPay.fee > 0) {
      h += '<div class="totals__row"><span>Platba (' + c.selPay.title.toLowerCase() + ')</span>' +
           '<span>' + kc(c.selPay.fee) + '</span></div>';
    }
  } else {
    h += '<div class="totals__row"><span>Doprava</span><span class="totals__free">Zdarma</span></div>';
  }
  return h;
}

function renderDesktop(){
  var dp = document.body.getAttribute('data-page');
  var cfg = PAGE_MAP[dp];
  if (!cfg) return;
  var scr = cfg.screen;
  var withFees = (scr === 'payment' || scr === 'summary' || scr === 'done');
  var list = items();
  var c = calc();
  var soucet = withFees ? c.grandTotal : c.total;

  var lines = document.querySelector('[data-co-lines]');
  if (lines) {
    lines.innerHTML = list.length
      ? list.map(desktopLine).join('<div class="co-line__sep"></div>')
      : desktopEmpty();
    var aside = document.querySelector('[data-co-aside]');
    if (aside) { if (list.length) aside.removeAttribute('hidden'); else aside.setAttribute('hidden', ''); }
  }

  var mini = document.querySelector('[data-co-items]');
  if (mini) mini.innerHTML = list.map(desktopMini).join('');

  var pocet = document.querySelector('[data-co-count]');
  if (pocet) pocet.textContent = list.length + ' ' + czProducts(list.length);

  var tot = document.querySelector('[data-co-totals]');
  if (tot) tot.innerHTML = desktopTotals(c, withFees);

  var grand = document.querySelector('[data-co-grand]');
  if (grand) grand.textContent = kc(soucet);

  var payLabel = document.querySelector('[data-co-pay-label]');
  if (payLabel) payLabel.textContent = 'ZAPLATIT ' + kc(soucet).toUpperCase();

  // zvolený dopravce v rekapitulaci a na potvrzení — ze seznamu v kosik-data.js (B5)
  var shipTitle = document.querySelector('[data-co-ship-title]');
  if (shipTitle) shipTitle.textContent = c.selShip ? c.selShip.title : 'Doprava nevybrána';
  var shipSub = document.querySelector('[data-co-ship-sub]');
  if (shipSub) {
    shipSub.textContent = c.selShip
      ? (c.selShip.sub + (scr === 'summary' ? ' · ' + (c.selShip.fee > 0 ? kc(c.selShip.fee) : 'Zdarma') : ''))
      : 'Zvolte způsob dopravy';
  }
}

if (PAGE_MAP[document.body.getAttribute('data-page')]) {

  // ovládání položek v desktopovém košíku (mobilní kontejner je jiný element)
  var lines = document.querySelector('[data-co-lines]');
  if (lines) {
    lines.addEventListener('click', function (e) {
      var t = e.target.closest('[data-inc],[data-dec],[data-remove]');
      if (!t) return;
      e.preventDefault();
      if (t.hasAttribute('data-inc')) {
        var id = t.getAttribute('data-inc');
        Kosik.zmenPocet(id, pocetPolozky(id) + 1);
      } else if (t.hasAttribute('data-dec')) {
        var id2 = t.getAttribute('data-dec');
        Kosik.zmenPocet(id2, pocetPolozky(id2) - 1);
      } else {
        Kosik.odeber(t.getAttribute('data-remove'));
      }
    });
  }

  // radia dopravy/platby v desktopovém HTML → stav → přepočet
  document.addEventListener('change', function (e) {
    var r = e.target;
    if (!r || r.type !== 'radio') return;
    if (r.name === 'doprava' && DESKTOP_SHIP[r.value]) state.delivery = DESKTOP_SHIP[r.value];
    else if (r.name === 'platba' && DESKTOP_PAY[r.value]) state.payment = DESKTOP_PAY[r.value];
    else return;
    ulozVolby();
    renderDesktop();
  });

  // zapamatovanou volbu ukázat i na přepínačích
  (function preselect(){
    function mark(name, map, val){
      if (!val) return;
      for (var k in map) {
        if (map[k] === val) {
          var r = document.querySelector('input[name="' + name + '"][value="' + k + '"]');
          if (r) r.checked = true;
        }
      }
    }
    mark('doprava', DESKTOP_SHIP, state.delivery);
    mark('platba', DESKTOP_PAY, state.payment);
  })();

  Kosik.naZmenu(renderDesktop);
  renderDesktop();
}
})();
