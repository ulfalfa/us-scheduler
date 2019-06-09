import test, { TestInterface } from 'ava'

import { DateTime } from 'luxon'
import { getTimes, toJulian, toDays } from './suncalc'

function convertDateTimes(times: object): string[] {
  return Object.keys(times).map(
    key => `${key}:${DateTime.fromJSDate(times[key]).toISO()}`
  )
}
function convertTimes(times: object): string[] {
  return Object.keys(times).map(key => `${key}:${times[key]}`)
}

test('Julian conversion', t => {
  t.is(toJulian(DateTime.fromISO('1970-01-01T00:00:00.000+00:00')), 2440587.5)
  t.is(toDays(DateTime.fromISO('2000-01-01T12:00:00.000+00:00')), 0)
})

test('Basic suncalc', t => {
  /*const sctimes = Suncalc.getTimes(
        startTime
          .startOf('day')
          .toUTC(2, { keepLocalTime: true })
          .toJSDate(),
        this.options.latitude,
        this.options.longitude
      )*/

  const times = getTimes(
    DateTime.fromISO('2019-06-07'),
    // DateTime.utc(),
    53.54,
    9.98
  )

  const res = convertTimes(times)
  t.log(res)
  t.deepEqual(res, [
    'solarNoon:2019-06-07T13:20:17.668+02:00',
    'nadir:2019-06-07T01:20:17.668+02:00',
    'sunrise:2019-06-07T04:54:46.966+02:00',
    'sunset:2019-06-07T21:45:48.370+02:00',
    'sunriseEnd:2019-06-07T04:59:34.601+02:00',
    'sunsetStart:2019-06-07T21:41:00.736+02:00',
    'dawn:2019-06-07T04:03:23.763+02:00',
    'dusk:2019-06-07T22:37:11.574+02:00',
    'nauticalDawn:2019-06-07T02:36:02.604+02:00',

    'nauticalDusk:2019-06-08T00:04:32.733+02:00',

    'nightEnd:Invalid DateTime',
    'night:Invalid DateTime',
    'goldenHourEnd:2019-06-07T05:51:58.495+02:00',
    'goldenHour:2019-06-07T20:48:36.842+02:00',
  ])
})
