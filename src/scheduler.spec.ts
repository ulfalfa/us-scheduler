import test from 'ava'
import { TestScheduler } from 'rxjs/testing'

import { Scheduler } from './scheduler'
import { SchedulerOptions, ScheduleEvent } from './models'
import { DateTime } from 'luxon'
import { map, take } from 'rxjs/operators'
import { interval } from 'rxjs'

const LOCATION: SchedulerOptions = { latitude: 53.54, longitude: 9.98 }

function sampleEvents(
  aSchedule: IterableIterator<ScheduleEvent>,
  samples = 10,
  mod = 1
): string[] {
  function toString(val: ScheduleEvent) {
    return `${val.index}-${val.target.toISO()}`
  }
  const resArray: string[] = []
  for (let i = 0; i < samples; i++) {
    const event = aSchedule.next().value
    if (i % mod === 0) {
      resArray.push(toString(event))
    }
  }
  return resArray
}

function sampleEventsX(
  aSchedule: IterableIterator<ScheduleEvent>,
  samples = 10,
  mod = 1
): string[] {
  function toString(val: ScheduleEvent) {
    return `${val.index}-${val.target.toISO()}-${val.label}`
  }
  const resArray: string[] = []
  for (let i = 0; i < samples; i++) {
    const event = aSchedule.next().value
    if (i % mod === 0) {
      resArray.push(toString(event))
    }
  }
  return resArray
}

test('Test default', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
  })

  t.is(
    scheduler.now.toFormat('dd.MM.YYYY'),
    DateTime.local().toFormat('dd.MM.YYYY')
  )
})

test('Get suntimes', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2018-06-28T12:00:00.000+02:00'),
  })

  const st = scheduler.getSuntimes()
  t.is(st.get('midnight').toISO(), '2018-06-28T00:00:00.000+02:00')
})

test('Test "at" with with date in past', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2018-06-28T12:00:00.000+02:00'),
  })
  const testScheduler = new TestScheduler(actual => {
    t.is(actual[0].frame, 0)
    t.is(
      actual[0].notification.value.target.toISO(),
      '2018-06-28T04:44:23.706+02:00'
    )
  })
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.at({ time: 'sunrise', offset: -10 })
    expectObservable(output).toBe('')
  })
})

test('Test "at" with with date with current date', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
  })
  const testScheduler = new TestScheduler((actual, expected) => {
    t.true(
      actual[0].frame >= 864000000 - 10 && actual[0].frame < 864000000 + 10
    )
  })
  const targetDate = DateTime.local().plus({ days: 10 })
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.at(targetDate.toISO())
    expectObservable(output).toBe('')
  })
})

test('Test "doIn" with ISO', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
  })
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.in('PT1M', 'DATA')

    expectObservable(output).toBe('1m (a|)', {
      a: 'DATA',
    })
  })
})
test('Test "doIn" with seconds', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
  })
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.in(60, 'DATA')

    expectObservable(output).toBe('1m (a|)', {
      a: 'DATA',
    })
  })
})

test('Generate simple schedule', t => {
  const scheduler = new Scheduler({
    ...LOCATION,

    now: DateTime.fromISO('2019-05-26T17:23:00'),
    dayCronPattern: '* * 7,1',
  })
  const aSchedule = scheduler.generateSchedule('12:00')

  const res = sampleEvents(aSchedule, 5)

  t.deepEqual(res, [
    '0-2019-05-26T12:00:00.000+02:00', // this is in past and ok, because skipPast = false
    '0-2019-05-27T12:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '0-2019-06-03T12:00:00.000+02:00',
    '0-2019-06-09T12:00:00.000+02:00',
  ])
})

test('Generate simple schedule and skip past events', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2019-05-26T17:23:00'),
    dayCronPattern: '* * 7,1',
    skipPast: true,
  })
  const aSchedule = scheduler.generateSchedule('12:00')

  const res = sampleEvents(aSchedule, 4)

  t.deepEqual(res, [
    '0-2019-05-27T12:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '0-2019-06-03T12:00:00.000+02:00',
    '0-2019-06-09T12:00:00.000+02:00',
  ])
})

test('Generate simple schedule without skipping past', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2019-05-26T17:23:00'),
    dayCronPattern: '* * 7,1',
    skipPast: false,
  })
  const aSchedule = scheduler.generateSchedule(
    '12:00',
    '15:00',
    '11:00',
    '10:00',
    '09:00',
    '08:00'
  )

  const res = sampleEvents(aSchedule, 10)

  t.deepEqual(res, [
    '0-2019-05-26T12:00:00.000+02:00',
    '1-2019-05-26T15:00:00.000+02:00',
    '2-2019-05-27T11:00:00.000+02:00',
    '3-2019-05-28T10:00:00.000+02:00',
    '4-2019-05-29T09:00:00.000+02:00',
    '5-2019-05-30T08:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '1-2019-06-02T15:00:00.000+02:00',
    '2-2019-06-03T11:00:00.000+02:00',
    '3-2019-06-04T10:00:00.000+02:00',
  ])
})

