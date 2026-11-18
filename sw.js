/* ============================================================================
   sw.js — Service Worker "update langsung" (tidak perlu diubah-ubah lagi)
   ----------------------------------------------------------------------------
   Prinsip:
   - Semua berkas same-origin diambil dari JARINGAN dulu (cache HTTP dilewati),
     cache hanya cadangan saat offline / koneksi lambat. Jadi deploy baru
     langsung terpakai di pembukaan berikutnya TANPA mengganti versi di sini.
   - install -> skipWaiting, activate -> clients.claim: SW baru langsung aktif.
   - Halaman bisa minta pengecekan ("CHECK"); jika index berubah, SW membalas
     "APP_UPDATED" dan halaman (lihat update.js) memuat ulang otomatis.
   - Menangani notifikasi push (dikirim dari tabel history lewat edge function kirim-push).
   Tidak ada nomor versi yang perlu dinaikkan. Bila suatu saat ingin menghapus
   semua cache paksa, ganti CACHE saja.
   ========================================================================== */
var CACHE = 'app-runtime';
var CORE = ['./', './index.html', './keuangan.html', './riwayat.html', './profil.html', './topup.html', './pengaturan.html',
            './manifest.webmanifest', './update.js', './push.js',
            './css/shared.css', './css/beranda.css', './css/profil.css', './css/topup.css', './css/pengaturan.css', './css/install.css', './css/riwayat.css', './css/keuangan.css',
            './js/config.js', './js/core.js', './js/beranda.js', './js/profil.js', './js/topup.js', './js/pengaturan.js', './js/install.js', './js/riwayat.js', './js/notif.js',
            './icons/icon-192.png', './icons/icon-512.png', './mynotification.mp3'];   // dihangatkan saat install (opsional, gagal pun tak apa)
var NET_TIMEOUT = 6000;                                         // ms; lewat ini pakai cache jika ada
var CDN_OK = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { if (self.registration.navigationPreload) return self.registration.navigationPreload.disable(); })
      .then(function () { return self.clients.claim(); })
  );
});

function fresh(req) {                       // ambil dari jaringan, lewati cache HTTP browser
  return fetch(new Request(req, { cache: 'no-store' }));
}
function withTimeout(p, ms) {
  return new Promise(function (ok, no) {
    var t = setTimeout(function () { no(new Error('timeout')); }, ms);
    p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  if (!same && CDN_OK.indexOf(url.hostname) < 0) return;      // API (Supabase dll.) tidak disentuh
  if (req.headers.has('range')) return;

  event.respondWith((async function () {
    var cache = await caches.open(CACHE);
    // CDN: cepat dari cache, diperbarui di belakang layar
    if (!same) {
      var hit = await cache.match(req);
      var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    }
    // same-origin: jaringan dulu, cache cadangan
    try {
      var r = await withTimeout(fresh(req), req.mode === 'navigate' ? NET_TIMEOUT : NET_TIMEOUT * 2);
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    } catch (err) {
      var c = await cache.match(req, { ignoreSearch: true });
      if (c) return c;
      if (req.mode === 'navigate') { var home = await cache.match('./index.html') || await cache.match('./'); if (home) return home; }
      return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

/* ---- Cek pembaruan atas permintaan halaman ---- */
async function sha(buf) {
  var d = await crypto.subtle.digest('SHA-1', buf);
  return Array.prototype.map.call(new Uint8Array(d), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}
async function cekUpdate() {
  var cache = await caches.open(CACHE);
  var key = new Request(new URL('./index.html', self.registration.scope).href);
  var r = await fresh(key); if (!r.ok) return false;
  var baru = await r.clone().arrayBuffer();
  var lama = await cache.match(key);
  var beda = true;
  if (lama) beda = (await sha(await lama.arrayBuffer())) !== (await sha(baru));
  await cache.put(key, r);
  return beda && !!lama;
}
self.addEventListener('message', function (event) {
  var m = event.data || {};
  if (m.type === 'SKIP_WAITING') self.skipWaiting();
  if (m.type === 'CHECK') {
    event.waitUntil(cekUpdate().then(function (beda) {
      if (!beda) return;
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
        l.forEach(function (c) { c.postMessage({ type: 'APP_UPDATED' }); });
      });
    }).catch(function () {}));
  }
});

/* ---- Push: judul & pesan dari server (judul bawaan "GoPay") ---- */
self.addEventListener('push', function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    // Aplikasi sedang terbuka & terlihat: bunyikan mynotification.mp3 dari halaman (notifikasi sistem dibisukan agar tidak dobel).
    // Aplikasi tertutup: web push tidak bisa memakai suara kustom, jadi memakai suara notifikasi bawaan perangkat.
    var tampak = l.filter(function (c) { return c.visibilityState === 'visible'; });
    tampak.forEach(function (c) { c.postMessage({ type: 'PUSH_SOUND', id: d.id == null ? null : d.id, title: d.title || 'GoPay', body: d.body || '' }); });
    return self.registration.showNotification(d.title || 'GoPay', {
      body: d.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: d.id ? 'notif-' + d.id : undefined,
      silent: tampak.length > 0,
      vibrate: [200, 100, 200],
      data: { url: './' }
    });
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) if ('focus' in l[i]) return l[i].focus();
    return self.clients.openWindow(url);
  }));
});
