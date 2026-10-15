import { EMPTY } from 'rxjs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { IMessage, IMessageBrokerAdapter, IMessageOptions } from '../../main/contracts/contracts.js';
import { MessageBroker } from '../../main/core/messageBroker.js';

interface UserMetadata {
    user: string;
}

describe('metadata defaults', () => {
    it('accepts interface metadata in default messages, options and adapters', async () => {
        const broker = new MessageBroker<{ greeting: string }>();
        const metadata: UserMetadata = { user: 'bob' };
        const typedOptions: IMessageOptions<'greeting', UserMetadata> = { type: 'greeting', metadata };
        const options: IMessageOptions = typedOptions;
        const typedMessage = broker.createMessage('greeting', 'hello', typedOptions);
        const message: IMessage = typedMessage;
        const received: IMessage[] = [];
        const adapter: IMessageBrokerAdapter<{ greeting: string }> = {
            connect: async () => undefined,
            disconnect: async () => undefined,
            isConnected: () => true,
            getMessageStream: () => EMPTY,
            sendMessage: async (incoming: IMessage) => {
                received.push(incoming);
            },
        };

        await adapter.sendMessage(typedMessage);

        expectTypeOf<IMessage['metadata']>().toEqualTypeOf<object | undefined>();
        expectTypeOf<IMessageOptions['metadata']>().toEqualTypeOf<object | undefined>();
        expectTypeOf(typedMessage.metadata).toEqualTypeOf<UserMetadata | undefined>();
        expectTypeOf(typedMessage.type).toEqualTypeOf<'greeting' | undefined>();
        expect(options.metadata).toBe(metadata);
        expect(message.metadata).toBe(metadata);
        expect(received).toEqual([message]);
    });

    it('retains explicit dictionary metadata', () => {
        const options: IMessageOptions<string, Record<string, unknown>> = { metadata: { user: 'bob' } };
        expectTypeOf(options.metadata?.user).toEqualTypeOf<unknown>();
        expect(options.metadata?.user).toBe('bob');
    });
});
