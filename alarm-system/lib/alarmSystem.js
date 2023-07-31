/* eslint-disable newline-after-var,default-param-last,func-style, no-magic-numbers */
/* eslint-disable no-case-declarations */
const SYSTEM_ARMING_MESSAGE = 'The system is armed';
const SYSTEM_DISARMING_MESSAGE = 'The system is disarmed';
const PANIC_MESSAGE = 'Unexpected security breach. Please, check your system';
const SUSPICIOUS_STATE_MSG = 'Alarm system is in suspicious mode';

// eslint-disable-next-line max-lines-per-function
module.exports = async (
    activateTopics = null,
    activateMessage = null,
    deactivateMessage = null,
    sensorTopics,
    sensorMessage,
    actionTopics,
    notificationChannels = [],
    sendSysArmingMessage = false,
    sendSysDisarmingMessage = false,
    sendPanicMessage = false,
    falsePositivesHandling = false,
    sendMsgOnSuspiciousState = false,
    minSensorsQuantityToAlarm = 2,
    maxInvocationTimeDiff = 60
) => {
    try {
        if (!sensorTopics) throw new Error('sensorTopics is required');
        if (!sensorMessage) throw new Error('sensorMessage is required');
        if (!actionTopics) throw new Error('actionTopics is required');

        // const { log } = scenario;
        // ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
        const log = {
            info : console.log,
            warn : console.warn
        };

        await scenario.init();
        const thAlarmStateId = 'alarm-state';
        const thEmergencyStateId = 'emergency-state';
        const thSuspiciousStateId = 'suspicious-state';

        scenario.initMethod('alarm-button', () => {
            log.info('Alarm button was pressed!');

            const isChanged = changeActiveStatus(activateMessage);
            alarm(true, !isChanged);
        });
        scenario.initThreshold(thAlarmStateId, { datatype: 'boolean' });
        scenario.initThreshold(thEmergencyStateId, { datatype: 'boolean', settable: false });
        scenario.initThreshold(thSuspiciousStateId, { datatype: 'boolean', settable: false });

        const thAlarmStateTopic = scenario.getThresholdTopic(thAlarmStateId);
        const thSuspiciousStateTopic = scenario.getThresholdTopic(thSuspiciousStateId);
        const thEmergencyStateTopic = scenario.getThresholdTopic(thEmergencyStateId);
        const activateTopicsList = Array.isArray(activateTopics) ? activateTopics : [ activateTopics ];

        let isActive = false;
        let isAlarm = false;

        let invokedSensors = [];
        let suspiciousStateTimer = null;

        const secToMs = (sec) => sec * 1000;

        // wrapper function with notification functionality
        const set = (topic, value, { withNotify, message } = {}) => {
            scenario.set(topic, value);
            if (withNotify) notify(message);
        };

        const initThresholdStatus = () => {
            const thValue = scenario.getTarget(thAlarmStateId);
            if (thValue === undefined) return;

            isActive = thValue === 'true';

            if (isActive) {
                log.info('Init threshold status:', thAlarmStateTopic, isActive);

                set(thAlarmStateTopic, isActive);
            } else {
                changeActiveStatusOnInit();
            }
        };

        const changeActiveStatusOnInit = () => {
            const thValue = scenario.getTarget(thAlarmStateId);

            const isActivateTopicsOn = activateTopicsList.some(topic => {
                const value = scenario.get(topic);

                return value === activateMessage;
            });

            const isActivateTopicsOff = activateTopicsList.some(topic => {
                const value = scenario.get(topic);

                return value === deactivateMessage;
            });

            // Threshold is not synced yet and action topics are not triggered
            if (thValue === undefined && !isActivateTopicsOn) return;

            if (isActivateTopicsOn) {
                isActive = isActivateTopicsOn;

                log.info('Is activate topics on:', thAlarmStateTopic, isActive);

                set(thAlarmStateTopic, isActive);
            } else if (isActivateTopicsOff) {
                isActive = !isActivateTopicsOff;

                log.info('Is activate topics off:', thAlarmStateTopic, isActive);

                set(thAlarmStateTopic, isActive);
            }
        };

        const changeActiveStatus = (topicValue) => {
            const thValue = scenario.getTarget(thAlarmStateId);

            if (topicValue === activateMessage) {
                isActive = true;
            } else if (topicValue === deactivateMessage) {
                isActive = false;
            }

            if (thValue === `${isActive}`) {
                log.info(`Try to change activate status, topic value already in ${isActive} status`);

                return false;
            }

            log.info(
                `Change activate status, topic value equals to ${isActive ? 'activate' : 'deactivate'} message:`,
                thAlarmStateTopic,
                isActive
            );
            set(thAlarmStateTopic, isActive);

            return true;
        };

        const alarm = (status = true, withNotification = true) => {
            isAlarm = status;

            log.info('Alarm, alarm state topic:', thAlarmStateTopic, scenario.getTarget(thAlarmStateId));
            log.info('Alarm, emergency state topic:', thEmergencyStateTopic, isAlarm);

            set(thEmergencyStateTopic, isAlarm, {
                withNotify : sendPanicMessage && withNotification && isAlarm,
                message    : PANIC_MESSAGE
            });

            actionTopics.forEach(({ topic, messageOn, messageOff }) => {
                const value = status ? messageOn : messageOff;

                log.info('Alarm, action topic set: ', topic, value);

                set(topic, value);
            });
        };

        const turnOnSuspiciousState = () => {
            const suspiciousStateStatus = scenario.getTarget(thSuspiciousStateId);
            if (suspiciousStateStatus === 'true') return;

            scenario.set(thSuspiciousStateTopic, true);
            if (sendMsgOnSuspiciousState) notify(SUSPICIOUS_STATE_MSG);
        };

        const turnOffSuspiciousState = () => {
            invokedSensors = [];
            scenario.set(thSuspiciousStateTopic, false);
        };

        const proceedThreshold = () => {
            const thValue = scenario.getTarget(thAlarmStateId);
            const status = thValue === 'true';

            if (status === true && sendSysArmingMessage) notify(SYSTEM_ARMING_MESSAGE);
            if (status === false) {
                if (sendSysDisarmingMessage) notify(SYSTEM_DISARMING_MESSAGE);
                clearTimeout(suspiciousStateTimer); // do not allow reset suspicious state in future
                turnOffSuspiciousState();
            }

            if (thValue === undefined) return;

            alarm(status && isAlarm);
            isActive = status;
        };

        /**
         * Call alarm or ignore when new msg received
         * @param {String} value
         */
        const processActionTopic = (topic, value) => {
            log.info('Process sensor topic:', value);

            if (!isActive || sensorMessage !== value) return;

            if (falsePositivesHandling) return processFalsePositives(topic);

            alarm();
        };

        const processFalsePositives = topic => { // turn on alarm if multiple sensors were triggered only
            turnOnSuspiciousState();
            clearTimeout(suspiciousStateTimer); // do not turn off suspicious state
            suspiciousStateTimer = setTimeout(turnOffSuspiciousState, secToMs(maxInvocationTimeDiff));

            if (invokedSensors.includes(topic)) return;
            invokedSensors.push(topic);

            if (invokedSensors.length >= minSensorsQuantityToAlarm) alarm();
        };

        /**
         * Send notifications to messangers if specified
         */
        const notify = (message) => {
            if (!Array.isArray(notificationChannels)) return;

            notificationChannels.forEach(channel => scenario.notify(channel, message));
        };

        const compare = (topic) => {
            if (!isAlarm) return;
            const actionData = actionTopics.find(obj => obj.topic === topic);

            if (!actionData) return;

            const state = scenario.get(actionData.topic);

            if (state === actionData.messageOff) {
                log.info(
                    'Compare, action data topic value equals to action data messageOff:',
                    actionData.topic,
                    actionData.messageOn
                );

                set(actionData.topic, actionData.messageOn);
            }
        };

        scenario.message((topic, msg) => {
            const value = msg.toString();

            if (activateTopicsList.includes(topic)) changeActiveStatus(value); // активировать сценарий сигналки
            else if (sensorTopics.includes(topic)) processActionTopic(topic, value); // включить звук
            else if (topic === thAlarmStateTopic) proceedThreshold();
            else compare(topic, value);
        });

        initThresholdStatus();
    } catch (e) {
        console.log(e);
    }
};
