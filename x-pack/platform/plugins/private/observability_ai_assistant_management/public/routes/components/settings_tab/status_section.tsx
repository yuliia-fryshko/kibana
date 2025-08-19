import React from 'react';
import {
  EuiText,
  EuiBadge,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { ChangeKbModel } from './change_kb_model';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';


interface StatusSectionProps {
  modelStatus: string;
  docStatus: string;
  modelOptions: Array<{ value: string; inputDisplay: string }>;
  selectedModel: string;
  onModelChange: (value: string) => void;
  onInstallClick: () => void;
  knowledgeBase: UseKnowledgeBaseResult;
  currentlyDeployedInferenceId: string | undefined;
}

const inferenceModelStateBadge = (state: string) => {
  switch (state) {
    case 'NOT_INSTALLED':
      return <EuiBadge>Not installed</EuiBadge>;
    case 'MODEL_PENDING_ALLOCATION':
      return <EuiBadge>Model pending allocation</EuiBadge>;
    case 'MODEL_PENDING_DEPLOYMENT':
      return <EuiBadge>Model pending deployment...</EuiBadge>;
    case 'DEPLOYING_MODEL':
      return (
        <EuiBadge>
          Deploying model... <EuiIcon type="loading" size="s" />
        </EuiBadge>
      );
    case 'READY':
      return <EuiBadge color="success">Installed</EuiBadge>;
    case 'ERROR':
      return <EuiBadge color="danger">Error</EuiBadge>;
    default:
      return <EuiBadge color="default">{state}</EuiBadge>;
  }
};

const productDocStatusBadge = (status: string) => {
  switch (status) {
    case 'uninstalled':
      return <EuiBadge>Not installed</EuiBadge>;
    case 'installing':
      return (
        <EuiBadge>
          Installing... <EuiIcon type="loading" size="s" />
        </EuiBadge>
      );
    case 'installed':
      return <EuiBadge color="success">Installed</EuiBadge>;
    default:
      return <EuiBadge color="default">{status}</EuiBadge>;
  }
};

export const StatusSection: React.FC<StatusSectionProps> = ({
  modelStatus,
  docStatus,
  modelOptions,
  selectedModel,
  onModelChange,
  onInstallClick,
  knowledgeBase,
  currentlyDeployedInferenceId,
  connectors
}) => {
  console.log('productDocStatus:', knowledgeBase.status.value?.productDocStatus);

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>Set text embeddings model for Knowledge base</h3>}
        description={
          <>
            <EuiText size="s" color="subdued">
              Choose the default model (and language) for the Assistant's responses. The Elastic documentation will be installed by default to help the Assistant answer questions.
              <EuiLink
                href="https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-built-in-models"
                target="_blank"
                style={{ marginLeft: 8 }}
              >
                Learn more
              </EuiLink>
            </EuiText>
            <EuiFlexGroup gutterSize="xs" alignItems="flexStart" css={{ marginTop: 8 }}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginTop: 4 }}>
                    <li style={{ marginBottom: 6 }}>
                      <EuiText size="s" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span>Text embeddings model status:</span>
                        <EuiBadge>
                          {inferenceModelStateBadge(String(knowledgeBase.status?.value?.inferenceModelState))}
                        </EuiBadge>
                      </EuiText>
                    </li>
                    <li>
                      <EuiText
                        size="s"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                        <span>
                          Elastic documentation <EuiIcon type="beaker" size="s" /> status:
                        </span>
                        <EuiBadge color={docStatus === 'Installed' ? 'success' : 'default'}>
                           {productDocStatusBadge(String(knowledgeBase.status.value?.productDocStatus))}
                        </EuiBadge>
                      </EuiText>
                    </li>
                  </ul>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        }
      >
        <EuiFormRow label="aiAssistantResponseLanguage" fullWidth>
          <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
            <EuiFlexItem>
                      {/* {knowledgeBase.status.value?.enabled && connectors.connectors?.length ? ( */}
                        <ChangeKbModel
                          knowledgeBase={knowledgeBase}
                          currentlyDeployedInferenceId={currentlyDeployedInferenceId}
                        />
                      {/* ) : null} */}
                    </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};

