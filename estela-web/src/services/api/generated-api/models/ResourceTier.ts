/* tslint:disable */
/* eslint-disable */

import { exists, mapValues } from '../runtime';

/**
 * Resource tier for K8s pod allocation.
 * @export
 * @interface ResourceTier
 */
export interface ResourceTier {
    /**
     * @type {number | null}
     * @memberof ResourceTier
     */
    id?: number | null;
    /**
     * Tier name.
     * @type {string}
     * @memberof ResourceTier
     */
    name: string;
    /**
     * CPU request (e.g. 256m).
     * @type {string}
     * @memberof ResourceTier
     */
    cpuRequest: string;
    /**
     * CPU limit (e.g. 512m).
     * @type {string}
     * @memberof ResourceTier
     */
    cpuLimit: string;
    /**
     * Memory request (e.g. 384Mi).
     * @type {string}
     * @memberof ResourceTier
     */
    memRequest: string;
    /**
     * Memory limit (e.g. 512Mi).
     * @type {string}
     * @memberof ResourceTier
     */
    memLimit: string;
}

export function ResourceTierFromJSON(json: any): ResourceTier {
    return ResourceTierFromJSONTyped(json, false);
}

export function ResourceTierFromJSONTyped(json: any, ignoreDiscriminator: boolean): ResourceTier {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        'id': !exists(json, 'id') ? undefined : json['id'],
        'name': json['name'],
        'cpuRequest': json['cpu_request'],
        'cpuLimit': json['cpu_limit'],
        'memRequest': json['mem_request'],
        'memLimit': json['mem_limit'],
    };
}

export function ResourceTierToJSON(value?: ResourceTier | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        'name': value.name,
        'cpu_request': value.cpuRequest,
        'cpu_limit': value.cpuLimit,
        'mem_request': value.memRequest,
        'mem_limit': value.memLimit,
    };
}
