import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// All browser operations use the gstack /browse CLI. Run against a local Vite dev server.
const binary = process.argv[2];
const url = process.argv[3] ?? 'http://127.0.0.1:5174/';
if (!binary) throw new Error('Usage: node scripts/browser-qa.mjs <gstack-browse-binary> [local-vite-url]');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/$/.test(url)) throw new Error('QA is restricted to a local dev server.');
mkdirSync('.gstack', { recursive: true });
const checks = [];
const command = (...args) => execFileSync(binary, args, { encoding: 'utf8', timeout: 30000, windowsHide: true }).trim();
const evaluate = (body) => {
  const file = resolve('.gstack/qa-eval.js');
  writeFileSync(file, `(async () => { ${body} })().then(value => JSON.stringify(value))`);
  const output = command('eval', file);
  if (!output) throw new Error('gstack returned no value from the QA expression');
  return JSON.parse(output);
};
const state = () => evaluate("return JSON.parse(localStorage.getItem('pattern-lock-tracker-state')).state.patterns;");
const click = (selector) => command('click', selector);
const note = (name) => { checks.push(name); console.log(`PASS ${name}`); };
const sequence = () => evaluate("return Array.from(document.querySelectorAll('.sequence-readout > span')).map(x=>Number(x.lastChild.textContent)-1).filter(Number.isFinite);");
const dots = (items) => { for (const dot of items) click(`.grid-dot:nth-of-type(${dot + 1})`); };
const inspectLayout = () => evaluate("return {width:innerWidth,scroll:document.documentElement.scrollWidth,small:Array.from(document.querySelectorAll('button')).filter(x=>x.getClientRects().length&&x.getBoundingClientRect().height<43.5).map(x=>x.textContent.trim()||x.getAttribute('aria-label'))};");

