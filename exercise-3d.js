import "./molecule3d.js";

(() => {
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

  function makeOptions(answer) {
    const distinctNames = new Set([answer.name]);
    const others = shuffle(candidates.filter(compound => compound.id !== answer.id && compound.name !== answer.name))
      .filter(compound => {
        if (distinctNames.has(compound.name)) return false;
        distinctNames.add(compound.name);
        return true;
      }).slice(0, 3);
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

  function revealAnswer(compound) {
    const panel = $("structure-game-answer");
    panel.replaceChildren();
    panel.hidden = false;

    const heading = document.createElement("h3");
    heading.textContent = "正解：" + compound.name;

    const metadata = document.createElement("p");
    metadata.className = "structure-game-answer-meta";
    metadata.textContent = "分子式 " + (compound.formula || "未登録") +
      "　／　分類 " + (compound.family || "未分類");

    const explanation = document.createElement("p");
    explanation.textContent = compound.desc || compound.hint || "この化合物の詳しい説明は登録されていません。";

    const hint = compound.hint ? document.createElement("p") : null;
    if (hint) {
      hint.className = "structure-game-answer-hint";
      hint.textContent = "構造の目印：" + compound.hint;
    }

    const source = document.createElement("a");
    source.href = pubchemUrl(compound);
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.className = "structure-game-source";
    source.textContent = "PubChemで構造情報を確認 ↗";

    panel.append(heading, metadata, explanation);
    if (hint) panel.appendChild(hint);
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

    revealAnswer(current.answer);
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
})();