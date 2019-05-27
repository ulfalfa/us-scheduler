import test from 'ava'

import { generateCron } from './cron'

import { DateTime } from 'luxon'

test('Generates a cron with start', t => {
  let cron = generateCron(
    '0 30 12 * * *',
    DateTime.fromISO('2018-06-28T12:00:00')
  )
  t.is(cron.next().value.toISO(), '2018-06-28T12:30:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-06-29T12:30:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-06-30T12:30:00.000+02:00')

  cron = generateCron('0 30 12 * * *', DateTime.fromISO('2018-06-28T13:00:00'))
  t.is(cron.next().value.toISO(), '2018-06-29T12:30:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-06-30T12:30:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-07-01T12:30:00.000+02:00')
})

test('Generates a cron starting from now', t => {
  const cron = generateCron('59 59 23 * * *')

  const now = DateTime.local().set({
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  })

  t.is(cron.next().value.toISO(), now.toISO())
  t.is(cron.next().value.toISO(), now.plus({ days: 1 }).toISO())
})

test('Error handling with several cron pattern', t => {
  // only month - valid
  let cron = generateCron('7', DateTime.fromISO('2018-06-28T12:00:00'))
  t.is(cron.next().value.toISO(), '2018-07-01T00:00:00.000+02:00')
  t.is(cron.next().value.toISO(), '2018-07-01T00:01:00.000+02:00')

  cron = generateCron('31')

  t.throws(
    () => cron.next().value,
    /Constraint error, got value 31 expected range 0-7/
  )

  cron = generateCron('THISISWRONG')
  t.throws(
    () => cron.next().value,
    /Invalid characters, got value: undefinedundefinedundefinedundefined/
  )
  cron = generateCron('1 2 3 4 5 6 7')
  t.throws(() => cron.next().value, /Invalid cron expression/)

  /*cron = generateCron('7 7 7 7 7 7 7', DateTime.fromISO('2018-06-28T12:00:00'))
  t.is(cron.next().value.toISO(), '2018-07-01T07:07:07.000+02:00')
  t.is(cron.next().value.toISO(), '2018-07-07T07:07:07.000+02:00')*/
})
