import 'reflect-metadata';
[
    (require as any).context('./', true, /\.spec\.ts$/),
    (require as any).context('../main', true, /\.ts$/), // update path to source root, add additional roots below
].forEach((context) => context.keys().map(context));
