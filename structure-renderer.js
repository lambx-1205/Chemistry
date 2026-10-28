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
function atomCount(compound){
 var formula=String(compound&&compound.formula||"")
  .replace(/[₀₁₂₃₄₅₆₇₈₉]/g,function(d){return "₀₁₂₃₄₅₆₇₈₉".indexOf(d);})
  .replace(/\s/g,"");
 if(!formula||/[()n]/.test(formula))return null;
 var tokens=formula.match(/[A-Z][a-z]?\d*/g)||[];
 if(tokens.join("")!==formula)return null;
 var atoms=0;
 for(var i=0;i<tokens.length;i++){
  var match=tokens[i].match(/^([A-Z][a-z]?)(\d*)$/);
  if(!match)return null;
  atoms+=match[2]?Number(match[2]):1;
 }
 return atoms;
}
function drawOptions(compound){
 var count=atomCount(compound);
 if(count===null)return {bondLineWidth:1.4,scaleBondWidth:true,multipleBondOffset:0.15,padding:0.035,annotationFontScale:0.62};
 if(count<=18)return {bondLineWidth:1.65,scaleBondWidth:true,multipleBondOffset:0.17,padding:0.055,minFontSize:8,maxFontSize:18,annotationFontScale:0.62};
 if(count<=35)return {bondLineWidth:1.45,scaleBondWidth:true,multipleBondOffset:0.14,padding:0.035,minFontSize:7,maxFontSize:14,annotationFontScale:0.56};
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
