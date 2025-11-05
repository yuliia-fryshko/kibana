/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ContextualInsights } from '@kbn/ai-assistant-contextual-insights';
import { EuiText } from '@elastic/eui';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import dedent from 'dedent';
import { type AlertDetailsContextualInsight } from '../../../server/services';
import { useKibana } from '../../utils/kibana_react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
// import { error } from '@kbn/expressions-plugin/common/expression_types/specs/error';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { observabilityAIAssistant, http },
  } = useKibana();

  const ObservabilityAIAssistantContextualInsight =
    observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight;

  const getAlertContextMessages = useCallback(async () => {
    const fields = alert?.formatted.fields as Record<string, string> | undefined;
    if (!observabilityAIAssistant || !fields || !alert) {
      return [];
    }

    try {
      const { alertContext } = await http.get<{
        alertContext: AlertDetailsContextualInsight[];
      }>('/internal/observability/assistant/alert_details_contextual_insights', {
        query: {
          alert_started_at: new Date(alert.formatted.start).toISOString(),

          // alert fields used for log rate analysis
          alert_rule_parameter_time_size: alert.formatted.fields[ALERT_RULE_PARAMETERS]
            ?.timeSize as string | undefined,
          alert_rule_parameter_time_unit: alert.formatted.fields[ALERT_RULE_PARAMETERS]
            ?.timeUnit as string | undefined,

          // service fields
          'service.name': fields['service.name'],
          'service.environment': fields['service.environment'],
          'transaction.type': fields['transaction.type'],
          'transaction.name': fields['transaction.name'],

          // infra fields
          'host.name': fields['host.name'],
          'container.id': fields['container.id'],
          'kubernetes.pod.name': fields['kubernetes.pod.name'],
        },
      });

      const obsAlertContext = alertContext
        .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
        .join('\n\n');

      return observabilityAIAssistant.getContextualInsightMessages({
        message: `I'm looking at an alert and trying to understand why it was triggered`,
        instructions: dedent(
          `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.

        The following contextual information is available to help you understand the alert:
        ${obsAlertContext}

        The user already know the alert reason so do not repeat this: ${alert.formatted.reason}
        Be brief and to the point.
        Do not list the alert details as bullet points.
        Pay special attention to regressions in downstream dependencies like big increases or decreases in throughput, latency or failure rate
        Suggest reasons why the alert happened and what may have contributed to it.
        Present the primary insights in a single paragraph at the top in bold text. Add additional paragraphs with more detailed insights if needed but keep them brief.
        If the alert is a false positive, mention that in the first paragraph.
        `
        ),
      });
    } catch (e) {
      console.error('An error occurred while fetching alert context', e);
      return observabilityAIAssistant.getContextualInsightMessages({
        message: `I'm looking at an alert and trying to understand why it was triggered`,
        instructions: dedent(
          `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.`
        ),
      });
    }
  }, [alert, http, observabilityAIAssistant]);

  const [summary, setSummary] = useState<React.ReactNode | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!observabilityAIAssistant || !alert) return;
      try {
        setIsLoading(true);
        const messages = await getAlertContextMessages();
        if (!mounted) return;
        // messages may be an array of strings or objects; stringify safely
        const text = Array.isArray(messages)
          ? messages.map((m: any) => (typeof m === 'string' ? m : JSON.stringify(m))).join('\n\n')
          : messages
          ? String(messages)
          : undefined;
        setSummary(text);
      } catch (e) {
        // keep summary undefined on error
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [getAlertContextMessages, observabilityAIAssistant, alert]);

  if (!ObservabilityAIAssistantContextualInsight) {
    return null;
  }

  return (
    <ContextualInsights
      id="alertDetailsContextualInsights"
      title={
        i18n.translate('xpack.observability.alertDetailContextualInsights.title', {
          defaultMessage: 'Alert summary (AI generated)',
        })
      }
      subtitle={
        i18n.translate('xpack.observability.alertDetailContextualInsights.subtitle', {
          defaultMessage: 'Contextual analysis from AI Assistant',
        })
      }
      summary={summary}
      isLoading={isLoading}
      footerLeftContent={
        <EuiText size="xs">
          {i18n.translate('xpack.observability.alertDetailContextualInsights.feedback', {
            defaultMessage: 'Feedback actions here',
          })}
        </EuiText>
      }
    />
    // <ContextualInsights
    //   id="alertDetails"
    //   title={i18n.translate(
    //     'xpack.observability.alertDetailContextualInsights.title',
    //     { defaultMessage: 'Alert Details' }
    //   )}
    //   messages={getAlertContextMessages}
    // />
  );
}
