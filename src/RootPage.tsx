import { AppRootProps } from '@grafana/data';
import { Explore } from 'pages/explore';
import React from 'react';

export const RootPage = React.memo(function RootPage(props: AppRootProps) {
  const { path } = props;

  // Required to support grafana instances that use a custom `root_url`.
  const pathWithoutLeadingSlash = path.replace(/^\//, '');

  return <Explore {...props} path={pathWithoutLeadingSlash} />;
});
