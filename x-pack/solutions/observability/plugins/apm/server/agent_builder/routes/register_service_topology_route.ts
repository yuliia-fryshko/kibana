/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import type { APMConfig } from '../..';
import { buildApmToolResources } from '../utils/build_apm_tool_resources';
import { getServiceTopology } from '../tools/get_service_topology/service';
import { serviceTopologyParamsSchema } from '../tools/get_service_topology/schema';

export const GET_SERVICE_TOPOLOGY_API_PATH = '/internal/apm/service_topology';

/**
 * Internal HTTP adapter for the service topology service.
 *
 * Thin wrapper: validates input with the shared Zod schema, builds APM resources,
 * and delegates to the canonical `getServiceTopology` service. Starts as
 * `access: 'internal'`; promoted to public once an external consumer depends on it.
 */
export function registerServiceTopologyRoute({
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
  const router = core.http.createRouter();

  router.versioned
    .post({
      path: GET_SERVICE_TOPOLOGY_API_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['apm'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(serviceTopologyParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const { serviceName, direction, depth, start, end } = request.body;

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

        return response.ok({ body: topology });
      }
    );
}
