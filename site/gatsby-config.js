const { plugins } = require('./src/config/base-gatsby-plugins');

module.exports = {
  siteMetadata: {
    title: `Project GitHub Pages Template`,
    description: `Morgan Stanley Open Source Software`,
    siteUrl: 'http://opensource.morganstanley.com',
    documentationUrl: false,
    //  documentationUrl: url-of.documentation.site,
  },
  pathPrefix: `/`, // put GitHub project url slug here e.g. github.com/morganstanley/<project url slug>
  plugins,
};
