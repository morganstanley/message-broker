import { get, Injectable } from '@morgan-stanley/needle';
import { defer, Observable, Subject, Subscription } from 'rxjs';
import { filter, shareReplay } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { isCacheSizeEqual } from '../functions/helper.functions';
import {
    IChannel,
    IChannelModel,
    IMessage,
    IMessageBroker,
    IMessageBrokerConfig,
    RequiredPick,
    RSVPHandler,
    RSVPOf,
    RSVPPayload,
    RSVPResponse,
    IResponderRef,
} from '../contracts/contracts';
import { RSVPMediator } from './rsvp-mediator';
type ChannelModelLookup<T> = { [P in keyof T]?: IChannelModel<T[P]> };

/**
 * Creates and returns a single messagebroker instance. This is the recommend approach to resolve an instance of the messagebroker
 * when not using dependency injection.
 * @returns IMessageBroker
 */
export function messagebroker<T = any>(): IMessageBroker<T> {
    const instance = get(MessageBroker);
    return instance;
}

/**
 * Represents a messagebroker. Using the 'new' operator is discouraged, instead use the messagebroker() function or dependency injection.
 */
@Injectable()
export class MessageBroker<T = any> implements IMessageBroker<T> {
    private channelLookup: ChannelModelLookup<T> = {};
    private messagePublisher = new Subject<IMessage<any>>();
    private _children: {
        name: string;
        instance: IMessageBroker<T>;
    }[] = [];

    constructor(private rsvpMediator: RSVPMediator<T>, private _parent?: IMessageBroker<T>) {}

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
     * @param channelName Name of the messagebroker channel
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
     * @param channelName Name of the messagebroker channel
     */
    public dispose<K extends keyof T>(channelName: K): void {
        this._children.forEach((scope) => scope.instance.dispose(channelName));
        const channel = this.channelLookup[channelName];
        if (this.isChannelConfiguredWithCaching(channel)) {
            channel.subscription.unsubscribe();
        }
        delete this.channelLookup[channelName];
    }

    /**
     * Creates a new scope with the given scopeName with this instance of the MessageBroker as its parent.
     * If a scope with this name already exists, it returns that instance instead of creating a new one.
     * @param scopeName The name to use for the scope to create
     * @returns An instance of the messagebroker that matches the scopeName provided
     */
    public createScope(scopeName: string): IMessageBroker<T> {
        const existingScope = this._children.find((scope) => scope.name === scopeName);
        if (existingScope) {
            return existingScope.instance;
        }

        const instance = new MessageBroker<T>(this.rsvpMediator, this);
        this._children.push({
            name: scopeName,
            instance,
        });
        return instance;
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
        let observable = this.messagePublisher.pipe(filter((message) => message.channelName === channelName));

        const replayCacheSize = config?.replayCacheSize;
        if (replayCacheSize) {
            observable = observable.pipe(shareReplay(replayCacheSize));
            subscription = observable.subscribe();
        }

        const publishFunction = (data?: T[K], type?: string): void => {
            this._children.forEach((scope) => scope.instance.create(channelName).publish(data), type);
            this.messagePublisher.next(this.createMessage(channelName, data, type));
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

    private isChannelConfiguredWithCaching<K extends keyof T>(
        channel: IChannelModel<T[K]> | undefined,
    ): channel is RequiredPick<IChannelModel<T[K]>, 'config' | 'subscription'> {
        return channel != null && channel.subscription != null;
    }

    public isRoot(): boolean {
        return this._parent === undefined;
    }

    public get parent(): IMessageBroker<T> | undefined {
        return this._parent;
    }

    public get children(): IMessageBroker<T>[] {
        return this._children.map((scope) => scope.instance);
    }
}
