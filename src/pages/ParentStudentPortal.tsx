import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Download, Send } from 'lucide-react';
import type { ERPDatabase, Institute, LeaveRequest, SessionState } from '../types/erp';
import { calculateStudentAttendanceSummary, computeTestAnalytics } from '../lib/erpStore';
import { downloadFeeReceiptPdf, downloadStudentReportCardPdf } from '../lib/exports';
import { LineTrendChart } from '../components/ui/Charts';
import { EmptyState } from '../components/ui/Feedback';

export function ParentStudentPortal({
  db,
  institute,
  session,
  onSubmitLeave,
  onToggleStudentHomework,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  session: SessionState;
  onSubmitLeave: (leave: LeaveRequest) => void;
  onToggleStudentHomework: (homeworkId: string, studentId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const isParent = session.role === 'parent';

  // Strictly scope to linked children (parent) or self (student) within institute
  const accessibleStudents = useMemo(() => {
    const instStudents = db.students.filter((s) => s.instituteId === institute.id && s.status === 'active');
    if (isParent) {
      return instStudents.filter((s) => s.parentId === session.linkedEntityId);
    }
    return instStudents.filter((s) => s.id === session.linkedEntityId);
  }, [db.students, institute.id, isParent, session.linkedEntityId]);

  const [selectedChildId, setSelectedChildId] = useState<string>(accessibleStudents[0]?.id || '');
  const activeStudent =
    accessibleStudents.find((s) => s.id === selectedChildId) || accessibleStudents[0];

  const [leaveForm, setLeaveForm] = useState({
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const policy = db.attendancePolicies.find((p) => p.instituteId === institute.id);

  if (!activeStudent) {
    return (
      <EmptyState
        title="No linked student profile found"
        description="Contact your institute office to link your account to an active student record."
      />
    );
  }

  const attendanceSummary = calculateStudentAttendanceSummary(
    activeStudent.id,
    db.studentAttendance,
    policy
  );
  const recentAttendance = db.studentAttendance
    .filter((a) => a.instituteId === institute.id && a.studentId === activeStudent.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  // CRITICAL: Only PUBLISHED tests are visible to parents & students (drafts strictly hidden!)
  const publishedTests = db.tests
    .filter(
      (t) =>
        t.instituteId === institute.id &&
        t.batchName === activeStudent.batchName &&
        t.status === 'published'
    )
    .sort((a, b) => a.testDate.localeCompare(b.testDate));

  const upcomingSchedule = db.tests
    .filter(
      (t) =>
        t.instituteId === institute.id &&
        t.batchName === activeStudent.batchName &&
        t.testDate >= new Date().toISOString().slice(0, 10)
    )
    .sort((a, b) => a.testDate.localeCompare(b.testDate));

  const performancePoints = publishedTests
    .map((t) => {
      const an = computeTestAnalytics(t, db.students, db.tests, db.testMarks);
      const res = an.results.find((r) => r.studentId === activeStudent.id);
      if (!res || res.percentage === null) return null;
      return { label: t.name.slice(0, 12), value: res.percentage };
    })
    .filter((x): x is { label: string; value: number } => x !== null);

  const studentFees = db.feeRecords.filter(
    (f) => f.instituteId === institute.id && f.studentId === activeStudent.id
  );
  const studentHomework = db.homework.filter(
    (h) => h.instituteId === institute.id && h.batchName === activeStudent.batchName
  );
  const studentTimetable = db.timetable.filter(
    (tt) => tt.instituteId === institute.id && tt.batchName === activeStudent.batchName
  );
  const studentLeaves = db.leaveRequests.filter(
    (l) => l.instituteId === institute.id && l.requesterId === activeStudent.id
  );

  // Notifications addressed to this parent or student
  const relevantNotifications = db.notificationsOutbox.filter(
    (n) =>
      n.instituteId === institute.id &&
      (n.recipientNumber === activeStudent.parentMobile ||
        n.recipientNumber === activeStudent.parentWhatsapp ||
        n.recipientNumber === activeStudent.studentMobile)
  );

  return (
    <div className="space-y-6">
      {/* Multi-Child Selector for Parents / Profile Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700">
            {isParent ? 'Parent Portal · Read-Only Academic & Fee View' : 'Student Portal · Read-Only Academic View'}
          </p>
          <h2 className="mt-0.5 font-display text-xl font-bold text-slate-900">
            {activeStudent.fullName}
          </h2>
          <p className="text-xs text-slate-500 font-mono-num">
            {activeStudent.studentCode} · Roll {activeStudent.rollNumber} · {activeStudent.className} ·{' '}
            {activeStudent.batchName}
          </p>
        </div>

        {isParent && accessibleStudents.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            {accessibleStudents.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeStudent.id === child.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {child.fullName} ({child.className})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Attendance Rate</p>
          <p
            className={`mt-1 font-display text-2xl font-bold tabular-nums ${
              attendanceSummary.isBelowThreshold ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {attendanceSummary.percentage}%
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {attendanceSummary.presentDays + attendanceSummary.lateDays}/{attendanceSummary.applicableWorkingDays} working days
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Published Exam Results</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {publishedTests.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Unpublished drafts stay hidden</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending Homework</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {
              studentHomework.filter(
                (h) =>
                  db.homeworkSubmissions.find(
                    (s) => s.homeworkId === h.id && s.studentId === activeStudent.id
                  )?.status !== 'completed'
              ).length
            }
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{studentHomework.length} total assigned</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending Fee Dues</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-700 tabular-nums">
            ₹
            {studentFees
              .reduce((s, f) => s + Math.max(0, f.baseAmount - f.discount + f.lateFee - f.paidAmount), 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{studentFees.length} fee invoices</p>
        </div>
      </div>

      {/* Performance Chart & Attendance Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Published Examination Performance Trend
          </h3>
          <LineTrendChart data={performancePoints} color={institute.secondaryColor} unit="%" />
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Attendance History</h3>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {recentAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <span className="font-mono-num text-slate-700">{a.date}</span>
                <span
                  className={`font-semibold uppercase ${
                    a.status === 'present'
                      ? 'text-emerald-700'
                      : a.status === 'absent'
                      ? 'text-red-600'
                      : 'text-amber-700'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Published Exam Results Table (Drafts strictly excluded!) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Published Examination Results</h3>
          {upcomingSchedule.length > 0 && (
            <span className="text-xs text-slate-600">
              Next Upcoming Test: {upcomingSchedule[0].name} ({upcomingSchedule[0].testDate})
            </span>
          )}
        </div>
        {publishedTests.length === 0 ? (
          <p className="p-6 text-xs text-slate-500 text-center">No published exam results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Test</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Marks</th>
                  <th className="px-4 py-2.5 text-right">% / Grade</th>
                  <th className="px-4 py-2.5 text-right">Batch Rank</th>
                  <th className="px-4 py-2.5 text-right">Report Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publishedTests.map((t) => {
                  const an = computeTestAnalytics(t, db.students, db.tests, db.testMarks);
                  const res = an.results.find((r) => r.studentId === activeStudent.id);
                  if (!res) return null;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {t.name} <span className="text-xs text-slate-500">({t.subject})</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono-num text-xs text-slate-600">{t.testDate}</td>
                      <td className="px-4 py-2.5 text-right font-mono-num">
                        {res.isAbsent ? 'ABSENT' : `${res.obtainedMarks ?? '-'} / ${t.maxMarks}`}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-num">
                        {res.percentage !== null ? `${res.percentage}% (${res.grade})` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-num font-semibold">
                        {res.rank ? `#${res.rank}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            downloadStudentReportCardPdf(institute, activeStudent, t, res, an);
                            onNotify('success', 'Official Report Card PDF downloaded.');
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Homework, Timetable, Fees, Leave & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Homework */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Assigned Homework</h3>
          {studentHomework.length === 0 ? (
            <p className="text-xs text-slate-500">No homework assigned.</p>
          ) : (
            <div className="space-y-2.5">
              {studentHomework.map((hw) => {
                const sub = db.homeworkSubmissions.find(
                  (s) => s.homeworkId === hw.id && s.studentId === activeStudent.id
                );
                const completed = sub?.status === 'completed';
                return (
                  <div key={hw.id} className="rounded-lg border border-slate-200 p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{hw.title}</p>
                      <p className="text-xs text-slate-500">
                        {hw.subject} · Due {hw.deadline}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isParent}
                      onClick={() => onToggleStudentHomework(hw.id, activeStudent.id)}
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold shrink-0 ${
                        completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {completed ? 'Completed' : isParent ? 'Pending' : 'Mark Done'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fee Status & Receipts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Fee Status & Receipts</h3>
          {studentFees.length === 0 ? (
            <p className="text-xs text-slate-500">No fee records found.</p>
          ) : (
            <div className="space-y-2.5">
              {studentFees.map((f) => {
                const net = f.baseAmount - f.discount + f.lateFee;
                const pay = db.feePayments.find((p) => p.feeRecordId === f.id);
                return (
                  <div key={f.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{f.title}</p>
                      <p className="text-xs text-slate-500 font-mono-num">
                        Paid ₹{f.paidAmount.toLocaleString('en-IN')} / ₹{net.toLocaleString('en-IN')} ·{' '}
                        <span className="uppercase font-semibold">{f.status}</span>
                      </p>
                    </div>
                    {pay && (
                      <button
                        type="button"
                        onClick={() => downloadFeeReceiptPdf(institute, activeStudent, f, pay)}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        Receipt PDF
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Timetable & Parent Leave Application */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            Batch Timetable ({activeStudent.batchName})
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {studentTimetable.map((slot) => (
              <div key={slot.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">{slot.subject}</span> · {slot.dayOfWeek}
                </div>
                <span className="font-mono-num text-slate-600">
                  {slot.startTime}–{slot.endTime} ({slot.roomNumber})
                </span>
              </div>
            ))}
          </div>
        </div>

        {isParent ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Apply for Child Leave</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!leaveForm.reason.trim()) {
                  onNotify('error', 'Please enter a leave reason.');
                  return;
                }
                onSubmitLeave({
                  id: `lv-${Date.now()}`,
                  instituteId: institute.id,
                  requesterType: 'student',
                  requesterId: activeStudent.id,
                  requesterName: activeStudent.fullName,
                  fromDate: leaveForm.fromDate,
                  toDate: leaveForm.toDate,
                  reason: leaveForm.reason.trim(),
                  status: 'pending',
                  createdAt: new Date().toISOString().slice(0, 10),
                });
                setLeaveForm({ ...leaveForm, reason: '' });
                onNotify('success', `Leave application submitted for ${activeStudent.fullName}.`);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Reason for leave..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                style={{ backgroundColor: institute.primaryColor }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Leave Application
              </button>
            </form>
            {studentLeaves.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                {studentLeaves.map((l) => (
                  <div key={l.id} className="flex justify-between text-slate-600">
                    <span>
                      {l.fromDate} ({l.reason})
                    </span>
                    <span className="font-semibold uppercase">{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent Notifications</h3>
            {relevantNotifications.length === 0 ? (
              <p className="text-xs text-slate-500">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {relevantNotifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="py-2">
                    <p className="text-slate-800">{n.messageContent}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {n.channel.toUpperCase()} · {n.createdAt.slice(0, 10)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
