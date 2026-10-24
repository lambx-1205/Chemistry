(() => {
"use strict";
const data = window.OrganicAtlasData;
if (!data) {
  const loading = document.getElementById("map-loading");
  if (loading) loading.textContent = "化合物データを読み込めませんでした。ページを再読み込みしてください。";
  return;
}

const compounds = data.compounds || [];
const edges = data.edges || [];
const byId = Object.create(null);
const nameMap = Object.create(null);
const compoundOrder = Object.create(null);
const nodePositions = Object.create(null);
compounds.forEach((c, i) => {
  byId[c.id] = c;
  compoundOrder[c.id] = i;
  nameMap[String(c.name || "").toLocaleLowerCase()] = c;
  nameMap[String(c.id || "").toLocaleLowerCase()] = c;
  (c.aliases || []).forEach((alias) => { nameMap[String(alias).toLocaleLowerCase()] = c; });
  if (c.pubchemName) nameMap[String(c.pubchemName).toLocaleLowerCase()] = c;
});

const NODE_W = 360;
const NODE_H = 280;
const CELL = 100;
const MAP_PAD = 100;
const SVG_NS = "http://www.w3.org/2000/svg";
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

const viewport = document.getElementById("map-viewport");
const world = document.getElementById("map-world");
const linesSvg = document.getElementById("map-lines");
const nodeLayer = document.getElementById("map-node-layer");
const groupLayer = document.getElementById("map-group-layer");
const loading = document.getElementById("map-loading");
const countEl = document.getElementById("map-count");
const searchInput = document.getElementById("map-search");
const searchStatus = document.getElementById("map-search-status");
const dialog = document.getElementById("reaction-dialog");

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.keys(attrs || {}).forEach((key) => el.setAttribute(key, attrs[key]));
  return el;
}
function niceFamily(c) { return c.family || c.kind || "化合物"; }
function groupTitle(comp) {
  const families = comp.nodes.map((id) => byId[id].family || "");
  const joined = families.join(" ");
  if (/芳香族|ベンゼン|アニリン|フェノール|キシレン/.test(joined)) return "芳香族化合物の反応系統";
  if (/脂肪酸|油脂|石けん|トリグリセリド/.test(joined)) return "脂肪酸・油脂の反応系統";
  if (/炭化水素|アルカン|アルケン|アルコール|アルデヒド/.test(joined)) return "脂肪族化合物の反応系統";
  return byId[comp.nodes[0]].name + "を含む反応系統";
}
const EDGE_COLORS={addition:"#1688a8",substitution:"#8a61bd",oxidation:"#d97736",reduction:"#3b73a8",elimination:"#26988b",polymerization:"#c35383",other:"#688b70"};
const DIRECTIONS=[
 {dx:0,dy:-1,index:0},{dx:1,dy:-1,index:1},{dx:1,dy:0,index:2},{dx:1,dy:1,index:3},
 {dx:0,dy:1,index:4},{dx:-1,dy:1,index:5},{dx:-1,dy:0,index:6},{dx:-1,dy:-1,index:7}
];
const ROUTE_DIRECTIONS=[
 {dx:0,dy:-1,index:0},{dx:1,dy:0,index:2},{dx:0,dy:1,index:4},{dx:-1,dy:0,index:6}
];
const edgePorts=Object.create(null);
const nodeGridPositions=Object.create(null),componentOf=Object.create(null),componentBounds=Object.create(null);
const gridOccupancy=Object.create(null),routedSegments=Object.create(null),routedDiagonals=Object.create(null),routedGridPoints=Object.create(null);
function cellKey(x,y){return x+","+y}
function pairKey(a,b){return [a,b].sort().join("|")}
function circularDistance(a,b){const d=Math.abs(a-b)%8;return Math.min(d,8-d)}
function directionForDelta(dx,dy){
 if(!dx&&!dy)return -1;
 if(Math.abs(dx)>2*Math.abs(dy))return dx>0?2:6;
 if(Math.abs(dy)>2*Math.abs(dx))return dy>0?4:0;
 if(dx>0&&dy<0)return 1;if(dx>0&&dy>0)return 3;if(dx<0&&dy>0)return 5;return 7;
}
function directionRank(i){return [0,2,4,6,1,3,5,7].indexOf(i)}
function chooseSpreadDirections(available,count,parentDirection){
 const remaining=available.slice(),chosen=[];
 while(chosen.length<count&&remaining.length){
  let best=0,bestScore=-Infinity;
  remaining.forEach((dir,i)=>{
   const score=chosen.length===0
    ?(parentDirection===undefined?(dir===0?1:0):circularDistance(dir,parentDirection)*2)
    :Math.min.apply(null,chosen.map(p=>circularDistance(dir,p)))*10+(parentDirection===undefined?0:circularDistance(dir,parentDirection)*.35);
   if(score>bestScore){bestScore=score;best=i}
  });
  chosen.push(remaining.splice(best,1)[0]);
 }
 return chosen.sort((x,y)=>directionRank(x)-directionRank(y));
}
function nearestFreeCell(x,y,occupied,preferredDirection){
 for(let radius=1;radius<=14;radius++){
  const candidates=[];
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==radius||occupied[cellKey(x+dx,y+dy)])continue;
   const dir=directionForDelta(dx,dy);
   candidates.push({x:x+dx,y:y+dy,score:radius*20+(preferredDirection===undefined?0:circularDistance(dir,preferredDirection)*3)});
  }
  if(candidates.length){candidates.sort((p,q)=>p.score-q.score||p.y-q.y||p.x-q.x);return candidates[0]}
 }
 return {x:x+15,y:y+15};
}
function nearestFreeNodeCell(x,y,occupied,preferredDirection){
 // Card locations must remain at least six routing cells apart.
 for(let radius=4;radius<=100;radius+=4){
  const candidates=[];
  for(let dy=-radius;dy<=radius;dy+=4)for(let dx=-radius;dx<=radius;dx+=4){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==radius||occupied[cellKey(x+dx,y+dy)])continue;
   const dir=directionForDelta(dx,dy);
   candidates.push({x:x+dx,y:y+dy,score:radius*20+(preferredDirection===undefined?0:circularDistance(dir,preferredDirection)*3)});
  }
  if(candidates.length){candidates.sort((p,q)=>p.score-q.score||p.y-q.y||p.x-q.x);return candidates[0]}
 }
 return {x:x+96,y:y+96};
}
function buildAdjacency(){
 const adj=Object.create(null),inDeg=Object.create(null),outDeg=Object.create(null);
 compounds.forEach(c=>{adj[c.id]=[];inDeg[c.id]=0;outDeg[c.id]=0});
 edges.forEach(e=>{
  if(!adj[e.from]||!adj[e.to])return;
  if(!adj[e.from].includes(e.to))adj[e.from].push(e.to);
  if(!adj[e.to].includes(e.from))adj[e.to].push(e.from);
  outDeg[e.from]++;inDeg[e.to]++;
 });
 return {adj,inDeg,outDeg};
}
const graph=buildAdjacency();
function makeComponent(nodes){
 const nodeSet=new Set(nodes),local=Object.create(null),occupied=Object.create(null),parent=Object.create(null);
 const root=nodes.includes("benzene")?"benzene":nodes.slice().sort((a,b)=>graph.adj[b].length-graph.adj[a].length||compoundOrder[a]-compoundOrder[b])[0];
 const queue=[root];local[root]={x:0,y:0};occupied[cellKey(0,0)]=root;
 while(queue.length){
  const current=queue.shift(),here=local[current];
  const unseen=graph.adj[current].filter(n=>nodeSet.has(n)&&!local[n]).sort((a,b)=>graph.adj[b].length-graph.adj[a].length||compoundOrder[a]-compoundOrder[b]);
  if(!unseen.length)continue;
  const available=DIRECTIONS.filter(d=>!occupied[cellKey(here.x+d.dx*4,here.y+d.dy*4)]).map(d=>d.index);
  const back=parent[current]?directionForDelta(local[parent[current]].x-here.x,local[parent[current]].y-here.y):undefined;
  const chosen=chooseSpreadDirections(available,Math.min(unseen.length,available.length),back);
  unseen.forEach((next,i)=>{
   const d=i<chosen.length?DIRECTIONS[chosen[i]]:null;
   const p=d?{x:here.x+d.dx*4,y:here.y+d.dy*4}:nearestFreeNodeCell(here.x,here.y,occupied);
   local[next]={x:p.x,y:p.y};occupied[cellKey(p.x,p.y)]=next;parent[next]=current;queue.push(next);
  });
 }
 nodes.forEach(id=>{if(!local[id]){const p=nearestFreeNodeCell(0,0,occupied);local[id]={x:p.x,y:p.y};occupied[cellKey(p.x,p.y)]=id}});
 const xs=nodes.map(id=>local[id].x),ys=nodes.map(id=>local[id].y);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return {nodes,root,positions:local,minX,maxX,minY,maxY,width:maxX-minX+1,height:maxY-minY+1};
}
function buildLayout(){
 const visited=new Set(),components=[];
 compounds.forEach(c=>{
  if(visited.has(c.id))return;
  const q=[c.id],nodes=[];visited.add(c.id);
  while(q.length){const id=q.shift();nodes.push(id);graph.adj[id].forEach(n=>{if(!visited.has(n)){visited.add(n);q.push(n)}})}
  if(nodes.length>1)components.push(makeComponent(nodes));
 });
 components.sort((a,b)=>b.nodes.length-a.nodes.length||a.width-b.width);
 let cursorGX=1,cursorGY=1,rowHeight=0,maxGX=1,maxGY=1;
 const rowLimit=27;
 components.forEach((comp,index)=>{
  if(cursorGX>1&&cursorGX+comp.width+3>rowLimit){cursorGX=1;cursorGY+=rowHeight+8;rowHeight=0}
  const originGX=cursorGX-comp.minX,originGY=cursorGY-comp.minY;
  const title=document.createElement("div");title.className="map-group-title";
  title.style.left=(MAP_PAD+(cursorGX-1)*CELL)+"px";title.style.top=Math.max(8,MAP_PAD+(cursorGY-1)*CELL-42)+"px";
  title.textContent=groupTitle(comp);groupLayer.appendChild(title);
  comp.nodes.forEach(id=>{
   const p=comp.positions[id],gx=p.x+originGX,gy=p.y+originGY;
   nodeGridPositions[id]={x:gx,y:gy};nodePositions[id]={x:MAP_PAD+(gx-1)*CELL,y:MAP_PAD+(gy-1)*CELL};
   for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)gridOccupancy[cellKey(gx+ox,gy+oy)]=id;componentOf[id]=index;maxGX=Math.max(maxGX,gx);maxGY=Math.max(maxGY,gy);
  });
  const ps=comp.nodes.map(id=>nodeGridPositions[id]);
  componentBounds[index]={minX:Math.min(...ps.map(p=>p.x))-10,maxX:Math.max(...ps.map(p=>p.x))+10,minY:Math.min(...ps.map(p=>p.y))-10,maxY:Math.max(...ps.map(p=>p.y))+10};
  cursorGX+=comp.width+8;rowHeight=Math.max(rowHeight,comp.height);
 });
 const isolated=compounds.filter(c=>graph.adj[c.id].length===0);
 if(isolated.length){
  const buckets=Object.create(null);
  isolated.forEach(c=>{const key=c.mapGroup||c.family||"その他";(buckets[key]||(buckets[key]=[])).push(c);});
  let isolatedY=cursorGY+rowHeight+14;
  const cols=4;
  Object.keys(buckets).sort((a,b)=>buckets[b].length-buckets[a].length||a.localeCompare(b,"ja")).forEach(groupName=>{
   const list=buckets[groupName];
   const title=document.createElement("div");title.className="map-group-title";
   title.style.left=MAP_PAD+"px";title.style.top=(MAP_PAD+(isolatedY-1)*CELL-42)+"px";title.textContent=groupName;groupLayer.appendChild(title);
   list.forEach((c,i)=>{
    const gx=1+(i%cols)*4,gy=isolatedY+Math.floor(i/cols)*4;
    nodeGridPositions[c.id]={x:gx,y:gy};nodePositions[c.id]={x:MAP_PAD+(gx-1)*CELL,y:MAP_PAD+(gy-1)*CELL};
    for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)gridOccupancy[cellKey(gx+ox,gy+oy)]=c.id;
    maxGX=Math.max(maxGX,gx);maxGY=Math.max(maxGY,gy);
   });
   isolatedY+=Math.ceil(list.length/cols)*4+3;
  });
 }
 const primary=components[0]||{nodes:compounds.map(c=>c.id),root:compounds[0]&&compounds[0].id};
 return {width:MAP_PAD*2+(maxGX+15)*CELL+NODE_W,height:MAP_PAD*2+(maxGY+15)*CELL+NODE_H,primaryNodes:primary.nodes,primaryRoot:primary.root,components};
}
function heapPush(heap,item){
 heap.push(item);let i=heap.length-1;
 while(i>0){const p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}
}
function heapPop(heap){
 if(!heap.length)return null;const first=heap[0],last=heap.pop();
 if(heap.length){heap[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<heap.length&&heap[l].f<heap[m].f)m=l;if(r<heap.length&&heap[r].f<heap[m].f)m=r;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m}}
 return first;
}
function segmentKey(a,b){const x=cellKey(a.x,a.y),y=cellKey(b.x,b.y);return x<y?x+"~"+y:y+"~"+x}
function diagonalInfo(a,b){const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)!==1||Math.abs(dy)!==1)return null;return {square:Math.min(a.x,b.x)+","+Math.min(a.y,b.y),orientation:dx*dy>0?1:-1}}
function octileDistance(a,b){return (Math.abs(a.x-b.x)+Math.abs(a.y-b.y))*10}
function reserveGridSegment(a,b,pair){
 const dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(Math.abs(dx),Math.abs(dy));
 let previous={x:a.x,y:a.y};
 for(let i=1;i<=steps;i++){
  const current={x:a.x+Math.round(dx*i/steps),y:a.y+Math.round(dy*i/steps)};
  const sk=segmentKey(previous,current),sl=routedSegments[sk]||(routedSegments[sk]=[]);
  if(!sl.includes(pair))sl.push(pair);
  const diag=diagonalInfo(previous,current);
  if(diag){const dk=diag.square+"|"+diag.orientation,dl=routedDiagonals[dk]||(routedDiagonals[dk]=[]);if(!dl.includes(pair))dl.push(pair);}
  const pk=cellKey(current.x,current.y),pl=routedGridPoints[pk]||(routedGridPoints[pk]=[]);
  if(!pl.includes(pair))pl.push(pair);
  previous=current;
 }
}

