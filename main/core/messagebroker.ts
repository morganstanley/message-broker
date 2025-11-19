import { get, Injectable } from '@morgan-stanley/needle';
import { defer, merge, Observable, Subject, Subscription } from 'rxjs';
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
    IResponderRef,
    RequiredPick,
    RSVPHandler,
    RSVPOf,
    RSVPPayload,
    RSVPResponse,
} from '../contracts/contracts.js';
import { isCacheSizeEqual } from '../functions/helper.functions.js';
import { RSVPMediator } from './rsvp-mediator.js';

type ChannelModelLookup<T> = { [P in keyof T]?: IChannelModel<T[P]> };
type AdapterObservableLookup<T> = { [P in keyof T]?: { [adapterId: string]: Observable<IMessage<any>> } };
type AdapterStreamLookup = { [adapterId: string]: Observable<IMessage<any>> };

type AdapterId = string;

/**
 * Creates and returns a single messageBroker instance. This is the recommend approach to resolve an instance of the messageBroker
 * when not using dependency injection.
 * @returns IMessageBroker
 */
export function messageBroker<T = any>(): IMessageBroker<T> {
    const instance = get(MessageBroker);
    return instance;
}

/**
 * Represents a messageBroker. Using the 'new' operator is discouraged, instead use the messageBroker() function or dependency injection.
 */
@Injectable({ metadata: [RSVPMediator] })
export class MessageBroker<T = any> implements IMessageBroker<T> {
    private channelLookup: ChannelModelLookup<T> = {};
    private messagePublisher = new Subject<IMessage<any>>();
    private adapters: Record<AdapterId, IMessageBrokerAdapter<T>> = {};
    private errorStream = new Subject<IAdapterError<T>>();
    private adapterObservables: AdapterObservableLookup<T> = {};
    private adapterStreams: AdapterStreamLookup = {};

    constructor(private rsvpMediator: RSVPMediator<T>) {}

