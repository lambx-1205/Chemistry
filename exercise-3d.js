import "./molecule3d.js";

const initialize = () => {
  "use strict";

  const data = window.OrganicAtlasData;
  const $ = id => document.getElementById(id);
  const stage = $("structure-game-stage");
  if (!stage || !data) return;

  const candidates = (data.compounds || []).filter(compound =>
    compound &&
    compound.name &&
    compound.pubchemCid &&
    compound.smiles &&
    compound.pubchemLookupStatus !== "not-applicable" &&
    compound.kind !== "polymer" &&
    compound.family !== "高分子化合物"
  );

  const letters = ["A", "B", "C", "D"];
  const recentIds = [];
  let current = null;
  let activeViewer = null;
  let modelMode = "spacefill";
  let requestToken = 0;
  let consecutiveLoadFailures = 0;
  let correct = 0;
  let answered = 0;
  let locked = true;

  function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function sample(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function scoreText() {
    $("structure-game-score").textContent = "正解 " + correct + " / 解答 " + answered;
  }

  function setStatus(message, isError) {
    const status = $("structure-game-status");
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function disposeViewer() {
    if (activeViewer && typeof activeViewer.dispose === "function") {
      activeViewer.dispose();
    } else if (window.Molecule3DViewer && typeof window.Molecule3DViewer.dispose === "function") {
      window.Molecule3DViewer.dispose();
    }
    activeViewer = null;
    stage.replaceChildren();
  }

  function setMode(nextMode) {
    modelMode = nextMode;
    $("structure-game-spacefill").classList.toggle("is-active", modelMode === "spacefill");
    $("structure-game-spacefill").setAttribute("aria-pressed", String(modelMode === "spacefill"));
    $("structure-game-ballstick").classList.toggle("is-active", modelMode === "ballstick");
    $("structure-game-ballstick").setAttribute("aria-pressed", String(modelMode === "ballstick"));
    if (activeViewer && typeof activeViewer.setMode === "function") {
      activeViewer.setMode(modelMode);
    }
  }

  function pubchemUrl(compound) {
    return "https://pubchem.ncbi.nlm.nih.gov/compound/" + encodeURIComponent(compound.pubchemCid);
  }

  async function fetch3DRecord(compound) {
    const url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
      encodeURIComponent(compound.pubchemCid) + "/SDF?record_type=3d";
    const response = await fetch(url, { headers: { Accept: "chemical/x-mdl-sdfile" } });
    if (!response.ok) {
      throw new Error("この化合物の3D座標を取得できませんでした（HTTP " + response.status + "）。");
    }
    const sdf = await response.text();
    if (!/V2000|V3000/.test(sdf)) {
      throw new Error("PubChemから有効な3D座標を読み取れませんでした。");
    }
    return { sdf, url: pubchemUrl(compound) };
  }

  function formulaCounts(compound) {
    const raw = String(compound.formula || compound.pubchemFormula || "")
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, digit => "₀₁₂₃₄₅₆₇₈₉".indexOf(digit))
      .replace(/\s+/g, "");
    const counts = {};
    const pattern = /([A-Z][a-z]?)(\d*)/g;
    let match;
    let consumed = "";
    while ((match = pattern.exec(raw)) !== null) {
      counts[match[1]] = (counts[match[1]] || 0) + Number(match[2] || 1);
      consumed += match[0];
    }
    return consumed === raw && raw.length > 0 ? counts : null;
  }

  function formulaSimilarity(a, b) {
    const ca = formulaCounts(a);
    const cb = formulaCounts(b);
    if (!ca || !cb) return 0;
    const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
    let distance = 0;
    let total = 0;
    let sharedElements = 0;
    keys.forEach(key => {
      const av = ca[key] || 0;
      const bv = cb[key] || 0;
      distance += Math.abs(av - bv);
      total += Math.max(av, bv);
      if (av > 0 && bv > 0) sharedElements++;
    });
    const composition = total ? 1 - distance / total : 0;
    const elementOverlap = keys.size ? sharedElements / keys.size : 0;
    const exact = distance === 0;
    return (exact ? 60 : 0) + composition * 24 + elementOverlap * 12;
  }

  function sameFormula(a, b) {
    const ca = formulaCounts(a);
    const cb = formulaCounts(b);
    if (!ca || !cb) return false;
    const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
    return [...keys].every(key => (ca[key] || 0) === (cb[key] || 0));
  }

  function isomerPeers(answer, pool) {
    const peerIds = new Set();
    (data.isomerGroups || []).forEach(group => {
      const members = [...(group.members || []), ...(group.contextIds || [])];
      if (!members.includes(answer.id)) return;
      members.forEach(id => {
        if (id !== answer.id) peerIds.add(id);
      });
    });
    return pool.filter(compound => peerIds.has(compound.id) && sameFormula(answer, compound));
  }

  function reactionNeighbors(answer, pool) {
    const neighborIds = new Set();
    (data.edges || []).forEach(edge => {
      if (edge.from === answer.id && edge.to) neighborIds.add(edge.to);
      if (edge.to === answer.id && edge.from) neighborIds.add(edge.from);
    });
    return pool.filter(compound => neighborIds.has(compound.id));
  }

  function similarityScore(answer, candidate) {
    let score = formulaSimilarity(answer, candidate);
    if (sameFormula(answer, candidate)) score += 48;

    // Broad family labels help, but must not outweigh the actual molecular structure.
    if (answer.family && candidate.family === answer.family) score += 17;
    else if (answer.family && candidate.family && (
      answer.family.includes(candidate.family) || candidate.family.includes(answer.family)
    )) score += 7;

    const answerTokens = structureTokens(answer);
    const candidateTokens = structureTokens(candidate);
    const tokenKeys = ["rings", "doubleBonds", "tripleBonds", "aromatic", "stereocentres"];
    tokenKeys.forEach(key => {
      if (answerTokens[key] === candidateTokens[key]) score += key === "rings" ? 7 : 5;
    });

    // Give extra credit to matching functional patterns, which make choices visually confusable.
    const aSmiles = String(answer.smiles || "");
    const bSmiles = String(candidate.smiles || "");
    const motifs = [
      /C\(=O\)O|C\(=O\)\[O-\]/,
      /C\(=O\)O[CNc]|C\(=O\)OC/,
      /C=O(?!O)/,
      /C#N/,
      /\[N\+\]\(=O\)\[O-\]/,
      /c[0-9].*c[0-9]/,
      /Cl|Br|I|F/
    ];
    motifs.forEach(pattern => {
      if (pattern.test(aSmiles) === pattern.test(bSmiles)) score += 3;
    });

    const elementUnion = new Set([...answerTokens.elements, ...candidateTokens.elements]);
    const commonElements = [...answerTokens.elements].filter(element => candidateTokens.elements.has(element)).length;
    if (elementUnion.size) score += 10 * commonElements / elementUnion.size;

    const aWeight = Number(answer.molecularWeight);
    const bWeight = Number(candidate.molecularWeight);
    if (Number.isFinite(aWeight) && Number.isFinite(bWeight)) {
      score += 16 * Math.exp(-Math.abs(aWeight - bWeight) / Math.max(14, aWeight * 0.18));
    }
    return score;
  }

  function makeOptions(answer) {
    const pool = candidates.filter(compound =>
      compound.id !== answer.id &&
      compound.name !== answer.name &&
      !(answer.inchiKey && compound.inchiKey && answer.inchiKey === compound.inchiKey)
    );
    if (pool.length < 3) return [];

    const used = new Set();
    const others = [];
    const ranked = list => list
      .filter(compound => !used.has(compound.id))
      .map(compound => ({
        compound,
        score: similarityScore(answer, compound) + Math.random() * 3
      }))
      .sort((a, b) => b.score - a.score);

    function addBest(list) {
      if (others.length >= 3) return;
      const ranking = ranked(list);
      if (!ranking.length) return;
      // Vary only among the strongest candidates, rather than drawing from a broad, weak shortlist.
      const shortlist = ranking.slice(0, Math.min(3, ranking.length));
      const selected = sample(shortlist).compound;
      used.add(selected.id);
      others.push(selected);
    }

    // 1) Prefer a known constitutional, positional, or stereoisomer with the same formula.
    addBest(isomerPeers(answer, pool));

    // 2) Add at most two same-formula distractors, keeping the full set varied.
    const exactFormula = pool.filter(compound => sameFormula(answer, compound));
    while (others.length < 2 && exactFormula.some(compound => !used.has(compound.id))) {
      addBest(exactFormula);
    }

    // 3) Prefer the same compound family, then immediate reaction neighbors.
    const sameFamily = pool.filter(compound =>
      answer.family && compound.family === answer.family
    );
    addBest(sameFamily);
    addBest(reactionNeighbors(answer, pool));

    // 4) Fill remaining slots with the closest structures, not random global picks.
    addBest(pool.slice().sort((a, b) =>
      similarityScore(answer, b) - similarityScore(answer, a)
    ));

    if (others.length < 3) return [];
    return shuffle([answer, ...others]).map(compound => ({
      id: compound.id,
      name: compound.name,
      correct: compound.id === answer.id,
      compound
    }));
  }

  function renderOptions(options) {
    const host = $("structure-game-options");
    host.replaceChildren();
    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "structure-game-option";
      button.dataset.index = String(index);
      button.disabled = true;

      const letter = document.createElement("span");
      letter.className = "structure-game-option-letter";
      letter.textContent = letters[index];

      const name = document.createElement("span");
      name.className = "structure-game-option-name";
      name.textContent = option.name;

      button.append(letter, name);
      button.addEventListener("click", () => answerQuestion(option, button));
      host.appendChild(button);
    });
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function structureImageUrl(compound, size) {
    return "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
      encodeURIComponent(compound.pubchemCid) + "/PNG?image_size=" + (size || "500x400");
  }

  function mountStructure(compound, host, fallbackSize, fallbackClass) {
    const useFallback = () => {
      host.replaceChildren();
      const url = structureImageUrl(compound, fallbackSize);
      if (!url) {
        host.appendChild(createElement("p", "structure-game-image-fallback",
          "構造式を描画できませんでした。分子式：" + (compound.formula || "未登録")));
        return;
      }
      const image = createElement("img", fallbackClass || "structure-game-structure-image");
      image.src = url;
      image.alt = compound.name + " の構造式";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => {
        image.hidden = true;
        host.appendChild(createElement("p", "structure-game-image-fallback",
          "構造式を読み込めませんでした。分子式：" + (compound.formula || "未登録")));
      };
      host.appendChild(image);
    };
    const renderer = window.OrganicAtlasStructureRenderer;
    if (renderer && typeof renderer.mount === "function") {
      renderer.mount(compound, host).catch(useFallback);
    } else {
      useFallback();
    }
  }

  function compareExplanation(answer, candidate) {
    if (answer.formula && candidate.formula && answer.formula === candidate.formula) {
      return "分子式は同じ。異性体どうしなので、結合の位置・官能基の位置・立体配置を見分ける。";
    }
    if (answer.family && answer.family === candidate.family) {
      return "同じ分類の仲間。炭素鎖の長さ、分岐、二重結合や官能基の位置に注目する。";
    }
    const aCounts = formulaCounts(answer);
    const bCounts = formulaCounts(candidate);
    if (aCounts && bCounts) {
      const elements = new Set([...Object.keys(aCounts), ...Object.keys(bCounts)]);
      const changed = [...elements].filter(element => (aCounts[element] || 0) !== (bCounts[element] || 0));
      if (changed.length) {
        return "元素の種類・個数が異なる（" + changed.join("・") + "）。原子の色と数、官能基を照合する。";
      }
    }
    return "骨格や官能基の組み合わせが異なる。環構造と特徴的な結合を順に確認する。";
  }

  function revealAnswer(compound, selected) {
    const panel = $("structure-game-answer");
    panel.replaceChildren();
    panel.hidden = false;

    const heading = createElement("h3", "structure-game-answer-title", "正解：" + compound.name);
    const metadata = createElement(
      "p",
      "structure-game-answer-meta",
      "分子式 " + (compound.formula || "未登録") +
        "　／　分類 " + (compound.family || "未分類") +
        (compound.molecularWeight ? "　／　分子量 " + compound.molecularWeight : "")
    );
    panel.append(heading, metadata);

    if (selected && !selected.correct) {
      const selectedNote = createElement(
        "p",
        "structure-game-selected-note",
        "選んだ答え：" + selected.name + "。下の構造図を見比べて、どこが違うか確認しよう。"
      );
      panel.appendChild(selectedNote);
    }

    const visual = createElement("div", "structure-game-answer-visual");
    const figure = createElement("figure", "structure-game-structure-figure");
    const structureHost = createElement("div", "structure-game-structure-svg");
    structureHost.setAttribute("role", "img");
    structureHost.setAttribute("aria-label", compound.name + " の2D構造式");
    structureHost.appendChild(createElement("span", "structure-loading", "構造式を描画中…"));
    const caption = createElement("figcaption", "", "正解の2D構造式");
    figure.append(structureHost, caption);
    visual.appendChild(figure);
    mountStructure(compound, structureHost, "500x400", "structure-game-structure-image");

    const keyPoints = createElement("div", "structure-game-key-points");
    keyPoints.appendChild(createElement("h4", "", "構造を読むポイント"));
    const feature = compound.hint || compound.feature || "官能基、結合の種類、炭素骨格を確認する。";
    keyPoints.appendChild(createElement("p", "structure-game-key-feature", feature));
    keyPoints.appendChild(createElement("p", "structure-game-key-description",
      compound.desc || "構造式の結合と原子の種類を確認し、同じ分類の化合物と比較しよう。"));
    keyPoints.appendChild(createElement("p", "structure-game-key-method",
      "① 骨格（鎖状・環状・芳香環） → ② 特徴的な官能基 → ③ 結合位置・分岐・立体配置の順に見る。"));
    visual.appendChild(keyPoints);
    panel.appendChild(visual);

    const comparisonHeading = createElement("h4", "structure-game-comparison-title", "まぎらわしい選択肢との違い");
    panel.appendChild(comparisonHeading);
    const comparisons = createElement("div", "structure-game-comparisons");
    (current ? current.options : [])
      .filter(option => !option.correct)
      .forEach(option => {
        const candidate = option.compound;
        const card = createElement("article", "structure-game-comparison-card");
        const title = createElement("h5", "", option.name);
        const formula = createElement("p", "structure-game-comparison-formula",
          "分子式 " + (candidate.formula || "未登録") + " ／ " + (candidate.family || "未分類"));
        const miniFigure = createElement("figure", "structure-game-mini-figure");
        const miniHost = createElement("div", "structure-game-mini-svg");
        miniHost.setAttribute("role", "img");
        miniHost.setAttribute("aria-label", option.name + " の2D構造式");
        miniHost.appendChild(createElement("span", "structure-loading", "描画中…"));
        miniFigure.appendChild(miniHost);
        mountStructure(candidate, miniHost, "240x180", "structure-game-mini-image");
        const explanation = createElement("p", "structure-game-comparison-note",
          compareExplanation(compound, candidate));
        card.append(title, formula, miniFigure, explanation);
        comparisons.appendChild(card);
      });
    panel.appendChild(comparisons);

    const source = createElement("a", "structure-game-source", "PubChemで構造情報を確認 ↗");
    source.href = pubchemUrl(compound);
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    panel.appendChild(source);
  }

  function answerQuestion(selected, button) {
    if (locked || !current) return;
    locked = true;
    answered++;
    if (selected.correct) correct++;
    scoreText();

    const buttons = [...$("structure-game-options").querySelectorAll("button")];
    buttons.forEach((item, index) => {
      item.disabled = true;
      const option = current.options[index];
      if (option && option.correct) item.classList.add("is-correct");
    });
    if (!selected.correct) button.classList.add("is-wrong");

    const feedback = $("structure-game-feedback");
    feedback.hidden = false;
    feedback.className = "structure-game-feedback" + (selected.correct ? "" : " is-wrong");
    feedback.textContent = selected.correct
      ? "正解！ 原子の配置と官能基を手掛かりにできた。"
      : "不正解。正解の構造と、見分ける手掛かりを確認しよう。";

    revealAnswer(current.answer, selected);
    $("structure-game-next").disabled = false;
    $("structure-game-next").textContent = "次の問題へ →";
    $("structure-game-progress").textContent = selected.correct
      ? "正解。構造の特徴を言葉でも整理しておこう。"
      : "名前だけで終わらせず、分子式と構造上の特徴も確認しよう。";
  }

  function setUnavailable(message) {
    locked = true;
    const buttons = [...$("structure-game-options").querySelectorAll("button")];
    buttons.forEach(button => { button.disabled = true; });
    setStatus(message, true);
    $("structure-game-progress").textContent = "3D表示に失敗しました。別の化合物を試せます。";
    $("structure-game-next").disabled = false;
    $("structure-game-next").textContent = "別の構造を読み込む →";
  }

  function showStaticFallback(compound, token, reason) {
    const image = $("structure-game-fallback");
    image.onload = () => {
      if (token !== requestToken) return;
      image.hidden = false;
      stage.hidden = true;
      consecutiveLoadFailures = 0;
      locked = false;
      setStatus("対話式3D表示が使えないため、PubChemの3D画像を表示しています。画像を観察して解答してください。");
      [...$("structure-game-options").querySelectorAll("button")].forEach(button => {
        button.disabled = false;
      });
      $("structure-game-progress").textContent = "静止画像で構造を見分けてください。";
    };
    image.onerror = () => {
      if (token !== requestToken) return;
      image.hidden = true;
      consecutiveLoadFailures++;
      if (consecutiveLoadFailures < 7) {
        $("structure-game-progress").textContent = "3D座標が利用できない化合物を飛ばし、別の構造を読み込んでいます…";
        newQuestion();
        return;
      }
      setUnavailable((reason || "3D構造を表示できませんでした。") + " PubChemに表示可能な3D座標がないか、通信に失敗しました。");
    };
    image.src = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
      encodeURIComponent(compound.pubchemCid) + "/PNG?record_type=3d&image_size=720x540";
  }

  async function renderModel(compound, token) {
    disposeViewer();
    const image = $("structure-game-fallback");
    image.onload = null;
    image.onerror = null;
    image.hidden = true;
    image.removeAttribute("src");
    stage.hidden = false;
    setStatus("PubChemから3D座標を取得しています…");
    $("structure-game-source").textContent = "PUBCHEM CID " + compound.pubchemCid;
    $("structure-game-pubchem-link").href = pubchemUrl(compound);
    setMode(modelMode);

    try {
      const record = await fetch3DRecord(compound);
      if (token !== requestToken) return;
      if (!window.Molecule3DViewer || typeof window.Molecule3DViewer.render !== "function") {
        throw new Error("3D描画エンジンを読み込めませんでした。");
      }
      activeViewer = window.Molecule3DViewer.render(record.sdf, stage, modelMode);
      stage.hidden = false;
      image.hidden = true;
      $("structure-game-pubchem-link").href = record.url;
      consecutiveLoadFailures = 0;
      locked = false;
      setStatus("3D模型を回転して観察してください。ドラッグで回転、ホイールで拡大できます。");
      [...$("structure-game-options").querySelectorAll("button")].forEach(button => {
        button.disabled = false;
      });
      $("structure-game-progress").textContent = "構造を観察し、正しい化合物名を選んでください。";
    } catch (error) {
      if (token !== requestToken) return;
      showStaticFallback(compound, token, error && error.message ? error.message : "3D模型を生成できませんでした。");
    }
  }

  function newQuestion() {
    requestToken++;
    const token = requestToken;
    locked = true;
    $("structure-game-feedback").hidden = true;
    $("structure-game-feedback").className = "structure-game-feedback";
    $("structure-game-answer").hidden = true;
    $("structure-game-answer").replaceChildren();
    $("structure-game-next").disabled = true;
    $("structure-game-next").textContent = "読み込み中…";
    $("structure-game-source").textContent = "PubChem 3Dデータ";
    $("structure-game-pubchem-link").href = "https://pubchem.ncbi.nlm.nih.gov/";
    $("structure-game-progress").textContent = "ランダムに選ばれた構造を読み込んでいます。";
    setStatus("次の化合物を選び、3D構造を読み込んでいます…");

    let pool = candidates.filter(compound => !recentIds.includes(compound.id));
    if (pool.length < 4) {
      recentIds.length = 0;
      pool = candidates.slice();
    }
    const answer = sample(pool);
    if (!answer) {
      setUnavailable("出題できる化合物データがありません。");
      return;
    }
    recentIds.push(answer.id);
    if (recentIds.length > 8) recentIds.shift();

    const options = makeOptions(answer);
    if (options.length !== 4) {
      setUnavailable("4択問題を作成できる化合物データが不足しています。");
      return;
    }
    current = { answer, options };
    renderOptions(options);
    renderModel(answer, token);
  }

  $("structure-game-spacefill").addEventListener("click", () => setMode("spacefill"));
  $("structure-game-ballstick").addEventListener("click", () => setMode("ballstick"));
  $("structure-game-next").addEventListener("click", () => {
    consecutiveLoadFailures = 0;
    newQuestion();
  });

  if (candidates.length < 4) {
    setUnavailable("3D構造の出題に必要な化合物データが不足しています。");
  } else {
    scoreText();
    newQuestion();
  }
};

if (document.readyState === "complete") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
}