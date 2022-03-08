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
 * @interface SpiderCronJobUpdate
 */
export interface SpiderCronJobUpdate {
    /**
     * 
     * @type {number}
     * @memberof SpiderCronJobUpdate
     */
    readonly cjid?: number;
    /**
     * 
     * @type {string}
     * @memberof SpiderCronJobUpdate
     */
    status?: SpiderCronJobUpdateStatusEnum;
    /**
     * 
     * @type {string}
     * @memberof SpiderCronJobUpdate
     */
    schedule?: string;
    /**
     * 
     * @type {boolean}
     * @memberof SpiderCronJobUpdate
     */
    uniqueCollection?: boolean;
}

/**
* @export
* @enum {string}
*/
export enum SpiderCronJobUpdateStatusEnum {
    Active = 'ACTIVE',
    Disabled = 'DISABLED'
}

export function SpiderCronJobUpdateFromJSON(json: any): SpiderCronJobUpdate {
    return SpiderCronJobUpdateFromJSONTyped(json, false);
}

export function SpiderCronJobUpdateFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderCronJobUpdate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'cjid': !exists(json, 'cjid') ? undefined : json['cjid'],
        'status': !exists(json, 'status') ? undefined : json['status'],
        'schedule': !exists(json, 'schedule') ? undefined : json['schedule'],
        'uniqueCollection': !exists(json, 'unique_collection') ? undefined : json['unique_collection'],
    };
}

export function SpiderCronJobUpdateToJSON(value?: SpiderCronJobUpdate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'status': value.status,
        'schedule': value.schedule,
        'unique_collection': value.uniqueCollection,
    };
}

