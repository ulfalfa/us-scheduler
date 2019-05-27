import * as Suncalc from 'suncalc'

import { DateTime } from 'luxon'

const debug = require('debug')('us-scheduler:suntimes')

const START_LABEL = '_start_'
export interface Times {
  _start_: DateTime
  [name: string]: DateTime
}

const TIME_PATTERN = /(\d\d):(\d\d)/

export interface TimeAlteration {
  random?: number
  offset?: number
}

/**
 * options for creating a suntimes object
 */
export interface SunTimesOptions {
  /** latitude for sun calculations */
  latitude: number
  /** longitude for sun calculations */
  longitude: number
  /** optional startTime used as starting point in luxon DateTime format */
  now?: DateTime
}

export class SunTimes {
  protected _times: Times
  get times(): Times {
    return this._times
  }

  set now(now: DateTime) {
    const start = now ? now : DateTime.local()
    this._times = this.calcTimes(start)
  }

  get now(): DateTime {
    return this._times[START_LABEL]
  }

  constructor(
    protected options: SunTimesOptions = { latitude: 53.54, longitude: 9.98 }
  ) {
    this.now = options.now
  }

  protected calcTimes(startTime: DateTime): Times {
    const sctimes = Suncalc.getTimes(
      startTime
        .startOf('day')
        .toUTC(0, { keepLocalTime: true })
        .toJSDate(),
      this.options.latitude,
      this.options.longitude
    )
    const resTimes: Times = Object.keys(sctimes).reduce(
      (times, cur) => {
        if (!isNaN(sctimes[cur])) {
          times[cur] = DateTime.fromJSDate(sctimes[cur]).setZone('local', {
            keepCalendarTime: true,
          })
        }

        return times
      },
      { _start_: startTime.startOf('day') }
    )

    return resTimes
  }

  get(time: string, options?: TimeAlteration): DateTime {
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
        throw new Error(
          `${time} is neither predefined nor a valid time (HH:mm)`
        )
      }
    }

    return this.alterTime(result, options)
  }

  protected alterTime(
    time: DateTime,
    options: TimeAlteration = { random: 0, offset: 0 }
  ) {
    if (options.random > 0) {
      const minutes =
        Math.floor(Math.random() * (2 * options.random + 1)) - options.random
      time = time.plus({ minutes })
    }
    if (options.offset !== 0) {
      time = time.plus({ minutes: options.offset })
    }
    return time
  }

  min(times: string[], options?: TimeAlteration): DateTime {
    const result = DateTime.min(...times.map(time => this.get(time)))

    return this.alterTime(result, options)
  }
  max(times: string[], options?: TimeAlteration): DateTime {
    const result = DateTime.max(...times.map(time => this.get(time)))

    return this.alterTime(result, options)
  }
}
