import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminBroadcastDto } from './admin-broadcast.dto';

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(AdminBroadcastDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors };
}

describe('AdminBroadcastDto', () => {
  it('acepta un comunicado para todos (sin userIds)', async () => {
    const { dto, errors } = await check({ title: 'Hola', body: 'Novedades' });
    expect(errors).toHaveLength(0);
    expect(dto.userIds).toBeUndefined();
  });

  it('recorta los espacios del titulo y el cuerpo', async () => {
    const { dto, errors } = await check({ title: '  Hola ', body: '  Novedades  ' });
    expect(errors).toHaveLength(0);
    expect(dto.title).toBe('Hola');
    expect(dto.body).toBe('Novedades');
  });

  it('rechaza titulo o cuerpo vacios (tambien solo espacios) o ausentes', async () => {
    expect((await check({ title: '   ', body: 'x' })).errors).toHaveLength(1);
    expect((await check({ title: 'x', body: '' })).errors).toHaveLength(1);
    expect((await check({ body: 'x' })).errors).toHaveLength(1);
    expect((await check({ title: 'x' })).errors).toHaveLength(1);
  });

  it('limita el titulo a 65 y el cuerpo a 240 caracteres', async () => {
    expect((await check({ title: 'a'.repeat(65), body: 'x' })).errors).toHaveLength(0);
    expect((await check({ title: 'a'.repeat(66), body: 'x' })).errors).toHaveLength(1);
    expect((await check({ title: 'x', body: 'a'.repeat(240) })).errors).toHaveLength(0);
    expect((await check({ title: 'x', body: 'a'.repeat(241) })).errors).toHaveLength(1);
  });

  it('rechaza una lista de destinatarios vacia: nunca debe leerse como "todos"', async () => {
    expect((await check({ title: 'x', body: 'x', userIds: [] })).errors).toHaveLength(1);
  });

  it('acepta una lista de destinatarios y rechaza duplicados, no-strings y mas de 5000', async () => {
    expect((await check({ title: 'x', body: 'x', userIds: ['a', 'b'] })).errors).toHaveLength(0);
    expect((await check({ title: 'x', body: 'x', userIds: ['a', 'a'] })).errors).toHaveLength(1);
    expect((await check({ title: 'x', body: 'x', userIds: [1, 2] })).errors).toHaveLength(1);
    const many = Array.from({ length: 5001 }, (_, i) => `u${i}`);
    expect((await check({ title: 'x', body: 'x', userIds: many })).errors).toHaveLength(1);
  });

  it('dryRun debe ser booleano', async () => {
    expect((await check({ title: 'x', body: 'x', dryRun: true })).errors).toHaveLength(0);
    expect((await check({ title: 'x', body: 'x', dryRun: 'si' })).errors).toHaveLength(1);
  });

  it('rechaza campos desconocidos', async () => {
    expect((await check({ title: 'x', body: 'x', audience: 'all' })).errors).toHaveLength(1);
  });
});
