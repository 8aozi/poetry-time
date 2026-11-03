const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const KEY='poetry-learning-v1';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL==='bundled'?{}:{channel:process.env.PW_CHANNEL||'chrome'})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}}), page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const settle=()=>page.waitForTimeout(70);
  await page.goto(base);
  assert.equal(await page.locator('progress').getAttribute('value'),'0');
  await page.locator('[data-favorite="poem-01"]').click();
  assert.equal(await page.locator('#favorite-count').textContent(),'1');
  assert.equal(await page.locator('.poem-sheet').count(),0,'card favorite must not open reader');
  await page.locator('#favorites-nav').click();await settle();
  assert.equal(await page.locator('.poem-card').count(),1);
  await page.getByRole('searchbox').fill('李白');assert.equal(await page.locator('.empty-state').count(),1);
  await page.getByRole('searchbox').fill('');await page.locator('.poem-card').click();await settle();
  await page.locator('[data-status="learning"]').click();
  assert.equal(await page.locator('#learning-count').textContent(),'1');
  assert.equal(await page.locator('progress').getAttribute('value'),'0');
  assert.match(await page.locator('.study-times').innerText(),/首次开始/);
  const started=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records['poem-01'].startedAt,KEY);
  await page.locator('[data-status="learned"]').click();
  assert.equal(await page.locator('progress').getAttribute('value'),'1');
  assert.equal(await page.locator('#learning-count').textContent(),'0');
  assert.equal(await page.locator('#learning-toast').isVisible(),true);
  assert.match(await page.locator('#learning-toast').innerText(),/1 \/ 75/);
  const completed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records['poem-01'].learnedAt,KEY);
  await page.locator('[data-status="learned"]').click();
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records['poem-01'].learnedAt,KEY),completed);
  await page.reload();
  assert.equal(await page.locator('[data-status="learned"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-favorite="poem-01"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-status="learning"]').click();assert.equal(await page.locator('progress').getAttribute('value'),'0');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records['poem-01'].startedAt,KEY),started);
  await page.locator('[data-status="unstarted"]').click();assert.equal(await page.locator('#learning-count').textContent(),'0');
  await page.getByRole('link',{name:'返回小书屋'}).click();await settle();
  assert.match(page.url(),/view=favorites/);assert.equal(await page.locator('.poem-card').count(),1);
  await page.locator('[data-favorite="poem-01"]').click();assert.equal(await page.locator('.empty-state').count(),1);
  assert.equal(await page.locator('#favorite-count').textContent(),'0');
  await page.getByRole('button',{name:'看看全部 75 篇'}).click();assert.equal(await page.locator('.poem-card').count(),12);
  await page.goto(base+'/#poem=poem-10');await settle();await page.locator('[data-status="learned"]').click();
  await page.locator('[data-favorite="poem-10"]').click();
  await page.locator('#learned-nav').click();await settle();assert.equal(await page.locator('.poem-card').count(),1);
  await page.reload();assert.equal(await page.locator('.poem-card').count(),1);
  // Real cross-tab storage event, then a write from the other tab.
  const second=await context.newPage();await second.goto(base+'/#poem=poem-17');
  await second.locator('[data-status="learning"]').click();await settle();
  assert.equal(await page.locator('#learning-count').textContent(),'1');
  await page.locator('#learning-nav').click();await settle();assert.equal(await page.locator('.poem-card').count(),1);
  await page.locator('.poem-card').click();await settle();await page.locator('[data-favorite="poem-17"]').click();await settle();
  assert.equal(await second.locator('#favorite-count').textContent(),'2');
  await second.close();
  // Keyboard, reduced motion and narrow screens, including populated records.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-status="learned"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('progress').getAttribute('value'),'2');
  assert.equal(await page.locator('.toast-spark').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('#dismiss-toast').click();
  await page.screenshot({path:path.join(__dirname,'../previews/task2-reader-desktop.png'),fullPage:true});
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:900});
   for(const hash of ['', '#view=favorites','#view=learning','#view=learned','#poem=poem-17']){
    await page.goto(base+'/'+hash);await settle();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${hash}`);
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(__dirname,'../previews/task2-reader-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await settle();
  await page.screenshot({path:path.join(__dirname,'../previews/task2-home-desktop.png')});
  // At 75/75 there is no over-count; malformed data does not crash the app.
  await page.evaluate(key=>{const records={};for(const p of window.POEMS)records[p.id]={status:'learned'};localStorage.setItem(key,JSON.stringify({version:1,records}));},KEY);
  await page.reload();assert.equal(await page.locator('progress').getAttribute('value'),'75');assert.match(await page.locator('.growth-count').innerText(),/75 \/ 75/);
  await page.evaluate(key=>localStorage.setItem(key,'broken'),KEY);await page.reload();
  assert.equal(await page.locator('progress').getAttribute('value'),'0');assert.equal(await page.locator('.storage-warning').count(),1);
  await page.locator('[data-favorite="poem-01"]').click();assert.equal(await page.locator('#favorite-count').textContent(),'1');
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError');};});
  const bp=await blocked.newPage();await bp.goto(base+'/#poem=poem-01');
  await bp.locator('[data-status="learned"]').click();assert.equal(await bp.locator('progress').getAttribute('value'),'1');
  assert.match(await bp.locator('.storage-warning').innerText(),/刷新后可能丢失/);await bp.reload();assert.equal(await bp.locator('progress').getAttribute('value'),'0');await blocked.close();
  assert.deepEqual(errors,[]);
  console.log('PASS Task 2: favorites, filtered search, state transitions/timestamps, reload persistence, progress correction, 75/75, cross-tab sync, keyboard/reduced motion, 4 widths, corrupt/blocked storage.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
