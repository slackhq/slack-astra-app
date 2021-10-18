import { AppRootProps } from '@grafana/data';
import { Explore } from './explore';

export type PageDefinition = {
  component: React.FC<AppRootProps>;
  icon: string;
  id: string;
  text: string;
};

export const pages: PageDefinition[] = [
  {
    component: Explore,
    icon: 'file-alt',
    id: 'explore',
    text: 'Explore',
  },
];
