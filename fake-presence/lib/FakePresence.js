/* eslint-disable no-undef */
const { log } = scenario;

/* eslint-disable no-undef */
class FakePresence {
    constructor(options) {
        this.scenario   = options.scenario;
        this.topic      = options.topic;
        this.onMessage  = options.onMessage;
        this.offMessage = options.offMessage;
        this.switch     = options.switch;

        this.init();
    }

    init() {
        this.addHandlers();
        this.switch.start();
    }

    addHandlers() {
        this.handlerOn = this.handlerOn.bind(this);
        this.handlerOff = this.handlerOff.bind(this);

        this.switch.on('on', this.handlerOn);
        this.switch.on('off', this.handlerOff);
    }

    handlerOn() {
        scenario.set(this.topic, this.onMessage);
        log.info(`on topic: ${this.topic} - ${this.onMessage}`);
    }

    handlerOff() {
        scenario.set(this.topic, this.offMessage);
        log.info(`off topic: ${this.topic} - ${this.offMessage}`);
    }
}

module.exports = FakePresence;
