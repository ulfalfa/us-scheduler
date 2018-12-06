import * as Suncalc from 'suncalc';
import * as cronParser from 'cron-parser';

import { DateTime, DateObjectUnits, Duration } from 'luxon';
export { DateTime } from 'luxon';

import { Observable, of, timer } from 'rxjs';
import {
  map,
  delay,
  expand,
  skip,
} from 'rxjs/operators';


const debug = require('debug')('us-scheduler:scheduler');

const CUSTOM_TIMES_PATTERN = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/;
const TIME_PATTERN = /(\d\d):(\d\d)/;
export const START_LABEL = '_start_';

/**
 * Options for creating an object UsScheduler
 */
export interface SchedulerOptions {
  /** latitude for sun calculations */
  latitude: number;
  /** longitude for sun calculations */
  longitude: number;
  /** optional custom times for scheduler
   *   HH:mm separated by comma
   */
  customTimes?: string;
  /** optional startTime used a now in ISO Format(mainly for testing purposes) */
  now?: string;
}

export interface DayTimes {
  [START_LABEL]: DateTime,
  [name: string]: DateTime
}


export type SimpleTime = string;
function isSimpleTime(val: any): val is SimpleTime {
  return typeof val === 'string';
}


export type TimeDefinition = SimpleTime;

export interface ScheduleEvent {
  index: number,
  definition?: TimeDefinition,
  date: DateTime,
}
/**
 * SunPosition event
 */
export interface SunPosition {
  /** the azimuth in degrees (0° means north, 180° south) */
  azimuth: number,
  /** the altitude of sun in degrees relative to horizon (0° means horizon) */
  altitude: number,
  /** the date of the sample */
  date: DateTime
}

export interface SchedulingOptions {
  times: SimpleTime[],
  random: number,
  dayCronPattern: string,
}


/**
 * the main class for doing all the scheduling
 */
export class UsScheduler {
  protected _now: DateTime = null;

  protected _customTimes: {
    [label: string]: DateObjectUnits;
  } = {};

  constructor(protected _opts: SchedulerOptions) {
    if (this._opts.now) {
      this._now = DateTime.fromISO(this._opts.now);
    }
    if (this._opts.customTimes) {
      this.setCustomTimes(...this._opts.customTimes.split(','));
    }
  }
  /**
   * gets the current time (could be overriden by options)
   * @return the current time
   */
  public get now(): DateTime {
    return this._now ? this._now : DateTime.local();
  }
  /**
 * sets the current time (overrides the now option)
 * @return the current time
 */
  public set now(now: DateTime) {
    this._now = now;
  }

  /**
   * set new custom times (overwriting existing custom times with same labels)
   * @param  ...times some new custom times (format: HH:mm(label) where label is optional)
   */
  public setCustomTimes(...times: string[]): void {
    times.forEach((time: string) => {
      const parsed = time.match(CUSTOM_TIMES_PATTERN);
      if (parsed) {
        const [timeStr, hour, min, label] = parsed;
        this._customTimes[label || timeStr] = {
          hour: parseInt(hour, 0),
          minute: parseInt(min, 0),
        };
      }
    });
  }

  /**
   * converts the times given in constructor options and converts them
   * to labeled dates for a given day
   * @param  forDay the day the times should be generated for
   * @return        array of labeled dates
   */
  public getCustomTimes(forDay: DateTime = this.now): DayTimes {

    return Object.keys(this._customTimes).reduce((times, cur) => {
      times[cur] = forDay.set(this._customTimes[cur]).setZone('local', {
        keepCalendarTime: true,
      }).startOf('minute')
      return times;

    }, { [START_LABEL]: forDay.startOf('day') })
  }


