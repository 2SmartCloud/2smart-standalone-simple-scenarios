/* eslint-disable func-style */

const DEFAULT_HYSTERESIS = 2;

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (
    tempTopic,
    switchTopic,
    hysteresis = DEFAULT_HYSTERESIS,
    mode = 'heating',
    messageOn = 'true',
    messageOff = 'false'
) => {
    try {
        if (!tempTopic) throw new Error('tempTopic is required!');
        if (!switchTopic) throw new Error('switchTopic is required!');
        if (isNaN(hysteresis)) throw new Error('hysteresis must be a number');
        if (!mode) throw new Error('mode is required!');
        if (mode !== 'heating' && mode !== 'cooling') throw new Error('mode must be heating or cooling');

        const scenario = global.scenario;

        await scenario.init();

        const thresholdName = 'setpoint';

        scenario.initThreshold(thresholdName, { datatype: 'float' });

        const thTopic = scenario.getThresholdTopic(thresholdName);
        const switchList = Array.isArray(switchTopic) ? switchTopic : [ switchTopic ];

        const proceed = async (topic, targetValue, temp) => {
            let target = targetValue;
            const topicValue = scenario.get(topic);

            if (!target) return;

            target = +target;

            const moreCmd = mode === 'heating' ? messageOff : messageOn;

            const lessCmd = mode === 'heating' ? messageOn : messageOff;

            if (temp > target + hysteresis) {
                if (topicValue !== moreCmd) {
                    scenario.set(topic, moreCmd);

                    log.info(
                        `Temperature > target + hysteresis(${temp} > ${target} + ${hysteresis}), set:`,
                        topic,
                        moreCmd
                    );
                }
            } else if (temp < target - hysteresis) {
                if (topicValue !== lessCmd) {
                    scenario.set(topic, lessCmd);

                    log.info(
                        `Temperature < target - hysteresis(${temp} < ${target} - ${hysteresis}), set:`,
                        topic,
                        lessCmd
                    );
                }
            }
        };

        const updateSwitchesValues = async () => {
            const temp = +scenario.get(tempTopic);
            const target = scenario.getTarget(thresholdName);

            await Promise.all(switchList.map(async t => {
                try {
                    await proceed(t, target, temp);
                } catch (err) {
                    log.warn(err.message);
                }
            }));
        };

        scenario.message(async (topic) => {
            if ([ tempTopic, thTopic, ...switchList ].includes(topic)) {
                await updateSwitchesValues();
            }
        });

        await updateSwitchesValues();
    } catch (e) {
        log.warn(e.message);
    }
};
