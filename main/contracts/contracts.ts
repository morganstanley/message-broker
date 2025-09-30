import { Observable, Subscription } from 'rxjs';

/**
 * Returned when a messagebroker channel is created.
 */
export interface IChannel<T = any> {
    /**
     * Publish a payload to subscribers, optional type can be provided for granular control
     */
    publish: (data?: T, type?: string) => void;
    /**
     * Observable to subscribe to messages published onto this channel
     */
    stream: Observable<IMessage<T>>;
}

/**
 * Represents a previous created channel which is stored within the channel lookup.
 * This is an internal detail and should not be exposed publicly
 */
export interface IChannelModel<T> {
    observable: Observable<IMessage<T>>;
    channel: IChannel<T>;
    config?: IMessageBrokerConfig;
    subscription?: Subscription;
}

export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>> & T;

/**
 * Represents a message which passed over the messagebroker channels. All published payloads are wrapped in a Message.
 */
export interface IMessage<T = any> {
    /**
     * The name of the channel that the message is published on.
     */
    readonly channelName: string;
    /**
     * The message type which can be defined when the message is published. This type can be leveraged for more granular control.
     */
    readonly type?: string;
    /**
     * The payload of the message.
     */
    readonly data: T;
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
 * Represents a messagebroker and provides access to the core features which includes publishing/subscribing to messages and RSVP.
 */
export interface IMessageBroker<T> {
    /**
     * Creates a new channel with the provided channelName. An optional config object can be passed that specifies how many messages to cache.
     * No caching is set by default
     *
     * @param channelName - Name of the channel to create.
     * @param config - Optional config object that determines number of messages to cache.
     * @returns IChannel
     */
    create<K extends keyof T>(channelName: K, config?: IMessageBrokerConfig): IChannel<T[K]>;

    /**
     * Gets the channel with the given channelName. Any messages
     * published on the same channel name will be received via the subscription.
     * @param channelName Name of the messagebroker channel.
     * @returns Observable of IMessage
     */
    get<K extends keyof T>(channelName: K): Observable<IMessage<T[K]>>;

    /**
     * Dispose of all existing subscriptions and configurations for a
     * particular channel name.
     * @param channelName Name of the messagebroker channel.
     */
    dispose<K extends keyof T>(channelName: K): void;

    /**
     * RSVP function is analogous to the publish function except it's synchronous and expects a response from particpants immediately.
     * @param channelName The channel name we wish to broadcast upon.
     * @param payload The payload we are going to send for our rsvp request.
     */
    rsvp<K extends keyof RSVPOf<T>>(channelName: K, payload: RSVPPayload<T>): RSVPResponse<T>[];
    /***
     * This RSVP function is used by responders and is analogous to the 'Get' function. Responders when invoked must return the required response value type.
     */
    rsvp<K extends keyof RSVPOf<T>>(channelName: K, handler: RSVPHandler<T>): IResponderRef;

    /**
     * Register an adapter with the message broker
     * @param adapter The adapter to register
     * @returns The ID of the registered adapter
     */
    registerAdapter(adapter: IMessageBrokerAdapter<T>): string;

    /**
     * Unregister an adapter from the message broker
     * @param adapterId The ID of the adapter to unregister
     */
    unregisterAdapter(adapterId: string): void;

    /**
     * Get all registered adapters
     */
    getAdapters(): Record<string, IMessageBrokerAdapter<T>>;

    /**
     * Get error stream for adapter failures
     */
    getErrorStream(): Observable<IAdapterError<T>>;
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

/**
 * Represents RSVP configuration that is associated with the messagebroker type that is used during creation.
 */
export interface IRSVPConfig {
    /**
     * A map of RSVP channel names to their corresponding payload and response types
     */
    rsvp: { [s: string]: { payload: any; response: any } };
}

export type RSVPOf<T> = T extends IRSVPConfig ? T['rsvp'] : never;
/**
 * RSVPPayload type as defined in RSVP property that can provided to the messagebroker on creation. This enforces the RSVP channel to the
 * payload type.
 */
export type RSVPPayload<T> = T extends IRSVPConfig ? T['rsvp'][keyof T['rsvp']]['payload'] : never;
/**
 * RSVPResponse type as defined in RSVP property that can provided to the messagebroker on creation. This enforces the RSVP channel to the
 * response type.
 */
export type RSVPResponse<T> = T extends IRSVPConfig ? T['rsvp'][keyof T['rsvp']]['response'] : never;
/**
 * RSVPHandler type as defined in RSVP property that can provided to the messagebroker on creation. This enforces the arguments and the return types
 * of the RSVP handler function.
 */
export type RSVPHandler<T> = T extends IRSVPConfig ? (mesage: IMessage<RSVPPayload<T>>) => RSVPResponse<T> : never;

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
export interface IMessageBrokerAdapter<T> {
    /**
     * Initialize the adapter
     * Returns a promise that resolves when initialization is done
     */
    initialize(): Promise<void>;

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
    sendMessage(channelName: keyof T, message: IMessage): Promise<void>;

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
export interface IAdapterError<T> {
    /**
     * The adapter that failed
     */
    adapterId: string;

    /**
     * The channel name where the error occurred
     */
    channelName: keyof T;

    /**
     * The message that failed to send
     */
    message: IMessage;

    /**
     * The error that occurred
     */
    error: Error;

    /**
     * Timestamp when the error occurred
     */
    timestamp: number;
}
