import { unsupportedLiveConnector, type Connector } from "./types";

export const CONNECTORS: Connector[] = [
  {
    id: "local",
    labelKey: "source.local",
    enabled: true,
    capabilities: ["events", "tasks", "notes"],
    async connect() {
      return;
    },
    async disconnect() {
      return;
    },
    async sync() {
      return { connectorId: "local", items: [] };
    },
  },
  unsupportedLiveConnector("google-calendar", "source.google-calendar"),
  unsupportedLiveConnector("outlook-calendar", "source.outlook-calendar"),
];

export function connectorById(id: string): Connector | undefined {
  return CONNECTORS.find((connector) => connector.id === id);
}
