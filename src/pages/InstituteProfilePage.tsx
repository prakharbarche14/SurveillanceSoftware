import React, { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import type { Institute } from '../types/erp';
import { BrandLogo } from '../components/ui/Feedback';

export function InstituteProfilePage({
  institute,
  onSaveInstitute,
  onNotify,
}: {
  institute: Institute;
  onSaveInstitute: (updated: Institute) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [form, setForm] = useState<Institute>({ ...institute });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      onNotify('error', 'Logo image should be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.includes('@')) {
      onNotify('error', 'Institute name, valid phone, and email are required.');
      return;
    }
    onSaveInstitute(form);
    onNotify('success', 'Institute branding and profile saved across dashboard, receipts, and reports.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Editable Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Institute Profile & Branding
            </h2>
            <p className="text-xs text-slate-500">
              Customizations automatically apply to login, dashboard, PDF receipts, report cards, and parent messages.
            </p>
          </div>
          <span className="text-xs font-mono-num text-slate-500">ID: {form.instituteCode}</span>
        </div>

        {/* Logo Upload & Preview */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <BrandLogo
            src={form.logoUrl}
            alt={form.name}
            primaryColor={form.primaryColor}
            sizeClass="h-16 w-16"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Institute Logo</p>
            <p className="text-xs text-slate-500">Upload square PNG/JPG emblem for receipts & portal header.</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              Upload Custom Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Coaching Institute Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Owner / Director Name *</label>
            <input
              type="text"
              required
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Institute Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Contact Number *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">WhatsApp Business Number</label>
            <input
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Official Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Full Postal Address *</label>
            <textarea
              rows={2}
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Primary Brand Colour</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Secondary Accent Colour</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Authorized Signature Text (PDFs & Receipts)</label>
            <input
              type="text"
              value={form.authorizedSignature}
              onChange={(e) => setForm({ ...form, authorizedSignature: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            style={{ backgroundColor: form.primaryColor }}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            <Save className="h-4 w-4" />
            Save Institute Branding
          </button>
        </div>
      </form>

      {/* Live Branding Preview */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Live Branded Document Preview</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Shows how your fee receipts, PDF report cards, and parent messages will appear.
          </p>

          {/* Receipt Header Mock Preview */}
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="p-4 text-white" style={{ backgroundColor: form.primaryColor }}>
              <div className="flex items-center gap-3">
                <BrandLogo
                  src={form.logoUrl}
                  alt={form.name}
                  primaryColor={form.secondaryColor}
                  sizeClass="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="font-display font-bold text-base truncate">{form.name || 'Institute Name'}</p>
                  <p className="text-[11px] opacity-90 truncate">{form.tagline}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] opacity-85">
                {form.address} · Ph: {form.phone}
              </p>
            </div>
            <div className="bg-white p-4 space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>OFFICIAL FEE RECEIPT / REPORT CARD</span>
                <span style={{ color: form.secondaryColor }}>VERIFIED</span>
              </div>
              <p className="text-slate-600">
                Sample Student: Aarav Sharma · Batch: JEE Target 2027
              </p>
              <div className="pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                <span>{form.website || form.email}</span>
                <span className="font-medium text-slate-800">{form.authorizedSignature}</span>
              </div>
            </div>
          </div>

          {/* Branded Parent Notification Preview */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-800">Parent WhatsApp Alert Preview</p>
            <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
              “Dear Parent, Aarav Sharma scored 90/100 (90.0%, Grade A+, PASS) in Physics Major Test at{' '}
              <strong>{form.name}</strong>. For queries call {form.phone}.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
