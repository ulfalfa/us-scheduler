import { DateTime } from 'luxon'

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

export interface SchedulerOptions extends SunTimesOptions {
  dayCronPattern?: string
  skipPast?: boolean
}

/**
 * base interface for all derived times (single, min and max)
 */
export interface TimeBase<T> {
  random?: number
  offset?: number
  data?: T
}
/**
 * simple time type in following format
 * * HH24:MM
 * * astrotime (e.g. sunrise, sunset, dusk, dawn, midnight)
 * * a iso compliant date
 *
 */
export type SimpleTime = string

/**
 * represents a simple time with offset, random and data properties
 */
export interface SingleTime<T = any> extends TimeBase<T> {
  time: SimpleTime // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
}

/**
 * for the minimum of multi simple times
 */
export interface MinTimes<T = any> extends TimeBase<T> {
  min: SimpleTime[] // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
}

/**
 * for the maximumg of multi simple times
 */
export interface MaxTimes<T = any> extends TimeBase<T> {
  max: SimpleTime[] // time can be either a labeled time (eg. dusk or midnight) or a string in format hh24:mm
}

export type TimeDefinition<T> =
  | SimpleTime
  | SingleTime<T>
  | MinTimes<T>
  | MaxTimes<T>

/**
 * the resolve time for a given input (after randomzation and applying offsets)
 */
export interface CalculatedTime<T = any> extends TimeBase<T> {
  // the calculated target time
  target: DateTime
  // the label of the base time input (@see TimeBase)
  label: SimpleTime
  // the applied offset
  offset: number
  // the applied random minutes
  random: number
}

/**
 * the event by timed operations
 *
 */
export interface ScheduleEvent<T = any> extends CalculatedTime<T> {
  /* the number of the parameter to the scheduling function*/
  index: number
}
/**
 * a caluculated sunposition for a datetime
 */
export interface SunPosition {
  /* sun altitude above the horizon in degrees, e.g. 0° at the horizon and 90° at the zenith (straight over your head) */
  altitude: number
  /* sun azimuth in degrees (direction along the horizon, measured from south to west), e.g. 0 is east and
      Math.PI * 3/4 is northwest*/
  azimuth: number
  date: DateTime
}
