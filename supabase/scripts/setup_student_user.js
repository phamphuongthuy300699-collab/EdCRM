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

async function main() {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'robotics-lipetsk')
      .single();

    if (!org) throw new Error('Org not found');
    const orgId = org.id;

    const email = 'student@robotics.local';
    const password = 'RoboticsDemo2026!';

    console.log(`Checking student user: ${email}...`);
    const { data: listData } = await supabase.auth.admin.listUsers();
    let studentUserId;
    const existing = listData.users.find(u => u.email === email);

    if (existing) {
      console.log(`User ${email} already exists.`);
      studentUserId = existing.id;
    } else {
      console.log(`Creating user ${email}...`);
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createErr) throw createErr;
      studentUserId = newUser.user.id;
      console.log(`User created with ID: ${studentUserId}`);
    }

    // Set up profile
    await supabase.from('profiles').upsert({
      id: studentUserId,
      full_name: 'Игорь Петров',
      phone: '+7 (999) 777-88-99'
    });

    // Find student
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('full_name', 'Игорь Петров')
      .single();

    if (!student) throw new Error('Student Igor Petrov not found');

    // Link in student_users
    await supabase.from('student_users').upsert({
      organization_id: orgId,
      student_id: student.id,
      user_id: studentUserId
    }, { onConflict: 'organization_id,student_id,user_id' });

    console.log('Student user setup completed successfully!');
  } catch (err) {
    console.error('Failed to setup student user:', err);
  }
}

main();
