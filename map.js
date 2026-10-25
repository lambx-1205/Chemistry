(() => {
"use strict";
const data=window.OrganicAtlasData;
const el=id=>document.getElementById(id);
const viewport=el("map-viewport"),canvas=el("map-canvas"),svg=el("map-lines"),nodeLayer=el("map-node-layer");
const loading=el("map-loading"),countEl=el("map-count"),tabs=el("map-area-tabs"),search=el("map-search"),searchStatus=el("map-search-status");
const dialog=el("reaction-dialog");
if(!data||!viewport||!canvas||!svg||!nodeLayer){
 if(loading)loading.textContent="化合物データを読み込めませんでした。ページを再読み込みしてください。";
 return;
}
const compounds=data.compounds||[],edges=(data.edges||[]).filter(e=>e&&e.from&&e.to);
const byId=Object.create(null),nameMap=Object.create(null),order=Object.create(null);
compounds.forEach((c,i)=>{byId[c.id]=c;order[c.id]=i;[c.name,c.id,c.pubchemName,c.englishName,...(c.aliases||[])].forEach(n=>{if(n)nameMap[String(n).toLocaleLowerCase()]=c;});});
const NODE_W=250,NODE_H=170,GAP_X=150,GAP_Y=76,NS="http://www.w3.org/2000/svg";
const specs=[
 {id:"aliphatic",label:"脂肪族の反応",description:"炭化水素からアルコール・カルボニル化合物などへ続く、基本的な脂肪族反応。"},
 {id:"aromatic",label:"芳香族の反応",description:"ベンゼン環をもつ化合物の置換、酸化、変換などを整理したエリア。"},
 {id:"functional",label:"酸素官能基",description:"アルコール、アルデヒド、ケトン、カルボン酸、エステルなどの反応。"},
 {id:"nitrogen",label:"窒素・複素環",description:"芳香族アミン、窒素化合物、複素環化合物などの変換。"},
 {id:"bio",label:"糖・アミノ酸",description:"糖類、アミノ酸、ペプチドなど生体関連化合物の反応。"},
 {id:"polymer",label:"高分子",description:"付加重合・縮合重合、高分子とその原料のつながり。"}
];
const specById=Object.fromEntries(specs.map(s=>[s.id,s]));
function compoundArea(c){
 const t=[c.kind,c.family,c.mapGroup,c.name,c.id].filter(Boolean).join(" ").toLocaleLowerCase();
 if(c.kind==="polymer"||/高分子|ポリエチレン|ポリプロピレン|ナイロン|セルロース|でんぷん|デンプン|天然ゴム|pet-polymer|nylon-66|polymer/.test(t))return "polymer";
 if(c.kind==="sugar"||c.kind==="amino"||/糖類|単糖|二糖|多糖|アミノ酸|ペプチド|タンパク質|核酸|生体関連|ビタミン/.test(t))return "bio";
 if(c.kind==="aromatic"||/芳香族|ベンゼン|フェノール|アニリン|キシレン|ナフタレン/.test(t))return "aromatic";
 if(c.kind==="heteroaromatic"||/含窒素|窒素|アミン|ニトロ|ジアゾ|アゾ化合物|アミド|ピリジン|複素環|ニトリル|スルホンアミド/.test(t))return "nitrogen";
 if(/アルコール|アルデヒド|ケトン|カルボニル|カルボン酸|エステル|エーテル|エノール|酸無水物|ヒドロキシ|アセタール|脂肪酸|油脂|石けん/.test(t))return "functional";
 return "aliphatic";
}
const priority=["polymer","bio","aromatic","nitrogen","functional","aliphatic"];
function edgeArea(e){
 const a=compoundArea(byId[e.from]||{}),b=compoundArea(byId[e.to]||{});
 if(a===b)return a;
 for(const id of priority)if(a===id||b===id)return id;
 return "aliphatic";
}
const areas=specs.map(spec=>({...spec,edges:edges.filter(e=>edgeArea(e)===spec.id)})).filter(a=>a.edges.length);
let activeArea=areas.some(a=>a.id==="aliphatic")?"aliphatic":areas[0]?.id;
const structureCache=Object.create(null);
let rdkitPromise=null;
function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function svgEl(tag,attrs={}){const node=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));return node;}
function getRDKit(){
 if(rdkitPromise)return rdkitPromise;
 if(typeof window.initRDKitModule!=="function")return Promise.reject(new Error("構造式描画エンジンを読み込めません"));
 rdkitPromise=window.initRDKitModule({locateFile:file=>"https://unpkg.com/@rdkit/rdkit/dist/"+file});
 return rdkitPromise;
}
function renderTabs(){
 tabs.replaceChildren();
 areas.forEach(area=>{
  const b=document.createElement("button");b.type="button";b.className="map-area-tab";b.dataset.area=area.id;
  b.setAttribute("aria-pressed",String(area.id===activeArea));
  const name=document.createElement("span");name.textContent=area.label;
  const count=document.createElement("span");count.className="map-area-count";count.textContent=area.edges.length;
  b.append(name,count);b.addEventListener("click",()=>showArea(area.id));tabs.appendChild(b);
 });
}
function layoutArea(area){
 const edgeList=area.edges;
 const ids=new Set();const outgoing=Object.create(null),indegree=Object.create(null),level=Object.create(null);
 edgeList.forEach(e=>{ids.add(e.from);ids.add(e.to);(outgoing[e.from]||(outgoing[e.from]=[])).push(e.to);indegree[e.to]=(indegree[e.to]||0)+1;if(indegree[e.from]===undefined)indegree[e.from]=indegree[e.from]||0;});
 const sorted=[...ids].sort((a,b)=>(order[a]??1e9)-(order[b]??1e9));
 let queue=sorted.filter(id=>(indegree[id]||0)===0);
 if(!queue.length&&sorted.length)queue=[sorted[0]];
 queue.forEach(id=>level[id]=0);
 for(let head=0;head<queue.length;head++){
  const from=queue[head];
  (outgoing[from]||[]).forEach(to=>{
   const candidate=level[from]+1;
   if(level[to]===undefined){level[to]=candidate;queue.push(to);}
  });
 }
 let maxLevel=Math.max(0,...Object.values(level).filter(Number.isFinite));
 sorted.forEach(id=>{if(level[id]===undefined)level[id]=maxLevel+1;});
 const columns=Object.create(null);
 sorted.forEach(id=>(columns[level[id]]||(columns[level[id]]=[])).push(id));
 Object.values(columns).forEach(a=>a.sort((x,y)=>(order[x]??1e9)-(order[y]??1e9)));
 const positions=Object.create(null);let maxRows=1;
 Object.entries(columns).forEach(([col,idsInCol])=>{
  maxRows=Math.max(maxRows,idsInCol.length);
  idsInCol.forEach((id,row)=>positions[id]={x:36+Number(col)*(NODE_W+GAP_X),y:54+row*(NODE_H+GAP_Y)});
 });
 const width=Math.max(viewport.clientWidth-2,72+Math.max(...Object.values(positions).map(p=>p.x))+NODE_W);
 const height=Math.max(470,90+maxRows*(NODE_H+GAP_Y));
 return {positions,width,height,ids:sorted};
}
function createNode(c,pos){
 const node=document.createElement("a");node.className="map-node";node.href="compounds.html?compound="+encodeURIComponent(c.id);node.dataset.compoundId=c.id;
 if(["benzene","ethene","ethanol","toluene","phenol","aniline","acetic-acid","glucose","propene","cumene","pyridine","sucrose","polyethylene","cellulose"].includes(c.id))node.classList.add("is-key-compound");
 node.style.left=pos.x+"px";node.style.top=pos.y+"px";node.setAttribute("aria-label",c.name+"の化合物詳細を開く");
 const family=document.createElement("span");family.className="map-node-family";family.textContent=c.family||c.mapGroup||"化合物";
 const name=document.createElement("strong");name.className="map-node-name";name.textContent=c.name||c.id;
 const structure=document.createElement("span");structure.className="map-node-structure";structure.dataset.structureId=c.id;
 const formula=document.createElement("span");formula.className="map-node-formula";formula.textContent=c.formula||"構造式";
 node.append(family,name,structure,formula);nodeLayer.appendChild(node);
}
function curveFor(from,to){
 const fx=from.x,fy=from.y,tx=to.x,ty=to.y;
 if(Math.abs(tx-fx)>NODE_W+10){
  const dir=tx>fx?1:-1,sx=fx+(dir===1?NODE_W:0),ex=tx+(dir===1?0:NODE_W),sy=fy+NODE_H/2,ey=ty+NODE_H/2;
  const bend=Math.max(45,Math.abs(ex-sx)*.4);
  return {d:"M "+sx+" "+sy+" C "+(sx+dir*bend)+" "+sy+", "+(ex-dir*bend)+" "+ey+", "+ex+" "+ey,x:(sx+3*(sx+dir*bend)+3*(ex-dir*bend)+ex)/8,y:(sy+3*sy+3*ey+ey)/8};
 }
 const down=ty>fy,sx=fx+NODE_W/2,ex=tx+NODE_W/2,sy=fy+(down?NODE_H:0),ey=ty+(down?0:NODE_H),bend=Math.max(42,Math.abs(ey-sy)*.4);
 return {d:"M "+sx+" "+sy+" C "+sx+" "+(sy+(down?bend:-bend))+", "+ex+" "+(ey+(down?-bend:bend))+", "+ex+" "+ey,x:(sx+3*sx+3*ex+ex)/8,y:(sy+3*(sy+(down?bend:-bend))+3*(ey+(down?-bend:bend))+ey)/8};
}
function drawEdges(area,posMap,width,height){
 svg.replaceChildren();svg.setAttribute("viewBox","0 0 "+width+" "+height);svg.setAttribute("width",width);svg.setAttribute("height",height);svg.style.width=width+"px";svg.style.height=height+"px";
 const defs=svgEl("defs"),colors={addition:"#1688a8",substitution:"#8a61bd",oxidation:"#d97736",reduction:"#3b73a8",elimination:"#26988b",polymerization:"#c35383",other:"#688b70"};
 Object.entries(colors).forEach(([type,color])=>{const marker=svgEl("marker",{id:"arrow-"+type,markerWidth:9,markerHeight:8,refX:8,refY:4,orient:"auto",markerUnits:"strokeWidth"});marker.appendChild(svgEl("path",{d:"M0,0 L8,4 L0,8 Z",fill:color}));defs.appendChild(marker);});svg.appendChild(defs);
 const collisions=[];
 area.edges.forEach((edge,index)=>{
  const a=posMap[edge.from],b=posMap[edge.to];if(!a||!b)return;
  const curve=curveFor(a,b),color=colors[edge.type]||colors.other;
  const g=svgEl("g",{class:"map-edge",tabindex:"0",role:"button","data-edge-id":edge.id,"aria-label":(edge.name||edge.label||"反応")+"の詳細を表示"});
  const hit=svgEl("path",{class:"map-edge-hitbox",d:curve.d});
  const line=svgEl("path",{class:"map-edge-visible",d:curve.d,stroke:color,"marker-end":"url(#arrow-"+(colors[edge.type]?edge.type:"other")+")"});
  const label=String(edge.label||edge.name||"反応");
  const labelW=Math.min(200,Math.max(66,label.length*11+18)),labelH=27;
  const bump=(index%5-2)*23;
  const lx=Math.max(labelW/2+4,Math.min(width-labelW/2-4,curve.x));
  const ly=Math.max(labelH/2+4,Math.min(height-labelH/2-4,curve.y+bump));
  const bg=svgEl("rect",{class:"map-edge-label-bg",x:lx-labelW/2,y:ly-labelH/2,width:labelW,height:labelH,rx:7});
  const text=svgEl("text",{class:"map-edge-label-text",x:lx,y:ly});text.textContent=label;
  g.append(hit,line,bg,text);g.addEventListener("click",()=>openReaction(edge));g.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();openReaction(edge);}});
  svg.appendChild(g);collisions.push({x:lx,y:ly,w:labelW,h:labelH});
 });
}
async function renderStructures(){
 const hosts=[...nodeLayer.querySelectorAll("[data-structure-id]")];
 for(const host of hosts){
  const id=host.dataset.structureId,c=byId[id];if(!c)continue;
  if(structureCache[id]){host.innerHTML=structureCache[id];continue;}
  if(c.repeatUnit){
   const p=document.createElement("span");p.className="map-polymer-structure";p.textContent="[ "+c.repeatUnit+" ]ₙ";host.replaceChildren(p);continue;
  }
  try{
   const rdkit=await getRDKit(),mol=c.smiles?rdkit.get_mol(c.smiles):null;
   if(!mol)throw new Error("SMILES unavailable");
   try{const markup=mol.get_svg_with_highlights(JSON.stringify({width:300,height:112,bondLineWidth:1.5,scaleBondWidth:true,multipleBondOffset:.15,padding:.05,minFontSize:8,maxFontSize:15,annotationFontScale:.5}));
    if(!markup||!/<svg[\s>]/i.test(markup))throw new Error("SVG unavailable");
    structureCache[id]=markup;host.innerHTML=markup;const root=host.querySelector("svg");if(root){root.setAttribute("aria-hidden","true");root.setAttribute("preserveAspectRatio","xMidYMid meet");}
   }finally{if(typeof mol.delete==="function")mol.delete();}
  }catch(_){host.classList.add("map-node-structure-fallback");host.textContent=c.formula||"構造式データなし";}
 }
}
function reactionTypeLabel(type){return ({substitution:"置換反応",addition:"付加反応",oxidation:"酸化反応",reduction:"還元反応",elimination:"脱離反応",polymerization:"重合反応",other:"その他の反応"})[type]||"未分類";}
function renderReactionRegistry(){
 const host=el("reaction-registry-list"),count=el("reaction-registry-count");if(!host)return;
 host.replaceChildren();
 const groups={};edges.forEach(e=>(groups[e.type||"other"]||(groups[e.type||"other"]=[])).push(e));
 Object.keys(groups).sort((a,b)=>reactionTypeLabel(a).localeCompare(reactionTypeLabel(b),"ja")).forEach(type=>{
  const section=document.createElement("section");section.className="reaction-registry-group";
  const heading=document.createElement("h3");heading.className="reaction-registry-group-title";heading.textContent=reactionTypeLabel(type)+"（"+groups[type].length+"）";section.appendChild(heading);
  const list=document.createElement("div");list.className="reaction-registry-items";
  groups[type].forEach(edge=>{const b=document.createElement("button");b.type="button";b.className="reaction-registry-item";const route=document.createElement("span");route.className="reaction-registry-route";route.textContent=(byId[edge.from]?.name||edge.from)+" → "+(byId[edge.to]?.name||edge.to);const label=document.createElement("span");label.className="reaction-registry-label";label.textContent=edge.label||edge.name||"反応";b.append(route,label);b.addEventListener("click",()=>{focusCompound(edge.from);openReaction(edge);});list.appendChild(b);});
  section.appendChild(list);host.appendChild(section);
 });if(count)count.textContent=edges.length+"件";
}
function openReaction(edge){
 const from=byId[edge.from],to=byId[edge.to];if(!from||!to)return;
 el("reaction-dialog-title").textContent=edge.name||edge.label||"反応の詳細";
 el("reaction-dialog-route").textContent=from.name+" → "+to.name;
 el("reaction-dialog-equation").textContent=edge.equation||from.formula+" → "+to.formula+"（簡略表記）";
 el("reaction-dialog-condition").textContent=edge.condition||"反応条件は未登録";
 el("reaction-dialog-note").textContent=edge.id==="e59"?"反応経路の概念的な関係のみを示しています。安全上、具体的な製造条件は掲載していません。":(edge.note||"反応の説明は未登録です。");
 el("reaction-from-link").href="compounds.html?compound="+encodeURIComponent(from.id);el("reaction-from-link").textContent="出発物質："+from.name+" ↗";
 el("reaction-to-link").href="compounds.html?compound="+encodeURIComponent(to.id);el("reaction-to-link").textContent="生成物："+to.name+" ↗";
 if(typeof dialog.showModal==="function")dialog.showModal();
}
function showArea(id,focusId){
 const area=areas.find(a=>a.id===id);if(!area)return;activeArea=id;
 tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.area===id)));
 el("map-area-description").textContent=area.description;
 const graph=layoutArea(area);nodeLayer.replaceChildren();svg.replaceChildren();area.edges.forEach(()=>{});
 graph.ids.forEach(compoundId=>createNode(byId[compoundId],graph.positions[compoundId]));
 canvas.style.width=graph.width+"px";canvas.style.height=graph.height+"px";svg.style.width=graph.width+"px";svg.style.height=graph.height+"px";
 drawEdges(area,graph.positions,graph.width,graph.height);canvas.hidden=false;loading.hidden=true;
 countEl.textContent=graph.ids.length+"化合物・"+area.edges.length+"反応";
 searchStatus.textContent="";searchStatus.className="map-search-status";
 renderStructures();
 if(focusId&&graph.positions[focusId]){
  const p=graph.positions[focusId];viewport.scrollTo({left:Math.max(0,p.x-50),top:Math.max(0,p.y-45),behavior:"smooth"});
  const node=nodeLayer.querySelector('[data-compound-id="'+CSS.escape(focusId)+'"]');if(node){node.classList.add("is-focused");setTimeout(()=>node.classList.remove("is-focused"),1800);}
 }else viewport.scrollTo({left:0,top:0,behavior:"auto"});
}
function focusCompound(id){
 const c=byId[id];if(!c)return;
 const area=areas.find(a=>a.edges.some(e=>e.from===id||e.to===id));
 if(!area){searchStatus.textContent="この化合物に登録済み反応がないため、map上には表示されません。";searchStatus.className="map-search-status error";return;}
 search.value=c.name;showArea(area.id,id);
 searchStatus.textContent=c.name+"を含むエリアへ移動しました。";
}
function searchAndFocus(){
 const query=search.value.trim().toLocaleLowerCase();if(!query){searchStatus.textContent="化合物名を入力してください。";searchStatus.className="map-search-status error";return;}
 const c=nameMap[query]||compounds.find(x=>String(x.name||"").toLocaleLowerCase().includes(query)||(x.aliases||[]).some(a=>String(a).toLocaleLowerCase().includes(query)));
 if(!c){searchStatus.textContent="登録された化合物が見つかりません。";searchStatus.className="map-search-status error";return;}
 focusCompound(c.id);
}
function init(){
 const datalist=el("map-compound-options");compounds.forEach(c=>{const o=document.createElement("option");o.value=c.name;datalist.appendChild(o);});
 renderTabs();showArea(activeArea);renderReactionRegistry();el("map-search-button").addEventListener("click",searchAndFocus);
 search.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchAndFocus();}});
 el("reaction-dialog-close").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();