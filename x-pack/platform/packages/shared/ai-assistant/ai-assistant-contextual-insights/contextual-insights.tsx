/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// x-pack/plugins/ai_assistant/public/contextual_insights/contextual_insights.tsx

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SparklesIconGradient } from './components/sparkles_icon';

export type ContextualInsightsVariant = 'selfContained' | 'noContainer';

export interface ContextualInsightsProps {
  id: string;

  /** Main title in the header (e.g. “AI summary”, “Contextual insights”) */
  title: ReactNode;

  /** Optional subtitle / description line below the title */
  subtitle?: ReactNode;

  /** Main AI-generated content. Can be plain text, markdown renderer, etc. */
  summary?: ReactNode;

  /** When true, shows skeleton + spinner instead of content */
  isLoading?: boolean;

  /** Optional error message shown in a callout. */
  error?: ReactNode;

  /** Called when user clicks the retry button inside the error callout. */
  onRetry?: () => void;

  /** Called when user clicks “Open in AI Assistant” (or similar). */
  onOpenInAssistant?: () => void;

  /** Optional children rendered under the summary (chips, extra context, etc.) */
  children?: ReactNode;

  /** Optional header controls on the left side of the title (max ~3 per design). */
  headerLeftContent?: ReactNode;

  /** Optional header controls on the right side (max ~3 per design). */
  headerRightContent?: ReactNode;

  /**
   * Optional footer content on the left (chips, “thumbs up/down”, etc.).
   * Max ~3 elements is recommended by design.
   */
  footerLeftContent?: ReactNode;

  /** Footer actions on the right (primary/secondary buttons, max 3). */
  footerActions?: ReactNode;

  /** Whether the whole thing is wrapped in a panel (default) or not. */
  variant?: ContextualInsightsVariant;

  /** Optional compact mode for embedding in dense tables. */
  condensed?: boolean;

  /** Extra test subject for functional tests. */
  ['data-test-subj']?: string;
}

export const ContextualInsights: React.FC<ContextualInsightsProps> = ({
  id,
  title,
  subtitle,
  summary,
  isLoading,
  error,
  onRetry,
  onOpenInAssistant,
  children,
  headerLeftContent,
  headerRightContent,
  footerLeftContent,
  footerActions,
  variant = 'selfContained',
  condensed = false,
  'data-test-subj': dataTestSubj,
}) => {
  const rootTestSubj = useMemo(() => dataTestSubj ?? 'aiContextualInsights', [dataTestSubj]);

  const header = (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="m"
      responsive={false}
      data-test-subj={`${rootTestSubj}Header`}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <SparklesIconGradient />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3 id={id}>{title}</h3>
            </EuiTitle>
            {subtitle ? (
              <EuiText size="xs" color="subdued">
                {subtitle}
              </EuiText>
            ) : null}
          </EuiFlexItem>

          {headerLeftContent ? <EuiFlexItem grow={false}>{headerLeftContent}</EuiFlexItem> : null}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {headerRightContent ? <EuiFlexItem grow={false}>{headerRightContent}</EuiFlexItem> : null}

          {onOpenInAssistant ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="machineLearningApp"
                onClick={onOpenInAssistant}
                data-test-subj={`${rootTestSubj}OpenInAssistantButton`}
              >
                {i18n.translate('xpack.aiAssistant.contextualInsights.openInAssistant', {
                  defaultMessage: 'Open in AI Assistant',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const bodyContent = (() => {
    if (isLoading) {
      return (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.aiAssistant.contextualInsights.loading', {
                  defaultMessage: 'Generating insights…',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiSkeletonTitle size="xs" />
          <EuiSpacer size="s" />
          <EuiSkeletonText lines={3} />
        </>
      );
    }

    if (error) {
      return (
        <EuiCallOut
          color="danger"
          iconType="alert"
          announceOnMount
          title={i18n.translate('xpack.aiAssistant.contextualInsights.errorTitle', {
            defaultMessage: 'Could not generate insights',
          })}
          data-test-subj={`${rootTestSubj}Error`}
        >
          <EuiText size="s">{error}</EuiText>
          {onRetry ? (
            <>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={onRetry}
                data-test-subj={`${rootTestSubj}RetryButton`}
              >
                {i18n.translate('xpack.aiAssistant.contextualInsights.retry', {
                  defaultMessage: 'Try again',
                })}
              </EuiButtonEmpty>
            </>
          ) : null}
        </EuiCallOut>
      );
    }

    if (!summary && !children) {
      return (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.aiAssistant.contextualInsights.emptyState', {
            defaultMessage: 'No insights available for this item yet.',
          })}
        </EuiText>
      );
    }

    return (
      <>
        {summary ? (
          <EuiText size={condensed ? 's' : 'm'}>
            {/* If you later render markdown, plug your markdown renderer here */}
            {summary}
          </EuiText>
        ) : null}
        {children ? (
          <>
            {summary ? <EuiSpacer size="s" /> : null}
            {children}
          </>
        ) : null}
      </>
    );
  })();

  const footer =
    footerLeftContent || footerActions ? (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
        data-test-subj={`${rootTestSubj}Footer`}
      >
        <EuiFlexItem grow={false}>{footerLeftContent}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {footerActions}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;

  const content = (
    <>
      {header}
      <EuiSpacer size={condensed ? 's' : 'm'} />
      <div aria-labelledby={id} data-test-subj={`${rootTestSubj}Body`}>
        {bodyContent}
      </div>
      {footer ? (
        <>
          <EuiSpacer size={condensed ? 's' : 'm'} />
          {variant === 'noContainer' ? <EuiHorizontalRule margin="xs" /> : null}
          {footer}
        </>
      ) : null}
    </>
  );

  if (variant === 'noContainer') {
    return <>{content}</>;
  }

  return (
    <EuiPanel
      paddingSize={condensed ? 's' : 'm'}
      hasShadow={false}
      hasBorder
      data-test-subj={rootTestSubj}
    >
      {content}
    </EuiPanel>
  );
};
