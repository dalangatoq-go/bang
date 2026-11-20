/* topup.js — halaman Top up (tombol kembali memakai riwayat browser) */
(function(){
const G=document.getElementById('tp-glow'),SC=document.getElementById('tp-sc'),TP=document.getElementById('tp'),PR=document.getElementById('tp-probe');

const A={"indomaret": "assets/img/tp-indomaret.webp", "alfamart": "assets/img/tp-alfamart.webp", "alfamidi": "assets/img/tp-alfamidi.webp", "lawson": "assets/img/tp-lawson.webp", "jago": "assets/img/tp-jago.webp", "oneklik": "assets/img/tp-oneklik.webp", "bridd": "assets/img/tp-bridd.webp", "visa": "assets/img/tp-visa.webp", "dana": "assets/img/tp-dana.webp", "shopeepay": "assets/img/tp-shopeepay.webp", "pandaremit": "assets/img/tp-pandaremit.webp", "bca": "assets/img/tp-bca.webp", "bni": "assets/img/tp-bni.webp", "mandiri": "assets/img/tp-mandiri.webp", "bri": "assets/img/tp-bri.webp", "badge": "assets/img/tp-badge.webp"};
const FB={Permata:['PBK','#7ab800'],CIMB:['CIMB','#a6192e'],BSI:['BSI','#00a79d'],Danamon:['DMN','#f39200'],Pos:['POS','#f26522']};
const lg=k=>A[k]?`<img alt="" src="${A[k]}">`:`<div class="tp-fb" style="background:${FB[k][1]}">${FB[k][0]}</div>`;
// [logo,label,tag]
const S=[
{id:'va',title:'Virtual account sekali pakai',sub:'Gratis biaya admin buat semua bank',o:1,pill:'5x top up gratis',items:[['bca','BCA VA'],['bni','BNI VA'],['mandiri','Mandiri VA'],['bri','BRI VA']],more:[['Permata','Permata VA'],['CIMB','CIMB VA'],['BSI','BSI VA'],['Danamon','Danamon VA']],free:1},
{id:'bank',title:'Top up dari bank',sub:'Biaya admin Rp0-Rp2.000',items:[['bca','BCA'],['bni','BNI'],['mandiri','Mandiri'],['bri','BRI']],more:[['Permata','Permata'],['CIMB','CIMB Niaga'],['BSI','BSI'],['Danamon','Danamon']]},
{id:'cash',title:'Setor tunai',sub:'Biaya admin Rp0-Rp2.000',items:[['indomaret','Indomaret','Gratis'],['alfamart','Alfamart','Gratis'],['alfamidi','Alfamidi','Gratis'],['lawson','Lawson']],more:[['Pos','Kantor Pos']]},
{id:'dd',title:'Direct debit',sub:'Hubungkan kartu debitmu dan top up dari app GoPay',items:[['jago','Jago Pockets','Gratis'],['oneklik','BCA OneKlik','Gratis'],['bridd','BRI Direct Debit','Gratis'],['visa','VISA debit card','Gratis']],more:[['mandiri','Mandiri Direct Debit','Gratis']]},
{id:'ew',title:'Top up dari e-wallet',sub:'Admin GoPay Rp1.000 + admin e-wallet',items:[['dana','DANA'],['shopeepay','ShopeePay'],['pandaremit','Panda Remit','BARU']],more:[]}];
const opn={};let chip='all',term='';
const item=i=>`<div class="tp-it" onclick="__tp.t('${i[1]}')">${i[2]?`<div class="tp-tg">${i[2]}</div>`:''}<div class="tp-box">${lg(i[0])}</div>${i[0]=='jago'?`<span style="white-space:nowrap;letter-spacing:-.03em">${i[1]}</span>`:i[1]}</div>`;
document.getElementById('tp-rec').innerHTML=[['indomaret','Indomaret','Mulai dari Rp0'],['bca','BCA VA','Gratis biaya admin!'],['bni','BNI VA','Gratis biaya admin!']].map(r=>`<div class="tp-ri" onclick="__tp.t('${r[1]}')"><div class="tp-tg">Gratis</div><img alt="" src="${A[r[0]]}"><b>${r[1]}</b>${r[2][0]=='M'?`<s>${r[2]}</s>`:`<em>${r[2]}</em>`}</div>`).join('');
const C=[['all','Semua metode'],['free','Gratis admin','b'],['va','Virtual account'],['bank','Transfer bank'],['cash','Setor tunai'],['dd','Direct debit'],['ew','E-wallet']];
function chips(){document.getElementById('tp-chips').innerHTML=C.map(c=>`<button class="tp-chip tp-${chip==c[0]?'on':''}" onclick="__tp.chip('${c[0]}')">${c[1]}${c[2]?`<img alt="" src="${A.badge}">`:''}</button>`).join('')}
const chev='<svg style="width:calc(var(--u)*26);height:calc(var(--u)*26)" viewBox="0 0 22 22" fill="none" stroke="#cfd3d6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l7 7 7-7"/></svg>';
function render(){let h='';
 S.forEach(s=>{if(chip!='all'&&chip!='free'&&chip!=s.id)return;
  let all=[...s.items,...(opn[s.id]?s.more:[])];
  if(chip=='free')all=all.filter(i=>i[2]=='Gratis'||s.id=='va');
  if(term)all=[...s.items,...s.more].filter(i=>i[1].toLowerCase().includes(term));
  if(!all.length)return;
  h+=`<div class="tp-sec"><div class="tp-sh"><div><b>${s.title}</b><small class="tp-${s.o?'o':''}">${s.sub}</small></div>${s.pill?`<span class="tp-pill">${s.pill}</span>`:''}</div><div class="tp-grid">${all.map(item).join('')}</div>${s.more.length&&!term&&chip!='free'?`<button class="tp-more" onclick="__tp.tog('${s.id}')">${opn[s.id]?'Lihat lebih sedikit':'Lihat lebih banyak'} ${chev}</button>`:''}</div>`});
 document.getElementById('tp-list').innerHTML=h||'<div class="tp-empty">Metode tidak ditemukan</div>'}
document.getElementById('tp-q').addEventListener('input',e=>{term=e.target.value.trim().toLowerCase();render()});
function t(){} /* pesan "belum terhubung ke server" dihapus */


function glow(){const u=PR.getBoundingClientRect().width/100||.5,sh=document.querySelector('#tp .tp-shh');if(!sh)return;
 const rel=sh.getBoundingClientRect().top-SC.getBoundingClientRect().top;
 G.style.setProperty('--o',Math.min(1,Math.max(0,(330*u-rel)/(225*u))));}
SC.addEventListener('scroll',glow,{passive:true});
function openTp(){chip='all';term='';for(const k in opn)delete opn[k];document.getElementById('tp-q').value='';chips();render();SC.scrollTop=0;TP.classList.add('tp-on');TP.setAttribute('aria-hidden','false');glow();}
function closeTp(){GP.back('index.html');}
window.__tp={t:t,chip:function(c){chip=c;chips();render()},tog:function(id){opn[id]=!opn[id];render()},close:closeTp,open:openTp};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&TP.classList.contains('tp-on'))closeTp();});
chips();render();glow();
})();
