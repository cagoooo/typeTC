import { idioms } from './data/idioms.js';

let currentIdiomObj = null;
let blankIndex = 0;
let score = 0;
let lives = 3;
let initialTime = 15;
let timeLeft = initialTime;
let timer;
let gameActive = false;

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
    playTone(600, 'sine', 0.1);
    setTimeout(() => playTone(800, 'sine', 0.2), 100);
}

function playErrorSound() {
    playTone(300, 'sawtooth', 0.1);
    setTimeout(() => playTone(250, 'sawtooth', 0.2), 100);
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
        charElement.classList.remove("blank", "correct", "incorrect", "animate-pulse-slow", "animate-shake", "animate-pop");
        if (i === blankIndex) {
            charElement.textContent = "";
            charElement.classList.add("blank", "animate-pulse-slow");
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
        blankElement.classList.add("correct", "animate-pop");

        feedbackElement.textContent = "答對了！ 🎉";
        feedbackElement.classList.remove("hidden", "text-red-600");
        feedbackElement.classList.add("text-green-600");
        playSuccessSound();
    } else {
        lives -= 1;
        updateLives();

        blankElement.classList.add("incorrect", "animate-shake");

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
    void meaningBox.offsetWidth;
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
            timerBarElement.style.backgroundColor = "#f59e0b";
        } else if (timeLeft <= 0) {
            timerBarElement.style.backgroundColor = "#ef4444";
            clearInterval(timer);
            gameOverTimeUp();
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
