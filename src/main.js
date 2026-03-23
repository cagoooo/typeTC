import { idioms } from './data/idioms.js';
import confetti from 'canvas-confetti';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase Config
// 優先讀取 window.FIREBASE_CONFIG (由 inject.py 注入)，否則讀取 import.meta.env (本地開發)
const isConfigValid = window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    window.FIREBASE_CONFIG.apiKey !== "__VITE_FIREBASE_API_KEY__" &&
    window.FIREBASE_CONFIG.apiKey.trim() !== "";

const firebaseConfig = isConfigValid
    ? window.FIREBASE_CONFIG
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Anonymous Auth
signInAnonymously(auth).catch((error) => {
    console.error("Firebase 匿名登入失敗:", error);
});

let currentIdiomObj = null;
let blankIndex = 0;
let score = 0;
let lives = 3;
let initialTime = 15;
let baseInitialTime = 15; // 儲存難度選擇的基準時間
let timeLeft = initialTime;
let timer;
let gameActive = false;
let scoreUploaded = false;
let consecutiveCorrect = 0; // 連續答對次數，用於 AutoPace

// --- 教學權威化核心邏輯 ---

// 錯題管理器 (MistakeManager)
const MistakeManager = {
    STORAGE_KEY: 'typetc_mistakes',
    getMistakes() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    },
    record(idiom) {
        const mistakes = this.getMistakes();
        mistakes[idiom] = (mistakes[idiom] || 0) + 1;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mistakes));
    },
    clear(idiom) {
        const mistakes = this.getMistakes();
        if (mistakes[idiom]) {
            delete mistakes[idiom];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mistakes));
        }
    },
    getWeightedIdiom() {
        const mistakes = this.getMistakes();
        const mistakeList = Object.keys(mistakes);

        // 25% 機率優先出錯題 (如果有錯題的話)
        if (mistakeList.length > 0 && Math.random() < 0.25) {
            const randomMistake = mistakeList[Math.floor(Math.random() * mistakeList.length)];
            return idioms.find(i => i.idiom === randomMistake) || idioms[Math.floor(Math.random() * idioms.length)];
        }
        return idioms[Math.floor(Math.random() * idioms.length)];
    }
};

// 動態難度校正 (AutoPace)
const AutoPace = {
    adjust() {
        // 連續答對 3 題，且目前時間大於 5 秒，則縮短 1 秒 (加點難度)
        if (consecutiveCorrect >= 3 && initialTime > 5) {
            initialTime -= 1;
            consecutiveCorrect = 0;
            this.showAdjustmentHint("⚡ 節奏加快！");
        }
        // 答錯時，恢復到基準時間
        else if (consecutiveCorrect < 0) {
            if (initialTime < baseInitialTime) {
                initialTime = baseInitialTime;
                this.showAdjustmentHint("🐢 節奏放緩...");
            }
            consecutiveCorrect = 0;
        }
    },
    reset(baseTime) {
        initialTime = baseTime;
        baseInitialTime = baseTime;
        consecutiveCorrect = 0;
    },
    showAdjustmentHint(text) {
        const hint = document.createElement("div");
        hint.className = "fixed top-1/4 left-1/2 -translate-x-1/2 bg-red-800/90 text-white px-6 py-3 rounded-full font-bold shadow-2xl z-50 animate-pop pointer-events-none title-font text-lg";
        hint.textContent = text;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 2000);
    }
};

// --- 古典氛圍增強邏輯 (BGM & Sakura) ---

