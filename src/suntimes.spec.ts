import anyTest, { TestInterface } from 'ava'

import { SunTimes } from './suntimes'

import { DateTime } from 'luxon'

import * as SunCalc from 'suncalc'
import { TestScheduler } from 'rxjs/testing'

interface Context {
  st: SunTimes
  st_winter: SunTimes
}

const test = anyTest as TestInterface<Context>

test.beforeEach('Initialize scheduler', t => {
  t.context.st = new SunTimes({
    latitude: 53.54,
    longitude: 9.98,
    now: DateTime.fromISO('2018-06-28T01:02:03.000+0200'),
  })
  t.context.st_winter = new SunTimes({
    latitude: 53.54,
    longitude: 9.98,
    now: DateTime.fromISO('2018-12-28T01:02:03.000+0200'),
  })
})

test('Construct for now', t => {
  const st = new SunTimes()

  const now = DateTime.local()
    .toISO()
    .substr(0, 8)
  t.is(st.now.toISO().substr(0, 8), now)
})

test('Calc times', t => {
  const calcTimes = t.context.st.calcTimes(
    DateTime.fromISO('2019-06-03T12:30:00.000+02:00')
  )

  const times = Object.keys(calcTimes).map(time => {
    return `${time}:${calcTimes[time].toISO()}`
  })
  t.log(times)

  t.deepEqual(times, [
    'midnight:2019-06-03T00:00:00.000+02:00',
    'solarNoon:2019-06-03T13:19:37.214+02:00',
    'nadir:2019-06-03T01:19:37.214+02:00',
    'sunrise:2019-06-03T04:57:38.837+02:00',
    'sunset:2019-06-03T21:41:35.592+02:00',
    'sunriseEnd:2019-06-03T05:02:22.448+02:00',
    'sunsetStart:2019-06-03T21:36:51.981+02:00',
    'dawn:2019-06-03T04:07:14.640+02:00',
    'dusk:2019-06-03T22:31:59.789+02:00',
    'nauticalDawn:2019-06-03T02:44:28.748+02:00',
    'nauticalDusk:2019-06-03T23:54:45.680+02:00',
    'goldenHourEnd:2019-06-03T05:54:12.679+02:00',
    'goldenHour:2019-06-03T20:45:01.749+02:00',
  ])

  t.deepEqual(
    t.context.st.now,
    DateTime.fromISO('2018-06-28T00:00:00.000+02:00')
  )
  t.deepEqual(
    t.context.st_winter.now,
    DateTime.fromISO('2018-12-28T00:00:00.000+01:00')
  )

  const now = DateTime.local()
  t.deepEqual(t.context.st.calcTimes(), t.context.st.calcTimes(now))
})

test('Get times', t => {
  t.deepEqual(
    t.context.st.now,
    DateTime.fromISO('2018-06-28T00:00:00.000+02:00')
  )
  t.deepEqual(
    t.context.st_winter.now,
    DateTime.fromISO('2018-12-28T00:00:00.000+01:00')
  )

  let times = Object.keys(t.context.st.times).map(time => {
    return `${time}:${t.context.st.get(time)}`
  })

  t.deepEqual(times, [
    'midnight:2018-06-28T00:00:00.000+02:00',
    'solarNoon:2018-06-28T13:24:28.750+02:00',
    'nadir:2018-06-28T01:24:28.750+02:00',
    'sunrise:2018-06-28T04:54:23.706+02:00',
    'sunset:2018-06-28T21:54:33.793+02:00',
    'sunriseEnd:2018-06-28T04:59:16.783+02:00',
    'sunsetStart:2018-06-28T21:49:40.716+02:00',
    'dawn:2018-06-28T04:01:39.204+02:00',
    'dusk:2018-06-28T22:47:18.295+02:00',
    'nauticalDawn:2018-06-28T02:26:45.427+02:00',
    'nauticalDusk:2018-06-29T00:22:12.072+02:00',
    'goldenHourEnd:2018-06-28T05:52:25.825+02:00',
    'goldenHour:2018-06-28T20:56:31.674+02:00',
  ])

  times = Object.keys(t.context.st_winter.times).map(time => {
    return `${time}:${t.context.st_winter.get(time)}`
  })

  t.deepEqual(times, [
    'midnight:2018-12-28T00:00:00.000+01:00',
    'solarNoon:2018-12-28T12:22:42.713+01:00',
    'nadir:2018-12-28T00:22:42.713+01:00',
    'sunrise:2018-12-28T08:37:47.882+01:00',
    'sunset:2018-12-28T16:07:37.544+01:00',
    'sunriseEnd:2018-12-28T08:42:31.769+01:00',
    'sunsetStart:2018-12-28T16:02:53.657+01:00',
    'dawn:2018-12-28T07:54:47.019+01:00',
    'dusk:2018-12-28T16:50:38.406+01:00',
    'nauticalDawn:2018-12-28T07:09:14.325+01:00',
    'nauticalDusk:2018-12-28T17:36:11.100+01:00',
    'nightEnd:2018-12-28T06:26:28.159+01:00',
    'night:2018-12-28T18:18:57.266+01:00',
    'goldenHourEnd:2018-12-28T09:45:34.485+01:00',
    'goldenHour:2018-12-28T14:59:50.940+01:00',
  ])
})

