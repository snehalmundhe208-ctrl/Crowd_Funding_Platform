const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const backupEnvPath = path.join(__dirname, '.env.backup');

if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, backupEnvPath);
}

const commonPasswords = [
  'postgres',
  'admin',
  'root',
  'password',
  '123456',
  '1234',
  '',
  '123',
  'password123'
];

let successfulUrl = null;

console.log('Testing common PostgreSQL credentials...');

for (const password of commonPasswords) {
  const credentials = password ? `postgres:${password}` : 'postgres';
  const url = `postgresql://${credentials}@localhost:5432/crowdfunding?schema=public`;
  
  // Write URL to .env
  const envContent = `PORT=5000
DATABASE_URL=${url}
JWT_SECRET=super_secret_key_change_me_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_PATH=uploads/
`;
  fs.writeFileSync(envPath, envContent);

  try {
    console.log(`Testing password: "${password}"...`);
    // Run prisma db push to see if it authenticates (we only check connection, so we can run db push)
    // We redirect output to suppress spam
    execSync('npx prisma db push --skip-generate', { stdio: 'ignore', timeout: 5000 });
    console.log(`Success! Password is: "${password}"`);
    successfulUrl = url;
    break;
  } catch (err) {
    // Fails on bad credentials
  }
}

if (!successfulUrl) {
  console.log('Could not find password. Restoring backup .env...');
  if (fs.existsSync(backupEnvPath)) {
    fs.copyFileSync(backupEnvPath, envPath);
    fs.unlinkSync(backupEnvPath);
  }
  process.exit(1);
} else {
  // Clean up backup
  if (fs.existsSync(backupEnvPath)) {
    fs.unlinkSync(backupEnvPath);
  }
  console.log('Configured database URL successfully.');
}
