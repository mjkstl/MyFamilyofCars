import { Linking } from 'react-native';
import { openVehicleSearch } from '@/utils/vehicleSearch';
import { CLASSIC_MAKES } from '@/data/classicMakes';
import { durationQuestion, YEAR_OPTIONS } from '@/config/carForm';

describe('Add / Edit car form rules', () => {
  afterEach(() => jest.restoreAllMocks());

  it('words the "how long" question to fit the status, and hides it for dream cars', () => {
    expect(durationQuestion('current')).toBe('How long have you had it?');
    expect(durationQuestion('first')).toBe('How long was it in the family?');
    expect(durationQuestion('memory')).toBe('How long was it in the family?');
    expect(durationQuestion('dream')).toBeNull();
  });

  it('lists years newest first, from next year down to 1885, with no gaps', () => {
    const next = new Date().getFullYear() + 1;
    expect(YEAR_OPTIONS[0]).toBe(String(next));
    expect(YEAR_OPTIONS[YEAR_OPTIONS.length - 1]).toBe('1885');
    expect(YEAR_OPTIONS.length).toBe(next - 1885 + 1);
  });

  it('keeps the fallback make list sorted A–Z and free of duplicates', () => {
    const sorted = [...CLASSIC_MAKES].sort((a, b) => a.localeCompare(b));
    expect(CLASSIC_MAKES).toEqual(sorted);
    expect(new Set(CLASSIC_MAKES).size).toBe(CLASSIC_MAKES.length);
  });

  it('"See ones like it for sale" opens Google "All" results, not Shopping', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openVehicleSearch('Ford', 'Mustang', 1998, 'GT', 'Red');
    const url = open.mock.calls[0][0];
    expect(url).not.toContain('tbm=');
    expect(url).toBe('https://www.google.com/search?q=1998%20Ford%20Mustang%20GT%20Red%20for%20sale');
  });
});
