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
