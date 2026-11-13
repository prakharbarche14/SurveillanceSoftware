import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  RotateCcw,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { Institute, SessionState } from '../../types/erp';
import { getRolePermissions, ROLE_LABELS } from '../../lib/erpStore';
import { BrandLogo } from '../ui/Feedback';

export type NavSectionId =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'exams'
  | 'teachers_staff'
  | 'staff_payroll'
  | 'fees'
  | 'timetable_homework'
  | 'notifications'
  | 'reports'
  | 'branding'
  | 'parent_portal'
  | 'student_portal'
  | 'super_admin';

interface NavItem {
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

export function AppShell({
  session,
  institute,
  activeSection,
  onSelectSection,
  onLogout,
  onResetDemo,
  children,
}: {
  session: SessionState;
  institute?: Institute;
  activeSection: NavSectionId;
  onSelectSection: (id: NavSectionId) => void;
  onLogout: () => void;
  onResetDemo: () => void;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const perms = getRolePermissions(session.role);

  const primaryColor = institute?.primaryColor || '#0F2A56';
  const secondaryColor = institute?.secondaryColor || '#1D4ED8';
  const brandTitle = institute ? institute.name : 'EduTrack SaaS Platform';

  const allNavItems: NavItem[] = [
    { id: 'super_admin', label: 'SaaS Super Admin', icon: ShieldAlert, visible: perms.canAccessSuperAdmin },
    { id: 'parent_portal', label: 'Parent Portal', icon: Users, visible: perms.isParentPortal },
    { id: 'student_portal', label: 'Student Portal', icon: GraduationCap, visible: perms.isStudentPortal },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: perms.canViewDashboard },
    { id: 'students', label: 'Students', icon: GraduationCap, visible: perms.canViewStudents },
    { id: 'attendance', label: 'Student Attendance', icon: CheckSquare, visible: perms.canMarkAttendance || perms.canManageAttendancePolicy },
    { id: 'exams', label: 'Exams & Marks', icon: ClipboardList, visible: perms.canManageExams },
    { id: 'teachers_staff', label: 'Teachers & Staff', icon: Users, visible: perms.canManageTeachers || perms.canManageStaff },
    { id: 'staff_payroll', label: 'Staff Attendance & Payroll', icon: Wallet, visible: perms.canManageStaffAttendance || perms.canAccessPayroll },
    { id: 'fees', label: 'Fees & Receipts', icon: CreditCard, visible: perms.canManageFees },
    { id: 'timetable_homework', label: 'Timetable & Homework', icon: CalendarDays, visible: perms.canManageTimetableHomework },
    { id: 'notifications', label: 'Notifications & Settings', icon: Bell, visible: perms.canManageNotifications },
    { id: 'reports', label: 'Reports & Exports', icon: FileDown, visible: perms.canViewReports },
    { id: 'branding', label: 'Institute Branding', icon: Palette, visible: perms.canManageBranding },
  ];
  const navItems: NavItem[] = allNavItems.filter((item) => item.visible);

  const activeLabel = navItems.find((n) => n.id === activeSection)?.label || 'Workspace';

  const renderNavLinks = (onAfterClick?: () => void) => (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectSection(item.id);
              onAfterClick?.();
            }}
            style={active ? { backgroundColor: primaryColor } : undefined}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
              active
                ? 'text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col lg:flex-row"
      style={
        {
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white no-print">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
          <BrandLogo
            src={institute?.logoUrl}
            alt={brandTitle}
            primaryColor={primaryColor}
            sizeClass="h-9 w-9"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-slate-900 truncate">{brandTitle}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {institute ? institute.instituteCode : 'Platform Control'}
            </p>
          </div>
        </div>

        {renderNavLinks()}

        <div className="border-t border-slate-200 p-3 space-y-2">
          <button
            type="button"
            onClick={onResetDemo}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo Data
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/45" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white border-r border-slate-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo
                  src={institute?.logoUrl}
                  alt={brandTitle}
                  primaryColor={primaryColor}
                  sizeClass="h-8 w-8"
                />
                <span className="font-display text-sm font-bold text-slate-900 truncate">{brandTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(() => setMobileMenuOpen(false))}
            <div className="border-t border-slate-200 p-3 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onResetDemo();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Data
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                {brandTitle} <span aria-hidden="true">/</span> {activeLabel}
              </p>
              <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900 whitespace-nowrap">{session.userName}</p>
              <p className="text-xs text-slate-500 whitespace-nowrap">{ROLE_LABELS[session.role]}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Switch User
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Compact Mobile Bottom Quick Navigation (Only on mobile, <= 56px height to respect 15% cap) */}
      {navItems.length > 1 && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white flex items-center justify-around h-14 px-2 no-print">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-medium min-w-[60px] ${
                  active ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate max-w-[68px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-medium text-slate-500 min-w-[60px]"
          >
            <BookOpen className="h-4 w-4" />
            <span>More</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// Keep unused icon import clean if needed
export { BarChart3 };
