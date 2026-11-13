import React, { useState } from 'react';
import { ArrowLeft, Building2, KeyRound, Lock, UserPlus } from 'lucide-react';
import type { ERPDatabase, Institute, UserAccount } from '../types/erp';
import { ROLE_LABELS } from '../lib/erpStore';
import { BrandLogo } from '../components/ui/Feedback';

export function AuthPage({
  db,
  initialMode,
  initialInstituteId,
  onBackHome,
  onLoginSuccess,
  onRegisterInstitute,
  onNotify,
}: {
  db: ERPDatabase;
  initialMode: 'login' | 'register';
  initialInstituteId?: string;
  onBackHome: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterInstitute: (payload: {
    ownerName: string;
    instituteName: string;
    mobile: string;
    email: string;
    password: string;
    address: string;
  }) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>(
    initialInstituteId || db.institutes[0]?.id || ''
  );
  const [email, setEmail] = useState('owner@apexscholars.in');
  const [password, setPassword] = useState('demo');

  const [reg, setReg] = useState({
    ownerName: '',
    instituteName: '',
    mobile: '',
    email: '',
    password: '',
    address: '',
  });

  const activeBrandInstitute: Institute | undefined = db.institutes.find(
    (i) => i.id === selectedInstituteId
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
    );
    if (!user) {
      onNotify('error', 'Invalid email or password. Use any demo account listed on the right.');
      return;
    }
    if (!user.isActive) {
      onNotify('error', 'This account is deactivated. Contact your institute administrator.');
      return;
    }
    onLoginSuccess(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reg.ownerName.trim() ||
      !reg.instituteName.trim() ||
      reg.mobile.replace(/\D/g, '').length < 10 ||
      !reg.email.includes('@') ||
      reg.password.length < 4 ||
      !reg.address.trim()
    ) {
      onNotify('error', 'Please complete all registration fields (10-digit mobile & min 4-char password).');
      return;
    }
    const exists = db.users.some((u) => u.email.toLowerCase() === reg.email.trim().toLowerCase());
    if (exists) {
      onNotify('error', 'An account with this email already exists.');
      return;
    }
    onRegisterInstitute(reg);
  };

  const demoAccounts = db.users.slice(0, 9);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to EduTrack Home
        </button>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Portal Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register Institute
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Auth Card */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {mode === 'login' ? (
            <>
              {/* Custom Institute Login Branding */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <BrandLogo
                    src={activeBrandInstitute?.logoUrl}
                    alt={activeBrandInstitute?.name || 'EduTrack Portal'}
                    primaryColor={activeBrandInstitute?.primaryColor}
                    sizeClass="h-12 w-12"
                  />
                  <div>
                    <h1 className="font-display text-xl font-bold text-slate-900">
                      {activeBrandInstitute?.name || 'EduTrack SaaS Portal'}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {activeBrandInstitute?.tagline || 'Multi-Institute Secure Login'}
                    </p>
                  </div>
                </div>
                <div className="sm:w-52">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Preview Institute Branding
                  </label>
                  <select
                    value={selectedInstituteId}
                    onChange={(e) => setSelectedInstituteId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    {db.institutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.instituteCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institute.in"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (demo)"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: activeBrandInstitute?.primaryColor || '#0F2A56' }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity"
                >
                  <Lock className="h-4 w-4" />
                  Sign In to Dashboard
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Want to launch your own coaching institute?</span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Register Institute Free
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="pb-5 border-b border-slate-200 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2A56] text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-900">
                    Register Your Coaching Institute
                  </h1>
                  <p className="text-xs text-slate-500">
                    Creates an isolated tenant workspace with 14-day Standard trial
                  </p>
                </div>
              </div>

              <form onSubmit={handleRegister} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Owner / Director Name *</label>
                  <input
                    type="text"
                    required
                    value={reg.ownerName}
                    onChange={(e) => setReg({ ...reg, ownerName: e.target.value })}
                    placeholder="e.g. Sandeep Deshmukh"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Coaching Institute Name *</label>
                  <input
                    type="text"
                    required
                    value={reg.instituteName}
                    onChange={(e) => setReg({ ...reg, instituteName: e.target.value })}
                    placeholder="e.g. Vidya Mandir IIT Academy"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={reg.mobile}
                    onChange={(e) => setReg({ ...reg, mobile: e.target.value })}
                    placeholder="+91 98230 12345"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={reg.email}
                    onChange={(e) => setReg({ ...reg, email: e.target.value })}
                    placeholder="owner@vidyamandir.in"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={reg.password}
                    onChange={(e) => setReg({ ...reg, password: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Full Institute Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={reg.address}
                    onChange={(e) => setReg({ ...reg, address: e.target.value })}
                    placeholder="Building, Road, City, State, PIN Code"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F2A56] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173a75]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Isolated Institute Dashboard
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Right Demo Accounts Panel */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-blue-700" />
            <span>Demo Login Accounts (Password: demo)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Click any role below to inspect role-based permissions and strict institute data isolation.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {demoAccounts.map((acc) => {
              const inst = db.institutes.find((i) => i.id === acc.instituteId);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    if (inst) setSelectedInstituteId(inst.id);
                    onLoginSuccess(acc);
                  }}
                  className="w-full py-2.5 px-2 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{acc.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ROLE_LABELS[acc.role]} · {inst ? inst.name : 'Platform SaaS'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-blue-700 shrink-0">Sign In →</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
