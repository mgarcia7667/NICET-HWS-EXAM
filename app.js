// NICET Level III — Hydraulics & Water Supply Planning App Logic

const STORAGE_KEY = 'nicet_hws_state';

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return { answers: {}, revealed: {}, filter: 'all', view: 'exam' };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function totalStats() {
  let ans = 0, cor = 0;
  QUESTIONS.forEach((q, i) => {
    if (state.answers[i] !== undefined) { ans++; if (state.answers[i] === q.a) cor++; }
  });
  return { ans, cor, total: QUESTIONS.length };
}

function sectionStats() {
  const c = {};
  SECTIONS.forEach(s => { c[s.id] = { total: 0, answered: 0, correct: 0 }; });
  QUESTIONS.forEach((q, i) => {
    c[q.s].total++;
    if (state.answers[i] !== undefined) {
      c[q.s].answered++;
      if (state.answers[i] === q.a) c[q.s].correct++;
    }
  });
  return c;
}

function filteredQuestions() {
  switch (state.filter) {
    case 'unanswered': return QUESTIONS.map((q,i)=>({q,i})).filter(({i})=>state.answers[i]===undefined);
    case 'wrong':      return QUESTIONS.map((q,i)=>({q,i})).filter(({i})=>state.answers[i]!==undefined && state.answers[i]!==QUESTIONS[i].a);
    case 'calc':       return QUESTIONS.map((q,i)=>({q,i})).filter(({q})=>q.calc===true);
    case 'all':        return QUESTIONS.map((q,i)=>({q,i}));
    default:           return QUESTIONS.map((q,i)=>({q,i})).filter(({q})=>q.s===state.filter);
  }
}

function render() {
  const sc = totalStats();
  const pct = sc.ans > 0 ? Math.round(sc.cor / sc.ans * 100) : 0;
  document.getElementById('hs-pct').textContent = pct + '%';
  document.getElementById('hs-rem').textContent = sc.total - sc.ans;
  document.getElementById('prog-fill').style.width = Math.round(sc.ans / sc.total * 100) + '%';
  document.getElementById('prog-label').textContent = `${sc.ans} of ${sc.total} answered`;
  document.getElementById('prog-score').textContent = `Score: ${sc.cor} / ${sc.ans || 0}`;

  if (state.view === 'results') {
    document.getElementById('exam-screen').style.display = 'none';
    document.getElementById('results-screen').style.display = 'block';
    renderResults(sc);
    return;
  }
  document.getElementById('exam-screen').style.display = 'block';
  document.getElementById('results-screen').style.display = 'none';
  renderFilterTabs(sc);
  renderQuestions();
}

function renderFilterTabs(sc) {
  const cc = sectionStats();
  const wrong = Object.keys(state.answers).filter(i => state.answers[i] !== QUESTIONS[i].a).length;
  const unanswered = sc.total - sc.ans;
  const calcCount = QUESTIONS.filter(q => q.calc).length;

  let html = `
    <div class="ftab ${state.filter==='all'?'active':''}" onclick="setFilter('all')">All (${sc.total})</div>
    <div class="ftab ${state.filter==='calc'?'active':''}" onclick="setFilter('calc')" style="${state.filter!=='calc'?'border-color:var(--gold);color:var(--gold)':''}">⚡ Calculations (${calcCount})</div>
    <div class="ftab ${state.filter==='unanswered'?'active':''}" onclick="setFilter('unanswered')">Unanswered (${unanswered})</div>
    <div class="ftab ${state.filter==='wrong'?'active warn-tab':''} ${state.filter!=='wrong'?'warn-tab':''}" onclick="setFilter('wrong')">Incorrect (${wrong})</div>
  `;
  SECTIONS.forEach(s => {
    const c = cc[s.id];
    const allDone = c.answered === c.total && c.total > 0;
    const isActive = state.filter === s.id;
    html += `<div class="ftab ${isActive?'active':(allDone?'done-tab':'')}" onclick="setFilter('${s.id}')">${s.label.split(' ').slice(0,3).join(' ')} (${c.total})</div>`;
  });
  document.getElementById('filter-tabs').innerHTML = html;
}

