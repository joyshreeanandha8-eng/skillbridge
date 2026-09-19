require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

const MODEL = 'openai/gpt-oss-120b';

// ---- Helper: extract text from uploaded file or raw text ----
async function getSourceText(req) {
  if (req.file) {
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      return data.text;
    }
    return req.file.buffer.toString('utf-8');
  }
  return req.body.text || '';
}

// ---- 1. Generate quiz from material ----
app.post('/api/generate-quiz', upload.single('file'), async (req, res) => {
  try {
    const sourceText = (await getSourceText(req)).slice(0, 12000); // keep prompt manageable
    if (!sourceText.trim()) {
      return res.status(400).json({ error: 'No study material provided.' });
    }

    const numQuestions = Math.min(Number(req.body.numQuestions) || 8, 15);

    const prompt = `You are an expert exam-writer. Read the study material below and produce ${numQuestions} multiple-choice questions that test genuine understanding (not just fact recall).

For EACH question, tag it with a short "topic" label (2-4 words) naming the specific concept it tests, so weak topics can be identified later.

Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "questions": [
    {
      "id": "q1",
      "topic": "short topic label",
      "question": "question text",
      "options": ["A text", "B text", "C text", "D text"],
      "correctIndex": 0
    }
  ]
}

STUDY MATERIAL:
"""${sourceText}"""`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quiz. Try shorter material or retry.' });
  }
});

// ---- 2. Analyze results -> weak topics + recommendations ----
app.post('/api/analyze', async (req, res) => {
  try {
    const { questions, answers } = req.body; // answers: { [id]: selectedIndex }
    if (!questions || !answers) return res.status(400).json({ error: 'Missing data.' });

    let score = 0;
    const wrongTopics = [];
    questions.forEach(q => {
      const chosen = answers[q.id];
      if (chosen === q.correctIndex) {
        score++;
      } else {
        wrongTopics.push(q.topic);
      }
    });

    const total = questions.length;
    const uniqueWeak = [...new Set(wrongTopics)];

    let recommendations = [];
    if (uniqueWeak.length > 0) {
      const prompt = `A student got questions wrong on these topics: ${uniqueWeak.join(', ')}.
For EACH topic, give one short, actionable study recommendation (max 20 words).
Return ONLY valid JSON: { "recommendations": [{ "topic": "...", "advice": "..." }] }`;

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      });
      const raw = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
      recommendations = JSON.parse(raw).recommendations;
    }

    res.json({
      score,
      total,
      weakTopics: uniqueWeak,
      recommendations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze results.' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SkillBridge running on port ${PORT}`));