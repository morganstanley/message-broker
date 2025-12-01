# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows [Semantic Versioning](https://semver.org/).

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


