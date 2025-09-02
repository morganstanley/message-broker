import { IMocked, Mock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { Observable, Subject } from 'rxjs';
import { MessageBroker } from '../../main/core/messagebroker';
import { RSVPMediator } from '../../main/core/rsvp-mediator';
import { IMessage, IMessageBroker, IMessageBrokerAdapter, IAdapterError } from '../../main/contracts/contracts';

interface ITestChannels {
    'test-channel': {
        test: string;
    };
    'external-channel': {
        external: string;
    };
}

class MockAdapter implements IMessageBrokerAdapter<ITestChannels> {
    public readonly id: string = 'mock-adapter';

    private connected: boolean = false;
    private messageSubjects: Map<string, Subject<IMessage>> = new Map();
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
        this.messageSubjects.clear();
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

    subscribeToMessages(channelName: keyof ITestChannels): Observable<IMessage> {
        if (!this.messageSubjects.has(channelName)) {
            this.messageSubjects.set(channelName, new Subject<IMessage>());
        }
        return this.messageSubjects.get(channelName)!.asObservable();
    }

    isConnected(): boolean {
        return this.connected;
    }

    public simulateIncomingMessage(channelName: keyof ITestChannels, message: IMessage): void {
        const subject = this.messageSubjects.get(channelName);
        if (subject) {
            subject.next(message);
        }
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
        expect(adapters).toContain(mockAdapter);
        expect(adapters.length).toBe(1);
    });

    it('should unregister adapter successfully', () => {
        broker.registerAdapter(mockAdapter);
        broker.unregisterAdapter(mockAdapter.id);

        const adapters = broker.getAdapters();
        expect(adapters.length).toBe(0);
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

    it('should receive messages from adapter subscription', (done) => {
        mockAdapter.initialize().then(() => {
            mockAdapter.connect().then(() => {
                broker.registerAdapter(mockAdapter);

                broker.get('test-channel').subscribe((message) => {
                    expect(message.data).toEqual({ test: 'external-data' });
                    done();
                });

                const externalMessage: IMessage = {
                    channelName: 'test-channel',
                    data: { test: 'external-data' },
                    timestamp: Date.now(),
                    id: 'external-id',
                    isHandled: false,
                };

                mockAdapter.simulateIncomingMessage('test-channel', externalMessage);
            });
        });
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

    it('should emit error when adapter sendMessage fails', (done) => {
        mockAdapter.initialize().then(() => {
            mockAdapter.connect().then(() => {
                mockAdapter.shouldFailSendMessage = true;
                broker.registerAdapter(mockAdapter);

                broker.getErrorStream().subscribe((error: IAdapterError<ITestChannels>) => {
                    expect(error.adapterId).toBe('mock-adapter');
                    expect(error.channelName).toBe('test-channel');
                    expect(error.message.data).toEqual({ test: 'data' });
                    expect(error.error.message).toBe('Mock adapter send failure');
                    done();
                });

                broker.create('test-channel').publish({ test: 'data' });
            });
        });
    });
});
