import * as Suncalc from 'suncalc';
import * as cronParser from 'cron-parser';

import { DateTime, Duration } from 'luxon';

import { Observable, of, timer } from 'rxjs';
import {
  map,
  delay,
  expand,
  skip,
} from 'rxjs/operators';

const debug = require('debug')('us-scheduler:scheduler');

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
/**
 * Interface for all returned date items (e.g. label = 'sunset')
 */
export interface ITime {
  /**
   * hour of day (24h format)
   */
  hour: number;
  /**
   * minute of houer
   */
  minute: number;
}

/**
 * a key value pair of label and datetime
 */
export interface ILabeledDate {
  /** the name of the time (eg. noon, sunset or custom names) */
  label: string;
  /** the date of the specific point of day
   *(s.{@link https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html | luxon})
   **/
  date: DateTime;
  /**
   * only used internally for scheduling (how long to wait)
   *
   */
  waitMS?: number;
}

export interface Times {
  _start_: DateTime,
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

export interface SchedulingOptions {
  events: SimpleTime[],
  random: number,
  dayCronPattern: string,
}

export type DateInput = DateTime | Date | string;


const START_LABEL = '_start_';

// const TIMES_MATCHER = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/g;
const TIMES_MATCHER = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/;
export const LABEL_PATTERN = /^[a-zA-Z0-9\:_]*$/;
export const TIME_PATTERN = /(\d\d):(\d\d)/;
/**
 * the main class for doing all the scheduling
 */
export class UsScheduler {
  protected _now: DateTime = null;

  protected _customTimes: {
    [label: string]: ITime;
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
   * set new custom times (overwriting existing custom times with same labels)
   * @param  ...times some new custom times (format: HH:mm(label) where label is optional)
   */
  public setCustomTimes(...times: string[]): void {
    times.forEach((time: string) => {
      const parsed = time.match(TIMES_MATCHER);
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
  public getCustomTimes(forDay: DateTime = this.now): ILabeledDate[] {
    return Object.keys(this._customTimes).map((key) => {
      const newDate = forDay.set(this._customTimes[key]).startOf('minute');

      return {
        label: key,
        date: newDate,
      };
    });
  }



  getTimes(startTime: DateTime): Times {
    const sctimes = Suncalc.getTimes(
      startTime.startOf('day').toUTC(0, { keepLocalTime: true }).toJSDate(),
      this._opts.latitude,
      this._opts.longitude,
    );
    const resTimes: Times = Object.keys(sctimes).reduce((times, cur) => {
      times[cur] = DateTime.fromJSDate(sctimes[cur]).setZone('local', {
        keepCalendarTime: true,
      })
      return times;

    }, { _start_: startTime.startOf('day') })


    Object.keys(this._customTimes).forEach((key) => {
      const newDate = startTime.set(this._customTimes[key]).startOf('minute');
      resTimes[key] = newDate
    });



    return resTimes
  }

  /**
   * return a cron iterator for a given cron pattern
   * @param  cronPattern cronpattern (s. wiki)
   * @return             an iterator of labeled dates
   */
  public *generateCron(cronPattern: string): IterableIterator<DateTime> {
    debug(`Generating cron "${cronPattern}" for`, this.now)
    const times = cronParser.parseExpression(cronPattern, {
      iterator: false,
      utc: false,
      currentDate: this.now.toLocal().toJSDate(),
    });
    while (true) {
      yield DateTime.fromJSDate(times.next().toDate())
    }
  }



  *generateSchedule(events: SimpleTime[] | SchedulingOptions)
    : IterableIterator<ScheduleEvent> {

    function resolveSimpleTime(event: SimpleTime, curTimes: Times): DateTime {

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



    const options: SchedulingOptions = (Array.isArray(events)) ? { events, random: 0, dayCronPattern: '* * *' } : events;



    // we need a daily cron (noon)
    const cron = this.generateCron('59 59 23 ' + options.dayCronPattern);

    let date = cron.next().value;
    let times = this.getTimes(date);
    let lastTarget = times[START_LABEL].minus({ seconds: 1 });
    while (true) {


      for (let index = 0; index < options.events.length; index++) {

        const curEvent = options.events[index];
        let target: DateTime;
        // if (isSimpleTime(curEvent)) {
        target = resolveSimpleTime(curEvent, times);
        /*} else {
          throw new Error(`currently only simple times allowed`)
        }*/

        if (options.random > 0) {
          const minutes = Math.floor(Math.random() * (2 * options.random + 1)) - options.random;
          target = target.plus({ minutes })
        }

        if (target <= lastTarget) {

          target = target.plus({ days: 1 });

          date = cron.next().value;
          times = this.getTimes(date);
        }

        yield {
          date: target,
          index,
          definition: curEvent
        }
        lastTarget = target;
      }
    }
  }

  /**
    * schedule either a cron pattern or suntimes
    * @param  pattern either a cron pattern or the first filter for the suntimes
    * @param  ...pars more filters. the last one can be a weekday cron filter
    * @return         a timed observable of labeled dates
    */

  schedule(eventOrOpts: SimpleTime | SchedulingOptions,
    ...events: SimpleTime[]): Observable<ScheduleEvent> {

    let schedule: IterableIterator<ScheduleEvent>

    if (isSimpleTime(eventOrOpts)) {
      schedule = this.generateSchedule([eventOrOpts, ...events]);
    } else {
      schedule = this.generateSchedule(eventOrOpts as SchedulingOptions)
    }

    return of({
      date: this.now
    }).pipe(
      expand((current, idx) => {
        const next = schedule.next().value
        debug(`Croning from ${current.date.toISO()} to ${next.date.toISO()}`);
        return of(next).pipe(delay(next.date.valueOf() - current.date.valueOf()))
      }),
      skip(1),

    );
  }
  /**
    * returns an observable cron stream
    * @param  cronPattern a standard cron pattern
    * {@link https://github.com/harrisiirak/cron-parser | cron-parser}
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
   * @param  duration either a duration in ISO8601 (without the P) or seconds
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





  /*public cron(cronPattern: string): Observable<any> {
    const cron = this.createCron(cronPattern);

    return cron.pipe(
      expand(() => {
        cron.next()
        return cron;
      })
    )
  }*/
}
