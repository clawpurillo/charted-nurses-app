"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Image from "next/image";

export default function LandingPage() {
  const { signIn } = useAuthActions();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signIn("password", { email, password, name, flow: "signUp" });
      } else {
        await signIn("password", { email, password, flow: "signIn" });
      }
      // Redirect to /rooms after successful authentication
      window.location.href = "/rooms";
    } catch (err: unknown) {
      const msg = (err as Error).message || "Something went wrong";
      if (msg.includes("InvalidSecret") || msg.includes("InvalidAccountId") || msg.includes("AccountNotFound")) {
        setError("Invalid email or password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Quick Entry",
      desc: 'Type naturally: "Room 101, IV inserted". Auto-parsed and timestamped.',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 8h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8" />
          <path d="M3 8h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3" />
          <path d="M7 4h2v4H7z" />
          <path d="M7 14v6" />
        </svg>
      ),
    },
    {
      title: "Voice Charting",
      desc: "Speak your entries. 5 free voice entries/day, more with paid plans.",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v3" />
        </svg>
      ),
    },
    {
      title: "HIPAA-Safe",
      desc: "No patient names. Room numbers and actions only.",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      ),
    },
    {
      title: "Shift Summaries",
      desc: "One-click end-of-shift recap. Clear handover notes.",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M9 14h6" />
          <path d="M9 18h6" />
        </svg>
      ),
    },
    {
      title: "Timeline View",
      desc: "See all actions by room. Scroll through the shift.",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      title: "Mobile-First",
      desc: "Works on any device. Chart from your phone at bedside.",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-background/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Charted Logo" width={28} height={28} className="rounded-md" />
            <span className="text-lg font-bold text-text-primary tracking-tight">Charted</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition">Features</a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition">Pricing</a>
            <button
              onClick={() => { setIsSignUp(false); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 text-text-secondary hover:text-text-primary font-medium transition min-h-[48px]"
            >
              Login
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 bg-brand text-white rounded-md font-medium hover:bg-brand/90 transition min-h-[48px]"
            >
              Sign Up
            </button>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => { setIsSignUp(false); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 text-text-secondary hover:text-text-primary font-medium transition min-h-[48px]"
            >
              Login
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 bg-brand text-white rounded-md font-medium hover:bg-brand/90 transition min-h-[48px]"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero - Gradient background */}
      <section className="pt-20 pb-12 px-6 bg-gradient-to-b from-brand to-sky-600 dark:from-brand/80 dark:to-sky-700 animate-in fade-in duration-700">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight leading-snug mb-3">
            Charting done right.
            <span className="block text-white/80">Less typing. More caring.</span>
          </h1>
          <p className="text-base text-white/75 mb-6">
            Log nursing actions in seconds. Room-based, HIPAA-safe, no PHI stored.
          </p>
          <div className="flex gap-3 justify-center mb-10">
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2.5 bg-white text-brand rounded-md font-semibold hover:bg-white/90 hover:shadow-lg transition min-h-[48px]"
            >
              Get Started
            </button>
            <a
              href="#features"
              className="px-5 py-2.5 text-white/90 hover:text-white border border-white/40 rounded-md font-medium transition min-h-[48px]"
            >
              Learn more &rarr;
            </a>
          </div>

          {/* Device mockup showcase */}
          <div className="relative mx-auto max-w-sm">
            <div className="bg-white dark:bg-card rounded-t-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white dark:bg-slate-700 rounded px-2 py-0.5 text-xs text-text-muted text-center">charted.app/rooms</div>
              </div>
              {/* App preview content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-brand text-white text-xs font-medium rounded">Room 101</span>
                  <span className="text-xs text-text-secondary">Day Shift &middot; 08:15 AM</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">F</span>
                    <p className="text-sm text-text-secondary">IV site assessment &mdash; patient reported discomfort</p>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">D</span>
                    <p className="text-sm text-text-secondary">Site slightly red, no swelling. Vitals stable.</p>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">A</span>
                    <p className="text-sm text-text-secondary">Changed dressing, documented site status.</p>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">R</span>
                    <p className="text-sm text-text-secondary">Patient comfortable, site improving.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 px-6 bg-surface dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-8 text-center">
            Built for real nurses
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:shadow-md hover:border-brand/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 75}ms`, animationFillMode: "both" }}
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 dark:bg-brand/20 text-brand flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-medium text-text-primary mb-1">{f.title}</h3>
                <p className="text-sm text-text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-12 px-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-8 text-center">
            Three steps. That&apos;s it.
          </h2>
          <div className="space-y-5">
            {[
              { num: 1, title: "Type or speak", desc: '"Room 101, IV inserted on left arm" \u2014 natural language, no forms.' },
              { num: 2, title: "Auto-captured", desc: "Room extracted, action categorized, time logged. Done in seconds." },
              { num: 3, title: "End of shift", desc: "Timeline by room. Clear summary. Handover with confidence." },
            ].map((step) => (
              <div key={step.num} className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${step.num * 100}ms`, animationFillMode: "both" }}>
                <div className="w-8 h-8 rounded-full bg-brand text-white text-sm flex items-center justify-center font-semibold shrink-0">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">{step.title}</h3>
                  <p className="text-sm text-text-secondary">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 px-6 bg-surface dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-8 text-center">
            Simple pricing
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Free */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              <h3 className="font-medium text-text-primary">Free</h3>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-text-primary">\u20b10</span>
                <span className="text-text-secondary text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-text-secondary">
                <li>5 voice entries/day</li>
                <li>Unlimited text entries</li>
                <li>Shift summaries</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-text-primary hover:border-brand hover:text-brand transition min-h-[48px]"
              >
                Get Started
              </button>
            </div>

            {/* Basic */}
            <div className="p-5 rounded-xl border-2 border-brand bg-white dark:bg-card shadow-lg shadow-brand/10 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-text-primary">Basic</h3>
                <span className="px-2 py-0.5 bg-brand text-white text-xs rounded-full font-medium">Popular</span>
              </div>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-text-primary">\u20b159</span>
                <span className="text-text-secondary text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-text-secondary">
                <li>15 voice entries/day</li>
                <li>Unlimited text entries</li>
                <li>Export reports</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2.5 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/30 transition min-h-[48px]"
              >
                Start Trial
              </button>
            </div>

            {/* Pro */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
              <h3 className="font-medium text-text-primary">Pro</h3>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-text-primary">\u20b1120</span>
                <span className="text-text-secondary text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-text-secondary">
                <li>Unlimited voice</li>
                <li>Unlimited text</li>
                <li>Priority support</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-text-primary hover:border-brand hover:text-brand transition min-h-[48px]"
              >
                Start Trial
              </button>
            </div>
          </div>
          <p className="text-xs text-text-muted text-center mt-6">
            All plans HIPAA-safe. No patient data stored.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-text-secondary">&copy; 2026 Charted</p>
          <p className="text-xs text-text-muted">Room numbers only. No PHI.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAuth(false); setError(""); } }}
          role="dialog"
          aria-modal="true"
          aria-label={isSignUp ? "Create account" : "Sign in"}
        >
          <div className="bg-white dark:bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {isSignUp ? "Create account" : "Sign in"}
              </h2>
              <button
                onClick={() => { setShowAuth(false); setError(""); }}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[48px] min-h-[48px]"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <label htmlFor="auth-name" className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-primary bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition min-h-[48px] placeholder:text-text-muted"
                    required={isSignUp}
                    aria-label="Name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nurse@hospital.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-primary bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition min-h-[48px] placeholder:text-text-muted"
                  required
                  aria-label="Email"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-primary bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition min-h-[48px] placeholder:text-text-muted"
                  minLength={8}
                  required
                  aria-label="Password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/30 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[48px]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Please wait...
                  </span>
                ) : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-sm text-text-secondary hover:text-text-primary transition min-h-[48px] px-3 py-1"
              >
                {isSignUp ? "Already have an account?" : "Create an account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
