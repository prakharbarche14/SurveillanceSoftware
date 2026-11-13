import React, { useState } from 'react';
import { Bell, Building2, CheckCircle2, Edit2, X } from 'lucide-react';
import type {
  ERPDatabase,
  Institute,
  PlanTier,
  SubscriptionHistoryItem,
  SubscriptionStatus,
} from '../types/erp';
import { BrandLogo } from '../components/ui/Feedback';

const PLAN_LIMITS: Record<PlanTier, { students: number; staff: number; priceInr: number }> = {
  basic: { students: 150, staff: 10, priceInr: 1499 },
  standard: { students: 500, staff: 35, priceInr: 2999 },
  premium: { students: 2000, staff: 100, priceInr: 5499 },
};

export function SuperAdminPage({
  db,
  onUpdateSubscription,
  onSendRenewalReminder,
  onNotify,
}: {
  db: ERPDatabase;
  onUpdateSubscription: (institute: Institute, historyEntry: SubscriptionHistoryItem) => void;
  onSendRenewalReminder: (instituteId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [editingInst, setEditingInst] = useState<Institute | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier>('standard');
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>('active');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const openManage = (inst: Institute) => {
    setEditingInst(inst);
    setPlanTier(inst.planTier);
    setSubStatus(inst.subscriptionStatus);
    setExpiresAt(inst.planExpiresAt.slice(0, 10));
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Registered Coaching Institutes</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {db.institutes.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Active Paid Subscriptions</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {db.institutes.filter((i) => i.subscriptionStatus === 'active').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">On 14-Day Free Trial</p>
          <p className="mt-1 font-display text-2xl font-bold text-blue-700 tabular-nums">
            {db.institutes.filter((i) => i.subscriptionStatus === 'trial').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Platform Total Students</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {db.students.filter((s) => s.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Registered Institutes Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Tenant Coaching Institutes & SaaS Subscriptions
            </h2>
            <p className="text-xs text-slate-500">
              Manage plan tiers, trial periods, student/staff limits, and manual invoice renewals.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Institute</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Students / Limit</th>
                <th className="px-4 py-3 text-right">Staff / Limit</th>
                <th className="px-4 py-3">Status & Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.institutes.map((inst) => {
                const stuCount = db.students.filter(
                  (s) => s.instituteId === inst.id && s.status === 'active'
                ).length;
                const staffCount =
                  db.teachers.filter((t) => t.instituteId === inst.id && t.status === 'active').length +
                  db.staff.filter((s) => s.instituteId === inst.id && s.status === 'active').length;
                return (
                  <tr key={inst.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BrandLogo
                          src={inst.logoUrl}
                          alt={inst.name}
                          primaryColor={inst.primaryColor}
                          sizeClass="h-9 w-9"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{inst.name}</p>
                          <p className="text-xs text-slate-500 font-mono-num">{inst.instituteCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-slate-900">{inst.ownerName}</p>
                      <p className="text-slate-500">{inst.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-800">
                      {inst.planTier}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-xs">
                      {stuCount} / {inst.studentLimit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-xs">
                      {staffCount} / {inst.staffLimit}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`block font-semibold uppercase ${
                          inst.subscriptionStatus === 'active'
                            ? 'text-emerald-700'
                            : inst.subscriptionStatus === 'trial'
                            ? 'text-blue-700'
                            : 'text-red-600'
                        }`}
                      >
                        {inst.subscriptionStatus.replace('_', ' ')}
                      </span>
                      <span className="font-mono-num text-slate-500">
                        Exp: {inst.planExpiresAt.slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openManage(inst)}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Edit2 className="h-3 w-3" />
                          Manage Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSendRenewalReminder(inst.id);
                            onNotify('info', `Simulated renewal reminder logged for ${inst.name}.`);
                          }}
                          title="Send Renewal Reminder"
                          className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription History */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">SaaS Subscription History</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {db.subscriptionHistory.map((h) => {
            const inst = db.institutes.find((i) => i.id === h.instituteId);
            return (
              <div key={h.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{inst?.name || h.instituteId}</span> ·{' '}
                  <span className="uppercase font-medium">{h.planTier}</span> · {h.action}
                  {h.notes && <span className="text-slate-500"> — {h.notes}</span>}
                </div>
                <div className="font-mono-num text-slate-600">
                  {h.amountInr > 0 ? `₹${h.amountInr.toLocaleString('en-IN')} · ` : ''}
                  {h.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manage Subscription Modal */}
      {editingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Manage Subscription — {editingInst.name}
              </h3>
              <button type="button" onClick={() => setEditingInst(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const limits = PLAN_LIMITS[planTier];
                const updated: Institute = {
                  ...editingInst,
                  planTier,
                  subscriptionStatus: subStatus,
                  planExpiresAt: expiresAt,
                  studentLimit: limits.students,
                  staffLimit: limits.staff,
                };
                onUpdateSubscription(updated, {
                  id: `sub-${Date.now()}`,
                  instituteId: editingInst.id,
                  planTier,
                  action: `Plan updated to ${planTier.toUpperCase()} (${subStatus})`,
                  amountInr: subStatus === 'active' ? limits.priceInr : 0,
                  status: subStatus,
                  date: new Date().toISOString().slice(0, 10),
                  notes: notes || 'Updated by SaaS Super Admin (manual billing verification)',
                });
                setEditingInst(null);
                onNotify('success', `Subscription updated for ${editingInst.name}.`);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">SaaS Plan Tier</label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value as PlanTier)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="basic">Basic (150 students, 10 staff · ₹1,499/mo)</option>
                  <option value="standard">Standard (500 students, 35 staff · ₹2,999/mo)</option>
                  <option value="premium">Premium (2,000 students, 100 staff · ₹5,499/mo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Subscription Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as SubscriptionStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active (Manual Payment Verified)</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Billing / Payment Note</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. NEFT Ref #... verified"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInst(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2A56] px-4 py-2 text-xs font-semibold text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Plan Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { Building2 };