test('generate default schedule (all times)', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2019-05-23T17:23:00'),
    skipPast: true,
  })
  const aSchedule = scheduler.generateSchedule()

  const res = sampleEventsX(aSchedule, 20)

  t.log(res)
  t.deepEqual(res, [
    '8-2019-05-23T20:32:31.151+02:00-goldenHour',
    '9-2019-05-23T21:22:24.472+02:00-sunsetStart',
    '10-2019-05-23T21:26:54.308+02:00-sunset',
    '11-2019-05-23T22:14:02.918+02:00-dusk',
    '12-2019-05-23T23:24:42.725+02:00-nauticalDusk',
    '0-2019-05-24T00:00:00.000+02:00-midnight',
    '1-2019-05-24T01:18:19.930+02:00-nadir',
    '2-2019-05-24T03:09:07.861+02:00-nauticalDawn',
    '3-2019-05-24T04:20:48.579+02:00-dawn',
    '4-2019-05-24T05:08:16.016+02:00-sunrise',
    '5-2019-05-24T05:12:47.206+02:00-sunriseEnd',
    '6-2019-05-24T06:02:52.132+02:00-goldenHourEnd',
    '7-2019-05-24T13:18:19.930+02:00-solarNoon',
    '8-2019-05-24T20:33:47.728+02:00-goldenHour',
    '9-2019-05-24T21:23:52.654+02:00-sunsetStart',
    '10-2019-05-24T21:28:23.845+02:00-sunset',
    '11-2019-05-24T22:15:51.281+02:00-dusk',
    '12-2019-05-24T23:27:31.999+02:00-nauticalDusk',
    '0-2019-05-25T00:00:00.000+02:00-midnight',
    '1-2019-05-25T01:18:25.837+02:00-nadir',
  ])
})

test('Generate Schedule', t => {
  // here we have to day changes (11:00 and 06:00) and a daily cron
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2019-05-23T17:23:00'),
    skipPast: true,
  })
  const aSchedule = scheduler.generateSchedule('12:00', '11:00', '06:00', {
    time: '17:50',
    offset: 10,
  })

  const res = sampleEvents(aSchedule, 10)
  t.log(res)
  t.deepEqual(res, [
    '3-2019-05-23T18:00:00.000+02:00',
    '0-2019-05-24T12:00:00.000+02:00',
    '1-2019-05-25T11:00:00.000+02:00',
    '2-2019-05-26T06:00:00.000+02:00',
    '3-2019-05-26T18:00:00.000+02:00',
    '0-2019-05-27T12:00:00.000+02:00',
    '1-2019-05-28T11:00:00.000+02:00',
    '2-2019-05-29T06:00:00.000+02:00',
    '3-2019-05-29T18:00:00.000+02:00',
    '0-2019-05-30T12:00:00.000+02:00',
  ])
})

test('Generate simple schedule with skipping past', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2019-05-26T17:23:00'),
    skipPast: true,
    dayCronPattern: '* * 7,2',
  })
  const aSchedule = scheduler.generateSchedule(
    '12:00',
    '15:00',
    '11:00',
    '10:00',
    '09:00',
    '08:00'
  )

  const res = sampleEvents(aSchedule, 10)
  t.log(res)
  t.deepEqual(res, [
    '0-2019-05-28T12:00:00.000+02:00',
    '1-2019-05-28T15:00:00.000+02:00',
    '2-2019-05-29T11:00:00.000+02:00',
    '3-2019-05-30T10:00:00.000+02:00',
    '4-2019-05-31T09:00:00.000+02:00',
    '5-2019-06-01T08:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '1-2019-06-02T15:00:00.000+02:00',
    '2-2019-06-03T11:00:00.000+02:00',
    '3-2019-06-04T10:00:00.000+02:00',
  ])
})

test('Real scheduling', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2018-05-28T12:00:00.000+02:00'),
    skipPast: true,
  })
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.schedule('13:00', 'dusk').pipe(
      map(event => `${event.target.toISO()}-${event.index}-${event.label}`),
      take(3)
    )

    expectObservable(output).toBe('3600000ms a 33791982ms b 52608016ms (c|)', {
      a: '2018-05-28T13:00:00.000+02:00-0-13:00',
      b: '2018-05-28T22:23:11.983+02:00-1-dusk',
      c: '2018-05-29T13:00:00.000+02:00-0-13:00',
    })
  })
})

test('Real scheduling with past events', t => {
  const scheduler = new Scheduler({
    ...LOCATION,
    now: DateTime.fromISO('2018-05-28T12:00:00.000+02:00'),
    skipPast: false,
  })
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = scheduler.schedule('10:00', '11:00').pipe(
      map(event => `${event.target.toISO()}-${event.index}`),
      take(3)
    )

    expectObservable(output).toBe('a 3599999ms b 82799999ms (c|)', {
      a: '2018-05-28T10:00:00.000+02:00-0',
      b: '2018-05-28T11:00:00.000+02:00-1',
      c: '2018-05-29T10:00:00.000+02:00-0',
    })
  })
})
