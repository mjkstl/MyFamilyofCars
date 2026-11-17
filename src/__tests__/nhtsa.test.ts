import { getModelsForMake, searchMakes } from '@/utils/nhtsa';

const okJson = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

describe('NHTSA lookups', () => {
  afterEach(() => jest.restoreAllMocks());

  it('never throws when the service is down — suggestions are optional', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await expect(searchMakes('Fo')).resolves.toEqual([]);
    await expect(getModelsForMake('Ford', 1998)).resolves.toEqual([]);
  });

  it('filters makes by prefix and downloads the full list only once', async () => {
    const fetchMock = jest.fn(() => okJson({ Results: [{ Make_Name: 'FORD' }, { Make_Name: 'FERRARI' }, { Make_Name: 'TOYOTA' }] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(searchMakes('fo')).resolves.toEqual(['FORD']);
    await expect(searchMakes('fe')).resolves.toEqual(['FERRARI']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores one-letter queries', async () => {
    await expect(searchMakes('f')).resolves.toEqual([]);
  });

  it('returns de-duplicated, sorted models', async () => {
    globalThis.fetch = jest.fn(() => okJson({ Results: [{ Model_Name: 'Mustang' }, { Model_Name: 'Explorer' }, { Model_Name: 'Mustang' }] })) as unknown as typeof fetch;
    await expect(getModelsForMake('Ford', 1998)).resolves.toEqual(['Explorer', 'Mustang']);
  });
});
