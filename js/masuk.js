/* masuk.js — alur keluar/masuk: onboarding -> nomor HP -> PIN. Aturan visual ada di css/masuk.css */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  function safe(f){try{return f()}catch(_){}}
  var P=document.body.getAttribute('data-p');
  var GM=window.GPMasuk=window.GPMasuk||{};

  /* Titik sambung ke server. Isi dengan pemeriksaan PIN sebenarnya (mis. Supabase) lalu kembalikan Promise<true|false>.
     Bawaan: belum ada skema PIN di server, jadi PIN 6 digit apa pun diterima. */
  GM.verifikasi=GM.verifikasi||function(hp,pin){return Promise.resolve(true)};
  GM.tujuan='index.html';   // halaman setelah berhasil masuk

  function nomorBersih(v){
    v=String(v||'').replace(/\D/g,'');
    if(v.indexOf('62')===0&&v.length>11) v=v.slice(2);
    return v.replace(/^0+/,'');
  }

  if(P==='onb'){
    $('#go-hp').addEventListener('click',function(){location.href='masuk.html'});
  }

  if(P==='hp'){
    var inp=$('#hp'),go=$('#hp-lanjut');
    // nomor terakhir yang tersimpan (cache profil) ditampilkan lagi, seperti referensi
    safe(function(){var c=JSON.parse(localStorage.getItem('profil_cache_v1')||'null'); if(c&&c.nomor_hape) inp.value=nomorBersih(c.nomor_hape).slice(0,13);});
    function valid(v){return v.length>=9&&v.length<=13&&v.charAt(0)==='8'}
    function sinkron(){
      var ok=valid(nomorBersih(inp.value));
      go.classList.toggle('off',!ok);
      go.setAttribute('aria-disabled',ok?'false':'true');
    }
    inp.addEventListener('input',function(){
      var v=inp.value.replace(/\D/g,'').replace(/^0+/,'');
      if(v!==inp.value) inp.value=v;
      sinkron();
    });
    sinkron();
    function lanjut(){
      var v=nomorBersih(inp.value);
      if(!valid(v)){ inp.focus(); return; }   // tombol nonaktif: tidak ada pesan, sesuai acuan
      safe(function(){sessionStorage.setItem('gp_hp',v)});
      location.href='pin.html';
    }
    go.addEventListener('click',lanjut);
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();inp.blur();lanjut();} });
    $('#hp-back').addEventListener('click',function(){GP.back('onboarding.html')});
  }

  if(P==='pin'){
    var box=$('#pbox'),dots=[].slice.call(box.querySelectorAll('i')),pin='',busy=false;
    function paint(){
      dots.forEach(function(d,i){d.classList.toggle('f',i<pin.length)});
      box.setAttribute('aria-label','PIN, '+pin.length+' dari 6 digit');
    }
    function gagal(msg){
      busy=false; pin=''; GP.haptic('err');
      box.classList.remove('err'); void box.offsetWidth; box.classList.add('err');
      setTimeout(paint,260); GP.say(msg||'PIN salah, coba lagi');
    }
    function kirim(){
      busy=true;
      var hp=safe(function(){return sessionStorage.getItem('gp_hp')})||'';
      var pr=safe(function(){return GM.verifikasi(hp,pin)});
      Promise.resolve(pr).then(function(ok){
        if(ok===false) return gagal();
        GP.haptic('ok');
        safe(function(){sessionStorage.removeItem('gp_hp')});
        GP.masuk();   // sesi aktif lagi
        location.replace(GM.tujuan);
      },function(){gagal('Gagal memeriksa PIN. Periksa koneksi.')});
    }
    function tekan(k){
      if(busy) return;
      if(k==='del'){ pin=pin.slice(0,-1); paint(); return; }
      if(pin.length>=6) return;
      pin+=k; paint();
      if(pin.length===6) setTimeout(kirim,140);
    }
    $('#pad').addEventListener('click',function(e){
      var b=e.target.closest('[data-k]'); if(b) tekan(b.getAttribute('data-k'));
    });
    document.addEventListener('keydown',function(e){   // papan ketik fisik (desktop)
      if(/^[0-9]$/.test(e.key)) tekan(e.key); else if(e.key==='Backspace') tekan('del');
    });
    $('#pin-x').addEventListener('click',function(){GP.back('masuk.html')});
  }
})();
