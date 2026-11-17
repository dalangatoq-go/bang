# GoPay PWA

Aplikasi statis (tanpa build). Seluruh path relatif, jadi bisa di-deploy di root domain maupun subfolder.

## Struktur

```
index.html  keuangan.html  riwayat.html  profil.html     # 4 tab (nav bawah saling terhubung)
topup.html  pengaturan.html                              # halaman turunan (tombol kembali = riwayat browser)
manifest.webmanifest  icons/                             # identitas PWA
sw.js  update.js                                         # service worker + pembaruan otomatis
push.js  mynotification.mp3                              # notifikasi push (aktifkanNotifikasi())
js/install.js  css/install.css                           # popup "Pasang GoPay"
css/riwayat.css  js/riwayat.js  assets/fonts/            # tab Riwayat (daftar transaksi, filter Tanggal/Layanan/Metode) + font Inter & Lora
js/config.js                                             # URL + anon key Supabase
vercel.json                                              # header cache sw.js & manifest
```

## Deploy

Vercel: impor repo, Framework Preset **Other**, kosongkan Build Command dan Output Directory. Atau `vercel --prod`.
PWA hanya bisa dipasang lewat **HTTPS** (Vercel sudah HTTPS; `localhost` juga boleh untuk uji coba).

## Popup pasang aplikasi

| Perangkat | Perilaku |
|---|---|
| Android, Windows, Mac (Chrome, Edge, Samsung Internet) | Tombol **Pasang** membuka dialog instal bawaan browser. |
| iPhone / iPad | Menampilkan langkah Bagikan > Tambah ke Layar Utama (iOS tidak punya dialog instal). |
| Browser lain (mis. Firefox) | Tidak ada popup, karena browser tidak menyediakan instal PWA. |

Tidak muncul bila: dibuka dari aplikasi terpasang, browser tidak menawarkan instal (aplikasi sudah terpasang),
ditutup dalam 3 hari terakhir, atau di iOS pengguna menekan **Sudah terpasang**.
Reset untuk uji coba: jalankan `GPInstall.reset()` di konsol lalu muat ulang.

## Mengganti ikon

Ganti berkas di `icons/` dengan nama dan ukuran yang sama: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
(isi di tengah 80%), `apple-touch-icon.png` (180x180, tanpa transparansi), `favicon-32.png`.
