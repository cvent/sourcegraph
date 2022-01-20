import classNames from 'classnames'
import { noop } from 'lodash'
import PencilIcon from 'mdi-react/PencilIcon'
import PlayCircleOutlineIcon from 'mdi-react/PlayCircleOutlineIcon'
import * as Monaco from 'monaco-editor'
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import ElmApp from 'react-elm-components'

import { ThemeProps } from '@sourcegraph/shared/src/theme'
import { MonacoEditor } from '@sourcegraph/web/src/components/MonacoEditor'

import blockStyles from './SearchNotebookBlock.module.scss'
import { BlockMenuAction, SearchNotebookBlockMenu } from './SearchNotebookBlockMenu'
import styles from './SearchNotebookMarkdownBlock.module.scss'
import Main from './todomvc.js'
import { useBlockSelection } from './useBlockSelection'
import { useBlockShortcuts } from './useBlockShortcuts'
import { useCommonBlockMenuActions } from './useCommonBlockMenuActions'
import { MONACO_BLOCK_INPUT_OPTIONS } from './useMonacoBlockInput'

import { BlockProps, ComputeBlock } from '.'

interface SearchNotebookComputeBlockProps extends BlockProps, ComputeBlock, ThemeProps {
    isMacPlatform: boolean
}

export const SearchNotebookComputeBlock: React.FunctionComponent<SearchNotebookComputeBlockProps> = ({
    id,
    input,
    output,
    isSelected,
    isLightTheme,
    isMacPlatform,
    isReadOnly,
    onRunBlock,
    onSelectBlock,
    ...props
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor>()
    const blockElement = useRef<HTMLDivElement>(null)

    const runBlock = useCallback(
        (id: string) => {
            onRunBlock(id)
            setIsEditing(false)
        },
        [onRunBlock, setIsEditing]
    )

    /*
    const { isInputFocused } = useMonacoBlockInput({
        editor,
        id,
        ...props,
        onSelectBlock,
        onRunBlock: runBlock,
    })
    */
    const isInputFocused = false

    const onDoubleClick = useCallback(() => {
        if (isReadOnly) {
            return
        }
        if (!isEditing) {
            setIsEditing(true)
            onSelectBlock(id)
        }
    }, [id, isReadOnly, isEditing, setIsEditing, onSelectBlock])

    // setTimeout turns on editing mode in a separate run-loop which prevents adding a newline at the start of the input
    const onEnterBlock = useCallback(() => {
        if (isReadOnly) {
            return
        }
        setTimeout(() => setIsEditing(true), 0)
    }, [isReadOnly, setIsEditing])

    const { onSelect } = useBlockSelection({
        id,
        blockElement: blockElement.current,
        isSelected,
        isInputFocused,
        onSelectBlock,
        ...props,
    })

    const { onKeyDown } = useBlockShortcuts({ id, isMacPlatform, onEnterBlock, ...props, onRunBlock: runBlock })

    useEffect(() => {
        if (isEditing) {
            editor?.focus()
        }
    }, [isEditing, editor])

    const modifierKeyLabel = isMacPlatform ? '⌘' : 'Ctrl'
    const commonMenuActions = useCommonBlockMenuActions({
        modifierKeyLabel,
        isInputFocused,
        isReadOnly,
        isMacPlatform,
        ...props,
    })
    const menuActions = useMemo(() => {
        const action: BlockMenuAction[] = [
            isEditing
                ? {
                      type: 'button',
                      label: 'Render',
                      icon: <PlayCircleOutlineIcon className="icon-inline" />,
                      onClick: runBlock,
                      keyboardShortcutLabel: `${modifierKeyLabel} + ↵`,
                  }
                : {
                      type: 'button',
                      label: 'Edit',
                      icon: <PencilIcon className="icon-inline" />,
                      onClick: onEnterBlock,
                      keyboardShortcutLabel: '↵',
                  },
        ]
        return action.concat(commonMenuActions)
    }, [isEditing, modifierKeyLabel, runBlock, onEnterBlock, commonMenuActions])

    const blockMenu = isSelected && !isReadOnly && <SearchNotebookBlockMenu id={id} actions={menuActions} />

    return (
        <div className={classNames('block-wrapper', blockStyles.blockWrapper)} data-block-id={id}>
            {/* See the explanation for the disable above. */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
                className={classNames(
                    blockStyles.block,
                    styles.input,
                    (isInputFocused || isSelected) && blockStyles.selected
                )}
                onClick={onSelect}
                onFocus={onSelect}
                onKeyDown={onKeyDown}
                // A tabIndex is necessary to make the block focusable.
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                tabIndex={0}
                aria-label="Notebook compute block"
                ref={blockElement}
            >
                <div className={blockStyles.monacoWrapper}>
                    <MonacoEditor
                        language="markdown"
                        value={input}
                        height="auto"
                        isLightTheme={isLightTheme}
                        editorWillMount={noop}
                        onEditorCreated={setEditor}
                        options={MONACO_BLOCK_INPUT_OPTIONS}
                        border={false}
                    />
                </div>
                <div>
                    <ElmApp src={Main} />
                </div>
            </div>
            {blockMenu}
        </div>
    )
}