    /**
     * Creates a new channel with the provided channelName. An optional config object can be passed that specifies how many messages to cache.
     * No caching is set by default
     *
     * @param channelName - name of the channel to create
     * @param config - optional config object that determines number of messages to cache
     * @returns IChannel
     */
    public create<K extends keyof T>(channelName: K, config?: IMessageBrokerConfig): IChannel<T[K]> {
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
    public get<K extends keyof T>(channelName: K): Observable<IMessage<T[K]>> {
        return this.getDeferredObservable<K>(channelName);
    }

    /**
     * RSVP function is analogous to the publish function except it's synchronous and expects a response from particpants immediately.
     * @param channelName The channel name we wish to broadcast upon
     * @param payload The payload we are going to send for our rsvp request
     */
    public rsvp<K extends keyof RSVPOf<T>>(channelName: K, payload: RSVPPayload<T>): RSVPResponse<T>[];
    /***
     * This RSVP function is used by responders and is analogous to the 'Get' function. Responders when invoked must return the required response value type
     */
    public rsvp<K extends keyof RSVPOf<T>>(channelName: K, handler: RSVPHandler<T>): IResponderRef;
    public rsvp<K extends keyof RSVPOf<T>>(
        channelName: K,
        payloadOrHandler: RSVPPayload<T> | RSVPHandler<T>,
    ): IResponderRef | RSVPResponse<T>[] {
        return this.rsvpMediator.rsvp(channelName, payloadOrHandler);
    }

    /**
     * Dispose of all existing subscriptions and configurations for a
     * particular channel name
     * @param channelName Name of the messageBroker channel
     */
    public dispose<K extends keyof T>(channelName: K): void {
        const channel = this.channelLookup[channelName];
        if (this.isChannelConfiguredWithCaching(channel)) {
            channel.subscription.unsubscribe();
        }
        this.cleanupAdapterObservables(channelName);
        delete this.channelLookup[channelName];
    }

    /**
     * Register an adapter with the message broker
     * @param adapter The adapter to register
     * @returns The ID of the registered adapter
     */
    public registerAdapter(adapter: IMessageBrokerAdapter<T>): AdapterId {
        const id = uuid();
        this.adapters[id] = adapter;
        return id;
    }

    /**
     * Unregister an adapter from the message broker
     * @param adapterId The ID of the adapter to unregister
     */
    public unregisterAdapter(adapterId: AdapterId): void {
        delete this.adapters[adapterId];
        delete this.adapterStreams[adapterId];

        // Clean up channel-specific observables for this adapter
        Object.keys(this.adapterObservables).forEach((channelName) => {
            const channelObs = this.adapterObservables[channelName as keyof T];
            if (channelObs) {
                delete channelObs[adapterId];
            }
        });
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
    private getDeferredObservable<K extends keyof T>(channelName: K): Observable<IMessage<T[K]>> {
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

    private createCachedChannel<K extends keyof T>(
        channelName: K,
        channelModel: IChannelModel<T[K]>,
        config: IMessageBrokerConfig,
    ): IChannel<T[K]> {
        if (this.isChannelConfiguredWithCaching(channelModel) && !isCacheSizeEqual(channelModel.config, config)) {
            throw new Error(
                `A channel already exists with the name '${String(
                    channelName,
                )}'. A channel with the same name cannot be created with a different cache size`,
            );
        }
        return this.createChannelImpl<K>(channelName, config).channel;
    }

    private createChannelImpl<K extends keyof T>(channelName: K, config?: IMessageBrokerConfig): IChannelModel<T[K]> {
        let subscription: Subscription | undefined;
        const adapterObservables = this.getOrCreateAdapterObservables(channelName);
        let observable = merge(
            this.messagePublisher.pipe(filter((message) => message.channelName === channelName)),
            ...adapterObservables,
        );

        const replayCacheSize = config?.replayCacheSize;
        if (replayCacheSize) {
            observable = observable.pipe(shareReplay(replayCacheSize));
            subscription = observable.subscribe();
        }

        const publishFunction = (data?: T[K], type?: string): void => {
            const message = this.createMessage(channelName, data, type);
            this.messagePublisher.next(message);
            Object.entries(this.adapters).forEach(([id, adapter]) => {
                adapter.sendMessage(channelName, message).catch((error) => {
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
        const channel: IChannel<T[K]> = {
            stream: this.getDeferredObservable<K>(channelName),
            publish: publishFunction,
        };

        let channelModel: IChannelModel<T[K]> = {
            observable,
            channel,
        };

        channelModel = config != null ? { ...channelModel, config, subscription } : channelModel;

        this.channelLookup[channelName] = channelModel;

        return channelModel;
    }

    private createMessage<K extends keyof T, D = any>(channelName: K, data: D, type?: string): IMessage<D> {
        return {
            channelName: channelName as string,
            data,
            type,
            timestamp: Date.now(),
            id: uuid(),
            isHandled: false,
        };
    }

    private getOrCreateAdapterObservables<K extends keyof T>(channelName: K): Observable<IMessage<T[K]>>[] {
        const channelAdapterObs = this.adapterObservables[channelName] ?? (this.adapterObservables[channelName] = {});
        const adapterObservables: Observable<IMessage<T[K]>>[] = [];

        Object.entries(this.adapters).forEach(([adapterId, adapter]) => {
            if (!channelAdapterObs[adapterId]) {
                // Get the raw stream for this adapter (cached)
                if (!this.adapterStreams[adapterId]) {
                    this.adapterStreams[adapterId] = adapter.getMessageStream();
                }

                // Create filtered observable for this channel
                const filteredObservable = this.adapterStreams[adapterId].pipe(
                    filter((message) => message.channelName === channelName),
                );

                channelAdapterObs[adapterId] = filteredObservable;
                adapterObservables.push(filteredObservable);
            } else {
                adapterObservables.push(channelAdapterObs[adapterId]);
            }
        });

        return adapterObservables;
    }

    private cleanupAdapterObservables<K extends keyof T>(channelName: K): void {
        delete this.adapterObservables[channelName];
    }

    private isChannelConfiguredWithCaching<K extends keyof T>(
        channel: IChannelModel<T[K]> | undefined,
    ): channel is RequiredPick<IChannelModel<T[K]>, 'config' | 'subscription'> {
        return channel != null && channel.subscription != null;
    }
}
