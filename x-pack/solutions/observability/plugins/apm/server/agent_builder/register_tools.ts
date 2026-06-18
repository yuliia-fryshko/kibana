/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { APMConfig } from '..';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { createGetServiceTopologyTool } from './tools/get_service_topology/tool';

/**
 * Registers APM-owned Agent Builder inline tools.
 *
 * Each tool is a thin wrapper that delegates to a canonical service in APM, so
 * the same logic is shared with the corresponding HTTP routes.
 */
export function registerApmAgentBuilderTools({
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
  if (!plugins.agentBuilder) {
    return;
  }

  plugins.agentBuilder.tools.register(
    createGetServiceTopologyTool({ core, plugins, config, logger })
  );
}
