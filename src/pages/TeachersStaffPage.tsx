import React, { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, Search, UserX, X } from 'lucide-react';
import type { ERPDatabase, Institute, StaffDesignation, StaffMember, Teacher } from '../types/erp';
import { EmptyState } from '../components/ui/Feedback';

export function TeachersStaffPage({
  db,
  institute,
  canManageTeachers,
  canManageStaff,
  canViewSalaries,
  onSaveTeacher,
  onSaveStaff,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  canManageTeachers: boolean;
  canManageStaff: boolean;
  canViewSalaries: boolean;
  onSaveTeacher: (teacher: Teacher, loginPassword?: string) => void;
  onSaveStaff: (staff: StaffMember) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [tab, setTab] = useState<'teachers' | 'staff'>(canManageTeachers ? 'teachers' : 'staff');
  const [search, setSearch] = useState('');

  const [teacherModal, setTeacherModal] = useState<Teacher | null>(null);
  const [teacherPassword, setTeacherPassword] = useState('demo');
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);

  const [staffModal, setStaffModal] = useState<StaffMember | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);

  const teachers = useMemo(
    () => db.teachers.filter((t) => t.instituteId === institute.id),
    [db.teachers, institute.id]
  );
  const staff = useMemo(
    () => db.staff.filter((s) => s.instituteId === institute.id),
    [db.staff, institute.id]
  );
  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );

  const activeStaffTotal =
    teachers.filter((t) => t.status === 'active').length +
    staff.filter((s) => s.status === 'active').length;

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q) ||
        t.subjects.join(',').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const openNewTeacher = () => {
    if (activeStaffTotal >= institute.staffLimit) {
      onNotify('error', `Staff limit reached (${institute.staffLimit}) on current SaaS plan.`);
      return;
    }
    setTeacherPassword('demo');
    setTeacherModal({
      id: `tch-${Date.now()}`,
      instituteId: institute.id,
      employeeId: `TCH-${institute.instituteCode.slice(0, 3)}-${10 + teachers.length + 1}`,
      fullName: '',
      photoUrl: '',
      mobile: '',
      whatsappNumber: '',
      email: '',
      address: '',
      qualification: '',
      experienceYears: 3,
      joiningDate: new Date().toISOString().slice(0, 10),
      subjects: ['Physics'],
      assignedClasses: ['Class 12'],
      assignedBatches: ['JEE Target 2027'],
      monthlySalary: 50000,
      status: 'active',
    });
  };

  const openNewStaff = () => {
    if (activeStaffTotal >= institute.staffLimit) {
      onNotify('error', `Staff limit reached (${institute.staffLimit}) on current SaaS plan.`);
      return;
    }
    setStaffModal({
      id: `stf-${Date.now()}`,
      instituteId: institute.id,
      employeeId: `STF-${institute.instituteCode.slice(0, 3)}-${10 + staff.length + 1}`,
      fullName: '',
      photoUrl: '',
      phone: '',
      whatsappNumber: '',
      email: '',
      address: '',
      designation: 'Receptionist',
      department: 'Front Office',
      joiningDate: new Date().toISOString().slice(0, 10),
      monthlySalary: 20000,
      status: 'active',
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {canManageTeachers && (
              <button
                type="button"
                onClick={() => setTab('teachers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  tab === 'teachers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Teachers ({teachers.length})
              </button>
            )}
            {canManageStaff && (
              <button
                type="button"
                onClick={() => setTab('staff')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  tab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Non-Teaching Staff ({staff.length})
              </button>
            )}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, subject..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          {tab === 'teachers' && canManageTeachers && (
            <button
              type="button"
              onClick={openNewTeacher}
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Teacher
            </button>
          )}
          {tab === 'staff' && canManageStaff && (
            <button
              type="button"
              onClick={openNewStaff}
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* TEACHERS TABLE */}
      {tab === 'teachers' && (
        filteredTeachers.length === 0 ? (
          <EmptyState
            title="No teachers registered"
            description="Add faculty members and assign subjects, classes, and batches."
            actionLabel="Add Teacher"
            onAction={openNewTeacher}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Subjects</th>
                  <th className="px-4 py-3">Assigned Batches</th>
                  <th className="px-4 py-3">Experience</th>
                  {canViewSalaries && <th className="px-4 py-3 text-right">Monthly Salary</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{t.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono-num">
                        {t.employeeId} · {t.mobile}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.subjects.join(', ')}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.assignedBatches.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">{t.experienceYears} yrs</td>
                    {canViewSalaries && (
                      <td className="px-4 py-3 text-right font-mono-num text-slate-900">
                        ₹{t.monthlySalary.toLocaleString('en-IN')}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          t.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {t.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewTeacher(t)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          title="View Profile & Schedule"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherModal({ ...t })}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit Teacher"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSaveTeacher({
                              ...t,
                              status: t.status === 'active' ? 'inactive' : 'active',
                            });
                            onNotify(
                              'info',
                              `${t.fullName} marked as ${t.status === 'active' ? 'Inactive' : 'Active'}.`
                            );
                          }}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded"
                          title="Toggle Active/Inactive"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* STAFF TABLE */}
      {tab === 'staff' && (
        filteredStaff.length === 0 ? (
          <EmptyState
            title="No staff members added"
            description="Register receptionists, accountants, managers, and support staff."
            actionLabel="Add Staff Member"
            onAction={openNewStaff}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Joining Date</th>
                  {canViewSalaries && <th className="px-4 py-3 text-right">Monthly Salary</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono-num">
                        {s.employeeId} · {s.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{s.designation}</td>
                    <td className="px-4 py-3 text-slate-600">{s.department}</td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-600">{s.joiningDate}</td>
                    {canViewSalaries && (
                      <td className="px-4 py-3 text-right font-mono-num text-slate-900">
                        ₹{s.monthlySalary.toLocaleString('en-IN')}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          s.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewStaff(s)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffModal({ ...s })}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Teacher Add/Edit Modal */}
      {teacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Teacher Profile & Login</h3>
              <button type="button" onClick={() => setTeacherModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teacherModal.fullName.trim() || !teacherModal.email.includes('@')) {
                  onNotify('error', 'Teacher name and valid email are required.');
                  return;
                }
                onSaveTeacher(teacherModal, teacherPassword);
                setTeacherModal(null);
                onNotify('success', 'Teacher record & login account saved.');
              }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={teacherModal.fullName}
                  onChange={(e) => setTeacherModal({ ...teacherModal, fullName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={teacherModal.employeeId}
                  onChange={(e) => setTeacherModal({ ...teacherModal, employeeId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={teacherModal.email}
                  onChange={(e) => setTeacherModal({ ...teacherModal, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Portal Password</label>
                <input
                  type="text"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Mobile *</label>
                <input
                  type="tel"
                  required
                  value={teacherModal.mobile}
                  onChange={(e) => setTeacherModal({ ...teacherModal, mobile: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Qualification *</label>
                <input
                  type="text"
                  required
                  value={teacherModal.qualification}
                  onChange={(e) => setTeacherModal({ ...teacherModal, qualification: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={teacherModal.subjects.join(', ')}
                  onChange={(e) =>
                    setTeacherModal({
                      ...teacherModal,
                      subjects: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Assigned Batches (comma-separated)</label>
                <input
                  type="text"
                  value={teacherModal.assignedBatches.join(', ')}
                  onChange={(e) =>
                    setTeacherModal({
                      ...teacherModal,
                      assignedBatches: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  value={teacherModal.experienceYears}
                  onChange={(e) => setTeacherModal({ ...teacherModal, experienceYears: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
              </div>
              {canViewSalaries && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={teacherModal.monthlySalary}
                    onChange={(e) => setTeacherModal({ ...teacherModal, monthlySalary: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
              )}
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTeacherModal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Profile & Teaching Schedule Modal */}
      {viewTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">{viewTeacher.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {viewTeacher.employeeId} · {viewTeacher.qualification} · {viewTeacher.experienceYears} yrs exp
                </p>
              </div>
              <button type="button" onClick={() => setViewTeacher(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>Subjects: {viewTeacher.subjects.join(', ')}</p>
              <p>Assigned Batches: {viewTeacher.assignedBatches.join(', ')}</p>
              <p>Contact: {viewTeacher.mobile} · {viewTeacher.email}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">Teaching Schedule</h4>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {db.timetable
                  .filter((slot) => slot.teacherId === viewTeacher.id)
                  .map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between px-3 py-2">
                      <span>
                        {slot.dayOfWeek} · {slot.startTime}–{slot.endTime} · {slot.subject}
                      </span>
                      <span className="text-slate-500">
                        {slot.batchName} ({slot.roomNumber})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                Assigned Students ({students.filter((s) => viewTeacher.assignedBatches.includes(s.batchName)).length})
              </h4>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                {students
                  .filter((s) => viewTeacher.assignedBatches.includes(s.batchName))
                  .map((s) => (
                    <span key={s.id} className="border border-slate-200 rounded px-2 py-1">
                      {s.fullName} ({s.batchName})
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Add/Edit Modal */}
      {staffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Staff Member Details</h3>
              <button type="button" onClick={() => setStaffModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!staffModal.fullName.trim()) return;
                onSaveStaff(staffModal);
                setStaffModal(null);
                onNotify('success', 'Staff member saved.');
              }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffModal.fullName}
                  onChange={(e) => setStaffModal({ ...staffModal, fullName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={staffModal.employeeId}
                  onChange={(e) => setStaffModal({ ...staffModal, employeeId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Designation *</label>
                <select
                  value={staffModal.designation}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, designation: e.target.value as StaffDesignation })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {(['Receptionist', 'Accountant', 'Office Assistant', 'Manager', 'Security Staff', 'Other'] as const).map(
                    (d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Department</label>
                <input
                  type="text"
                  value={staffModal.department}
                  onChange={(e) => setStaffModal({ ...staffModal, department: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Phone *</label>
                <input
                  type="tel"
                  required
                  value={staffModal.phone}
                  onChange={(e) => setStaffModal({ ...staffModal, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={staffModal.email}
                  onChange={(e) => setStaffModal({ ...staffModal, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {canViewSalaries && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={staffModal.monthlySalary}
                    onChange={(e) => setStaffModal({ ...staffModal, monthlySalary: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700">Status</label>
                <select
                  value={staffModal.status}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, status: e.target.value as 'active' | 'inactive' })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {viewStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-3">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">{viewStaff.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {viewStaff.designation} · {viewStaff.department}
                </p>
              </div>
              <button type="button" onClick={() => setViewStaff(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-slate-700 space-y-1.5">
              <p>Employee ID: {viewStaff.employeeId}</p>
              <p>Phone: {viewStaff.phone} · WhatsApp: {viewStaff.whatsappNumber || viewStaff.phone}</p>
              <p>Email: {viewStaff.email}</p>
              <p>Address: {viewStaff.address}</p>
              <p>Joining Date: {viewStaff.joiningDate}</p>
              {canViewSalaries && <p>Monthly Salary: ₹{viewStaff.monthlySalary.toLocaleString('en-IN')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
