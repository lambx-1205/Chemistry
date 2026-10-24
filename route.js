(() => {
"use strict";
const data=window.OrganicAtlasData;
if(!data){const status=document.getElementById("route-search-status");if(status)status.textContent="化合物データを読み込めませんでした。ページを再読み込みしてください。";return;}
const compounds=data.compounds||[],edges=data.edges||[];
const byId=Object.create(null),byName=Object.create(null),adj=Object.create(null);
compounds.forEach(c=>{
 byId[c.id]=c;adj[c.id]=[];
 [c.name,c.id,c.pubchemName,...(c.aliases||[])].filter(Boolean).forEach(label=>byName[String(label).trim().toLocaleLowerCase()]=c);
});
edges.forEach(edge=>{if(adj[edge.from]&&adj[edge.to])adj[edge.from].push(edge);});
const equations = {
  e1:"C₂H₆ + Cl₂ → C₂H₅Cl + HCl",
  e2:"C₂H₅Cl + NaOH → C₂H₅OH + NaCl",
  e3:"C₂H₅OH → C₂H₄ + H₂O",
  e4:"C₂H₄ + H₂O → C₂H₅OH",
  e5:"C₂H₄ + H₂ → C₂H₆",
  e6:"C₂H₄ + Br₂ → C₂H₄Br₂",
  e7:"nCH₂=CH₂ → (−CH₂−CH₂−)ₙ",
  e8:"C₂H₅OH + [O] → CH₃CHO + H₂O",
  e9:"CH₃CHO + [O] → CH₃COOH",
  e10:"CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O",
  e11:"CH₃COOC₂H₅ + H₂O → CH₃COOH + C₂H₅OH",
  e12:"C₆H₆ + HNO₃ → C₆H₅NO₂ + H₂O",
  e13:"C₆H₆ + Cl₂ → C₆H₅Cl + HCl",
  e14:"C₆H₅NO₂ + 3H₂ → C₆H₅NH₂ + 2H₂O",
  e15:"C₆H₅NH₂ + NaNO₂ + 2HCl → C₆H₅N₂Cl + NaCl + 2H₂O",
  e16:"C₆H₅N₂Cl + H₂O → C₆H₆O + N₂ + HCl",
  e17:"C₆H₅N₂Cl → C₆H₅Cl + N₂",
  e18:"CH₄ + Cl₂ → CH₃Cl + HCl",
  e19:"CH₃Cl + NaOH → CH₃OH + NaCl",
  e20:"CH₃OH + [O] → HCHO + H₂O",
  e21:"HCHO + [O] → HCOOH",
  e22:"C₂H₂ + H₂ → C₂H₄",
  e23:"C₂H₂ + 2H₂ → C₂H₆",
  e24:"C₃H₆ + H₂ → C₃H₈",
  e25:"C₃H₆ + Br₂ → C₃H₆Br₂",
  e26:"C₃H₆ + H₂O → C₃H₈O",
  e27:"C₃H₈O + [O] → C₃H₆O + H₂O",
  e28:"C₃H₈O + [O] → C₃H₆O + H₂O",
  e29:"C₃H₆O + [O] → C₃H₆O₂",
  e30:"CH₃COOH + CH₃OH ⇌ CH₃COOCH₃ + H₂O",
  e31:"C₆H₆ + CH₃Cl → C₇H₈ + HCl",
  e32:"C₇H₈ + 3[O] → C₇H₆O₂ + H₂O",
  e33:"C₆H₅COOH + CH₃OH ⇌ C₆H₅COOCH₃ + H₂O",
  e34:"C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂",
  e35:"C₆H₆ + C₂H₅Cl → C₈H₁₀ + HCl",
  e36:"C₈H₁₀ → C₈H₈ + H₂",
  e37:"nC₈H₈ → (C₈H₈)ₙ",
  e38:"C₆H₆ + H₂SO₄ → C₆H₅SO₃H + H₂O",
  e39:"C₆H₅SO₃H + NaOH → C₆H₅SO₃Na + H₂O",
  e40:"C₇H₈ + CH₃Cl → C₈H₁₀ + HCl",
  e41:"C₇H₈ + CH₃Cl → C₈H₁₀ + HCl",
  e42:"C₇H₈ + CH₃Cl → C₈H₁₀ + HCl",
  e43:"C₈H₁₀ + 6[O] → C₈H₆O₄ + 2H₂O",
  e44:"C₈H₁₀ + 6[O] → C₈H₆O₄ + 2H₂O",
  e45:"C₈H₁₀ + 6[O] → C₈H₆O₄ + 2H₂O",
  e46:"C₈H₆O₄ → C₈H₄O₃ + H₂O",
  e47:"C₇H₈ + 2[O] → C₇H₆O + H₂O",
  e48:"C₇H₆O + H₂ → C₇H₈O",
  e49:"C₇H₆O + HNO₃ → C₇H₅NO₃ + H₂O",
  e50:"C₉H₁₂ + O₂ → C₉H₁₂O₂",
  e51:"C₉H₁₂O₂ → C₆H₆O + C₃H₆O",
  e52:"C₉H₁₂O₂ → C₆H₆O + C₃H₆O",
  e53:"C₆H₆O + NaOH → C₆H₅ONa + H₂O",
  e54:"C₆H₇N + HCl → C₆H₈ClN",
  e55:"C₆H₇N + (CH₃CO)₂O → C₈H₉NO + CH₃COOH",
  e56:"C₆H₇N + H₂SO₄ → C₆H₇NO₃S + H₂O",
  e57:"C₆H₇N + 2CH₃Cl → C₈H₁₁N + 2HCl",
  e58:"C₆H₅N₂Cl + C₆H₆O → C₁₂H₁₀N₂O + HCl",
  e59:"Ar–H + HNO₃ → Ar–NO₂ + H₂O（芳香族ニトロ化の一般式）",
  e60:"C₆H₅SO₃Na + 2NaOH → C₆H₅ONa + Na₂SO₃ + H₂O",
  e61:"C₁₈H₃₄O₂ + H₂ → C₁₈H₃₆O₂",
  e62:"C₁₈H₃₂O₂ + H₂ → C₁₈H₃₄O₂",
  e63:"C₁₈H₃₀O₂ + H₂ → C₁₈H₃₂O₂",
  e64:"C₁₈H₃₂O₂ + 2H₂ → C₁₈H₃₆O₂",
  e65:"C₁₈H₃₀O₂ + 3H₂ → C₁₈H₃₆O₂",
  e66:"C₂₀H₃₂O₂ + 4H₂ → C₂₀H₄₀O₂",
  e74:"C₃H₈O₃ + 3C₁₈H₃₆O₂ ⇌ C₅₇H₁₁₀O₆ + 3H₂O",
  e75:"C₃H₈O₃ + 3C₁₈H₃₄O₂ ⇌ C₅₇H₁₀₄O₆ + 3H₂O",
  e76:"C₁₈H₃₆O₂ + NaOH → C₁₈H₃₅NaO₂ + H₂O",
  e77:"C₁₈H₃₄O₂ + NaOH → C₁₈H₃₃NaO₂ + H₂O",
  e78:"C₁₆H₃₂O₂ + NaOH → C₁₆H₃₁NaO₂ + H₂O",
  e79:"C₁₈H₃₆O₂ + CH₃OH ⇌ C₁₉H₃₈O₂ + H₂O",
  e80:"C₅₇H₁₁₀O₆ + 3NaOH → C₃H₈O₃ + 3C₁₈H₃₅NaO₂",
  e81:"C₆H₆ + CH₂=CHCH₃ → C₆H₅CH(CH₃)₂",
  e82:"C₆H₅Cl + NaOH → C₆H₅OH + NaCl",
  e83:"C₆H₆O + Zn → C₆H₆ + ZnO",
  e84:"C₆H₅N₂Cl + H₃PO₂ + H₂O → C₆H₆ + N₂ + H₃PO₃ + HCl",
  e85:"C₁₂H₂₂O₁₁ + H₂O → C₆H₁₂O₆ + C₆H₁₂O₆",
  e86:"C₁₂H₂₂O₁₁ + H₂O → C₆H₁₂O₆ + C₆H₁₂O₆",
  e87:"C₁₂H₂₂O₁₁ + H₂O → 2C₆H₁₂O₆",
  e88:"C₁₂H₂₂O₁₁ + H₂O → C₆H₁₂O₆ + C₆H₁₂O₆",
  e89:"C₁₂H₂₂O₁₁ + H₂O → C₆H₁₂O₆ + C₆H₁₂O₆",
  e90:"(C₆H₁₀O₅)ₙ + nH₂O → nC₆H₁₂O₆",
  e91:"(C₆H₁₀O₅)ₙ + nH₂O → nC₆H₁₂O₆",
  e92:"nCH₂=CHCH₃ → [−CH₂−CH(CH₃)−]ₙ",
  e93:"nCH₂=CHCl → [−CH₂−CHCl−]ₙ",
  e94:"nCF₂=CF₂ → [−CF₂−CF₂−]ₙ",
  e95:"nCH₂=CHOCOCH₃ → [−CH₂−CH(OCOCH₃)−]ₙ",
  e96:"[−CH₂−CH(OCOCH₃)−]ₙ → [−CH₂−CH(OH)−]ₙ",
  e97:"nCH₂=CHCN → [−CH₂−CH(CN)−]ₙ",
  e98:"エチレングリコール＋テレフタル酸 → PET",
  e99:"エチレングリコール＋テレフタル酸 → PET",
  e100:"ヘキサメチレンジアミン＋アジピン酸 → ナイロン66",
  e101:"ヘキサメチレンジアミン＋アジピン酸 → ナイロン66",
  e102:"nC₅H₈ → [−CH₂−C(CH₃)=CH−CH₂−]ₙ",
  e103:"nCH₂=CH−CH=CH₂ → [−CH₂−CH=CH−CH₂−]ₙ",
  e104:"CH₂=CHOH ⇌ CH₃CHO",
  e105:"CH₂=C(OH)CH₃ ⇌ CH₃COCH₃",
  e106:"CH₃C(OH)=CHCH₃ ⇌ CH₃COCH₂CH₃"
};
const form=document.getElementById("route-search-form");
const startInput=document.getElementById("route-start");
const endInput=document.getElementById("route-end");
const datalist=document.getElementById("route-compound-options");
const status=document.getElementById("route-search-status");
const results=document.getElementById("route-results");
const timeline=document.getElementById("route-timeline");
const emptyState=document.getElementById("route-empty-state");
const submit=document.getElementById("route-search-submit");
const dialog=document.getElementById("route-reaction-dialog");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
compounds.forEach(c=>{const option=document.createElement("option");option.value=c.name;option.label=c.formula||c.family||c.id;datalist.appendChild(option);});
function resolveCompound(raw){
 const query=String(raw||"").trim().toLocaleLowerCase();
 if(!query)return null;
 if(byName[query])return byName[query];
 const exact=compounds.filter(c=>[c.name,c.id,c.pubchemName,...(c.aliases||[])].filter(Boolean).some(v=>String(v).trim().toLocaleLowerCase()===query));
 if(exact.length===1)return exact[0];
 const partial=compounds.filter(c=>[c.name,c.id,c.pubchemName,...(c.aliases||[])].filter(Boolean).some(v=>String(v).toLocaleLowerCase().includes(query)));
 return partial.length===1?partial[0]:null;
}
function shortestPath(startId,endId){
 if(startId===endId)return {compounds:[byId[startId]],edges:[]};
 const queue=[startId],seen=new Set([startId]),previous=Object.create(null);
 let found=false;
 for(let head=0;head<queue.length&&!found;head++){
  const id=queue[head];
  for(const edge of adj[id]||[]){
   if(seen.has(edge.to))continue;
   seen.add(edge.to);previous[edge.to]={from:id,edge};queue.push(edge.to);
   if(edge.to===endId){found=true;break;}
  }
 }
 if(!seen.has(endId))return null;
 const pathEdges=[];let cursor=endId;
 while(cursor!==startId){
  const step=previous[cursor];if(!step)return null;
  pathEdges.push(step.edge);cursor=step.from;
 }
 pathEdges.reverse();
 return {compounds:[byId[startId],...pathEdges.map(edge=>byId[edge.to])],edges:pathEdges};
}
function setStatus(text,type){
 status.textContent=text;status.className="route-search-status"+(type?" "+type:"");
}
function setHidden(el,value){el.hidden=!!value;}
function renderSearch(path,start,end){
 timeline.replaceChildren();
 const n=path.compounds.length;
 document.getElementById("route-results-title").textContent=start.name+" → "+end.name;
 document.getElementById("route-results-subtitle").textContent=n===1?"始点と終点が同じ化合物です。反応段階はありません。":"登録済みの反応データから、"+path.edges.length+"段階の最短経路が見つかりました。";
 document.getElementById("route-results-count").textContent=path.edges.length+"段階 · "+n+"化合物";
 path.compounds.forEach((compound,index)=>{
  const stage=document.createElement("article");stage.className="route-stage";stage.dataset.compoundId=compound.id;
  const rail=document.createElement("div");rail.className="route-stage-rail";
  const circle=document.createElement("span");circle.className="route-stage-index";circle.textContent=String(index+1).padStart(2,"0");
  const mini=document.createElement("span");mini.className="route-stage-mini";mini.textContent=index===0?"START":index===n-1?"GOAL":"COMPOUND";
  rail.append(circle,mini);
  const main=document.createElement("div");main.className="route-stage-main";
  const structure=document.createElement("div");structure.className="route-stage-structure";structure.dataset.routeStructureId=compound.id;structure.setAttribute("role","img");structure.setAttribute("aria-label",compound.name+"の構造式");
  const info=document.createElement("div");info.className="route-stage-info";
  const role=document.createElement("span");role.className="route-stage-role";role.textContent=index===0?"出発物質":index===n-1?"目的物":"中間体";
  const name=document.createElement("h3");name.className="route-stage-name";name.textContent=compound.name;
  const meta=document.createElement("div");meta.className="route-stage-meta";
  if(compound.formula){const formula=document.createElement("strong");formula.textContent=compound.formula;meta.appendChild(formula);}
  if(compound.family){const family=document.createElement("span");family.textContent=compound.family;meta.appendChild(family);}
  info.append(role,name,meta);main.append(structure,info);
  const side=document.createElement("aside");side.className="route-stage-side";
  const sideLabel=document.createElement("span");sideLabel.className="route-stage-side-label";sideLabel.textContent=index===0?"経路の始点":index===n-1?"経路の終点":"反応後の化合物";
  const sideValue=document.createElement("strong");sideValue.className="route-stage-side-value";sideValue.textContent=index===0?"START":index===n-1?"GOAL":"STEP "+index;
  side.append(sideLabel,sideValue);stage.append(rail,main,side);timeline.appendChild(stage);
  if(index<path.edges.length){
   const edge=path.edges[index],next=path.compounds[index+1];
   const connection=document.createElement("section");connection.className="route-reaction-step";
   const connectionRail=document.createElement("div");connectionRail.className="route-reaction-rail";
   const down=document.createElement("span");down.className="route-reaction-arrow";down.textContent="↓";
   const number=document.createElement("span");number.className="route-reaction-step-number";number.textContent="RXN "+String(index+1).padStart(2,"0");
   connectionRail.append(down,number);
   const card=document.createElement("div");card.className="route-reaction-card";
   const reactionMain=document.createElement("div");reactionMain.className="route-reaction-main";
   const kicker=document.createElement("div");kicker.className="route-reaction-kicker";kicker.textContent="反応 "+String(index+1).padStart(2,"0")+" · "+reactionTypeLabel(edge.type);
   const title=document.createElement("h4");title.className="route-reaction-title";title.textContent=edge.name||edge.label||"反応";
   const route=document.createElement("div");route.className="route-reaction-route";route.textContent=compound.name+" → "+next.name;
   reactionMain.append(kicker,title,route);
   const condition=document.createElement("div");condition.className="route-reaction-condition";
   const conditionLabel=document.createElement("span");conditionLabel.className="route-reaction-condition-label";conditionLabel.textContent="使用試薬・反応条件";
   const conditionValue=document.createElement("div");conditionValue.className="route-reaction-condition-value";conditionValue.textContent=edge.condition||"条件未登録";
   condition.append(conditionLabel,conditionValue);
   const open=document.createElement("button");open.className="route-reaction-open";open.type="button";open.textContent="詳細を見る ↗";open.addEventListener("click",()=>openReaction(edge));
   card.append(reactionMain,condition,open);connection.append(connectionRail,card);timeline.appendChild(connection);
  }
 });
 setHidden(results,false);setHidden(emptyState,true);
 renderStructures();
}
function reactionTypeLabel(type){
 const labels={substitution:"置換",addition:"付加",oxidation:"酸化",reduction:"還元",elimination:"脱離",polymerization:"重合",other:"その他"};
 return labels[type]||"反応";
}
function runSearch(event){
 if(event)event.preventDefault();
 const start=resolveCompound(startInput.value),end=resolveCompound(endInput.value);
 if(!start||!end){
  setStatus("化合物名を一覧から選ぶか、登録されている正式名称を入力してください。","error");
  setHidden(results,true);setHidden(emptyState,false);return;
 }
 startInput.value=start.name;endInput.value=end.name;
 if(start.id===end.id){
  renderSearch({compounds:[start],edges:[]},start,end);
  setStatus("始点と終点が同じ化合物です。","success");return;
 }
 submit.disabled=true;submit.querySelector("span").textContent="検索中…";
 try{
  const path=shortestPath(start.id,end.id);
  if(!path){
   timeline.replaceChildren();setHidden(results,true);setHidden(emptyState,false);
   emptyState.querySelector("h2").textContent="登録済み反応では経路が見つかりません";
   emptyState.querySelector("p").textContent=start.name+" から "+end.name+" へ向かう反応を、登録データの矢印方向に沿ってたどれませんでした。逆反応や未登録反応は自動で補わないため、地図に経路があっても向きが逆なら表示されません。";
   setStatus("経路が見つかりません。入力名と反応の向きを確認してください。","error");
  }else{
   emptyState.querySelector("h2").textContent="出発物質と目的物をつなぐ";
   emptyState.querySelector("p").textContent="検索結果は、登録されている反応の向きを尊重した最短経路です。未登録の反応や逆向きの反応は、自動では補いません。";
   renderSearch(path,start,end);
   setStatus("経路が見つかりました。各反応の「詳細を見る」から試薬・条件を確認できます。","success");
   results.scrollIntoView({behavior:"smooth",block:"start"});
  }
 }finally{
  submit.disabled=false;submit.querySelector("span").textContent="経路を検索";
 }
}
async function getRDKit(){
 if(!window.__routeRDKitPromise){
  if(typeof window.initRDKitModule!=="function")throw new Error("RDKit unavailable");
  window.__routeRDKitPromise=window.initRDKitModule({locateFile:file=>"https://unpkg.com/@rdkit/rdkit/dist/"+file});
 }
 return window.__routeRDKitPromise;
}
async function renderStructures(){
 const hosts=Array.from(document.querySelectorAll("[data-route-structure-id]"));
 if(!hosts.length)return;
 try{
  const rdkit=await getRDKit();
  hosts.forEach(host=>{
   if(host.dataset.rendered==="true")return;
   const compound=byId[host.dataset.routeStructureId];if(!compound||!compound.smiles){host.textContent="構造式未登録";return;}
   host.dataset.rendered="true";
   if(compound.repeatUnit){
    const repeat=document.createElement("div");repeat.className="map-polymer-structure";
    const left=document.createElement("span");left.className="map-polymer-bracket";left.textContent="[";
    const unit=document.createElement("span");unit.className="map-polymer-unit";unit.textContent=compound.repeatUnit;
    const right=document.createElement("span");right.className="map-polymer-bracket";right.textContent="]";
    const n=document.createElement("sub");n.textContent="n";repeat.append(left,unit,right,n);host.appendChild(repeat);return;
   }
   let mol=null;
   try{
    mol=rdkit.get_mol(compound.smiles);if(!mol)throw new Error("Invalid SMILES");
    const svg=mol.get_svg_with_highlights(JSON.stringify({width:190,height:100,bondLineWidth:1.4,scaleBondWidth:true,padding:0.08,minFontSize:7,maxFontSize:12,annotationFontScale:.5}));
    host.innerHTML=svg;
    const root=host.querySelector("svg");if(root){root.setAttribute("aria-hidden","true");root.setAttribute("preserveAspectRatio","xMidYMid meet");}
   }catch(error){host.textContent="構造式を描画できません";host.classList.add("route-structure-fallback");}
   finally{if(mol&&typeof mol.delete==="function")mol.delete();}
  });
 }catch(error){hosts.forEach(host=>{host.textContent="構造式の読込に失敗";host.classList.add("route-structure-fallback");});}
}
function openReaction(edge){
 const from=byId[edge.from],to=byId[edge.to];if(!from||!to)return;
 document.getElementById("route-dialog-title").textContent=edge.name||edge.label||"反応の詳細";
 document.getElementById("route-dialog-path").textContent=from.name+" → "+to.name;
 document.getElementById("route-dialog-equation").textContent=equations[edge.id]||(from.formula||from.name)+" → "+(to.formula||to.name)+"（化合物データからの簡略表記）";
 document.getElementById("route-dialog-condition").textContent=edge.condition||"試薬・反応条件は未登録です。";
 document.getElementById("route-dialog-note").textContent=edge.note||"反応の概要は未登録です。登録データが増えると詳細も拡張できます。";
 const fromLink=document.getElementById("route-dialog-from-link"),toLink=document.getElementById("route-dialog-to-link");
 fromLink.href="index.html?compound="+encodeURIComponent(from.id);fromLink.textContent="出発物質："+from.name+" ↗";
 toLink.href="index.html?compound="+encodeURIComponent(to.id);toLink.textContent="生成物："+to.name+" ↗";
 if(typeof dialog.showModal==="function")dialog.showModal();
}
document.getElementById("route-dialog-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
form.addEventListener("submit",runSearch);
document.querySelectorAll("[data-route-example]").forEach(button=>button.addEventListener("click",()=>{
 const values=button.dataset.routeExample.split("|");startInput.value=values[0];endInput.value=values[1];runSearch();
}));
function init(){
 compounds.forEach(c=>{const option=document.createElement("option");option.value=c.name;datalist.appendChild(option);});
 if(new URLSearchParams(window.location.search).has("start")&&new URLSearchParams(window.location.search).has("end")){
  const params=new URLSearchParams(window.location.search);startInput.value=params.get("start")||"";endInput.value=params.get("end")||"";runSearch();
 }
}
init();
})();