  /**
   * generates the suntimes and combining existing custom times
   * @param startTime the day to generate the day times for
   */
  getTimes(startTime: DateTime): DayTimes {
    const sctimes = Suncalc.getTimes(
      startTime.startOf('day').toUTC(0, { keepLocalTime: true }).toJSDate(),
      this._opts.latitude,
      this._opts.longitude,
    );
    let resTimes: DayTimes = Object.keys(sctimes).reduce((times, cur) => {
      times[cur] = DateTime.fromJSDate(sctimes[cur]).setZone('local', {
        keepCalendarTime: true,
      })
      return times;

    }, { [START_LABEL]: startTime.startOf('day') })

    resTimes = { ...resTimes, ...this.getCustomTimes(startTime) }

    return resTimes
  }

  /**
   * return a cron iterator for a given cron pattern
   * @param  cronPattern cronpattern
   *    ```
   *    *    *    *    *    *    *
   *    ┬    ┬    ┬    ┬    ┬    ┬
   *    │    │    │    │    │    |
   *    │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
    *    │    │    │    │    └───── month (1 - 12)
    *    │    │    │    └────────── day of month (1 - 31)
    *    │    │    └─────────────── hour (0 - 23)
    *    │    └──────────────────── minute (0 - 59)
    *    └───────────────────────── second (0 - 59, optional)
    *    ```
    * Supported are following patterns
    * * \* every unit
    * * \*&#8205;/5 every fifth unit
    * * 0-5 range of units
    *
    * the pattern ist interpreted with {@link https://github.com/harrisiirak/cron-parser}
   * @return             an iterator of labeled dates
   */
  public *generateCron(cronPattern: string): IterableIterator<DateTime> {
    debug(`Initial Generating cron "${cronPattern}" for ${this.now.toISO()}`)
    let times = cronParser.parseExpression(cronPattern, {
      iterator: false,
      utc: false,
      currentDate: this.now.toLocal().toJSDate(),
    });
    while (true) {

      const newDate: DateTime = yield DateTime.fromJSDate(times.next().toDate())
      if (newDate) {
        debug(`Forced Generating cron "${cronPattern}" for ${newDate.toISO()}`)
        times = cronParser.parseExpression(cronPattern, {
          iterator: false,
          utc: false,
          currentDate: newDate.toLocal().toJSDate(),
        });
      }
    }
  }


  /**
    * generate a  daytimes schedule as iterator
    *
    * simple use: e.g. schedule('sunrise','12:23','sunset'...)
    * or specify scheduling options (with possibility of randomizing each time or in a not daily cron pattern)
    *
    * this method is mainly used by schedule
    *
    * @param  eventOrOpts either a options object or the first daytime
    * @param  ...times more times.
    * @return a iterator of schedule events
    */
  *generateSchedule(times: SimpleTime[] | SchedulingOptions)
    : IterableIterator<ScheduleEvent> {

    function resolveSimpleTime(event: SimpleTime, curTimes: DayTimes): DateTime {

      if (curTimes[event]) {
        return curTimes[event]
      } else {
        const match = event.match(TIME_PATTERN);
        if (match) {
          const [, hour, min] = match;
          return curTimes[START_LABEL].set({ hour: parseInt(hour, 10), minute: parseInt(min, 10) })

        } else {
          throw new Error(`${event} is neither predefined nor a valid time (HH:mm)`);
        }
      };

    }

    const options: SchedulingOptions = (Array.isArray(times)) ? { times, random: 0, dayCronPattern: '* * *' } : times;

    // we need a daily cron (noon)
    const cron = this.generateCron('59 59 23 ' + options.dayCronPattern);

    let date = cron.next().value;
    let dayTimes = this.getTimes(date);
    let lastTarget = this.now;

    debug(`Starting schedule at ${date.toISO()} (last: ${lastTarget.toISO()}`)
    while (true) {


      for (let index = 0; index < options.times.length; index++) {

        const curEvent = options.times[index];
        let target: DateTime;
        target = resolveSimpleTime(curEvent, dayTimes);

        if (options.random > 0) {
          const minutes = Math.floor(Math.random() * (2 * options.random + 1)) - options.random;
          target = target.plus({ minutes })
        }
        debug(`Checking ${target.toISO()} against last ${lastTarget.toISO()}`)
        if (target <= lastTarget) {
          target = target.plus({ days: 1 });
          dayTimes = this.getTimes(target);
          target = resolveSimpleTime(curEvent, dayTimes);
        }

        debug(`Emitting ${target.toISO()}`)

        yield {
          date: target,
          index,
          definition: curEvent
        }
        lastTarget = target;
      }
      date = cron.next(lastTarget).value;
      dayTimes = this.getTimes(date);
    }
  }

