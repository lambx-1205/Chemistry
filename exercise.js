(() => {
"use strict";
const data=window.OrganicAtlasData;
const el=id=>document.getElementById(id);
const compounds=data?.compounds||[],edges=(data?.edges||[]).filter(e=>e&&e.from&&e.to&&e.condition);
const byId=Object.create(null),outgoing=Object.create(null),edgeByPair=Object.create(null);
compounds.forEach(c=>byId[c.id]=c);
edges.forEach(e=>{(outgoing[e.from]||(outgoing[e.from]=[])).push(e);edgeByPair[e.from+"|"+e.to]=e;});
const letters=["A","B","C","D"],recentPairs=new Set();
let mode="route",correct=0,answered=0,current=null,locked=false;
function shuffle(a){const arr=a.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function sample(a){return a[Math.floor(Math.random()*a.length)];}
function score(){el("exercise-score").textContent="正解 "+correct+" / 解答 "+answered;}
function makeRouteQuestion(){
 const starts=shuffle(compounds.filter(c=>(outgoing[c.id]||[]).length));
 for(let attempt=0;attempt<Math.min(90,starts.length);attempt++){
  const start=starts[attempt],dist=Object.create(null),prev=Object.create(null),q=[start.id];dist[start.id]=0;
  for(let head=0;head<q.length;head++){
   const id=q[head];if(dist[id]>=4)continue;
   shuffle(outgoing[id]||[]).forEach(edge=>{
    if(dist[edge.to]===undefined){dist[edge.to]=dist[id]+1;prev[edge.to]={id,edge};q.push(edge.to);}
   });
  }
  const goals=shuffle(Object.keys(dist).filter(id=>dist[id]>=2&&dist[id]<=4&&id!==start.id&&!recentPairs.has(start.id+"|"+id)));
  if(!goals.length)continue;
  const goal=goals[0],path=[goal];let cursor=goal;
  while(cursor!==start.id&&prev[cursor]){cursor=prev[cursor].id;path.push(cursor);}
  path.reverse();if(path[0]!==start.id||path.length<3||path.length>5)continue;
  recentPairs.add(start.id+"|"+goal);if(recentPairs.size>20)recentPairs.delete(recentPairs.values().next().value);
  const seen=new Set([path.join("|")]),options=[{path:path.slice(),correct:true}];
  for(let tries=0;options.length<4&&tries<250;tries++){
   const candidate=path.slice(),idx=1+Math.floor(Math.random()*(candidate.length-2)),replacement=sample(compounds).id;
   if(candidate.includes(replacement)||!byId[replacement])continue;
   candidate[idx]=replacement;
   const key=candidate.join("|");
   if(seen.has(key)||pathValid(candidate))continue;
   seen.add(key);options.push({path:candidate,correct:false});
  }
  if(options.length<4){
   const choices=shuffle(compounds.filter(c=>!path.includes(c.id)));
   while(options.length<4&&choices.length){const candidate=path.slice();candidate[1]=choices.pop().id;const key=candidate.join("|");if(seen.has(key)||pathValid(candidate))continue;seen.add(key);options.push({path:candidate,correct:false});}
  }
  if(options.length<2)continue;
  return {mode:"route",path,options:shuffle(options),start,goal};
 }
 return null;
}
function makeReagentQuestion(){
 const candidates=shuffle(edges.filter(e=>e.condition&&!/安全上/.test(e.condition)&&byId[e.from]&&byId[e.to]));
 for(const edge of candidates){
  const correctCondition=edge.condition;
  const others=shuffle([...new Set(edges.filter(e=>e.id!==edge.id&&!/安全上/.test(e.condition||"")).map(e=>e.condition).filter(c=>c&&c!==correctCondition))]).slice(0,3);
  if(others.length<3)continue;
  return {mode:"reagent",edge,options:shuffle([correctCondition,...others].map(value=>({value,correct:value===correctCondition})))};
 }
 return null;
}
function structureImageUrl(compound,size){
 if(!compound)return "";
 const imageSize=size||"500x320";
 if(compound.pubchemCid)return "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/"+encodeURIComponent(compound.pubchemCid)+"/PNG?image_size="+encodeURIComponent(imageSize);
 if(compound.smiles&&!/[＊*]/.test(compound.smiles))return "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/"+encodeURIComponent(compound.smiles)+"/PNG?image_size="+encodeURIComponent(imageSize);
 return "";
}
function structureFigure(compound,size,className){
 const figure=document.createElement("figure");figure.className=className||"exercise-structure-figure";
 const image=document.createElement("img");image.className="exercise-structure-image";
 image.alt=(compound?.name||"化合物")+"の2D構造式";image.loading="lazy";image.referrerPolicy="no-referrer";
 const fallback=document.createElement("p");fallback.className="exercise-structure-fallback";fallback.hidden=true;
 fallback.textContent="構造式画像を取得できません。分子式："+(compound?.formula||"未登録");
 const url=structureImageUrl(compound,size);
 if(url){
  image.src=url;
  image.onerror=()=>{image.hidden=true;fallback.hidden=false;};
 }else{image.hidden=true;fallback.hidden=false;}
 const caption=document.createElement("figcaption");caption.textContent=(compound?.name||"化合物")+(compound?.formula?" · "+compound.formula:"");
 figure.append(image,fallback,caption);return figure;
}
function endpoint(label,compound){
 const box=document.createElement("div");box.className="exercise-endpoint";
 const small=document.createElement("span");small.textContent=label;
 const structure=structureFigure(compound,"500x320","exercise-endpoint-structure");
 const strong=document.createElement("strong");strong.textContent=compound?.name||"不明な化合物";
 box.append(small,structure,strong);return box;
}
function showEndpoints(items){
 const host=el("question-endpoints");host.replaceChildren();
 items.forEach((item,i)=>{if(i){const arrow=document.createElement("span");arrow.className="exercise-endpoint-arrow";arrow.textContent="→";host.appendChild(arrow);}host.appendChild(endpoint(item.label,item.compound));});
}
function edgeForPath(path,i){return edgeByPair[path[i]+"|"+path[i+1]]||null;}
function pathValid(path){for(let i=0;i<path.length-1;i++)if(!edgeByPair[path[i]+"|"+path[i+1]])return false;return true;}
function reactionScheme(edge,className){
 const scheme=document.createElement("div");scheme.className=className||"exercise-reaction-scheme";
 const from=byId[edge.from],to=byId[edge.to];
 scheme.appendChild(structureFigure(from,"500x320","exercise-reaction-compound"));
 const arrow=document.createElement("div");arrow.className="exercise-reaction-arrow";
 const symbol=document.createElement("strong");symbol.textContent="→";
 const condition=document.createElement("span");condition.textContent=edge.condition||"条件未登録";
 arrow.append(symbol,condition);scheme.appendChild(arrow);
 scheme.appendChild(structureFigure(to,"500x320","exercise-reaction-compound"));
 return scheme;
}
function addDetailLine(host,label,value){
 const line=document.createElement("p");line.className="exercise-detail-line";
 const strong=document.createElement("strong");strong.textContent=label+"：";
 line.append(strong,document.createTextNode(value||"未登録"));host.appendChild(line);
}
function renderDetails(q){
 const host=el("exercise-answer-details");host.replaceChildren();host.hidden=false;
 const title=document.createElement("h3");title.textContent=q.mode==="route"?"構造式でたどる反応経路":"構造式で理解する反応条件";host.appendChild(title);
 if(q.mode==="route"){
  const intro=document.createElement("p");intro.className="exercise-answer-intro";
  intro.textContent="正しい経路："+q.path.map(id=>byId[id]?.name||id).join(" → ");host.appendChild(intro);
  for(let i=0;i<q.path.length-1;i++){
   const edge=edgeForPath(q.path,i);if(!edge)continue;
   const row=document.createElement("article");row.className="exercise-answer-step";
   const heading=document.createElement("h4");heading.textContent="第"+(i+1)+"段階："+(edge.name||edge.label||"反応");
   row.appendChild(heading);row.appendChild(reactionScheme(edge));
   addDetailLine(row,"試薬・条件",edge.condition);
   addDetailLine(row,"反応式",edge.equation||(byId[edge.from].formula+" → "+byId[edge.to].formula));
   if(edge.note)addDetailLine(row,"構造変化",edge.note);
   host.appendChild(row);
  }
 }else{
  const edge=q.edge;
  const row=document.createElement("div");row.className="exercise-answer-reagent";
  row.appendChild(reactionScheme(edge));
  addDetailLine(row,"反応の種類",edge.name||edge.label||"反応");
  addDetailLine(row,"反応式",edge.equation||(byId[edge.from].formula+" → "+byId[edge.to].formula));
  addDetailLine(row,"試薬・条件",edge.condition);
  addDetailLine(row,"構造変化",edge.note||"反応物と生成物の構造式を見比べ、変化した官能基や結合に注目しましょう。");
  host.appendChild(row);
}
}
function answer(selected,q,button){
 if(locked)return;locked=true;answered++;if(selected.correct)correct++;score();
 const buttons=[...el("exercise-options").querySelectorAll("button")];
 buttons.forEach(b=>{b.disabled=true;const opt=q.options[Number(b.dataset.index)];if(opt.correct)b.classList.add("is-correct");});
 if(!selected.correct)button.classList.add("is-wrong");
 const feedback=el("exercise-feedback");feedback.hidden=false;feedback.className="exercise-feedback"+(selected.correct?"":" is-wrong");
 feedback.textContent=selected.correct?"正解です。反応のつながりを確認しましょう。":"不正解です。正しい答えと反応条件を確認して、次の問題で整理しましょう。";
 renderDetails(q);el("next-question").disabled=false;
 el("exercise-progress-note").textContent=selected.correct?"正解！":"解説を読んで、反応の根拠を確認してください。";
}
function renderQuestion(){
 locked=false;el("exercise-options").replaceChildren();el("exercise-feedback").hidden=true;el("exercise-answer-details").hidden=true;el("exercise-answer-details").replaceChildren();el("next-question").disabled=true;el("question-equation").hidden=true;
 const q=mode==="route"?makeRouteQuestion():makeReagentQuestion();current=q;
 if(!q){el("question-title").textContent="問題を準備できませんでした";el("question-prompt").textContent="登録データに十分な反応経路がないようです。ページを再読み込みしてください。";el("exercise-options").replaceChildren();return;}
 if(mode==="route"){
  el("question-kicker").textContent="ROUTE CHALLENGE";el("question-title").textContent="反応経路を組み立てよう";el("question-prompt").textContent="始点から終点までをつなぐ正しい化合物の並びを選んでください。反応の向きも考慮します。";
  showEndpoints([{label:"START · 始点",compound:byId[q.path[0]]},{label:"GOAL · 終点",compound:byId[q.path[q.path.length-1]]}]);
 }else{
  const edge=q.edge;el("question-kicker").textContent="REAGENT & CONDITIONS";el("question-title").textContent="必要な試薬・条件は？";el("question-prompt").textContent="この反応を進めるために必要な試薬・反応条件を選んでください。";
  showEndpoints([{label:"出発物質",compound:byId[edge.from]},{label:"生成物",compound:byId[edge.to]}]);
  const eq=el("question-equation");eq.hidden=false;eq.textContent=(edge.name||edge.label||"反応")+"｜"+(edge.equation||byId[edge.from].formula+" → "+byId[edge.to].formula);
 }
 q.options.forEach((option,index)=>{
  const button=document.createElement("button");button.type="button";button.className="exercise-option";button.dataset.index=String(index);
  const letter=document.createElement("span");letter.className="exercise-option-letter";letter.textContent=letters[index];
  const label=document.createElement("span");label.className="exercise-option-text";
  label.textContent=mode==="route"?option.path.map(id=>byId[id]?.name||id).join(" → "):option.value;
  button.append(letter,label);button.addEventListener("click",()=>answer(option,q,button));el("exercise-options").appendChild(button);
 });
 el("exercise-progress-note").textContent="登録済み反応 "+edges.length+" 件をもとに出題しています。";
}
function setMode(next){
 mode=next;
 el("mode-route").classList.toggle("is-active",mode==="route");el("mode-route").setAttribute("aria-pressed",String(mode==="route"));
 el("mode-reagent").classList.toggle("is-active",mode==="reagent");el("mode-reagent").setAttribute("aria-pressed",String(mode==="reagent"));
 renderQuestion();
}
el("mode-route").addEventListener("click",()=>setMode("route"));
el("mode-reagent").addEventListener("click",()=>setMode("reagent"));
el("next-question").addEventListener("click",renderQuestion);
score();renderQuestion();
})();