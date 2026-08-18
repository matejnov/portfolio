# Pokračování — CEVOX Dive

Přebíráš rozdělanou práci. Přiložený zip je aktuální stav.

**Nezačínej kódovat.** Nejdřív si přeměř stav (postup na konci) a napiš, kde jsme.

---

## Projekt

E-shop s potápěčským vybavením. Čisté HTML5 + CSS3 + vanilla JavaScript.
**Žádný framework, žádný build, žádné npm.** Otevírá se dvojklikem v prohlížeči.

```
*.html                43 stránek v kořeni
css/main.css          ~3 065 řádků — styly, design tokeny v :root
css/checkout-mobile.css  mobilní pokladna, scoped pod .co-mobile
js/kosik-data.js      sdílený stav košíku (jediný zdroj pravdy)
js/main.js            ~1 064 řádků
js/kosik.js           ~678 řádků — pokladna
partials/             hlavička, patička, SVG sprite
img/                  fotky + favicon
```

**Stav:** vizuální demo. Backend neexistuje, půjde nejspíš o hotovou platformu.
**Cílový rozsah:** 2 000–4 000 produktů, kategorie po 150+ položkách. Nic se
nesmí spoléhat na to, že jsou produkty psané ručně v HTML.

Popis napojení na backend je v `web/README.md` — ten je určený klientovi
a je aktuální.

---

## Tvrdá pravidla — dodržuj bez výjimky

1. **Neměň vizuál**, pokud to úkol výslovně nezadává.
2. **Nezaváděj nové technologie.** Žádný React, Vue, Tailwind, jQuery, Sass, Vite, npm.
3. **Pracuj po jednom kroku.** Dokonči, napiš souhrn, **počkej na potvrzení.**
4. **Neupravuj celý soubor, když stačí cílená změna.** Zvlášť: nepřeukládej HTML
   přes parser (BeautifulSoup ap.) — tiše přepíše formátování i entity.
5. **Nepřidávej nic, o co jsem nežádal.**
6. **Když je něco nejasné, zeptej se.** Nehádej.
7. **Nesmaž nic mimo zadání.** Mrtvý kód nahlas, nemaž.
8. **Hlas každou změnu fontu, velikosti nebo váhy písma** zvlášť.
9. **Ověřuj v prohlížeči.** Playwright s Chromiem je k dispozici. Screenshot před
   a po, na 390 a 1280 px. Sandbox blokuje Google Fonts — typografii ze
   screenshotů posuzovat nelze, layout a barvy ano.
10. **Než něco označíš za chybějící, ověř víc selektorů.**

---

## Hotovo

| fáze | stav |
|---|---|
| **A — struktura** | hotová celá (A1–A5) |
| **B — vizuál** | hotová celá (B1–B5) |
| **C — doplnění** | hotová kromě C4 |
| **„Co nedělat vůbec"** | hotová celá, 9 z 9 |
| **Backlog** | hotový celý, 5 z 5 |

Podrobnosti, které se hodí znát:

- **Karty produktu** nesou data v atributech (`data-product-id`, `data-brand`,
  `data-name`, `data-price`, `data-img`, `data-variant`). Objekt `PRODUCTS` je pryč.
- **Košík** má veřejné API v `js/kosik-data.js`, klíč `cevox-kosik`. Desktopová
  i mobilní pokladna se vykreslují z něj.
- **Ceny bez DPH** (21 %) na všech 82 kartách i na detailu. „od X Kč" u 9 produktů
  s velikostními variantami.
- **Dostupnost** sjednocena na dvě hodnoty: Skladem (zelená tečka) / Na dotaz (šedá).
- **Dopravci** na jednom místě — `DOPRAVCI` v `js/kosik-data.js`. Osobní odběr + PPL.
- **Filtry, řazení i cena** jsou `<form method="get">`, nula JS. Filtruje server.
- **Nové stránky:** `vysledky-hledani.html`, `ucet.html`, `objednavka-detail.html`,
  `znacka.html`, `pripravujeme.html`.
- **Prázdné stavy** připravené a skryté (`hidden`) na 11 výpisech, u hledání
  a pro vyprodaný produkt.

---

## Co zbývá

### Poznámka o ukázkové verzi

Řádek v patičce se vypíná konstantou `DEMO` v `js/main.js`. Pro klienta `false`.

### C4 — formuláře

Hotové. Popisků s vazbou je 169 (39 přes `for=`, 130 obalením pole),
bez vazby zbývá 12 — všechny v `dodaci-udaje.html` a `obnova-hesla.html`,
tedy tam, kde se to na platformě zahodí.

Cestou se ukázalo, že u většiny nešlo o chybějící `for=`, ale o to, že
**tam nebylo žádné pole**: filtry na disciplínách a v recenzích byly ozdobné
`<span>` (58 kusů) a kontaktní formulář na `kontakty.html` neměl ani jedno
skutečné pole. Doplněno podle vzoru `.f-check` — skrytý `<input>` uvnitř
`<label>`, vizuál kreslí `<span>`.

### Rozhodnutí, která čekají na klienta

1. **Kontrast bílé na korálové — 2,82 : 1.** Týká se `.btn--primary`,
   `.product-card__add`, `.cart-badge`, `.discipline__age`, `.sticker-sale`.
   Norma žádá 4,5 : 1. Oprava = sáhnout na značkovou barvu napříč 43 stránkami.
   Slevový štítek už opravený je (tmavý text na korálové, 4,86 : 1).
2. **25 zelených odstínů** v `main.css` bez tokenu. Mapovat je lze jen podle
   role, ne podle numerické blízkosti.
