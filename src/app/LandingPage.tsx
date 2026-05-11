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

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-slate-100 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Charted Logo" width={28} height={28} className="rounded-md" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">Charted</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition">Features</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition">Pricing</a>
            <button
              onClick={() => { setIsSignUp(false); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 text-slate-700 hover:text-slate-900 font-medium transition"
            >
              Login
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition"
            >
              Sign Up
            </button>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => { setIsSignUp(false); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 text-slate-700 hover:text-slate-900 font-medium transition"
            >
              Login
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); setShowAuth(true); }}
              className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-12 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-3">
            Charting done right.
            <span className="block text-slate-500">Less typing. More caring.</span>
          </h1>
          <p className="text-base text-slate-600 mb-6">
            Log nursing actions in seconds. Room-based, HIPAA-safe, no PHI stored.
          </p>
          <div className="flex gap-3 justify-center mb-10">
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition"
            >
              Get Started
            </button>
            <a
              href="#features"
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Learn more →
            </a>
          </div>

          {/* App Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-slate-900 text-white text-xs font-medium rounded">Room 101</span>
                <span className="text-xs text-slate-500">Day Shift · 08:15 AM</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded border border-amber-200 bg-amber-50">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">F</span>
                  <p className="text-sm text-slate-700">IV site assessment — patient reported discomfort</p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded border border-blue-200 bg-blue-50">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">D</span>
                  <p className="text-sm text-slate-700">Site slightly red, no swelling. Vitals stable.</p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded border border-green-200 bg-green-50">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">A</span>
                  <p className="text-sm text-slate-700">Changed dressing, documented site status.</p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded border border-purple-200 bg-purple-50">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">R</span>
                  <p className="text-sm text-slate-700">Patient comfortable, site improving.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-10 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            Built for real nurses
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Quick Entry", desc: "Type naturally: \"Room 101, IV inserted\". Auto-parsed and timestamped." },
              { title: "Voice Charting", desc: "Speak your entries. 5 free voice entries/day, more with paid plans." },
              { title: "HIPAA-Safe", desc: "No patient names. Room numbers and actions only." },
              { title: "Shift Summaries", desc: "One-click end-of-shift recap. Clear handover notes." },
              { title: "Timeline View", desc: "See all actions by room. Scroll through the shift." },
              { title: "Mobile-First", desc: "Works on any device. Chart from your phone at bedside." },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-lg border border-slate-200 bg-white">
                <h3 className="font-medium text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-10 px-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            Three steps. That&apos;s it.
          </h2>
          <div className="space-y-4">
            {[
              { num: 1, title: "Type or speak", desc: "\"Room 101, IV inserted on left arm\" — natural language, no forms." },
              { num: 2, title: "Auto-captured", desc: "Room extracted, action categorized, time logged. Done in seconds." },
              { num: 3, title: "End of shift", desc: "Timeline by room. Clear summary. Handover with confidence." },
            ].map((step) => (
              <div key={step.num} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-medium shrink-0">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">{step.title}</h3>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-10 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            Simple pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <h3 className="font-medium text-slate-800">Free</h3>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-slate-900">₱0</span>
                <span className="text-slate-500 text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-slate-600">
                <li>5 voice entries/day</li>
                <li>Unlimited text entries</li>
                <li>Shift summaries</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Get Started
              </button>
            </div>

            {/* Basic */}
            <div className="p-4 rounded-lg border-2 border-slate-900 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-slate-800">Basic</h3>
                <span className="px-1.5 py-0.5 bg-slate-900 text-white text-xs rounded">Popular</span>
              </div>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-slate-900">₱59</span>
                <span className="text-slate-500 text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-slate-600">
                <li>15 voice entries/day</li>
                <li>Unlimited text entries</li>
                <li>Export reports</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition"
              >
                Start Trial
              </button>
            </div>

            {/* Pro */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <h3 className="font-medium text-slate-800">Pro</h3>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-slate-900">₱120</span>
                <span className="text-slate-500 text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-sm text-slate-600">
                <li>Unlimited voice</li>
                <li>Unlimited text</li>
                <li>Priority support</li>
              </ul>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Start Trial
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-6">
            All plans HIPAA-safe. No patient data stored.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-slate-500">© 2026 Charted</p>
          <p className="text-xs text-slate-400">Room numbers only. No PHI.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {isSignUp ? "Create account" : "Sign in"}
              </h2>
              <button
                onClick={() => { setShowAuth(false); setError(""); }}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required={isSignUp}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nurse@hospital.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-sm text-slate-500 hover:text-slate-900 transition"
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