/* ============================================================================
   sw.js — Service Worker "update langsung" (tidak perlu diubah-ubah lagi)
   ----------------------------------------------------------------------------
   Prinsip:
   - Berkas statis (CSS, JS, font, ikon, gambar, suara) memakai "cache dulu, perbarui di belakang layar":
     app langsung muncul walau sinyal lemah, seperti aplikasi native.
   - Halaman HTML memakai jaringan dulu dengan batas waktu singkat (NAV_TIMEOUT), lalu cache.
   - Saat index.html berubah, SW menyegarkan semua berkas inti di cache lalu memberi tahu halaman
     (APP_UPDATED); halaman menampilkan toast, tidak memuat ulang mendadak (lihat update.js).
   - Offline: halaman tak ter-cache jatuh ke offline.html yang rapi.
   - install -> skipWaiting, activate -> clients.claim: SW baru langsung aktif.
   - Halaman bisa minta pengecekan ("CHECK"); jika index berubah, SW membalas
     "APP_UPDATED" dan halaman (lihat update.js) memuat ulang otomatis.
   - Menangani notifikasi push (dikirim dari tabel history lewat edge function kirim-push).
   Tidak ada nomor versi yang perlu dinaikkan. Bila suatu saat ingin menghapus
   semua cache paksa, ganti CACHE saja.
   ========================================================================== */
var CACHE = 'app-runtime-5';
var GAMBAR = ["./assets/img/i-0603ebaf62.webp","./assets/img/i-0a9c052ded.webp","./assets/img/i-0d779f6f0a.webp","./assets/img/i-0f1a27c62d.webp","./assets/img/i-113425935b.webp","./assets/img/i-12533ef5ed.webp","./assets/img/i-133f386bb3.webp","./assets/img/i-14d283c7ba.webp","./assets/img/i-1b71ef2d72.webp","./assets/img/i-26752357b0.webp","./assets/img/i-2eb077100f.webp","./assets/img/i-310ab556ce.webp","./assets/img/i-38c056f913.webp","./assets/img/i-399892600d.webp","./assets/img/i-412723a76f.webp","./assets/img/i-4987531081.webp","./assets/img/i-4990f5125c.webp","./assets/img/i-4ec6001018.webp","./assets/img/i-51cc3e8728.webp","./assets/img/i-5582da10fd.webp","./assets/img/i-5637ec58c8.webp","./assets/img/i-58755b2bb2.webp","./assets/img/i-59d88f649a.webp","./assets/img/i-5a00a5857c.webp","./assets/img/i-62f729f0ad.webp","./assets/img/i-73a2589fbc.webp","./assets/img/i-7fe104a0bd.webp","./assets/img/i-817ace23e9.webp","./assets/img/i-855141bace.webp","./assets/img/i-86455facb2.webp","./assets/img/i-9087459c08.webp","./assets/img/i-95e04d7c40.webp","./assets/img/i-97f44c09f3.webp","./assets/img/i-a0fffe6fc0.webp","./assets/img/i-a76903bb17.webp","./assets/img/i-ae89e0b507.webp","./assets/img/i-b2d748d117.webp","./assets/img/i-bad939e89d.webp","./assets/img/i-bba93a7d89.webp","./assets/img/i-bfd2c5e246.webp","./assets/img/i-c2daae6510.webp","./assets/img/i-c4fbc54653.webp","./assets/img/i-c856b1d1b5.webp","./assets/img/i-ce8ae3d892.webp","./assets/img/i-d4d9b3dae4.webp","./assets/img/i-d598487749.webp","./assets/img/i-dbc9cf087c.webp","./assets/img/i-dbe309b3f4.webp","./assets/img/i-de89deec3b.webp","./assets/img/i-dead7e98c6.webp","./assets/img/i-e0877b1d5f.webp","./assets/img/i-e4dcec0b68.webp","./assets/img/i-e95bef4e44.webp","./assets/img/i-ec0c7d4635.webp","./assets/img/i-eea1e47f3c.webp","./assets/img/i-f0d7c255da.webp","./assets/img/i-f26dabbdf5.webp","./assets/img/i-f7072bfa9a.webp","./assets/img/i-f7f1327249.webp","./assets/img/i-fb7ba4377f.webp","./assets/img/i-fcc8314a4d.webp","./assets/img/tp-alfamart.webp","./assets/img/tp-alfamidi.webp","./assets/img/tp-badge.webp","./assets/img/tp-bca.webp","./assets/img/tp-bni.webp","./assets/img/tp-bri.webp","./assets/img/tp-bridd.webp","./assets/img/tp-dana.webp","./assets/img/tp-indomaret.webp","./assets/img/tp-jago.webp","./assets/img/tp-lawson.webp","./assets/img/tp-mandiri.webp","./assets/img/tp-oneklik.webp","./assets/img/tp-pandaremit.webp","./assets/img/tp-shopeepay.webp","./assets/img/tp-visa.webp"];   // dibuat otomatis dari assets/img (lihat README)
var CORE = ['./', './index.html', './keuangan.html', './riwayat.html', './profil.html', './topup.html', './pengaturan.html', './onboarding.html', './masuk.html', './pin.html', './offline.html',
            './manifest.webmanifest', './update.js', './push.js',
            './css/shared.css', './css/beranda.css', './css/profil.css', './css/topup.css', './css/pengaturan.css', './css/install.css', './css/riwayat.css', './css/keuangan.css', './css/masuk.css',
            './js/config.js', './js/core.js', './js/nav.js', './js/beranda.js', './js/profil.js', './js/topup.js', './js/pengaturan.js', './js/install.js', './js/riwayat.js', './js/notif.js', './js/masuk.js',
            './icons/icon-192.png', './icons/icon-512.png', './icons/badge-96.png', './mynotification.mp3',
            './assets/beranda-lines.svg', './assets/beranda-glow.png',
            './assets/fonts/inter-400.woff', './assets/fonts/inter-500.woff', './assets/fonts/inter-600.woff', './assets/fonts/inter-700.woff', './assets/fonts/lora-700.woff'];   // shell inti; gambar dihangatkan setelah tampilan pertama siap
