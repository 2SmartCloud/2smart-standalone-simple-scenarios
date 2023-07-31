const weatherStation = require('./weatherStation');

const {
    PRESSURE_TOPIC,
    WIND_DIRECTION_TOPIC
} = scenario.args;

weatherStation(PRESSURE_TOPIC, WIND_DIRECTION_TOPIC);
