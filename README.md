# 🚀 PatchScan — Autonomous Web Audit & Code Remediation Platform

> **Stop Writing Tests. Start Shipping Fixes.**  
> PatchScan is an autonomous web quality assurance engine that executes **10 parallel Playwright test suites** against any target URL and synthesizes **ready-to-run `.spec.ts` reproduction tests** and **unified `.diff` code patches** in under 60 seconds.

---

## ⚡ Why PatchScan?

Traditional QA tools only file bug tickets and complain (*"Here is a 500 error, go fix it"*).  
**PatchScan actually closes the loop**:
1. 🌐 **Zero Configuration**: No SDK to install, no script authoring. Just paste any staging, localhost, or production URL.
2. 🤖 **10-Suite Autonomous Fleet**: Headless Playwright browsers audit Functional behavior, WCAG 2.1 AA Accessibility, Responsive viewports, Security headers, Core Web Vitals, API contracts, Concurrency, and more in parallel.
3. 📡 **Real-Time Telemetry Stream**: Watch the sweep live with Server-Sent Events (SSE) streaming terminal logs, screenshot gallery, and risk counters.
4. 🩹 **Instant Auto-Remediation**: Generates a Playwright `.spec.ts` reproduction script and a syntax-highlighted `.diff` patch ready to review and merge.

---

## 🛠️ The 10 Parallel QA Suites

| # | Test Suite | What It Inspects & Audits |
|---|---|---|
| 1 | **Functional QA** | Form boundary limits (10,000-char stress tests), broken links, navigation response codes |
| 2 | **Accessibility (WCAG 2.1 AA)** | Missing image `alt` attributes, unlabelled form inputs, text contrast ratios |
| 3 | **Responsive Layout** | Horizontal overflow detection across Mobile (390px), Tablet (768px), and Desktop (1280px) |
| 4 | **Security Headers** | `Content-Security-Policy`, `HSTS`, `X-Frame-Options`, `HttpOnly` cookie flags |
| 5 | **Performance & Vitals** | Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), Time to First Byte (TTFB) |
| 6 | **API Monitoring** | Intercepts `fetch`/XHR network responses to identify broken endpoints and CORS failures |
| 7 | **File Upload / Download** | MIME-type boundaries and file upload input constraints |
| 8 | **Cross-Browser** | DOM parity verification across Chromium, Firefox, and WebKit |
| 9 | **Localization (i18n)** | `<html>` `lang` attributes, RTL direction rules, date/currency formatting |
| 10 | **Concurrency & Load** | Multi-browser concurrent session stress testing and server stability |

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/nividharan/patchscan.git
cd patchscan
npm install
npx playwright install chromium
```

### 2. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Demoing with the Built-in Sandbox

1. Navigate to `http://localhost:3000`.
2. Click **Target Sandbox (/demo)** to target the built-in sandbox with planted accessibility, network, and exception bugs.
3. Click **Run QA Sweep** to watch the autonomous agent inspect the page and generate fixes live!

---

## 🏗️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                   PatchScan Dashboard                   │
   │      (Next.js 14 App Router · Tailwind CSS · TypeScript) │
   └────────────────────────────┬────────────────────────────┘
                                │  Server-Sent Events (SSE)
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Next.js Route Handlers                 │
   │               (/api/scan & /api/scan/stream)            │
   └────────────────────────────┬────────────────────────────┘
                                │  Parallel Browser Contexts
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │           Playwright Headless Browser Fleets            │
   │        (Chromium · Firefox · WebKit · 10 Suites)        │
   └────────────────────────────┬────────────────────────────┘
                                │  Runtime Events & Telemetry
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Dual Forensic Engine                   │
   │     AST Heuristics (Zero Key)  /  GPT-4o Reasoning      │
   └────────────────────────────┬────────────────────────────┘
                                │  Outputs
                                ▼
       ┌────────────────────────┴────────────────────────┐
       │                                                 │
       ▼                                                 ▼
Playwright `.spec.ts` Repro Test              Unified `.diff` Code Patch
```

---

## 📄 Presentation & Deck
The executive pitch deck is included in this repository:
- 📊 **`PatchScan_Pitch_Deck.pptx`** (Includes all 8 slides covering Problem, Solution, Architecture, Market, Comparison, Roadmap, and Implementation).

---

## 📜 License
MIT License. Open source and built for high-velocity engineering teams.
