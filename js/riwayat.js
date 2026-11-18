/* js/riwayat.js — halaman Riwayat: daftar transaksi + filter Tanggal / Layanan / Metode (daftar diisi dari server lewat GPRiwayat.set). */
(function(){
'use strict';
/* ============================================================================
   DAFTAR TRANSAKSI — terhubung ke tabel history (Supabase), realtime
   ----------------------------------------------------------------------------
   Tampilan hanya menerima array objek berikut (urutan bebas, diurutkan di sini):
     {
       id:       "trx-001",                 // opsional
       tanggal:  "2026-11-17T09:41:00+07:00", // ISO 8601
       jenis:    "transfer" | "bayar_teman" | "rekan_usaha" | "topup" | "tarik_tunai" | "tagihan" | "cashback",
       judul:    "Ditransfer ke Nurhasanah",  // "\n" = pindah baris
       subjudul: "Mandiri 1200015285971",     // opsional (nomor rekening, "Berhasil", "Hangus", ...)
       nominal:  300000,                      // angka positif, tanpa format
       satuan:   "rp" | "coins",              // default "rp"
       arah:     "keluar" | "masuk",          // masuk = hijau, tanpa tanda minus
       metode:   ["saldo"] | ["coins"] | ["saldo","coins"],
       status:   "berhasil" | "gagal"         // gagal = baris abu-abu, subjudul merah
     }
   Cara pakai: GPRiwayat.set(items) | GPRiwayat.loading() | GPRiwayat.error("pesan")
   Sumber data: fungsi ambil() di bawah (tabel history) + channel realtime "riwayat-history".
   ========================================================================== */
var BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
var BLNS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
var IKON={transfer:"up",bayar_teman:"us",rekan_usaha:"st",topup:"pl",tarik_tunai:"dn",tagihan:"bl",cashback:"cb"};
var listEl=document.getElementById("list");

function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function ribuan(n){return String(Math.round(Math.abs(+n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,".")}
function nominal(x){
 var n=+x.nominal||0,masuk=x.arah==="masuk";
 if(x.satuan==="coins") return (masuk?"":"-")+ribuan(n);      // Coins: angka saja, tanpa "Rp"
 return (masuk?"":"-")+"Rp"+ribuan(n);                         // masuk tanpa tanda, keluar berawalan minus
}
function juta(n){return n>=1e6?"Rp"+(n/1e6).toFixed(2)+"jt":"Rp"+ribuan(n)}
function kunci(d){return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate()}
function tglPanjang(d){return d.getDate()+" "+BLNS[d.getMonth()]+" "+d.getFullYear()}
function dot(k){return '<span class="dot"><svg><use href="#'+(k==="coins"?"cn":"wl")+'"/></svg></span>'}

function baris(x){
 var gagal=x.status==="gagal",masuk=x.arah==="masuk";
 var ik=IKON[x.jenis]||"st";
 var met=(x.metode&&x.metode.length?x.metode:["saldo"]).map(function(m){
  return '<div class="m">GoPay '+(m==="coins"?"Coins":"Saldo")+' '+dot(m)+'</div>'}).join("");
 return '<div class="row'+(gagal?' x':'')+'"><span class="ic"><svg><use href="#'+ik+'"/></svg></span>'+
  '<div class="t">'+esc(x.judul).replace(/\n/g,"<br>")+(x.subjudul?'<em>'+esc(x.subjudul)+'</em>':'')+'</div>'+
  '<div class="r"><div class="a'+(masuk&&!gagal?' g':'')+'">'+esc(nominal(x))+'</div>'+met+'</div></div>';
}

function ringkasan(items){
 var now=new Date(),out=0,inn=0;
 items.forEach(function(x){
  if(x.status==="gagal"||x.satuan==="coins"||!x._d) return;
  if(x._d.getMonth()!==now.getMonth()||x._d.getFullYear()!==now.getFullYear()) return;
  if(x.arah==="masuk") inn+=+x.nominal||0; else out+=+x.nominal||0;
 });
 var b=document.getElementById("sumBln"),o=document.getElementById("sumOut"),i=document.getElementById("sumIn");
 if(b) b.textContent=BLN[now.getMonth()]+" "+now.getFullYear();
 if(o) o.textContent="-"+juta(out);
 if(i) i.textContent=juta(inn);
}

function info(teks,cls){listEl.innerHTML='<div class="empty'+(cls?' '+cls:'')+'">'+teks+'</div>'}

var GPRiwayat=window.GPRiwayat={
 loading:function(){info('<i class="spin"></i>Memuat riwayat transaksi\u2026')},
 error:function(msg){info('<b>Riwayat gagal dimuat</b>'+esc(msg||"Periksa koneksi lalu coba lagi."),'err')},
 set:function(data){
  var items=(data||[]).map(function(x){var d=new Date(x.tanggal);x._d=isNaN(d)?null:d;return x})
   .filter(function(x){return x._d}).sort(function(a,b){return b._d-a._d});
  ringkasan(items);
  if(!items.length){info('<b>Belum ada transaksi</b>Transaksi kamu akan muncul di sini.');return}
  var now=new Date(),kemarin=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  var grup=[],idx={};
  items.forEach(function(x){
   var k=kunci(x._d);
   if(!(k in idx)){idx[k]=grup.length;grup.push({d:x._d,r:[]})}
   grup[idx[k]].r.push(x);
  });
  var h="";
  grup.forEach(function(g){
   var rel=kunci(g.d)===kunci(now)?"Hari ini":kunci(g.d)===kunci(kemarin)?"Kemarin":"";
   h+='<section class="grp"><div class="gh">'+(rel||tglPanjang(g.d))+(rel?'<span>'+tglPanjang(g.d)+'</span>':'')+'</div>'+g.r.map(baris).join("")+'</section>';
  });
  listEl.innerHTML=h;
 }
};

/* ---- Terhubung ke tabel history (Supabase) ----
   Kolom history -> item tampilan: terjadi_pada -> tanggal, sisanya bernama sama.
   Realtime: INSERT/UPDATE/DELETE di history langsung memperbarui daftar (tanpa muat ulang).
   Cadangan: muat ulang penuh saat channel (re)connect, halaman kembali terlihat, online lagi, tarik-untuk-segarkan,
   dan tiap 20 dtk selama channel realtime belum tersambung. */
var KOLOM="id,gx_id,terjadi_pada,jenis,judul,subjudul,nominal,satuan,arah,metode,status",BATAS=300;
var peta={},ws=null,rt=0,live=false,tunggu=null;
function ubah(r){
 return {id:"h"+r.id,tanggal:r.terjadi_pada,jenis:r.jenis,judul:r.judul,subjudul:r.subjudul,
  nominal:r.nominal,satuan:r.satuan,arah:r.arah,metode:r.metode,status:r.status};
}
function gambar(){
 if(rt) return;
 rt=requestAnimationFrame(function(){rt=0;GPRiwayat.set(Object.keys(peta).map(function(k){return peta[k]}))});
}
function ambil(){
 var sb=GP.sb();
 if(!sb) return Promise.reject(new Error("Library Supabase gagal dimuat"));
 return sb.from("history").select(KOLOM).order("terjadi_pada",{ascending:false}).limit(BATAS).then(function(r){
  if(r.error) throw r.error;
  return (r.data||[]).map(ubah);
 });
}
function muat(diam){
 if(!diam&&!Object.keys(peta).length) GPRiwayat.loading();
 return ambil().then(function(items){
  peta={}; items.forEach(function(x){peta[x.id]=x});
  gambar();
 }).catch(function(e){
  if(!Object.keys(peta).length) GPRiwayat.error(e&&e.message);   // data lama tetap tampil bila muat ulang diam-diam gagal
 });
}
function sambungRealtime(){
 var sb=GP.sb(); if(!sb||ws) return;
 ws=sb.channel("riwayat-history")
  .on("postgres_changes",{event:"*",schema:"public",table:"history"},function(p){
   if(p.eventType==="DELETE"){ if(p.old&&p.old.id!=null) delete peta["h"+p.old.id]; gambar(); return; }
   var r=p.new; if(!r||r.id==null||!r.terjadi_pada) return muat(true);
   peta["h"+r.id]=ubah(r); gambar();
  })
  .subscribe(function(st){
   live=(st==="SUBSCRIBED");
   if(live) muat(true);   // sinkron ulang: kejadian saat terputus ikut terambil
  });
}
muat();
sambungRealtime();
GPRiwayat.muat=muat;
document.addEventListener("visibilitychange",function(){ if(!document.hidden) muat(true); });
window.addEventListener("online",function(){ muat(true); });
window.addEventListener("gp:refresh",function(){ muat(true); });
setInterval(function(){ if(!document.hidden&&!live) muat(true); },20000);


var S=[
["Ke rekan usaha","st",1],["Bayar ke teman","us",1],["Top up","pl",1],["Transfer","up",1],
["Tarik tunai","dn",1],["GoTagihan","bl"],
["GoFood",'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" stroke="#f0303c" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="17" cy="8" rx="3.500" ry="5.500" fill="#f0303c"/><path d="M17 12v9" stroke="#f0303c" stroke-width="2.200" stroke-linecap="round"/>'],
["GoShop",'<rect x="4" y="8" width="16" height="13" rx="3" fill="#f0303c"/><path d="M8.500 11V7a3.500 3.500 0 0 1 7 0v4" stroke="#f0303c" stroke-width="2" fill="none"/><circle cx="9" cy="12.500" r="1.100" fill="#252a2f"/><circle cx="15" cy="12.500" r="1.100" fill="#252a2f"/>'],
["GoMart",'<path d="M3 10h18l-2 10H5z" fill="#f0303c"/><path d="M8 10l3-6M16 10l-3-6" stroke="#f0303c" stroke-width="2" stroke-linecap="round"/><path d="M9 13v4M12 13v4M15 13v4" stroke="#252a2f" stroke-width="1.500"/>'],
["GoRide",'<circle cx="6" cy="17" r="3.500" fill="#12a312"/><circle cx="18" cy="17" r="3" fill="#12a312"/><path d="M5 12h8l3 3.500h3M13 12l-1-6h3M9 8h3" stroke="#12a312" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
["GoCar",'<path d="M2.500 16v-3l2.500-4.500a2 2 0 0 1 1.800-1h10.400a2 2 0 0 1 1.800 1L21.500 13v3z" fill="#12a312"/><circle cx="7" cy="17" r="2.500" fill="#12a312" stroke="#252a2f" stroke-width="1.200"/><circle cx="17" cy="17" r="2.500" fill="#12a312" stroke="#252a2f" stroke-width="1.200"/><path d="M6 12.500l1.200-2.500h9.600l1.200 2.500z" fill="#252a2f"/>'],
["GoBluebird",'<path d="M2.500 16v-3l2.500-4.500a2 2 0 0 1 1.800-1h10.400a2 2 0 0 1 1.800 1L21.500 13v3z" fill="#1565d8"/><circle cx="7" cy="17" r="2.500" fill="#1565d8" stroke="#252a2f" stroke-width="1.200"/><circle cx="17" cy="17" r="2.500" fill="#1565d8" stroke="#252a2f" stroke-width="1.200"/><path d="M6 12.500l1.200-2.500h9.600l1.200 2.500z" fill="#252a2f"/><rect x="10" y="4" width="4" height="2.500" rx=".6" fill="#1565d8"/>'],
["GoTransit",'<rect x="5" y="3" width="14" height="14" rx="3" fill="none" stroke="#12a312" stroke-width="2.200"/><rect x="7" y="6" width="10" height="5" fill="#12a312"/><path d="M5 21h14M9 17l-1.500 3M15 17l1.500 3" stroke="#12a312" stroke-width="2" stroke-linecap="round"/>'],
["GoSend",'<path d="M12 2.500l8.500 4.500v10L12 21.500 3.500 17V7z" fill="#12a312"/><path d="M12 11l4-2M12 11L8 9M12 11v6" stroke="#252a2f" stroke-width="1.500"/>'],
["GoBox",'<path d="M2 6h12v9H2zM14 9h4.500l3 3.500V15H14z" fill="#12a312"/><circle cx="7" cy="17" r="2.300" fill="#12a312" stroke="#252a2f" stroke-width="1.200"/><circle cx="17.500" cy="17" r="2.300" fill="#12a312" stroke="#252a2f" stroke-width="1.200"/>'],
["Tokopedia",'<path d="M5 6h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#3a9b3a"/><path d="M8.500 6a3.500 3.500 0 0 1 7 0" stroke="#3a9b3a" stroke-width="1.800" fill="none"/><circle cx="9.500" cy="12" r="2.600" fill="#fff"/><circle cx="14.500" cy="12" r="2.600" fill="#fff"/><circle cx="9.500" cy="12" r="1.100" fill="#222"/><circle cx="14.500" cy="12" r="1.100" fill="#222"/><path d="M10.500 15l1.500 2 1.500-2z" fill="#f5c400"/>'],
["Parkir",'<rect x="3" y="3" width="18" height="18" rx="5" fill="#00b0db"/><path d="M9.500 18V6.500h3.200a3.300 3.300 0 0 1 0 6.600H9.500" stroke="#1a5668" stroke-width="2.400" fill="none"/>',1],
["Split Bill",'<rect x="4" y="4" width="16" height="16" rx="4" fill="#12a312" opacity=".55"/><path d="M12 18v-4M12 14l-3.500-3.500V7M12 14l3.500-3.500V7" stroke="#0b3d12" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>','g'],
["Lainnya",'<path d="M10.500 5H4.500v6M4.500 5l6.500 6.500M13.500 19h6v-6M19.500 19l-6.500-6.500" stroke="#8b9096" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>']
];
var g="";
S.forEach(function(s,i){
 var inner=s[1].charAt(0)=="<"?s[1]:'<use href="#'+s[1]+'"/>';
 var c=s[2]===1?' c':'';
 var st=s[2]==='g'?' style="background:#22412d;border-color:#2a4d37"':'';
 g+='<button class="sv" data-v="'+s[0]+'"><i class="'+c.trim()+'"'+st+'><svg viewBox="0 0 24 24">'+inner+'</svg></i>'+s[0]+'</button>';
});
document.getElementById("grid").innerHTML=g;
/* sheet: baris pertama grid sudah tergulir seperti pada screenshot */
var sc=document.getElementById("scrim"),cur=null;
function show(k){
 ["sd","sl","sm"].forEach(function(i){document.getElementById(i).classList.remove("on")});
 cur=k;sc.classList.toggle("on",!!k);
 if(k){var e=document.getElementById("s"+k);e.classList.add("on");if(k=="l")document.getElementById("grid").scrollTop=19.5}
}
document.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){show(c.dataset.s)}});
sc.onclick=function(){show(null)};
document.querySelectorAll("#dopts .opt").forEach(function(o){o.onclick=function(){
 var was=o.classList.contains("on");
 document.querySelectorAll("#dopts .opt").forEach(function(x){x.classList.remove("on")});
 if(!was)o.classList.add("on");sync()}});
document.querySelectorAll(".sv").forEach(function(o){o.onclick=function(){o.classList.toggle("on");sync()}});
document.querySelectorAll(".mo").forEach(function(o){o.onclick=function(){o.classList.toggle("on");sync()}});
document.querySelectorAll(".clr").forEach(function(b){b.onclick=function(){
 b.closest(".sheet").querySelectorAll(".on").forEach(function(x){x.classList.remove("on")});sync()}});
document.querySelectorAll(".ok").forEach(function(b){b.onclick=function(){show(null)}});
function sync(){
 var q=document.querySelectorAll(".chip");
 [["#sd .opt.on",0],["#sl .sv.on",1],["#sm .mo.on",2]].forEach(function(p){
  q[p[1]].classList.toggle("on",document.querySelectorAll(p[0]).length>0)});
 document.querySelectorAll(".clr").forEach(function(b){b.classList.toggle("on",b.closest(".sheet").querySelector(".on:not(.sheet)")!==null)});
}
})();
