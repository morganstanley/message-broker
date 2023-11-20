import { IMessageBrokerConfig } from '../contracts/contracts';

export function isCacheSizeEqual(
    firstConfig: IMessageBrokerConfig | undefined,
    secondConfig: IMessageBrokerConfig | undefined,
): boolean {
    const configOne = firstConfig || {};
    const configTwo = secondConfig || {};

    return configOne.replayCacheSize === configTwo.replayCacheSize;
}
