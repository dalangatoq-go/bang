/* profil.js — data profil realtime, bayangan judul, popup keluar */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  var say=GP.say;

  $('#scrollP').addEventListener('scroll',function(){$('#ptitle').classList.toggle('sh',this.scrollTop>2)},{passive:true});

  // profil = tabel profil (id=1): nama, nomor_hape, email; realtime lewat Supabase
  var sb=GP.sb();
  if(sb){
    var pEl={n:$('#p_name'),h:$('#p_phone'),e:$('#p_email')},
        pMax={n:237,h:237,e:126}, pKey='profil_cache_v1';
    var fitP=function(el,max){
      if(!el.dataset.fs) el.dataset.fs=parseFloat(getComputedStyle(el).fontSize);
      var fs=+el.dataset.fs; el.style.fontSize=fs+'px';
      var g=0; while(el.scrollWidth>max && fs>8 && g++<80){fs-=.25;el.style.fontSize=fs+'px';}
    };
    var renderProfil=function(d){
      pEl.n.textContent=d.nama||'\u2014';
      pEl.h.textContent=d.nomor_hape||'\u2014';
      pEl.e.textContent=d.email||'\u2014';
      fitP(pEl.n,pMax.n);fitP(pEl.h,pMax.h);fitP(pEl.e,pMax.e);
    };
    var cached=function(){try{return JSON.parse(localStorage.getItem(pKey)||'null')}catch(_){return null}};
    var c0=cached(); if(c0) renderProfil(c0);
    var profilLoad=null,profilVersion=0;
    var setProfil=function(d){
      if(!d) return; profilVersion++; renderProfil(d);
      try{localStorage.setItem(pKey,JSON.stringify({nama:d.nama,nomor_hape:d.nomor_hape,email:d.email}));}catch(_){}
    };
    var loadProfil=function(){
      if(profilLoad) return profilLoad;
      var version=profilVersion;
      profilLoad=sb.from('profil').select('nama,nomor_hape,email').eq('id',1).single().then(function(r){
        if(r.error||!r.data){say('Gagal memuat profil');return;}
        // Query lama tidak boleh menimpa data yang lebih baru dari Realtime.
        if(version===profilVersion) setProfil(r.data);
      }).catch(function(){say('Gagal memuat profil')}).then(function(){profilLoad=null;});
      return profilLoad;
    };
    loadProfil();
    sb.channel('profil-1')
      .on('postgres_changes',{event:'*',schema:'public',table:'profil'},function(p){
        if(p.new&&p.new.nama!==undefined) setProfil(p.new); else loadProfil();
      })
      .subscribe(function(st){ if(st==='SUBSCRIBED') loadProfil(); });
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) loadProfil(); });
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){var c=cached(); if(c) renderProfil(c);});
  } else { say('Library Supabase gagal dimuat'); }

  // popup konfirmasi keluar
  var LO=$('#lo');
  function hideLo(){LO.classList.remove('lo-on');LO.setAttribute('aria-hidden','true')}
  function openLo(){ if(LO.classList.contains('lo-on')) return; LO.classList.add('lo-on');LO.setAttribute('aria-hidden','false'); if(GP.layer) GP.layer.push(hideLo); }
  function closeLo(){ if(!LO.classList.contains('lo-on')) return; hideLo(); if(GP.layer) GP.layer.pop(); }
  document.addEventListener('click',function(e){ if(e.target.closest('[data-go="lo"]')) openLo(); });
  $('#lo-scrim').addEventListener('click',closeLo);
  $('#lo-no').addEventListener('click',closeLo);
  $('#lo-yes').addEventListener('click',function(){
    closeLo();
    if(GP.haptic) GP.haptic('ok');
    GP.keluar();   // putuskan sesi: halaman aplikasi lain dialihkan ke akun.html sampai masuk lagi
    // alur keluar: Profil -> akun tersimpan (akun.html) -> [Lanjut sebagai ... = Beranda] atau [Akun Lain = onboarding -> nomor HP -> PIN].
    // replace agar tombol Back tidak kembali ke Profil.
    setTimeout(function(){ location.replace('akun.html'); },160);   // beri waktu GP.layer.pop() menuntaskan history.back()
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&LO.classList.contains('lo-on'))closeLo()});
  // tombol back perangkat saat popup terbuka: ditangani GP.layer (core.js) -> hideLo()
})();
