import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendAnnouncementDto } from './send-announcement.dto';

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(SendAnnouncementDto, body);
  return { dto, errors: await validate(dto) };
}

describe('SendAnnouncementDto', () => {
  it('acepta titulo y texto validos; dryRun es opcional', async () => {
    const { dto, errors } = await check({ title: 'Novedades', body: 'Ya hay jornada nueva' });
    expect(errors).toHaveLength(0);
    expect(dto.dryRun).toBeUndefined();
  });

  it('recorta los espacios de los lados', async () => {
    const { dto, errors } = await check({ title: '  Novedades  ', body: '  Texto  ' });
    expect(errors).toHaveLength(0);
    expect(dto.title).toBe('Novedades');
    expect(dto.body).toBe('Texto');
  });

  it('rechaza titulo o texto vacios (tambien solo espacios)', async () => {
    expect((await check({ title: '', body: 'x' })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: 'x', body: '' })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: '   ', body: 'x' })).errors.length).toBeGreaterThan(0);
  });

  it('rechaza titulo de mas de 65 caracteres y texto de mas de 240', async () => {
    expect((await check({ title: 'a'.repeat(66), body: 'x' })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: 'a'.repeat(65), body: 'x' })).errors).toHaveLength(0);
    expect((await check({ title: 'x', body: 'b'.repeat(241) })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: 'x', body: 'b'.repeat(240) })).errors).toHaveLength(0);
  });

  it('rechaza si faltan campos o no son texto', async () => {
    expect((await check({ body: 'x' })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: 'x' })).errors.length).toBeGreaterThan(0);
    expect((await check({ title: 123, body: 'x' })).errors.length).toBeGreaterThan(0);
  });

  it('dryRun debe ser booleano', async () => {
    expect((await check({ title: 'x', body: 'x', dryRun: true })).errors).toHaveLength(0);
    expect((await check({ title: 'x', body: 'x', dryRun: 'si' })).errors.length).toBeGreaterThan(0);
  });
});
