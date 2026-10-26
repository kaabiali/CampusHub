// npm run db:backup   -> backups/campushub-<timestamp>.archive.gz (mongodump inside the mongo container)
// npm run db:restore -- backups/<file>   -> mongorestore --drop of that archive (asks for confirmation)
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const [mode, file] = process.argv.slice(2);

function run(args, { stdin, stdout }) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', 'exec', '-T', 'mongo', ...args], { stdio: [stdin ? 'pipe' : 'ignore', stdout ? 'pipe' : 'inherit', 'inherit'] });
    if (stdin) stdin.pipe(child.stdin);
    if (stdout) child.stdout.pipe(stdout);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${args[0]} exited with code ${code}`))));
  });
}

if (mode === 'backup') {
  mkdirSync('backups', { recursive: true });
  const target = `backups/campushub-${new Date().toISOString().replace(/[:.]/g, '-')}.archive.gz`;
  await run(['mongodump', '--db', 'campushub', '--archive', '--gzip', '--quiet'], { stdout: createWriteStream(target) });
  console.log(`Sauvegarde écrite : ${target} (${Math.round(statSync(target).size / 1024)} Ko)`);
} else if (mode === 'restore') {
  if (!file) throw new Error('Usage : npm run db:restore -- backups/<fichier>.archive.gz');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Remplacer TOUTES les données actuelles de "campushub" par ${file} ? (oui/non) `);
  rl.close();
  if (answer.trim().toLowerCase() !== 'oui') {
    console.log('Restauration annulée.');
  } else {
    await run(['mongorestore', '--archive', '--gzip', '--drop', '--quiet'], { stdin: createReadStream(file) });
    console.log('Restauration terminée.');
  }
} else {
  console.error('Usage : node scripts/backup.mjs backup | restore <fichier>');
  process.exitCode = 2;
}
