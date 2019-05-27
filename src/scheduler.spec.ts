import test from 'ava'
import { TestScheduler } from 'rxjs/testing'

import {
  doIn,
  doAt,
  schedule,
  generateSchedule,
  ScheduleEvent,
} from './scheduler'

import { DateTime } from 'luxon'
import { map, take } from 'rxjs/operators'
import { interval } from 'rxjs'

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

test('Test "doIn" with ISO', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = doIn('1m', 'DATA')

    expectObservable(output).toBe('1m (a|)', {
      a: 'DATA',
    })
  })
})
test('Test "doIn" with seconds', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = doIn(60, 'DATA')

    expectObservable(output).toBe('1m (a|)', {
      a: 'DATA',
    })
  })
})

test('Test "at" with with date', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })
  const targetDate = DateTime.fromISO('2018-05-30T12:03:00.000+02:00')
  testScheduler.run(({ cold, expectObservable }) => {
    const output = doAt(
      targetDate,
      'DATA',
      DateTime.fromISO('2018-05-28T12:00:00.000+02:00')
    )
    expectObservable(output).toBe('2883m (a|)', {
      a: 'DATA',
    })
  })
})

test('Test "at" with with date in past', t => {
  const testScheduler = new TestScheduler(actual => {
    t.is(actual[0].frame, 0)
    t.is(actual[0].notification.value, 'DATA')
  })
  const targetDate = DateTime.fromISO('2018-05-30T12:03:00.000+02:00')
  testScheduler.run(({ cold, expectObservable }) => {
    const output = doAt(
      targetDate,
      'DATA',
      DateTime.fromISO('2019-05-28T12:00:00.000+02:00')
    )
    expectObservable(output).toBe('')
  })
})

test('Test "at" with with date with current date', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.true(
      actual[0].frame >= 864000000 - 10 && actual[0].frame < 864000000 + 10
    )
  })
  const targetDate = DateTime.local().plus({ days: 10 })
  testScheduler.run(({ cold, expectObservable }) => {
    const output = doAt(targetDate, 'DATA')
    expectObservable(output).toBe('')
  })
})

test('Schedule - error handling', t => {
  t.throws(() => schedule(), 'last parameter must be scheduling options')
  t.throws(
    () => schedule({ latitude: 53.54, longitude: 9.98 }),
    'at least on time must be specified'
  )
})

test('Generate simple schedule', t => {
  const aSchedule = generateSchedule(['12:00'], {
    latitude: 53.54,
    longitude: 9.98,
    now: '2019-05-26T17:23:00',
    dayCronPattern: '* * 7,1',
  })

  const res = sampleEvents(aSchedule, 5)
  t.log(res)
  t.deepEqual(res, [
    '0-2019-05-26T12:00:00.000+02:00', // this is in past and ok, because skipPast = false
    '0-2019-05-27T12:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '0-2019-06-03T12:00:00.000+02:00',
    '0-2019-06-09T12:00:00.000+02:00',
  ])
})
test('Generate simple schedule and skip past events', t => {
  const aSchedule = generateSchedule(['12:00'], {
    latitude: 53.54,
    longitude: 9.98,
    now: '2019-05-26T17:23:00',
    skipPast: true,
    dayCronPattern: '* * 7,1',
  })

  const res = sampleEvents(aSchedule, 4)
  t.log(res)
  t.deepEqual(res, [
    '0-2019-05-27T12:00:00.000+02:00',
    '0-2019-06-02T12:00:00.000+02:00',
    '0-2019-06-03T12:00:00.000+02:00',
    '0-2019-06-09T12:00:00.000+02:00',
  ])
})

test('Generate simple schedule without skipping past', t => {
  const aSchedule = generateSchedule(
    ['12:00', '15:00', '11:00', '10:00', '09:00', '08:00'],
    {
      latitude: 53.54,
      longitude: 9.98,
      now: '2019-05-26T17:23:00',
      skipPast: false,
      dayCronPattern: '* * 7,1',
    }
  )

  const res = sampleEvents(aSchedule, 10)
  t.log(res)
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

test('Generate Schedule', t => {
  // here we have to day changes (11:00 and 06:00) and a daily cron
  const aSchedule = generateSchedule(
    ['12:00', '11:00', '06:00', { time: '17:50', offset: 10 }],
    {
      latitude: 53.54,
      longitude: 9.98,
      now: '2019-05-23T17:23:00',
      skipPast: true,
    }
  )

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

/*------*/

test('Generate simple schedule with skipping past', t => {
  const aSchedule = generateSchedule(
    ['12:00', '15:00', '11:00', '10:00', '09:00', '08:00'],
    {
      latitude: 53.54,
      longitude: 9.98,
      now: '2019-05-26T17:23:00',
      skipPast: true,
      dayCronPattern: '* * 7,2',
    }
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

test('Practical Examplee', t => {
  const aSchedule = generateSchedule(
    [
      'dawn',
      'sunrise',
      { max: ['dusk', '22:32'] },
      { min: ['23:32', '23:33'] },
    ],
    {
      latitude: 53.54,
      longitude: 9.98,
      now: '2019-05-23T17:23:00',
      skipPast: false,
    }
  )

  const res = sampleEvents(aSchedule, 10)
  t.log(res)
  t.deepEqual(res, [
    '0-2019-05-23T04:22:26.035+02:00',
    '1-2019-05-23T05:09:34.645+02:00',
    '2-2019-05-23T22:32:00.000+02:00',
    '3-2019-05-23T23:32:00.000+02:00',
    '0-2019-05-24T04:20:48.579+02:00',
    '1-2019-05-24T05:08:16.016+02:00',
    '2-2019-05-24T22:32:00.000+02:00',
    '3-2019-05-24T23:32:00.000+02:00',
    '0-2019-05-25T04:19:13.768+02:00',
    '1-2019-05-25T05:06:59.935+02:00',
  ])
})

test('Real scheduling', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = schedule('13:00', 'dusk', {
      latitude: 53.54,
      longitude: 9.98,
      now: '2018-05-28T12:00:00.000+02:00',
      skipPast: true,
      skipStart: false,
    }).pipe(
      map(event => `${event.target.toISO()}-${event.index}`),
      take(4)
    )

    expectObservable(output).toBe(
      's 3599999ms a 33791982ms b 52608016ms (c|)',
      {
        s: '2018-05-28T12:00:00.000+02:00--1',
        a: '2018-05-28T13:00:00.000+02:00-0',
        b: '2018-05-28T22:23:11.983+02:00-1',
        c: '2018-05-29T13:00:00.000+02:00-0',
      }
    )
  })
})

test('Real scheduling with past events', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = schedule('10:00', '11:00', {
      latitude: 53.54,
      longitude: 9.98,
      now: '2018-05-28T12:00:00.000+02:00',
      skipPast: false,
    }).pipe(
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
