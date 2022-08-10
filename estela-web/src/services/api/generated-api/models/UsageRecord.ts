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
 * @interface UsageRecord
 */
export interface UsageRecord {
    /**
     * 
     * @type {Date}
     * @memberof UsageRecord
     */
    readonly createdAt?: Date;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    processingTime: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    networkUsage: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    itemCount: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    requestCount: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    itemsDataSize: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    requestsDataSize: number;
    /**
     * 
     * @type {number}
     * @memberof UsageRecord
     */
    logsDataSize: number;
}

export function UsageRecordFromJSON(json: any): UsageRecord {
    return UsageRecordFromJSONTyped(json, false);
}

export function UsageRecordFromJSONTyped(json: any, ignoreDiscriminator: boolean): UsageRecord {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'createdAt': !exists(json, 'created_at') ? undefined : (new Date(json['created_at'])),
        'processingTime': json['processing_time'],
        'networkUsage': json['network_usage'],
        'itemCount': json['item_count'],
        'requestCount': json['request_count'],
        'itemsDataSize': json['items_data_size'],
        'requestsDataSize': json['requests_data_size'],
        'logsDataSize': json['logs_data_size'],
    };
}

export function UsageRecordToJSON(value?: UsageRecord | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'processing_time': value.processingTime,
        'network_usage': value.networkUsage,
        'item_count': value.itemCount,
        'request_count': value.requestCount,
        'items_data_size': value.itemsDataSize,
        'requests_data_size': value.requestsDataSize,
        'logs_data_size': value.logsDataSize,
    };
}


