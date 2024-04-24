const { plugins } = require('./src/config/base-gatsby-plugins');

module.exports = {
  siteMetadata: {
    title: `Message Broker`,
    description: `The Message Broker is a Typescript library which aims to provide asynchronous communication between typescript components.`,
    siteUrl: 'http://opensource.morganstanley.com/message-broker',
    documentationUrl: false,
    //  documentationUrl: url-of.documentation.site,
  },
  pathPrefix: `/message-broker`, // include subdirectory
  plugins,
};
