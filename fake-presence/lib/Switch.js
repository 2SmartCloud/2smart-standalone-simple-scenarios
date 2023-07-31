/* eslint-disable no-param-reassign */
const { EventEmitter } = require('events');

class Switch extends EventEmitter {
    constructor(options) {
        super();
        this.onMinDuration = options.onMinDuration;
        this.onMaxDuration = options.onMaxDuration;
        this.offMinDuration = options.offMinDuration;
        this.offMaxDuration = options.offMaxDuration;

        this.time = 0;

        this.handlerOn = this.handlerOn.bind(this);
        this.handlerOff = this.handlerOff.bind(this);
    }

    start() {
        this.time = this._getRandomInt(this.offMinDuration, this.offMaxDuration);
        setTimeout(this.handlerOn, this.time);
    }

    handlerOn() {
        this.time = this._getRandomInt(this.onMinDuration, this.onMaxDuration);
        this.emit('on', this);
        setTimeout(this.handlerOff, this.time);
    }

    handlerOff() {
        this.time = this._getRandomInt(this.offMinDuration, this.offMaxDuration);
        this.emit('off', this);
        setTimeout(this.handlerOn, this.time);
    }

    _getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);

        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}

module.exports = Switch;
