const thermalPower = require('./lib/thermalPower');

const {
    PUMP_FLOW_TOPIC,
    TEMPERATURE_DELTA_TOPIC,
    ELECTRICITY_POWER_TOPIC
} = scenario.args;

thermalPower(
    PUMP_FLOW_TOPIC,
    TEMPERATURE_DELTA_TOPIC,
    ELECTRICITY_POWER_TOPIC
);
