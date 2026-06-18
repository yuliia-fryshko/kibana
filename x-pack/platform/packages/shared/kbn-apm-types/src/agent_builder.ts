/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared, cycle-free home for Agent Builder tool identifiers owned by APM.
 *
 * The tool itself lives in the APM plugin, but the id is referenced from other
 * plugins (e.g. the Observability Agent Builder investigation skill). Keeping it
 * here lets both plugins import the constant without creating a circular
 * dependency between APM and OAB.
 */
export const OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID = 'observability.get_service_topology';

/**
 * Public response contract for the service topology service.
 *
 * The canonical implementation lives in the APM plugin (derived from a Zod
 * schema), but OAB needs these shapes to type the cross-plugin data provider
 * without importing APM. The APM provider registration is the compile-time guard
 * that keeps these in sync with the service's actual return type.
 */
export type TopologyDirection = 'downstream' | 'upstream' | 'both';

export interface ServiceTopologyNode {
  'service.name': string;
  'agent.name'?: string;
}

export interface ExternalNode {
  'span.destination.service.resource': string;
  'span.type': string;
  'span.subtype': string;
}

export interface ConnectionMetrics {
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}

export interface ServiceTopologyConnection {
  source: ServiceTopologyNode | ExternalNode;
  target: ServiceTopologyNode | ExternalNode;
  metrics?: ConnectionMetrics;
}

export interface ServiceTopologyResponse {
  connections: ServiceTopologyConnection[];
}
