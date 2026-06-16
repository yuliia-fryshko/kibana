/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type {
  connectionMetricsSchema,
  serviceTopologyConnectionSchema,
  serviceTopologyParamsSchema,
  serviceTopologyResponseSchema,
} from './schema';

export type ServiceTopologyParams = z.infer<typeof serviceTopologyParamsSchema>;
export type TopologyDirection = ServiceTopologyParams['direction'];

export type ConnectionMetrics = z.infer<typeof connectionMetricsSchema>;
export type ServiceTopologyConnection = z.infer<typeof serviceTopologyConnectionSchema>;
export type ServiceTopologyResponse = z.infer<typeof serviceTopologyResponseSchema>;

export interface ConnectionWithKey extends ServiceTopologyConnection {
  _key: string;
  _sourceName: string;
  _dependencyName: string;
}
