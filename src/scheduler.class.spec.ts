import { test } from 'ava';
import { UsScheduler, ScheduleEvent, DateTime } from './scheduler.class';
import { take, map } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

test.beforeEach('Initialize scheduler', (t) => {
  t.context.uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T01:02:03.000+0200',
    customTimes: '22:30,6:30(wakeup), 12:00,25:00,2:99',
  });
});

test('Initializable and setting of now', (t) => {
  let uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
  });
  t.is(typeof uss, 'object');
  t.log(`Starttime (current local time) ${uss.now.toISO()}`);
  t.is(
    uss.now.toISO().substr(0, 16),
    DateTime.local()
      .toISO()
      .substr(0, 16),
  );

  uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T00:00:00.000+02:00',
  });
  t.log(`Starttime (given time): ${uss.now.toISO()}`);
  t.is(uss.now.toISO(), '2018-06-28T00:00:00.000+02:00');

  uss.now = DateTime.fromISO('2018-12-27T23:12:00.000+01:00')
  t.is(uss.now.toISO(), '2018-12-27T23:12:00.000+01:00');
});

test('parsing custom times', (t) => {
  const dates = t.context.uss.getCustomTimes(
    DateTime.fromISO('2018-12-28T12:00:00.000+0100'),
  );
  t.deepEqual(dates,
    {
      '_start_': DateTime.fromISO('2018-12-28T00:00:00.000+01:00'),
      '22:30': DateTime.fromISO('2018-12-28T22:30:00.000+01:00'),
      'wakeup': DateTime.fromISO('2018-12-28T06:30:00.000+01:00'),
      '12:00': DateTime.fromISO('2018-12-28T12:00:00.000+01:00')
    }
  );
});
test('parsing empty custom times', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
  });
  const dates = uss.getCustomTimes();

  t.is(Object.keys(dates).length, 1);
  t.truthy(dates.hasOwnProperty('_start_'));
});

test('get all times', (t) => {
  const dates = t.context.uss.getTimes(
    DateTime.fromISO('2018-12-28T12:00:00.000+0100')
  );

  const convDates = Object.keys(dates).reduce((res, key) => {
    res[key] = dates[key].toISO()
    return res;
  }, {})
  t.deepEqual(convDates, {
    '12:00': '2018-12-28T12:00:00.000+01:00',
    '22:30': '2018-12-28T22:30:00.000+01:00',
    _start_: '2018-12-28T00:00:00.000+01:00',
    dawn: '2018-12-28T07:54:47.019+01:00',
    dusk: '2018-12-28T16:50:38.406+01:00',
    goldenHour: '2018-12-28T14:59:50.940+01:00',
    goldenHourEnd: '2018-12-28T09:45:34.485+01:00',
    nadir: '2018-12-28T00:22:42.713+01:00',
    nauticalDawn: '2018-12-28T07:09:14.325+01:00',
    nauticalDusk: '2018-12-28T17:36:11.100+01:00',
    night: '2018-12-28T18:18:57.266+01:00',
    nightEnd: '2018-12-28T06:26:28.159+01:00',
    solarNoon: '2018-12-28T12:22:42.713+01:00',
    sunrise: '2018-12-28T08:37:47.882+01:00',
    sunriseEnd: '2018-12-28T08:42:31.769+01:00',
    sunset: '2018-12-28T16:07:37.544+01:00',
    sunsetStart: '2018-12-28T16:02:53.657+01:00',
    wakeup: '2018-12-28T06:30:00.000+01:00',
  })
})


test('Generates a cron starting from now', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
  });
  const cron = uss.generateCron('0 30 12 * * *');

  t.is(cron.next().value.toISO(), '2018-06-28T12:30:00.000+02:00');
  t.is(cron.next().value.toISO(), '2018-06-29T12:30:00.000+02:00');
  t.is(cron.next().value.toISO(), '2018-06-30T12:30:00.000+02:00');



});

test('Generates a cron starting from now', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
  });
  const cron = uss.generateCron('0 0 12 * * 1');

  t.is(cron.next().value.toISO(), '2018-07-02T12:00:00.000+02:00');
  t.is(cron.next().value.toISO(), '2018-07-09T12:00:00.000+02:00');
  t.is(cron.next(DateTime.fromISO('2018-07-12T12:30:00.000+02:00')).value.toISO(), '2018-07-16T12:00:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-07-23T12:00:00.000+02:00');



});

