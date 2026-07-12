import { HttpStatus } from '@nestjs/common';

import { AppException } from '../errors/app.exception';

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const WEEKDAY_BY_SHORT_NAME = {
  Mon: 'MONDAY',
  Tue: 'TUESDAY',
  Wed: 'WEDNESDAY',
  Thu: 'THURSDAY',
  Fri: 'FRIDAY',
  Sat: 'SATURDAY',
  Sun: 'SUNDAY',
} as const;

export type LocalScheduleParts = {
  date: string;
  weekday: (typeof WEEKDAY_BY_SHORT_NAME)[keyof typeof WEEKDAY_BY_SHORT_NAME];
  minuteOfDay: number;
};

function partsAt(instant: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

export function localDateTimeToUtc(
  date: string,
  localTime: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);
  if (
    [year, month, day, hour, minute].some(
      (value) => value === undefined || !Number.isInteger(value),
    )
  ) {
    throwInvalidLocalTime();
  }

  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(target);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const visible = partsAt(candidate, timeZone);
    const visibleAsUtc = Date.UTC(
      visible.year,
      visible.month - 1,
      visible.day,
      visible.hour,
      visible.minute,
    );
    candidate = new Date(candidate.getTime() + target - visibleAsUtc);
  }

  const verified = partsAt(candidate, timeZone);
  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  ) {
    throwInvalidLocalTime();
  }
  return candidate;
}

export function localDateBoundsUtc(
  date: string,
  timeZone: string,
): { startsAt: Date; endsAt: Date } {
  const startsAt = localDateTimeToUtc(date, '00:00', timeZone);
  const nextDate = new Date(Date.parse(date + 'T00:00:00.000Z') + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const endsAt = localDateTimeToUtc(nextDate, '00:00', timeZone);
  return { startsAt, endsAt };
}

export function utcToLocalScheduleParts(
  instant: Date,
  timeZone: string,
): LocalScheduleParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): string | undefined =>
    parts.find((part) => part.type === type)?.value;
  const weekday = value('weekday');
  const mappedWeekday =
    weekday && weekday in WEEKDAY_BY_SHORT_NAME
      ? WEEKDAY_BY_SHORT_NAME[weekday as keyof typeof WEEKDAY_BY_SHORT_NAME]
      : undefined;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  if (
    !mappedWeekday ||
    !year ||
    !month ||
    !day ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    throwInvalidLocalTime();
  }
  return {
    date: `${year}-${month}-${day}`,
    weekday: mappedWeekday,
    minuteOfDay: hour * 60 + minute,
  };
}

function throwInvalidLocalTime(): never {
  throw new AppException(
    'AVAILABILITY_INVALID_INTERVAL',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The local availability time is invalid in the city timezone.',
  );
}
