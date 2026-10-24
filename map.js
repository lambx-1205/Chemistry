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

const NODE_W = 280;
const NODE_H = 220;
const COL_STEP = 560;
const ROW_STEP = 285;
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
  e80:"C₅₇H₁₁₀O₆ + 3NaOH → C₃H₈O₃ + 3C₁₈H₃₅NaO₂"
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
function buildAdjacency() {
  const adj = Object.create(null);
  const inDeg = Object.create(null);
  const outDeg = Object.create(null);
  compounds.forEach((c) => { adj[c.id] = []; inDeg[c.id] = 0; outDeg[c.id] = 0; });
  edges.forEach((e) => {
    if (!adj[e.from] || !adj[e.to]) return;
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
    outDeg[e.from] += 1;
    inDeg[e.to] += 1;
  });
  return { adj, inDeg, outDeg };
}
const graph = buildAdjacency();

function makeComponent(nodes) {
  const nodeSet = new Set(nodes);
  const root = nodes.slice().sort((a, b) => {
    const sa = (graph.inDeg[a] === 0 ? 100 : 0) + graph.outDeg[a] * 5 - graph.inDeg[a] * 2 + graph.adj[a].length;
    const sb = (graph.inDeg[b] === 0 ? 100 : 0) + graph.outDeg[b] * 5 - graph.inDeg[b] * 2 + graph.adj[b].length;
    return sb - sa || compoundOrder[a] - compoundOrder[b];
  })[0];
  const depth = Object.create(null);
  const queue = [root];
  depth[root] = 0;
  while (queue.length) {
    const cur = queue.shift();
    graph.adj[cur].forEach((next) => {
      if (nodeSet.has(next) && depth[next] === undefined) {
        depth[next] = depth[cur] + 1;
        queue.push(next);
      }
    });
  }
  const maxDepth = Math.max.apply(null, nodes.map((id) => depth[id] || 0));
  const layers = Array.from({length:maxDepth + 1}, () => []);
  nodes.forEach((id) => layers[depth[id] || 0].push(id));
  layers.forEach((layer) => layer.sort((a,b) => compoundOrder[a] - compoundOrder[b]));

  for (let pass = 0; pass < 3; pass += 1) {
    for (let d = 1; d < layers.length; d += 1) {
      const prevIndex = Object.create(null);
      layers[d - 1].forEach((id, i) => { prevIndex[id] = i; });
      layers[d].sort((a,b) => {
        const mean = (id) => {
          const links = graph.adj[id].filter((n) => prevIndex[n] !== undefined);
          return links.length ? links.reduce((sum,n) => sum + prevIndex[n],0) / links.length : compoundOrder[id];
        };
        return mean(a) - mean(b) || compoundOrder[a] - compoundOrder[b];
      });
    }
    for (let d = layers.length - 2; d >= 0; d -= 1) {
      const nextIndex = Object.create(null);
      layers[d + 1].forEach((id, i) => { nextIndex[id] = i; });
      layers[d].sort((a,b) => {
        const mean = (id) => {
          const links = graph.adj[id].filter((n) => nextIndex[n] !== undefined);
          return links.length ? links.reduce((sum,n) => sum + nextIndex[n],0) / links.length : compoundOrder[id];
        };
        return mean(a) - mean(b) || compoundOrder[a] - compoundOrder[b];
      });
    }
  }

  const maxRows = Math.max.apply(null, layers.map((layer) => layer.length));
  return {
    nodes:nodes,
    root:root,
    layers:layers,
    width:90 + maxDepth * COL_STEP + NODE_W,
    height:72 + maxRows * ROW_STEP,
    positions:Object.create(null)
  };
}

