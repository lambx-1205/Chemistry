(function(){
"use strict";
var compounds = [
{id:"ethane",pubchemName:"ethane",smiles:"CC",name:"エタン",formula:"C₂H₆",family:"炭化水素",kind:"aliphatic",color:"#7b9fa8",desc:"アルカンに属する飽和炭化水素。置換反応によってハロゲン化アルキルへつながる。",state:"気体",feature:"置換反応",hint:"炭素間の単結合のみ"},
{id:"chloroethane",pubchemName:"chloroethane",smiles:"CCCl",name:"クロロエタン",formula:"C₂H₅Cl",family:"ハロゲン化合物",kind:"aliphatic",color:"#d1a15b",desc:"ハロゲン化アルキルの一種。水酸化ナトリウム水溶液などとの反応でアルコールへ変換できる。",state:"常温で気体に近い揮発性物質",feature:"加水分解・置換",hint:"C–Cl結合をもつ"},
{id:"ethanol",pubchemName:"ethanol",smiles:"CCO",name:"エタノール",formula:"C₂H₆O",family:"アルコール",kind:"aliphatic",color:"#5f9c72",desc:"代表的な第一級アルコール。脱水でエテンに、酸化でアセトアルデヒドを経て酢酸へつながる。",state:"常温で液体",feature:"脱水・酸化",hint:"ヒドロキシ基 −OH"},
{id:"ethene",pubchemName:"ethene",smiles:"C=C",name:"エテン",formula:"C₂H₄",family:"アルケン",kind:"aliphatic",color:"#6499ad",desc:"二重結合をもつ不飽和炭化水素。付加反応、水和、付加重合などの出発物質になる。",state:"気体",feature:"付加・重合",hint:"炭素間の二重結合"},
{id:"dibromoethane",pubchemName:"1,2-dibromoethane",smiles:"BrCCBr",name:"1,2-ジブロモエタン",formula:"C₂H₄Br₂",family:"ハロゲン化合物",kind:"aliphatic",color:"#d1a15b",desc:"エテンの二重結合に臭素が付加してできる化合物。付加反応の代表例として扱う。",state:"常温で液体",feature:"付加反応",hint:"隣接する炭素にBr"},
{id:"polyethylene",pubchemName:null,smiles:"CC",name:"ポリエチレン",formula:"(C₂H₄)ₙ",family:"高分子化合物",kind:"aliphatic",color:"#8799a9",desc:"エテンを付加重合して得られる合成高分子。小さな分子が繰り返し単位をつくる。",state:"固体",feature:"付加重合",hint:"繰り返し構造をもつ"},
{id:"acetaldehyde",pubchemName:"acetaldehyde",smiles:"CC=O",name:"アセトアルデヒド",formula:"C₂H₄O",family:"アルデヒド",kind:"aliphatic",color:"#c58b62",desc:"エタノールなどの第一級アルコールの酸化で得られるアルデヒド。さらに酸化するとカルボン酸になる。",state:"常温で揮発性の液体",feature:"酸化",hint:"アルデヒド基 −CHO"},
{id:"acetic-acid",pubchemName:"acetic acid",smiles:"CC(=O)O",name:"酢酸",formula:"C₂H₄O₂",family:"カルボン酸",kind:"aliphatic",color:"#bd8075",desc:"代表的なカルボン酸。アルコールとのエステル化でエステルをつくる。",state:"常温で液体",feature:"酸性・エステル化",hint:"カルボキシ基 −COOH"},
{id:"ethyl-acetate",pubchemName:"ethyl acetate",smiles:"CCOC(C)=O",name:"酢酸エチル",formula:"C₄H₈O₂",family:"エステル",kind:"aliphatic",color:"#9b8bb7",desc:"酢酸とエタノールのエステル化で生成するエステル。加水分解するとカルボン酸とアルコールに戻る。",state:"常温で液体",feature:"エステル化・加水分解",hint:"−COO−結合をもつ"},
{id:"benzene",pubchemName:"benzene",smiles:"c1ccccc1",name:"ベンゼン",formula:"C₆H₆",family:"芳香族炭化水素",kind:"aromatic",color:"#639b9a",desc:"芳香族化合物の基本となる環状構造。代表的な反応は付加よりも置換反応である。",state:"常温で液体",feature:"芳香族置換",hint:"六員環の共役構造"},
{id:"nitrobenzene",pubchemName:"nitrobenzene",smiles:"O=[N+]([O-])c1ccccc1",name:"ニトロベンゼン",formula:"C₆H₅NO₂",family:"芳香族ニトロ化合物",kind:"aromatic",color:"#b8899c",desc:"ベンゼンのニトロ化で得られる化合物。ニトロ基を還元するとアミノ基をもつ化合物になる。",state:"常温で液体",feature:"還元",hint:"ニトロ基 −NO₂"},
{id:"aniline",pubchemName:"aniline",smiles:"Nc1ccccc1",name:"フェニルアミン",formula:"C₆H₇N",family:"芳香族アミン",kind:"aromatic",color:"#b8899c",desc:"アニリンとも呼ばれる芳香族アミン。ジアゾ化反応を経て、さまざまな芳香族化合物へつながる。",state:"常温で液体",feature:"ジアゾ化",hint:"アミノ基 −NH₂"},
{id:"diazonium",pubchemName:"benzenediazonium chloride",smiles:"c1ccccc1[N+]#N",name:"塩化ベンゼンジアゾニウム",formula:"C₆H₅N₂Cl",family:"ジアゾニウム塩",kind:"aromatic",color:"#9c8bb8",desc:"芳香族第一級アミンのジアゾ化で生じる中間体。加水分解などで別の官能基へ変換できる。",state:"水溶液中で扱う中間体",feature:"ジアゾ化・置換",hint:"ジアゾ基 −N₂⁺"},
{id:"phenol",pubchemName:"phenol",smiles:"Oc1ccccc1",name:"フェノール",formula:"C₆H₆O",family:"芳香族ヒドロキシ化合物",kind:"aromatic",color:"#689b83",desc:"ベンゼン環にヒドロキシ基が直接結合した化合物。アルコールとは異なる弱い酸性を示す。",state:"常温で固体",feature:"弱酸性",hint:"環に直接結合した−OH"},
{id:"chlorobenzene",pubchemName:"chlorobenzene",smiles:"Clc1ccccc1",name:"クロロベンゼン",formula:"C₆H₅Cl",family:"ハロゲン化芳香族",kind:"aromatic",color:"#c49b64",desc:"ベンゼンの置換反応や、ジアゾニウム塩を経る変換で得られる芳香族ハロゲン化物。",state:"常温で液体",feature:"芳香族置換",hint:"芳香環にCl"}
];
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
compounds.forEach(function(c){byId[c.id]=c;byName[c.name.toLocaleLowerCase()]=c;if(c.pubchemName)byName[c.pubchemName.toLocaleLowerCase()]=c;});
var currentCompound=null,lookupSequence=0,structureSequence=0;
var input=document.getElementById("compound-search");
var searchButton=document.getElementById("search-button");
var suggestions=document.getElementById("compound-options");
var status=document.getElementById("search-status");
var mainStructure=document.getElementById("main-structure");
var mainPubchemLink=document.getElementById("pubchem-link");
var mainStructureSource=document.getElementById("structure-source");
var resultRoot=document.getElementById("compound-content");
var adjacentRoot=document.getElementById("one-step-results");
var adjacentCount=document.getElementById("one-step-count");
var lookupCache={};
function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function formulaHtml(value){return esc(value||"—").replace(/([0-9]+)/g,"<sub>$1</sub>");}
function pubchemUrl(c){return c.pubchemCid?"https://pubchem.ncbi.nlm.nih.gov/compound/"+encodeURIComponent(c.pubchemCid):"https://pubchem.ncbi.nlm.nih.gov/#query="+encodeURIComponent(c.pubchemName||c.name);}
function knownCompound(query){
 var q=String(query||"").trim().toLocaleLowerCase();
 if(!q)return null;
 if(byName[q])return byName[q];
 return compounds.find(function(c){return c.formula.toLocaleLowerCase()===q||c.id.toLocaleLowerCase()===q;})||null;
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
  [c.name,c.pubchemName].forEach(function(v){
   if(v&&!seen[v.toLocaleLowerCase()]){seen[v.toLocaleLowerCase()]=true;values.push(v);}
  });
 });
 suggestions.innerHTML=values.map(function(v){return '<option value="'+esc(v)+'"></option>';}).join("");
}
var rdkitInstance=null;
var rdkitInitPromise=null;
function getRDKit(){
 if(rdkitInstance)return Promise.resolve(rdkitInstance);
 if(typeof window.initRDKitModule!=="function")return Promise.reject(new Error("RDKit loader is unavailable"));
 if(!rdkitInitPromise){
  rdkitInitPromise=window.initRDKitModule({
   locateFile:function(file){
    return "https://unpkg.com/@rdkit/rdkit@2026.9.1/dist/"+file;
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
function renderWithSmilesDrawer(target,smilesValue,width,height,renderKey){
 if(!target||!target.isConnected||target.dataset.structureKey!==renderKey)return false;
 if(!window.SmilesDrawer||!window.SmilesDrawer.SmiDrawer){
  target.innerHTML='<span class="structure-error">構造式ライブラリを読み込めません</span>';
  return false;
 }
 try{
  target.innerHTML='<svg class="fallback-structure-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+(target.getAttribute("aria-label")||"化学構造式")+'"></svg>';
  var output=target.querySelector("svg");
  var drawer=new window.SmilesDrawer.SmiDrawer({
   width:width,
   height:height,
   padding:Math.max(6,Math.round(width*.035)),
   bondLength:width>260?26:18,
   bondThickness:1.35,
   bondSpacing:3,
   fontSizeLarge:9,
   fontSizeSmall:5,
   compactDrawing:true,
   explicitHydrogens:false,
   terminalCarbons:false
  });
  drawer.draw(smilesValue,output,"light",function(){
   if(target.dataset.structureKey===renderKey)target.dataset.renderEngine="smiles-drawer";
  },function(error){
   if(target.dataset.structureKey===renderKey){
    target.innerHTML='<span class="structure-error">この構造式を描画できません</span>';
   }
   console.error("SmilesDrawer rendering failed:",error||"unknown error");
  });
  return true;
 }catch(error){
  if(target.dataset.structureKey===renderKey)target.innerHTML='<span class="structure-error">構造式を描画できません</span>';
  console.error("SmilesDrawer fallback failed:",error&&error.message?error.message:error);
  return false;
 }
}
function drawStructure(target,smilesValue,width,height,key){
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
   var details={
    width:width,
    height:height,
    padding:8,
    bondLineWidth:1.6,
    explicitMethyl:true,
    clearBackground:true,
    centreMoleculesBeforeDrawing:true
   };
   var markup=mol.get_svg(JSON.stringify(details));
   if(!markup||!/<svg[\s>]/i.test(markup)||!/<path[\s>]/i.test(markup)){
    throw new Error("RDKit returned an empty drawing");
   }
   if(target.dataset.structureKey!==renderKey)return;
   target.innerHTML=markup;
   var output=target.querySelector("svg");
   if(!output)throw new Error("RDKit SVG element missing");
   output.setAttribute("role","img");
   output.setAttribute("aria-label",target.getAttribute("aria-label")||"化学構造式");
   output.setAttribute("preserveAspectRatio","xMidYMid meet");
   output.style.width="100%";
   output.style.height="100%";
   output.style.display="block";
   target.dataset.renderEngine="rdkit";
  }catch(error){
   console.warn("RDKit render failed; using SmilesDrawer fallback:",error&&error.message?error.message:error);
   renderWithSmilesDrawer(target,smilesValue,width,height,renderKey);
  }finally{
   if(mol&&typeof mol.delete==="function")mol.delete();
  }
 }).catch(function(error){
  console.warn("RDKit initialization failed; using SmilesDrawer fallback:",error&&error.message?error.message:error);
  renderWithSmilesDrawer(target,smilesValue,width,height,renderKey);
 });
}
function renderSearchResults(){
 var optionCount=compounds.length;
 document.getElementById("local-count").textContent=String(optionCount).padStart(2,"0");
}
function fact(label,value){
 return '<div class="fact"><span class="fact-label">'+esc(label)+'</span><span class="fact-value">'+esc(value||"—")+'</span></div>';
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
 drawStructure(mainStructure,c.smiles,440,270,"main-"+c.id+"-"+c.smiles);
 mainPubchemLink.href=pubchemUrl(c);
 mainPubchemLink.setAttribute("aria-label",c.name+"をPubChemで開く");
 mainStructureSource.textContent=c.structureSource==="PubChem"?"PUBCHEM":c.structureSource==="fallback"?"LOCAL STRUCTURE":"STRUCTURE";
 document.getElementById("compound-facts").innerHTML=
  fact("分類",c.family||"—")+
  fact("分子量",c.molecularWeight?(Number(c.molecularWeight).toFixed(2)+" g/mol"):"—")+
  fact("状態",c.state||"—")+
  fact("InChIKey",c.inchiKey||"—");
 renderOneStep(c);
}
function renderOneStep(c){
 var outgoing=edges.filter(function(e){return e.from===c.id;});
 adjacentCount.textContent=String(outgoing.length).padStart(2,"0");
 if(!outgoing.length){
  adjacentRoot.innerHTML='<div class="no-reactions"><span class="no-reactions-mark">∅</span><span>登録された1段階反応はありません</span></div>';
  return;
 }
 adjacentRoot.innerHTML=outgoing.map(function(e){
  var target=byId[e.to];
  if(!target)return "";
  return '<button class="reaction-card" type="button" data-compound="'+esc(target.id)+'">'+
   '<span class="reaction-card-top"><span class="reaction-kind">'+esc(e.name)+'</span><span class="reaction-arrow" aria-hidden="true">↗</span></span>'+
   '<span class="reaction-structure"><span class="small-structure" data-small-structure="'+esc(target.id)+'" role="img" aria-label="'+esc(target.name)+'の構造式"></span></span>'+
   '<span class="reaction-compound-name">'+esc(target.name)+'</span>'+
   '<span class="reaction-compound-formula">'+formulaHtml(target.pubchemFormula||target.formula)+'</span>'+
   '<span class="reaction-condition">'+esc(e.condition||"")+'</span>'+
  '</button>';
 }).join("");
 adjacentRoot.querySelectorAll(".reaction-card").forEach(function(card){
  card.addEventListener("click",function(){
   var target=byId[card.getAttribute("data-compound")];
   if(target){input.value=target.name;renderCompound(target);setStatus("", "");window.scrollTo({top:0,behavior:"smooth"});resolveStructure(target);}
  });
 });
 adjacentRoot.querySelectorAll(".small-structure").forEach(function(svg){
  var target=byId[svg.getAttribute("data-small-structure")];
  if(target)drawStructure(svg,target.smiles,220,108,"small-"+target.id+"-"+target.smiles);
 });
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
 var initial=byId.ethanol||compounds[0];
 input.value=initial.name;renderCompound(initial);resolveStructure(initial);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();