import { getTimes, getPosition } from './suncalc'

import { DateTime, Duration } from 'luxon'
import {
  TimeBase,
  SunTimesOptions,
  TimeDefinition,
  SimpleTime,
  SingleTime,
  MinTimes,
  MaxTimes,
  SunPosition,
  CalculatedTime,
} from './models'
import { open } from 'fs'
import { timestamp, map } from 'rxjs/operators'
import { timer, of, Observable } from 'rxjs'

const debug = require('debug')('us-scheduler:suntimes')

const START_LABEL = 'midnight'
export interface Times {
  midnight: DateTime
  [name: string]: DateTime
}

const TIME_PATTERN = /^(\d\d):(\d\d)$/

function isSimpleTime<T>(val: TimeDefinition<T>): val is SimpleTime {
  return typeof val === 'string'
}
function isSingleTime<T>(val: TimeDefinition<T>): val is SingleTime<T> {
  return typeof val !== 'string' && val.hasOwnProperty('time')
}
function isMinTimes<T>(val: TimeDefinition<T>): val is MinTimes<T> {
  return (
    val.hasOwnProperty('min') &&
    Array.isArray((val as MinTimes).min) &&
    (val as MinTimes).min.length > 0
  )
}
function isMaxTimes<T>(val: TimeDefinition<T>): val is MaxTimes<T> {
  return (
    val.hasOwnProperty('max') &&
    Array.isArray((val as MaxTimes).max) &&
    (val as MaxTimes).max.length > 0
  )
}

export class SunTimes {
  protected _times: Times
  get times(): Times {
    return this._times
  }

  get sortedTimes(): { label: string; time: string }[] {
    return Object.keys(this.times)
      .map(label => ({ label, time: this.times[label] }))
      .sort((a, b) => a.time.valueOf() - b.time.valueOf())
      .map(({ label, time }) => ({ label, time: time.toISO() }))
  }

  set now(now: DateTime) {
    const start = now ? now.plus(0) : DateTime.local()
    this._times = this.calcTimes(start)
  }

  get now(): DateTime {
    return this._times[START_LABEL]
  }

  get sun(): SunPosition {
    return this.calcSun(this.options.now)
  }

  constructor(
    protected options: SunTimesOptions = { latitude: 53.54, longitude: 9.98 }
  ) {
    this.now = options.now
  }

  calcSun(date: DateTime = DateTime.local()): SunPosition {
    const result = getPosition(
      date,
      this.options.latitude,
      this.options.longitude
    )

    return {
      altitude: result.altitude * (90 / Math.PI),
      azimuth: result.azimuth * (180 / Math.PI) + 180,
      date,
    }
  }

  calcTimes(startTime: DateTime = DateTime.local()): Times {
    const sctimes = getTimes(
      startTime,
      this.options.latitude,
      this.options.longitude
    )
    const resTimes: Times = Object.keys(sctimes).reduce(
      (times, cur) => {
        if (sctimes[cur].isValid) {
          times[cur] = sctimes[cur]
        }

        return times
      },
      { midnight: startTime.startOf('day') }
    )

    return resTimes
  }

  /**
   * gets a the datetime of a input string according to the current calculated sun times
   * @param time a string definition (either astro time or string HH24:MM)
   */
  get<T>(time: SimpleTime): DateTime {
    let result: DateTime
    if (this._times[time]) {
      result = this._times[time]
    } else {
      const match = time.match(TIME_PATTERN)
      if (match) {
        const [, hour, min] = match
        result = this._times[START_LABEL].set({
          hour: parseInt(hour, 10),
          minute: parseInt(min, 10),
        })
      } else {
        result = DateTime.fromISO(time)
        if (!result.isValid) {
          throw new Error(
            `'${time}' is neither predefined nor a valid time (HH:mm) - ${
              result.invalidReason
            }`
          )
        }
      }
    }
    return result
  }

  parse<T>(definition: TimeDefinition<T>): CalculatedTime<T> {
    if (isSimpleTime(definition)) {
      definition = {
        time: definition,
        offset: 0,
        random: 0,
        data: undefined,
      }
    }

    let result: CalculatedTime<T>

    if (isSingleTime(definition)) {
      result = this.resolveSimple(definition)
    } else if (isMinTimes(definition)) {
      result = this.resolveMin(definition)
    } else if (isMaxTimes(definition)) {
      result = this.resolveMax(definition)
    } else {
      throw new Error(
        `time definition (${JSON.stringify(definition)}) not valid`
      )
    }

    return this.alterTime(result)
  }

  protected alterTime<T>(input: CalculatedTime<T>): CalculatedTime<T> {
    if (input.random && input.random > 0) {
      const minutes =
        Math.floor(Math.random() * (2 * input.random + 1)) - input.random
      input.target = input.target.plus({ minutes })
      input.random = minutes
    } else {
      input.random = 0
    }

    if (input.offset && input.offset !== 0) {
      input.target = input.target.plus({ minutes: input.offset })
    } else {
      input.offset = 0
    }
    return input
  }

  protected resolveSimple<T>(input: SingleTime<T>): CalculatedTime<T> {
    return {
      target: this.get(input.time),
      offset: input.offset,
      random: input.random,
      label: input.time,
      data: input.data,
    }
  }

  protected resolveMin<T>(times: MinTimes<T>): CalculatedTime<T> {
    // convert to ms since epoque
    let idx = 0
    const resolvedTimes = times.min.map(simpleTime => this.get(simpleTime))

    resolvedTimes.forEach(
      (value, curidx, all) => (idx = value < all[idx] ? curidx : idx)
    )

    return {
      target: resolvedTimes[idx],
      label: times.min[idx],
      offset: times.offset,
      random: times.random,
      data: times.data,
    }
  }

  protected resolveMax<T>(times: MaxTimes<T>): CalculatedTime<T> {
    // convert to ms since epoque
    let idx = 0
    const resolvedTimes = times.max.map(simpleTime => this.get(simpleTime))

    resolvedTimes.forEach(
      (value, curidx, all) => (idx = value > all[idx] ? curidx : idx)
    )

    return this.alterTime({
      target: resolvedTimes[idx],
      label: times.max[idx],
      offset: times.offset,
      random: times.random,
      data: times.data,
    })
  }
}
