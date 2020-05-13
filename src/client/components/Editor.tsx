/*

	Editor

*/

import React, { useMemo, useState } from "react"
import { createEditor, Node } from "slate"

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react"
export function MyEditor() {
	const editor = useMemo(() => withReact(createEditor()), [])

	const [value, setValue] = useState<Array<Node>>([
		{
			type: "paragraph",
			children: [{ text: "A line of text in a paragraph." }],
		},
	])

	return (
		<Slate editor={editor} value={value} onChange={(value) => setValue(value)}>
			<Editable />
		</Slate>
	)
}
