# MessageBroker

MessageBroker provides framework agnostic, decoupled communication between publishers and subscribers. This library is fully type safe and works in both browsers and Node.js. MessageBroker is built ontop of [RxJS](https://rxjs.dev/guide/overview) providing access to observables and a comprehensive list of operators.

## Installation

```typescript
npm install @morgan-stanley/message-broker
```

## TypeScript

Required Typescript version: >3.4

The library depends on TypeScript's support for decorators. Therefore you must enable `experimentalDecorators` and `emitDecoratorMetadata`.

```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

## Polyfills

This library will work with modern browsers and JavaScript run-times without the need for polyfills, however if targeting older browsers you will need to provide a polyfill for the following types. 

* Map - [Read about the Map type here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

This library also makes use of the `reflect-metadata` [API](https://rbuckton.github.io/reflect-metadata/) for performing runtime introspection. Most browsers will not support this therefore you must install this yourself. 

```typescript
npm install reflect-metadata
```

And you should import this module at the root of your application.  

```typescript
import "reflect-metadata";
```

## Using the MessageBroker

An instance of the MessageBroker can be created using the `messagebroker` function. This will return a single instance of the MessageBroker.

#### Example ####

```typescript

import { messagebroker } from "@morgan-stanley/message-broker";

const messagebroker = messagebroker();

```
### Subscribing to a channel

Listening to messages requires a subscription to a channel. Once subscribed any messages published to that channel will be received. Subscribing to a channel is done by calling the `get` function. The `get` function is ideal if you are soley interested in receiving messages. MessageBroker leverages [RxJS](https://rxjs.dev/), the `get` function will return an Observable that can be subscribed to.

```typescript
import { messagebroker } from "@morgan-stanley/message-broker";
import { Subscription } from "rxjs";
	
private subscription: Subscription;

public subscribeToMessages(): void {
    this.subscription  =	messagebroker()
                                .get('myChannelName')
                                .subscribe(
                                    message => {}, // Next handler
                                    () => {}, // Error handler
                                    () => {} // Complete handler
                                );
}

// Clean up.
this._subscription.unsubscribe();

```

### Publishing to a channel

Publishing messages requires a channel, this can be created using the `create` function. If the channel already exists the existing channel will be returned. Once the channel is created a message can be published using the `publish` function. Passing a payload is optional but if you choose to do so a message type can also be passed for more granular filtering.

```typescript

import { messagebroker } from "@morgan-stanley/message-broker";

public publishMessage(): void {

        messagebroker()
            .create('myChannelName')
            .publish(
                { data: 'myData'}, // Payload
                'ApplicationEvent' // Message type
            );
	}
```

### Replay Messages ###

Replaying will allow new subscriptions to receive the latest "n" number of messages. Using the messagebroker config the user can configure how many messages they want to be cached when subscriptions are made. Configs can only be provided when the messagebroker channels are created.

```typescript
import { messagebroker } from "@morgan-stanley/message-broker";

public publishToCachedChannel(): void {
    messagebroker()
        .create('myCachedChannel', {replayCacheSize: 2}) // All subscriptions will receive the two most recent messages.
        .publish(
            { data: 'myData' },
            'ApplicationEvent'
        );
}

```

It is important to note that creating a channel with the same name but with different configurations will throw an error.

### Typing the MessageBroker ###

We recommend typing the messagebroker to avoid unexpected errors during runtime. Typing the messagebroker allows you to specify a contract between the channel name and the payload type that will flow across that channel. This enforces that the types specified on the channel contract must match when using the methods of the messagebroker. If they do not match you will receive compilation errors.

#### Example ####

```typescript

/* Defined our channel contract. */
    export interface IMessageChannels {
        'hello': string;
        'goodbye': undefined;
        'operation1': { foo: string };
    }

    import { messagebroker } from "@morgan-stanley/message-broker";

    const typedMessageBroker = messagebroker<IMessageChannels>();

    //Publish
    typedMessageBroker.create("operation1").publish({foo: "test"}); // OK  
    typedMessageBroker.create("operation1").publish({foo: number}); // Error: foo cannot be set to number  
    typedMessageBroker.create("unknown").publish({foo: "test"}); // Error: invalid channel name

    //Subscribe
    typedMessageBroker.get("hello").subscribe(message => console.log(message.data)); // OK: data will be of type string
    typedMessageBroker.get("invalid").subscribe(message => console.log(message.data)); // Error: invalid channel name		 

```

### RSVP ###

The rsvp methods allow developers to define a request/response model using the messagebroker. The rsvp (publish) overload is synchronous and will ask all responders to respond to the message payload being provided.

### RSVP (Publish) ###

```typescript

/* Defined our channel contract. */
    export interface IMessageChannels extends IRSVPConfig {
        nonRSVPChannel : string;
        rsvp: {
            myRSVPChannel: {
                payload: { data: string };
                response: string[];
            };
    };
    }

    import { messagebroker } from "@morgan-stanley/message-broker";

    const results = messagebroker<IMessageChannels>().rsvp('myRSVPChannel', { data: 'abcde'});		 

```

### RSVP (Respond) ###

```typescript

/* Defined our channel contract. */
    export interface IMessageChannels extends IRSVPConfig {
        nonRSVPChannel : string;
        rsvp: {
            myRSVPChannel: {
                payload: { data: string };
                response: string[];
            };
    };
    }

    import { messagebroker } from "@morgan-stanley/message-broker";

    const results = messagebroker<IMessageChannels>().rsvp('myRSVPChannel', payload => {
        // Perform some work on payload - split string .
        return [...payload]; // Payload and response type enforced by contract.
    });		 

```

### RSVP (Respond) with manual disconnect ###

```typescript

/* Defined our channel contract. */
    export interface IMessageChannels extends IRSVPConfig {
        nonRSVPChannel : string;
        rsvp: {
            myRSVPChannel: {
                payload: { data: string };
                response: string[];
            };
    };
    }

    import { messagebroker } from "@morgan-stanley/message-broker";

    const results = messagebroker<IMessageChannels>().rsvp('myRSVPChannel', payload => this.doWork(payload));		
    
    // Manually disconnect the responder to avoid handling further rsvp requests.
    responder.disconnect();

```

### Dependency Injection (DI)

The MessageBroker class is decorated with `@Injectable` from @morgan-stanley/needle. This means that it can be
constructed by different DI frameworks. For more information please refer to the documentation [here](https://github.com/morganstanley/needle "Needle documentation")

## Development

Here are a list of commands to run if you are interested in developing or contributing to the project. For guidelines on how to contribute please click [here](./CONTRIBUTING.md).

```typescript

npm install // Install all package dependencies.

npm run test // Run tests on the command line.

npm run watch-test // Run tests in watch mode.

npm run lint // Checks the code for lint errors.

npm run build // Run a simple build.

npm run watch-build // Run build in watch mode.

npm run build-release // Run a full build (Compile, Tests, Lint).

```