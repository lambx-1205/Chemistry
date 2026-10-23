(function(){
"use strict";
var sharedData=window.OrganicAtlasData;
if(!sharedData){console.error("Organic Atlas shared data failed to load.");return;}
var compounds=sharedData.compounds;
var edges=sharedData.edges;
var byId={},byName={};
compounds.forEach(function(c){byId[c.id]=c;byName[c.name.toLocaleLowerCase()]=c;if(c.pubchemName)byName[c.pubchemName.toLocaleLowerCase()]=c;(c.aliases||[]).forEach(function(alias){byName[String(alias).toLocaleLowerCase()]=c;});});
var currentCompound=null,lookupSequence=0,structureSequence=0;
var input=document.getElementById("compound-search");
var searchButton=document.getElementById("search-button");
var suggestions=document.getElementById("compound-options");
var status=document.getElementById("search-status");
var mainStructure=document.getElementById("main-structure");
var mainPubchemLink=document.getElementById("pubchem-link");
var mainStructureSource=document.getElementById("structure-source");
var resultRoot=document.getElementById("compound-content");
var previousRoot=document.getElementById("previous-step-results");
var nextRoot=document.getElementById("next-step-results");
var previousCount=document.getElementById("previous-step-count");
var nextCount=document.getElementById("next-step-count");
var reactionDetailDialog=document.getElementById("reaction-detail-dialog");
var reactionDetailTitle=document.getElementById("reaction-detail-title");
var reactionDetailContent=document.getElementById("reaction-detail-content");
var isomerRoot=document.getElementById("isomer-section");
var isomerGroupsRoot=document.getElementById("isomer-groups");
var molecule3dDialog=document.getElementById("molecule3d-dialog");
var molecule3dTitle=document.getElementById("molecule3d-title");
var molecule3dStage=document.getElementById("molecule3d-stage");
var molecule3dFallback=document.getElementById("molecule3d-fallback");
var molecule3dStatus=document.getElementById("molecule3d-status");
var molecule3dPubChemLink=document.getElementById("molecule3d-pubchem-link");
var molecule3dSource=document.getElementById("molecule3d-source");
var molecule3dSpacefillButton=document.getElementById("molecule3d-spacefill");
var molecule3dBallstickButton=document.getElementById("molecule3d-ballstick");
var molecule3dRequest=0;
var activeMolecule3D=null;
var lookupCache={};
function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function formulaHtml(value){return esc(value||"—").replace(/([0-9]+)/g,"<sub>$1</sub>");}
function pubchemUrl(c){return c.pubchemCid?"https://pubchem.ncbi.nlm.nih.gov/compound/"+encodeURIComponent(c.pubchemCid):"https://pubchem.ncbi.nlm.nih.gov/#query="+encodeURIComponent(c.pubchemName||c.name);}
function knownCompound(query){
 var q=String(query||"").trim().toLocaleLowerCase();
 if(!q)return null;
 if(byName[q])return byName[q];
 return compounds.find(function(c){return c.formula.toLocaleLowerCase()===q||c.id.toLocaleLowerCase()===q||(c.aliases||[]).some(function(a){return String(a).toLocaleLowerCase()===q;});})||null;
}
function setStatus(message,kind){
 status.textContent=message||"";
 status.className="search-status"+(kind?" "+kind:"");
}
function setLoading(loading){
 searchButton.disabled=loading;
 searchButton.classList.toggle("loading",loading);
 searchButton.setAttribute("aria-busy",loading?"true":"false");
}
function fillSuggestions(){
 var seen={};
 var values=[];
 compounds.forEach(function(c){
  [c.name,c.pubchemName].concat(c.aliases||[]).forEach(function(v){
   if(v&&!seen[v.toLocaleLowerCase()]){seen[v.toLocaleLowerCase()]=true;values.push(v);}
  });
 });
 suggestions.innerHTML=values.map(function(v){return '<option value="'+esc(v)+'"></option>';}).join("");
}
var rdkitInstance=null;
var rdkitInitPromise=null;
function getRDKit(){
 if(rdkitInstance)return Promise.resolve(rdkitInstance);
 if(typeof window.initRDKitModule!=="function")return Promise.reject(new Error("RDKit.jsを読み込めませんでした"));
 if(!rdkitInitPromise){
  rdkitInitPromise=window.initRDKitModule({
   locateFile:function(file){
    return "https://unpkg.com/@rdkit/rdkit/dist/"+file;
   }
  }).then(function(module){
   if(!module||typeof module.get_mol!=="function")throw new Error("RDKit module did not initialize");
   rdkitInstance=module;
   return module;
  }).catch(function(error){
   rdkitInitPromise=null;
   throw error;
  });
 }
 return rdkitInitPromise;
}
function countFormulaAtoms(formula){
 var text=String(formula||"").replace(/[₀₁₂₃₄₅₆₇₈₉]/g,function(d){return "₀₁₂₃₄₅₆₇₈₉".indexOf(d);}).replace(/\s/g,"");
 var parts=text.match(/[A-Z][a-z]?\d*/g)||[];
 if(parts.join("")!==text||parts.length===0)return null;
 return parts.reduce(function(sum,part){
  var match=part.match(/^([A-Z][a-z]?)(\d*)$/);
  return sum+(match[2]?Number(match[2]):1);
 },0);
}
function getStructureDrawOptions(formula){
 var atomCount=countFormulaAtoms(formula);
 if(atomCount===null){
  return {bondLineWidth:1.5,scaleBondWidth:true,multipleBondOffset:0.16,padding:0.06,annotationFontScale:0.7};
 }
 var bondLineWidth,multipleBondOffset,padding,maxFontSize,minFontSize;
 if(atomCount<=18){
  bondLineWidth=1.8;multipleBondOffset=0.18;padding=0.07;maxFontSize=22;minFontSize=10;
 }else if(atomCount<=35){
  bondLineWidth=1.6;multipleBondOffset=0.15;padding=0.045;maxFontSize=16;minFontSize=8;
 }else if(atomCount<=65){
  bondLineWidth=1.4;multipleBondOffset=0.12;padding=0.025;maxFontSize=12;minFontSize=7;
 }else{
  bondLineWidth=1.25;multipleBondOffset=0.1;padding=0.015;maxFontSize=10;minFontSize=6;
 }
 return {
  bondLineWidth:bondLineWidth,
  scaleBondWidth:true,
  multipleBondOffset:multipleBondOffset,
  padding:padding,
  minFontSize:minFontSize,
  maxFontSize:maxFontSize,
  annotationFontScale:atomCount>35?0.55:0.68
 };
}
/* chemistry_brade と同じく、RDKitの分子オブジェクトからSVGを直接生成する。 */
function drawStructure(target,smilesValue,width,height,key,formula){
 if(!target)return;
 var renderKey=key||"";
 target.dataset.structureKey=renderKey;
 target.dataset.renderEngine="";
 target.innerHTML='<span class="structure-loading">構造式を描画中…</span>';
 if(!smilesValue){
  target.innerHTML='<span class="structure-error">構造式データなし</span>';
  return;
 }
 getRDKit().then(function(RDKit){
  if(!target.isConnected||target.dataset.structureKey!==renderKey)return;
  var mol=null;
  try{
   mol=RDKit.get_mol(smilesValue);
   if(!mol)throw new Error("SMILESを解析できません");
   var drawOptions=getStructureDrawOptions(formula);
   var markup=mol.get_svg_with_highlights(JSON.stringify(drawOptions));
   if(!markup||!/<svg[\s>]/i.test(markup))throw new Error("RDKit returned empty SVG");
   if(!target.isConnected||target.dataset.structureKey!==renderKey)return;
   target.innerHTML=markup;
   var output=target.querySelector("svg");
   if(!output)throw new Error("RDKit SVG element missing");
   output.setAttribute("role","img");
   output.setAttribute("aria-label",target.getAttribute("aria-label")||"化学構造式");
   output.setAttribute("preserveAspectRatio","xMidYMid meet");
   target.dataset.renderEngine="rdkit-svg";
  }catch(error){
   if(target.isConnected&&target.dataset.structureKey===renderKey){
    target.innerHTML='<span class="structure-error">構造式を描画できません: '+esc(error&&error.message?error.message:"RDKit error")+'</span>';
   }
   console.error("RDKit SVG rendering failed:",error&&error.message?error.message:error);
  }finally{
   if(mol&&typeof mol.delete==="function")mol.delete();
  }
 }).catch(function(error){
  if(target.isConnected&&target.dataset.structureKey===renderKey){
   target.innerHTML='<span class="structure-error">描画エンジンを読み込めません</span>';
  }
  console.error("RDKit initialization failed:",error&&error.message?error.message:error);
 });
}
function renderSearchResults(){
 var optionCount=compounds.length;
 document.getElementById("local-count").textContent=String(optionCount).padStart(2,"0");
}
function fact(label,value){
 return '<div class="fact"><span class="fact-label">'+esc(label)+'</span><span class="fact-value">'+esc(value||"—")+'</span></div>';
}
function is3DRestrictedCompound(c){
 var identity=(String(c&&c.name||"")+" "+String(c&&c.pubchemName||"")).toLocaleLowerCase();
 return Boolean(c&&c.id==="tnt")||identity.indexOf("trinitrotoluene")>=0||identity.indexOf(" tnt")>=0||identity.trim()==="tnt";
}
function renderCompound(c){
 currentCompound=c;
 document.title=c.name+" — Organic Atlas";
 var main=document.getElementById("compound-main");
 main.hidden=false;
 document.getElementById("compound-empty").hidden=true;
 document.getElementById("compound-name").textContent=c.name;
 document.getElementById("compound-family").textContent=c.family||"化合物";
 document.getElementById("compound-formula").innerHTML=formulaHtml(c.pubchemFormula||c.formula);
 mainStructure.setAttribute("aria-label",c.name+"の構造式");
 drawStructure(mainStructure,c.smiles,440,270,"main-"+c.id+"-"+c.smiles,c.pubchemFormula||c.formula);
 mainPubchemLink.href=pubchemUrl(c);
 mainPubchemLink.setAttribute("aria-label",c.name+"をPubChemで開く");
 mainStructureSource.textContent=c.structureSource==="PubChem"?"PUBCHEM DATA · RDKIT SVG":"RDKIT SVG";
 document.getElementById("compound-facts").innerHTML=
  fact("分類",c.family||"—")+
  fact("分子量",c.molecularWeight?(Number(c.molecularWeight).toFixed(2)+" g/mol"):"—")+
  fact("状態",c.state||"—")+
  fact("InChIKey",c.inchiKey||"—");
 renderOneStep(c);
 renderIsomerGroups(c);
 var modelButton=document.getElementById("open-3d-model");
 if(modelButton)modelButton.disabled=is3DRestrictedCompound(c);
}
function renderReactionCard(edge,direction){
 var from=byId[edge.from];
 var to=byId[edge.to];
 if(!from||!to)return "";
 var neighbor=direction==="before"?from:to;
 return '<article class="reaction-card">'+
  '<div class="reaction-card-top"><span class="reaction-kind">'+esc(edge.name||edge.label)+'</span><span class="reaction-arrow" aria-hidden="true">'+(direction==="before"?"↙":"↗")+'</span></div>'+
  '<button class="reaction-neighbor-button" type="button" data-compound="'+esc(neighbor.id)+'" aria-label="'+esc(neighbor.name)+'の化合物情報を表示">'+
   '<span class="reaction-structure"><span class="small-structure" data-small-structure="'+esc(neighbor.id)+'" role="img" aria-label="'+esc(neighbor.name)+'の構造式"></span></span>'+
   '<span class="reaction-compound-name">'+esc(neighbor.name)+'</span>'+
   '<span class="reaction-compound-formula">'+formulaHtml(neighbor.pubchemFormula||neighbor.formula)+'</span>'+
  '</button>'+
  '<div class="reaction-route" aria-label="反応の流れ"><span>'+esc(from.name)+'</span><span class="route-arrow" aria-hidden="true">→</span><span>'+esc(to.name)+'</span></div>'+
  '<div class="reaction-condition">'+esc(edge.condition||"反応条件の登録なし")+'</div>'+
  '<div class="reaction-card-actions">'+
   '<button class="reaction-open-button" type="button" data-compound="'+esc(neighbor.id)+'">化合物を開く</button>'+
   '<button class="reaction-details-button" type="button" data-reaction-id="'+esc(edge.id)+'">反応の詳細を見る</button>'+
  '</div>'+
 '</article>';
}
function renderReactionList(root,list,direction){
 if(!list.length){
  root.innerHTML='<div class="no-reactions"><span class="no-reactions-mark">∅</span><span>'+(direction==="before"?"登録された一段階前の反応はありません":"登録された一段階後の反応はありません")+'</span></div>';
  return;
 }
 root.innerHTML=list.map(function(edge){return renderReactionCard(edge,direction);}).join("");
 root.querySelectorAll("[data-compound]").forEach(function(button){
  button.addEventListener("click",function(){
   var target=byId[button.getAttribute("data-compound")];
   if(target){
    input.value=target.name;
    renderCompound(target);
    setStatus("","");
    window.scrollTo({top:0,behavior:"smooth"});
    resolveStructure(target);
   }
  });
 });
 root.querySelectorAll(".small-structure").forEach(function(host){
  var target=byId[host.getAttribute("data-small-structure")];
  if(target)drawStructure(host,target.smiles,220,108,"small-"+target.id+"-"+target.smiles,target.pubchemFormula||target.formula);
 });
 root.querySelectorAll("[data-reaction-id]").forEach(function(button){
  button.addEventListener("click",function(){
   openReactionDetails(button.getAttribute("data-reaction-id"));
  });
 });
}
function openReactionDetails(edgeId){
 var edge=edges.find(function(item){return item.id===edgeId;});
 if(!edge)return;
 var from=byId[edge.from],to=byId[edge.to];
 if(!from||!to)return;
 reactionDetailTitle.textContent=edge.name||edge.label||"反応の詳細";
 reactionDetailContent.innerHTML=
  '<div class="reaction-detail-flow">'+
   '<div class="reaction-detail-compound"><span class="detail-step-label">反応前</span><strong>'+esc(from.name)+'</strong><span class="detail-formula">'+formulaHtml(from.pubchemFormula||from.formula)+'</span></div>'+
   '<span class="reaction-detail-arrow" aria-hidden="true">→</span>'+
   '<div class="reaction-detail-compound"><span class="detail-step-label">反応後</span><strong>'+esc(to.name)+'</strong><span class="detail-formula">'+formulaHtml(to.pubchemFormula||to.formula)+'</span></div>'+
  '</div>'+
  '<div class="reaction-detail-grid">'+
   '<section class="reaction-detail-block"><span class="detail-label">反応の種類・名称</span><strong>'+esc(edge.label||"—")+'</strong><p>'+esc(edge.name||"—")+'</p></section>'+
   '<section class="reaction-detail-block"><span class="detail-label">反応条件</span><strong>'+esc(edge.condition||"条件の登録なし")+'</strong></section>'+
   '<section class="reaction-detail-block reaction-detail-explanation"><span class="detail-label">反応の概要</span><p>'+esc(edge.note||"この反応についての説明はまだ登録されていません。")+'</p></section>'+
  '</div>'+
  '<p class="reaction-detail-caveat">ここでは反応前後の化合物と登録済みの条件・概要を示しています。表示は反応経路の概略であり、副生成物や係数まで含めた平衡化済み反応式ではありません。</p>';
 if(typeof reactionDetailDialog.showModal==="function")reactionDetailDialog.showModal();
 else reactionDetailDialog.setAttribute("open","");
}
function renderOneStep(c){
 var incoming=edges.filter(function(edge){return edge.to===c.id;});
 var outgoing=edges.filter(function(edge){return edge.from===c.id;});
 previousCount.textContent=String(incoming.length).padStart(2,"0");
 nextCount.textContent=String(outgoing.length).padStart(2,"0");
 renderReactionList(previousRoot,incoming,"before");
 renderReactionList(nextRoot,outgoing,"after");
}
document.getElementById("reaction-detail-close").addEventListener("click",function(){
 if(typeof reactionDetailDialog.close==="function")reactionDetailDialog.close();
 else reactionDetailDialog.removeAttribute("open");
});
document.getElementById("reaction-detail-done").addEventListener("click",function(){
 if(typeof reactionDetailDialog.close==="function")reactionDetailDialog.close();
 else reactionDetailDialog.removeAttribute("open");
});
reactionDetailDialog.addEventListener("click",function(event){
 if(event.target===reactionDetailDialog&&typeof reactionDetailDialog.close==="function")reactionDetailDialog.close();
});

function renderIsomerGroups(c){
 var groups=(window.OrganicAtlasData.isomerGroups||[]).filter(function(group){return group.members.indexOf(c.id)>=0||(group.contextIds||[]).indexOf(c.id)>=0;});
 if(!isomerRoot||!isomerGroupsRoot)return;
 if(!groups.length){isomerRoot.hidden=true;isomerGroupsRoot.innerHTML="";return;}
 isomerRoot.hidden=false;
 isomerGroupsRoot.innerHTML=groups.map(function(group){
  var memberCards=group.members.map(function(id){
   var member=byId[id];if(!member)return "";
   var selected=member.id===c.id;
   return '<button class="isomer-card'+(selected?' is-current':'')+'" type="button" data-isomer-id="'+esc(member.id)+'" '+(selected?'aria-current="true"':'')+'>'+
    '<span class="isomer-thumb" data-isomer-thumb="'+esc(group.id+"|"+member.id)+'" role="img" aria-label="'+esc(member.name)+'の構造式"><span class="structure-loading">構造式</span></span>'+
    '<span class="isomer-card-copy"><span class="isomer-card-name">'+esc(member.name)+'</span><span class="isomer-card-formula">'+formulaHtml(member.formula)+'</span><span class="isomer-card-state">'+(selected?'表示中':'切り替えて表示 ↗')+'</span></span>'+
   '</button>';
  }).join("");
  return '<section class="isomer-group" aria-label="'+esc(group.title)+'">'+
   '<div class="isomer-group-heading"><span class="isomer-relation-tag">'+esc(group.relation)+'</span><h3>'+esc(group.title)+'</h3></div>'+
   '<p class="isomer-group-note">'+esc(group.note)+'</p>'+
   '<div class="isomer-card-grid">'+memberCards+'</div>'+
  '</section>';
 }).join("");
 isomerGroupsRoot.querySelectorAll("[data-isomer-id]").forEach(function(button){
  button.addEventListener("click",function(){
   var target=byId[button.getAttribute("data-isomer-id")];
   if(target&&target.id!==currentCompound.id){
    input.value=target.name;renderCompound(target);setStatus("","");resolveStructure(target);
   }
  });
 });
 isomerGroupsRoot.querySelectorAll("[data-isomer-thumb]").forEach(function(host){
  var key=host.getAttribute("data-isomer-thumb");
  var id=key.slice(key.lastIndexOf("|")+1);
  var target=byId[id];
  if(target)drawStructure(host,target.smiles,200,84,"isomer-"+key,target.pubchemFormula||target.formula);
 });
}
async function getMolecule3DRecord(c){
 var record=c;
 if(!record.pubchemCid){
  if(!record.pubchemName)throw new Error("この登録化合物にはPubChemのCIDがなく、3D座標を特定できません。");
  record=await fetchCompound(record.pubchemName);
 }
 if(!record.pubchemCid)throw new Error("PubChemの化合物IDを取得できませんでした。");
 var url="https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/"+encodeURIComponent(record.pubchemCid)+"/SDF?record_type=3d";
 var response=await fetch(url,{headers:{Accept:"chemical/x-mdl-sdfile"}});
 if(!response.ok)throw new Error("PubChemに3D座標が登録されていない可能性があります。");
 var sdf=await response.text();
 if(!/V2000|V3000/.test(sdf))throw new Error("3D SDFを読み取れませんでした。");
 return {sdf:sdf,cid:record.pubchemCid,url:"https://pubchem.ncbi.nlm.nih.gov/compound/"+encodeURIComponent(record.pubchemCid)};
}
function get3DImageURL(c){
 if(c.pubchemCid)return "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/"+encodeURIComponent(c.pubchemCid)+"/PNG?record_type=3d&image_size=700x520";
 if(c.pubchemName)return "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"+encodeURIComponent(c.pubchemName)+"/PNG?record_type=3d&image_size=700x520";
 return null;
}
function show3DFallback(c,message,token){
 if(token!==molecule3dRequest)return;
 if(activeMolecule3D&&typeof activeMolecule3D.dispose==="function"){activeMolecule3D.dispose();activeMolecule3D=null;}
 molecule3dStage.hidden=true;
 molecule3dFallback.hidden=true;
 molecule3dStatus.textContent=message+" PubChemの3D画像を確認しています…";
 molecule3dStatus.className="molecule3d-status";
 var imageURL=get3DImageURL(c);
 if(!imageURL){molecule3dStatus.textContent=message+" この化合物の3D画像を取得できませんでした。";molecule3dStatus.className="molecule3d-status error";return;}
 molecule3dFallback.onload=function(){
  if(token!==molecule3dRequest)return;
  molecule3dFallback.hidden=false;
  molecule3dStatus.textContent="対話式3D表示は利用できないため、PubChemの3D画像を表示しています。";
  molecule3dStatus.className="molecule3d-status";
 };
 molecule3dFallback.onerror=function(){
  if(token!==molecule3dRequest)return;
  molecule3dFallback.hidden=true;
  molecule3dStatus.textContent=message+" PubChemに表示可能な3D構造がないか、通信に失敗しました。";
  molecule3dStatus.className="molecule3d-status error";
 };
 molecule3dFallback.src=imageURL;
}
async function open3DMolecule(){
 var c=currentCompound;
 if(!c||!molecule3dDialog)return;
 if(c.id==="tnt"||/trinitrotoluene|(^|\W)tnt($|\W)/i.test(String(c.name||"")+" "+String(c.pubchemName||""))){
  setStatus("この化合物の3D表示は利用できません。","error");return;
 }
 var token=++molecule3dRequest;
 molecule3dSpacefillButton.classList.add("is-active");molecule3dBallstickButton.classList.remove("is-active");
 if(activeMolecule3D&&typeof activeMolecule3D.dispose==="function"){activeMolecule3D.dispose();activeMolecule3D=null;}
 molecule3dTitle.textContent=c.name+" の3D分子模型";
 molecule3dStage.hidden=false;molecule3dFallback.hidden=true;
 molecule3dFallback.onload=null;molecule3dFallback.onerror=null;molecule3dFallback.removeAttribute("src");
 molecule3dStatus.textContent="PubChemから3D座標を取得しています…";
 molecule3dStatus.className="molecule3d-status";
 molecule3dSource.textContent="PubChem 3Dデータ";
 molecule3dPubChemLink.href=pubchemUrl(c);
 if(!molecule3dDialog.open)molecule3dDialog.showModal();
 try{
  var record=await getMolecule3DRecord(c);
  if(token!==molecule3dRequest)return;
  molecule3dPubChemLink.href=record.url;
  if(!window.Molecule3DViewer||typeof window.Molecule3DViewer.render!=="function")throw new Error("3D描画エンジンを読み込めませんでした。");
  activeMolecule3D=window.Molecule3DViewer.render(record.sdf,molecule3dStage,"spacefill");
  molecule3dStage.hidden=false;
  molecule3dFallback.hidden=true;
  molecule3dStatus.textContent="PubChemの3D座標を使用しています。ドラッグで回転、ホイールで拡大できます。";
  molecule3dStatus.className="molecule3d-status";
  molecule3dSource.textContent="PUBCHEM CID "+record.cid;
 }catch(error){
  if(token!==molecule3dRequest)return;
  show3DFallback(c,error&&error.message?error.message:"3D模型を生成できませんでした。",token);
 }
}
function setMolecule3DMode(mode){
 if(!activeMolecule3D||typeof activeMolecule3D.setMode!=="function")return;
 activeMolecule3D.setMode(mode);
 molecule3dSpacefillButton.classList.toggle("is-active",mode==="spacefill");
 molecule3dBallstickButton.classList.toggle("is-active",mode==="ballstick");
}
function renderExternalCompound(c){
 if(!c.id)c.id="pubchem-"+String(c.pubchemCid||Date.now());
 c.kind="external";c.family=c.family||"PubChem";
 c.state=c.state||"—";c.structureSource="PubChem";
 renderCompound(c);
}
async function fetchCompound(query){
 var key=query.trim().toLocaleLowerCase();
 if(lookupCache[key])return lookupCache[key];
 var endpoint="https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"+encodeURIComponent(query.trim())+"/property/IUPACName,ConnectivitySMILES,InChIKey,MolecularFormula,MolecularWeight/JSON";
 var response=await fetch(endpoint,{headers:{Accept:"application/json"}});
 if(!response.ok)throw new Error(response.status===404?"化合物が見つかりません":"PubChemへの接続に失敗しました");
 var data=await response.json();
 var p=data&&data.PropertyTable&&data.PropertyTable.Properties&&data.PropertyTable.Properties[0];
 if(!p||!(p.ConnectivitySMILES||p.SMILES))throw new Error("構造データがありません");
 var existing=knownCompound(query);
 var c=existing||{
  id:"pubchem-"+String(p.CID||key.replace(/[^a-z0-9]+/gi,"-")),
  name:query,
  formula:p.MolecularFormula||"—",
  family:"PubChem",
  kind:"external",
  color:"#5f9c72",
  state:"—",
  feature:"",
  hint:"",
  desc:"",
  iupacName:p.IUPACName||null,
  pubchemName:query,
  smiles:p.ConnectivitySMILES||p.SMILES
 };
 c.pubchemCid=p.CID||c.pubchemCid||null;
 c.pubchemName=c.pubchemName||query;
 c.smiles=p.ConnectivitySMILES||p.SMILES;
 c.pubchemFormula=p.MolecularFormula||c.pubchemFormula||c.formula;
 c.molecularWeight=p.MolecularWeight||c.molecularWeight||null;
 c.inchiKey=p.InChIKey||c.inchiKey||null;
 c.iupacName=p.IUPACName||c.iupacName||null;
 c.structureSource="PubChem";
 lookupCache[key]=c;
 return c;
}
var structureRequest={};
async function resolveStructure(c){
 if(!c||!c.pubchemName||c.structureSource==="PubChem"||structureRequest[c.id])return;
 var token=(structureRequest[c.id]||0)+1;
 structureRequest[c.id]=token;
 try{
  var loaded=await fetchCompound(c.pubchemName);
  if(currentCompound&&currentCompound.id===c.id){
   c.smiles=loaded.smiles;c.pubchemCid=loaded.pubchemCid;c.pubchemFormula=loaded.pubchemFormula;
   c.molecularWeight=loaded.molecularWeight;c.inchiKey=loaded.inchiKey;c.iupacName=loaded.iupacName;c.structureSource="PubChem";
   renderCompound(c);
  }
 }catch(error){
  c.structureSource="fallback";
  if(currentCompound&&currentCompound.id===c.id){
   mainStructureSource.textContent="LOCAL STRUCTURE";
   mainPubchemLink.href=pubchemUrl(c);
  }
 }finally{
  delete structureRequest[c.id];
 }
}
async function searchCompound(){
 var query=input.value.trim();
 if(!query){setStatus("化合物名を入力してください","error");input.focus();return;}
 var sequence=++lookupSequence;
 var known=knownCompound(query);
 if(known){
  setLoading(false);setStatus("","");renderCompound(known);resolveStructure(known);return;
 }
 setLoading(true);setStatus("検索中","loading");
 try{
  var c=await fetchCompound(query);
  if(sequence!==lookupSequence)return;
  input.value=c.name;
  renderExternalCompound(c);
  setStatus("PubChemから取得","success");
 }catch(error){
  if(sequence!==lookupSequence)return;
  setStatus(error&&error.message?error.message:"化合物を取得できませんでした","error");
 }finally{
  if(sequence===lookupSequence)setLoading(false);
 }
}
function init(){
 fillSuggestions();renderSearchResults();
 document.getElementById("open-3d-model").addEventListener("click",open3DMolecule);
 document.getElementById("molecule3d-close").addEventListener("click",function(){molecule3dRequest++;if(activeMolecule3D&&activeMolecule3D.dispose)activeMolecule3D.dispose();activeMolecule3D=null;molecule3dDialog.close();});
 document.getElementById("molecule3d-spacefill").addEventListener("click",function(){setMolecule3DMode("spacefill");});
 document.getElementById("molecule3d-ballstick").addEventListener("click",function(){setMolecule3DMode("ballstick");});
 molecule3dDialog.addEventListener("click",function(event){if(event.target===molecule3dDialog){molecule3dRequest++;if(activeMolecule3D&&activeMolecule3D.dispose)activeMolecule3D.dispose();activeMolecule3D=null;molecule3dDialog.close();}});
 molecule3dDialog.addEventListener("close",function(){molecule3dRequest++;if(activeMolecule3D&&activeMolecule3D.dispose)activeMolecule3D.dispose();activeMolecule3D=null;});
 document.getElementById("search-form").addEventListener("submit",function(ev){ev.preventDefault();searchCompound();});
 input.addEventListener("input",function(){
  if(!input.value.trim())setStatus("","");
 });
 document.getElementById("clear-search").addEventListener("click",function(){
  input.value="";setStatus("","");input.focus();
 });
 document.getElementById("home-link").addEventListener("click",function(ev){
  ev.preventDefault();input.value="エタノール";renderCompound(byId.ethanol);resolveStructure(byId.ethanol);setStatus("","");
 });
 document.getElementById("starter-compounds").querySelectorAll("[data-preset]").forEach(function(btn){
  btn.addEventListener("click",function(){
   var c=byId[btn.getAttribute("data-preset")];
   if(c){input.value=c.name;renderCompound(c);resolveStructure(c);setStatus("","");}
  });
 });
 var params=new URLSearchParams(window.location.search);
 var requested=params.get("compound");
 var initial=byId[requested]||byName[String(requested||"").toLocaleLowerCase()]||byId.ethanol||compounds[0];
 input.value=initial.name;renderCompound(initial);resolveStructure(initial);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();