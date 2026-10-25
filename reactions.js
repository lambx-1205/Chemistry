(function(){
"use strict";
var data=window.OrganicAtlasData;
var root=document.getElementById("reaction-record-list");
var search=document.getElementById("reaction-search");
var kindFilter=document.getElementById("reaction-kind-filter");
var countLabel=document.getElementById("reaction-library-count");
var status=document.getElementById("reaction-library-status");
var empty=document.getElementById("reaction-library-empty");
var listButton=document.getElementById("reaction-view-list");
var expandedButton=document.getElementById("reaction-view-expanded");
if(!data||!Array.isArray(data.compounds)||!Array.isArray(data.edges)){
 status.textContent="化合物・反応データを読み込めませんでした。ページを再読み込みしてください。";
 status.className="reaction-library-status error";
 return;
}
var compounds=data.compounds;
var edges=data.edges;
var byId=Object.create(null);
compounds.forEach(function(c){byId[c.id]=c;});
var viewMode="list";
var rdkit=null,rdkitPromise=null,structureObserver=null;
var svgCache=Object.create(null);
var typeNames={substitution:"置換",addition:"付加",oxidation:"酸化",reduction:"還元",elimination:"脱離",polymerization:"重合",other:"その他"};
function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function formulaHtml(value){return esc(value||"—").replace(/([0-9]+)/g,"<sub>$1</sub>");}
function getRDKit(){
 if(rdkit)return Promise.resolve(rdkit);
 if(rdkitPromise)return rdkitPromise;
 if(typeof window.initRDKitModule!=="function")return Promise.reject(new Error("RDKit.jsを読み込めません"));
 rdkitPromise=window.initRDKitModule({locateFile:function(file){return "https://unpkg.com/@rdkit/rdkit/dist/"+file;}}).then(function(module){
  if(!module||typeof module.get_mol!=="function")throw new Error("RDKitの初期化に失敗しました");
  rdkit=module;return module;
 }).catch(function(error){rdkitPromise=null;throw error;});
 return rdkitPromise;
}
function drawOptions(compound){
 var f=String(compound.formula||"");
 var digits=f.replace(/[₀₁₂₃₄₅₆₇₈₉]/g,function(d){return "₀₁₂₃₄₅₆₇₈₉".indexOf(d);});
 var tokens=digits.match(/[A-Z][a-z]?\d*/g)||[];
 var count=tokens.reduce(function(sum,token){var m=token.match(/\d+$/);return sum+(m?Number(m[0]):1);},0);
 if(count<=18)return {bondLineWidth:1.65,scaleBondWidth:true,multipleBondOffset:0.17,padding:0.055,minFontSize:8,maxFontSize:18,annotationFontScale:0.62};
 if(count<=35)return {bondLineWidth:1.45,scaleBondWidth:true,multipleBondOffset:0.14,padding:0.035,minFontSize:7,maxFontSize:14,annotationFontScale:0.56};
 return {bondLineWidth:1.2,scaleBondWidth:true,multipleBondOffset:0.1,padding:0.02,minFontSize:6,maxFontSize:10,annotationFontScale:0.5};
}
function renderStructure(host){
 var c=byId[host.getAttribute("data-structure-id")];
 if(!c)return;
 if(svgCache[c.id]){host.innerHTML=svgCache[c.id];return;}
 if(!c.smiles){host.innerHTML='<span class="structure-error">構造データなし</span>';return;}
 getRDKit().then(function(module){
  if(!host.isConnected)return;
  var mol=null;
  try{
   mol=module.get_mol(c.smiles);
   if(!mol)throw new Error("SMILESを読み取れません");
   var svg=mol.get_svg_with_highlights(JSON.stringify(drawOptions(c)));
   if(!svg||!/<svg[\s>]/i.test(svg))throw new Error("SVGが空です");
   svgCache[c.id]=svg;
   if(host.isConnected){
    host.innerHTML=svg;
    var el=host.querySelector("svg");
    if(el){el.setAttribute("aria-hidden","true");el.setAttribute("preserveAspectRatio","xMidYMid meet");}
   }
  }catch(error){
   if(host.isConnected)host.innerHTML='<span class="structure-error">構造式を描画できません</span>';
   console.error("Reaction thumbnail failed for "+c.id,error);
  }finally{if(mol&&typeof mol.delete==="function")mol.delete();}
 }).catch(function(){
  if(host.isConnected)host.innerHTML='<span class="structure-error">構造式を読み込めません</span>';
  status.textContent="構造式の描画に失敗しました。RDKit.jsへの接続を確認してください。";
  status.className="reaction-library-status error";
 });
}
function populateTypeFilter(){
 var types=Array.from(new Set(edges.map(function(e){return e.type||"other";}))).sort(function(a,b){return (typeNames[a]||a).localeCompare(typeNames[b]||b,"ja");});
 kindFilter.innerHTML='<option value="">すべての種類</option>'+types.map(function(type){return '<option value="'+esc(type)+'">'+esc(typeNames[type]||type)+'</option>';}).join("");
}
function recordHtml(edge){
 var from=byId[edge.from],to=byId[edge.to];
 if(!from||!to)return "";
 var expanded=viewMode==="expanded";
 function compoundHtml(c){
  return '<div class="reaction-record-compound">'+
   (expanded?'<div class="reaction-structure-thumb" data-structure-id="'+esc(c.id)+'" role="img" aria-label="'+esc(c.name)+'の構造式"><span class="structure-loading">構造式</span></div>':"")+
   '<a class="reaction-record-compound-name" href="index.html?compound='+encodeURIComponent(c.id)+'" title="'+esc(c.name)+'の詳細を開く">'+esc(c.name)+'</a>'+
   (expanded?'<span class="reaction-record-formula">'+formulaHtml(c.formula)+'</span>':"")+
  '</div>';
 }
 return '<article class="reaction-record'+(expanded?' is-expanded':'')+'" data-reaction-id="'+esc(edge.id)+'" data-kind="'+esc(edge.type||"other")+'">'+
  '<div class="reaction-record-route">'+compoundHtml(from)+'<span class="reaction-record-arrow" aria-label="から生成">→</span>'+compoundHtml(to)+'</div>'+
  '<div class="reaction-record-meta">'+
   '<div class="reaction-meta-field"><span>反応名</span><strong>'+esc(edge.name||edge.label||"名称未登録")+'</strong></div>'+
   '<div class="reaction-meta-field"><span>試薬・条件</span><p>'+esc(edge.condition||"登録なし")+'</p></div>'+
  '</div>'+
 '</article>';
}
function updateStructureHosts(){
 if(structureObserver){structureObserver.disconnect();structureObserver=null;}
 if(viewMode!=="expanded")return;
 var hosts=root.querySelectorAll("[data-structure-id]");
 if("IntersectionObserver" in window){
  structureObserver=new IntersectionObserver(function(entries){
   entries.forEach(function(entry){
    if(entry.isIntersecting){
     structureObserver.unobserve(entry.target);
     renderStructure(entry.target);
    }
   });
  },{rootMargin:"240px 0px"});
  hosts.forEach(function(host){structureObserver.observe(host);});
 }else{
  hosts.forEach(renderStructure);
 }
}
function renderList(){
 var query=String(search.value||"").trim().toLocaleLowerCase();
 var selectedType=kindFilter.value;
 var filtered=edges.filter(function(e){
  var from=byId[e.from],to=byId[e.to];
  var values=[e.name,e.label,e.condition,e.equation,e.note,e.type,from&&from.name,to&&to.name,from&&from.formula,to&&to.formula];
  var matchesQuery=!query||values.some(function(v){return String(v||"").toLocaleLowerCase().indexOf(query)>=0;});
  return matchesQuery&&(!selectedType||(e.type||"other")===selectedType);
 });
 root.innerHTML=filtered.map(recordHtml).join("");
 countLabel.textContent=filtered.length+" / "+edges.length+" 反応";
 empty.hidden=filtered.length>0;
 root.hidden=filtered.length===0;
 listButton.setAttribute("aria-pressed",viewMode==="list"?"true":"false");
 expandedButton.setAttribute("aria-pressed",viewMode==="expanded"?"true":"false");
 updateStructureHosts();
}
search.addEventListener("input",renderList);
kindFilter.addEventListener("change",renderList);
listButton.addEventListener("click",function(){viewMode="list";renderList();status.textContent="反応名と試薬・条件に絞って表示しています。";});
expandedButton.addEventListener("click",function(){viewMode="expanded";renderList();status.textContent="構造式を読み込みます。スクロールに合わせて順次表示します。";});
populateTypeFilter();
renderList();
status.textContent="登録済み反応を表示しています。反応名・化合物名・試薬で検索できます。";
})();