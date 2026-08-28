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
  // "+"-snarveien i Header.tsx, kun synlig server-side for innlogget admin.
  "nav.newRecipe": { no: "Ny oppskrift", en: "New recipe" },
  "nav.mainNav": { no: "Hovednavigasjon", en: "Main navigation" },
  "nav.mainNavMobile": { no: "Hovednavigasjon, mobil", en: "Main navigation, mobile" },
  "nav.home": { no: "Hjem", en: "Home" },
  // Endret fra "Ingrediens-søk" 26.08.2026 (ønsket av Henrik – "vagt og
  // rart") til å matche siden sin EGEN tittel (pantryPage.title, se
  // app/hva-kan-jeg-lage/page.tsx – både <h1> og fane-tittel er allerede
  // "Hva kan jeg lage?", og selve URL-en er allerede /hva-kan-jeg-lage).
  // Kun nav-lenken (her og i BottomNav.tsx, som deler denne nøkkelen) hadde
  // stått igjen med det gamle, mer kliniske navnet.
  "nav.pantry": { no: "Hva kan jeg lage?", en: "What can I make?" },
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
    en: "The recipes you actually cook, again and again",
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
  // Omdøpt fra "Ukens utvalg" 26.08.2026 (Henrik: trengte ikke lenger et
  // separat "Husets favoritter"-avsnitt lenger ned på siden – denne
  // redaksjonelle utvalgs-seksjonen (styrt fra /admin/utvalg) overtar nå
  // navnet i stedet).
  "home.editorial.eyebrow": { no: "Husets favoritter", en: "House favorites" },
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
  // Se-alle/se-færre-pilen i CategoryShowcase (lagt til 26.08.2026 – kun de
  // første CATEGORIES_VISIBLE_COUNT kategoriene vises til vanlig, resten
  // skjules bak en liten, sprettende pil med denne teksten under – samme
  // visuelle idé som "bla nedover"-pilen i heroen øverst på siden).
  "home.categories.showAll": { no: "Se alle kategorier", en: "See all categories" },
  "home.categories.showLess": { no: "Se færre", en: "See less" },

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
  // (27.08.2026) – nullstiller ingredienser/søk/AI-forslag tilbake til tom
  // tilstand, se handleResetAll i PantryMatchView.tsx.
  "pantryPage.resetAllButton": { no: "Tilbakestill alt", en: "Reset everything" },
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
  "pantryPage.missingAddButton": { no: "Legg i handleliste", en: "Add to shopping list" },
  "pantryPage.missingAdding": { no: "Legger til …", en: "Adding …" },
  "pantryPage.missingAdded": { no: "Lagt til i handlelista →", en: "Added to shopping list →" },
  "pantryPage.missingAddError": {
    no: "Fikk ikke lagt til. Prøv igjen.",
    en: "Couldn't add. Try again.",
  },
  "pantryPage.emptyStateTitle": { no: "Hva har du liggende?", en: "What do you have on hand?" },
  "pantryPage.emptyStateDescription": {
    no: "Legg til noen ingredienser over, så viser vi oppskrifter som passer.",
    en: "Add a few ingredients above, and we'll show recipes that fit.",
  },

  // Admin-only "Foreslå nye retter" (27.08.2026) – dikter opp NYE retteideer
  // fra ingrediensene over, i motsetning til søket over som kun finner
  // eksisterende oppskrifter. Se PantryMatchView.tsx.
  "pantryPage.adminSuggestToggle": { no: "Foreslå nye retter", en: "Suggest new dishes" },
  "pantryPage.adminSuggestBadgeOpen": { no: "Admin", en: "Admin" },
  "pantryPage.adminSuggestBadgeClose": { no: "Skjul", en: "Hide" },
  "pantryPage.adminSuggestIntro": {
    no: "Bruker ingrediensene over til å foreslå helt nye retteideer som ikke finnes på nettstedet fra før.",
    en: "Uses the ingredients above to suggest brand new dish ideas that aren't already on the site.",
  },
  "pantryPage.adminSuggestTypePlaceholder": {
    no: "Type mat (valgfritt), f.eks. «noe asiatisk»",
    en: "Type of food (optional), e.g. \"something Asian\"",
  },
  "pantryPage.adminSuggestTypeAria": { no: "Ønsket type mat", en: "Desired type of food" },
  "pantryPage.adminSuggestButton": { no: "Foreslå nye retter", en: "Suggest new dishes" },
  "pantryPage.adminSuggestLoading": { no: "Tenker …", en: "Thinking …" },
  "pantryPage.adminSuggestNeedIngredients": {
    no: "Legg til minst én ingrediens over først.",
    en: "Add at least one ingredient above first.",
  },
  "pantryPage.adminSuggestError": {
    no: "Kunne ikke generere retteforslag. Prøv igjen.",
    en: "Couldn't generate dish suggestions. Try again.",
  },
  "pantryPage.adminSuggestUses": { no: "Bruker", en: "Uses" },
  "pantryPage.adminSuggestCreateLink": { no: "Opprett som oppskrift →", en: "Create as recipe →" },

  // "Finn oppskrifter andre steder" (27.08.2026) – søker EKTE eksterne
  // matsider (Matprat m.fl.), til forskjell fra "Foreslå nye retter" over
  // som dikter opp helt nye ideer. Se PantryMatchView.tsx.
  "pantryPage.adminExternalButton": { no: "Finn oppskrifter andre steder", en: "Find recipes elsewhere" },
  "pantryPage.adminExternalLoading": { no: "Søker …", en: "Searching …" },
  "pantryPage.adminExternalError": {
    no: "Kunne ikke søke etter oppskrifter. Prøv igjen.",
    en: "Couldn't search for recipes. Try again.",
  },
  "pantryPage.adminExternalSourceNote": {
    no: "Søker på Matprat, Godt.no, TINE Kjøkken og andre kjente norske matsider.",
    en: "Searches Matprat, Godt.no, TINE Kjøkken and other well-known Norwegian food sites.",
  },
  // (27.08.2026) – forhåndsutfyller "Importer fra lenke" på ny-oppskrift-siden
  // med treffets URL og starter importen automatisk, se
  // app/admin/(dashboard)/oppskrifter/ny/page.tsx og RecipeForm.tsx.
  "pantryPage.adminExternalCreateLink": { no: "Opprett som egen oppskrift →", en: "Create as your own recipe →" },

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
  "shoppingPage.pantryStapleHint": {
    no: "Basisvare – antatt at du har den fra før",
    en: "Pantry staple – assumed you already have it",
  },
  "shoppingPage.buyingTipLabel": { no: "Tips", en: "Tip" },
  "shoppingPage.removeAria": { no: "Fjern {name} fra handlelisten", en: "Remove {name} from the shopping list" },
  // Bruker telefonens/nettleserens EGEN delemeny (Web Share API) – Notater
  // (iPhone) er ett av valgene som dukker opp der, sammen med f.eks. Keep,
  // meldinger e.l. på Android. Ingen egen "lagre i Notater"-integrasjon
  // finnes (eller kan finnes fra en nettside) – se ShoppingListView.tsx.
  "shoppingPage.shareButton": { no: "Del handleliste", en: "Share shopping list" },
  "shoppingPage.shareError": {
    no: "Fikk ikke delt listen. Prøv igjen, eller bruk «Skriv ut / lagre som PDF» i stedet.",
    en: "Couldn't share the list. Try again, or use \"Print / save as PDF\" instead.",
  },
  "shoppingPage.shareInsecureContext": {
    no: "Del handleliste krever en sikker (https) tilkobling, og virker derfor ikke når man tester via en vanlig http-adresse. Fungerer av seg selv når siden er publisert.",
    en: "Sharing the list requires a secure (https) connection, so it won't work when testing over a plain http address. It will work on its own once the site is live.",
  },
  "shoppingPage.printAlreadyBought": { no: "Allerede handlet", en: "Already bought" },

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
  // Umiddelbar tilbakemelding når "Sett timer"-knappen trykkes (27.08.2026 –
  // bruker-tilbakemelding: uten dette var det ingen synlig endring, så man
  // endte med å trykke flere ganger og sette flere timere på det samme
  // steget). timerStartedButton = selve knappens tekst i det korte
  // vinduet den er deaktivert rett etter trykk; timerStartedToast = den
  // flytende bekreftelsen øverst på skjermen, samme mønster som
  // implementNotice i RecipeForm.tsx.
  "cookMode.timerStartedButton": { no: "Timer startet", en: "Timer started" },
  "cookMode.timerStartedToast": { no: "Timer startet: {label} · {minutes} min", en: "Timer started: {label} · {minutes} min" },
  "cookMode.timerDone": { no: "Ferdig!", en: "Done!" },
  "cookMode.pauseTimerAria": { no: "Pause tidtaker", en: "Pause timer" },
  "cookMode.resumeTimerAria": { no: "Gjenoppta tidtaker", en: "Resume timer" },
  "cookMode.removeTimerAria": { no: "Fjern tidtaker", en: "Remove timer" },
  "cookMode.timerStepLabel": { no: "Steg {number}", en: "Step {number}" },

  // "Se alle steg" (26.08.2026) – se CookMode.tsx sin kommentar ved
  // showAllSteps-tilstanden.
  "cookMode.allStepsButtonAria": { no: "Se alle steg", en: "See all steps" },
  "cookMode.allStepsTitle": { no: "Alle steg", en: "All steps" },
  "cookMode.closeAllStepsAria": { no: "Lukk stegoversikten", en: "Close the step overview" },

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

  "wine.vinmonopoletPrompt": { no: "Vil du ha et konkret forslag fra Vinmonopolet?", en: "Want a specific suggestion from Vinmonopolet?" },
  "wine.vinmonopoletLoading": { no: "Leter i Vinmonopolets sortiment …", en: "Searching Vinmonopolet's assortment …" },
  "wine.vinmonopoletError": { no: "Klarte ikke å finne et forslag. Prøv igjen.", en: "Couldn't find a suggestion. Please try again." },
  "wine.viewProduct": { no: "Til Vinmonopolet", en: "To Vinmonopolet" },
  "wine.priceLabel": { no: "Pris", en: "Price" },
  "wine.vinmonopoletDisclaimer": {
    no: "Produktnavn, bilde og pris er hentet direkte fra Vinmonopolets egen produktside akkurat nå, ikke et anslag. Katalogen skiller likevel ikke mellom aktive og utgåtte produkter, så sjekk gjerne at varen fortsatt er på lager på produktsiden. Utgått, eller ikke helt det du så for deg? Prøv «Prøv et nytt forslag» under.",
    en: "The product name, image, and price are fetched directly from Vinmonopolet's own product page right now, not an estimate. The catalog still doesn't distinguish active from discontinued products, so it's worth checking stock on the product page. Discontinued, or not quite what you had in mind? Use \"Try a new suggestion\" below.",
  },
  "wine.vinmonopoletNewSuggestion": { no: "Prøv et nytt forslag", en: "Try a new suggestion" },
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

  // "DRIKKE TIL" (28.08.2026) – erstatter den tidligere frittstående
  // vinanbefalingen (wine.recTitle m.fl., nå fjernet) på oppskriftssiden,
  // se DrinkPairingSection.tsx og getDrinkPairing i
  // lib/actions/kitchen-intelligence.ts. wine.vinmonopolet*/wine.match*-
  // nøklene over BRUKES FORTSATT herfra (vinprodukt-oppslag og
  // "passer denne?"-sjekkeren) – kun selve seksjonsrammen er ny.
  "drinkPairing.heading": { no: "Drikke til", en: "Drink pairing" },
  "drinkPairing.intro": {
    no: "Et forslag til hva du kan drikke til, tilpasset rettens smak.",
    en: "A suggestion for what to drink with it, matched to the dish's flavor.",
  },
  "drinkPairing.button": { no: "Få drikkeforslag", en: "Get drink suggestions" },
  "drinkPairing.loading": { no: "Finner gode drikkematcher …", en: "Finding good pairings …" },
  "drinkPairing.error": {
    no: "Kunne ikke hente drikkeforslag. Prøv igjen.",
    en: "Couldn't fetch drink suggestions. Please try again.",
  },
  "drinkPairing.wineLabel": { no: "Vin", en: "Wine" },
  "drinkPairing.beerLabel": { no: "Øl", en: "Beer" },
  "drinkPairing.nonAlcoholicLabel": { no: "Uten alkohol", en: "Non-alcoholic" },
  "drinkPairing.findWineButton": {
    no: "Finn en konkret vin på Vinmonopolet",
    en: "Find a specific wine at Vinmonopolet",
  },
  "drinkPairing.matchTitle": { no: "Passer denne?", en: "Does this match?" },
  "drinkPairing.matchDesc": {
    no: "Skriv inn (eller ta bilde av) en vin du har, så vurderer vi hvor godt den passer.",
    en: "Enter (or photograph) a wine you have, and we'll judge how well it pairs.",
  },

  "recipeQuestion.title": { no: "Lurer du på noe?", en: "Wondering about something?" },
  "recipeQuestion.desc": {
    no: "Still et spørsmål om akkurat denne oppskriften, så gjør vi vårt beste for å svare.",
    en: "Ask a question about this exact recipe, and we'll do our best to answer.",
  },
  "recipeQuestion.placeholder": {
    no: "F.eks. «Kan jeg fryse resten av dette?»",
    en: "E.g. \"Can I freeze the leftovers?\"",
  },
  "recipeQuestion.ask": { no: "Spør", en: "Ask" },
  "recipeQuestion.asking": { no: "Tenker …", en: "Thinking …" },
  "recipeQuestion.askAnother": { no: "Still et nytt spørsmål", en: "Ask another question" },
  "recipeQuestion.error": { no: "Klarte ikke å svare akkurat nå. Prøv igjen.", en: "Couldn't answer right now. Please try again." },

  "recipeDetail.draft": { no: "Utkast", en: "Draft" },
  "recipeDetail.editButton": { no: "Rediger", en: "Edit" },
  "recipeDetail.allRecipesLink": { no: "Alle oppskrifter", en: "All recipes" },
  "recipeDetail.imagePending": { no: "Bilde kommer", en: "Image coming" },
  "recipeDetail.ingredientsHeading": { no: "Ingredienser", en: "Ingredients" },
  "servings.label": { no: "Porsjoner", en: "Servings" },
  "servings.chooseAria": { no: "Velg antall porsjoner", en: "Choose number of servings" },
  "recipeDetail.stepsHeading": { no: "Fremgangsmåte", en: "Method" },
  "recipeDetail.stepStartTime": { no: "Start kl. {time}", en: "Start at {time}" },
  // Vegetarversjonen er nå admin-forhåndslagret (se vegetarianVariant i
  // lib/types.ts) – knappen/avkrysningen vises kun når en variant faktisk
  // finnes, og trenger derfor verken lasting- eller feil-tekst lenger.
  "recipeDetail.vegPrompt": { no: "Ønsker du en vegetarversjon?", en: "Want a vegetarian version?" },
  "recipeDetail.engTranslating": { no: "Oversetter til engelsk …", en: "Translating to English …" },
  "recipeDetail.engError": { no: "Kunne ikke oversette til engelsk. Prøv igjen.", en: "Couldn't translate to English. Please try again." },
  "recipeDetail.reTranslate": { no: "Oversett på nytt", en: "Translate again" },
  "recipeDetail.reTranslating": { no: "Oversetter på nytt …", en: "Translating again …" },
  "recipeDetail.substituteModeOn": { no: "Bytt ut en ingrediens", en: "Substitute an ingredient" },
  "recipeDetail.substituteModeOff": { no: "Skjul bytt ut-forslag", en: "Hide substitute suggestions" },
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
    no: "Vi setter sammen en hel meny rundt denne retten – hentet fra oppskriftsboken der det passer, foreslått nytt der det ikke gjør det.",
    en: "We put together a full menu around this dish – drawn from your cookbook where it fits, suggested fresh where it doesn't.",
  },
  // Anledning (5.12) / tilgjengelig tid (5.13) – valgfrie hint FØR selve
  // genereringen, se MealBuilder.tsx.
  "mealBuilder.occasionLabel": { no: "Anledning (valgfritt)", en: "Occasion (optional)" },
  "mealBuilder.availableMinutesLabel": { no: "Jeg har (minutter, valgfritt)", en: "I have (minutes, optional)" },
  "mealBuilder.availableMinutesPlaceholder": { no: "f.eks. 60", en: "e.g. 60" },
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
  // Endret fra "Lagre menyen" til "Gå videre" 26.08.2026 (ønsket av Henrik –
  // "lagre meny høres litt rart ut" for en knapp som faktisk navigerer videre
  // til selve menysiden med det samme, ikke bare lagrer og blir stående).
  // Selve lagringen (til localStorage) skjer fortsatt akkurat likt, kun
  // teksten er endret – se handleSave i MealBuilder.tsx.
  "mealBuilder.save": { no: "Gå videre", en: "Continue" },
  "mealBuilder.saving": { no: "Går videre …", en: "Continuing …" },
  "mealBuilder.saveError": {
    no: "Klarte ikke å lagre menyen på denne enheten.",
    en: "Couldn't save the menu on this device.",
  },
  "mealBuilder.viewSaved": { no: "Se den lagrede menyen", en: "View the saved menu" },
  "mealBuilder.reset": { no: "Nullstill og begynn på nytt", en: "Reset and start over" },

  // Den lagrede menysiden – app/meny/[id]/page.tsx.
  "mealPage.metaTitle": { no: "Din meny", en: "Your menu" },
  "mealPage.notFoundHeading": { no: "Fant ikke menyen", en: "Menu not found" },
  "mealPage.notFoundBody": {
    no: "Denne menyen finnes ikke på denne enheten – menyer lagres kun lokalt i nettleseren de ble laget i.",
    en: "This menu doesn't exist on this device – menus are only stored locally in the browser they were created in.",
  },
  "mealPage.emptyState": { no: "Denne menyen er tom.", en: "This menu is empty." },
  // Lenke tilbake til oppskriften menyen ble bygget rundt (26.08.2026,
  // Henrik: "på menysiden må man ha en mulighet til å gå tilbake til
  // oppskriften man kom fra") – se anchorSlot i MealView.tsx.
  "mealPage.backToRecipe": { no: "← Tilbake til {title}", en: "← Back to {title}" },
  "mealPage.notesLabel": { no: "Notater", en: "Notes" },
  "mealPage.notesPlaceholder": {
    no: "Egne notater om menyen – f.eks. hvem som kommer, eller ting å huske …",
    en: "Your own notes about the menu – e.g. who's coming, or things to remember …",
  },
  "mealPage.suggestedDescriptionLabel": { no: "Om forslaget", en: "About the suggestion" },
  "mealPage.createFromSuggestion": { no: "Opprett som oppskrift", en: "Create as recipe" },

  // Menynivå-vin (Fase 5 – Experience, 5.6) – se
  // components/meal/MealWineSection.tsx og getMealWineRecommendation i
  // lib/actions/ai.ts. Gjenbruker de generiske "wine.vinmonopolet*"-nøklene
  // over for selve Vinmonopolet-oppslaget (samme tekst passer fint for
  // både én rett og en hel meny).
  "mealWine.heading": { no: "Vin til hele menyen", en: "Wine for the whole meal" },
  "mealWine.description": {
    no: "Få et vinforslag som tar hensyn til hele måltidet – ikke bare én rett.",
    en: "Get a wine suggestion that considers the whole meal – not just one dish.",
  },
  "mealWine.button": { no: "Foreslå vin til menyen", en: "Suggest wine for the menu" },
  "mealWine.fetching": { no: "Tenker …", en: "Thinking …" },
  "mealWine.getNew": { no: "Foreslå en annen", en: "Suggest another" },
  "mealWine.error": {
    no: "Klarte ikke å hente et vinforslag akkurat nå. Prøv igjen.",
    en: "Couldn't get a wine suggestion right now. Please try again.",
  },

  "mealMood.heading": { no: "Gjør det til en kveld", en: "Make it an evening" },
  "mealMood.description": {
    no: "Få et forslag til stemning rundt måltidet – musikk, borddekning og tonen for kvelden.",
    en: "Get a mood suggestion for the meal – music, table setting and the tone for the evening.",
  },
  "mealMood.button": { no: "Foreslå stemning", en: "Suggest a mood" },
  "mealMood.fetching": { no: "Tenker …", en: "Thinking …" },
  "mealMood.getNew": { no: "Foreslå på nytt", en: "Suggest again" },
  "mealMood.error": {
    no: "Klarte ikke å hente et stemningsforslag akkurat nå. Prøv igjen.",
    en: "Couldn't get a mood suggestion right now. Please try again.",
  },

  "mealPrint.button": { no: "Skriv ut / lagre som PDF", en: "Print / save as PDF" },

  // Kombinert handleliste (Fase 5 – Experience, 5.7) – se
  // components/meal/MealShoppingListSection.tsx og
  // lib/actions/meal-shopping-list.ts.
  "mealShopping.heading": { no: "Handleliste for hele menyen", en: "Shopping list for the whole menu" },
  "mealShopping.description": {
    no: "Legg ingrediensene fra alle rettene i menyen til handlelisten din, skalert til riktig antall porsjoner for hver rett.",
    en: "Add the ingredients from every dish in the menu to your shopping list, scaled to the right serving count for each dish.",
  },
  "mealShopping.button": { no: "Legg hele menyen i handlelisten", en: "Add the whole menu to the shopping list" },
  "mealShopping.loading": { no: "Legger til …", en: "Adding …" },
  "mealShopping.done": { no: "Lagt til i handlelisten.", en: "Added to the shopping list." },
  "mealShopping.viewList": { no: "Se handlelisten", en: "View shopping list" },
  "mealShopping.error": {
    no: "Klarte ikke å legge menyen til i handlelisten. Prøv igjen.",
    en: "Couldn't add the menu to the shopping list. Please try again.",
  },
  "mealShopping.skippedSuggested": {
    no: "{count} forslag i menyen finnes ikke som ekte oppskrift ennå, og ble derfor ikke lagt til.",
    en: "{count} suggestion(s) in the menu don't exist as a real recipe yet, so they weren't added.",
  },
  "mealShopping.noExisting": {
    no: "Ingen av rettene i denne menyen finnes som ekte oppskrifter ennå, så det er ingenting å legge i handlelisten.",
    en: "None of the dishes in this menu exist as real recipes yet, so there's nothing to add to the shopping list.",
  },

  // Hel-meny-timeline (Fase 5 – Experience, 5.8) – se
  // components/meal/MealTimelineSection.tsx og computeMealTimeline i
  // lib/kitchen-intelligence/meal-timeline.ts. Gjenbruker
  // "recipeDetail.timelineInvalidTime" fra ett-oppskrift-tidslinjen for
  // selve feilmeldingen (samme, generiske tekst passer fint her også).
  "mealTimeline.heading": { no: "Tidslinje for hele menyen", en: "Timeline for the whole menu" },
  "mealTimeline.description": {
    no: "Se når du bør starte hver rett for at alt er klart samtidig.",
    en: "See when you should start each dish so everything is ready at the same time.",
  },
  "mealTimeline.readyLabel": { no: "Ønsket spisetidspunkt", en: "Desired time to eat" },
  "mealTimeline.button": { no: "Vis tidslinje", en: "Show timeline" },
  "mealTimeline.loading": { no: "Regner ut …", en: "Calculating …" },
  "mealTimeline.error": {
    no: "Klarte ikke å regne ut tidslinjen. Prøv igjen.",
    en: "Couldn't calculate the timeline. Please try again.",
  },
  "mealTimeline.startLabel": { no: "Start", en: "Start" },
  "mealTimeline.totalMinutes": { no: "{minutes} min totalt", en: "{minutes} min total" },
  "mealTimeline.readyAtLabel": { no: "Alt klart", en: "Everything ready" },
  "mealTimeline.noExisting": {
    no: "Ingen av rettene i denne menyen finnes som ekte oppskrifter ennå, så det er ingen tidslinje å beregne.",
    en: "None of the dishes in this menu exist as real recipes yet, so there's no timeline to calculate.",
  },
  "mealTimeline.noSteps": {
    no: "Ingen av rettene i menyen har steg å beregne en tidslinje fra.",
    en: "None of the dishes in the menu have steps to calculate a timeline from.",
  },

  "mealCookMode.button": { no: "Start kokemodus for hele menyen", en: "Start cook mode for the whole menu" },
  "mealCookMode.loading": { no: "Henter oppskriftene …", en: "Loading the recipes …" },
  "mealCookMode.error": {
    no: "Kunne ikke starte kokemodus for menyen. Prøv igjen.",
    en: "Couldn't start cook mode for the menu. Please try again.",
  },
  "mealCookMode.noCookableDishes": {
    no: "Ingen av rettene i menyen har steg å lage kokemodus av.",
    en: "None of the dishes in the menu have steps to build cook mode from.",
  },
  "mealCookMode.closeButton": { no: "Lukk", en: "Close" },
  // "mealCookMode.switcherAria" var en periode ubrukt (erstattet av den
  // kryssrett-orkestrerte tasksstrømmen, 5.16/5.17), men er nå TILBAKE i
  // bruk (26.08.2026) som aria-label for rette-fanene i MultiCookMode.tsx –
  // se filheaderen der: fanene hopper i den samme flate strømmen, de
  // erstatter den ikke.
  "mealCookMode.switcherAria": { no: "Bytt mellom rettene i menyen", en: "Switch between the dishes in the menu" },
  "mealCookMode.taskOf": { no: "Oppgave {current} av {total}", en: "Task {current} of {total}" },
  "mealCookMode.noReadyAt": {
    no: "Sett et ønsket spisetidspunkt i tidslinjen for menyen først, så vi kan planlegge rekkefølgen på tvers av rettene.",
    en: "Set a desired time to eat in the menu's timeline first, so we can plan the order across the dishes.",
  },
  "mealCookMode.allTasksButtonAria": { no: "Se alle gjøremål", en: "See all tasks" },
  "mealCookMode.allTasksTitle": { no: "Alle gjøremål", en: "All tasks" },
  "mealCookMode.closeAllTasksAria": { no: "Lukk gjøremålsoversikten", en: "Close the task overview" },

  // "GJØR DET TIL EN KVELD" (Fase 5-finale, 5.9–5.11/5.14) – se
  // components/meal/EveningExperience.tsx. Denne nøkkel-familien EIER nå den
  // cinematic sluttopplevelsen – MealMoodSection.tsx/MealWineSection.tsx sine
  // egne "mealMood.*"/"mealWine.*"-nøkler lenger ned står urørt (de to
  // filene finnes fortsatt på disk, bare ikke montert fra MealView.tsx
  // lenger, se filheaderen der).
  "eveningExperience.entryHeading": { no: "Gjør det til en kveld", en: "Make it an evening" },
  "eveningExperience.entryDescription": {
    no: "Vin, bord, stemning og musikk – kuratert rundt akkurat denne menyen.",
    en: "Wine, table, mood and music – curated around this exact menu.",
  },
  "eveningExperience.dialogAria": { no: "Gjør det til en kveld", en: "Make it an evening" },
  "eveningExperience.eyebrow": { no: "CONVITE", en: "CONVITE" },
  "eveningExperience.menuHeading": { no: "Meny", en: "Menu" },
  "eveningExperience.wineHeading": { no: "I glasset", en: "In the glass" },
  "eveningExperience.tableHeading": { no: "På bordet", en: "On the table" },
  "eveningExperience.moodHeading": { no: "Stemning", en: "Mood" },
  "eveningExperience.musicHeading": { no: "Musikk", en: "Music" },
  "eveningExperience.servingHeading": { no: "Ved servering", en: "When serving" },
  "eveningExperience.loading": { no: "Setter sammen kvelden …", en: "Putting the evening together …" },
  "eveningExperience.error": {
    no: "Klarte ikke å hente forslag til kvelden akkurat nå. Resten av menyen fungerer som normalt.",
    en: "Couldn't fetch suggestions for the evening right now. The rest of the menu still works as normal.",
  },
  "eveningExperience.shoppingListButton": { no: "Handleliste", en: "Shopping list" },
  "eveningExperience.planButton": { no: "Planlegg kvelden", en: "Plan the evening" },
  "eveningExperience.startCookingButton": { no: "Start matlaging", en: "Start cooking" },
  // "Hvorfor?"/ordforklaring (26.08.2026) – se GlossaryText/WhyToggle i
  // EveningExperience.tsx. Kun brukt i DENNE komponenten (ikke en delt nøkkel
  // som f.eks. wine.vinmonopoletPrompt under er), så trygt å style teksten
  // eksakt slik den redaksjonelle redesignen (26.08.2026) ønsker.
  "eveningExperience.whyShow": { no: "Se hvorfor →", en: "See why →" },
  "eveningExperience.whyHide": { no: "Skjul", en: "Hide" },
  // Samme toggle-mekanikk som over (WhyToggle), men egen ordlyd for
  // PÅ BORDET-seksjonen – "Se detaljer →" passer bedre der enn "Se hvorfor →".
  "eveningExperience.detailsShow": { no: "Se detaljer →", en: "See details →" },
  "eveningExperience.detailsHide": { no: "Skjul", en: "Hide" },
  // Egen, kortere ordlyd for "finn en konkret vin"-knappen HER (i stedet for
  // den delte wine.vinmonopoletPrompt-nøkkelen, som fortsatt brukes uendret
  // andre steder – f.eks. MealWineSection.tsx/RecipeInteractive.tsx – og
  // derfor ikke skal endres).
  "eveningExperience.findWineButton": { no: "Finn en konkret vin →", en: "Find a specific wine →" },

  "recipeDetail.unitsAria": { no: "Målenhet", en: "Unit system" },
  "recipeDetail.unitsMetric": { no: "Metrisk", en: "Metric" },
  "recipeDetail.unitsUs": { no: "US", en: "US" },
  "recipeDetail.convertingUnits": { no: "Konverterer mål i teksten …", en: "Converting measurements in the text …" },
  "recipeDetail.unitsError": { no: "Kunne ikke konvertere målene i teksten. Prøv igjen.", en: "Couldn't convert the measurements in the text. Please try again." },
  "recipeDetail.unitsRetry": { no: "Prøv igjen", en: "Try again" },
  "recipeDetail.notes": { no: "Notater", en: "Notes" },
  "recipeDetail.tips": { no: "Tips", en: "Tips" },
  "recipeDetail.warnings": { no: "Pass på", en: "Watch out for" },
  "recipeDetail.startCooking": { no: "Start matlaging", en: "Start cooking" },
  // Vises i stedet for startCooking når man har vært i Cook Mode for denne
  // oppskriften før og har lagret fremgang der (avhukede steg/ingredienser
  // eller kommet forbi første steg – se hasCookModeProgress i
  // RecipeInteractive.tsx). Samme lagrede tilstand som Cook Mode selv
  // gjenopptar fra (useCookModeState), kun brukt her til å velge riktig
  // knappetekst FØR man i det hele tatt åpner Cook Mode igjen.
  "recipeDetail.continueCooking": { no: "Fortsett matlaging", en: "Continue cooking" },
  "recipeDetail.addedToList": { no: "Lagt til!", en: "Added!" },
  "recipeDetail.addToList": { no: "Legg til i handleliste", en: "Add to shopping list" },
  "recipeDetail.goToShoppingList": { no: "Gå til handleliste →", en: "Go to shopping list →" },
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

  // --- "Hvordan gjør jeg det?" – CONVITEs kunnskapsbibliotek for
  // kjøkkenteknikker og problemløsning (bygget 27.08.2026, se
  // supabase/migrations/0013_knowledge_guides.sql). Oppskriften forteller
  // HVA som skal gjøres; denne delen av siden lærer brukeren HVORDAN. Egen
  // seksjon fra "recipeDetail.*"/"nav.*" over siden dette er et helt eget
  // innholdsområde, ikke en utvidelse av oppskriftsvisningen.
  //
  // nav.guides = full tittel, brukt i BottomNav.tsx (mobil har plass) og
  // som <h1>/fane-tittel på selve landingssiden. nav.guidesShort = kortere
  // variant KUN til Header.tsx sin desktop-nav (spesifikasjonens eksplisitte
  // "kortere navn i header er ok, men ikke bytt konseptnavnet andre steder").
  "nav.guides": { no: "Hvordan gjør jeg det?", en: "How do I do that?" },
  "nav.guidesShort": { no: "Guider", en: "Guides" },

  "guides.pageEyebrow": { no: "Kunnskap", en: "Knowledge" },
  "guides.pageIntro": {
    no: "Praktiske svar på kjøkkenets store og små spørsmål, fra grunnteknikker til hvordan du redder en mislykket saus.",
    en: "Practical answers to the kitchen's big and small questions, from basic techniques to rescuing a sauce gone wrong.",
  },
  "guides.searchPlaceholder": {
    no: "Søk, f.eks. «sausen er for tynn»",
    en: "Search, e.g. “the sauce is too thin”",
  },
  "guides.searchLabel": { no: "Søk i Hvordan gjør jeg det?", en: "Search How do I do that?" },
  "guides.categoriesHeading": { no: "Kategorier", en: "Categories" },
  "guides.allCategories": { no: "Alle", en: "All" },
  "guides.noResults": {
    no: "Fant ingen guider for «{query}».",
    en: "No guides found for “{query}”.",
  },
  "guides.searchHint": {
    no: "Prøv et annet ord, eller bla i kategoriene under.",
    en: "Try a different word, or browse the categories below.",
  },
  "guides.emptyLibrary": {
    no: "Ingen guider er publisert ennå.",
    en: "No guides published yet.",
  },
  // Synlig merkelapp på de få demo-/placeholder-guidene (knowledge_guides.is_demo,
  // se migrasjon 0013) – bevisst synlig for alle, ikke bare admin, siden
  // spesifikasjonen ber om at placeholder-innhold skal være "tydelig
  // markert" mens ekte innhold fylles inn.
  "guides.demoBadge": { no: "Demo", en: "Demo" },
  "guides.readGuide": { no: "Les guiden", en: "Read guide" },
  "guides.backToLibrary": { no: "Hvordan gjør jeg det?", en: "How do I do that?" },
  "guides.categoryEmpty": {
    no: "Ingen guider i denne kategorien ennå.",
    en: "No guides in this category yet.",
  },

  "guide.quickAnswerHeading": { no: "Kort svar", en: "Quick answer" },
  "guide.stepsHeading": { no: "Fremgangsmåte", en: "Steps" },
  "guide.tipsHeading": { no: "Tips", en: "Tips" },
  // "Pass på" er bevisst en nøktern, liten overskrift – IKKE en stor gul
  // varselboks (spesifikasjonens eksplisitte "understated, not big yellow
  // boxes"-krav for warnings-feltet).
  "guide.warningsHeading": { no: "Pass på", en: "Watch out for" },
  "guide.relatedHeading": { no: "Relatert", en: "Related" },
  "guide.timeLabel": { no: "Tid", en: "Time" },
  "guide.levelLabel": { no: "Nivå", en: "Level" },

  // "Hva skal vi spise?" – deterministisk-først beslutningshjelper, se
  // filheaderen til components/whattoeat/WhatToEatView.tsx.
  "whatToEat.title": { no: "Hva skal vi spise?", en: "What should we eat?" },
  "whatToEat.metaDescription": {
    no: "Velg tid, stemning eller anledning – få middagsforslag som faktisk passer akkurat nå.",
    en: "Pick time, mood or occasion – get dinner suggestions that actually fit right now.",
  },
  "whatToEat.intro": {
    no: "Velg det som stemmer akkurat nå – tid, stemning, protein, anledning – så mye eller lite du vil. Ingen valg er påkrevd.",
    en: "Pick whatever fits right now – time, mood, protein, occasion – as much or as little as you like. Nothing is required.",
  },
  "whatToEat.vibeLabel": { no: "Stemning", en: "Mood" },
  "whatToEat.proteinLabel": { no: "Hva har du lyst på?", en: "What are you in the mood for?" },
  "whatToEat.occasionLabel": { no: "Anledning", en: "Occasion" },
  "whatToEat.ambitionLabel": { no: "Ambisjon", en: "Ambition" },
  "whatToEat.minutesLabel": { no: "minutter tilgjengelig", en: "minutes available" },
  "whatToEat.guestsLabel": { no: "gjester", en: "guests" },
  "whatToEat.findButton": { no: "Finn middagsforslag", en: "Find dinner suggestions" },
  "whatToEat.loading": { no: "Ser gjennom oppskriftene …", en: "Looking through the recipes …" },
  "whatToEat.error": { no: "Klarte ikke å finne forslag akkurat nå. Prøv igjen.", en: "Couldn't find suggestions right now. Please try again." },
  "whatToEat.emptyTitle": { no: "Fant ingen oppskrifter ennå", en: "No recipes found yet" },
  "whatToEat.emptyDescription": {
    no: "Prøv å fjerne et par valg, så åpner det seg flere muligheter.",
    en: "Try clearing a choice or two to open up more options.",
  },
  "whatToEat.showSomethingElse": { no: "Vis meg noe annet", en: "Show me something else" },

  // "I sesong" – strukturert, redaksjonelt sesonginnhold, se
  // filheaderen til lib/kitchen-intelligence/seasonal.ts.
  "season.peakNow": { no: "På sitt beste nå", en: "At its best now" },
  "season.recipesLabel": { no: "Oppskrifter:", en: "Recipes:" },
  "seasonPage.title": { no: "I sesong", en: "In season" },
  "seasonPage.metaDescription": {
    no: "Hva som er i sesong akkurat nå i Norge, og oppskriftene som bruker det.",
    en: "What's in season right now in Norway, and the recipes that use it.",
  },
  "seasonPage.eyebrow": { no: "I sesong nå", en: "In season now" },
  "seasonPage.nowHeading": { no: "Akkurat nå", en: "Right now" },
  "seasonPage.noneNow": {
    no: "Ingen råvarer registrert for akkurat nå ennå.",
    en: "No ingredients registered for right now yet.",
  },
  "seasonPage.otherSeasonsHeading": { no: "Andre sesonger", en: "Other seasons" },
  "seasonPage.backToIndex": { no: "I sesong", en: "In season" },
  "seasonPage.currentBadge": { no: "Nå", en: "Now" },

  // Utvidelsen 28.08.2026 (komplett, kildebasert råvareguide) – råvaresøk,
  // status "akkurat nå", og selve råvaresiden. Se filheaderen til
  // IngredientDetail.tsx og IngredientSearch.tsx.
  "season.searchHeading": { no: "Når er det i sesong?", en: "When is it in season?" },
  "season.searchPlaceholder": { no: "Søk etter råvare …", en: "Search for an ingredient …" },
  "season.searchNoResults": { no: "Fant ingen råvare med det navnet.", en: "No ingredient found with that name." },
  "season.seasonRangeLabel": { no: "Sesong:", en: "Season:" },
  "season.peakRangeLabel": { no: "På sitt beste:", en: "At its best:" },
  "season.source": { no: "Kilde", en: "Source" },
  "season.recipesWithIngredient": { no: "Oppskrifter med {name}", en: "Recipes with {name}" },
  "season.noRecipesYet": { no: "Ingen oppskrifter med denne råvaren ennå.", en: "No recipes with this ingredient yet." },
  "seasonPage.ingredientNotFound": { no: "Fant ikke råvaren", en: "Ingredient not found" },

  // Nytt master-detail-oppsett i SeasonIngredientList.tsx (28.08.2026,
  // Henriks ønske): på lg+ vises råvaredetaljen til høyre for listen i
  // stedet for inline under raden, med denne rolige teksten som
  // tomme-tilstand før noe er valgt.
  "season.selectIngredientPrompt": {
    no: "Velg en råvare i listen for å se mer om den.",
    en: "Select an ingredient from the list to see more about it.",
  },

  // Forsideteasere (spesifikasjon punkt 6) for begge funksjonene over.
  "home.whatToEatTeaser.eyebrow": { no: "Beslutningshjelp", en: "Decision help" },
  "home.whatToEatTeaser.heading": { no: "Hva skal vi spise?", en: "What should we eat?" },
  "home.whatToEatTeaser.body": {
    no: "Velg tid, stemning eller anledning – få middagsforslag på et blunk.",
    en: "Pick time, mood or occasion – get dinner suggestions in a blink.",
  },
  "home.whatToEatTeaser.cta": { no: "Finn middag", en: "Find dinner" },
  "home.seasonTeaser.eyebrow": { no: "I sesong nå", en: "In season now" },
  "home.seasonTeaser.cta": { no: "Se hva som er i sesong", en: "See what's in season" },

  // Nav-lenker for de to nye sidene (se Header.tsx).
  "nav.whatToEat": { no: "Hva skal vi spise?", en: "What to eat?" },
  "nav.season": { no: "I sesong", en: "In season" },
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

/** "1 gjest" / "4 gjester" / "1 guest" / "4 guests" – brukt i
 * EveningExperience.tsx sin cinematic åpningslinje (26.08.2026-redesignet,
 * "FREDAGSKVELD · 20:00 · 4 GJESTER"). Samme mønster som recipeCountLabel
 * over. */
export function guestCountLabel(lang: Lang, count: number): string {
  if (lang === "en") return `${count} ${count === 1 ? "guest" : "guests"}`;
  return `${count} ${count === 1 ? "gjest" : "gjester"}`;
}
