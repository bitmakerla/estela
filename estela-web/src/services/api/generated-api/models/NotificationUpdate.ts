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
 * @interface NotificationUpdate
 */
export interface NotificationUpdate {
    /**
     * A unique integer value identifying each notification
     * @type {number}
     * @memberof NotificationUpdate
     */
    readonly nid?: number;
    /**
     * Whether the notification was seen.
     * @type {boolean}
     * @memberof NotificationUpdate
     */
    seen?: boolean;
}

export function NotificationUpdateFromJSON(json: any): NotificationUpdate {
    return NotificationUpdateFromJSONTyped(json, false);
}

export function NotificationUpdateFromJSONTyped(json: any, ignoreDiscriminator: boolean): NotificationUpdate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'nid': !exists(json, 'nid') ? undefined : json['nid'],
        'seen': !exists(json, 'seen') ? undefined : json['seen'],
    };
}

export function NotificationUpdateToJSON(value?: NotificationUpdate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'seen': value.seen,
    };
}