function buildLayout() {
  const visited = new Set();
  const components = [];
  compounds.forEach((c) => {
    if (visited.has(c.id)) return;
    const queue = [c.id];
    const nodes = [];
    visited.add(c.id);
    while (queue.length) {
      const id = queue.shift();
      nodes.push(id);
      graph.adj[id].forEach((n) => {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      });
    }
    if (nodes.length > 1) components.push(makeComponent(nodes));
  });
  components.sort((a,b) => b.nodes.length - a.nodes.length);

  let cursorX = 80, cursorY = 70, rowHeight = 0, maxX = 0, maxY = 0;
  const rowLimit = 3150;
  components.forEach((comp) => {
    const compHeight = comp.height + 34;
    if (cursorX > 80 && cursorX + comp.width + 80 > rowLimit) {
      cursorX = 80;
      cursorY += rowHeight + 95;
      rowHeight = 0;
    }
    comp.originX = cursorX;
    comp.originY = cursorY;
    const title = document.createElement("div");
    title.className = "map-group-title";
    title.style.left = cursorX + "px";
    title.style.top = cursorY + "px";
    title.textContent = groupTitle(comp);
    groupLayer.appendChild(title);

    const maxRows = Math.max.apply(null, comp.layers.map((layer) => layer.length));
    comp.layers.forEach((layer, depth) => {
      const yOffset = (maxRows - layer.length) * ROW_STEP / 2;
      layer.forEach((id, i) => {
        comp.positions[id] = {
          x:cursorX + 42 + depth * COL_STEP,
          y:cursorY + 37 + yOffset + i * ROW_STEP
        };
        nodePositions[id] = comp.positions[id];
      });
    });
    cursorX += comp.width + 112;
    rowHeight = Math.max(rowHeight, compHeight);
    maxX = Math.max(maxX, cursorX);
    maxY = Math.max(maxY, cursorY + compHeight);
  });

  const isolated = compounds.filter((c) => graph.adj[c.id].length === 0);
  if (isolated.length) {
    const startY = maxY + 85;
    const title = document.createElement("div");
    title.className = "map-group-title";
    title.style.left = "80px";
    title.style.top = startY + "px";
    title.textContent = "反応経路が未登録の化合物";
    groupLayer.appendChild(title);
    const cols = 7;
    isolated.sort((a,b) => compoundOrder[a.id] - compoundOrder[b.id]).forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodePositions[c.id] = {x:80 + col * 320, y:startY + 36 + row * 250};
    });
    maxX = Math.max(maxX, 80 + Math.min(cols, isolated.length) * 320);
    maxY = Math.max(maxY, startY + 36 + Math.ceil(isolated.length / cols) * 250 + NODE_H);
  }

  return {
    width:Math.max(2850, maxX + 80),
    height:Math.max(1100, maxY + 70),
    primaryNodes:components.length ? components[0].nodes : compounds.map((c) => c.id)
  };
}

function createNode(c) {
  const pos = nodePositions[c.id];
  const node = document.createElement("a");
  node.className = "map-node";
  node.href = "index.html?compound=" + encodeURIComponent(c.id);
  node.dataset.compoundId = c.id;
  node.style.left = pos.x + "px";
  node.style.top = pos.y + "px";
  node.setAttribute("aria-label", c.name + "の詳細ページを開く");
  const family = document.createElement("span");
  family.className = "map-node-family";
  family.textContent = niceFamily(c);
  const name = document.createElement("span");
  name.className = "map-node-name";
  name.textContent = c.name;
  const structure = document.createElement("span");
  structure.className = "map-node-structure";
  structure.dataset.structureId = c.id;
  structure.setAttribute("aria-label", c.name + "の構造式");
  const formula = document.createElement("span");
  formula.className = "map-node-formula";
  formula.textContent = c.formula || "分子式未登録";
  node.append(family, name, structure, formula);
  nodeLayer.appendChild(node);
}

