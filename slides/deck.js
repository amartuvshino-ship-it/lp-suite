/* =========================================================================
   LP SUITE — СЛАЙДЫН ХУВААЛЦАХ ХӨДӨЛГҮҮР (ус тэмдэг + удирдлага)
   Хичээл бүрийн өөрийн симуляцийн кодыг ЭНЭ ФАЙЛААС ХОЙШ тусад нь бичнэ.
   ========================================================================= */
/* ==========================================================================
   4. КАМЕРЫН УС ТЭМДЭГ  (нүдэнд үл мэдэгдэх, камерт илэрдэг)
   -------------------------------------------------------------------------
   Хоёр давхаргаас бүрдэнэ:

   A. ОРОН ЗАЙН (moiré) — 1 пиксел өргөнтэй хазгай судал. Ус тэмдгийн дотор
      судлын фаз эсрэг эргэнэ. Дундаж гэрэлтэлт хаа сайгүй ижил тул нүдэнд
      жигд харагдана; камерын пиксел тортой цохилцоод (aliasing) илэрнэ.

   B. ЦАГ ХУГАЦААНЫ — ус тэмдгийн хэлбэрийг кадр тутамд цайруулж/бараатгаж
      сольж байна (+δ / −δ). Хүний нүд 60 Гц-ийн хоёр кадрыг НЭГТГЭЖ үздэг
      тул дундаж нь тэг → юу ч харагдахгүй. Камер богино хаалттайгаар (1/100…
      1/500 сек) нэг кадрыг барьдаг тул ус тэмдэг зурган дээр гарч ирнэ.

   Аюулгүй байдал: гэрэлтэлтийн өөрчлөлт ердөө ~4%, давтамж 60 Гц — гэрэл
   мэдрэмтгий эпилепсийн эрсдэлт бүс (3–30 Гц, >10% ялгаа)-ээс гадуур.
   W товчоор бүрэн унтраана.
   ========================================================================== */
