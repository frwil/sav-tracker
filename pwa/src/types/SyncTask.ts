export type ResourceType =
    | 'customer'
    | 'visit'
    | 'building'
    | 'flock'
    | 'observation'
    | 'prospection'
    | 'other';

export const RESOURCE_PRIORITY: Record<ResourceType, number> = {
    customer: 1,
    visit: 2,
    building: 3,
    flock: 4,
    observation: 5,
    prospection: 6,
    other: 99,
};

export interface SyncTask {
    id: string;
    url: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body: any;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: number;
    idempotencyKey: string;
    resourceType: ResourceType;
}
