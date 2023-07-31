/* eslint-disable func-style */
const DEFAULT_RECALCULATION_TIME = 5;
const DEFAULT_HEAT_CAPACITY = 1.163;

const secToMs = (sec) => sec * 1000; // eslint-disable-line no-magic-numbers
const msToSec = (ms) => ms / 1000; // eslint-disable-line no-magic-numbers
const toNumberOrNull = (str) => {
    if (str === '') return null;
    if (isNaN(+str)) return null;

    return +str;
};

const validateHeatPowerParams = ({ temperatureDelta, pumpFlow, heatCapacity }) => {
    if (!temperatureDelta && temperatureDelta !== 0 ||
        !pumpFlow && pumpFlow !== 0 ||
        !heatCapacity && heatCapacity !== 0) return false;

    return true;
};

const validateCoefficientOfPerformanceParams = ({ electricityPower, heatPower }) => {
    if (!heatPower && heatPower !== 0
        || !electricityPower) return false;

    return true;
};

const getTopicValueFromState = (topic) => {
    return scenario.getState()[topic];
};

module.exports = async (
    pumpFlowTopic = null,
    temperatureDeltaTopic = null,
    electricityPowerTopic = null,
) => {
    try {
        await scenario.init();

        if (!temperatureDeltaTopic) throw new Error('temperatureDeltaTopic is required');
        if (!pumpFlowTopic) throw new Error('pumpFlowTopic is required');

        const thHeatCapacity = 'heat-capacity';
        const thRecalculationTime = 'recalculation-time';
        const thCoefficientOfPerformance = 'coefficient-of-performance';
        const thHeatPower = 'heat-power';

        scenario.initThreshold(thHeatCapacity, { datatype: 'float', settable: true });
        scenario.initThreshold(thRecalculationTime, { datatype: 'integer', settable: true, unit: 'seconds' });
        scenario.initThreshold(thCoefficientOfPerformance, { datatype: 'float',  settable: false });
        scenario.initThreshold(thHeatPower, { datatype: 'float', settable: false });

        const thHeatCapacityTopic = scenario.getThresholdTopic(thHeatCapacity);
        const thRecalculationTimeTopic = scenario.getThresholdTopic(thRecalculationTime);
        const thHeatPowerTopic = scenario.getThresholdTopic(thHeatPower);
        const thCoefficientOfPerformanceTopic = scenario.getThresholdTopic(thCoefficientOfPerformance);

        let pumpFlow = toNumberOrNull(getTopicValueFromState(pumpFlowTopic));
        let temperatureDelta = toNumberOrNull(getTopicValueFromState(temperatureDeltaTopic));
        let electricityPower = toNumberOrNull(getTopicValueFromState(electricityPowerTopic));
        let recalculationTime = secToMs(scenario.getTarget(thRecalculationTime) || DEFAULT_RECALCULATION_TIME);
        let heatCapacity = toNumberOrNull(scenario.getTarget(thHeatCapacity)) || DEFAULT_HEAT_CAPACITY;

        scenario.set(thRecalculationTimeTopic, msToSec(recalculationTime));
        scenario.set(thHeatCapacityTopic, heatCapacity);

        const getCalculations = () => {
            let heatPower = null;
            let coefficientOfPerformance = null;

            if (validateHeatPowerParams({ temperatureDelta, pumpFlow, heatCapacity })) {
                heatPower = temperatureDelta * pumpFlow * heatCapacity;
            }

            if (validateCoefficientOfPerformanceParams({ electricityPower, heatPower })) {
                coefficientOfPerformance = heatPower / electricityPower;
            }

            return { coefficientOfPerformance, heatPower };
        };

        const setResults = ({ coefficientOfPerformance, heatPower }) => {
            const heatPowerToSet = heatPower || heatPower === 0 ? heatPower : '';
            const coefficientOfPerformanceToSet = coefficientOfPerformance  || coefficientOfPerformance === 0
                ? coefficientOfPerformance
                : '';

            // TODO: use method form future api to set empty value to threshold;
            scenario.set(thCoefficientOfPerformanceTopic, coefficientOfPerformanceToSet);
            scenario.set(thHeatPowerTopic, heatPowerToSet);
        };

        const startCalculations = () => setInterval(() => setResults(getCalculations()), recalculationTime);

        let recalculationInterval = startCalculations();

        scenario.message((topic, msg) => {
            try {
                const value = msg.toString();

                if (topic === thRecalculationTimeTopic) {
                    if (!value || value < 1) return;
                    clearInterval(recalculationInterval);
                    recalculationTime = secToMs(value);
                    recalculationInterval = startCalculations();
                }

                if (topic === thHeatCapacityTopic && value !== '') heatCapacity = toNumberOrNull(value);
                if (topic === pumpFlowTopic) pumpFlow = toNumberOrNull(value);
                if (topic === temperatureDeltaTopic) temperatureDelta = toNumberOrNull(value);
                if (topic === electricityPowerTopic) electricityPower = toNumberOrNull(value);
            } catch (e) {
                scenario.log.warn(e);
            }
        });

        scenario.log.info('Start scenario');
    } catch (e) {
        scenario.log.warn(e);
    }
};
