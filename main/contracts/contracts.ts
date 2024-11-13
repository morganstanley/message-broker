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
     * A reference to the parent scope if this is not the root node in the tree of scopes. If this is the root, it's undefined.
     */
    readonly parent?: IMessageBroker<T>;
    /**
     * A list of all child scopes that have been created on this instance of the broker.
     */
    readonly children: IMessageBroker<T>[];

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
     * Creates a new scope with the given scopeName with this instance of the MessageBroker as its parent.
     * If a scope with this name already exists, it returns that instance instead of creating a new one.
     * @param scopeName The name to use for the scope to create
     * @returns An instance of the messagebroker that matches the scopeName provided
     */
    createScope(scopeName: string): IMessageBroker<T>;
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
