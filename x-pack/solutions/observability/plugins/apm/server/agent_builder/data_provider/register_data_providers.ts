/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { getRollupIntervalForTimeRange } from '@kbn/apm-data-access-plugin/server/utils';
import type { APMConfig } from '../..';
import { getErrorSampleDetails } from '../../routes/errors/get_error_groups/get_error_sample_details';
import { parseDatemath } from '../utils/time';
import { getApmServiceSummary } from './get_apm_service_summary';
import { getServicesItems } from '../../routes/services/get_services/get_services_items';
import { ApmDocumentType } from '../../../common/document_type';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getExitSpanChangePoints, getServiceChangePoints } from './get_change_points';
import { buildApmToolResources } from '../utils/build_apm_tool_resources';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { getTransaction } from '../../routes/transactions/get_transaction';
import { getTransactionByName } from '../../routes/transactions/get_transaction_by_name';
import { getServiceTopology } from '../tools/get_service_topology/service';

export function registerDataProviders({
  core,
  plugins,
  config,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  config: APMConfig;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'apmServiceSummary',
    async ({ request, serviceName, serviceEnvironment, start, end, transactionType }) => {
      const { apmEventClient, apmAlertsClient, mlClient, esClient } = await buildApmToolResources({
        core,
        plugins,
        request,
      });

      return getApmServiceSummary({
        apmEventClient,
        esClient: esClient.asCurrentUser,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: {
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          start,
          end,
          'transaction.type': transactionType,
        },
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmExitSpanChangePoints',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request });

      return getExitSpanChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        start,
        end,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmServiceChangePoints',
    async ({
      request,
      serviceName,
      serviceEnvironment,
      transactionType,
      transactionName,
      start,
      end,
    }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request });

      return getServiceChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        transactionType,
        transactionName,
        start,
        end,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmErrorDetails',
    async ({ request, errorId, serviceName, serviceEnvironment, start, end, kuery = '' }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request });

      return getErrorSampleDetails({
        apmEventClient,
        errorId,
        serviceName,
        start: parseDatemath(start),
        end: parseDatemath(end),
        environment: serviceEnvironment ?? '',
        kuery,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'servicesItems',
    async ({ request, environment, kuery, start, end, searchQuery }) => {
      const { apmEventClient, randomSamplerSeed, mlClient, apmAlertsClient } =
        await buildApmToolResources({ core, plugins, request });

      const startMs = parseDatemath(start);
      const endMs = parseDatemath(end);

      return getServicesItems({
        apmEventClient,
        apmAlertsClient,
        randomSampler: { seed: randomSamplerSeed, probability: 1 },
        mlClient,
        logger,
        environment: environment ?? ENVIRONMENT_ALL.value,
        kuery: kuery ?? '',
        start: startMs,
        end: endMs,
        serviceGroup: null,
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: getRollupIntervalForTimeRange(startMs, endMs),
        useDurationSummary: true, // Note: This will not work for pre 8.7 data. See: https://github.com/elastic/kibana/issues/167578
        searchQuery,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmTransactionDetails',
    async ({ request, serviceName, transactionName, transactionId, traceId, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request });

      const startMs = parseDatemath(start);
      const endMs = parseDatemath(end, { roundUp: true });

      if (!startMs || !endMs) {
        throw new Error('Invalid date range provided.');
      }

      let resolvedTransactionId = transactionId;
      let resolvedTraceId = traceId;

      if (!resolvedTransactionId) {
        const redirectInfo = await getTransactionByName({
          transactionName,
          serviceName,
          apmEventClient,
          start: startMs,
          end: endMs,
        });

        resolvedTransactionId = redirectInfo?.transaction?.id;
        resolvedTraceId = redirectInfo?.trace?.id;
      }

      if (!resolvedTransactionId) {
        return {
          transaction: undefined,
          transactionId: resolvedTransactionId,
          traceId: resolvedTraceId,
        };
      }

      const transaction = await getTransaction({
        transactionId: resolvedTransactionId,
        traceId: resolvedTraceId,
        apmEventClient,
        start: startMs,
        end: endMs,
      });

      return {
        transaction,
        transactionId: resolvedTransactionId,
        traceId: resolvedTraceId,
      };
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmServiceTopology',
    async ({ request, serviceName, direction, depth, start, end }) => {
      const { apmEventClient, randomSamplerSeed } = await buildApmToolResources({
        core,
        plugins,
        request,
      });

      return getServiceTopology({
        apmEventClient,
        randomSamplerSeed,
        config,
        logger,
        serviceName,
        direction,
        depth,
        start,
        end,
      });
    }
  );
}