test('Get sorted times', t => {
  const times = t.context.st.sortedTimes.map(time => {
    return `${time.label}:${time.time}`
  })

  t.deepEqual(times, [
    'midnight:2018-06-28T00:00:00.000+02:00',
    'nadir:2018-06-28T01:24:28.750+02:00',
    'nauticalDawn:2018-06-28T02:26:45.427+02:00',
    'dawn:2018-06-28T04:01:39.204+02:00',
    'sunrise:2018-06-28T04:54:23.706+02:00',
    'sunriseEnd:2018-06-28T04:59:16.783+02:00',
    'goldenHourEnd:2018-06-28T05:52:25.825+02:00',
    'solarNoon:2018-06-28T13:24:28.750+02:00',
    'goldenHour:2018-06-28T20:56:31.674+02:00',
    'sunsetStart:2018-06-28T21:49:40.716+02:00',
    'sunset:2018-06-28T21:54:33.793+02:00',
    'dusk:2018-06-28T22:47:18.295+02:00',
    'nauticalDusk:2018-06-29T00:22:12.072+02:00',
  ])
})

test('Get times by timestring', t => {
  t.is(t.context.st.get('22:30').toISO(), '2018-06-28T22:30:00.000+02:00')
  t.is(
    t.context.st_winter.get('22:30').toISO(),
    '2018-12-28T22:30:00.000+01:00'
  )
})

test('Get invalid time', t => {
  t.throws(
    () => t.context.st.get('invalid'),
    '\'invalid\' is neither predefined nor a valid time (HH:mm) - unparsable'
  )
})

test('Parse invalid format ', t => {
  t.throws(
    () => t.context.st.parse({ max: [] }),
    'time definition ({"max":[]}) not valid'
  )
})

test('Parse simple times', t => {
  const time = t.context.st.parse('goldenHour')

  t.is(time.label, 'goldenHour')
  t.is(time.target.toISO(), '2018-06-28T20:56:31.674+02:00')
  t.is(time.offset, 0)
  t.is(time.random, 0)
  t.is(typeof time.data, 'undefined')
})

test('Parse single times', t => {
  const time = t.context.st.parse({ time: 'goldenHour', data: 'HELLO WORLD' })

  t.is(time.label, 'goldenHour')
  t.is(time.target.toISO(), '2018-06-28T20:56:31.674+02:00')
  t.is(time.offset, 0)
  t.is(time.random, 0)
  t.is(time.data, 'HELLO WORLD')
})
test('Parse min times', t => {
  const time = t.context.st.parse({
    min: ['21:00', 'goldenHour', '22:30'],
    data: 'HELLO MIN WORLD',
  })

  t.is(time.label, 'goldenHour')
  t.is(time.target.toISO(), '2018-06-28T20:56:31.674+02:00')
  t.is(time.offset, 0)
  t.is(time.random, 0)
  t.is(time.data, 'HELLO MIN WORLD')
})
test('Parse max times', t => {
  const time = t.context.st.parse({
    max: ['19:00', 'goldenHour', '18:30'],
    data: 'HELLO MAX WORLD',
  })

  t.is(time.label, 'goldenHour')
  t.is(time.target.toISO(), '2018-06-28T20:56:31.674+02:00')
  t.is(time.offset, 0)
  t.is(time.random, 0)
  t.is(time.data, 'HELLO MAX WORLD')
})

test('Randomize times', t => {
  const time = t.context.st.parse({
    time: 'goldenHour',
    random: 10,
    data: 'HELLO RANDOM WORLD',
  })

  t.is(time.label, 'goldenHour')
  t.true(
    DateTime.fromISO('2018-06-28T20:46:31.674+02:00') <= time.target &&
      time.target <= DateTime.fromISO('2018-06-28T21:06:31.674+02:00')
  )

  t.is(time.offset, 0)
  t.true(time.random >= -10 && time.random <= 10)
  t.is(time.data, 'HELLO RANDOM WORLD')
})

test('Offset times', t => {
  const time = t.context.st.parse({
    time: '22:30',
    offset: -10,
    data: 'HELLO OFFSET WORLD',
  })

  t.is(time.label, '22:30')
  t.is(time.target.toISO(), '2018-06-28T22:20:00.000+02:00')

  t.is(time.random, 0)
  t.is(time.offset, -10)
  t.is(time.data, 'HELLO OFFSET WORLD')
})

test('Get sunposition', t => {
  t.deepEqual(t.context.st.sun, {
    altitude: -6.504727607860147,
    azimuth: 354.88960486807593,
    date: DateTime.fromISO('2018-06-28T01:02:03.000+02:00'),
  })

  const st = new SunTimes({
    latitude: 53.54,
    longitude: 9.98,
  })

  const pos = st.sun
  t.is(
    pos.altitude,
    SunCalc.getPosition(pos.date.toJSDate(), 53.54, 9.98).altitude *
      (90 / Math.PI)
  )
})

test('Get sunposition in degress', t => {
  const st = new SunTimes({
    latitude: 53.54,
    longitude: 9.98,
  })
  const result = [
    '2019-06-01T00:00:00',
    '2019-06-01T03:00:00',
    '2019-06-01T06:00:00',
    '2019-06-01T09:00:00',
    '2019-06-01T13:20:00',
    '2019-06-01T15:00:00',
    '2019-06-01T18:00:00',
    '2019-06-01T21:00:00',
  ]
    .map(time => st.calcSun(DateTime.fromISO(time)))
    .map(sun => `${sun.altitude}-${sun.azimuth}-${sun.date.toFormat('HH:mm')}`)

  t.deepEqual(result, [
    '-6.328320682934276-341.4304801104363-00:00',
    '-5.688441334651504-23.96790219724761-03:00',
    '3.333518204360735-61.613993236987326-06:00',
    '16.257926100980697-96.65316709116179-09:00',
    '29.231193769052616-180.72737211034075-13:20',
    '26.52261772590303-221.42626948877552-15:00',
    '14.55367320806308-268.2194030861742-18:00',
    '1.8824324039564655-302.9549973191939-21:00',
  ])
})
