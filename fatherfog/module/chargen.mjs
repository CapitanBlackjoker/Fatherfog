/**
 * Fatherfog Character Creation Wizard
 * Guides the player through the official 9-step process from the rulebook
 * and leaves a fully playable character sheet ready for Foundry VTT.
 */

import { FatherfogCharacterSheet } from "./sheets/character-sheet.mjs";

/* ------------------------------------------------------------------ */
/*  Static tables (from rulebook)                                     */
/* ------------------------------------------------------------------ */

const CLOAK_TABLE = [
  { roll: 1, color: "Black",  meaning: { en: "Death, deception, stealth, solitude", ca: "Mort, engany, furtivitat, solitud" } },
  { roll: 2, color: "Red",    meaning: { en: "Passion, love, anger, courage, danger", ca: "Passió, amor, ira, coratge, perill" } },
  { roll: 3, color: "Orange", meaning: { en: "Energy, boldness, youth, curiosity, comfort", ca: "Energia, audàcia, joventut, curiositat, comoditat" } },
  { roll: 4, color: "Yellow", meaning: { en: "Obscured sun, hope, attention, warmth, Coin, fun", ca: "Sol ocult, esperança, atenció, calor, Coin, diversió" } },
  { roll: 5, color: "Green",  meaning: { en: "Life, vitality, fertility, speed, nature", ca: "Vida, vitalitat, fertilitat, velocitat, natura" } },
  { roll: 6, color: "Blue",   meaning: { en: "Peace, tranquility, mindfulness, intelligence", ca: "Pau, tranquil·litat, consciència, intel·ligència" } },
  { roll: 7, color: "Purple", meaning: { en: "Royalty, mystery, the unknown, luxury", ca: "Reialesa, misteri, el desconegut, luxe" } },
  { roll: 8, color: "Grey",   meaning: { en: "Fog at night, solemnity, despair, detachment", ca: "Boira de nit, solemnitat, desesperació, despreniment" } },
  { roll: 9, color: "White",  meaning: { en: "Fool, innocence, purity, bliss", ca: "Necí, innocència, puresa, beatitud" } },
  { roll: 10, color: "Brown", meaning: { en: "Commoner, people, dirt, practicality, grit", ca: "Poble, gent, terra, practicitat, embranzida" } }
];

// Brooch table: bilingual
const BROOCH_TABLE = [
  { en: "Personal", ca: "Personal" },
  { en: "Melting Sword & Shield", ca: "Espasa i escut que es fonen" },
  { en: "Red Blood Drop, Laughing", ca: "Got de sang vermell, rient" },
  { en: "Bleeding Shirt", ca: "Camisa sagnant" },
  { en: "Flying Eagle", ca: "Àguila volant" },
  { en: "Mother Nursing an Infant", ca: "Mare alletant un infant" },
  { en: "Black Oval with Two Golden Eyes", ca: "Oval negre amb dos ulls daurats" },
  { en: "Gross Face", ca: "Cara desagradable" },
  { en: "Village on Fire", ca: "Poble en flames" },
  { en: "Man Vomiting Coin", ca: "Home que vomita monedes" },
  { en: "X on Excrement", ca: "X sobre excrement" },
  { en: "Campfire", ca: "Foguera" },
  { en: "A Face Smiling Too Big", ca: "Una cara que somriu massa" },
  { en: "Two Naked People Kissing", ca: "Dues persones nues fent-se un petó" },
  { en: "Jolly Roger", ca: "Bandera pirata" },
  { en: "Helmet with Horns", ca: "Casc amb banyes" },
  { en: "Sabertooth Skull", ca: "Crani de dents de sabre" },
  { en: "Ace of Spades", ca: "As de pics" },
  { en: "Queen of Hearts", ca: "Reina de cors" },
  { en: "Brass Wrench", ca: "Clau anglesa de llautó" },
  { en: "Heart within a Brain", ca: "Cor dins d'un cervell" },
  { en: "Explosion", ca: "Explosió" },
  { en: "Blunderbuss", ca: "Trabuc" },
  { en: "Tied Hands", ca: "Mans lligades" },
  { en: "Snake Fangs, Dripping", ca: "Ullals de serp, degotant" },
  { en: "Green Longleaf", ca: "Fulla llarga verda" },
  { en: "A Queen Farming", ca: "Una reina conreant" },
  { en: "Tea Kettle", ca: "Tetera" },
  { en: "Headless, Heartless Corpse", ca: "Cadàver sense cap ni cor" },
  { en: "Pyramid", ca: "Piràmide" },
  { en: "The Fool (Tarot Card)", ca: "El boig (carta del tarot)" },
  { en: "Hand with a Needle as the Middle Finger", ca: "Mà amb una agulla com a dit del mig" },
  { en: "Two Dogs in Armor", ca: "Dos gossos amb armadura" },
  { en: "Knuckle Dusters", ca: "Trencaossos" },
  { en: "Three-Legged Man Running", ca: "Home de tres cames corrent" },
  { en: "Old Man with a Cane", ca: "Vell amb un bastó" },
  { en: "Mechanical Fox", ca: "Guineu mecànica" },
  { en: "An Angry Cat", ca: "Un gat enfadat" },
  { en: "Cherub", ca: "Querubí" },
  { en: "Hand Mirror", ca: "Mirall de mà" },
  { en: "Double Cherry", ca: "Cirera doble" },
  { en: "Spider", ca: "Aranya" },
  { en: "The Sun Making a Sour Face", ca: "El sol fent una cara agra" },
  { en: "Emerging from the Ground", ca: "Emergint de la terra" },
  { en: "Moon", ca: "Lluna" },
  { en: "Bull's Head", ca: "Cap de toro" },
  { en: "Two Scythes Behind a Skull", ca: "Dues falçs darrere d'un crani" },
  { en: "Two Crossed Pistols", ca: "Dues pistoles creuades" },
  { en: "Lightning Bolt", ca: "Llamp" },
  { en: "Green-Eyed Rat", ca: "Rata d'ulls verds" },
  { en: "Crossed Hammers with Wings", ca: "Martells creuats amb ales" },
  { en: "Silver Spoon", ca: "Cullera de plata" },
  { en: "Plump Cake with Icing", ca: "Pastís rodanxó amb glacé" },
  { en: "Sailing Ship", ca: "Vaixell de vela" },
  { en: "An Arrow", ca: "Una fletxa" },
  { en: "Piercing a Dove", ca: "Travessant un colom" },
  { en: "Two Hands Shaking", ca: "Dues mans encaixant" },
  { en: "Skull with a Woman for Brains", ca: "Crani amb una dona per cervell" },
  { en: "Poker Hand: Aces Full of 8's", ca: "Mà de pòquer: full d'asos amb vuits" },
  { en: "One Word: \"Revenge\"", ca: "Una paraula: «Venjança»" },
  { en: "An Open Book", ca: "Un llibre obert" },
  { en: "Ball of Spikes", ca: "Bola de punxes" },
  { en: "Three Merging Hearts", ca: "Tres cors que es fusionen" },
  { en: "Winking Demon", ca: "Dimoni que pica l'ullet" },
  { en: "Bomb with Burnt Fuse", ca: "Bomba amb metxa cremada" },
  { en: "Die (Snake Eyes)", ca: "Dau (ulls de serp)" },
  { en: "The Magician (Tarot Card)", ca: "El mag (carta del tarot)" },
  { en: "Stack of Flapjacks", ca: "Pila de creps" },
  { en: "Hawk Holding a Snake Eating a Mouse Holding Cheese", ca: "Falcó amb una serp que menja un ratolí amb formatge" },
  { en: "The Devil (Tarot)", ca: "El diable (tarot)" },
  { en: "Howling Wolf", ca: "Llop udolant" },
  { en: "Familial Crest", ca: "Escut familiar" },
  { en: "Red Tree Growing in a Pond", ca: "Arbre vermell creixent en un estany" },
  { en: "Burning Boar", ca: "Senglar en flames" },
  { en: "Rotting and Infested Fruit", ca: "Fruita podrida i infestada" },
  { en: "Blind Badger", ca: "Teixó cec" },
  { en: "Actual Sundial", ca: "Rellotge de sol de debò" },
  { en: "Dice (Boxcars)", ca: "Daus (dobles sis)" },
  { en: "Family with One Shaded Figure", ca: "Família amb una figura ombrejada" },
  { en: "Bronze Screw", ca: "Cargol de bronze" },
  { en: "Daggers in a Figure's Back", ca: "Dagues a l'esquena d'una figura" },
  { en: "Man Dressed as a Sheep", ca: "Home vestit d'ovella" },
  { en: "A Sheep Eating Porridge", ca: "Una ovella menjant farinetes" },
  { en: "Bound & Gagged King", ca: "Rei lligat i amordassat" },
  { en: "Pipe-Smoking Hare", ca: "Llebre fumant en pipa" }
];

