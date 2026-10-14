import { IMessageBrokerConfig, IMessageOptions } from '../contracts/contracts.js';

export function isCacheSizeEqual(
    firstConfig: IMessageBrokerConfig | undefined,
    secondConfig: IMessageBrokerConfig | undefined,
): boolean {
    const configOne = firstConfig || {};
    const configTwo = secondConfig || {};

    return configOne.replayCacheSize === configTwo.replayCacheSize;
}

/**
 * Normalises the `typeOrOptions` argument, which may be a message type string or an options object.
 */
export function toMessageOptions<TType extends string, TMetadata extends object>(
    typeOrOptions: TType | IMessageOptions<TType, TMetadata> | undefined,
): IMessageOptions<TType, TMetadata> {
    return typeof typeOrOptions === 'string' ? { type: typeOrOptions } : (typeOrOptions ?? {});
}
