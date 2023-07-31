// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (topics) => {
    try {
        if (!topics) throw new Error('topics is required');
        if (!Array.isArray(topics)) throw new Error('topics must be an array');

        await scenario.init();

        scenario.message((topic, message) => {
            const isIncludesTopic = topics.includes(topic);

            if (!isIncludesTopic) return;

            const valueToPublish = message.toString();

            // eslint-disable-next-line no-shadow
            topics.forEach(topic => {
                const currentTopicValue = scenario.get(topic);

                if (valueToPublish !== currentTopicValue) {
                    scenario.set(topic, valueToPublish);

                    log.info('Value to publish != current topic value, set:', topic, valueToPublish);
                }
            });
        });
    } catch (e) {
        log.warn(e.message);
    }
};
