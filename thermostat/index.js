const thermostat = require('./thermostat');

const {
    HYSTERESIS,
    MODE,
    SWITCH_TOPIC,
    TEMP_TOPIC,
    MESSAGE_ON,
    MESSAGE_OFF
} = scenario.args;

thermostat(TEMP_TOPIC, SWITCH_TOPIC, HYSTERESIS, MODE, MESSAGE_ON, MESSAGE_OFF);
