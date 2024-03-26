import React from 'react';
import { MDXProvider } from '@mdx-js/react';

import { HeaderLinks } from '../constants/header-links';
import { ShortCodes } from '../constants/mdx-shortcodes';

import Header from './header';
import Footer from './footer';
import Seo from './seo';

function Layout({ data, location, children }) {
  const { documentationUrl, title } = data.site.siteMetadata;

  if (documentationUrl) {
    HeaderLinks.Documentation = documentationUrl;
  }

  return (
    <>
      <Seo title={title} />
      <header className="header-main">
        <Header location={location} links={HeaderLinks} />
      </header>
      <main className="body-main">
        <MDXProvider components={ShortCodes}>{children}</MDXProvider>
      </main>
      <Footer />
    </>
  );
}

export default Layout;
