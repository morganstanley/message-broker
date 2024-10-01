# MessageBroker
![Lifecycle Active](https://badgen.net/badge/Lifecycle/Active/green)
![NPM](https://img.shields.io/npm/l/@morgan-stanley/message-broker)
![npm](https://img.shields.io/npm/v/@morgan-stanley/message-broker)
![NPM](https://img.shields.io/badge/types-TypeScript-blue)
[![Build Status](https://github.com/morganstanley/message-broker/actions/workflows/build.yml/badge.svg)](https://github.com/morganstanley/message-broker/actions/workflows/build.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/morganstanley/message-broker/badge)](https://securityscorecards.dev/viewer/?uri=github.com/morganstanley/message-broker)

MessageBroker provides framework agnostic, decoupled communication between publishers and subscribers. This library is fully type safe and works in both browsers and Node.js. MessageBroker is built ontop of [RxJS](https://rxjs.dev/guide/overview) providing access to observables and a comprehensive list of operators.

Full documentation can be found at http://opensource.morganstanley.com/message-broker/

## Basic Usage

First, install the message-broker

```bash
npm install @morgan-stanley/message-broker
```

then you can start sending and receiving messages like this

```typescript
import { messagebroker, IMessageBroker } from '@morgan-stanley/message-broker';

interface IContracts {
    myChannel: {
        payload: string;
    };
}

const broker: IMessageBroker<IContracts> = messagebroker<IContracts>();

broker.get('myChannel').subscribe((message) => {
    console.log(message.payload);
});

broker.create('myChannel').publish({
    payload: 'My first message using the MessageBroker!',
});
```

## Development

For guidelines on how to contribute please click [here](./CONTRIBUTING.md).
Here are a list of commands to run if you are interested in developing or contributing to the project.

```typescript

npm install // Install all package dependencies.

npm run test // Run tests on the command line.

npm run watch-test // Run tests in watch mode.

npm run lint // Checks the code for lint errors.

npm run build // Run a simple build.

npm run watch-build // Run build in watch mode.

npm run build-release // Run a full build (Compile, Tests, Lint).

```
