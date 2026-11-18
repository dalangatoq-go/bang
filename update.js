/* update.js — pasang sekali di index.html (<script src="update.js"></script>), tidak perlu diubah lagi.
   Mendaftarkan sw.js tanpa cache HTTP, mengecek pembaruan tiap aplikasi dibuka/kembali aktif/tiap 5 menit,
   dan memuat ulang otomatis saat ada versi baru. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var reloading = false;
  function reload() {
    if (reloading) return; reloading = true;
    try { sessionStorage.setItem('upd_t', String(Date.now())); } catch (_) {}
    location.reload();
  }
  function recentlyReloaded() {                       // cegah loop reload
    try { return Date.now() - Number(sessionStorage.getItem('upd_t') || 0) < 15000; } catch (_) { return false; }
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (!recentlyReloaded()) reload(); });
  /* Suara notifikasi: mynotification.mp3 dibunyikan saat push masuk dan aplikasi sedang terbuka.
     Browser mewajibkan satu sentuhan pengguna dulu, jadi audio "dibuka kuncinya" pada interaksi pertama. */
  var bunyi = null;
  function siapAudio() { if (!bunyi) { bunyi = new Audio('mynotification.mp3'); bunyi.preload = 'auto'; } return bunyi; }
  function bukaKunci() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (n) { document.removeEventListener(n, bukaKunci, true); });
    try {
      var a = siapAudio(); a.muted = true;
      var p = a.play();
      var selesai = function () { a.pause(); a.currentTime = 0; a.muted = false; };
      if (p && p.then) p.then(selesai).catch(function () { a.muted = false; }); else selesai();
    } catch (_) {}
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (n) { document.addEventListener(n, bukaKunci, true); });
  var terakhir = 0;
  function bunyikan() {
    if (document.hidden) return;
    var n = Date.now(); if (n - terakhir < 1500) return;          // realtime + web push untuk transaksi yang sama: satu bunyi
    terakhir = n;
    try { var a = siapAudio(); a.currentTime = 0; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (_) {}
  }
  window.GPBunyi = bunyikan;                                       // dipakai juga oleh js/notif.js (notifikasi realtime)
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'APP_UPDATED' && !recentlyReloaded()) reload();
    if (e.data.type === 'PUSH_SOUND' && !(window.GP && window.GP.notif)) bunyikan();   // bila notif.js ada, ia yang membunyikan (dengan dedup per id)
  });
  function cek(reg) {
    reg.update().catch(function () {});               // cek sw.js baru
    var w = navigator.serviceWorker.controller || reg.active;
    if (w) w.postMessage({ type: 'CHECK' });          // cek index.html baru
  }
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    cek(reg);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cek(reg); });
    window.addEventListener('online', function () { cek(reg); });
    setInterval(function () { if (!document.hidden) cek(reg); }, 5 * 60 * 1000);
  }).catch(function () {});
})();
