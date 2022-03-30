import React, { useMemo, useEffect, useState } from 'react'

import classNames from 'classnames'
import * as H from 'history'
import FolderIcon from 'mdi-react/FolderIcon'
import SourceRepositoryIcon from 'mdi-react/SourceRepositoryIcon'
import { Redirect, Route, Switch } from 'react-router-dom'
import { catchError } from 'rxjs/operators'

import { ErrorAlert } from '@sourcegraph/branded/src/components/alerts'
import { asError, ErrorLike, isErrorLike } from '@sourcegraph/common'
import { gql } from '@sourcegraph/http-client'
import { SearchContextProps } from '@sourcegraph/search'
import { ActivationProps } from '@sourcegraph/shared/src/components/activation/Activation'
import { displayRepoName } from '@sourcegraph/shared/src/components/RepoFileLink'
import { ExtensionsControllerProps } from '@sourcegraph/shared/src/extensions/controller'
import { PlatformContextProps } from '@sourcegraph/shared/src/platform/context'
import { Settings } from '@sourcegraph/shared/src/schema/settings.schema'
import { SettingsCascadeProps } from '@sourcegraph/shared/src/settings/settings'
import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { ThemeProps } from '@sourcegraph/shared/src/theme'
import { toURIWithPath, toPrettyBlobURL } from '@sourcegraph/shared/src/util/url'
import { Container, PageHeader, LoadingSpinner, useObservable } from '@sourcegraph/wildcard'

import { BatchChangesProps } from '../../batches'
import { CodeIntelligenceProps } from '../../codeintel'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { PageTitle } from '../../components/PageTitle'
import { TreePageRepositoryFields  } from '../../graphql-operations'
import { basename } from '../../util/path'
import { fetchTreeEntries } from '../backend'
import { FilePathBreadcrumbs } from '../FilePathBreadcrumbs'
import { RepoCommits, RepoDocs } from '../routes'

import { RepositoryBranchesTab } from './BranchesTab'
import { HomeTab } from './HomeTab'
import { RepositoryTagTab } from './TagTab'
import { TreeNavigation } from './TreeNavigation'
import { TreeTabList } from './TreeTabList'

import styles from './TreePage.module.scss'

interface Props
    extends SettingsCascadeProps<Settings>,
        ExtensionsControllerProps,
        PlatformContextProps,
        ThemeProps,
        TelemetryProps,
        ActivationProps,
        CodeIntelligenceProps,
        BatchChangesProps,
        Pick<SearchContextProps, 'selectedSearchContextSpec'>,
        BreadcrumbSetters {
    repo: TreePageRepositoryFields
    /** The tree's path in TreePage. We call it filePath for consistency elsewhere. */
    filePath: string
    commitID: string
    revision: string
    location: H.Location
    history: H.History
    globbing: boolean
}

export const treePageRepositoryFragment = gql`
    fragment TreePageRepositoryFields on Repository {
        id
        name
        description
        viewerCanAdminister
        url
    }
`

