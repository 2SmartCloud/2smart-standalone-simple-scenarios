/* eslint-disable no-sync,no-shadow,func-style */
const path          = require('path');
const fs            = require('fs');
const Homie         = require('homie-sdk/lib/homie/Homie');
const HomieMigrator = require('homie-sdk/lib/homie/HomieMigrator');
const HomieServer   = require('homie-sdk/lib/homie/HomieServer');
const X             = require('homie-sdk/lib/utils/X');
const MQTT          = require('homie-sdk/lib/Broker/mqtt');
const ncp           = require('ncp').ncp;
const { createMD5Hash } = require('homie-sdk/lib/utils');

const mqtt = {
    uri      : process.env.MQTT_URI  || 'mqtt://localhost:1883',
    username : process.env.MQTT_USER || '2smart',
    password : process.env.MQTT_PASS || ''
};

const extensionsInstallPath = process.env.INSTALL_PATH  ||  '../standalone/composer/system/extensions/simple-scenario/node_modules';
const iconsDirPath          = process.env.ICONS_PATH    ||  '../standalone/composer/system/extensions/icons';

const source = (process.env.SOURCE || '').split(',');
const action = process.env.ACTION || 'install';

class ExtensionsManager {
    constructor(options) {
        this.mqttCreds = options.mqtt;
        this.homie = new Homie({ transport: new MQTT({ ...this.mqttCreds }) });
        this.homieServer = new HomieServer({ homie: this.homie });
        this.homieMigrator = new HomieMigrator({ homie: this.homie });

        this.entityType = 'EXTENSION';
        this.extensionsInstallPath = options.extensionsInstallPath;
        this.iconsDirPath = options.iconsDirPath;
        this.extensionName = '';
        this.extensionEntityObj = undefined;
        this.defaultSchemePath = '/etc/scheme.json';
        this.defaultIconPath = '/etc/icon.svg';
    }

    async init() {
        await this.homieServer.initWorld();
    }

    async installExtension(source) {
        if (!source || !fs.existsSync(source)) {
            throw new X({
                code   : 'NOT_FOUND',
                fields : {}
            });
        }

        const { name: extensionName } = await this._parseJSONFile(path.join(source, 'package.json'));

        await this._copyExtension(source, path.join(this.extensionsInstallPath, extensionName));
        const extensionEntityObj = await this.getExtensionEntityObj(extensionName);

        extensionEntityObj.iconFilename = await this.createExtensionIconSymlink(extensionName);

        const newExtensionEntity = await this.homieMigrator.attachEntity(this.entityType, extensionEntityObj);

        return newExtensionEntity;
    }

    async uninstallExtension(source) {
        const { name: extensionName } = await this._parseJSONFile(path.join(source, 'package.json'));
        const extensionEntityObj = await this.getExtensionEntityObj(extensionName);

        const entity = await this.homie.getEntityById(this.entityType, extensionEntityObj.id);

        await fs.promises.rmdir(this.getExtensionInstallPath(extensionName), { recursive: true });

        if (entity.iconFilename) {
            try {
                const iconPath = path.join(this.iconsDirPath, entity.iconFilename);
                await fs.promises.unlink(iconPath);
            } catch (err) {
                console.warn('ExtensionsService.handleSetEvent.uninstall.unlink', err);
            }
        }

        await this.homieMigrator.deleteEntity(entity);

        return true;
    }

    async _copyExtension(source, destination) {
        async function copyFolder(source, destination) {
            return new Promise((resolve, reject) => {
                ncp(source, destination, (error) => {
                    if (error) reject(error);
                    else resolve(true);
                });
            });
        }

        fs.mkdirSync(destination, { recursive: true });
        ncp.limit = 16;
        await copyFolder(source, destination);
    }

    async getExtensionScheme(extensionName) {
        const packageObj = await this.getExtensionConfigObj(extensionName);

        const schemePath = packageObj.schemePath || this.defaultSchemePath;
        const absoluteSchemePath = path.join(this.getExtensionInstallPath(extensionName), schemePath);

        if (fs.existsSync(absoluteSchemePath)) {
            const scheme = await this._parseJSONFile(absoluteSchemePath);

            return scheme;
        }

        throw new X({
            code   : 'REQUIRED',
            fields : {
                schemePath : 'REQUIRED'
            },
            message : 'Extension scheme is required!'
        });
    }

    async getExtensionConfigObj(extensionName) {
        const configFilePath = path.join(this.getExtensionInstallPath(extensionName), 'package.json');

        const config = await this._parseJSONFile(configFilePath);

        return config;
    }

    async getExtensionEntityObj(extensionName) {
        const extensionConfig = await this.getExtensionConfigObj(extensionName);
        const extentionScheme = await this.getExtensionScheme(extensionName);

        const extensionId = createMD5Hash(extensionConfig.name);
        const extensionEntityObj = {
            id          : extensionId,
            state       : 'installed',
            name        : extensionConfig.name,
            description : extensionConfig.description,
            version     : extensionConfig.version,
            scheme      : extentionScheme,
            link        : 'http://localhost',
            type        : 'simple-scenario',
            language    : 'JS'
        };

        return extensionEntityObj;
    }

    getExtensionInstallPath(extensionName) {
        return path.join(this.extensionsInstallPath, extensionName);
    }

    async getExtensionIconPath(extensionName) {
        const packageObj = await this.getExtensionConfigObj(extensionName);

        const iconPath = packageObj.iconPath || this.defaultIconPath;

        const absoluteIconPath = path.join(
            this.getExtensionInstallPath(extensionName),
            iconPath
        );

        return absoluteIconPath;
    }

    async createExtensionIconSymlink(extensionName) {
        const iconSource = await this.getExtensionIconPath(extensionName);

        if (!fs.existsSync(iconSource)) {
            return;
        }

        const iconExt = path.extname(iconSource);
        const randomFilename = createMD5Hash(extensionName);
        const iconFilename = `${randomFilename}${iconExt}`;
        const symlinkPath = path.join(this.iconsDirPath, iconFilename);

        try {
            fs.mkdirSync(this.iconsDirPath, { recursive: true });

            fs.copyFileSync(iconSource, symlinkPath);

            // if (!fs.existsSync(symlinkPath)) await fs.promises.symlink(absoluteIconPath, symlinkPath);

            return iconFilename;
        } catch (err) {
            console.warn('ExtensionsService.createExtensionIconSymlink', err);
        }
    }

    async _parseJSONFile(path) {
        const configFile = await fs.promises.readFile(path, 'utf-8');

        return JSON.parse(configFile);
    }
}


const main = async () => {
    const extensionsManager = new ExtensionsManager({
        mqtt,
        extensionsInstallPath,
        iconsDirPath
    });

    await extensionsManager.init();

    switch (action) {
        case 'install':
            await Promise.all(source.map(async extension => {
                await extensionsManager.installExtension(extension);

                console.log(`${extension} successfully installed !!!`);
            }));

            break;
        case 'uninstall':
            await Promise.all(source.map(async extension => {
                await extensionsManager.uninstallExtension(extension);

                console.log(`${extension} successfully uninstalled !!!`);
            }));

            break;
        default:
            break;
    }

    process.exit(0);
};

main().catch((error) => {
    console.error(error);
    process.exit(0);
});
