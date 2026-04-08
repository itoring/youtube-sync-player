'use strict';

let player1 = null;
let player2 = null;
let player1Ready = false;
let player2Ready = false;
let seekInterval = null;
let isSeeking = false;

const btnLoad  = document.getElementById('btn-load');
const btnPlay  = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const seekbar  = document.getElementById('seekbar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl   = document.getElementById('total-time');
const vol1 = document.getElementById('vol1');
const vol2 = document.getElementById('vol2');
const error1El = document.getElementById('error1');
const error2El = document.getElementById('error2');

// ── YouTube IFrame API ──────────────────────────────────────────────────────

window.onYouTubeIframeAPIReady = function () {
  // APIロード完了を記録するだけ（プレイヤーはボタン押下時に生成）
};

function extractVideoId(url) {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /embed\/([^?&#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ── プレイヤー初期化 ────────────────────────────────────────────────────────

function initPlayers(id1, id2) {
  player1Ready = false;
  player2Ready = false;
  btnPlay.disabled = true;
  btnPause.disabled = true;
  error1El.textContent = '';
  error2El.textContent = '';

  // 既存プレイヤーを破棄
  if (player1) { player1.destroy(); player1 = null; }
  if (player2) { player2.destroy(); player2 = null; }

  // プレイヤー1の div をリセット
  resetPlayerDiv('player1');
  resetPlayerDiv('player2');

  player1 = new YT.Player('player1', {
    videoId: id1,
    playerVars: { autoplay: 0, rel: 0 },
    events: {
      onReady: () => onPlayerReady(1),
      onError: () => onPlayerError(1)
    }
  });

  player2 = new YT.Player('player2', {
    videoId: id2,
    playerVars: { autoplay: 0, rel: 0 },
    events: {
      onReady: () => onPlayerReady(2),
      onError: () => onPlayerError(2)
    }
  });
}

function resetPlayerDiv(id) {
  const old = document.getElementById(id);
  const newDiv = document.createElement('div');
  newDiv.id = id;
  old.replaceWith(newDiv);
}

function onPlayerReady(num) {
  if (num === 1) {
    player1Ready = true;
    player1.setVolume(parseInt(vol1.value, 10));
  } else {
    player2Ready = true;
    player2.setVolume(parseInt(vol2.value, 10));
  }

  if (player1Ready && player2Ready) {
    // 両方準備完了 → 自動再生スタート
    btnPlay.disabled = false;
    btnPause.disabled = false;
    startPlayback();
  }
}

function onPlayerError(num) {
  const el = num === 1 ? error1El : error2El;
  el.textContent = 'この動画は再生できません';
}

// ── 再生制御 ────────────────────────────────────────────────────────────────

function startPlayback() {
  player1.playVideo();
  player2.playVideo();
  showPauseButton();
  startSeekbarUpdate();
}

function showPlayButton() {
  btnPlay.style.display  = 'inline-block';
  btnPause.style.display = 'none';
}

function showPauseButton() {
  btnPlay.style.display  = 'none';
  btnPause.style.display = 'inline-block';
}

btnPlay.addEventListener('click', () => {
  if (!player1Ready || !player2Ready) return;
  player1.playVideo();
  player2.playVideo();
  showPauseButton();
  startSeekbarUpdate();
});

btnPause.addEventListener('click', () => {
  if (!player1Ready || !player2Ready) return;
  player1.pauseVideo();
  player2.pauseVideo();
  showPlayButton();
});

// ── シークバー ──────────────────────────────────────────────────────────────

function startSeekbarUpdate() {
  clearInterval(seekInterval);
  seekInterval = setInterval(() => {
    if (!player1Ready || !player2Ready) return;
    if (isSeeking) return;

    const dur1 = player1.getDuration() || 0;
    const dur2 = player2.getDuration() || 0;
    const duration = Math.min(dur1, dur2);
    const current  = player1.getCurrentTime() || 0;

    if (duration > 0) {
      seekbar.max   = duration;
      seekbar.value = current;
      currentTimeEl.textContent = formatTime(current);
      totalTimeEl.textContent   = formatTime(duration);
    }
  }, 250);
}

seekbar.addEventListener('mousedown', () => { isSeeking = true; });
seekbar.addEventListener('touchstart', () => { isSeeking = true; });

seekbar.addEventListener('input', () => {
  if (!player1Ready || !player2Ready) return;
  currentTimeEl.textContent = formatTime(parseFloat(seekbar.value));
});

seekbar.addEventListener('change', () => {
  if (!player1Ready || !player2Ready) return;
  const sec = parseFloat(seekbar.value);
  player1.seekTo(sec, true);
  player2.seekTo(sec, true);
  isSeeking = false;
});

seekbar.addEventListener('mouseup',  () => { isSeeking = false; });
seekbar.addEventListener('touchend', () => { isSeeking = false; });

// ── 音量スライダー ──────────────────────────────────────────────────────────

vol1.addEventListener('input', () => {
  if (player1Ready) player1.setVolume(parseInt(vol1.value, 10));
});

vol2.addEventListener('input', () => {
  if (player2Ready) player2.setVolume(parseInt(vol2.value, 10));
});

// ── さいせいスタートボタン ──────────────────────────────────────────────────

btnLoad.addEventListener('click', () => {
  const url1 = document.getElementById('url1').value.trim();
  const url2 = document.getElementById('url2').value.trim();

  if (!url1 || !url2) {
    alert('URLを入力してください');
    return;
  }

  const id1 = extractVideoId(url1);
  const id2 = extractVideoId(url2);

  if (!id1 || !id2) {
    alert('YouTubeのURLを正しく入力してください');
    return;
  }

  if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
    alert('YouTube APIの読み込みが完了していません。少し待ってから再試行してください。');
    return;
  }

  seekbar.value = 0;
  seekbar.disabled = false;
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent   = '0:00';
  clearInterval(seekInterval);
  showPlayButton();

  initPlayers(id1, id2);
});

// ── ユーティリティ ──────────────────────────────────────────────────────────

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
