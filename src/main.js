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
let timeLeft = initialTime;
let timer;
let gameActive = false;
let scoreUploaded = false;

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
        initialTime = parseInt(e.target.dataset.time);
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

    submitBtn.classList.remove("hidden");
    answerInput.disabled = false;
    nextBtn.classList.add("hidden");

    const randomIndex = Math.floor(Math.random() * idioms.length);
    currentIdiomObj = idioms[randomIndex];
    blankIndex = Math.floor(Math.random() * 4);

    charElements.forEach((charElement, i) => {
        charElement.classList.remove("blank", "correct", "incorrect");
        if (i === blankIndex) {
            charElement.textContent = "";
            charElement.classList.add("blank");
        } else {
            charElement.textContent = currentIdiomObj.idiom[i];
        }
    });
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

        feedbackElement.textContent = "答對了！ 🎉";
        feedbackElement.classList.remove("hidden", "text-red-600");
        feedbackElement.classList.add("text-green-600");
        playSuccessSound();

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

        blankElement.classList.add("incorrect");

        feedbackElement.textContent = `答錯了！正確答案是「${correctAnswer}」`;
        feedbackElement.classList.remove("hidden", "text-green-600");
        feedbackElement.classList.add("text-red-600");
        playErrorSound();

        setTimeout(() => {
            blankElement.textContent = correctAnswer;
        }, 800);
    }

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

    const blankElement = charElements[blankIndex];
    blankElement.textContent = currentIdiomObj.idiom[blankIndex];
    blankElement.classList.remove("blank", "animate-pulse-slow");
    blankElement.classList.add("incorrect", "animate-shake");

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
