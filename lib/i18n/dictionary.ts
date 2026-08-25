import type { Lang } from "@/lib/i18n/types";

/**
 * Ordbok for all fast UI-tekst (meny, knapper, overskrifter, tomme-
 * tilstander osv.). Selve oppskriftsinnholdet (titler, ingredienser,
 * steg) kommer fra databasen på norsk og oversettes på forespørsel via
 * lib/actions/ai.ts -> getEnglishVariant, IKKE herfra.
 *
 * Nøkler er flate dot-strenger ("nav.recipes") for enkelhets skyld – ingen
 * behov for dyp nesting i en ordbok av denne størrelsen.
 */
const DICT = {
  "nav.recipes": { no: "Oppskrifter", en: "Recipes" },
  "nav.favorites": { no: "Favoritter", en: "Favorites" },
  "nav.shoppingList": { no: "Handleliste", en: "Shopping list" },
  "nav.search": { no: "Søk", en: "Search" },
  "nav.admin": { no: "Admin", en: "Admin" },
  "nav.mainNav": { no: "Hovednavigasjon", en: "Main navigation" },
  "nav.mainNavMobile": { no: "Hovednavigasjon, mobil", en: "Main navigation, mobile" },
  "nav.home": { no: "Hjem", en: "Home" },
  "nav.pantry": { no: "Ingrediens-søk", en: "Ingredient search" },
  "nav.language": { no: "Språk", en: "Language" },

  // --- AppDownloadBanner: forhåndsvisning av "har vi en app"-tanken, ikke
  // koblet til noe ekte enda – se components/layout/AppDownloadBanner.tsx.
  "appBanner.text": { no: "Snart som app", en: "Coming soon as an app" },
  "appBanner.scanHint": { no: "Skann for å laste ned", en: "Scan to download" },
  "appBanner.mobileCta": { no: "Last ned appen", en: "Get the app" },

  "footer.allRecipes": { no: "Alle oppskrifter", en: "All recipes" },
  "footer.favorites": { no: "Favoritter", en: "Favorites" },
  "footer.shoppingList": { no: "Handleliste", en: "Shopping list" },
  "footer.admin": { no: "Admin", en: "Admin" },
  "footer.madeFor": { no: "Laget for eget kjøkkenbruk.", en: "Made for home kitchen use." },
  "footer.ariaLabel": { no: "Bunntekst", en: "Footer" },
  "footer.backToTop": { no: "Til toppen", en: "Back to top" },

  "demo.banner": {
    no: "Demo-modus: viser eksempeloppskrifter. Koble til Supabase i .env.local for å bruke din egen database og admin-panel – se README.md.",
    en: "Demo mode: showing example recipes. Connect Supabase in .env.local to use your own database and admin panel – see README.md.",
  },

  "home.eyebrow": { no: "Din digitale kokebok", en: "Your digital cookbook" },
  "home.title": {
    no: "Oppskriftene du faktisk lager – igjen og igjen",
    en: "The recipes you actually cook — again and again",
  },
  "home.subtitleRest": {
    no: "Det beste skjer rundt bordet.",
    en: "The best things happen around the table.",
  },
  /** Brukt i AtmosphereSection (den mørke stemningsseksjonen med
   * kakestabel-/vinglassbildet) i stedet for home.subtitleRest – samme
   * frase der og i heroen (pluss footeren) rett over ble opplevd som
   * gjentakende av Henrik, se tilbakemelding 24.08.2026. */
  "home.atmosphere.tagline": {
    no: "Tenn stearinlysene. Fyll glasset. Nyt.",
    en: "Light the candles. Fill the glass. Enjoy.",
  },
  "home.browseAll": { no: "Bla gjennom alle oppskrifter", en: "Browse all recipes" },
  "home.seeFavorites": { no: "Se favoritter", en: "See favorites" },
  "home.featuredRecipes": { no: "Utvalgte oppskrifter", en: "Featured recipes" },
  "home.browseByCategory": { no: "Bla etter kategori", en: "Browse by category" },
  "home.newestRecipes": { no: "Nyeste oppskrifter", en: "Newest recipes" },
  "home.houseFavorites": { no: "Husets favoritter", en: "House favorites" },
  "home.seeAll": { no: "Se alle", en: "See all" },
  "home.scrollDown": { no: "Bla nedover", en: "Scroll down" },

  // Stemningsvelger ("Mood Mode", Fase 4 – Smak) – forsideseksjon, se
  // components/home/MoodModeSection.tsx og lib/kitchen-intelligence/moods.ts.
  "moodMode.heading": { no: "Hva passer humøret ditt?", en: "What fits your mood?" },
  "moodMode.intro": {
    no: "Velg en stemning, så finner vi noen oppskrifter som passer.",
    en: "Pick a mood, and we'll find some recipes that fit.",
  },
  "moodMode.quick": { no: "Rask middag", en: "Quick dinner" },
  "moodMode.cozy": { no: "Koselig kveld", en: "Cozy night in" },
  "moodMode.impress": { no: "Imponer gjestene", en: "Impress guests" },
  "moodMode.crowd": { no: "Lage til mange", en: "Feeding a crowd" },
  "moodMode.healthy": { no: "Sunt og lett", en: "Healthy & light" },
  "moodMode.loading": { no: "Finner oppskrifter …", en: "Finding recipes …" },
  "moodMode.error": {
    no: "Klarte ikke å finne forslag akkurat nå. Prøv igjen.",
    en: "Couldn't find suggestions right now. Please try again.",
  },
  "moodMode.none": {
    no: "Fant ingen gode treff akkurat nå – prøv en annen stemning.",
    en: "No good matches right now – try a different mood.",
  },

  // --- Redesignet forside under hero: editorial utvalg-seksjon ---
  "home.editorial.eyebrow": { no: "Ukens utvalg", en: "Pick of the week" },
  "home.editorial.also": { no: "Også verdt å prøve", en: "Also worth trying" },
  "home.editorial.viewRecipe": { no: "Se oppskrift", en: "See recipe" },
  // Oversettelse av det avsluttende sitatet (Brillat-Savarin) nederst i
  // "Nyeste oppskrifter" – selve sitatet/attribusjonen er bevisst alltid på
  // fransk (se NewestRecipesFeed.tsx), kun denne lille oversettelseslinjen
  // bytter språk med resten av siden.
  "home.editorial.closingQuoteTranslation": {
    no: "Si meg hva du spiser, så skal jeg si deg hvem du er.",
    en: "Tell me what you eat, and I will tell you what you are.",
  },

  // --- Mat & vin-seksjonen ---
  "home.wine.eyebrow": { no: "Mat & vin", en: "Food & wine" },
  "home.wine.title": { no: "Finn den perfekte matchen.", en: "Find the perfect match." },
  "home.wine.subtitle": {
    no: "Velg en rett, eller fortell oss hvilken vin du har.",
    en: "Pick a dish, or tell us what wine you have.",
  },
  "home.wine.tabFood": { no: "Finn vin til maten", en: "Find wine for the dish" },
  "home.wine.tabWine": { no: "Sjekk vinen min", en: "Check my wine" },
  "home.wine.foodPrompt": { no: "Hva skal du lage?", en: "What are you cooking?" },
  "home.wine.foodSearchPlaceholder": { no: "Søk etter oppskrift …", en: "Search for a recipe …" },
  "home.wine.foodNoResults": { no: "Ingen treff. Prøv et annet søk.", en: "No matches. Try another search." },
  "home.wine.foodFinding": { no: "Finner vin til «{title}» …", en: "Finding a wine for “{title}” …" },
  "home.wine.ourPick": { no: "Vårt valg", en: "Our pick" },
  "home.wine.changeDish": { no: "Velg en annen rett", en: "Choose another dish" },
  "home.wine.winePrompt": { no: "Beskriv vinen du har", en: "Describe the wine you have" },
  "home.wine.winePlaceholder": {
    no: "F.eks. «en fyldig Chardonnay fra Burgund»",
    en: "E.g. “a full-bodied Chardonnay from Burgundy”",
  },
  "home.wine.checkButton": { no: "Finn retter", en: "Find dishes" },
  "home.wine.checking": { no: "Vurderer …", en: "Assessing …" },
  "home.wine.wineResultsFor": { no: "Beste match for {wine}", en: "Best matches for {wine}" },
  "home.wine.noRecipes": {
    no: "Ingen publiserte oppskrifter å matche mot ennå.",
    en: "No published recipes to match against yet.",
  },
  "home.wine.error": { no: "Klarte ikke å fullføre akkurat nå. Prøv igjen.", en: "Couldn't finish just now. Try again." },
  "home.wine.disclaimer": {
    no: "Vurdert av AI ut fra beskrivelsen og oppskriftene i katalogen – ikke en absolutt fasit.",
    en: "Assessed by AI from the description and the recipes in the catalog – not an absolute answer.",
  },

  // --- Cook Mode-showcase ---
  "home.cookMode.eyebrow": { no: "Cook mode", en: "Cook mode" },
  "home.cookMode.title": { no: "Mindre scrolling. Mer matlaging.", en: "Less scrolling. More cooking." },
  "home.cookMode.subtitle": {
    no: "Ett steg av gangen, akkurat når du trenger det.",
    en: "One step at a time, exactly when you need it.",
  },
  "home.cookMode.cta": { no: "Utforsk Cook Mode", en: "Explore Cook Mode" },
  "home.cookMode.mockDish": { no: "Kremet trøffelpasta", en: "Creamy truffle pasta" },
  "home.cookMode.mockStepLabel": { no: "Steg 3 av 6", en: "Step 3 of 6" },
  "home.cookMode.mockStepText": {
    no: "Ha i fløten og la sausen småkoke i 3–4 minutter til den tykner.",
    en: "Add the cream and let the sauce simmer for 3–4 minutes until it thickens.",
  },
  "home.cookMode.mockMarkDone": { no: "Merk som gjort", en: "Mark as done" },
  "home.cookMode.note": {
    no: "Skjermen holdes våken automatisk, og du kan styre stegene med stemmen – ingen grunn til å taste inn koden med sausete fingre.",
    en: "The screen stays awake automatically, and you can move through the steps with your voice – no need to unlock your phone with saucy fingers.",
  },

  // --- Kategori-seksjon ---
  "home.categories.eyebrow": { no: "Utforsk", en: "Explore" },

  "recipesPage.title": { no: "Alle oppskrifter", en: "All recipes" },
  "recipesPage.description": {
    no: "Søk på navn, ingrediens, kategori eller tag – eller bruk filtrene til å snevre inn.",
    en: "Search by name, ingredient, category or tag – or use the filters to narrow it down.",
  },
  "recipesPage.metaDescription": {
    no: "Søk og filtrer i alle oppskriftene i samlingen.",
    en: "Search and filter through the whole recipe collection.",
  },
  "recipesPage.emptyTitle": { no: "Fant ingen oppskrifter", en: "No recipes found" },
  "recipesPage.emptyDescription": {
    no: "Prøv et annet søkeord eller nullstill filtrene.",
    en: "Try a different search term or reset the filters.",
  },

  "favoritesPage.title": { no: "Favoritter", en: "Favorites" },
  "favoritesPage.metaDescription": {
    no: "Dine lagrede favorittoppskrifter.",
    en: "Your saved favorite recipes.",
  },
  "favoritesPage.adminDescription": {
    no: "Oppskriftene du har markert som favoritt.",
    en: "The recipes you've marked as favorites.",
  },
  "favoritesPage.guestDescription": {
    no: "Favorittene dine lagres i denne nettleseren, så de er tilgjengelige neste gang du besøker siden herfra.",
    en: "Your favorites are saved in this browser, so they'll be here next time you visit from this device.",
  },
  "favoritesPage.adminEmptyTitle": { no: "Ingen favoritter ennå", en: "No favorites yet" },
  "favoritesPage.adminEmptyDescription": {
    no: "Trykk på hjertet på en oppskrift for å legge den til her.",
    en: "Tap the heart on a recipe to add it here.",
  },
  "favoritesPage.guestEmptyTitle": { no: "Ingen favoritter ennå", en: "No favorites yet" },
  "favoritesPage.guestEmptyDescription": {
    no: "Trykk på hjertet på en oppskrift for å lagre den her. Favorittene dine lagres i denne nettleseren.",
    en: "Tap the heart on a recipe to save it here. Your favorites are saved in this browser.",
  },

  "pantryPage.title": { no: "Hva kan jeg lage?", en: "What can I make?" },
  "pantryPage.metaDescription": {
    no: "Fortell oss hva du har i kjøleskapet eller skapet – vi finner oppskrifter du kan lage med det.",
    en: "Tell us what's in your fridge or pantry – we'll find recipes you can make with it.",
  },
  "pantryPage.intro": {
    no: "Skriv inn eller ta bilde av det du har liggende – enten det er rester fra i går eller bare det som er i kjøleskapet – så finner vi oppskrifter som passer.",
    en: "Type in or take a photo of what you have on hand – leftovers from yesterday or just what's in the fridge – and we'll find recipes that fit.",
  },
  "pantryPage.inputPlaceholder": { no: "F.eks. løk, fløte, kylling …", en: "E.g. onion, cream, chicken …" },
  "pantryPage.inputAria": { no: "Legg til ingrediens", en: "Add ingredient" },
  "pantryPage.addButton": { no: "Legg til", en: "Add" },
  "pantryPage.photoAria": { no: "Ta bilde av det du har", en: "Take a photo of what you have" },
  "pantryPage.analyzingPhoto": { no: "Ser gjennom bildet …", en: "Looking through the photo …" },
  "pantryPage.photoError": {
    no: "Klarte ikke å lese bildet. Prøv et annet, eller skriv inn ingrediensene selv.",
    en: "Couldn't read the photo. Try another one, or type the ingredients in yourself.",
  },
  "pantryPage.photoDetectedNone": {
    no: "Fant ingen tydelige matvarer på bildet – prøv et nærmere bilde, eller skriv inn selv.",
    en: "Couldn't clearly identify any food in the photo – try a closer photo, or type them in yourself.",
  },
  "pantryPage.removeIngredientAria": { no: "Fjern {name}", en: "Remove {name}" },
  "pantryPage.searchButton": { no: "Finn oppskrifter", en: "Find recipes" },
  "pantryPage.searching": { no: "Leter …", en: "Searching …" },
  "pantryPage.searchError": {
    no: "Klarte ikke å søke akkurat nå. Prøv igjen.",
    en: "Couldn't search right now. Please try again.",
  },
  "pantryPage.resultsHeading": { no: "Du kan lage", en: "You can make" },
  "pantryPage.noResults": {
    no: "Fant ingen oppskrifter med noen av disse ingrediensene ennå. Prøv å legge til flere.",
    en: "No recipes found with any of these ingredients yet. Try adding a few more.",
  },
  "pantryPage.coverage": { no: "{matched} av {total} ingredienser", en: "{matched} of {total} ingredients" },
  "pantryPage.missing": { no: "Mangler", en: "Missing" },
  "pantryPage.emptyStateTitle": { no: "Hva har du liggende?", en: "What do you have on hand?" },
  "pantryPage.emptyStateDescription": {
    no: "Legg til noen ingredienser over, så viser vi oppskrifter som passer.",
    en: "Add a few ingredients above, and we'll show recipes that fit.",
  },

  "shoppingPage.title": { no: "Handleliste", en: "Shopping list" },
  "shoppingPage.metaDescription": {
    no: "Din handleliste, satt sammen fra oppskriftene dine.",
    en: "Your shopping list, put together from your recipes.",
  },
  "shoppingPage.description": {
    no: "Lagres i denne nettleseren. Legg til flere ingredienser fra hvilken som helst oppskriftsside.",
    en: "Saved in this browser. Add more ingredients from any recipe page.",
  },
  "shoppingPage.emptyTitle": { no: "Handlelisten din er tom", en: "Your shopping list is empty" },
  "shoppingPage.emptyDescription": {
    no: "Legg ingredienser til handlelisten fra en oppskriftsside, så dukker de opp her.",
    en: "Add ingredients to the list from a recipe page, and they'll show up here.",
  },
  "shoppingPage.clearChecked": { no: "Fjern avhukede", en: "Remove checked" },
  "shoppingPage.clearAll": { no: "Tøm listen", en: "Clear list" },
  "shoppingPage.from": { no: "Fra", en: "From" },
  "shoppingPage.removeAria": { no: "Fjern {name} fra handlelisten", en: "Remove {name} from the shopping list" },

  "categoryPage.eyebrow": { no: "Kategori", en: "Category" },
  "categoryPage.metaDescription": {
    no: "Alle oppskrifter i kategorien {name}.",
    en: "All recipes in the {name} category.",
  },
  "categoryPage.notFoundTitle": { no: "Kategori ikke funnet", en: "Category not found" },
  "categoryPage.emptyTitle": { no: "Ingen oppskrifter ennå", en: "No recipes yet" },
  "categoryPage.emptyDescription": {
    no: "Det er ikke publisert noen oppskrifter i {name} ennå.",
    en: "No recipes have been published in {name} yet.",
  },

  "filter.heading": { no: "Filtrer", en: "Filter" },
  "filter.category": { no: "Kategori", en: "Category" },
  "filter.all": { no: "Alle", en: "All" },
  "filter.totalTime": { no: "Total tid", en: "Total time" },
  "filter.timeUnder30": { no: "Under 30 min", en: "Under 30 min" },
  "filter.timeUnder45": { no: "Under 45 min", en: "Under 45 min" },
  "filter.timeUnder60": { no: "Under 60 min", en: "Under 60 min" },
  "filter.difficulty": { no: "Vanskelighetsgrad", en: "Difficulty" },
  "filter.ingredient": { no: "Ingrediens", en: "Ingredient" },
  "filter.ingredientPlaceholder": { no: "F.eks. kylling", en: "E.g. chicken" },
  "filter.ingredientAria": { no: "Filtrer på ingrediens", en: "Filter by ingredient" },
  "filter.favoritesOnly": { no: "Kun favoritter", en: "Favorites only" },

  "search.srLabel": { no: "Søk i oppskrifter", en: "Search recipes" },
  "search.placeholder": {
    no: "Søk etter oppskrift, ingrediens eller kategori …",
    en: "Search for a recipe, ingredient, or category …",
  },
  "search.button": { no: "Søk", en: "Search" },

  "recipeCard.imageComing": { no: "Bilde kommer", en: "Image coming" },
  "recipeCard.favoriteSr": { no: "Favoritt", en: "Favorite" },

  "favorite.remove": { no: "Fjern fra favoritter", en: "Remove from favorites" },
  "favorite.add": { no: "Legg til i favoritter", en: "Add to favorites" },
  "favorite.saved": { no: "Lagret", en: "Saved" },
  "favorite.label": { no: "Favoritt", en: "Favorite" },

  "rating.groupAria": { no: "Gi stjernevurdering", en: "Rate this recipe" },
  "rating.starAria": { no: "Gi {value} av 5 stjerner", en: "Rate {value} out of 5 stars" },
  "rating.error": { no: "Kunne ikke lagre vurderingen.", en: "Couldn't save the rating." },

  "cookMode.ingredientsButton": { no: "Ingredienser", en: "Ingredients" },
  "cookMode.screenLockWarning": {
    no: "Skjermlås kan ikke holdes våken automatisk i denne nettleseren.",
    en: "The screen can't be kept awake automatically in this browser.",
  },
  "cookMode.stepOf": { no: "Steg {current} av {total}", en: "Step {current} of {total}" },
  "cookMode.markDone": { no: "Merk dette steget som ferdig", en: "Mark this step as done" },
  "cookMode.previous": { no: "Forrige", en: "Previous" },
  "cookMode.next": { no: "Neste", en: "Next" },
  "cookMode.done": { no: "Ferdig!", en: "Done!" },
  "cookMode.ingredientsTitle": { no: "Ingredienser", en: "Ingredients" },
  "cookMode.closeIngredientsAria": { no: "Lukk ingrediensliste", en: "Close ingredient list" },
  "cookMode.closeAria": { no: "Lukk Cook Mode", en: "Close Cook Mode" },
  "cookMode.dialogAria": { no: "Cook Mode: {title}", en: "Cook Mode: {title}" },
  "cookMode.voiceStartAria": { no: "Skru på talestyring", en: "Turn on voice control" },
  "cookMode.voiceStopAria": { no: "Skru av talestyring", en: "Turn off voice control" },
  "cookMode.voiceListening": {
    no: "Lytter … si «neste», «tilbake», «gjenta» eller «ferdig»",
    en: "Listening … say “next”, “back”, “repeat” or “done”",
  },
  "cookMode.voicePermissionDenied": {
    no: "Fikk ikke tilgang til mikrofonen. Sjekk mikrofon-innstillingene for nettleseren.",
    en: "Microphone access was denied. Check your browser's microphone settings.",
  },
  "cookMode.voiceInsecureContext": {
    no: "Talestyring krever en sikker (https) tilkobling, og virker derfor ikke når man tester via en vanlig http-adresse. Fungerer av seg selv når siden er publisert.",
    en: "Voice control requires a secure (https) connection, so it won't work when testing over a plain http address. It will work on its own once the site is live.",
  },
  "cookMode.wakeLockInsecureContext": {
    no: "Automatisk skjermlås krever en sikker (https) tilkobling, og virker derfor ikke når man tester via en vanlig http-adresse. Fungerer av seg selv når siden er publisert.",
    en: "Keeping the screen awake automatically requires a secure (https) connection, so it won't work when testing over a plain http address. It will work on its own once the site is live.",
  },

  "cookMode.timersButtonAria": { no: "Tidtakere", en: "Timers" },
  "cookMode.timersTitle": { no: "Tidtakere", en: "Timers" },
  "cookMode.closeTimersAria": { no: "Lukk tidtakere", en: "Close timers" },
  "cookMode.noTimers": {
    no: "Ingen aktive tidtakere ennå. Sett en fra et steg som har en tidsangivelse.",
    en: "No active timers yet. Start one from a step that mentions a duration.",
  },
  "cookMode.startTimerForStep": { no: "Sett timer: {minutes} min", en: "Start timer: {minutes} min" },
  "cookMode.timerDone": { no: "Ferdig!", en: "Done!" },
  "cookMode.pauseTimerAria": { no: "Pause tidtaker", en: "Pause timer" },
  "cookMode.resumeTimerAria": { no: "Gjenoppta tidtaker", en: "Resume timer" },
  "cookMode.removeTimerAria": { no: "Fjern tidtaker", en: "Remove timer" },
  "cookMode.timerStepLabel": { no: "Steg {number}", en: "Step {number}" },

  "recipeDetail.timelineHeading": { no: "Når bør jeg starte?", en: "When should I start?" },
  "recipeDetail.timelineIntro": {
    no: "Skriv inn når du vil spise, så regner vi ut et forslag til når du bør begynne.",
    en: "Enter when you'd like to eat, and we'll work out a suggested start time.",
  },
  "recipeDetail.timelineReadyLabel": { no: "Jeg vil spise klokka", en: "I'd like to eat at" },
  "recipeDetail.timelineButton": { no: "Vis tidsplan", en: "Show timeline" },
  "recipeDetail.timelineInvalidTime": {
    no: "Skriv inn et gyldig klokkeslett (t.d. 19:00).",
    en: "Enter a valid time (e.g. 7:00 PM).",
  },
  "recipeDetail.timelinePrepLabel": { no: "Start forberedelser", en: "Start prep" },
  "recipeDetail.timelineReadyAtLabel": { no: "Klart til servering", en: "Ready to serve" },
  "recipeDetail.timelineEstimatedNote": {
    no: "Anslått varighet – juster gjerne selv underveis.",
    en: "Estimated duration – feel free to adjust as you go.",
  },
  "recipeDetail.timelineParallelButton": {
    no: "Se hva som kan gjøres samtidig",
    en: "See what can be done in parallel",
  },
  "recipeDetail.timelineParallelLoading": { no: "Ser gjennom stegene …", en: "Looking through the steps …" },
  "recipeDetail.timelineParallelError": {
    no: "Klarte ikke å finne parallell-forslag akkurat nå.",
    en: "Couldn't find parallel-task suggestions right now.",
  },
  "recipeDetail.timelineParallelNone": {
    no: "Fant ingen åpenbare steg å gjøre samtidig i denne oppskriften.",
    en: "No obvious steps to do in parallel in this recipe.",
  },
  "recipeDetail.timelineParallelHeading": { no: "Kan gjøres samtidig", en: "Can be done in parallel" },
  "recipeDetail.timelineParallelBadgeAria": {
    no: "Kan gjøres samtidig: {note}",
    en: "Can be done in parallel: {note}",
  },

  "wine.recTitle": { no: "Vinanbefaling", en: "Wine pairing" },
  "wine.recDesc": {
    no: "Få et forslag til hva slags vin som passer til denne retten.",
    en: "Get a suggestion for what kind of wine goes well with this dish.",
  },
  "wine.getRec": { no: "Få vinanbefaling", en: "Get a wine suggestion" },
  "wine.fetching": { no: "Henter forslag …", en: "Fetching a suggestion …" },
  "wine.getNewRec": { no: "Få et nytt forslag", en: "Get another suggestion" },
  "wine.vinmonopoletPrompt": { no: "Vil du ha et konkret forslag fra Vinmonopolet?", en: "Want a specific suggestion from Vinmonopolet?" },
  "wine.vinmonopoletLoading": { no: "Leter i Vinmonopolets sortiment …", en: "Searching Vinmonopolet's assortment …" },
  "wine.vinmonopoletError": { no: "Klarte ikke å finne et forslag. Prøv igjen.", en: "Couldn't find a suggestion. Please try again." },
  "wine.viewProduct": { no: "Til Vinmonopolet", en: "To Vinmonopolet" },
  "wine.priceLabel": { no: "Pris", en: "Price" },
  "wine.vinmonopoletDisclaimer": {
    no: "Produktnavn, bilde og pris er hentet direkte fra Vinmonopolets egen produktside akkurat nå — ikke et anslag. Katalogen skiller likevel ikke mellom aktive og utgåtte produkter, så sjekk gjerne at varen fortsatt er på lager på produktsiden. Utgått, eller ikke helt det du så for deg? Prøv «Prøv et nytt forslag» under.",
    en: "The product name, image, and price are fetched directly from Vinmonopolet's own product page right now — not an estimate. The catalog still doesn't distinguish active from discontinued products, so it's worth checking stock on the product page. Discontinued, or not quite what you had in mind? Use \"Try a new suggestion\" below.",
  },
  "wine.vinmonopoletNewSuggestion": { no: "Prøv et nytt forslag", en: "Try a new suggestion" },
  "wine.fetchingNew": { no: "Henter …", en: "Fetching …" },
  "wine.recError": { no: "Kunne ikke hente vinanbefaling. Prøv igjen.", en: "Couldn't fetch a wine suggestion. Please try again." },
  "wine.matchTitle": { no: "Passer vinen din med denne retten?", en: "Does your wine match this dish?" },
  "wine.matchDesc": {
    no: "Skriv inn vinen du har, så vurderer vi hvor godt den passer.",
    en: "Enter the wine you have, and we'll judge how well it pairs.",
  },
  "wine.matchPlaceholder": { no: "F.eks. «Chianti» eller «Rioja»", en: "E.g. \"Chianti\" or \"Rioja\"" },
  "wine.checkMatch": { no: "Sjekk match", en: "Check match" },
  "wine.checking": { no: "Sjekker …", en: "Checking …" },
  "wine.matchError": { no: "Noe gikk galt. Prøv igjen.", en: "Something went wrong. Please try again." },
  "wine.photoAria": {
    no: "Ta bilde av vinen eller velg fra bildebibliotek",
    en: "Take a photo of the wine or choose from your photo library",
  },
  "wine.analyzingPhoto": { no: "Analyserer bildet …", en: "Analyzing the photo …" },
  "wine.photoError": {
    no: "Klarte ikke å tolke bildet. Prøv et annet bilde.",
    en: "Couldn't read the photo. Try a different image.",
  },
  "wine.or": { no: "eller", en: "or" },
  "wine.retakePhoto": { no: "Ta nytt bilde", en: "Take another photo" },

  "recipeDetail.draft": { no: "Utkast", en: "Draft" },
  "recipeDetail.allRecipesLink": { no: "Alle oppskrifter", en: "All recipes" },
  "recipeDetail.imagePending": { no: "Bilde kommer", en: "Image coming" },
  "recipeDetail.ingredientsHeading": { no: "Ingredienser", en: "Ingredients" },
  "servings.label": { no: "Porsjoner", en: "Servings" },
  "servings.chooseAria": { no: "Velg antall porsjoner", en: "Choose number of servings" },
  "recipeDetail.stepsHeading": { no: "Fremgangsmåte", en: "Method" },
  "recipeDetail.stepStartTime": { no: "Start kl. {time}", en: "Start at {time}" },
  "recipeDetail.vegPrompt": { no: "Ønsker du en vegetarversjon?", en: "Want a vegetarian version?" },
  "recipeDetail.vegLoading": { no: "Lager vegetarforslag …", en: "Preparing a vegetarian version …" },
  "recipeDetail.vegError": { no: "Kunne ikke lage vegetarforslag. Prøv igjen.", en: "Couldn't create a vegetarian version. Please try again." },
  "recipeDetail.showVeg": { no: "Vis vegetarversjon", en: "Show vegetarian version" },
  "recipeDetail.newSuggestion": { no: "Lag et nytt forslag", en: "Make a new suggestion" },
  "recipeDetail.newSuggestionLoading": { no: "Lager nytt forslag …", en: "Preparing a new suggestion …" },
  "recipeDetail.engTranslating": { no: "Oversetter til engelsk …", en: "Translating to English …" },
  "recipeDetail.engError": { no: "Kunne ikke oversette til engelsk. Prøv igjen.", en: "Couldn't translate to English. Please try again." },
  "recipeDetail.reTranslate": { no: "Oversett på nytt", en: "Translate again" },
  "recipeDetail.reTranslating": { no: "Oversetter på nytt …", en: "Translating again …" },
  "recipeDetail.substitutePrompt": { no: "Bytt ut", en: "Substitute" },
  "recipeDetail.substituteLoading": { no: "Finner erstatning …", en: "Finding a substitute …" },
  "recipeDetail.substituteUndo": { no: "Angre bytte", en: "Undo swap" },
  "recipeDetail.substituteError": {
    no: "Klarte ikke å finne en erstatning. Prøv igjen.",
    en: "Couldn't find a substitute. Please try again.",
  },
  "recipeDetail.substituteRetry": { no: "Prøv igjen", en: "Try again" },

  // Smaksprofil (Fase 4 – Smak) – se components/recipe/TasteProfilePanel.tsx
  // og lib/kitchen-intelligence/taste.ts.
  "tasteProfile.heading": { no: "Smaksprofil", en: "Flavor profile" },
  "tasteProfile.loading": { no: "Analyserer smaken …", en: "Analyzing the flavor …" },
  "tasteProfile.error": {
    no: "Klarte ikke å hente smaksprofilen. Prøv igjen.",
    en: "Couldn't fetch the flavor profile. Please try again.",
  },
  "tasteProfile.retry": { no: "Prøv igjen", en: "Try again" },
  "tasteProfile.sweet": { no: "Søtt", en: "Sweet" },
  "tasteProfile.salty": { no: "Salt", en: "Salty" },
  "tasteProfile.sour": { no: "Syrlig", en: "Sour" },
  "tasteProfile.bitter": { no: "Bittert", en: "Bitter" },
  "tasteProfile.umami": { no: "Umami", en: "Umami" },
  "tasteProfile.spicy": { no: "Sterkt", en: "Spicy" },

  // Næringsinnhold (kalori-/makro-oversikt) – se
  // components/recipe/NutritionPanel.tsx og lib/kitchen-intelligence/nutrition.ts.
  // Bak en "vis"-knapp på oppskriftssiden, i motsetning til smaksprofilen
  // over som alltid vises – ønsket eksplisitt av Henrik 25.08.2026.
  "nutrition.heading": { no: "Næringsinnhold", en: "Nutrition information" },
  "nutrition.show": { no: "Vis næringsinnhold", en: "Show nutrition information" },
  "nutrition.hide": { no: "Skjul næringsinnhold", en: "Hide nutrition information" },
  "nutrition.perServing": { no: "Per porsjon", en: "Per serving" },
  "nutrition.disclaimer": {
    no: "Estimert ut fra ingrediensene – kan avvike noe fra faktisk innhold.",
    en: "Estimated from the ingredients – actual values may vary slightly.",
  },
  "nutrition.calories": { no: "Kalorier", en: "Calories" },
  "nutrition.fat": { no: "Fett", en: "Fat" },
  "nutrition.saturatedFat": { no: "– hvorav mettet fett", en: "– of which saturates" },
  "nutrition.carbs": { no: "Karbohydrater", en: "Carbs" },
  "nutrition.sugar": { no: "– hvorav sukkerarter", en: "– of which sugars" },
  "nutrition.fiber": { no: "Fiber", en: "Fiber" },
  "nutrition.protein": { no: "Protein", en: "Protein" },
  "nutrition.salt": { no: "Salt", en: "Salt" },

  // "Server det sammen med …" (Fase 4 – Smak) – se
  // components/recipe/MenuSuggestions.tsx.
  "menuSuggestions.heading": { no: "Server det sammen med …", en: "Serve it together with …" },
  "menuSuggestions.intro": {
    no: "Få forslag til forrett, tilbehør eller dessert som passer til denne retten.",
    en: "Get suggestions for a starter, side, or dessert that pairs with this dish.",
  },
  "menuSuggestions.button": { no: "Finn menyforslag", en: "Find menu suggestions" },
  "menuSuggestions.loading": { no: "Setter sammen forslag …", en: "Putting suggestions together …" },
  "menuSuggestions.error": {
    no: "Klarte ikke å finne menyforslag akkurat nå. Prøv igjen.",
    en: "Couldn't find menu suggestions right now. Please try again.",
  },
  "menuSuggestions.none": {
    no: "Fant ingen gode forslag akkurat nå.",
    en: "Couldn't find any good suggestions right now.",
  },

  // Menybyggeren (Fase 5 – Experience) – se components/recipe/MealBuilder.tsx
  // og generateMealPlan i lib/actions/kitchen-intelligence.ts. Rolle-
  // etikettene (mealBuilder.role.*) brukes BÅDE i UI-et OG i selve
  // AI-prompten (samme kilde, ett sted å endre teksten).
  "mealBuilder.role.starter": { no: "Forrett", en: "Starter" },
  "mealBuilder.role.main": { no: "Hovedrett", en: "Main course" },
  "mealBuilder.role.side": { no: "Tilbehør", en: "Side dish" },
  "mealBuilder.role.dessert": { no: "Dessert", en: "Dessert" },
  "mealBuilder.heading": { no: "Bygg en meny rundt denne retten", en: "Build a menu around this dish" },
  "mealBuilder.intro": {
    no: "La AI-en sette sammen en hel meny rundt denne retten – hentet fra oppskriftsboken der det passer, foreslått nytt der det ikke gjør det.",
    en: "Let AI put together a full menu around this dish – drawn from your cookbook where it fits, suggested fresh where it doesn't.",
  },
  "mealBuilder.button": { no: "Bygg en meny", en: "Build a menu" },
  "mealBuilder.loading": { no: "Setter sammen menyen …", en: "Putting the menu together …" },
  "mealBuilder.error": {
    no: "Klarte ikke å bygge menyen akkurat nå. Prøv igjen.",
    en: "Couldn't build the menu right now. Please try again.",
  },
  "mealBuilder.anchorBadge": { no: "Retten du startet med", en: "The dish you started with" },
  "mealBuilder.existingBadge": { no: "Finnes i oppskriftsboken", en: "Already in your cookbook" },
  "mealBuilder.suggestedBadge": { no: "Nytt forslag", en: "New suggestion" },
  "mealBuilder.regenerate": { no: "Foreslå en annen", en: "Suggest another" },
  "mealBuilder.regenerating": { no: "Finner et alternativ …", en: "Finding an alternative …" },
  "mealBuilder.remove": { no: "Fjern fra menyen", en: "Remove from menu" },
  "mealBuilder.removed": {
    no: "Fjernet fra menyen.",
    en: "Removed from the menu.",
  },
  "mealBuilder.servingsLabel": { no: "Porsjoner", en: "Servings" },
  "mealBuilder.titleLabel": { no: "Menynavn", en: "Menu name" },
  "mealBuilder.save": { no: "Lagre menyen", en: "Save menu" },
  "mealBuilder.saving": { no: "Lagrer …", en: "Saving …" },
  "mealBuilder.saveError": {
    no: "Klarte ikke å lagre menyen på denne enheten.",
    en: "Couldn't save the menu on this device.",
  },
  "mealBuilder.viewSaved": { no: "Se den lagrede menyen", en: "View the saved menu" },

  // Den lagrede menysiden – app/meny/[id]/page.tsx.
  "mealPage.metaTitle": { no: "Din meny", en: "Your menu" },
  "mealPage.notFoundHeading": { no: "Fant ikke menyen", en: "Menu not found" },
  "mealPage.notFoundBody": {
    no: "Denne menyen finnes ikke på denne enheten – menyer lagres kun lokalt i nettleseren de ble laget i.",
    en: "This menu doesn't exist on this device – menus are only stored locally in the browser they were created in.",
  },
  "mealPage.emptyState": { no: "Denne menyen er tom.", en: "This menu is empty." },
  "mealPage.notesLabel": { no: "Notater", en: "Notes" },
  "mealPage.notesPlaceholder": {
    no: "Egne notater om menyen – f.eks. hvem som kommer, eller ting å huske …",
    en: "Your own notes about the menu – e.g. who's coming, or things to remember …",
  },
  "mealPage.suggestedDescriptionLabel": { no: "Om forslaget", en: "About the suggestion" },

  "recipeDetail.unitsAria": { no: "Målenhet", en: "Unit system" },
  "recipeDetail.unitsMetric": { no: "Metrisk", en: "Metric" },
  "recipeDetail.unitsUs": { no: "US", en: "US" },
  "recipeDetail.convertingUnits": { no: "Konverterer mål i teksten …", en: "Converting measurements in the text …" },
  "recipeDetail.unitsError": { no: "Kunne ikke konvertere målene i teksten. Prøv igjen.", en: "Couldn't convert the measurements in the text. Please try again." },
  "recipeDetail.unitsRetry": { no: "Prøv igjen", en: "Try again" },
  "recipeDetail.notes": { no: "Notater", en: "Notes" },
  "recipeDetail.tips": { no: "Tips", en: "Tips" },
  "recipeDetail.startCooking": { no: "Start matlaging", en: "Start cooking" },
  "recipeDetail.addedToList": { no: "Lagt til!", en: "Added!" },
  "recipeDetail.addToList": { no: "Legg til i handleliste", en: "Add to shopping list" },
  "recipeDetail.source": { no: "Kilde/opprinnelse", en: "Source" },

  "notFound.title": { no: "Siden ble ikke funnet", en: "Page not found" },
  "notFound.description": {
    no: "Vi fant dessverre ikke det du lette etter. Kanskje oppskriften er slettet, eller lenken er feil.",
    en: "We couldn't find what you were looking for. The recipe may have been deleted, or the link is wrong.",
  },
  "notFound.browse": { no: "Bla gjennom oppskrifter", en: "Browse recipes" },
  "recipeNotFound.title": { no: "Fant ikke oppskriften", en: "Recipe not found" },
  "recipeNotFound.description": {
    no: "Den kan være slettet, avpublisert, eller så er lenken feil.",
    en: "It may have been deleted, unpublished, or the link is wrong.",
  },
} as const;

export type DictKey = keyof typeof DICT;

export function t(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let str: string = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/** "1 oppskrift" / "3 oppskrifter" / "1 recipe" / "3 recipes". */
export function recipeCountLabel(lang: Lang, count: number): string {
  if (lang === "en") return `${count} ${count === 1 ? "recipe" : "recipes"}`;
  return `${count} ${count === 1 ? "oppskrift" : "oppskrifter"}`;
}
