import { __clearFuelEconomyCache, getEpaMakes, getEpaModels, getEpaTrims, parseMenu } from '@/utils/fuelEconomy';

const textResponse = (body: string, ok = true) => Promise.resolve({ ok, text: () => Promise.resolve(body) } as Response);

describe('EPA (fueleconomy.gov) menus', () => {
  beforeEach(() => __clearFuelEconomyCache());
  afterEach(() => jest.restoreAllMocks());

  it('parses JSON arrays, the one-item JSON object quirk, and XML', () => {
    expect(parseMenu('{"menuItem":[{"text":"Ford","value":"Ford"},{"text":"Honda","value":"Honda"}]}')).toEqual(['Ford', 'Honda']);
    expect(parseMenu('{"menuItem":{"text":"Mustang","value":"Mustang"}}')).toEqual(['Mustang']);
    expect(parseMenu('<menuItems><menuItem><text>Auto 4-spd, 6 cyl, 3.8 L</text><value>14123</value></menuItem><menuItem><text>A &amp; B</text><value>1</value></menuItem></menuItems>')).toEqual(['Auto 4-spd, 6 cyl, 3.8 L', 'A & B']);
    expect(parseMenu('')).toEqual([]);
  });

  it('returns makes A–Z for a covered year and asks for JSON', async () => {
    const fetchMock = jest.fn(() => textResponse('{"menuItem":[{"text":"Toyota"},{"text":"Acura"},{"text":"Ford"}]}'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(getEpaMakes(1998)).resolves.toEqual(['Acura', 'Ford', 'Toyota']);
    expect(fetchMock).toHaveBeenCalledWith('https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=1998', { headers: { Accept: 'application/json' } });
  });

  it('does not call the service before 1984 (EPA coverage starts there)', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(getEpaMakes(1965)).resolves.toEqual([]);
    await expect(getEpaModels(1965, 'Ford')).resolves.toEqual([]);
    await expect(getEpaTrims(1965, 'Ford', 'Mustang')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws: offline, HTTP errors and bad bodies all give an empty list', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await expect(getEpaMakes(2005)).resolves.toEqual([]);
    globalThis.fetch = jest.fn(() => textResponse('', false)) as unknown as typeof fetch;
    await expect(getEpaModels(2005, 'Ford')).resolves.toEqual([]);
    globalThis.fetch = jest.fn(() => textResponse('{not json')) as unknown as typeof fetch;
    await expect(getEpaTrims(2005, 'Ford', 'Focus')).resolves.toEqual([]);
  });

  it('caches successes but retries after a failure', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('offline')))
      .mockImplementation(() => textResponse('{"menuItem":[{"text":"Focus"}]}'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(getEpaModels(2005, 'Ford')).resolves.toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    await expect(getEpaModels(2005, 'Ford')).resolves.toEqual(['Focus']);
    await expect(getEpaModels(2005, 'Ford')).resolves.toEqual(['Focus']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('URL-encodes make and model for the trim lookup', async () => {
    const fetchMock = jest.fn(() => textResponse('{"menuItem":[]}'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await getEpaTrims(2010, 'Mercedes-Benz', 'C300 4matic');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=2010&make=Mercedes-Benz&model=C300%204matic',
      { headers: { Accept: 'application/json' } }
    );
  });
});
