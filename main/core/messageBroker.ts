import { get, Injectable } from '@morgan-stanley/needle';
import { defer, Observable, Subject, Subscription } from 'rxjs';
import { filter, shareReplay } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import {
    IAdapterError,
    IChannel,
    IChannelModel,
    IMessage,
    IMessageBroker,
    IMessageBrokerAdapter,
    IMessageBrokerConfig,
    RequiredPick,
} from '../contracts/contracts.js';
import { isCacheSizeEqual } from '../functions/helper.functions.js';

type ChannelModelLookup<T extends Record<string, any>> = { [P in Extract<keyof T, string>]?: IChannelModel<T[P], P> };

type AdapterId = string;

/**
 * Creates and returns a single messageBroker instance. This is the recommend approach to resolve an instance of the messageBroker
 * when not using dependency injection.
 * @returns IMessageBroker
 */
export function messageBroker<T extends Record<string, any>>(): IMessageBroker<T> {
    const instance = get(MessageBroker);
    return instance;
}

/**
 * Represents a messageBroker. Using the 'new' operator is discouraged, instead use the messageBroker() function or dependency injection.
 */
@Injectable({ metadata: [] })
export class MessageBroker<T extends Record<string, any> = Record<string, any>> implements IMessageBroker<T> {
    private channelLookup: ChannelModelLookup<T> = {};
    private messagePublisher = new Subject<IMessage<any>>();
    private adapters: Record<AdapterId, IMessageBrokerAdapter<T>> = {};
    private errorStream = new Subject<IAdapterError<T>>();
    private adapterSubscriptions: Record<string, Subscription> = {};

    /**
     * Creates a new channel with the provided channelName. An optional config object can be passed that specifies how many messages to cache.
     * No caching is set by default
     *
     *
     * @param channelName - name of the channel to create
     * @param config - optional config object that determines number of messages to cache
     * @returns IChannel
     */
    public create<K extends Extract<keyof T, string>>(
        channelName: K,
        config?: IMessageBrokerConfig,
    ): IChannel<T[K], K> {
        const existingChannelModel = this.channelLookup[channelName];

        if (existingChannelModel == null) {
            return this.createChannelImpl<K>(channelName, config).channel;
        }

        return config != null
            ? this.createCachedChannel(channelName, existingChannelModel, config)
            : existingChannelModel.channel;
    }

    /**
     * Gets the channel with the given channelName. Any messages
     * published on the same channel name will be received via the subscription
     * @param channelName Name of the messageBroker channel
     * @returns Observable of IMessage
     */
    public get<K extends Extract<keyof T, string>>(channelName: K): Observable<IMessage<T[K], K>> {
        return this.getDeferredObservable<K>(channelName);
    }

    /**
     * Dispose of all existing subscriptions and configurations for a
     * particular channel name
     * @param channelName Name of the messageBroker channel
     */
    public dispose<K extends Extract<keyof T, string>>(channelName: K): void {
        const channel = this.channelLookup[channelName];
        if (this.isChannelConfiguredWithCaching(channel)) {
            channel.subscription.unsubscribe();
        }
        delete this.channelLookup[channelName];
    }

    /**
     * Register an adapter with the message broker
     * @param adapter The adapter to register
     * @returns The ID of the registered adapter
     */
    public async registerAdapter(adapter: IMessageBrokerAdapter<T>): Promise<AdapterId> {
        const adapterId = uuid();
        this.adapters[adapterId] = adapter;

        await adapter.connect().catch((error) => {
            this.errorStream.next({
                adapterId,
                error,
                timestamp: Date.now(),
            });
        });

        this.adapterSubscriptions[adapterId] = adapter.getMessageStream().subscribe((message) => {
            this.messagePublisher.next(message);
        });

        return adapterId;
    }

