import { Meta, Story } from '@storybook/react'
import { of } from 'rxjs'

import { NOOP_TELEMETRY_SERVICE } from '@sourcegraph/shared/src/telemetry/telemetryService'

import { WebStory } from '../../../../../components/WebStory'
import { useCodeInsightsState } from '../../../../../stores'
import { CodeInsightsBackendStoryMock } from '../../../CodeInsightsBackendStoryMock'
import { CodeInsightsGqlBackend } from '../../../core/backend/gql-backend/code-insights-gql-backend'
import { InsightsDashboardOwnerType } from '../../../core/types'

import { InsightsDashboardCreationPage } from './InsightsDashboardCreationPage'

const config: Meta = {
    title: 'web/insights/InsightsDashboardCreationPage',
    decorators: [story => <WebStory>{() => story()}</WebStory>],
    parameters: {
        chromatic: {
            viewports: [576, 1440],
            disableSnapshot: false,
        },
    },
}

export default config

const codeInsightsBackend: Partial<CodeInsightsGqlBackend> = {
    getDashboardOwners: () =>
        of([
            { type: InsightsDashboardOwnerType.Personal, id: '001', title: 'Personal' },
            { type: InsightsDashboardOwnerType.Organization, id: '002', title: 'Organization 1' },
            { type: InsightsDashboardOwnerType.Organization, id: '003', title: 'Organization 2' },
            { type: InsightsDashboardOwnerType.Global, id: '004', title: 'Global' },
        ]),
}

export const InsightsDashboardCreationLicensed: Story = () => {
    useCodeInsightsState.setState({ licensed: true, insightsLimit: null })

    return (
        <CodeInsightsBackendStoryMock mocks={codeInsightsBackend}>
            <InsightsDashboardCreationPage telemetryService={NOOP_TELEMETRY_SERVICE} />
        </CodeInsightsBackendStoryMock>
    )
}

export const InsightsDashboardCreationUnlicensed: Story = () => {
    useCodeInsightsState.setState({ licensed: false, insightsLimit: 2 })

    return (
        <CodeInsightsBackendStoryMock mocks={codeInsightsBackend}>
            <InsightsDashboardCreationPage telemetryService={NOOP_TELEMETRY_SERVICE} />
        </CodeInsightsBackendStoryMock>
    )
}