(function(){
  const Q = new URLSearchParams(location.search);
  const WM = {
    text  : Q.get('wm') || ('ХААИС · LP SUITE · ' +
              ((window.DECK && window.DECK.lesson) || 'ЛЕКЦ').toUpperCase()),
    moire : 0.035,    // A давхаргын судлын эрч
    blink : 0.05,     // B давхаргын +δ/−δ (0.03 сул … 0.07 хүчтэй)
    period: 2,        // судлын үе (төхөөрөмжийн пиксел)
    angle : -28,
    fontPx: 30,
    gapX  : 150, gapY: 130,
  };

  const S  = document.getElementById('wmS');
  const T1 = document.getElementById('wmT1');
  const T2 = document.getElementById('wmT2');
  if(!S) return;
  let on = true, raf = null, phase = 0;

  function textMask(W,H){
    const m = document.createElement('canvas'); m.width=W; m.height=H;
    const mc = m.getContext('2d');
    mc.fillStyle='#fff';
    mc.font = '700 ' + WM.fontPx + 'px Geist, Arial, sans-serif';
    mc.textBaseline='middle';
    const tw = mc.measureText(WM.text).width;
    const stepX = tw + WM.gapX, stepY = WM.fontPx + WM.gapY;
    mc.translate(W/2,H/2); mc.rotate(WM.angle*Math.PI/180);
    const R = Math.ceil(Math.hypot(W,H)/2);
    for(let y=-R; y<R; y+=stepY){
      const off = (Math.round(y/stepY)%2) ? stepX/2 : 0;
      for(let x=-R+off; x<R; x+=stepX) mc.fillText(WM.text,x,y);
    }
    return m;
  }

  function build(){
    if(!on) return;
    const st = document.getElementById('stage').getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(2, Math.round(st.width*dpr));
    const H = Math.max(2, Math.round(st.height*dpr));

    [S,T1,T2].forEach(c=>{
      c.style.left=st.left+'px'; c.style.top=st.top+'px';
      c.style.width=st.width+'px'; c.style.height=st.height+'px';
      c.width=W; c.height=H;
    });

    const mCanvas = textMask(W,H);
    const mask = mCanvas.getContext('2d').getImageData(0,0,W,H).data;

    // --- A: орон зайн муар ---
    const sc = S.getContext('2d');
    const img = sc.createImageData(W,H), d = img.data;
    const A = Math.round(WM.moire*255), half = WM.period/2;
    for(let y=0;y<H;y++){
      const row=y*W*4;
      for(let x=0;x<W;x++){
        const i=row+x*4;
        const stripe = ((x+y)%WM.period) < half;
        const light  = (mask[i+3]>40) ? !stripe : stripe;
        const v = light?255:0;
        d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=A;
      }
    }
    sc.putImageData(img,0,0);

    // --- B: цаг хугацааны хос давхарга (нэмэгдүүлэх горим) ---
    // T1 → ус тэмдгийн хэлбэр дээр +c, T2 → түүнээс ГАДНА талбайд +c.
    // Хоёр кадрын дундаж = bg + c/2 буюу бүх талбайд ЖИГД өсөлт →
    // нүд бичвэрийг ялгаж чадахгүй. Камер нэг кадрыг барихад c зөрүүтэй гарна.
    [[T1,false],[T2,true]].forEach(([c,invert])=>{
      const g=c.getContext('2d');
      g.clearRect(0,0,W,H);
      g.globalAlpha = WM.blink;
      g.fillStyle = '#FFFFFF';
      g.fillRect(0,0,W,H);
      g.globalAlpha = 1;
      g.globalCompositeOperation = invert ? 'destination-out' : 'destination-in';
      g.drawImage(mCanvas,0,0);
      g.globalCompositeOperation = 'source-over';
    });
    loop();
  }

  function loop(){
    if(!on) return;
    phase ^= 1;
    T1.style.visibility = phase ? 'visible' : 'hidden';
    T2.style.visibility = phase ? 'hidden' : 'visible';
    raf = requestAnimationFrame(loop);
  }

  function setOn(v){
    on = v;
    [S,T1,T2].forEach(c=>c.classList.toggle('off',!on));
    document.getElementById('bWm').classList.toggle('on',on);
    if(raf){ cancelAnimationFrame(raf); raf=null; }
    if(on) build();
  }
  // Шалгах/бичлэг хийхэд фазыг гараар тогтоох (rAF-г зогсооно)
  window.__wmSetPhase = p => {
    if(raf){ cancelAnimationFrame(raf); raf=null; }
    T1.style.visibility = p ? 'visible' : 'hidden';
    T2.style.visibility = p ? 'hidden' : 'visible';
  };
  window.__wmResume = ()=>{ if(on && !raf) loop(); };
  window.__wmToggle = ()=>setOn(!on);
  window.__wmBuild  = build;
  window.__wmPhase  = ()=>phase;
  document.getElementById('bWm').onclick = ()=>setOn(!on);
  // Хуудас нуугдахад rAF зогсдог тул нэг фаз "гацаж" үлдэхээс сэргийлнэ
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){
      if(raf){ cancelAnimationFrame(raf); raf=null; }
      T1.style.visibility='hidden'; T2.style.visibility='hidden';
    } else if(on && !raf) loop();
  });
  window.addEventListener('resize', ()=>{ clearTimeout(S._t); S._t=setTimeout(build,120); });
  setOn(Q.get('wm') !== '0');
})();

/* ==========================================================================
   3. СЛАЙДЫН УДИРДЛАГА
   ========================================================================== */