    /**
     * Unregister an adapter from the message broker
     * @param adapterId The ID of the adapter to unregister
     */
    public async unregisterAdapter(adapterId: AdapterId): Promise<void> {
        await this.adapters[adapterId]?.disconnect().catch((error) => {
            this.errorStream.next({
                adapterId,
                error,
                timestamp: Date.now(),
            });
        });

        this.adapterSubscriptions[adapterId]?.unsubscribe();

        delete this.adapters[adapterId];
        delete this.adapterSubscriptions[adapterId];
    }

    /**
     * Get all registered adapters
     */
    public getAdapters(): Record<AdapterId, IMessageBrokerAdapter<T>> {
        return this.adapters;
    }

    /**
     * Get error stream for adapter failures
     */
    public getErrorStream(): Observable<IAdapterError<T>> {
        return this.errorStream.asObservable();
    }

    /**
     * Return a deferred observable as the channel config may have been updated before the subscription
     * @param channelName name of channel to subscribe to
     */
    private getDeferredObservable<K extends Extract<keyof T, string>>(channelName: K): Observable<IMessage<T[K], K>> {
        return defer(() => {
            const channel = this.channelLookup[channelName];

            if (channel) {
                return channel.observable;
            }

            //  If we subscribe to a channel before it is created create the channel with no config
            //  This just creates a filtering observable on the single subject
            return this.createChannelImpl(channelName).observable;
        });
    }

    private createCachedChannel<K extends Extract<keyof T, string>>(
        channelName: K,
        channelModel: IChannelModel<T[K]>,
        config: IMessageBrokerConfig,
    ): IChannel<T[K], K> {
        if (this.isChannelConfiguredWithCaching(channelModel) && !isCacheSizeEqual(channelModel.config, config)) {
            throw new Error(
                `A channel already exists with the name '${String(
                    channelName,
                )}'. A channel with the same name cannot be created with a different cache size`,
            );
        }
        return this.createChannelImpl<K>(channelName, config).channel;
    }

    private createChannelImpl<K extends Extract<keyof T, string>>(
        channelName: K,
        config?: IMessageBrokerConfig,
    ): IChannelModel<T[K], K> {
        let subscription: Subscription | undefined;
        let observable = this.messagePublisher.pipe(filter(this.filterMessagesByChannelName(channelName)));

        const replayCacheSize = config?.replayCacheSize;
        if (replayCacheSize) {
            observable = observable.pipe(shareReplay(replayCacheSize));
            subscription = observable.subscribe();
        }

        const publishFunction = (data?: T[K], type?: string): void => {
            const message = this.createMessage(channelName, data as T[K], type);
            this.messagePublisher.next(message);
            Object.entries(this.adapters).forEach(([id, adapter]) => {
                adapter.sendMessage(message).catch((error) => {
                    this.errorStream.next({
                        adapterId: id,
                        channelName,
                        message,
                        error,
                        timestamp: Date.now(),
                    });
                });
            });
        };

        // Stream should return a deferred observable
        const channel: IChannel<T[K], K> = {
            stream: this.getDeferredObservable<K>(channelName),
            publish: publishFunction,
        };

        let channelModel: IChannelModel<T[K], K> = {
            observable,
            channel,
        };

        channelModel = config != null ? { ...channelModel, config, subscription } : channelModel;

        this.channelLookup[channelName] = channelModel;

        return channelModel;
    }

    public createMessage<K extends Extract<keyof T, string>, D = any, TType extends string = string>(
        channelName: K,
        data: D,
        type?: TType,
    ): IMessage<D, K, TType> {
        return {
            channelName,
            data,
            type,
            timestamp: Date.now(),
            id: uuid(),
        };
    }

    private isChannelConfiguredWithCaching<K extends Extract<keyof T, string>>(
        channel: IChannelModel<T[K]> | undefined,
    ): channel is RequiredPick<IChannelModel<T[K]>, 'config' | 'subscription'> {
        return channel != null && channel.subscription != null;
    }

    private filterMessagesByChannelName<K extends Extract<keyof T, string>>(channelName: K) {
        return (message: IMessage): message is IMessage<T[K], K> => {
            return message.channelName === channelName;
        };
    }
}
