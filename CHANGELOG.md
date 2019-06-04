# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="3.0.1"></a>
## [3.0.1](https://github.com/ulfalfa/us-scheduler/compare/v3.0.0...v3.0.1) (2019-06-04)


### Bug Fixes

* **scheduler:** when scheduling with past events the timing got wrong (the first past event was emit ([5d09a31](https://github.com/ulfalfa/us-scheduler/commit/5d09a31))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ulfalfa/us-scheduler/compare/v2.2.0...v3.0.0) (2019-06-03)


### Bug Fixes

* **cron:** default starttime ([d289507](https://github.com/ulfalfa/us-scheduler/commit/d289507))


### Features

* again a rewrite to a more practical approach ([5f9f94e](https://github.com/ulfalfa/us-scheduler/commit/5f9f94e))


### BREAKING CHANGES

* complete restructure with a new interface



<a name="2.2.0"></a>
# [2.2.0](https://github.com/ulfalfa/us-scheduler/compare/v2.1.1...v2.2.0) (2019-05-28)


### Features

* **suntimes:** add property with current sunposition ([ce671fb](https://github.com/ulfalfa/us-scheduler/commit/ce671fb))



<a name="2.1.1"></a>
## [2.1.1](https://github.com/ulfalfa/us-scheduler/compare/v2.1.0...v2.1.1) (2019-05-28)



<a name="2.1.0"></a>
# [2.1.0](https://github.com/ulfalfa/us-scheduler/compare/v2.0.0...v2.1.0) (2019-05-28)


### Features

* **cron:** new function for generate a cron observable with schedule ([7f9828f](https://github.com/ulfalfa/us-scheduler/commit/7f9828f))
* **cron:** new function for generate a cron observable with schedule ([d340edd](https://github.com/ulfalfa/us-scheduler/commit/d340edd))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/ulfalfa/us-scheduler/compare/v1.2.3...v2.0.0) (2019-05-27)


### Features

* complete rewrite as single functions ([714346c](https://github.com/ulfalfa/us-scheduler/commit/714346c))


### BREAKING CHANGES

* complete rewrite



<a name="1.2.3"></a>
## [1.2.3](https://github.com/ulfalfa/us-scheduler/compare/v1.2.2...v1.2.3) (2018-12-10)


### Bug Fixes

* **schedule:** start always at begin of day, but don't emit schedules beforen now ([33fbc5c](https://github.com/ulfalfa/us-scheduler/commit/33fbc5c))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/ulfalfa/us-scheduler/compare/v1.2.1...v1.2.2) (2018-12-06)


### Bug Fixes

* **scheduling:** wrong start date so that negative waiting times were possible ([91524dd](https://github.com/ulfalfa/us-scheduler/commit/91524dd))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/ulfalfa/us-scheduler/compare/v1.2.0...v1.2.1) (2018-12-06)



<a name="1.2.0"></a>
# [1.2.0](https://github.com/ulfalfa/us-scheduler/compare/v1.1.0...v1.2.0) (2018-12-03)


### Features

* **sunpositions:** new method for periodically getting the sun positions ([c5f2432](https://github.com/ulfalfa/us-scheduler/commit/c5f2432))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/ulfalfa/us-scheduler/compare/v1.0.0...v1.1.0) (2018-12-03)


### Features

* **rewrite part two:** the version 2.0 was committed erranously. this should be the real version. ([2d372dd](https://github.com/ulfalfa/us-scheduler/commit/2d372dd))
* **rewrite part two:** the version 2.0 was committed erranously. this should be the real version. ([38fdaf4](https://github.com/ulfalfa/us-scheduler/commit/38fdaf4))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/ulfalfa/us-scheduler/compare/v0.2.1...v1.0.0) (2018-11-29)


### Features

* **rewritten:** rewritten from scratch (other parametlines) ([ee97150](https://github.com/ulfalfa/us-scheduler/commit/ee97150))


### BREAKING CHANGES

* **rewritten:** complete rewrite



<a name="0.2.1"></a>
## [0.2.1](https://github.com/ulfalfa/us-scheduler/compare/v0.2.0...v0.2.1) (2018-09-12)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/ulfalfa/us-scheduler/compare/v0.1.1...v0.2.0) (2018-06-06)


### Features

* **scheduler:** the suntimes are also returned for already passed events on the day ([6474233](https://github.com/ulfalfa/us-scheduler/commit/6474233))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/ulfalfa/us-scheduler/compare/v0.1.0...v0.1.1) (2018-06-03)



<a name="0.1.0"></a>
# [0.1.0](https://github.com/ulfalfa/us-scheduler/compare/v0.0.2...v0.1.0) (2018-06-02)


### Features

* **scheduler:** possibility to add custom times ([93e0fd5](https://github.com/ulfalfa/us-scheduler/commit/93e0fd5))



<a name="0.0.3"></a>
## [0.0.3](https://github.com/ulfalfa/us-scheduler/compare/v0.0.2...v0.0.3) (2018-05-31)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/ulfalfa/us-scheduler/compare/v0.0.1...v0.0.2) (2018-05-31)


### Bug Fixes

* **scheduler:** clean up lint error (unused variable) ([4edf75f](https://github.com/ulfalfa/us-scheduler/commit/4edf75f))



<a name="0.0.1"></a>
## 0.0.1 (2018-05-31)


### Features

* **scheduler:** add general schedule method a32defb
* **scheduler:** added observe cron ba68d48
* **scheduler:** finalized first working version 6814c45
* **scheduler:** new method "in" 68cbde4
* **UsScheduler:** first version 5dfbc7f
