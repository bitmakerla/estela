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
 * @interface ProjectStats
 */
export interface ProjectStats {
    /**
     * 
     * @type {Date}
     * @memberof ProjectStats
     */
    date: Date;
    /**
     * 
     * @type {Stats}
     * @memberof ProjectStats
     */
    stats: Stats;
}

export function ProjectStatsFromJSON(json: any): ProjectStats {
    return ProjectStatsFromJSONTyped(json, false);
}

export function ProjectStatsFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProjectStats {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'date': (new Date(json['date'])),
        'stats': StatsFromJSON(json['stats']),
    };
}

export function ProjectStatsToJSON(value?: ProjectStats | null): any {
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


