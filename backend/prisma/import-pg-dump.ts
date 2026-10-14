/**
 * Carga los datos de un dump de Postgres (pg_dump -Fc, el de Neon) en la
 * base MySQL a la que apunta DATABASE_URL. Uso de una sola vez para la
 * migracion Neon -> Hostinger.
 *
 *   npx ts-node prisma/import-pg-dump.ts <ruta.dump>            # ensayo: inserta y hace ROLLBACK
 *   npx ts-node prisma/import-pg-dump.ts <ruta.dump> --commit   # igual, pero hace COMMIT
 *
 * Requisitos:
 * - `pg_restore` en el PATH (solo se usa para convertir el dump a SQL).
 * - Tablas ya creadas con el schema actual (`npx prisma migrate deploy`).
 *
 * Todo va en UNA transaccion: primero vacia las tablas de datos (por si ya
 * habia una importacion previa), luego inserta, e imprime cuantas filas
 * hay por tabla antes y despues. Sin --commit se deshace todo al final.
 * `_prisma_migrations` no se toca: el historial de migraciones de Postgres
 * no aplica a MySQL.
 */
import { execFileSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const SKIP_TABLES = new Set(['_prisma_migrations']);

/** Separa el SQL en sentencias por `;` fuera de literales '...'. */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") {
      // '' dentro de un literal es una comilla escapada, no un cierre
      if (inString && sql[i + 1] === "'") {
        i++;
      } else {
        inString = !inString;
      }
    } else if (c === ';' && !inString) {
      out.push(sql.slice(start, i).trim());
      start = i + 1;
    }
  }
  return out.filter((s) => s.length > 0);
}

/** Quita las lineas de comentario `--` del principio de una sentencia. */
export function stripLeadingComments(stmt: string): string {
  return stmt
    .split('\n')
    .filter((line, idx, lines) => {
      const firstCode = lines.findIndex((l) => l.trim() !== '' && !l.trim().startsWith('--'));
      return idx >= firstCode;
    })
    .join('\n')
    .trim();
}

const INSERT_RE = /^INSERT INTO (?:public\.)?"?(\w+)"? \(([^)]*)\) VALUES /;

/**
 * Traduce la cabecera de un INSERT de Postgres a MySQL: identificadores
 * con comillas dobles -> backticks y sin el esquema `public.`. Los valores
 * se dejan igual: con NO_BACKSLASH_ESCAPES, MySQL lee los literales '...'
 * exactamente como Postgres (true/false, NULL, numeros y fechas tambien).
 */
export function toMysql(stmt: string): { table: string; sql: string } | null {
  const m = INSERT_RE.exec(stmt);
  if (!m) return null;
  const [header, table, cols] = m;
  const mysqlCols = cols
    .split(',')
    .map((c) => '`' + c.trim().replace(/^"|"$/g, '') + '`')
    .join(', ');
  return {
    table,
    sql: `INSERT INTO \`${table}\` (${mysqlCols}) VALUES ` + stmt.slice(header.length),
  };
}

async function countRows(tx: { $queryRawUnsafe: PrismaClient['$queryRawUnsafe'] }, tables: string[]) {
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM \`${t}\``);
    counts[t] = Number(rows[0].n);
  }
  return counts;
}

async function main() {
  const [dumpPath, ...flags] = process.argv.slice(2);
  if (!dumpPath) {
    console.error('Uso: npx ts-node prisma/import-pg-dump.ts <ruta.dump> [--commit]');
    process.exit(1);
  }
  const commit = flags.includes('--commit');

  const sql = execFileSync('pg_restore', ['--data-only', '--no-owner', '--column-inserts', '-f', '-', dumpPath], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });

  const inserts = splitStatements(sql)
    .map(stripLeadingComments)
    .filter((s) => s.startsWith('INSERT INTO'))
    .map((s) => {
      const converted = toMysql(s);
      if (!converted) throw new Error(`INSERT no reconocido: ${s.slice(0, 80)}...`);
      return converted;
    })
    .filter((s) => !SKIP_TABLES.has(s.table));

  const tables = [...new Set(inserts.map((s) => s.table))];
  console.log(`Dump: ${inserts.length} filas en ${tables.length} tablas`);

  const prisma = new PrismaClient();
  const ROLLBACK = new Error('ROLLBACK (ensayo sin --commit)');
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET SESSION sql_mode = CONCAT(@@sql_mode, ',NO_BACKSLASH_ESCAPES')`);
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

        const before = await countRows(tx, tables);
        for (const t of tables) await tx.$executeRawUnsafe(`DELETE FROM \`${t}\``);
        for (const s of inserts) await tx.$executeRawUnsafe(s.sql);
        const after = await countRows(tx, tables);

        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

        console.table(tables.map((t) => ({ tabla: t, antes: before[t], despues: after[t] })));
        if (!commit) throw ROLLBACK;
      },
      { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 },
    );
    console.log('COMMIT hecho: datos importados.');
  } catch (e) {
    if (e === ROLLBACK) {
      console.log('Ensayo terminado: ROLLBACK, no se ha guardado nada. Repite con --commit para guardarlo.');
    } else {
      throw e;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
