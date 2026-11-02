// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
import { TextDecoder, TextEncoder } from 'util';
import Enzyme from 'enzyme';
import Adapter from '@cfaester/enzyme-adapter-react-18';

// React 18's react-dom/server (loaded by @grafana/ui) needs these, and jsdom doesn't provide them.
Object.assign(global, { TextDecoder, TextEncoder });

Enzyme.configure({ adapter: new Adapter() });
