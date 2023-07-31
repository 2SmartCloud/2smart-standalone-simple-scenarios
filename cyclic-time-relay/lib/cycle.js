/* eslint-disable func-style */
// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};
// eslint-disable-next-line max-lines-per-function
module.exports = async (outputTopic, pulseDuration, pauseDuration, messageOn, messageOff) => {
    try {
        if (!outputTopic) throw new Error('outputTopic is required');
        if (!pulseDuration) throw new Error('pulseDuration is required');
        if (!pauseDuration) throw new Error('pauseDuration is required');
        if (!messageOn) throw new Error('messageOn is required');
        if (!messageOff) throw new Error('messageOff is required');

        const outputTopicsList = Array.isArray(outputTopic) ? outputTopic : [ outputTopic ];
        // eslint-disable-next-line no-magic-numbers
        const minutesToMilliseconds = (min) => min * 60 * 1000;
        await scenario.init();

        const sendCmd = cmd => outputTopicsList.forEach(topic => {
            scenario.set(topic, cmd);
            log.info('Send command, set', topic, cmd);
        });

        const onPulseStart = (msg) => sendCmd(msg);
        const onPulseEnd = (msg) => sendCmd(msg);
        const startPulse = () => {
            onPulseStart(messageOn);
            setTimeout(() => onPulseEnd(messageOff), minutesToMilliseconds(pulseDuration));
            setTimeout(() => startPulse(), minutesToMilliseconds(pulseDuration + pauseDuration)); // start a new pulse
        };

        startPulse();
        log.info('Start scenario');
    } catch (e) {
        log.warn(e.message);
    }
};
