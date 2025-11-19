import { IMocked, Mock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { Observable, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IAdapterError, IMessage, IMessageBroker, IMessageBrokerAdapter } from '../../main/contracts/contracts.js';
import { MessageBroker } from '../../main/core/messageBroker.js';
import { RSVPMediator } from '../../main/core/rsvp-mediator.js';

interface ITestChannels {
    'test-channel': {
        test: string;
    };
    'external-channel': {
        external: string;
    };
}

class MockAdapter implements IMessageBrokerAdapter<ITestChannels> {
    private connected: boolean = false;
    private messageSubject = new Subject<IMessage>();
    public sentMessages: Array<{ channel: keyof ITestChannels; message: IMessage }> = [];
    public shouldFailSendMessage: boolean = false;

    initialize(): Promise<void> {
        return Promise.resolve();
    }

    connect(): Promise<void> {
        this.connected = true;
        return Promise.resolve();
    }

    disconnect(): Promise<void> {
        this.connected = false;
        return Promise.resolve();
    }

    sendMessage(channelName: keyof ITestChannels, message: IMessage): Promise<void> {
        if (this.shouldFailSendMessage) {
            return Promise.reject(new Error('Mock adapter send failure'));
        }
        if (this.connected) {
            this.sentMessages.push({ channel: channelName, message });
        }
        return Promise.resolve();
    }

    getMessageStream(): Observable<IMessage> {
        return this.messageSubject.asObservable();
    }

    isConnected(): boolean {
        return this.connected;
    }

    public simulateIncomingMessage(message: IMessage): void {
        this.messageSubject.next(message);
    }
}

describe('MessageBroker Adapter', () => {
    let broker: IMessageBroker<ITestChannels>;
    let mockRSVPMediator: IMocked<RSVPMediator<ITestChannels>>;
    let mockAdapter: MockAdapter;

    beforeEach(() => {
        mockRSVPMediator = Mock.create<RSVPMediator<ITestChannels>>().setup(setupFunction('rsvp'));
        broker = getInstance<ITestChannels>();
        mockAdapter = new MockAdapter();
    });

    function getInstance<T>(): IMessageBroker<T> {
        return new MessageBroker<T>(mockRSVPMediator.mock);
    }

    it('should register adapter successfully', () => {
        broker.registerAdapter(mockAdapter);

        const adapters = broker.getAdapters();
        expect(Object.values(adapters)).toContain(mockAdapter);
        expect(Object.keys(adapters).length).toBe(1);
    });

    it('should unregister adapter successfully', () => {
        const adapterId = broker.registerAdapter(mockAdapter);
        broker.unregisterAdapter(adapterId);

        const adapters = broker.getAdapters();
        expect(Object.keys(adapters).length).toBe(0);
    });

    it('should initialize and connect adapter', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        expect(mockAdapter.isConnected()).toBe(true);
    });

    it('should send messages to connected adapter', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        broker.registerAdapter(mockAdapter);

        broker.create('test-channel').publish({ test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockAdapter.sentMessages.length).toBe(1);
        expect(mockAdapter.sentMessages[0].channel).toBe('test-channel');
        expect(mockAdapter.sentMessages[0].message.data).toEqual({ test: 'data' });
    });

    it('should receive messages from adapter subscription', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        broker.registerAdapter(mockAdapter);

        const messagePromise = new Promise<void>((resolve) => {
            broker.get('test-channel').subscribe((message) => {
                expect(message.data).toEqual({ test: 'external-data' });
                resolve();
            });
        });

        const externalMessage: IMessage = {
            channelName: 'test-channel',
            data: { test: 'external-data' },
            timestamp: Date.now(),
            id: 'external-id',
            isHandled: false,
        };

        mockAdapter.simulateIncomingMessage(externalMessage);
        await messagePromise;
    });

    it('should not send messages to disconnected adapter', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        await mockAdapter.disconnect();
        broker.registerAdapter(mockAdapter);

        broker.create('test-channel').publish({ test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockAdapter.sentMessages.length).toBe(0);
    });

    it('should disconnect and clear message subjects', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        broker.get('test-channel').subscribe();

        await mockAdapter.disconnect();
        expect(mockAdapter.isConnected()).toBe(false);
    });

    it('should emit error when adapter sendMessage fails', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        mockAdapter.shouldFailSendMessage = true;
        const adapterId = broker.registerAdapter(mockAdapter);

        const errorPromise = new Promise<void>((resolve) => {
            broker.getErrorStream().subscribe((error: IAdapterError<ITestChannels>) => {
                expect(error.adapterId).toBe(adapterId);
                expect(error.channelName).toBe('test-channel');
                expect(error.message.data).toEqual({ test: 'data' });
                expect(error.error.message).toBe('Mock adapter send failure');
                resolve();
            });
        });

        broker.create('test-channel').publish({ test: 'data' });
        await errorPromise;
    });

    it('should reuse adapter subscriptions when upgrading channel from non-cached to cached', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        broker.registerAdapter(mockAdapter);

        // Spy on getMessageStream to count how many times it's called
        let subscriptionCallCount = 0;
        const originalGetMessageStream = mockAdapter.getMessageStream;
        vi.spyOn(mockAdapter, 'getMessageStream').mockImplementation(() => {
            subscriptionCallCount++;
            return originalGetMessageStream.call(mockAdapter);
        });

        // Create channel without config first
        broker.create('test-channel');

        // Create same channel with config - should reuse adapter subscription
        broker.create('test-channel', { replayCacheSize: 1 });

        // Verify getMessageStream was only called once
        expect(subscriptionCallCount).toBe(1);

        // Verify channel still works with external messages
        const messagePromise = new Promise<void>((resolve) => {
            broker.get('test-channel').subscribe((message) => {
                expect(message.data).toEqual({ test: 'external-data-cached' });
                resolve();
            });
        });

        const externalMessage: IMessage = {
            channelName: 'test-channel',
            data: { test: 'external-data-cached' },
            timestamp: Date.now(),
            id: 'external-id-cached',
            isHandled: false,
        };

        mockAdapter.simulateIncomingMessage(externalMessage);
        await messagePromise;
    });
});
