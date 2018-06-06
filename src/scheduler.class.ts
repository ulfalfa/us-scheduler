import * as Suncalc from 'suncalc';
import * as cronParser from 'cron-parser';

import { DateTime, Duration } from 'luxon';

import { Observable, of, timer } from 'rxjs';
import {
  map,
  concatMap,
  filter,
  delay,
  expand,
  debounceTime,
} from 'rxjs/operators';

/**
 * Options for creating an object UsScheduler
 */
export interface ISchedulerOptions {
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

const CRON_LABEL = '___cron___';
const START_LABEL = '___start___';

// const TIMES_MATCHER = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/g;
const TIMES_MATCHER = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/;
export const LABEL_PATTERN = /^[a-zA-Z0-9\:_]*$/;
/**
 * the main class for doing all the scheduling
 */
export class UsScheduler {
  protected _now: DateTime = null;
  protected _customTimes: {
    [label: string]: ITime;
  } = {};

  constructor(protected _opts: ISchedulerOptions) {
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
  /**
   * calculates the sun times for the location and adds
   * the custom times.
   * @param  forDay          the day for which the times should be calculated
   * @param  ...labelFilter filter for labels (e.g. only get sunsets and sunrise)
   * @return                Iterator for the sorted times
   */
  public *generateSunTimes(
    start?: DateTime | string,
    ...labelFilter: string[]
  ): IterableIterator<ILabeledDate> {
    let startTime: DateTime;

    if (typeof start === 'string') {
      labelFilter.push(start);
      startTime = this.now;
    } else {
      startTime = start || this.now;
    }
    const sctimes = Suncalc.getTimes(
      startTime.toUTC(0, { keepLocalTime: true }).toJSDate(),
      this._opts.latitude,
      this._opts.longitude,
    );
    const allTimes = Object.keys(sctimes)
      .map((key: string) => ({
        label: key,
        date: DateTime.fromJSDate(sctimes[key]).setZone('local', {
          keepCalendarTime: true,
        }),
      }))
      .filter((date: ILabeledDate) => date.date.isValid)

      .concat(this.getCustomTimes(startTime))
      .filter(
        (date: ILabeledDate) =>
          labelFilter.length === 0 || labelFilter.indexOf(date.label) > -1,
      )
      .sort(
        (_t1: ILabeledDate, _t2: ILabeledDate) =>
          _t1.date.diff(_t2.date).milliseconds,
      );
    for (let i = 0; i < allTimes.length; i++) {
      yield allTimes[i];
    }
  }

  /**
   * return a cron iterator for a given cron pattern
   * @param  cronPattern cronpattern (s. wiki)
   * @return             an iterator of labeled dates
   */
  public *generateCron(cronPattern: string): IterableIterator<ILabeledDate> {
    const times = cronParser.parseExpression(cronPattern, {
      iterator: false,
      utc: false,
      currentDate: this.now.toJSDate(),
    });
    while (true) {
      yield {
        label: CRON_LABEL,
        date: DateTime.fromJSDate(times.next().toDate()),
      };
    }
  }

  /**
   * returns an iterator of suntimes repeating via a cron (only day based)
   * @param  dayPattern     cron weekday (*= all days, 6,7= weekends...)
   * @param  ...labelFilter filter for labels (only sunsets...)
   * @return                iterator of labeled dates
   */
  public *generateCronedSunTimes(
    dayPattern?: string,
    ...labelFilter: string[]
  ): IterableIterator<ILabeledDate> {
    if (dayPattern && !dayPattern.match(/[,\d\*\-]+/)) {
      labelFilter.push(dayPattern);
      dayPattern = '*';
    } else {
      dayPattern = dayPattern || '*';
    }
    const cronPattern = '0 0 * * ' + dayPattern;

    yield* this.generateSunTimes(this.now, ...labelFilter);

    const cron = this.generateCron(cronPattern);
    while (true) {
      const date = cron.next().value;
      yield* this.generateSunTimes(date.date, ...labelFilter);
    }
  }

  /**
   * the main scheduler for daytimes. every emit is scheduled
   * @param  dayPattern a week day cron filter (e.g. only weekends)
   * @param  ...labels  filter for wanted dates
   * @return            time observable (endless)
   */
  public observeSunTimes(
    dayPattern?: string,
    ...labels: string[]
  ): Observable<ILabeledDate> {
    const times = this.generateCronedSunTimes(dayPattern, ...labels);

    const start = times.next().value;
    start.waitMS = Math.max(start.date.diff(this.now).milliseconds, 0);
    return of(start).pipe(
      delay(start.waitMS),
      expand((time: ILabeledDate) => {
        return of(times.next().value).pipe(
          map((date: ILabeledDate) => {
            const maxDate = DateTime.max(time.date, this.now);
            date.waitMS = Math.max(0, date.date.diff(maxDate).milliseconds);
            return date;
          }),
          concatMap((date: ILabeledDate) => of(date).pipe(delay(date.waitMS))),
        );
      }),
    );
  }

  /**
   * returns an observable cron stream
   * @param  cronPattern a standard cron pattern
   * {@link https://github.com/harrisiirak/cron-parser | cron-parser}
   * @return             observable stream
   */
  public observeCron(cronPattern: string): Observable<ILabeledDate> {
    const cron = this.generateCron(cronPattern);

    return of({ label: START_LABEL, date: this.now }).pipe(
      expand((time: ILabeledDate) => {
        return of(cron.next().value).pipe(
          map((date: ILabeledDate) => {
            date.waitMS = date.date.diff(time.date).milliseconds;
            return date;
          }),
          concatMap((date: ILabeledDate) => {
            return of(date).pipe(delay(date.waitMS));
          }),
        );
      }),
      filter((date: ILabeledDate) => date.label !== START_LABEL),
    );
  }
  /**
   * schedule either a cron pattern or suntimes
   * @param  pattern either a cron pattern or the first filter for the suntimes
   * @param  ...pars more filters. the last one can be a weekday cron filter
   * @return         a timed observable of labeled dates
   */
  public schedule(
    pattern: string = '* * * * * *',
    ...pars: string[]
  ): Observable<ILabeledDate> {
    if (pattern.match(LABEL_PATTERN)) {
      pars.splice(0, 0, pattern);
      if (pars[pars.length - 1].match(LABEL_PATTERN)) {
        const [dayPattern] = pars.splice(-1, 1);
        return this.observeSunTimes(dayPattern, ...pars);
      } else {
        return this.observeSunTimes(...pars);
      }
    } else {
      return this.observeCron(pattern);
    }
  }
  /**
   * emits after a specified duration
   * @param  duration either a duration in ISO8601 (without the P) or seconds
   * @return          observable, that fires after duration is over;
   */
  public in(duration: string | number): Observable<ILabeledDate> {
    let d: Duration;
    if (typeof duration === 'string') {
      d = Duration.fromISO('PT' + duration.toUpperCase());
    } else {
      d = Duration.fromISO('PT' + duration.toString() + 'S');
    }

    const finish = this.now.plus(d);
    return timer(d.as('milliseconds')).pipe(
      map(() => ({
        label: '___timer___',
        date: finish,
        waitMS: d.as('milliseconds'),
      })),
    );
  }
}
