import { ComponentClass } from 'react';
import { KalDbConfigCtrl } from './legacy/config';
import { AppPlugin, AppRootProps } from '@grafana/data';
import { RootPage } from './RootPage';
import { KalDbSettings } from './types';
export { KalDbConfigCtrl as ConfigCtrl };

export const plugin = new AppPlugin<KalDbSettings>().setRootPage(RootPage as unknown as ComponentClass<AppRootProps>);
