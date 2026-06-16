export type ResourceType =
    | 'customer'
    | 'visit'
    | 'building'
    | 'flock'
    | 'observation'
    | 'prospection'
    | 'sales_visit'
    | 'price_audit'
    | 'stock_audit'
    | 'quality_audit'
    | 'visibility_audit'
    | 'pre_order'
    | 'sales_photo'
    | 'sales_activity'
    | 'other';

export const RESOURCE_PRIORITY: Record<ResourceType, number> = {
    customer: 1,
    visit: 2,
    building: 3,
    flock: 4,
    observation: 5,
    prospection: 6,
    sales_visit: 7,
    price_audit: 8,
    stock_audit: 9,
    quality_audit: 10,
    visibility_audit: 11,
    pre_order: 12,
    sales_photo: 13,
    sales_activity: 14,
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
