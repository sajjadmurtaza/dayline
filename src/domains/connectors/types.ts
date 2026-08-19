export type ConnectorCapability = "events" | "tasks" | "notes" | "files" | "messages";

export type NormalizedInbound = {
  externalId: string;
  connectorId: string;
  kind: "event" | "task" | "note" | "file" | "message";
  title: string;
  start?: string;
  end?: string;
  body?: string;
};

export type NormalizedBatch = {
  connectorId: string;
  items: NormalizedInbound[];
};

export type Connector = {
  id: string;
  labelKey: string;
  enabled: boolean;
  capabilities: ConnectorCapability[];
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sync(): Promise<NormalizedBatch>;
  create?(item: NormalizedInbound): Promise<void>;
  update?(item: NormalizedInbound): Promise<void>;
  delete?(externalId: string): Promise<void>;
  subscribe?(onChange: (batch: NormalizedBatch) => void): () => void;
};

export function unsupportedLiveConnector(id: string, labelKey: string): Connector {
  return {
    id,
    labelKey,
    enabled: false,
    capabilities: ["events"],
    async connect() {
      throw new Error(`${id} is not enabled in v1`);
    },
    async disconnect() {
      return;
    },
    async sync() {
      return { connectorId: id, items: [] };
    },
  };
}
