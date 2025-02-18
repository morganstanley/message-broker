import { IMocked, Mock, replacePropertiesBeforeEach, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { map } from 'rxjs/operators';
import { RSVPMediator } from '../../main/core/rsvp-mediator';
import { IMessage, IMessageBrokerConfig, IRSVPConfig } from '../../main/contracts/contracts';
import * as uuid from 'uuid';
import * as Needle from '@morgan-stanley/needle';
import { MessageBroker, messagebroker } from '../../main/core/messagebroker';

describe('MessageBroker', () => {
    let mockUuidPackage: IMocked<typeof uuid>;
    let mockNeedlePackage: IMocked<typeof Needle>;
    let mockRSVPMediator: IMocked<RSVPMediator<any>>;

    replacePropertiesBeforeEach(() => {
        mockUuidPackage = Mock.create<typeof uuid>().setup(setupFunction('v4', (() => 'mockedId') as any));
        mockNeedlePackage = Mock.create<typeof Needle>().setup(setupFunction('get', () => getInstance() as any));
        return [
            { package: uuid, mocks: { ...mockUuidPackage.mock } },
            { package: Needle, mocks: { ...mockNeedlePackage.mock } },
        ];
    });

    beforeEach(() => {
        mockRSVPMediator = Mock.create<RSVPMediator<any>>().setup(setupFunction('rsvp'));
    });

    function getInstance<T = any>(): MessageBroker<T> {
        return new MessageBroker<T>(mockRSVPMediator.mock);
    }

    it('should create instance', () => {
        const instance = getInstance();
        expect(instance).toBeDefined();
    });

    it('should create an instance via messagebroker function', () => {
        const instance = messagebroker();
        expect(instance).toBeDefined();
        expect(
            mockNeedlePackage.withFunction('get').withParametersEqualTo((type: any) => type === MessageBroker),
        ).wasCalledOnce();
    });

    it('should create messagebroker channel', () => {
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

        // eslint-disable-next-line
        expect(message!).toBeDefined();
        // eslint-disable-next-line
        expect(message!.data).toBeUndefined();
    });

    interface IMySampleBroker extends IRSVPConfig {
        channelOne: string;
        channelTwo: number;
        channelThree: Date;
        rsvp: {
            bootstrap: {
                payload: { data: 'myData' };
                response: string[];
            };
        };
    }

    describe('Typing', () => {
        it('should return a typed push function', () => {
            const messageBroker: MessageBroker<IMySampleBroker> = new MessageBroker<IMySampleBroker>(
                mockRSVPMediator.mock,
            );

            const stringChannel = messageBroker.create('channelOne');
            const numberChannel = messageBroker.create('channelTwo');
            const dateChannel = messageBroker.create('channelThree');

            stringChannel.publish('aString');
            numberChannel.publish(123);
            dateChannel.publish(new Date());
        });

        it('should return a typed channel', () => {
            const messageBroker: MessageBroker<IMySampleBroker> = new MessageBroker<IMySampleBroker>(
                mockRSVPMediator.mock,
            );

            const stringChannel = messageBroker.get('channelOne');
            const numberChannel = messageBroker.get('channelTwo');
            const dateChannel = messageBroker.get('channelThree');

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

    describe('RSVP', () => {
        it('should call rsvp mediator when passing a payload', () => {
            const instance = getInstance<IMySampleBroker>();
            instance.rsvp('bootstrap', { data: 'myData' });

            expect(
                mockRSVPMediator.withFunction('rsvp').withParametersEqualTo('bootstrap', { data: 'myData' }),
            ).wasCalledOnce();
        });

        it('should call rsvp mediator when passing a handler', () => {
            const instance = getInstance<IMySampleBroker>();
            const handler = () => ['rsvpResponse'];
            instance.rsvp('bootstrap', handler);

            expect(
                mockRSVPMediator
                    .withFunction('rsvp')
                    .withParametersEqualTo('bootstrap', (callBack: any) => handler === callBack),
            ).wasCalledOnce();
        });
    });

    describe('Scopes', () => {
        it('should return a new messagebroker instance for each new scope', () => {
            const instance = getInstance<IMySampleBroker>();
            const scope = instance.createScope();
            const scope2 = instance.createScope();

            expect(scope).not.toBe(instance);
            expect(scope).not.toBe(scope2);
        });

        it('should publish messages from child to parent if there is no handler on child', () => {
            const parentMessages: Array<IMessage<string>> = [];
            const parent = getInstance();
            const child = parent.createScope();

            parent.get('channel').subscribe((message) => parentMessages.push(message));
            child.create('channel').publish('parent should handle this');

            expect(parentMessages.length).toEqual(1);
            verifyMessage(parentMessages[0], 'parent should handle this');
        });

        it('should not publish messages from child to parent if there is a handler on child', () => {
            const parentMessages: Array<IMessage<string>> = [];
            const childMessages: Array<IMessage<string>> = [];
            const parent = getInstance();
            const child = parent.createScope();

            parent.get('channel').subscribe((message) => parentMessages.push(message));
            child.get('channel').subscribe((message) => childMessages.push(message));

            child.create('channel').publish('child should handle this');

            expect(parentMessages.length).toEqual(0);

            expect(childMessages.length).toEqual(1);
            verifyMessage(childMessages[0], 'child should handle this');
        });

        it('should not publish messages to "sibling" scopes', () => {
            const brotherMessages: Array<IMessage<string>> = [];
            const sisterMessages: Array<IMessage<string>> = [];
            const parent = getInstance();
            const brother = parent.createScope();
            const sister = parent.createScope();

            brother.get('channel').subscribe((message) => brotherMessages.push(message));
            sister.get('channel').subscribe((message) => sisterMessages.push(message));

            brother.create('channel').publish('brother should get this');
            sister.create('channel').publish('sister should get this');

            expect(brotherMessages.length).toEqual(1);
            verifyMessage(brotherMessages[0], 'brother should get this');

            expect(sisterMessages.length).toEqual(1);
            verifyMessage(sisterMessages[0], 'sister should get this');
        });

        describe('Destroy', () => {
            it('should dispose of all subscriptions on that instance and its child', () => {
                const instance = getInstance();
                const instanceChannel = instance.create('yourChannel');
                const child = instance.createScope();
                const childChannel = instance.create('yourChannel');

                instance.destroy(); // destroy the PARENT

                const postDisposeInstanceChannel = instance.create('yourChannel');
                const postDisposeChildChannel = child.create('yourChannel');

                expect(postDisposeInstanceChannel).not.toBe(instanceChannel);
                expect(postDisposeChildChannel).not.toBe(childChannel);
            });

            it('should prevent message propagation from happening', () => {
                const childMessages: Array<IMessage<string>> = [];
                const parentMessages: Array<IMessage<string>> = [];
                const parent = getInstance();
                const child = parent.createScope();

                parent.get('channel').subscribe((message) => parentMessages.push(message));

                child.destroy();

                child.create('channel').publish('message');

                expect(childMessages.length).toEqual(0);
                expect(parentMessages.length).toEqual(0);
            });

            it('should destroy all cached messages on parent as well', () => {
                const parent = getInstance();
                const child = parent.createScope();

                const parentChannel = parent.create('channel', { replayCacheSize: 2 });
                const childChannel = child.create('channel', { replayCacheSize: 2 });

                childChannel.publish('message one');
                childChannel.publish('message two');

                child.destroy(); // this should cancel the existing caching subscriptions

                const parentMessages: Array<IMessage<string>> = [];
                parentChannel.stream.subscribe((message) => parentMessages.push(message));

                childChannel.publish('message three');

                expect(parentMessages.length).toEqual(0);
            });
        });
    });

    function verifyMessage<T>(message: IMessage<T>, expectedData: T, expectedType?: string) {
        expect(message).toBeDefined();
        expect(message.data).toEqual(expectedData);
        expect(message.type).toEqual(expectedType);
        expect(message.id).toEqual('mockedId');
        expect(message.timestamp).toBeLessThanOrEqual(Date.now());
    }
});