function sampleEvents(schedule: IterableIterator<ScheduleEvent>, samples = 10, mod = 1): string[] {
  function toString(val: ScheduleEvent) {
    return `${val.index}-${val.date.toISO()}`
  }
  const resArray: string[] = [];
  for (let i = 0; i < samples; i++) {
    const event = schedule.next().value;
    if (i % mod === 0) {
      resArray.push(toString(event));
    }
  }
  return resArray
}

test('Generates a simple schedule', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
    customTimes: '6:30(wakeup)',
  });
  const schedule = uss.generateSchedule(['sunrise', 'wakeup', 'sunset']);
  t.deepEqual(sampleEvents(schedule, 1000, 100),
    ['0-2018-06-28T04:54:23.706+02:00',
      '1-2018-07-31T06:30:00.000+02:00',
      '2-2018-09-03T20:08:21.937+02:00',
      '0-2018-11-09T07:33:33.489+01:00',
      '1-2019-01-15T06:30:00.000+01:00',
      '2-2019-03-20T18:32:57.470+01:00',
      '0-2019-04-29T05:53:31.365+02:00',
      '1-2019-06-01T06:30:00.000+02:00',
      '2-2019-07-04T21:52:34.096+02:00',
      '0-2019-08-07T05:44:23.373+02:00']);
})

test('Generates a simple schedule with user times', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
    customTimes: '6:30(wakeup)',
  });
  const schedule = uss.generateSchedule(['00:00', '12:23', '23:59']);
  t.deepEqual(sampleEvents(schedule, 7),
    ['0-2018-06-28T00:00:00.000+02:00',
      '1-2018-06-28T12:23:00.000+02:00',
      '2-2018-06-28T23:59:00.000+02:00',
      '0-2018-06-29T00:00:00.000+02:00',
      '1-2018-06-29T12:23:00.000+02:00',
      '2-2018-06-29T23:59:00.000+02:00', '0-2018-06-30T00:00:00.000+02:00']);
})

test('Generates a simple schedule with day change', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
    customTimes: '6:30(wakeup)',
  });
  const schedule = uss.generateSchedule(['21:00', '20:00', '22:00', '19:00', '23:00']);
  t.deepEqual(sampleEvents(schedule, 8, 1), ['0-2018-06-28T21:00:00.000+02:00',
    '1-2018-06-29T20:00:00.000+02:00',
    '2-2018-06-29T22:00:00.000+02:00',
    '3-2018-06-30T19:00:00.000+02:00',
    '4-2018-06-30T23:00:00.000+02:00',
    '0-2018-07-01T21:00:00.000+02:00',
    '1-2018-07-02T20:00:00.000+02:00',
    '2-2018-07-02T22:00:00.000+02:00']);
})

test('Generates a schedule with day change and weekly cron pattern', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
    customTimes: '6:30(wakeup)',
  });
  const schedule = uss.generateSchedule({
    times: ['21:00', '20:00', '22:00', '19:00', '23:00'], random: 0, dayCronPattern: '* * 1'
  });

  t.deepEqual(sampleEvents(schedule, 8, 1), ['0-2018-07-02T21:00:00.000+02:00',
    '1-2018-07-03T20:00:00.000+02:00',
    '2-2018-07-03T22:00:00.000+02:00',
    '3-2018-07-04T19:00:00.000+02:00',
    '4-2018-07-04T23:00:00.000+02:00',
    '0-2018-07-09T21:00:00.000+02:00',
    '1-2018-07-10T20:00:00.000+02:00',
    '2-2018-07-10T22:00:00.000+02:00']);
})

test('Generates a simple schedule with randomization', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-06-28T12:29:03.000+0200',
    customTimes: '6:30(wakeup)',
  });
  const schedule = uss.generateSchedule({ times: ['18:00'], random: 15, dayCronPattern: '* * *' });


  for (let i = 0; i < 100; i++) {
    const event = schedule.next().value;
    t.true(event.date.hour === 18 || event.date.hour === 17, `Event is not in correct hours ${event.date.hour}:${event.date.minute}`);
    t.true(event.date.minute <= 15 || event.date.minute >= 45, `Minutes are not range ${event.date.hour}:${event.date.minute}`);
  }

})
test('Schedule a cron', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.cron('0 * * * * *').pipe(
      take(3),
    );

    expectObservable(output).toBe('1m a 59.999s b 59.999s (c|)', {
      a: 0,
      b: 1,
      c: 2
    });
  });
});

test('Scheduling', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.schedule('13:00', 'sunset').pipe(
      map(event => `${event.date.toISO()}-${event.index}`),
      take(3),
    );

    expectObservable(output).toBe('3600000ms a 30865855ms b 55534143ms (c|)', {
      a: '2018-05-28T13:00:00.000+02:00-0',
      b: '2018-05-28T21:34:25.856+02:00-1',
      c: '2018-05-29T13:00:00.000+02:00-0'
    });
  });
})

