(() => {
  "use strict";
  const paths = {
    bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    pin: '<path d="M19 10c0 4.5-7 11-7 11S5 14.5 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
    bento: '<rect x="2.5" y="6" width="19" height="13.5" rx="3"/><path d="M3 10h18M12 10v9M14 5l5-3M5.5 14c1-1.5 2.4-1.5 3.4 0M15.2 14h3M15.2 16.6h2"/>',
    bowl: '<path d="M2 12h20c-.6 4.7-4 7.5-9.9 7.5S3 16.5 2 12ZM8.5 20l-.5 1h8l-.5-1M12 9l7-6M15 9l7-5M5 9q-1-1 0-2t0-2"/>',
    chop: '<path d="m3 4 17 16M5.5 2.5 15 12M20.3 3 15 8m2-7-5.2 6.1q-1.4 2 .5 3.3M11 13 3 21"/>',
    sake: '<path d="M5 3h6M6 3v5c0 2.5-3 3.1-3 6v5c0 1.1.8 2 2 2h6c1.2 0 2-.9 2-2v-5c0-2.9-3-3.5-3-6V3M3.5 15h9M15 13h7l-1 5.5q-2.5 2-5 0z"/>',
    gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v8h14v-8M12 9v12m0-12C9 2 5 3 5 5.7 5 8 9 9 12 9Zm0 0c3-7 7-6 7-3.3C19 8 15 9 12 9Z"/>',
    walk: '<path d="m2 5 6-2 8 3 6-2v15l-6 2-8-3-6 2zM8 3v15M16 6v15"/>',
    book:'<path d="M12 6c-2.2-1.8-5.8-2.6-9-1.7v14c3.2-.9 6.8-.1 9 1.7 2.1-1.8 5.7-2.6 9-1.7v-14c-3.3-.9-6.9-.1-9 1.7Zm0 0v14"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6.5v6l3.7 2"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    close:'<path d="m5 5 14 14M19 5 5 19"/>', chevron:'<path d="m9 5 7 7-7 7"/>',left:'<path d="m15 5-7 7 7 7"/>',up:'<path d="m5 14 7-7 7 7"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',external:'<path d="M13 4h7v7m0-7L10 14m-1-9H4v15h15v-5"/>',
    play:'<path d="m8 5 10 7-10 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>'
  };
  window.GuideIcons = name => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name] || '')+'</svg>';
  document.querySelectorAll('[data-icon]').forEach(node => node.innerHTML = window.GuideIcons(node.dataset.icon));

  const menuButton = document.querySelector('.menu-btn');
  const menu = document.querySelector('#mobile-menu');
  function setMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label',open ? 'メニューを閉じる' : 'メニューを開く');
    menuButton.innerHTML = window.GuideIcons(open ? 'close' : 'menu');
  }
  menuButton.addEventListener('click',() => setMenu(menu.hidden));
  menu.addEventListener('click',event => { if(event.target.closest('a'))setMenu(false); });
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape' && !menu.hidden){ setMenu(false); menuButton.focus(); }
  });
  matchMedia('(min-width:761px)').addEventListener('change',event => { if(event.matches)setMenu(false); });

  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  const frames = [...document.querySelectorAll('.hero-shot')];
  const captions = ['萬代橋と信濃川','古町・鍋茶屋通り','山の下海浜公園の夕日'];
  const motionButton = document.querySelector('#motion-control');
  let slide = 0, timer = 0, playing = !motion.matches, heroVisible = true;
  function showSlide(next) {
    slide = (next + frames.length) % frames.length;
    frames.forEach((frame,index) => frame.classList.toggle('current', index === slide));
    document.querySelector('#slide-location').textContent = captions[slide];
    document.querySelector('#current-slide').textContent = String(slide + 1).padStart(2,'0');
  }
  function schedule() {
    clearInterval(timer);
    if(playing && heroVisible && !document.hidden) timer = setInterval(() => showSlide(slide + 1),10500);
    motionButton.innerHTML = window.GuideIcons(playing ? 'pause' : 'play');
    motionButton.setAttribute('aria-label','風景の自動切り替えを'+(playing ? '停止' : '再生'));
    motionButton.setAttribute('aria-pressed',String(playing));
  }
  document.querySelectorAll('[data-slide]').forEach(control => control.addEventListener('click',() => {
    playing = false;
    showSlide(slide + Number(control.dataset.slide)); schedule();
  }));
  motionButton.addEventListener('click',() => { playing = !playing; schedule(); });
  motion.addEventListener('change',() => { if(motion.matches)playing=false; schedule(); });
  document.addEventListener('visibilitychange',schedule);
  if('IntersectionObserver' in window){
    new IntersectionObserver(([entry]) => {heroVisible=entry.isIntersecting; schedule();}).observe(document.querySelector('.hero'));
    if(!motion.matches){
      const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
        if(entry.isIntersecting){entry.target.classList.add('in-view');reveal.unobserve(entry.target);}
      }),{threshold:.08});
      document.querySelectorAll('.section-head,.bento-card,.story,.shop-box,.route-inner').forEach(node => reveal.observe(node));
    }
  }
  schedule();

  const plans = {
    honkan:[['cityhall','市役所本館','学校町通の本館を起点に。'],['kokoro','中華そば こころ','市役所向かいで燕の背脂ラーメンを。'],['hakusan','白山公園','食後は池のほとりをひと回り。']],
    furumachi:[['rufuru','ふるまち庁舎','古町ルフルを出て本町方面へ。'],['omi','本町の青海ショッピングセンター','鮮魚店が並ぶ市場で、地元の台所をのぞく。'],['furumachi','古町の小路','鍋茶屋通りへ足を延ばし、花街の風情を味わう。']],
    station:[['ponshukan','ぽんしゅ館 新潟驛店','駅で好みの地酒を探すところから。'],['bandai','萬代橋','駅の万代広場側から川へ。河岸で石のアーチを眺める。'],['goro','五郎 万代店','夕食は万代の酒場で近海の魚を。']]
  };
  function renderRoute(key) {
    const list = document.createElement('ol');list.className = 'route-plan';
    plans[key].forEach(([id,title,description]) => {
      const row=document.createElement('li'), group=document.createElement('div'), button=document.createElement('button'), copy=document.createElement('p');
      button.dataset.detail=id;button.textContent=title;copy.textContent=description;group.append(button,copy);row.append(group);list.append(row);
    });
    document.querySelector('#route-panel').replaceChildren(list);
    document.querySelectorAll('[data-route]').forEach(button => {const selected=button.dataset.route===key;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  }
  document.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click',() => renderRoute(button.dataset.route)));
  renderRoute('honkan');
})();
