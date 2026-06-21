const fs = require('fs');
const { createClient } = require('/Users/oksanakurdukova/Projects/CRM/node_modules/@supabase/supabase-js');

// Load env
const envPath = '/Users/oksanakurdukova/Projects/CRM/.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing Supabase URL or Secret Key in .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function getOrCreateAuthUser(email, password) {
  console.log(`Checking auth user: ${email}...`);
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = listData.users.find(u => u.email === email);
  if (existing) {
    console.log(`User ${email} already exists with ID: ${existing.id}`);
    return existing.id;
  }

  console.log(`Creating user ${email}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) throw error;
  console.log(`User ${email} created successfully with ID: ${data.user.id}`);
  return data.user.id;
}

async function main() {
  try {
    // 1. Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'robotics-lipetsk')
      .single();

    if (orgError) throw new Error('Organization not found: ' + orgError.message);
    const orgId = org.id;
    console.log('Org ID:', orgId);

    // Get branch
    const { data: branch } = await supabase.from('branches').select('id').eq('organization_id', orgId).limit(1).single();
    const branchId = branch ? branch.id : null;

    // Get room
    const { data: room } = await supabase.from('rooms').select('id').eq('organization_id', orgId).limit(1).single();
    const roomId = room ? room.id : null;

    // Get course
    const { data: course } = await supabase.from('courses').select('id').eq('slug', 'robotics-lego').single();
    const courseId = course ? course.id : '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a';

    const defaultPassword = 'RoboticsDemo2026!';

    // 2. Create users
    const adminId = await getOrCreateAuthUser('admin@robotics.local', defaultPassword);
    const teacherId = await getOrCreateAuthUser('teacher@robotics.local', defaultPassword);
    const parentId = await getOrCreateAuthUser('parent@robotics.local', defaultPassword);

    // 3. Setup Profiles
    console.log('Setting up profiles...');
    await supabase.from('profiles').upsert([
      { id: adminId, full_name: 'Демо Администратор', phone: '+7 (999) 111-22-33' },
      { id: teacherId, full_name: 'Демо Преподаватель', phone: '+7 (999) 444-55-66' },
      { id: parentId, full_name: 'Демо Родитель', phone: '+7 (903) 111-22-33' }
    ]);

    // 4. Setup Org Memberships
    console.log('Setting up memberships...');
    await supabase.from('org_memberships').upsert([
      { organization_id: orgId, user_id: adminId, role: 'owner', is_active: true },
      { organization_id: orgId, user_id: teacherId, role: 'teacher', is_active: true }
    ], { onConflict: 'organization_id,user_id' });

    // 5. Setup Guardian
    console.log('Setting up guardian...');
    let { data: guardian } = await supabase
      .from('guardians')
      .select('id')
      .eq('email', 'parent@robotics.local')
      .maybeSingle();

    if (!guardian) {
      const { data: newGuardian, error: gError } = await supabase
        .from('guardians')
        .insert({
          organization_id: orgId,
          full_name: 'Демо Родитель',
          phone: '+7 (903) 111-22-33',
          email: 'parent@robotics.local'
        })
        .select('id')
        .single();
      if (gError) throw gError;
      guardian = newGuardian;
    }
    console.log('Guardian ID:', guardian.id);

    // Link guardian to parent auth user
    await supabase.from('guardian_users').upsert({
      organization_id: orgId,
      guardian_id: guardian.id,
      user_id: parentId
    }, { onConflict: 'organization_id,guardian_id,user_id' });

    // 6. Setup Group
    console.log('Setting up group...');
    let { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('title', 'LEGO Start 1')
      .maybeSingle();

    if (!group) {
      const { data: newGroup, error: grError } = await supabase
        .from('groups')
        .insert({
          organization_id: orgId,
          course_id: courseId,
          branch_id: branchId,
          room_id: roomId,
          teacher_id: teacherId,
          title: 'LEGO Start 1',
          status: 'active',
          age_from: 6,
          age_to: 8,
          capacity: 8,
          price_monthly: 4500.00
        })
        .select('id')
        .single();
      if (grError) throw grError;
      group = newGroup;
    }
    console.log('Group ID:', group.id);

    // 7. Setup Student
    console.log('Setting up student...');
    let { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('full_name', 'Игорь Петров')
      .maybeSingle();

    if (!student) {
      const { data: newStudent, error: stError } = await supabase
        .from('students')
        .insert({
          organization_id: orgId,
          full_name: 'Игорь Петров',
          birth_date: '2018-05-12',
          status: 'active'
        })
        .select('id')
        .single();
      if (stError) throw stError;
      student = newStudent;
    }
    console.log('Student ID:', student.id);

    // Link student and guardian
    await supabase.from('student_guardians').upsert({
      organization_id: orgId,
      student_id: student.id,
      guardian_id: guardian.id,
      relation: 'Отец',
      is_primary: true
    }, { onConflict: 'student_id,guardian_id' });

    // Enroll student in group
    await supabase.from('enrollments').upsert({
      organization_id: orgId,
      student_id: student.id,
      group_id: group.id,
      status: 'active',
      started_on: '2026-06-01'
    }, { onConflict: 'student_id,group_id,status' });

    // 8. Setup Invoices & Payments
    console.log('Setting up invoices...');
    // Overdue Invoice
    const { data: inv1 } = await supabase.from('invoices').insert({
      organization_id: orgId,
      student_id: student.id,
      amount: 4500.00,
      status: 'overdue',
      due_date: '2026-06-15'
    }).select('id').single();

    // Paid Invoice
    const { data: inv2 } = await supabase.from('invoices').insert({
      organization_id: orgId,
      student_id: student.id,
      amount: 4500.00,
      status: 'paid',
      due_date: '2026-05-15'
    }).select('id').single();

    // Create payment transaction for paid invoice
    if (inv2) {
      const { data: pay } = await supabase.from('payments').insert({
        organization_id: orgId,
        invoice_id: inv2.id,
        amount: 4500.00,
        provider: 'cash',
        status: 'succeeded'
      }).select('id').single();

      if (pay) {
        await supabase.from('payment_transactions').insert({
          organization_id: orgId,
          payment_id: pay.id,
          amount: 4500.00,
          status: 'succeeded',
          payload: { note: 'Cash payment seed' }
        });
      }
    }

    // 9. Setup Lesson Session
    console.log('Setting up lesson session...');
    const today = new Date();
    today.setHours(17, 0, 0, 0);

    await supabase.from('lesson_sessions').insert({
      organization_id: orgId,
      group_id: group.id,
      course_id: courseId,
      lesson_template_id: 'e1111111-1111-1111-1111-111111111111', // Первое занятие template
      teacher_id: teacherId,
      room_id: roomId,
      starts_at: today.toISOString(),
      status: 'planned'
    });

    console.log('Demo Users and scenario seeded successfully!');
  } catch (err) {
    console.error('Error running setup_demo_users script:', err);
  }
}

main();
