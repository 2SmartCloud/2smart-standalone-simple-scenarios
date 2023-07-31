/* eslint-disable require-atomic-updates */
/* eslint-disable no-param-reassign */
/* eslint-disable func-style */
const  { CronJob, CronTime }  = require('cron');
const parser   = require('cron-parser/lib/expression');
const debounce = require('debounce');

const START_TIME_THRESHOLD_ID = 'start-time';
const END_TIME_THRESHOLD_ID = 'finish-time';
const NEXT_START_TIME_THRESHOLD_ID = 'next-start-time';
const NEXT_END_TIME_THRESHOLD_ID = 'next-finish-time';
const CURRENT_STATE_THRESHOLD_ID = 'current-state';

const MAX_MINUTES_NUMBER = 59;
const MAX_HOURS_NUMBER = 23;
const MAX_DAYS_NUMBER = 31;
const MAX_MONTHS_NUMBER = 11;
const MAX_WEEKDAYS_NUMBER = 6;

const CRON_FORMAT_LENGTH = 5;
const TIMEOUT_FOR_DEBOUNCE = 500;

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

// eslint-disable-next-line max-lines-per-function
module.exports = async (scheduleConfig, outputTopic, messageOn, messageOff) => {
    try {
        if (!scheduleConfig.length) throw new Error('scheduleConfig is required');
        if (!outputTopic) throw new Error('outputTopic is required');
        if (!messageOn) throw new Error('messageOn is required');
        if (!messageOff) throw new Error('messageOff is required');

        const baseScheduleStart = scheduleConfig[0].start;
        const baseScheduleEnd = scheduleConfig[0].end;

        let jobs = [];

        const timeZone = process.env.TZ || 'Etc/Greenwich';
        const outputTopicsList = Array.isArray(outputTopic) ? outputTopic : [ outputTopic ];
        const convertTime = (obj, month = false) => Object.keys(obj).map(key => !month ? +key : +key + 1);
        const isLater = (date1, date2) => new Date(date1) > new Date(date2);

        await scenario.init();

        scenario.initThreshold(START_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'true'
        });

        scenario.initThreshold(END_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'true'
        });

        scenario.initThreshold(NEXT_START_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });

        scenario.initThreshold(NEXT_END_TIME_THRESHOLD_ID, {
            datatype : 'string',
            settable : 'false'
        });

        scenario.initThreshold(CURRENT_STATE_THRESHOLD_ID, {
            datatype : 'boolean',
            settable : 'false'
        });

        const startTopic     = scenario.getThresholdTopic(START_TIME_THRESHOLD_ID);
        const endTopic       = scenario.getThresholdTopic(END_TIME_THRESHOLD_ID);
        const nextStartTopic = scenario.getThresholdTopic(NEXT_START_TIME_THRESHOLD_ID);
        const nextEndTopic   = scenario.getThresholdTopic(NEXT_END_TIME_THRESHOLD_ID);
        const enabled        = scenario.getThresholdTopic(CURRENT_STATE_THRESHOLD_ID);

        scenario.initMethod('reset-time', () => {
            log.info('Schedule was updated!');
            scenario.set(startTopic, '');
            scenario.set(endTopic, '');
            updateTimeValues();
        });

        const startFromThreshold = scenario.getTarget(START_TIME_THRESHOLD_ID);
        const endFromThreshold = scenario.getTarget(END_TIME_THRESHOLD_ID);

        if (startFromThreshold) scheduleConfig[0].start = startFromThreshold;
        if (endFromThreshold) scheduleConfig[0].end = endFromThreshold;

        const sendCmd = cmd => outputTopicsList.forEach(topic => {
            const currentValue = scenario.get(topic);
            if (currentValue !== cmd) {
                scenario.set(topic, cmd);
                log.info('Send command, set', topic, cmd);
            }
        });

        const createCronJob = (cron, cb = () => { }) => new CronJob(cron, cb, null, true, timeZone);

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

        const checkRange = (array, min, max) => {
            if (!array) return false;
            const wrongValues = array.filter(value => !((+value >= min && +value <= max) || value === '*'));

            return !(wrongValues.length);
        };

        const validate = time => {
            if (time.split(' ').length !== CRON_FORMAT_LENGTH) return false;

            const [ minutes, hours, days, months, weekdays ] = time.split(' ').map(x => x.split(','));

            const isMinutesValid = checkRange(minutes, 0, MAX_MINUTES_NUMBER);
            const isHoursValid = checkRange(hours, 0, MAX_HOURS_NUMBER);
            const isDaysValid = checkRange(days, 1, MAX_DAYS_NUMBER);
            const isMonthsValid = checkRange(months, 0, MAX_MONTHS_NUMBER);
            const isWeekdaysValid = checkRange(weekdays, 0, MAX_WEEKDAYS_NUMBER);

            const flag = isMinutesValid && isHoursValid && isDaysValid && isMonthsValid && isWeekdaysValid;

            return flag;
        };

        const findNextTime = () => {
            scheduleConfig.forEach(cron => {
                const startCron = new CronTime(cron.start);
                const endCron = new CronTime(cron.end);

                const startConditions = getConditions(startCron);
                const endConditions = getConditions(endCron);

                const startExpr = new parser(startConditions, { tz: timeZone });
                const endExpr = new parser(endConditions, { tz: timeZone });

                scenario.set(nextStartTopic, startExpr.next().toString());
                scenario.set(nextEndTopic, endExpr.next().toString());
            });
        };

        const onIntervalStart = () =>  {
            findNextTime();
            sendCmd(messageOn);
            scenario.set(enabled, true);
        };

        const onIntervalStop = () => {
            findNextTime();
            sendCmd(messageOff);
            scenario.set(enabled, false);
        };

        const isInterval = () => { // повторюється в watering schedule, можна винести в окремий модуль
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

        const initSchedule = () => {
            log.info('new schedule inited');

            findNextTime();

            if (isInterval()) onIntervalStart();
            else onIntervalStop();

            jobs.forEach(cronJob => cronJob.stop());
            jobs = [];

            scheduleConfig.forEach(interval => {
                jobs.push(createCronJob(interval.start, onIntervalStart));
                jobs.push(createCronJob(interval.end, onIntervalStop));
            });
        };

        const debouncedInitSchedule = debounce(initSchedule, TIMEOUT_FOR_DEBOUNCE);

        const updateTimeValues = async () => {
            const startTime = scenario.getTarget(START_TIME_THRESHOLD_ID) || baseScheduleStart;
            const endTime = scenario.getTarget(END_TIME_THRESHOLD_ID) || baseScheduleEnd;

            const newScheduleConfig = [ { start: startTime, end: endTime } ];

            if (validate(startTime) && validate(endTime)) {
                scheduleConfig = newScheduleConfig;
                debouncedInitSchedule();
            } else {
                log.warn('Wrong format, use cron. Example: "12 4 * 1,2,4 *"');
                await scenario.set(startTopic, scheduleConfig[0].start);
                await scenario.set(endTopic, scheduleConfig[0].end);
            }
        };

        initSchedule();
        findNextTime();

        scenario.message(async (topic, message) => {
            if ([ startTopic, endTopic ].includes(topic)) {
                for (const cron of scheduleConfig) {
                    // if message is previous (default) value
                    if (message === cron.start && message === cron.end) return;
                }

                await updateTimeValues();
            }
        });

        log.info('Start scenario');
    } catch (e) {
        log.warn(e.message);
    }
};
