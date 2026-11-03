(() => {
  'use strict';
  const poems = window.POEMS;
  const PAGE_SIZE = 12;
  const main = document.querySelector('#main');
  const breadcrumb = document.querySelector('#breadcrumb');
  const announcer = document.querySelector('#announcer');
  const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  let query = '', page = 1, currentPoem = null, activeLine = 0, activeTab = 'translation', view = 'all';
  const viewLabels = {all: '诗词小书屋', favorites: '我的收藏', learning: '正在学习', learned: '已学诗词', practice: '诗词小挑战', mistakes: '我的错题本'};
  const statusLabels = {unstarted: '还没学', learning: '正在学习', learned: '已学习'};
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const learning = window.PoetryLearning.createStore(poems.map(p => p.id), storage);
  const practice = window.createPracticeUI({poems,storage,main,onUpdate: stats => {
    document.querySelector('#practice-stars').textContent = stats.stars;
    document.querySelector('#mistake-count').textContent = stats.pendingPoems;
  }});
  let toastTimer;
  let showPinyin = true, showMeaning = true;
  try { showPinyin = localStorage.getItem('poetry-pinyin') !== 'false'; showMeaning = localStorage.getItem('poetry-meaning') !== 'false'; } catch { /* Reading also works when browser storage is unavailable. */ }
  const normalize = text => text.normalize('NFKC').replace(/[\s，。！？、；：“”‘’（）《》,.!?;:()]/g, '').toLowerCase();
  const corpus = new Map(poems.map(p => [p.id, normalize(`${p.title}${p.author}${p.lines.map(l => l.text).join('')}`)]));
  function filteredPoems() {
    const key = normalize(query);
    return poems.filter(p => {
      const r = learning.get(p.id);
      return (!key || corpus.get(p.id).includes(key)) && (view === 'all' || (view === 'favorites' ? r.favorite : r.status === view));
    });
  }
  function url(poemId = null, targetPage = page, term = query) {
    const params = new URLSearchParams();
    if (poemId) params.set('poem', poemId);
    if (view !== 'all') params.set('view', view);
    if (term) params.set('q', term);
    if (targetPage > 1) params.set('page', targetPage);
    return `#${params.toString()}`;
  }
  function highlight(value) {
    const trimmed = query.trim();
    if (!trimmed) return escape(value);
    const i = value.toLowerCase().indexOf(trimmed.toLowerCase());
    if (i < 0) return escape(value);
    return `${escape(value.slice(0,i))}<mark>${escape(value.slice(i,i+trimmed.length))}</mark>${escape(value.slice(i+trimmed.length))}`;
  }
  function ruby(tokens) {
    return tokens.map(t => t.pinyin ? `<ruby>${escape(t.char)}<rt>${escape(t.pinyin)}</rt></ruby>` : `<span class="punctuation">${escape(t.char)}</span>`).join('');
  }
  function card(poem) {
    const key = normalize(query);
    const relevantLine = key && poem.lines.find(l => normalize(l.text).includes(key));
    const excerpt = relevantLine ? relevantLine.text : poem.lines.slice(0, 2).map(l => l.text).join('');
    const decoration = /月|夜/.test(poem.title) ? 'moon' : /山|楼/.test(poem.title) ? 'mountain' : /江|池|湖|泊|莲/.test(poem.title) ? 'waves' : /春|花|柳/.test(poem.title) ? 'flower' : 'leaf';
    const record = learning.get(poem.id);
    return `<article class="poem-card-shell"><a class="poem-card ${poem.title.length > 8 ? 'long-title' : ''}" href="${url(poem.id)}" aria-label="阅读《${escape(poem.title)}》，${escape(poem.author)}"><div class="card-top"><span class="dynasty-pill">${escape(poem.dynasty)} · ${poem.author.includes('民歌') || poem.author.includes('乐府') ? '民歌' : '诗词'}</span><span class="card-number">${String(poem.order).padStart(2,'0')} / 75</span></div><div class="card-decoration">${icon(decoration)}</div><h3>${highlight(poem.title)}</h3><p class="card-author">${highlight(poem.author)}</p><p class="card-excerpt">${highlight(excerpt)}</p><div class="card-bottom"><div class="card-features"><span><i class="pinyin-mini">ā</i> 拼音</span><span>≡ 逐句释义</span></div>${icon('arrow')}</div></a><div class="card-actions"><span class="study-badge ${record.status}">${icon(record.status === 'learned' ? 'check' : record.status === 'learning' ? 'leaf' : 'book')}${statusLabels[record.status]}</span>${favoriteButton(poem, true)}</div></article>`;
  }
  function renderResults() {
    const filtered = filteredPoems();
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), maxPage);
    const start = (page - 1) * PAGE_SIZE;
    document.querySelector('#results-meta-text').innerHTML = query ? `找到 <strong>${filtered.length}</strong> 篇与「${escape(query)}」相关的诗词` : `共 <strong>${filtered.length}</strong> 篇${view === 'all' ? '诗词，每一篇都藏着小小的美好' : viewLabels[view]}`;
    const grid = document.querySelector('#poem-grid');
    grid.innerHTML = filtered.length ? filtered.slice(start,start+PAGE_SIZE).map(card).join('') : `<div class="empty-state">${icon('search')}<h3>${query ? '这首诗，藏在哪里呢？' : view === 'favorites' ? '把喜欢的小诗，收进口袋吧' : view === 'learning' ? '下一首小诗，正等着你' : '每一次认真读，都是一小步'}</h3><p>${query ? `暂时没有找到「${escape(query)}」。试试其他诗名、作者或诗句，也可以查看全部诗词。` : view === 'favorites' ? '点击诗词旁的爱心，就能在这里再次找到它。' : '打开一首诗，在阅读页记下自己的学习状态吧。'}</p><button class="text-button" id="reset-search">看看全部 75 篇</button></div>`;
    document.querySelector('#pagination').innerHTML = filtered.length ? `<button class="page-button prev" data-page="${page-1}" aria-label="上一页" ${page===1?'disabled':''}>${icon('chevron')}</button>${Array.from({length:maxPage},(_,i)=>`<button class="page-button" data-page="${i+1}" aria-label="第 ${i+1} 页" ${page===i+1?'aria-current="page"':''}>${i+1}</button>`).join('')}<button class="page-button" data-page="${page+1}" aria-label="下一页" ${page===maxPage?'disabled':''}>${icon('chevron')}</button>` : '';
    document.querySelector('#clear-search').hidden = !query;
    announcer.textContent = `共找到 ${filtered.length} 篇诗词${filtered.length ? `，当前第 ${page} 页，共 ${maxPage} 页` : ''}`;
    document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
      page = Number(button.dataset.page);
      history.replaceState(null, '', url());
      renderResults();
      document.querySelector('#library-section').scrollIntoView({block:'start',behavior:'auto'});
      document.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
    }));
    document.querySelector('#reset-search')?.addEventListener('click', () => { view = 'all'; query = ''; page = 1; history.replaceState(null, '', url()); renderLibrary(); });
    bindFavorites();
  }
  function search(term) {
    query = term.trim().slice(0,100); page = 1;
    const input = document.querySelector('#search-input');
    if (input.value !== term) input.value = term;
    history.replaceState(null, '', url());
    renderResults();
  }
  function renderLibrary() {
    currentPoem = null;
    document.title = '诗词拾光 · 小小诗人，大大世界';
    breadcrumb.innerHTML = `我的小书屋 <span>/</span> <strong>${viewLabels[view]}</strong>`;
    main.className = '';
    main.innerHTML = `<section class="page-heading heading-with-summary library-heading"><div><h1>小诗人，你好呀 <em>✧</em></h1><p>让每一次翻阅，都遇见一点诗意。</p></div><div id="progress-panel">${progressPanel(true)}</div></section>${view === 'all' ? `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="eyebrow">${icon('spark')}在诗词里，慢慢长大</span><h2 id="hero-title">读一首小诗，<br>发现<span>大大的世界。</span></h2><p>跟着拼音轻轻读，把古人的心情变成自己的小发现。</p><a class="primary-button" href="${url('poem-10')}">一起读《春晓》${icon('arrow')}</a></div><img class="hero-art" src="assets/spring-garden.svg" alt="" width="600" height="360"><span class="hero-stamp" aria-hidden="true">诗意萌芽</span></section>` : ''}<section class="library-section" id="library-section" aria-labelledby="library-heading"><div class="section-heading"><h2 id="library-heading">${icon(view === 'favorites' ? 'heart' : 'book')}${viewLabels[view]}</h2><small>读诗的快乐，从这里开始</small></div><form class="search-row" id="search-form" role="search"><div class="search-box">${icon('search')}<label class="sr-only" for="search-input">搜索诗名、作者或诗句</label><input id="search-input" name="q" type="search" placeholder="搜一搜诗名、作者，或记得的诗句…" autocomplete="off" maxlength="100" value="${escape(query)}"><button class="clear-search" id="clear-search" type="button" aria-label="清空搜索" ${!query?'hidden':''}>${icon('close')}</button><button class="primary-button" type="submit">找一找</button></div><span class="search-hint">${icon('leaf')}总有一首，与你相遇</span></form><div class="quick-search"><span>试着搜搜</span><button data-query="春">春天的诗</button><button data-query="李白">李白</button><button data-query="月">月亮</button><button data-query="">全部诗词</button></div><div class="results-meta"><span id="results-meta-text"></span><span class="view-label"><span class="tiny-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span>按课标篇目排列</span></div><div class="poem-grid" id="poem-grid"></div><nav class="pagination" id="pagination" aria-label="诗词列表分页"></nav></section>`;
    document.querySelector('#search-form').addEventListener('submit', event => {event.preventDefault();search(document.querySelector('#search-input').value);});
    document.querySelector('#search-input').addEventListener('input', event => { if (!event.isComposing) search(event.target.value); });
    document.querySelector('#search-input').addEventListener('compositionend', event => search(event.target.value));
    document.querySelector('#clear-search').addEventListener('click', () => {search('');document.querySelector('#search-input').focus();});
    document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{if (!button.dataset.query) { view = 'all'; history.replaceState(null, '', url(null, 1, '')); renderLibrary(); } search(button.dataset.query);updateNavigation();document.querySelector('#search-input').focus({preventScroll:true});}));
    renderResults(); updateNavigation();
  }
  function renderMeanings() {
    const content = document.querySelector('#meaning-content');
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      const selected = tab.dataset.tab === activeTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    content.setAttribute('aria-labelledby', `tab-${activeTab}`);
    content.innerHTML = activeTab === 'translation' ? `<div class="meaning-lead">${icon('spark')}把诗读成一个小故事</div>${currentPoem.lines.map((line,i)=>`<section class="translation-item ${i===activeLine?'active':''}" data-translation="${i}"><h3><span class="translation-number">${String(i+1).padStart(2,'0')}</span>${escape(line.text)}</h3><p>${escape(line.translation)}</p></section>`).join('')}` : `<div class="meaning-lead">${icon('leaf')}认识新词，读懂诗意</div><dl>${currentPoem.notes.map(note=>`<div class="word-note"><dt>${escape(note.word)}</dt><dd>${escape(note.meaning)}</dd></div>`).join('')}</dl>`;
  }
  function setLine(index) {
    activeLine = index;
    document.querySelectorAll('[data-line]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.line)===index)));
    if (!showMeaning) {showMeaning=true;updateReadingOptions();}
    activeTab = 'translation'; renderMeanings();
    announcer.textContent = `${currentPoem.lines[index].text}意思是：${currentPoem.lines[index].translation}`;
    document.querySelector(`[data-translation="${index}"]`)?.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function updateReadingOptions() {
    main.classList.toggle('no-pinyin', !showPinyin);
    main.classList.toggle('no-meaning', !showMeaning);
    document.querySelector('#toggle-pinyin').setAttribute('aria-pressed',String(showPinyin));
    document.querySelector('#toggle-meaning').setAttribute('aria-pressed',String(showMeaning));
    try {localStorage.setItem('poetry-pinyin',String(showPinyin));localStorage.setItem('poetry-meaning',String(showMeaning));} catch { /* Preferences remain available for the current visit. */ }
  }
  function renderPoem(poem) {
    currentPoem = poem; activeLine=0; activeTab='translation';
    document.title = `${poem.title} · ${poem.author} | 诗词拾光`;
    breadcrumb.innerHTML = `<a href="${url()}">诗词小书屋</a><span>/</span><strong>一起读诗</strong>`;
    const filtered = filteredPoems();
    const pool = filtered.some(p=>p.id===poem.id) ? filtered : poems;
    const index = pool.findIndex(p=>p.id===poem.id);
    const previous = pool[index-1], next=pool[index+1];
    main.className='reader';
    main.innerHTML=`<div class="reading-toolbar"><a class="back-link" href="${url()}">${icon('arrow')}返回小书屋</a><div class="reading-options"><button class="toggle-button" id="toggle-pinyin" aria-pressed="${showPinyin}"><span>显示拼音</span><span class="switch-track" aria-hidden="true"></span></button><button class="toggle-button" id="toggle-meaning" aria-pressed="${showMeaning}"><span>显示释义</span><span class="switch-track" aria-hidden="true"></span></button></div></div><div id="progress-panel">${progressPanel()}</div><section class="study-panel" id="study-panel" aria-label="这首诗的学习记录">${studyPanel(poem)}</section><a class="practice-entry" href="#practice=${poem.id}"><span>${icon('spark')}读过啦，来试试小挑战？</span><span>练习这首诗 ${icon('arrow')}</span></a><div class="read-layout"><article class="poem-sheet"><div class="sheet-eyebrow">诗词拾光 · 第 ${String(poem.order).padStart(2,'0')} 篇</div><header class="sheet-header"><h1 class="${poem.title.length>8?'long':''}" aria-label="${escape(poem.title)}">${ruby(poem.titleTokens)}</h1><p class="poet-meta"><span class="dynasty-pill">${escape(poem.dynasty)}</span><span aria-label="${escape(poem.author)}">${ruby(poem.authorTokens)}</span></p></header><div class="poem-lines" aria-label="诗词原文，点击诗句查看释义">${poem.lines.map((line,i)=>`<button class="poem-line" data-line="${i}" aria-pressed="${i===0}" aria-label="${escape(line.text)} 查看这句的释义">${ruby(line.tokens)}</button>`).join('')}</div><div class="sheet-rule"></div><div class="sheet-hint">${icon('spark')}点一点诗句，发现它的小小心事</div></article><aside class="reading-sidebar" aria-label="诗词释义"><div class="meaning-panel"><div class="meaning-tabs" role="tablist" aria-label="释义类型"><button class="meaning-tab" id="tab-translation" role="tab" data-tab="translation" aria-controls="meaning-content" aria-selected="true">逐句小翻译</button><button class="meaning-tab" id="tab-notes" role="tab" data-tab="notes" aria-controls="meaning-content" aria-selected="false" tabindex="-1">字词小锦囊</button></div><div class="meaning-content" id="meaning-content" role="tabpanel" tabindex="0" aria-labelledby="tab-translation"></div></div><div class="reading-nudge">${icon('sun')}<div><b>慢慢读，也是一种快乐</b><p>读完之后，闭上眼睛想一想：<br>你在这首诗里，看到了什么画面？</p></div></div></aside></div><nav class="reader-pagination" aria-label="切换诗词">${previous?`<a class="previous" href="${url(previous.id)}">${icon('arrow')}<span>上一篇 · ${escape(previous.title)}</span></a>`:''}${next?`<a class="next" href="${url(next.id)}"><span>下一篇 · ${escape(next.title)}</span>${icon('arrow')}</a>`:''}</nav><p class="reader-count">${query && pool===filtered ? '搜索结果' : '诗词小书屋'} · ${index+1} / ${pool.length} 篇</p>`;
    document.querySelector('#toggle-pinyin').addEventListener('click',()=>{showPinyin=!showPinyin;updateReadingOptions();});
    document.querySelector('#toggle-meaning').addEventListener('click',()=>{showMeaning=!showMeaning;updateReadingOptions();});
    document.querySelectorAll('[data-line]').forEach(button=>button.addEventListener('click',()=>setLine(Number(button.dataset.line))));
    document.querySelectorAll('[data-tab]').forEach(button=>{
      button.addEventListener('click',()=>{activeTab=button.dataset.tab;renderMeanings();});
      button.addEventListener('keydown',event=>{
        if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
          event.preventDefault();activeTab=event.key==='Home'?'translation':event.key==='End'?'notes':activeTab==='notes'?'translation':'notes';renderMeanings();document.querySelector(`#tab-${activeTab}`).focus();
        }
      });
    });
    renderMeanings(); updateReadingOptions(); bindStudy(); updateNavigation();
  }

  function timeLabel(stamp) {
    return new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(stamp));
  }
  function timeMarkup(label, stamp) { return stamp ? `<span>${label} <time datetime="${escape(stamp)}">${timeLabel(stamp)}</time></span>` : ''; }
  function favoriteButton(poem, compact = false) {
    const r = learning.get(poem.id);
    return `<button class="favorite-button ${r.favorite ? 'is-favorite' : ''} ${compact ? 'compact' : ''}" data-favorite="${poem.id}" aria-pressed="${r.favorite}" aria-label="${r.favorite ? '取消收藏' : '收藏'}《${escape(poem.title)}》">${icon('heart')}<span>${r.favorite ? '已收藏' : '收藏'}</span></button>`;
  }
  function progressPanel(compact = false) {
    const stats = learning.summary(), pct = Math.round(stats.learned / stats.total * 100);
    return `<section class="growth-panel ${compact ? 'growth-compact' : ''}" aria-label="我的学习进度"><div class="growth-title">${icon('leaf')}<div><b>我的诗意足迹</b><p>${stats.learned === stats.total ? '75 篇小诗，都留下了你的足迹。再读一遍，也会有新发现！' : stats.learned ? '每学会一首，心里就多开一朵小花。' : '从一首开始，慢慢读，也能走很远。'}</p></div></div><div class="growth-meter"><div class="growth-count"><span>已学习 <strong>${stats.learned} / ${stats.total}</strong> 篇</span><span>${pct}%</span></div><progress max="${stats.total}" value="${stats.learned}" aria-label="已学习诗词进度">${stats.learned} / ${stats.total}</progress><div class="growth-caption"><span>正在学习 ${stats.learning} 篇</span><span>收藏 ${stats.favorites} 篇</span></div></div></section>${learning.warning ? `<p class="storage-note storage-warning" role="status">${escape(learning.warning)}</p>` : ''}`;
  }
  function studyPanel(poem) {
    const r = learning.get(poem.id);
    const encouragement = r.status === 'learned' ? '真棒！你又和一首诗成为了朋友。过几天再读读，诗意会记得更牢。' : r.status === 'learning' ? '小小诗人，已经迈出了第一步！一句一句慢慢读，期待你的新发现。' : '准备好了吗？读一读、想一想，让这首诗成为你的新朋友。';
    return `<div class="study-heading"><div><span class="eyebrow">这首诗的小脚印</span><h2>${statusLabels[r.status]}</h2></div>${favoriteButton(poem)}</div><p class="study-encouragement">${encouragement}</p><div class="study-controls" role="group" aria-label="设置学习状态"><button data-status="learning" aria-pressed="${r.status === 'learning'}">${icon('leaf')}正在学习</button><button data-status="learned" aria-pressed="${r.status === 'learned'}">${icon('check')}已学习</button><button data-status="unstarted" class="reset-study" aria-pressed="${r.status === 'unstarted'}">还没学</button></div><div class="study-times">${timeMarkup('首次开始', r.startedAt)}${timeMarkup(r.status === 'learned' ? '最近学完' : '上次学完', r.learnedAt)}${timeMarkup('状态更新', r.changedAt)}${r.favorite ? timeMarkup('收藏于', r.favoriteAt) : ''}</div>`;
  }
  function updateNavigation() {
    const stats = learning.summary();
    for (const [key, id] of Object.entries({all:'library', favorites:'favorites', learning:'learning', learned:'learned', practice:'practice', mistakes:'mistakes'})) {
      const link = document.querySelector(`#${id}-nav`);
      link.classList.toggle('active', view === key);
      if (view === key) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    }
    document.querySelector('#favorite-count').textContent = stats.favorites;
    document.querySelector('#learning-count').textContent = stats.learning;
    document.querySelector('#learned-count').textContent = stats.learned;
    const practiceStats = practice.summary();
    document.querySelector('#practice-stars').textContent = practiceStats.stars;
    document.querySelector('#mistake-count').textContent = practiceStats.pendingPoems;
  }
  function showFeedback(message, celebrate = false) {
    const toast = document.querySelector('#learning-toast');
    clearTimeout(toastTimer);
    toast.className = 'celebration-toast' + (celebrate && !learning.warning ? ' celebrate' : '');
    toast.innerHTML = `<span class="toast-spark" aria-hidden="true">${celebrate ? '✦' : '♡'}</span><div><b>${escape(message)}</b>${learning.warning ? `<p>${escape(learning.warning)}</p>` : ''}</div><button id="dismiss-toast" aria-label="关闭提示">${icon('close')}</button>`;
    toast.hidden = false;
    document.querySelector('#dismiss-toast').onclick = () => {toast.hidden = true;};
    toastTimer = setTimeout(() => {toast.hidden = true;}, 6500);
  }
  function refreshLearning() {
    const progress = document.querySelector('#progress-panel');
    if (progress) progress.innerHTML = progressPanel(!currentPoem);
    if (currentPoem) {
      const focusedStatus = document.activeElement?.dataset.status;
      const focusedFavorite = document.activeElement?.dataset.favorite;
      document.querySelector('#study-panel').innerHTML = studyPanel(currentPoem);
      bindStudy();
      if (focusedStatus) document.querySelector(`[data-status="${focusedStatus}"]`)?.focus({preventScroll:true});
      else if (focusedFavorite) document.querySelector(`[data-favorite="${focusedFavorite}"]`)?.focus({preventScroll:true});
    } else {
      const focusedFavorite = document.activeElement?.dataset.favorite;
      renderResults();
      history.replaceState(null, '', url());
      if (focusedFavorite) {
        const target = document.querySelector(`[data-favorite="${focusedFavorite}"]`) || document.querySelector('[data-favorite]') || document.querySelector('#reset-search');
        target?.focus({preventScroll:true});
      }
    }
    updateNavigation();
  }
  function bindFavorites() {
    document.querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.favorite;
      const result = learning.change(id, 'favorite');
      refreshLearning();
      showFeedback(result.record.favorite ? '已收进口袋，喜欢的诗随时再读。' : '已取消收藏，想念它时再来看看。');
    }));
  }
  function bindStudy() {
    bindFavorites();
    document.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
      const result = learning.change(currentPoem.id, 'status', button.dataset.status);
      if (!result.changed) {showFeedback('已经记下这个状态啦，继续享受读诗吧。'); return;}
      refreshLearning();
      const stats = learning.summary();
      const message = result.record.status === 'learned' ? `真棒！已学会 ${stats.learned} / ${stats.total} 篇，每一小步都值得庆祝！` : result.record.status === 'learning' ? '新的一步开始啦！慢慢读，期待你与诗里的世界相遇。' : '已改为“还没学”。准备好了，就再来读一读吧。';
      showFeedback(message, result.record.status === 'learned');
    }));
  }

  function route(focus = true) {
    const params = new URLSearchParams(location.hash.slice(1));
    document.querySelector('#learning-toast').hidden = true;
    view = Object.hasOwn(viewLabels, params.get('view')) ? params.get('view') : 'all';
    query = (params.get('q') || '').slice(0,100);
    page = Math.max(1, Number.parseInt(params.get('page'),10)||1);
    if (params.has('practice')) view = 'practice';
    if (view === 'practice' || view === 'mistakes') {
      currentPoem = null;
      breadcrumb.innerHTML = `我的小书屋 <span>/</span> <strong>${viewLabels[view]}</strong>`;
      document.title = viewLabels[view] + ' | 诗词拾光';
      if (view === 'mistakes') practice.renderMistakes();
      else practice.renderSetup(params.get('practice'), params.get('review') === '1');
      updateNavigation(); window.scrollTo(0,0);
      if (focus) main.focus({preventScroll:true});
      return;
    }
    const id = params.get('poem');
    const poem = poems.find(p=>p.id===id);
    if(poem) renderPoem(poem); else {
      renderLibrary();
      if(id) {announcer.textContent='没有找到这首诗，已返回诗词小书屋。';history.replaceState(null,'',url());}
    }
    window.scrollTo(0,0);
    if(focus) main.focus({preventScroll:true});
  }
  const dialog = document.querySelector('#help-dialog');
  document.querySelector('#help-button').addEventListener('click',()=>dialog.showModal());
  document.querySelector('#close-help').addEventListener('click',()=>dialog.close());
  document.querySelector('#start-reading').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  const contactDialog = document.querySelector('#contact-dialog');
  document.querySelector('#contact-button').addEventListener('click',()=>contactDialog.showModal());
  document.querySelector('#close-contact').addEventListener('click',()=>contactDialog.close());
  contactDialog.addEventListener('click',event=>{
    if(event.target===contactDialog){const r=contactDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)contactDialog.close();}
  });
  window.addEventListener('hashchange',()=>route());
  window.addEventListener('storage', event => {
    if (event.key === window.PoetryPractice.KEY || event.key === null) practice.sync();
    if (event.key !== window.PoetryLearning.KEY && event.key !== null) return;
    learning.reload();
    if (view === 'practice' || view === 'mistakes') updateNavigation(); else refreshLearning();
  });
  document.querySelector('.sidebar').addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link && link.hash === location.hash && (view === 'practice' || view === 'mistakes')) { event.preventDefault(); route(); }
  });
  route(false);
})();