const TRINKET_TABLE = [
  { en: "Personal", ca: "Personal" },
  { en: "Strange Insect Carcass", ca: "Cadàver d'insecte estrany" },
  { en: "Blood-Stained Poker Chip", ca: "Fitxa de pòquer tacada de sang" },
  { en: "Small Glowing Pebble", ca: "Pedreta petita que brilla" },
  { en: "Dried Husk Doll", ca: "Nina de closca seca" },
  { en: "Pressed Flower", ca: "Flor premsada" },
  { en: "Necklace of Various Teeth", ca: "Collaret de diverses dents" },
  { en: "Rusted Gear", ca: "Engranatge rovellat" },
  { en: "Pocket-Sized Painting of an Eye", ca: "Pintura de butxaca d'un ull" },
  { en: "Embroidered Handkerchief", ca: "Mocador brodat" },
  { en: "Bone Knife", ca: "Ganivet d'os" },
  { en: "Notably Large Dead Spider", ca: "Aranya morta notablement gran" },
  { en: "Heirloom Necklace", ca: "Collaret d'herència" },
  { en: "Mechanical Music Box", ca: "Caixa de música mecànica" },
  { en: "Bottle of Snake Oil", ca: "Ampolla d'oli de serp" },
  { en: "Pouch of Purple Powder", ca: "Bossa de pólvora lila" },
  { en: "Journal of Coal Sketches", ca: "Diari d'esbossos al carbó" },
  { en: "Bent Measuring Tool", ca: "Eina de mesura torçada" },
  { en: "Unidentified Animal Foot", ca: "Peu d'animal no identificat" },
  { en: "Cracked Ring", ca: "Anell esquerdat" },
  { en: "Old Wanted Poster", ca: "Cartell de cerca i captura vell" },
  { en: "A Pair of Baby Shoes", ca: "Un parell de sabates de nadó" },
  { en: "Animal Skull, One Eye, Several Spikes", ca: "Crani d'animal, un ull, diverses punxes" },
  { en: "Dented Flask", ca: "Flascó abonyegat" },
  { en: "Child's Wooden Toy", ca: "Joguina de fusta d'infant" },
  { en: "Curved Handle", ca: "Mànec corbat" },
  { en: "Eerie Mask", ca: "Màscara inquietant" },
  { en: "Smooth Stone", ca: "Pedra llisa" },
  { en: "Bone Dice", ca: "Daus d'os" },
  { en: "Worn Tarot Cards", ca: "Cartes del tarot gastades" },
  { en: "Pouch of Small Bones", ca: "Bossa d'ossos petits" },
  { en: "Ashes (Human)", ca: "Cendres (humanes)" },
  { en: "Ball of String", ca: "Bola de cordill" },
  { en: "Engraved Plate: Two Wolves Dancing", ca: "Placa gravada: dos llops ballant" },
  { en: "Powdered Nuts", ca: "Fruits secs en pols" },
  { en: "Broken Ring", ca: "Anell trencat" },
  { en: "Torn Piece of a Blueprint", ca: "Tros estripat d'un plànol" },
  { en: "Waterlogged Book", ca: "Llibre xopat" },
  { en: "Key", ca: "Clau" },
  { en: "Tablet Depicting a Dog", ca: "Tauleta que representa un gos" },
  { en: "Metal Token", ca: "Fitxa de metall" },
  { en: "Bright Blue Twigs", ca: "Branquetes blau brillant" },
  { en: "Tablet Depicting Stars", ca: "Tauleta que representa estrelles" },
  { en: "Carving of an Excited Man", ca: "Talla d'un home emocionat" },
  { en: "Pendant with Shell Fragments", ca: "Penjoll amb fragments de petxina" },
  { en: "Metal Toothpick", ca: "Furgadents de metall" },
  { en: "Gloves, Leather (Unknown Hide)", ca: "Guants de cuir (pell desconeguda)" },
  { en: "Book Written in Unknown Language", ca: "Llibre escrit en llengua desconeguda" },
  { en: "Metal Cube", ca: "Cub de metall" },
  { en: "Handcuffs", ca: "Manilles" },
  { en: "Journal: Family Curses", ca: "Diari: malediccions familiars" },
  { en: "Engraved Longleaf Case", ca: "Estoig de fulla llarga gravat" },
  { en: "Ball of Wool", ca: "Bola de llana" },
  { en: "Pinwheel", ca: "Molinet de vent" },
  { en: "Powdered Horn", ca: "Banya en pols" },
  { en: "Small Potted Tree", ca: "Arbre petit en test" },
  { en: "Ornamental Wooden Club", ca: "Massa de fusta ornamental" },
  { en: "Paw Print Fossil", ca: "Fòssil d'empremta de pota" },
  { en: "Performance Enhancing Walnut", ca: "Nou potència-rendiment" },
  { en: "Patched Pantaloons", ca: "Pantalons amb pedaços" },
  { en: "Thing Sealed in a Murky Jar", ca: "Cosa segellada en un pot tèrbol" },
  { en: "10x10 Quilt", ca: "Edredó 10x10" },
  { en: "Taxidermied Rat", ca: "Rata dissecada" },
  { en: "Sharpened Butter Knife Shiv", ca: "Punyal de ganivet de mantega esmolat" },
  { en: "Silver Spoon", ca: "Cullera de plata" },
  { en: "Pith Helmet", ca: "Casc colonial" },
  { en: "Bottle of Molasses", ca: "Ampolla de melassa" },
  { en: "Embroidered Cloth Cap", ca: "Gorra de tela brodada" },
  { en: "A Deck of Playing Cards", ca: "Una baralla de cartes" },
  { en: "Beaded Waist Cord", ca: "Cordó de cintura amb comptes" },
  { en: "Ocarina", ca: "Ocarina" },
  { en: "Soap", ca: "Sabó" },
  { en: "Hygiene Rag", ca: "Drap d'higiene" },
  { en: "Brass Button", ca: "Botó de llautó" },
  { en: "Dull Utility Hook", ca: "Ganxo d'utilitat esmussat" },
  { en: "Gnarled Stick", ca: "Bastó nudos" },
  { en: "Kettle with Extra Long Spout", ca: "Tetera amb broc molt llarg" },
  { en: "Desiccated Finger", ca: "Dit dessecat" },
  { en: "Brass Pincers (Tweezers)", ca: "Pinces de llautó" },
  { en: "Bronze Screw", ca: "Cargol de bronze" },
  { en: "Rolled Longleaf", ca: "Fulla llarga enrotllada" },
  { en: "Sheepshead Hat", ca: "Barret de cap d'ovella" },
  { en: "Tablet Depicting a Pretty Woman", ca: "Tauleta que representa una dona maca" },
  { en: "Wooden Spanking Paddle", ca: "Pala de fusta" },
  { en: "Ornate Hair Brush", ca: "Raspall de cabell ornamentat" },
  { en: "Taxidermied Ears of a Hare", ca: "Orelles de llebre dissecades" }
];

