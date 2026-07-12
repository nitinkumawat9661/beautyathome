import {
  localDateBoundsUtc,
  localDateTimeToUtc,
  utcToLocalScheduleParts,
} from './zoned-time';

describe('timezone conversion', () => {
  it('converts Sikar local time to the correct UTC instant', () => {
    expect(
      localDateTimeToUtc('2026-07-11', '09:30', 'Asia/Kolkata').toISOString(),
    ).toBe('2026-07-11T04:00:00.000Z');
  });

  it('returns a complete local-day UTC range', () => {
    const range = localDateBoundsUtc('2026-07-11', 'Asia/Kolkata');

    expect(range.startsAt.toISOString()).toBe('2026-07-10T18:30:00.000Z');
    expect(range.endsAt.toISOString()).toBe('2026-07-11T18:30:00.000Z');
  });

  it('derives the Sikar local weekday and minute for schedule checks', () => {
    expect(
      utcToLocalScheduleParts(
        new Date('2026-07-11T04:00:00.000Z'),
        'Asia/Kolkata',
      ),
    ).toEqual({ date: '2026-07-11', weekday: 'SATURDAY', minuteOfDay: 570 });
  });
});
