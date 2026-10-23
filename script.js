(function(){
"use strict";
var compounds = [
{id:"ethane",name:"エタン",formula:"C₂H₆",family:"炭化水素",kind:"aliphatic",color:"#7b9fa8",desc:"アルカンに属する飽和炭化水素。置換反応によってハロゲン化アルキルへつながる。",state:"気体",feature:"置換反応",hint:"炭素間の単結合のみ"},
{id:"chloroethane",name:"クロロエタン",formula:"C₂H₅Cl",family:"ハロゲン化合物",kind:"aliphatic",color:"#d1a15b",desc:"ハロゲン化アルキルの一種。水酸化ナトリウム水溶液などとの反応でアルコールへ変換できる。",state:"常温で気体に近い揮発性物質",feature:"加水分解・置換",hint:"C–Cl結合をもつ"},
{id:"ethanol",name:"エタノール",formula:"C₂H₆O",family:"アルコール",kind:"aliphatic",color:"#5f9c72",desc:"代表的な第一級アルコール。脱水でエテンに、酸化でアセトアルデヒドを経て酢酸へつながる。",state:"常温で液体",feature:"脱水・酸化",hint:"ヒドロキシ基 −OH"},
{id:"ethene",name:"エテン",formula:"C₂H₄",family:"アルケン",kind:"aliphatic",color:"#6499ad",desc:"二重結合をもつ不飽和炭化水素。付加反応、水和、付加重合などの出発物質になる。",state:"気体",feature:"付加・重合",hint:"炭素間の二重結合"},
{id:"dibromoethane",name:"1,2-ジブロモエタン",formula:"C₂H₄Br₂",family:"ハロゲン化合物",kind:"aliphatic",color:"#d1a15b",desc:"エテンの二重結合に臭素が付加してできる化合物。付加反応の代表例として扱う。",state:"常温で液体",feature:"付加反応",hint:"隣接する炭素にBr"},
{id:"polyethylene",name:"ポリエチレン",formula:"(C₂H₄)ₙ",family:"高分子化合物",kind:"aliphatic",color:"#8799a9",desc:"エテンを付加重合して得られる合成高分子。小さな分子が繰り返し単位をつくる。",state:"固体",feature:"付加重合",hint:"繰り返し構造をもつ"},
{id:"acetaldehyde",name:"アセトアルデヒド",formula:"C₂H₄O",family:"アルデヒド",kind:"aliphatic",color:"#c58b62",desc:"エタノールなどの第一級アルコールの酸化で得られるアルデヒド。さらに酸化するとカルボン酸になる。",state:"常温で揮発性の液体",feature:"酸化",hint:"アルデヒド基 −CHO"},
{id:"acetic-acid",name:"酢酸",formula:"C₂H₄O₂",family:"カルボン酸",kind:"aliphatic",color:"#bd8075",desc:"代表的なカルボン酸。アルコールとのエステル化でエステルをつくる。",state:"常温で液体",feature:"酸性・エステル化",hint:"カルボキシ基 −COOH"},
{id:"ethyl-acetate",name:"酢酸エチル",formula:"C₄H₈O₂",family:"エステル",kind:"aliphatic",color:"#9b8bb7",desc:"酢酸とエタノールのエステル化で生成するエステル。加水分解するとカルボン酸とアルコールに戻る。",state:"常温で液体",feature:"エステル化・加水分解",hint:"−COO−結合をもつ"},
{id:"benzene",name:"ベンゼン",formula:"C₆H₆",family:"芳香族炭化水素",kind:"aromatic",color:"#639b9a",desc:"芳香族化合物の基本となる環状構造。代表的な反応は付加よりも置換反応である。",state:"常温で液体",feature:"芳香族置換",hint:"六員環の共役構造"},
{id:"nitrobenzene",name:"ニトロベンゼン",formula:"C₆H₅NO₂",family:"芳香族ニトロ化合物",kind:"aromatic",color:"#b8899c",desc:"ベンゼンのニトロ化で得られる化合物。ニトロ基を還元するとアミノ基をもつ化合物になる。",state:"常温で液体",feature:"還元",hint:"ニトロ基 −NO₂"},
{id:"aniline",name:"フェニルアミン",formula:"C₆H₇N",family:"芳香族アミン",kind:"aromatic",color:"#b8899c",desc:"アニリンとも呼ばれる芳香族アミン。ジアゾ化反応を経て、さまざまな芳香族化合物へつながる。",state:"常温で液体",feature:"ジアゾ化",hint:"アミノ基 −NH₂"},
{id:"diazonium",name:"塩化ベンゼンジアゾニウム",formula:"C₆H₅N₂Cl",family:"ジアゾニウム塩",kind:"aromatic",color:"#9c8bb8",desc:"芳香族第一級アミンのジアゾ化で生じる中間体。加水分解などで別の官能基へ変換できる。",state:"水溶液中で扱う中間体",feature:"ジアゾ化・置換",hint:"ジアゾ基 −N₂⁺"},
{id:"phenol",name:"フェノール",formula:"C₆H₆O",family:"芳香族ヒドロキシ化合物",kind:"aromatic",color:"#689b83",desc:"ベンゼン環にヒドロキシ基が直接結合した化合物。アルコールとは異なる弱い酸性を示す。",state:"常温で固体",feature:"弱酸性",hint:"環に直接結合した−OH"},
{id:"chlorobenzene",name:"クロロベンゼン",formula:"C₆H₅Cl",family:"ハロゲン化芳香族",kind:"aromatic",color:"#c49b64",desc:"ベンゼンの置換反応や、ジアゾニウム塩を経る変換で得られる芳香族ハロゲン化物。",state:"常温で液体",feature:"芳香族置換",hint:"芳香環にCl"}
];
var positions = {
"ethane":[125,176],"chloroethane":[310,135],"ethanol":[468,266],"ethene":[296,355],
"dibromoethane":[127,447],"polyethylene":[132,575],"acetaldehyde":[624,250],"acetic-acid":[791,279],
"ethyl-acetate":[864,423],"benzene":[382,575],"nitrobenzene":[553,532],"aniline":[710,560],
"diazonium":[791,666],"phenol":[930,634],"chlorobenzene":[421,692]
};
var edges = [
{id:"e1",from:"ethane",to:"chloroethane",type:"substitution",label:"塩素置換",condition:"Cl₂・光",name:"ラジカル置換反応",note:"水素原子の一部が塩素原子に置き換わる。"},
{id:"e2",from:"chloroethane",to:"ethanol",type:"substitution",label:"加水分解",condition:"NaOH水溶液",name:"加水分解",note:"ハロゲン原子がヒドロキシ基に置き換わる。"},
{id:"e3",from:"ethanol",to:"ethene",type:"elimination",label:"脱水",condition:"濃硫酸・高温",name:"分子内脱水",note:"水が取れて炭素間に二重結合が生じる。"},
{id:"e4",from:"ethene",to:"ethanol",type:"addition",label:"水和",condition:"酸触媒",name:"付加反応（水和）",note:"二重結合に水の成分が付加する。"},
{id:"e5",from:"ethene",to:"ethane",type:"addition",label:"水素付加",condition:"H₂・触媒",name:"接触水素化",note:"二重結合に水素が付加し、飽和炭化水素になる。"},
{id:"e6",from:"ethene",to:"dibromoethane",type:"addition",label:"臭素付加",condition:"Br₂",name:"ハロゲンの付加",note:"二重結合に臭素が付加する。"},
{id:"e7",from:"ethene",to:"polyethylene",type:"polymerization",label:"付加重合",condition:"開始剤など",name:"付加重合",note:"エテンが多数つながり、繰り返し単位をもつ高分子になる。"},
{id:"e8",from:"ethanol",to:"acetaldehyde",type:"oxidation",label:"酸化",condition:"酸化剤など",name:"第一級アルコールの酸化",note:"第一級アルコールからアルデヒドが生じる。"},
{id:"e9",from:"acetaldehyde",to:"acetic-acid",type:"oxidation",label:"さらに酸化",condition:"酸化剤",name:"アルデヒドの酸化",note:"アルデヒド基がカルボキシ基へ酸化される。"},
{id:"e10",from:"acetic-acid",to:"ethyl-acetate",type:"substitution",label:"エステル化",condition:"エタノール・酸触媒",name:"エステル化",note:"カルボン酸とアルコールからエステルと水が生じる。"},
{id:"e11",from:"ethyl-acetate",to:"acetic-acid",type:"substitution",label:"加水分解",condition:"水・酸または塩基",name:"エステルの加水分解",note:"エステル結合が切れ、カルボン酸側の生成物が得られる。"},
{id:"e12",from:"benzene",to:"nitrobenzene",type:"substitution",label:"ニトロ化",condition:"濃硝酸・濃硫酸",name:"芳香族求電子置換",note:"ベンゼン環の水素原子がニトロ基に置き換わる。"},
{id:"e13",from:"benzene",to:"chlorobenzene",type:"substitution",label:"塩素置換",condition:"Cl₂・触媒",name:"芳香族置換反応",note:"ベンゼン環の水素原子が塩素原子に置き換わる。"},
{id:"e14",from:"nitrobenzene",to:"aniline",type:"oxidation",label:"還元",condition:"還元剤",name:"ニトロ基の還元",note:"ニトロ基がアミノ基へ変換される。"},
{id:"e15",from:"aniline",to:"diazonium",type:"substitution",label:"ジアゾ化",condition:"NaNO₂・塩酸・低温",name:"ジアゾ化反応",note:"芳香族第一級アミンからジアゾニウム塩を得る。"},
{id:"e16",from:"diazonium",to:"phenol",type:"substitution",label:"加水分解",condition:"水・加温",name:"ジアゾニウム塩の変換",note:"ジアゾ基がヒドロキシ基に置き換わる。"},
{id:"e17",from:"diazonium",to:"chlorobenzene",type:"substitution",label:"塩素置換",condition:"CuClなど",name:"ジアゾニウム塩の置換",note:"ジアゾ基を塩素原子に置き換える代表的な変換。"}
];
var byId={},byName={};
compounds.forEach(function(c){byId[c.id]=c;byName[c.name]=c;});
var selectedId="ethanol",routeEdgeIds=[],routeNodeIds=["ethanol","acetaldehyde","acetic-acid"],currentFilter="all",zoom=1,panX=0,panY=0,drag=null,toastTimer;
var svg=document.getElementById("reaction-map"),world=document.getElementById("map-world");
var fromInput=document.getElementById("from-input"),toInput=document.getElementById("to-input");
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function compound(id){return byId[id];}
function accessible(id){var c=compound(id);return currentFilter==="all"||(c&&c.kind===currentFilter);}
function showToast(message){var el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove("show");},2600);}
function edgePath(e){
 var a=positions[e.from],b=positions[e.to],dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.sqrt(dx*dx+dy*dy)||1;
 var sx=a[0]+dx/dist*44,sy=a[1]+dy/dist*31,ex=b[0]-dx/dist*47,ey=b[1]-dy/dist*33;
 var bend=(((parseInt(e.id.slice(1),10)%3)-1)*24);
 var mx=(sx+ex)/2+(-dy/dist)*bend,my=(sy+ey)/2+(dx/dist)*bend;
 e.mid=[mx,my];
 return "M "+sx.toFixed(1)+" "+sy.toFixed(1)+" Q "+mx.toFixed(1)+" "+my.toFixed(1)+" "+ex.toFixed(1)+" "+ey.toFixed(1);
}
function renderMap(){
 var out='<g class="regions"><text class="region-label" x="48" y="76">ALIPHATIC / 脂肪族</text><line class="region-line" x1="48" y1="92" x2="555" y2="92"/><text class="region-label" x="525" y="478">AROMATIC / 芳香族</text><line class="region-line" x1="525" y1="493" x2="950" y2="493"/></g><g id="edges-layer">';
 edges.forEach(function(e){
   var active=routeEdgeIds.indexOf(e.id)>=0;
   var dim=(currentFilter!=="all"&&(!accessible(e.from)||!accessible(e.to)));
   out+='<g class="edge-wrap"><path class="edge '+e.type+(active?' active':'')+(dim?' dimmed':'')+'" data-edge="'+e.id+'" d="'+edgePath(e)+'" marker-end="url(#'+(active?'arrow-active':'arrow')+')" vector-effect="non-scaling-stroke"/>';
   var showLabel=active||(["e1","e3","e4","e8","e9","e12","e14","e15","e16"].indexOf(e.id)>=0);
   if(showLabel){out+='<text class="edge-label'+(active?' active':'')+(dim?' dimmed':'')+'" x="'+e.mid[0].toFixed(1)+'" y="'+(e.mid[1]-7).toFixed(1)+'">'+esc(e.label)+'</text>';}
   out+='</g>';
 });
 out+='</g><g id="nodes-layer">';
 compounds.forEach(function(c){
   var p=positions[c.id],selected=c.id===selectedId,route=routeNodeIds.indexOf(c.id)>=0,dim=!accessible(c.id);
   out+='<g class="map-node'+(selected?' selected':'')+(route?' in-route':'')+(dim?' dimmed':'')+'" data-node="'+c.id+'" tabindex="0" role="button" aria-label="'+esc(c.name)+'を選択">';
   out+='<circle class="node-halo" cx="'+p[0]+'" cy="'+p[1]+'" r="37"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="26" fill="'+c.color+'" opacity=".12"/><circle class="node-dot" cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="'+c.color+'"/>';
   if(route){out+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="31" fill="none" stroke="#df9a6c" stroke-width="1.5" stroke-dasharray="3 5"/>';}
   out+='<text class="node-name" x="'+p[0]+'" y="'+(p[1]+56)+'">'+esc(c.name)+'</text><text class="node-formula" x="'+p[0]+'" y="'+(p[1]+72)+'">'+esc(c.formula)+'</text></g>';
 });
 out+='</g>';
 world.innerHTML=out;
 world.querySelectorAll(".map-node").forEach(function(el){
   el.addEventListener("click",function(){if(drag&&drag.moved)return;selectCompound(el.getAttribute("data-node"));});
   el.addEventListener("keydown",function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();selectCompound(el.getAttribute("data-node"));}});
 });
 applyView();
}
function applyView(){world.setAttribute("transform","translate("+panX+" "+panY+") translate(500 380) scale("+zoom+") translate(-500 -380)");}
function findPath(from,to){
 if(!byId[from]||!byId[to])return null;
 if(from===to)return {nodes:[from],edges:[]};
 var q=[{id:from,nodes:[from],edges:[]}],seen={};seen[from]=true;
 while(q.length){
  var cur=q.shift();
  for(var i=0;i<edges.length;i++){
   var e=edges[i];if(e.from!==cur.id||seen[e.to])continue;
   var nn=cur.nodes.concat([e.to]),ee=cur.edges.concat([e.id]);
   if(e.to===to)return {nodes:nn,edges:ee};
   seen[e.to]=true;q.push({id:e.to,nodes:nn,edges:ee});
  }
 }
 return null;
}
function renderRoute(result,from,to){
 var holder=document.getElementById("route-results"),count=document.getElementById("route-count");
 if(!result){
  count.textContent="NO ROUTE";
  holder.innerHTML='<div class="route-alert">登録された反応データ内では経路を見つけられなかった。反応の向きや、別の中間体を使う経路も確認してみよう。</div>';
  return;
 }
 if(result.edges.length===0){
  count.textContent="0 REACTIONS";
  holder.innerHTML='<div class="route-empty">始点と目的物質が同じ。別の化合物を目的地に設定すると経路を探せる。</div>';return;
 }
 count.textContent=result.edges.length+" REACTION"+(result.edges.length===1?"":"S");
 var html="";
 result.nodes.forEach(function(id,i){
  var c=compound(id);
  html+='<div class="route-card"><div class="route-step-top"><span class="step-num">'+(i+1)+'</span><span class="route-step-title">'+esc(c.name)+'</span><span class="route-step-formula">'+esc(c.formula)+'</span></div>';
  if(i<result.edges.length){
   var e=edges.filter(function(x){return x.id===result.edges[i];})[0];
   html+='<div class="route-reaction">↳ '+esc(e.name)+'</div><div class="route-condition">'+esc(e.condition)+'</div>';
  }
  html+='</div>';
 });
 holder.innerHTML=html;
}
function setRoute(from,to,quiet){
 var a=byName[from],b=byName[to];
 if(!a||!b){
  if(!quiet)showToast("候補リストにある化合物名を入力してください。");
  return false;
 }
 fromInput.value=a.name;toInput.value=b.name;
 var r=findPath(a.id,b.id);
 routeEdgeIds=r?r.edges.slice():[];routeNodeIds=r?r.nodes.slice():[];
 renderRoute(r,a.id,b.id);
 renderMap();
 if(!r){if(!quiet)showToast(a.name+" から "+b.name+" への登録経路は見つかりませんでした。");}
 else if(!quiet)showToast(r.edges.length===0?"始点と目的物質が同じです。":"反応 "+r.edges.length+" 段階の経路を表示しました。");
 return !!r;
}
function selectCompound(id){
 selectedId=id;renderDetail();renderMap();
}
function renderDetail(){
 var c=compound(selectedId);if(!c)return;
 var detail=document.getElementById("compound-detail");
 detail.innerHTML='<div class="compound-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="'+c.color+'" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="'+c.color+'" opacity=".65"/><path d="M12 4v5m0 6v5M4 12h5m6 0h5" stroke="'+c.color+'" stroke-width="1.3"/></svg></div><h2 class="compound-name">'+esc(c.name)+'</h2><div class="compound-formula">'+esc(c.formula)+'</div><span class="type-pill"><i class="legend-dot" style="background:'+c.color+'"></i>'+esc(c.family)+'</span><p class="detail-description">'+esc(c.desc)+'</p><div class="detail-actions" style="margin-top:14px"><button class="outline-btn" id="set-as-start">⊙ 始点に設定</button><button class="outline-btn" id="set-as-goal">◎ 終点に設定</button></div>';
 document.getElementById("compound-properties").innerHTML='<div class="property"><span>分類</span><strong>'+esc(c.family)+'</strong></div><div class="property"><span>状態の例</span><strong>'+esc(c.state)+'</strong></div><div class="property"><span>注目反応</span><strong>'+esc(c.feature)+'</strong></div><div class="property"><span>構造のヒント</span><strong>'+esc(c.hint)+'</strong></div>';
 var outgoing=edges.filter(function(e){return e.from===c.id;});
 var incoming=edges.filter(function(e){return e.to===c.id;});
 var html="";
 outgoing.forEach(function(e){
  var dst=compound(e.to);
  html+='<button class="reaction-link" data-next="'+e.to+'"><strong>→ '+esc(dst.name)+'</strong><span>'+esc(e.name)+' · '+esc(e.condition)+'</span></button>';
 });
 if(!outgoing.length)html='<div class="empty-state">このサンプルでは、この物質から直接進む反応は未登録。</div>';
 document.getElementById("compound-reactions").innerHTML=html;
 detail.querySelector("#set-as-start").addEventListener("click",function(){fromInput.value=c.name;showToast(c.name+" を始点に設定しました。");});
 detail.querySelector("#set-as-goal").addEventListener("click",function(){toInput.value=c.name;showToast(c.name+" を目的物質に設定しました。");});
 document.querySelectorAll(".reaction-link").forEach(function(el){el.addEventListener("click",function(){var dst=compound(el.getAttribute("data-next"));toInput.value=dst.name;setRoute(c.name,dst.name,false);});});
}
function populateOptions(){
 document.getElementById("compound-options").innerHTML=compounds.map(function(c){return '<option value="'+esc(c.name)+'"></option>';}).join("");
}
function changeFilter(f){
 currentFilter=f;
 document.querySelectorAll(".filter-btn").forEach(function(b){b.classList.toggle("active",b.getAttribute("data-filter")===f);});
 renderMap();
}
document.getElementById("find-route").addEventListener("click",function(){setRoute(fromInput.value.trim(),toInput.value.trim(),false);});
[fromInput,toInput].forEach(function(input){input.addEventListener("keydown",function(ev){if(ev.key==="Enter")setRoute(fromInput.value.trim(),toInput.value.trim(),false);});});
document.getElementById("swap-route").addEventListener("click",function(){var v=fromInput.value;fromInput.value=toInput.value;toInput.value=v;setRoute(fromInput.value.trim(),toInput.value.trim(),false);});
document.querySelectorAll(".chip[data-from]").forEach(function(el){el.addEventListener("click",function(){setRoute(el.getAttribute("data-from"),el.getAttribute("data-to"),false);});});
document.querySelectorAll(".filter-btn").forEach(function(el){el.addEventListener("click",function(){changeFilter(el.getAttribute("data-filter"));});});
document.getElementById("zoom-in").addEventListener("click",function(){zoom=Math.min(zoom*1.22,2.5);applyView();});
document.getElementById("zoom-out").addEventListener("click",function(){zoom=Math.max(zoom/1.22,.65);applyView();});
document.getElementById("reset-map").addEventListener("click",function(){zoom=1;panX=0;panY=0;changeFilter("all");renderMap();showToast("マップ全体を表示しました。");});
svg.addEventListener("wheel",function(ev){ev.preventDefault();zoom=Math.max(.65,Math.min(2.5,zoom*(ev.deltaY<0?1.1:.91)));applyView();},{passive:false});
svg.addEventListener("pointerdown",function(ev){
 if(ev.target.closest&&ev.target.closest(".map-node"))return;
 drag={x:ev.clientX,y:ev.clientY,px:panX,py:panY,moved:false};svg.setPointerCapture(ev.pointerId);svg.classList.add("dragging");
});
svg.addEventListener("pointermove",function(ev){
 if(!drag)return;
 var rect=svg.getBoundingClientRect(),sx=1000/rect.width,sy=760/rect.height;
 var dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
 if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
 panX=drag.px+dx*sx;panY=drag.py+dy*sy;applyView();
});
svg.addEventListener("pointerup",function(){if(drag&&drag.moved){renderMap();}drag=null;svg.classList.remove("dragging");});
svg.addEventListener("pointercancel",function(){drag=null;svg.classList.remove("dragging");});
document.getElementById("nav-quiz").addEventListener("click",function(){showToast("学習モードは今後追加予定。まずは反応経路を探索しよう。");});
document.getElementById("nav-compounds").addEventListener("click",function(){document.querySelector(".sidebar").scrollIntoView({behavior:"smooth",block:"start"});fromInput.focus();document.querySelectorAll(".nav-btn").forEach(function(x){x.classList.toggle("active",x.id==="nav-compounds");});});
document.getElementById("nav-map").addEventListener("click",function(){zoom=1;panX=0;panY=0;changeFilter("all");document.querySelectorAll(".nav-btn").forEach(function(x){x.classList.toggle("active",x.id==="nav-map");});});
populateOptions();
setRoute("エタノール","酢酸",true);
renderDetail();
})();
