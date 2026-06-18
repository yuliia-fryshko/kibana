/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { APMPluginStartDependencies } from '../../types';

/**
 * Availability handler for APM-owned Agent Builder resources.
 * Gates availability to Observability or Classic solution spaces.
 * If spaces are unavailable, returns available.
 *
 * Ported from the Observability Agent Builder plugin so the topology tool keeps
 * the same space-gating behavior now that it is registered from APM.
 */
export async function getApmAgentBuilderResourceAvailability({
  core,
  request,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ToolAvailabilityResult> {
  const [, pluginsStart] = await core.getStartServices();

  try {
    const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
    const solution = activeSpace?.solution;
    const isAllowedSolution = !solution || solution === 'classic' || solution === 'oblt';

    if (!isAllowedSolution) {
      logger.debug(
        'APM agent builder resources are not available in this space, skipping registration.'
      );

      return {
        status: 'unavailable',
        reason: 'APM agent builder resources are not available in this space',
      };
    }
  } catch (error) {
    logger.debug(
      'Spaces are unavailable, returning available for APM agent builder resources.'
    );
    logger.debug(error);
  }

  return { status: 'available' };
}
