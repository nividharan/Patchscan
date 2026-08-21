# 🛡️ WebHealer AI — Autonomous Web QA Agent

> **Built for Breakpoint Hackathon 2026 (Hosted by Invoqe on Unstop)**  
> **Tagline:** Autonomous QA Agent that crawls any live website, discovers broken features/console crashes, and generates ready-to-merge code fixes with Playwright tests.

---

## ⚡ What is WebHealer AI?
WebHealer AI transforms manual QA testing into an autonomous, 30-second AI operation:
1. **Enter Any URL:** No installation, no private repo tokens, no complicated setup required.
2. **Autonomous Headless Exploration:** Playwright-powered crawler navigates the DOM, tests form submissions with boundary values, triggers navigation links, and intercepts console errors & 404 network failures.
3. **AI Forensic Analysis & Code Generation:** The AI analyzes the runtime crash, isolates the root cause, and generates:
   - 🧪 **A complete Playwright `.spec.ts` test file** to reproduce and prevent regression.
   - 🛠️ **A unified code patch (`.diff`)** to fix the underlying Javascript/React error.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd webhealer-ai
npm install
npx playwright install chromium
```

### 2. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🎬 How to Demo to Hackathon Judges

1. **Option A: The 1-Click Sandbox Demo**
   - Click the preset **"Target Sandbox"** (`http://localhost:3000/demo`).
   - Click **"Launch QA Agent"**.
   - Watch the live terminal stream as the agent finds:
     - 💥 Unhandled Javascript TypeError in contact form validator
     - 💥 HTTP 404 failure on enterprise checkout trigger
     - 💥 Unhandled AuthSDK client error
   - Show the generated Playwright test and suggested code patch!

2. **Option B: Test a Judge's Live Website**
   - Type any public URL (e.g. `https://news.ycombinator.com` or the judge's project link).
   - Watch the agent crawl their live site and perform autonomous safety inspection.

---

## 🏗️ Architecture & Tech Stack
- **Frontend:** Next.js 14 App Router, Tailwind CSS, Lucide Icons, Framer Motion
- **Headless Crawler:** Playwright Chromium Automation Engine
- **AI Diagnosis:** LLM Reasoning Engine (OpenAI GPT-4o / Intelligent AST Generator)
- **Live Stream:** Real-time Event Logger & Screenshot Capture
