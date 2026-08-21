'use client';

import React, { useState } from 'react';
import { AlertTriangle, Bug, ShoppingCart, Send, Layers, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DemoPlayground() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Intentional Bug #1: Unhandled Runtime Crash on Form Submit if email doesn't have @
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Demo App] Form submission initiated for:", formData.email);
    
    // Intentionally accessing undefined object property to trigger real Javascript console crash
    if (!formData.email.includes('@')) {
      console.error("[CRITICAL ERROR] Validation engine failure at /app/demo/page.tsx:21");
      const uninitializedEngine: any = undefined;
      // This will throw: TypeError: Cannot read properties of undefined (reading 'validateAsync')
      uninitializedEngine.validateAsync(formData);
    }

    setFormSubmitted(true);
  };

  // Intentional Bug #2: Broken Endpoint Fetch (404/500 API trigger)
  const handleBrokenCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      console.warn("[Demo App] Initiating checkout with payment gateway...");
      const res = await fetch('/api/non-existent-payment-gateway', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: Failed to reach checkout gateway endpoint.`);
      }
    } catch (err: any) {
      console.error("[API ERROR]", err.message);
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Banner with intentional mobile overflow bug */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">SaaSify Demo App</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Target Playground
            </span>
          </div>

          <nav className="flex items-center space-x-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
            {/* Intentional Bug #3: Dead Button that does nothing but has invalid click handler */}
            <button 
              id="dead-login-btn"
              onClick={() => console.error("[AUTH ERROR] Auth0 client not configured in window.AuthSDK")}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 text-xs font-medium"
            >
              Sign In (Broken)
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs text-indigo-400">
            <Bug className="w-3.5 h-3.5" />
            <span>Target Sandbox for WebHealer AI Testing</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
            Acme Cloud Analytics Pro
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            This demo application has 3 real bugs intentionally planted. Run WebHealer AI against this URL to watch the agent automatically discover and fix them!
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="features">
          {/* Card 1: Interactive Checkout with Network Failure */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                Feature 1: Quick Purchase
              </h3>
              <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Bug: 404 API Failure
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Clicking checkout calls a deprecated API route that fails with 404.
            </p>
            <button
              id="checkout-btn"
              onClick={handleBrokenCheckout}
              disabled={checkoutLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              {checkoutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Upgrade to Enterprise ($49/mo)
            </button>
            {checkoutError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}
          </div>

          {/* Card 2: Contact Form with JS Runtime Exception */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4" id="contact">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Feature 2: Contact Sales
              </h3>
              <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Bug: JS Crash on Invalid Email
              </span>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <input
                  id="contact-email"
                  type="text"
                  placeholder="name (omit @ to trigger JS crash)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                id="submit-contact-btn"
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
            {formSubmitted && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Message sent successfully!
              </div>
            )}
          </div>
        </div>

        {/* Instructions footer for testers */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 text-center">
          💡 You can test this live by typing <code className="text-indigo-400">http://localhost:3000/demo</code> into the WebHealer AI URL scanner on the home page.
        </div>
      </main>
    </div>
  );
}
