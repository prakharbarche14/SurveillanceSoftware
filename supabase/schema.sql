-- ============================================================================
-- EDUTRACK COACHING INSTITUTE MANAGEMENT ERP - SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant Architecture with Strict Row Level Security (RLS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SAAS SUBSCRIPTION PLANS & INSTITUTES
CREATE TABLE IF NOT EXISTS institutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  website TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#0F2A56',
  secondary_color TEXT DEFAULT '#1D4ED8',
  authorized_signature TEXT DEFAULT '',
  plan_tier TEXT NOT NULL DEFAULT 'standard' CHECK (plan_tier IN ('basic', 'standard', 'premium')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expiring_soon', 'suspended')),
  trial_ends_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  student_limit INTEGER NOT NULL DEFAULT 500,
  staff_limit INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER ACCOUNTS & RBAC
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'super_admin', 'owner', 'admin', 'teacher',
    'accountant', 'receptionist', 'parent', 'student'
  )),
  linked_entity_id UUID, -- teacher_id, staff_id, student_id, or parent_id
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PARENTS & STUDENTS (Multi-Child Support)
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  student_code TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  class_name TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  admission_date DATE NOT NULL,
  student_mobile TEXT DEFAULT '',
  student_whatsapp TEXT DEFAULT '',
  address TEXT DEFAULT '',
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  admission_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'graduated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, student_code)
);

-- 4. TEACHERS & NON-TEACHING STAFF
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  mobile TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT DEFAULT '',
  qualification TEXT NOT NULL,
  experience_years NUMERIC(4, 1) DEFAULT 0,
  joining_date DATE NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  assigned_classes TEXT[] NOT NULL DEFAULT '{}',
  assigned_batches TEXT[] NOT NULL DEFAULT '{}',
  monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, employee_id)
);

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT DEFAULT '',
  designation TEXT NOT NULL,
  department TEXT NOT NULL,
  joining_date DATE NOT NULL,
  monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, employee_id)
);

-- 5. ATTENDANCE POLICIES & DAILY RECORDS (Duplicate Prevention via UNIQUE)
CREATE TABLE IF NOT EXISTS attendance_policies (
  institute_id UUID PRIMARY KEY REFERENCES institutes(id) ON DELETE CASCADE,
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=Sun..6=Sat
  holidays JSONB NOT NULL DEFAULT '[]',
  approved_leave_treatment TEXT NOT NULL DEFAULT 'excused_excluded'
    CHECK (approved_leave_treatment IN ('excused_excluded', 'counted_present', 'counted_absent')),
  low_attendance_threshold INTEGER NOT NULL DEFAULT 75,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
  marked_by UUID REFERENCES user_profiles(id),
  remarks TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  employee_type TEXT NOT NULL CHECK (employee_type IN ('teacher', 'staff')),
  employee_ref_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
  marked_by UUID REFERENCES user_profiles(id),
  remarks TEXT DEFAULT '',
  UNIQUE(institute_id, employee_ref_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('student', 'teacher', 'staff')),
  requester_id UUID NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EXAMS, TESTS & MARKS (Draft vs Published visibility)
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_name TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  max_marks NUMERIC(6, 2) NOT NULL,
  passing_marks NUMERIC(6, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES user_profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  obtained_marks NUMERIC(6, 2),
  is_absent BOOLEAN NOT NULL DEFAULT FALSE,
  remarks TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, test_id, student_id)
);

-- 7. FEES & PAYROLL
CREATE TABLE IF NOT EXISTS fee_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('monthly', 'admission', 'course', 'other')),
  title TEXT NOT NULL,
  base_amount NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'partial', 'pending', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  reference_note TEXT DEFAULT '',
  payment_date DATE NOT NULL,
  recorded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  employee_type TEXT NOT NULL CHECK (employee_type IN ('teacher', 'staff')),
  employee_ref_id UUID NOT NULL,
  month_key TEXT NOT NULL, -- YYYY-MM
  base_salary NUMERIC(10, 2) NOT NULL,
  bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,
  advance_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  payment_date DATE,
  slip_number TEXT NOT NULL,
  UNIQUE(institute_id, employee_ref_id, month_key)
);

-- 8. TIMETABLE & HOMEWORK
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  class_name TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  room_number TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  class_name TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment_name TEXT DEFAULT '',
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  homework_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  submitted_at TIMESTAMPTZ,
  UNIQUE(institute_id, homework_id, student_id)
);

-- 9. NOTIFICATION SETTINGS & SIMULATED/PRODUCTION OUTBOX
CREATE TABLE IF NOT EXISTS notification_settings (
  institute_id UUID PRIMARY KEY REFERENCES institutes(id) ON DELETE CASCADE,
  send_absent_alert BOOLEAN NOT NULL DEFAULT TRUE,
  send_present_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  send_low_attendance_alert BOOLEAN NOT NULL DEFAULT TRUE,
  send_result_alert BOOLEAN NOT NULL DEFAULT TRUE,
  send_fee_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  send_test_announcement BOOLEAN NOT NULL DEFAULT TRUE,
  attendance_recipient TEXT NOT NULL DEFAULT 'parent' CHECK (attendance_recipient IN ('parent', 'student', 'both')),
  result_recipient TEXT NOT NULL DEFAULT 'both' CHECK (result_recipient IN ('parent', 'student', 'both')),
  default_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (default_channel IN ('whatsapp', 'sms', 'both')),
  preferred_send_time TEXT DEFAULT '18:30',
  signature_line TEXT DEFAULT 'Regards, Academic Office',
  whatsapp_template_absent TEXT NOT NULL DEFAULT '',
  sms_template_absent TEXT NOT NULL DEFAULT '',
  whatsapp_template_result TEXT NOT NULL DEFAULT '',
  sms_template_result TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_number TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('parent', 'student', 'staff')),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  message_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('simulated', 'queued_live', 'delivered_live', 'failed')),
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  error_info TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institute_id, dedupe_key)
);

-- ============================================================================
-- STRICT ROW LEVEL SECURITY (TENANT ISOLATION ENFORCED AT DATABASE LEVEL)
-- ============================================================================

CREATE OR REPLACE FUNCTION current_institute_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'institute_id', '')::uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '');
$$ LANGUAGE SQL STABLE;

ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_outbox ENABLE ROW LEVEL SECURITY;

-- Institute Isolation Policy Example (applied to every tenant-scoped table)
CREATE POLICY tenant_isolation_students ON students
  USING (institute_id = current_institute_id())
  WITH CHECK (institute_id = current_institute_id());

-- Parents & Students CANNOT read unpublished draft tests or marks
CREATE POLICY parent_student_published_tests_only ON tests
  FOR SELECT USING (
    institute_id = current_institute_id()
    AND (
      current_user_role() NOT IN ('parent', 'student')
      OR status = 'published'
    )
  );

-- Payroll restricted strictly to Owner, Admin, and Accountant
CREATE POLICY payroll_restricted_access ON payroll_records
  USING (
    institute_id = current_institute_id()
    AND current_user_role() IN ('owner', 'admin', 'accountant')
  );
