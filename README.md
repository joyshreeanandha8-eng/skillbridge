# SkillBridge — AI Competency Gap Finder

Built for Hack Devengers 2.0 (open-innovation track), inspired by SIH26101
(AI-enabled learning platform: competency-gap identification, personalized
training recommendations, and auto-generated quizzes from study material).

## What it does
1. Student pastes notes or uploads a PDF/text file of study material.
2. Groq LLM generates a tagged multiple-choice quiz from that material.
3. Student takes the quiz in-browser.
4. Backend analyzes wrong answers by topic tag to find **competency gaps**.
5. LLM generates short, targeted **recommendations** per weak topic.

## Tech stack
- Node.js + Express (backend)
- Groq API (`openai/gpt-oss-120b`) for quiz generation + gap analysis
- Vanilla HTML/CSS/JS (frontend, no framework — fast to build/debug solo)
- `pdf-parse` for PDF text extraction, `multer` for file uploads

## Setup
\`\`\`bash
npm install
cp .env.example .env   # add your GROQ_API_KEY
npm start
\`\`\`
Visit `http://localhost:3000`.

## Deploy
Deployed on Render (Node web service).
- Build command: `npm install`
- Start command: `node server.js`
- `GROQ_API_KEY` set as an environment variable in Render's dashboard.

## Notes / things intentionally left out for the 24-hr scope
- No login/auth or persistent user history — each session is stateless.
- No real iGOT Karmayogi integration — recommendations are generated
  generically by the LLM rather than pulled from a real course catalog.
- Topic tagging quality depends on the LLM's judgment; not human-verified.