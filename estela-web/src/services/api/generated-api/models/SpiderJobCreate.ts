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
    SpiderJobCreateEnvVar,
    SpiderJobCreateEnvVarFromJSON,
    SpiderJobCreateEnvVarFromJSONTyped,
    SpiderJobCreateEnvVarToJSON,
    SpiderJobTag,
    SpiderJobTagFromJSON,
    SpiderJobTagFromJSONTyped,
    SpiderJobTagToJSON,
} from './';

/**
 * 
 * @export
 * @interface SpiderJobCreate
 */
export interface SpiderJobCreate {
    /**
     * A unique integer value identifying this job.
     * @type {number}
     * @memberof SpiderJobCreate
     */
    readonly jid?: number;
    /**
     * Unique job name.
     * @type {string}
     * @memberof SpiderJobCreate
     */
    readonly name?: string;
    /**
     * Job arguments.
     * @type {Array<SpiderJobArg>}
     * @memberof SpiderJobCreate
     */
    args?: Array<SpiderJobArg>;
    /**
     * Job env variables.
     * @type {Array<SpiderJobCreateEnvVar>}
     * @memberof SpiderJobCreate
     */
    envVars?: Array<SpiderJobCreateEnvVar>;
    /**
     * Job tags.
     * @type {Array<SpiderJobTag>}
     * @memberof SpiderJobCreate
     */
    tags?: Array<SpiderJobTag>;
    /**
     * Current job status.
     * @type {string}
     * @memberof SpiderJobCreate
     */
    readonly jobStatus?: string;
    /**
     * Related cron job.
     * @type {number}
     * @memberof SpiderJobCreate
     */
    cronjob?: number | null;
    /**
     * Days before data expires.
     * @type {number}
     * @memberof SpiderJobCreate
     */
    dataExpiryDays?: number;
    /**
     * Data status.
     * @type {string}
     * @memberof SpiderJobCreate
     */
    dataStatus: string;
}

export function SpiderJobCreateFromJSON(json: any): SpiderJobCreate {
    return SpiderJobCreateFromJSONTyped(json, false);
}

export function SpiderJobCreateFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderJobCreate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'jid': !exists(json, 'jid') ? undefined : json['jid'],
        'name': !exists(json, 'name') ? undefined : json['name'],
        'args': !exists(json, 'args') ? undefined : ((json['args'] as Array<any>).map(SpiderJobArgFromJSON)),
        'envVars': !exists(json, 'env_vars') ? undefined : ((json['env_vars'] as Array<any>).map(SpiderJobCreateEnvVarFromJSON)),
        'tags': !exists(json, 'tags') ? undefined : ((json['tags'] as Array<any>).map(SpiderJobTagFromJSON)),
        'jobStatus': !exists(json, 'job_status') ? undefined : json['job_status'],
        'cronjob': !exists(json, 'cronjob') ? undefined : json['cronjob'],
        'dataExpiryDays': !exists(json, 'data_expiry_days') ? undefined : json['data_expiry_days'],
        'dataStatus': json['data_status'],
    };
}

export function SpiderJobCreateToJSON(value?: SpiderJobCreate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'args': value.args === undefined ? undefined : ((value.args as Array<any>).map(SpiderJobArgToJSON)),
        'env_vars': value.envVars === undefined ? undefined : ((value.envVars as Array<any>).map(SpiderJobCreateEnvVarToJSON)),
        'tags': value.tags === undefined ? undefined : ((value.tags as Array<any>).map(SpiderJobTagToJSON)),
        'cronjob': value.cronjob,
        'data_expiry_days': value.dataExpiryDays,
        'data_status': value.dataStatus,
    };
}


