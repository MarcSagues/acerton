import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateGroupRulesDto } from './update-group-rules.dto';

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(UpdateGroupRulesDto, body);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('UpdateGroupRulesDto.name', () => {
  it('es opcional: una peticion sin nombre es valida', async () => {
    const { errors } = await check({ isPublic: true });
    expect(errors).toHaveLength(0);
  });

  it('acepta un nombre valido', async () => {
    const { dto, errors } = await check({ name: 'Los del domingo' });
    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Los del domingo');
  });

  it('recorta los espacios de los lados', async () => {
    const { dto, errors } = await check({ name: '   Los del domingo  ' });
    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Los del domingo');
  });

  it('rechaza menos de 3 caracteres, contando ya sin espacios', async () => {
    expect((await check({ name: 'ab' })).errors).toHaveLength(1);
    expect((await check({ name: '  ab  ' })).errors).toHaveLength(1);
    expect((await check({ name: '     ' })).errors).toHaveLength(1);
  });

  it('rechaza mas de 60 caracteres', async () => {
    expect((await check({ name: 'a'.repeat(61) })).errors).toHaveLength(1);
    expect((await check({ name: 'a'.repeat(60) })).errors).toHaveLength(0);
  });

  it('rechaza un nombre que no es texto', async () => {
    expect((await check({ name: 12345 })).errors).toHaveLength(1);
  });
});
