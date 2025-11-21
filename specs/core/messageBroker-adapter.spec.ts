import { IMocked, Mock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { firstValueFrom, Observer, Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { IAdapterError, IMessage, IMessageBroker, IMessageBrokerAdapter } from '../../main/contracts/contracts.js';
import { MessageBroker } from '../../main/core/messageBroker.js';
import { ResponseBroker } from '../../main/core/rsvp-mediator.js';

interface ITestChannels {
    'test-channel': {
        test: string;
    };
    'external-channel': {
        external: string;
    };
}

describe('MessageBroker Adapter', () => {
    let broker: IMessageBroker<ITestChannels>;
    let mockRSVPMediator: IMocked<ResponseBroker<ITestChannels>>;
    let mockAdapter: IMocked<IMessageBrokerAdapter<ITestChannels>>;
    let adapterMessagesStream: Subject<IMessage>;

    beforeEach(() => {
        adapterMessagesStream = new Subject<IMessage>();

        mockRSVPMediator = Mock.create<ResponseBroker<ITestChannels>>().setup(setupFunction('rsvp'));
        broker = getInstance<ITestChannels>();
        mockAdapter = Mock.create<IMessageBrokerAdapter<ITestChannels>>().setup(
            setupFunction('connect', () => Promise.resolve()),
            setupFunction('disconnect', () => Promise.resolve()),
            setupFunction('getMessageStream', () => adapterMessagesStream.asObservable()),
            setupFunction('sendMessage', () => Promise.resolve()),
        );
    });

    function getInstance<T extends Record<string, any>>(): IMessageBroker<T> {
        return new MessageBroker<T>(mockRSVPMediator.mock);
    }

    it('should register adapter successfully', async () => {
        await broker.registerAdapter(mockAdapter.mock);

        const adapters = broker.getAdapters();
        expect(Object.values(adapters)).toContain(mockAdapter.mock);
        expect(Object.keys(adapters).length).toBe(1);
    });

    it('should unregister adapter successfully', async () => {
        const adapterId = await broker.registerAdapter(mockAdapter.mock);
        await broker.unregisterAdapter(adapterId);

        const adapters = broker.getAdapters();
        expect(Object.keys(adapters).length).toBe(0);
    });

    it(`should connect to an adapter as it is registered`, async () => {
        await broker.registerAdapter(mockAdapter.mock);

        expect(mockAdapter.withFunction('connect')).wasCalledOnce();
    });

    it(`should publish error on adapter connection failure`, async () => {
        const connectionError = new Error('Connection failed');
        mockAdapter.setupFunction('connect', () => Promise.reject(connectionError));

        const mockObserver = Mock.create<Observer<IAdapterError<any>>>().setup(setupFunction('next'));
        broker.getErrorStream().subscribe(mockObserver.mock);

        const adapterId = await broker.registerAdapter(mockAdapter.mock);

        expect(
            mockObserver
                .withFunction('next')
                .withParametersEqualTo(
                    (message) => message.adapterId === adapterId && message.error === connectionError,
                ),
        ).wasCalledOnce();
    });

    it('should send messages to connected adapter', async () => {
        await broker.registerAdapter(mockAdapter.mock);

        const messagePayload = { test: 'data' };

        broker.create('test-channel').publish(messagePayload);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(
            mockAdapter
                .withFunction('sendMessage')
                .withParametersEqualTo(
                    (message) => message.data === messagePayload && message.channelName === 'test-channel',
                ),
        ).wasCalledOnce();
    });

    it('should receive messages from adapter subscription', async () => {
        await broker.registerAdapter(mockAdapter.mock);

        const messagePromise = firstValueFrom(broker.get('test-channel'));

        const externalMessage: IMessage = {
            channelName: 'test-channel',
            data: { test: 'external-data' },
            timestamp: Date.now(),
            id: 'external-id',
            isHandled: false,
        };

        adapterMessagesStream.next(externalMessage);

        const receivedMessage = await messagePromise;

        expect(receivedMessage).toEqual(externalMessage);
    });

    it(`should disconnect when unregistering adapter`, async () => {
        const adapterId = await broker.registerAdapter(mockAdapter.mock);

        await broker.unregisterAdapter(adapterId);

        expect(mockAdapter.withFunction('disconnect')).wasCalledOnce();
    });

    it(`should publish error on adapter disconnection failure`, async () => {
        const connectionError = new Error('Connection failed');
        mockAdapter.setupFunction('disconnect', () => Promise.reject(connectionError));

        const mockObserver = Mock.create<Observer<IAdapterError<any>>>().setup(setupFunction('next'));
        broker.getErrorStream().subscribe(mockObserver.mock);

        const adapterId = await broker.registerAdapter(mockAdapter.mock);

        await broker.unregisterAdapter(adapterId);

        expect(
            mockObserver
                .withFunction('next')
                .withParametersEqualTo(
                    (message) => message.adapterId === adapterId && message.error === connectionError,
                ),
        ).wasCalledOnce();
    });

    it('should not send messages to disconnected adapter', async () => {
        const adapterId = await broker.registerAdapter(mockAdapter.mock);

        await broker.unregisterAdapter(adapterId);

        broker.create('test-channel').publish({ test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockAdapter.withFunction('sendMessage')).wasNotCalled();
    });

    it('should emit error when adapter sendMessage fails', async () => {
        const sendError = new Error('Send failed');
        mockAdapter.setupFunction('sendMessage', () => Promise.reject(sendError));
        const adapterId = await broker.registerAdapter(mockAdapter.mock);

        const mockObserver = Mock.create<Observer<IAdapterError<any>>>().setup(setupFunction('next'));
        broker.getErrorStream().subscribe(mockObserver.mock);

        broker.create('test-channel').publish({ test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(
            mockObserver
                .withFunction('next')
                .withParametersEqualTo(
                    (errorMessage) =>
                        errorMessage.channelName === 'test-channel' &&
                        errorMessage.error === sendError &&
                        errorMessage.adapterId === adapterId &&
                        errorMessage.message?.data.test === 'data' &&
                        errorMessage.message?.channelName === 'test-channel',
                ),
        ).wasCalledOnce();
    });

    it('should reuse adapter subscriptions when upgrading channel from non-cached to cached', async () => {
        await broker.registerAdapter(mockAdapter.mock);

        // Create channel without config first
        broker.create('test-channel');

        // Create same channel with config - should reuse adapter subscription
        broker.create('test-channel', { replayCacheSize: 1 });

        // Verify getMessageStream was only called once
        expect(mockAdapter.withFunction('getMessageStream')).wasCalledOnce();

        // Verify channel still works with external messages
        const messagePromise = firstValueFrom(broker.get('test-channel'));

        const externalMessage: IMessage = {
            channelName: 'test-channel',
            data: { test: 'external-data-cached' },
            timestamp: Date.now(),
            id: 'external-id-cached',
            isHandled: false,
        };

        adapterMessagesStream.next(externalMessage);
        const message = await messagePromise;

        expect(message.data).toEqual({ test: 'external-data-cached' });
    });
});
