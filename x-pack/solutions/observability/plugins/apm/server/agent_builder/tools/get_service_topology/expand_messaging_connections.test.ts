/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExitSpanSample } from './apm_data';
import {
  expandMessagingConnections,
  MAX_MESSAGING_DEPS_TO_EXPAND,
} from './expand_messaging_connections';
import type { ConnectionWithKey } from './types';
import { makeExternalConnection } from './test_helpers';

jest.mock('./get_trace_ids_from_exit_spans', () => ({
  getTraceIdsFromExitSpansTargetingDependency: jest.fn(),
}));

jest.mock('./apm_data', () => ({
  fetchExitSpanSamples: jest.fn(),
}));

import { getTraceIdsFromExitSpansTargetingDependency } from './get_trace_ids_from_exit_spans';
import { fetchExitSpanSamples } from './apm_data';

const mockGetTraceIds = getTraceIdsFromExitSpansTargetingDependency as jest.MockedFunction<
  typeof getTraceIdsFromExitSpansTargetingDependency
>;

const mockFetchExitSpanSamples = fetchExitSpanSamples as jest.MockedFunction<
  typeof fetchExitSpanSamples
>;

function makeSpan(serviceName: string, resource: string, spanType: string): ExitSpanSample {
  return {
    serviceName,
    spanDestinationServiceResource: resource,
    spanType,
    spanSubtype: spanType === 'messaging' ? 'kafka' : 'http',
  };
}

const mockLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as any;
const mockApmEventClient = {} as any;

function callExpand({
  messagingDeps = ['kafka/orders'],
  existingConnections = [] as ConnectionWithKey[],
} = {}) {
  return expandMessagingConnections({
    apmEventClient: mockApmEventClient,
    logger: mockLogger,
    messagingDeps,
    existingConnections,
    startMs: 0,
    endMs: 1000,
  });
}

describe('expandMessagingConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchExitSpanSamples.mockResolvedValue([]);
  });

  it('returns empty array when messagingDeps is empty', async () => {
    const result = await callExpand({ messagingDeps: [] });

    expect(result).toEqual([]);
    expect(mockGetTraceIds).not.toHaveBeenCalled();
  });

  it('returns empty array when no trace IDs found for the messaging dep', async () => {
    mockGetTraceIds.mockResolvedValue([]);

    const result = await callExpand();

    expect(result).toEqual([]);
    expect(mockGetTraceIds).toHaveBeenCalledWith(
      expect.objectContaining({ dependencyName: 'kafka/orders' })
    );
  });

  it('returns empty array when no exit span samples are found', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);
    mockFetchExitSpanSamples.mockResolvedValue([]);

    const result = await callExpand();

    expect(result).toEqual([]);
  });

  it('returns new connections targeting the messaging dependency', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);
    mockFetchExitSpanSamples.mockResolvedValue([
      makeSpan('checkout', 'kafka/orders', 'messaging'),
      makeSpan('checkout', 'postgres:5432', 'db'),
    ]);

    const result = await callExpand();

    expect(result).toHaveLength(1);
    expect(result[0]._sourceName).toBe('checkout');
    expect(result[0]._dependencyName).toBe('kafka/orders');
  });

  it('filters out connections already in existingConnections', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);
    mockFetchExitSpanSamples.mockResolvedValue([makeSpan('checkout', 'kafka/orders', 'messaging')]);

    const result = await callExpand({
      existingConnections: [makeExternalConnection('checkout', 'kafka/orders', 'messaging', 'kafka')],
    });

    expect(result).toEqual([]);
  });

  it(`caps expansion at ${MAX_MESSAGING_DEPS_TO_EXPAND} deps and logs a warning`, async () => {
    mockGetTraceIds.mockResolvedValue([]);
    const tooManyDeps = Array.from({ length: 8 }, (_, i) => `kafka/topic-${i}`);

    await callExpand({ messagingDeps: tooManyDeps });

    expect(mockGetTraceIds).toHaveBeenCalledTimes(MAX_MESSAGING_DEPS_TO_EXPAND);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${MAX_MESSAGING_DEPS_TO_EXPAND} of 8`)
    );
  });

  it('only returns connections matching the target dep, not unrelated spans', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);
    mockFetchExitSpanSamples.mockResolvedValue([
      makeSpan('checkout', 'kafka/orders', 'messaging'),
      makeSpan('checkout', 'kafka/other-topic', 'messaging'),
      makeSpan('payment', 'stripe-api:443', 'external'),
    ]);

    const result = await callExpand();

    expect(result).toHaveLength(1);
    expect(result[0]._dependencyName).toBe('kafka/orders');
  });
});
