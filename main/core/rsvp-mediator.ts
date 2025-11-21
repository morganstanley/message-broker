import { Injectable } from '@morgan-stanley/needle';
import { v4 as uuid } from 'uuid';

import { IResponderRef, RSVPHandler, RSVPOf, RSVPPayload, RSVPResponse } from '../contracts/contracts.js';

interface IResponderRefInternal extends IResponderRef {
    execute: (payload: any) => any;
}

type ResponderLookup<T> = { [P in keyof T]?: IResponderRefInternal[] };

/**
 * Handles the lifecycle and execution of RSVP handlers.
 */
@Injectable({ metadata: [] })
export class ResponseBroker<T> {
    private rsvps: ResponderLookup<RSVPOf<T>> = {};

    // Accepts a channelName and a payload or a handler. Passing a payload will invoke the execute function on every registered handler with the
    // payload as an argument. Passing a handler function will return an object that returns a reference to the
    // handler and a disconnect function.
    public rsvp<K extends keyof RSVPOf<T>>(
        channelName: K,
        payloadOrHandler: RSVPPayload<T> | RSVPHandler<T>,
    ): IResponderRef | RSVPResponse<T>[] {
        let responders = this.rsvps[channelName];
        if (responders == null) {
            responders = this.rsvps[channelName] = [];
        }

        if (typeof payloadOrHandler === 'function') {
            const id = uuid();
            const disconnect = (): void => this.disconnect.bind(this)(channelName, id);
            const responderRef: IResponderRefInternal = {
                execute: payloadOrHandler,
                id,
                disconnect,
            };
            responders.push(responderRef);
            return responderRef;
        } else {
            // call the execute function for every responder with the "payload"
            return responders.map((r) => r.execute(payloadOrHandler));
        }
    }

    private disconnect<K extends keyof RSVPOf<T>>(channel: K, id: string): void {
        const responders = (this.rsvps[channel] = (this.rsvps[channel] ?? []).filter((r) => r.id !== id));
        if (responders.length === 0) {
            delete this.rsvps[channel];
        }
    }
}
