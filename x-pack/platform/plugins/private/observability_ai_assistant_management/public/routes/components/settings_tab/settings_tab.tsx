/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { useGenAIConnectors, useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { UISettings } from './ui_settings';
import { ProductDocSetting } from './product_doc_setting';
import { ChangeKbModel } from './change_kb_model';
import { getMappedInferenceId } from '../../../helpers/inference_utils';
import { StatusSection } from './status_section';

export function SettingsTab() {
  const { productDocBase } = useKibana().services;

  const knowledgeBase = useKnowledgeBase();
  const currentlyDeployedInferenceId = getMappedInferenceId(
    knowledgeBase.status.value?.currentInferenceId
  );

  const connectors = useGenAIConnectors();

  const modelStatus = knowledgeBase.status.value?.enabled ? 'Installed' : 'Not installed';
  const docStatus = knowledgeBase.status.value?.productDocStatus === 'installed' ? 'Installed' : 'Not installed';


  return (
    <EuiPanel hasBorder grow={false}>
      <StatusSection
        modelStatus={modelStatus}
        docStatus={docStatus}
        modelOptions={[
          { value: 'elser_v2', text: 'ELSER v2 (English-only)' },
          { value: 'other_model', text: 'Other Model' },
        ]}
        selectedModel={true}
        onModelChange={true}
        onInstallClick={true}
        knowledgeBase={knowledgeBase}
        currentlyDeployedInferenceId={currentlyDeployedInferenceId}
        connectors={connectors}
      />
      <EuiSpacer size="s" />
      <UISettings knowledgeBase={knowledgeBase} />
    </EuiPanel>
  );
}
