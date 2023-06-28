// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

Enzyme.configure({ adapter: new Adapter() });