class SakuraEffect {
    constructor() {
        this.canvas = document.getElementById("sakura-canvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.petals = [];
        this.maxPetals = 40;
        this.active = false;

        window.addEventListener("resize", () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.petals = Array.from({ length: this.maxPetals }, () => this.createPetal(true));
        this.animate();
    }

    createPetal(initial = false) {
        return {
            x: Math.random() * this.canvas.width,
            y: initial ? Math.random() * this.canvas.height : -20,
            radius: Math.random() * 5 + 2,
            speedY: Math.random() * 1 + 0.5,
            speedX: Math.random() * 1 - 0.5,
            sway: Math.random() * 2,
            angle: Math.random() * Math.PI * 2,
            rotateSpeed: Math.random() * 0.02,
            opacity: Math.random() * 0.5 + 0.3
        };
    }

    animate() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.petals.forEach((p, i) => {
            p.y += p.speedY;
            p.x += p.speedX + Math.sin(p.angle) * 0.5;
            p.angle += p.rotateSpeed;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, p.radius * 1.5, p.radius, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 192, 203, ${p.opacity})`; // 略微加深粉色
            this.ctx.fill();
            this.ctx.restore();

            if (p.y > this.canvas.height) {
                this.petals[i] = this.createPetal();
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

class BGMPlayer {
    constructor() {
        this.tracks = [
            "https://cdn.pixabay.com/audio/2025/06/02/audio_bf62d2ab24.mp3",
            "https://cdn.pixabay.com/audio/2026/02/18/audio_3ee52b1293.mp3",
            "https://cdn.pixabay.com/audio/2025/05/26/audio_a4dc9cb5b2.mp3",
            "https://cdn.pixabay.com/audio/2025/11/11/audio_aadd2548f6.mp3",
            "https://cdn.pixabay.com/audio/2025/11/11/audio_255d96a3c5.mp3",
            "https://cdn.pixabay.com/audio/2025/11/11/audio_c32e8f6a8a.mp3",
            "https://cdn.pixabay.com/audio/2021/12/17/audio_8a31f4ec17.mp3"
        ];
        this.currentIndex = Math.floor(Math.random() * this.tracks.length);
        this.audio = new Audio();
        this.audio.loop = false;
        this.isPlaying = true; // 預設為開啟

        this.audio.addEventListener("ended", () => this.next());

        this.toggleBtn = document.getElementById("bgm-toggle");
        this.nextBtn = document.getElementById("bgm-next");
        this.onIcon = document.getElementById("music-on-icon");
        this.offIcon = document.getElementById("music-off-icon");

        this.toggleBtn?.addEventListener("click", () => this.toggle());
        this.nextBtn?.addEventListener("click", () => this.next());

        this.updateUI(this.isPlaying);
    }

    start() {
        if (!this.isPlaying) return; // 若使用者先點關閉，就不啟動
        this.loadTrack();
        this.audio.play().then(() => {
            this.updateUI(true);
        }).catch(err => console.log("BGM 播放受阻 (等候互動):", err));
    }

    loadTrack() {
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.volume = 0.6; // 音量提升
    }

    toggle() {
        if (this.audio.paused) {
            this.audio.play();
            this.updateUI(true);
        } else {
            this.audio.pause();
            this.updateUI(false);
        }
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
        this.loadTrack();
        this.audio.play();
        this.updateUI(true);
    }

    updateUI(playing) {
        this.isPlaying = playing;
        if (playing) {
            this.onIcon?.classList.remove("hidden");
            this.offIcon?.classList.add("hidden");
            this.toggleBtn?.classList.add("music-playing");
            this.nextBtn?.classList.remove("hidden");
        } else {
            this.onIcon?.classList.add("hidden");
            this.offIcon?.classList.remove("hidden");
            this.toggleBtn?.classList.remove("music-playing");
        }
    }
}

const sakura = new SakuraEffect();
const bgm = new BGMPlayer();
window.sakura = sakura;
window.bgm = bgm;

// 辭典彈窗邏輯
const DictPopover = {
    modal: document.getElementById("dict-modal"),
    title: document.getElementById("dict-title"),
    idiom: document.getElementById("dict-idiom"),
    zhuyin: document.getElementById("dict-zhuyin"),
    meaning: document.getElementById("dict-meaning"),
    example: document.getElementById("dict-example"),
    closeBtn: document.getElementById("close-dict-btn"),
    hint: document.getElementById("dict-hint"),

    init() {
        this.closeBtn.addEventListener("click", () => this.hide());
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) this.hide();
        });
    },
    show(obj) {
        this.idiom.textContent = obj.idiom;
        this.zhuyin.textContent = obj.zhuyin || "（暫無注音）";
        this.meaning.textContent = obj.meaning;
        this.example.textContent = obj.example || "（暫無例句）";
        this.modal.classList.remove("hidden");
    },
    hide() {
        this.modal.classList.add("hidden");
    }
};
DictPopover.init();

// Audio context stuff
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, type, duration) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

function playSuccessSound() {
    playTone(523.25, 'sine', 0.1); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.2), 200); // G5
}

function playErrorSound() {
    playTone(220, 'triangle', 0.15); // A3
    setTimeout(() => playTone(196, 'triangle', 0.3), 150); // G3
}

function playTickSound() {
    playTone(1000, 'sine', 0.05); // High-pitched short tick
}

function playCountdownWarning() {
    playTone(1500, 'sine', 0.05); // High-pitched alert
}

// Elements
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const timerElement = document.getElementById("timer");
const timerBarElement = document.getElementById("timer-bar");
const answerInput = document.getElementById("answer");
const submitBtn = document.getElementById("submit-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");
const feedbackElement = document.getElementById("feedback");
const meaningBox = document.getElementById("meaning-box");
const charElements = [
    document.getElementById("char1"),
    document.getElementById("char2"),
    document.getElementById("char3"),
    document.getElementById("char4")
];

const difficultySelector = document.getElementById("difficulty-selector");
const gameArea = document.getElementById("game-area");
const gameOverArea = document.getElementById("game-over-area");
const finalScoreElement = document.getElementById("final-score");
const playAgainBtn = document.getElementById("play-again-btn");

// Leaderboard Elements
const nicknameSection = document.getElementById("nickname-section");
const nicknameInput = document.getElementById("nickname-input");
const uploadScoreBtn = document.getElementById("upload-score-btn");
const uploadStatus = document.getElementById("upload-status");
const showLeaderboardBtn = document.getElementById("show-leaderboard-btn");
const viewLeaderboardBtn = document.getElementById("view-leaderboard-btn");
const leaderboardModal = document.getElementById("leaderboard-modal");
const closeLeaderboardBtn = document.getElementById("close-leaderboard-btn");
const leaderboardBody = document.getElementById("leaderboard-body");

// Difficulty selection Event Listeners
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        initAudio(); // 初始化音訊語境
        AutoPace.reset(parseInt(e.target.dataset.time));
        startGame();
    });
});

function updateLives() {
    livesElement.textContent = lives;
    if (lives <= 0) {
        showGameOver();
    }
}

function startGame() {
    score = 0;
    lives = 3;
    scoreUploaded = false;
    scoreElement.textContent = score;
    updateLives();

    difficultySelector.classList.add('hidden');
    gameOverArea.classList.add('hidden');
    gameArea.classList.remove('hidden');

    loadNewIdiom();
    resetTimer();
    startTimer();
}

function showGameOver() {
    gameActive = false;
    clearInterval(timer);
    gameArea.classList.add('hidden');
    gameOverArea.classList.remove('hidden');
    finalScoreElement.textContent = score;

    // 如果分數大於 0，顯示暱稱輸入區
    if (score > 0) {
        nicknameSection.classList.remove('hidden');
        nicknameInput.value = localStorage.getItem('idiom_nickname') || "";
        uploadStatus.classList.add('hidden');
        uploadScoreBtn.disabled = false;
        uploadScoreBtn.textContent = "上傳";
    } else {
        nicknameSection.classList.add('hidden');
    }
}

playAgainBtn.addEventListener('click', () => {
    gameOverArea.classList.add('hidden');
    difficultySelector.classList.remove('hidden');
});

function loadNewIdiom() {
    answerInput.value = "";
    setTimeout(() => answerInput.focus(), 100); // 確保在渲染後取得焦點
    feedbackElement.classList.add("hidden");
    meaningBox.classList.add("hidden");
    meaningBox.classList.remove("animate-pop");
    DictPopover.hint.classList.add("hidden");

    submitBtn.classList.remove("hidden");
    answerInput.disabled = false;
    nextBtn.classList.add("hidden");

    // 使用 MistakeManager 抽選成語
    currentIdiomObj = MistakeManager.getWeightedIdiom();
    blankIndex = Math.floor(Math.random() * 4);

    charElements.forEach((charElement, i) => {
        charElement.classList.remove("blank", "correct", "incorrect", "clickable");
        charElement.onclick = null; // 清除舊的點擊事件

        if (i === blankIndex) {
            charElement.textContent = "";
            charElement.classList.add("blank");
        } else {
            charElement.textContent = currentIdiomObj.idiom[i];
            // 讓已顯示的字可以點擊查看辭典
            charElement.classList.add("clickable");
            charElement.onclick = () => DictPopover.show(currentIdiomObj);
        }
    });

    // 顯示「點擊查看」提示
    DictPopover.hint.classList.remove("hidden");

    gameActive = true;
}

function checkAnswer() {
    if (!gameActive) return;

    const userAnswer = answerInput.value.trim();
    if (!userAnswer) return;

    clearInterval(timer);
    gameActive = false;
    answerInput.disabled = true;

    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    const correctAnswer = currentIdiomObj.idiom[blankIndex];
    const blankElement = charElements[blankIndex];
    blankElement.textContent = userAnswer;
    blankElement.classList.remove("blank", "animate-pulse-slow");

    if (userAnswer === correctAnswer) {
        score += 10;
        scoreElement.textContent = score;
        blankElement.classList.add("correct");
        consecutiveCorrect++;

        feedbackElement.textContent = "答對了！ 🎉";
        feedbackElement.classList.remove("hidden", "text-red-600");
        feedbackElement.classList.add("text-green-600");
        playSuccessSound();

        // 答對則從錯題本中移除 (如果存在的話)
        MistakeManager.clear(currentIdiomObj.idiom);

        // 慶祝撒花 (配色調整為：緋紅、金、翠綠)
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#991b1b', '#f59e0b', '#10b981', '#1e293b']
        });
    } else {
        lives -= 1;
        updateLives();
        consecutiveCorrect = -1; // 標記為錯，觸發節奏放緩

        // 記錄到錯題本
        MistakeManager.record(currentIdiomObj.idiom);

        blankElement.classList.add("incorrect");

        feedbackElement.textContent = `答錯了！正確答案是「${correctAnswer}」`;
        feedbackElement.classList.remove("hidden", "text-green-600");
        feedbackElement.classList.add("text-red-600");
        playErrorSound();

        setTimeout(() => {
            blankElement.textContent = correctAnswer;
            // 答錯後顯示的正確字元也變為可點擊
            blankElement.classList.add("clickable");
            blankElement.onclick = () => DictPopover.show(currentIdiomObj);
        }, 800);
    }

    // 更新動態難度
    AutoPace.adjust();

    // Show meaning
    meaningBox.textContent = `📖 釋義：${currentIdiomObj.meaning}`;
    meaningBox.classList.remove("hidden");
    meaningBox.className = "bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 text-center mb-6 shadow-sm";
    void meaningBox.offsetWidth; // 強制重繪觸發動畫
    meaningBox.classList.add("animate-pop");

    submitBtn.classList.add("hidden");

    if (lives > 0) {
        nextBtn.classList.remove("hidden");
        nextBtn.focus(); // 讓焦點轉到下一題，方便按 enter
    } else {
        setTimeout(showGameOver, 2000);
    }
}

function startTimer() {
    timeLeft = initialTime;
    timerElement.textContent = timeLeft;
    timerBarElement.style.width = "100%";
    timerBarElement.style.backgroundColor = "#3b82f6";

    timer = setInterval(() => {
        if (!gameActive) {
            clearInterval(timer);
            return;
        }
        timeLeft--;
        timerElement.textContent = timeLeft;
        const percentage = (timeLeft / initialTime) * 100;
        timerBarElement.style.width = `${percentage}%`;

        if (timeLeft <= 5 && timeLeft > 0) {
            timerBarElement.style.background = "linear-gradient(to right, #f59e0b, #fbbf24)"; // 警告橘
            playCountdownWarning(); // 倒數 5 秒警示音
        } else if (timeLeft <= 0) {
            timerBarElement.style.background = "linear-gradient(to right, #991b1b, #ef4444)"; // 結束紅
            clearInterval(timer);
            gameOverTimeUp();
        } else {
            // 每秒的小滴答聲可選，先加在最後 3 秒更顯著
            if (timeLeft <= 10) playTickSound();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    timeLeft = initialTime;
    timerElement.textContent = timeLeft;
    timerBarElement.style.width = "100%";
    timerBarElement.style.backgroundColor = "#3b82f6";
}

function gameOverTimeUp() {
    gameActive = false;
    answerInput.disabled = true;

    lives -= 1;
    updateLives();
    consecutiveCorrect = -1;

    // 記錄時間到的錯題
    MistakeManager.record(currentIdiomObj.idiom);

    const blankElement = charElements[blankIndex];
    blankElement.textContent = currentIdiomObj.idiom[blankIndex];
    blankElement.classList.remove("blank", "animate-pulse-slow");
    blankElement.classList.add("incorrect", "animate-shake");
    blankElement.classList.add("clickable");
    blankElement.onclick = () => DictPopover.show(currentIdiomObj);

    // 難度校正
    AutoPace.adjust();

    feedbackElement.textContent = `時間到！正確答案是「${currentIdiomObj.idiom[blankIndex]}」`;
    feedbackElement.classList.remove("hidden", "text-green-600");
    feedbackElement.classList.add("text-red-600");
    playErrorSound();

    meaningBox.textContent = `📖 釋義：${currentIdiomObj.meaning}`;
    meaningBox.classList.remove("hidden");
    void meaningBox.offsetWidth;
    meaningBox.classList.add("animate-pop");

    submitBtn.classList.add("hidden");

    if (lives > 0) {
        nextBtn.classList.remove("hidden");
        nextBtn.focus();
    } else {
        setTimeout(showGameOver, 2000);
    }
}

// Leaderboard Logic
async function uploadScore() {
    if (scoreUploaded) return;
    const nickname = nicknameInput.value.trim() || "無名大俠";
    localStorage.setItem('idiom_nickname', nickname);

    const scoreData = {
        nickname: nickname,
        score: score,
        difficulty: initialTime === 20 ? "簡單" : initialTime === 15 ? "一般" : "困難",
        timestamp: new Date().toISOString()
    };

    // 檢查網路狀態
    if (!navigator.onLine) {
        saveScoreOffline(scoreData);
        uploadStatus.textContent = "📶 網路斷開，已暫存於本地";
        uploadStatus.classList.remove('hidden', 'text-blue-500', 'text-red-500');
        uploadStatus.classList.add('text-orange-500');
        uploadScoreBtn.textContent = "已暫存";
        uploadScoreBtn.disabled = true;
        scoreUploaded = true;
        return;
    }

    uploadStatus.textContent = "上傳中...";
    uploadStatus.classList.remove('hidden', 'text-red-500', 'text-green-500', 'text-orange-500');
    uploadStatus.classList.add('text-blue-500');
    uploadScoreBtn.disabled = true;

    try {
        await addDoc(collection(db, "typetc_leaderboard"), {
            ...scoreData,
            timestamp: serverTimestamp()
        });
        uploadStatus.textContent = "✅ 上傳成功！";
        uploadStatus.classList.replace('text-blue-500', 'text-green-500');
        scoreUploaded = true;
        uploadScoreBtn.textContent = "已上傳";
    } catch (error) {
        console.error("上傳失敗:", error);
        uploadStatus.textContent = "❌ 上傳失敗，請稍後再試";
        uploadStatus.classList.replace('text-blue-500', 'text-red-500');
        uploadScoreBtn.disabled = false;
    }
}

// 暫存分數至本地
function saveScoreOffline(data) {
    const pendingScores = JSON.parse(localStorage.getItem('typetc_pending_scores') || '[]');
    pendingScores.push(data);
    localStorage.setItem('typetc_pending_scores', JSON.stringify(pendingScores));
}

// 同步本地暫存分數
async function syncOfflineScores() {
    const pendingScores = JSON.parse(localStorage.getItem('typetc_pending_scores') || '[]');
    if (pendingScores.length === 0) return;

    if (confirm(`偵測到您有 ${pendingScores.length} 筆離線得分，是否立即同步至全球排行榜？`)) {
        let successCount = 0;
        for (const scoreData of pendingScores) {
            try {
                await addDoc(collection(db, "typetc_leaderboard"), {
                    ...scoreData,
                    timestamp: serverTimestamp() // 使用伺服器時間
                });
                successCount++;
            } catch (err) {
                console.error("同步單筆分數失敗:", err);
            }
        }

        if (successCount > 0) {
            alert(`✅ 成功同步 ${successCount} 筆分數！`);
            localStorage.removeItem('typetc_pending_scores');
            fetchLeaderboard(); // 刷新排行榜
        }
    }
}

// 監聽網路恢復
window.addEventListener('online', syncOfflineScores);
// 初始化時也檢查一次
if (navigator.onLine) syncOfflineScores();

// 啟動 BGM 與 櫻花的全域入口
function startAtmosphere() {
    console.log("🌸 啟動氛圍特效...");
    if (sakura) sakura.start();
    if (bgm) bgm.start();
}
window.startAtmosphere = startAtmosphere; // 導出至全域以供 HTML onclick 使用

async function fetchLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-gray-400 italic font-notoSans animate-pulse">神龍盤旋中...</td></tr>';

    try {
        const q = query(
            collection(db, "typetc_leaderboard"),
            orderBy("score", "desc"),
            limit(10)
        );
        const querySnapshot = await getDocs(q);

        leaderboardBody.innerHTML = '';
        if (querySnapshot.empty) {
            leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-gray-400 font-notoSans">目前尚無紀錄</td></tr>';
            return;
        }

        let index = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.className = index <= 3 ? 'bg-yellow-50/50' : '';

            const medal = index === 1 ? '🥇' : index === 2 ? '🥈' : index === 3 ? '🥉' : index;

            row.innerHTML = `
                <td class="py-3 px-2 font-bold ${index <= 3 ? 'text-yellow-600' : 'text-gray-500'}">${medal}</td>
                <td class="py-3 px-2 font-medium text-gray-800">${data.nickname || '無名氏'}</td>
                <td class="py-3 px-2 text-right font-bold text-blue-600">${data.score}</td>
            `;
            leaderboardBody.appendChild(row);
            index++;
        });
    } catch (error) {
        console.error("讀取排行榜失敗:", error);
        leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-red-500 font-notoSans">讀取失敗，請確認網路連線</td></tr>';
    }
}

// Global Event Listeners
submitBtn.addEventListener("click", checkAnswer);

answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && gameActive) {
        checkAnswer();
    }
});

nextBtn.addEventListener("click", () => {
    loadNewIdiom();
    resetTimer();
    startTimer();
});

restartBtn.addEventListener("click", () => {
    difficultySelector.classList.remove('hidden');
    gameArea.classList.add('hidden');
    gameOverArea.classList.add('hidden');
    clearInterval(timer);
});

uploadScoreBtn.addEventListener('click', uploadScore);

showLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.remove('hidden');
    fetchLeaderboard();
});

viewLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.remove('hidden');
    fetchLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
});

leaderboardModal.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) leaderboardModal.classList.add('hidden');
});
