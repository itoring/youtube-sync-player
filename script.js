'use strict';

let player1 = null;
let player2 = null;
let player1Ready = false;
let player2Ready = false;
let seekInterval = null;
let isSeeking = false;
let loadedUrl1 = '';
let loadedUrl2 = '';

const btnPlay   = document.getElementById('btn-play');
const btnCopy   = document.getElementById('btn-copy');
const btnResync = document.getElementById('btn-resync');
const seekbar  = document.getElementById('seekbar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl   = document.getElementById('total-time');
const vol1 = document.getElementById('vol1');
const vol2 = document.getElementById('vol2');
const url1Input = document.getElementById('url1');
const url2Input = document.getElementById('url2');
const error1El = document.getElementById('error1');
const error2El = document.getElementById('error2');

// ── URLパラメータで動画IDをプリセット ──────────────────────────────────────

(function () {
  const params = new URLSearchParams(location.search);
  const v1 = params.get('v1');
  const v2 = params.get('v2');
  if (v1) url1Input.value = `https://www.youtube.com/watch?v=${v1}`;
  if (v2) url2Input.value = `https://www.youtube.com/watch?v=${v2}`;
  if (v1 && v2) btnCopy.disabled = false;
})();

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
  btnPlay.textContent = '⏳ よみこみ中…';
  btnResync.disabled = true;
  error1El.textContent = '';
  error2El.textContent = '';

  // 既存プレイヤーを破棄
  if (player1) { player1.destroy(); player1 = null; }
  if (player2) { player2.destroy(); player2 = null; }

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
    btnResync.disabled = false;
    startPlayback();
  }
}

function onPlayerError(num) {
  const el = num === 1 ? error1El : error2El;
  el.textContent = 'この動画は再生できません';
  btnPlay.disabled = false;
  btnPlay.textContent = '▶ さいせいスタート';
}

// ── 再生制御 ────────────────────────────────────────────────────────────────

function startPlayback() {
  player1.playVideo();
  player2.playVideo();
  btnPlay.disabled = false;
  btnPlay.textContent = '⏸ いっしょにとめる';
  startSeekbarUpdate();
}

btnPlay.addEventListener('click', () => {
  const url1 = url1Input.value.trim();
  const url2 = url2Input.value.trim();

  // 未読み込み or URL変更 → 新規読み込み
  if (url1 !== loadedUrl1 || url2 !== loadedUrl2) {
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
    loadedUrl1 = url1;
    loadedUrl2 = url2;
    seekbar.value = 0;
    seekbar.disabled = false;
    currentTimeEl.textContent = '0:00';
    totalTimeEl.textContent   = '0:00';
    clearInterval(seekInterval);
    initPlayers(id1, id2);
    return;
  }

  // 再生中 → 一時停止
  if (player1Ready && player2Ready) {
    const state1 = player1.getPlayerState();
    if (state1 === YT.PlayerState.PLAYING) {
      player1.pauseVideo();
      player2.pauseVideo();
      btnPlay.textContent = '▶ いっしょにさいせい';
    } else {
      player1.playVideo();
      player2.playVideo();
      btnPlay.textContent = '⏸ いっしょにとめる';
      startSeekbarUpdate();
    }
  }
});

// URLが変わったらボタンをスタートに戻す・コピーボタンの有効/無効を更新
function onUrlChange() {
  loadedUrl1 = '';
  loadedUrl2 = '';
  btnPlay.textContent = '▶ さいせいスタート';
  const id1 = extractVideoId(url1Input.value.trim());
  const id2 = extractVideoId(url2Input.value.trim());
  btnCopy.disabled = !(id1 && id2);
}
url1Input.addEventListener('input', onUrlChange);
url2Input.addEventListener('input', onUrlChange);

// シェアURLをクリップボードにコピー
btnCopy.addEventListener('click', () => {
  const id1 = extractVideoId(url1Input.value.trim());
  const id2 = extractVideoId(url2Input.value.trim());
  if (!id1 || !id2) return;
  const url = `${location.origin}${location.pathname}?v1=${id1}&v2=${id2}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btnCopy.textContent;
    btnCopy.textContent = '✅ コピーしました！';
    setTimeout(() => { btnCopy.textContent = orig; }, 2000);
  });
});

btnResync.addEventListener('click', () => {
  if (!player1Ready || !player2Ready) return;
  player1.seekTo(0, true);
  player2.seekTo(0, true);
  setTimeout(() => {
    player1.playVideo();
    player2.playVideo();
    btnPlay.textContent = '⏸ いっしょにとめる';
    startSeekbarUpdate();
  }, 300);
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

// ── ユーティリティ ──────────────────────────────────────────────────────────

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