export const TreePage: React.FunctionComponent<Props> = ({
    repo,
    commitID,
    revision,
    filePath,
    settingsCascade,
    useBreadcrumb,
    codeIntelligenceEnabled,
    batchChangesEnabled,
    ...props
}) => {
    useEffect(() => {
        if (filePath === '') {
            props.telemetryService.logViewEvent('Repository')
        } else {
            props.telemetryService.logViewEvent('Tree')
        }
    }, [filePath, props.telemetryService])

    useBreadcrumb(
        useMemo(() => {
            if (!filePath) {
                return
            }
            return {
                key: 'treePath',
                className: 'flex-shrink-past-contents',
                element: (
                    <FilePathBreadcrumbs
                        key="path"
                        repoName={repo.name}
                        revision={revision}
                        filePath={filePath}
                        isDir={true}
                        repoUrl={repo.url}
                        telemetryService={props.telemetryService}
                    />
                ),
            }
        }, [repo.name, repo.url, revision, filePath, props.telemetryService])
    )

    const treeOrError = useObservable(
        useMemo(
            () =>
                fetchTreeEntries({
                    repoName: repo.name,
                    commitID,
                    revision,
                    filePath,
                    first: 2500,
                }).pipe(catchError((error): [ErrorLike] => [asError(error)])),
            [repo.name, commitID, revision, filePath]
        )
    )

    const showCodeInsights =
        !isErrorLike(settingsCascade.final) &&
        !!settingsCascade.final?.experimentalFeatures?.codeInsights &&
        settingsCascade.final['insights.displayLocation.directory'] === true

    // Add DirectoryViewer
    const uri = toURIWithPath({ repoName: repo.name, commitID, filePath })

    useEffect(() => {
        if (!showCodeInsights) {
            return
        }

        const viewerIdPromise = props.extensionsController.extHostAPI
            .then(extensionHostAPI =>
                extensionHostAPI.addViewerIfNotExists({
                    type: 'DirectoryViewer',
                    isActive: true,
                    resource: uri,
                })
            )
            .catch(error => {
                console.error('Error adding viewer to extension host:', error)
                return null
            })

        return () => {
            Promise.all([props.extensionsController.extHostAPI, viewerIdPromise])
                .then(([extensionHostAPI, viewerId]) => {
                    if (viewerId) {
                        return extensionHostAPI.removeViewer(viewerId)
                    }
                    return
                })
                .catch(error => console.error('Error removing viewer from extension host:', error))
        }
    }, [uri, showCodeInsights, props.extensionsController])

    const getPageTitle = (): string => {
        const repoString = displayRepoName(repo.name)
        if (filePath) {
            return `${basename(filePath)} - ${repoString}`
        }
        return `${repoString}`
    }

    const newRepoPage = true

    const homeTabProps = {
        repo,
        commitID,
        revision,
        filePath,
        settingsCascade,
        codeIntelligenceEnabled,
        batchChangesEnabled,
        location,
    }

    const [selectedTab, setSelectedTab] = useState('home')

    return (
        <div className={styles.treePage}>
            <Container className={styles.container}>
                <PageTitle title={getPageTitle()} />
                {treeOrError === undefined ? (
                    <div>
                        <LoadingSpinner /> Loading files and directories
                    </div>
                ) : isErrorLike(treeOrError) ? (
                    // If the tree is actually a blob, be helpful and redirect to the blob page.
                    // We don't have error names on GraphQL errors.
                    /not a directory/i.test(treeOrError.message) ? (
                        <Redirect to={toPrettyBlobURL({ repoName: repo.name, revision, commitID, filePath })} />
                    ) : (
                        <ErrorAlert error={treeOrError} />
                    )
                ) : (
                    <>
                        <header className="mb-3">
                            {treeOrError.isRoot ? (
                                <>
                                    <PageHeader
                                        path={[{ icon: SourceRepositoryIcon, text: displayRepoName(repo.name) }]}
                                        className="mb-3 test-tree-page-title"
                                    />
                                    {repo.description && <p>{repo.description}</p>}
                                    {!newRepoPage && (
                                        <TreeNavigation
                                            batchChangesEnabled={batchChangesEnabled}
                                            codeIntelligenceEnabled={codeIntelligenceEnabled}
                                            repo={repo}
                                            revision={revision}
                                            tree={treeOrError}
                                        />
                                    )}
                                </>
                            ) : (
                                <PageHeader
                                    path={[{ icon: FolderIcon, text: filePath }]}
                                    className="mb-3 test-tree-page-title"
                                />
                            )}
                        </header>

                        <div>
                            <TreeTabList tree={treeOrError} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

                            <section className={classNames('test-tree-entries mb-3', styles.section)}>
                                <Switch>
                                    <Route path={`${treeOrError.url}/-/docs/tab`}>
                                        <RepoDocs repo={repo} useBreadcrumb={useBreadcrumb} {...props} />
                                    </Route>
                                    <Route path={`${treeOrError.url}/-/commits/tab`}>
                                        <RepoCommits repo={repo} useBreadcrumb={useBreadcrumb} {...props} />
                                    </Route>
                                    <Route path={`${treeOrError.url}/-/home/tab`}>
                                        <HomeTab {...homeTabProps} {...props} repo={repo} />
                                    </Route>
                                    <Route path={`${treeOrError.url}/-/branch/tab`}>
                                        <RepositoryBranchesTab repo={repo} location={location} history={history} />
                                    </Route>
                                    <Route path={`${treeOrError.url}/-/tag/tab`}>
                                        <RepositoryTagTab repo={repo} location={location} history={history} {...props}/>
                                    </Route>
                                </Switch>
                                {selectedTab === 'home' && <HomeTab {...homeTabProps} {...props} repo={repo} />}
                            </section>
                        </div>
                    </>
                )}
            </Container>
        </div>
    )
}
