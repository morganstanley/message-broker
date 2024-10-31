const { plugins } = require('./src/config/base-gatsby-plugins');

module.exports = {
  siteMetadata: {
    title: `Message Broker`,
    description: `a Typescript library which aims to provide asynchronous communication between typescript components`,
    siteUrl: 'https://morganstanley.github.io',
    documentationUrl: false,
    //  documentationUrl: url-of.documentation.site,
  },
  pathPrefix: `/message-broker`, // put GitHub project url slug here e.g. github.com/morganstanley/<project url slug>
  plugins,
};
