/* eslint-disable newline-after-var,func-style,max-lines-per-function */
const { CronJob, CronTime } = require('cron');
const tzlookup              = require('tz-lookup');
const SunCalc               = require('suncalc');

const SUNRISE_TIME_THRESHOLD_ID    = 'sunrise-time';
const SUNSET_TIME_THRESHOLD_ID     = 'sunset-time';
const ON_SUNRISE_TIME_THRESHOLD_ID = 'on-sunrise-time';
const ON_SUNSET_TIME_THRESHOLD_ID  = 'on-sunset-time';

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (
    latlng,
    sunriseTopic = [],
    sunriseMessage = null,
    sunriseOffset = 0,
    sunsetTopic = [],
    sunsetMessage = null,
    sunsetOffset = 0,
    activationSensors = []
) => {
    try {
        if (!latlng) throw new Error('latlng is required');
        if (!sunriseTopic && !sunsetTopic) throw new Error('one of sunriseTopic, sunsetTopic is required');

        const scenario = global.scenario;

        await scenario.init();

        scenario.initThreshold(SUNRISE_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });
        scenario.initThreshold(SUNSET_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });
        scenario.initThreshold(ON_SUNRISE_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });
        scenario.initThreshold(ON_SUNSET_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });

        const [ latitude, longitude ] = latlng.split(',').map(x => +x);
        const timeZone                = tzlookup(latitude, longitude);
        const sunriseTimeTopic        = scenario.getThresholdTopic(SUNRISE_TIME_THRESHOLD_ID);
        const sunsetTimeTopic         = scenario.getThresholdTopic(SUNSET_TIME_THRESHOLD_ID);
        const onTimeTopic             = scenario.getThresholdTopic(ON_SUNRISE_TIME_THRESHOLD_ID);
        const offTimeTopic            = scenario.getThresholdTopic(ON_SUNSET_TIME_THRESHOLD_ID);

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

        // eslint-disable-next-line no-shadow
        const getCronExpressionsOnSunriseAndSunset = () => {
            const { sunriseTime, sunsetTime } = getSunriseSunsetTimes();

            const getCronExp = (currentTime, offset = 0) => {
                // eslint-disable-next-line no-magic-numbers
                const offsetInMilliseconds = offset * 60 * 1000;
                const total = currentTime + offsetInMilliseconds;

                const date = new Date(total);
                const m = date.getMinutes();
                const hr = date.getHours();

                return `${m} ${hr} * * *`;
            };

            const cronExpOnSunrise = getCronExp(sunriseTime, sunriseOffset);
            const cronExpOnSunset = getCronExp(sunsetTime, sunsetOffset);

            return {
                cronExpOnSunrise,
                cronExpOnSunset
            };
        };

        const sunriseTopicList = Array.isArray(sunriseTopic) ? sunriseTopic : [ sunriseTopic ];
        const sunsetTopicList = Array.isArray(sunsetTopic) ? sunsetTopic : [ sunsetTopic ];

        if (sunriseTopicList.length || sunsetTopicList.length) {
            // eslint-disable-next-line no-param-reassign
            activationSensors = [ ...sunriseTopicList, ...sunsetTopicList ];
        }

        const onSunrise = () => {
            activationSensors.forEach(topic => {
                scenario.set(`${topic}`, sunriseMessage);

                log.info('On sunrise, set:', { topic, sunriseMessage });
            });
        };

        const onSunset = () => {
            activationSensors.forEach(topic => {
                scenario.set(`${topic}`, sunsetMessage);

                log.info('On sunset, set:', { topic, sunsetMessage });
            });
        };

        const { cronExpOnSunrise, cronExpOnSunset } = getCronExpressionsOnSunriseAndSunset();

        log.info({
            cronOnSunrise : sunriseMessage ? cronExpOnSunrise : null,
            cronOnSunset  : sunsetMessage ? cronExpOnSunset : null
        });

        const taskOnSunrise = sunriseMessage ?
            new CronJob(cronExpOnSunrise, onSunrise, null, false, timeZone) :
            null;

        const taskOnSunset = sunsetMessage ?
            new CronJob(cronExpOnSunset, onSunset, null, false, timeZone) :
            null;

        const startTaskOnSunrise = () => {
            if (taskOnSunrise) {
                const [ onMinutes, onHours ] = cronExpOnSunrise.match(/\d+/g);

                scenario.set(onTimeTopic, `${onHours}:${onMinutes}`);

                taskOnSunrise.start();
            } else {
                scenario.set(onTimeTopic, '');
            }
        };

        const startTaskOnSunset = () => {
            if (taskOnSunset) {
                const [ offMinutes, offHours ] = cronExpOnSunset.match(/\d+/g);

                scenario.set(offTimeTopic, `${offHours}:${offMinutes}`);

                taskOnSunset.start();
            } else {
                scenario.set(offTimeTopic, '');
            }
        };

        // eslint-disable-next-line no-unused-vars
        const reset = new CronJob('0 0 * * *', () => {
            // eslint-disable-next-line no-shadow
            const { cronExpOnSunrise, cronExpOnSunset } = getCronExpressionsOnSunriseAndSunset();

            if (taskOnSunrise) taskOnSunrise.setTime(new CronTime(cronExpOnSunrise, timeZone));
            if (taskOnSunset) taskOnSunset.setTime(new CronTime(cronExpOnSunset, timeZone));

            refreshSunriseSunsetThresholds();

            log.info('Midnight, set cron jobs on sunrise and sunset:', {
                cronTimeOnSunrise : cronExpOnSunrise,
                cronTimeOnSunset  : cronExpOnSunset
            });

            startTaskOnSunrise();
            startTaskOnSunset();
        }, null, false, timeZone);

        startTaskOnSunrise();
        startTaskOnSunset();
        refreshSunriseSunsetThresholds();
        reset.start();
    } catch (e) {
        log.warn(e.message);
    }
};
