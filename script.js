const TRIALS_PER_CONDITION = 5;
const TIME_LIMIT_MS = 30000;

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
const deerImage = document.getElementById("deerImage");
const trashImage = document.getElementById("trashImage");
const nudgeImage = document.getElementById("nudgeImage");
const narrationText = document.getElementById("narrationText");
const progressText = document.getElementById("progressText");
const timerText = document.getElementById("timerText");
const feedbackText = document.getElementById("feedbackText");

// 5件法
const scaleInputs = document.querySelectorAll('input[name="scale"]');

// 終了画面
const restartBtn = document.getElementById("restartBtn");
const logPreview = document.getElementById("logPreview");

// 状態管理
let participantId = "";
let trials = [];
let currentIndex = 0;
let trialStart = 0;
let timerId = null;
let logs = [];
let choiceLocked = false;
let resultText = "";

/************** 共通 **************/
function showOnly(screen) {
  [screenConsent, screenHowto, screenTrial, screenEnd].forEach((s) =>
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

function buildTrials() {
  const list = [];
  for (const deer of [0, 1]) {
    for (const eyes of [0, 1]) {
      for (let i = 0; i < TRIALS_PER_CONDITION; i++) {
        list.push({ deer, eyes });
      }
    }
  }
  return shuffle(list);
}

function narrationFor(t) {
  if (t.deer === 1) {
    return "観光中、遊歩道の脇に空き袋のゴミが残っているのに気づく。近くには鹿がいる。あなたならどうしますか？";
  }
  return "観光中、遊歩道の脇に空き袋のゴミが残っているのに気づく。周囲は静かで、人の気配はあまりない。あなたならどうしますか？";
}

function applyCondition(t) {
  bgImage.src = "./images/background_normal.png?v=6";

  deerImage.classList.add("hidden");
  if (t.deer === 1) deerImage.classList.remove("hidden");

  nudgeImage.classList.add("hidden");
  if (t.eyes === 1) nudgeImage.classList.remove("hidden");

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

    if (left <= 0 && !choiceLocked) {
      recordTimeout();
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

  scaleInputs.forEach((radio) => {
    radio.checked = false;
  });

  progressText.textContent = `Trial ${currentIndex + 1} / ${trials.length}`;
  feedbackText.textContent = "";

  applyCondition(t);
  startTimer();
}

/************** 記録 **************/
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
    scale: Number(value),
    rtMs: rt,
    timeout: 0,
    timestamp: new Date().toISOString()
  });

  feedbackText.textContent = "記録しました。次の場面へ進みます。";
  currentIndex++;
  setTimeout(nextTrial, 500);
}

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
    scale: null,
    rtMs: null,
    timeout: 1,
    timestamp: new Date().toISOString()
  });

  feedbackText.textContent = "時間内に選択が行われませんでした。次の場面へ進みます。";
  currentIndex++;
  setTimeout(nextTrial, 500);
}

/************** 終了 **************/
function endExperiment() {
  showOnly(screenEnd);
  resultText = JSON.stringify(logs);
  logPreview.textContent = resultText;
}

function copyResult() {
  navigator.clipboard.writeText(resultText)
    .then(() => {
      alert("コピーしました！提出フォームに貼り付けてください。");
    })
    .catch(() => {
      alert("コピーに失敗しました。");
    });
}

/************** イベント **************/
consentCheck.addEventListener("change", () => {
  toHowtoBtn.disabled = !consentCheck.checked;
});

toHowtoBtn.addEventListener("click", () => {
  if (consentCheck.checked) showOnly(screenHowto);
});

backToConsentBtn.addEventListener("click", () => {
  showOnly(screenConsent);
});

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

scaleInputs.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    recordScaleChoice(e.target.value);
  });
});

restartBtn.addEventListener("click", () => {
  participantIdInput.value = "";
  consentCheck.checked = false;
  toHowtoBtn.disabled = true;
  showOnly(screenConsent);
});

showOnly(screenConsent);
