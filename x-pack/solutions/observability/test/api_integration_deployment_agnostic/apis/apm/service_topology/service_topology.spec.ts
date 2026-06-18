/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  CHECKOUT_SERVICE,
  FRONTEND_SERVICE,
  generateTopologyData,
  KAFKA_DEPENDENCY,
  POSTGRES_DEPENDENCY,
  RECOMMENDATION_SERVICE,
  REDIS_DEPENDENCY,
} from '@kbn/synthtrace';
import type { ServiceTopologyConnection } from '@kbn/apm-types';
import { uniq } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const SERVICE_TOPOLOGY_API_PATH = '/internal/apm/service_topology';
const START = 'now-15m';
const END = 'now';

const getTargetName = (c: ServiceTopologyConnection) =>
  'service.name' in c.target
    ? c.target['service.name']
    : c.target['span.destination.service.resource'];

const getSourceName = (c: ServiceTopologyConnection) => c.source['service.name'];

const getConnectionByTarget = (connections: ServiceTopologyConnection[], targetName: string) =>
  connections.find((c) => getTargetName(c) === targetName);

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const synthtrace = getService('synthtrace');

  describe('APM service topology API', function () {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let apiKeyHeader: Record<string, string>;
    let internalReqHeader: Record<string, string>;

    const callTopology = (body: Record<string, unknown>) =>
      supertestWithoutAuth
        .post(SERVICE_TOPOLOGY_API_PATH)
        .set(apiKeyHeader)
        .set(internalReqHeader)
        .set('kbn-xsrf', 'foo')
        .set('elastic-api-version', '1')
        .send(body);

    const executeTopology = async (params: {
      serviceName: string;
      direction?: 'downstream' | 'upstream' | 'both';
      depth?: number;
    }): Promise<ServiceTopologyConnection[]> => {
      const response = await callTopology({ start: START, end: END, ...params });
      expect(response.status).to.be(200);
      return response.body.connections;
    };

    before(async () => {
      internalReqHeader = samlAuth.getInternalRequestHeader();
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      apiKeyHeader = roleAuthc.apiKeyHeader;

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const { client, generator } = generateTopologyData({
        range: timerange(START, END),
        apmEsClient: apmSynthtraceEsClient,
      });

      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('input validation', () => {
      it('rejects a request without serviceName', async () => {
        const response = await callTopology({ start: START, end: END });
        expect(response.status).to.be(400);
      });

      it('rejects an empty serviceName', async () => {
        const response = await callTopology({ start: START, end: END, serviceName: '' });
        expect(response.status).to.be(400);
      });

      it('rejects an invalid direction', async () => {
        const response = await callTopology({
          start: START,
          end: END,
          serviceName: FRONTEND_SERVICE.serviceName,
          direction: 'sideways',
        });
        expect(response.status).to.be(400);
      });

      it('applies schema defaults (start/end/direction) when omitted', async () => {
        const response = await callTopology({ serviceName: FRONTEND_SERVICE.serviceName });
        expect(response.status).to.be(200);
        expect(response.body.connections).to.be.an('array');
      });
    });

    describe('response shape', () => {
      it('returns a connections array with source/target nodes', async () => {
        const connections = await executeTopology({
          serviceName: FRONTEND_SERVICE.serviceName,
          direction: 'downstream',
        });

        expect(connections).to.be.an('array');
        connections.forEach((connection) => {
          expect(connection).to.have.property('source');
          expect(connection).to.have.property('target');
          expect(connection.source).to.have.property('service.name');
        });
      });
    });

    describe('downstream', () => {
      it('returns immediate targets and resolves service.name from frontend', async () => {
        const connections = await executeTopology({
          serviceName: FRONTEND_SERVICE.serviceName,
          direction: 'downstream',
        });

        const targets = connections.map(getTargetName);
        expect(targets).to.contain(CHECKOUT_SERVICE.serviceName);
        expect(targets).to.contain(RECOMMENDATION_SERVICE.serviceName);
      });

      it('depth=1 returns only immediate dependencies of the root', async () => {
        const connections = await executeTopology({
          serviceName: FRONTEND_SERVICE.serviceName,
          direction: 'downstream',
          depth: 1,
        });

        const targets = connections.map(getTargetName);
        expect(targets).to.contain(CHECKOUT_SERVICE.serviceName);
        expect(targets).to.contain(RECOMMENDATION_SERVICE.serviceName);

        // Root is the only source, and grandchildren are excluded
        expect(uniq(connections.map(getSourceName))).to.eql([FRONTEND_SERVICE.serviceName]);
        expect(targets).not.to.contain(POSTGRES_DEPENDENCY.resource);
        expect(targets).not.to.contain(REDIS_DEPENDENCY.resource);
        expect(targets).not.to.contain(KAFKA_DEPENDENCY.resource);
      });
    });

    describe('upstream', () => {
      it('returns frontend as a caller of checkout-service', async () => {
        const connections = await executeTopology({
          serviceName: CHECKOUT_SERVICE.serviceName,
          direction: 'upstream',
        });

        expect(connections.map(getSourceName)).to.contain(FRONTEND_SERVICE.serviceName);
      });
    });

    describe('RED metrics', () => {
      it('returns latency in milliseconds, throughput, and error rate', async () => {
        const connections = await executeTopology({
          serviceName: CHECKOUT_SERVICE.serviceName,
          direction: 'downstream',
        });

        const toPostgres = getConnectionByTarget(connections, POSTGRES_DEPENDENCY.resource);
        expect(toPostgres).to.be.ok();

        const metrics = toPostgres!.metrics;
        expect(metrics?.latencyMs).to.be.a('number');
        expect(metrics?.latencyMs).to.be.greaterThan(0);
        // Regression guard: latency must be ms, not µs — synthtrace spans are 30-40ms
        expect(metrics?.latencyMs).to.be.lessThan(1000);
        expect(metrics?.throughputPerMin).to.be.greaterThan(0);
        expect(metrics?.errorRate).to.be(0);
      });
    });

    describe('non-existent service', () => {
      it('returns empty connections', async () => {
        const connections = await executeTopology({
          serviceName: 'non-existent-service',
          direction: 'downstream',
        });

        expect(connections.length).to.be(0);
      });
    });
  });
}
