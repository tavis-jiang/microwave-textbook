// 将已核验的教材转换为独立静态网站。原Markdown不修改；公式与字体完全本地化。
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function dependency(name){try{return require(name);}catch{return require('/tmp/communication-textbook-render/node_modules/'+name);}}
const katex=dependency('katex'),MarkdownIt=dependency('markdown-it');
const root=__dirname,book=path.resolve(root,'../教材');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlPath=s=>s.split('/').map(encodeURIComponent).join('/');
fs.mkdirSync(path.join(root,'vendor'),{recursive:true});fs.mkdirSync(path.join(root,'resources'),{recursive:true});
let katexDist;try{katexDist=path.join(path.dirname(require.resolve('katex')),'../dist');}catch{katexDist='/tmp/communication-textbook-render/node_modules/katex/dist';}
fs.copyFileSync(path.join(katexDist,'katex.min.css'),path.join(root,'vendor/katex.min.css'));
fs.cpSync(path.join(katexDist,'fonts'),path.join(root,'vendor/fonts'),{recursive:true});
const chapters=fs.readdirSync(book).filter(n=>/^\d{2}_.*\.md$/.test(n)||n==='附录A_本班作业专题.md').sort((a,b)=>a.localeCompare(b,'en')).map(n=>({label:n.startsWith('附录')?'A':n.split('_')[0],name:n,title:n.startsWith('附录')?'本班作业专题':n.replace(/^\d{2}_/,'').replace(/\.md$/,'')}));
const pages=[],byFile=new Map(),copied=new Map(),search=[],stats={pages:0,formulas:0,images:0,questionAnchors:0};
function register(file,slug,title,kind='reference'){
 file=path.resolve(file);if(byFile.has(file))return byFile.get(file);
 const entry={file,slug,title,kind};byFile.set(file,entry);pages.push(entry);return entry;
}
register(path.join(book,'README.md'),'about','教材说明');
for(const ch of chapters){register(path.join(book,ch.name),ch.label,ch.title,'chapter');register(path.join(book,'习题解析',ch.label+'_解析.md'),'answers-'+ch.label,ch.title+' · 习题解析','answer');}
register(path.join(book,'符号与公式索引.md'),'formulas','符号与公式索引');
register(path.join(book,'考点与资料对应.md'),'sources','考点与资料对应');
register(path.join(book,'核验记录.md'),'verification','核验记录');
register(path.join(book,'../编写进度.md'),'progress','编写进度');
const referenceEntries=new Map();
function cleanJSON(value){
 if(Array.isArray(value))return value.map(cleanJSON);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/token|password|authorization|cookie|verifier|secret/i.test(k)?'[已省略]':cleanJSON(v)]));
 if(typeof value==='string')return value.replace(/https?:\/\/[^\s"'<>]+/g,s=>{try{const u=new URL(s);u.search='';return u.href;}catch{return s;}});
 return value;
}
function localTarget(href,current){
 if(/^(?:https?:|mailto:|#)/i.test(href))return href;
 const [loc,anchor='']=href.split('#');const file=path.resolve(path.dirname(current),decodeURIComponent(loc));
 const entry=byFile.get(file);
 if(entry)return entry.slug+'.html'+(anchor?'#'+anchor:'');
 if(file.startsWith(book+path.sep)&&/\.(svg|png|jpe?g)$/i.test(file)&&fs.existsSync(file)){
  if(!copied.has(file)){const filename=path.basename(file);fs.copyFileSync(file,path.join(root,'resources',filename));copied.set(file,'resources/'+urlPath(filename));}
  return copied.get(file);
 }
 const key='ref-'+crypto.createHash('sha256').update(path.relative(book,file)).digest('hex').slice(0,10);
 referenceEntries.set(key,path.basename(file));return 'references.html#'+key;
}
const sidebar=active=>`<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">∿</span><span>微波技术<small>自学教材 · EST3303</small></span></a><button class="search-trigger" type="button"><span>搜索教材</span><kbd>/</kbd></button><nav aria-label="教材目录"><a class="nav-home ${active==='home'?'current':''}" href="index.html">阅读首页</a><p class="nav-caption">完整教材</p>${chapters.map(c=>`<a class="chapter-link ${active===c.label?'current':''}" ${active===c.label?'aria-current="page"':''} href="${c.label}.html"><span class="chapter-number">${c.label}</span><span>${escape(c.title)}</span></a>`).join('')}<p class="nav-caption">随时查阅</p><a class="utility ${active==='formulas'?'current':''}" href="formulas.html">符号与公式</a><a class="utility ${active==='sources'?'current':''}" href="sources.html">考点与资料</a><a class="utility ${active==='about'?'current':''}" href="about.html">教材说明</a></nav><p class="sidebar-note">资料范围 · 2026.11.24<br>已核验教材 · 在线阅读</p>`;
function shell({title,slug,kind,content,toc='',prevNext=''}){
 const active=kind==='answer'?slug.replace('answers-',''):slug;
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0d5e56"><title>${escape(title)} · 微波技术</title><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="stylesheet" href="vendor/katex.min.css"><link rel="stylesheet" href="style.css"><script src="settings.js"></script><script defer src="search-index.js"></script><script defer src="app.js"></script></head><body data-page="${escape(slug)}" data-kind="${kind}"><a class="skip-link" href="#main">跳到正文</a><div class="reading-progress" aria-hidden="true"></div><aside class="sidebar" id="sidebar">${sidebar(active)}</aside><button class="nav-scrim" aria-label="关闭目录" hidden></button><div class="page"><header class="toolbar"><button id="menu-toggle" class="button mobile-menu" aria-label="展开教材目录" aria-expanded="false" aria-controls="sidebar">☰ 目录</button><a class="breadcrumb" href="index.html">微波技术<span>/</span>${escape(kind==='chapter'?'正文':kind==='answer'?'习题解析':kind==='home'?'阅读首页':'参考资料')}</a><div class="reader-controls"><button class="button" id="font-toggle" aria-label="调整字号">字号</button><button class="button" id="theme-toggle" aria-label="切换深色模式">深色</button><button class="button" id="search-top" aria-label="搜索教材">搜索</button></div></header><div class="reading-layout ${kind==='home'?'home-layout':''}"><main id="main" tabindex="-1">${content}${prevNext}<footer class="page-footer">微波技术自学教材 · EST3303-02 · 唐旻<br>先跟随推导，再独立作答；练习解析按题号单独查阅。<a href="sources.html">查看资料依据</a></footer></main>${toc?`<aside class="toc" aria-label="本页目录"><p>本页目录</p><nav>${toc}</nav><a class="back-top" href="#main">回到顶部 ↑</a></aside>`:''}</div></div><dialog id="search-dialog" aria-labelledby="search-title"><div class="search-heading"><h2 id="search-title">搜索全书</h2><button class="button" id="search-close" aria-label="关闭搜索">关闭 · Esc</button></div><label class="sr-only" for="search-input">输入关键词或题号</label><input id="search-input" type="search" autocomplete="off" placeholder="试试：反射系数、Smith、07-3"><p id="search-status" aria-live="polite">搜索正文、例题和独立解析。</p><div id="search-results"></div></dialog></body></html>`;
}
const phases=['电路与时间','数学与电磁基础','传播与反射','暂态与应用','模式与波导','端口与网络','阻抗与调谐','储能与谐振','功率与耦合','滤波与互连','开卷与综合','本班作业'];
const home=`<section class="hero"><p class="eyebrow">EST3303-02 · 2026–2027 秋</p><h1>从电路与传播，<br>读懂<span>微波技术。</span></h1><p class="hero-intro">一本可以从头读起的自学教材。沿着推导理解概念，用例题连接方法，再用练习检验掌握。</p><div class="hero-actions"><a class="primary-button" href="01.html" id="continue-reading">从第一章开始 <span aria-hidden="true">↗</span></a><a class="text-link" href="formulas.html">查符号与公式 →</a></div><p class="resume-note" id="resume-note" hidden></p><div class="book-stats"><span><strong>11</strong>章正文</span><span><strong>74</strong>道配套练习</span><span><strong>1</strong>份作业附录</span></div><svg class="hero-wave" viewBox="0 0 280 150" aria-hidden="true"><path d="M0 75 H280 M140 0 V150" fill="none" stroke="currentColor" opacity=".15"/><path d="M0 75 C12 75 14 25 28 25 S42 125 56 125 S70 25 84 25 S98 125 112 125 S126 25 140 25 S154 125 168 125 S182 25 196 25 S210 125 224 125 S238 25 252 25 S266 75 280 75" fill="none" stroke="currentColor" stroke-width="2"/><path d="M0 75 H35 V45 H70 V105 H105 V45 H140 V105 H175 V45 H210 V105 H245 V75 H280" fill="none" stroke="currentColor" stroke-width="1" opacity=".28"/></svg></section><section class="book-contents"><div class="section-title"><h2>按章节阅读</h2><span>从基础到综合，循序推进</span></div><div class="chapter-list">${chapters.map((c,i)=>`<div class="chapter-row"><a class="chapter-main" href="${c.label}.html"><span class="row-number">${c.label}</span><span><small>${phases[i]}</small><h3>${escape(c.title)}</h3></span><span class="row-arrow" aria-hidden="true">↗</span></a><a class="answer-link" href="answers-${c.label}.html" aria-label="${escape(c.title)}的习题解析">习题解析</a></div>`).join('')}</div></section><section class="reading-tip"><span class="tip-number">阅读建议</span><p>首次学习按章节顺序阅读。复习时可直接查公式，或搜索题号定位题目与解析。网页会在本机记住最近阅读的位置。</p></section>`;
fs.writeFileSync(path.join(root,'index.html'),shell({title:'阅读首页',slug:'home',kind:'home',content:home}));
for(let pi=0;pi<pages.length;pi++){
 const entry=pages[pi],raw=fs.readFileSync(entry.file,'utf8'),math=[],toc=[];let headingCount=0;
 const withMath=raw.replace(/\$\$([\s\S]*?)\$\$|(?<!\\)\$([^\n$]+?)(?<!\\)\$/g,(all,display,inline)=>{
  const rendered=katex.renderToString(display??inline,{displayMode:display!==undefined,throwOnError:true,strict:'error'});stats.formulas++;const n=math.push({rendered,raw:display??inline})-1;return `MATHPLACEHOLDER${n}END`;
 });
 const plain=s=>s.replace(/MATHPLACEHOLDER(\d+)END/g,(_,i)=>math[+i].raw).replace(/<[^>]*>/g,'').replace(/[*`]/g,'');
 const md=new MarkdownIt({html:true,typographer:false});
 md.renderer.rules.link_open=(tokens,i,options,env,self)=>{const old=tokens[i].attrGet('href');tokens[i].attrSet('href',localTarget(old,entry.file));if(/^https?:/i.test(old)){tokens[i].attrSet('target','_blank');tokens[i].attrSet('rel','noopener noreferrer');}return self.renderToken(tokens,i,options);};
 const defaultImage=md.renderer.rules.image;
 md.renderer.rules.image=(tokens,i,options,env,self)=>{tokens[i].attrSet('src',localTarget(tokens[i].attrGet('src'),entry.file));tokens[i].attrSet('loading','lazy');tokens[i].attrSet('decoding','async');stats.images++;return defaultImage(tokens,i,options,env,self);};
 md.renderer.rules.heading_open=(tokens,i,options,env,self)=>{
  const id='section-'+(++headingCount),title=plain(tokens[i+1].content);tokens[i].attrSet('id',id);
  if(tokens[i].tag==='h2')toc.push(`<a href="#${id}">${escape(title)}</a>`);
  const next=[];for(let j=i+2;j<tokens.length;j++){if(tokens[j].type==='heading_open')break;if(tokens[j].type==='inline')next.push(plain(tokens[j].content));}
  search.push({title,chapter:entry.title,url:entry.slug+'.html#'+id,kind:entry.kind,text:next.join(' ').slice(0,9000)});
  return self.renderToken(tokens,i,options);
 };
 let html=md.render(withMath).replace(/MATHPLACEHOLDER(\d+)END/g,(_,i)=>math[+i].rendered);
 html=html.replace(/<table>/g,'<div class="table-scroll" role="region" aria-label="可横向滚动的数据表" tabindex="0"><table>').replace(/<\/table>/g,'</table></div>');
 stats.questionAnchors+=(raw.match(/<a id="q/g)||[]).length;
 const label=entry.kind==='answer'?entry.slug.replace('answers-',''):entry.slug;const idx=chapters.findIndex(c=>c.label===label);
 let tabs='';if(idx>=0)tabs=`<div class="chapter-tabs" aria-label="章节阅读方式"><a class="${entry.kind==='chapter'?'selected':''}" href="${label}.html">正文与练习</a><a class="${entry.kind==='answer'?'selected':''}" href="answers-${label}.html">独立解析</a></div>`;
 let prevNext='';if(entry.kind==='chapter')prevNext=`<nav class="page-navigation" aria-label="章节翻页">${idx>0?`<a href="${chapters[idx-1].label}.html"><small>上一章</small>${escape(chapters[idx-1].title)}</a>`:'<a href="index.html"><small>返回</small>教材目录</a>'}${idx<chapters.length-1?`<a href="${chapters[idx+1].label}.html"><small>下一章 →</small>${escape(chapters[idx+1].title)}</a>`:'<a href="11.html"><small>回到综合训练</small>检验跨章迁移</a>'}</nav>`;
 fs.writeFileSync(path.join(root,entry.slug+'.html'),shell({title:entry.title,slug:entry.slug,kind:entry.kind,content:tabs+`<article class="prose">${html}</article>`,toc:toc.join(''),prevNext}));
 stats.pages++;
}
fs.writeFileSync(path.join(root,'references.html'),shell({title:'课程原始资料',slug:'references',kind:'reference',content:'<article class="prose"><h1>课程原始资料</h1><p>本站完整收录自编教材。原课件、试卷和录播请在课程 Canvas 或本地资料目录查阅。</p><p><a href="sources.html">查看考点与资料对应</a></p><ul>'+[...referenceEntries].map(([id,name])=>`<li id="${id}">${escape(name)}</li>`).join('')+'</ul></article>'}));
fs.writeFileSync(path.join(root,'search-index.js'),'window.TEXTBOOK_SEARCH='+JSON.stringify(search).replace(/</g,'\\u003c')+';\n');
fs.writeFileSync(path.join(root,'site.json'),JSON.stringify({id:'microwave-textbook-reader',builtAt:new Date().toISOString(),...stats,resources:copied.size,chapters:chapters.map(c=>({slug:c.label,title:c.title}))},null,2));
console.log(JSON.stringify({...stats,searchSections:search.length,resources:copied.size,result:'PASS'}));
