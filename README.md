# 🚀 PatchScan — Autonomous Web Audit & Code Remediation Platform

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.46-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Stop Writing Tests. Start Shipping Fixes.**  
*Autonomous web quality assurance engine that executes 10 parallel Playwright sweeps on any target URL and synthesizes ready-to-run `.spec.ts` reproduction tests and unified `.diff` code patches in under 60 seconds.*

[Live Demo](http://localhost:3000) • [Architecture](#-architecture--tech-stack) • [10 QA Suites](#-the-10-parallel-qa-suites) • [Roadmap](#-roadmap)

</div>

---

## ⚡ Why PatchScan?

Traditional QA tools only file bug tickets and complain (*"Here is a 500 error, go fix it"*).  
**PatchScan actually closes the loop**:

* 🌐 **Zero Configuration**: No SDK to install, no script authoring. Paste any staging, localhost, or production URL.
* 🤖 **10-Suite Autonomous Fleet**: Headless Playwright browsers audit Functional behavior, WCAG 2.1 AA Accessibility, Responsive viewports, Security headers, Core Web Vitals, API contracts, Concurrency, and more in parallel.
* 📡 **Real-Time Telemetry Stream**: Watch the sweep live with Server-Sent Events (SSE) streaming terminal logs, screenshot gallery, and risk counters.
* 🩹 **Instant Auto-Remediation**: Generates a Playwright `.spec.ts` reproduction script and a syntax-highlighted `.diff` patch ready to review and merge.
* 🔒 **Dual Forensic Engine**: Runs fully offline with built-in zero-key AST heuristics, or enhances diagnosis with OpenAI GPT-4o.

---

## 🛠️ The 10 Parallel QA Suites

| # | Test Suite | What It Inspects & Audits | Auto-Remediation Output |
|---|---|---|---|
| 1 | **Functional QA** | Form boundary limits (10,000-char stress tests), broken links, navigation response codes | Input validation guards & event handler fixes |
| 2 | **Accessibility (WCAG 2.1 AA)** | Missing image `alt` attributes, unlabelled form inputs, text contrast ratios | Semantic HTML tags, aria-labels, alt attributes |
| 3 | **Responsive Layout** | Horizontal overflow detection across Mobile (390px), Tablet (768px), and Desktop (1280px) | CSS overflow rules & viewport container fixes |
| 4 | **Security Headers** | `Content-Security-Policy`, `HSTS`, `X-Frame-Options`, `HttpOnly` cookie flags | Server response header middleware & cookie security flags |
| 5 | **Performance & Vitals** | Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), Time to First Byte (TTFB) | Resource preloading & image dimension attributes |
| 6 | **API Monitoring** | Intercepts `fetch`/XHR network responses to identify broken endpoints and CORS failures | Error boundaries & API fallback handlers |
| 7 | **File Upload / Download** | MIME-type boundaries and file upload input constraints | Client-side file size & MIME type validation |
| 8 | **Cross-Browser** | DOM parity verification across Chromium, Firefox, and WebKit | Cross-browser CSS fallbacks & polyfills |
| 9 | **Localization (i18n)** | `<html>` `lang` attributes, RTL direction rules, date/currency formatting | Document locale tags & direction attributes |
| 10 | **Concurrency & Load** | Multi-browser concurrent session stress testing and server stability | Connection throttling & race condition mitigations |

---

## 🧪 Demoing with the Built-in Sandbox

1. Navigate to `http://localhost:3000`.
2. Click **Target Sandbox (/demo)** to target the built-in sandbox with planted accessibility, network, and exception bugs.
3. Click **Run QA Sweep** to watch the autonomous agent inspect the page and generate fixes live!

---

## 🏗️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                   PatchScan Cockpit                     │
   │      (Next.js 14 App Router · Tailwind CSS · TypeScript) │
   └────────────────────────────┬────────────────────────────┘
                                │  Server-Sent Events (SSE Stream)
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
                                │  Runtime Telemetry & Screenshots
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Dual Forensic Engine                   │
   │     AST Heuristics (Zero Key)  /  GPT-4o Reasoning      │
   └────────────────────────────┬────────────────────────────┘
                                │  Remediation Artifacts
                                ▼
       ┌────────────────────────┴────────────────────────┐
       │                                                 │
       ▼                                                 ▼
Playwright `.spec.ts` Repro Test              Unified `.diff` Code Patch
```

---

## 🗺️ Roadmap

- [x] **Phase 1: Core Engine & Cockpit** — 10-suite Playwright fleet, real-time SSE stream, AST heuristic mode, screenshot viewer.
- [ ] **Phase 2: GitHub PR Bot** — Automated GitHub Action to run sweeps on staging deployments and open Pull Requests with `.diff` patches.
- [ ] **Phase 3: Multi-Page Recursive Crawl** — Authenticated crawling with OAuth, cookie session injection, and multi-step user flow testing.
- [ ] **Phase 4: Enterprise Self-Hosted** — Docker container images, VPC-isolated network scanning, and SOC2 compliance reporting.

---

## 👤 Author

**Nividharan**  
- GitHub: [@nividharan](https://github.com/nividharan)  
- Email: [nividharan452007@gmail.com](mailto:nividharan452007@gmail.com)

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