test('Scheduling with complex options', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.schedule({ times: ['13:00'], random: 0, dayCronPattern: '* * *' }).pipe(
      map(event => `${event.date.toISO()}-${event.index}`),
      take(3),
    );

    expectObservable(output).toBe('3600000ms a 86399999ms b 86399999ms (c|)', {
      a: '2018-05-28T13:00:00.000+02:00-0',
      b: '2018-05-29T13:00:00.000+02:00-0',
      c: '2018-05-30T13:00:00.000+02:00-0'
    });
  });
})
test('Errorhandling', t => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const scheduler = uss.generateSchedule(['xxx']);
  t.throws(() => scheduler.next(), 'xxx is neither predefined nor a valid time (HH:mm)')


})
test('Test "in" with ISO', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.in('1m').pipe(
      map((date) => {
        return `${date.index}:${date.date.toISO()}`;
      }),
    );
    expectObservable(output).toBe('1m (a|)', {
      a: '0:2018-05-28T12:01:00.000+02:00',
    });
  });
});

test('Test "in" with seconds', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });

  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.in(30).pipe(
      map((date) => {
        return `${date.index}:${date.date.toISO()}`;
      }),
    );
    expectObservable(output).toBe('0.5m (a|)', {
      a: '0:2018-05-28T12:00:30.000+02:00',
    });
  });
});

test('Test "at" with with date', (t) => {
  const uss = new UsScheduler({
    latitude: 53.54,
    longitude: 9.98,
    customTimes: '12:01(start),12:02(second)',
    now: '2018-05-28T12:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });
  const targetDate = DateTime.fromISO('2018-05-30T12:03:00.000+02:00');
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.at(targetDate).pipe(
      map((date) => `${date.date.toISO()}`),
    );
    expectObservable(output).toBe('2883m (a|)', {
      a: '2018-05-30T12:03:00.000+02:00'
    });
  });
});


test('Get sun positions', (t) => {
  const uss = new UsScheduler({
    latitude: 53.46,
    longitude: 9.95,
    now: '2018-06-21T00:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual.map(data => data.notification.value)
      .filter(val => !!val).map(val => `${val.date.toLocaleString(DateTime.TIME_24_SIMPLE)}->${val.altitude}:${val.azimuth}`), [
        '00:00->-11.058210928105565:340.80724297361286',
        '01:00->-12.94959986675356:354.737435251469',
        '02:00->-12.67045436487025:8.841442814497839',
        '03:00->-10.246158235834509:22.657955988062895',
        '04:00->-5.884420738770536:35.83631462096258',
        '05:00->0.091081157020682:48.2460396541143',
        '06:00->7.3173425772348635:59.98121512425939',
        '07:00->15.440337142319958:71.31417277538556',
        '08:00->24.125631066965223:82.66507680428259',
        '09:00->33.03617643029865:94.62408183494017',
        '10:00->41.776708556354436:108.04024204696903',
        '11:00->49.78917354922111:124.15260977864862',
        '12:00->56.18759178273318:144.5127363171751',
        '13:00->59.68027319782755:169.7512337844286',
        '14:00->59.15340045988221:196.9550073380081',
        '15:00->54.80020238968144:221.06755737205611',
        '16:00->47.889539405434284:240.22634451217849',
        '17:00->39.62739149202212:255.52205131906737',
        '18:00->30.800674110215823:268.4737635018476',
        '19:00->21.913220135060982:280.2128544878379',
        '20:00->13.338201788529172:291.51149692949133',
        '21:00->5.408238553379683:302.91155807835696',
        '22:00->-1.538209289378797:314.796455102687',
        '23:00->-7.1424530641723525:327.3981470556306',
      ]);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.sunPositions(60).pipe(
      take(24),
    );



    expectObservable(output).toBe('');
  });
})
test('Get sun positions with default parameter 5 minutes', (t) => {
  const uss = new UsScheduler({
    latitude: 53.46,
    longitude: 9.95,
    now: '2018-06-21T00:00:00.000+02:00',
  });

  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual.map(data => data.notification.value)
      .filter(val => !!val).map(val => `${val.date.toLocaleString(DateTime.TIME_24_SIMPLE)}->${val.altitude}:${val.azimuth}`), [
        '00:00->-11.058210928105565:340.80724297361286',
        '00:05->-11.295793451802831:341.95074353280586',
      ]);
  });

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = uss.sunPositions().pipe(
      take(2),
    );
    expectObservable(output).toBe('');
  });
})
