const timeRelay = require('./timeRelay');

const {
    SCHEDULE,
    SWITCH_TOPIC,
    MESSAGE
} = scenario.args;

timeRelay(SCHEDULE, SWITCH_TOPIC, MESSAGE);
