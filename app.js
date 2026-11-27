(()=>{
 const $=s=>document.querySelector(s),page=document.body.dataset.page,kind=document.body.dataset.kind;
 const get=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const dialog=$('#search-dialog'),input=$('#search-input'),results=$('#search-results');
 function openSearch(){if(!dialog.open)dialog.showModal();input.focus();}
 document.querySelectorAll('.search-trigger,#search-top').forEach(b=>b.addEventListener('click',openSearch));
 $('#search-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!e.target.isContentEditable){e.preventDefault();openSearch();}if(e.key==='Escape'){if(dialog.open){e.preventDefault();dialog.close();}closeNav();}});
 let searchTimer;
 input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,100);});
 function search(){
  const q=input.value.trim().toLowerCase(),parts=q.split(/\s+/).filter(Boolean);results.replaceChildren();
  if(!q){$('#search-status').textContent='搜索正文、例题和独立解析。';return;}
  const matches=(window.TEXTBOOK_SEARCH||[]).map(e=>{const title=e.title.toLowerCase(),text=e.text.toLowerCase();return {...e,score:parts.every(p=>title.includes(p)||text.includes(p))?parts.reduce((s,p)=>s+(title.includes(p)?8:1),0):0};}).filter(e=>e.score).sort((a,b)=>b.score-a.score);
  $('#search-status').textContent=matches.length?`找到 ${matches.length} 处，显示前 ${Math.min(matches.length,40)} 条。`:'没有找到相关内容，试试更短的关键词或完整题号。';
  for(const m of matches.slice(0,40)){
   const a=document.createElement('a');a.className='search-result';a.href=m.url;
   const caption=document.createElement('small');caption.textContent=m.chapter+(m.kind==='answer'?' · 解析':'');
   const title=document.createElement('strong');title.textContent=m.title;
   const snippet=document.createElement('p');const pos=m.text.toLowerCase().indexOf(parts[0]);const start=Math.max(0,pos-35);snippet.textContent=(start?'…':'')+m.text.slice(start,start+150)+'…';
   a.append(caption,title,snippet);results.append(a);
  }
 }
 const menu=$('#menu-toggle'),scrim=$('.nav-scrim');
 const sidebar=$('#sidebar'),small=window.matchMedia('(max-width:800px)');
 function syncNavFocus(){sidebar.inert=small.matches&&!document.body.classList.contains('nav-open');}
 small.addEventListener('change',syncNavFocus);syncNavFocus();
 function closeNav(){if(sidebar.contains(document.activeElement)&&small.matches)menu.focus();document.body.classList.remove('nav-open');menu.setAttribute('aria-expanded','false');scrim.hidden=true;syncNavFocus();}
 menu.addEventListener('click',()=>{const on=!document.body.classList.contains('nav-open');document.body.classList.toggle('nav-open',on);menu.setAttribute('aria-expanded',String(on));scrim.hidden=!on;syncNavFocus();if(on)sidebar.querySelector('a').focus();});
 scrim.addEventListener('click',closeNav);
 $('#theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('microwave-theme',theme);}catch{}updateTheme();});
 function updateTheme(){$('#theme-toggle').textContent=document.documentElement.dataset.theme==='dark'?'浅色':'深色';}
 updateTheme();
 $('#font-toggle').addEventListener('click',()=>{const sizes=['normal','large','larger'],current=document.documentElement.dataset.font||'normal';const font=sizes[(sizes.indexOf(current)+1)%3];document.documentElement.dataset.font=font;try{localStorage.setItem('microwave-font',font);}catch{}$('#font-toggle').textContent={normal:'字号',large:'字号 · 大',larger:'字号 · 更大'}[font];});
 if(kind==='home'){
  const recent=get('microwave-recent');
  if(recent&&/^(?:\d{2}|[ABC]|answers-(?:\d{2}|[ABC])|mock-01-answers)$/.test(recent.page)){
   const a=$('#continue-reading');a.href=recent.page+'.html?resume=1';a.textContent='继续上次阅读 ↗';$('#resume-note').hidden=false;$('#resume-note').textContent=recent.title;
  }
 }
 let scrollTimer;
 function savePosition(){if(!['chapter','answer'].includes(kind))return;const info={page,title:document.title.replace(' · 微波技术',''),scroll:window.scrollY};put('microwave-recent',info);put('microwave-position-'+page,info);}
 window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(savePosition,180);const max=document.documentElement.scrollHeight-innerHeight;$('.reading-progress').style.width=(max>0?Math.min(100,100*scrollY/max):100)+'%';},{passive:true});
 window.addEventListener('pagehide',savePosition);
 if(new URLSearchParams(location.search).get('resume')==='1'&&!location.hash){const position=get('microwave-position-'+page);if(position)window.addEventListener('load',()=>{document.fonts.ready.then(()=>window.scrollTo(0,position.scroll));});}
 else if(['chapter','answer'].includes(kind)&&!location.hash)savePosition();
 // URL fragment由浏览器处理；保留原题目锚点，分享和后退均无需应用路由。
 const tocLinks=[...document.querySelectorAll('.toc nav a')];
 if('IntersectionObserver'in window){const obs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){tocLinks.forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}},{rootMargin:'-80px 0px -65% 0px'});document.querySelectorAll('.prose h2').forEach(h=>obs.observe(h));}
})();
