// Run locally (NOT part of the app bundle) to load starter trivia into
// car_facts. Requires the service role key, which must never ship in the
// client app.
//
// Usage:
//   SUPABASE_URL=https://your-project.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
//   node scripts/seedTrivia.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars before running this script.');
  process.exit(1);
}

const supabase = createClient(url, key);

const facts = JSON.parse(readFileSync(join(__dirname, '../src/data/seedTrivia.json'), 'utf-8'));

const { data, error } = await supabase.from('car_facts').insert(facts).select();

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`Seeded ${data.length} car_facts rows.`);