(function(){
  const slides = Array.from(document.querySelectorAll('.slide'));
  const stage = document.getElementById('stage');

  /* ---------------------------------------------------------------
     ХИЧЭЭЛИЙН БҮТЭЦ — толгой/хөл зурвасын мэдээлэл
     part: хөлийн зурваст бүлэглэх хэсэг
     sub : толгой дээр гарах дэд сэдэв
     --------------------------------------------------------------- */
  /* Хичээл бүрийн тохиргоо нь өөрийн <script> дотор window.DECK-ээр ирнэ:
       window.DECK = { lesson:'Хичээл 5', course:'Бүлэг 3 — …',
                       parts:[{k:'intro',label:'Эхлэл'}, …],
                       map:[{p:'intro',s:''}, …]   // слайд бүрд нэг мөр }   */
  const D = window.DECK || {};
  const COURSE = D.course || document.title;
  const LESSON = D.lesson || '';
  const PARTS = D.parts || [{k:'intro', label:'Эхлэл'}, {k:'end', label:'Дүгнэлт'}];
  const MAP = D.map || slides.map((sl,i) => ({
    p: i === 0 ? 'intro' : (i === slides.length-1 ? 'end' : 'intro'),
    s: (sl.querySelector('.s-tag') || {}).textContent || ''
  }));

  /* --- Зурвасыг слайд бүрд шигтгэх --- */
  slides.forEach((sl,i)=>{
    const m = MAP[i] || {p:'intro', s:''};
    if(!m.s) return;                                 // нүүр ба хаалтад зурвас байхгүй

    const top = document.createElement('div');
    top.className = 'chrome-top';
    top.innerHTML =
      '<div class="ct-left"><span class="ct-chip">'+LESSON+'</span>'+
      '<span class="ct-course"><b>'+COURSE+'</b></span></div>'+
      '<div class="ct-right">'+
      (m.p!=='intro'&&m.p!=='end' ? '<span class="ct-key">'+m.p+'</span>' : '')+
      '<span class="ct-sub">'+m.s+'</span></div>';
    sl.insertBefore(top, sl.firstChild);

    const bot = document.createElement('div');
    bot.className = 'chrome-bot';
    let rail = '<div class="cb-rail">';
    PARTS.forEach(pt=>{
      const idxs = MAP.map((x,j)=>x.p===pt.k?j:-1).filter(j=>j>=0);
      if(!idxs.length) return;
      rail += '<div class="cb-grp" style="flex:'+idxs.length+'">';
      idxs.forEach(j=>{ rail += '<div class="cb-t" data-go="'+j+'" title="'+(j+1)+'. '+(MAP[j].s||'—')+'"></div>'; });
      rail += '</div>';
    });
    rail += '</div>';
    const partLabel = (PARTS.find(p=>p.k===m.p)||{}).label || '';
    const oldFoot = sl.querySelector('.s-foot');
    let note = '';
    if(oldFoot){
      const sp = oldFoot.querySelector('span');
      if(sp) note = sp.textContent.trim();
      oldFoot.remove();
    }
    bot.innerHTML = rail +
      '<div class="cb-meta"><span class="cb-part"><i>'+
        (m.p!=='intro'&&m.p!=='end' ? m.p+' ' : '')+'</i>'+partLabel+'</span>'+
      '<span class="cb-note">'+note+'</span>'+
      '<span class="cb-num"><b>'+String(i+1).padStart(2,'0')+'</b> / '+MAP.length+'</span></div>';
    sl.appendChild(bot);
  });

  function paintRails(cur){
    slides.forEach(sl=>{
      sl.querySelectorAll('.cb-t').forEach(t=>{
        const j = +t.dataset.go;
        t.classList.toggle('past', j < cur);
        t.classList.toggle('now', j === cur);
      });
    });
  }
  document.addEventListener('click', e=>{
    const t = e.target.closest('.cb-t');
    if(t) window.__goSlide(+t.dataset.go);
  });

  /* --- Загвар солих --- */
  let paper = false;
  function setTheme(p){
    paper = p;
    document.body.classList.toggle('paper', paper);
    const b = document.getElementById('bTheme');
    if(b){ b.textContent = paper ? '☾' : '☀'; b.title = paper ? 'Шөнө загвар (T)' : 'Цаас загвар (T)'; }
  }
  setTheme(false);
  document.getElementById('bTheme').onclick = ()=>setTheme(!paper);
  window.__toggleTheme = ()=>setTheme(!paper);

  const bar = document.querySelector('#bar i');
  const count = document.getElementById('count');
  const notes = document.getElementById('notes');
  const notesTxt = document.getElementById('notesTxt');
  const overview = document.getElementById('overview');
  const keysBox = document.getElementById('keys');
  let cur = 0, notesOn = false;

  slides.forEach((s,i)=>{
    const pg = s.querySelector('.pg');
    if(pg) pg.textContent = (i+1) + ' / ' + slides.length;
  });

  function fit(){
    const k = Math.min(window.innerWidth/1280, window.innerHeight/720) * 0.94;
    stage.style.transform = 'scale(' + k + ')';
  }
  window.addEventListener('resize', fit); fit();
  setTimeout(()=>window.__wmBuild && window.__wmBuild(), 60);
  const vp=document.getElementById('viewport');
  ['scroll','focusin'].forEach(ev=>vp.addEventListener(ev,()=>{vp.scrollTop=0;vp.scrollLeft=0;}));

  function show(i){
    cur = Math.max(0, Math.min(slides.length-1, i));
    slides.forEach((s,j)=>s.classList.toggle('active', j===cur));
    bar.style.width = ((cur+1)/slides.length*100) + '%';
    count.textContent = (cur+1) + ' / ' + slides.length;
    notesTxt.textContent = slides[cur].dataset.notes || '—';
    paintRails(cur);
    document.querySelectorAll('.ovcell').forEach((c,j)=>c.classList.toggle('cur', j===cur));
    if(location.hash !== '#'+(cur+1)) history.replaceState(null,'','#'+(cur+1));
  }

  document.getElementById('bPrev').onclick = ()=>show(cur-1);
  document.getElementById('bNext').onclick = ()=>show(cur+1);
  document.getElementById('bOv').onclick = ()=>toggleOverview();
  document.getElementById('bNotes').onclick = ()=>toggleNotes();
  document.getElementById('bHelp').onclick = ()=>toggleKeys();
  document.getElementById('bFull').onclick = ()=>{
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };
  document.getElementById('notesClose').onclick = ()=>toggleNotes(false);
  document.querySelector('#keys .close').onclick = ()=>toggleKeys(false);
  keysBox.onclick = e=>{ if(e.target===keysBox) toggleKeys(false); };

  function toggleNotes(force){
    notesOn = (force===undefined) ? !notesOn : force;
    notes.classList.toggle('on', notesOn);
    document.body.classList.toggle('notes-on', notesOn);
    document.getElementById('bNotes').classList.toggle('on', notesOn);
  }
  function toggleOverview(force){
    const on = (force===undefined) ? !overview.classList.contains('on') : force;
    overview.classList.toggle('on', on);
    document.getElementById('bOv').classList.toggle('on', on);
    if(on) buildOverview();
  }
  function toggleKeys(force){
    const on = (force===undefined) ? !keysBox.classList.contains('on') : force;
    keysBox.classList.toggle('on', on);
  }

  let built = false;
  function buildOverview(){
    if(built) return; built = true;
    const g = document.getElementById('ovgrid');
    slides.forEach((s,i)=>{
      const cell = document.createElement('div');
      cell.className = 'ovcell' + (i===cur?' cur':'');
      const mini = s.cloneNode(true);
      mini.classList.remove('active');
      mini.style.cssText='opacity:1;visibility:visible;position:relative;animation:none';
      mini.querySelectorAll('*').forEach(e=>e.style.animation='none');
      const wrap = document.createElement('div');
      wrap.className = 'mini';
      wrap.appendChild(mini);
      cell.appendChild(wrap);
      const lb = document.createElement('div');
      lb.className = 'lb'; lb.textContent = i+1;
      cell.appendChild(lb);
      cell.onclick = ()=>{ show(i); toggleOverview(false); };
      g.appendChild(cell);
      requestAnimationFrame(()=>{ wrap.style.transform = 'scale('+(cell.clientWidth/1280)+')'; });
    });
  }

  document.addEventListener('keydown', e=>{
    // Гулсуур дээр сум дарахад слайд солигдохгүй байх
    if(e.target && e.target.tagName==='INPUT' && e.target.type==='range'
       && (e.key==='ArrowLeft'||e.key==='ArrowRight')) return;
    if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){ e.preventDefault(); show(cur+1); }
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); show(cur-1); }
    else if(e.key==='Home') show(0);
    else if(e.key==='End') show(slides.length-1);
    else if(e.key==='Escape'){
      if(keysBox.classList.contains('on')) toggleKeys(false);
      else if(overview.classList.contains('on')) toggleOverview(false);
      else if(notesOn) toggleNotes(false);
    }
    else if(e.key==='o'||e.key==='O') toggleOverview();
    else if(e.key==='s'||e.key==='S') toggleNotes();
    else if(e.key==='h'||e.key==='H'||e.key==='?') toggleKeys();
    else if(e.key==='t'||e.key==='T') window.__toggleTheme();
    else if(e.key==='w'||e.key==='W') window.__wmToggle();
    else if(e.key==='f'||e.key==='F') document.getElementById('bFull').click();
  });

  let tx=0;
  stage.addEventListener('touchstart',e=>{tx=e.touches[0].clientX});
  stage.addEventListener('touchend',e=>{
    if(e.target && (e.target.tagName==='INPUT'||e.target.closest('.gc'))) return;
    const d = e.changedTouches[0].clientX - tx;
    if(Math.abs(d)>60) show(cur + (d<0?1:-1));
  });

  window.__goSlide = show;
  const start = parseInt((location.hash||'').slice(1),10);
  show(isNaN(start)?0:start-1);
})();
