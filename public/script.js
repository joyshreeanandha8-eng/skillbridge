let currentQuestions = [];
const userAnswers = {};

const uploadView = document.getElementById('upload-view');
const quizView = document.getElementById('quiz-view');
const resultsView = document.getElementById('results-view');

function showView(view) {
  [uploadView, quizView, resultsView].forEach(v => v.classList.remove('active'));
  view.classList.add('active');
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  const text = document.getElementById('text-input').value.trim();
  const fileInput = document.getElementById('file-input');
  const numQuestions = document.getElementById('num-questions').value;
  const status = document.getElementById('upload-status');

  if (!text && !fileInput.files.length) {
    status.textContent = 'Please paste some text or choose a file.';
    return;
  }

  status.textContent = 'Generating quiz... this can take ~10-20s.';

  const formData = new FormData();
  if (fileInput.files.length) formData.append('file', fileInput.files[0]);
  formData.append('text', text);
  formData.append('numQuestions', numQuestions);

  try {
    const res = await fetch('/api/generate-quiz', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentQuestions = data.questions;
    renderQuiz();
    showView(quizView);
    status.textContent = '';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
});

function renderQuiz() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';
  currentQuestions.forEach((q, i) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    block.innerHTML = `
      <p class="q-title">${i + 1}. ${q.question}</p>
      <div class="options" data-qid="${q.id}">
        ${q.options.map((opt, idx) => `
          <label class="option">
            <input type="radio" name="${q.id}" value="${idx}" />
            ${opt}
          </label>
        `).join('')}
      </div>
    `;
    container.appendChild(block);
  });
  document.getElementById('quiz-progress').textContent = `${currentQuestions.length} questions`;
}

document.getElementById('submit-quiz-btn').addEventListener('click', async () => {
  currentQuestions.forEach(q => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    userAnswers[q.id] = selected ? Number(selected.value) : -1;
  });

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions: currentQuestions, answers: userAnswers }),
  });
  const data = await res.json();
  renderResults(data);
  showView(resultsView);
});

function renderResults(data) {
  document.getElementById('score-summary').innerHTML =
    `<h3>Score: ${data.score} / ${data.total}</h3>`;

  const weakDiv = document.getElementById('weak-topics');
  weakDiv.innerHTML = data.weakTopics.length
    ? `<h4>Weak topics</h4><ul>${data.weakTopics.map(t => `<li>${t}</li>`).join('')}</ul>`
    : `<p>Great job — no weak topics detected!</p>`;

  const recDiv = document.getElementById('recommendations');
  recDiv.innerHTML = data.recommendations && data.recommendations.length
    ? `<h4>Recommendations</h4><ul>${data.recommendations.map(r => `<li><strong>${r.topic}:</strong> ${r.advice}</li>`).join('')}</ul>`
    : '';
}

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('text-input').value = '';
  document.getElementById('file-input').value = '';
  showView(uploadView);
});