function renderQuestions() {
  const qs = filteredQuestions();
  const letters = ['A','B','C','D'];
  const container = document.getElementById('questions-container');

  if (qs.length === 0) {
    container.innerHTML = '<div class="empty">No questions match this filter.</div>';
    return;
  }

  let html = '';
  qs.forEach(({ q, i }) => {
    const sec = SECTIONS.find(s => s.id === q.s);
    const sel = state.answers[i];
    const shown = state.revealed[i];

    html += `<div class="q-card">
      <div class="q-header">
        <span class="q-num">Q${i+1}</span>
        <span class="sec-tag ${sec.tagClass}">${sec.label}</span>
        ${q.calc ? '<span class="calc-badge">⚡ CALCULATION</span>' : ''}
        <span style="font-size:10px;color:var(--text3)">${sec.pct} of exam</span>
      </div>
      <div class="q-text">${q.t}</div>`;

    if (q.given) {
      html += `<div class="q-given"><b>Given</b>${q.given.replace(/\n/g, '<br>')}</div>`;
    }

    html += '<div class="options">';
    q.o.forEach((opt, j) => {
      let cls = 'opt';
      if (shown) {
        if (j === q.a) cls += ' correct';
        else if (sel === j) cls += ' wrong';
      } else if (sel === j) cls += ' selected';
      html += `<div class="${cls}" onclick="pickAnswer(${i},${j})"><span class="opt-letter">${letters[j]}</span>${opt}</div>`;
    });
    html += '</div>';

    if (sel !== undefined && !shown) {
      html += `<button class="check-btn" onclick="revealAnswer(${i})">Check Answer</button>`;
    }
    if (shown) {
      html += `<div class="explanation">${q.e}</div>`;
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

function renderResults(sc) {
  const pct = Math.round(sc.cor / sc.total * 100);
  const pass = pct >= 70;
  const cc = sectionStats();
  const dial = document.getElementById('score-dial');
  dial.style.borderColor = pass ? 'var(--green)' : 'var(--red)';
  document.getElementById('final-pct').style.color = pass ? 'var(--green)' : 'var(--red)';
  document.getElementById('final-pct').textContent = pct + '%';
  document.getElementById('final-label').textContent = pass ? 'PASSING ✓' : 'NEEDS WORK';
  document.getElementById('result-title').textContent = pass ? 'Great work — you passed!' : 'Keep drilling those calculations!';
  document.getElementById('result-sub').textContent = `${sc.cor} of ${sc.total} correct · NICET passing threshold ≈ 70%`;

  let secHtml = '';
  SECTIONS.forEach(s => {
    const c = cc[s.id];
    const sp = c.answered > 0 ? Math.round(c.correct / c.answered * 100) : 0;
    secHtml += `<div class="sec-result-card">
      <div class="src-label">${s.label}</div>
      <div class="src-score">${c.correct}/${c.total} <span style="font-size:13px;color:var(--text3)">(${sp}%)</span></div>
      <div class="src-bar"><div class="src-bar-fill" style="width:${sp}%"></div></div>
    </div>`;
  });
  document.getElementById('sec-results').innerHTML = secHtml;
}

function pickAnswer(i, j) {
  if (state.revealed[i]) return;
  state.answers[i] = j;
  saveState();
  render();
}
function revealAnswer(i) { state.revealed[i] = true; saveState(); render(); }
function setFilter(f) { state.filter = f; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function showResults() { state.view = 'results'; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function backToExam() { state.view = 'exam'; state.filter = 'all'; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function resetExam() {
  if (!confirm('Reset all answers and start over?')) return;
  state = { answers:{}, revealed:{}, filter:'all', view:'exam' };
  saveState(); render(); window.scrollTo({top:0,behavior:'smooth'});
}

// PWA Install
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  document.getElementById('install-banner').style.display = 'flex';
});
document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('install-banner').style.display = 'none';
});
document.getElementById('dismiss-install').addEventListener('click', () => {
  document.getElementById('install-banner').style.display = 'none';
});

// Offline
window.addEventListener('online',  () => { document.getElementById('offline-banner').style.display='none'; });
window.addEventListener('offline', () => { document.getElementById('offline-banner').style.display='block'; });

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}

render();
