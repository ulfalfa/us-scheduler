import * as Suncalc from 'suncalc';
import * as cronParser from 'cron-parser';

import { DateTime, Settings } from 'luxon';

import { Observable, Observer, from, of } from 'rxjs';
import {
  map,
  mergeMap,
  concatMap,
  filter,
  delay,
  switchAll, tap, startWith, pairwise
} from 'rxjs/operators';
export interface ISchedulerOptions {
  /** latitude for sun calculations */
  latitude: number;
  /** longitude for sun calculations */
  longitude: number;
  /** optional startTime in ISO Format(mainly for testing purposes) */
  startAt?: string;
  /** optional custom times for scheduler
  HH:mm separated by comma
  */
  customTimes?: string;
}

export interface ICustomTime {
  label?: string;
  time: string;
}

/**
 * a key value pair of times
 */
export interface ILabeledDate {
  /** the name of the time (eg. noon, sunset or custom names) */
  label: string;
  /** the date of the specific point of day */
  date: DateTime;
}

export const CRON_LABEL = '_cron_';
export const CUSTOM_LABEL = '_custom_';
const TIMES_SEPARATOR = ',';
const TIMES_MATCHER = /(?:(\b1?[0-9]|\b2[0-3]):([0-5][0-9]))(?:\((.+?)\))?/g;

/**
 * the main class for doing all the scheduling
 */
export class UsScheduler {
  constructor(protected opts: ISchedulerOptions) {
    Settings.defaultZoneName = 'Europe/Berlin';
  }

  public get startAt(): DateTime {
    return this.opts.startAt ? DateTime.fromISO(this.opts.startAt) : DateTime.local();
  }

  public getCustomTimes(aDate?: string): any[] {
    const times = this.opts.customTimes || '';
    const start: DateTime = aDate ? DateTime.fromISO(aDate) : this.startAt;

    let matches: any[];
    const result = [];
    while ((matches = TIMES_MATCHER.exec(times))) {
      const [timeStr, hour, min, label] = matches;
      const newDate = start
        .set({ hour: parseInt(hour, 0), minute: parseInt(min, 0) })
        .startOf('minute');

      result.push({
        label: label || timeStr,
        date: newDate
      });
    }

    return result;
  }

  /**
   * get the sun times of a specific day
   * @param  aDate the day, for which the sun times are needed (ISO String)
   * @return       observable of calculated sun times for the day
   */
  public getSunTimes(startAt?: string): Observable<ILabeledDate> {
    const start = startAt ? DateTime.fromISO(startAt) : this.startAt;
    return Observable.create((obs: Observer<ILabeledDate>) => {
      const sctimes = Suncalc.getTimes(
        start.toJSDate(),
        this.opts.latitude,
        this.opts.longitude
      );
      Object.keys(sctimes)
        .map((key: string) => ({
          label: key,
          date: DateTime.fromJSDate(sctimes[key])
        }))
        .concat(this.getCustomTimes(startAt))
        .sort(
          (_t1: ILabeledDate, _t2: ILabeledDate) =>
            _t1.date.diff(_t2.date).milliseconds
        )
        .forEach((_t: ILabeledDate) => obs.next(_t));
      obs.complete();
      return () => {};
    });
  }

  public observeSunTimes(dayPattern?: string): Observable<ILabeledDate> {
    dayPattern = dayPattern || '*';
    return this.observeCron('0 0 * * ' + dayPattern).pipe(
      mergeMap((time: ILabeledDate) => this.getSunTimes(time.date.toISO()))
    );
  }

  public observeCron(cronPattern: string): Observable<ILabeledDate> {

    const options = {
      iterator: true,
      utc: false,
      currentDate: this.startAt.startOf('day').toJSDate()
    };

    const times = cronParser.parseExpression(cronPattern, options);

    // convert iterator to iterable
    const iterable = {
      [Symbol.iterator]() {
        return {
          next() {
            return times.next();
          }
        };
      }
    };

    return from(iterable).pipe(

      map((date: any) => ({
        label: CRON_LABEL,
        date: DateTime.fromJSDate(date.toDate())
      }))
    );
  }

  public schedule(dayPattern?: string) {
    return this.observeSunTimes(dayPattern).pipe(

      filter((_time: ILabeledDate) => (  !!['start', 'second'].find((val) => (val === _time.label)))),
      startWith({label: '__start__', date: this.startAt}),
      pairwise(),
      concatMap(([now, t]: ILabeledDate[]) => {
        console.log (now.label, t.label)
        console.log ( now.date.toISO(), t.date.toISO(), t.date.diff(now.date).milliseconds);
        console.log(`Waiting for ${t.label} on ${t.date.toISO()}`);
        return of().pipe(delay(t.date.diff(now.date).milliseconds));
      })
    );
  }
}
