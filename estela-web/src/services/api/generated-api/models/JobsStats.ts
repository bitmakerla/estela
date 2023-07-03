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
/**
 * 
 * @export
 * @interface JobsStats
 */
export interface JobsStats {
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    totalJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    waitingJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    runningJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    stoppedJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    completedJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    inQueueJobs?: number;
    /**
     * 
     * @type {number}
     * @memberof JobsStats
     */
    errorJobs?: number;
}

export function JobsStatsFromJSON(json: any): JobsStats {
    return JobsStatsFromJSONTyped(json, false);
}

export function JobsStatsFromJSONTyped(json: any, ignoreDiscriminator: boolean): JobsStats {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'totalJobs': !exists(json, 'total_jobs') ? undefined : json['total_jobs'],
        'waitingJobs': !exists(json, 'waiting_jobs') ? undefined : json['waiting_jobs'],
        'runningJobs': !exists(json, 'running_jobs') ? undefined : json['running_jobs'],
        'stoppedJobs': !exists(json, 'stopped_jobs') ? undefined : json['stopped_jobs'],
        'completedJobs': !exists(json, 'completed_jobs') ? undefined : json['completed_jobs'],
        'inQueueJobs': !exists(json, 'in_queue_jobs') ? undefined : json['in_queue_jobs'],
        'errorJobs': !exists(json, 'error_jobs') ? undefined : json['error_jobs'],
    };
}

export function JobsStatsToJSON(value?: JobsStats | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'total_jobs': value.totalJobs,
        'waiting_jobs': value.waitingJobs,
        'running_jobs': value.runningJobs,
        'stopped_jobs': value.stoppedJobs,
        'completed_jobs': value.completedJobs,
        'in_queue_jobs': value.inQueueJobs,
        'error_jobs': value.errorJobs,
    };
}


