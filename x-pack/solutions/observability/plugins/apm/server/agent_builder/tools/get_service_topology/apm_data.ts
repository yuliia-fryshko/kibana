/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getTraceSampleIds } from '../../../routes/service_map/get_trace_sample_ids';
import { fetchExitSpanSamplesFromTraceIds } from '../../../routes/service_map/fetch_exit_span_samples';
import { getConnectionStats } from '../../../lib/connections/get_connection_stats';
import { getConnectionStatsItems } from '../../../lib/connections/get_connection_stats/get_connection_stats_items';
import type { APMConfig } from '../../..';

/**
 * APM data-access wrappers for the service topology tool.
 *
 * These replace the OAB dataRegistry providers (apmTraceSampleIds, apmExitSpanSamples,
 * apmConnectionStats, apmConnectionStatsItems): now that the tool lives in APM, it calls
 * the underlying APM functions directly and applies the same shaping here.
 */

export interface TraceMetrics {
  latencyUs: number | null;
  throughputPerMin: number | null;
  errorRate: number | null;
}

export interface ExitSpanSample {
  serviceName: string;
  agentName?: string;
  spanDestinationServiceResource: string;
  spanType: string;
  spanSubtype: string;
  destinationService?: {
    serviceName: string;
    agentName?: string;
  };
}

export interface ConnectionStatsItem {
  from: { serviceName: string };
  to: {
    dependencyName: string;
    spanType: string;
    spanSubtype: string;
  };
  value: {
    latency_count: number;
    latency_sum: number;
    error_count: number;
    success_count: number;
  };
}

export type ApmConnectionStatsEntry =
  | { type: 'service'; serviceName: string; metrics: TraceMetrics }
  | {
      type: 'dependency';
      dependencyName: string;
      spanType: string;
      spanSubtype: string;
      metrics: TraceMetrics;
    };

export function fetchTraceSampleIds({
  apmEventClient,
  config,
  serviceName,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  serviceName: string;
  start: number;
  end: number;
}): Promise<{ traceIds: string[] }> {
  return getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start,
    end,
  });
}

export function fetchExitSpanSamples({
  apmEventClient,
  traceIds,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
}): Promise<ExitSpanSample[]> {
  return fetchExitSpanSamplesFromTraceIds({ apmEventClient, traceIds, start, end });
}

export async function fetchConnectionStatsItems({
  apmEventClient,
  start,
  end,
  filter,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  filter: QueryDslQueryContainer[];
}): Promise<ConnectionStatsItem[]> {
  const items = await getConnectionStatsItems({
    apmEventClient,
    start,
    end,
    filter,
    numBuckets: 1, // not used when withTimeseries: false, but required param
    withTimeseries: false,
  });

  return items.map((item) => ({
    from: { serviceName: item.from.serviceName },
    to: {
      dependencyName: item.to.dependencyName,
      spanType: item.to.spanType,
      spanSubtype: item.to.spanSubtype,
    },
    value: item.value,
  }));
}

export async function fetchConnectionStats({
  apmEventClient,
  randomSamplerSeed,
  start,
  end,
  filter,
}: {
  apmEventClient: APMEventClient;
  randomSamplerSeed: number;
  start: number;
  end: number;
  filter: QueryDslQueryContainer[];
}): Promise<ApmConnectionStatsEntry[]> {
  const { statsItems } = await getConnectionStats({
    apmEventClient,
    start,
    end,
    filter,
    collapseBy: 'downstream',

    // getDestinationMap (called by getConnectionStats) computes its own dynamic
    // probability internally. probability: 1 here is only used as a fallback
    // for small datasets (<20M docs) where sampling is unnecessary.
    randomSampler: { seed: randomSamplerSeed, probability: 1 },
    numBuckets: 1, // not used when withTimeseries: false, but required param
    withTimeseries: false,
  });

  return statsItems.map((item) => {
    const { location, stats } = item;
    const metrics: TraceMetrics = {
      latencyUs: stats.latency.value,
      throughputPerMin: stats.throughput.value,
      errorRate: stats.errorRate.value,
    };

    if ('serviceName' in location) {
      return { type: 'service' as const, serviceName: location.serviceName, metrics };
    }

    return {
      type: 'dependency' as const,
      dependencyName: location.dependencyName,
      spanType: location.spanType,
      spanSubtype: location.spanSubtype,
      metrics,
    };
  });
}