function findGridRoute(edge,recoveryLevel=0){
 const nodeStart=nodeGridPositions[edge.from],nodeGoal=nodeGridPositions[edge.to];
 if(!nodeStart||!nodeGoal)return [];
 const ports=edgePorts[edge.id]||{from:directionForDelta(nodeGoal.x-nodeStart.x,nodeGoal.y-nodeStart.y),to:directionForDelta(nodeStart.x-nodeGoal.x,nodeStart.y-nodeGoal.y)};
 const fromDirection=DIRECTIONS[ports.from]||DIRECTIONS[2];
 const toDirection=DIRECTIONS[ports.to]||DIRECTIONS[6];
 const portRadius=2;
 const start={x:nodeStart.x+fromDirection.dx*portRadius,y:nodeStart.y+fromDirection.dy*portRadius};
 const goal={x:nodeGoal.x+toDirection.dx*portRadius,y:nodeGoal.y+toDirection.dy*portRadius};
 const coreBounds=componentBounds[componentOf[edge.from]]||{minX:nodeStart.x-10,maxX:nodeStart.x+10,minY:nodeStart.y-10,maxY:nodeStart.y+10};
 const margins=[0,8,18,35,60];
 const margin=margins[Math.min(recoveryLevel,margins.length-1)];
 const bounds={minX:coreBounds.minX-margin,maxX:coreBounds.maxX+margin,minY:coreBounds.minY-margin,maxY:coreBounds.maxY+margin};
 const routeId=String(edge.id);
 // Each reaction has its own reserved path. Sharing only the node pair caused
 // distinct reactions to occupy the same track and appear as one thick arrow.
 reserveGridSegment(nodeStart,start,routeId);
 reserveGridSegment(goal,nodeGoal,routeId);
 const startKey=start.x+","+start.y+",-1";
 const open=[],best=new Map(),previous=new Map(),states=new Map();
 const first={x:start.x,y:start.y,dir:-1,g:0,f:octileDistance(start,goal),key:startKey};
 best.set(startKey,0);states.set(startKey,first);heapPush(open,first);
 let endState=null,iterations=0;
 while(open.length&&iterations<500000){
  iterations++;const cur=heapPop(open);if(cur.g!==best.get(cur.key))continue;
  if(cur.x===goal.x&&cur.y===goal.y){endState=cur;break}
  ROUTE_DIRECTIONS.forEach(d=>{
   const nx=cur.x+d.dx,ny=cur.y+d.dy;
   if(nx<bounds.minX||nx>bounds.maxX||ny<bounds.minY||ny>bounds.maxY)return;
   const nk=cellKey(nx,ny);if(gridOccupancy[nk])return;
   const next={x:nx,y:ny},sk=segmentKey(cur,next),owners=routedSegments[sk]||[];
   const segmentConflict=owners.some(p=>p!==routeId);
   const pointConflict=(routedGridPoints[nk]||[]).some(p=>p!==routeId);
   // Only collision-free paths are admitted. Recovery retries add more routing
   // lanes around the component instead of allowing a line to cross another.
   if(segmentConflict||pointConflict)return;
   const ng=cur.g+10+(cur.dir!==-1&&cur.dir!==d.index?9:0);
   const key=nx+","+ny+","+d.index;
   if(!best.has(key)||ng<best.get(key)){
    const state={x:nx,y:ny,dir:d.index,g:ng,f:ng+octileDistance(next,goal),key};
    best.set(key,ng);previous.set(key,cur.key);states.set(key,state);heapPush(open,state);
   }
  });
 }
 if(!endState&&recoveryLevel<margins.length-1)return findGridRoute(edge,recoveryLevel+1);
 if(!endState)return [];
 const path=[];let key=endState.key;
 while(key){const state=states.get(key);path.push({x:state.x,y:state.y});key=previous.get(key)||""}
 path.reverse();
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],sk=segmentKey(a,b),list=routedSegments[sk]||(routedSegments[sk]=[]);
  if(!list.includes(routeId))list.push(routeId);
 }
 path.slice(1).forEach(point=>{
  const k=cellKey(point.x,point.y),owners=routedGridPoints[k]||(routedGridPoints[k]=[]);
  if(!owners.includes(routeId))owners.push(routeId);
 });
 return [nodeStart].concat(path,[nodeGoal]);
}
function assignEdgePorts(edgeList){
 const incidents=Object.create(null);
 compounds.forEach(c=>{incidents[c.id]=[]});
 edgeList.forEach(edge=>{
  const a=nodeGridPositions[edge.from],b=nodeGridPositions[edge.to];
  if(!a||!b)return;
  incidents[edge.from].push({edgeId:edge.id,role:"from",other:edge.to,desired:directionForDelta(b.x-a.x,b.y-a.y)});
  incidents[edge.to].push({edgeId:edge.id,role:"to",other:edge.from,desired:directionForDelta(a.x-b.x,a.y-b.y)});
 });
 Object.keys(incidents).forEach(id=>{
  const entries=incidents[id];
  entries.sort((a,b)=>a.desired-b.desired||String(a.edgeId).localeCompare(String(b.edgeId)));
  const used=new Set();
  entries.forEach(entry=>{
   let candidates=DIRECTIONS.map(d=>d.index);
   candidates.sort((a,b)=>{
    const scoreA=circularDistance(a,entry.desired)*100+(used.has(a)?10000:0)+directionRank(a);
    const scoreB=circularDistance(b,entry.desired)*100+(used.has(b)?10000:0)+directionRank(b);
    return scoreA-scoreB;
   });
   let chosen=candidates[0];
   if(used.size>=DIRECTIONS.length){
    // For very high degree, prefer an occupied port on a different lane side.
    chosen=candidates.slice().sort((a,b)=>circularDistance(a,entry.desired)-circularDistance(b,entry.desired)||a-b)[0];
   }
   used.add(chosen);
   if(!edgePorts[entry.edgeId])edgePorts[entry.edgeId]={};
   edgePorts[entry.edgeId][entry.role]=chosen;
  });
 });
}

