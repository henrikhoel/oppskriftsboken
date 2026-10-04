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
  "nav.weeklyMenu": { no: "Ukesmeny", en: "Weekly menu" },
  // "Helg & gjester" (03.10.2026) – se app/helg-og-gjester/page.tsx.
  "nav.weekendGuests": { no: "Helg & gjester", en: "Weekend & guests" },
  "nav.shoppingList": { no: "Handleliste", en: "Shopping list" },
  "nav.search": { no: "Søk", en: "Search" },
  "nav.admin": { no: "Admin", en: "Admin" },
  // "+"-snarveien i Header.tsx, kun synlig server-side for innlogget admin.
  "nav.newRecipe": { no: "Ny oppskrift", en: "New recipe" },
  "nav.mainNav": { no: "Hovednavigasjon", en: "Main navigation" },
  "nav.mainNavMobile": { no: "Hovednavigasjon, mobil", en: "Main navigation, mobile" },
  "nav.home": { no: "Hjem", en: "Home" },
  // Endret fra "Hva kan jeg lage?" til "I kjøleskapet" 26.09.2026 (ønsket
  // av Henrik). Deler fortsatt nøkkel/tekst med pantryPage.title (se
  // app/hva-kan-jeg-lage/page.tsx – <h1> og fane-tittel er samme streng),
  // og med BottomNav.tsx sin nav-lenke – URL-en er BEVISST uendret
  // (/hva-kan-jeg-lage), kun den synlige teksten er ny.
  "nav.pantry": { no: "I kjøleskapet", en: "In the fridge" },
  // Kort variant til BottomNav.tsx (28.09.2026, Henrik med skjermbilde: "det
  // ser dog ut som ikke er nok plass") – etter at Ukesmeny ble lagt til i
  // bunnmenyen (grid-cols-5 → 6) var kolonnen for smal for "I kjøleskapet",
  // så "I" brakk av alene på egen linje over "kjøleskapet". Samme mønster
  // som nav.guidesShort allerede bruker for akkurat denne typen trange
  // navigasjonssteder – dropper "I "-prefikset, som var selve ordet som
  // brakk av alene.
  "nav.pantryShort": { no: "Kjøleskapet", en: "The fridge" },
  "nav.language": { no: "Språk", en: "Language" },
  // Opprinnelig for fellespassordet for hele nettstedet (fjernet
  // 27.09.2026, se filheaderen i proxy.ts) – gjenbrukt samme dag til
  // AccountLogOutButton.tsx (logger ut av en vanlig brukerkonto, se
  // lib/actions/account.ts sin signOutAccount). IKKE det samme som admin
  // sin egen SignOutButton.tsx/lib/actions/auth.ts sin signOut.
  "nav.logOut": { no: "Logg ut", en: "Log out" },
  "nav.login": { no: "Logg inn", en: "Log in" },

  // ─────────────────────────── Brukerkonto (27.09.2026) ──────────────────
  // Registrering/innlogging/utlogging/glemt passord for VANLIGE besøkende –
  // se lib/actions/account.ts sin filheader for hele bakgrunnen. Egen
  // nøkkelfamilie fra admin sin "Logg inn på admin"-side (som har sin
  // tekst hardkodet direkte i app/admin/login/page.tsx, ikke i ordboken).
  "account.emailLabel": { no: "E-post", en: "Email" },
  "account.passwordLabel": { no: "Passord", en: "Password" },
  "account.confirmPasswordLabel": { no: "Bekreft passord", en: "Confirm password" },
  "account.newPasswordLabel": { no: "Nytt passord", en: "New password" },

  "account.loginTitle": { no: "Logg inn", en: "Log in" },
  "account.loginButton": { no: "Logg inn", en: "Log in" },
  "account.loginPending": { no: "Logger inn …", en: "Logging in …" },
  "account.noAccountYet": { no: "Har du ikke konto?", en: "Don't have an account?" },
  "account.signUpLink": { no: "Opprett konto", en: "Create an account" },
  "account.forgotPasswordLink": { no: "Glemt passordet?", en: "Forgot your password?" },

  "account.signUpTitle": { no: "Opprett konto", en: "Create an account" },
  // Vises øverst på registreringssiden – forklarer HVORFOR man i det hele
  // tatt trenger konto, siden dette (i motsetning til f.eks. en nettbutikk)
  // ikke er opplagt ut fra kontekst alene.
  "account.signUpIntro": {
    no: "Favoritter, handleliste, «I kjøleskapet» og «Bygg din egen meny» er forbeholdt de med konto. Resten av siden kan du bruke fritt uten å opprette en.",
    en: "Favorites, the shopping list, “In the fridge” and “Build your own menu” are reserved for account holders. The rest of the site is free to use without one.",
  },
  "account.signUpButton": { no: "Opprett konto", en: "Create account" },
  "account.signUpPending": { no: "Oppretter konto …", en: "Creating account …" },
  "account.alreadyHaveAccount": { no: "Har du allerede konto?", en: "Already have an account?" },
  "account.loginLink": { no: "Logg inn", en: "Log in" },
  "account.passwordMinLengthHint": {
    no: "Minst 8 tegn.",
    en: "At least 8 characters.",
  },
  "account.checkYourEmailTitle": { no: "Sjekk e-posten din", en: "Check your email" },

  "account.forgotPasswordTitle": { no: "Glemt passordet?", en: "Forgot your password?" },
  "account.forgotPasswordIntro": {
    no: "Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.",
    en: "Enter your email address and we'll send you a link to reset your password.",
  },
  "account.forgotPasswordButton": { no: "Send tilbakestillingslenke", en: "Send reset link" },
  "account.forgotPasswordPending": { no: "Sender …", en: "Sending …" },
  // Query-parameteren `?feil=utlopt` fra app/auth/confirm/route.ts (lenken
  // i e-posten var ugyldig/brukt/utløpt) – IKKE et feltvalideringsfeil fra
  // selve skjemaet her (det håndteres av requestPasswordReset sin egen
  // `error`-state som vanlig).
  "account.resetLinkExpiredError": {
    no: "Lenken var ugyldig eller hadde gått ut. Be om en ny under.",
    en: "The link was invalid or had expired. Request a new one below.",
  },
  "account.backToLogin": { no: "Tilbake til innlogging", en: "Back to log in" },

  "account.resetPasswordTitle": { no: "Velg nytt passord", en: "Choose a new password" },
  "account.resetPasswordButton": { no: "Oppdater passord", en: "Update password" },
  "account.resetPasswordPending": { no: "Oppdaterer …", en: "Updating …" },
  // Vises i stedet for selve skjemaet når siden besøkes uten en gyldig
  // "recovery"-sesjon (lenken i e-posten var ugyldig/utløpt/allerede brukt,
  // eller siden ble bokmerket/besøkt direkte) – se app/tilbakestill-passord/page.tsx.
  "account.resetPasswordInvalidTitle": { no: "Lenken er ugyldig eller utløpt", en: "The link is invalid or expired" },
  "account.resetPasswordInvalidDescription": {
    no: "Be om en ny tilbakestillingslenke, så kan du velge nytt passord.",
    en: "Request a new reset link, then you can choose a new password.",
  },

  "account.demoModeTitle": { no: "Kontoer er utilgjengelig i demo-modus", en: "Accounts are unavailable in demo mode" },
  "account.demoModeDescription": {
    no: "Koble til et Supabase-prosjekt i .env.local for å kunne opprette konto. Se README.md.",
    en: "Connect a Supabase project in .env.local to enable accounts. See README.md.",
  },
  "account.backToHome": { no: "Tilbake til forsiden", en: "Back to the homepage" },

  // --- "Legg til på hjemskjerm": nå et lite ikon i headeren (26.09.2026,
  // se filheaderen i AppDownloadIconButton.tsx), tidligere en egen
  // bannerlinje, KUN mobil. Et trykk åpner et lite hjelpe-ark med
  // fremgangsmåten, siden selve installasjonen ikke kan trigges med ett
  // trykk fra JavaScript.
  // appBanner.text/scanHint er fra den nå fjernede desktop-QR-varianten –
  // stående ubrukt, ingen andre steder refererer til dem.
  "appBanner.text": { no: "Snart som app", en: "Coming soon as an app" },
  "appBanner.scanHint": { no: "Skann for å laste ned", en: "Scan to download" },
  "appBanner.mobileCta": { no: "Legg til på hjemskjerm", en: "Add to Home Screen" },
  // Synlig tekst ved siden av telefon-ikonet i headeren (28.09.2026,
  // Henrik: "kan du legge til teksten 'App' ved siden av?") – ikonet var
  // tidligere helt uten tekst (kun en liten understrek som klikkbarhets-
  // signal, se AppDownloadIconButton.tsx), samme knapp, samme handling.
  "appBanner.appLabel": { no: "App", en: "App" },
  // OVERSKRIFTEN endret (28.09.2026, Henrik, presiserte etter forrige
  // forsøk: "jeg mente mer overskriften som må endres, ikke legge til
  // tekst under") – "få opplevelsen av en app"-budskapet flyttet HIT (til
  // selve Drawer-tittelen) i stedet for som en ekstra setning i
  // fremgangsmåte-teksten under, som er tilbakestilt til sin opprinnelige,
  // rene form. appBanner.mobileCta (aria-label/title på selve knappen)
  // holdes bevisst uendret ("Legg til på hjemskjerm") – det er en ren
  // tilgjengelighets-/handlingsbeskrivelse, ikke overskriften i boksen.
  "appBanner.helpTitle": { no: "Få opplevelsen av en app", en: "Get the app experience" },
  "appBanner.helpIOS": {
    no: "Trykk Del-ikonet nederst i Safari (firkanten med pil opp), bla ned og velg «Legg til på Hjem-skjerm».",
    en: "Tap the Share icon at the bottom of Safari (the square with an arrow up), scroll down and choose “Add to Home Screen”.",
  },
  "appBanner.helpAndroid": {
    no: "Trykk menyknappen (de tre prikkene) øverst til høyre i Chrome, og velg «Legg til på startskjermen».",
    en: "Tap the menu button (the three dots) in the top right of Chrome, and choose “Add to Home screen”.",
  },
  "appBanner.helpGeneric": {
    no: "Se etter «Legg til på hjemskjerm» i nettleserens meny eller del-knapp.",
    en: "Look for “Add to Home Screen” in your browser's menu or share button.",
  },
  "appBanner.closeAria": { no: "Lukk", en: "Close" },

  "footer.allRecipes": { no: "Alle oppskrifter", en: "All recipes" },
  "footer.favorites": { no: "Favoritter", en: "Favorites" },
  "footer.shoppingList": { no: "Handleliste", en: "Shopping list" },
  // (03.10.2026) Guider-lenken flyttet hit fra Header.tsx, se Footer.tsx
  // sin egen kommentar.
  "footer.guides": { no: "Guider", en: "Guides" },
  "footer.admin": { no: "Admin", en: "Admin" },
  "footer.ariaLabel": { no: "Bunntekst", en: "Footer" },
  "footer.backToTop": { no: "Til toppen", en: "Back to top" },

  "demo.banner": {
    no: "Demo-modus: viser eksempeloppskrifter. Koble til Supabase i .env.local for å bruke din egen database og admin-panel. Se README.md.",
    en: "Demo mode: showing example recipes. Connect Supabase in .env.local to use your own database and admin panel. See README.md.",
  },

  "home.eyebrow": { no: "Din digitale kokebok", en: "Your digital cookbook" },
  "home.title": {
    no: "Oppskriftene du faktisk lager, igjen og igjen",
    en: "The recipes you actually cook, again and again",
  },
  "home.subtitleRest": {
    no: "Det beste skjer rundt bordet.",
    en: "The best things happen around the table.",
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
  "moodMode.tasty": { no: "Noe digg", en: "Something tasty" },
  "moodMode.loading": { no: "Finner oppskrifter …", en: "Finding recipes …" },
  "moodMode.error": {
    no: "Klarte ikke å finne forslag akkurat nå. Prøv igjen.",
    en: "Couldn't find suggestions right now. Please try again.",
  },
  "moodMode.none": {
    no: "Fant ingen gode treff akkurat nå. Prøv en annen stemning.",
    en: "No good matches right now. Try a different mood.",
  },
  // "Se alle →" (03.10.2026, Henrik, etter et første forsøk med en "last
  // inn flere"-knapp her på forsiden: "legg inn humør som en filter inne
  // på Alle oppskrifter [...] kan trykke 'se alle' og da kommer man inn på
  // 'Alle oppskrifter' siden hvor humøret allerede er valgt som filter") –
  // vises under de første MOOD_PREVIEW_COUNT rettene i MoodModeSection.tsx
  // når treff-lista er lengre enn det, og lenker til
  // /oppskrifter?mood=<id> (humøret forhåndsutfylt som filter der, se
  // RecipeFilters.mood sin filheader i lib/types.ts).
  "moodMode.seeAll": { no: "Se alle", en: "See all" },

  // --- Redesignet forside under hero: editorial utvalg-seksjon ---
  // Omdøpt fra "Ukens utvalg" 26.08.2026 (Henrik: trengte ikke lenger et
  // separat "Husets favoritter"-avsnitt lenger ned på siden – denne
  // redaksjonelle utvalgs-seksjonen (styrt fra /admin/utvalg) overtar nå
  // navnet i stedet). Justert videre til "Våre favoritter" 11.09.2026
  // (ønsket av Henrik).
  "home.editorial.eyebrow": { no: "Våre favoritter", en: "Our favorites" },
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
  // Vises når retten ikke har noe lagret drikkeforslag ennå (recipes.drink_pairing
  // er null/tomt for vin) – se getRecipeDrinkPairingById i lib/actions/recipes.ts.
  // Henrik: "har jeg ikke lagt inn vin, får man heller ikke treff."
  "home.wine.foodNoPairing": {
    no: "Ingen vinanbefaling er lagt inn for denne retten ennå.",
    en: "No wine pairing has been added for this dish yet.",
  },
  "home.wine.ourPick": { no: "Vårt valg", en: "Our pick" },
  "home.wine.changeDish": { no: "Velg en annen rett", en: "Choose another dish" },
  // (27.09.2026) Henrik: "og vin delen på forsiden fungerer fortsatt uten
  // innlogging, det kan den ikke gjøre. man skal kunne velge rett feks,
  // men ikke få opp svaret" – se components/home/WinePairing.tsx. Selve
  // valget/beskrivelsen/bildet er fortsatt fritt, kun SVARET er låst.
  "home.wine.lockedMessage": {
    no: "Vinforslag er kun tilgjengelig når du er logget inn.",
    en: "Wine suggestions are only available when you're logged in.",
  },
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
    no: "Vurdert av AI ut fra beskrivelsen og oppskriftene i katalogen, ikke en absolutt fasit.",
    en: "Assessed by AI from the description and the recipes in the catalog, not an absolute answer.",
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
    no: "Ha i fløten og la sausen småkoke i 3-4 minutter til den tykner.",
    en: "Add the cream and let the sauce simmer for 3-4 minutes until it thickens.",
  },
  "home.cookMode.note": {
    no: "Skjermen holdes våken automatisk, og du kan styre stegene med stemmen. Ingen grunn til å taste inn koden med sausete fingre.",
    en: "The screen stays awake automatically, and you can move through the steps with your voice. No need to unlock your phone with saucy fingers.",
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
    no: "Søk på navn, ingrediens, kategori eller tag, eller bruk filtrene til å snevre inn.",
    en: "Search by name, ingredient, category or tag, or use the filters to narrow it down.",
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
  // Lenke til /mine-menyer (27.09.2026, ønsket av Henrik: "en knapp til
  // lagrede menyer må også være ved siden av 'bygg en meny selv'") –
  // bevisst plassert her og ikke i hovednavigasjonen, rett under
  // introteksten på /oppskrifter, siden det er der folk uansett blar i
  // retter. (03.10.2026) Søsterlenken "recipesPage.buildMealLink" til den
  // manuelle menybyggeren (/meny/ny) er fjernet sammen med hele den
  // funksjonen – denne lenken står nå alene.
  "recipesPage.savedMealsLink": { no: "Dine lagrede menyer", en: "Your saved menus" },

  "favoritesPage.title": { no: "Favoritter", en: "Favorites" },
  "favoritesPage.metaDescription": {
    no: "Dine lagrede favorittoppskrifter.",
    en: "Your saved favorite recipes.",
  },
  "favoritesPage.adminDescription": {
    no: "Oppskriftene du har markert som favoritt.",
    en: "The recipes you've marked as favorites.",
  },
  // (27.09.2026) Omdøpt fra "guest*" – favoritter for en innlogget,
  // ikke-admin bruker er nå kontobaserte (favorites-tabellen, på tvers av
  // enheter), ikke lenger localStorage. Se app/favoritter/page.tsx sin
  // AccountFavorites.
  "favoritesPage.accountDescription": {
    no: "Favorittene dine lagres på kontoen din, så de er tilgjengelige uansett hvilken enhet du logger inn fra.",
    en: "Your favorites are saved to your account, so they're available no matter which device you sign in from.",
  },
  "favoritesPage.adminEmptyTitle": { no: "Ingen favoritter ennå", en: "No favorites yet" },
  "favoritesPage.adminEmptyDescription": {
    no: "Trykk på hjertet på en oppskrift for å legge den til her.",
    en: "Tap the heart on a recipe to add it here.",
  },
  "favoritesPage.accountEmptyTitle": { no: "Ingen favoritter ennå", en: "No favorites yet" },
  "favoritesPage.accountEmptyDescription": {
    no: "Trykk på hjertet på en oppskrift for å lagre den her. Favorittene dine følger kontoen din på tvers av enheter.",
    en: "Tap the heart on a recipe to save it here. Your favorites follow your account across devices.",
  },

  // Se kommentaren ved nav.pantry over – samme rename, samme dato/grunn.
  "pantryPage.title": { no: "I kjøleskapet", en: "In the fridge" },
  "pantryPage.metaDescription": {
    no: "Fortell oss hva du har i kjøleskapet eller skapet, så finner vi oppskrifter du kan lage med det.",
    en: "Tell us what's in your fridge or pantry, and we'll find recipes you can make with it.",
  },
  "pantryPage.intro": {
    no: "Skriv inn eller ta bilde av det du har liggende, enten det er rester fra i går eller bare det som er i kjøleskapet, så finner vi oppskrifter som passer.",
    en: "Type in or take a photo of what you have on hand, whether it's leftovers from yesterday or just what's in the fridge, and we'll find recipes that fit.",
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
    no: "Fant ingen tydelige matvarer på bildet. Prøv et nærmere bilde, eller skriv inn selv.",
    en: "Couldn't clearly identify any food in the photo. Try a closer photo, or type them in yourself.",
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
  // 27.09.2026 (Henrik): "det må stå her" – pekte på selve intro-avsnittet
  // øverst på siden (app/handleliste/page.tsx), IKKE bare del-knappen
  // (shoppingPage.shareButton) lenger ned. Riktig sted uansett: dette
  // avsnittet vises alltid, også når listen er tom og selve del-knappen
  // (kun synlig når entries.length > 0, se ShoppingListView.tsx) derfor
  // ikke er der ennå.
  "shoppingPage.description": {
    no: "Lagres i denne nettleseren. Legg til flere ingredienser fra hvilken som helst oppskriftsside. Kan også deles videre til Notater, meldinger eller andre apper.",
    en: "Saved in this browser. Add more ingredients from any recipe page. Can also be shared to Notes, messages, or other apps.",
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
    no: "Basisvare (antatt at du har den fra før)",
    en: "Pantry staple (assumed you already have it)",
  },
  "shoppingPage.buyingTipLabel": { no: "Tips", en: "Tip" },
  "shoppingPage.removeAria": { no: "Fjern {name} fra handlelisten", en: "Remove {name} from the shopping list" },
  // Bruker telefonens/nettleserens EGEN delemeny (Web Share API) – Notater
  // (iPhone) er ett av valgene som dukker opp der, sammen med f.eks. Keep,
  // meldinger e.l. på Android. Ingen egen "lagre i Notater"-integrasjon
  // finnes (eller kan finnes fra en nettside) – se ShoppingListView.tsx.
  // Selve knappeteksten nevner "Notater" eksplisitt (27.09.2026, Henrik) –
  // knappen het tidligere bare "Del handleliste", som ikke ga noen
  // antydning om AT den faktisk kan sendes rett videre til f.eks. Notater.
  // Trygt å love dette i selve teksten siden knappen (se shareSupported i
  // ShoppingListView.tsx) uansett kun vises der Web Share faktisk finnes.
  "shoppingPage.shareButton": { no: "Del til Notater m.m.", en: "Share to Notes, etc." },
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
  // Humør-filter (03.10.2026) – se RecipeFilters.mood sin filheader i
  // lib/types.ts. Selve alternativene bruker MOOD_DEFINITIONS sine
  // EKSISTERENDE moodMode.*-nøkler over (quick/cozy/impress/crowd/healthy/
  // tasty) – ingen egne dupliserte tekster, kun denne ene nye
  // seksjonsoverskriften.
  "filter.mood": { no: "Humør", en: "Mood" },
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

  // (28.09.2026) CookModeTutorialOverlay.tsx (components/cook-mode-tutorial/)
  // – den guidede gjennomgangen man kommer inn i via "Utforsk Cook Mode" på
  // forsiden (components/home/CookModeShowcase.tsx), fremfor å lande direkte
  // på en tilfeldig, ekte oppskrift. Hvert par (Title/Body) hører til ETT
  // steg i tutorialen, som peker ut og forklarer én reell knapp i den ekte
  // CookMode.tsx (via data-cookmode-target-attributtene lagt til der samme
  // dag) – aldri en egen, påstått "fake" forklaring uten noe å peke på.
  "cookModeTutorial.introTitle": { no: "Dette er Cook Mode", en: "This is Cook Mode" },
  // introBody brukes ikke lenger av selve intro-steget (se introSubtitle/
  // introNote under) – ligger igjen kun fordi TutorialStep-typen krever en
  // bodyKey for alle steg, inkludert de to "framing"-stegene. Praktisk sett
  // ubrukt tekst; ikke fjern nøkkelen uten å også gjøre bodyKey valgfri.
  "cookModeTutorial.introBody": {
    no: "En kort gjennomgang av det du finner her – tar bare et halvt minutt.",
    en: "A quick look at what's here – it only takes half a minute.",
  },
  // De to linjene i den brede intro-kortvarianten (se CookModeTutorialOverlay.tsx
  // sin "framing"-gren) – subtitle er selve løftet, note er den lave,
  // dempede tidsangivelsen under.
  "cookModeTutorial.introSubtitle": {
    no: "Ett steg av gangen. Alt du trenger mens du lager mat.",
    en: "One step at a time. Everything you need while you cook.",
  },
  "cookModeTutorial.introNote": {
    no: "Vi viser deg hvordan det fungerer på under et minutt.",
    en: "We'll show you how it works in under a minute.",
  },
  "cookModeTutorial.start": { no: "Start omvisningen", en: "Start the tour" },
  // De to nye stegene fra redesign-runde 2 (28.09.2026) – selve den store
  // stegteksten midt i Cook Mode, og den automatiske tidtaker-knappen som
  // dukker opp når et steg har en tidsangivelse.
  "cookModeTutorial.stepTextTitle": { no: "Ett steg av gangen", en: "One step at a time" },
  "cookModeTutorial.stepTextBody": {
    no: "Her ser du bare det du skal gjøre akkurat nå.",
    en: "Here you only see what you need to do right now.",
  },
  "cookModeTutorial.timerAutoTitle": { no: "Tidtakeren er klar", en: "The timer is ready" },
  "cookModeTutorial.timerAutoBody": {
    no: "Når et steg krever tid, setter Cook Mode tiden for deg. Bare trykk for å starte.",
    en: "When a step needs time, Cook Mode sets it for you. Just tap to start.",
  },
  "cookModeTutorial.closeTitle": { no: "Ut når som helst", en: "Exit whenever you like" },
  "cookModeTutorial.closeBody": {
    no: "Denne knappen lukker Cook Mode og tar deg tilbake.",
    en: "This button closes Cook Mode and takes you back.",
  },
  "cookModeTutorial.progressTitle": { no: "Retten og fremdriften", en: "The dish and your progress" },
  "cookModeTutorial.progressBody": {
    no: "Her ser du hvilken rett du lager, og hvor langt du har kommet.",
    en: "This shows which dish you're making, and how far you've come.",
  },
  "cookModeTutorial.ingredientsTitle": { no: "Ingredienslisten", en: "The ingredient list" },
  "cookModeTutorial.ingredientsBody": {
    no: "Se hele ingredienslisten uten å forlate steget du står i.",
    en: "See the full ingredient list without leaving the step you're on.",
  },
  "cookModeTutorial.allStepsTitle": { no: "Alle steg", en: "All steps" },
  "cookModeTutorial.allStepsBody": {
    no: "Bla gjennom hele fremgangsmåten, og hopp rett til et bestemt steg.",
    en: "Browse the whole method, and jump straight to a specific step.",
  },
  "cookModeTutorial.timersTitle": { no: "Tidtakere", en: "Timers" },
  "cookModeTutorial.timersBody": {
    no: "Start tidtakere for steg som trenger det, og følg dem herfra.",
    en: "Start timers for steps that need them, and keep track of them here.",
  },
  "cookModeTutorial.voiceTitle": { no: "Talestyring", en: "Voice control" },
  "cookModeTutorial.voiceBody": {
    no: "Si «neste», «tilbake» eller «gjenta» – ingen grunn til å taste med sausete fingre.",
    en: "Say \"next\", \"previous\" or \"repeat\" – no need to tap with messy fingers.",
  },
  "cookModeTutorial.navTitle": { no: "Bla gjennom stegene", en: "Move through the steps" },
  "cookModeTutorial.navBody": {
    no: "Bruk disse knappene, piltastene på tastaturet, eller stemmen din.",
    en: "Use these buttons, the arrow keys, or your voice.",
  },
  "cookModeTutorial.outroTitle": { no: "Du er klar!", en: "You're all set!" },
  // (29.09.2026) Henrik, etter å ha gått gjennom hele demo-tutorialen selv:
  // "man får tutorial, også bli sendt til oppskrifter, også står det
  // ingenting om hva man skal trykke på for å åpne cook mode i en
  // oppskrift" – den forrige teksten sa bare "finn en ekte oppskrift",
  // uten å si HVA man faktisk skal trykke på der. Nevner nå knappen ved
  // navn ("Start matlaging" – recipeDetail.startCooking), samme sted den
  // faktisk står på en ekte oppskriftsside.
  "cookModeTutorial.outroBody": {
    no: "Sånn, nå kjenner du Cook Mode. Åpne en ekte oppskrift og trykk «Start matlaging» for å prøve den.",
    en: "That's it – now you know Cook Mode. Open a real recipe and press \"Start cooking\" to try it.",
  },
  "cookModeTutorial.exploreRecipes": { no: "Utforsk oppskrifter", en: "Explore recipes" },
  // (29.09.2026) "mode='recipe'"-varianten av outro-steget – vises når
  // tutorialen dukker opp over en EKTE oppskrifts Cook Mode (første gang,
  // se profiles.cook_mode_tutorial_completed) i stedet for demo-siden
  // /cook-mode. Da gir "utforsk oppskrifter" ingen mening (man har jo
  // allerede valgt én) – i stedet skal man rett i gang med den man valgte.
  "cookModeTutorial.outroTitleRecipe": { no: "Du er klar til å lage mat!", en: "You're ready to cook!" },
  "cookModeTutorial.outroBodyRecipe": {
    no: "Sånn, nå kjenner du Cook Mode. La oss lage denne retten.",
    en: "That's it – now you know Cook Mode. Let's make this dish.",
  },
  "cookModeTutorial.startCooking": { no: "Start matlaging", en: "Start cooking" },
  // Avkrysningsboksen i "mode='recipe'" (Henrik, 29.09.2026: "kan det være
  // nyttig at man kan huke av for at den ikke skal vises igjen, og at dette
  // huskes på profilen") – se markCookModeTutorialCompleted i
  // lib/actions/cook-mode-tutorial.ts.
  "cookModeTutorial.dontShowAgain": {
    no: "Ikke vis denne veiledningen igjen",
    en: "Don't show this guide again",
  },
  // "Utforsk Cook Mode"-siden (/cook-mode) for en bruker som allerede har
  // huket av "ikke vis igjen" på et ekte oppskrift-besøk – se
  // CookModeTutorialEntry.tsx. "vis den på nytt" MÅ finnes (Henrik,
  // 29.09.2026: "på 'utforsk cook mode' må man likevel ha muligheten til å
  // se den igjen dersom man ønsker det") – avkrysningen styrer kun om
  // tutorialen dukker opp AUTOMATISK ved ekte oppskrifter, ikke om man i
  // det hele tatt får se den igjen.
  "cookModeTutorial.alreadyCompletedTitle": {
    no: "Du har allerede fullført denne veiledningen",
    en: "You've already completed this guide",
  },
  // (29.09.2026) Henrik, etter å ha sett skjermbilde av denne meldingen:
  // "'Du valgte å ikke vise den igjen.' må fjernes fordi det ikke alltid
  // er noe man bevisst gjør" – flagget settes nå også AUTOMATISK ved å
  // fullføre demo-tutorialen (se exploreRecipes i CookModeTutorial.tsx),
  // ikke bare ved en bevisst avkrysning i mode="recipe", så en setning som
  // påstår et aktivt VALG stemmer ikke alltid. Nøytral tekst i stedet, uten
  // å påstå NOE om hvordan/hvorfor.
  "cookModeTutorial.alreadyCompletedBody": {
    no: "Du kan utforske oppskrifter, eller se gjennomgangen på nytt om du vil friske opp minnet.",
    en: "You can explore recipes, or watch the walkthrough again for a refresher.",
  },
  "cookModeTutorial.watchAgain": { no: "Vis den på nytt", en: "Watch it again" },
  "cookModeTutorial.close": { no: "Lukk", en: "Close" },
  "cookModeTutorial.next": { no: "Neste", en: "Next" },
  "cookModeTutorial.previous": { no: "Forrige", en: "Previous" },
  "cookModeTutorial.skip": { no: "Hopp over", en: "Skip" },
  "cookModeTutorial.finish": { no: "Ferdig", en: "Done" },
  "cookModeTutorial.pageTitle": { no: "Cook Mode", en: "Cook Mode" },

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
  // (29.09.2026) Den lille "vis tutorial igjen"-knappen i CookMode.tsx sin
  // header, se onShowTutorial-kommentaren der.
  "cookMode.showTutorialAria": { no: "Vis Cook Mode-veiledningen igjen", en: "Show the Cook Mode guide again" },
  "cookMode.voiceListening": {
    no: "Lytter … si «neste», «tilbake», «gjenta» eller «ferdig»",
    en: "Listening … say “next”, “back”, “repeat” or “done”",
  },
  // Øyeblikkelig bekreftelse i samme tekstlinje som cookMode.voiceListening
  // (23.09.2026 – se doc-kommentaren over useVoiceCommands for bakgrunnen:
  // uten dette trodde man ofte at mikrofonen ikke reagerte og gjentok
  // kommandoen flere ganger). Vises et par sekunder, så går den tilbake
  // til den vanlige "Lytter …"-teksten.
  "cookMode.voiceHeardNext": { no: "✓ Hørte: neste", en: "✓ Heard: next" },
  "cookMode.voiceHeardPrevious": { no: "✓ Hørte: tilbake", en: "✓ Heard: back" },
  "cookMode.voiceHeardRepeat": { no: "✓ Hørte: gjenta", en: "✓ Heard: repeat" },
  "cookMode.voiceHeardMarkDone": { no: "✓ Hørte: ferdig", en: "✓ Heard: done" },
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
    no: "Anslått varighet. Juster gjerne selv underveis.",
    en: "Estimated duration. Feel free to adjust as you go.",
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
  // Teksten avsluttet tidligere med en henvisning til en "Prøv et nytt
  // forslag"-knapp på oppskriftssiden – fjernet 11.09.2026 sammen med selve
  // knappen (se DrinkPairingSection.tsx sin kommentar der) siden den ikke
  // lenger ga et annet resultat. Samme nøkkel brukes også (uendret) i den
  // døde/umonterte MealWineSection.tsx – upåvirket siden den aldri vises.
  "wine.vinmonopoletDisclaimer": {
    no: "Produktnavn, bilde og pris er hentet direkte fra Vinmonopolets egen produktside akkurat nå, ikke et anslag. Katalogen skiller likevel ikke mellom aktive og utgåtte produkter, så sjekk gjerne at varen fortsatt er på lager på produktsiden.",
    en: "The product name, image, and price are fetched directly from Vinmonopolet's own product page right now, not an estimate. The catalog still doesn't distinguish active from discontinued products, so it's worth checking stock on the product page.",
  },
  "wine.vinmonopoletNewSuggestion": { no: "Prøv et nytt forslag", en: "Try a new suggestion" },
  // Vist når et admin-pinnet konkret Vinmonopolet-produkt (se
  // PinnedVinmonopoletProduct i lib/kitchen-intelligence/drink-pairing.ts)
  // ikke har noen egen, admin-skrevet begrunnelse – en generisk erstatning
  // for reasoning-feltet AI-søket ellers ville generert.
  "wine.pinnedReasoningFallback": { no: "Vårt konkrete forslag til denne retten.", en: "Our specific pick for this dish." },
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
  // se DrinkPairingSection.tsx. wine.vinmonopolet*/wine.match*-nøklene over
  // BRUKES FORTSATT herfra (vinprodukt-oppslag og "passer denne?"-
  // sjekkeren) – kun selve seksjonsrammen er ny.
  //
  // Flyttet 11.09.2026 fra en live AI-beregning (getDrinkPairing) til et
  // forhåndsgenerert admin-forslag (recipes.drink_pairing, se
  // generateDrinkPairing i lib/actions/recipes.ts) – "drikkePairing.button"
  // kaller derfor ikke lenger AI, den avslører bare det ferdige forslaget,
  // med en kort kunstig "sjekker"-forsinkelse (drinkPairing.loading gjenbrukt
  // uendret som denne "sjekker"-teksten) slik at det fortsatt føles som et
  // valg blir tatt idet knappen trykkes – se DrinkPairingSection.tsx.
  "drinkPairing.heading": { no: "Drikke til", en: "Drink pairing" },
  "drinkPairing.intro": {
    no: "Et forslag til hva du kan drikke til, tilpasset rettens smak.",
    en: "A suggestion for what to drink with it, matched to the dish's flavor.",
  },
  "drinkPairing.button": { no: "Få drikkeforslag", en: "Get drink suggestions" },
  "drinkPairing.loading": { no: "Sjekker …", en: "Checking …" },
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
  // (29.09.2026) Henrik: "jeg savner noen 'tilbake' knapper på siden som tar
  // deg tilbake ett hakk, rett dit du kom fra [...] kan man trykke på hver
  // rett i menyen, om jeg gjør det så ønsker jeg en knapp som tar meg rett
  // tilbake til menyen". Vises i STEDET for "Alle oppskrifter" øverst på en
  // oppskriftsside, kun når siden ble åpnet fra en meny (?fromMealId=…, se
  // MealView.tsx) – se app/oppskrifter/[slug]/page.tsx.
  "recipeDetail.backToMealLink": { no: "Tilbake til menyen", en: "Back to the menu" },
  // (28.09.2026) Samme mønster som backToMealLink over, for ukesmenyen –
  // Henrik: "man må kunne gå tilbake til ukesmenyen". Vises kun når siden
  // ble åpnet fra ukesmenyen (?fromWeeklyMenu=1, se WeeklyMenuView.tsx) –
  // se app/oppskrifter/[slug]/page.tsx.
  "recipeDetail.backToWeeklyMenuLink": { no: "Tilbake til ukesmenyen", en: "Back to the weekly menu" },
  "recipeDetail.imagePending": { no: "Bilde kommer", en: "Image coming" },
  // (26.09.2026, gjenopplivet 27.09.2026 mot ny konto-innlogging i stedet
  // for det gamle fellespassordet) "Teaser"-visningen av en oppskrift for
  // besøkende som ikke er logget inn (se RecipeTeaser.tsx) – kun toppen av
  // oppskriften (bilde/tittel/beskrivelse) er synlig, resten er faded til
  // svart med denne meldingen og knappen over.
  "recipeDetail.lockedMessage": {
    no: "Ingredienser og fremgangsmåte er kun synlig for dem som er logget inn.",
    en: "Ingredients and instructions are only visible to those who are logged in.",
  },
  "recipeDetail.lockedCta": { no: "Logg inn for å se resten", en: "Log in to see the rest" },
  // (27.09.2026) Generiske "låst"-tekster – se components/ui/LockedPanel.tsx.
  // Brukt av favoritter/handleliste/"I kjøleskapet"/"Bygg din egen meny",
  // som alle er kontoeksklusive (se prosjektnotatet "Plan: brukerkonto").
  "featureLocked.cta": { no: "Logg inn", en: "Log in" },
  "featureLocked.favoritesMessage": {
    no: "Favoritter er kun tilgjengelig når du er logget inn.",
    en: "Favorites are only available when you're logged in.",
  },
  "featureLocked.shoppingListMessage": {
    no: "Handlelisten er kun tilgjengelig når du er logget inn.",
    en: "The shopping list is only available when you're logged in.",
  },
  "featureLocked.pantryMessage": {
    no: "«I kjøleskapet» er kun tilgjengelig når du er logget inn.",
    en: "\"In the fridge\" is only available when you're logged in.",
  },
  "featureLocked.mealMessage": {
    no: "Meny-byggeren er kun tilgjengelig når du er logget inn.",
    en: "The menu builder is only available when you're logged in.",
  },
  "featureLocked.weeklyMenuMessage": {
    no: "Ukesmenyen er kun tilgjengelig når du er logget inn.",
    en: "The weekly menu is only available when you're logged in.",
  },
  // (26.09.2026, Henrik: "jeg vil at man skal kunne dele lenken til
  // oppskriften via snarveien på telefonen ... en liten knapp ved siden av
  // hjertet på oppskriftsiden hadde vært gull") – se ShareButton.tsx.
  "recipeDetail.share": { no: "Del oppskriften", en: "Share recipe" },
  "recipeDetail.linkCopied": { no: "Lenke kopiert", en: "Link copied" },
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

  // "Sterkhet"-badgen i heroen (se RecipeHero.tsx) – admin-satt styrkegrad
  // (1-3, vist som mild/medium/sterk via spiceLevelLabel() i
  // lib/utils/format.ts), lagt til 03.10.2026 som erstatning for den
  // tidligere "Smaksprofil"-seksjonen (hele tasteProfile.*-blokken som sto
  // her, samt components/recipe/TasteProfileDisplay.tsx og
  // lib/kitchen-intelligence/taste.ts, er fjernet – Henrik: "jeg tror vi
  // kan fjerne 'smaksprofil' den gir ingenting", se MERK-kommentaren i
  // lib/actions/recipes.ts). Opprinnelig et håndtegnet chili-ikon (se
  // git-historikken for components/ui/icons.tsx) – erstattet samme dag
  // med ren tekst + fargetone per nivå etter Henriks tilbakemelding om at
  // ikonet "ser helt feil ut". Nå en SYNLIG tekstlabel foran selve
  // nivå-ordet ("Sterkhet: Sterk"), ikke lenger bare aria-label/title.
  "recipeDetail.spicy": { no: "Sterkhet", en: "Spice level" },

  // Næringsinnhold (kalori-/makro-oversikt) – se
  // components/recipe/NutritionPanel.tsx og lib/kitchen-intelligence/nutrition.ts.
  // Bak en "vis"-knapp på oppskriftssiden, ikke alltid synlig – ønsket
  // eksplisitt av Henrik 25.08.2026.
  "nutrition.heading": { no: "Næringsinnhold", en: "Nutrition information" },
  "nutrition.show": { no: "Vis næringsinnhold", en: "Show nutrition information" },
  "nutrition.hide": { no: "Skjul næringsinnhold", en: "Hide nutrition information" },
  "nutrition.perServing": { no: "Per porsjon", en: "Per serving" },
  "nutrition.disclaimer": {
    no: "Estimert ut fra ingrediensene. Kan avvike noe fra faktisk innhold.",
    en: "Estimated from the ingredients. Actual values may vary slightly.",
  },
  "nutrition.calories": { no: "Kalorier", en: "Calories" },
  "nutrition.fat": { no: "Fett", en: "Fat" },
  "nutrition.saturatedFat": { no: "hvorav mettet fett", en: "of which saturates" },
  "nutrition.carbs": { no: "Karbohydrater", en: "Carbs" },
  "nutrition.sugar": { no: "hvorav sukkerarter", en: "of which sugars" },
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
  // Liten "eyebrow"-etikett over selve overskriften – gir MealBuilder en
  // tydelig CONVITE-identitet på oppskriftssiden (designforbedring
  // 31.08.2026, spesifikasjonens punkt 10), samme frase som den separate
  // "Gjør det til en kveld"-opplevelsen på /meny/[id] (se mealMood.heading
  // under) bruker – bevisst samme tone/språk begge steder, selv om dette
  // er to ulike funksjoner på to ulike sider.
  "mealBuilder.eyebrow": { no: "Gjør det til en kveld", en: "Make it an evening" },
  // Tekst endret 29.09.2026 (stor redesign-brief, se filheaderen i
  // MealBuilder.tsx) – tidligere "Bygg en meny rundt denne retten"/"Build a
  // menu around this dish". Ny tekst er bevisst mer editorial ("kveld", ikke
  // "meny") – matcher at overskriften nå står sammen med eyebrowen
  // "Gjør det til en kveld" som starten på et eget kapittel på siden, ikke
  // en beskrivelse av selve skjemaet under.
  "mealBuilder.heading": { no: "Bygg en kveld rundt retten.", en: "Build an evening around the dish." },
  // Tekst endret 29.09.2026 (samme brief) – nevner nå konkret forrett/
  // hovedrett/dessert (tidligere: "Vi legger opp til alt fra mat og drikke
  // til stemning og musikk."/"We plan everything from food and drink to
  // mood and music."). Den bredere kveldsopplevelsen (vinstil, stemning,
  // musikk – se EveningExperience.tsx) er fortsatt det "Gå videre" fører
  // til, men er ikke lenger nevnt her – denne ingressen beskriver nå kun
  // det selve MealBuilder-seksjonen faktisk gjør (setter sammen menyen).
  "mealBuilder.intro": {
    no: "Vi setter sammen forrett, hovedrett og dessert – og bygger resten av kvelden rundt menyen.",
    en: "We put together a starter, main course and dessert – and build the rest of the evening around the menu.",
  },
  // Anledning (5.12) / tilgjengelig tid (5.13) – valgfrie hint FØR selve
  // genereringen, se MealBuilder.tsx.
  "mealBuilder.occasionLabel": { no: "Anledning (valgfritt)", en: "Occasion (optional)" },
  // availableMinutesLabel/-Placeholder er ORPHANED 29.09.2026 – det gamle
  // fritekstfeltet ("Jeg har (minutter, valgfritt) f.eks. 60") er erstattet
  // av en pille-velger (mealBuilder.timeLabel + mealBuilder.timeOption.*
  // under). Nøklene er bevisst IKKE slettet (etablert konvensjon i denne
  // filen – se øvrige "vestigial"/orphaned nøkler), i tilfelle de trengs
  // igjen, men brukes ikke lenger i MealBuilder.tsx.
  "mealBuilder.availableMinutesLabel": { no: "Jeg har (minutter, valgfritt)", en: "I have (minutes, optional)" },
  "mealBuilder.availableMinutesPlaceholder": { no: "f.eks. 60", en: "e.g. 60" },
  // Ny pille-velger for tidsbudsjett (29.09.2026, erstatter fritekstfeltet
  // over). "Ingen grense" = availableMinutes: null (samme default/effekt
  // som å la det gamle feltet stå tomt). "2+ timer" sendes som 150 min til
  // generateMealPlan – se TIME_BUDGET_OPTIONS-kommentaren i
  // MealBuilder.tsx for resonnementet bak akkurat det tallet.
  "mealBuilder.timeLabel": { no: "Hvor mye tid har du?", en: "How much time do you have?" },
  "mealBuilder.timeOption.none": { no: "Ingen grense", en: "No limit" },
  "mealBuilder.timeOption.60": { no: "60 min", en: "60 min" },
  "mealBuilder.timeOption.90": { no: "90 min", en: "90 min" },
  "mealBuilder.timeOption.120plus": { no: "2+ timer", en: "2+ hours" },
  "mealBuilder.button": { no: "Bygg en meny", en: "Build a menu" },
  "mealBuilder.loading": { no: "Setter sammen menyen …", en: "Putting the menu together …" },
  "mealBuilder.error": {
    no: "Klarte ikke å bygge menyen akkurat nå. Prøv igjen.",
    en: "Couldn't build the menu right now. Please try again.",
  },
  // anchorBadge/existingBadge/suggestedBadge er ORPHANED i MealBuilder.tsx
  // selv siden 30.09.2026 (tilbakemelding: "mye renere og mer som et
  // elegant menykort enn et redigeringspanel" – CourseRow der viser ikke
  // lenger noen statustekster i det hele tatt). suggestedBadge brukes
  // fortsatt av MealView.tsx ("Nytt forslag" i retterlisten der), og
  // anchorBadge/existingBadge er ikke i bruk noe annet sted – alle tre er
  // bevisst IKKE slettet (etablert konvensjon i denne filen).
  "mealBuilder.anchorBadge": { no: "Retten du startet med", en: "The dish you started with" },
  "mealBuilder.existingBadge": { no: "Finnes i oppskriftsboken", en: "Already in your cookbook" },
  "mealBuilder.suggestedBadge": { no: "Nytt forslag", en: "New suggestion" },
  // Tekst endret 30.09.2026 (samme brief) fra "Foreslå en annen"/"Suggest
  // another" til en kortere handling – kun brukt i MealBuilder.tsx, trygt
  // å endre i selve verdien (ikke orphane en ny nøkkel) siden samme
  // knapp/samme funksjon (handleRegenerate) bare har fått kortere tekst.
  "mealBuilder.regenerate": { no: "Bytt rett", en: "Change dish" },
  "mealBuilder.regenerating": { no: "Finner et alternativ …", en: "Finding an alternative …" },
  // mealBuilder.remove/.removed er ORPHANED i MealBuilder.tsx selv siden
  // 30.09.2026 (samme brief – "fjern «fjern fra menyen» fra den permanente
  // visningen", se CourseRow-filheaderen i MealBuilder.tsx). Fortsatt i
  // aktiv bruk i MealView.tsx – IKKE endre denne teksten, kun
  // MealBuilder.tsx sin egen bruk av nøkkelen er fjernet.
  "mealBuilder.remove": { no: "Fjern fra menyen", en: "Remove from menu" },
  "mealBuilder.removed": {
    no: "Fjernet fra menyen.",
    en: "Removed from the menu.",
  },
  "mealBuilder.servingsLabel": { no: "Porsjoner", en: "Servings" },
  // Ny 30.09.2026 – enheten i MealBuilder.tsx sin nye FELLES
  // porsjonskontroll ("2 personer", se setAllServings der), som erstatter
  // den tidligere per-rett servingsLabel-varianten ("Porsjoner: X") i
  // akkurat denne komponenten. servingsLabel over er fortsatt i bruk i
  // MealView.tsx og uendret der.
  "mealBuilder.servingsUnit": { no: "personer", en: "people" },
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
  // Forkortet 30.09.2026 (fra "Nullstill og begynn på nytt"/"Reset and
  // start over") – samme knapp/handling (handleReset), bare kortere tekst
  // som del av opprydningen av den genererte menyvisningen.
  "mealBuilder.reset": { no: "Begynn på nytt", en: "Start over" },

  // (03.10.2026) manualMeal.*-nøklene (components/meal/ManualMealBuilder.tsx,
  // app/meny/ny/page.tsx – "Bygg en meny selv", der brukeren valgte ALLE
  // rettene selv) er fjernet herfra – hele den manuelle menybyggeren er
  // slettet (Henrik: "det er bare overflødig når man egentlig kan gjøre det
  // via oppskrifter uansett"). mealBuilder.* over er UENDRET og brukes
  // fortsatt av den AI-baserte menybyggeren (MealBuilder.tsx).

  // "Vinen din" – manuelt lagt til vin (10.09.2026), skilt fra AI-ens egen
  // vinSTIL-forslag for hele menyen (allerede live via EveningExperience.tsx/
  // getEveningCuration – se "mealPage.wine..." nedenfor for den delen).
  // Gjenbruker bevisst wine.photoAria/wine.analyzingPhoto/wine.photoError/
  // wine.retakePhoto direkte (samme foto-mønster som BeverageMatchChecker)
  // i stedet for å duplisere dem her.
  "mealWineInput.heading": { no: "Vinen din", en: "Your wine" },
  // (28.09.2026, 5. runde redesign av "Gjør det til en kveld") Ny, mer
  // invitterende etikett brukt SPESIFIKT der MealWineInput vises i
  // EveningExperience.tsx sitt "I GLASSET"-kapittel (høyre kolonne, ved
  // siden av AI-ens egen vinanbefaling) – se filheaderen der. Erstatter
  // IKKE "mealWineInput.heading" over, som fortsatt brukes i print-
  // oppsummeringen i MealView.tsx.
  "mealWineInput.ownWineHeading": { no: "Har du allerede en vin?", en: "Already have a wine?" },
  "mealWineInput.description": {
    no: "Skriv inn eller ta bilde av en vin du allerede har, så legger vi den til planen.",
    en: "Type in or photograph a wine you already have, and we'll add it to the plan.",
  },
  "mealWineInput.placeholder": { no: "F.eks. navnet på vinen", en: "e.g. the wine's name" },
  "mealWineInput.addButton": { no: "Legg til vin", en: "Add wine" },
  "mealWineInput.current": { no: "Vinen din: {name}", en: "Your wine: {name}" },
  "mealWineInput.change": { no: "Endre", en: "Change" },
  "mealWineInput.remove": { no: "Fjern vin", en: "Remove wine" },
  "mealWineInput.cancel": { no: "Avbryt", en: "Cancel" },

  // Den lagrede menysiden – app/meny/[id]/page.tsx.
  "mealPage.metaTitle": { no: "Din meny", en: "Your menu" },
  // "DIN MENY"-eyebrowen øverst på siden (27.09.2026-redesignet, se
  // MealView.tsx sin filheader) – samme tekst som metaTitle over, men en
  // egen nøkkel siden de to brukes til helt ulike ting (browser-tittel vs.
  // synlig eyebrow) og ikke nødvendigvis skal endres sammen senere.
  "mealPage.menuEyebrow": { no: "Din meny", en: "Your menu" },
  // Liten uppercase gull-eyebrow øverst i handlingskolonnen ved siden av
  // selve menyen (29.09.2026, 24. runde – Henrik: "Legg til en liten
  // uppercase gull-label øverst i høyrekolonnen: MENYVALG") – samme
  // formel/token som de andre eyebrowene i denne filen, se MealView.tsx.
  "mealPage.actionsEyebrow": { no: "Menyvalg", en: "Menu actions" },
  // Undertittel under "PLANLEGG KVELDEN"-eyebrowen (27.09.2026-redesignet).
  "mealPage.planSubtitle": {
    no: "Få alt klart til riktig tid.",
    en: "Get everything ready at the right time.",
  },
  // Diskret lenke i stedet for et permanent synlig, tomt beskrivelsesfelt
  // (27.09.2026-redesignet, se descriptionPlaceholder under for selve
  // feltets placeholder når det er åpent for redigering).
  "mealPage.addDescription": { no: "+ Legg til beskrivelse", en: "+ Add a description" },
  // Åpner porsjoner/"fjern fra menyen" per rett (27.09.2026-redesignet) –
  // egen nøkkel fremfor å gjenbruke recipeDetail.editButton, siden den er
  // knyttet til en helt annen handling (admin sin "rediger oppskrift"-
  // lenke). eveningExperience.whyHide ("Skjul") gjenbrukes for å lukke.
  "mealPage.editDish": { no: "Rediger", en: "Edit" },
  "mealPage.notFoundHeading": { no: "Fant ikke menyen", en: "Menu not found" },
  "mealPage.notFoundBody": {
    no: "Denne menyen finnes ikke på denne enheten. Menyer lagres kun lokalt i nettleseren de ble laget i.",
    en: "This menu doesn't exist on this device. Menus are only stored locally in the browser they were created in.",
  },
  "mealPage.emptyState": { no: "Denne menyen er tom.", en: "This menu is empty." },
  // Eksplisitt "Lagre menyen"-knapp (27.09.2026, se OMLAGT-avsnittet i
  // MealView.tsx sin filheader – Henrik: "det må være en knapp man
  // trykker på for å velge å lagre"). savedMealsPage.removeButton
  // gjenbrukes for "fjern"-lenken som vises etter lagring, IKKE en ny
  // nøkkel her – samme handling/tekst som på /mine-menyer selv.
  "mealPage.saveButton": { no: "Lagre menyen", en: "Save the menu" },
  "mealPage.savedLabel": { no: "Lagret", en: "Saved" },
  // Lenke tilbake til oppskriften menyen ble bygget rundt (26.08.2026,
  // Henrik: "på menysiden må man ha en mulighet til å gå tilbake til
  // oppskriften man kom fra") – se anchorSlot i MealView.tsx.
  "mealPage.backToRecipe": { no: "← Tilbake til {title}", en: "← Back to {title}" },
  // (29.09.2026, 19. runde – Henrik, med skjermbilde fra mobil: "i stedet
  // for hele navnet på retten kan det stå 'tilbake til oppskrift' feks")
  // – på mobil tok hele retteNAVNET (feks "Tilbake til Lammecarré med
  // potetgrateng, rødvinssjy & glasserte sjalottløk") ofte to linjer,
  // sammen med at skriv ut/lagre/handleliste-kolonnen falt ned under og
  // så rotete ut. Kort, fast tekst i stedet – ingen tittel-interpolering.
  "mealPage.backToRecipeShort": { no: "← Tilbake til oppskrift", en: "← Back to recipe" },
  // Kort, redaksjonell setning om menyen som helhet, under selve tittelen
  // (visuelt finpuss 31.08.2026) – se `description` i
  // lib/kitchen-intelligence/types.ts for hvorfor dette er et fritekstfelt
  // brukeren selv skriver, ikke AI-generert. Placeholder vises kun i selve
  // redigeringen (tomt felt er usynlig utenfor fokus, se MealView.tsx).
  "mealPage.descriptionPlaceholder": {
    no: "Legg gjerne til en kort setning om menyen …",
    en: "Add a short line about the menu …",
  },
  "mealPage.notesLabel": { no: "Notater", en: "Notes" },
  "mealPage.notesPlaceholder": {
    no: "Egne notater om menyen, f.eks. hvem som kommer, eller ting å huske …",
    en: "Your own notes about the menu, e.g. who's coming, or things to remember …",
  },
  "mealPage.suggestedDescriptionLabel": { no: "Om forslaget", en: "About the suggestion" },
  "mealPage.createFromSuggestion": { no: "Opprett som oppskrift", en: "Create as recipe" },

  // Oversikten over alle lagrede menyer – /mine-menyer,
  // components/meal/SavedMealsList.tsx (27.09.2026, ønsket av Henrik: "da
  // må den legge seg et eget sted for lagrede menyer"). Leser
  // useMealSessionIndex() (samme "mealIds"-register som allerede fantes,
  // se filheaderen der – bygget for akkurat dette, men aldri koblet inn i
  // noe UI før nå), rent lokalt/localStorage, ingen database. Fylles av
  // den AI-baserte menybyggeren (MealBuilder.tsx), som kaller addToIndex
  // ved lagring. (03.10.2026) Den manuelle menybyggeren
  // (ManualMealBuilder.tsx), som tidligere også fylte denne listen, er
  // fjernet.
  "savedMealsPage.metaTitle": { no: "Dine menyer", en: "Your menus" },
  "savedMealsPage.heading": { no: "Dine menyer", en: "Your menus" },
  "savedMealsPage.intro": {
    no: "Menyene du har satt sammen, samlet på ett sted.",
    en: "The menus you've put together, all in one place.",
  },
  "savedMealsPage.empty": {
    no: "Du har ikke lagret noen menyer ennå.",
    en: "You haven't saved any menus yet.",
  },
  // Vises for en meny der ALLE rettene er fjernet igjen (fortsatt en ekte,
  // lagret meny – se "Finnes ikke"-resonnementet i MealView.tsx sin
  // filheader for hvorfor tom ≠ ikke-lagret), ikke et feiltilfelle.
  "savedMealsPage.noDishes": { no: "Ingen retter lagt til ennå", en: "No dishes added yet" },
  // Fjerner KUN fra indeksen (useMealSessionIndex().removeFromIndex) – ikke
  // en bekreftelsesdialog, samme direkte "fjern"-mønster som
  // mealBuilder.remove andre steder i menybyggeren.
  "savedMealsPage.removeButton": { no: "Fjern menyen", en: "Remove menu" },

  // "Se lagrede ukesmenyer" (28.09.2026) – speiler savedMealsPage.* over,
  // se app/ukesmeny/lagrede/page.tsx og SavedWeeklyMenusList.tsx.
  "savedWeeklyMenusPage.metaTitle": { no: "Lagrede ukesmenyer", en: "Saved weekly menus" },
  "savedWeeklyMenusPage.heading": { no: "Lagrede ukesmenyer", en: "Saved weekly menus" },
  "savedWeeklyMenusPage.intro": {
    no: "Ukesmenyene du har lagret, samlet på ett sted.",
    en: "The weekly menus you've saved, all in one place.",
  },
  "savedWeeklyMenusPage.empty": {
    no: "Du har ikke lagret noen ukesmenyer ennå.",
    en: "You haven't saved any weekly menus yet.",
  },
  "savedWeeklyMenusPage.noDishes": { no: "Ingen retter i denne uken lenger", en: "No dishes left in this week" },
  "savedWeeklyMenusPage.useAgain": { no: "Bruk denne uken igjen", en: "Use this week again" },
  // Fjerner kun fra den lagrede lista (useSavedWeeklyMenus().removeMenu) –
  // ingen bekreftelsesdialog, samme direkte "fjern"-mønster som
  // savedMealsPage.removeButton over.
  "savedWeeklyMenusPage.removeButton": { no: "Fjern ukesmenyen", en: "Remove weekly menu" },

  // Menynivå-vin (Fase 5 – Experience, 5.6) – se
  // components/meal/MealWineSection.tsx og getMealWineRecommendation i
  // lib/actions/ai.ts. Gjenbruker de generiske "wine.vinmonopolet*"-nøklene
  // over for selve Vinmonopolet-oppslaget (samme tekst passer fint for
  // både én rett og en hel meny).
  "mealWine.heading": { no: "Vin til hele menyen", en: "Wine for the whole meal" },
  "mealWine.description": {
    no: "Få et vinforslag som tar hensyn til hele måltidet, ikke bare én rett.",
    en: "Get a wine suggestion that considers the whole meal, not just one dish.",
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
    no: "Få et forslag til stemning rundt måltidet: musikk, borddekning og tonen for kvelden.",
    en: "Get a mood suggestion for the meal: music, table setting and the tone for the evening.",
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

  // AUTOMATISK UKESMENY (29.09.2026) – se app/ukesmeny/page.tsx og
  // components/meal/WeeklyMenuView.tsx.
  "weeklyMenu.title": { no: "Ukesmeny", en: "Weekly menu" },
  "weeklyMenu.tagline": { no: "Fem middager. Én handleliste.", en: "Five dinners. One shopping list." },
  "weeklyMenu.description": {
    no: "Velg hva slags uke du vil ha. Vi setter sammen middagene fra mandag til fredag.",
    en: "Choose what kind of week you want. We'll put together the dinners from Monday to Friday.",
  },
  "weeklyMenu.generate": { no: "Lag ukesmenyen", en: "Create the weekly menu" },
  "weeklyMenu.regenerate": { no: "Lag en ny uke", en: "Make a new week" },
  "weeklyMenu.monday": { no: "Mandag", en: "Monday" },
  "weeklyMenu.tuesday": { no: "Tirsdag", en: "Tuesday" },
  "weeklyMenu.wednesday": { no: "Onsdag", en: "Wednesday" },
  "weeklyMenu.thursday": { no: "Torsdag", en: "Thursday" },
  "weeklyMenu.friday": { no: "Fredag", en: "Friday" },
  "weeklyMenu.viewRecipe": { no: "Se oppskrift", en: "View recipe" },
  "weeklyMenu.addButton": { no: "Legg uka i handlelisten", en: "Add the week to the shopping list" },
  "weeklyMenu.addLoading": { no: "Legger til …", en: "Adding …" },
  "weeklyMenu.addDone": { no: "Lagt til i handlelisten.", en: "Added to the shopping list." },
  "weeklyMenu.viewList": { no: "Se handlelisten", en: "View shopping list" },
  "weeklyMenu.notEnoughRecipes": {
    no: "Trenger minst {count} publiserte oppskrifter egnet for ukesmeny (se /admin/ukesmeny) for å kunne generere en uke. I dag er det for få.",
    en: "Needs at least {count} published recipes suited for the weekly menu (see /admin/ukesmeny) to generate a week. There aren't enough yet.",
  },
  "weeklyMenu.styleHeading": { no: "Hva slags uke vil du ha?", en: "What kind of week do you want?" },
  "weeklyMenu.style.variert": { no: "Variert", en: "Varied" },
  "weeklyMenu.style.sunt_enkelt": { no: "Sunt og enkelt", en: "Healthy & simple" },
  "weeklyMenu.style.rask": { no: "Rask uke", en: "Quick week" },
  "weeklyMenu.style.familievennlig": { no: "Familievennlig", en: "Family-friendly" },
  "weeklyMenu.style.litt_ekstra": { no: "Litt ekstra", en: "A little extra" },
  // "Kun vegetar" (01.10.2026, Henrik: "på ukesmeny bør man egentlig ha en
  // knapp 'Kun vegetar'") – egen pille ved siden av stil-pillene, se
  // computePool() i WeeklyMenuView.tsx.
  "weeklyMenu.vegetarianOnly": { no: "Kun vegetar", en: "Vegetarian only" },
  "weeklyMenu.swap": { no: "Bytt ut", en: "Swap" },
  "weeklyMenu.swapAria": { no: "Bytt ut retten for {day}", en: "Swap the dish for {day}" },
  // Dra-for-å-bytte-hint (04.10.2026) – kort forklaringstekst over
  // dagskortene, kun synlig på desktop (hidden lg:block i WeeklyMenuView.tsx,
  // se filheaderen der for hvorfor funksjonen kun er mus/penn i praksis).
  // Teksten sier ikke selv "på datamaskin" (Henrik: "du trenger ikke skrive
  // på datamaskin, fordi den teksten kommer uansett bare opp på
  // datamaskin") – lg:block-synligheten ALENE garanterer konteksten.
  "weeklyMenu.dragHint": {
    no: "Tips: dra et dagskort over et annet for å bytte dem.",
    en: "Tip: drag a day card onto another to swap them.",
  },
  // Speilvendt hint for mobil (04.10.2026, Henrik: "legg til en tilsvarende
  // tekst på telefon: Trykk på pilene for å bytte plass") – lg:hidden,
  // altså synlig akkurat der dragHint over er skjult.
  "weeklyMenu.movePillsHint": { no: "Tips: trykk på pilene for å bytte plass.", en: "Tip: tap the arrows to swap places." },
  // Flytt opp/ned-piler (04.10.2026) – touch-vennlig erstatning for
  // dra-og-bytt, kun synlig under lg (lg:hidden) i WeeklyMenuView.tsx.
  "weeklyMenu.moveUpAria": { no: "Bytt {day} med dagen over", en: "Swap {day} with the day above" },
  "weeklyMenu.moveDownAria": { no: "Bytt {day} med dagen under", en: "Swap {day} with the day below" },
  // "Lagre ukesmeny" + "Se lagrede ukesmenyer" (28.09.2026, Henrik: "jeg
  // mener også å ha en 'lagre ukesmeny' og 'se lagrede ukesmenyer'") –
  // speiler mealPage.saveButton/savedLabel og recipesPage.savedMealsLink,
  // se lib/hooks/useSavedWeeklyMenus.ts for hele bakgrunnen.
  "weeklyMenu.save": { no: "Lagre ukesmenyen", en: "Save the weekly menu" },
  "weeklyMenu.savedLabel": { no: "Lagret", en: "Saved" },
  "weeklyMenu.savedMenusLink": { no: "Se lagrede ukesmenyer", en: "View saved weekly menus" },

  // "HELG & GJESTER" (03.10.2026) – kuratert inspirasjonsside, se
  // app/helg-og-gjester/page.tsx og WeekendGuestsClient.tsx. Bevisst EGEN
  // nøkkelfamilie fra weeklyMenu.* over, selv om de to sidene ligger ved
  // siden av hverandre i hovednavigasjonen – Henrik var eksplisitt på at
  // dette IKKE skal fungere/føles som Ukesmeny (ingen generering, kun et
  // kuratert, filtrerbart utvalg).
  "weekendGuests.title": { no: "Helg & gjester", en: "Weekend & guests" },
  "weekendGuests.tagline": { no: "Noen måltider fortjener litt mer.", en: "Some meals deserve a little more." },
  "weekendGuests.description": {
    no: "Retter for lange middager, gode glass og folk du har lyst til å bli sittende med.",
    en: "Dishes for long dinners, good glasses, and people you want to linger with.",
  },
  // "Alle" + de fem faste anledningene – se WEEKEND_GUESTS_OCCASION_DEFINITIONS
  // i lib/kitchen-intelligence/weekend-guests.ts. Pille-filterrad rett under
  // introen, "Alle" valgt som standard, ingen bekreft-knapp (filtrerer
  // direkte ved valg, se WeekendGuestsClient.tsx).
  "weekendGuests.occasion.alle": { no: "Alle", en: "All" },
  "weekendGuests.occasion.fredagskveld": { no: "Fredagskveld", en: "Friday night" },
  "weekendGuests.occasion.date_night": { no: "Date night", en: "Date night" },
  "weekendGuests.occasion.venner_pa_middag": { no: "Venner på middag", en: "Friends for dinner" },
  "weekendGuests.occasion.sondagsmiddag": { no: "Søndagsmiddag", en: "Sunday dinner" },
  "weekendGuests.occasion.feiring": { no: "Feiring", en: "Celebration" },
  // Liten eyebrow-heading over den store, editorielle enkelt-retten rett
  // under hero/filterområdet – se WeekendGuestsFeatured.tsx.
  "weekendGuests.featuredEyebrow": { no: "Utvalgt", en: "Featured" },
  "weekendGuests.viewRecipe": { no: "Se oppskriften →", en: "View the recipe →" },
  "weekendGuests.makeItANight": { no: "Gjør det til en kveld →", en: "Make it a night →" },
  // Overskrift for rutenettet under den featured-retten – én per
  // anledning (inkl. "alle"), slik at teksten faktisk beskriver det
  // aktive filteret (Henrik 03.10.2026: "når det er 'alle' kan det stå
  // 'Retter for helg & gjester', men hvis jeg trykker på 'Date night' så
  // må det stå 'Retter som passer til date night'"). Nøklene er navngitt
  // "weekendGuests.gridHeading.<id>" der <id> er nøyaktig samme streng som
  // ALL_OCCASIONS_FILTER ("alle") eller WeekendGuestsOccasionId-verdiene i
  // weekend-guests.ts, se WeekendGuestsClient.tsx sin bruk av
  // `weekendGuests.gridHeading.${activeOccasion}` som DictKey (fungerer
  // fordi activeOccasion er typet som en union av akkurat disse literalene,
  // ikke en generell `string`).
  "weekendGuests.gridHeading.alle": { no: "Retter for helg & gjester", en: "Dishes for weekends & guests" },
  "weekendGuests.gridHeading.fredagskveld": {
    no: "Retter som passer til fredagskveld",
    en: "Dishes for Friday night",
  },
  "weekendGuests.gridHeading.date_night": { no: "Retter som passer til date night", en: "Dishes for a date night" },
  "weekendGuests.gridHeading.venner_pa_middag": {
    no: "Retter som passer når venner kommer på middag",
    en: "Dishes for when friends come for dinner",
  },
  "weekendGuests.gridHeading.sondagsmiddag": {
    no: "Retter som passer til søndagsmiddag",
    en: "Dishes for Sunday dinner",
  },
  "weekendGuests.gridHeading.feiring": { no: "Retter som passer til en feiring", en: "Dishes for a celebration" },
  // "Tilbake"/"Neste"-sidenavigasjon under rutenettet (04.10.2026, Henrik,
  // etter et første forsøk med én "Se alle"-knapp: "da blir det så
  // fryktelig mange plutselig, så 'neste' [...] har man trykket neste, så
  // må man kunne gå tilbake også") – vises KUN når aktivt filter har mer
  // enn én side (WEEKEND_GUESTS_GRID_PAGE_SIZE per side), se
  // WeekendGuestsClient.tsx. Hver knapp deaktiveres (ikke skjules) når det
  // ikke er noen forrige/neste side.
  "weekendGuests.gridPrevious": { no: "Tilbake", en: "Back" },
  "weekendGuests.gridNext": { no: "Neste", en: "Next" },
  "weekendGuests.emptyForOccasion": {
    no: "Ingen retter er lagt til under denne anledningen ennå.",
    en: "No dishes have been added under this occasion yet.",
  },
  "weekendGuests.emptyGeneral": {
    no: "Vi har ikke lagt til noen retter i Helg & gjester ennå.",
    en: "No dishes have been added to Weekend & guests yet.",
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
  // (28.09.2026) Ny, kort undertittel rett under entryHeading – del av den
  // store tre-segment-redesignet av /meny/[id] (DIN MENY mørk / PLANLEGG
  // KVELDEN lys kremflate / GJØR DET TIL EN KVELD eget mørkt univers), se
  // filheaderne i MealView.tsx og EveningExperience.tsx.
  "eveningExperience.entrySubtitle": { no: "Alt rundt bordet.", en: "Everything around the table." },
  "eveningExperience.entryDescription": {
    no: "Vin, bord, stemning og musikk, kuratert rundt akkurat denne menyen.",
    en: "Wine, table, mood and music, curated around this exact menu.",
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
  // (27.09.2026) Henrik: "jeg får ikke sett noen av guidene uten å være
  // logget inn" – se app/hvordan-gjor-jeg-det/[slug]/page.tsx.
  "guides.lockedMessage": {
    no: "Denne guiden er kun synlig for dem som er logget inn.",
    en: "This guide is only visible to those who are logged in.",
  },
  "guides.lockedCta": { no: "Logg inn for å se guiden", en: "Log in to see the guide" },
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
  // (27.09.2026) Henrik: "'i sesong' må også være bak innlogging" – se
  // app/sesong/page.tsx og app/sesong/[slug]/page.tsx.
  "seasonPage.lockedMessage": {
    no: "Sesongguiden er kun synlig for dem som er logget inn.",
    en: "The season guide is only visible to those who are logged in.",
  },
  "seasonPage.lockedCta": { no: "Logg inn for å se sesongen", en: "Log in to see what's in season" },

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

  // Forsideteaser (spesifikasjon punkt 6). "Hva skal vi spise?"-teaseren som
  // sto her ved siden av er fjernet 26.09.2026 (hele funksjonen fjernet).
  "home.seasonTeaser.eyebrow": { no: "I sesong nå", en: "In season now" },
  "home.seasonTeaser.cta": { no: "Se hva som er i sesong", en: "See what's in season" },

  // Nav-lenke (se Header.tsx).
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
