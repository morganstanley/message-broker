# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-10-13

### Added

- `IMessage` now has optional `messageSource` (`string[]`) and `metadata` properties. `metadata` is free-form and is not interpreted by the message broker. `IMessage`, `IMessageOptions` and `createMessage` accept a `TMetadata extends object` generic (defaults to `object`), so interfaces can be used as well as type aliases without a string index signature. Narrow `metadata` before accessing its properties, or supply an explicit metadata type. `publish`, `collate`, `ResponseHandler` and `IAdapter.sendMessage` accept the same `TType`/`TMetadata` generics
- added `IMessageOptions` (`type`, `messageSource`, `metadata`)
- `publish` and `createMessage` now accept either a message type string (as before) or an `IMessageOptions` object:

```ts
channel.publish(data, 'myType'); // still supported

channel.publish(data, { type: 'myType', messageSource: ['my-component'], metadata: { user: 'bob' } });
```

- subscribers can narrow `metadata` with a type predicate:

```ts
const hasUser = (m: IMessage): m is IMessage<any, string, string, { user: string }> =>
    typeof m.metadata?.user === 'string';

channel.stream.pipe(filter(hasUser)).subscribe((m) => m.metadata?.user);
```

- `ResponseHandler` handlers now optionally receive `IMessageOptions` as a second argument, supplied via the new optional third argument of `collate`

## [2.0.0] - 2025-11-21

### Breaking

- remove `rsvp` support from `IMessageBroker`
- renamed all `RSVP` interfaces
- tightened interfaces for definition of messaging channels for `IMessageBroker` and `IMessageBrokerAdapter`
- removed `initialize` from `IMessageBrokerAdapter`
- moved library to ESM

### Added
- Added `createMessage` function to `IMessageBroker`
- message broker now calls `connect` and `disconnect` on registered adapters
- added `ResponseBroker` in place of old rsvp functionality:

```ts

interface IMyAppResponseChannels {
    channelOne: {
        payload: MyCustomPayloadOne;
        response: MyCustomResponseOne;
    }
    channelTwo: {
        payload: MyCustomPayloadTwo;
        response: MyCustomResponseTwo;
    }
}

const responseBroker = new ResponseBroker<IMyAppResponseChannels>();

// listen for response requests

responseBroker.registerResponder("channelOne", (payload: MyCustomPayloadOne) => {
    const response: MyCustomResponseOne = generateResponse();

    return response;
});

// collate responses from multiple registered responders

const payload: MyCustomPayloadOne = generatePayload();

const result: ResponseReply<MyCustomResponseOne>[] = responseBroker.collate("channelOne", payload);

```