command('goto', url);
const backup = evaluate("return {patterns:localStorage.getItem('pattern-lock-tracker-state'),theme:localStorage.getItem('pattern-notebook-theme')};");
try {
  evaluate("localStorage.setItem('pattern-lock-tracker-state',JSON.stringify({state:{patterns:[]},version:1}));localStorage.setItem('pattern-notebook-theme','light');location.hash='draw';return true;");
  command('reload');
  command('console', '--clear');
  command('viewport', '1280x900');
  click('.input-mode button:nth-child(2)');
  dots([0, 2, 5]);
  assert.deepEqual(sequence(), [0, 1, 2, 5]);
  assert.equal(state().length, 0);
  assert.ok(evaluate("return document.querySelector('.status-card').innerText.includes('New pattern');"));
  note('tap entry inserts Android midpoint; drawing does not save; new pattern shown');
  click('.button-failure');
  click('.button-failure');
  click('.button-success');
  assert.equal(state().length, 1);
  assert.equal(state()[0].attemptCount, 3);
  assert.equal(state()[0].status, 'successful');
  assert.ok(evaluate("return document.querySelector('.status-card').innerText.includes('Already tried');"));
  note('duplicate outcomes update one saved record and count deliberate tries');
  command('reload');
  assert.equal(state()[0].attemptCount, 3);
  note('attempt history survives refresh');
  click('.input-mode button:nth-child(2)');
  dots([0, 2]);
  command('press', 'Tab');
  command('press', 'Enter');
  assert.deepEqual(sequence(), [0, 1, 2, 3]);
  note('keyboard activation can append pattern dots');
  click('.draw-actions button:last-child');
  dots([3, 2, 1, 0]);
  assert.ok(evaluate("return document.querySelector('.status-card').innerText.includes('New pattern');"));
  click('.outcome-actions .button-outline');
  assert.equal(state().find(x => x.status === 'attempted').attemptCount, 0);
  note('reverse direction is distinct; save untested creates zero tries');

  click('.desktop-nav button:nth-child(2)');
  command('wait', '.prediction-card:first-child');
  const gallery = () => evaluate("return Array.from(document.querySelectorAll('.prediction-card')).map(x=>x.querySelector('svg').outerHTML);");
  const firstGallery = gallery();
  click('.regenerate');
  assert.notDeepEqual(gallery(), firstGallery);
  assert.equal(evaluate("return document.querySelectorAll('.pattern-grid').length;"), 0);
  const beforeLoad = state().length;
  click('.desktop-nav button:nth-child(3)');
  command('wait', '.history-page');
  const exportFixture = resolve('.gstack/history-fixture.json');
  writeFileSync(exportFixture, JSON.stringify(state()));
  const savedCounts = state().map(x => [x.id, x.attemptCount]);
  command('upload', '.history-tools input[type=file]', exportFixture);
  command('wait', '.notice-line');
  command('upload', '.history-tools input[type=file]', exportFixture);
  assert.deepEqual(state().map(x => [x.id, x.attemptCount]), savedCounts);
  click('.history-tools button:first-child');
  assert.ok(evaluate("return document.querySelector('.notice-line').innerText.includes('exported');"));
  click('.history-card:has(.status-pill.successful) .mini-outcome.failed');
  assert.equal(state().find(x=>x.attemptCount===3).status, 'failed');
  assert.equal(state().find(x=>x.attemptCount===3).outcomes.length, 3);
  note('backup upload is idempotent; export works; correcting an outcome does not add a try');
  click('.desktop-nav button:nth-child(2)');
  command('wait', '.prediction-card:first-child');
  click('.prediction-card:first-child .try-button');
  command('wait', '.pattern-grid');
  assert.equal(state().length, beforeLoad);
  assert.ok(sequence().length >= 4);
  note('separate read-only gallery regenerates; loading does not count an attempt');

  click('.input-mode button:first-child');
  // Synthetic pointer events test React bindings and gesture geometry. Capture is stubbed
  // only for this synthetic pointer; real clicks above use native browser input.
  const gesture = (moves, end = 'pointerup') => evaluate(`
    const grid=document.querySelector('.pattern-grid'), rect=grid.getBoundingClientRect();
    const originalSet=grid.setPointerCapture,originalHas=grid.hasPointerCapture;
    grid.setPointerCapture=()=>{};grid.hasPointerCapture=()=>false;
    const send=(type,x,y)=>grid.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:57,isPrimary:true,pointerType:'touch',clientX:rect.left+x/300*rect.width,clientY:rect.top+y/300*rect.height,button:0,buttons:type==='pointerup'?0:1}));
    try{send('pointerdown',50,50);for(const [x,y] of ${JSON.stringify(moves)})send('pointermove',x,y);send('${end}',${moves.at(-1)?.[0] ?? 50},${moves.at(-1)?.[1] ?? 50});}
    finally{grid.setPointerCapture=originalSet;grid.hasPointerCapture=originalHas;}
    return true;
  `);
  gesture(Array.from({ length: 100 }, (_, i) => [52 + i * 2, 50]));
  assert.deepEqual(sequence(), [0, 1, 2]);
  gesture([[250, 50], [250, 250]]);
  assert.deepEqual(sequence(), [0, 1, 2, 5, 8]);
  gesture([[250, 50]], 'pointercancel');
  assert.deepEqual(sequence(), []);
  gesture([[250, 50]], 'lostpointercapture');
  assert.deepEqual(sequence(), []);
  note('continuous small moves, fast swipes, cancellation, and capture loss behave correctly');

  for (const width of [320, 375, 768, 1440]) {
    command('viewport', `${width}x900`);
    for (const page of ['draw', 'predictions', 'history']) {
      evaluate(`location.hash='${page}';return true;`);
      command('wait', `.${page === 'predictions' ? 'predictions' : page}-page`);
      const layout = inspectLayout();
      assert.ok(layout.scroll <= layout.width, `${page} overflows at ${width}px`);
      assert.deepEqual(layout.small, [], `${page}: small targets at ${width}px`);
    }
  }
  note('all pages fit 320, 375, 768 and 1440px screens with 44px controls');
  command('viewport', '375x812');
  evaluate("location.hash='draw';return true;");
  command('wait', '.draw-page');
  assert.ok(evaluate("const r=document.querySelector('.button-failure').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight-60;"));
  command('screenshot', '--viewport', '.gstack/draw-mobile.png');
  click('.theme-toggle');
  assert.equal(evaluate("return document.documentElement.dataset.theme;"), 'dark');
  command('screenshot', '--viewport', '.gstack/draw-mobile-dark.png');
  command('viewport', '1440x1000');
  evaluate("location.hash='predictions';return true;");
  command('wait', '.prediction-card:first-child');
  command('screenshot', '--viewport', '.gstack/gallery-desktop.png');
  note('light/dark screenshots captured for visual review');

  const corrupted = '{invalid-json';
  evaluate(`localStorage.setItem('pattern-lock-tracker-state',${JSON.stringify(corrupted)});location.hash='draw';return true;`);
  command('reload');
  assert.ok(evaluate("return Boolean(document.querySelector('.storage-banner'));"));
  click('.input-mode button:nth-child(2)');
  dots([0, 1, 2, 5]);
  click('.button-failure');
  assert.equal(evaluate("return localStorage.getItem('pattern-lock-tracker-state');"), corrupted);
  note('corrupted storage shows recovery feedback and is not overwritten');

  const result = { checks, screenshots: ['draw-mobile.png', 'draw-mobile-dark.png', 'gallery-desktop.png'] };
  writeFileSync('.gstack/qa-results.json', JSON.stringify(result, null, 2));
  console.log(`Completed ${checks.length} browser checks.`);
} finally {
  evaluate(`for(const [key,value] of [['pattern-lock-tracker-state',${JSON.stringify(backup.patterns)}],['pattern-notebook-theme',${JSON.stringify(backup.theme)}]]){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}return true;`);
  command('reload');
}
