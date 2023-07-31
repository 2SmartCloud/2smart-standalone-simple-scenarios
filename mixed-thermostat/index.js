const mixedThermostat = require('./lib/mixedThermostat');

const {
    TEMP_TOPIC,
    HEATING_SWITCH_TOPIC,
    COOLING_SWITCH_TOPIC,
    MIXED_HYSTERESIS,
    HYSTERESIS
// eslint-disable-next-line no-undef
} = scenario.args;

mixedThermostat(
    TEMP_TOPIC,
    HEATING_SWITCH_TOPIC,
    COOLING_SWITCH_TOPIC,
    MIXED_HYSTERESIS,
    HYSTERESIS
);
