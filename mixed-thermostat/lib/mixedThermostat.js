/* eslint-disable no-magic-numbers,func-style */

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (tempTopic, heatingSwitchTopic, coolingSwitchTopic, mixedHysteresis = 1, hysteresis = 2) => {
    try {
        if (!tempTopic) throw new Error('tempTopic is required!');
        if (!heatingSwitchTopic) throw new Error('heatingSwitchTopic is required!');
        if (!coolingSwitchTopic) throw new Error('coolingSwitchTopic is required!');
        if (isNaN(mixedHysteresis)) throw new Error('hysteresis must be a number');
        if (mixedHysteresis < 0 || !mixedHysteresis) throw new Error('mixedHysteresis must be greater 0');
        if (isNaN(hysteresis)) throw new Error('hysteresis must be a number');

        const scenario = global.scenario;

        await scenario.init();
        scenario.initThreshold('setpoint', { datatype: 'float' });

        const thTopic = scenario.getThresholdTopic('setpoint');
        const heatingSwitchList = Array.isArray(heatingSwitchTopic) ? heatingSwitchTopic : [ heatingSwitchTopic ];
        const coolingSwitchList = Array.isArray(coolingSwitchTopic) ? coolingSwitchTopic : [ coolingSwitchTopic ];

        const proceedHeating = (topic, targetValue, temp) => {
            log.info('Proceed heating: ', { topic, targetValue, temp });

            const topicValue = scenario.get(topic);
            const target = +targetValue;

            if (!target) return;

            if (temp > target + hysteresis) {
                if (topicValue !== 'false') {
                    scenario.set(topic, 'false');

                    log.info('Proceed heating, set:', topic, 'false');
                }
            } else if (temp < target - hysteresis - mixedHysteresis) {
                if (topicValue !== 'true') {
                    scenario.set(topic, 'true');

                    log.info('Proceed heating, set:', topic, 'true');
                }
            }
        };

        const proceedCooling = (topic, targetValue, temp) => {
            log.info('Proceed cooling: ', { topic, targetValue, temp });

            const topicValue = scenario.get(topic);
            const target = +targetValue;

            if (!target) return;

            if (temp > target + hysteresis + mixedHysteresis) {
                if (topicValue !== 'true') {
                    scenario.set(topic, 'true');

                    log.info('Proceed cooling, set:', topic, 'true');
                }
            } else if (temp < target - hysteresis) {
                if (topicValue !== 'false') {
                    scenario.set(topic, 'false');

                    log.info('Proceed cooling, set:', topic, 'false');
                }
            }
        };

        const setTopicsValue = () => {
            const temp = +scenario.get(tempTopic);
            const target = scenario.getTarget('setpoint');

            heatingSwitchList.forEach(t => proceedHeating(t, target, temp));
            coolingSwitchList.forEach(t => proceedCooling(t, target, temp));
        };

        scenario.message((topic) => {
            if ([ tempTopic, thTopic, ...heatingSwitchList, ...coolingSwitchList ].includes(topic)) {
                setTopicsValue();
            }
        });

        setTopicsValue();
    } catch (e) {
        log.warn(e.message);
    }
};
