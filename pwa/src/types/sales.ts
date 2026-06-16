// ─── Sales Module Types ────────────────────────────────────────

export interface SalesVisit {
    id: number;
    salesRep?: { id: number; fullname: string; username: string };
    customer?: { '@id': string; id: number; name: string; zone: string; type: string };
    plannedAt?: string;
    visitedAt?: string;
    completedAt?: string;
    gpsCoordinates?: string;
    objective?: string;
    generalComment?: string;
    closed: boolean;
    activated: boolean;
    createdAt?: string;
    priceAudits: PriceAudit[];
    stockAudits: StockAudit[];
    qualityAudit?: QualityAudit | null;
    visibilityAudit?: VisibilityAudit | null;
    preOrders: PreOrder[];
    salesActivities: SalesActivity[];
    photos: SalesPhoto[];
}

export interface PriceAudit {
    id: number;
    visit?: string; // IRI
    productCode: string;
    productName: string;
    expectedPrice?: number;
    observedPrice: number;
    competitor1Name?: string;
    competitor1Price?: number;
    competitor2Name?: string;
    competitor2Price?: number;
    competitor3Name?: string;
    competitor3Price?: number;
    isPromoActive: boolean;
    promoPrice?: number;
    priceCompliance: boolean;
    comment?: string;
}

export interface StockAudit {
    id: number;
    visit?: string; // IRI
    productCode: string;
    productName: string;
    isMustStock: boolean;
    stockQuantity?: number;
    stockUnit: string;
    isOutOfStock: boolean;
    isFifoCompliant: boolean;
    oldestMfgDate?: string;
    expiryDate?: string;
    freshnessScore?: number;
    packagingIntact: boolean;
    comment?: string;
}

export interface QualityAudit {
    id: number;
    visit?: string; // IRI
    damagedBagsCount?: number;
    damagedBagsRate?: number;
    storageOnPallets: boolean;
    storageDryArea: boolean;
    storageProtected: boolean;
    pestPresence: boolean;
    moldPresence: boolean;
    odorIssue: boolean;
    cleanlinessScore?: number;
    overallQualityScore?: number;
    comment?: string;
}

export interface VisibilityAudit {
    id: number;
    visit?: string; // IRI
    hasPosters: boolean;
    hasBanners: boolean;
    hasCalendars: boolean;
    hasBrandedSacs: boolean;
    signageVisible: boolean;
    brandedItems?: string[];
    ourVisibilityPercent?: number;
    overallVisibilityScore?: number;
    comment?: string;
}

export interface PreOrder {
    id: number;
    visit?: string; // IRI
    customer?: string; // IRI
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalValue: number;
    status: 'PREORDER' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
    expectedDeliveryAt?: string;
    deliveredAt?: string;
    cancellationReason?: string;
    comment?: string;
}

export interface SalesActivity {
    id: number;
    visit?: string; // IRI
    activityType: string;
    isCompleted: boolean;
    completedAt?: string;
    comment?: string;
    sortOrder: number;
}

export interface SalesPhoto {
    id: number;
    visit?: string; // IRI
    contentUrl: string;
    caption?: string;
    category: string;
    createdAt: string;
}

export interface SalesStats {
    salesRepId?: number;
    salesRepName?: string;
    visitsPlanned: number;
    visitsRealized: number;
    visitsOnTime: number;
    jpAdherence: number;
    callRate: number;
    preOrdersTaken: number;
    ordersWon: number;
    strikeRate: number;
    totalRevenue: number;
    avgOrderValue: number;
    priceChecksDone: number;
    priceCompliant: number;
    priceCompliance: number;
    stockChecksDone: number;
    mustStockPresent: number;
    outOfStockCount: number;
    mustStockRate: number;
    oosRate: number;
    avgFreshness: number;
    avgQualityScore: number;
    avgVisibilityScore: number;
    activitiesTotal: number;
    activitiesCompleted: number;
    executionRate: number;
}

export interface VisitListItem {
    id: number;
    customer?: { '@id': string; id: number; name: string; zone: string };
    salesRep?: { id: number; fullname: string; username: string };
    plannedAt?: string;
    visitedAt?: string;
    completedAt?: string;
    gpsCoordinates?: string;
    objective?: string;
    generalComment?: string;
    closed: boolean;
    activated: boolean;
    salesActivities?: { isCompleted: boolean }[];
    priceAudits?: any[];
    stockAudits?: any[];
    preOrders?: any[];
}

// ─── Activity Labels ───────────────────────────────────────────

export const ACTIVITY_LABELS: Record<string, string> = {
    STOCK_CHECK: '📦 Vérification stock',
    PRICE_CHECK: '🏷️ Relevé des prix',
    QUALITY_CHECK: '✨ Contrôle qualité',
    VISIBILITY_CHECK: '👁️ Visibilité marque',
    ORDER_TAKING: '📝 Prise de commande',
    MANAGER_INTERVIEW: '💬 Entretien gérant',
    PHOTO_REPORT: '📸 Reportage photo',
    MERCHANDISING: '📐 Merchandising',
    PROMO_CHECK: '🎯 Vérification promo',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
    PREORDER: '📝 Précommande',
    CONFIRMED: '✅ Confirmée',
    DELIVERED: '🚚 Livrée',
    CANCELLED: '❌ Annulée',
};

export const PHOTO_CATEGORIES = [
    { value: 'GENERAL', label: '📸 Général' },
    { value: 'PRICE', label: '🏷️ Prix' },
    { value: 'STOCK', label: '📦 Stock' },
    { value: 'QUALITY', label: '✨ Qualité' },
    { value: 'VISIBILITY', label: '👁️ Visibilité' },
] as const;