function createNode(c) {
  const pos = nodePositions[c.id];
  const node = document.createElement("a");
  node.className = "map-node";
  if (["benzene","ethene","ethanol","toluene","phenol","aniline","acetic-acid","glucose","propene","cumene","pyridine","sucrose","polyethylene","cellulose"].includes(c.id)) node.classList.add("is-key-compound");
  node.href = "index.html?compound=" + encodeURIComponent(c.id);
  node.dataset.compoundId = c.id;
  node.style.left = pos.x + "px";
  node.style.top = pos.y + "px";
  node.setAttribute("aria-label", c.name + "の詳細ページを開く");
  const name = document.createElement("span");
  name.className = "map-node-name";
  name.textContent = c.name;
  const structure = document.createElement("span");
  structure.className = "map-node-structure";
  structure.dataset.structureId = c.id;
  structure.setAttribute("aria-label", c.name + "の構造式");
  node.append(name, structure);
  nodeLayer.appendChild(node);
}

function drawEdges(dimensions){
 linesSvg.setAttribute("width",dimensions.width);linesSvg.setAttribute("height",dimensions.height);linesSvg.setAttribute("viewBox","0 0 "+dimensions.width+" "+dimensions.height);linesSvg.style.width=dimensions.width+"px";linesSvg.style.height=dimensions.height+"px";
 const defs=svgEl("defs");
 Object.entries(EDGE_COLORS).forEach(([type,color])=>{
  const marker=svgEl("marker",{id:"map-arrow-head-"+type,markerWidth:"14",markerHeight:"12",refX:"12",refY:"6",orient:"auto",markerUnits:"userSpaceOnUse"});
  marker.appendChild(svgEl("path",{d:"M0,0 L14,6 L0,12 Z",fill:color}));defs.appendChild(marker);
 });
 linesSvg.appendChild(defs);
 const pairCounts=Object.create(null),pairIndexes=Object.create(null),paths=Object.create(null);
 edges.forEach(e=>{const p=pairKey(e.from,e.to);pairCounts[p]=(pairCounts[p]||0)+1});
 const ordered=edges.slice().sort((a,b)=>{
  const pa=nodeGridPositions[a.from],qa=nodeGridPositions[a.to],pb=nodeGridPositions[b.from],qb=nodeGridPositions[b.to];
  const da=Math.max(Math.abs(pa.x-qa.x),Math.abs(pa.y-qa.y)),db=Math.max(Math.abs(pb.x-qb.x),Math.abs(pb.y-qb.y));
  return da-db||(graph.adj[b.from].length+graph.adj[b.to].length)-(graph.adj[a.from].length+graph.adj[a.to].length)||String(a.id).localeCompare(String(b.id));
 });
 assignEdgePorts(ordered);
 ordered.forEach(e=>{paths[e.id]=findGridRoute(e)});
 function center(id){const p=nodePositions[id];return {x:p.x+NODE_W/2,y:p.y+NODE_H/2}}
 function borderPoint(c,dir){
  const tx=dir.x===0?Infinity:(NODE_W/2)/Math.abs(dir.x),ty=dir.y===0?Infinity:(NODE_H/2)/Math.abs(dir.y),t=Math.min(tx,ty);
  return {x:c.x+dir.x*t,y:c.y+dir.y*t};
 }
 function shift(points,offset,a,b){
  if(Math.abs(offset)<.1)return points;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  return points.map(p=>({x:p.x+nx*offset,y:p.y+ny*offset}));
 }
 const placedLabels=[];
 edges.forEach(edge=>{
  const gridPath=paths[edge.id];if(!gridPath||gridPath.length<2)return;
  const first={x:gridPath[1].x-gridPath[0].x,y:gridPath[1].y-gridPath[0].y};
  const last={x:gridPath[gridPath.length-2].x-gridPath[gridPath.length-1].x,y:gridPath[gridPath.length-2].y-gridPath[gridPath.length-1].y};
  const fromCenter=center(edge.from),toCenter=center(edge.to),points=[borderPoint(fromCenter,first)];
  for(let i=1;i<gridPath.length-1;i++)points.push({x:MAP_PAD+(gridPath[i].x-1)*CELL+NODE_W/2,y:MAP_PAD+(gridPath[i].y-1)*CELL+NODE_H/2});
  points.push(borderPoint(toCenter,last));
  const visiblePoints=points;
  const pathD=visiblePoints.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const text=edge.label||edge.name||"反応",labelWidth=Math.min(290,Math.max(86,text.length*15+22)),labelHeight=30;
  const segments=[];
  for(let i=1;i<visiblePoints.length;i++){
   const p1=visiblePoints[i-1],p2=visiblePoints[i],length=Math.hypot(p2.x-p1.x,p2.y-p1.y)||1;
   let nx=-(p2.y-p1.y)/length,ny=(p2.x-p1.x)/length,sign=toCenter.x>=fromCenter.x?-1:1;
   if(Math.abs(ny)<0.4)sign=nx>=0?1:-1;
   segments.push({p1,p2,length,nx,ny,sign});
  }
  segments.sort((a,b)=>b.length-a.length);
  let labelPoint=null;
  const offsets=[24,38,54,72,94,120,150,184,220,260,305],fractions=[0.5,0.35,0.65,0.2,0.8];
  function collidesWithNode(x,y){
   for(const c of compounds){const p=nodePositions[c.id];if(!p)continue;
    if(x+labelWidth/2+8>p.x&&x-labelWidth/2-8<p.x+NODE_W&&y+labelHeight/2+8>p.y&&y-labelHeight/2-8<p.y+NODE_H)return true;
   }
   return false;
  }
  function collidesWithLabel(x,y){
   return placedLabels.some(box=>Math.abs(x-box.x)<(labelWidth+box.width)/2+10&&Math.abs(y-box.y)<(labelHeight+box.height)/2+10);
  }
  outer: for(const seg of segments){
   for(const distance of offsets){
    for(const fraction of fractions){
     const mx=seg.p1.x+(seg.p2.x-seg.p1.x)*fraction,my=seg.p1.y+(seg.p2.y-seg.p1.y)*fraction;
     const x=mx+seg.nx*seg.sign*distance,y=my+seg.ny*seg.sign*distance;
     if(!collidesWithNode(x,y)&&!collidesWithLabel(x,y)){labelPoint={x,y};break outer;}
    }
   }
  }
  if(!labelPoint){const seg=segments[0];labelPoint={x:(seg.p1.x+seg.p2.x)/2+seg.nx*seg.sign*248,y:(seg.p1.y+seg.p2.y)/2+seg.ny*seg.sign*248};}
  const labelX=labelPoint.x,labelY=labelPoint.y;
  placedLabels.push({x:labelX,y:labelY,width:labelWidth,height:labelHeight});
  const group=svgEl("g",{class:"map-edge",tabindex:"0",role:"button","data-edge-id":edge.id,"aria-label":(edge.name||edge.label)+"。反応式を表示"});
  const edgeColor=EDGE_COLORS[edge.type]||EDGE_COLORS.other;
  const markerType=EDGE_COLORS[edge.type]?edge.type:"other";
  const hit=svgEl("path",{class:"map-edge-hitbox",d:pathD}),line=svgEl("path",{class:"map-edge-visible",d:pathD,style:"stroke:"+edgeColor,"marker-end":"url(#map-arrow-head-"+markerType+")"});
  const bg=svgEl("rect",{class:"map-edge-label-bg",x:(labelX-labelWidth/2).toFixed(1),y:(labelY-labelHeight/2).toFixed(1),width:labelWidth,height:labelHeight,rx:8});
  const label=svgEl("text",{class:"map-edge-label-text",x:labelX.toFixed(1),y:labelY.toFixed(1)});label.textContent=text;
  group.append(hit,line,bg,label);group.addEventListener("click",()=>openReaction(edge));
  group.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openReaction(edge)}});
  linesSvg.appendChild(group);
 });
}
let rdkitPromise = null;
function getRDKit() {
  if (rdkitPromise) return rdkitPromise;
  if (typeof window.initRDKitModule !== "function") return Promise.reject(new Error("RDKitを読み込めません"));
  rdkitPromise = window.initRDKitModule({
    locateFile:(file) => "https://unpkg.com/@rdkit/rdkit/dist/" + file
  });
  return rdkitPromise;
}
async function renderStructures() {
  const status = document.getElementById("map-loading");
  try {
    const rdkit = await getRDKit();
    document.querySelectorAll("[data-structure-id]").forEach((host) => {
      const compound = byId[host.dataset.structureId];
      if (!compound || !compound.smiles) {
        host.textContent = "構造式未登録";
        host.classList.add("map-node-structure-fallback");
        return;
      }
      let mol = null;
      try {
        if (compound.repeatUnit) {
          const repeat=document.createElement("div");repeat.className="map-polymer-structure";
          const left=document.createElement("span");left.className="map-polymer-bracket";left.textContent="[";
          const unit=document.createElement("span");unit.className="map-polymer-unit";unit.textContent=compound.repeatUnit;
          const right=document.createElement("span");right.className="map-polymer-bracket";right.textContent="]";
          const n=document.createElement("sub");n.className="map-polymer-n";n.textContent="n";
          repeat.append(left,unit,right,n);host.replaceChildren(repeat);return;
        }
        mol = rdkit.get_mol(compound.smiles);
        if (!mol) throw new Error("SMILES parse failed");
        const opts = {width:310,height:170,bondLineWidth:1.45,scaleBondWidth:true,multipleBondOffset:0.16,padding:0.08,minFontSize:8,maxFontSize:15,annotationFontScale:0.48};
        const svg = mol.get_svg_with_highlights(JSON.stringify(opts));
        if (!svg || !/<svg[\s>]/i.test(svg)) throw new Error("No SVG");
        host.innerHTML = svg;
        const svgRoot = host.querySelector("svg");
        if (svgRoot) {
          svgRoot.setAttribute("aria-hidden","true");
          svgRoot.setAttribute("preserveAspectRatio","xMidYMid meet");
        }
      } catch (error) {
        host.textContent = "構造式を描画できません";
        host.classList.add("map-node-structure-fallback");
      } finally {
        if (mol && typeof mol.delete === "function") mol.delete();
      }
    });
    if (status) status.hidden = true;
  } catch (error) {
    document.querySelectorAll("[data-structure-id]").forEach((host) => {
      const c = byId[host.dataset.structureId];
      host.textContent = c && c.smiles ? "構造式の読込に失敗" : "構造式未登録";
      host.classList.add("map-node-structure-fallback");
    });
    if (status) status.textContent = "構造式の描画エンジンを読み込めません。化合物カードのリンクは使用できます。";
  }
}

