const cyclicTimeRelay = require('./lib/cycle');

const {
    OUTPUT_TOPIC,
    PULSE_DURATION,
    PAUSE_DURATION,
    MESSAGE_ON_VALUE,
    MESSAGE_OFF_VALUE
} = scenario.args;

cyclicTimeRelay(
    OUTPUT_TOPIC,
    PULSE_DURATION,
    PAUSE_DURATION,
    MESSAGE_ON_VALUE,
    MESSAGE_OFF_VALUE
);