var NAV_TIMEOUT = 2500;                                         // ms; HTML lewat ini pakai cache jika ada
var STATIC_RE = /\.(css|js|woff2?|png|webp|svg|jpg|jpeg|gif|ico|mp3|webmanifest)$/i;
var CDN_OK = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];
var CDN_WARM = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];   // dihangatkan agar tersedia offline sejak pemasangan

function warm(c, u, opt) {
  return fetch(u, opt || { cache: 'no-store' }).then(function (r) { if (r && (r.ok || r.type === 'opaque')) return c.put(u, r); }).catch(function () {});
}
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return warm(c, u); }).concat(CDN_WARM.map(function (u) { return warm(c, new Request(u, { mode: 'no-cors' }), {mode: 'no-cors'}); })));
  }));
});

// Gambar non-kritis di-cache setelah halaman pertama selesai dirender.
// Semua gambar tetap dihangatkan agar dukungan offline dipertahankan, tetapi
// tidak ikut berebut bandwidth pada fase install/initial loading.
var warmingImages = false;
var IMAGE_WARM_MARKER = './__gp_internal__/images-warmed-v1';
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'WARM_IMAGES' || warmingImages) return;
  warmingImages = true;
  event.waitUntil((async function () {
    try {
      var cache = await caches.open(CACHE);
      var marker = new Request(new URL(IMAGE_WARM_MARKER, self.registration.scope).href);
      // Setelah satu putaran selesai, halaman berikutnya tidak perlu memeriksa
      // ulang seluruh daftar gambar. Cache baru otomatis memulai dari awal.
      if (await cache.match(marker)) return;
      var semuaSiap = true;
      for (var i = 0; i < GAMBAR.length; i += 4) {
        var batch = GAMBAR.slice(i, i + 4);
        var hasilBatch = await Promise.all(batch.map(async function (path) {
          var url = new URL(path, self.registration.scope).href;
          if (await cache.match(url)) return true;
          await warm(cache, url);
          return !!(await cache.match(url));
        }));
        if (hasilBatch.some(function (siap) { return !siap; })) semuaSiap = false;
      }
      // Jangan tandai selesai bila ada gambar yang gagal diunduh; permintaan
      // berikutnya boleh mencoba ulang gambar yang belum berhasil di-cache.
      if (semuaSiap) await cache.put(marker, new Response('ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }));
    } finally {
      warmingImages = false;
    }
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { if (self.registration.navigationPreload) return self.registration.navigationPreload.disable(); })
      .then(function () { return self.clients.claim(); })
  );
});

var CEK = {}, CEK_MS = 10 * 60 * 1000;
function revalidate(event, cache, req, same, force) {
  var k = req.url, n = Date.now();
  if (!force && CEK[k] && n - CEK[k] < CEK_MS) return;
  if (force && CEK[k] && n - CEK[k] < 30000) return;
  CEK[k] = n;
  event.waitUntil((same ? fetch(new Request(req, { cache: 'no-cache' })) : fetch(req)).then(function (r) { if (r && (r.ok || r.type === 'opaque')) return cache.put(req, r.clone()); }).catch(function () {}));
}
function fresh(req) {                       // ambil dari jaringan, lewati cache HTTP browser
  return fetch(new Request(req, { cache: 'no-store' }));
}
function withTimeout(p, ms) {
  return new Promise(function (ok, no) {
    var t = setTimeout(function () { no(new Error('timeout')); }, ms);
    p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); });
  });
}
function offlineResp(req) {
  if (req.destination === 'image') return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
  return new Response('', { status: 503, statusText: 'Offline' });
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

    // 1) CDN & berkas statis: cache dulu; periksa pembaruan di belakang layar paling sering 1x / 10 menit per berkas
    if (!same || (STATIC_RE.test(url.pathname) && req.mode !== 'navigate')) {
      var hit = await cache.match(req, same ? { ignoreSearch: true } : undefined);
      if (hit) { revalidate(event, cache, req, same); return hit; }
      var r1 = await (same ? fetch(req) : fetch(req)).then(function (r) { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(function () { return null; });
      return r1 || offlineResp(req);
    }

    // 2) Halaman HTML: tampilkan dari cache SEKETIKA, perbarui di belakang layar (stale-while-revalidate).
    //    Tanpa cache (kunjungan pertama): jaringan dengan batas waktu, lalu offline.html
    var cached = await cache.match(req, { ignoreSearch: true });
    if (cached) { revalidate(event, cache, req, true, true); return cached; }
    try {
      var r = await withTimeout(fetch(req), NAV_TIMEOUT);
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    } catch (err) {
      if (req.mode === 'navigate') {
        var off = await cache.match('./offline.html');
        if (off) return off;
      }
      return offlineResp(req);
    }
  })());
});