function drawEdges(dimensions) {
  linesSvg.setAttribute("width", dimensions.width);
  linesSvg.setAttribute("height", dimensions.height);
  linesSvg.setAttribute("viewBox", "0 0 " + dimensions.width + " " + dimensions.height);
  linesSvg.style.width = dimensions.width + "px";
  linesSvg.style.height = dimensions.height + "px";

  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id:"map-arrow-head", markerWidth:"9", markerHeight:"9",
    refX:"7.4", refY:"4.5", orient:"auto", markerUnits:"userSpaceOnUse"
  });
  marker.appendChild(svgEl("path",{d:"M0,0 L9,4.5 L0,9 Z",fill:"#628d6a"}));
  defs.appendChild(marker);
  linesSvg.appendChild(defs);

  // Route every arrow with 0°/90° segments only. The final segment is
  // horizontal, and every edge gets separate card ports and a separate lane.
  const specs = edges.map((edge) => {
    const fromPos = nodePositions[edge.from];
    const toPos = nodePositions[edge.to];
    if (!fromPos || !toPos) return null;
    const sameColumn = Math.abs(fromPos.x - toPos.x) < 1;
    let startSide, endSide, gapStart, laneDirection;
    if (sameColumn) {
      startSide = "right";
      endSide = "right";
      gapStart = fromPos.x + NODE_W;
      laneDirection = "right";
    } else if (fromPos.x < toPos.x) {
      startSide = "right";
      endSide = "left";
      gapStart = fromPos.x + NODE_W;
      laneDirection = "right";
    } else {
      startSide = "left";
      endSide = "right";
      gapStart = toPos.x + NODE_W;
      laneDirection = "left";
    }
    return {edge,fromPos,toPos,sameColumn,startSide,endSide,gapStart,laneDirection};
  }).filter(Boolean);

  // Spread attachment points along each card edge, ordered by destination.
  const portGroups = Object.create(null);
  specs.forEach((spec) => {
    [
      {id:spec.edge.from,side:spec.startSide,other:spec.toPos,where:"start"},
      {id:spec.edge.to,side:spec.endSide,other:spec.fromPos,where:"end"}
    ].forEach((item) => {
      const key = item.id + "|" + item.side;
      (portGroups[key] ||= []).push({spec,where:item.where,other:item.other});
    });
  });
  const ports = Object.create(null);
  Object.keys(portGroups).forEach((key) => {
    const entries = portGroups[key].sort((a,b) => {
      const av = a.other.y + NODE_H / 2;
      const bv = b.other.y + NODE_H / 2;
      return av - bv || String(a.spec.edge.id).localeCompare(String(b.spec.edge.id));
    });
    const maxSpread = NODE_H * 0.42;
    entries.forEach((entry,i) => {
      const offset = entries.length <= 1 ? 0 : -maxSpread + (2 * maxSpread * i / (entries.length - 1));
      const pos = entry.where === "start" ? entry.spec.fromPos : entry.spec.toPos;
      let point;
      if (entry.where === "start") {
        if (entry.spec.startSide === "right") point = {x:pos.x + NODE_W,y:pos.y + NODE_H/2 + offset};
        else if (entry.spec.startSide === "left") point = {x:pos.x,y:pos.y + NODE_H/2 + offset};
        else if (entry.spec.startSide === "bottom") point = {x:pos.x + NODE_W/2 + offset,y:pos.y + NODE_H};
        else point = {x:pos.x + NODE_W/2 + offset,y:pos.y};
      } else {
        if (entry.spec.endSide === "right") point = {x:pos.x + NODE_W,y:pos.y + NODE_H/2 + offset};
        else if (entry.spec.endSide === "left") point = {x:pos.x,y:pos.y + NODE_H/2 + offset};
        else if (entry.spec.endSide === "bottom") point = {x:pos.x + NODE_W/2 + offset,y:pos.y + NODE_H};
        else point = {x:pos.x + NODE_W/2 + offset,y:pos.y};
      }
      ports[entry.spec.edge.id + "|" + entry.where] = point;
      if (entry.where === "start") entry.spec.portOrder = i;
    });
  });

  // Keep lanes on the destination half of each gap. This makes the source
  // segment long enough for the reaction label, while lane x-coordinates stay
  // unique so two arrows cannot lie on top of one another.
  const gapGroups = Object.create(null);
  specs.forEach((spec) => {
    const key = spec.gapStart + "|" + spec.laneDirection;
    (gapGroups[key] ||= []).push(spec);
  });
  Object.keys(gapGroups).forEach((key) => {
    const group = gapGroups[key].sort((a,b) => {
      const ay = ports[a.edge.id + "|start"].y;
      const by = ports[b.edge.id + "|start"].y;
      return ay - by || String(a.edge.id).localeCompare(String(b.edge.id));
    });
    const gapStart = group[0].gapStart;
    const gapWidth = COL_STEP - NODE_W;
    const mid = gapStart + gapWidth / 2;
    const outerMargin = 24;
    const innerMargin = 12;
    const left = gapStart + outerMargin;
    const right = gapStart + gapWidth - outerMargin;
    const laneMin = group[0].laneDirection === "right" ? mid + innerMargin : left;
    const laneMax = group[0].laneDirection === "right" ? right : mid - innerMargin;
    const span = Math.max(8,laneMax-laneMin);
    group.forEach((spec,i) => {
      spec.laneX = group.length === 1 ? (laneMin+laneMax)/2 : laneMin + span*i/(group.length-1);
      // Alternate label spacing to keep crowded branches from colliding.
      spec.labelTier = (spec.portOrder || 0) % 2;
    });
  });

  specs.forEach((spec) => {
    const edge = spec.edge;
    const startPoint = ports[edge.id + "|start"];
    const endPoint = ports[edge.id + "|end"];
    const gapStart = spec.gapStart;
    const gapWidth = COL_STEP - NODE_W;
    const midX = gapStart + gapWidth/2;
    const points = [
      startPoint,
      {x:midX,y:startPoint.y},
      {x:spec.laneX,y:startPoint.y},
      {x:spec.laneX,y:endPoint.y},
      endPoint
    ];
    const compact = points.filter((point,i) => i===0 || point.x!==points[i-1].x || point.y!==points[i-1].y);
    const pathD = compact.map((point,i) => (i===0?"M":"L")+point.x.toFixed(1)+","+point.y.toFixed(1)).join(" ");
    const arrowPointsLeft = spec.laneDirection === "left";
    const labelText = edge.label || edge.name || "反応";
    const labelWidth = Math.min(180,Math.max(56,labelText.length*12+20));
    const labelX = midX;
    const labelY = startPoint.y + (arrowPointsLeft ? 1 : -1) * (18 + 12*spec.labelTier);
    const group = svgEl("g",{
      class:"map-edge",tabindex:"0",role:"button","data-edge-id":edge.id,
      "aria-label":(edge.name || edge.label)+"。反応式を表示"
    });
    const hit = svgEl("path",{class:"map-edge-hitbox",d:pathD});
    const visible = svgEl("path",{class:"map-edge-visible",d:pathD,"marker-end":"url(#map-arrow-head)"});
    const labelBg = svgEl("rect",{
      class:"map-edge-label-bg",
      x:(labelX-labelWidth/2).toFixed(1),y:(labelY-11).toFixed(1),
      width:labelWidth,height:22,rx:7
    });
    const label = svgEl("text",{class:"map-edge-label-text",x:labelX.toFixed(1),y:labelY.toFixed(1)});
    label.textContent = labelText;
    group.append(hit,visible,labelBg,label);
    group.addEventListener("click",() => openReaction(edge));
    group.addEventListener("keydown",(event) => {
      if(event.key==="Enter"||event.key===" "){event.preventDefault();openReaction(edge);}
    });
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
        mol = rdkit.get_mol(compound.smiles);
        if (!mol) throw new Error("SMILES parse failed");
        const opts = {width:260,height:126,bondLineWidth:1.65,scaleBondWidth:true,multipleBondOffset:0.15,padding:0.035,minFontSize:7,maxFontSize:17,annotationFontScale:0.58};
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
  countEl.textContent = compounds.length + "化合物・" + edges.length + "反応";
  applyTransform();
  requestAnimationFrame(() => {
    const primary = dimensions.primaryNodes.map((id) => nodePositions[id]).filter(Boolean);
    const minX = Math.min.apply(null, primary.map((p) => p.x));
    const minY = Math.min.apply(null, primary.map((p) => p.y));
    const maxX = Math.max.apply(null, primary.map((p) => p.x + NODE_W));
    const maxY = Math.max.apply(null, primary.map((p) => p.y + NODE_H));
    const regionW = maxX - minX;
    const regionH = maxY - minY;
    scale = Math.min(0.68, Math.max(0.56, (viewport.clientWidth - 40) / regionW));
    // Keep the main reaction group comfortably readable; the user can pan to
    // other groups or use "全体表示" when they need the complete atlas.
    panX = (viewport.clientWidth - regionW * scale) / 2 - minX * scale;
    panY = (viewport.clientHeight - Math.min(regionH, viewport.clientHeight / scale) * scale) / 2 - minY * scale;
    applyTransform();
  });
  renderStructures();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init);
else init();
})();