function openReaction(edge) {
  const from = byId[edge.from], to = byId[edge.to];
  if (!from || !to) return;
  document.getElementById("reaction-dialog-title").textContent = edge.name || edge.label || "反応の詳細";
  document.getElementById("reaction-dialog-route").textContent = from.name + "  →  " + to.name;
  document.getElementById("reaction-dialog-equation").textContent = equations[edge.id] || (from.formula + " → " + to.formula + "（簡略表記）");
  document.getElementById("reaction-dialog-condition").textContent = edge.condition || "反応条件は未登録";
  document.getElementById("reaction-dialog-note").textContent = edge.id === "e59" ? "複数段階の反応経路を示す概念図です。ここでは芳香族ニトロ化の一般式のみを表示し、個別の製造反応式や詳細条件は掲載していません。" : (edge.note || "反応の説明は未登録です。");
  const fromLink = document.getElementById("reaction-from-link");
  const toLink = document.getElementById("reaction-to-link");
  fromLink.href = "index.html?compound=" + encodeURIComponent(from.id);
  fromLink.textContent = "出発物質：" + from.name + " ↗";
  toLink.href = "index.html?compound=" + encodeURIComponent(to.id);
  toLink.textContent = "生成物：" + to.name + " ↗";
  if (typeof dialog.showModal === "function") dialog.showModal();
}
document.getElementById("reaction-dialog-close").addEventListener("click",() => dialog.close());
dialog.addEventListener("click",(event) => {
  if (event.target === dialog) dialog.close();
});

