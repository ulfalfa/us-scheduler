import { Duration, DateTime } from 'luxon'
import { Observable, timer, of } from 'rxjs'
import { map, expand, delay, skip } from 'rxjs/operators'
import { generateCron } from './cron'
import { SunTimes } from './suntimes'
import {
  SchedulerOptions,
  TimeDefinition,
  ScheduleEvent,
  CalculatedTime,
  SunTimesOptions,
} from './models'

const debug = require('debug')('us-scheduler:scheduler')

export class Scheduler {
  get now(): DateTime {
    return this.options.now || DateTime.local()
  }
  constructor(protected options: SchedulerOptions) {
    options.dayCronPattern = options.dayCronPattern || '* * *'
    /* istanbul ignore next */

    options.skipPast =
      typeof options.skipPast === 'undefined' ? false : options.skipPast
  }

  getSuntimes(): SunTimes {
    return new SunTimes({ ...(this.options as SunTimesOptions) })
  }

  *generateSchedule<T>(
    ...times: TimeDefinition<T>[]
  ): IterableIterator<ScheduleEvent<T>> {
    debug(`Starting at ${this.now.toISO()}`)
    const cron = generateCron(
      '59 59 23 ' + this.options.dayCronPattern,
      this.now
    )

    // getting the current date for cron (is end of day, to allow dates in the past)
    let now = cron.next().value
    const st = new SunTimes({
      longitude: this.options.longitude,
      latitude: this.options.latitude,
      now,
    })

    if (times.length === 0) {
      times = st.sortedTimes.map(time => time.label)
    }

    while (true) {
      let lastTarget = st.now.minus({ seconds: 1 })

      for (let index = 0; index < times.length; index++) {
        const target = st.parse(times[index])

        if (target.target <= lastTarget) {
          target.target = target.target.plus({ days: 1 })
          st.now = target.target
        }

        debug(`${target.target.toISO()} compared to ${this.now.toISO()}  `)
        if (target.target > this.now || !this.options.skipPast) {
          debug('YIELD')
          yield {
            index,
            ...target,
          }
          lastTarget = target.target
        }
      }
      now = cron.next().value
      while (now < lastTarget.endOf('day')) {
        now = cron.next().value
        debug(`   check ${now.toISO()}`)
      }
      st.now = now
    }
  }

  schedule<T>(...times: TimeDefinition<T>[]): Observable<ScheduleEvent<T>> {
    const aSchedule = this.generateSchedule(...times)

    const result = of<ScheduleEvent<T>>({
      target: this.now,
      index: -1,
      label: '__START__',
      offset: 0,
      random: 0,
    }).pipe(
      expand(current => {
        const next = aSchedule.next().value
        const waitMs = next.target.valueOf() - current.target.valueOf()
        debug(
          `Croning from ${current.target.toISO()} to ${next.target.toISO()} = ${waitMs -
            1} ms`
        )
        return of(next).pipe(delay(waitMs > 0 ? waitMs : 0))
      })
    )

    return result.pipe(skip(1))
  }

  /**
   * Emits at a given time definition
   * @param definition the time to emit
   * @param from optional start date (mainly for testing purposes)
   */

  at<T>(definition: TimeDefinition<T>): Observable<CalculatedTime<T>> {
    const st = new SunTimes(this.options)
    const result = st.parse(definition)
    const ms = result.target.valueOf() - this.now.valueOf()
    debug(`Do at ${result.target.toISO()} means in '${ms}ms'`)
    return ms > 0 ? timer(ms).pipe(map(() => result)) : of(result)
  }

  /**
   * emits after a specified duration
   * @param  duration either a duration in ISO8601 or seconds
   * @return          observable, that fires after duration is over;
   */
  in<T>(duration: string | number, data?: T): Observable<T> {
    let d: Duration
    if (typeof duration === 'string') {
      d = Duration.fromISO(duration.toUpperCase())
    } else {
      d = Duration.fromISO('PT' + duration.toString() + 'S')
    }

    return timer(d.as('milliseconds')).pipe(map(() => data))
  }
}
