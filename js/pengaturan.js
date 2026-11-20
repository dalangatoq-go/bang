/* pengaturan.js — halaman Pengaturan (tombol kembali memakai riwayat browser) */
(function(){
  'use strict';
  var ST=document.getElementById('st'),SC=document.getElementById('st-sc'),TO=document.getElementById('st-toast'),tm;
  function say(m){TO.textContent=m;TO.classList.add('st-s');clearTimeout(tm);tm=setTimeout(function(){TO.classList.remove('st-s')},2200)}
  function closeSt(){GP.back('profil.html')}
  document.addEventListener('click',function(e){
    var r=e.target.closest('#st .st-row');
    /* pesan "belum terhubung ke server" dihapus */
  });
  // muat-kan teks ke lebar kolom: kecilkan seragam bila ada yang menabrak chevron
  function fit(){
    var f=[['.st-tx b','--tf',14.6],['.st-tx > span','--sf',12.4]];
    ST.style.setProperty('--tf','14.6px');ST.style.setProperty('--sf','12.4px');
    f.forEach(function(x){var base=x[2],k=1;
      [].forEach.call(ST.querySelectorAll(x[0]),function(e){ if(e.scrollWidth>e.clientWidth+0.5) k=Math.min(k,e.clientWidth/e.scrollWidth); });
      if(k<1) ST.style.setProperty(x[1],(Math.floor(base*k*20)/20)+'px');
    });
  }
  fit(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
  addEventListener('resize',fit);
  document.getElementById('st-back').addEventListener('click',closeSt);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSt()});
})();
