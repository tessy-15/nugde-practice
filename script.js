/*************************************************
 * 状況体験タスク
 * シカ（背景：なし/あり）×目のマーク（あり/なし）
 * 参加者内要因 2×2，各5試行＝20試行
 * 選択は 1〜5 の5件法＋反応時間
 *************************************************/

const TRIALS_PER_CONDITION = 5;
const TIME_LIMIT_MS = 15000; 

// 画面
const screenConsent = document.getElementById("screen-consent");
const screenHowto = document.getElementById("screen-howto");
const screenTrial = document.getElementById("screen-trial");
const screenEnd = document.getElementById("screen-end");

// 同意画面
const participantIdInput = document.getElementById("participantId");
const consentCheck = document.getElementById("consentCheck");
const toHowtoBtn = document.getElementById("toHowtoBtn");
const backToConsentBtn = document.getElementById("backToConsentBtn");
const startBtn = document.getElementById("startBtn");

// 試行画面 DOM
const bgImage = document.getElementById("bgImage");
const eyesPoster = document.getElementById("eyesPoster");
const narrationText = document.getElementById("narrationText");
const progressText = document.getElementById("progressText");
const timerText = document.getElementById("timerText");
const feedbackText = document.getElementById("feedbackText");

// 5件法ラジオボタン
const scaleInputs = document.querySelectorAll('input[name="scale"]');

// 終了画面
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const restartBtn = document.getElementById("restartBtn");
const logPreview = document.getElementById("logPreview");

// 状態管理
let participantId = "";
let trials = [];
let currentIndex = 0;
let trialStart = 0;
let timerId = null;
let logs = [];
let choiceLocked = false; // 一度選択したら二度押し防止

/************** 共通ユーティリティ **************/

function showOnly(screen) {
  [screenConsent, screenHowto, screenTrial, screenEnd].forEach(s =>
    s.classList.add("hidden")
  );
  screen.classList.remove("hidden");
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// deer×eyes 各2水準 × 各5試行
function buildTrials() {
  const list = [];
  for (let deer of [0, 1]) {
    for (let eyes of [0, 1]) {
      for (let i = 0; i < TRIALS_PER_CONDITION; i++) {
        list.push({ deer, eyes });
      }
    }
  }
  return shuffle(list);
}

// ナレーション文
function narrationFor(t) {
  if (t.deer === 1) {
    return "観光中、遊歩道の脇に空き袋のゴミが残っているのに気づく。近くにはシカがいて、時々こちらを見ているように感じる。あなたならどうしますか？";
  } else {
    return "観光中、遊歩道の脇に空き袋のゴミが残っているのに気づく。周囲は静かで、人の気配はあまりない。あなたならどうしますか？";
  }
}

// 条件反映：背景と👀表示
function applyCondition(t) {
  // 背景画像
  bgImage.src = t.deer === 1
    ? "./images/background_deer.png"
    : "./images/background_normal.png";

  // 👀 ナッジの表示リセット → 条件に応じて表示
  eyesPoster.classList.add("hidden");
  if (t.eyes === 1) {
    eyesPoster.classList.remove("hidden");
  }

  // ナレーション
  narrationText.textContent = narrationFor(t);
}

/************** タイマー **************/

function startTimer() {
  trialStart = performance.now();
  const end = trialStart + TIME_LIMIT_MS;

  function tick() {
    const now = performance.now();
    const left = Math.max(0, end - now);
    timerText.textContent = `残り: ${(left / 1000).toFixed(1)}s`;

    if (left <= 0) {
      // 時間切れ（まだ選択してなければ記録）
      if (!choiceLocked) {
        recordTimeout();
      }
    }
  }

  tick();
  timerId = setInterval(tick, 80);
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

/************** 試行進行 **************/

function nextTrial() {
  clearTimer();

  if (currentIndex >= trials.length) {
    endExperiment();
    return;
  }

  const t = trials[currentIndex];
  choiceLocked = false;

  // ラジオボタンの選択をリセット
  scaleInputs.forEach(radio => {
    radio.checked = false;
  });

  // 進捗
  progressText.textContent = `Trial ${currentIndex + 1} / ${trials.length}`;
  feedbackText.textContent = "";

  // 条件反映
  applyCondition(t);

  // タイマー開始
  startTimer();
}

/************** 記録 **************/

// 通常の選択（1〜5）が行われた場合
function recordScaleChoice(value) {
  if (choiceLocked) return;
  choiceLocked = true;

  clearTimer();

  const t = trials[currentIndex];
  const rt = Math.round(performance.now() - trialStart);

  logs.push({
    participantId,
    trialIndex: currentIndex + 1,
    deer: t.deer,
    eyes: t.eyes,
    scale: Number(value),     // 1〜5
    rtMs: rt,
    timeout: 0,
    timestamp: new Date().toISOString()
  });

  feedbackText.textContent = "記録しました。次の場面へ進みます。";

  currentIndex++;
  setTimeout(nextTrial, 500);
}

// タイムアウトの場合
function recordTimeout() {
  if (choiceLocked) return;
  choiceLocked = true;

  clearTimer();

  const t = trials[currentIndex];

  logs.push({
    participantId,
    trialIndex: currentIndex + 1,
    deer: t.deer,
    eyes: t.eyes,
    scale: null,               // 選択なし
    rtMs: null,
    timeout: 1,
    timestamp: new Date().toISOString()
  });

  feedbackText.textContent = "時間内に選択が行われませんでした。次の場面へ進みます。";

  currentIndex++;
  setTimeout(nextTrial, 500);
}

/************** 終了処理 & CSV **************/

function endExperiment() {
  showOnly(screenEnd);
  logPreview.textContent = JSON.stringify(logs, null, 2);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map(h => r[h] === null ? "" : r[h]).join(","));
  }
  return lines.join("\n");
}

/************** イベント登録 **************/

// 同意チェック
consentCheck.addEventListener("change", () => {
  toHowtoBtn.disabled = !consentCheck.checked;
});

toHowtoBtn.addEventListener("click", () => {
  if (consentCheck.checked) {
    showOnly(screenHowto);
  }
});

backToConsentBtn.addEventListener("click", () => {
  showOnly(screenConsent);
});

// 実験開始
startBtn.addEventListener("click", () => {
  participantId =
    participantIdInput.value.trim() ||
    `anon_${Math.random().toString(16).slice(2, 8)}`;

  trials = buildTrials();
  currentIndex = 0;
  logs = [];

  showOnly(screenTrial);
  nextTrial();
});

// 5件法スケールの選択
scaleInputs.forEach(radio => {
  radio.addEventListener("change", (e) => {
    recordScaleChoice(e.target.value);
  });
});

// CSVダウンロード
downloadCsvBtn.addEventListener("click", () => {
  const csv = toCsv(logs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nudge_task_${participantId || "anon"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// 再スタート
restartBtn.addEventListener("click", () => {
  participantIdInput.value = "";
  consentCheck.checked = false;
  toHowtoBtn.disabled = true;
  showOnly(screenConsent);
});

// 初期画面
showOnly(screenConsent);
