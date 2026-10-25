(function(){
"use strict";
var data=window.OrganicAtlasData;
var root=document.getElementById("compound-list");
var search=document.getElementById("list-search");
var sort=document.getElementById("list-sort");
var countLabel=document.getElementById("list-count");
var status=document.getElementById("list-status");
var empty=document.getElementById("list-empty");
var familyFilter=document.getElementById("list-family-filter");
var cardsViewButton=document.getElementById("list-view-cards");
var rowsViewButton=document.getElementById("list-view-rows");
var listView="cards";
if(!data||!Array.isArray(data.compounds)){
 status.textContent="化合物データを読み込めませんでした。ページを再読み込みしてください。";
 status.className="list-status error";
 return;
}
var compounds=data.compounds;
var rdkit=null;
var rdkitPromise=null;
var svgCache=Object.create(null);
var atomicMass={H:1.008,C:12.011,N:14.007,O:15.999,F:18.998,Na:22.990,Mg:24.305,P:30.974,S:32.06,Cl:35.45,K:39.098,Ca:40.078,Fe:55.845,Br:79.904,I:126.904};
function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function formulaHtml(value){return esc(value||"—").replace(/([0-9]+)/g,"<sub>$1</sub>");}
function parseFormula(formula){
 var normalized=String(formula||"").replace(/[₀₁₂₃₄₅₆₇₈₉]/g,function(d){return "₀₁₂₃₄₅₆₇₈₉".indexOf(d);}).replace(/\s/g,"");
 if(!normalized||/[()n]/.test(normalized))return null;
 var tokens=normalized.match(/[A-Z][a-z]?\d*/g)||[];
 if(tokens.join("")!==normalized)return null;
 var mass=0,atoms=0;
 for(var i=0;i<tokens.length;i++){
  var m=tokens[i].match(/^([A-Z][a-z]?)(\d*)$/);
  if(!m||!Object.prototype.hasOwnProperty.call(atomicMass,m[1]))return null;
  var quantity=m[2]?Number(m[2]):1;
  mass+=atomicMass[m[1]]*quantity;
  atoms+=quantity;
 }
 return {mass:mass,atoms:atoms};
}
function molecularWeight(compound){
 if(Number.isFinite(Number(compound.molecularWeight))&&Number(compound.molecularWeight)>0)return Number(compound.molecularWeight);
 var parsed=parseFormula(compound.formula);
 return parsed?parsed.mass:null;
}
function drawOptions(compound){
 var parsed=parseFormula(compound.formula),atomCount=parsed?parsed.atoms:null;
 if(atomCount===null)return {bondLineWidth:1.4,scaleBondWidth:true,multipleBondOffset:0.15,padding:0.035,annotationFontScale:0.62};
 if(atomCount<=18)return {bondLineWidth:1.65,scaleBondWidth:true,multipleBondOffset:0.17,padding:0.055,minFontSize:8,maxFontSize:18,annotationFontScale:0.62};
 if(atomCount<=35)return {bondLineWidth:1.45,scaleBondWidth:true,multipleBondOffset:0.14,padding:0.035,minFontSize:7,maxFontSize:14,annotationFontScale:0.56};
 return {bondLineWidth:1.2,scaleBondWidth:true,multipleBondOffset:0.1,padding:0.02,minFontSize:6,maxFontSize:10,annotationFontScale:0.5};
}
function getRDKit(){
 if(rdkit)return Promise.resolve(rdkit);
 if(rdkitPromise)return rdkitPromise;
 if(typeof window.initRDKitModule!=="function")return Promise.reject(new Error("RDKit.jsを読み込めません"));
 rdkitPromise=window.initRDKitModule({
  locateFile:function(file){return "https://unpkg.com/@rdkit/rdkit/dist/"+file;}
 }).then(function(module){
  if(!module||typeof module.get_mol!=="function")throw new Error("RDKitの初期化に失敗しました");
  rdkit=module;return module;
 }).catch(function(error){rdkitPromise=null;throw error;});
 return rdkitPromise;
}
function renderThumbnail(host,compound){
 if(svgCache[compound.id]){host.innerHTML=svgCache[compound.id];return;}
 if(!compound.smiles){host.innerHTML='<span class="structure-error">構造データなし</span>';return;}
 getRDKit().then(function(module){
  if(!host.isConnected)return;
  var mol=null;
  try{
   mol=module.get_mol(compound.smiles);
   if(!mol)throw new Error("SMILESを読み取れません");
   var svg=mol.get_svg_with_highlights(JSON.stringify(drawOptions(compound)));
   if(!svg||!/<svg[\s>]/i.test(svg))throw new Error("SVGが空です");
   svgCache[compound.id]=svg;
   if(host.isConnected){
    host.innerHTML=svg;
    var el=host.querySelector("svg");
    if(el){el.setAttribute("aria-hidden","true");el.setAttribute("preserveAspectRatio","xMidYMid meet");}
   }
  }catch(error){
   if(host.isConnected)host.innerHTML='<span class="structure-error">構造式を描画できません</span>';
   console.error("Thumbnail rendering failed for "+compound.id,error);
  }finally{if(mol&&typeof mol.delete==="function")mol.delete();}
 }).catch(function(error){
  if(host.isConnected)host.innerHTML='<span class="structure-error">描画エンジンを読み込めません</span>';
  status.textContent="RDKit.jsを読み込めませんでした。CDNへの接続を確認してください。";
  status.className="list-status error";
 });
}
function cardHtml(c){
 var weight=molecularWeight(c);
 var weightText=weight===null?"分子量 —":weight.toFixed(2)+" g/mol";
 return '<a class="compound-list-card" href="compounds.html?compound='+encodeURIComponent(c.id)+'" aria-label="'+esc(c.name)+'の詳細を開く">'+
  '<div class="compound-thumb" data-thumb-id="'+esc(c.id)+'" role="img" aria-label="'+esc(c.name)+'の構造式"><span class="structure-loading">構造式</span></div>'+
  '<div class="compound-card-copy">'+
   '<div class="compound-card-meta"><span class="compound-family-tag">'+esc(c.family||"分類なし")+'</span><span class="compound-card-arrow" aria-hidden="true">↗</span></div>'+
   '<h2 class="compound-card-name">'+esc(c.name)+'</h2>'+
   '<div class="compound-card-formula">'+formulaHtml(c.formula)+'</div>'+
   '<p class="compound-card-description">'+esc(c.desc||c.hint||"")+'</p>'+
   '<div class="compound-card-weight">'+weightText+'</div>'+
  '</div>'+
 '</a>';
}
function rowHtml(c){
 var weight=molecularWeight(c);
 var weightText=weight===null?"—":weight.toFixed(2)+" g/mol";
 return '<a class="compound-list-row" href="compounds.html?compound='+encodeURIComponent(c.id)+'" aria-label="'+esc(c.name)+'の詳細を開く">'+
  '<span class="compound-row-name">'+esc(c.name)+'</span>'+
  '<span class="compound-row-formula">'+formulaHtml(c.formula)+'</span>'+
  '<span class="compound-row-family">'+esc(c.family||"分類なし")+'</span>'+
  '<span class="compound-row-weight">'+weightText+'</span>'+
  '<span class="compound-row-arrow" aria-hidden="true">↗</span>'+
 '</a>';
}
function populateFamilyFilter(){
 var current=familyFilter.value;
 var families=Array.from(new Set(compounds.map(function(c){return c.family||"分類なし";}))).sort(function(a,b){return a.localeCompare(b,"ja");});
 familyFilter.innerHTML='<option value="">すべての種別</option>'+families.map(function(f){return '<option value="'+esc(f)+'">'+esc(f)+'</option>';}).join("");
 familyFilter.value=current;
}
function sortCompounds(list){
 var method=sort.value;
 return list.slice().sort(function(a,b){
  if(method==="family"){
   var familyCompare=(a.family||"").localeCompare(b.family||"","ja");
   if(familyCompare!==0)return familyCompare;
   return a.name.localeCompare(b.name,"ja");
  }
  if(method==="weight-asc"||method==="weight-desc"){
   var aw=molecularWeight(a),bw=molecularWeight(b);
   if(aw===null&&bw!==null)return 1;
   if(bw===null&&aw!==null)return -1;
   if(aw!==null&&bw!==null&&aw!==bw)return method==="weight-asc"?aw-bw:bw-aw;
  }
  return a.name.localeCompare(b.name,"ja");
 });
}
function renderList(){
 var query=String(search.value||"").trim().toLocaleLowerCase();
 var selectedFamily=familyFilter.value;
 var filtered=compounds.filter(function(c){
  var matchesQuery=!query||[c.name,c.pubchemName,c.formula,c.family,c.desc,c.feature].concat(c.aliases||[]).some(function(v){return String(v||"").toLocaleLowerCase().indexOf(query)>=0;});
  var matchesFamily=!selectedFamily||(c.family||"分類なし")===selectedFamily;
  return matchesQuery&&matchesFamily;
 });
 var ordered=sortCompounds(filtered);
 root.classList.toggle("is-list",listView==="list");
 root.innerHTML=ordered.map(listView==="list"?rowHtml:cardHtml).join("");
 countLabel.textContent=ordered.length+" / "+compounds.length+" 化合物";
 empty.hidden=ordered.length>0;
 root.hidden=ordered.length===0;
 cardsViewButton.setAttribute("aria-pressed",listView==="cards"?"true":"false");
 rowsViewButton.setAttribute("aria-pressed",listView==="list"?"true":"false");
 if(listView==="cards"){
  root.querySelectorAll("[data-thumb-id]").forEach(function(host){
   var compound=compounds.find(function(c){return c.id===host.getAttribute("data-thumb-id");});
   if(compound)renderThumbnail(host,compound);
  });
 }
}
populateFamilyFilter();
search.addEventListener("input",renderList);
sort.addEventListener("change",renderList);
familyFilter.addEventListener("change",renderList);
cardsViewButton.addEventListener("click",function(){listView="cards";renderList();});
rowsViewButton.addEventListener("click",function(){listView="list";renderList();});
renderList();
getRDKit().then(function(){
 status.textContent="構造式を表示できます。カードを選ぶと化合物の詳細・反応経路を確認できます。";
 status.className="list-status";
}).catch(function(error){
 status.textContent="構造式エンジンの読み込みに失敗しました。通信環境を確認してください。";
 status.className="list-status error";
 console.error(error);
});
})();