/* ---- Cek pembaruan atas permintaan halaman ---- */
async function sha(buf) {
  var d = await crypto.subtle.digest('SHA-1', buf);
  return Array.prototype.map.call(new Uint8Array(d), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}
var cekUpdateAktif = null;
function cekUpdate() {
  // Beberapa tab/halaman dapat meminta pemeriksaan pada waktu berdekatan.
  // Gunakan satu pemeriksaan bersama agar tidak mengunduh dan membandingkan index berulang.
  if (cekUpdateAktif) return cekUpdateAktif;
  cekUpdateAktif = (async function () {
    var cache = await caches.open(CACHE);
    var key = new Request(new URL('./index.html', self.registration.scope).href);
    var r = await fresh(key); if (!r.ok) return false;
    var baru = await r.clone().arrayBuffer();
    var lama = await cache.match(key);
    var beda = true;
    if (lama) beda = (await sha(await lama.arrayBuffer())) !== (await sha(baru));
    await cache.put(key, r);
    if (beda && lama) {                                      // versi baru: segarkan semua berkas inti agar siap saat muat ulang
      await Promise.all(CORE.map(function (u) { return warm(cache, u); }));
    }
    return beda && !!lama;
  })();
  return cekUpdateAktif.then(function (hasil) {
    cekUpdateAktif = null;
    return hasil;
  }, function (err) {
    cekUpdateAktif = null;
    throw err;
  });
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
      badge: 'icons/badge-96.png',
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
