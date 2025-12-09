import { describe, expect, it, vi } from 'vitest';

import { IResponseChannels } from '../../main/contracts/contracts.js';
import { ResponseBroker } from '../../main/core/responseBroker.js';

vi.mock('uuid', () => ({ v4: () => 'mockedId' }));

describe('ResponseBroker', () => {
    function getInstance<T extends IResponseChannels>(): ResponseBroker<T> {
        return new ResponseBroker<T>();
    }

    interface MockConfig extends IResponseChannels {
        rsvpChannel: {
            payload: { data: string };
            response: 'one' | 'two' | 'three';
        };
        noMatchChannel: {
            payload: { data: string };
            response: 'A' | 'B' | 'C';
        };
        stringChannel: {
            payload: { data: string };
            response: string;
        };
    }

    it('should create instance', () => {
        const instance = getInstance();
        expect(instance).toBeDefined();
    });

    it('should return empty array when invoking rsvp (publish) with no responders', () => {
        const instance = getInstance<MockConfig>();

        const results = instance.collate('rsvpChannel', { data: 'bar' });

        expect(results).toBeDefined();
        expect(results.length).toBe(0);
    });

    it('should invoke the responders handler when rsvp (publish) invoked', () => {
        const instance = getInstance<MockConfig>();

        let invoked = false;
        instance.registerResponder('rsvpChannel', () => {
            invoked = true;
            return 'one' as const;
        });

        const results = instance.collate('rsvpChannel', { data: 'bar' });

        expect(results).toEqual(['one']);
        expect(invoked).toBe(true);
    });

    it('should pass the correct payload to the handler and return the correct response', () => {
        const instance = getInstance<MockConfig>();

        instance.registerResponder('stringChannel', (value) => {
            // charAt ensures that payload is correctly typed as astring
            return `${value.data}_${value.data.charAt(0)}-RESPONDED`;
        });

        const results = instance.collate('stringChannel', { data: 'payloadValue' });

        expect(results).toEqual(['payloadValue_p-RESPONDED']);
    });

    it('should NOT return the responders response when channel names do not match', () => {
        const instance = getInstance<MockConfig>();
        instance.registerResponder('noMatchChannel', () => {
            return 'A' as const;
        });

        const results = instance.collate('rsvpChannel', { data: 'bar' });

        expect(results).toEqual([]);
    });

    it('should return a responder ref when rsvp (subscribe) invoked', () => {
        const instance = getInstance<MockConfig>();

        const responder = instance.registerResponder('rsvpChannel', () => {
            return 'one' as const;
        });

        expect(responder).toBeDefined();
        expect(responder.id).toBe('mockedId');
        expect(responder.disconnect).toBeDefined();
    });

    it('should not invoke the responder handler if the responder has called disconnect', () => {
        const instance = getInstance<MockConfig>();

        const responder = instance.registerResponder('rsvpChannel', () => {
            return 'two' as const;
        });

        responder.disconnect();

        const results = instance.collate('rsvpChannel', { data: 'bar' });

        expect(results).toEqual([]);
    });

    it('should not throw error when disconnecting multiple times', () => {
        const instance = getInstance<MockConfig>();

        const responder1 = instance.registerResponder('rsvpChannel', () => {
            return 'three' as const;
        });

        instance.collate('rsvpChannel', { data: 'bar' });

        responder1.disconnect();
        expect(() => responder1.disconnect()).not.toThrowError();
    });
});