3. **Taxonomie podkategorií** — `PODKATEGORIE` v `js/main.js` je můj návrh
   (27 podkategorií u 8 kategorií z 19), potřebuje potvrdit.
4. **Varianty produktů** — v datech nejsou vůbec. Bez nich zůstane řádek
   varianty v košíku prázdný.

---

## Rozhodnutí, která už padla — neřeš je znovu

**Karta produktu:** vzorem je `.product-card--listing` v `produkty.html`.
Fotka má `object-fit: contain` a `padding: 22px` — tvary vybavení jsou
nepravidelné a ořez je ničí.

**Mapování barev:** podle **role, ne podle ΔE**.

**Drobečky:** komponenta `.breadcrumbs`, modifikátory `--flush`, `--on-dark`,
`--hide-mobile`. Inline varianty už neexistují.

**Pokladna:** hlavička pokladny **není** osekaná — má vyhledávání, Účet,
Oblíbené i košík. Tak je to navržené.

**Inline styly v JS:** hex → `var()` uvnitř `style=""` je pořád inline styl.
Cílem je extrakce do CSS tříd.

**Odkazy na Připravujeme:** 318 odkazů na `pripravujeme.html` je **záměr**, ne
chyba. CEVOX Travel a CEVOX Hunt budou samostatné weby, které teprve vzniknou.
Jsou označené `data-cms-link`, takže se přesměrují hromadně.

---

## Pasti, na které jsem narazil

Stálo mě to čas, ať to nestojí i tebe:

1. **`hidden` je bezmocný proti `display: flex/grid` z CSS.** V `main.css` je
   proto pojistka `[hidden] { display: none !important; }`. Bez ní se skryté
   prvky zobrazují dál.
2. **`width`/`height` na `<img>` se chovají jako CSS `width`/`height`**, ne jen
   jako poměr stran. Proto je v CSS `img { width: auto; height: auto; }`
   s nízkou specificitou — atributy pak slouží jen k rezervaci místa.
3. **`decoding="async"` rozbilo vykreslování** karuselu (obrázky načtené, ale
   nevykreslené). Nepoužívat.
4. **`scroll-snap-type: x mandatory` sežere levé odsazení** karuselu. Řeší se
   `scroll-padding-inline`.
5. **Porovnávání screenshotů je bez přípravy nespolehlivé.** Stránky s animacemi
   a lazy obrázky se liší i mezi dvěma běhy **téhož** buildu. Před srovnáním
   vypni animace a vynuť načtení obrázků — jinak neodlišíš šum od regrese.
6. **Kontrola výšky stránky levně chytá rozbité HTML.** Když záměna spolkne
   uzavírací tag, stránka skokově naroste. Mě to upozornilo na rozbitý
   filtrační panel (+646 px místo +30).
7. **Vnořené `<form>` jsou neplatné HTML** a tiše rozbijí odesílání.
8. **Pozor na regexy přes vnořené prvky.** Dvakrát mi vzor „utekl" a spolkl
   půl stránky. U vnořeného HTML používej počítání hloubky `<div>`, ne odhad.

---

## Čísla v původním zadání byla zastaralá

Původní `POKRACOVANI.md` vznikl nad zipem s 56 soubory; A2 jich 18 smazalo.
Přeměřuj, nespoléhej na čísla v dokumentu. Co konkrétně nesedělo:

| tvrzení | skutečnost |
|---|---|
| 183 tlačítek do košíku | 75 |
| 491 `<input>`, 411 `<label>` | 147 / 136 (dnes 192 / 181) |
| 37 drobečků | 22 |
| „chipy značek jsou 3 `<span>`" | ty tři jsou plusy/minusy v recenzích; značky jsou na `katalog.html` a je jich 10 |
| „mrtvé pravidlo se 3 sloupci v `@media (max-width: 1000px)`" | **není mrtvé**, drží tablety 901–1000 px |
| „`href="#"` jsou zastaralé odkazy" | míří na nikdy nevzniklé stránky, ne na zrušené kategorie |

---

## Jak si ověřit stav

```bash
cd web

# odkazy a soubory — musí být 0 rozbitých
grep -o 'data-product-id' *.html | wc -l          # 87
grep -c 'PRODUCTS' js/main.js                      # 0

# fáze A
grep -o 'data-product-card[^>]*style=' *.html | wc -l   # 0
ls kategorie-*.html 2>/dev/null | wc -l                 # 0
grep -o '#[0-9a-fA-F]\{3,6\}' css/checkout-mobile.css | sort -u   # jen #fff
grep -o 'style="' js/kosik.js | wc -l              # 1 (dynamická šířka progresu)

# fáze B
grep -o 'price-vat' *.html | wc -l                 # 82 (ceny bez DPH)
grep -o 'stock-dot ' *.html | wc -l                # 82 (dostupnost)
grep -l 'data-vypis-prepinac' *.html | wc -l       # 8 (dlaždice/řádky)

# fáze C
ls vysledky-hledani.html ucet.html objednavka-detail.html znacka.html
grep -l 'name="description"' *.html | wc -l        # 43
grep -o 'action="404.html"' *.html | wc -l         # 0

# odstraněné funkce — všechno musí být 0
grep -c 'range__handle' *.html | awk -F: '{s+=$2} END{print s}'
grep -c 'data-sort-select' *.html | awk -F: '{s+=$2} END{print s}'
grep -c 'isDown\|scrubbing' js/main.js
grep -ci 'data-ico-fetch' js/main.js
```

Na závěr projeď web přes lokální server a sleduj konzoli — nákupní tok
(karta → košík → pokladna → potvrzení) musí projít bez chyby JS.
