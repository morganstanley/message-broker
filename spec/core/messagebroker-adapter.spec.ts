
import { IMocked, Mock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { Observable, Subject } from 'rxjs';
import { MessageBroker } from '../../main/core/messagebroker';
import { RSVPMediator } from '../../main/core/rsvp-mediator';
import { IMessage, IMessageBroker, IMessageBrokerAdapter } from '../../main/contracts/contracts';

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

    async initialize(): Promise<void> {}

    async connect(): Promise<void> {
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        this.messageSubjects.clear();
    }

    async sendMessage(channelName: keyof ITestChannels, message: IMessage): Promise<void> {
        if (this.connected) {
            this.sentMessages.push({ channel: channelName, message });
        }
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
    let mockRSVPMediator: IMocked<RSVPMediator<ITestChannels>>
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
            isHandled: false
        };

        mockAdapter.simulateIncomingMessage('test-channel', externalMessage);
        
        await messagePromise;
    });

    it('should not send messages to disconnected adapter', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        await mockAdapter.disconnect();

        broker.create('test-channel').publish({ test: 'data' });

        expect(mockAdapter.sentMessages.length).toBe(0);
    });

    it('should disconnect and clear message subjects', async () => {
        await mockAdapter.initialize();
        await mockAdapter.connect();
        
        broker.get('test-channel').subscribe();
        
        await mockAdapter.disconnect();
        
        expect(mockAdapter.isConnected()).toBe(false);
    });
});
