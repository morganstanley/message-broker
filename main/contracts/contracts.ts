import { Observable, Subscription } from 'rxjs';

/**
 * Returned when a messageBroker channel is created.
 */
export interface IChannel<TData = any, TChannel extends string = string> {
    /**
     * Publish a payload to subscribers, optional type can be provided for granular control
     */
    publish: (data?: TData, type?: string) => void;
    /**
     * Observable to subscribe to messages published onto this channel
     */
    stream: Observable<IMessage<TData, TChannel>>;
}

/**
 * Represents a previous created channel which is stored within the channel lookup.
 * This is an internal detail and should not be exposed publicly
 */
export interface IChannelModel<TData = any, TChannel extends string = string> {
    observable: Observable<IMessage<TData, TChannel>>;
    channel: IChannel<TData, TChannel>;
    config?: IMessageBrokerConfig;
    subscription?: Subscription;
}

export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>> & T;

/**
 * Represents a message which passed over the messageBroker channels. All published payloads are wrapped in a Message.
 */
export interface IMessage<TData = any, TChannel extends string = string, TType extends string = string> {
    /**
     * The name of the channel that the message is published on.
     */
    readonly channelName: TChannel;
    /**
     * The message type which can be defined when the message is published. This type can be leveraged for more granular control.
     */
    readonly type?: TType;
    /**
     * The payload of the message.
     */
    readonly data: TData;
    /**
     * Timestamp representing when the message was published.
     */
    readonly timestamp: number;
    /**
     * Unique id of the message.
     */
    readonly id: string;
    /**
     * Indicates whether the message has been handled by a subscriber. This property should be set by consuming application.
     */
    isHandled: boolean;
}

/**
 * Allows multiple responses to be collated from registered responders for a given channel.
 */
export interface IResponseBroker<T extends IResponseChannels> {
    /**
     * Register a handler for a given response channel
     * @param channelName
     * @param handler
     */
    registerResponder<K extends keyof T>(channelName: K, handler: ResponseHandler<T, K>): IResponderRef;

    /**
     * collate multiple responses to a given payload from registered responders
     * @param channelName
     * @param payload
     */
    collate<K extends keyof T>(channelName: K, payload: ResponsePayload<T, K>): ResponseReply<T, K>[];
}

/**
 * Represents a messageBroker and provides access to the core features which includes publishing/subscribing to messages and RSVP.
 */
export interface IMessageBroker<T extends Record<string, any> = Record<string, any>> {
    /**
     * Creates a new channel with the provided channelName. An optional config object can be passed that specifies how many messages to cache.
     * No caching is set by default
     *
     * @param channelName - Name of the channel to create.
     * @param config - Optional config object that determines number of messages to cache.
     * @returns IChannel
     */
    create<K extends Extract<keyof T, string>>(channelName: K, config?: IMessageBrokerConfig): IChannel<T[K], K>;

    /**
     * Gets the channel with the given channelName. Any messages
     * published on the same channel name will be received via the subscription.
     * @param channelName Name of the messageBroker channel.
     * @returns Observable of IMessage
     */
    get<K extends Extract<keyof T, string>>(channelName: K): Observable<IMessage<T[K], K>>;

    /**
     * Dispose of all existing subscriptions and configurations for a
     * particular channel name.
     * @param channelName Name of the messageBroker channel.
     */
    dispose<K extends Extract<keyof T, string>>(channelName: K): void;

    /**
     * Register an adapter with the message broker
     * @param adapter The adapter to register
     * @returns The ID of the registered adapter
     */
    registerAdapter(adapter: IMessageBrokerAdapter<T>): Promise<string>;

    /**
     * Unregister an adapter from the message broker
     * @param adapterId The ID of the adapter to unregister
     */
    unregisterAdapter(adapterId: string): Promise<void>;

    /**
     * Get all registered adapters
     */
    getAdapters(): Record<string, IMessageBrokerAdapter<T>>;

    /**
     * Get error stream for adapter failures
     */
    getErrorStream(): Observable<IAdapterError<T>>;

    /**
     * Creates a message with a uuid and timestamp
     * @param channelName
     * @param data
     * @param type
     */
    createMessage<K extends Extract<keyof T, string>, D = any, TType extends string = string>(
        channelName: K,
        data: D,
        type?: TType,
    ): IMessage<D, K, TType>;
}

/**
 * Configuration that can be passed when creating a channel.
 */
export interface IMessageBrokerConfig {
    /**
     * Number of messages to cache.
     */
    replayCacheSize?: number;
}

export interface IResponseChannel<TPayload = any, TResponse = any> {
    payload: TPayload;
    response: TResponse;
}

/**
 * Represents RSVP configuration that is associated with the messageBroker type that is used during creation.
 */
export type IResponseChannels = Record<string, IResponseChannel>;

/**
 * RSVPPayload type as defined in RSVP property that can provided to the messageBroker on creation. This enforces the RSVP channel to the
 * payload type.
 */
export type ResponsePayload<T extends IResponseChannels, K extends keyof T> = T[K]['payload'];
/**
 * RSVPResponse type as defined in RSVP property that can provided to the messageBroker on creation. This enforces the RSVP channel to the
 * response type.
 */
export type ResponseReply<T extends IResponseChannels, K extends keyof T> = T[K]['response'];
/**
 * RSVPHandler type as defined in RSVP property that can provided to the messageBroker on creation. This enforces the arguments and the return types
 * of the RSVP handler function.
 */
export type ResponseHandler<T extends IResponseChannels, K extends keyof T> = (
    message: IMessage<ResponsePayload<T, K>>,
) => ResponseReply<T, K>;

/***
 * Provides a reference to a responder.
 */
export interface IResponderRef {
    /**
     * The unique ID of the responder.
     */
    id: string;

    /**
     * Disconnect allows the responder to be disconnected from the list of available responders.
     */
    disconnect: () => void;
}

/**
 * Base interface for message broker adapters that integrate with external messaging systems
 */
export interface IMessageBrokerAdapter<T extends Record<string, any> = Record<string, any>> {
    /**
     * Connect to the external messaging system
     * Returns a promise that resolves when connection is established
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the external messaging system
     * Returns a promise that resolves when disconnection is done
     */
    disconnect(): Promise<void>;

    /**
     * Send a message to the external system
     * Returns a promise that resolves when message is sent
     */
    sendMessage<TChannel extends Extract<keyof T, string>>(message: IMessage<T[TChannel], TChannel>): Promise<void>;

    /**
     * Get all messages from the external system
     * Returns an observable of all messages received from external system
     */
    getMessageStream(): Observable<IMessage<T[any]>>;

    /**
     * Check if the adapter is connected
     */
    isConnected(): boolean;
}

/**
 * Error information for adapter failures
 */
export interface IAdapterError<T extends Record<string, any>> {
    /**
     * The adapter that failed
     */
    adapterId: string;

    /**
     * The channel name where the error occurred
     */
    channelName?: Extract<keyof T, string>;

    /**
     * The message that failed to send
     */
    message?: IMessage<any, Extract<keyof T, string>>;

    /**
     * The error that occurred
     */
    error: Error;

    /**
     * Timestamp when the error occurred
     */
    timestamp: number;
}
