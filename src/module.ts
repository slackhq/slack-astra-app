import { AppPlugin } from '@grafana/data';
import { Explore } from './pages';

export const plugin = new AppPlugin<{}>().setRootPage(Explore);
