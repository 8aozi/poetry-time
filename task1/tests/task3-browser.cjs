const assert=require('node:assert/strict'),path=require('node:path');const {chromium}=require('playwright');const base=process.env.TEST_URL||'http://127.0.0.1:4173';
(async()=>{const browser=await chromium.launch({channel:process.env.PW_CHANNEL||'chrome',headless:true});try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1100}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.waitForTimeout(70);
 const current=()=>page.evaluate(()=>{
  const title=document.querySelector('.question-source').textContent.match(/^《(.*?)》/)[1],prompt=document.querySelector('.question-verse').textContent;
  const type={'选择下一句':'next','选择上一句':'previous','填空字词':'blank'}[document.querySelector('.question-type').textContent];
  return window.PoetryPractice.createBank(window.POEMS).find(q=>window.POEMS.find(p=>p.id===q.poemId).title===title&&q.type===type&&(q.type==='blank'?q.before+'□'.repeat(q.size)+q.after:q.prompt)===prompt);
 });
 async function answer(q,correct=true){if(q.type==='blank')await page.locator('#fill-answer').fill(correct?q.answer:'错字');else await page.locator('[name=answer]').evaluateAll((els,{answer,correct})=>{els.find(el=>correct?el.value===answer:el.value!==answer).click();},{answer:q.answer,correct});await page.locator('#submit-answer').click();}
 await page.goto(base+'/#view=mistakes');assert.equal(await page.locator('.empty-state').count(),1);
 await page.goto(base+'/#practice=poem-17');await settle();await page.locator('[name=practice-mode][value=blank]').check();await page.locator('#start-challenge').click();
 await page.locator('#submit-answer').click();assert.match(await page.locator('#answer-error').innerText(),/先填/);assert.equal(await page.evaluate(()=>localStorage.getItem('poetry-practice-v1')),null);
 const first=await current();await answer(first,false);assert.equal(await page.locator('#mistake-count').textContent(),'1');assert.match(await page.locator('#answer-feedback').innerText(),/正确答案/);
 assert.equal(await page.locator('#submit-answer').isDisabled(),true);assert.equal(await page.locator('#practice-stars').textContent(),'0');
 await page.locator('#next-question').click();let q=await current();await answer(q,true);assert.equal(await page.locator('#practice-stars').textContent(),'1');
 await page.locator('#next-question').click();q=await current();await answer(q,true);await page.locator('#next-question').click();q=await current();await answer(q,true);await page.locator('#next-question').click();
 assert.match(await page.locator('.result-numbers').innerText(),/3 \/ 4/);assert.equal(await page.evaluate(()=>localStorage.getItem('poetry-learning-v1')),null);
 await page.locator('#mistakes-nav').click();await settle();assert.equal(await page.locator('.mistake-poem').count(),1);await page.locator('.mistake-detail summary').click();assert.match(await page.locator('.mistake-detail-body').innerText(),/错字/);assert.match(await page.locator('.mistake-detail-body').innerText(),/最近错答/);
 await page.screenshot({path:path.join(__dirname,'../previews/task3-mistakes-desktop.png'),fullPage:true});
 await page.reload();assert.equal(await page.locator('.mistake-poem').count(),1);
 await page.getByRole('link',{name:'再练这首诗'}).click();await settle();await page.locator('#start-challenge').click();q=await current();assert.equal(q.id,first.id);await answer(q,true);
 assert.equal(await page.locator('#mistake-count').textContent(),'0');assert.equal(await page.locator('#practice-stars').textContent(),'4');
 await page.locator('#next-question').click();await page.locator('#mistakes-nav').click();await settle();await page.locator('[data-mistake-filter=corrected]').click();assert.equal(await page.locator('.mistake-poem').count(),1);
 // Redo a previously rewarded question: no duplicate reward.
 await page.goto(base+'/#practice=poem-17');await settle();await page.locator('[name=practice-mode][value=blank]').check();await page.locator('#start-challenge').click();q=await current();await answer(q,true);assert.equal(await page.locator('#practice-stars').textContent(),'4');assert.match(await page.locator('#answer-feedback').innerText(),/已经收集过/);
 // Both directions, distinct options, keyboard submission and exit.
 for(const type of ['previous','next']){
  await page.goto(base+'/#practice=poem-10');await page.reload();await page.locator(`[name=practice-mode][value=${type}]`).check();await page.locator('#start-challenge').click();q=await current();assert.equal(q.type,type);assert.equal(await page.locator('[name=answer]').count(),4);
  await page.locator('#submit-answer').click();assert.match(await page.locator('#answer-error').innerText(),/先选/);
  await page.locator('[name=answer]').evaluateAll((els,a)=>els.find(el=>el.value===a).click(),q.answer);await page.locator('#submit-answer').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.answer-correct').count(),1);
  if(type==='next')await page.screenshot({path:path.join(__dirname,'../previews/task3-question-desktop.png'),fullPage:true});
  await page.locator('#exit-challenge').click();assert.equal(await page.locator('#start-challenge').count(),1);
 }
 // Same active navigation restarts the setup instead of getting stuck.
 await page.goto(base+'/#view=practice');await settle();await page.locator('#start-challenge').click();await page.locator('#practice-nav').click();assert.equal(await page.locator('#start-challenge').count(),1);
 // Cross-tab sync updates a live notebook; rendering remains safe for malicious input.
 const second=await ctx.newPage();await second.goto(base+'/#view=mistakes');
 await page.goto(base+'/#practice=poem-01');await settle();await page.locator('[name=practice-mode][value=blank]').check();await page.locator('#start-challenge').click();await page.locator('#fill-answer').fill('<img src=x onerror=alert(1)>');await page.locator('#submit-answer').click();await settle();assert.equal(await second.locator('.mistake-poem').count(),1);await second.locator('.mistake-detail summary').click();assert.equal(await second.locator('.mistake-detail-body img').count(),0);await second.close();
 // Responsive screens, feedback, notebook and reduced-motion preferences.
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const hash of ['#view=practice','#view=mistakes','#practice=poem-21']){
   await page.goto(base+'/'+hash);await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,width+' '+hash);
  }
  await page.locator('[name=practice-mode][value=next]').check();await page.locator('#start-challenge').click();q=await current();await answer(q,true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,width+' answer');
 }
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/#practice=poem-63');await settle();await page.locator('[name=practice-mode][value=blank]').check();await page.locator('#start-challenge').click();q=await current();await answer(q,true);assert.equal(await page.locator('.feedback-symbol').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.screenshot({path:path.join(__dirname,'../previews/task3-question-mobile.png'),fullPage:true});
 // Damaged storage keeps the screen usable, and blocked storage is disclosed.
 await page.evaluate(()=>localStorage.setItem('poetry-practice-v1','broken'));await page.reload();assert.equal(await page.locator('.storage-warning').count(),1);
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','QuotaExceededError');};});const bp=await blocked.newPage();await bp.goto(base+'/#practice=poem-17');await bp.locator('[name=practice-mode][value=blank]').check();await bp.locator('#start-challenge').click();await bp.locator('#fill-answer').fill('错');await bp.locator('#submit-answer').click();assert.match(await bp.locator('.storage-warning').innerText(),/刷新后可能丢失/);await blocked.close();
 assert.deepEqual(errors,[]);console.log('PASS Task 3: both line directions, blank answers, empty rejection, grading, one-time stars, round results, exact correction, notebook persistence, cross-tab sync, keyboard, escaping, 4 widths, reduced motion, damaged/blocked storage.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
