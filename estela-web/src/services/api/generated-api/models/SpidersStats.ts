/* tslint:disable */
/* eslint-disable */
/**
 * estela API v1.0 Documentation
 * estela API Swagger Specification
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import {
    Stats,
    StatsFromJSON,
    StatsFromJSONTyped,
    StatsToJSON,
} from './';

/**
 * 
 * @export
 * @interface SpidersStats
 */
export interface SpidersStats {
    /**
     * 
     * @type {Date}
     * @memberof SpidersStats
     */
    date: Date;
    /**
     * 
     * @type {Stats}
     * @memberof SpidersStats
     */
    stats: Stats;
}

export function SpidersStatsFromJSON(json: any): SpidersStats {
    return SpidersStatsFromJSONTyped(json, false);
}

export function SpidersStatsFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpidersStats {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'date': (new Date(json['date'])),
        'stats': StatsFromJSON(json['stats']),
    };
}

export function SpidersStatsToJSON(value?: SpidersStats | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'date': (value.date.toISOString().substr(0,10)),
        'stats': StatsToJSON(value.stats),
    };
}


