/* main.js — SentimentAI Index Page */

const API = 'http://localhost:5000/api';

const tweetInput  = document.getElementById('tweetInput');
const charCount   = document.getElementById('charCount');
const analyseBtn  = document.getElementById('analyseBtn');
const resultPanel = document.getElementById('resultPanel');
const resultLoading = document.getElementById('resultLoading');
const resultContent = document.getElementById('resultContent');

const EMOJI = { positive: '😊', negative: '😠', neutral: '😐' };

// ── Char counter ──────────────────────────────────────────────────────────────
tweetInput.addEventListener('input', () => {
  charCount.textContent = tweetInput.value.length;
});

// ── Example tweets ────────────────────────────────────────────────────────────
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    tweetInput.value = btn.dataset.tweet;
    charCount.textContent = btn.dataset.tweet.length;
    tweetInput.focus();
  });
});

// ── Show empty state initially ────────────────────────────────────────────────
resultPanel.innerHTML = `
  <div class="result-empty">
    <div class="result-empty-icon">🐦</div>
    <p>Enter a tweet and click<br><strong>Analyse Sentiment</strong></p>
  </div>
`;

// ── Analyse ───────────────────────────────────────────────────────────────────
analyseBtn.addEventListener('click', analyse);
tweetInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') analyse();
});

async function analyse() {
  const tweet = tweetInput.value.trim();
  if (!tweet) { showToast('Please enter a tweet first', 'error'); return; }

  analyseBtn.disabled = true;
  analyseBtn.querySelector('.btn-text').textContent = 'Analysing…';

  // Show loading
  resultPanel.innerHTML = `
    <div class="result-loading" style="display:flex">
      <div class="spinner"></div>
      <p>Analysing tweet…</p>
    </div>`;

  try {
    const res  = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweet }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    renderResult(data);
  } catch (err) {
    resultPanel.innerHTML = `
      <div class="result-empty">
        <div class="result-empty-icon">⚠️</div>
        <p style="color:var(--negative)">${err.message}</p>
        <p style="font-size:.8rem">Make sure the Flask backend is running on port 5000</p>
      </div>`;
    showToast(err.message, 'error');
  } finally {
    analyseBtn.disabled = false;
    analyseBtn.querySelector('.btn-text').textContent = 'Analyse Sentiment';
  }
}

function renderResult(data) {
  const { sentiment, confidence, probabilities, clean_text, elapsed_ms } = data;
  const sClass = sentiment.toLowerCase();

  resultPanel.innerHTML = `
    <div class="result-content" id="resultContent">
      <div class="result-top">
        <div class="sentiment-badge">
          <span class="sentiment-emoji">${EMOJI[sClass] || '🤔'}</span>
          <span class="sentiment-label ${sClass}">${sentiment}</span>
        </div>
        <div class="confidence-ring-wrap">
          <svg class="confidence-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" class="ring-bg"/>
            <circle cx="40" cy="40" r="32" class="ring-fill" id="ringFill"/>
          </svg>
          <div class="confidence-text">
            <span id="confidenceVal">0</span><small>%</small>
          </div>
        </div>
      </div>

      <div class="prob-section">
        <div class="prob-title">Probability Breakdown</div>
        <div id="probBars"></div>
      </div>

      <div class="clean-section">
        <div class="clean-label">Preprocessed Text</div>
        <div class="clean-text">${clean_text || '(empty after cleaning)'}</div>
      </div>

      <div class="result-meta">
        <span>⚡ ${elapsed_ms}ms</span>
        <span>Model: SVM (LinearSVC)</span>
      </div>
    </div>`;

  // Animate confidence ring
  const ringFill = document.getElementById('ringFill');
  const circum   = 2 * Math.PI * 32; // 201.06
  const ringColor = sClass === 'positive' ? 'var(--positive)' :
                    sClass === 'negative' ? 'var(--negative)' : 'var(--neutral)';
  ringFill.style.stroke = ringColor;

  animateCounter('confidenceVal', 0, Math.round(confidence), 900, (v) => {
    ringFill.style.strokeDashoffset = circum - (v / 100) * circum;
    ringFill.style.strokeDasharray  = circum;
  });

  // Render probability bars
  const probBars = document.getElementById('probBars');
  const sorted   = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([label, pct]) => {
    const lc = label.toLowerCase();
    const div = document.createElement('div');
    div.className = 'prob-row';
    div.innerHTML = `
      <span class="prob-name">${label}</span>
      <div class="prob-bar-wrap">
        <div class="prob-bar-fill ${lc}" style="width:0%" data-target="${pct}"></div>
      </div>
      <span class="prob-pct">${pct.toFixed(1)}%</span>`;
    probBars.appendChild(div);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.prob-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

function animateCounter(id, from, to, duration, callback) {
  const el    = document.getElementById(id);
  const start = performance.now();
  function step(now) {
    const t   = Math.min((now - start) / duration, 1);
    const val = Math.round(from + (to - from) * easeOut(t));
    if (el) el.textContent = val;
    if (callback) callback(val);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ── Stats counter animation ───────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = +el.dataset.target;
      animateCounter(null, 0, target, 1500, (v) => { el.textContent = v; });
      observer.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-value').forEach(el => observer.observe(el));

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 3000);
}
