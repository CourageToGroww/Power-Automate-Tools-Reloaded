import {
  CommandBar,
  ICommandBarItemProps
} from '@fluentui/react/lib/CommandBar';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useMemo, useState } from 'react';
import { LoaderModal } from '../../common/components/LoaderModal';
import { Messages } from '../../common/components/Messages';
import { FlowValidationResult } from './FlowValidationResult';
import { useFlowEditor } from './useFlowEditor';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

const editorContainerClassName = mergeStyles({
  flex: 1,
});

// Helper function to find matching brackets
function findMatchingBrackets(text: string, position: number): { start: number; end: number } | null {
  const char = text[position];
  
  if (char === '{') {
    // Find closing bracket
    let count = 1;
    let i = position + 1;
    let inString = false;
    let escapeNext = false;
    
    while (i < text.length && count > 0) {
      const currentChar = text[i];
      
      if (escapeNext) {
        escapeNext = false;
      } else if (currentChar === '\\') {
        escapeNext = true;
      } else if (currentChar === '"' && !inString) {
        inString = true;
      } else if (currentChar === '"' && inString) {
        inString = false;
      } else if (!inString) {
        if (currentChar === '{') count++;
        else if (currentChar === '}') count--;
      }
      
      i++;
    }
    
    if (count === 0) {
      return { start: position, end: i - 1 };
    }
  } else if (char === '}') {
    // Find opening bracket
    let count = 1;
    let i = position - 1;
    let inString = false;
    
    while (i >= 0 && count > 0) {
      const currentChar = text[i];
      
      if (currentChar === '"') {
        // Check if it's escaped
        let escapeCount = 0;
        let j = i - 1;
        while (j >= 0 && text[j] === '\\') {
          escapeCount++;
          j--;
        }
        if (escapeCount % 2 === 0) {
          inString = !inString;
        }
      } else if (!inString) {
        if (currentChar === '}') count++;
        else if (currentChar === '{') count--;
      }
      
      i--;
    }
    
    if (count === 0) {
      return { start: i + 1, end: position };
    }
  }
  
  // Also check the character after cursor
  if (position + 1 < text.length) {
    return findMatchingBrackets(text, position + 1);
  }
  
  return null;
}

export const FlowEditorPage: React.FC = () => {
  const { theme } = useTheme();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>(
    null as any
  );
  const [blockDecorations, setBlockDecorations] = useState<string[]>([]);
  const {
    name,
    environment,
    definition,
    isLoading,
    saveDefinition,
    validate,
    messages,
    onDismissed,
    validationResult,
    validationPaneIsOpen,
    setValidationPaneIsOpen,
  } = useFlowEditor();

  const refreshToken = () => {
    chrome.runtime.sendMessage({ type: 'refresh' });
  };

  const commandBarItems = useMemo(
    () =>
      [
        {
          key: 'name',
          text: name || 'Loading...',
        },
        {
          key: 'save',
          text: 'Save',
          iconProps: {
            iconName: 'Save',
          },
          disabled: !editor || !definition,
          onClick: async () => {
            const savedDefinition = await saveDefinition(name, environment, editor.getValue());

            if (savedDefinition) {
              editor.setValue(savedDefinition);
            }
          },
        },
        {
          key: 'validate',
          text: 'Validate',
          iconProps: {
            iconName: 'ComplianceAudit',
          },
          disabled: !editor || !definition,
          onClick: () => validate(editor.getValue()),
        },
        {
          key: 'refresh',
          text: 'Refresh Token',
          iconProps: {
            iconName: 'Refresh',
          },
          onClick: refreshToken,
        },
      ] as ICommandBarItemProps[],
    [name, editor, definition, saveDefinition, validate, environment]
  );

  const commandBarFarItems = useMemo(
    () => [
      {
        key: 'theme',
        onRender: () => <ThemeToggle />
      }
    ],
    []
  );

  return (
    <>
      {isLoading && <LoaderModal />}
      <Messages items={messages} onDismissed={onDismissed} />
      <FlowValidationResult
        errors={validationResult.errors}
        warnings={validationResult.warnings}
        isOpen={validationPaneIsOpen}
        onClose={() => setValidationPaneIsOpen(false)}
      />
      <CommandBar items={commandBarItems} farItems={commandBarFarItems} />
      {!!definition && (
        <div className={editorContainerClassName}>
          <Editor
            defaultValue={definition}
            language="json"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            onMount={(editor) => {
              setEditor(editor);
              
              // Add block highlighting on cursor position change
              editor.onDidChangeCursorPosition((e) => {
                const model = editor.getModel();
                if (!model) return;
                
                const position = e.position;
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                
                // Check if cursor is at a bracket
                const charAtCursor = text[offset - 1];
                const charAfterCursor = text[offset];
                
                if (charAtCursor === '{' || charAtCursor === '}' || charAfterCursor === '{' || charAfterCursor === '}') {
                  // Find the matching bracket and highlight the block
                  const brackets = findMatchingBrackets(text, offset - 1);
                  if (brackets) {
                    const startPos = model.getPositionAt(brackets.start);
                    const endPos = model.getPositionAt(brackets.end + 1);
                    
                    // Clear previous decorations
                    const oldDecorations = blockDecorations;
                    
                    // Apply new decoration
                    const newDecorations = editor.deltaDecorations(oldDecorations, [
                      {
                        range: new monaco.Range(
                          startPos.lineNumber,
                          startPos.column,
                          endPos.lineNumber,
                          endPos.column
                        ),
                        options: {
                          className: 'block-highlight',
                          isWholeLine: false,
                          linesDecorationsClassName: 'block-highlight-margin'
                        }
                      }
                    ]);
                    
                    setBlockDecorations(newDecorations);
                  } else {
                    // Clear decorations if no matching brackets
                    editor.deltaDecorations(blockDecorations, []);
                    setBlockDecorations([]);
                  }
                } else {
                  // Clear decorations if not at a bracket
                  editor.deltaDecorations(blockDecorations, []);
                  setBlockDecorations([]);
                }
              });
              
              // Add CSS for highlighting
              const style = document.createElement('style');
              style.textContent = `
                .block-highlight {
                  background-color: rgba(65, 150, 255, 0.15);
                  border: 1px solid rgba(65, 150, 255, 0.3);
                  border-radius: 3px;
                }
                .block-highlight-margin {
                  background-color: #4196ff;
                  width: 3px !important;
                }
                .monaco-editor .block-highlight {
                  background-color: rgba(65, 150, 255, 0.15);
                }
                .monaco-editor.vs-dark .block-highlight {
                  background-color: rgba(65, 150, 255, 0.25);
                }
              `;
              document.head.appendChild(style);
              
              // Add keyboard shortcut to select highlighted block
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
                const model = editor.getModel();
                if (!model) return;
                
                const position = editor.getPosition();
                if (!position) return;
                
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                const brackets = findMatchingBrackets(text, offset - 1);
                
                if (brackets) {
                  const startPos = model.getPositionAt(brackets.start);
                  const endPos = model.getPositionAt(brackets.end + 1);
                  
                  editor.setSelection(new monaco.Selection(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column
                  ));
                }
              });
            }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              bracketPairColorization: {
                enabled: true,
              },
              matchBrackets: 'always',
            }}
          />
        </div>
      )}
    </>
  );
};
