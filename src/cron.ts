import { DateTime } from 'luxon'

import * as cronParser from 'cron-parser'
import { Observable, of } from 'rxjs'
import { expand, delay, skip, map } from 'rxjs/operators'

const debug = require('debug')('us-scheduler:cron')

/**
 * Creates a cron generator with standard cron pattern
 * ```
 * *    *    *    *    *    *
 * ┬    ┬    ┬    ┬    ┬    ┬
 * │    │    │    │    │    |
 * │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 * │    │    │    │    └───── month (1 - 12)
 * │    │    │    └────────── day of month (1 - 31)
 * │    │    └─────────────── hour (0 - 23)
 * │    └──────────────────── minute (0 - 59)
 * └───────────────────────── second (0 - 59, optional)
 * ```
 *
 * @param cronPattern the cron pattern
 * @param start optional start time as luxon datetime
 */
export function* generateCron(
  cronPattern: string,
  start?: DateTime
): IterableIterator<DateTime> {
  start = start ? start : DateTime.local()
  debug(`Generating cron "${cronPattern}" for ${start.toISO()}`)
  const times = cronParser.parseExpression(cronPattern, {
    iterator: false,
    utc: false,
    currentDate: start.toLocal().toJSDate(),
  })
  while (true) {
    yield DateTime.fromJSDate(times.next().toDate())
  }
}
/**
 * returns an observable cron stream
 * @param  cronPattern a standard cron pattern
 * @see {@link generateCron} for detailed pattern description
 * @return             observable stream
 *
 */
export function cron(cronPattern, start?: DateTime): Observable<DateTime> {
  const cronsource = generateCron(cronPattern, start)
  return of(start).pipe(
    expand((curDate, idx) => {
      const next = cronsource.next().value
      debug(
        `Croning from ${curDate.toISO()} to ${next.toISO()} = ${next
          .diff(curDate)
          .as('milliseconds') - 1}`
      )
      return of(next).pipe(delay(next.valueOf() - curDate.valueOf()))
    }),
    skip(1)
  )
}
