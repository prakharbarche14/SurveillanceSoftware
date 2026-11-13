import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarOff, CheckCircle2, Download, Plus, Save, Search, Trash2 } from 'lucide-react';
import type { AttendancePolicy, AttendanceStatus, ERPDatabase, Institute } from '../types/erp';
import { calculateStudentAttendanceSummary, isWorkingDay } from '../lib/erpStore';
import { downloadCsv, downloadGenericTablePdf } from '../lib/exports';
import { EmptyState } from '../components/ui/Feedback';

export function AttendancePage({
  db,
  institute,
  canEditPolicy,
  onSaveAttendance,
  onSavePolicy,
  onSendLowAttendanceAlerts,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  canEditPolicy: boolean;
  onSaveAttendance: (
    date: string,
    entries: Array<{ studentId: string; status: AttendanceStatus }>
  ) => void;
  onSavePolicy: (policy: AttendancePolicy) => void;
  onSendLowAttendanceAlerts: (studentIds: string[]) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<'mark' | 'reports' | 'policy'>('mark');
  const [selectedDate, setSelectedDate] = useState(today);
  const [classFilter, setClassFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus | 'UNMARKED'>('ALL');
  const [search, setSearch] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const policy = useMemo<AttendancePolicy>(
    () =>
      db.attendancePolicies.find((p) => p.instituteId === institute.id) || {
        instituteId: institute.id,
        workingDays: [1, 2, 3, 4, 5, 6],
        holidays: [],
        approvedLeaveTreatment: 'excused_excluded',
        lowAttendanceThreshold: 75,
      },
    [db.attendancePolicies, institute.id]
  );

  const [policyDraft, setPolicyDraft] = useState<AttendancePolicy>(policy);
  const [holidayForm, setHolidayForm] = useState({ date: today, name: '' });

  useEffect(() => {
    setPolicyDraft(policy);
  }, [policy]);

  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.className))), [students]);
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batchName))), [students]);

  const existingDateMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    db.studentAttendance
      .filter((r) => r.instituteId === institute.id && r.date === selectedDate)
      .forEach((r) => map.set(r.studentId, r.status));
    return map;
  }, [db.studentAttendance, institute.id, selectedDate]);

  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      const existing = existingDateMap.get(s.id);
      if (existing) next[s.id] = existing;
    });
    setDraftStatuses(next);
  }, [students, existingDateMap, selectedDate]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;
      if (batchFilter !== 'ALL' && s.batchName !== batchFilter) return false;
      const curStatus = draftStatuses[s.id];
      if (statusFilter === 'UNMARKED' && curStatus) return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'UNMARKED' && curStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q)
      );
    });
  }, [students, classFilter, batchFilter, statusFilter, search, draftStatuses]);

  const dateIsWorking = isWorkingDay(selectedDate, policy);

  const handleMarkAllPresent = () => {
    setDraftStatuses((prev) => {
      const next = { ...prev };
      visibleStudents.forEach((s) => {
        next[s.id] = 'present';
      });
      return next;
    });
    onNotify('info', `Marked ${visibleStudents.length} filtered students as Present (click Save Attendance to persist).`);
  };

  const handleSave = () => {
    const entries = visibleStudents
      .filter((s) => Boolean(draftStatuses[s.id]))
      .map((s) => ({
        studentId: s.id,
        status: draftStatuses[s.id],
      }));
    if (entries.length === 0) {
      onNotify('error', 'Please mark at least one student before saving.');
      return;
    }
    onSaveAttendance(selectedDate, entries);
  };

  // Report Calculations
  const reportDateRange = useMemo(() => {
    if (reportPeriod === 'daily') return { from: selectedDate, to: selectedDate };
    if (reportPeriod === 'weekly') {
      const d = new Date(`${selectedDate}T00:00:00`);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: selectedDate };
    }
    return { from: `${selectedDate.slice(0, 7)}-01`, to: selectedDate };
  }, [reportPeriod, selectedDate]);

  const studentSummaries = useMemo(() => {
    return students
      .filter((s) => (batchFilter === 'ALL' ? true : s.batchName === batchFilter))
      .map((s) => ({
        student: s,
        summary: calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy, reportDateRange),
      }));
  }, [students, batchFilter, db.studentAttendance, policy, reportDateRange]);

  const lowAttendanceStudents = useMemo(
    () => studentSummaries.filter((x) => x.summary.isBelowThreshold),
    [studentSummaries]
  );

  const batchReport = useMemo(() => {
    return batches.map((b) => {
      const rows = studentSummaries.filter((x) => x.student.batchName === b);
      const avg =
        rows.length > 0
          ? Number((rows.reduce((sum, r) => sum + r.summary.percentage, 0) / rows.length).toFixed(1))
          : 0;
      const below = rows.filter((r) => r.summary.isBelowThreshold).length;
      return { batchName: b, studentCount: rows.length, avgPercentage: avg, belowCount: below };
    });
  }, [batches, studentSummaries]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('mark')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'mark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark Daily Attendance
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reports & Low Attendance ({lowAttendanceStudents.length})
          </button>
          {canEditPolicy && (
            <button
              type="button"
              onClick={() => setTab('policy')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'policy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance Policies
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MARK DAILY ATTENDANCE */}
      {tab === 'mark' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Class</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Batch</label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ALL">All Batches</option>
                  {batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ALL">All Students</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="leave">Approved Leave</option>
                  <option value="UNMARKED">Unmarked</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Search Student</label>
                <div className="relative mt-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or Roll..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {!dateIsWorking && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                <CalendarOff className="h-4 w-4 shrink-0" />
                <span>
                  Note: {selectedDate} is configured as a non-working day / holiday in Attendance Policy. Any records saved here are excluded from percentage denominator unless policy changes.
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 tabular-nums">
                Showing {visibleStudents.length} students · Already saved for {selectedDate}:{' '}
                {visibleStudents.filter((s) => existingDateMap.has(s.id)).length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  style={{ backgroundColor: institute.primaryColor }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Attendance & Queue Parent Alerts
                </button>
              </div>
            </div>
          </div>

          {visibleStudents.length === 0 ? (
            <EmptyState
              title="No students found"
              description="Adjust your class, batch, or status filter to view students."
            />
          ) : (
            <div className="space-y-2.5">
              {visibleStudents.map((stu) => {
                const current = draftStatuses[stu.id];
                const savedStatus = existingDateMap.get(stu.id);
                return (
                  <div
                    key={stu.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-900">{stu.fullName}</p>
                        {savedStatus && (
                          <span className="text-[11px] text-slate-500">
                            · Saved: <strong className="uppercase">{savedStatus}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono-num">
                        {stu.rollNumber} · {stu.className} · {stu.batchName} · Parent: {stu.parentMobile}
                      </p>
                    </div>

                    {/* Large touch-friendly attendance action buttons */}
                    <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center">
                      {(
                        [
                          ['present', 'Present', 'bg-emerald-600 text-white border-emerald-600'],
                          ['absent', 'Absent', 'bg-red-600 text-white border-red-600'],
                          ['late', 'Late', 'bg-amber-600 text-white border-amber-600'],
                          ['leave', 'Leave', 'bg-slate-700 text-white border-slate-700'],
                        ] as const
                      ).map(([val, label, activeCls]) => {
                        const isSelected = current === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setDraftStatuses((prev) => ({
                                ...prev,
                                [stu.id]: val,
                              }))
                            }
                            className={`min-h-[40px] px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                              isSelected
                                ? activeCls
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTS & LOW ATTENDANCE */}
      {tab === 'reports' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReportPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                      reportPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {p} Report
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 font-mono-num">
                {reportDateRange.from} to {reportDateRange.to}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadCsv(
                    `${institute.instituteCode}_Attendance_${reportPeriod}.csv`,
                    ['Student ID', 'Name', 'Batch', 'Working Days', 'Present+Late', 'Absent', 'Leave', 'Attendance %'],
                    studentSummaries.map(({ student, summary }) => [
                      student.studentCode,
                      student.fullName,
                      student.batchName,
                      summary.applicableWorkingDays,
                      summary.presentDays + summary.lateDays,
                      summary.absentDays,
                      summary.leaveDays,
                      `${summary.percentage}%`,
                    ])
                  );
                  onNotify('success', 'Attendance CSV downloaded.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadGenericTablePdf(
                    institute,
                    `STUDENT ATTENDANCE REPORT (${reportPeriod.toUpperCase()})`,
                    `${institute.instituteCode}_Attendance_${reportPeriod}.pdf`,
                    ['ID', 'Student Name', 'Batch', 'Present', 'Absent', 'Att %'],
                    studentSummaries.map(({ student, summary }) => [
                      student.studentCode,
                      student.fullName,
                      student.batchName,
                      summary.presentDays + summary.lateDays,
                      summary.absentDays,
                      `${summary.percentage}%`,
                    ])
                  );
                  onNotify('success', 'Branded attendance PDF downloaded.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download Branded PDF
              </button>
            </div>
          </div>

          {/* Low Attendance Alert Banner */}
          {lowAttendanceStudents.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {lowAttendanceStudents.length} Student(s) Below {policy.lowAttendanceThreshold}% Attendance Threshold
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {lowAttendanceStudents.map((x) => `${x.student.fullName} (${x.summary.percentage}%)`).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onSendLowAttendanceAlerts(lowAttendanceStudents.map((x) => x.student.id))
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                <Bell className="h-3.5 w-3.5" />
                Queue Low-Attendance Warnings
              </button>
            </div>
          )}

          {/* Batch-wise Attendance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batchReport.map((b) => (
              <div key={b.batchName} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{b.batchName}</p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
                  {b.avgPercentage}%
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {b.studentCount} students · {b.belowCount} below {policy.lowAttendanceThreshold}%
                </p>
              </div>
            ))}
          </div>

          {/* Individual Student Percentage Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3 text-right">Working Days</th>
                  <th className="px-4 py-3 text-right">Present + Late</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Leave</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentSummaries.map(({ student, summary }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{student.fullName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{student.batchName}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num">{summary.applicableWorkingDays}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num text-emerald-700">
                      {summary.presentDays + summary.lateDays}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono-num text-red-600">{summary.absentDays}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num text-slate-600">{summary.leaveDays}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num font-semibold">
                      <span className={summary.isBelowThreshold ? 'text-red-600' : 'text-slate-900'}>
                        {summary.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE POLICY CONFIGURATION */}
      {tab === 'policy' && canEditPolicy && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Attendance Calculation Policy
              </h3>
              <p className="text-xs text-slate-500">
                Formula: Attendance % = (Present Working Days / Applicable Working Days) × 100
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Weekly Working Days (Non-selected days are excluded)
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((name, idx) => {
                  const active = policyDraft.workingDays.includes(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setPolicyDraft((prev) => ({
                          ...prev,
                          workingDays: active
                            ? prev.workingDays.filter((d) => d !== idx)
                            : [...prev.workingDays, idx].sort(),
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Approved Leave Treatment
                </label>
                <select
                  value={policyDraft.approvedLeaveTreatment}
                  onChange={(e) =>
                    setPolicyDraft({
                      ...policyDraft,
                      approvedLeaveTreatment: e.target.value as AttendancePolicy['approvedLeaveTreatment'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="excused_excluded">Excluded from Working Days (Neutral)</option>
                  <option value="counted_present">Counted as Present</option>
                  <option value="counted_absent">Counted as Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Low Attendance Warning Threshold (%)
                </label>
                <input
                  type="number"
                  min={40}
                  max={95}
                  value={policyDraft.lowAttendanceThreshold}
                  onChange={(e) =>
                    setPolicyDraft({
                      ...policyDraft,
                      lowAttendanceThreshold: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSavePolicy(policyDraft);
                onNotify('success', 'Attendance policy updated and percentages recalculated.');
              }}
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            >
              <Save className="h-4 w-4" />
              Save Attendance Policy
            </button>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Institute Holidays</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="Holiday name..."
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!holidayForm.name.trim()) return;
                  const nextHolidays = [
                    ...policyDraft.holidays,
                    { id: `hol-${Date.now()}`, date: holidayForm.date, name: holidayForm.name.trim() },
                  ];
                  const updated = { ...policyDraft, holidays: nextHolidays };
                  setPolicyDraft(updated);
                  onSavePolicy(updated);
                  setHolidayForm({ date: today, name: '' });
                  onNotify('success', 'Holiday added and excluded from working days.');
                }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {policyDraft.holidays.length === 0 ? (
                <p className="text-slate-500 py-3">No holidays configured.</p>
              ) : (
                policyDraft.holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-900">{h.name}</p>
                      <p className="text-slate-500 font-mono-num">{h.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...policyDraft,
                          holidays: policyDraft.holidays.filter((x) => x.id !== h.id),
                        };
                        setPolicyDraft(updated);
                        onSavePolicy(updated);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
