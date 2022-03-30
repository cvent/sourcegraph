import React, { useMemo } from 'react'

import classNames from 'classnames'
import AccountIcon from 'mdi-react/AccountIcon'
import BookOpenBlankVariantIcon from 'mdi-react/BookOpenBlankVariantIcon'
import FileDocumentIcon from 'mdi-react/FileDocumentIcon'
import HistoryIcon from 'mdi-react/HistoryIcon'
import SourceBranchIcon from 'mdi-react/SourceBranchIcon'
import SourceCommitIcon from 'mdi-react/SourceCommitIcon'
import TagIcon from 'mdi-react/TagIcon'

import { Icon, Link } from '@sourcegraph/wildcard'

import { TreeFields } from '../../graphql-operations'

interface TreeTabList {
    tree: TreeFields
    selectedTab: string
    setSelectedTab: (tab: string) => void
}

export const TreeTabList: React.FunctionComponent<TreeTabList> = ({ tree, selectedTab, setSelectedTab }) => {
    type Tabs = { tab: string; title: string; isActive: boolean; logName: string; icon: JSX.Element; url: string }[]

    const tabs: Tabs = useMemo(
        () => [
            {
                tab: 'home',
                title: 'Home',
                isActive: selectedTab === 'home',
                logName: 'RepoHomeTab',
                icon: <Icon as={FileDocumentIcon} />,
                url: `${tree.url}/`,
            },
            {
                tab: 'commits',
                title: 'Commits',
                isActive: selectedTab === 'commits',
                logName: 'RepoCommitsTab',
                icon: <Icon as={SourceCommitIcon} />,
                url: `${tree.url}/-/commits/tab`,
            },
            {
                tab: 'branch',
                title: 'Branches',
                isActive: selectedTab === 'branch',
                logName: 'RepoBranchesTab',
                icon: <Icon as={SourceBranchIcon} />,
                url: `${tree.url}/-/branch/tab`,
            },
            {
                tab: 'tag',
                title: 'Tags',
                isActive: selectedTab === 'tag',
                logName: 'RepoTagsTab',
                icon: <Icon as={TagIcon} />,
                url: `${tree.url}/-/tag/tab`,
            },
            {
                tab: 'compares',
                title: 'Compare',
                isActive: selectedTab === 'compares',
                logName: 'RepoCompareTab',
                icon: <Icon as={HistoryIcon} />,
                url: `${tree.url}/-/compares/tab`,
            },
            {
                tab: 'contributors',
                title: 'Contributors',
                isActive: selectedTab === 'contributors',
                logName: 'RepoContributorsTab',
                icon: <Icon as={AccountIcon} />,
                url: `${tree.url}/-/contributors/tab`,
            },
            {
                tab: 'docs',
                title: 'API docs',
                isActive: selectedTab === 'docs',
                logName: 'RepoAPIDocsTab',
                icon: <Icon as={BookOpenBlankVariantIcon} />,
                url: `${tree.url}/-/docs/tab`,
            },
        ],
        [selectedTab, tree.url]
    )

    return (
        <div className="mb-4">
            <div className="nav nav-tabs">
                {tabs.map(({ tab, title, isActive, logName, icon, url }) => (
                    <div className="nav-item" key={`repo-${tab}-tab`}>
                        <Link
                            to={url}
                            role="button"
                            className={classNames('nav-link text-content', isActive && 'active')}
                            onClick={() => setSelectedTab(tab)}
                        >
                            <span className="d-inline-flex" data-tab-content={title}>
                                {icon} {title}
                            </span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}
