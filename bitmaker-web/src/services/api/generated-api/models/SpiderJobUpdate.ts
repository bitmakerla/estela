/* tslint:disable */
/* eslint-disable */
/**
 * Bitmaker API v1.0 Documentation
 * Bitmaker API Swagger Specification
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
 * @interface SpiderJobUpdate
 */
export interface SpiderJobUpdate {
    /**
     * 
     * @type {number}
     * @memberof SpiderJobUpdate
     */
    readonly jid?: number;
    /**
     * 
     * @type {string}
     * @memberof SpiderJobUpdate
     */
    status?: SpiderJobUpdateStatusEnum;
    /**
     * 
     * @type {number}
     * @memberof SpiderJobUpdate
     */
    lifespan?: number;
    /**
     * 
     * @type {number}
     * @memberof SpiderJobUpdate
     */
    totalResponseBytes?: number;
    /**
     * 
     * @type {number}
     * @memberof SpiderJobUpdate
     */
    itemCount?: number;
    /**
     * 
     * @type {number}
     * @memberof SpiderJobUpdate
     */
    requestCount?: number;
}

/**
* @export
* @enum {string}
*/
export enum SpiderJobUpdateStatusEnum {
    InQueue = 'IN_QUEUE',
    Waiting = 'WAITING',
    Running = 'RUNNING',
    Stopped = 'STOPPED',
    Incomplete = 'INCOMPLETE',
    Cancelled = 'CANCELLED',
    Completed = 'COMPLETED',
    Error = 'ERROR'
}

export function SpiderJobUpdateFromJSON(json: any): SpiderJobUpdate {
    return SpiderJobUpdateFromJSONTyped(json, false);
}

export function SpiderJobUpdateFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderJobUpdate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'jid': !exists(json, 'jid') ? undefined : json['jid'],
        'status': !exists(json, 'status') ? undefined : json['status'],
        'lifespan': !exists(json, 'lifespan') ? undefined : json['lifespan'],
        'totalResponseBytes': !exists(json, 'total_response_bytes') ? undefined : json['total_response_bytes'],
        'itemCount': !exists(json, 'item_count') ? undefined : json['item_count'],
        'requestCount': !exists(json, 'request_count') ? undefined : json['request_count'],
    };
}

export function SpiderJobUpdateToJSON(value?: SpiderJobUpdate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'status': value.status,
        'lifespan': value.lifespan,
        'total_response_bytes': value.totalResponseBytes,
        'item_count': value.itemCount,
        'request_count': value.requestCount,
    };
}


