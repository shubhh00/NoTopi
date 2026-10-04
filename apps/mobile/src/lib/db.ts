import { loadDb, type Db } from '@notopi/engine';
import bundled from '../../../../patterns/dist/in.json';

/**
 * Scam patterns shipped inside the app. The same file is published on GitHub, so a later
 * version can download fresh patterns without an app update.
 */
export const db: Db = loadDb(bundled);
