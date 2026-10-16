# Europa Voxel – Briefing di progetto

> Progetto scolastico per la lezione di **inglese**: un videogioco 3D open world in stile voxel / low poly che fa esplorare l'Europa, i suoi monumenti e le sue curiosità.
> Stato: **v0.7** – **Giorni 1, 2, 3 e 4 fatti**.
> - Giorno 4: dopo la scheda "Did you know?" c'è il **quiz** (3 risposte, se sbagli puoi riprovare con un'altra domanda); risposta giusta → **timbro** che "sbatte" sul **passaporto** (tasto P) con la foto di Atlas. Con 8 timbri parte la schermata finale **"You explored Europe!"** con coriandoli e statistiche. I progressi sono salvati: alla riapertura c'è "Continue" e "New passport". Primo **`.exe` portable** creato (`release/Europa Voxel 0.4.0.exe`, ~95 MB).
> - Il navigatore di pilota e capitano è ora una **mappa illustrata**: si clicca l'isola, si vede la rotta tratteggiata animata e la scheda con i monumenti; lo stesso stile è usato per la mappa (M).
> - Giorno 3: monumenti voxel su tutte le isole – Atomium, Colosseo, Torre di Pisa (pendente!), Porta di Brandeburgo con la quadriga, castello di Neuschwanstein su una collina, Sagrada Família con la gru, 5 mulini a vento con le pale che girano, Partenone in rovina, Big Ben con orologi, bus rosso e cabina telefonica. Tutti con collisioni (si può passare sotto la Porta di Brandeburgo e salire sui gradini del Partenone). L'aereo ora sbatte contro edifici e alberi: rimbalza indietro e fa una giravolta.
> - Giorno 1: isola Francia, Atlas, Torre Eiffel con scheda "Did you know?", schermata di benvenuto.
> - Giorno 2: arcipelago con 8 isole (bandiera, molo con barca, pista con aereo), barca e aereo guidabili, mappa (M), 32 NPC che passeggiano e parlano, Atlas dettagliato con animazioni articolate, collisioni, menu a tutto schermo (pausa, impostazioni grafica/audio/controlli, guida), musica ed effetti sonori generati nel codice.
> - Viaggi: su ogni isola c'è un **pilota** accanto all'aereo e un **capitano** sul molo. Parlandoci (E) si apre il menu "Where do you want to fly/sail?" con le 8 isole: si sceglie e il viaggio è automatico (decollo, volo, atterraggio; la barca gira intorno alle isole). Spazio salta il viaggio. Resta l'opzione "Fly/Sail it yourself" per guidare da soli.
> - **Tour delle città**: accanto a ogni monumento c'è una guida con la bandierina. Con E parte il tour della **città** (Parigi, Bruxelles, Amsterdam, Londra, Berlino, Baviera, Barcellona, Roma, Pisa, Atene): 7 slide con sottotitoli, foto della guida e voce inglese; la camera alterna voli sopra l'isola e inquadrature del monumento. Alla fine c'è un **test di 5 domande** (risposte mescolate): con almeno 3 giuste si vince il **timbro** del paese.
> - **Voci**: generate gratis e in locale con **Kokoro TTS**: `npm run make-voices` crea gli mp3 in `public/voices/` (232 file: tour, domande dei test, saluti degli abitanti, risposte in versione maschile e femminile). Salta i file già fatti; `--force` li rifà, `--only=eiffel` solo alcuni. Le voci per personaggio si scelgono in `scripts/make-voices.js`. Se un file manca, il gioco usa la voce del computer. `npm run voices` crea `SCRIPT.txt` con tutte le frasi.
> - **Chat con gli abitanti**: a sinistra il ritratto 3D dell'abitante (si muove e mostra le onde quando parla), a destra una chat con i fumetti, l'indicatore "sta scrivendo…" e le domande già pronte come pulsanti.
> - **Accessi**: Francia aereo + barca; Belgio, Germania, Italia solo aereo; Olanda, Regno Unito, Spagna, Grecia solo barca. Sulla mappa ogni isola mostra ✈/⚓; le isole non raggiungibili col mezzo scelto sono sbiadite e spiegano come arrivarci.
> - Tolti i comandi in basso a destra (restano nella guida "How to play").
> - Monumenti: non si interagisce più con i monumenti; schede e quiz si fanno **solo con la guida** (tour + test da 5 domande).
> - In barca e in aereo c'è una **minimappa rotonda** a sinistra (nord in alto, bandiere delle isole vicine, freccia verso la destinazione del viaggio).
> - La **Royal Guard** non parla: nella chat c'è solo "..." e il pulsante per salutare.
> - **Nuovo menu principale**: pannello a sinistra con logo, bandiere e bottoni uno sotto l'altro (Play, Customize Atlas, Settings, How to play, Quit solo nell'`.exe`). Dietro, la camera vola intorno a **tutti i monumenti a turno** (9 secondi l'uno, con dissolvenza) e un cartellino in basso a destra dice quale si sta vedendo.
> - **Guardaroba – "Customize Atlas"** (dal menu principale e dalla pausa): Atlas 3D che gira (si trascina col mouse) e tre schede – *Look* (pelle, capelli, colore capelli, barba/baffi/occhiali), *Clothes* (cappello e colore, maglia e colore, righe, pantaloni/pantaloncini/gonna, calzini, scarpe), *Extras* (sciarpa, zaino, orologio, macchina fotografica, baguette, bretelle). Pulsanti Random e "Original Atlas". Il look è salvato e si vede anche nella foto del passaporto.
> - **Easter egg** su ogni isola, una scenetta con gli stereotipi del paese (`js/models/eggs.js`): Francia – due italiani che provano a rubare la Gioconda sul cavalletto mentre il pittore dorme tra le baguette; Belgio – francese e belga litigano su chi ha inventato le patatine, con waffle e cioccolato; Olanda – montagna di bici, zoccoli giganti, formaggi, tulipani e una ciclista che gira in tondo; Regno Unito – tè sotto la nuvoletta di pioggia e coda perfetta alla cabina telefonica; Germania – signore in lederhosen (calzini coi sandali!) che guarda l'orologio aspettando il treno delle 8, salsicce e bretzel gigante; Spagna – siesta sull'amaca dopo la paella e ballerina di flamenco; Italia – pizza con l'ananas e gesti disperati di chef e nonna, forno a legna e Vespa; Grecia – piatti rotti ("Opa!"), filosofo-statua, capra sulla roccia e anfora. Quando ci si avvicina compare un cartellino con la spiegazione in inglese; il passaporto conta le uova trovate (🥚 n/8).
> - **Segreti del mare** (`js/models/seacreatures.js`): in mare aperto ogni tanto emergono **Nessie** (tra Francia e Regno Unito), una **balena** con lo spruzzo (verso la Spagna) e il **Kraken** (tra Italia e Grecia). Restano fuori dall'acqua circa un terzo del tempo; sulla mappa (M) e sulla minimappa compare la loro icona con i cerchi nell'acqua quando emergono, solo bollicine quando sono sotto. Passandoci vicino in barca o in aereo compare il cartellino "Sea secret spotted!" (non conta nel passaporto).
> - **GitHub**: repo privata https://github.com/KriEU7/europa-voxel. A ogni push su `main` il workflow `.github/workflows/release.yml` fa i test e compila un file per sistema: Windows `.exe` portable, macOS `.dmg` universale (Intel + Apple Silicon, non firmato: la prima volta tasto destro → Apri), Linux `.AppImage`. Poi pubblica da solo la release `v<versione>-build.<n>`. Le modifiche solo a `.md` e `screenshots/` non creano release. In locale `npm run dist` fa solo l'`.exe`.
> - Prossimo (giorno 5): **provare l'`.exe` su un PC della scuola**, inserire i testi della squadra, rifiniture.

---

## 1. Obiettivo

Creare un gioco che:
- si avvia con un **doppio clic** (app desktop Electron, senza installazione) sui PC della scuola, anche lenti, con una versione browser di riserva;
- fa esplorare liberamente una **mappa 3D dell'Europa** stilizzata;
- insegna monumenti, cibi, tradizioni e curiosità dei vari paesi;
- è **interamente in inglese** (testi, menu, schede informative), perché è il progetto di inglese;
- si può presentare in classe in 10–15 minuti.

## 2. Concept di gioco

Il mondo è un **arcipelago**: ogni paese è un'**isola voxel** a sé, con il suo terreno, i suoi colori e i suoi monumenti, disposte nel mare più o meno come sulla carta geografica (Spagna a sud-ovest, Grecia a sud-est, Olanda a nord…).

Il giocatore è un **viaggiatore** che parte dall'isola della Francia (sul prato davanti alla Torre Eiffel) con un **passaporto vuoto**.
Su ogni isola ci sono **4 abitanti** vestiti in stile locale (panettiere francese, guardia reale inglese, gondoliere italiano…) che dicono una curiosità quando gli parli.
Si muove in tre modi:
- **a piedi** sulle isole, per avvicinarsi ai monumenti;
- in **barca**, partendo dal porto di ogni isola: lenta ma bella, si vedono le isole avvicinarsi;
- in **aereo**, dall'aeroporto di ogni isola: veloce, per i viaggi lunghi.

Vicino a un monumento, premendo un tasto si apre una **scheda "Did you know?"** con 2–3 curiosità, seguita da un **quiz** (1–3 domande in inglese).
Risposta giusta → **timbro sul passaporto** di quel paese.
Passaporto completo → schermata finale "You explored Europe!".

Loop di gioco:
```
arriva sull'isola → esplora a piedi → trova monumento → leggi curiosità → quiz → timbro → barca/aereo → isola successiva
```

## 3. Stile visivo

- **Mix low poly + voxel** ("cubettoso ma non troppo"): terreno, alberi, mare e nuvole sono **low poly a facce piatte**; monumenti e personaggi sono **voxel a cubetti piccoli**.
- Colori pieni, niente texture (colore per vertice) → leggerissimo da disegnare.
- Cielo a gradiente con nuvole low poly, mare con onde animate, ombre morbide, nebbia leggera in lontananza.
- **Grafica leggera automatica**: se il PC non ha una scheda video (driver di base di Windows), il gioco spegne le ombre e riduce la risoluzione.
- Ogni paese ha un **colore/terreno riconoscibile** (es. Italia colline verdi e cipressi, Olanda pianura con tulipani, Norvegia neve e fiordi).
- Tutti i modelli 3D li crea Claude **in codice** (ogni modello = elenco di cubi colorati), quindi niente programmi esterni tipo Blender o MagicaVoxel.

### Il protagonista: Atlas
Giovane viaggiatore **scout**, il nome viene dall'atlante geografico.

| Elemento | Aspetto voxel |
|---|---|
| Capelli | Tanti, castani e spettinati, escono da sotto il cappello |
| Cappello | Cappello scout a tesa larga, blu scuro |
| Vestiti | **Tutto in blu**: camicia scout azzurra con taschini, pantaloncini blu navy, calzettoni blu |
| Fazzoletto scout | Al collo; giallo per staccare dal blu (da confermare) |
| Accessori | Zaino da viaggio con il **passaporto** che spunta fuori, scarponcini marroni |
| Animazioni | Camminata (gambe e braccia che oscillano), salto, saluto quando prende un timbro |

Atlas si vede in **terza persona**; quando sale su barca o aereo resta visibile ai comandi.

## 4. Stack tecnico (proposta)

**Stack definitivo: Three.js + Vite + Electron.**
Il gioco è una normale app web; Electron la "impacchetta" in un programma desktop (`.exe`). Lo stesso codice produce **due versioni**: l'app desktop (principale) e la versione browser (di riserva).

| Cosa | Scelta | Perché |
|---|---|---|
| App desktop | **Electron** → `.exe` **portable** per Windows (electron-builder) | Doppio clic e parte, niente installazione, niente internet, funziona offline in classe |
| Motore 3D | **Three.js** (da npm, versione fissata) | Libreria 3D web più diffusa, leggera, tanta documentazione |
| Build / sviluppo | **Vite** | Ricarica istantanea mentre si sviluppa; crea la cartella `dist/` che usano sia Electron sia la versione web |
| Linguaggio | **JavaScript** (moduli ES) | Niente TypeScript: meno setup, con una settimana di tempo conta |
| Modelli | Voxel generati da codice, uniti in **una sola mesh per modello** | Migliaia di cubi ma pochissime draw call → veloce anche su PC scarsi |
| UI (schede, quiz, passaporto, menu) | **HTML + CSS** sopra il canvas 3D | Più semplice e leggibile di una UI disegnata in 3D |
| Backup | Versione web su **GitHub Pages** + `.exe` su chiavetta USB | Se la scuola blocca gli `.exe`, si apre il link nel browser |

### Electron: pro e contro
- ✅ Sembra un "vero" videogioco: finestra a schermo intero, icona, nome "Europa Voxel".
- ✅ Funziona senza internet e con la stessa versione di Chromium su ogni PC → niente sorprese di browser vecchi.
- ⚠️ L'`.exe` pesa circa **100–150 MB** (contiene un browser intero). Per una chiavetta va bene.
- ⚠️ Alcuni PC scolastici **bloccano i programmi non firmati** (Windows SmartScreen: "Esegui comunque"). → **Provare l'`.exe` su un PC della scuola entro metà settimana**; in caso di blocco si presenta la versione web.
- ⚠️ La build Windows si fa da Windows (va bene: il PC di sviluppo è Windows, Node.js 24 già installato).

### Comandi
```bash
npm run dev        # sviluppo nel browser con ricarica istantanea
npm run electron   # prova dentro la finestra Electron
npm run dist       # crea l'.exe portable in release/
```

### Regole di performance (target: 60 FPS su PC della scuola)
- Una mesh unica per ogni modello voxel, materiale semplice (`MeshLambertMaterial`) con colori per vertice.
- Nebbia + distanza di visione limitata; i paesi lontani non vengono disegnati.
- Qualità grafica **Low / Medium / High** nelle impostazioni (ombre, risoluzione, distanza di visione, onde). I PC senza scheda video partono in automatico su Low.
- Le isole lontane e i loro abitanti non vengono disegnati né aggiornati.

### Struttura file
```
Europa/
├── package.json        # dipendenze e comandi (three, vite, electron, electron-builder)
├── electron/main.js    # apre la finestra Electron (a tutto schermo), carica dist/index.html, voci di Windows
├── electron/preload.cjs # collega il gioco alle voci di Windows
├── public/voices/      # mp3 delle voci (npm run make-voices) + SCRIPT.txt con tutte le frasi
├── scripts/make-voices.js # genera le voci con Kokoro TTS
├── scripts/voice-script.js
├── index.html          # pagina del gioco: HUD, benvenuto, menu, mappa, schede
├── style.css
└── js/
    ├── main.js         # avvio, loop di gioco, interazioni
    ├── player.js       # movimento, salto, collisioni, guida dei veicoli, camera
    ├── physics.js      # collisioni (+ physics.test.js)
    ├── world.js        # le 8 isole: terreno, alberi, moli, piste, bandiere, mare
    ├── vehicles.js     # barca e aereo (modelli, guida manuale, pilota automatico)
    ├── travel.js       # pilota e capitano, menu delle destinazioni, viaggi automatici
    ├── mapview.js      # mappa illustrata (navigatore viaggi + mappa M)
    ├── minimap.js      # minimappa rotonda in barca e in aereo
    ├── passport.js     # quiz, passaporto con i timbri, schermata finale, salvataggio progressi
    ├── tour.js         # guide turistiche e presentazioni con camera cinematografica
    ├── dialog.js       # domande agli abitanti
    ├── voice.js        # voce inglese: mp3 registrati, oppure voce del computer
    ├── npc.js          # abitanti che passeggiano e parlano (vestiti per paese)
    ├── ui.js           # menu, impostazioni, mappa, banner, fumetti
    ├── audio.js        # musica ed effetti generati con Web Audio (niente file audio)
    ├── settings.js     # impostazioni salvate nel browser
    ├── flags.js        # bandiere disegnate pixel per pixel
    ├── voxel.js        # trasforma "lista di cubi" in mesh (+ voxel.test.js)
    ├── wardrobe.js     # guardaroba: personalizzazione di Atlas con anteprima 3D
    ├── models/         # Atlas e NPC (character.js), Torre Eiffel (france.js), altri monumenti (monuments.js), easter egg (eggs.js), creature del mare (seacreatures.js)
    └── data/facts.js   # curiosità, quiz e frasi degli abitanti in inglese – il file che modifica la squadra
```

`data/facts.js` è pensato per essere modificato **senza saper programmare**: ogni paese è un blocco con curiosità e domande, e in fondo ci sono le frasi degli abitanti (`PEOPLE`). Basta copiare una riga e cambiare il testo.

## 5. Controlli

| Tasto | Azione |
|---|---|
| WASD / frecce | Muoversi (a piedi) · velocità e sterzo (veicoli) |
| Shift | Correre · in aereo: scendere di quota |
| Spazio | Saltare · in aereo: salire di quota / decollare |
| Mouse / rotella | Ruotare la camera / zoom |
| E | Parlare con gli abitanti · leggere la scheda del monumento · parlare con pilota/capitano per viaggiare |
| Spazio (in viaggio) | Saltare il viaggio |
| F | Scendere da barca o aereo quando guidi tu |
| M | Mappa dell'Europa |
| P | Passaporto |
| Esc | Pausa |

## 6. Contenuti – prima bozza

> Claude prepara una **base di curiosità e quiz**; la squadra le **verifica** e ne **aggiunge altre** in `data/facts.js`.
> ⚠️ Nessuna curiosità va consegnata senza che qualcuno del gruppo l'abbia controllata su una fonte.

| Isola | Monumenti voxel | Curiosità di base (in inglese, da verificare) |
|---|---|---|
| 🇧🇪 Belgio (start) | Atomium, bandiera UE | Brussels hosts the main EU institutions. · The Atomium was built for the 1958 World's Fair. · The EU flag has 12 stars. |
| 🇮🇹 Italia | Colosseo, Torre di Pisa | Pizza Margherita is named after Queen Margherita. · Venice is built on over 100 small islands. · The Colosseum could hold about 50,000 people. |
| 🇫🇷 Francia | Torre Eiffel | The Eiffel Tower was built for the 1889 World's Fair and was meant to be temporary. · France is the most visited country in the world. |
| 🇩🇪 Germania | Porta di Brandeburgo, Neuschwanstein | Neuschwanstein Castle inspired Disney's Sleeping Beauty castle. · The Berlin Wall fell in 1989. |
| 🇪🇸 Spagna | Sagrada Família | The Sagrada Família has been under construction since 1882. · In La Tomatina people throw tomatoes at each other. |
| 🇳🇱 Olanda | Mulini a vento, tulipani | There are more bicycles than people in the Netherlands. · About a quarter of the country is below sea level. |
| 🇬🇷 Grecia | Partenone | The ancient Olympic Games started in Olympia. · Greece has thousands of islands, but only about 200 are inhabited. |
| 🇬🇧 Regno Unito | Big Ben, bus rosso, cabina telefonica | "Big Ben" is the name of the bell, not the tower. · In the UK people drive on the left. · The UK left the EU in 2020. |

### Formato del quiz
Ogni isola ha 2–3 domande a scelta multipla; per il timbro ne esce **una a caso**. Esempio:

> **Why was the Eiffel Tower built?**
> A) As a radio tower · **B) For the 1889 World's Fair** ✅ · C) As a home for the king

