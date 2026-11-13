import React, { useMemo, useState } from 'react';
import { AlertTriangle, Code2, Info, Save, Search } from 'lucide-react';
import type {
  ERPDatabase,
  Institute,
  NotificationChannelMode,
  NotificationRecipientMode,
  NotificationSettings,
} from '../types/erp';
import { renderNotificationTemplate } from '../lib/erpStore';
import { buildDltSmsPayload, buildWhatsAppTemplatePayload, getIntegrationReadiness } from '../lib/supabaseAdapter';
import { EmptyState } from '../components/ui/Feedback';

export function NotificationsSettingsPage({
  db,
  institute,
  onSaveSettings,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  onSaveSettings: (settings: NotificationSettings) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [tab, setTab] = useState<'outbox' | 'settings'>('outbox');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'whatsapp' | 'sms'>('ALL');
  const [search, setSearch] = useState('');
  const [inspectPayloadId, setInspectPayloadId] = useState<string | null>(null);

  const currentSettings = useMemo<NotificationSettings>(
    () =>
      db.notificationSettings.find((s) => s.instituteId === institute.id) || {
        instituteId: institute.id,
        sendAbsentAlert: true,
        sendPresentConfirmation: false,
        sendLowAttendanceAlert: true,
        sendLeaveApprovalAlert: true,
        sendResultAlert: true,
        sendUpcomingTestAlert: true,
        sendFeeReminder: true,
        sendStaffNotification: true,
        attendanceRecipient: 'parent',
        resultRecipient: 'both',
        defaultChannel: 'whatsapp',
        preferredSendTime: '18:30',
        signatureLine: `${institute.name} · ${institute.phone}`,
        whatsappTemplateAbsent:
          'Dear Parent, {{studentName}} was marked {{status}} on {{date}} at {{instituteName}}. Call {{institutePhone}}.',
        smsTemplateAbsent:
          '{{instituteName}}: {{studentName}} was {{status}} on {{date}}. Contact {{institutePhone}}.',
        whatsappTemplateResult:
          '{{instituteName}} Result: {{studentName}} scored {{obtained}}/{{max}} ({{percentage}}%, Grade {{grade}}, {{passStatus}}) in {{testName}} ({{subject}}). Contact {{institutePhone}}.',
        smsTemplateResult:
          '{{instituteName}}: {{studentName}} got {{obtained}}/{{max}} ({{percentage}}%, {{passStatus}}) in {{testName}}. {{institutePhone}}.',
      },
    [db.notificationSettings, institute]
  );

  const [form, setForm] = useState<NotificationSettings>(currentSettings);
  const readiness = getIntegrationReadiness();

  const outbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.notificationsOutbox
      .filter((n) => n.instituteId === institute.id)
      .filter((n) => (channelFilter === 'ALL' ? true : n.channel === channelFilter))
      .filter(
        (n) =>
          !q ||
          n.recipientName.toLowerCase().includes(q) ||
          n.recipientNumber.includes(q) ||
          n.messageContent.toLowerCase().includes(q)
      );
  }, [db.notificationsOutbox, institute.id, channelFilter, search]);

  const previewVars = {
    studentName: 'Aarav Sharma',
    status: 'ABSENT',
    date: new Date().toISOString().slice(0, 10),
    instituteName: institute.name,
    institutePhone: institute.phone,
    testName: 'Physics Major Test',
    subject: 'Physics',
    obtained: '90',
    max: '100',
    percentage: '90.0',
    grade: 'A+',
    passStatus: 'PASS',
  };

  return (
    <div className="space-y-5">
      {/* Prototype Transparency Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 text-xs text-amber-900">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
        <div>
          <p className="font-semibold">
            Simulated Notification Outbox Mode ({readiness.messagingMode})
          </p>
          <p className="mt-0.5 text-amber-800">
            Messages below are recorded in the prototype outbox with full duplicate prevention and payload inspection. External WhatsApp Business Cloud API & Indian DLT SMS delivery activates only when server credentials are configured in environment secrets.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('outbox')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
            tab === 'outbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Notification History ({outbox.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
            tab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Notification Settings & Templates
        </button>
      </div>

      {/* TAB 1: OUTBOX */}
      {tab === 'outbox' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipient, number, or message..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['ALL', 'whatsapp', 'sms'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-3 py-1 text-xs font-medium rounded-md uppercase ${
                    channelFilter === ch ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {outbox.length === 0 ? (
            <EmptyState
              title="Notification outbox is empty"
              description="Save student attendance, publish test results, or send a fee reminder to see deduplicated simulated alerts here."
            />
          ) : (
            <div className="space-y-3">
              {outbox.map((item) => {
                const isInspecting = inspectPayloadId === item.id;
                const payloadPreview =
                  item.channel === 'whatsapp'
                    ? buildWhatsAppTemplatePayload(item.recipientNumber, `edutrack_${item.notificationType}`, [
                        item.recipientName,
                        item.messageContent,
                      ])
                    : buildDltSmsPayload(item.recipientNumber, item.messageContent);
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        <strong className="text-sm text-slate-900">{item.recipientName}</strong>{' '}
                        <span className="font-mono-num">({item.recipientNumber || 'Missing Number'})</span> ·{' '}
                        <span className="uppercase font-medium text-slate-700">{item.recipientRole}</span> ·{' '}
                        <span className="uppercase">{item.channel}</span> ·{' '}
                        <span>{item.notificationType.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono-num text-slate-500">
                          {item.createdAt.replace('T', ' ').slice(0, 16)}
                        </span>
                        {item.deliveryStatus === 'simulated_error' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            SIMULATED ERROR
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700">SIMULATED OUTBOX</span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed">{item.messageContent}</p>
                    {item.errorInfo && (
                      <p className="text-xs text-red-600">Error: {item.errorInfo}</p>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setInspectPayloadId(isInspecting ? null : item.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        {isInspecting ? 'Hide API Payload' : 'Inspect Cloud API / DLT Payload'}
                      </button>
                    </div>

                    {isInspecting && (
                      <pre className="rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100 overflow-x-auto font-mono-num">
                        {JSON.stringify(payloadPreview, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SETTINGS & TEMPLATES */}
      {tab === 'settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveSettings(form);
            onNotify('success', 'Notification preferences and templates saved.');
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h3 className="font-display text-base font-bold text-slate-900">
              Channel & Recipient Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(
                [
                  ['sendAbsentAlert', 'Automatic Absent Alerts'],
                  ['sendPresentConfirmation', 'Present Confirmation Messages'],
                  ['sendLowAttendanceAlert', 'Low Attendance Warnings (< Threshold)'],
                  ['sendLeaveApprovalAlert', 'Leave Approval / Rejection Alerts'],
                  ['sendResultAlert', 'Published Exam Result Alerts'],
                  ['sendUpcomingTestAlert', 'Upcoming Test Announcements'],
                  ['sendFeeReminder', 'Fee Due & Reminder Alerts'],
                  ['sendStaffNotification', 'Staff Internal Notifications'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-800">{label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Attendance Recipients</label>
                <select
                  value={form.attendanceRecipient}
                  onChange={(e) =>
                    setForm({ ...form, attendanceRecipient: e.target.value as NotificationRecipientMode })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="parent">Parent Only</option>
                  <option value="student">Student Only</option>
                  <option value="both">Both Parent & Student</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Result Recipients</label>
                <select
                  value={form.resultRecipient}
                  onChange={(e) =>
                    setForm({ ...form, resultRecipient: e.target.value as NotificationRecipientMode })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="parent">Parent Only</option>
                  <option value="student">Student Only</option>
                  <option value="both">Both Parent & Student</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Preferred Channel</label>
                <select
                  value={form.defaultChannel}
                  onChange={(e) =>
                    setForm({ ...form, defaultChannel: e.target.value as NotificationChannelMode })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both WhatsApp & SMS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Daily Dispatch Window</label>
                <input
                  type="time"
                  value={form.preferredSendTime}
                  onChange={(e) => setForm({ ...form, preferredSendTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Institute Message Signature</label>
                <input
                  type="text"
                  value={form.signatureLine}
                  onChange={(e) => setForm({ ...form, signatureLine: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  WhatsApp Template — Attendance
                </label>
                <textarea
                  rows={2}
                  value={form.whatsappTemplateAbsent}
                  onChange={(e) => setForm({ ...form, whatsappTemplateAbsent: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  WhatsApp Template — Exam Results
                </label>
                <textarea
                  rows={2}
                  value={form.whatsappTemplateResult}
                  onChange={(e) => setForm({ ...form, whatsappTemplateResult: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                />
              </div>
            </div>

            <button
              type="submit"
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Save className="h-4 w-4" />
              Save Notification Settings
            </button>
          </div>

          {/* Live Template Preview */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Live Template Preview
            </h3>
            <p className="text-xs text-slate-500">
              Verify institute name, contact number, student name, and status before enabling templates.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Absent Alert Preview ({form.defaultChannel})
              </p>
              <p className="text-xs text-slate-800 leading-relaxed">
                {renderNotificationTemplate(form.whatsappTemplateAbsent, previewVars)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Test Result Preview ({form.resultRecipient})
              </p>
              <p className="text-xs text-slate-800 leading-relaxed">
                {renderNotificationTemplate(form.whatsappTemplateResult, previewVars)}
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
