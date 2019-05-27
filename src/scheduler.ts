import { Duration, DateTime } from 'luxon'
import { Observable, timer, of } from 'rxjs'
import { map, expand, delay, skip } from 'rxjs/operators'
import { generateCron } from './cron'
import { SunTimes } from './suntimes'

const debug = require('debug')('us-scheduler:scheduler')

function startDefault(start: DateTime) {
  return start ? start : DateTime.local()
}

/**
 * emits after a specified duration
 * @param  duration either a duration in ISO8601 (without the P) or seconds
 * @return          observable, that fires after duration is over;
 */
export function doIn<T>(duration: string | number, data?: T): Observable<T> {
  let d: Duration
  if (typeof duration === 'string') {
    d = Duration.fromISO('PT' + duration.toUpperCase())
  } else {
    d = Duration.fromISO('PT' + duration.toString() + 'S')
  }

  return timer(d.as('milliseconds')).pipe(map(() => data))
}

/**
 * Emits at a given datetime
 * @param date the date to emit
 * @param data the data to emit
 * @param from optional start date (mainly for testing purposes)
 */
export function doAt<T>(
  date: DateTime,
  data?: T,
  from?: DateTime
): Observable<T> {
  const ms = date.valueOf() - startDefault(from).valueOf()

  return ms > 0 ? timer(ms).pipe(map(() => data)) : of(data)
}

export interface ScheduleOptions {
  /** latitude for sun calculations */
  latitude: number
  /** longitude for sun calculations */
  longitude: number
  dayCronPattern?: string
  /** optional startTime used a now in ISO Format(mainly for testing purposes) */
  now?: string
  skipPast?: boolean
  skipStart?: boolean
  random?: number // a randomizing factor in minutes
  offset?: number // a potential offset in minutes
}
export interface ComplexTime {
  time: SimpleTime // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
  random?: number // a randomizing factor in minutes
  offset?: number // a potential offset in minutes
  data?: any // data to emit
}

export interface MinTimes {
  min: SimpleTime[] // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
}
export interface MaxTimes {
  max: SimpleTime[] // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
}

export type SimpleTime = string
export type TimeDefinition = SimpleTime | ComplexTime | MinTimes | MaxTimes

function isSimpleTime(val: TimeDefinition): val is SimpleTime {
  return typeof val === 'string'
}
function isComplexTime(val: TimeDefinition): val is ComplexTime {
  return typeof val !== 'string' && val.hasOwnProperty('time')
}
function isMinTime(val: TimeDefinition): val is MinTimes {
  return val.hasOwnProperty('min') && Array.isArray((val as MinTimes).min)
}
function isMaxTime(val: TimeDefinition): val is MaxTimes {
  return val.hasOwnProperty('max') && Array.isArray((val as MaxTimes).max)
}
function isScheduleOptions(val: any): val is MinTimes {
  return val.hasOwnProperty('latitude') && val.hasOwnProperty('longitude')
}

export interface ScheduleEvent {
  index: number
  target: DateTime
  definition?: TimeDefinition
  data?: any
}

export function* generateSchedule(
  times: TimeDefinition[],
  options: ScheduleOptions
): IterableIterator<ScheduleEvent> {
  options.dayCronPattern = options.dayCronPattern || '* * *'

  /* istanbul ignore next */
  const start = options.now ? DateTime.fromISO(options.now) : DateTime.local()
  options.offset = options.offset || 0
  options.random = options.random || 0
  options.skipPast =
    typeof options.skipPast === 'undefined' ? false : options.skipPast

  const cron = generateCron('59 59 23 ' + options.dayCronPattern, start)

  // getting the current date for cron (is end of day, to allow dates in the past)
  let now = cron.next().value
  debug(`Starting at ${start.toISO()}`)
  while (true) {
    // calculate suntimes for today
    let st = new SunTimes({
      longitude: options.longitude,
      latitude: options.latitude,
      now,
    })
    let lastTarget = st.now.minus({ seconds: 1 })

    for (let index = 0; index < times.length; index++) {
      let target: DateTime
      const definition = times[index]
      /* istanbul ignore next */
      if (isComplexTime(definition)) {
        target = st.get(definition.time, {
          random: definition.random || options.random,
          offset: definition.offset || options.offset,
        })
      } else if (isSimpleTime(definition)) {
        target = st.get(definition, {
          random: options.random,
          offset: options.offset,
        })
      } else if (isMinTime(definition)) {
        target = st.min(definition.min, {
          random: options.random,
          offset: options.offset,
        })
      } else if (isMaxTime(definition)) {
        target = st.max(definition.max, {
          random: options.random,
          offset: options.offset,
        })
      } else {
        throw new Error('time definition not known')
      }
      if (target <= lastTarget) {
        target = target.plus({ days: 1 })
        st = new SunTimes({
          longitude: options.longitude,
          latitude: options.latitude,
          now: target,
        })
      }
      // debug('Yield', index, target.toISO());
      if (target > start || !options.skipPast) {
        yield {
          index,
          target,
          definition,
          data: (definition as ComplexTime).data,
        }
        lastTarget = target
      }
    }
    now = cron.next().value
    while (now < lastTarget.endOf('day')) {
      now = cron.next().value
      debug(`   check ${now.toISO()}`)
    }
  }
}

export function schedule(
  ...times: (TimeDefinition | ScheduleOptions)[]
): Observable<ScheduleEvent> {
  if (times.length === 0 || !isScheduleOptions(times[times.length - 1])) {
    throw new Error('last parameter must be scheduling options')
  }
  if (times.length < 2) {
    throw new Error('at least on time must be specified')
  }
  const options = times.pop() as ScheduleOptions
  options.skipStart =
    typeof options.skipStart === 'undefined' ? true : options.skipStart

  const aSchedule = generateSchedule(times as TimeDefinition[], options)

  const result = of<ScheduleEvent>({
    target: DateTime.fromISO(options.now),
    index: -1,
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

  return options.skipStart ? result.pipe(skip(1)) : result
}
