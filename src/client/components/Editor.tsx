/*

	Editor

*/

import React, { useMemo, useState } from "react"
import {
	createEditor,
	Node,
	IEditor,
	Editor,
	Element,
	Text,
	Transforms,
} from "slate"
import {
	Slate,
	Editable,
	withReact,
	RenderElementProps,
	RenderLeafProps,
} from "slate-react"
import isHotkey from "is-hotkey"

/*
Todo:
- [x] basic blocks
- [x] basic annotations
- [x] types
	- [x] file a typescript issue
				https://github.com/ianstormtaylor/slate/issues/3680
- [ ] markdown autocomplete basics
- command prompt
- polish
	- linkify
	- arrow complete ->
	- more block types
	- more annotations
	- more markdown completions
	- keyboard option+up blocks
	- tags + tag completion
- images
- simple embeds
- nested page
- block selection outside of slate?

*/

declare module "slate" {
	interface IText {
		bold?: string
	}

	interface IElement {
		type: "paragraph" | "code"
	}
}

// HERE:
// - Separate into code module.
// - Extend Editor helpers and Element type.
// https://github.com/ianstormtaylor/slate/issues/3680
function isCodeBlockActive(editor: IEditor) {
	const [match] = Editor.nodes(editor, {
		match: (n) => Element.isElement(n) && n.type === "code",
	})

	return !!match
}

function toggleCodeBlock(editor: IEditor) {
	const isActive = isCodeBlockActive(editor)
	Transforms.setNodes(
		editor,
		{ type: isActive ? null : "code" },
		{ match: (n) => Editor.isBlock(editor, n) }
	)
}

function isBoldMarkActive(editor: IEditor) {
	const [match] = Editor.nodes(editor, {
		match: (n) => n.bold === true,
		universal: true,
	})

	return !!match
}

function toggleBoldMark(editor: IEditor) {
	const isActive = isBoldMarkActive(editor)
	Transforms.setNodes(
		editor,
		{ bold: isActive ? null : true },
		{ match: (n) => Text.isText(n), split: true }
	)
}

export function MyEditor() {
	const editor = useMemo(() => withReact(createEditor()), [])

	const [value, setValue] = useState<Array<Node>>([
		{
			type: "paragraph",
			children: [{ text: "A line of text in a paragraph." }],
		},
	])

	const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
		if (isHotkey("mod+e", event.nativeEvent)) {
			event.preventDefault()
			toggleCodeBlock(editor)
		} else if (isHotkey("mod+b", event.nativeEvent)) {
			event.preventDefault()
			toggleBoldMark(editor)
		}
	}, [])

	return (
		<Slate editor={editor} value={value} onChange={(value) => setValue(value)}>
			<Editable
				renderElement={renderElement}
				renderLeaf={renderLeaf}
				onKeyDown={handleKeyDown}
			/>
		</Slate>
	)
}

function CodeElement(props: RenderElementProps) {
	return (
		<pre {...props.attributes}>
			<code>{props.children}</code>
		</pre>
	)
}

function DefaultElement(props: RenderElementProps) {
	return <p {...props.attributes}>{props.children}</p>
}

function renderElement(props: RenderElementProps) {
	switch (props.element.type) {
		case "code":
			return <CodeElement {...props} />
		default:
			return <DefaultElement {...props} />
	}
}

function renderLeaf(props: RenderLeafProps) {
	let style: React.CSSProperties = {}
	if (props.leaf.bold) {
		style.fontWeight = "bold"
	}
	return (
		<span {...props.attributes} style={style}>
			{props.children}
		</span>
	)
}

// const withImages = editor => {
//   const { isVoid } = editor

//   editor.isVoid = element => {
//     return element.type === 'image' ? true : isVoid(editor)
//   }

//   return editor
// }

// import { Editor, Element } from 'slate'

// const MyEditor = {
//   ...Editor,
//   insertImage(editor, url) {
//     const element = { type: 'image', url, children: [{ text: '' }] }
//     Transforms.insertNodes(editor, element)
//   },
// }

// const MyElement = {
//   ...Element,
//   isImageElement(value) {
//     return Element.isElement(element) && element.type === 'image'
//   },
// }
