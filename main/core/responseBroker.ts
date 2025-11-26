import { Injectable } from '@morgan-stanley/needle';
import { v4 as uuid } from 'uuid';

import {
    IResponderRef,
    IResponseBroker,
    IResponseChannels,
    ResponseHandler,
    ResponsePayload,
    ResponseReply,
} from '../contracts/contracts.js';

interface IResponderRefInternal extends IResponderRef {
    execute: (payload: any) => any;
}

type ResponderLookup<T extends IResponseChannels> = { [P in keyof T]?: IResponderRefInternal[] };

/**
 * Allows multiple responses to be collated from registered responders for a given channel.
 */
@Injectable({ metadata: [] })
export class ResponseBroker<T extends IResponseChannels> implements IResponseBroker<T> {
    private responders: ResponderLookup<T> = {};

    public collate<K extends keyof T>(channelName: K, payload: ResponsePayload<T, K>): ResponseReply<T, K>[] {
        // call the execute function for every responder with the "payload"
        return this.responders[channelName]?.map((r) => r.execute(payload)) ?? [];
    }

    public registerResponder<K extends keyof T>(channelName: K, handler: ResponseHandler<T, K>): IResponderRef {
        const responders = (this.responders[channelName] = this.responders[channelName] ?? []);

        const id = uuid();
        const disconnect = (): void => this.disconnect.bind(this)(channelName, id);
        const responderRef: IResponderRefInternal = {
            execute: handler,
            id,
            disconnect,
        };
        responders.push(responderRef);
        return responderRef;
    }

    private disconnect<K extends keyof T>(channel: K, id: string): void {
        const responders = this.responders[channel];

        if (responders === undefined) {
            return;
        }

        const responderIndex = responders.findIndex((responder) => responder.id === id);
        responders.splice(responderIndex, 1);

        if (responders.length === 0) {
            delete this.responders[channel];
        }
    }
}
