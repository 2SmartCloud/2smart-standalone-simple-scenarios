/* eslint-disable no-param-reassign */

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (
    topics,
    operator,
    valueForComparison,
    notificationChannels,
    notificationMessage
) => {
    try {
        valueForComparison = convertToCorrectDataType(valueForComparison);

        await scenario.init();

        // eslint-disable-next-line more/no-then
        scenario.init()
            .then(() => {
                scenario.message((topic, message) => {
                    if (topics.includes(topic)) {
                        const currentTopicValue = convertToCorrectDataType(message.toString());

                        if (operation(currentTopicValue, operator, valueForComparison)) {
                            log.info('Current topic value satisfies the condition:', {
                                currentTopicValue,
                                operator,
                                valueForComparison
                            });

                            notify(notificationChannels, notificationMessage);
                        }
                    }
                });
            });
    } catch (e) {
        log.warn(e.message);
    }
};


function operation(operand_1, operator, operand_2) {
    switch (operator) {
        // eslint-disable-next-line eqeqeq
        case '==': return operand_1 == operand_2;
        // eslint-disable-next-line eqeqeq
        case '!=': return operand_1 != operand_2;
        case '>': return operand_1 > operand_2;
        case '<': return operand_1 < operand_2;
        case '>=': return operand_1 >= operand_2;
        case '<=': return operand_1 <= operand_2;
        default: throw new Error(`Operator "${operator}" is not valid`);
    }
}

function notify(notificationChannels, notificationMessage) {
    if (!Array.isArray(notificationChannels)) return;

    notificationChannels.forEach(channel => {
        scenario.notify(channel, notificationMessage);

        log.info('Notify:', { channel, notificationMessage });
    });
}

function convertToCorrectDataType(str) {
    str = str.toLowerCase();

    if (isFinite(str)) return Number(str);
    // eslint-disable-next-line eqeqeq
    if (isBoolean(str)) return str == 'true';

    return str;
}

function isBoolean(str) {
    return [ 'true', 'false' ].includes(str);
}
