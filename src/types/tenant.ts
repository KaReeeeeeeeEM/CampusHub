export type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  domain?: string | null;
};

export type TenantContextValue = {
  tenant: Tenant | null;
  tenantId: string | null;
  isTenantResolved: boolean;
};
