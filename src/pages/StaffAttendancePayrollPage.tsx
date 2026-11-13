import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, Plus, Save, X } from 'lucide-react';
import type {
  AttendanceStatus,
  ERPDatabase,
  Institute,
  PayrollRecord,
} from '../types/erp';
import { downloadCsv, downloadSalarySlipPdf } from '../lib/exports';
import { EmptyState } from '../components/ui/Feedback';

export function StaffAttendancePayrollPage({
  db,
  institute,
  canManageStaffAttendance,
  canAccessPayroll,
  onSaveStaffAttendance,
  onReviewLeave,
  onSavePayroll,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  canManageStaffAttendance: boolean;
  canAccessPayroll: boolean;
  onSaveStaffAttendance: (
    date: string,
    entries: Array<{ employeeType: 'teacher' | 'staff'; employeeId: string; status: AttendanceStatus }>
  ) => void;
  onReviewLeave: (leaveId: string, status: 'approved' | 'rejected') => void;
  onSavePayroll: (record: PayrollRecord) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const [tab, setTab] = useState<'attendance' | 'leaves' | 'payroll'>(
    canManageStaffAttendance ? 'attendance' : 'payroll'
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);

  const employees = useMemo(() => {
    const tList = db.teachers
      .filter((t) => t.instituteId === institute.id && t.status === 'active')
      .map((t) => ({
        employeeType: 'teacher' as const,
        employeeId: t.id,
        name: t.fullName,
        designation: `Teacher (${t.subjects.join(', ')})`,
        baseSalary: t.monthlySalary,
      }));
    const sList = db.staff
      .filter((s) => s.instituteId === institute.id && s.status === 'active')
      .map((s) => ({
        employeeType: 'staff' as const,
        employeeId: s.id,
        name: s.fullName,
        designation: s.designation,
        baseSalary: s.monthlySalary,
      }));
    return [...tList, ...sList];
  }, [db.teachers, db.staff, institute.id]);

  // Existing staff attendance for selectedDate
  const existingMap = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    db.staffAttendance
      .filter((a) => a.instituteId === institute.id && a.date === selectedDate)
      .forEach((a) => m.set(a.employeeId, a.status));
    return m;
  }, [db.staffAttendance, institute.id, selectedDate]);

  const [draftAtt, setDraftAtt] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    employees.forEach((e) => {
      next[e.employeeId] = existingMap.get(e.employeeId) || 'present';
    });
    setDraftAtt(next);
  }, [employees, existingMap, selectedDate]);

  const leaveRequests = useMemo(
    () =>
      db.leaveRequests
        .filter((l) => l.instituteId === institute.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.leaveRequests, institute.id]
  );

  const payrollList = useMemo(
    () =>
      db.payrollRecords.filter(
        (p) => p.instituteId === institute.id && p.monthKey === monthFilter
      ),
    [db.payrollRecords, institute.id, monthFilter]
  );

  const [newPayroll, setNewPayroll] = useState({
    employeeId: employees[0]?.employeeId || '',
    bonus: 0,
    advanceDeduction: 0,
    otherDeductions: 0,
    status: 'paid' as 'paid' | 'unpaid',
    paymentDate: today,
  });

  const selectedEmpForPayroll = employees.find((e) => e.employeeId === newPayroll.employeeId) || employees[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1 rounded-lg w-fit">
        {canManageStaffAttendance && (
          <>
            <button
              type="button"
              onClick={() => setTab('attendance')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
                tab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Staff Attendance
            </button>
            <button
              type="button"
              onClick={() => setTab('leaves')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
                tab === 'leaves' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Leave Applications ({leaveRequests.filter((l) => l.status === 'pending').length})
            </button>
          </>
        )}
        {canAccessPayroll && (
          <button
            type="button"
            onClick={() => setTab('payroll')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
              tab === 'payroll' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Salary & Payroll
          </button>
        )}
      </div>

      {/* TAB 1: STAFF ATTENDANCE */}
      {tab === 'attendance' && canManageStaffAttendance && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onSaveStaffAttendance(
                  selectedDate,
                  employees.map((e) => ({
                    employeeType: e.employeeType,
                    employeeId: e.employeeId,
                    status: draftAtt[e.employeeId] || 'present',
                  }))
                );
                onNotify('success', `Staff attendance saved for ${selectedDate} (duplicates prevented).`);
              }}
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            >
              <Save className="h-4 w-4" />
              Save Staff Attendance
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Role / Designation</th>
                  <th className="px-4 py-3 text-right">Monthly Att %</th>
                  <th className="px-4 py-3 text-right">Mark Status ({selectedDate})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const monthAtt = db.staffAttendance.filter(
                    (a) =>
                      a.instituteId === institute.id &&
                      a.employeeId === emp.employeeId &&
                      a.date.startsWith(selectedDate.slice(0, 7))
                  );
                  const pres = monthAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const pct = monthAtt.length > 0 ? Math.round((pres / monthAtt.length) * 100) : 100;
                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{emp.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{emp.designation}</td>
                      <td className="px-4 py-3 text-right font-mono-num text-slate-900">{pct}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {(['present', 'absent', 'late', 'leave'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setDraftAtt((p) => ({ ...p, [emp.employeeId]: st }))}
                              className={`px-2.5 py-1 rounded border text-xs font-semibold capitalize ${
                                draftAtt[emp.employeeId] === st
                                  ? st === 'present'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : st === 'absent'
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white text-slate-600 border-slate-300'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE REQUESTS */}
      {tab === 'leaves' && canManageStaffAttendance && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {leaveRequests.length === 0 ? (
            <EmptyState
              title="No leave applications"
              description="Student and staff leave applications appear here for approval."
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.map((lv) => (
                  <tr key={lv.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lv.requesterName}</p>
                      <p className="text-xs text-slate-500 capitalize">{lv.requesterType}</p>
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-700">
                      {lv.fromDate} → {lv.toDate}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{lv.reason}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          lv.status === 'approved'
                            ? 'text-emerald-700'
                            : lv.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        {lv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lv.status === 'pending' && (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => onReviewLeave(lv.id, 'approved')}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReviewLeave(lv.id, 'rejected')}
                            className="inline-flex items-center gap-1 rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: SALARY & PAYROLL (OWNER / ADMIN / ACCOUNTANT ONLY) */}
      {tab === 'payroll' && canAccessPayroll && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">Payroll Month:</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono-num"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadCsv(
                    `${institute.instituteCode}_Payroll_${monthFilter}.csv`,
                    ['Slip No', 'Employee', 'Designation', 'Base', 'Bonus', 'Advance', 'Deductions', 'Net Salary', 'Status'],
                    payrollList.map((p) => [
                      p.slipNumber,
                      p.employeeName,
                      p.designation,
                      p.baseSalary,
                      p.bonus,
                      p.advanceDeduction,
                      p.otherDeductions,
                      p.netSalary,
                      p.status,
                    ])
                  );
                  onNotify('success', 'Monthly payroll CSV downloaded.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export Payroll CSV
              </button>
              <button
                type="button"
                onClick={() => setPayrollModalOpen(true)}
                style={{ backgroundColor: institute.primaryColor }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Generate Salary Entry
              </button>
            </div>
          </div>

          {payrollList.length === 0 ? (
            <EmptyState
              title={`No payroll entries for ${monthFilter}`}
              description="Generate a salary slip for a teacher or staff member for this month."
              actionLabel="Generate Salary Entry"
              onAction={() => setPayrollModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Bonus</th>
                    <th className="px-4 py-3 text-right">Advance / Ded</th>
                    <th className="px-4 py-3 text-right">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Salary Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollList.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{pr.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          {pr.designation} · {pr.slipNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num">
                        ₹{pr.baseSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-emerald-700">
                        +₹{pr.bonus.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-red-600">
                        -₹{(pr.advanceDeduction + pr.otherDeductions).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num font-bold text-slate-900">
                        ₹{pr.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        {pr.status === 'paid' ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Paid ({pr.paymentDate})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onSavePayroll({ ...pr, status: 'paid', paymentDate: today });
                              onNotify('success', `Marked ${pr.employeeName} salary as Paid.`);
                            }}
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Unpaid · Mark Paid
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            downloadSalarySlipPdf(institute, pr);
                            onNotify('success', `Salary slip PDF downloaded for ${pr.employeeName}.`);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3 w-3" />
                          PDF Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Payroll Modal */}
          {payrollModalOpen && selectedEmpForPayroll && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
              <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Process Salary ({monthFilter})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPayrollModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const net = Math.max(
                      0,
                      selectedEmpForPayroll.baseSalary +
                        newPayroll.bonus -
                        newPayroll.advanceDeduction -
                        newPayroll.otherDeductions
                    );
                    onSavePayroll({
                      id: `pr-${Date.now()}`,
                      instituteId: institute.id,
                      employeeType: selectedEmpForPayroll.employeeType,
                      employeeId: selectedEmpForPayroll.employeeId,
                      employeeName: selectedEmpForPayroll.name,
                      designation: selectedEmpForPayroll.designation,
                      monthKey: monthFilter,
                      baseSalary: selectedEmpForPayroll.baseSalary,
                      bonus: newPayroll.bonus,
                      advanceDeduction: newPayroll.advanceDeduction,
                      otherDeductions: newPayroll.otherDeductions,
                      netSalary: net,
                      status: newPayroll.status,
                      paymentDate: newPayroll.status === 'paid' ? newPayroll.paymentDate : undefined,
                      slipNumber: `SAL-${institute.instituteCode.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
                    });
                    setPayrollModalOpen(false);
                    onNotify('success', `Payroll entry saved for ${selectedEmpForPayroll.name}.`);
                  }}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Employee</label>
                    <select
                      value={newPayroll.employeeId}
                      onChange={(e) => setNewPayroll({ ...newPayroll, employeeId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {employees.map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>
                          {e.name} — ₹{e.baseSalary.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Bonus (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={newPayroll.bonus}
                        onChange={(e) => setNewPayroll({ ...newPayroll, bonus: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Advance (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={newPayroll.advanceDeduction}
                        onChange={(e) =>
                          setNewPayroll({ ...newPayroll, advanceDeduction: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Deduction (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={newPayroll.otherDeductions}
                        onChange={(e) =>
                          setNewPayroll({ ...newPayroll, otherDeductions: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono-num"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex justify-between text-sm font-semibold">
                    <span>Net Payable:</span>
                    <span className="font-mono-num">
                      ₹
                      {Math.max(
                        0,
                        selectedEmpForPayroll.baseSalary +
                          newPayroll.bonus -
                          newPayroll.advanceDeduction -
                          newPayroll.otherDeductions
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPayrollModalOpen(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ backgroundColor: institute.primaryColor }}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                    >
                      Save Payroll
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
