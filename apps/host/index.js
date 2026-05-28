/**
 * @format
 *
 * Synchronous Module Federation host entry (mirrors Re.Pack's tester-federation-v2 host).
 * Shared singletons are declared `eager: true` for the host in mf-shared.mjs, so the MF runtime
 * initialises the share scope before this entry's imports consume them; no async boundary is
 * needed. Importing scriptManager first wires the MMKV-backed script cache before any remote
 * loads.
 */
import './global.css';
import './src/shell/scriptManager';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
