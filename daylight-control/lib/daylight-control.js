/* eslint-disable func-style */
const { CronJob } = require('cron');
const tzlookup    = require('tz-lookup');
const SunCalc     = require('suncalc');

const SUNRISE_TIME_THRESHOLD_ID   = 'sunrise-time';
const SUNSET_TIME_THRESHOLD_ID    = 'sunset-time';
const ON_TIME_THRESHOLD_ID        = 'on-time';
const OFF_TIME_THRESHOLD_ID       = 'off-time';
const DAYLIGHT_HOURS_THRESHOLD_ID = 'daylight-hours';
const ENABLED_THRESHOLD_ID        = 'enabled';
const MS_IN_MIN                   = 60000;
const MS_IN_HOUR                  = MS_IN_MIN * 60;
const MIN_POSSIBLE_DAYLIGHT_HOURS = 1;
const MAX_POSSIBLE_DAYLIGHT_HOURS = 23;

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

/* eslint-disable no-undef */
// eslint-disable-next-line max-lines-per-function
module.exports = async function (cityCoordinates, switchTopicOrTopics, messageOn, messageOff, offsetInMins) {
    await scenario.init();

    scenario.initThreshold(SUNRISE_TIME_THRESHOLD_ID, {
        datatype : 'string',
        settable : 'false'
    });
    scenario.initThreshold(SUNSET_TIME_THRESHOLD_ID, {
        datatype : 'string',
        settable : 'false'
    });
    scenario.initThreshold(ON_TIME_THRESHOLD_ID, {
        datatype : 'string',
        settable : 'false'
    });
    scenario.initThreshold(OFF_TIME_THRESHOLD_ID, {
        datatype : 'string',
        settable : 'false'
    });
    scenario.initThreshold(DAYLIGHT_HOURS_THRESHOLD_ID, {
        datatype : 'integer',
        unit     : 'hours'
    });
    scenario.initThreshold(ENABLED_THRESHOLD_ID, {
        datatype : 'boolean'
    });

    const offsetTime              = offsetInMins * MS_IN_MIN;
    const sunriseTimeTopic        = scenario.getThresholdTopic(SUNRISE_TIME_THRESHOLD_ID);
    const sunsetTimeTopic         = scenario.getThresholdTopic(SUNSET_TIME_THRESHOLD_ID);
    const onTimeTopic             = scenario.getThresholdTopic(ON_TIME_THRESHOLD_ID);
    const offTimeTopic            = scenario.getThresholdTopic(OFF_TIME_THRESHOLD_ID);
    const daylightHoursTopic      = scenario.getThresholdTopic(DAYLIGHT_HOURS_THRESHOLD_ID);
    const enabledTopic            = scenario.getThresholdTopic(ENABLED_THRESHOLD_ID);
    const [ latitude, longitude ] = cityCoordinates.split(',').map(x => +x);
    const timeZone                = tzlookup(latitude, longitude);
    const switcherTopics          = Array.isArray(switchTopicOrTopics) ? switchTopicOrTopics : [ switchTopicOrTopics ];

    let enabled = scenario.getTarget(ENABLED_THRESHOLD_ID);
    // set default value for "enabled" threshold to true if threshold was not set yet
    if (enabled === undefined) {
        enabled = true;
        await scenario.set(enabledTopic, true, { withRetry: true });
    } else {
        enabled = enabled === 'true';
    }

    log.info({
        offsetTime,
        daylightHoursTopic,
        enabledTopic,
        latitude,
        longitude,
        switcherTopics
    });

    let cronJobOn       = null;
    let cronJobOff      = null;
    let midnightCronJob = null;

    const onJobOn = () => {
        switcherTopics.forEach(topic => scenario.set(topic, messageOn));
    };

    const onJobOff = () => {
        switcherTopics.forEach(topic => scenario.set(topic, messageOff));
    };

    const stopOnOffCronJobs = () => {
        if (cronJobOn) cronJobOn.stop();
        if (cronJobOff) cronJobOff.stop();
    };

    const setupOnOffCronJobs = (cronOnTime, cronOffTime) => {
        const cronOnTimeHours    = cronOnTime.getHours();
        const cronOnTimeMinutes  = cronOnTime.getMinutes();
        const cronOffTimeHours   = cronOffTime.getHours();
        const cronOffTimeMinutes = cronOffTime.getMinutes();
        const onTimeString       = `${cronOnTimeHours}:${cronOnTimeMinutes}`;
        const offTimeString      = `${cronOffTimeHours}:${cronOffTimeMinutes}`;

        let onJobOffCallback = onJobOff;

        scenario.set(onTimeTopic, onTimeString);
        scenario.set(offTimeTopic, offTimeString);

        log.info({
            onTime  : onTimeString,
            offTime : offTimeString
        });

        cronJobOn = new CronJob(
            `${cronOnTime.getMinutes()} ${cronOnTime.getHours()} * * *`,
            onJobOn,
            null,
            true,
            timeZone
        );

        if (cronOffTimeHours < cronOnTimeHours) {
            if (midnightCronJob) midnightCronJob.stop();

            onJobOffCallback = () => {
                onJobOff();
                onChange();
                midnightCronJob.start();
            };
        }

        cronJobOff = new CronJob(
            `${cronOffTime.getMinutes()} ${cronOffTime.getHours()} * * *`,
            onJobOffCallback,
            null,
            true,
            timeZone
        );
    };

    const handleEnabledThreshold = () => {
        const newEnabledThresholdValue = scenario.getTarget(ENABLED_THRESHOLD_ID);
        enabled = newEnabledThresholdValue === 'true';

        if (enabled) {
            onChange();
        } else {
            stopOnOffCronJobs();

            log.info('Handle enabled threshold: stop on/off cron jobs');
        }
    };

    // eslint-disable-next-line no-shadow
    const dateToTimeZone = (date, timeZone) => new Date(date.toLocaleString('en-US', { timeZone }));

    const getSunriseSunsetTimes = () => {
        const currCityDate         = dateToTimeZone(new Date(), timeZone);
        const { sunrise, sunset }  = SunCalc.getTimes(currCityDate, latitude, longitude);
        const sunriseTime          = dateToTimeZone(new Date(sunrise), timeZone).getTime();
        const sunsetTime           = dateToTimeZone(new Date(sunset), timeZone).getTime();

        return {
            sunriseTime,
            sunsetTime
        };
    };

    const refreshSunriseSunsetThresholds = () => {
        let { sunriseTime, sunsetTime } = getSunriseSunsetTimes();

        sunriseTime = new Date(sunriseTime);
        sunsetTime = new Date(sunsetTime);

        const sunriseTimeString = `${sunriseTime.getHours()}:${sunriseTime.getMinutes()}`;
        const sunsetTimeString  = `${sunsetTime.getHours()}:${sunsetTime.getMinutes()}`;

        scenario.set(sunriseTimeTopic, sunriseTimeString);
        scenario.set(sunsetTimeTopic, sunsetTimeString);

        log.info({
            sunriseTime : sunriseTimeString,
            sunsetTime  : sunsetTimeString
        });
    };

    const onChange = async () => {
        refreshSunriseSunsetThresholds();

        if (!enabled) return; // if scenario is disabled

        let targetDaylightTimeInHours = +scenario.getTarget(DAYLIGHT_HOURS_THRESHOLD_ID);

        if (targetDaylightTimeInHours < MIN_POSSIBLE_DAYLIGHT_HOURS) {
            targetDaylightTimeInHours = MIN_POSSIBLE_DAYLIGHT_HOURS;

            await scenario.set(daylightHoursTopic, MIN_POSSIBLE_DAYLIGHT_HOURS, { withRetry: true });
        }

        if (targetDaylightTimeInHours > MAX_POSSIBLE_DAYLIGHT_HOURS) {
            targetDaylightTimeInHours = MAX_POSSIBLE_DAYLIGHT_HOURS;

            await scenario.set(daylightHoursTopic, MAX_POSSIBLE_DAYLIGHT_HOURS, { withRetry: true });
        }

        log.info({ targetDaylightTimeInHours });

        if (targetDaylightTimeInHours) {
            const targetDaylightTime          = targetDaylightTimeInHours * MS_IN_HOUR;
            const { sunriseTime, sunsetTime } = getSunriseSunsetTimes();
            const sunsetWithOffsetTime        = sunsetTime - offsetTime; // time when to set on message
            const currDaylightTime            = sunsetWithOffsetTime - sunriseTime;

            log.info({
                targetDaylightTime,
                sunriseTime,
                sunsetTime,
                sunsetWithOffsetTime,
                currDaylightTime
            });

            stopOnOffCronJobs();

            if (currDaylightTime < targetDaylightTime) {
                const daylightDiffTime = targetDaylightTime - currDaylightTime;
                const offTime = sunsetWithOffsetTime + daylightDiffTime; // time when to set off message

                log.info({ daylightDiffTime, offTime });

                const currTime = dateToTimeZone(new Date(), timeZone).getTime();

                if (currTime >= sunsetWithOffsetTime && currTime < offTime) {
                    onJobOn();
                }

                setupOnOffCronJobs(new Date(sunsetWithOffsetTime), new Date(offTime));
            } else {
                scenario.set(onTimeTopic, '');
                scenario.set(offTimeTopic, '');
            }
        }
    };

    onChange();

    // listen to daylight hours threshold changes
    scenario.message(topic => {
        if (topic === enabledTopic) handleEnabledThreshold();
        if (topic === daylightHoursTopic) onChange();
    });

    // eslint-disable-next-line no-new
    midnightCronJob = new CronJob('0 0 * * *', onChange, null, true, timeZone);
};
