# CEVOX Dive — web

Statický frontend e-shopu s potápěčským vybavením. Čisté HTML5 + CSS3 + vanilla
JavaScript. **Žádný framework, žádný build, žádné npm** — otevře se dvojklikem
v prohlížeči nebo nahrátím na libovolný hosting.

Připraveno na napojení na e-shopovou platformu nebo vlastní backend.

## Spuštění

```bash
cd web
python3 -m http.server 8000     # http://localhost:8000
```

Přes `file://` funguje také, jen se neodesílají formuláře.

---

## Co je hotové a co je ukázkové

Web je **vizuální demo s reálnou strukturou**. Vzhled, chování a datové háčky
jsou hotové; produktová data jsou ukázková a nahradí je backend.

| oblast | stav |
|---|---|
| Rozvržení, responzivita, komponenty | hotové |
| Košík včetně pokladny (5 kroků) | funkční, stav v `localStorage` |
| Vyhledávání, filtry, řazení | odesílají se jako `GET` — **vyhodnocuje server** |
| Produkty, ceny, počty | ukázková data v HTML |
| Varianty produktů (velikosti, barvy) | **nejsou v datech** — viz „Co chybí" |

### Ukázkový kód, který se při napojení zahodí

| kde | co |
|---|---|
| `js/main.js`, blok označený `DEMO` | filtrování výsledků hledání v prohlížeči (12 řádků) — nahradí serverové hledání |
| `js/main.js` — `KATEGORIE`, `PODKATEGORIE`, `ZNACKY` | názvy a popisy kategorií, podkategorií a značek |
| `js/kosik-data.js` — `DOPRAVCI` | seznam dopravců |
| `js/kosik.js` — `KUPON` | slevový kód `LETO700` |

---

## Struktura

```
*.html                43 stránek v kořeni
css/main.css          hlavní styly, design tokeny v :root
css/checkout-mobile.css  mobilní pokladna, scoped pod .co-mobile
js/kosik-data.js      sdílený stav košíku — jediný zdroj pravdy
js/main.js            hlavička, drawer, filtry, kategorie, značky, výpisy
js/kosik.js           pokladna (mobilní i desktopová)
partials/             hlavička, patička, SVG sprite — předloha pro includes
img/                  produktové fotky, bannery, favicon
```

`partials/` odpovídá 1:1 obsahu v jednotlivých stránkách — při přechodu na
šablony je nahraďte `include`. Hlavička pokladny je záměrně jiná varianta
(`site-header--checkout`).

---

## Napojení na backend

### 1. Produkty → tlačítko do košíku

Každé tlačítko „Do košíku" nese kompletní data produktu. Šablona je vyplní:

```html
<button data-add-to-cart
        data-product-id="mares-puck-pro-pocitac"
        data-brand="Mares"
        data-name="Puck Pro+ potápěčský počítač"
        data-price="4990"
        data-img="img/produkt-puck-pro.jpg"
        data-variant="">Do košíku</button>
```

`data-product-id` je jediný identifikátor — podle něj se položky v košíku
slučují. `data-price` je celé číslo v korunách, bez mezer a měny.

### 2. Košík — veřejné API

`js/kosik-data.js` je jediný zdroj pravdy. Stav v `localStorage`, klíč
`cevox-kosik`. Pro napojení na server nahraďte vnitřek modulu voláním API,
rozhraní ponechte:

| metoda | co dělá |
|---|---|
| `Kosik.nacti()` | načte položky z úložiště |
| `Kosik.pridej(polozka)` | přidá / navýší podle `id` |
| `Kosik.zmenPocet(id, n)` | změní množství |
| `Kosik.odeber(id)` | odebere položku |
| `Kosik.polozky()` | vrátí pole položek |
| `Kosik.mezisoucet()` | součet bez dopravy |
| `Kosik.pocetKusu()` | počet kusů celkem |
| `Kosik.naZmenu(fn)` | registruje posluchače změn |
| `Kosik.dopravci()` | seznam dopravců |

Vykreslování (drawer, mezikošík, odznak v hlavičce, pokladna) je na tomhle
rozhraní postavené a nemění se.

### 3. Klíče v `localStorage`

| klíč | obsah |
|---|---|
| `cevox-kosik` | položky košíku |
| `cevox-pokladna` | zvolená doprava, platba, uplatněný kupón |
| `cevox-vypis` | volba dlaždice / řádky ve výpisu |

`cevox-cart` je starý klíč, čte se jen kvůli migraci.

### 4. Formuláře — vše `GET`, vyhodnocuje server

| pole | kde | poznámka |
|---|---|---|
| `q` | vyhledávání (74 formulářů) | cíl `vysledky-hledani.html` |
| `kategorie`, `podkategorie` | kategorie | slug |
| `znacka` | značky a filtr | slug, může být vícekrát |
| `stav`, `vykon`, `typ`, `napajeni`, `dostupnost` | filtry | checkboxy, mohou být vícekrát |
| `cena-od`, `cena-do` | cenový filtr | celá čísla |
| `razeni` | řazení | `doporucene` / `nejlevnejsi` / `nejdrazsi` / `nejnovejsi` |
| `odebrat` | × u aktivního filtru | slug filtru k odebrání |
| `doprava`, `platba` | pokladna | id z `DOPRAVCI` / plateb |