/** Coin stories: bilingual; Catalan uses «monedes», never «Coin» */
const COIN_TABLE = [
  { amount: 100, story: { en: "You discovered a cache of teeth in the woods; an odd person bought them for a hefty sum.", ca: "Vas trobar un amagatall de dents al bosc; una persona estranya te'ls va comprar per una quantitat generosa." } },
  { amount: 5,   story: { en: "Bankrupt except for the single coin you carry after spending too much time honing skills.", ca: "En fallida tret de l'única moneda que portes després de dedicar massa temps a perfeccionar habilitats." }, skillPoints: 5 },
  { amount: 6,   story: { en: "Burglars came but failed to find you. All you have left is what was in your pockets.", ca: "Van venir lladres però no et van trobar. Només et queda el que tenies a les butxaques." }, skill: "hiding" },
  { amount: 8,   story: { en: "An old blind man in a pointy hat paid you to read a book to him.", ca: "Un vell cec amb barret punxegut et va pagar perquè li llegissis un llibre." }, skill: "literacy" },
  { amount: 10,  story: { en: "Your amateurish attempts to brew potions failed to turn a profit.", ca: "Els teus intents aficionats de preparar pocions no van donar beneficis." }, skill: "alchemy" },
  { amount: 12,  story: { en: "You once caught a fish and released it. The fish came back and spat coins at you.", ca: "Vas atrapar un peix i el vas alliberar. El peix va tornar i et va escopir monedes." }, skill: "fishing" },
  { amount: 14,  story: { en: "You offered to tame and handle any beast. The unprofitable venture taught you Animals.", ca: "Vas oferir-te a domar i manejar qualsevol bèstia. L'aventura poc rendible et va ensenyar Animals." }, skill: "animals" },
  { amount: 16,  story: { en: "Your novice attempts at jestering provided coin and the Performance skill.", ca: "Els teus intents de bufó et van proporcionar monedes i l'habilitat de Representació." }, skill: "performance" },
  { amount: 18,  story: { en: "A pack of green-skinned little people paid you to fight at their secret gatherings.", ca: "Un grup de personetes de pell verda et va pagar per lluitar a les seves reunions secretes." }, skill: "fighting" },
  { amount: 20,  story: { en: "A strange angry old man paid you to secretly sculpt a large humanoid out of clay.", ca: "Un vell estrany i enfadat et va pagar per esculpir en secret un gran humanoid de fang." }, skill: "art" },
  { amount: 111, story: { en: "An engineer paid you for your novel idea on how to repair a king's gargantuan cannon.", ca: "Un enginyer et va pagar per la teva idea nova sobre com reparar el canó gegantí d'un rei." }, skill: "tinkering" },
  { amount: 24,  story: { en: "Wonderfully crafted shoes appeared in your home overnight; their sale earned a hefty sum.", ca: "Unes sabates meravellosament treballades van aparèixer a casa teva durant la nit; la seva venda et va donar una quantitat generosa." } },
  { amount: 26,  story: { en: "You recently won the \"ugly duckling\" prize in a singing competition.", ca: "Has guanyat recentment el premi de l'«ànec lleig» en un concurs de cant." } },
  { amount: 28,  story: { en: "You provided a traveler advice. They called you their fairy godparent and left a bag of coin.", ca: "Vas donar consell a un viatger. Et va anomenar el seu padrí de fades i et va deixar una bossa de monedes." } },
  { amount: 30,  story: { en: "A man who looked like a wolf in clothing tricked you into investing in his business.", ca: "Un home que semblava un llop vestit et va enganyar perquè invertissis en el seu negoci." } },
  { amount: 32,  story: { en: "Your attempt to sell flowers left you with little. An old woman paid you to taste three apples.", ca: "El teu intent de vendre flors et va deixar amb poc. Una vella et va pagar per tastar tres pomes." } },
  { amount: 34,  story: { en: "A man paid you to shoe his odd-looking horse with rusty tools.", ca: "Un home et va pagar per ferrar el seu cavall d'aspecte estrany amb eines rovellades." } },
  { amount: 36,  story: { en: "A beautiful song was heard near water. People mistook you as the source and threw coin.", ca: "Es va sentir una cançó bella prop de l'aigua. La gent et va confondre amb la font i et va llançar monedes." } },
  { amount: 38,  story: { en: "An old man in strange robes paid you to clean his home while he remained in his library.", ca: "Un vell amb robes estranyes et va pagar perquè netegessis casa seva mentre ell roman a la biblioteca." } },
  { amount: 40,  story: { en: "A fortune teller refused to reveal your fate and gave you a sympathetic look with a pouch of coin.", ca: "Una endevinadora va refusar revelar el teu destí i et va donar una mirada compassiva amb una bossa de monedes." } },
  { amount: 42,  story: { en: "An old couple paid you for an old cookie cutter you nor your family ever used.", ca: "Una parella gran et va pagar per un tallador de galetes vell que ni tu ni la teva família no havíeu utilitzat mai." } },
  { amount: 122, story: { en: "You found an abandoned carriage that looked like a giant pumpkin. A nobleman purchased it.", ca: "Vas trobar un carruatge abandonat que semblava una carbassa gegant. Un noble el va comprar." } },
  { amount: 46,  story: { en: "Your ancestor's dirty rug was purchased by a bearded man wearing a turban.", ca: "L'estora bruta del teu avantpassat va ser comprada per un home barbut amb turbant." } },
  { amount: 48,  story: { en: "Your ancestor once caught an ugly old woman stealing his broom. She paid him for it.", ca: "El teu avantpassat va enxampar una vella lletja robant-li l'escombra. Ella li va pagar per ella." } },
  { amount: 50,  story: { en: "Coin and white fur were found in place of your family's pocket watch.", ca: "Es van trobar monedes i pèl blanc en lloc del rellotge de butxaca de la teva família." } },
  { amount: 52,  story: { en: "After selling matches, this is all that remains.", ca: "Després de vendre llumins, això és tot el que queda." } },
  { amount: 54,  story: { en: "You lost most of your money betting on a hare you were sure would win the race.", ca: "Vas perdre la major part dels diners apostant per una llebre que estaves segur que guanyaria la cursa." } },
  { amount: 56,  story: { en: "Your discovery of a bag of perfectly polished stones was quickly purchased by an ugly old woman.", ca: "El teu descobriment d'una bossa de pedres perfectament polides va ser comprat ràpidament per una vella lletja." } },
  { amount: 58,  story: { en: "You scraped some coin from the bottom of the nearby wishing fountain.", ca: "Vas recollir algunes monedes del fons de la font dels desitjos propera." } },
  { amount: 60,  story: { en: "A traveling hunter threw you coin for sharing the story of a goat-eating creature in the Fog.", ca: "Un caçador viatger et va llançar monedes per compartir la història d'una criatura que menja cabres a la Boira." } },
  { amount: 66,  story: { en: "You sold your soul to someone claiming to be the Devil for a mere 66 coin.", ca: "Vas vendre l'ànima a algú que deia ser el Diable per només 66 monedes." } },
  { amount: 99,  story: { en: "A woman wearing red shoes couldn't stop dancing and paid you to amputate her feet. Lose 5 Maximum Hope.", ca: "Una dona amb sabates vermelles no podia deixar de ballar i et va pagar per amputar-li els peus. Perds 5 Esperança Màxima." }, hopeMod: -5 },
  { amount: 100, story: { en: "You found a goose egg that was made of gold and sold it to a merchant.", ca: "Vas trobar un ou d'oca d'or i el vas vendre a un mercader." } },
  { amount: 99,  story: { en: "You owe the wrong people at least 99 coin, and most people know of your dangerous debt.", ca: "Deus almenys 99 monedes a la gent equivocada, i la majoria coneix el teu deute perillós." } }
];

const CLASS_MODS = {
  worker:      { stats: { strength: 10 },              saves: { body: 5, mind: 5, spirit: 5 } },
  philosopher: { stats: { intellect: 10 },             saves: { mind: 5 } },
  stranger:    { stats: { intellect: 5, will: 5 },     saves: { body: -10, mind: 10, spirit: -10 } },
  hunter:      { stats: { will: 10 },                  saves: { body: 5, spirit: 10 } }
};

const CLASS_SKILLS = {
  worker:      { fixed: ["tinkering"], choices: [["alchemy", "boating"]], skillPoints: 10 },
  philosopher: { fixed: ["literacy"],  choices: [["basic_care", "alchemy", "perception"]], skillPoints: 7 },
  stranger:    { fixed: ["foglore", "fog_vision"], choices: [], skillPoints: 7 },
  hunter:      { fixed: [], choices: [["archery", "firearms"], ["hiding", "animals"]], skillPoints: 7 }
};

