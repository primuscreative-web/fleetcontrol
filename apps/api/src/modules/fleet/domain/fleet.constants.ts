import type {
  VehicleCostType,
  VehicleDocumentType,
  VehicleFuelType,
  VehicleStatus,
  VehicleTimelineType,
} from "@fleetcontrol/database";

export const vehicleStatuses: Record<VehicleStatus, string> = {
  AVAILABLE: "Disponivel",
  OPERATING: "Operando",
  ON_TRIP: "Em viagem",
  IN_MAINTENANCE: "Em manutencao",
  STOPPED: "Parado",
  BLOCKED: "Bloqueado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
  WRITTEN_OFF: "Baixado",
};

export const vehicleFuelTypes: Record<VehicleFuelType, string> = {
  GASOLINE: "Gasolina",
  ETHANOL: "Etanol",
  FLEX: "Flex",
  DIESEL: "Diesel",
  BIODIESEL: "Biodiesel",
  ELECTRIC: "Eletrico",
  HYBRID: "Hibrido",
  CNG: "GNV",
  OTHER: "Outro",
};

export const vehicleDocumentTypes: Record<VehicleDocumentType, string> = {
  CRLV: "CRLV",
  IPVA: "IPVA",
  INSURANCE: "Seguro",
  LICENSING: "Licenciamento",
  ANTT: "ANTT",
  TACHOGRAPH: "Tacografo",
  CHRONOTACHOGRAPH: "Cronotacografo",
  OTHER: "Outros",
};

export const vehicleTimelineTypes: Record<VehicleTimelineType, string> = {
  CREATED: "Cadastro",
  UPDATED: "Alteracao",
  TRANSFERRED: "Transferencia",
  STATUS_CHANGED: "Mudanca de status",
  DOCUMENT_UPLOADED: "Documento",
  PHOTO_ADDED: "Foto",
  CHECKLIST: "Checklist",
  DRIVER: "Motorista",
  FUELING: "Abastecimento",
  FINE: "Multa",
  TIRE: "Pneu",
  MAINTENANCE: "Manutencao",
  CONTRACT: "Contrato",
  ARCHIVED: "Baixa",
};

export const vehicleCostTypes: Record<VehicleCostType, string> = {
  FUEL: "Combustivel",
  TIRES: "Pneus",
  WORKSHOP: "Oficina",
  PARTS: "Pecas",
  INSURANCE: "Seguro",
  IPVA: "IPVA",
  LICENSING: "Licenciamento",
  TOLLS: "Pedagios",
  FINES: "Multas",
  OTHER: "Outros",
};

export const fleetEvents = {
  created: "VehicleCreated",
  updated: "VehicleUpdated",
  statusChanged: "VehicleStatusChanged",
  transferred: "VehicleTransferred",
  documentUploaded: "VehicleDocumentUploaded",
  photoAdded: "VehiclePhotoAdded",
  archived: "VehicleArchived",
  deleted: "VehicleDeleted",
} as const;
