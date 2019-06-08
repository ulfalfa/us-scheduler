/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

// shortcuts for easier to read formulas

const PI = Math.PI
const sin = Math.sin
const cos = Math.cos
const tan = Math.tan
const asin = Math.asin
const atan = Math.atan2
const acos = Math.acos
const rad = PI / 180

// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas

// date/time constants and conversions

const dayMs = 1000 * 60 * 60 * 24
const J1970 = 2440588
const J2000 = 2451545

function toJulian(date: Date): number {
  return date.valueOf() / dayMs - 0.5 + J1970
}
function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * dayMs)
}
function toDays(date: Date): number {
  return toJulian(date) - J2000
}

// general calculations for position

const earthObliquity = rad * 23.4397 // obliquity of the Earth

function rightAscension(l, b) {
  return atan(
    sin(l) * cos(earthObliquity) - tan(b) * sin(earthObliquity),
    cos(l)
  )
}
function declination(l, b) {
  return asin(
    sin(b) * cos(earthObliquity) + cos(b) * sin(earthObliquity) * sin(l)
  )
}

function azimuth(H, phi, dec) {
  return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi))
}
function altitude(H, phi, dec) {
  return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H))
}

function siderealTime(d, lw) {
  return rad * (280.16 + 360.9856235 * d) - lw
}

function astroRefraction(h) {
  if (h < 0) {
    // the following formula works for positive altitudes only.
    h = 0
  } // if h = -0.08901179 a div/0 would occur.

  // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
  // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
  return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179))
}

// general sun calculations

function solarMeanAnomaly(d) {
  return rad * (357.5291 + 0.98560028 * d)
}

function eclipticLongitude(M) {
  const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)) // equation of center
  const P = rad * 102.9372 // perihelion of the Earth

  return M + C + P + PI
}

function sunCoords(
  days: number
): { declination: number; rightAscension: number } {
  const M = solarMeanAnomaly(days)
  const L = eclipticLongitude(M)

  return {
    declination: declination(L, 0),
    rightAscension: rightAscension(L, 0),
  }
}

// calculates sun position for a given date and latitude/longitude

function getPosition(
  date: Date,
  lat: number,
  lng: number
): { azimuth: number; altitude: number } {
  const lw = rad * -lng
  const phi = rad * lat
  const days = toDays(date)
  const c = sunCoords(days)
  const H = siderealTime(days, lw) - c.rightAscension

  return {
    azimuth: azimuth(H, phi, c.declination),
    altitude: altitude(H, phi, c.declination),
  }
}

// sun times configuration (angle, morning name, evening name)

// adds a custom time to the times config

// calculations for sun times

const J0 = 0.0009

function julianCycle(d, lw) {
  return Math.round(d - J0 - lw / (2 * PI))
}

function approxTransit(ht, lw, n) {
  return J0 + (ht + lw) / (2 * PI) + n
}
function solarTransitJ(ds, M, L) {
  return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L)
}

function hourAngle(h, phi, d) {
  return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d)))
}

// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {
  const w = hourAngle(h, phi, dec)
  const a = approxTransit(w, lw, n)
  return solarTransitJ(a, M, L)
}

// calculates sun times for a given date and latitude/longitude

export function getTimes(date, lat, lng) {
  const lw = rad * -lng
  const phi = rad * lat
  const d = toDays(date)
  const n = julianCycle(d, lw)
  const ds = approxTransit(0, lw, n)
  const M = solarMeanAnomaly(ds)
  const L = eclipticLongitude(M)
  const dec = declination(L, 0)
  const jNoon = solarTransitJ(ds, M, L)
  let i
  let len
  let time
  let jSet
  let jRise

  const result = {
    solarNoon: fromJulian(jNoon),
    nadir: fromJulian(jNoon - 0.5),
  }

  const times = [
    [-0.833, 'sunrise', 'sunset'],
    [-0.3, 'sunriseEnd', 'sunsetStart'],
    [-6, 'dawn', 'dusk'],
    [-12, 'nauticalDawn', 'nauticalDusk'],
    [-18, 'nightEnd', 'night'],
    [6, 'goldenHourEnd', 'goldenHour'],
  ]

  for (i = 0, len = times.length; i < len; i += 1) {
    time = times[i]

    jSet = getSetJ(time[0] * rad, lw, phi, dec, n, M, L)
    jRise = jNoon - (jSet - jNoon)

    result[time[1]] = fromJulian(jRise)
    result[time[2]] = fromJulian(jSet)
  }

  return result
}
