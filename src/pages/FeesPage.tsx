import React, { useMemo, useState } from 'react';
import { Bell, CreditCard, Download, Plus, Search, X } from 'lucide-react';
import type { ERPDatabase, FeePayment, FeeRecord, Institute } from '../types/erp';
import { downloadCsv, downloadFeeReceiptPdf, downloadGenericTablePdf } from '../lib/exports';
import { EmptyState } from '../components/ui/Feedback';

export function FeesPage({
  db,
  institute,
  actorName,
  onCreateFeeRecord,
  onRecordPayment,
  onSendFeeReminder,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  actorName: string;
  onCreateFeeRecord: (record: FeeRecord) => void;
  onRecordPayment: (feeId: string, payment: FeePayment) => void;
  onSendFeeReminder: (feeId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'partial' | 'pending' | 'overdue'>('ALL');

  const [newFeeOpen, setNewFeeOpen] = useState(false);
  const [payModalFee, setPayModalFee] = useState<FeeRecord | null>(null);

  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const feeRecords = useMemo(
    () => db.feeRecords.filter((f) => f.instituteId === institute.id),
    [db.feeRecords, institute.id]
  );
  const payments = useMemo(
    () => db.feePayments.filter((p) => p.instituteId === institute.id),
    [db.feePayments, institute.id]
  );

  const [newFeeForm, setNewFeeForm] = useState({
    studentId: students[0]?.id || '',
    feeType: 'monthly' as FeeRecord['feeType'],
    title: `Monthly Tuition Fee (${today.slice(0, 7)})`,
    baseAmount: students[0]?.monthlyFee || 8000,
    discount: 0,
    lateFee: 0,
    dueDate: today,
  });

  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'upi' as FeePayment['paymentMethod'],
    referenceNote: '',
    paymentDate: today,
  });

  const enriched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feeRecords
      .map((f) => {
        const stu = students.find((s) => s.id === f.studentId);
        const net = Math.max(0, f.baseAmount - f.discount + f.lateFee);
        const pending = Math.max(0, net - f.paidAmount);
        const latestPayment = payments
          .filter((p) => p.feeRecordId === f.id)
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
        return { fee: f, student: stu, net, pending, latestPayment };
      })
      .filter((row) => {
        if (!row.student) return false;
        if (statusFilter !== 'ALL' && row.fee.status !== statusFilter) return false;
        if (!q) return true;
        return (
          row.student.fullName.toLowerCase().includes(q) ||
          row.student.studentCode.toLowerCase().includes(q) ||
          row.fee.title.toLowerCase().includes(q)
        );
      });
  }, [feeRecords, students, payments, search, statusFilter]);

  const totalCollected = feeRecords.reduce((s, f) => s + f.paidAmount, 0);
  const totalPending = feeRecords.reduce(
    (s, f) => s + Math.max(0, f.baseAmount - f.discount + f.lateFee - f.paidAmount),
    0
  );

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Collected (Manual Recorded)</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pending & Overdue Balance</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-700 tabular-nums">
            ₹{totalPending.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Receipts Issued</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {payments.length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or fee item..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Fee Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadCsv(
                `${institute.instituteCode}_Fee_Ledger.csv`,
                ['Student', 'Batch', 'Fee Title', 'Net Fee', 'Paid', 'Pending', 'Due Date', 'Status'],
                enriched.map((r) => [
                  r.student?.fullName || '',
                  r.student?.batchName || '',
                  r.fee.title,
                  r.net,
                  r.fee.paidAmount,
                  r.pending,
                  r.fee.dueDate,
                  r.fee.status,
                ])
              );
              onNotify('success', 'Fee ledger CSV downloaded.');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              downloadGenericTablePdf(
                institute,
                'FEE COLLECTION & PENDING DUES REPORT',
                `${institute.instituteCode}_Fees_Report.pdf`,
                ['Student', 'Title', 'Net', 'Paid', 'Pending', 'Status'],
                enriched.map((r) => [
                  r.student?.fullName || '',
                  r.fee.title,
                  `INR ${r.net}`,
                  `INR ${r.fee.paidAmount}`,
                  `INR ${r.pending}`,
                  r.fee.status.toUpperCase(),
                ])
              );
              onNotify('success', 'Branded fee collection PDF downloaded.');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            PDF Report
          </button>
          <button
            type="button"
            onClick={() => setNewFeeOpen(true)}
            style={{ backgroundColor: institute.primaryColor }}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Fee Invoice
          </button>
        </div>
      </div>

      {/* Fee Table */}
      {enriched.length === 0 ? (
        <EmptyState
          title="No fee records match filter"
          description="Create a monthly, admission, or course fee invoice for a student."
          actionLabel="Add Fee Invoice"
          onAction={() => setNewFeeOpen(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Fee Description</th>
                <th className="px-4 py-3 text-right">Net Fee</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Status / Due</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map(({ fee, student, net, pending, latestPayment }) => (
                <tr key={fee.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{student?.fullName}</p>
                    <p className="text-xs text-slate-500">{student?.batchName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{fee.title}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {fee.feeType} · Disc ₹{fee.discount} · Late ₹{fee.lateFee}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num">₹{net.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-emerald-700">
                    ₹{fee.paidAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">
                    ₹{pending.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`block text-xs font-semibold uppercase ${
                        fee.status === 'paid'
                          ? 'text-emerald-700'
                          : fee.status === 'overdue'
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {fee.status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-num">Due {fee.dueDate}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {pending > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalFee(fee);
                              setPayForm({
                                amount: pending,
                                paymentMethod: 'upi',
                                referenceNote: '',
                                paymentDate: today,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            <CreditCard className="h-3 w-3" />
                            Record Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendFeeReminder(fee.id)}
                            title="Queue Fee Reminder"
                            className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {latestPayment && student && (
                        <button
                          type="button"
                          onClick={() => {
                            downloadFeeReceiptPdf(institute, student, fee, latestPayment);
                            onNotify('success', `Branded Fee Receipt ${latestPayment.receiptNumber} downloaded.`);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3 w-3" />
                          Receipt PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Fee Invoice Modal */}
      {newFeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Create Fee Invoice</h3>
              <button type="button" onClick={() => setNewFeeOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newFeeForm.studentId || newFeeForm.baseAmount <= 0) {
                  onNotify('error', 'Select student and valid fee amount.');
                  return;
                }
                onCreateFeeRecord({
                  id: `fee-${Date.now()}`,
                  instituteId: institute.id,
                  studentId: newFeeForm.studentId,
                  feeType: newFeeForm.feeType,
                  title: newFeeForm.title,
                  baseAmount: newFeeForm.baseAmount,
                  discount: newFeeForm.discount,
                  lateFee: newFeeForm.lateFee,
                  paidAmount: 0,
                  dueDate: newFeeForm.dueDate,
                  status: 'pending',
                });
                setNewFeeOpen(false);
                onNotify('success', 'Fee invoice added.');
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Student</label>
                <select
                  value={newFeeForm.studentId}
                  onChange={(e) => {
                    const stu = students.find((s) => s.id === e.target.value);
                    setNewFeeForm({
                      ...newFeeForm,
                      studentId: e.target.value,
                      baseAmount: stu?.monthlyFee || newFeeForm.baseAmount,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.batchName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Fee Type</label>
                  <select
                    value={newFeeForm.feeType}
                    onChange={(e) =>
                      setNewFeeForm({ ...newFeeForm, feeType: e.target.value as FeeRecord['feeType'] })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="monthly">Monthly Fee</option>
                    <option value="admission">Admission Fee</option>
                    <option value="course">Course Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={newFeeForm.dueDate}
                    onChange={(e) => setNewFeeForm({ ...newFeeForm, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  value={newFeeForm.title}
                  onChange={(e) => setNewFeeForm({ ...newFeeForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={newFeeForm.baseAmount}
                    onChange={(e) => setNewFeeForm({ ...newFeeForm, baseAmount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newFeeForm.discount}
                    onChange={(e) => setNewFeeForm({ ...newFeeForm, discount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Late Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newFeeForm.lateFee}
                    onChange={(e) => setNewFeeForm({ ...newFeeForm, lateFee: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono-num"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewFeeOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Payment Recording Modal */}
      {payModalFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Record Manual Fee Payment</h3>
              <button type="button" onClick={() => setPayModalFee(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Logs offline Cash, UPI, or Bank Transfer verified by your office (no online payment gateway charge).
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (payForm.amount <= 0) {
                  onNotify('error', 'Enter payment amount greater than zero.');
                  return;
                }
                onRecordPayment(payModalFee.id, {
                  id: `pay-${Date.now()}`,
                  instituteId: institute.id,
                  feeRecordId: payModalFee.id,
                  studentId: payModalFee.studentId,
                  receiptNumber: `RCP-${institute.instituteCode.slice(0, 3)}-${Date.now().toString().slice(-5)}`,
                  amount: payForm.amount,
                  paymentMethod: payForm.paymentMethod,
                  referenceNote: payForm.referenceNote || 'Verified at institute office',
                  paymentDate: payForm.paymentDate,
                  recordedBy: actorName,
                });
                setPayModalFee(null);
                onNotify('success', 'Payment recorded and receipt ready for PDF download.');
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Amount Received (₹) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Payment Mode</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) =>
                      setPayForm({
                        ...payForm,
                        paymentMethod: e.target.value as FeePayment['paymentMethod'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="upi">UPI (Manual Verified)</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Payment Date</label>
                  <input
                    type="date"
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Transaction Ref / Note</label>
                <input
                  type="text"
                  value={payForm.referenceNote}
                  onChange={(e) => setPayForm({ ...payForm, referenceNote: e.target.value })}
                  placeholder="e.g. GPay UTR #40291..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalFee(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Payment & Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
