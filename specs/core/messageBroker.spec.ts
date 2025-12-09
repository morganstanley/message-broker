import * as Needle from '@morgan-stanley/needle';
import { map } from 'rxjs/operators';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';

import { IMessage, IMessageBrokerConfig } from '../../main/contracts/contracts.js';
import { MessageBroker, messageBroker } from '../../main/core/messageBroker.js';

describe('MessageBroker', () => {
    vi.mock(import('uuid'), async (importOriginal) => {
        const mod = await importOriginal();
        return {
            ...mod,
            v4: () => 'mockedId',
        };
    });

    function getInstance<T extends Record<string, any>>(): MessageBroker<T> {
        return new MessageBroker<T>();
    }

    it('should create instance', () => {
        const instance = getInstance();
        expect(instance).toBeDefined();
    });

    it('should create an instance via messageBroker function', () => {
        const spyMessageBrokerGet = vi.spyOn(Needle, 'get');
        const instance = messageBroker();
        expect(instance).toBeDefined();
        expect(spyMessageBrokerGet).toHaveBeenCalledExactlyOnceWith(MessageBroker);
    });

    it('should create messageBroker channel', () => {
        const instance = getInstance();
        expect(instance.create('myChannel')).toBeDefined();
    });

    it('should publish message to multiple subscribers on the same channel', () => {
        const instance = getInstance();
        const channelOne = instance.get('myChannel');
        const channelTwo = instance.get('myChannel');

        const messages: string[] = [];

        channelOne.subscribe((message) => messages.push(message.data));
        channelTwo.subscribe((message) => messages.push(message.data));

        instance.create('myChannel').publish('one');

        expect(messages).toEqual(['one', 'one']);
    });

    it('should return 2 publish functions for the same stream when called with identical config', () => {
        const instance = getInstance();
        const channelOne = instance.create('myChannel');
        const channelTwo = instance.create('myChannel');

        const messages: string[] = [];

        instance
            .get('myChannel')
            .pipe(map((message) => message.data))
            .subscribe((data) => messages.push(data));

        channelOne.publish('one');
        channelTwo.publish('two');

        expect(messages).toEqual(['one', 'two']);
    });

    it('should throw an error when create called with different replayCacheSize', () => {
        const configOne: IMessageBrokerConfig = { replayCacheSize: 2 };
        const configTwo: IMessageBrokerConfig = { replayCacheSize: 3 };
        const instance = getInstance();

        instance.create('myChannel', configOne);

        expect(() => instance.create('myChannel', configTwo)).toThrowError(
            "A channel already exists with the name 'myChannel'. A channel with the same name cannot be created with a different cache size",
        );
    });

    it('should not publish first message to late subscribers for a non-cached channel', () => {
        const instance = getInstance();

        const channel = instance.create('yourChannel');

        channel.publish('Hello World');

        const messages: Array<IMessage<string>> = [];

        instance.get('yourChannel').subscribe((message) => messages.push(message));

        expect(messages).toEqual([]);
    });

    it('should not miss messages when subscription started before channel created', () => {
        const instance = getInstance();
        const messages: Array<IMessage<string>> = [];

        instance.get('yourChannel').subscribe((message) => messages.push(message));

        const channel = instance.create('yourChannel');

        channel.publish('Hello World');

        expect(messages.length).toEqual(1);
        verifyMessage(messages[0], 'Hello World');
    });

    it('should miss messages that are sent before subscription', () => {
        const messages: Array<IMessage<string>> = [];
        const instance = getInstance();
        const channelStream = instance.get('yourChannel');

        const channel = instance.create('yourChannel');

        channel.publish('Hello World One');

        channelStream.subscribe((message) => messages.push(message));

        channel.publish('Hello World Two');

        expect(messages.length).toEqual(1);
        verifyMessage(messages[0], 'Hello World Two');
    });

    it('should dipose of non-cached channel', () => {
        const instance = getInstance();
        const channel = instance.create('yourChannel');

        instance.dispose('yourChannel');

        const postDisposeNextFunction = instance.create('yourChannel');

        expect(postDisposeNextFunction).not.toBe(channel);
    });

    it('should allow publishing of channel message without data', () => {
        const instance = getInstance();
        const channel = instance.create('yourChannel');
        let message: IMessage;
        instance.get('yourChannel').subscribe((msg) => (message = msg));

        channel.publish();

        expect(message!).toBeDefined();

        expect(message!.data).toBeUndefined();
    });

    interface IMySampleBroker {
        channelOne: string;
        channelTwo: number;
        channelThree: Date;
    }

    describe('Typing', () => {
        it('should return a typed push function', () => {
            const messageBroker: MessageBroker<IMySampleBroker> = new MessageBroker<IMySampleBroker>();

            const stringChannel = messageBroker.create('channelOne');
            const numberChannel = messageBroker.create('channelTwo');
            const dateChannel = messageBroker.create('channelThree');

            expect(stringChannel.publish).toBeDefined();
            expect(numberChannel.publish).toBeDefined();
            expect(dateChannel.publish).toBeDefined();

            // These should not throw TypeScript compilation errors
            stringChannel.publish('aString');
            numberChannel.publish(123);
            dateChannel.publish(new Date());
        });

        it('should return a typed channel', () => {
            const messageBroker: MessageBroker<IMySampleBroker> = new MessageBroker<IMySampleBroker>();

            const stringChannel = messageBroker.get('channelOne');
            const numberChannel = messageBroker.get('channelTwo');
            const dateChannel = messageBroker.get('channelThree');

            expect(stringChannel).toBeDefined();
            expect(numberChannel).toBeDefined();
            expect(dateChannel).toBeDefined();

            // These should not throw TypeScript compilation errors
            stringChannel.subscribe((msg) => msg.data.length);
            numberChannel.subscribe((msg) => msg.data.toExponential());
            dateChannel.subscribe((msg) => msg.data.getMonth());
        });
    });

    describe('Caching', () => {
        it('should publish first message to late subscribers for a cached channel', () => {
            const instance = getInstance();

            const channel = instance.create('yourChannel', { replayCacheSize: 1 });

            channel.publish('Hello World');

            const messages: Array<IMessage<string>> = [];

            instance.get('yourChannel').subscribe((message) => messages.push(message));

            expect(messages.length).toEqual(1);
            verifyMessage(messages[0], 'Hello World');
        });

        it('should cache multiple messages', () => {
            const instance = getInstance();

            const channel = instance.create('yourChannel', { replayCacheSize: 2 });

            channel.publish('Hello World One');
            channel.publish('Hello World Two');

            const messages: Array<IMessage<string>> = [];

            instance.get('yourChannel').subscribe((message) => messages.push(message));

            expect(messages.length).toEqual(2);
            verifyMessage(messages[0], 'Hello World One');
            verifyMessage(messages[1], 'Hello World Two');
        });

        it('should publish messages to late subscribers for a cached channel', () => {
            const cachedConfig: IMessageBrokerConfig = {
                replayCacheSize: 1,
            };

            const streamOneMessages: Array<IMessage<string>> = [];
            const streamTwoMessages: Array<IMessage<string>> = [];
            const instance = getInstance();

            //  First Subscription
            const streamOne = instance.get('yourChannel');
            streamOne.subscribe((message) => streamOneMessages.push(message));

            const streamTwo = instance.get('yourChannel');

            //  create Channel
            const channel = instance.create('yourChannel', cachedConfig);

            channel.publish('Hello World One');
            channel.publish('Hello World Two');

            //  Second Subscription
            streamTwo.subscribe((message) => streamTwoMessages.push(message));

            channel.publish('Hello World Three');

            expect(streamOneMessages.length).toEqual(3);
            verifyMessage(streamOneMessages[0], 'Hello World One');
            verifyMessage(streamOneMessages[1], 'Hello World Two');
            verifyMessage(streamOneMessages[2], 'Hello World Three');

            expect(streamTwoMessages.length).toEqual(2);
            verifyMessage(streamTwoMessages[0], 'Hello World Two');
            verifyMessage(streamTwoMessages[1], 'Hello World Three');
        });

        it('should dipose of cached channel', () => {
            const instance = getInstance();
            const channel = instance.create('yourChannel', { replayCacheSize: 1 });

            instance.dispose('yourChannel');

            const postDisposeChannel = instance.create('yourChannel', {
                replayCacheSize: 1,
            });

            expect(postDisposeChannel).not.toBe(channel);
        });
    });

    describe('Streams', () => {
        it('should not receive messages beyond cache limit when caching and using the stream property', () => {
            const streamOneMessages: Array<IMessage<string>> = [];

            const cachedConfig: IMessageBrokerConfig = {
                replayCacheSize: 1,
            };
            const instance = getInstance();

            const publisher = instance.create('yourChannel', cachedConfig);
            //  Second Subscription

            publisher.publish('Hello World One');
            publisher.publish('Hello World Two');

            const streamOne = instance.create('yourChannel').stream;
            streamOne.subscribe((message) => streamOneMessages.push(message));

            expect(streamOneMessages.length).toEqual(1);
            verifyMessage(streamOneMessages[0], 'Hello World Two');
        });

        it('should respect cache limits when caching and using the stream property', () => {
            const cachedConfig: IMessageBrokerConfig = {
                replayCacheSize: 1,
            };

            const streamOneMessages: Array<IMessage<string>> = [];
            const streamTwoMessages: Array<IMessage<string>> = [];
            const instance = getInstance();

            //  First Subscription
            const streamOne = instance.create('yourChannel').stream;
            streamOne.subscribe((message) => streamOneMessages.push(message));

            const streamTwo = instance.create('yourChannel').stream;

            //  create Channel
            const channel = instance.create('yourChannel', cachedConfig);

            channel.publish('Hello World One');
            channel.publish('Hello World Two');

            //  Second Subscription
            streamTwo.subscribe((message) => streamTwoMessages.push(message));

            channel.publish('Hello World Three');

            expect(streamOneMessages.length).toEqual(3);
            verifyMessage(streamOneMessages[0], 'Hello World One');
            verifyMessage(streamOneMessages[1], 'Hello World Two');
            verifyMessage(streamOneMessages[2], 'Hello World Three');

            expect(streamTwoMessages.length).toEqual(2);
            verifyMessage(streamTwoMessages[0], 'Hello World Two');
            verifyMessage(streamTwoMessages[1], 'Hello World Three');
        });
    });

    function verifyMessage<T extends string>(message: IMessage<T>, expectedData: T, expectedType?: string) {
        expect(message).toBeDefined();
        expect(message.data).toEqual(expectedData);
        expect(message.type).toEqual(expectedType);
        expect(message.id).toEqual('mockedId');
        expect(message.timestamp).toBeLessThanOrEqual(Date.now());
    }
});
