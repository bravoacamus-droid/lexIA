import * as fs from 'node:fs';
import * as path from 'node:path';
import mammoth from 'mammoth';

const DIR = path.resolve('ENCUESTA');

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.docx'));
  for (const f of files) {
    const buf = fs.readFileSync(path.join(DIR, f));
    const { value } = await mammoth.extractRawText({ buffer: buf });
    console.log('================================================');
    console.log(`# ${f}`);
    console.log('================================================');
    console.log(value);
    console.log('\n\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
