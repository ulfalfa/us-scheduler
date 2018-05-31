import { test } from 'ava';
import {
  UsScheduler,
  ILabeledDate
} from './scheduler.class';
import { from, Observable } from 'rxjs';
import {
  toArray,
  tap,
  take,
  map
} from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { DateTime } from 'luxon';

function formatLabeledDate(_t: ILabeledDate) {
  return `${_t.label}->${_t.date.toISO()}`
}

const ld2string: (any) => Observable<string> = map(formatLabeledDate);

test.beforeEach('Initialize scheduler', t => {
  t.context.uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T01:02:03.000+0200',
    customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99'
  });
});

test('Initializable and setting of now', t => {
  let uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98
  });
  t.is(typeof uss, 'object');
  t.log(`Starttime (current local time) ${uss.now.toISO()}`);
  t.is(
    uss.now.toISO().substr(0, 16),
    DateTime.local()
      .toISO()
      .substr(0, 16)
  );

  uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T00:00:00.000+02:00'
  });
  t.log(`Starttime (given time): ${uss.now.toISO()}`);
  t.is(uss.now.toISO(), '2018-06-28T00:00:00.000+02:00');
});

test('parsing custom times', t => {
  const dates = t.context.uss.getCustomTimes(
    DateTime.fromISO('2018-12-28T12:00:00.000+0100')
  );
  t.deepEqual(dates, [
    { label: '22:30', date: DateTime.fromISO('2018-12-28T22:30:00.000+01:00') },
    {
      label: 'wakeup',
      date: DateTime.fromISO('2018-12-28T06:30:00.000+01:00')
    },
    { label: '12:00', date: DateTime.fromISO('2018-12-28T12:00:00.000+01:00') }
  ]);
});
test('parsing empty custom times', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98
  });
  const dates = uss.getCustomTimes();

  t.deepEqual(dates, []);
});

test('Can calculate suntimes', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T11:00:00.000+0200',
    customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99'
  });

  return from(uss.generateSunTimes()).pipe(
    ld2string,
    toArray(),
    tap((_ts: string[]) => {
      t.deepEqual(_ts, [
        '12:00->2018-06-28T12:00:00.000+02:00',
        'solarNoon->2018-06-28T13:24:28.750+02:00',
        'goldenHour->2018-06-28T20:56:31.674+02:00',
        'sunsetStart->2018-06-28T21:49:40.716+02:00',
        'sunset->2018-06-28T21:54:33.793+02:00',
        '22:30->2018-06-28T22:30:00.000+02:00',
        'dusk->2018-06-28T22:47:18.295+02:00',
        'nauticalDusk->2018-06-29T00:22:12.072+02:00' ]);
    })
  );
});
test('Can calculate suntimes with filter', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T11:00:00.000+0200',
    customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99'
  });

  return from(uss.generateSunTimes('wakeup', '22:30', 'sunset')).pipe(
    ld2string,
    toArray(),
    tap((_ts: string[]) => {
      t.deepEqual(_ts, [ 'sunset->2018-06-28T21:54:33.793+02:00',
  '22:30->2018-06-28T22:30:00.000+02:00' ]);
    })
  );
});

test('Can calculate suntimes with date and filter', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T13:00:00.000+0200',
    customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99'
  });
  return from(uss
    .generateSunTimes(DateTime.fromISO('2018-06-27T11:00:00.000+0200'), 'nauticalDusk'))
    .pipe(
    ld2string,
        toArray(),
    tap((s: string[]) => {
      t.deepEqual(s, [
  'nauticalDusk->2018-06-28T00:23:08.692+02:00' ]);
    })
  );
});

test('Generates a cron starting from now', t => {

  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
  });
  return from(uss.generateCron('0 30 12 * * *')).pipe(
    take(2),
    ld2string,
    toArray(),
    tap((data: string[]) => {
      t.deepEqual(data,  ['_cron_->2018-06-28T12:30:00.000+02:00',
  '_cron_->2018-06-29T12:30:00.000+02:00']);
    })
  );
});



test('generate croned sun times', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:31:01.000+0200',
    customTimes: '22:30,6:30(wakeup),12:32,25:00,2:99'
  });
  return from(uss.generateCronedSunTimes()).pipe(
    take(20),
    ld2string,
    toArray(),
    tap((result: string[]) => {
      t.deepEqual(result, [ '12:32->2018-06-28T12:32:00.000+02:00',
  'solarNoon->2018-06-28T13:24:28.750+02:00',
  'goldenHour->2018-06-28T20:56:31.674+02:00',
  'sunsetStart->2018-06-28T21:49:40.716+02:00',
  'sunset->2018-06-28T21:54:33.793+02:00',
  '22:30->2018-06-28T22:30:00.000+02:00',
  'dusk->2018-06-28T22:47:18.295+02:00',
  'nauticalDusk->2018-06-29T00:22:12.072+02:00',
  'nauticalDusk->2018-06-29T00:22:12.072+02:00',
  'wakeup->2018-06-29T06:30:00.000+02:00',
  '12:32->2018-06-29T12:32:00.000+02:00',
  '22:30->2018-06-29T22:30:00.000+02:00',
  'nauticalDusk->2018-06-30T00:21:05.979+02:00',
  'wakeup->2018-06-30T06:30:00.000+02:00',
  '12:32->2018-06-30T12:32:00.000+02:00',
  '22:30->2018-06-30T22:30:00.000+02:00',
  'nauticalDusk->2018-07-01T00:19:50.993+02:00',
  'wakeup->2018-07-01T06:30:00.000+02:00',
  '12:32->2018-07-01T12:32:00.000+02:00',
  '22:30->2018-07-01T22:30:00.000+02:00' ]);
    })
  );
});

test('Scheduling Deterministic', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    now: '2018-05-28T12:00:00.000+02:00'
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    // some how assert the two objects are equal
    // e.g. with chai `expect(actual).deep.equal(expected)`

    t.deepEqual(actual, expected);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.observeSunTimes('start', 'second', 'sunset').pipe(
      map((date: ILabeledDate) => {
        return `${date.label}:${date.waitMS}:${date.date.toISO()}`;
      }),
      take(3)
    );
    expectObservable(output).toBe('60000ms a 59999ms b 34345855ms (c|)', {
      a: 'start:60000:2018-05-28T12:01:00.000+02:00',
      b: 'second:60000:2018-05-28T12:02:00.000+02:00',
      c: 'sunset:34345856:2018-05-28T21:34:25.856+02:00'
    });
  });
});

test('Scheduling', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    now: '2018-05-28T12:00:00.000+02:00'
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    // some how assert the two objects are equal
    // e.g. with chai `expect(actual).deep.equal(expected)`
    t.snapshot(actual);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.observeSunTimes().pipe(
      map((date: ILabeledDate) => {
        return `${date.label}:${date.waitMS}:${date.date.toISO()}`;
      }),
      take(10000)
    );
    expectObservable(output).toBe('');
  });
});
