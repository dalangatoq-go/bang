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
css/riwayat.css  js/riwayat.js  assets/fonts/            # tab Riwayat (daftar kosong siap server, filter Tanggal/Layanan/Metode) + font Inter & Lora
css/keuangan.css                                         # tab Keuangan (kartu sumber dana bertumpuk, simpanan, pinjaman, akun penerima)
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

## Riwayat: antarmuka data

Daftar transaksi tidak lagi berisi data contoh. `js/riwayat.js` menyediakan `GPRiwayat.set(items)`, `GPRiwayat.loading()`,
`GPRiwayat.error(pesan)` dan `GPRiwayat.muat()`. Titik sambung ke server adalah fungsi `ambil()` (saat ini mengembalikan daftar kosong).
Format item (nominal angka positif, teks dari server di-escape otomatis, `\n` pada judul = pindah baris):

```
{ tanggal:"2026-11-17T09:41:00+07:00", jenis:"topup", judul:"GoPay Top Up", subjudul:"", nominal:980000,
  satuan:"rp"|"coins", arah:"masuk"|"keluar", metode:["saldo"]|["coins"]|["saldo","coins"], status:"berhasil"|"gagal" }
```
`jenis`: transfer, bayar_teman, rekan_usaha, topup, tarik_tunai, tagihan, cashback (menentukan ikon).
Ringkasan bulan di header dihitung dari item bulan berjalan (hanya Rupiah, status berhasil).

## Notifikasi push (alur Gx > history)

Sumber notifikasi hanya tabel `history` di Supabase. Setiap baris history baru yang berasal dari aksi Gx (`gx_id` terisi)
memicu trigger `history_notifikasi_push`, yang memanggil edge function `kirim-push` dengan judul "GoPay" dan satu baris pesan:

| Layanan | Pesan |
|---|---|
| Top up | Top up successful. Rp300.000 added to GoPay. |
| Bayar ke teman (masuk) | You have received Rp49.000 on GoPay. |
| Bayar ke teman (keluar) | You have paid Rp49.000 from GoPay. |

Teks dibuat oleh fungsi SQL `history_pesan_notifikasi(history)`; ubah di sana untuk mengganti kalimat.
Tabel `notifikasi_teks` tidak lagi dipakai. Perangkat mendaftar lewat `aktifkanNotifikasi()` (push.js) dari klik tombol.

### Suara notifikasi

`mynotification.mp3` dibunyikan oleh `update.js` setiap push masuk **saat aplikasi sedang terbuka** (sw.js mengirim pesan `PUSH_SOUND`
ke halaman yang terlihat, lalu notifikasi sistem dibisukan agar tidak dobel). Pengguna perlu menyentuh layar sekali setelah aplikasi dibuka
agar browser mengizinkan audio. Saat aplikasi **tertutup**, web push tidak mendukung suara kustom: yang berbunyi adalah suara notifikasi
bawaan perangkat. Suara kustom di kondisi tertutup hanya bisa lewat aplikasi native.

## Riwayat terhubung ke Supabase (tabel `history`)

`js/riwayat.js` membaca `history` (300 baris terbaru, urut `terjadi_pada` menurun; `terjadi_pada` dipetakan ke `tanggal`) dan
berlangganan Supabase Realtime (`riwayat-history`): INSERT/UPDATE/DELETE langsung mengubah daftar tanpa muat ulang. Muat ulang penuh
otomatis saat channel tersambung/tersambung ulang, halaman kembali terlihat, online lagi, tarik-untuk-segarkan, dan tiap 20 dtk bila realtime belum tersambung.
Semua halaman kini memuat supabase-js + `js/config.js` dan memakai **satu** klien (`window.__sb`, dibagi dengan `push.js`).

## Notifikasi realtime di dalam aplikasi (`js/notif.js`)

Dimuat di semua halaman. Setiap INSERT di `history` dengan `gx_id` terisi (sama dengan trigger server) langsung menampilkan banner di atas layar
dan membunyikan `mynotification.mp3` lewat `window.GPBunyi` (update.js). Teks pesan identik dengan SQL `history_pesan_notifikasi`.
Web push dari `sw.js` memakai jalur yang sama (pesan `PUSH_SOUND` kini membawa `id`, `title`, `body`); keduanya dideduplikasi per id history,
sehingga satu transaksi = satu banner + satu bunyi, dan notifikasi sistem yang sudah dibisukan ditutup otomatis bila banner sudah tampil.
Ketuk banner untuk membuka Riwayat. Banner "Aktifkan notifikasi" muncul sekali (bisa ditunda 3 hari) dan memanggil `aktifkanNotifikasi()` dari ketukan pengguna;
tanpa langkah ini tabel `push_perangkat` tetap kosong dan web push tidak pernah terkirim.

## Area aman (bilah navigasi / gesture perangkat)

Semua halaman memakai `viewport-fit=cover`; `js/core.js` mengisi `--safe-b` (= `env(safe-area-inset-bottom)` dibagi skala) pada `#ui`.
Aturan: elemen yang menempel di tepi bawah (nav, toast, banner, bottom sheet, tombol) wajib memakai `var(--safe-b)`, dan halaman yang bisa
di-scroll wajib punya `padding-bottom` yang menyertakan `--safe-b` agar item terakhir tidak tertutup nav aplikasi maupun bilah sistem.
Batas geser banner Beranda memakai tinggi `.nav` sebenarnya (bukan angka tetap).
