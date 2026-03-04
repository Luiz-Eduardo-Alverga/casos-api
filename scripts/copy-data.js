import { cpSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  cpSync(join(rootDir, 'data'), join(rootDir, 'dist', 'data'), { recursive: true });
  console.log('✅ Arquivos de dados copiados para dist/data');
} catch (error) {
  console.error('❌ Erro ao copiar arquivos de dados:', error);
  process.exit(1);
}