Filtrační panel je jeden `<form class="filters__form" method="get">`; skryté
pole drží kontext stránky, aby se při filtrování neztratila kategorie ani dotaz.

### 5. Datové háčky pro šablonování

| atribut | význam |
|---|---|
| `data-cms="..."` | jednotlivý text nebo obrázek |
| `data-cms-loop="..."` | kontejner generovaný cyklem |
| `data-cms-link="..."` | odkaz, jehož cíl doplní CMS |
| `data-product-card` | karta produktu ve výpisu |
| `data-vypis-grid`, `data-vypis-prazdno` | mřížka výpisu a její prázdný stav |
| `data-co-lines`, `data-co-items`, `data-co-totals`, `data-co-grand` | desktopová pokladna |
| `data-co-ship-title`, `data-co-ship-sub` | zvolený dopravce |
| `data-stav-vyprodano` | varianta detailu pro vyprodaný produkt |

### 6. Prázdné stavy

Připravené a skryté atributem `hidden` — server je odkryje:

- `data-vypis-prazdno` na 11 výpisech (tři varianty textu podle kontextu)
- `data-vysledky-prazdno` na stránce hledání
- `data-stav-vyprodano` na detailu produktu (šedá pilulka + „Hlídat dostupnost")

---

## Ceny a DPH

Ceny v HTML jsou **včetně DPH**. Pod nimi je částka bez DPH (sazba 21 %),
protože kluby a školy nakupují na IČO. U produktů s velikostními variantami
je před cenou „od".

Doprava zdarma od **5 000 Kč** — konstanta `FREE_SHIPPING` v `js/main.js`;
stejná hodnota je i v textech, při změně upravte obojí.

---

## Dostupnost

Sjednoceno na **dvě hodnoty**:

| stav | zobrazení |
|---|---|
| Skladem | zelená tečka |
| Na dotaz | šedá tečka |

Ve výpisu je dostupnost jen barevná tečka vedle ceny; text je v `title`
a `aria-label`. Na detailu produktu je celá pilulka.

---

## Co chybí a musí přijít z backendu

1. **Varianty produktů.** V HTML nejsou nikde — `data-variant` je prázdný
   a řádek varianty v košíku zůstává prázdný. Velikosti neoprenů, ploutví
   a bot je potřeba doplnit jako datovou vrstvu.
2. **Skutečné počty a stavy skladu.** Čísla u filtrů a kategorií jsou ukázková.
3. **Taxonomie podkategorií.** `PODKATEGORIE` v `js/main.js` je návrh — 27
   podkategorií u 8 kategorií z 19. Zbylým 11 druhá úroveň záměrně chybí.
4. **Odesílání formulářů.** Kontaktní formuláře (reklamace, servis) mají
   `method="post"` bez cíle — doplňte `action` a odeslání e-mailem.

---

## Připravované sekce

318 odkazů míří na `pripravujeme.html`. Jsou označené `data-cms-link`, takže
se dají přesměrovat jedním hromadným zásahem, jakmile cíle vzniknou:

| značka | odkazů | cíl |
|---|---|---|
| `cevox-travel` | 119 | samostatný web CEVOX Travel |
| `cevox-hunt` | 79 | samostatný web CEVOX Hunt |
| `zajezdy` | 40 | součást CEVOX Travel |
| `dovolena` | 40 | plánovaná landing page |
| `sitemap` | 40 | mapa stránek |

---

## Poznámka o ukázkové verzi

V patičce je řádek „Ukázková verze — produktová data jsou demonstrační,
vyhledávání a filtry vyhodnocuje server." **Před nasazením ji vypněte**
přepnutím konstanty v `js/main.js`:

```js
var DEMO = true;   // → false
```

Poznámka je v HTML skrytá atributem `hidden`, JS ji jen odkrývá — při `false`
se nezobrazí a nic dalšího není potřeba mazat.

---

## Známé nedodělky

- **Kontrast tlačítek.** Bílý text na korálové (`--coral #FF6B4A`) má poměr
  2,82 : 1, norma WCAG AA žádá 4,5 : 1. Týká se `.btn--primary`,
  `.product-card__add`, odznaku košíku a dalších. Řešení vyžaduje rozhodnutí
  o značkové barvě. Slevový štítek už opravený je (tmavý text, 4,86 : 1).
- **Popisky formulářů.** 153 z 181 `<label>` nemá `for=`, takže se nespáruje
  s polem pro odečítače obrazovky. Neřešeno záměrně — pokladna i účet se při
  přechodu na platformu pravděpodobně nahradí.
- **Zelené odstíny.** 25 hodnot v CSS nemá token; sjednocení vyžaduje
  rozhodnutí o roli jednotlivých odstínů.

---

## Obrázky

V `img/` jsou zástupné obrázky se sémantickými názvy — stačí přepsat soubor
stejného jména vlastní fotkou. Poměry: produkty 1:1, hero 4:3, bannery ~16:9.
Všechny `<img>` mají `width`, `height` i `alt`; obrázky pod ohybem `loading="lazy"`.
