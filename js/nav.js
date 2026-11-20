/* nav.js — SATU-SATUNYA sumber bottom bar (Beranda, Keuangan, Riwayat, Profil).
   Dimuat sinkron di posisi lama <nav> pada tiap halaman tab, jadi bar sudah ada sebelum paint pertama.
   Tab aktif mengikuti <body data-tab>. Halaman fitur (Top up, Pengaturan, dst.) dan alur masuk tidak punya
   data-tab tab, sehingga TIDAK menampilkan bottom bar. Ikon tiap tab diatur CSS (.ni[data-tab=...] .mi di shared.css). */
(function () {
  'use strict';
  var TABS = [['Beranda', 'index.html', 0], ['Keuangan', 'keuangan.html', 72], ['Riwayat', 'riwayat.html', 216], ['Profil', 'profil.html', 288]];
  var aktif = document.body.getAttribute('data-tab') || '';
  if (!TABS.some(function (t) { return t[0] === aktif; })) return;   // halaman fitur: tanpa bottom bar

  function tab(t) {
    var on = t[0] === aktif;
    return '<a class="ni' + (on ? ' on' : '') + '" style="left:' + (t[2] ? t[2] + 'px' : '0') + '" data-tab="' + t[0] + '" href="' + t[1] + '"' +
      (on ? ' aria-current="page"' : '') + '><i class="pl"></i><i class="mi"></i><span class="lb">' + t[0] + '</span></a>';
  }
  var html = '<nav class="nav" id="gp-nav">' + tab(TABS[0]) + tab(TABS[1]) +
    '<span class="ql">QRIS</span>' +
    '<button class="qr" data-t="Pemindai QRIS memerlukan akses kamera dan layanan GoPay" aria-label="QRIS"></button>' +
    tab(TABS[2]) + tab(TABS[3]) + '</nav>';

  var cs = document.currentScript, ui = document.getElementById('ui');
  if (cs && cs.parentNode) cs.insertAdjacentHTML('beforebegin', html);
  else if (ui) ui.insertAdjacentHTML('beforeend', html);
})();
