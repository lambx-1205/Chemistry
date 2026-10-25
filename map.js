(() => {
"use strict";
const data=window.OrganicAtlasData;
const $=id=>document.getElementById(id);
const search=$("map-search"),status=$("map-search-status"),canvas=$("map-canvas"),layer=$("map-node-layer"),loading=$("map-loading"),count=$("map-count");
const compounds=data?.compounds||[],edges=(data?.edges||[]).filter(e=>e&&e.from&&e.to);
const byId=Object.create(null),names=Object.create(null);
compounds.forEach(c=>{byId[c.id]=c;[c.id,c.name,c.englishName,c.pubchemName,...(c.aliases||[])].forEach(n=>{if(n)names[String(n).toLocaleLowerCase()]=c;});});
let currentId=null;
const dirs=[
 {name:"北西",out:"↖",in:"↘",pos:"nw"},{name:"北",out:"↑",in:"↓",pos:"n"},
 {name:"北東",out:"↗",in:"↙",pos:"ne"},{name:"西",out:"←",in:"→",pos:"w"},
 {name:"東",out:"→",in:"←",pos:"e"},{name:"南西",out:"↙",in:"↗",pos:"sw"},
 {name:"南",out:"↓",in:"↑",pos:"s"},{name:"南東",out:"↘",in:"↖",pos:"se"}
];
function esc(s){return String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));}
function formula(s){return esc(s||"—").replace(/([0-9]+)/g,"<sub>$1</sub>");}
function render(id){
 const c=byId[id];if(!c)return;
 currentId=id;search.value=c.name;status.textContent="";
 const related=edges.filter(e=>e.from===id||e.to===id).map(e=>({edge:e,incoming:e.to===id,neighbor:byId[e.to===id?e.from:e.to]})).filter(x=>x.neighbor);
 const chosen=related.slice(0,8);
 const slots=Array(9).fill("");
 chosen.forEach((r,i)=>{
  const d=dirs[i],edge=r.edge,arrow=r.incoming?d.in:d.out;
  const direction=r.incoming?"この化合物が生成物："+r.neighbor.name+"から生成":"この化合物が反応物："+r.neighbor.name+"へ変化";
  slots[["nw","n","ne","w","e","sw","s","se"].indexOf(d.pos)]=
   '<button type="button" class="single-reaction-arrow '+(r.incoming?"incoming":"outgoing")+'" data-neighbor="'+esc(r.neighbor.id)+'" title="'+esc(direction+"｜"+(edge.condition||"条件未登録"))+'">'+
   '<span class="arrow-glyph" aria-hidden="true">'+arrow+'</span><span class="arrow-reaction-name">'+esc(edge.name||edge.label||"反応")+'</span>'+
   '<span class="arrow-neighbor-name">'+esc(r.neighbor.name)+'</span></button>';
 });
 const center='<article class="single-center-compound"><span class="single-center-kicker">CURRENT COMPOUND</span><div class="single-center-family">'+esc(c.family||"分類未登録")+'</div><h2>'+esc(c.name)+'</h2><div class="single-center-formula">'+formula(c.formula)+'</div><p>'+esc(c.desc||c.hint||"登録済み化合物")+'</p><a href="compounds.html?compound='+encodeURIComponent(c.id)+'">化合物の詳細を見る ↗</a></article>';
 const slot=(pos)=>{const ix=["nw","n","ne","w","center","e","sw","s","se"].indexOf(pos);return pos==="center"?center:(slots[ix]||'<div class="single-empty-slot" aria-hidden="true"></div>');};
 layer.innerHTML='<div class="single-reaction-grid">'+
 '<div class="single-slot nw">'+slot("nw")+'</div><div class="single-slot n">'+slot("n")+'</div><div class="single-slot ne">'+slot("ne")+'</div>'+
 '<div class="single-slot w">'+slot("w")+'</div><div class="single-slot center">'+center+'</div><div class="single-slot e">'+slot("e")+'</div>'+
 '<div class="single-slot sw">'+slot("sw")+'</div><div class="single-slot s">'+slot("s")+'</div><div class="single-slot se">'+slot("se")+'</div></div>'+
 (related.length>8?'<section class="single-overflow"><h3>ほかの反応（'+(related.length-8)+'件）</h3><div>'+related.slice(8).map(r=>'<button type="button" class="single-overflow-link '+(r.incoming?"incoming":"outgoing")+'" data-neighbor="'+esc(r.neighbor.id)+'"><span aria-hidden="true">'+(r.incoming?"←":"→")+'</span><strong>'+esc(r.edge.name||r.edge.label||"反応")+'</strong><small>'+esc(r.neighbor.name)+'</small></button>').join("")+'</div></section>':"");
 canvas.hidden=false;loading.hidden=true;count.textContent=c.name+" · "+related.length+"件の反応";
 layer.querySelectorAll("[data-neighbor]").forEach(b=>b.addEventListener("click",()=>render(b.dataset.neighbor)));
}
function searchCompound(){
 const q=search.value.trim().toLocaleLowerCase();if(!q){status.textContent="化合物名を入力してください。";return;}
 const c=names[q]||compounds.find(x=>String(x.name||"").toLocaleLowerCase().includes(q)||(x.aliases||[]).some(a=>String(a).toLocaleLowerCase().includes(q)));
 if(!c){status.textContent="登録された化合物が見つかりません。";return;}render(c.id);
}
function init(){
 const dl=$("map-compound-options");compounds.forEach(c=>{const o=document.createElement("option");o.value=c.name;dl?.appendChild(o);});
 $("map-search-button")?.addEventListener("click",searchCompound);search?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchCompound();}});
 const params=new URLSearchParams(location.search),requested=params.get("compound");
 render(byId[requested]?requested:(byId["ethanol"]?"ethanol":compounds[0]?.id));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();