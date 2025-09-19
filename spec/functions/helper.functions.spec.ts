import { isCacheSizeEqual } from '../../main/functions/helper.functions';
import { IMessageBrokerConfig } from '../../main/contracts/contracts';

describe('Helper functions', () => {
    it('should return true if config is equal', () => {
        const config1: IMessageBrokerConfig = {
            replayCacheSize: 1,
        };
        const config2: IMessageBrokerConfig = {
            replayCacheSize: 1,
        };
        expect(isCacheSizeEqual(config1, config2)).toBe(true);
    });

    it('should return false if config is not equal', () => {
        const config1: IMessageBrokerConfig = {
            replayCacheSize: 1,
        };
        const config2: IMessageBrokerConfig = {
            replayCacheSize: 2,
        };
        expect(isCacheSizeEqual(config1, config2)).toBe(false);
    });

    it('should return false if one config is undefined', () => {
        const config1: IMessageBrokerConfig = {
            replayCacheSize: 1,
        };
        expect(isCacheSizeEqual(config1, undefined)).toBe(false);
        expect(isCacheSizeEqual(undefined, config1)).toBe(false);
    });

    it('should return true if configs are undefined', () => {
        expect(isCacheSizeEqual(undefined, undefined)).toBe(true);
    });
});
