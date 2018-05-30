import { test } from 'ava';
import { UsScheduler, ISchedulerOptions, ILabeledDate, CRON_LABEL } from './scheduler.class';
import { of } from 'rxjs';
import { toArray, tap, take, skip, filter, map, delay } from 'rxjs/operators';
import { DateTime } from 'luxon';

const options: ISchedulerOptions = {
  latitude: 53.54,
  longitude: 9.98,
  startAt: '2018-06-28T01:02:03.000+0200',
  customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99'
};

test.beforeEach('Initialize scheduler', (t) => {
  t.context.uss = new UsScheduler(options);
})
test('Initializable', t => {
  const uss1 = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
  });
  t.is(typeof uss1, 'object');
  t.log(`Starttime (current local time) ${uss1.startAt.toISO()}`);
  t.is( uss1.startAt.diffNow().seconds, 0);

  const uss2 = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    startAt: '2018-06-28T00:00:00.000+02:00'
  });
  t.is(typeof uss2, 'object');
  t.log(`Starttime (given time): ${uss1.startAt.toISO()}`);
  t.is (uss2.startAt.toISO(), '2018-06-28T00:00:00.000+02:00')
});

test('parsing custom times', t => {
  const dates = t.context.uss.getCustomTimes('2018-12-28T01:02:03.000+0100')
  t.deepEqual(dates, [
    { label: '22:30', date: DateTime.fromISO('2018-12-28T22:30:00.000+01:00') },
    { label: 'wakeup', date: DateTime.fromISO('2018-12-28T06:30:00.000+01:00') },
    { label: '12:00', date: DateTime.fromISO('2018-12-28T12:00:00.000+01:00') },
  ]);

})
test('parsing empty custom times', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98
  });
  const dates = uss.getCustomTimes('2018-12-28T01:02:03.000+0100');
  t.deepEqual(dates, []);
})

test('parsing custom times without startdate', t => {
  const dates = t.context.uss.getCustomTimes()
  t.deepEqual(dates, [
    { label: '22:30', date: DateTime.fromISO('2018-06-28T22:30:00.000+02:00') },
    { label: 'wakeup', date: DateTime.fromISO('2018-06-28T06:30:00.000+02:00') },
    { label: '12:00', date: DateTime.fromISO('2018-06-28T12:00:00.000+02:00') },
  ]);

})


test('Can calculate sun time', t => {
  return t.context.uss.getSunTimes('2018-11-28T23:59:59.00+0100').pipe(
    toArray(),
    tap((_sunTimes: ILabeledDate[]) => {
      t.deepEqual(_sunTimes, [
        { label: 'nadir', date: DateTime.fromISO('2018-11-27T23:09:28.692Z') },
        { label: 'nightEnd', date: DateTime.fromISO('2018-11-28T05:02:24.311Z') },
        { label: 'wakeup', date: DateTime.fromISO('2018-11-28T05:30:00.000Z') },
        { label: 'nauticalDawn', date: DateTime.fromISO('2018-11-28T05:44:23.245Z') },
        { label: 'dawn', date: DateTime.fromISO('2018-11-28T06:28:36.257Z') },
        { label: 'sunrise', date: DateTime.fromISO('2018-11-28T07:09:43.789Z') },
        { label: 'sunriseEnd', date: DateTime.fromISO('2018-11-28T07:14:12.231Z') },
        { label: 'goldenHourEnd', date: DateTime.fromISO('2018-11-28T08:12:22.271Z') },
        { label: '12:00', date: DateTime.fromISO('2018-11-28T11:00:00.000Z') },
        { label: 'solarNoon', date: DateTime.fromISO('2018-11-28T11:09:28.692Z') },
        { label: 'goldenHour', date: DateTime.fromISO('2018-11-28T14:06:35.112Z') },
        { label: 'sunsetStart', date: DateTime.fromISO('2018-11-28T15:04:45.153Z') },
        { label: 'sunset', date: DateTime.fromISO('2018-11-28T15:09:13.594Z') },
        { label: 'dusk', date: DateTime.fromISO('2018-11-28T15:50:21.127Z') },
        { label: 'nauticalDusk', date: DateTime.fromISO('2018-11-28T16:34:34.139Z') },
        { label: 'night', date: DateTime.fromISO('2018-11-28T17:16:33.073Z') },
        { label: '22:30', date: DateTime.fromISO('2018-11-28T21:30:00.000Z') },
      ]);
    })
  );
});
test('Can calculate sun time w/o date', t => {
  return t.context.uss.getSunTimes().pipe(
    take(1),
    tap((_sunTimes: ILabeledDate) => {
      t.is(_sunTimes.date.toISO(), '2018-06-27T01:24:17.146+02:00');
    })
  );
});

test('Can do cron parsing with optional starttime', t => {
  return t.context.uss.observeCron('0 30 12 * * *')
    .pipe(
      filter((data: ILabeledDate) => (data.label === CRON_LABEL)),
      map((data: ILabeledDate) => (data.date.toISO())),
      take(5),
      toArray(),
      tap((data: string[]) => {
        t.deepEqual (data, [
          '2018-06-28T12:30:00.000+02:00',
          '2018-06-29T12:30:00.000+02:00',
          '2018-06-30T12:30:00.000+02:00',
          '2018-07-01T12:30:00.000+02:00',
          '2018-07-02T12:30:00.000+02:00',
        ]);
      }),

    )


});
test('Can do cron parsing w/o optional starttime', t => {
  const now = new Date();
  const uss1 = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
  });
  return uss1.observeCron('0 * * * * *')
    .pipe(
      tap((data: ILabeledDate) => {
        const delta =  Math.round((data.date.valueOf() - now.valueOf()) / 1000);
        t.true( delta < 70, 'max 70 seconds passed');
      }),
      take(1)

    )
});


test('Observing croned sun times', t => {
  return t.context.uss.observeSunTimes().pipe(

    skip(100),
    take (1),
    tap((date: ILabeledDate) => {
      t.is(date.date.toISO(), '2018-07-04T12:00:00.000+02:00');
      t.is(date.label, '12:00');
    })
  )
});


test.skip('Scheduling', t => {
  const now = new Date();

  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    startAt: '2018-05-28T12:00:00.000+02:00'
  });
  t.log ('Now', now.toISOString(), now.toLocaleTimeString())

  /*return //uss.schedule().pipe(take(20),
  tap((_t: any) => {
    t.log('Ret', _t.label, _t.date.toISO())}));*/
})
