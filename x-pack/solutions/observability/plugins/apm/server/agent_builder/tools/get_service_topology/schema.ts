/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Single source of truth for the service topology contract.
 *
 * Both adapters consume these schemas: the Agent Builder inline tool (in-process)
 * and the HTTP route (external callers). Keeping input and output validation here
 * means the contract is defined exactly once.
 */

export const SERVICE_TOPOLOGY_DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const startDescription =
  'The start time of the query window using Elasticsearch date math. Examples: "now-24h", "now-15m".';
const endDescription =
  'The end time of the query window using Elasticsearch date math. Example: "now".';

export const serviceTopologyParamsSchema = z.object({
  start: z
    .string()
    .describe(`${startDescription} Defaults to ${SERVICE_TOPOLOGY_DEFAULT_TIME_RANGE.start}.`)
    .default(SERVICE_TOPOLOGY_DEFAULT_TIME_RANGE.start),
  end: z
    .string()
    .describe(`${endDescription} Defaults to ${SERVICE_TOPOLOGY_DEFAULT_TIME_RANGE.end}.`)
    .default(SERVICE_TOPOLOGY_DEFAULT_TIME_RANGE.end),
  serviceName: z.string().min(1).describe('The name of the service to get the topology for'),
  direction: z
    .enum(['downstream', 'upstream', 'both'])
    .default('downstream')
    .describe(
      'Direction of dependencies to retrieve. ' +
        '"downstream" shows what this service calls (dependencies). ' +
        '"upstream" shows what calls this service (callers). ' +
        '"both" shows both directions. Defaults to "downstream".'
    ),
  depth: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Maximum number of hops to traverse. ' +
        'depth=1 returns only immediate (single-hop) dependencies. ' +
        'Omit for unlimited traversal (full multi-hop topology).'
    ),
});

const serviceNodeSchema = z.object({
  'service.name': z.string(),
  'agent.name': z.string().optional(),
});

const externalNodeSchema = z.object({
  'span.destination.service.resource': z.string(),
  'span.type': z.string(),
  'span.subtype': z.string(),
});

export const topologyNodeSchema = z.union([serviceNodeSchema, externalNodeSchema]);

export const connectionMetricsSchema = z.object({
  errorRate: z.number().optional(),
  latencyMs: z.number().optional(),
  throughputPerMin: z.number().optional(),
});

export const serviceTopologyConnectionSchema = z.object({
  source: topologyNodeSchema,
  target: topologyNodeSchema,
  metrics: connectionMetricsSchema.optional(),
});

export const serviceTopologyResponseSchema = z.object({
  connections: z.array(serviceTopologyConnectionSchema),
});
