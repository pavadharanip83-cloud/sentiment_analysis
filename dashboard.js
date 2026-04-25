/* dashboard.js */

const FONT  = "'Syne', sans-serif";
const MUTED = '#7a8499';
const TEXT  = '#e8edf5';
const GRID  = 'rgba(255,255,255,.06)';

Chart.defaults.color = TEXT;
Chart.defaults.font.family = "'Epilogue', sans-serif";

// ── 1. Class Accuracy ──────────────────────────────────────────────────────
new Chart(document.getElementById('classAccChart'), {
  type: 'bar',
  data: {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      label: 'F1-Score (%)',
      data: [87, 84, 82],
      backgroundColor: ['rgba(34,197,94,.7)', 'rgba(239,68,68,.7)', 'rgba(245,158,11,.7)'],
      borderColor:     ['#22c55e','#ef4444','#f59e0b'],
      borderWidth: 2, borderRadius: 8,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: GRID }, ticks: { callback: v => v + '%' } },
      x: { grid: { display: false } }
    }
  }
});

// ── 2. Dataset Distribution ────────────────────────────────────────────────
new Chart(document.getElementById('distChart'), {
  type: 'doughnut',
  data: {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [45, 35, 20],
      backgroundColor: ['rgba(34,197,94,.8)', 'rgba(239,68,68,.8)', 'rgba(245,158,11,.8)'],
      borderColor: ['#22c55e','#ef4444','#f59e0b'],
      borderWidth: 2,
    }]
  },
  options: {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } }
    }
  }
});

// ── 3. Model Comparison ────────────────────────────────────────────────────
new Chart(document.getElementById('modelChart'), {
  type: 'bar',
  data: {
    labels: ['Naive Bayes', 'Random Forest', 'Logistic Regression', 'XGBoost', 'SVM (LinearSVC)'],
    datasets: [{
      label: 'Accuracy (%)',
      data: [73, 79, 81, 83, 85],
      backgroundColor: [
        'rgba(120,130,160,.5)',
        'rgba(120,130,160,.5)',
        'rgba(120,130,160,.5)',
        'rgba(120,130,160,.5)',
        'rgba(79,142,247,.85)',
      ],
      borderColor: ['transparent','transparent','transparent','transparent','#4f8ef7'],
      borderWidth: 2, borderRadius: 8,
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, min: 60, max: 100, grid: { color: GRID }, ticks: { callback: v => v + '%' } },
      y: { grid: { display: false } }
    }
  }
});

// ── 4. Confusion Matrix ────────────────────────────────────────────────────
// Visualise as grouped bar (predicted vs actual)
new Chart(document.getElementById('cmChart'), {
  type: 'bar',
  data: {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [
      { label: 'True Positive',  data: [870, 0, 0], backgroundColor: 'rgba(34,197,94,.7)',  borderRadius: 6 },
      { label: 'True Negative',  data: [0, 840, 0], backgroundColor: 'rgba(239,68,68,.7)',  borderRadius: 6 },
      { label: 'True Neutral',   data: [0, 0, 820], backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 6 },
    ]
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { grid: { color: GRID } },
      x: { grid: { display: false } }
    }
  }
});

// ── 5. Top TF-IDF Features ────────────────────────────────────────────────
new Chart(document.getElementById('featureChart'), {
  type: 'bar',
  data: {
    labels: ['love','hate','great','terrible','happy','sad','awesome','awful','good','bad'],
    datasets: [{
      label: 'TF-IDF Weight',
      data: [0.92, 0.89, 0.85, 0.83, 0.81, 0.79, 0.77, 0.75, 0.72, 0.70],
      backgroundColor: 'rgba(124,58,237,.7)',
      borderColor: '#7c3aed',
      borderWidth: 2, borderRadius: 6,
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: GRID } },
      y: { grid: { display: false } }
    }
  }
});