const TRAIT_KEYS = {
  worker: "FATHERFOG.TraitWorker",
  philosopher: "FATHERFOG.TraitPhilosopher",
  stranger: "FATHERFOG.TraitStranger",
  hunter: "FATHERFOG.TraitHunter"
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function lang() {
  return (game.i18n?.lang || "en").startsWith("ca") ? "ca" : "en";
}

function t(key, data = {}) {
  return game.i18n.format(key, data) || key;
}

async function rollDice(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFromTable(table, max = 100) {
  const r = Math.floor(Math.random() * max) + 1;
  // For sparse tables we just index modulo
  if (Array.isArray(table) && typeof table[0] === "string") {
    return table[(r - 1) % table.length];
  }
  return table.find(e => e.roll === r) || table[(r - 1) % table.length];
}

/* ------------------------------------------------------------------ */
/*  Wizard Application                                                */
/* ------------------------------------------------------------------ */

export class FatherfogChargen extends Application {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor; // may be null until finish
    this.step = 0;
    const defaultName = "";
    const existingName = actor?.name && actor.name !== "New Actor" && actor.name !== "New Character"
      && actor.name !== "Nou Personatge"
      && actor.name !== game.i18n?.localize?.("DOCUMENT.Actor")
      ? actor.name : defaultName;
    this.data = {
      name: existingName,
      stats: { strength: 30, intellect: 30, will: 30 },
      saves: { body: 25, mind: 25, spirit: 25 },
      classValue: "worker",
      classChoices: [],          // chosen skill ids from class choice groups
      rucksack: "",
      cloak: { color: "", meaning: "" },
      brooch: "",
      broochCustom: "",
      trinketCustom: "",
      trinket: "",
      coin: { value: 0, story: "" },
      coinIndex: null,
      coinBonus: { skillPoints: 0, skill: null, hopeMod: 0 },
      legacy: { number: null, name: "", description: "" },
      skillPoints: 0,
      extraSkills: [],           // skill ids bought with remaining points
      hopeMax: 100
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fatherfog-chargen",
      classes: ["fatherfog", "chargen-window"],
      title: "Fatherfog – Character Creation",
      template: "systems/fatherfog/templates/chargen.html",
      width: 640,
      height: "auto",
      resizable: true,
      closeOnSubmit: false
    });
  }

  get title() {
    const stepNames = lang() === "ca"
      ? ["1. Estadístiques", "2. Salvacions", "3. Classe", "4. Motxilla", "5. Personal", "6. Llegat", "7. Habilitats", "8. Acabar"]
      : ["1. Stats", "2. Saves", "3. Class", "4. Rucksack", "5. Personal", "6. Legacy", "7. Skills", "8. Finish"];
    const base = lang() === "ca" ? "Fatherfog – Creador de personatge" : "Fatherfog – Character Creation";
    return `${base} (${stepNames[this.step] || ""})`;
  }

  /** Keep window title in sync when changing steps */
  async render(force, options) {
    const result = await super.render(force, options);
    if (this.element?.length) {
      this.element.find(".window-title").text(this.title);
    }
    return result;
  }

  getData() {
    const L = lang();
    const stepLabels = L === "ca"
      ? ["Estadístiques", "Salvacions", "Classe", "Motxilla", "Personal", "Llegat", "Habilitats", "Acabar"]
      : ["Stats", "Saves", "Class", "Rucksack", "Personal", "Legacy", "Skills", "Finish"];

    const stepDots = stepLabels.map((label, i) => ({
      label,
      active: i === this.step,
      done: i < this.step
    }));

    const rucksacks = FatherfogCharacterSheet.RUCKSACKS[this.data.classValue] || {};
    const rucksackOptions = Object.entries(rucksacks).map(([key, pack]) => ({
      key,
      label: game.i18n.localize(pack.label) || key,
      selected: key === this.data.rucksack
    }));

    const catalog = game.fatherfog?.getOfficialSkills?.() || [];
    const displayName = game.fatherfog?.skillDisplayName || (s => s?.name?.en || s?.id);

    const classDef = CLASS_SKILLS[this.data.classValue] || { fixed: [], choices: [] };
    const already = new Set([
      ...classDef.fixed,
      ...this.data.classChoices.filter(Boolean),
      ...this.data.extraSkills
    ]);
    if (this.data.coinBonus?.skill) already.add(this.data.coinBonus.skill);

    // Prefer shared prereq filter; chargen only sells common skills
    const commonCatalog = catalog.filter(s => s.rank === "common");
    let buyable;
    if (typeof game.fatherfog?.filterSkillsByPrereq === "function") {
      const { available } = game.fatherfog.filterSkillsByPrereq(already, commonCatalog);
      buyable = available.map(s => ({ id: s.id, name: displayName(s) }));
    } else {
      buyable = commonCatalog
        .filter(s => !already.has(s.id))
        .map(s => ({ id: s.id, name: displayName(s) }));
    }

    const classChoiceGroups = (classDef.choices || []).map((group, idx) => ({
      index: idx,
      options: group.map(id => {
        const sk = catalog.find(s => s.id === id);
        return {
          id,
          name: sk ? displayName(sk) : id,
          selected: this.data.classChoices[idx] === id
        };
      })
    }));

    const boughtSkills = this.data.extraSkills.map(id => {
      const sk = catalog.find(s => s.id === id);
      return { id, name: sk ? displayName(sk) : id };
    });

    const remainingPoints = this.data.skillPoints - (this.data.extraSkills.length * 5);

    // Manual pick lists for flavor step
    const colorNames = {
      Black: { en: "Black", ca: "Negre" },
      Red: { en: "Red", ca: "Vermell" },
      Orange: { en: "Orange", ca: "Taronja" },
      Yellow: { en: "Yellow", ca: "Groc" },
      Green: { en: "Green", ca: "Verd" },
      Blue: { en: "Blue", ca: "Blau" },
      Purple: { en: "Purple", ca: "Porpra" },
      Grey: { en: "Grey", ca: "Gris" },
      White: { en: "White", ca: "Blanc" },
      Brown: { en: "Brown", ca: "Marró" }
    };
    const cloakOptions = CLOAK_TABLE.map(c => {
      const loc = colorNames[c.color] || { en: c.color, ca: c.color };
      const label = loc[L] || loc.en;
      return {
        key: c.color,
        label,
        selected: this.data.cloak.color === label || this.data.cloak.color === c.color
      };
    });
    const broochOptions = BROOCH_TABLE.map(b => {
      const label = (typeof b === "object" ? (b[L] || b.en) : String(b));
      return {
        value: label,
        label,
        selected: String(this.data.brooch || "") === label
      };
    });
    const broochIsPersonal = String(this.data.brooch || "").trim() === "Personal";
    const trinketOptions = TRINKET_TABLE.map(tr => {
      const label = (typeof tr === "object" ? (tr[L] || tr.en) : String(tr));
      return {
        value: label,
        label,
        selected: String(this.data.trinket || "") === label
      };
    });
    const trinketIsPersonal = String(this.data.trinket || "").trim() === "Personal";
    const coinOptions = COIN_TABLE.map((c, index) => {
      const story = c.story[L] || c.story.en || "";
      const short = story.length > 70 ? story.slice(0, 67) + "…" : story;
      return {
        index,
        label: `${c.amount} — ${short}`,
        selected: Number(this.data.coinIndex) === index
      };
    });

    return {
      step: this.step,
      stepDots,
      data: this.data,
      isCa: L === "ca",
      isStep0: this.step === 0,
      isStep1: this.step === 1,
      isStep2: this.step === 2,
      isStep3: this.step === 3,
      isStep4: this.step === 4,
      isStep5: this.step === 5,
      isStep6: this.step === 6,
      isStep7: this.step === 7,
      classWorker: this.data.classValue === "worker",
      classPhilosopher: this.data.classValue === "philosopher",
      classHunter: this.data.classValue === "hunter",
      classStranger: this.data.classValue === "stranger",
      rucksackOptions,
      classChoiceGroups,
      buyableSkills: buyable,
      boughtSkills,
      remainingPoints,
      canBuy: remainingPoints >= 5 && buyable.length > 0,
      legacyList: (game.fatherfog?.getLegacyArtifacts?.() || []).map(a => ({
        id: a.id,
        name: game.fatherfog.legacyArtifactDisplayName(a),
        selected: a.id === this.data.legacy.number
      })),
      cloakOptions,
      broochOptions,
      broochIsPersonal,
      trinketOptions,
      trinketIsPersonal,
      coinOptions
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='next']").click(() => this._next());
    html.find("[data-action='prev']").click(() => this._prev());
    html.find("[data-action='roll-stats']").click(() => this._rollStats());
    html.find("[data-action='roll-saves']").click(() => this._rollSaves());
    html.find("[data-action='roll-flavor']").click(() => this._rollFlavor());
    html.find("[data-action='roll-cloak']").click(() => this._rollCloak());
    html.find("[data-action='roll-brooch']").click(() => this._rollBrooch());
    html.find("[data-action='roll-trinket']").click(() => this._rollTrinket());
    html.find("[data-action='roll-coin']").click(() => this._rollCoin());
    html.find("[data-action='roll-legacy']").click(() => this._rollLegacy());
    html.find("[data-action='finish']").click(() => this._finish());
    html.find("[data-action='buy-skill']").click(ev => this._buySkill(ev));
    html.find("[data-action='remove-skill']").click(ev => this._removeSkill(ev));

    // Live updates
    html.find("input[name='char-name']").on("change", ev => {
      this.data.name = ev.currentTarget.value.trim();
    });
    html.find("select[name='class-value']").on("change", ev => {
      this.data.classValue = ev.currentTarget.value;
      this.data.classChoices = [];
      this.data.rucksack = "";
      this._applyClassPoints();
      this.render(true);
    });
    html.find("select[name='rucksack']").on("change", ev => {
      this.data.rucksack = ev.currentTarget.value;
    });
    html.find("select.class-choice").on("change", ev => {
      const idx = Number(ev.currentTarget.dataset.index);
      this.data.classChoices[idx] = ev.currentTarget.value;
    });
    html.find("select[name='legacy-id']").on("change", ev => {
      const id = Number(ev.currentTarget.value);
      if (!id) {
        this.data.legacy = { number: null, name: "", description: "" };
        this.render(true);
        return;
      }
      const art = game.fatherfog.getLegacyArtifact(id);
      if (art) {
        this.data.legacy = {
          number: id,
          name: game.fatherfog.legacyArtifactDisplayName(art),
          description: game.fatherfog.legacyArtifactDescription(art)
        };
        this.render(true);
      }
    });

    // Manual flavor picks — Personal shows an inline text field (no Dialog)
    html.on("change", "select[name='cloak-color']", ev => {
      const key = ev.currentTarget.value;
      const entry = CLOAK_TABLE.find(c => c.color === key);
      if (!entry) {
        this.data.cloak = { color: "", meaning: "" };
        this.render(true);
        return;
      }
      const L = lang();
      const colorNames = {
        Black: { en: "Black", ca: "Negre" }, Red: { en: "Red", ca: "Vermell" },
        Orange: { en: "Orange", ca: "Taronja" }, Yellow: { en: "Yellow", ca: "Groc" },
        Green: { en: "Green", ca: "Verd" }, Blue: { en: "Blue", ca: "Blau" },
        Purple: { en: "Purple", ca: "Porpra" }, Grey: { en: "Grey", ca: "Gris" },
        White: { en: "White", ca: "Blanc" }, Brown: { en: "Brown", ca: "Marró" }
      };
      const loc = colorNames[entry.color] || { en: entry.color, ca: entry.color };
      this.data.cloak = {
        color: loc[L] || loc.en,
        meaning: entry.meaning[L] || entry.meaning.en
      };
      this.render(true);
    });

    html.on("change", "select[name='brooch']", async ev => {
      const val = String(ev.currentTarget.value || "").trim();
      this.data.brooch = val;
      if (val === "Personal") {
        // Keep previous custom text if any; show the field immediately
        if (!this.data.broochCustom) this.data.broochCustom = "";
      } else {
        this.data.broochCustom = "";
      }
      await this.render(true);
      if (val === "Personal") {
        const inp = this.element?.find?.('input[name="brooch-custom"]')?.[0]
          || document.querySelector('#fatherfog-chargen input[name="brooch-custom"]');
        if (inp) { inp.focus(); inp.select(); }
      }
    });
    html.on("input change", "input[name='brooch-custom']", ev => {
      this.data.broochCustom = ev.currentTarget.value || "";
    });

    html.on("change", "select[name='trinket']", async ev => {
      const val = String(ev.currentTarget.value || "").trim();
      this.data.trinket = val;
      if (val === "Personal") {
        if (!this.data.trinketCustom) this.data.trinketCustom = "";
      } else {
        this.data.trinketCustom = "";
      }
      await this.render(true);
      if (val === "Personal") {
        const inp = this.element?.find?.('input[name="trinket-custom"]')?.[0]
          || document.querySelector('#fatherfog-chargen input[name="trinket-custom"]');
        if (inp) { inp.focus(); inp.select(); }
      }
    });
    html.on("input change", "input[name='trinket-custom']", ev => {
      this.data.trinketCustom = ev.currentTarget.value || "";
    });
    html.find("select[name='coin-index']").on("change", ev => {
      const idx = ev.currentTarget.value === "" ? null : Number(ev.currentTarget.value);
      this.data.coinIndex = idx;
      if (idx === null || Number.isNaN(idx) || !COIN_TABLE[idx]) {
        this.data.coin = { value: 0, story: "" };
        this.data.coinBonus = { skillPoints: 0, skill: null, hopeMod: 0 };
        this.data.hopeMax = 100;
        this._applyClassPoints();
        this.render(true);
        return;
      }
      const coinEntry = COIN_TABLE[idx];
      const L = lang();
      this.data.coin = {
        value: coinEntry.amount,
        story: coinEntry.story[L] || coinEntry.story.en
      };
      this.data.coinBonus = {
        skillPoints: coinEntry.skillPoints || 0,
        skill: coinEntry.skill || null,
        hopeMod: coinEntry.hopeMod || 0
      };
      this.data.hopeMax = 100 + (coinEntry.hopeMod || 0);
      this._applyClassPoints();
      this.render(true);
    });

    // Manual stat/save edits
    ["strength", "intellect", "will"].forEach(s => {
      html.find(`input[name='stat-${s}']`).on("change", ev => {
        this.data.stats[s] = Math.max(0, Number(ev.currentTarget.value) || 0);
      });
    });
    ["body", "mind", "spirit"].forEach(s => {
      html.find(`input[name='save-${s}']`).on("change", ev => {
        this.data.saves[s] = Math.max(0, Number(ev.currentTarget.value) || 0);
      });
    });
  }

  _applyClassPoints() {
    const def = CLASS_SKILLS[this.data.classValue] || { skillPoints: 0 };
    this.data.skillPoints = (def.skillPoints || 0) + (this.data.coinBonus.skillPoints || 0);
  }

  async _rollStats() {
    this.data.stats.strength  = await rollDice("6d10");
    this.data.stats.intellect = await rollDice("6d10");
    this.data.stats.will      = await rollDice("6d10");
    this.render(true);
    ui.notifications.info(lang() === "ca"
      ? `Estadístiques: FUE ${this.data.stats.strength}, INT ${this.data.stats.intellect}, VOL ${this.data.stats.will}`
      : `Stats: STR ${this.data.stats.strength}, INT ${this.data.stats.intellect}, WIL ${this.data.stats.will}`);
  }

  async _rollSaves() {
    this.data.saves.body   = await rollDice("5d10");
    this.data.saves.mind   = await rollDice("5d10");
    this.data.saves.spirit = await rollDice("5d10");
    this.render(true);
    ui.notifications.info(lang() === "ca"
      ? `Salvacions: Cos ${this.data.saves.body}, Ment ${this.data.saves.mind}, Esperit ${this.data.saves.spirit}`
      : `Saves: Body ${this.data.saves.body}, Mind ${this.data.saves.mind}, Spirit ${this.data.saves.spirit}`);
  }


  async _promptPersonalText(title, placeholder, initial = "") {
    const safe = String(initial || "").replace(/"/g, "&quot;");
    return new Promise(resolve => {
      let settled = false;
      const dlg = new Dialog({
        title,
        content: `<div class="form-group"><label>${placeholder}</label><input type="text" name="ff-personal-text" style="width:100%;" value="${safe}" placeholder="${placeholder}"/></div>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: lang() === "ca" ? "Acceptar" : "OK",
            callback: html => {
              settled = true;
              const v = html.find('[name="ff-personal-text"]').val()?.trim() || "";
              resolve(v);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: lang() === "ca" ? "Cancel·lar" : "Cancel",
            callback: () => { settled = true; resolve(null); }
          }
        },
        default: "ok",
        render: html => {
          setTimeout(() => {
            const inp = html.find('[name="ff-personal-text"]')[0];
            if (inp) { inp.focus(); inp.select(); }
          }, 50);
        },
        close: () => { if (!settled) resolve(null); }
      });
      dlg.render(true);
    });
  }

  _applyCloakEntry(entry) {
    const L = lang();
    const colorNames = {
      Black: { en: "Black", ca: "Negre" }, Red: { en: "Red", ca: "Vermell" },
      Orange: { en: "Orange", ca: "Taronja" }, Yellow: { en: "Yellow", ca: "Groc" },
      Green: { en: "Green", ca: "Verd" }, Blue: { en: "Blue", ca: "Blau" },
      Purple: { en: "Purple", ca: "Porpra" }, Grey: { en: "Grey", ca: "Gris" },
      White: { en: "White", ca: "Blanc" }, Brown: { en: "Brown", ca: "Marró" }
    };
    const colorLoc = colorNames[entry.color] || { en: entry.color, ca: entry.color };
    this.data.cloak = {
      color: colorLoc[L] || colorLoc.en,
      meaning: entry.meaning[L] || entry.meaning.en
    };
  }

  _applyBroochEntry(entry) {
    const L = lang();
    if (entry && typeof entry === "object") {
      this.data.brooch = entry[L] || entry.en;
    } else {
      this.data.brooch = String(entry || "");
    }
    if (this.data.brooch !== "Personal") this.data.broochCustom = "";
  }

  _applyTrinketEntry(entry) {
    const L = lang();
    if (entry && typeof entry === "object") {
      this.data.trinket = entry[L] || entry.en;
    } else {
      this.data.trinket = String(entry || "");
    }
  }

  _applyCoinEntry(coinEntry, index = null) {
    const L = lang();
    this.data.coin = {
      value: coinEntry.amount,
      story: coinEntry.story[L] || coinEntry.story.en
    };
    this.data.coinIndex = index !== null ? index : COIN_TABLE.indexOf(coinEntry);
    this.data.coinBonus = {
      skillPoints: coinEntry.skillPoints || 0,
      skill: coinEntry.skill || null,
      hopeMod: coinEntry.hopeMod || 0
    };
    this.data.hopeMax = 100 + (coinEntry.hopeMod || 0);
    this._applyClassPoints();
  }

  async _rollCloak() {
    this._applyCloakEntry(pickRandom(CLOAK_TABLE));
    this.render(true);
  }

  async _rollBrooch() {
    // Prefer non-Personal entries when rolling
    const pool = BROOCH_TABLE.filter(b => {
      const label = typeof b === "object" ? (b.en || "") : String(b);
      return label !== "Personal" && label !== "Blank";
    });
    this._applyBroochEntry(pickRandom(pool.length ? pool : BROOCH_TABLE));
    this.render(true);
  }

  async _rollTrinket() {
    const pool = TRINKET_TABLE.filter(x => {
      const label = typeof x === "object" ? (x.en || "") : String(x);
      return label !== "Personal";
    });
    this._applyTrinketEntry(pickRandom(pool.length ? pool : TRINKET_TABLE));
    if (this.data.trinket !== "Personal") this.data.trinketCustom = "";
    this.render(true);
  }

  async _rollCoin() {
    const idx = Math.floor(Math.random() * COIN_TABLE.length);
    this._applyCoinEntry(COIN_TABLE[idx], idx);
    this.render(true);
  }

  async _rollFlavor() {
    const L = lang();

    // Cloak (d10) — color name localized
    const cloak = CLOAK_TABLE[Math.floor(Math.random() * CLOAK_TABLE.length)];
    const colorNames = {
      Black: { en: "Black", ca: "Negre" },
      Red: { en: "Red", ca: "Vermell" },
      Orange: { en: "Orange", ca: "Taronja" },
      Yellow: { en: "Yellow", ca: "Groc" },
      Green: { en: "Green", ca: "Verd" },
      Blue: { en: "Blue", ca: "Blau" },
      Purple: { en: "Purple", ca: "Porpra" },
      Grey: { en: "Grey", ca: "Gris" },
      White: { en: "White", ca: "Blanc" },
      Brown: { en: "Brown", ca: "Marró" }
    };
    const colorLoc = colorNames[cloak.color] || { en: cloak.color, ca: cloak.color };
    this.data.cloak = {
      color: colorLoc[L] || colorLoc.en,
      meaning: cloak.meaning[L] || cloak.meaning.en
    };

    // Brooch / Trinket — bilingual entries
    const pickLoc = (table) => {
      const entry = pickRandom(table);
      if (entry && typeof entry === "object") return entry[L] || entry.en || String(entry);
      return String(entry);
    };
    this.data.brooch = pickLoc(BROOCH_TABLE);
    this.data.trinket = pickLoc(TRINKET_TABLE);

    // Coin — Catalan stories use «monedes»
    const coinEntry = pickRandom(COIN_TABLE);
    this.data.coin = {
      value: coinEntry.amount,
      story: coinEntry.story[L] || coinEntry.story.en
    };
    this.data.coinIndex = COIN_TABLE.indexOf(coinEntry);
    this.data.coinBonus = {
      skillPoints: coinEntry.skillPoints || 0,
      skill: coinEntry.skill || null,
      hopeMod: coinEntry.hopeMod || 0
    };
    this.data.hopeMax = 100 + (coinEntry.hopeMod || 0);
    this._applyClassPoints();

    this.render(true);
  }

  async _rollLegacy() {
    const arts = game.fatherfog?.getLegacyArtifacts?.() || [];
    if (!arts.length) {
      ui.notifications.warn("No legacy artifacts loaded.");
      return;
    }
    const art = pickRandom(arts);
    this.data.legacy = {
      number: art.id,
      name: game.fatherfog.legacyArtifactDisplayName(art),
      description: game.fatherfog.legacyArtifactDescription(art)
    };
    this.render(true);
  }

  _buySkill(ev) {
    const id = ev.currentTarget.dataset.skillId;
    if (!id) return;
    const remaining = this.data.skillPoints - (this.data.extraSkills.length * 5);
    if (remaining < 5) {
      ui.notifications.warn(lang() === "ca" ? "No queden prou punts." : "Not enough skill points.");
      return;
    }
    if (this.data.extraSkills.includes(id)) return;

    // Prerequisite check against class + already bought + coin bonus skill
    const classDef = CLASS_SKILLS[this.data.classValue] || { fixed: [], choices: [] };
    const owned = new Set([
      ...classDef.fixed,
      ...this.data.classChoices.filter(Boolean),
      ...this.data.extraSkills
    ]);
    if (this.data.coinBonus?.skill) owned.add(this.data.coinBonus.skill);
    if (typeof game.fatherfog?.canTakeSkill === "function") {
      const check = game.fatherfog.canTakeSkill(owned, id);
      if (!check.ok) {
        ui.notifications.warn(
          game.i18n.format("FATHERFOG.SkillPrereqMissing", {
            skill: id,
            prereq: check.prereqName || check.prereq
          })
        );
        return;
      }
    }

    this.data.extraSkills.push(id);
    this.render(true);
  }

  _removeSkill(ev) {
    const id = ev.currentTarget.dataset.skillId;
    this.data.extraSkills = this.data.extraSkills.filter(s => s !== id);
    this.render(true);
  }

  _next() {
    // Validation per step
    if (this.step === 2) { // after class
      const def = CLASS_SKILLS[this.data.classValue];
      if (def?.choices?.length) {
        for (let i = 0; i < def.choices.length; i++) {
          if (!this.data.classChoices[i]) {
            ui.notifications.warn(lang() === "ca"
              ? "Has de triar una habilitat de cada grup de classe."
              : "You must pick one skill from each class choice group.");
            return;
          }
        }
      }
      this._applyClassPoints();
    }
    if (this.step === 3 && !this.data.rucksack) {
      ui.notifications.warn(lang() === "ca" ? "Tria una motxilla." : "Choose a rucksack.");
      return;
    }
    if (this.step === 7) {
      // finish is separate
      return;
    }
    this.step = Math.min(7, this.step + 1);
    this.render(true);
  }

  _prev() {
    this.step = Math.max(0, this.step - 1);
    this.render(true);
  }

  _resolvePersonalField(value, custom) {
    if (value === "Personal" || value === "__personal__") {
      return (custom && String(custom).trim()) ? String(custom).trim() : "Personal";
    }
    return value || "";
  }

  async _finish() {
    if (!this.data.name) {
      ui.notifications.warn(lang() === "ca" ? "Posa un nom al personatge." : "Give the character a name.");
      return;
    }

    // Create the actor only at the end so the Actors sidebar is not disrupted mid-wizard
    let actor = this.actor;
    if (!actor) {
      actor = await Actor.create({
        name: this.data.name,
        type: "character",
        img: "icons/svg/mystery-man.svg"
      }, { renderSheet: false });
      this.actor = actor;
    }
    const mods = CLASS_MODS[this.data.classValue] || { stats: {}, saves: {} };

    // Base stats + class mods
    const strength  = this.data.stats.strength  + (mods.stats.strength  || 0);
    const intellect = this.data.stats.intellect + (mods.stats.intellect || 0);
    const will      = this.data.stats.will      + (mods.stats.will      || 0);
    const body   = this.data.saves.body   + (mods.saves.body   || 0);
    const mind   = this.data.saves.mind   + (mods.saves.mind   || 0);
    const spirit = this.data.saves.spirit + (mods.saves.spirit || 0);

    const hopeMax = Math.max(1, this.data.hopeMax);
    const skillPointsLeft = Math.max(0, this.data.skillPoints - (this.data.extraSkills.length * 5));

    // Build skill bags
    const catalog = game.fatherfog?.getOfficialSkills?.() || [];
    const displayName = game.fatherfog?.skillDisplayName || (s => s?.name?.en || s?.id);
    const skillBags = { common: {}, expert: {}, master: {} };
    const grantedIds = [];

    const grantSkill = (skillId, fromClass = false) => {
      const sk = catalog.find(s => s.id === skillId);
      if (!sk) return;
      const entryId = foundry.utils.randomID();
      const primaryStat = (sk.stats && sk.stats[0]) || "";
      skillBags[sk.rank || "common"][entryId] = {
        skillId,
        name: displayName(sk),
        rank: sk.rank || "common",
        stat: primaryStat,
        fromClass: !!fromClass
      };
      if (fromClass) grantedIds.push(skillId);
    };

    const classDef = CLASS_SKILLS[this.data.classValue] || { fixed: [], choices: [] };

    // Order class skills so prerequisites are written before dependents
    // (e.g. Stranger: foglore before fog_vision).
    const orderByPrereq = (ids) => {
      const list = ids.filter(Boolean);
      const rankOf = (id) => {
        let r = 0;
        let cur = game.fatherfog?.getSkillDef?.(id);
        const seen = new Set();
        while (cur?.prereq && !seen.has(cur.prereq)) {
          seen.add(cur.prereq);
          r += 1;
          cur = game.fatherfog?.getSkillDef?.(cur.prereq);
        }
        return r;
      };
      return list.slice().sort((a, b) => rankOf(a) - rankOf(b));
    };

    for (const id of orderByPrereq(classDef.fixed)) grantSkill(id, true);
    for (const id of orderByPrereq(this.data.classChoices)) grantSkill(id, true);
    for (const id of orderByPrereq(this.data.extraSkills)) grantSkill(id, false);
    // Coin bonus skill
    if (this.data.coinBonus.skill) grantSkill(this.data.coinBonus.skill, false);

    const traitKey = TRAIT_KEYS[this.data.classValue];
    const trait = traitKey ? game.i18n.localize(traitKey) : "";

    const updates = {
      name: this.data.name,
      "system.class.value": this.data.classValue,
      "system.class.trait": trait,
      "system.class.modsApplied": this.data.classValue,
      "system.class.grantedSkillIds": grantedIds,
      "system.stats.strength.value": strength,
      "system.stats.intellect.value": intellect,
      "system.stats.will.value": will,
      "system.saves.body.value": body,
      "system.saves.mind.value": mind,
      "system.saves.spirit.value": spirit,
      "system.health.value": strength,
      "system.health.max": strength,
      "system.hope.value": hopeMax,
      "system.hope.max": hopeMax,
      "system.defense.base": 0,
      "system.defense.value": 0,
      "system.cloak.color": this.data.cloak.color,
      "system.cloak.meaning": this.data.cloak.meaning,
      "system.brooch": this._resolvePersonalField(this.data.brooch, this.data.broochCustom),
      "system.trinket": this._resolvePersonalField(this.data.trinket, this.data.trinketCustom),
      "system.coin.value": this.data.coin.value,
      "system.coin.story": this.data.coin.story,
      "system.legacyArtifact.number": this.data.legacy.number,
      "system.legacyArtifact.name": this.data.legacy.name || "",
      "system.legacyArtifact.description": this.data.legacy.description || "",
      "system.rucksack": this.data.rucksack,
      "system.skillPoints": skillPointsLeft,
      "system.skills.common": skillBags.common,
      "system.skills.expert": skillBags.expert,
      "system.skills.master": skillBags.master,
      "system.waterskin.value": 1,
      "system.waterskin.max": 1,
      "system.rations.value": 0
    };

    await actor.update(updates);

    // Grant rucksack items
    if (this.data.rucksack) {
      try {
        const sheet = new FatherfogCharacterSheet(actor);
        const built = await sheet._buildRucksackItemData(this.data.classValue, this.data.rucksack);
        const itemsData = built?.items || (Array.isArray(built) ? built : []);
        const rationsFromPack = Number(built?.rations) || 0;
        if (itemsData.length) {
          await actor.createEmbeddedDocuments("Item", itemsData);
        }
        if (rationsFromPack > 0) {
          const current = Number(actor.system.rations?.value) || 0;
          await actor.update({ "system.rations.value": current + rationsFromPack });
        }
      } catch (err) {
        console.warn("Fatherfog Chargen | Rucksack grant failed", err);
      }
    }

    // Create flavor items (cloak / brooch / trinket) so they appear in inventory if desired
    const flavorItems = [];
    if (this.data.cloak.color) {
      flavorItems.push({
        name: `${lang() === "ca" ? "Capa" : "Cloak"}: ${this.data.cloak.color}`,
        type: "cloak",
        system: { description: this.data.cloak.meaning, equipped: true }
      });
    }
    if (this.data.brooch) {
      const broochText = this._resolvePersonalField(this.data.brooch, this.data.broochCustom);
      flavorItems.push({
        name: `${lang() === "ca" ? "Fermall" : "Brooch"}: ${broochText}`,
        type: "brooch",
        system: { description: broochText }
      });
    }
    if (this.data.trinket) {
      const trinketText = this._resolvePersonalField(this.data.trinket, this.data.trinketCustom);
      flavorItems.push({
        name: `${lang() === "ca" ? "Record" : "Trinket"}: ${trinketText}`,
        type: "trinket",
        system: { description: trinketText }
      });
    }
    if (this.data.legacy.name) {
      flavorItems.push({
        name: this.data.legacy.name,
        type: "legacy",
        system: {
          description: this.data.legacy.description,
          number: this.data.legacy.number
        }
      });
    }
    if (flavorItems.length) {
      await actor.createEmbeddedDocuments("Item", flavorItems);
    }

    ui.notifications.info(lang() === "ca"
      ? `${this.data.name} està llest per jugar!`
      : `${this.data.name} is ready to play!`);

    this.close();
    actor.sheet?.render(true);
  }

  /** Static helper to open the wizard for an actor */
  static async openFor(actor = null) {
    if (actor && actor.type !== "character") {
      ui.notifications.warn("Fatherfog Chargen only works on character actors.");
      return;
    }
    const app = new FatherfogChargen(actor || null);
    app.render(true);
  }
}

/* ------------------------------------------------------------------ */
/*  NPC Creation Wizard (manual p.46 – Hearts, attacks, motive, trick) */
/* ------------------------------------------------------------------ */

export class FatherfogNpcChargen extends Application {
  constructor(options = {}) {
    super(options);
    this.step = 0;
    this.data = {
      name: "",
      category: "",
      hearts: 2,
      health: 30,
      healthMax: 30,
      defense: 0,
      stats: { strength: 30, intellect: 25, will: 30 },
      saves: { body: 25, mind: 25, spirit: 25 },
      attacks: [],
      abilities: [],
      motive: "",
      trick: ""
    };
    this.draftAttack = { name: "", damage: 10, ignoresArmor: false, notes: "" };
    this.draftAbility = { atHearts: 1, name: "", description: "" };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fatherfog-npc-chargen",
      classes: ["fatherfog", "chargen-window"],
      title: "Fatherfog – NPC Creation",
      template: "systems/fatherfog/templates/npc-chargen.html",
      width: 640,
      height: "auto",
      resizable: true,
      closeOnSubmit: false
    });
  }

  get title() {
    const stepNames = lang() === "ca"
      ? ["1. Identitat", "2. Cors", "3. Stats", "4. Atacs", "5. Llindars", "6. Motiu", "7. Acabar"]
      : ["1. Identity", "2. Hearts", "3. Stats", "4. Attacks", "5. Thresholds", "6. Motive", "7. Finish"];
    const base = lang() === "ca" ? "Fatherfog – Creador de PNJ" : "Fatherfog – NPC Creation";
    return `${base} (${stepNames[this.step] || ""})`;
  }

  async render(force, options) {
    const result = await super.render(force, options);
    if (this.element?.length) {
      this.element.find(".window-title").text(this.title);
    }
    return result;
  }

  getData() {
    const L = lang();
    const stepLabels = L === "ca"
      ? ["Identitat", "Cors", "Stats", "Atacs", "Llindars", "Motiu", "Acabar"]
      : ["Identity", "Hearts", "Stats", "Attacks", "Thresholds", "Motive", "Finish"];
    const stepDots = stepLabels.map((label, i) => ({
      label,
      active: i === this.step,
      done: i < this.step
    }));
    return {
      data: this.data,
      draftAttack: this.draftAttack,
      draftAbility: this.draftAbility,
      stepDots,
      isCa: L === "ca",
      isStep0: this.step === 0,
      isStep1: this.step === 1,
      isStep2: this.step === 2,
      isStep3: this.step === 3,
      isStep4: this.step === 4,
      isStep5: this.step === 5,
      isStep6: this.step === 6
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='next']").on("click", (ev) => {
      ev.preventDefault();
      this._readForm(html);
      if (this.step === 0 && !String(this.data.name || "").trim()) {
        ui.notifications.warn(lang() === "ca" ? "Posa un nom al PNJ." : "Give the NPC a name.");
        return;
      }
      this.step = Math.min(6, this.step + 1);
      this.render(true);
    });
    html.find("[data-action='prev']").on("click", (ev) => {
      ev.preventDefault();
      this._readForm(html);
      this.step = Math.max(0, this.step - 1);
      this.render(true);
    });
    html.find("[data-action='add-attack']").on("click", (ev) => {
      ev.preventDefault();
      this._readForm(html);
      const name = String(this.draftAttack.name || "").trim();
      if (!name) {
        ui.notifications.warn(lang() === "ca" ? "Cal un nom d'atac." : "Attack name required.");
        return;
      }
      this.data.attacks.push({
        name,
        damage: Math.max(0, Number(this.draftAttack.damage) || 0),
        ignoresArmor: !!this.draftAttack.ignoresArmor,
        notes: String(this.draftAttack.notes || "").trim()
      });
      this.draftAttack = { name: "", damage: 10, ignoresArmor: false, notes: "" };
      this.render(true);
    });
    html.find("[data-action='remove-attack']").on("click", (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      if (Number.isFinite(idx)) {
        this.data.attacks.splice(idx, 1);
        this.render(true);
      }
    });
    html.find("[data-action='add-ability']").on("click", (ev) => {
      ev.preventDefault();
      this._readForm(html);
      const name = String(this.draftAbility.name || "").trim();
      if (!name) {
        ui.notifications.warn(lang() === "ca" ? "Cal un nom d'habilitat." : "Ability name required.");
        return;
      }
      this.data.abilities.push({
        atHearts: Math.max(0, Number(this.draftAbility.atHearts) || 0),
        name,
        description: String(this.draftAbility.description || "").trim()
      });
      this.draftAbility = { atHearts: 1, name: "", description: "" };
      this.render(true);
    });
    html.find("[data-action='remove-ability']").on("click", (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      if (Number.isFinite(idx)) {
        this.data.abilities.splice(idx, 1);
        this.render(true);
      }
    });
    html.find("[data-action='finish']").on("click", async (ev) => {
      ev.preventDefault();
      this._readForm(html);
      await this._finish();
    });
  }

  _readForm(html) {
    const val = (sel) => html.find(sel).val();
    const num = (sel, fallback = 0) => {
      const n = Number(val(sel));
      return Number.isFinite(n) ? n : fallback;
    };
    if (html.find("[name='npc-name']").length) this.data.name = String(val("[name='npc-name']") || "").trim();
    if (html.find("[name='npc-category']").length) this.data.category = String(val("[name='npc-category']") || "").trim();
    if (html.find("[name='npc-hearts']").length) this.data.hearts = Math.max(1, Math.min(20, num("[name='npc-hearts']", 2)));
    if (html.find("[name='npc-health']").length) this.data.health = Math.max(0, num("[name='npc-health']", 30));
    if (html.find("[name='npc-health-max']").length) this.data.healthMax = Math.max(0, num("[name='npc-health-max']", 30));
    if (html.find("[name='npc-defense']").length) this.data.defense = Math.max(0, num("[name='npc-defense']", 0));
    if (html.find("[name='stat-strength']").length) {
      this.data.stats.strength = Math.max(0, num("[name='stat-strength']", 30));
      this.data.stats.intellect = Math.max(0, num("[name='stat-intellect']", 25));
      this.data.stats.will = Math.max(0, num("[name='stat-will']", 30));
      this.data.saves.body = Math.max(0, num("[name='save-body']", 25));
      this.data.saves.mind = Math.max(0, num("[name='save-mind']", 25));
      this.data.saves.spirit = Math.max(0, num("[name='save-spirit']", 25));
    }
    if (html.find("[name='atk-name']").length) {
      this.draftAttack.name = String(val("[name='atk-name']") || "");
      this.draftAttack.damage = num("[name='atk-damage']", 10);
      this.draftAttack.ignoresArmor = html.find("[name='atk-ignores']").is(":checked");
      this.draftAttack.notes = String(val("[name='atk-notes']") || "");
    }
    if (html.find("[name='ab-name']").length) {
      this.draftAbility.atHearts = num("[name='ab-hearts']", 1);
      this.draftAbility.name = String(val("[name='ab-name']") || "");
      this.draftAbility.description = String(val("[name='ab-desc']") || "");
    }
    if (html.find("[name='npc-motive']").length) this.data.motive = String(val("[name='npc-motive']") || "");
    if (html.find("[name='npc-trick']").length) this.data.trick = String(val("[name='npc-trick']") || "");
  }

  async _finish() {
    if (!this.data.name) {
      ui.notifications.warn(lang() === "ca" ? "Posa un nom al PNJ." : "Give the NPC a name.");
      return;
    }

    const attacks = {};
    for (const a of this.data.attacks) {
      const id = foundry.utils.randomID(8);
      attacks[id] = {
        name: a.name,
        damage: Number(a.damage) || 0,
        notes: a.notes || "",
        ignoresArmor: !!a.ignoresArmor
      };
    }
    if (!Object.keys(attacks).length) {
      attacks[foundry.utils.randomID(8)] = {
        name: lang() === "ca" ? "Atac" : "Attack",
        damage: 10,
        notes: "",
        ignoresArmor: false
      };
    }

    const abilities = {};
    for (const ab of this.data.abilities) {
      const id = foundry.utils.randomID(8);
      abilities[id] = {
        atHearts: Number(ab.atHearts) || 0,
        name: ab.name,
        description: ab.description || ""
      };
    }

    const hearts = Math.max(1, Math.min(20, Number(this.data.hearts) || 1));
    const actor = await Actor.create({
      name: this.data.name,
      type: "npc",
      img: "icons/svg/mystery-man.svg",
      system: {
        category: this.data.category || "",
        stats: {
          strength: { value: this.data.stats.strength },
          intellect: { value: this.data.stats.intellect },
          will: { value: this.data.stats.will }
        },
        saves: {
          body: { value: this.data.saves.body },
          mind: { value: this.data.saves.mind },
          spirit: { value: this.data.saves.spirit }
        },
        health: {
          value: this.data.health,
          max: this.data.healthMax || this.data.health
        },
        hope: { value: 50, max: 50 },
        defense: { value: this.data.defense, base: this.data.defense },
        hearts,
        heartsCurrent: hearts,
        attacks,
        abilities,
        motive: this.data.motive || "",
        trick: this.data.trick || "",
        biography: "",
        notes: ""
      }
    }, { renderSheet: false });

    ui.notifications.info(lang() === "ca"
      ? `${this.data.name} creat com a PNJ.`
      : `${this.data.name} created as NPC.`);

    this.close();
    actor.sheet?.render(true);
  }

  static async openFor() {
    const app = new FatherfogNpcChargen();
    app.render(true);
  }
}

/* ------------------------------------------------------------------ */
/*  Registration helpers                                              */
/* ------------------------------------------------------------------ */

async function openCreatorChooser() {
  const isCa = lang() === "ca";
  const choice = await new Promise((resolve) => {
    new Dialog({
      title: isCa ? "Creador Fatherfog" : "Fatherfog Creator",
      content: `<p>${isCa
        ? "Vols crear un personatge jugador (PJ) o un enemic / PNJ?"
        : "Create a player character (PC) or an enemy / NPC?"}</p>
        <p style="font-size:0.9em;opacity:0.85;">${isCa
        ? "PJ: assistent de 9 passos del manual. PNJ: Cors, atacs, motiu i truc (p.46)."
        : "PC: full 9-step rulebook wizard. NPC: Hearts, attacks, motive & trick (p.46)."}</p>`,
      buttons: {
        pc: {
          icon: '<i class="fas fa-user"></i>',
          label: isCa ? "Personatge (PJ)" : "Character (PC)",
          callback: () => resolve("pc")
        },
        npc: {
          icon: '<i class="fas fa-skull"></i>',
          label: isCa ? "Enemic / PNJ" : "Enemy / NPC",
          callback: () => resolve("npc")
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: isCa ? "Cancel·lar" : "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "pc",
      close: () => resolve(null)
    }, { width: 420 }).render(true);
  });

  if (choice === "pc") await FatherfogChargen.openFor(null);
  else if (choice === "npc") await FatherfogNpcChargen.openFor();
}

function injectChargenButton(app, html) {
  try {
    if (!game.user?.isGM && !game.user?.can("ACTOR_CREATE")) return;
    const root = html instanceof HTMLElement ? $(html) : $(html);
    if (!root?.length) return;
    if (root.find(".ff-chargen-btn").length) return;

    const label = lang() === "ca" ? "Creador" : "Create";
    const btn = $(`
      <button type="button" class="ff-chargen-btn" title="${label}">
        <i class="fas fa-hat-wizard"></i> ${label}
      </button>
    `);
    btn.on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openCreatorChooser();
    });

    const header = root.find(".header-actions, .directory-header .header-actions").first();
    if (header.length) {
      header.find("button, a, .header-control").each(function () {
        const el = $(this);
        const text = `${el.attr("title") || ""} ${el.attr("aria-label") || ""} ${el.text() || ""}`.toLowerCase();
        const isCreateActor =
          (text.includes("create") || text.includes("crear") || text.includes("nou")) &&
          (text.includes("actor") || text.includes("personatge") || text.includes("document")) &&
          !text.includes("folder") &&
          !text.includes("carpeta");
        const looksLikeCreateDoc =
          el.hasClass("create-entity") ||
          el.hasClass("create-document") ||
          el.attr("data-action") === "createDocument" ||
          el.attr("data-action") === "create";
        if (isCreateActor || looksLikeCreateDoc) {
          el.hide().attr("aria-hidden", "true");
        }
      });
      header.prepend(btn);
      return;
    }
    const dirHeader = root.find(".directory-header").first();
    if (dirHeader.length) {
      dirHeader.prepend(btn);
    }
  } catch (err) {
    console.error("Fatherfog | injectChargenButton failed", err);
  }
}

export function registerChargen() {
  game.fatherfog = game.fatherfog || {};
  game.fatherfog.openChargen = (actor) => FatherfogChargen.openFor(actor || null);
  game.fatherfog.openNpcChargen = () => FatherfogNpcChargen.openFor();
  game.fatherfog.openCreatorChooser = openCreatorChooser;

  Hooks.on("renderActorDirectory", (app, html) => {
    injectChargenButton(app, html);
  });
}
