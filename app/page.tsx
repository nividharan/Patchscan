'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Radio,
  Wrench,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Terminal,
} from 'lucide-react';

interface VulnerabilityItem {
  id: string;
  name: string;
  currentVer: string;
  latestVer: string;
  cve: string;
  score: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  cmd: string;
}

const VULNERABILITIES: VulnerabilityItem[] = [
  {
    id: 'openssl',
    name: 'openssl (libssl3)',
    currentVer: '3.0.2',
    latestVer: '3.0.13',
    cve: 'CVE-2024-3094',
    score: '9.8',
    severity: 'CRITICAL',
    title: 'OpenSSL / libssl3 Authentication Bypass Vulnerability',
    description: 'A critical flaw allows remote attackers to compromise cryptographic handshakes and execute arbitrary commands under specific daemon configurations.',
    cmd: 'sudo apt-get update && sudo apt-get --only-upgrade install -y openssl libssl3',
  },
  {
    id: 'kernel',
    name: 'linux-image-generic',
    currentVer: '5.15.0-88',
    latestVer: '5.15.0-105',
    cve: 'CVE-2024-1086',
    score: '7.8',
    severity: 'HIGH',
    title: 'Linux Kernel Netfilter Privilege Escalation',
    description: 'A use-after-free vulnerability in the netfilter nf_tables component allows local unprivileged users to obtain full root capabilities.',
    cmd: 'sudo apt-get update && sudo apt-get install -y linux-image-generic linux-headers-generic && sudo reboot',
  },
  {
    id: 'nginx',
    name: 'nginx-core',
    currentVer: '1.18.0',
    latestVer: '1.24.0',
    cve: 'CVE-2023-44487',
    score: '7.5',
    severity: 'MEDIUM',
    title: 'HTTP/2 Rapid Reset Denial of Service',
    description: 'The HTTP/2 protocol allows a client to request a stream reset immediately, generating high CPU exhaustion on unpatched web proxies.',
    cmd: 'sudo apt-get update && sudo apt-get --only-upgrade install -y nginx && sudo systemctl reload nginx',
  },
  {
    id: 'openssh',
    name: 'openssh-server',
    currentVer: '8.9p1',
    latestVer: '9.6p1',
    cve: 'CVE-2024-6387',
    score: '8.1',
    severity: 'HIGH',
    title: 'OpenSSH Server RegreSSHion Remote Code Execution',
    description: 'Signal handler race condition in sshd allows unauthenticated remote code execution as root on glibc-based Linux systems.',
    cmd: 'sudo apt-get update && sudo apt-get --only-upgrade install -y openssh-server && sudo systemctl restart ssh',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard'>('landing');
  const [selectedVuln, setSelectedVuln] = useState<VulnerabilityItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [patchSuccess, setPatchSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPatch = () => {
    setIsPatching(true);
    setTimeout(() => {
      setIsPatching(false);
      setPatchSuccess(true);
      setTimeout(() => {
        setPatchSuccess(false);
        setSelectedVuln(null);
      }, 1500);
    }, 1500);
  };

  const handleTriggerScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen antialiased text-slate-900 bg-[#F8FAFC]">
      {/* Top App Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* 3D Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('landing')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 animate-3d-float">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-extrabold text-slate-900 tracking-tight">
                PatchScan
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                3D OS
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-4 py-1.5 rounded-xl transition ${
                activeTab === 'landing'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Landing Page
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Security Dashboard</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Start 3D Scan</span>
              <Play className="w-3 h-3 fill-current" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PAGE 1: 3D ANIMATED LANDING PAGE */}
      {/* ========================================================================= */}
      {activeTab === 'landing' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-24">
          {/* Hero Section with 3D Float Elements */}
          <div className="relative text-center max-w-4xl mx-auto space-y-6 pt-4">
            {/* Floating 3D Badge 1 (Left) */}
            <div className="hidden lg:flex absolute -left-20 top-10 card-3d p-3.5 items-center gap-3 animate-3d-float shadow-xl">
              <div className="w-11 h-11 icon-box-3d">
                <span className="text-xl">🛡️</span>
              </div>
              <div className="text-left font-mono text-xs">
                <div className="font-bold text-slate-900">Zero-Day Guard</div>
                <div className="text-emerald-600 font-semibold text-[11px]">100% Protected</div>
              </div>
            </div>

            {/* Floating 3D Badge 2 (Right) */}
            <div className="hidden lg:flex absolute -right-20 top-20 card-3d p-3.5 items-center gap-3 animate-3d-float-alt shadow-xl">
              <div className="w-11 h-11 icon-box-3d">
                <span className="text-xl">⚡</span>
              </div>
              <div className="text-left font-mono text-xs">
                <div className="font-bold text-slate-900">Auto-Patch Engine</div>
                <div className="text-blue-600 font-semibold text-[11px]">&lt;60s Deployment</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Next-Gen 3D Vulnerability & Patch Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Find every missing patch <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">
                before attackers do.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Continuous vulnerability scanning for your Linux servers, Windows devices, and software stacks. Detect outdated packages, map CVE risks, and generate 1-click remediation commands.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center gap-2"
              >
                <span>Start Free Vulnerability Audit</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm transition flex items-center gap-2"
              >
                <span>Explore Live 3D Dashboard</span>
              </button>
            </div>

            {/* Interactive 3D Scan Preview Card */}
            <div className="pt-8 max-w-3xl mx-auto card-3d-container">
              <div className="card-3d sheen-card p-6 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="ml-2 text-xs font-mono text-slate-500">
                      Target Fleet: 42 Node Production Mesh (Ubuntu / Windows)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SCAN ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-800 flex items-center gap-1.5">
                        <span className="text-base">🔓</span> OpenSSL (libssl3)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-900 text-[10px] font-bold">
                        CRITICAL 9.8
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] pt-1">
                      Current: <span className="text-red-600 font-bold">3.0.2</span> → Latest:{' '}
                      <span className="text-emerald-700 font-bold">3.0.13</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      CVE-2024-3094 (Remote Code Execution)
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="text-base">⚙️</span> Linux Kernel
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                        HIGH 7.8
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] pt-1">
                      Current: <span className="text-amber-700 font-bold">5.15.0-88</span> → Latest:{' '}
                      <span className="text-emerald-700 font-bold">5.15.0-105</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      CVE-2024-1086 (Privilege Escalation)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Isometric Feature Cards (4 Features with 3D Icons) */}
          <div className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                3D Automated Security Suite
              </h2>
              <p className="text-slate-600 text-sm max-w-xl mx-auto">
                Four core layers protecting your cloud workloads from active zero-days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 card-3d-container">
              {/* Feature 1: 3D Shield */}
              <div className="card-3d p-6 space-y-4">
                <div className="w-14 h-14 icon-box-3d animate-3d-float">
                  <span className="text-3xl">🛡️</span>
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">Server & Fleet Audits</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Automated deep package scanning for Ubuntu, Debian, RHEL, Alpine, and Windows Server clusters.
                </p>
              </div>

              {/* Feature 2: 3D Radar */}
              <div className="card-3d p-6 space-y-4">
                <div className="w-14 h-14 icon-box-3d animate-3d-float-alt">
                  <span className="text-3xl">📡</span>
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">Real-Time Zero-Day Radar</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Continuous threat feed mapping against NIST NVD, GitHub Advisory, and vendor vulnerability feeds.
                </p>
              </div>

              {/* Feature 3: 3D Wrench / Code Patch */}
              <div className="card-3d p-6 space-y-4">
                <div className="w-14 h-14 icon-box-3d animate-3d-float">
                  <span className="text-3xl">🔧</span>
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">1-Click Auto-Patching</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Instant validated bash/powershell upgrade commands with rollback safety guards.
                </p>
              </div>

              {/* Feature 4: 3D Cloud Cluster */}
              <div className="card-3d p-6 space-y-4">
                <div className="w-14 h-14 icon-box-3d animate-3d-float-alt">
                  <span className="text-3xl">☁️</span>
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">SOC2 & ISO Compliance</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Instant auditor-ready compliance reports and 30-day security improvement trajectories.
                </p>
              </div>
            </div>
          </div>

          {/* 3-Step "How It Works" */}
          <div className="space-y-12 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                How It Works in 3 Steps
              </h2>
              <p className="text-slate-600 text-sm max-w-xl mx-auto">
                From initial connection to verified patch deployment in under 60 seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left card-3d-container">
              <div className="card-3d p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-blue-500/30">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900">Connect Your Fleet</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Deploy via 1-line agent or agentless SSH & cloud IAM credentials.
                </p>
              </div>

              <div className="card-3d p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-blue-500/30">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900">Continuous 3D Audit</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Map installed software against live CVE databases automatically.
                </p>
              </div>

              <div className="card-3d p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-blue-500/30">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900">1-Click Remediation</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Apply verified patch updates directly across your entire server mesh.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-8 pb-12 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <div>© 2026 PatchScan Inc. Enterprise Vulnerability & Patch Management.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-blue-600">Security</a>
              <a href="#" className="hover:text-blue-600">Privacy</a>
              <a href="#" className="hover:text-blue-600">API Docs</a>
            </div>
          </footer>
        </section>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: 3D ANIMATED ENTERPRISE DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* Dashboard Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 card-3d p-5">
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">
                Executive Patch Management Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time status across 42 connected Linux servers, cloud nodes, and Windows endpoints
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700 font-medium">
                  {isScanning ? 'Scanning...' : 'Radar: Active'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Fleet: 42 Online</span>
              </div>
              <button
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning 42 Nodes...' : 'Trigger 3D Fleet Scan'}</span>
              </button>
            </div>
          </div>

          {/* Top Metric Row: 3D Gyro Score Ring + Severity Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 3D Animated Security Score Donut (4 cols) */}
            <div className="lg:col-span-4 card-3d p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500 mb-2">
                Overall Security Score
              </div>

              {/* 3D Gyro Donut Ring */}
              <div className="relative w-48 h-48 flex items-center justify-center my-2">
                {/* Background Orbit Ring */}
                <div className="absolute inset-2 rounded-full border border-blue-200/60 animate-3d-spin border-dashed" />

                <svg
                  className="w-full h-full transform -rotate-90 relative z-10"
                  viewBox="0 0 100 100"
                >
                  <circle cx="50" cy="50" r="38" stroke="#E2E8F0" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="url(#blueGradient3d)"
                    strokeWidth="8"
                    strokeDasharray="238.7"
                    strokeDashoffset="38"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="blueGradient3d" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <span className="text-4xl font-heading font-extrabold text-slate-900">
                    84<span className="text-lg text-slate-400 font-normal">/100</span>
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1 shadow-sm">
                    Grade A
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Fleet compliance is optimal. 2 critical patches needed for full Grade A+.
              </p>
            </div>

            {/* Severity Count Badges & 30-Day Timeline Chart (8 cols) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Critical */}
              <div className="card-3d p-4 border-l-4 border-l-red-500 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-700 font-bold font-mono flex items-center gap-1">
                    <span className="text-sm">🔴</span> Critical
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-red-100 text-red-800 text-[10px] font-bold font-mono">
                    2
                  </span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-slate-900">2</div>
                <div className="text-[11px] text-slate-500">Immediate action</div>
              </div>

              {/* High */}
              <div className="card-3d p-4 border-l-4 border-l-amber-500 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-bold font-mono flex items-center gap-1">
                    <span className="text-sm">🟠</span> High
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold font-mono">
                    6
                  </span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-slate-900">6</div>
                <div className="text-[11px] text-slate-500">Privilege escalation</div>
              </div>

              {/* Medium */}
              <div className="card-3d p-4 border-l-4 border-l-yellow-500 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-yellow-800 font-bold font-mono flex items-center gap-1">
                    <span className="text-sm">🟡</span> Medium
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-yellow-100 text-yellow-900 text-[10px] font-bold font-mono">
                    8
                  </span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-slate-900">8</div>
                <div className="text-[11px] text-slate-500">Low-exploit surface</div>
              </div>

              {/* Patched */}
              <div className="card-3d p-4 border-l-4 border-l-emerald-500 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold font-mono flex items-center gap-1">
                    <span className="text-sm">🟢</span> Patched
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                    142
                  </span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-emerald-700">142</div>
                <div className="text-[11px] text-slate-500">Up to date</div>
              </div>

              {/* 30-Day Compliance Chart */}
              <div className="col-span-2 sm:col-span-4 card-3d p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-heading font-bold text-slate-900">
                    30-Day Patch Compliance Trajectory
                  </div>
                  <div className="text-xs font-mono text-blue-600 font-bold">
                    +18% improvement this month
                  </div>
                </div>

                {/* Clean Area Chart SVG */}
                <div className="h-28 w-full">
                  <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient3d" x1="0%" y1="0%" x2="0%" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,85 Q80,75 160,50 T320,38 T440,20 T500,10 L500,100 L0,100 Z"
                      fill="url(#chartGradient3d)"
                    />
                    <path
                      d="M0,85 Q80,75 160,50 T320,38 T440,20 T500,10"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Day 1 (66%)</span>
                  <span>Day 10 (72%)</span>
                  <span>Day 20 (78%)</span>
                  <span>Day 30 (84% Current)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Split: Outdated Software Table & Fleet Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Outdated Software Table (8 cols) */}
            <div className="lg:col-span-8 card-3d p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                  <span>Outdated Software & CVE Vulnerabilities</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-mono font-bold">
                    16 Fixes Available
                  </span>
                </h3>
                <span className="text-xs font-mono text-slate-500">Sorted by Severity</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                      <th className="pb-2.5 font-bold">Package Name</th>
                      <th className="pb-2.5 font-bold">Current → Latest</th>
                      <th className="pb-2.5 font-bold">CVE ID & Score</th>
                      <th className="pb-2.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {VULNERABILITIES.map((vuln) => (
                      <tr key={vuln.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-base">
                            {vuln.severity === 'CRITICAL'
                              ? '🔓'
                              : vuln.severity === 'HIGH'
                              ? '⚙️'
                              : '🌐'}
                          </span>
                          <span>{vuln.name}</span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`font-bold ${
                              vuln.severity === 'CRITICAL'
                                ? 'text-red-600'
                                : vuln.severity === 'HIGH'
                                ? 'text-amber-700'
                                : 'text-yellow-700'
                            }`}
                          >
                            {vuln.currentVer}
                          </span>{' '}
                          →{' '}
                          <span className="text-emerald-700 font-bold">{vuln.latestVer}</span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold border ${
                              vuln.severity === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : vuln.severity === 'HIGH'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                            }`}
                          >
                            {vuln.cve} ({vuln.score})
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => setSelectedVuln(vuln)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition font-sans font-bold text-xs"
                          >
                            Patch Now →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Connected Device Fleet (4 cols) */}
            <div className="lg:col-span-4 card-3d p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold text-slate-900">
                  Connected Fleet Nodes
                </h3>
                <span className="text-xs font-mono text-emerald-700 font-bold">42 Online</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🐧</span>
                    <div>
                      <div className="font-bold text-slate-900">prod-api-cluster-01</div>
                      <div className="text-[10px] text-slate-500">Ubuntu 22.04 LTS (10.0.1.14)</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                    2 Crit
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🪟</span>
                    <div>
                      <div className="font-bold text-slate-900">win-ad-controller-01</div>
                      <div className="text-[10px] text-slate-500">Windows Server 2022</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                    1 High
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📦</span>
                    <div>
                      <div className="font-bold text-slate-900">docker-worker-node-04</div>
                      <div className="text-[10px] text-slate-500">Debian 12 Bookworm</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Clean
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 3D VULNERABILITY DETAIL & REMEDIATION */}
      {/* ========================================================================= */}
      {selectedVuln && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-3d max-w-2xl w-full p-6 space-y-5 border border-slate-300 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${
                      selectedVuln.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : selectedVuln.severity === 'HIGH'
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-yellow-100 text-yellow-900 border-yellow-200'
                    }`}
                  >
                    CVSS {selectedVuln.score} {selectedVuln.severity}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{selectedVuln.cve}</span>
                </div>
                <h3 className="text-xl font-heading font-bold text-slate-900">
                  {selectedVuln.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVuln(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Affected Package:</span>
                <div className="font-bold text-slate-900 mt-0.5">{selectedVuln.name}</div>
              </div>
              <div>
                <span className="text-slate-500">Current → Patched Version:</span>
                <div className="font-bold text-red-600 mt-0.5">
                  {selectedVuln.currentVer} → {selectedVuln.latestVer}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Vulnerability Description
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {selectedVuln.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Remediation Bash Command
                </h4>
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  ✓ Verified by PatchScan
                </span>
              </div>
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-slate-900 font-mono text-xs text-cyan-300 border border-slate-800 overflow-x-auto">
                  {selectedVuln.cmd}
                </pre>
                <button
                  onClick={() => handleCopy(selectedVuln.cmd)}
                  className="absolute top-2.5 right-2.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition flex items-center gap-1 font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedVuln(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
              <button
                onClick={handleApplyPatch}
                disabled={isPatching || patchSuccess}
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 ${
                  patchSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {isPatching ? (
                  <span>Applying Patch to Fleet...</span>
                ) : patchSuccess ? (
                  <span>✓ Patch Applied Successfully</span>
                ) : (
                  <span>🚀 Apply Patch to Fleet</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
