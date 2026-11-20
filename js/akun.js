/* akun.js — halaman akun tersimpan: nama & nomor mengikuti Profil; hijau -> Beranda, "Akun Lain" -> alur keluar (onboarding). */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  function safe(f){try{return f()}catch(_){}}
    /* Nama & nomor mengikuti akun di Profil: cache profil_cache_v1 (ditulis js/profil.js) lalu disegarkan dari tabel profil (id=1). */
  var KEY='profil_cache_v1';
  var nm=$('#ak-nm'),hp=$('#ak-hp'),av=$('#ak-av');
  function isi(d){
    var n=String((d&&d.nama)||'').trim(), h=String((d&&d.nomor_hape)||'').trim();
    nm.textContent='Lanjut sebagai '+(n||'akunmu');
    hp.textContent=h||'\u2014';                       // persis seperti yang tampil di Profil
    av.textContent=n?Array.from(n)[0].toUpperCase():'?';
  }
  isi(safe(function(){return JSON.parse(localStorage.getItem(KEY)||'null')}));
  var sb=GP.sb&&GP.sb();
  if(sb){
    Promise.resolve(sb.from('profil').select('nama,nomor_hape,email').eq('id',1).single()).then(function(r){
      if(!r||r.error||!r.data) return;
      isi(r.data);
      safe(function(){localStorage.setItem(KEY,JSON.stringify({nama:r.data.nama,nomor_hape:r.data.nomor_hape,email:r.data.email}))});
    }).catch(function(){});
  }
  $('#ak-lanjut').addEventListener('click',function(){ GP.haptic('ok'); GP.masuk(); location.replace('index.html'); });   // masuk lagi langsung ke Beranda
  $('#ak-lain').addEventListener('click',function(){ location.href='onboarding.html'; });                     // alur keluar yang sudah ada
})();
