/* core.js — dipakai semua halaman: skala 360dp, toast, tema, navigasi tab, tombol back (termasuk sheet/popup), pull-to-refresh,
   banner offline, keyboard layar, getaran halus, simpan posisi scroll per tab */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  function safe(f){try{return f()}catch(_){}}
  var GP=window.GP=window.GP||{};
  // ---- Sesi: setelah Keluar (localStorage gp_sesi='keluar') semua halaman aplikasi dialihkan ke akun.html
  // sampai pengguna masuk lagi (tombol hijau di akun.html atau alur nomor HP -> PIN). Halaman alur masuk (body.mk) dikecualikan.
  GP.keluar=function(){safe(function(){localStorage.setItem('gp_sesi','keluar')})};
  GP.masuk=function(){safe(function(){localStorage.removeItem('gp_sesi')})};
  function sesiPutus(){return !document.body.classList.contains('mk')&&safe(function(){return localStorage.getItem('gp_sesi')})==='keluar'}
  if(sesiPutus()){ document.documentElement.style.display='none'; location.replace('akun.html'); return; }
  addEventListener('pageshow',function(e){ if(e.persisted&&sesiPutus()) location.replace('akun.html'); });   // kembali dari cache bfcache
  var app=$('#app'),ui=$('#ui'),toastEl=$('#toast'),tt;
  var TAB=document.body.getAttribute('data-tab')||'';

  // ---- umpan balik sentuh (Android/Chrome; iOS Safari tidak mendukung vibrate, diabaikan diam-diam)
  var reduce=safe(function(){return matchMedia('(prefers-reduced-motion: reduce)').matches});
  GP.haptic=function(kind){
    if(reduce||!navigator.vibrate) return;
    if(navigator.userActivation&&!navigator.userActivation.hasBeenActive) return;   // Chrome menolak getar sebelum ada sentuhan
    if(safe(function(){return localStorage.getItem('gp_haptic')})==='off') return;
    safe(function(){navigator.vibrate(kind==='ok'?[10,40,10]:kind==='err'?[30,40,30]:kind==='tap'?8:12)});
  };
  GP.say=function(m){
    GP.haptic('tap');
    if(!toastEl) return;
    toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(tt);
    tt=setTimeout(function(){toastEl.classList.remove('show')},2200);
  };
  GP.k=function(){return (+getComputedStyle(ui).getPropertyValue('--k'))||1};
  GP.theme=function(light){safe(function(){localStorage.setItem('gp_theme',light?'light':'dark')})};
  GP.sb=function(){
    if(GP._sb) return GP._sb;
    if(!window.supabase||!window.GP_CFG) return null;
    GP._sb=window.__sb||(window.__sb=window.supabase.createClient(window.GP_CFG.url,window.GP_CFG.key)); // satu koneksi realtime dipakai bersama push.js
    return GP._sb;
  };
  // kembali ke halaman sebelumnya; kalau halaman dibuka langsung, pakai fallback
  GP.back=function(fallback){
    var ref=document.referrer,same=true;
    if(ref) same=safe(function(){return new URL(ref).origin===location.origin});
    if(history.length>1&&same!==false) history.back(); else location.replace(fallback);
  };

  // ---- Zoom halaman dikunci (keputusan produk): lapisan 1 viewport meta, lapisan 2 CSS touch-action:pan-x pan-y,
  // lapisan 3 skrip di bawah (pinch Safari iOS, pinch dua jari, double-tap, Ctrl+scroll, Ctrl +/-/0).
  ['gesturestart','gesturechange','gestureend'].forEach(function(ev){
    document.addEventListener(ev,function(e){e.preventDefault()},{passive:false});
  });
  document.addEventListener('touchmove',function(e){
    if(e.touches.length>1&&e.cancelable) e.preventDefault();
  },{passive:false});
  var lastTap=0;
  document.addEventListener('touchend',function(e){
    var n=Date.now(); if(n-lastTap<300&&e.cancelable) e.preventDefault(); lastTap=n;   // double-tap zoom
  },{passive:false});
  addEventListener('wheel',function(e){ if(e.ctrlKey&&e.cancelable) e.preventDefault(); },{passive:false});
  addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&['+','=','-','_','0'].indexOf(e.key)>=0) e.preventDefault();
  });
  // Auto-zoom iOS saat fokus input berfont < 16px dicegah oleh maximum-scale=1 pada viewport meta.

  // ---- Layer (bottom sheet / popup): tombol Back perangkat menutup layer, bukan keluar halaman.
  // GP.layer.push(fnTutup) saat layer dibuka; GP.layer.pop() saat layer ditutup lewat UI (scrim/tombol).
  var layers=[];
  GP.layer={
    push:function(close){ layers.push(close); safe(function(){history.pushState({gpLayer:layers.length},'')}); },
    pop:function(){                       // ditutup lewat UI: buang entri riwayat milik layer itu
      if(!layers.length) return;
      layers.pop();
      safe(function(){ if(history.state&&history.state.gpLayer) history.back(); });
    },
    any:function(){return layers.length>0}
  };
  addEventListener('popstate',function(){
    // Back ditekan saat ada layer: tutup layer paling atas (tanpa memanggil pop lagi)
    var n=(history.state&&history.state.gpLayer)||0;
    while(layers.length>n){ var f=layers.pop(); safe(f); }
  });

  // ---- klik: pindah halaman (data-page) & item yang belum punya backend (data-t)
  document.addEventListener('click',function(e){
    var p=e.target.closest('[data-page]');
    if(p){location.href=p.getAttribute('data-page');return}
    var el=e.target.closest('[data-t]'); if(!el) return;
    if(el.hasAttribute('data-go')) return;
    var t=el.getAttribute('data-t'),href=el.getAttribute('data-href');
    if(href){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();return}
    /* placeholder "belum terhubung ke server" dihapus: ketukan pada item belum aktif tidak menampilkan pesan */
  });

  // ---- skala kanvas native: desain dasar 360 dp, memenuhi lebar perangkat
  // Tinggi mengikuti app container agar safe-area dan viewport dinamis konsisten.
  // Cadangan tinggi untuk browser tanpa dukungan 100dvh (iOS < 15.4, Android WebView lama): 100vh di sana
  // termasuk area toolbar browser sehingga nav bawah tertutup. innerHeight selalu = area yang benar-benar terlihat.
  var lastAppH=document.documentElement.style.getPropertyValue('--app-h')||'',scaleFrame=0,lastK=0;
  function setH(){
    var h=Math.round(window.innerHeight)+'px';
    if(h!==lastAppH){
      lastAppH=h;
      document.documentElement.style.setProperty('--app-h',h);
    }
  }
  function setScale(){
    // Banyak sumber resize dapat aktif bersamaan di Android standalone.
    // Satu frame sudah cukup karena ukuran dibaca ulang saat callback berjalan.
    if(scaleFrame) return;
    scaleFrame=requestAnimationFrame(function(){
      scaleFrame=0;
      setH();
      var w=app.clientWidth,h=app.clientHeight;
      if(!w||!h) return;
      var k=w/360;
      if(k===lastK) return;            // ukuran sama: lewati (hindari relayout berulang)
      lastK=k;
      if(!('zoom' in document.documentElement.style)){
        ui.style.transformOrigin='0 0';
        ui.style.transform='scale('+k+')';
      } else {
        ui.style.zoom=k;
      }
      ui.style.setProperty('--k',k);
    });
  }
  setScale();
  addEventListener('resize',setScale,{passive:true});
  // Ukur ulang saat halaman tampil lagi, jendela fokus, atau tab kembali terlihat, plus beberapa kali sesaat setelah dibuka:
  // tinggi jendela PWA terpasang bisa baru final setelah bar sistem selesai menyesuaikan, sehingga ukuran awal bisa basi.
  addEventListener('focus',setScale,{passive:true});
  addEventListener('load',setScale,{passive:true});
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) setScale(); },{passive:true});
  [300,1200].forEach(function(t){ setTimeout(setScale,t); });
  addEventListener('orientationchange',setScale,{passive:true});
  addEventListener('pageshow',function(e){ if(e.persisted) setScale(); },{passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('resize',setScale,{passive:true});
  if(window.ResizeObserver){
    var appSizeObserver=new ResizeObserver(setScale);
    appSizeObserver.observe(app);
  }

  // ---- navigasi tab bawah (halaman terpisah)
  // Beranda -> tab lain: riwayat bertambah, jadi tombol back kembali ke Beranda.
  // Antar tab lain: location.replace, riwayat tidak menumpuk.
  document.addEventListener('click',function(e){
    var a=e.target.closest('a.ni'); if(!a) return;
    e.preventDefault();
    var n=a.getAttribute('data-tab'),href=a.getAttribute('href');
    if(n===TAB){var sc=$('.scroll');if(sc)sc.scrollTo({top:0,behavior:'smooth'});return}
    safe(function(){
      if(TAB==='Beranda'){sessionStorage.setItem('gp_home','1');location.href=href}
      else if(n==='Beranda'&&sessionStorage.getItem('gp_home')==='1'&&history.length>1){sessionStorage.removeItem('gp_home');history.back()}
      else location.replace(href);
    });
  });

  // ---- tombol back perangkat di Beranda: "tekan sekali lagi untuk keluar"
  if(TAB==='Beranda'){
    var armed=false,armT;
    safe(function(){ if(!(history.state&&history.state.g)){history.replaceState({root:1},'');history.pushState({g:1},'')} });
    addEventListener('popstate',function(e){
      if(!(e.state&&e.state.root)) return;
      if(armed){armed=false;clearTimeout(armT);safe(function(){history.back()});return}
      armed=true;GP.say('Tekan sekali lagi untuk keluar');
      safe(function(){history.pushState({g:1},'')});
      armT=setTimeout(function(){armed=false},2200);
    });
  }

  // ---- Pull to refresh: HANYA Beranda. Tarik CEPAT lalu lepas (atau tarik jauh) -> animasi bertahan 2 detik, lalu kembali otomatis.
  var ind=$('#ptr');
  if(ind){
    var svg=ind.querySelector('svg'),bgEl=$('#ptrbg');
    var TH=64,MAXP=114,busy=false,MSG='Diperbarui \u00b7 belum terhubung ke server',ICON=26.7,ICON_MAX=50;
    var attach=function(sc,base,useBg,o){
      o=o||{};
      var HOLD=o.hold||0,HOLD_GAP=o.holdGap||56,FLICK_MIN=o.flickMin||18,FLICK_V=o.flickV||0.25;
      var y0=null,x0=0,active=false,pull=0,raf=0,spin=0,spinning=false,last=0,pts=[];
      function curY(){try{return new DOMMatrix(getComputedStyle(sc).transform).m42}catch(_){return 0}}
      function render(g){
        if(g<0.5){ind.style.opacity=0;return}
        var size=Math.min(ICON_MAX,g*.62),sc_=size/ICON;
        ind.style.transform='translateY('+(base+g/2-16)+'px)';
        ind.style.opacity=Math.min(1,g/14);
        svg.style.transform='rotate('+(g*1.45+spin)+'deg) scale('+sc_.toFixed(3)+')';
        ind.classList.toggle('pg',g>=40);
        if(useBg&&bgEl) bgEl.style.opacity=1;
      }
      function tick(){
        var n=performance.now(); if(spinning) spin+=(n-last)*.45; last=n;
        render(curY());raf=requestAnimationFrame(tick);
      }
      function put(p){sc.style.transform='translateY('+p+'px)';render(p)}
      function finish(){
        cancelAnimationFrame(raf);spinning=false;spin=0;
        sc.style.transition='';sc.style.transform='';ind.style.opacity=0;ind.classList.remove('pg');svg.style.transform='';
        if(bgEl) bgEl.style.opacity=0;busy=false;
      }
      function back(done){
        sc.style.transition='transform .34s cubic-bezier(.2,.8,.2,1)';
        sc.style.transform='translateY(0px)';
        cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(tick);
        setTimeout(function(){finish();if(done)done()},380);
      }
      function release(refreshed){
        busy=true;
        if(refreshed&&HOLD){
          // tahan di posisi terbuka sambil ikon berputar, lalu kembali sendiri
          sc.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';
          sc.style.transform='translateY('+HOLD_GAP+'px)';
          spinning=true;cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(tick);
          window.dispatchEvent(new CustomEvent('gp:refresh'));
          setTimeout(function(){spinning=false;back()},HOLD);
          return;
        }
        back(null);
      }
      // kecepatan tarik (px/ms) dari sentuhan 120 ms terakhir; 0 bila jari sempat berhenti
      function velocity(){
        var n=pts.length; if(n<2) return 0;
        var l=pts[n-1]; if(performance.now()-l.t>150) return 0;
        var i=n-1; while(i>0&&l.t-pts[i-1].t<=120) i--;
        var dt=l.t-pts[i].t; return dt>0?(l.y-pts[i].y)/GP.k()/dt:0;
      }
      sc.addEventListener('touchstart',function(e){
        if(busy||e.touches.length!==1||sc.scrollTop>0){y0=null;return}
        y0=e.touches[0].clientY;x0=e.touches[0].clientX;active=false;pull=0;pts=[{t:performance.now(),y:y0}];
      },{passive:true});
      sc.addEventListener('touchmove',function(e){
        if(y0===null||busy) return;
        var t=e.touches[0],dy=(t.clientY-y0)/GP.k(),dx=Math.abs(t.clientX-x0)/GP.k();
        pts.push({t:performance.now(),y:t.clientY}); if(pts.length>8) pts.shift();
        if(!active){
          if(sc.scrollTop>0||dy<0){y0=null;return}
          if(dy<8) return;
          if(dx>dy){y0=null;return}
          active=true;sc.style.transition='none';
        }
        pull=MAXP*(1-Math.exp(-Math.max(0,dy)/170));
        put(pull);
        if(e.cancelable) e.preventDefault();
      },{passive:false});
      function end(e){
        if(!active){y0=null;return}
        active=false;y0=null;
        var ok=e.type==='touchend'&&(pull>=TH||(HOLD&&pull>=FLICK_MIN&&velocity()>=FLICK_V));
        release(ok);
      }
      sc.addEventListener('touchend',end);sc.addEventListener('touchcancel',end);
    };
    var s1=$('#scroll');
    if(s1&&TAB==='Beranda') attach(s1,0,true,{hold:2000});
  }

  // ---- Tampilan siap: transisi halus saat halaman muncul (untuk browser tanpa View Transitions)
  requestAnimationFrame(function(){ document.documentElement.classList.add('gp-ready'); });

  // ---- Banner offline: "Tidak ada koneksi" + kabar saat tersambung lagi
  var offEl=document.createElement('div');
  offEl.className='gp-off';offEl.setAttribute('role','status');offEl.setAttribute('aria-live','polite');
  if(app) app.appendChild(offEl);
  var offT;
  function netState(){
    clearTimeout(offT);
    if(navigator.onLine===false){
      offEl.textContent='Tidak ada koneksi \u2014 menampilkan data terakhir';
      offEl.classList.remove('ok');offEl.classList.add('show');
      window.dispatchEvent(new CustomEvent('gp:offline'));
    } else if(offEl.classList.contains('show')){
      offEl.textContent='Tersambung kembali';offEl.classList.add('ok');
      offT=setTimeout(function(){offEl.classList.remove('show')},1800);
      window.dispatchEvent(new CustomEvent('gp:online'));
    }
  }
  addEventListener('online',netState);addEventListener('offline',netState);
  GP.online=function(){return navigator.onLine!==false};
  if(navigator.onLine===false) netState();

  // ---- Keyboard layar: sembunyikan nav, gulirkan kolom isian ke area terlihat, pulihkan posisi saat keyboard tutup
  var vv=window.visualViewport,baseH=window.innerHeight,kbOn=false;
  function isField(el){return !!el&&/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!/^(button|checkbox|radio|submit|range)$/.test(el.type||'')||(!!el&&el.isContentEditable)}
  function vh(){return vv?vv.height:window.innerHeight}
  function kbCheck(){
    var f=isField(document.activeElement);
    if(!f) baseH=Math.max(baseH,window.innerHeight);
    var open=f&&(baseH-vh()>120);
    if(open!==kbOn){
      kbOn=open;document.documentElement.classList.toggle('gp-kb',open);
      if(!open){ safe(function(){app.scrollTop=0;document.documentElement.scrollTop=0;window.scrollTo(0,0)}); }
    }
  }
  function scroller(el){
    for(var p=el.parentElement;p&&p!==document.body;p=p.parentElement){
      var o=getComputedStyle(p).overflowY;
      if((o==='auto'||o==='scroll')&&p.scrollHeight>p.clientHeight+2) return p;
    }
    return null;
  }
  function reveal(el){
    var sc=scroller(el); if(!sc) return;
    var r=el.getBoundingClientRect(),cr=sc.getBoundingClientRect(),k=GP.k();
    var bottom=Math.min(cr.bottom,vv?vv.offsetTop+vv.height:cr.bottom)-16;
    if(r.bottom>bottom||r.top<cr.top+8){
      sc.scrollTo({top:sc.scrollTop+((r.top-cr.top)-(bottom-cr.top)/3)/k,behavior:'smooth'});
    }
  }
  document.addEventListener('focusin',function(e){
    if(!isField(e.target)) return;
    var t=e.target;setTimeout(function(){kbCheck();reveal(t)},320);
  });
  document.addEventListener('focusout',function(){ setTimeout(kbCheck,120); });
  if(vv) vv.addEventListener('resize',kbCheck,{passive:true});
  addEventListener('resize',kbCheck,{passive:true});

  // ---- Simpan & pulihkan posisi scroll tiap tab (seperti tab aplikasi native yang mempertahankan posisinya)
  (function(){
    if(!TAB) return;
    var sc=$('.scroll'); if(!sc) return;
    var key='gp_sy_'+TAB;
    function save(){ safe(function(){sessionStorage.setItem(key,String(Math.round(sc.scrollTop)))}); }
    function restore(){
      var y=+safe(function(){return sessionStorage.getItem(key)})||0; if(!y) return;
      sc.style.scrollBehavior='auto';sc.scrollTop=y;
      requestAnimationFrame(function(){sc.scrollTop=y;sc.style.scrollBehavior=''});
    }
    restore();
    addEventListener('load',function(){ if(sc.scrollTop<2) restore(); });
    addEventListener('pagehide',save);
    document.addEventListener('visibilitychange',function(){ if(document.hidden) save(); });
    document.addEventListener('click',function(e){ if(e.target.closest('a.ni')) save(); },true);
    GP.resetScroll=function(){ safe(function(){sessionStorage.removeItem(key)}); };
  })();

  // ---- Getaran halus saat menyentuh tab bawah & tombol
  document.addEventListener('pointerdown',function(e){
    var el=e.target.closest&&e.target.closest('.ni,button:not([data-t]),[data-page]');
    if(el) GP.haptic('tap');
  },{passive:true});
})();
