/* Tuldok learning content: words, pictures, coloring pages and every line the voice says.

   The games (index.html) read everything from here, and the GitHub build exports lines()
   to voice-lines.json, which the Colab voice maker records. To add a word or change a line:
   edit this file, push, wait for the build, then run the Colab notebook again
   (it records only the lines that are new). Lines without a clip use the tablet voice.

   Emoji: only ones that Android 10 can show (Emoji 12 or older). */
window.TULDOK_CONTENT = (function () {
  'use strict';
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function key(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  /* ---------- tracing, counting, matching, patterns ---------- */
  const CUE = { A: ['🍎', 'apple'], B: ['⚽', 'ball'], C: ['🐱', 'cat'], D: ['🐶', 'dog'], E: ['🥚', 'egg'], F: ['🐟', 'fish'], G: ['🍇', 'grapes'], H: ['🏠', 'house'], I: ['🍦', 'ice cream'], J: ['🧃', 'juice'], K: ['🪁', 'kite'], L: ['🦁', 'lion'], M: ['🌙', 'moon'], N: ['👃', 'nose'], O: ['🐙', 'octopus'], P: ['🐷', 'pig'], Q: ['👸', 'queen'], R: ['🌈', 'rainbow'], S: ['☀️', 'sun'], T: ['🌳', 'tree'], U: ['☂️', 'umbrella'], V: ['🎻', 'violin'], W: ['🍉', 'watermelon'], X: ['📦', 'box'], Y: ['🪀', 'yo-yo'], Z: ['🦓', 'zebra'] };
  const THINGS = [['🍎', 'apple'], ['⭐', 'star'], ['🐟', 'fish'], ['🌸', 'flower'], ['🚗', 'car'], ['🎈', 'balloon'], ['🐱', 'cat'], ['🐶', 'dog'], ['🦋', 'butterfly'], ['🥭', 'mango'], ['🍌', 'banana'], ['⚽', 'ball'], ['🐝', 'bee'], ['🌙', 'moon'], ['🐸', 'frog'], ['🦆', 'duck'], ['🍉', 'watermelon'], ['🐢', 'turtle'], ['🍓', 'strawberry'], ['🚌', 'bus']];
  const LINE_SET = [
    { kind: 'horizontal', from: '🐝', to: '🌼', name: 'Sleeping line', say: 'Help the bee fly to the flower!' },
    { kind: 'vertical', from: '☁️', to: '', name: 'Rain lines', say: 'Make rain! Draw from the top down!' },
    { kind: 'circles', from: '⚽', to: '', name: 'Circles', say: 'Draw round circles, like a ball!' },
    { kind: 'crosses', from: '⭐', to: '', name: 'Crosses', say: 'Draw a line down, then a line across!' },
    { kind: 'slant', from: '🪁', to: '', name: 'Slanting lines', say: 'Draw slanting lines, like a kite string!' },
    { kind: 'zigzag', from: '🐸', to: '🍃', name: 'Zigzag', say: 'Help the frog hop to the leaf!' },
    { kind: 'waves', from: '🐟', to: '🐚', name: 'Waves', say: 'Swim like a fish to the shell!' },
    { kind: 'arches', from: '🐰', to: '🥕', name: 'Hills', say: 'Hop like a bunny to the carrot!' },
    { kind: 'loops', from: '🐞', to: '🌸', name: 'Loops', say: 'Loop all the way to the flower!' },
  ];
  const SHAPE_SET = ['circle', 'square', 'triangle', 'rectangle', 'star', 'oval', 'heart', 'diamond'];
  const SHAPE_AGE = { nursery: ['circle', 'square', 'triangle', 'star'], prek: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart'], kinder: SHAPE_SET };
  const PATTERNS = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
  const PAT_BY_AGE = { nursery: ['AB'], prek: ['AB', 'AAB', 'ABB'], kinder: ['AB', 'AAB', 'ABB', 'ABC', 'AABB'] };

  /* ---------- feedback ---------- */
  const PRAISE = ['Yay! Great job!', 'Woohoo! You did it!', 'Wow! Awesome!', 'Super duper!', 'Hooray! You are a star!'];
  const FOUND = ['You found it!', 'Great job!', 'Well done!', 'You got it!'];
  const TRY = ['Try again!', 'Almost! Try again!', 'Hmm, look again!'];

  /* ---------- picture words: name -> emoji ---------- */
  const WORDS = {
    cat: '🐱', dog: '🐶', cow: '🐮', pig: '🐷', duck: '🦆', fish: '🐟', bird: '🐦', frog: '🐸', horse: '🐴', chicken: '🐔', hen: '🐔', rooster: '🐓',
    rabbit: '🐰', bee: '🐝', lion: '🦁', monkey: '🐵', elephant: '🐘', butterfly: '🦋', turtle: '🐢', sheep: '🐑', goat: '🐐', tiger: '🐯',
    zebra: '🦓', owl: '🦉', snake: '🐍', mouse: '🐭', bear: '🐻', penguin: '🐧', crab: '🦀', whale: '🐳', carabao: '🐃', fox: '🦊',
    octopus: '🐙', ant: '🐜', dolphin: '🐬', kangaroo: '🦘', koala: '🐨', wolf: '🐺', ox: '🐂', bat: '🦇', unicorn: '🦄',
    apple: '🍎', banana: '🍌', mango: '🥭', grapes: '🍇', orange: '🍊', watermelon: '🍉', strawberry: '🍓', pineapple: '🍍', coconut: '🥥',
    cherries: '🍒', lemon: '🍋', pear: '🍐', avocado: '🥑',
    egg: '🥚', bread: '🍞', rice: '🍚', milk: '🥛', cake: '🎂', 'ice cream': '🍦', cookie: '🍪', carrot: '🥕', corn: '🌽', noodles: '🍜',
    tomato: '🍅', juice: '🧃', pizza: '🍕', lollipop: '🍭', nut: '🥜',
    car: '🚗', bus: '🚌', bike: '🚲', boat: '⛵', airplane: '✈️', train: '🚆', truck: '🚚', helicopter: '🚁', rocket: '🚀', ship: '🚢',
    'fire truck': '🚒', ambulance: '🚑', taxi: '🚕', jeep: '🚙', tractor: '🚜', van: '🚐',
    shirt: '👕', dress: '👗', hat: '🎩', shoe: '👟', sock: '🧦', pants: '👖', cap: '🧢', glasses: '👓', jacket: '🧥', scarf: '🧣', gloves: '🧤', boot: '👢',
    nose: '👃', ear: '👂', eye: '👁️', mouth: '👄', hand: '✋', foot: '🦶', tooth: '🦷', leg: '🦵',
    ball: '⚽', house: '🏠', book: '📖', umbrella: '☂️', key: '🔑', clock: '⏰', bell: '🔔', drum: '🥁', guitar: '🎸', spoon: '🥄', gift: '🎁',
    balloon: '🎈', kite: '🪁', star: '⭐', moon: '🌙', sun: '☀️', tree: '🌳', flower: '🌸', rainbow: '🌈',
    box: '📦', violin: '🎻', leaf: '🍃', rose: '🌹', shell: '🐚', robot: '🤖', watch: '⌚', yarn: '🧶', 'yo-yo': '🪀', heart: '❤️',
    bed: '🛏️', web: '🕸️', map: '🗺️', pen: '🖊️', island: '🏝️', volcano: '🌋', queen: '👸'
  };
  /* Word groups, most familiar first. Nursery sees the first 10 of a group, Pre-K the first 16, Kinder all. */
  const GROUPS = {
    animals: ['cat', 'dog', 'cow', 'pig', 'duck', 'fish', 'bird', 'frog', 'horse', 'chicken', 'rabbit', 'bee', 'lion', 'monkey', 'elephant', 'butterfly',
      'turtle', 'sheep', 'goat', 'tiger', 'zebra', 'owl', 'snake', 'mouse', 'bear', 'penguin', 'crab', 'whale', 'carabao', 'fox'],
    fruits: ['apple', 'banana', 'mango', 'grapes', 'orange', 'watermelon', 'strawberry', 'pineapple', 'coconut', 'cherries', 'lemon', 'pear', 'avocado'],
    food: ['egg', 'bread', 'rice', 'milk', 'cake', 'ice cream', 'cookie', 'carrot', 'corn', 'noodles', 'tomato', 'juice'],
    vehicles: ['car', 'bus', 'bike', 'boat', 'airplane', 'train', 'truck', 'helicopter', 'rocket', 'ship', 'fire truck', 'ambulance', 'taxi', 'jeep', 'tractor'],
    clothes: ['shirt', 'dress', 'hat', 'shoe', 'sock', 'pants', 'cap', 'glasses', 'jacket', 'scarf', 'gloves', 'boot'],
    body: ['nose', 'ear', 'eye', 'mouth', 'hand', 'foot', 'tooth', 'leg'],
    things: ['ball', 'house', 'book', 'umbrella', 'key', 'clock', 'bell', 'drum', 'guitar', 'spoon', 'gift', 'balloon', 'kite', 'star', 'moon', 'sun', 'tree', 'flower', 'rainbow']
  };
  const PLURAL = ['grapes', 'cherries', 'noodles', 'pants', 'glasses', 'gloves'];
  const FIND_BY_AGE = { nursery: ['animals', 'fruits', 'things'], prek: ['animals', 'fruits', 'food', 'vehicles', 'body', 'things'], kinder: ['animals', 'fruits', 'food', 'vehicles', 'clothes', 'body', 'things'] };
  const MEMORY_BY_AGE = { nursery: ['animals', 'fruits'], prek: ['animals', 'fruits', 'vehicles', 'things'], kinder: ['animals', 'fruits', 'vehicles', 'things', 'food'] };
  /* "Which one does not belong?": what the voice says about the odd one, by the group of the other pictures */
  const ODD = { animals: 'It is not an animal!', fruits: 'It is not a fruit!', vehicles: 'It is not a vehicle!', clothes: 'It is not something to wear!' };

  /* ---------- literacy ---------- */
  /* First sounds: pictures whose name starts with the letter (hard C and G only, no X). */
  const FIRST = {
    A: ['apple', 'ant', 'avocado'], B: ['ball', 'banana', 'bee', 'bus'], C: ['cat', 'car', 'cow', 'cake'], D: ['dog', 'duck', 'drum', 'dolphin'],
    E: ['egg', 'elephant'], F: ['fish', 'frog', 'fox', 'flower'], G: ['goat', 'grapes', 'gift', 'guitar'], H: ['hat', 'house', 'horse', 'heart'],
    I: ['ice cream', 'island'], J: ['juice', 'jeep', 'jacket'], K: ['kite', 'key', 'kangaroo', 'koala'], L: ['lion', 'lemon', 'leaf', 'lollipop'],
    M: ['moon', 'monkey', 'mouse', 'mango'], N: ['nose', 'nut', 'noodles'], O: ['octopus', 'orange', 'ox'], P: ['pig', 'pizza', 'pear', 'penguin'],
    Q: ['queen'], R: ['rabbit', 'rainbow', 'rocket', 'robot'], S: ['sun', 'star', 'snake', 'sock'], T: ['tree', 'turtle', 'tiger', 'train'],
    U: ['umbrella', 'unicorn'], V: ['violin', 'volcano', 'van'], W: ['watermelon', 'watch', 'wolf', 'whale'], Y: ['yo-yo', 'yarn'], Z: ['zebra']
  };
  const FIRST_WORDS = [];
  Object.keys(FIRST).forEach(function (L) { FIRST[L].forEach(function (w) { FIRST_WORDS.push(w); }); });
  const RHYMES = [['cat', 'hat'], ['fox', 'box'], ['bee', 'tree'], ['star', 'car'], ['mouse', 'house'], ['goat', 'boat'], ['snake', 'cake'],
    ['moon', 'spoon'], ['bear', 'pear'], ['dog', 'frog'], ['sock', 'clock'], ['bell', 'shell'], ['nose', 'rose']];
  /* First words to read (Kinder): short words a child can sound out. */
  const READ = ['cat', 'dog', 'sun', 'pig', 'bus', 'hat', 'fox', 'bed', 'box', 'ant', 'hen', 'bat', 'web', 'map', 'pen', 'van'];

  /* ---------- colors, feelings, animal sounds ---------- */
  const COLORS = [['red', '#e63946'], ['yellow', '#ffd23f'], ['blue', '#1e6fd9'], ['green', '#2bb24c'], ['orange', '#ff8c1a'], ['purple', '#8e5cd9'],
    ['pink', '#ff70a6'], ['brown', '#8b5a2b'], ['black', '#222222'], ['white', '#ffffff']];
  const FEELINGS = [['happy', '😀'], ['sad', '😢'], ['angry', '😠'], ['surprised', '😮'], ['scared', '😨'], ['sleepy', '😴']];
  const SOUNDS = [['cow', 'moo'], ['dog', 'woof'], ['cat', 'meow'], ['duck', 'quack'], ['pig', 'oink'], ['sheep', 'baa'], ['horse', 'neigh'],
    ['rooster', 'cock-a-doodle-doo'], ['frog', 'ribbit'], ['bee', 'buzz'], ['lion', 'roar'], ['owl', 'hoot'], ['snake', 'hiss'], ['mouse', 'squeak'], ['bird', 'tweet']];

  /* ---------- coloring pages (400 x 300). class r = area to paint, d = line, k = black detail ---------- */
  function starPts(cx, cy, R, r) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r : R; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
    return p.join(' ');
  }
  function ground(y) { return '<path class="r" d="M3 ' + y + ' H397 V277 A20 20 0 0 1 377 297 H23 A20 20 0 0 1 3 277 Z"/>'; }
  function page(title, body) {
    return { title: title, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect class="r" x="3" y="3" width="394" height="294" rx="20"/>' + body + '</svg>' };
  }
  const PAGES = [
    page('Apple', ground(250) +
      '<path class="r" d="M196 96 C194 76 192 60 186 46 L198 42 C204 58 206 76 206 96 Z"/>' +
      '<path class="r" d="M206 70 C222 40 262 36 284 46 C270 72 236 84 206 70 Z"/>' +
      '<path class="r" d="M200 92 C168 66 100 72 96 140 C92 205 140 252 176 250 C188 249 194 244 200 244 C206 244 212 249 224 250 C260 252 308 205 304 140 C300 72 232 66 200 92 Z"/>' +
      '<ellipse class="r" cx="140" cy="140" rx="13" ry="30" transform="rotate(20 140 140)"/>' +
      '<polygon class="r" points="' + starPts(58, 60, 30, 13) + '"/><polygon class="r" points="' + starPts(340, 110, 24, 10) + '"/>'),
    page('Fish',
      '<path class="r" d="M3 255 Q100 238 200 255 T397 255 V277 A20 20 0 0 1 377 297 H23 A20 20 0 0 1 3 277 Z"/>' +
      '<path class="r" d="M48 258 C36 224 62 204 48 168 C72 198 58 226 74 258 Z"/>' +
      '<path class="r" d="M282 150 L362 94 Q346 150 362 206 Z"/>' +
      '<path class="r" d="M150 86 Q192 30 252 94 Z"/>' +
      '<path class="r" d="M168 212 Q198 256 230 210 Z"/>' +
      '<ellipse class="r" cx="190" cy="150" rx="110" ry="72"/>' +
      '<path class="r" d="M150 83 Q128 150 150 217 L178 221 Q156 150 178 79 Z"/>' +
      '<circle class="r" cx="112" cy="132" r="18"/><circle class="k" cx="106" cy="133" r="8"/>' +
      '<path class="d" d="M86 168 Q97 176 108 170"/>' +
      '<circle class="r" cx="64" cy="84" r="13"/><circle class="r" cx="46" cy="48" r="9"/><circle class="r" cx="80" cy="40" r="6"/>'),
    page('House',
      '<circle class="r" cx="64" cy="62" r="30"/>' +
      '<path class="d" d="M64 20 V8 M64 104 V116 M22 62 H10 M106 62 H118 M34 32 L26 24 M94 32 L102 24 M34 92 L26 100 M94 92 L102 100"/>' +
      '<path class="r" d="M292 64 C290 46 312 38 324 48 C330 32 358 32 362 50 C380 48 386 70 370 76 H298 C286 76 284 68 292 64 Z"/>' +
      ground(236) +
      '<rect class="r" x="350" y="186" width="16" height="56"/><circle class="r" cx="358" cy="160" r="32"/>' +
      '<rect class="r" x="256" y="70" width="26" height="54"/>' +
      '<rect class="r" x="130" y="142" width="170" height="118"/>' +
      '<polygon class="r" points="114,148 215,66 316,148"/>' +
      '<rect class="r" x="196" y="194" width="40" height="66" rx="4"/><circle class="k" cx="228" cy="229" r="3.5"/>' +
      '<rect class="r" x="146" y="166" width="38" height="38"/><rect class="r" x="252" y="166" width="38" height="38"/>' +
      '<path class="d" d="M165 166 V204 M146 185 H184 M271 166 V204 M252 185 H290"/>'),
    page('Flower', ground(240) +
      '<circle class="r" cx="56" cy="56" r="26"/>' +
      '<rect class="r" x="192" y="118" width="16" height="132" rx="6"/>' +
      '<path class="r" d="M200 214 C172 184 132 190 122 200 C142 226 178 230 200 214 Z"/>' +
      '<path class="r" d="M200 192 C228 162 268 168 278 178 C258 204 222 208 200 192 Z"/>' +
      '<circle class="r" cx="246" cy="100" r="30"/><circle class="r" cx="223" cy="140" r="30"/><circle class="r" cx="177" cy="140" r="30"/>' +
      '<circle class="r" cx="154" cy="100" r="30"/><circle class="r" cx="177" cy="60" r="30"/><circle class="r" cx="223" cy="60" r="30"/>' +
      '<circle class="r" cx="200" cy="100" r="28"/>' +
      '<rect class="r" x="318" y="172" width="10" height="74" rx="4"/>' +
      '<path class="r" d="M302 146 L313 160 L323 144 L333 160 L344 146 Q344 184 323 186 Q302 184 302 146 Z"/>'),
    page('Car', ground(232) +
      '<path class="d" d="M24 266 H64 M104 266 H144 M184 266 H224 M264 266 H304 M344 266 H376"/>' +
      '<circle class="r" cx="60" cy="56" r="28"/>' +
      '<path class="r" d="M122 152 L152 98 H262 L298 152 Z"/>' +
      '<path class="r" d="M60 200 V168 Q60 152 78 152 H330 Q352 152 354 172 V200 Q354 214 340 214 H74 Q60 214 60 200 Z"/>' +
      '<path class="r" d="M144 148 L162 108 H202 V148 Z"/><path class="r" d="M216 148 V108 H256 L282 148 Z"/>' +
      '<path class="d" d="M208 156 V208"/>' +
      '<circle class="r" cx="342" cy="174" r="8"/>' +
      '<circle class="r" cx="120" cy="214" r="30"/><circle class="r" cx="294" cy="214" r="30"/>' +
      '<circle class="r" cx="120" cy="214" r="11"/><circle class="r" cx="294" cy="214" r="11"/>'),
    page('Butterfly', ground(256) +
      '<ellipse class="r" cx="150" cy="188" rx="50" ry="40" transform="rotate(25 150 188)"/>' +
      '<ellipse class="r" cx="250" cy="188" rx="50" ry="40" transform="rotate(-25 250 188)"/>' +
      '<ellipse class="r" cx="138" cy="104" rx="72" ry="56" transform="rotate(-20 138 104)"/>' +
      '<ellipse class="r" cx="262" cy="104" rx="72" ry="56" transform="rotate(20 262 104)"/>' +
      '<circle class="r" cx="126" cy="100" r="18"/><circle class="r" cx="274" cy="100" r="18"/>' +
      '<circle class="r" cx="148" cy="194" r="13"/><circle class="r" cx="252" cy="194" r="13"/>' +
      '<ellipse class="r" cx="200" cy="152" rx="15" ry="74"/>' +
      '<circle class="r" cx="200" cy="70" r="18"/>' +
      '<path class="d" d="M193 55 Q182 26 162 22 M207 55 Q218 26 238 22"/>' +
      '<circle class="k" cx="162" cy="22" r="5"/><circle class="k" cx="238" cy="22" r="5"/>' +
      '<path class="d" d="M193 75 Q200 81 207 75"/>'),
    page('Ice cream',
      '<polygon class="r" points="' + starPts(70, 74, 30, 13) + '"/><polygon class="r" points="' + starPts(330, 96, 24, 10) + '"/>' +
      '<polygon class="r" points="' + starPts(320, 222, 20, 9) + '"/>' +
      '<path class="r" d="M150 150 L200 282 L250 150 Z"/>' +
      '<path class="d" d="M164 176 H236 M175 206 H225 M186 236 H214"/>' +
      '<circle class="r" cx="200" cy="76" r="44"/>' +
      '<circle class="r" cx="216" cy="30" r="14"/><path class="d" d="M220 17 Q226 8 238 8"/>' +
      '<path class="r" d="M140 152 C124 112 168 84 200 94 C232 84 276 112 260 152 Q245 140 230 154 Q215 140 200 154 Q185 140 170 154 Q155 140 140 152 Z"/>' +
      '<path class="d" d="M176 62 l9 -4 M206 50 l9 4 M188 84 l6 7 M224 70 l-6 6 M166 124 l9 -2 M226 122 l9 2 M196 132 l2 9"/>'),
    page('Rainbow',
      '<circle class="r" cx="352" cy="50" r="28"/>' +
      '<path class="d" d="M54 60 q10 -10 20 0 q10 -10 20 0 M104 92 q8 -8 16 0 q8 -8 16 0"/>' +
      '<path class="r" d="M30 250 A170 170 0 0 1 370 250 L345 250 A145 145 0 0 0 55 250 Z"/>' +
      '<path class="r" d="M55 250 A145 145 0 0 1 345 250 L320 250 A120 120 0 0 0 80 250 Z"/>' +
      '<path class="r" d="M80 250 A120 120 0 0 1 320 250 L295 250 A95 95 0 0 0 105 250 Z"/>' +
      '<path class="r" d="M105 250 A95 95 0 0 1 295 250 L270 250 A70 70 0 0 0 130 250 Z"/>' +
      '<path class="r" d="M18 272 C6 258 16 238 36 242 C40 222 70 218 80 236 C98 228 116 244 108 260 C118 272 106 284 94 282 H30 C20 284 12 278 18 272 Z"/>' +
      '<path class="r" transform="translate(276 0)" d="M18 272 C6 258 16 238 36 242 C40 222 70 218 80 236 C98 228 116 244 108 260 C118 272 106 284 94 282 H30 C20 284 12 278 18 272 Z"/>'),
    page('Boat',
      '<circle class="r" cx="332" cy="66" r="30"/>' +
      '<path class="d" d="M60 70 q10 -10 20 0 q10 -10 20 0"/>' +
      '<rect class="r" x="200" y="28" width="10" height="166"/>' +
      '<path class="r" d="M210 30 L242 40 L210 50 Z"/>' +
      '<path class="r" d="M196 56 V178 H108 Z"/><path class="r" d="M214 70 V178 H282 Z"/>' +
      '<path class="r" d="M3 200 Q53 186 103 200 T203 200 T303 200 T397 200 V277 A20 20 0 0 1 377 297 H23 A20 20 0 0 1 3 277 Z"/>' +
      '<path class="r" d="M88 186 H322 L292 242 H118 Z"/>' +
      '<circle class="r" cx="160" cy="212" r="9"/><circle class="r" cx="205" cy="212" r="9"/><circle class="r" cx="250" cy="212" r="9"/>' +
      '<path class="d" d="M30 246 q15 -10 30 0 M318 258 q15 -10 30 0 M150 270 q15 -10 30 0"/>'),
    page('Cat',
      '<path class="r" d="M108 124 L118 28 L190 84 Z"/><path class="r" d="M292 124 L282 28 L210 84 Z"/>' +
      '<path class="r" d="M124 104 L130 52 L170 84 Z"/><path class="r" d="M276 104 L270 52 L230 84 Z"/>' +
      '<ellipse class="r" cx="200" cy="160" rx="112" ry="96"/>' +
      '<ellipse class="r" cx="155" cy="140" rx="21" ry="27"/><ellipse class="r" cx="245" cy="140" rx="21" ry="27"/>' +
      '<ellipse class="k" cx="158" cy="145" rx="7" ry="13"/><ellipse class="k" cx="248" cy="145" rx="7" ry="13"/>' +
      '<circle class="r" cx="128" cy="198" r="15"/><circle class="r" cx="272" cy="198" r="15"/>' +
      '<path class="r" d="M187 180 H213 L200 194 Z"/>' +
      '<path class="d" d="M200 194 V205 M200 205 Q186 219 172 207 M200 205 Q214 219 228 207"/>' +
      '<path class="d" d="M152 192 L84 180 M152 202 L82 208 M248 192 L316 180 M248 202 L318 208"/>' +
      '<path class="r" d="M200 252 L168 236 V268 Z"/><path class="r" d="M200 252 L232 236 V268 Z"/><circle class="r" cx="200" cy="252" r="9"/>')
  ];

  /* ---------- plural for the counting game ---------- */
  function plural(w) {
    const special = { fish: 'fish', mango: 'mangoes', bus: 'buses' };
    if (special[w]) return special[w];
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  }

  /* ---------- every spoken line, as text or as a template ---------- */
  const T = {
    hi: "Hi there! Let's play!",
    hint: 'Start at the green dot!',
    countAgain: "Oops! Let's count again!",
    next: 'What comes next?',
    lookAgain: 'Hmm, look again!',
    match: { pictures: 'Draw a line to the same picture!', letters: 'Match the big letter to the small letter!', numbers: 'Match the number to the dots!' },
    readQ: 'Read the word! Which picture is it?',
    readYes: 'You read it!',
    moreQ: 'Which side has more?',
    fewerQ: 'Which side has fewer?',
    moreYes: 'Yes! That side has more!',
    fewerYes: 'Yes! That side has fewer!',
    addQ: 'Count them all! How many in all?',
    oddQ: 'Which one does not belong?',
    memQ: 'Find the matching pairs!',
    paintQ: 'Pick a color, then tap to paint!',
    paintDone: 'What a beautiful picture!',
    traceBig: function (L) { return "Let's trace big letter " + L + '! ' + L + ' is for ' + CUE[L][1] + '!'; },
    traceSmall: function (L) { return 'Now the small letter ' + L + '!'; },
    traceNum: function (n) { return "Let's trace the number " + NUM[n] + '!'; },
    traceShape: function (s) { return "Let's trace " + (/^[aeiou]/.test(s) ? 'an ' : 'a ') + s + '!'; },
    countN: function (n) { return cap(NUM[n]) + '!'; },
    yesN: function (n) { return 'Yes! ' + cap(NUM[n]) + '!'; },
    tapEach: function (t) { return "Let's count! Tap each " + t + '!'; },
    howMany: function (t) { return 'How many ' + plural(t) + ' did you count?'; },
    word: function (w) { return cap(w) + '!'; },
    yesWord: function (w) { return 'Yes! ' + cap(w) + '!'; },
    findLetter: function (L) { return 'Find the letter ' + L + '!'; },
    findSmall: function (L) { return 'Find the small letter ' + L + '!'; },
    isFor: function (L) { return L + ' is for ' + CUE[L][1] + '!'; },
    startsQ: function (L) { return 'Which one starts with ' + L + '?'; },
    starts: function (w, L) { return cap(w) + ' starts with ' + L + '!'; },
    rhymeQ: function (a) { return 'What rhymes with ' + a + '?'; },
    rhymeYes: function (a, b) { return cap(a) + ', ' + b + '! They rhyme!'; },
    findNum: function (n) { return 'Find the number ' + NUM[n] + '!'; },
    colorQ: function (c) { return 'Find the ' + c + ' balloon!'; },
    shapeQ: function (s) { return 'Find the ' + s + '!'; },
    whereQ: function (w) { return (PLURAL.indexOf(w) >= 0 ? 'Where are the ' : 'Where is the ') + w + '?'; },
    soundQ: function (s) { return 'Who says ' + s + '?'; },
    soundYes: function (a, s) { return 'The ' + a + ' says ' + s + '!'; },
    feelQ: function (f) { return 'Find the ' + f + ' face!'; }
  };

  /* Every line the app can say, once each (lines with the same words share one clip). */
  function lines() {
    const out = [];
    const add = function (t) { out.push(t); };
    [T.hi, T.hint, T.countAgain, T.next, T.lookAgain, T.readQ, T.readYes, T.moreQ, T.fewerQ, T.moreYes, T.fewerYes, T.addQ, T.oddQ,
      T.memQ, T.paintQ, T.paintDone].forEach(add);
    Object.keys(T.match).forEach(function (k) { add(T.match[k]); });
    PRAISE.forEach(add); FOUND.forEach(add); TRY.forEach(add);
    ALPHA.forEach(function (L) { add(T.traceBig(L)); add(T.traceSmall(L)); add(T.findLetter(L)); add(T.findSmall(L)); add(T.isFor(L)); });
    for (let n = 0; n <= 20; n++) { add(T.traceNum(n)); add(T.findNum(n)); add(T.countN(n)); if (n > 0) add(T.yesN(n)); }
    LINE_SET.forEach(function (l) { add(l.say); });
    SHAPE_SET.forEach(function (s) { add(T.traceShape(s)); add(T.shapeQ(s)); add(T.word(s)); });
    THINGS.forEach(function (t) { add(T.tapEach(t[1])); add(T.howMany(t[1])); add(T.word(t[1])); add(T.yesWord(t[1])); });
    Object.keys(FIRST).forEach(function (L) { add(T.startsQ(L)); FIRST[L].forEach(function (w) { add(T.starts(w, L)); }); });
    RHYMES.forEach(function (p) { add(T.rhymeQ(p[0])); add(T.rhymeYes(p[0], p[1])); });
    READ.forEach(function (w) { add(T.word(w)); });
    COLORS.forEach(function (c) { add(T.colorQ(c[0])); add(T.word(c[0])); });
    Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (w) { add(T.whereQ(w)); add(T.word(w)); }); });
    SOUNDS.forEach(function (s) { add(T.soundQ(s[1])); add(T.soundYes(s[0], s[1])); });
    FEELINGS.forEach(function (f) { add(T.feelQ(f[0])); add(T.word(f[0])); });
    Object.keys(ODD).forEach(function (k) { add(ODD[k]); });
    const seen = {}, uniq = [];
    out.forEach(function (t) { const k = key(t); if (k && !seen[k]) { seen[k] = 1; uniq.push(t); } });
    return uniq;
  }

  return {
    cap: cap, key: key, plural: plural, NUM: NUM, ALPHA: ALPHA, CUE: CUE, THINGS: THINGS, LINE_SET: LINE_SET, SHAPE_SET: SHAPE_SET,
    SHAPE_AGE: SHAPE_AGE, PATTERNS: PATTERNS, PAT_BY_AGE: PAT_BY_AGE, PRAISE: PRAISE, FOUND: FOUND, TRY: TRY, WORDS: WORDS, GROUPS: GROUPS,
    FIND_BY_AGE: FIND_BY_AGE, MEMORY_BY_AGE: MEMORY_BY_AGE, ODD: ODD, FIRST: FIRST, FIRST_WORDS: FIRST_WORDS, RHYMES: RHYMES, READ: READ,
    COLORS: COLORS, FEELINGS: FEELINGS, SOUNDS: SOUNDS, PAGES: PAGES, T: T, lines: lines
  };
})();
