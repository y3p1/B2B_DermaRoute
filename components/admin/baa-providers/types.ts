export type BaaProviderDetail = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  status: string;
  providerAcctId: string;

  coveredEntity: string;
  coveredEntityName: string;
  coveredEntityTitle: string;
  coveredEntityDate: string;
  coveredEntitySignature: string;
  coveredEntitySignatureUrl: string | null;

  businessAssociateName: string | null;
  businessAssociateTitle: string | null;
  businessAssociateDate: string | null;
  businessAssociateSignature: string | null;
  businessAssociateSignatureUrl: string | null;

  statusUpdatedByAdminId: string | null;
  statusUpdatedAt: string | null;

  clinicName: string | null;
  providerEmail: string | null;
};