  /**
    * schedule at regular daytimes
    *
    * simple use: e.g. schedule('sunrise','12:23','sunset'...)
    * or specify scheduling options (with possibility of randomizing each time or in a not daily cron pattern)
    *
    * @param  eventOrOpts either a options object or the first daytime
    * @param  ...times more times.
    * @return a timed observable of schedule events
    */
  schedule(eventOrOpts: SimpleTime | SchedulingOptions,
    ...times: SimpleTime[]): Observable<ScheduleEvent> {

    let schedule: IterableIterator<ScheduleEvent>

    if (isSimpleTime(eventOrOpts)) {
      schedule = this.generateSchedule([eventOrOpts, ...times]);
    } else {
      schedule = this.generateSchedule(eventOrOpts as SchedulingOptions)
    }

    return of({
      date: this.now
    }).pipe(
      expand((current, idx) => {
        const next = schedule.next().value
        const wait = next.date.diff(current.date);
        debug(`Waiting from ${current.date.toISO()} to ${next.date.toISO()} = ${wait.toFormat('d  hh:mm')}`);
        return of(next).pipe(delay(wait.as('milliseconds')))
      }),
      skip(1),

    );
  }

  /**
    * returns an observable cron stream
    * @param  cronPattern a standard cron pattern
    * @see {@link generateCron} for detailed pattern description
    * @return             observable stream
    *
    */

  cron(cronPattern: string): Observable<number> {
    const cron = this.generateCron(cronPattern);
    return of(this.now).pipe(
      expand((curDate, idx) => {
        const next = cron.next().value
        debug(`Croning from ${curDate.toISO()} to ${next.toISO()}`);
        return of(next).pipe(delay(next.valueOf() - curDate.valueOf()))
      }),
      skip(1),
      map((_, idx) => idx)
    );
  }

  /**
   * emits after a specified duration
   * @param  duration either a duration as ISO8601 string (without the PT) or number of seconds
   * @return          observable, that fires after duration is over;
   */
  public in(duration: string | number): Observable<ScheduleEvent> {
    let d: Duration;
    if (typeof duration === 'string') {
      d = Duration.fromISO('PT' + duration.toUpperCase());
    } else {
      d = Duration.fromISO('PT' + duration.toString() + 'S');
    }

    const finish = this.now.plus(d);
    return timer(d.as('milliseconds')).pipe(
      map(() => ({
        index: 0,
        date: finish,
      })),
    );
  }

  /**
   * Fire an observable event at a decent datetime
   * @param date an input datetime object (luxon DateTime)
   */
  public at(date: DateTime): Observable<ScheduleEvent> {
    return timer(date.valueOf() - this.now.valueOf()).pipe(
      map(() => {
        return {
          index: 0,
          date: date,
        }
      })
    )

  }
  /**
   * get the current sunpositions
   *
   * @param minutes refresh interval in minutes
   */

  sunPositions(minutes: number = 5): Observable<SunPosition> {
    return of(this.now).pipe(
      expand((curDate, idx) => {
        const next = curDate.plus({ minutes })
        debug(`Croning from ${curDate.toISO()} to ${next.toISO()}`);
        return of(next).pipe(delay(next.valueOf() - curDate.valueOf()))
      }),
      map((date) => {
        const { azimuth, altitude } = Suncalc.getPosition(date.toJSDate(), this._opts.latitude, this._opts.longitude);
        return { date: date, azimuth: azimuth * 180 / Math.PI + 180, altitude: altitude * 180 / Math.PI };
      })
    );
  }
}