let scale = 1, panX = 30, panY = 30, dragging = false, dragOrigin = null;
function applyTransform() {
  world.style.transform = "translate(" + panX + "px," + panY + "px) scale(" + scale + ")";
}
function fitToView() {
  const w = parseFloat(world.dataset.mapWidth || "1000");
  const h = parseFloat(world.dataset.mapHeight || "1000");
  const availableW = Math.max(200, viewport.clientWidth - 48);
  const availableH = Math.max(200, viewport.clientHeight - 48);
  scale = Math.min(1, availableW / w, availableH / h);
  panX = (viewport.clientWidth - w * scale) / 2;
  panY = (viewport.clientHeight - h * scale) / 2;
  applyTransform();
}
function zoomAt(nextScale, clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const px = clientX === undefined ? rect.width / 2 : clientX - rect.left;
  const py = clientY === undefined ? rect.height / 2 : clientY - rect.top;
  const worldX = (px - panX) / scale;
  const worldY = (py - panY) / scale;
  scale = Math.max(0.18, Math.min(1.65, nextScale));
  panX = px - worldX * scale;
  panY = py - worldY * scale;
  applyTransform();
}
function focusCompound(c) {
  if (!c || !nodePositions[c.id]) return;
  const pos = nodePositions[c.id];
  scale = Math.max(scale, 0.78);
  scale = Math.min(scale, 1.35);
  panX = viewport.clientWidth / 2 - (pos.x + NODE_W / 2) * scale;
  panY = viewport.clientHeight / 2 - (pos.y + NODE_H / 2) * scale;
  applyTransform();
  document.querySelectorAll(".map-node.is-focused").forEach((el) => el.classList.remove("is-focused"));
  const node = document.querySelector('[data-compound-id="' + CSS.escape(c.id) + '"]');
  if (node) {
    node.classList.add("is-focused");
    window.setTimeout(() => node.classList.remove("is-focused"), 2000);
  }
}
function searchAndFocus() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  if (!query) {
    searchStatus.textContent = "化合物名を入力してください。";
    searchStatus.className = "map-search-status error";
    return;
  }
  const c = nameMap[query] || compounds.find((item) => item.name.toLocaleLowerCase().includes(query) || (item.aliases || []).some((alias) => String(alias).toLocaleLowerCase().includes(query)));
  if (!c) {
    searchStatus.textContent = "登録された化合物が見つかりません。";
    searchStatus.className = "map-search-status error";
    return;
  }
  searchInput.value = c.name;
  searchStatus.textContent = c.name + "へ移動しました。";
  searchStatus.className = "map-search-status";
  focusCompound(c);
}
document.getElementById("map-search-button").addEventListener("click",searchAndFocus);
searchInput.addEventListener("keydown",(event) => { if(event.key === "Enter") { event.preventDefault(); searchAndFocus(); } });
document.getElementById("map-zoom-in").addEventListener("click",() => zoomAt(scale * 1.18));
document.getElementById("map-zoom-out").addEventListener("click",() => zoomAt(scale / 1.18));
document.getElementById("map-fit").addEventListener("click",fitToView);

