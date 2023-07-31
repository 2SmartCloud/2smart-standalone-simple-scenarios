const pwmPIDController = require('./lib/pwm-pidController');

const {
    INPUT_TOPIC,
    SWITCH_TOPIC,
    PROPORTIONAL_GAIN,
    INTEGRAL_GAIN,
    DERIVATIVE_GAIN,
    SAMPLE_TIME
// eslint-disable-next-line no-undef
} = scenario.args;

pwmPIDController(
    INPUT_TOPIC,
    SWITCH_TOPIC,
    PROPORTIONAL_GAIN,
    INTEGRAL_GAIN,
    DERIVATIVE_GAIN,
    SAMPLE_TIME
);
