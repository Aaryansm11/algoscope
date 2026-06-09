import { useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

const setExecLine = StateEffect.define<number | null>();

const execField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setExecLine)) {
        const ln = e.value;
        if (!ln || ln < 1 || ln > tr.state.doc.lines) {
          deco = Decoration.none;
        } else {
          const line = tr.state.doc.line(ln);
          deco = Decoration.set([
            Decoration.line({ class: "cm-exec-line" }).range(line.from),
          ]);
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function CodeEditor({
  value,
  onChange,
  execLine,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  execLine?: number | null;
  readOnly?: boolean;
}) {
  const ref = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const view = ref.current?.view;
    if (view) view.dispatch({ effects: setExecLine.of(execLine ?? null) });
  }, [execLine]);

  return (
    <CodeMirror
      ref={ref}
      value={value}
      onChange={onChange}
      theme={vscodeDark}
      height="100%"
      readOnly={readOnly}
      extensions={[python(), execField]}
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      style={{ height: "100%" }}
    />
  );
}
