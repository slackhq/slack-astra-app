import { AppPlugin } from '@grafana/data';
import { initPluginTranslations } from '@grafana/i18n';
import { loadResources } from '@grafana/scenes';
import { Explore } from './pages';
import pluginJson from './plugin.json';

// @grafana/i18n is bundled, not shared with the host, so scenes' t() needs this
// copy initialized. Not awaited, to avoid a top-level await in the AMD bundle; setup
// finishes before the page first renders, and scenes strings fall back to their
// English defaults until the resources load.
initPluginTranslations(pluginJson.id, [loadResources]);

export const plugin = new AppPlugin<{}>().setRootPage(Explore);
