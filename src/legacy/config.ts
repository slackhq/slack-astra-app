import { PluginMeta } from '@grafana/data';

export class KalDbConfigCtrl {
  static template = '<h2>KalDb Config</h2>';

  appEditCtrl: any;
  appModel?: PluginMeta;

  /** @ngInject */
  constructor($scope: any, $injector: any) {
    this.appEditCtrl.setPostUpdateHook(this.postUpdate.bind(this));

    // Make sure it has a JSON Data spot
    if (!this.appModel) {
      this.appModel = {} as PluginMeta;
    }

    // Required until we get the types sorted on appModel :(
    const appModel = this.appModel as any;
    if (!appModel.jsonData) {
      appModel.jsonData = {};
    }
  }

  postUpdate() {
    if (!this.appModel?.enabled) {
      // not enabled
      return;
    }

    // use _this_ to do handle anything after update
  }
}
