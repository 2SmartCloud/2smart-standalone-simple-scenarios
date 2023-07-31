/* eslint-disable func-style */
const CronJob  = require('cron').CronJob;
const CronTime = require('cron').CronTime;
const parser   = require('cron-parser/lib/expression');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

// eslint-disable-next-line max-lines-per-function
module.exports = async (scheduleConfig, outputTopic, startCmd, stopCmd,
    wheatherTopic = '', wheatherMessage = '', timeDelay = 0, humidityTopic = '') => {
    try {
        if (!scheduleConfig.length) throw new Error('scheduleConfig is required');
        if (!outputTopic) throw new Error('outputTopic is required');
        if (!startCmd) throw new Error('startCmd is required');
        if (!stopCmd) throw new Error('stopCmd is required');
        if (isNaN(timeDelay)) throw new Error('timeDelay must be a number');

        const scenario = global.scenario;

        await scenario.init();

        let wateringDelay;

        let currentCondition;

        let previousCondition;

        const thresholdId = 'setpoint';
        const thTopic = scenario.getThresholdTopic(thresholdId);

        if (humidityTopic) scenario.initThreshold(thresholdId, { datatype: 'float' });

        const outputTopicsList = Array.isArray(outputTopic) ? outputTopic : [ outputTopic ];
        const wheatherMessagesList = wheatherMessage.split(',').map(m => m.trim().toLowerCase());
        const timeZone = process.env.TZ || 'Etc/Greenwich';

        // eslint-disable-next-line no-magic-numbers
        const getTimeDelay = () => timeDelay * 60 * 1000;
        const convertTime = (obj, month = false) => Object.keys(obj).map(key => !month ? +key : +key + 1);
        const isLater = (date1, date2) => new Date(date1) > new Date(date2);
        const getCurrHumidity = () => +scenario.get(humidityTopic);

        const getConditions = (data) => {
            return {
                second     : convertTime(data.second),
                minute     : convertTime(data.minute),
                hour       : convertTime(data.hour),
                dayOfMonth : convertTime(data.dayOfMonth),
                month      : convertTime(data.month, true),
                dayOfWeek  : convertTime(data.dayOfWeek)
            };
        };

        const sendCmd = cmd => outputTopicsList.forEach(topic => {
            scenario.set(topic, cmd);

            log.info('Send command, set', topic, cmd);
        });

        const start = () => {
            // ignore on deferred watering
            if (wateringDelay) return;

            if (isWeatherCondition()) {
                log.info('Interval start: weather condition is true, don\'t start');

                return;
            }

            if (isMoist()) {
                log.info('Interval start: humidity is greater than target value, don\t start');

                return;
            }

            sendCmd(startCmd);
        };

        const stop = () => sendCmd(stopCmd);

        const createCronJob = (cron, cb = () => {}) => {
            const task = new CronJob(cron, cb, null, null, timeZone);

            task.start();

            return task;
        };

        const initSchedule = () => {
            scheduleConfig.forEach(interval => {
                createCronJob(interval.start, start);
                createCronJob(interval.end, stop);
            });
        };

        const isInterval = () => {
            let interval = false;

            for (const cron of scheduleConfig) {
                const startCron = new CronTime(cron.start);
                const endCron = new CronTime(cron.end);

                const startConditions = getConditions(startCron);
                const endConditions = getConditions(endCron);

                const startExpr = new parser(startConditions, { tz: timeZone });
                const endExpr = new parser(endConditions, { tz: timeZone });

                const startPrev = startExpr.prev().toString();
                const endPrev = endExpr.prev().toString();

                interval = isLater(startPrev, endPrev);

                // interrupt cycle when found first interval for current time
                if (interval) break;
            }

            return interval;
        };

        const isWeatherCondition = () => {
            if (!wheatherTopic) return false;

            const skyState = scenario.get(wheatherTopic);

            return includesWeatherCondition(skyState);
        };

        const includesWeatherCondition = (condition = '') => {
            return wheatherMessagesList.includes(condition.toLowerCase());
        };

        const isMoist = () => {
            if (!humidityTopic) return false;

            const humidity = getCurrHumidity();
            const target = +scenario.getTarget(thresholdId);

            return target < humidity;
        };

        // Set deferred watering if delay specified and deferred watering is in schedule interval
        const setDelay = () => {
            if (!timeDelay) return;
            if (wateringDelay) clearTimeout(wateringDelay);

            // For example, it was raining (previousCondition) and now it's sunny (currentCondition)
            if (includesWeatherCondition(previousCondition) && !includesWeatherCondition(currentCondition)) {
                wateringDelay = setTimeout(() => {
                    wateringDelay = undefined;

                    if (isInterval()) start();
                }, getTimeDelay());
            }
        };

        // Set deferred watering on specified weather condition
        const proceedWeather = () => {
            previousCondition = currentCondition;
            currentCondition = scenario.get(wheatherTopic);

            log.info('Proceed weather:', {
                previousCondition,
                currentCondition,
                wateringDelay,
                isInterval         : isInterval(),
                isWeatherCondition : isWeatherCondition()
            });

            setDelay();

            // process weather only when current time in schedule interval
            if (isInterval()) {
                // start watering if there is not deffered watering
                if (!wateringDelay) start();

                // stop watering if current weather state in specified conditions
                if (isWeatherCondition()) stop();
            }
        };

        const proceedHumidity = () => {
            log.info(`Proceed humidity: new value for humidity = ${scenario.getTarget(thresholdId)}`);

            if (isInterval()) {
                if (!isMoist()) start();
                else {
                    stop();

                    log.info('Proceed humidity: humidity is greater than target, stop interval');
                }
            }
        };

        initSchedule();

        // Start watering If scenario started in scheduled interval
        if (isInterval()) {
            proceedWeather();
            proceedHumidity();
        }

        log.info(`Start scenario: current humidity = ${getCurrHumidity()}`);

        scenario.message(topic => {
            if (topic === wheatherTopic) proceedWeather();
            else if ([ humidityTopic, thTopic ].includes(topic)) proceedHumidity();
        });
    } catch (e) {
        log.warn(e.message);
    }
};
