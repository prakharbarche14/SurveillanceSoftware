import React, { useState } from 'react';
import { ArrowRight, Check, ShieldCheck, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { ASSET_PATHS } from '../lib/seedData';
import type { Institute } from '../types/erp';

export function LandingPage({
  institutes,
  onNavigateAuth,
  onQuickDemoLogin,
  onNotify,
}: {
  institutes: Institute[];
  onNavigateAuth: (mode: 'login' | 'register', instituteId?: string) => void;
  onQuickDemoLogin: (email: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [contactForm, setContactForm] = useState({
    name: '',
    instituteName: '',
    phone: '',
    email: '',
    message: '',
  });
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.email.includes('@')) {
      onNotify('error', 'Please provide a valid name, mobile number, and email address.');
      return;
    }
    setContactSent(true);
    onNotify('success', 'Inquiry recorded. Our onboarding specialist will reach out within 1 business day.');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: [Brand title] — [4 nav links] — [1 primary CTA] */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            EduTrack
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#institutes" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Institutes
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#contact" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Contact
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="rounded-lg bg-[#0F2A56] px-4 py-2 text-sm font-medium text-white hover:bg-[#173a75] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split Section */}
        <section className="mx-auto max-w-7xl px-6 pt-12 pb-10 lg:pt-16 lg:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-blue-700 tracking-wide">
                Multi-Tenant Coaching ERP for Indian Academies
              </p>
              <h1
                className="mt-3 font-display font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Run attendance, exams, fees, and parent alerts from one branded workspace.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-600 max-w-xl">
                Built for IIT-JEE, NEET, Foundation, and UPSC coaching centers across India. Every institute receives isolated data storage, custom branding on receipts and report cards, and role-based portals for owners, teachers, parents, and students.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigateAuth('register')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2A56] px-6 py-3 text-sm font-semibold text-white hover:bg-[#173a75] transition-colors whitespace-nowrap"
                >
                  Register Your Institute
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('owner@apexscholars.in')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Explore Live Owner Demo
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>8 Role Portals</span>
                <span aria-hidden="true">·</span>
                <span>Strict Tenant Isolation</span>
                <span aria-hidden="true">·</span>
                <span>Branded PDF Receipts & Report Cards</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={ASSET_PATHS.heroCampus}
                  alt="Modern Indian coaching institute lecture studio and scholars hub"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column metric strip below hero split */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-slate-200 py-6">
            <div>
              <p className="text-xs text-slate-500">Attendance Policy Engine</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">75% Alert</p>
              <p className="mt-0.5 text-xs text-slate-500">Configurable working days & holidays</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tenant Architecture</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">100% Isolated</p>
              <p className="mt-0.5 text-xs text-slate-500">Institute-scoped RLS & API guards</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Examination Workflow</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">Auto Ranks</p>
              <p className="mt-0.5 text-xs text-slate-500">Draft protection & PDF report cards</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fee & Payroll Desk</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">1-Click PDF</p>
              <p className="mt-0.5 text-xs text-slate-500">Receipts, salary slips & CSV ledgers</p>
            </div>
          </div>
        </section>

        {/* Core Capabilities Bento */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-14">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Complete operational control for multi-batch institutes
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Every module shares a single source of truth so attendance, marks, fees, and parent notifications stay synchronized without spreadsheet rework.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="text-sm font-semibold text-slate-900">01. Policy-Aware Student Attendance & Parent Outbox</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Mark Present, Absent, Late, or Leave per batch in seconds. Exclude Sundays and institute holidays automatically, prevent duplicate daily entries, flag students below your 75% threshold, and queue deduplicated parent alerts in the notification outbox.
              </p>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-xs text-slate-600">
                <div>
                  <span className="block font-semibold text-slate-900">Duplicate Guard</span>
                  1 record per student/day
                </div>
                <div>
                  <span className="block font-semibold text-slate-900">Leave Rules</span>
                  Exclude or count per policy
                </div>
                <div>
                  <span className="block font-semibold text-slate-900">WhatsApp & SMS Prep</span>
                  Cloud API & DLT templates
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-900">02. Exams, Ranks & Report Cards</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Enter marks with strict validation, separate exam absentees from zero scores, compute batch rank and improvement delta vs previous tests, and keep drafts hidden until published.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-900">03. Fees, Receipts & Staff Payroll</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Record Cash, UPI, and Bank Transfer payments with discounts and late fees. Generate branded fee receipts and monthly employee salary slips restricted to Owners and Accountants.
              </p>
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="text-sm font-semibold text-slate-900">04. Isolated Multi-Child Parent & Student Portals</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                One parent login cleanly switches between multiple enrolled siblings to inspect attendance %, published test charts, homework deadlines, fee status, and submit leave requests.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('mahesh.sharma@gmail.com')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                >
                  Try Multi-Child Parent Portal
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('aarav.sharma@student.apexscholars.in')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                >
                  Try Student Portal
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Proof & Live Tenant Showcase */}
        <section id="institutes" className="border-t border-b border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={ASSET_PATHS.directorPortrait}
                      alt="Rajeshwar Kulkarni, Founder of Apex Scholars Academy"
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">Rajeshwar Kulkarni</p>
                      <p className="text-xs text-slate-500">Founder & Director · Apex Scholars Academy, Kota</p>
                    </div>
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-slate-700">
                    “Before EduTrack, our front desk reconciled registers across four batches manually every evening. Now our teachers mark attendance on mobile in two minutes, low-attendance students are flagged automatically, and parents receive branded report cards the moment results are published.”
                  </blockquote>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span>Result publishing cycle: -85% time</span>
                    <span>Fee reconciliation: Same-day</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  Test live multi-institute tenant isolation
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Switch directly into either pre-configured coaching institute below or register your own institute to verify complete logo, color, student, and financial data separation.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {institutes.slice(0, 2).map((inst) => (
                    <div key={inst.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <img
                            src={inst.logoUrl}
                            alt={inst.name}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{inst.name}</p>
                            <p className="text-xs text-slate-500 truncate">{inst.instituteCode}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2">{inst.tagline}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateAuth('login', inst.id)}
                        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                        Open Branded Login
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section id="pricing" className="mx-auto max-w-7xl px-6 py-14">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Transparent SaaS plans for coaching institutes
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Start with a 14-day free trial. Upgrade capacity as your batches grow.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Basic',
                audience: 'For single-center tuition academies',
                price: '₹1,499',
                cadence: '/ month',
                limits: 'Up to 150 students · 10 staff accounts',
                features: [
                  'Student & parent directory',
                  'Daily attendance & 75% threshold alerts',
                  'Test marks entry & report cards',
                  'Manual fee ledger & PDF receipts',
                ],
              },
              {
                name: 'Standard',
                audience: 'For growing multi-batch institutes',
                price: '₹2,999',
                cadence: '/ month',
                limits: 'Up to 500 students · 35 staff accounts',
                highlighted: true,
                features: [
                  'Everything in Basic + custom logo & colors',
                  'Multi-child Parent & Student Portals',
                  'Timetable & Homework submissions',
                  'Staff attendance, leaves & payroll slips',
                ],
              },
              {
                name: 'Premium',
                audience: 'For multi-branch JEE/NEET academies',
                price: '₹5,499',
                cadence: '/ month',
                limits: 'Up to 2,000 students · 100 staff accounts',
                features: [
                  'Everything in Standard + priority onboarding',
                  'WhatsApp Business Cloud API & DLT SMS hooks',
                  'Advanced batch performance analytics',
                  'Dedicated PostgreSQL RLS backup export',
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col justify-between ${
                  plan.highlighted
                    ? 'border-[#0F2A56] bg-slate-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold text-slate-900">{plan.name}</h3>
                    <span className="text-xs font-medium text-slate-500">{plan.audience}</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-slate-900 tabular-nums">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.cadence}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-blue-800">{plan.limits}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-slate-200 pt-4 text-sm text-slate-700">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateAuth('register')}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-[#0F2A56] text-white hover:bg-[#173a75]'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Start 14-Day Trial
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Demo Inquiry */}
        <section id="contact" className="border-t border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Talk to our institute onboarding desk
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Need data migration from Excel registers or WhatsApp Cloud API DLT template approval guidance? Leave your details below.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>+91 80 4120 9800 (Mon–Sat, 9:30 AM – 7:00 PM IST)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>onboarding@edutrack-erp.in</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>HSR Layout Sector 2, Bengaluru, Karnataka 560102</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                {contactSent ? (
                  <div className="py-6 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-emerald-600" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">Inquiry Received</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Thank you, {contactForm.name}. We will contact {contactForm.phone} shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSent(false);
                        setContactForm({ name: '', instituteName: '', phone: '', email: '', message: '' });
                      }}
                      className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. Rajeshwar Kulkarni"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Institute Name *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.instituteName}
                        onChange={(e) => setContactForm({ ...contactForm, instituteName: e.target.value })}
                        placeholder="e.g. Sankalp Science Academy"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Mobile / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="+91 98290 XXXXX"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="director@institute.in"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700">Requirements</label>
                      <textarea
                        rows={3}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Student count, batches, or custom branding needs..."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-lg bg-[#0F2A56] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173a75]"
                      >
                        Request Onboarding Callback
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-6 text-xs text-slate-500">
          <span>EduTrack Coaching Institute Management ERP · Multi-Tenant SaaS</span>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => onNavigateAuth('login')} className="hover:text-slate-900">
              Portal Login
            </button>
            <button type="button" onClick={() => onNavigateAuth('register')} className="hover:text-slate-900">
              Register Institute
            </button>
            <a href="#pricing" className="hover:text-slate-900">
              Plans
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
