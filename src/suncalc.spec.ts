import test, { TestInterface } from 'ava'

import { DateTime } from 'luxon'
import { getTimes } from './suncalc'

function convertDateTimes(times: object): string[] {
  return Object.keys(times).map(
    key => `${key}:${DateTime.fromJSDate(times[key]).toISO()}`
  )
}
function convertTimes(times: object): string[] {
  return Object.keys(times).map(key => `${key}:${times[key]}`)
}

test('Get some numbers', t => {
  t.log(DateTime.fromMillis(2440587).toISO())
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
    DateTime.fromISO('2019-06-07T02:00:00.000+02:00'),
    // DateTime.utc(),
    53.54,
    9.98
  )

  t.log(convertDateTimes(times))
})
