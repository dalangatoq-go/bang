/* beranda.js — header, saldo realtime, banner, saklar tema */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var say=GP.say,ui=$('#ui'),uiK=GP.k;

  // header: muat-kan teks ke dalam tombolnya
  function fitHeader(){
    var K=uiK();
    $$('.hdr .stack').forEach(function(b){
      var s=b.querySelector('.tx'); if(!s) return;
      if(!s.dataset.fs) s.dataset.fs=parseFloat(getComputedStyle(b).fontSize);
      var fs=+s.dataset.fs; b.style.fontSize=fs+'px';
      var cs=getComputedStyle(b), pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)||0, gap=parseFloat(cs.columnGap)||0;
      var others=0,n=0; [].forEach.call(b.children,function(c){ if(c!==s){others+=c.getBoundingClientRect().width/K+(parseFloat(getComputedStyle(c).marginLeft)||0)+(parseFloat(getComputedStyle(c).marginRight)||0);n++;}});
      var col=cs.flexDirection==='column';
      var avail=(b.clientWidth)-(col?8:pad+others+gap*n+6);
      var tries=0; s.style.maxWidth='none';
      while(s.scrollWidth>avail && fs>8 && tries++<40){fs-=.25;b.style.fontSize=fs+'px';}
    });
  }
  fitHeader();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitHeader);
  addEventListener('resize',fitHeader);

  // saldo
  var hidden=false,amt=$('#amt'),saldo=null;
  var fmtRp=function(n){return new Intl.NumberFormat('id-ID').format(n)};
  var renderSaldo=function(){
    amt.textContent=hidden?'\u2022\u2022\u2022\u2022\u2022':(saldo===null?'\u2014':fmtRp(saldo));
    $('#pupil').style.display=hidden?'none':'';
  };
  $('#eye').addEventListener('click',function(){hidden=!hidden;renderSaldo();});
  // saldo = kolom nominal tabel g (id=1), realtime lewat Supabase
  var sb=GP.sb();
  if(sb){
    var setSaldo=function(v){var n=Number(v);if(isFinite(n)){saldo=n;renderSaldo();}};
    var loadSaldo=function(){
      sb.from('g').select('nominal').eq('id',1).single().then(function(r){
        if(r.error||!r.data){say('Gagal memuat saldo');return;}
        setSaldo(r.data.nominal);
      });
    };
    loadSaldo();
    sb.channel('saldo-g')
      .on('postgres_changes',{event:'*',schema:'public',table:'g'},function(p){
        if(p.new&&p.new.nominal!==undefined) setSaldo(p.new.nominal); else loadSaldo();
      })
      .subscribe(function(st){ if(st==='SUBSCRIBED') loadSaldo(); });
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) loadSaldo(); });
    window.addEventListener('gp:refresh',loadSaldo);   // tarik-untuk-segarkan
  } else { say('Library Supabase gagal dimuat'); }

  // banner
  var sc=$('#scroll'),bn=$('#bn');
  $('#bnx').addEventListener('click',function(){bn.classList.add('hide')});
  // posisi banner mengikuti scroll: rendah di atas, naik di tengah, hilang di dasar halaman
  function bnPos(){var s=sc.scrollTop,max=sc.scrollHeight-sc.clientHeight;
    if(bn.classList.contains('moved')) return;
    bn.classList.toggle('hi',s>=500&&s<max-60);bn.classList.toggle('gone',s>=max-60);}
  sc.addEventListener('scroll',bnPos,{passive:true});bnPos();
  // banner bisa digeser, menempel ke tepi kiri/kanan saat dilepas
  (function(){
    var st=null,justDragged=false;
    function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
    // tinggi nav bawah sebenarnya (61px + safe-area perangkat), dalam satuan kanvas 360dp
    function navH(){var n=$('.nav');return n?n.getBoundingClientRect().height/uiK():61}
    bn.addEventListener('pointerdown',function(e){
      if(e.button!==undefined&&e.button!==0) return;
      var K=uiK(),ar=ui.getBoundingClientRect(),br=bn.getBoundingClientRect();
      st={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:(br.left-ar.left)/K,oy:(br.top-ar.top)/K,moved:false,w:br.width/K,h:br.height/K,k:K};
    });
    bn.addEventListener('pointermove',function(e){
      if(!st||e.pointerId!==st.id) return;
      var dx=(e.clientX-st.sx)/st.k,dy=(e.clientY-st.sy)/st.k;
      if(!st.moved){ if(Math.hypot(dx,dy)<6) return;
        st.moved=true; try{bn.setPointerCapture(st.id)}catch(_){}
        bn.classList.add('moved','drag'); bn.classList.remove('snap','hi','gone');
        bn.style.right='auto'; bn.style.bottom='auto'; }
      var aw=ui.clientWidth,ah=ui.clientHeight;
      bn.style.left=clamp(st.ox+dx,0,aw-st.w)+'px';
      bn.style.top=clamp(st.oy+dy,0,ah-st.h-navH())+'px';
      e.preventDefault();
    });
    function end(e){
      if(!st||e.pointerId!==st.id) return;
      if(st.moved){
        justDragged=true; setTimeout(function(){justDragged=false},0);
        bn.classList.remove('drag'); bn.classList.add('snap');
        var aw=ui.clientWidth,left=parseFloat(bn.style.left)||0;
        bn.style.left=((left+st.w/2<aw/2)?4:aw-st.w-4)+'px';
        try{bn.releasePointerCapture(st.id)}catch(_){}
      }
      st=null;
    }
    bn.addEventListener('pointerup',end); bn.addEventListener('pointercancel',end);
    bn.addEventListener('click',function(e){ if(justDragged){e.stopPropagation();e.preventDefault();} },true);
    addEventListener('resize',function(){ if(!bn.classList.contains('moved')) return;
      var aw=ui.clientWidth,ah=ui.clientHeight;
      bn.style.left=clamp(parseFloat(bn.style.left)||0,0,aw-bn.offsetWidth)+'px';
      bn.style.top=clamp(parseFloat(bn.style.top)||0,0,ah-bn.offsetHeight-navH())+'px'; });
  })();

  // saklar tema (tersimpan, dipakai juga oleh halaman lain)
  $('#sw').addEventListener('click',function(){
    var light=document.body.classList.toggle('light'); GP.theme(light);
    $('meta[name=theme-color]').setAttribute('content','#025c90');
  });
})();
