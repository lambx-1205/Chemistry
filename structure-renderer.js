(function(global){
"use strict";
var rdkit=null,rdkitPromise=null,svgCache=Object.create(null);
function getRDKit(){
 if(rdkit)return Promise.resolve(rdkit);
 if(rdkitPromise)return rdkitPromise;
 if(typeof global.initRDKitModule!=="function")return Promise.reject(new Error("RDKit.jsを読み込めません"));
 rdkitPromise=global.initRDKitModule({
  locateFile:function(file){return "https://unpkg.com/@rdkit/rdkit/dist/"+file;}
 }).then(function(module){
  if(!module||typeof module.get_mol!=="function")throw new Error("RDKitの初期化に失敗しました");
  rdkit=module;return module;
 }).catch(function(error){rdkitPromise=null;throw error;});
 return rdkitPromise;
}
var atomicMass={H:1.008,C:12.011,N:14.007,O:15.999,F:18.998,Na:22.990,Mg:24.305,P:30.974,S:32.06,Cl:35.45,K:39.098,Ca:40.078,Fe:55.845,Br:79.904,I:126.904};
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
function drawOptions(compound){
 var parsed=parseFormula(compound.formula),atomCount=parsed?parsed.atoms:null;
 if(atomCount===null)return {bondLineWidth:1.4,scaleBondWidth:true,multipleBondOffset:0.15,padding:0.035,annotationFontScale:0.62};
 if(atomCount<=18)return {bondLineWidth:1.65,scaleBondWidth:true,multipleBondOffset:0.17,padding:0.055,minFontSize:8,maxFontSize:18,annotationFontScale:0.62};
 if(atomCount<=35)return {bondLineWidth:1.45,scaleBondWidth:true,multipleBondOffset:0.14,padding:0.035,minFontSize:7,maxFontSize:14,annotationFontScale:0.56};
 return {bondLineWidth:1.2,scaleBondWidth:true,multipleBondOffset:0.1,padding:0.02,minFontSize:6,maxFontSize:10,annotationFontScale:0.5};
}
function renderSvg(compound){
 if(!compound||!compound.smiles)return Promise.reject(new Error("構造データがありません"));
 var key=String(compound.id||compound.smiles);
 if(svgCache[key])return Promise.resolve(svgCache[key]);
 return getRDKit().then(function(module){
  var mol=null;
  try{
   mol=module.get_mol(compound.smiles);
   if(!mol)throw new Error("SMILESを読み取れません");
   var svg=mol.get_svg_with_highlights(JSON.stringify(drawOptions(compound)));
   if(!svg||!/<svg[\s>]/i.test(svg))throw new Error("SVGが空です");
   svgCache[key]=svg;
   return svg;
  }finally{if(mol&&typeof mol.delete==="function")mol.delete();}
 });
}
function mount(compound,host){
 return renderSvg(compound).then(function(svg){
  if(!host)return svg;
  host.innerHTML=svg;
  var element=host.querySelector("svg");
  if(element){
   element.setAttribute("aria-hidden","true");
   element.setAttribute("preserveAspectRatio","xMidYMid meet");
  }
  return svg;
 });
}
global.OrganicAtlasStructureRenderer={renderSvg:renderSvg,mount:mount,drawOptions:drawOptions};
})(window);
