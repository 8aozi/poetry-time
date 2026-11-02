/* Practice screens are separate from the reading UI; no original text is exposed during a question. */
window.createPracticeUI=function({poems,storage,main,onUpdate}){
  const api=window.PoetryPractice,bank=api.createBank(poems),store=api.createStore(bank,storage);
  const byId=new Map(poems.map(p=>[p.id,p]));
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const typeNames={mixed:'混合挑战',next:'选择下一句',previous:'选择上一句',blank:'填空字词'};
  let session=null,poemId=null,review=false,filter='pending';
  const warning=()=>`<p class="storage-note ${store.warning?'storage-warning':''}">${store.warning||'星星和错题保存在当前浏览器，刷新后保留；不跨设备同步。'}</p>`;
  function update(){onUpdate(store.summary());}
  function stats(){const s=store.summary();return `<div class="practice-stats"><span class="star-total">${icon('spark')}<b>${s.stars}</b> 颗星星</span><span>${s.pendingPoems} 首诗待巩固 · ${s.pending} 道待订正</span><a href="#view=mistakes">去错题本 ${icon('arrow')}</a></div>`;}
  function heading(title,subtitle){return `<div class="page-heading"><div><span class="eyebrow">小小诗人 · 大胆试一试</span><h1>${title}</h1><p>${subtitle}</p></div></div>`;}
  function renderSetup(id=null,isReview=false){
    poemId=byId.has(id)?id:null;review=isReview;session=null;
    const poem=byId.get(poemId),pending=store.mistakes().filter(m=>m.pending&&(!poemId||m.question.poemId===poemId));
    main.className='practice-page';
    main.innerHTML=heading(review?'错题再挑战':'诗词小挑战',poem?`和《${escape(poem.title)}》再熟悉一点`:'读过的小诗，你还记得多少呢？')+stats()+`<section class="challenge-setup"><div class="challenge-emblem" aria-hidden="true">✦</div><h2>${review?'再试一次，就是新的进步':'每次 5 小题，攒下小星星'}</h2><p>${review?`这里有 ${pending.length} 道待订正题，每轮最多练 5 题。答对对应题目，就会标为已订正。`:'选一选上下句，填一填诗中字词。答错也没关系，我们一起把它记住。'}</p>${review?'':`<fieldset class="mode-picker"><legend>今天想怎么练？</legend>${Object.entries(typeNames).map(([value,label],i)=>`<label><input type="radio" name="practice-mode" value="${value}" ${i===0?'checked':''}><span>${icon(value==='blank'?'book':'leaf')}${label}</span></label>`).join('')}</fieldset>`}<div class="practice-rules"><p>✧ 每道题首次答对，奖励 1 颗星星；重复练习不重复加星。</p><p>✧ 答错的诗会记进错题本，订正后保留回顾记录。</p><p>✧ 学习进度由你自己标记，小练习不改变“已学习”状态。</p></div><button class="primary-button" id="start-challenge" ${review&&!pending.length?'disabled':''}>${review?(pending.length?'开始订正':'这一部分已订正完啦'):'开始挑战'} ${icon('arrow')}</button><a class="back-link" href="${poem?'#poem='+poem.id:'#'}">${review?'返回小书屋':poem?'回到这首诗':'回小书屋读一读'}</a></section>${warning()}`;
    document.querySelector('#start-challenge').onclick=()=>{
      const type=review?'mixed':document.querySelector('[name=practice-mode]:checked').value;
      const ids=review?store.mistakes().filter(m=>m.pending).map(m=>m.question.id):null;
      const questions=api.select(bank,{poemId,type,ids,limit:5});
      if(!questions.length){renderSetup(poemId,review);return;}
      session={questions,index:0,results:[],submitted:false};renderQuestion();
    };update();
  }
  function renderQuestion(){
    const q=session.questions[session.index],poem=byId.get(q.poemId),options=api.choices(q,poems);
    session.submitted=false;
    main.innerHTML=`<div class="challenge-top"><a class="back-link" id="exit-challenge" href="${review?'#view=mistakes':'#view=practice'}">${icon('arrow')}退出本轮</a><span>第 ${session.index+1} / ${session.questions.length} 题</span><span class="star-total">✦ ${store.summary().stars} 颗</span></div><progress class="round-progress" value="${session.index}" max="${session.questions.length}" aria-label="本轮已答题数"></progress><section class="question-card" aria-labelledby="question-title"><span class="question-type">${typeNames[q.type]}</span><h1 id="question-title">${q.type==='blank'?'补上藏起来的字词吧':q.type==='next'?'它的下一句是什么？':'它的上一句是什么？'}</h1><p class="question-source">《${escape(poem.title)}》 · ${escape(poem.author)}</p><div class="question-verse">${q.type==='blank'?`${escape(q.before)}<span class="verse-blank" aria-label="${q.size}个字待填写">${'□'.repeat(q.size)}</span>${escape(q.after)}`:escape(q.prompt)}</div><form id="answer-form">${q.type==='blank'?`<label class="fill-label" for="fill-answer">填入 ${q.size} 个汉字</label><input class="fill-answer" id="fill-answer" type="text" autocomplete="off" maxlength="40" placeholder="在这里写答案" aria-describedby="answer-error">`:`<fieldset class="answer-options"><legend class="sr-only">请选择正确的${q.type==='next'?'下一句':'上一句'}</legend>${options.map((text,i)=>`<label class="answer-option"><input type="radio" name="answer" value="${escape(text)}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${escape(text)}</span></label>`).join('')}</fieldset>`}<p class="answer-error" id="answer-error" role="status"></p><button class="primary-button" id="submit-answer" type="submit">我答好啦 ${icon('check')}</button></form><div id="answer-feedback" aria-live="polite"></div></section><div id="practice-warning">${warning()}</div>`;
    document.querySelector('#exit-challenge').onclick=event=>{if (!review) {event.preventDefault();renderSetup(poemId,false);}};
    let composing=false;
    const fill=document.querySelector('#fill-answer');
    fill?.addEventListener('compositionstart',()=>{composing=true;});
    fill?.addEventListener('compositionend',()=>{composing=false;});
    document.querySelector('#answer-form').onsubmit=event=>{
      event.preventDefault();if(session.submitted||composing||event.isComposing)return;
      const answer=q.type==='blank'?document.querySelector('#fill-answer').value:document.querySelector('[name=answer]:checked')?.value||'';
      const result=store.submit(q.id,answer);
      if(result.empty){document.querySelector('#answer-error').textContent=q.type==='blank'?'先填上你的答案，再来试一试吧。':'先选一个答案，再来试一试吧。';return;}
      session.submitted=true;session.results.push({...result,question:q});
      document.querySelector('.challenge-top .star-total').textContent = `✦ ${store.summary().stars} 颗`;
      document.querySelector('.round-progress').value=session.index+1;
      document.querySelector('#answer-error').textContent='';
      document.querySelectorAll('#answer-form input,#submit-answer').forEach(el=>el.disabled=true);
      document.querySelectorAll('.answer-option').forEach(el=>{
        const input=el.querySelector('input');
        if(api.normalize(input.value)===api.normalize(q.answer))el.classList.add('correct-option');
        else if(input.checked)el.classList.add('wrong-option');
      });
      const feedback=document.querySelector('#answer-feedback');
      feedback.innerHTML=`<div class="answer-feedback ${result.correct?'answer-correct':'answer-wrong'}"><span class="feedback-symbol" aria-hidden="true">${result.correct?'✦':'☘'}</span><div><h2>${result.correct?result.reward?'答对啦！收获 1 颗小星星':'又答对啦！你记得越来越牢了':'没关系，再认识它一次吧'}</h2><p>${result.correct?result.reward?'每一次认真思考，都在让你成长。':'这道题的星星已经收集过啦，温习同样值得鼓励。':'已把这首诗记进错题本，下次一起把它读熟。'}</p><p><b>正确答案：</b>${escape(q.answer)}</p><blockquote>${escape(poem.lines[q.answerIndex].text)}</blockquote><p class="feedback-meaning">${escape(q.translation)}</p></div></div><button class="primary-button" id="next-question">${session.index+1===session.questions.length?'看看本轮收获':'下一小题'} ${icon('arrow')}</button>`;
      document.querySelector('#practice-warning').innerHTML=warning();update();
      document.querySelector('#next-question').onclick=()=>{session.index++;if(session.index<session.questions.length)renderQuestion();else renderResult();};
      document.querySelector('#next-question').focus({preventScroll:true});feedback.scrollIntoView({block:'nearest'});
    };
    main.focus({preventScroll:true});window.scrollTo(0,0);
  }
  function renderResult(){
    const correct=session.results.filter(r=>r.correct).length,stars=session.results.reduce((n,r)=>n+r.reward,0);
    main.innerHTML=heading('把努力，装进口袋','完成一轮练习，就多了一点点进步。')+`<section class="round-result"><span class="result-star" aria-hidden="true">✦</span><h2>${correct===session.results.length?'这一轮全部答对啦！':'认真尝试的你，真棒！'}</h2><div class="result-numbers"><div><strong>${correct} / ${session.results.length}</strong><span>本轮答对</span></div><div><strong>+ ${stars}</strong><span>新收获星星</span></div><div><strong>${store.summary().stars}</strong><span>累计星星</span></div></div><p>${correct===session.results.length?'诗句里的美好，已经悄悄住进你的记忆。':'没记牢的诗已经收进错题本，慢慢来，再读一次就更熟悉。'}</p><button class="primary-button" id="another-round">${review?'继续订正':'再来一小轮'}</button><a class="secondary-button" href="#view=mistakes">看看错题本</a><a class="back-link" href="#">回小书屋读诗</a></section>${warning()}`;
    document.querySelector('#another-round').onclick=()=>renderSetup(poemId,review);main.focus({preventScroll:true});window.scrollTo(0,0);update();
  }
  function renderMistakes(){
    session=null;main.className='practice-page mistakes-page';
    const all=store.mistakes(),items=all.filter(m=>filter==='all'||(filter==='pending'?m.pending:!m.pending));
    const groups=new Map();for(const item of items){const id=item.question.poemId;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(item);}
    main.innerHTML=heading('我的错题本','错题是小路标，带你找到下一次进步的方向。')+stats()+`<div class="mistake-toolbar"><div class="mistake-filters" role="group" aria-label="错题状态">${[['pending','待订正'],['corrected','已订正'],['all','全部记录']].map(([key,label])=>`<button data-mistake-filter="${key}" aria-pressed="${key===filter}">${label}</button>`).join('')}</div><a class="primary-button" href="#practice=all&review=1">订正待练错题 ${icon('arrow')}</a></div><p class="mistake-count">${groups.size} 首诗 · ${items.length} 道${filter==='pending'?'待订正':filter==='corrected'?'已订正':''}题</p><div class="mistake-list">${items.length?[...groups].map(([id,rows])=>{
      const poem=byId.get(id),pending=rows.filter(m=>m.pending).length;
      return `<article class="mistake-poem"><header><div><span class="eyebrow">${escape(poem.dynasty)} · ${escape(poem.author)}</span><h2>${escape(poem.title)}</h2></div><div class="mistake-links"><a href="#poem=${id}">回看原诗</a>${pending?`<a class="secondary-button" href="#practice=${id}&review=1">再练这首诗</a>`:'<span class="corrected-badge">已订正 ✓</span>'}</div></header>${rows.map(m=>{const q=m.question;return `<details class="mistake-detail"><summary><span class="mistake-state ${m.pending?'':'corrected'}">${m.pending?'待订正':'已订正'}</span><span>${typeNames[q.type]} · ${escape(q.type==='blank'?q.before+'□'.repeat(q.size)+q.after:q.prompt)}</span></summary><div class="mistake-detail-body"><p>最近错答：<span class="old-answer">${escape(m.lastWrongAnswer)}</span></p><p>正确答案：<strong>${escape(q.answer)}</strong></p><p>${escape(q.translation)}</p><p class="mistake-time">答错 ${m.wrongCount} 次 · 最近错答 <time datetime="${m.lastWrongAt||''}">${formatTime(m.lastWrongAt)}</time>${m.correctedAt?` · 订正于 <time datetime="${m.correctedAt}">${formatTime(m.correctedAt)}</time>`:''}</p></div></details>`;}).join('')}</article>`;
    }).join(''):`<section class="empty-state">${icon('leaf')}<h2>${filter==='pending'?'暂时没有待订正的题，真好！':filter==='corrected'?'再试一次，就能留下订正的足迹':'错题本还是空的'}</h2><p>答错的诗会自动收在这里，答对对应题目后会标为已订正。</p><a class="primary-button" href="#view=practice">去小挑战试一试</a></section>`}</div>${warning()}`;
    document.querySelectorAll('[data-mistake-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.mistakeFilter;renderMistakes();document.querySelector(`[data-mistake-filter="${filter}"]`).focus({preventScroll:true});});update();
  }
  function formatTime(stamp){return stamp?new Intl.DateTimeFormat('zh-CN',{dateStyle:'short',timeStyle:'medium'}).format(new Date(stamp)):'未记录';}
  function sync(){store.reload();update();if(main.classList.contains('mistakes-page'))renderMistakes();}
  return {renderSetup,renderMistakes,sync,summary:()=>store.summary()};
};
