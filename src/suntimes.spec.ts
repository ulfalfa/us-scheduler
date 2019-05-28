import anyTest, { TestInterface } from 'ava'

import { SunTimes } from './suntimes'

import { DateTime } from 'luxon'

import * as SunCalc from 'suncalc'

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
    '_start_:2018-06-28T00:00:00.000+02:00',
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
    '_start_:2018-12-28T00:00:00.000+01:00',
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
    'invalid is neither predefined nor a valid time (HH:mm)'
  )
})

test('Get times by timestring with random', t => {
  let time = t.context.st.get('goldenHour', { random: 10 })

  t.true(
    DateTime.fromISO('2018-06-28T20:46:31.674+02:00') <= time &&
      time <= DateTime.fromISO('2018-06-28T21:06:31.674+02:00')
  )

  time = t.context.st.get('goldenHour', { offset: 10 })

  t.is(time.toISO(), '2018-06-28T21:06:31.674+02:00')
  time = t.context.st.get('goldenHour', { offset: -10 })

  t.is(time.toISO(), '2018-06-28T20:46:31.674+02:00')
})

test('Get min and max times ', t => {
  let time = t.context.st.max(['goldenHour', '21:00'])

  t.is(time.toISO(), '2018-06-28T21:00:00.000+02:00')

  time = t.context.st.min(['goldenHour', '21:00'])

  t.is(time.toISO(), '2018-06-28T20:56:31.674+02:00')
})

test('Get sunposition', t => {
  t.deepEqual(t.context.st.sun, {
    altitude: -0.2270578274050683,
    azimuth: 3.0523994324598287,
    date: DateTime.fromISO('2018-06-28T01:02:03.000+02:00'),
  })

  const st = new SunTimes({
    latitude: 53.54,
    longitude: 9.98,
  })

  const pos = st.sun
  t.is(
    pos.altitude,
    SunCalc.getPosition(pos.date.toJSDate(), 53.54, 9.98).altitude
  )
})
