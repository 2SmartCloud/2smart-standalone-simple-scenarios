/* eslint-disable no-magic-numbers,no-param-reassign,no-undef */
const FakePresence = require('./lib/FakePresence');
const Switch       = require('./lib/Switch');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (
    topics,
    onMessage = true,
    offMessage = false,
    onMinDuration = 1,
    onMaxDuration = 10,
    offMinDuration = 1,
    offMaxDuration = 10
) => {
    try {
        onMinDuration  *= 1000;
        onMaxDuration  *= 1000;
        offMinDuration *= 1000;
        offMaxDuration *= 1000;

        await scenario.init();

        for (const topic of topics) {
            const _switch = new Switch({
                onMinDuration,
                onMaxDuration,
                offMinDuration,
                offMaxDuration
            });

            // eslint-disable-next-line no-new
            new FakePresence({
                scenario,
                switch : _switch,
                onMessage,
                offMessage,
                topic
            });
        }
    } catch (e) {
        log.warn(e.message);
    }
};
