import React, { useMemo, useState } from 'react';
import { Download, Edit2, Eye, Plus, Search, Trash2, Upload, UserCheck, X } from 'lucide-react';
import type { ERPDatabase, Institute, ParentAccount, Student } from '../types/erp';
import { calculateStudentAttendanceSummary, computeTestAnalytics } from '../lib/erpStore';
import { downloadCsv } from '../lib/exports';
import { ConfirmDialog, EmptyState } from '../components/ui/Feedback';

export function StudentsPage({
  db,
  institute,
  canEdit,
  onSaveStudent,
  onDeleteStudent,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  canEdit: boolean;
  onSaveStudent: (student: Student, newParent?: ParentAccount) => void;
  onDeleteStudent: (studentId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'ALL'>('active');

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'exams' | 'fees' | 'homework'>('overview');
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);

  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id),
    [db.students, institute.id]
  );
  const parents = useMemo(
    () => db.parents.filter((p) => p.instituteId === institute.id),
    [db.parents, institute.id]
  );
  const policy = db.attendancePolicies.find((p) => p.instituteId === institute.id);

  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.className))), [students]);
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batchName))), [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;
      if (batchFilter !== 'ALL' && s.batchName !== batchFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.parentMobile.includes(q)
      );
    });
  }, [students, statusFilter, classFilter, batchFilter, search]);

  const emptyDraft = (): Student => ({
    id: `stu-${Date.now()}`,
    instituteId: institute.id,
    parentId: parents[0]?.id || '',
    studentCode: `${institute.instituteCode.slice(0, 3).toUpperCase()}-2026-${100 + students.length + 1}`,
    rollNumber: `R-${100 + students.length + 1}`,
    fullName: '',
    photoUrl: '',
    dateOfBirth: '2009-06-15',
    gender: 'Male',
    className: classes[0] || 'Class 12',
    batchName: batches[0] || 'JEE Target 2027',
    courseName: 'IIT-JEE Main & Advanced',
    admissionDate: new Date().toISOString().slice(0, 10),
    studentMobile: '',
    studentWhatsapp: '',
    parentName: '',
    parentMobile: '',
    parentWhatsapp: '',
    parentEmail: '',
    address: '',
    monthlyFee: 8000,
    admissionFee: 5000,
    status: 'active',
  });

  const [form, setForm] = useState<Student>(emptyDraft);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');

  const openAdd = () => {
    if (students.filter((s) => s.status === 'active').length >= institute.studentLimit) {
      onNotify(
        'error',
        `Plan limit reached (${institute.studentLimit} students on ${institute.planTier.toUpperCase()} plan).`
      );
      return;
    }
    setEditingStudent(null);
    setLinkMode('new');
    setForm(emptyDraft());
    setIsAddModalOpen(true);
  };

  const openEdit = (stu: Student) => {
    setEditingStudent(stu);
    setLinkMode(stu.parentId ? 'existing' : 'new');
    setForm({ ...stu });
    setIsAddModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((p) => ({ ...p, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.className.trim() || !form.batchName.trim()) {
      onNotify('error', 'Student name, class, and batch are required.');
      return;
    }
    const duplicateCode = students.some(
      (s) => s.studentCode.toLowerCase() === form.studentCode.trim().toLowerCase() && s.id !== form.id
    );
    if (duplicateCode) {
      onNotify('error', 'A student with this Student ID already exists in your institute.');
      return;
    }

    let finalStudent = { ...form };
    let createdParent: ParentAccount | undefined;

    if (linkMode === 'existing' && form.parentId) {
      const existingParent = parents.find((p) => p.id === form.parentId);
      if (existingParent) {
        finalStudent.parentName = existingParent.fullName;
        finalStudent.parentMobile = existingParent.mobile;
        finalStudent.parentWhatsapp = existingParent.whatsappNumber;
        finalStudent.parentEmail = existingParent.email;
      }
    } else {
      if (!form.parentName.trim() || form.parentMobile.replace(/\D/g, '').length < 10) {
        onNotify('error', 'Parent name and valid 10-digit parent mobile number are required.');
        return;
      }
      const newParentId = `par-${Date.now()}`;
      createdParent = {
        id: newParentId,
        instituteId: institute.id,
        fullName: form.parentName.trim(),
        mobile: form.parentMobile.trim(),
        whatsappNumber: form.parentWhatsapp.trim() || form.parentMobile.trim(),
        email: form.parentEmail.trim(),
        address: form.address.trim(),
      };
      finalStudent.parentId = newParentId;
    }

    onSaveStudent(finalStudent, createdParent);
    setIsAddModalOpen(false);
    onNotify('success', editingStudent ? 'Student record updated.' : 'New student admitted successfully.');
  };

  const handleExportStudents = () => {
    downloadCsv(
      `${institute.instituteCode}_Students.csv`,
      ['Student ID', 'Roll No', 'Full Name', 'Class', 'Batch', 'Course', 'Parent Name', 'Parent Mobile', 'Monthly Fee', 'Status'],
      filtered.map((s) => [
        s.studentCode,
        s.rollNumber,
        s.fullName,
        s.className,
        s.batchName,
        s.courseName,
        s.parentName,
        s.parentMobile,
        s.monthlyFee,
        s.status,
      ])
    );
    onNotify('success', 'Student directory CSV downloaded.');
  };

  return (
    <div className="space-y-5">
      {/* Action & Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, roll no, parent..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="ALL">All Batches</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'archived' | 'ALL')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
            <option value="ALL">All Status</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportStudents}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={openAdd}
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No students match your filters"
          description="Try clearing the search query or admit a new student to this batch."
          actionLabel={canEdit ? 'Admit New Student' : undefined}
          onAction={canEdit ? openAdd : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class & Batch</th>
                <th className="px-4 py-3">Parent / Guardian</th>
                <th className="px-4 py-3 text-right">Attendance</th>
                <th className="px-4 py-3 text-right">Monthly Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((stu) => {
                const att = calculateStudentAttendanceSummary(stu.id, db.studentAttendance, policy);
                const siblingCount = students.filter((s) => s.parentId === stu.parentId && s.parentId).length;
                return (
                  <tr key={stu.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {stu.photoUrl ? (
                          <img
                            src={stu.photoUrl}
                            alt={stu.fullName}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
                            {stu.fullName
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{stu.fullName}</p>
                          <p className="text-xs text-slate-500 font-mono-num">
                            {stu.studentCode} · Roll {stu.rollNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{stu.className}</p>
                      <p className="text-xs text-slate-500">{stu.batchName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">
                        {stu.parentName}
                        {siblingCount > 1 && (
                          <span className="ml-1.5 text-[11px] text-blue-700 font-medium">
                            ({siblingCount} children)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-mono-num">{stu.parentMobile}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num">
                      <span className={att.isBelowThreshold ? 'font-semibold text-red-600' : 'text-slate-900'}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-900">
                      ₹{stu.monthlyFee.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          stu.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {stu.status === 'active' ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingStudent(stu);
                            setProfileTab('overview');
                          }}
                          title="View Student Profile"
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(stu)}
                              title="Edit Student"
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(stu)}
                              title="Archive / Delete Student"
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingStudent ? `Edit Student — ${editingStudent.fullName}` : 'Student Admission Form'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-5 space-y-5">
              <div className="flex items-center gap-4">
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Student preview"
                    className="h-14 w-14 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                    Photo
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Profile Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Student Unique ID *</label>
                  <input
                    type="text"
                    required
                    value={form.studentCode}
                    onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={form.rollNumber}
                    onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as Student['gender'] })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Class *</label>
                  <input
                    type="text"
                    required
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    placeholder="Class 12"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Batch *</label>
                  <input
                    type="text"
                    required
                    value={form.batchName}
                    onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                    placeholder="JEE Target 2027"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Course</label>
                  <input
                    type="text"
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Admission Date</label>
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Student Mobile</label>
                  <input
                    type="tel"
                    value={form.studentMobile}
                    onChange={(e) => setForm({ ...form, studentMobile: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Student WhatsApp</label>
                  <input
                    type="tel"
                    value={form.studentWhatsapp}
                    onChange={(e) => setForm({ ...form, studentWhatsapp: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Multi-child Parent Linkage */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">Parent Account Linking (Multi-Child Support)</p>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setLinkMode('new')}
                      className={`px-2.5 py-1 text-xs rounded-md ${
                        linkMode === 'new' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      New Parent
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkMode('existing')}
                      className={`px-2.5 py-1 text-xs rounded-md ${
                        linkMode === 'existing' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      Link Existing Parent
                    </button>
                  </div>
                </div>

                {linkMode === 'existing' && parents.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Select Registered Parent</label>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {parents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} · {p.mobile} ({p.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Parent Name *</label>
                      <input
                        type="text"
                        required={linkMode === 'new'}
                        value={form.parentName}
                        onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Parent Mobile *</label>
                      <input
                        type="tel"
                        required={linkMode === 'new'}
                        value={form.parentMobile}
                        onChange={(e) => setForm({ ...form, parentMobile: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Parent WhatsApp</label>
                      <input
                        type="tel"
                        value={form.parentWhatsapp}
                        onChange={(e) => setForm({ ...form, parentWhatsapp: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Parent Email</label>
                      <input
                        type="email"
                        value={form.parentEmail}
                        onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyFee}
                    onChange={(e) => setForm({ ...form, monthlyFee: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'archived' })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  <UserCheck className="h-4 w-4" />
                  {editingStudent ? 'Save Changes' : 'Admit Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Student Profile Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">{viewingStudent.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono-num mt-0.5">
                  {viewingStudent.studentCode} · Roll {viewingStudent.rollNumber} · {viewingStudent.className} ·{' '}
                  {viewingStudent.batchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
              {(
                [
                  ['overview', 'Overview & Parent'],
                  ['attendance', 'Attendance History'],
                  ['exams', 'Exam History'],
                  ['fees', 'Fee History'],
                  ['homework', 'Homework'],
                ] as const
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setProfileTab(tabId)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    profileTab === tabId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {profileTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                    <p className="font-semibold text-slate-900">Academic & Personal Details</p>
                    <p className="text-xs text-slate-600">Course: {viewingStudent.courseName}</p>
                    <p className="text-xs text-slate-600">Admission Date: {viewingStudent.admissionDate}</p>
                    <p className="text-xs text-slate-600">Date of Birth: {viewingStudent.dateOfBirth}</p>
                    <p className="text-xs text-slate-600">Student Mobile: {viewingStudent.studentMobile || 'N/A'}</p>
                    <p className="text-xs text-slate-600">Address: {viewingStudent.address}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                    <p className="font-semibold text-slate-900">Parent / Guardian Information</p>
                    <p className="text-xs text-slate-600">Parent Name: {viewingStudent.parentName}</p>
                    <p className="text-xs text-slate-600">Mobile: {viewingStudent.parentMobile}</p>
                    <p className="text-xs text-slate-600">WhatsApp: {viewingStudent.parentWhatsapp}</p>
                    <p className="text-xs text-slate-600">Email: {viewingStudent.parentEmail}</p>
                    <p className="text-xs text-slate-600">
                      Linked Siblings:{' '}
                      {students
                        .filter((s) => s.parentId === viewingStudent.parentId && s.id !== viewingStudent.id)
                        .map((s) => s.fullName)
                        .join(', ') || 'None'}
                    </p>
                  </div>
                </div>
              )}

              {profileTab === 'attendance' && (
                <div className="space-y-3">
                  {(() => {
                    const sum = calculateStudentAttendanceSummary(
                      viewingStudent.id,
                      db.studentAttendance,
                      policy
                    );
                    const logs = db.studentAttendance
                      .filter((a) => a.studentId === viewingStudent.id)
                      .sort((a, b) => b.date.localeCompare(a.date));
                    return (
                      <>
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div className="rounded-lg border border-slate-200 p-3">
                            <span className="text-slate-500">Attendance %</span>
                            <p className="mt-1 text-base font-bold text-slate-900 tabular-nums">{sum.percentage}%</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <span className="text-slate-500">Present + Late</span>
                            <p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">
                              {sum.presentDays + sum.lateDays}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <span className="text-slate-500">Absent</span>
                            <p className="mt-1 text-base font-bold text-red-600 tabular-nums">{sum.absentDays}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <span className="text-slate-500">Approved Leave</span>
                            <p className="mt-1 text-base font-bold text-amber-700 tabular-nums">{sum.leaveDays}</p>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                          {logs.map((l) => (
                            <div key={l.id} className="flex items-center justify-between px-4 py-2">
                              <span className="font-mono-num text-slate-700">{l.date}</span>
                              <span className="font-semibold uppercase text-slate-900">{l.status}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {profileTab === 'exams' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Test Name</th>
                        <th className="px-3 py-2">Subject</th>
                        <th className="px-3 py-2 text-right">Marks</th>
                        <th className="px-3 py-2 text-right">%</th>
                        <th className="px-3 py-2 text-right">Rank</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.tests
                        .filter((t) => t.instituteId === institute.id && t.batchName === viewingStudent.batchName)
                        .map((t) => {
                          const an = computeTestAnalytics(t, students, db.tests, db.testMarks);
                          const res = an.results.find((r) => r.studentId === viewingStudent.id);
                          return (
                            <tr key={t.id}>
                              <td className="px-3 py-2 font-medium text-slate-900">{t.name}</td>
                              <td className="px-3 py-2 text-slate-600">{t.subject}</td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {res?.isAbsent ? 'ABSENT' : res?.obtainedMarks !== null ? `${res?.obtainedMarks}/${t.maxMarks}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {res?.percentage !== null && res?.percentage !== undefined ? `${res.percentage}%` : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {res?.rank ? `#${res.rank}` : '-'}
                              </td>
                              <td className="px-3 py-2">
                                {t.status === 'draft' ? 'Draft (Unpublished)' : res?.isAbsent ? 'Absent' : res?.passed ? 'Pass' : 'Fail'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {profileTab === 'fees' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Fee Item</th>
                        <th className="px-3 py-2 text-right">Net Fee</th>
                        <th className="px-3 py-2 text-right">Paid</th>
                        <th className="px-3 py-2 text-right">Due Date</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.feeRecords
                        .filter((f) => f.studentId === viewingStudent.id)
                        .map((f) => (
                          <tr key={f.id}>
                            <td className="px-3 py-2 font-medium text-slate-900">{f.title}</td>
                            <td className="px-3 py-2 text-right font-mono-num">
                              ₹{(f.baseAmount - f.discount + f.lateFee).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono-num">
                              ₹{f.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono-num">{f.dueDate}</td>
                            <td className="px-3 py-2 uppercase font-semibold">{f.status}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {profileTab === 'homework' && (
                <div className="space-y-2 text-xs">
                  {db.homework
                    .filter((h) => h.instituteId === institute.id && h.batchName === viewingStudent.batchName)
                    .map((h) => {
                      const sub = db.homeworkSubmissions.find(
                        (s) => s.homeworkId === h.id && s.studentId === viewingStudent.id
                      );
                      return (
                        <div key={h.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{h.title}</p>
                            <p className="text-slate-500">{h.subject} · Due {h.deadline}</p>
                          </div>
                          <span className={`font-semibold ${sub?.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {sub?.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Student Record?"
        message={`This will permanently remove ${confirmDelete?.fullName} (${confirmDelete?.studentCode}) from active records. You can alternatively Edit and set status to Archived.`}
        confirmLabel="Delete Student"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            onDeleteStudent(confirmDelete.id);
            onNotify('info', `${confirmDelete.fullName} removed.`);
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