viewport.addEventListener("wheel",(event) => {
  event.preventDefault();
  zoomAt(scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1),event.clientX,event.clientY);
},{passive:false});
viewport.addEventListener("pointerdown",(event) => {
  if (event.button !== 0 || event.target.closest(".map-node,.map-edge")) return;
  dragging = true;
  dragOrigin = {x:event.clientX,y:event.clientY,panX:panX,panY:panY};
  viewport.classList.add("is-dragging");
  try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
});
viewport.addEventListener("pointermove",(event) => {
  if (!dragging || !dragOrigin) return;
  panX = dragOrigin.panX + event.clientX - dragOrigin.x;
  panY = dragOrigin.panY + event.clientY - dragOrigin.y;
  applyTransform();
});
function stopDrag() {
  dragging = false;
  dragOrigin = null;
  viewport.classList.remove("is-dragging");
}
viewport.addEventListener("pointerup",stopDrag);
viewport.addEventListener("pointercancel",stopDrag);
window.addEventListener("resize",() => {
  if (!world.hidden && scale < 0.4) fitToView();
});

function reactionTypeLabel(type){
 const names={substitution:"置換反応",addition:"付加反応",oxidation:"酸化反応",reduction:"還元反応",elimination:"脱離反応",polymerization:"重合反応",other:"その他の反応"};
 return names[type]||"未分類の反応";
}
function renderReactionRegistry(){
 const host=document.getElementById("reaction-registry-list");
 const count=document.getElementById("reaction-registry-count");
 if(!host)return;
 const groups=Object.create(null);
 edges.forEach(edge=>{const key=edge.type||"other";(groups[key]||(groups[key]=[])).push(edge)});
 const order=["substitution","addition","oxidation","reduction","elimination","polymerization","other"];
 const keys=Object.keys(groups).sort((a,b)=>{
  const ai=order.indexOf(a),bi=order.indexOf(b);
  return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b);
 });
 host.replaceChildren();
 keys.forEach(type=>{
  const section=document.createElement("section");section.className="reaction-registry-group";
  const heading=document.createElement("h3");heading.className="reaction-registry-group-title";
  heading.textContent=reactionTypeLabel(type)+"（"+groups[type].length+"）";section.appendChild(heading);
  const list=document.createElement("div");list.className="reaction-registry-items";
  groups[type].forEach(edge=>{
   const button=document.createElement("button");button.type="button";button.className="reaction-registry-item";
   const route=document.createElement("span");route.className="reaction-registry-route";
   route.textContent=(byId[edge.from]?.name||edge.from)+" → "+(byId[edge.to]?.name||edge.to);
   const label=document.createElement("span");label.className="reaction-registry-label";label.textContent=edge.label||edge.name||"反応";
   button.append(route,label);button.addEventListener("click",()=>{
    focusCompound(byId[edge.from]);openReaction(edge);
   });
   list.appendChild(button);
  });
  section.appendChild(list);host.appendChild(section);
 });
 if(count)count.textContent=edges.length+"件";
}

function init() {
  const datalist = document.getElementById("map-compound-options");
  compounds.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.name;
    datalist.appendChild(option);
  });
  const dimensions = buildLayout();
  compounds.forEach(createNode);
  drawEdges(dimensions);
  world.style.width = dimensions.width + "px";
  world.style.height = dimensions.height + "px";
  world.dataset.mapWidth = dimensions.width;
  world.dataset.mapHeight = dimensions.height;
  world.hidden = false;
  loading.hidden = true;
  countEl.textContent = compounds.length + "化合物・" + edges.length + "登録反応を矢印表示";
  renderReactionRegistry();
  applyTransform();
  requestAnimationFrame(() => {
    const root=nodePositions[dimensions.primaryRoot]||nodePositions[dimensions.primaryNodes[0]];
    scale=Math.min(0.74,Math.max(0.66,viewport.clientWidth/1700));
    panX=viewport.clientWidth/2-(root.x+NODE_W/2)*scale;
    panY=viewport.clientHeight/2-(root.y+NODE_H/2)*scale;
    applyTransform();
  });
  renderStructures();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init);
else init();
})();