const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT=path.resolve(__dirname,'..');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const screenshots=path.join(ROOT,'previews');
fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL==='bundled'?{}:{channel:process.env.PW_CHANNEL||'chrome'})});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[], external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{if(!req.url().startsWith(base)&&!req.url().startsWith('file:'))external.push(req.url());});
 const waitRoute=async()=>page.waitForTimeout(30);
 await page.goto(base);
 assert.equal(await page.locator('.poem-card').count(),12);
 await page.screenshot({path:path.join(screenshots,'home-desktop.png')});
 const ids=new Set();
 for(let n=1;n<=7;n++){
  await page.getByRole('button',{name:`第 ${n} 页`,exact:true}).click();
  const links=await page.locator('.poem-card').evaluateAll(els=>els.map(e=>e.hash));
  links.forEach(h=>ids.add(new URLSearchParams(h.slice(1)).get('poem')));
 }
 assert.equal(ids.size,75);assert.equal(await page.locator('.poem-card').count(),3);
 assert.equal(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled(),true);
 const input=page.getByRole('searchbox');
 await input.fill('  李白  ');assert.equal(await page.locator('.poem-card').count(),7);
 await input.fill('床前明月光');assert.equal(await page.locator('.poem-card').count(),1);
 await page.locator('.poem-card').click();await waitRoute();
 assert.equal(await page.locator('.sheet-header h1').getAttribute('aria-label'),'静夜思');
 await page.locator('[data-line="3"]').click();
 assert.match(await page.locator('.translation-item.active').innerText(),/思念起自己的家乡/);
 const pin=page.getByRole('button',{name:'显示拼音',exact:true});
 await pin.click();assert.equal(await page.locator('.poem-line rt').first().isVisible(),false);
 await page.reload();assert.equal(await pin.getAttribute('aria-pressed'),'false');
 await pin.click();
 await page.getByRole('tab',{name:'字词小锦囊'}).click();assert.ok(await page.locator('.word-note').count()>1);
 await page.getByRole('tab',{name:'字词小锦囊'}).press('ArrowLeft');assert.equal(await page.getByRole('tab',{name:'逐句小翻译'}).getAttribute('aria-selected'),'true');
 await page.getByRole('button',{name:'显示释义',exact:true}).click();assert.equal(await page.locator('.reading-sidebar').isVisible(),false);
 await page.locator('[data-line="0"]').click();assert.equal(await page.locator('.reading-sidebar').isVisible(),true);
 await page.screenshot({path:path.join(screenshots,'reader-desktop.png')});
 await page.getByRole('link',{name:'返回小书屋'}).click();await waitRoute();assert.equal(await input.inputValue(),'床前明月光');
 await input.fill('凉州词');assert.equal(await page.locator('.poem-card').count(),2);
 await input.fill('完全不存在的诗词');assert.equal(await page.locator('.empty-state').count(),1);
 await page.getByRole('button',{name:'看看全部 75 篇'}).click();assert.equal(await page.locator('.poem-card').count(),12);
 await input.fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.empty-state img').count(),0);
 await input.fill('');
 await page.getByRole('button',{name:'小书屋使用指南'}).click();assert.equal(await page.locator('#help-dialog').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#help-dialog').isVisible(),false);
 await page.goto(`${base}/#poem=missing`);await waitRoute();assert.equal(await page.locator('.poem-card').count(),12);
 const overflow=[];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:844});
  for(const id of ids){
   await page.goto(`${base}/#poem=${id}`);await waitRoute();
   assert.ok(await page.locator('.poem-line').count()>=4, id);
   const bad=await page.evaluate(()=>({doc:document.documentElement.scrollWidth>innerWidth+1,lines:[...document.querySelectorAll('.poem-line')].some(el=>el.scrollWidth>el.clientWidth+2)}));
   if(bad.doc||bad.lines)overflow.push({width,id,...bad});
  }
 }
 assert.deepEqual(overflow,[],'All 75 poems must fit at desktop, tablet and mobile widths');
 await page.setViewportSize({width:390,height:844});await page.goto(base);await waitRoute();
 await page.screenshot({path:path.join(screenshots,'home-mobile.png'),fullPage:true});
 await page.getByRole('link',{name:'一起读《春晓》'}).click();await waitRoute();
 await page.screenshot({path:path.join(screenshots,'reader-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'No external requests required');
 const filePage=await browser.newPage();
 await filePage.goto(pathToFileURL(path.join(ROOT,'index.html')).href);
 await filePage.getByRole('searchbox').fill('江雪');assert.equal(await filePage.locator('.poem-card').count(),1);
 await filePage.locator('.poem-card').click();await filePage.waitForTimeout(30);assert.equal(await filePage.locator('.poem-line').count(),4);
 console.log('PASS: 75 poems, pagination, title/author/line searches, safe empty state, pinyin persistence, per-line meanings, keyboard tabs, help dialog, direct file access, no external requests, all 75 detail pages at 4 viewport widths.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
