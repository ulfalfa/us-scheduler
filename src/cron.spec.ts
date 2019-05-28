import test from 'ava'

import { generateCron, cron } from './cron'

import { DateTime } from 'luxon'
import { TestScheduler } from 'rxjs/testing'
import { take } from 'rxjs/operators'

test('Generates a cron with start', t => {
  let myCron = generateCron(
    '0 30 12 * * *',
    DateTime.fromISO('2018-06-28T12:00:00')
  )
  t.is(myCron.next().value.toISO(), '2018-06-28T12:30:00.000+02:00')
  t.is(myCron.next().value.toISO(), '2018-06-29T12:30:00.000+02:00')
  t.is(myCron.next().value.toISO(), '2018-06-30T12:30:00.000+02:00')

  myCron = generateCron(
    '0 30 12 * * *',
    DateTime.fromISO('2018-06-28T13:00:00')
  )
  t.is(myCron.next().value.toISO(), '2018-06-29T12:30:00.000+02:00')
  t.is(myCron.next().value.toISO(), '2018-06-30T12:30:00.000+02:00')
  t.is(myCron.next().value.toISO(), '2018-07-01T12:30:00.000+02:00')
})

test('Generates a cron starting from now', t => {
  const myCron = generateCron('59 59 23 * * *')

  const now = DateTime.local().set({
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  })

  t.is(myCron.next().value.toISO(), now.toISO())
  t.is(myCron.next().value.toISO(), now.plus({ days: 1 }).toISO())
})

test('Error handling with several cron pattern', t => {
  // only month - valid
  let myCron = generateCron('7', DateTime.fromISO('2018-06-28T12:00:00'))
  t.is(myCron.next().value.toISO(), '2018-07-01T00:00:00.000+02:00')
  t.is(myCron.next().value.toISO(), '2018-07-01T00:01:00.000+02:00')

  myCron = generateCron('31')

  t.throws(
    () => myCron.next().value,
    /Constraint error, got value 31 expected range 0-7/
  )

  myCron = generateCron('THISISWRONG')
  t.throws(
    () => myCron.next().value,
    /Invalid characters, got value: undefinedundefinedundefinedundefined/
  )
  myCron = generateCron('1 2 3 4 5 6 7')
  t.throws(() => myCron.next().value, /Invalid cron expression/)

  /*cron = generateCron('7 7 7 7 7 7 7', DateTime.fromISO('2018-06-28T12:00:00'))
  t.is(cron.next().value.toISO(), '2018-07-01T07:07:07.000+02:00')
  t.is(cron.next().value.toISO(), '2018-07-07T07:07:07.000+02:00')*/
})

test('cron scheduling', t => {
  const testScheduler = new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected)
  })

  // This test will actually run *synchronously*
  testScheduler.run(({ cold, expectObservable }) => {
    const output = cron(
      '56 34 12 15 * *',
      DateTime.fromISO('2018-05-28T12:00:00.000+02:00')
    ).pipe(take(3))

    expectObservable(output).toBe(
      '1557296000ms a 2591999999ms b 2678399999ms (c|)',
      {
        a: DateTime.fromISO('2018-06-15T12:34:56.000+02:00'),
        b: DateTime.fromISO('2018-07-15T12:34:56.000+02:00'),
        c: DateTime.fromISO('2018-08-15T12:34:56.000+02:00'),
      }
    )
  })
})
