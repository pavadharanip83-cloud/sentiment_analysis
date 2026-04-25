/* batch.js */
const API = 'http://localhost:5000/api';
let parsedRows = [];
let allResults = [];

const uploadZone = document.getElementById('uploadZone');
const csvFile = document.getElementById('csvFile');
const colSelectRow = document.getElementById('colSelectRow');
const colSelect = document.getElementById('colSelect');
const runBtn = document.getElementById('runBtn');
const batchResults = document.getElementById('batchResults');

// Drag & drop
uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});
csvFile.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        parsedRows = parseCSV(text);
        if (!parsedRows.length) return showToast('Could not parse CSV', 'error');
        const cols = Object.keys(parsedRows[0]);
        colSelect.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
        colSelectRow.style.display = 'flex';
        runBtn.disabled = false;
        uploadZone.querySelector('h3').textContent = `✅ ${file.name} loaded (${parsedRows.length} rows)`;
        showToast(`Loaded ${parsedRows.length} rows`, 'success');
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/"/g, ''); });
        return obj;
    });
}

runBtn.addEventListener('click', async() => {
    const col = colSelect.value;
    const tweets = parsedRows.map(r => r[col]).filter(Boolean);
    if (!tweets.length) return showToast('No tweets found in selected column', 'error');

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Analysing…';
    batchResults.style.display = 'none';

    try {
        // Send in chunks of 100
        allResults = [];
        const chunkSize = 100;
        for (let i = 0; i < tweets.length; i += chunkSize) {
            const chunk = tweets.slice(i, i + chunkSize);
            const res = await fetch(`${API}/predict/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tweets: chunk }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            allResults.push(...data.results);
        }
        renderBatchResults(allResults);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run Batch Analysis';
    }
});

function renderBatchResults(results) {
    batchResults.style.display = 'block';


    const counts = { positive: 0, negative: 0, neutral: 0 };

    results.forEach(r => {
        const label = r.sentiment.toLowerCase(); // 🔥 fix here
        if (counts[label] !== undefined)
            counts[label]++;
    });
    document.getElementById('resultSummary').innerHTML = ['positive', 'negative', 'neutral'].map(s => `
    <div class="summary-card">
      <div class="s-val ${s}">${counts[s]}</div>
      <div class="s-lbl">${s.charAt(0).toUpperCase()+s.slice(1)} (${((counts[s]/results.length)*100).toFixed(1)}%)</div>
    </div>`).join('');

    const tbody = document.getElementById('resultBody');
    tbody.innerHTML = results.slice(0, 200).map((r, i) => `
    <tr>
      <td style="color:var(--text-muted)">${i + 1}</td>
      <td title="${r.tweet}">${r.tweet.slice(0, 80)}${r.tweet.length > 80 ? '…' : ''}</td>
      <td><span class="pill ${r.sentiment}">${r.sentiment}</span></td>
      <td>${r.confidence}%</td>
    </tr>`).join('');

    document.getElementById('downloadBtn').onclick = () => downloadCSV(results);
    showToast(`Done! ${results.length} tweets analysed`, 'success');
}

function downloadCSV(results) {
    const header = 'tweet,sentiment,confidence\n';
    const rows = results.map(r =>
        `"${r.tweet.replace(/"/g,'""')}",${r.sentiment},${r.confidence}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sentiment_results.csv';
    a.click();
}

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