## 7. Calendario (consegna: settimana prossima)

Tempi stretti → si lavora a **versioni sempre giocabili**: ogni sera c'è un gioco che funziona, anche se incompleto.

| Giorno | Claude (codice e modelli) | Squadra |
|---|---|---|
| 1 | Setup progetto (Vite + Three.js + Electron), isola Francia, Atlas che cammina, Torre Eiffel con scheda | Leggere il briefing, dividersi i ruoli |
| 2 | Arcipelago con 8 isole, mare, porti e aeroporti, barca e aereo | Verificare curiosità di base, scrivere le proprie |
| 3 | Tutti i monumenti voxel | Scrivere le domande del quiz |
| 4 | Quiz, passaporto con timbri, schermata finale; **primo `.exe`** | **Provare l'`.exe` su un PC della scuola** |
| 5 | Menu, suoni, rifinitura, testi della squadra inseriti | Giocare tutto e segnalare bug/errori di inglese |
| 6 | Correzioni finali, build definitiva + versione web di riserva | Prova generale della presentazione |

Se il tempo non basta si taglia in quest'ordine: suoni → animazioni extra → seconda curiosità per isola. **Non si tagliano**: isole, monumenti, quiz e passaporto.

## 7b. Squadra (5 persone)

| Ruolo | Chi | Compiti |
|---|---|---|
| Coordinatore / build | ? | Lancia `npm run dist`, porta l'`.exe` a scuola, tiene la chiavetta |
| Contenuti ×2 | ? ? | Verificano le curiosità, ne aggiungono altre, scrivono i quiz in `facts.js` |
| Inglese | ? | Controlla grammatica e tono di tutti i testi del gioco |
| Presentazione / tester | ? | Gioca ogni versione, prepara lo script e le slide in inglese |

## 8. Fuori scopo (per ora)

- Multiplayer
- Salvataggi online / account
- Versione mobile touch (si valuta dopo M3)

## 9. Decisioni prese

| Tema | Decisione |
|---|---|
| Mappa | **Isole separate**, una per paese (arcipelago) |
| Movimento | **A piedi, barca e aereo** |
| Paesi | **6–8 principali** (vedi tabella sezione 6) |
| Obiettivo | **Passaporto con timbri + quiz** in inglese |
| Stack | **Three.js + Vite + Electron** (`.exe` portable), versione web di riserva |
| Regno Unito | **Incluso** (8 isole in totale) |
| Protagonista | **Atlas**, giovane scout viaggiatore vestito di blu |
| Scadenza | **Settimana prossima** |
| Squadra | **5 persone**; Claude prepara una base di contenuti, la squadra verifica e aggiunge |

## 10. Domande ancora aperte

1. **Giorno esatto** della presentazione?
2. **Nomi** per i ruoli della squadra (sezione 7b)?
3. Colore del **fazzoletto scout** di Atlas (proposto giallo)?
