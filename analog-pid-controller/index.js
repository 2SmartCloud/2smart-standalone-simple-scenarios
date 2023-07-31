const pidController = require('./lib');

const {
    INPUT_TOPIC,
    OUTPUT_TOPIC,
    PROPORTIONAL_GAIN,
    INTEGRAL_GAIN,
    DERIVATIVE_GAIN,
    SAMPLE_TIME,
    MIN_RANGE,
    MAX_RANGE
// eslint-disable-next-line no-undef
} = scenario.args;

pidController(
    INPUT_TOPIC,
    OUTPUT_TOPIC,
    PROPORTIONAL_GAIN,
    INTEGRAL_GAIN,
    DERIVATIVE_GAIN,
    SAMPLE_TIME,
    MIN_RANGE,
    MAX_RANGE
);
