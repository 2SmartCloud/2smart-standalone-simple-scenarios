/* eslint-disable newline-after-var,no-undef */
const PID = require('./PIDController');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (tempTopic, switchTopic, kp, ki, kd, sampleTime, outMin, outMax) => {
    try {
        if (!tempTopic) throw new Error('tempTopic is required!');
        if (!switchTopic) throw new Error('switchTopic is required!');
        if (!kp) throw new Error('kp is required!');
        if (isNaN(kp)) throw new Error('kp must be a number');
        if (isNaN(ki)) throw new Error('ki must be a number');
        if (isNaN(kd)) throw new Error('kd must be a number');
        if (!sampleTime) throw new Error('sampleTime is required!');
        if (isNaN(sampleTime)) throw new Error('sampleTime must be a number');
        // eslint-disable-next-line no-magic-numbers
        if (sampleTime < 1000) throw new Error('sampleTime minimal value is 1000');

        if (!outMax) throw new Error('outMax is required!');

        await scenario.init();
        scenario.initThreshold('setpoint', { datatype: 'float' });
        const thTopic = scenario.getThresholdTopic('setpoint');
        const switchList = Array.isArray(switchTopic) ? switchTopic : [ switchTopic ];
        const tempInit = 0;
        const targetValue = +scenario.getTarget('setpoint') || 0;
        const ctr = new PID(tempInit, targetValue, kp, ki, kd);

        ctr.setOutputLimits(outMin, outMax);
        ctr.setSampleTime(sampleTime);

        // eslint-disable-next-line func-style
        const proceed = () => {
            ctr.compute();
            const output = Math.round(ctr.getOutput());

            switchList.forEach(topic => {
                scenario.set(`${topic}`, `${output}`);

                log.info('Proceed, set:', topic, output);
            });
        };

        scenario.message(topic => {
            if (topic === tempTopic) {
                const temp = +scenario.get(tempTopic);
                ctr.setInput(temp);

                log.info('Set input:', { temp });
            }

            if (topic === thTopic) {
                const target = +scenario.getTarget('setpoint');
                ctr.setPoint(target);

                log.info('Set point:', { target });
            }
        });

        setInterval(() => proceed(), sampleTime);
    } catch (e) {
        log.warn(e.message);
    }
};
