/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID } from '@kbn/apm-types';
import type { APMConfig } from '../../..';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../../types';
import { buildApmToolResources } from '../../utils/build_apm_tool_resources';
import { getApmAgentBuilderResourceAvailability } from '../../utils/get_resource_availability';
import { getServiceTopology } from './service';
import { serviceTopologyParamsSchema } from './schema';

/**
 * Inline (Agent Builder) adapter for the canonical service topology service.
 *
 * Thin wrapper: builds APM resources in-process and delegates to
 * `getServiceTopology` — the same service the HTTP route calls. No HTTP overhead,
 * re-authentication, or scope translation.
 */
export function createGetServiceTopologyTool({
  core,
  plugins,
  config,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  config: APMConfig;
  logger: Logger;
}): StaticToolRegistration<typeof serviceTopologyParamsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof serviceTopologyParamsSchema> = {
    id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the service topology (dependency graph) for a service, with RED metrics (latency, throughput, error rate) per connection.

Returns connections with source/target nodes and RED metrics. Supports downstream, upstream, or both directions.

When to use:
- Checking which direct dependencies are failing or slow (depth: 1)
- Tracing cascading failures through multi-hop dependency chains
- Understanding blast radius of a failing service (direction: "upstream")
- Visualizing the full architecture around a service (direction: "both")

When NOT to use:
- For service-level metrics without topology, use \`observability.get_trace_metrics\`

After reviewing topology results, consider:
- Use \`observability.get_trace_metrics\` with timeseries to check latency/error trends over time
- Use \`observability.get_traces\` to find error patterns in failing dependencies`,
    schema: serviceTopologyParamsSchema,
    tags: ['observability', 'apm', 'service-map', 'topology'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getApmAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, direction, depth, start, end } = toolParams;
      const { request } = context;

      try {
        const { apmEventClient, randomSamplerSeed } = await buildApmToolResources({
          core,
          plugins,
          request,
        });

        const topology = await getServiceTopology({
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

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                connections: topology.connections,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting service topology: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch service topology: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
