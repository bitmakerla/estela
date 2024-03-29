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
    SpiderJobArg,
    SpiderJobArgFromJSON,
    SpiderJobArgFromJSONTyped,
    SpiderJobArgToJSON,
    SpiderJobEnvVar,
    SpiderJobEnvVarFromJSON,
    SpiderJobEnvVarFromJSONTyped,
    SpiderJobEnvVarToJSON,
    SpiderJobTag,
    SpiderJobTagFromJSON,
    SpiderJobTagFromJSONTyped,
    SpiderJobTagToJSON,
    Stats,
    StatsFromJSON,
    StatsFromJSONTyped,
    StatsToJSON,
} from './';

/**
 * 
 * @export
 * @interface SpiderJobStats
 */
export interface SpiderJobStats {
    /**
     * A unique integer value identifying this job.
     * @type {number}
     * @memberof SpiderJobStats
     */
    readonly jid?: number;
    /**
     * 
     * @type {string}
     * @memberof SpiderJobStats
     */
    readonly spider?: string;
    /**
     * Job creation date.
     * @type {Date}
     * @memberof SpiderJobStats
     */
    readonly created?: Date;
    /**
     * Unique job name.
     * @type {string}
     * @memberof SpiderJobStats
     */
    readonly name?: string;
    /**
     * The elapsed seconds the spider job was running.
     * @type {number}
     * @memberof SpiderJobStats
     */
    lifespan?: number;
    /**
     * The total bytes received in responses.
     * @type {number}
     * @memberof SpiderJobStats
     */
    totalResponseBytes?: number;
    /**
     * The number of items extracted in the job.
     * @type {number}
     * @memberof SpiderJobStats
     */
    itemCount?: number;
    /**
     * The number of requests made by the spider job.
     * @type {number}
     * @memberof SpiderJobStats
     */
    requestCount?: number;
    /**
     * Job arguments.
     * @type {Array<SpiderJobArg>}
     * @memberof SpiderJobStats
     */
    args?: Array<SpiderJobArg>;
    /**
     * Job env variables.
     * @type {Array<SpiderJobEnvVar>}
     * @memberof SpiderJobStats
     */
    envVars?: Array<SpiderJobEnvVar>;
    /**
     * Job tags.
     * @type {Array<SpiderJobTag>}
     * @memberof SpiderJobStats
     */
    tags?: Array<SpiderJobTag>;
    /**
     * Current job status.
     * @type {string}
     * @memberof SpiderJobStats
     */
    readonly jobStatus?: string;
    /**
     * Related cron job.
     * @type {number}
     * @memberof SpiderJobStats
     */
    cronjob?: number | null;
    /**
     * Days before data is deleted.
     * @type {number}
     * @memberof SpiderJobStats
     */
    dataExpiryDays?: number | null;
    /**
     * Data status.
     * @type {string}
     * @memberof SpiderJobStats
     */
    dataStatus?: SpiderJobStatsDataStatusEnum;
    /**
     * 
     * @type {Stats}
     * @memberof SpiderJobStats
     */
    stats: Stats;
}

/**
* @export
* @enum {string}
*/
export enum SpiderJobStatsDataStatusEnum {
    Persistent = 'PERSISTENT',
    Pending = 'PENDING',
    Deleted = 'DELETED'
}

export function SpiderJobStatsFromJSON(json: any): SpiderJobStats {
    return SpiderJobStatsFromJSONTyped(json, false);
}

export function SpiderJobStatsFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderJobStats {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'jid': !exists(json, 'jid') ? undefined : json['jid'],
        'spider': !exists(json, 'spider') ? undefined : json['spider'],
        'created': !exists(json, 'created') ? undefined : (new Date(json['created'])),
        'name': !exists(json, 'name') ? undefined : json['name'],
        'lifespan': !exists(json, 'lifespan') ? undefined : json['lifespan'],
        'totalResponseBytes': !exists(json, 'total_response_bytes') ? undefined : json['total_response_bytes'],
        'itemCount': !exists(json, 'item_count') ? undefined : json['item_count'],
        'requestCount': !exists(json, 'request_count') ? undefined : json['request_count'],
        'args': !exists(json, 'args') ? undefined : ((json['args'] as Array<any>).map(SpiderJobArgFromJSON)),
        'envVars': !exists(json, 'env_vars') ? undefined : ((json['env_vars'] as Array<any>).map(SpiderJobEnvVarFromJSON)),
        'tags': !exists(json, 'tags') ? undefined : ((json['tags'] as Array<any>).map(SpiderJobTagFromJSON)),
        'jobStatus': !exists(json, 'job_status') ? undefined : json['job_status'],
        'cronjob': !exists(json, 'cronjob') ? undefined : json['cronjob'],
        'dataExpiryDays': !exists(json, 'data_expiry_days') ? undefined : json['data_expiry_days'],
        'dataStatus': !exists(json, 'data_status') ? undefined : json['data_status'],
        'stats': StatsFromJSON(json['stats']),
    };
}

export function SpiderJobStatsToJSON(value?: SpiderJobStats | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'lifespan': value.lifespan,
        'total_response_bytes': value.totalResponseBytes,
        'item_count': value.itemCount,
        'request_count': value.requestCount,
        'args': value.args === undefined ? undefined : ((value.args as Array<any>).map(SpiderJobArgToJSON)),
        'env_vars': value.envVars === undefined ? undefined : ((value.envVars as Array<any>).map(SpiderJobEnvVarToJSON)),
        'tags': value.tags === undefined ? undefined : ((value.tags as Array<any>).map(SpiderJobTagToJSON)),
        'cronjob': value.cronjob,
        'data_expiry_days': value.dataExpiryDays,
        'data_status': value.dataStatus,
        'stats': StatsToJSON(value.stats),
    };
}


