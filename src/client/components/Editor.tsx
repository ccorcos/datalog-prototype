/*

	Editor

*/

import * as _ from "lodash"
import React, { useMemo, useState, CSSProperties } from "react"
import { createEditor, Node, Editor, Element, Text, Transforms } from "slate"
import {
	Slate,
	Editable,
	withReact,
	RenderElementProps,
	RenderLeafProps,
} from "slate-react"
import isHotkey from "is-hotkey"
import { unionTypeValues, objectEntries } from "../../shared/typeUtils"

/*
Todo:
- [x] basic blocks
- [x] basic annotations
- [x] types
	- [x] file a typescript issue
				https://github.com/ianstormtaylor/slate/issues/3680

- [x] better types and generalization
- [ ] toggle bold with collapsed selection check.
- [ ] inline code should be an inline element.

- [ ] toolbar for block types and annotations.
	- [ ] popups for keyboard shortcuts.

- [ ] markdown autocomplete basics

- [ ] load and persist to database
- [ ] nested pages


- [ ] command prompt
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

interface ParagraphElement {
	type: "paragraph"
	children: Array<InlineElement | TextMarkup>
}

interface CodeElement {
	type: "code"
	children: Array<InlineElement | TextMarkup>
}

interface QuoteElement {
	type: "quote"
	children: Array<InlineElement | TextMarkup>
}

interface BulletedListElement {
	type: "bulleted-list"
	children: Array<InlineElement | TextMarkup>
}

interface NumberedListElement {
	type: "numbered-list"
	children: Array<InlineElement | TextMarkup>
}

interface HeadingOneElement {
	type: "heading-one"
	children: Array<InlineElement | TextMarkup>
}

interface HeadingTwoElement {
	type: "heading-two"
	children: Array<InlineElement | TextMarkup>
}

interface HeadingThreeElement {
	type: "heading-Three"
	children: Array<InlineElement | TextMarkup>
}

type BlockElement =
	| ParagraphElement
	| CodeElement
	| QuoteElement
	| BulletedListElement
	| NumberedListElement
	| HeadingOneElement
	| HeadingTwoElement
	| HeadingThreeElement
type BlockType = BlockElement["type"]

const blockTypes = unionTypeValues<BlockType>({
	paragraph: true,
	code: true,
	quote: true,
	"bulleted-list": true,
	"numbered-list": true,
	"heading-one": true,
	"heading-two": true,
	"heading-Three": true,
})

interface LinkElement {
	type: "url"
	url: string
	children: Array<TextMarkup>
}

interface TagElement {
	type: "tag"
	tag: string
	children: Array<TextMarkup>
}

type InlineElement = LinkElement | TagElement

type InlineType = InlineElement["type"]

const inlineTypes = unionTypeValues<InlineType>({
	url: true,
	tag: true,
})

type TextMarkup = {
	text: string
	bold?: boolean
	italic?: boolean
	strike?: boolean
	code?: boolean
	// underline, overline
}

type TextAnnotation = keyof Omit<TextMarkup, "text">

const textAnnotations = unionTypeValues<TextAnnotation>({
	bold: true,
	italic: true,
	strike: true,
	code: true,
})

// ============================================================================
// Block Helpers.
// ============================================================================

function isBlockTypeInSelection(editor: Editor, type: BlockType) {
	const [match] = Editor.nodes(editor, {
		match: (n) => Element.isElement(n) && n.type === type,
	})
	return Boolean(match)
}

function transformSelectedBlocks(editor: Editor, type: BlockType) {
	Transforms.setNodes(
		editor,
		{ type: type },
		{ match: (n) => Editor.isBlock(editor, n) }
	)
}

function toggleSelectedBlocks(
	editor: Editor,
	type: BlockType,
	fallback: BlockType = "paragraph"
) {
	const isActive = isBlockTypeInSelection(editor, type)
	if (isActive) {
		transformSelectedBlocks(editor, fallback)
	} else {
		transformSelectedBlocks(editor, type)
	}
}

// ============================================================================
// Text Helpers.
// ============================================================================

function isSelectionCollapsed(editor: Editor) {
	return _.isEqual(editor.selection?.anchor, editor.selection?.focus)
}

function isAnnotationInSelection(editor: Editor, annotation: TextAnnotation) {
	const [match] = Editor.nodes(editor, {
		match: (n) => n[annotation] === true,
		universal: true,
	})
	console.log("isAnnotationInSelection", annotation, match)
	return Boolean(match)
}

function setSelectedTextAnnotation(
	editor: Editor,
	annotation: TextAnnotation,
	on: boolean
) {
	Transforms.setNodes(
		editor,
		{ [annotation]: on ? true : undefined },
		{ match: (n) => Text.isText(n), split: true }
	)
}

function toggleSelectedTextAnnotation(
	editor: Editor,
	annotation: TextAnnotation
) {
	if (isSelectionCollapsed(editor)) {
		return
	}
	const isActive = isAnnotationInSelection(editor, annotation)
	if (isActive) {
		setSelectedTextAnnotation(editor, annotation, false)
	} else {
		setSelectedTextAnnotation(editor, annotation, true)
	}
}

const textAnnotationHotkeys: Record<TextAnnotation, string> = {
	bold: "mod+b",
	italic: "mod+i",
	strike: "mod+shift+s",
	code: "mod+e",
}

// ============================================================================
// Editor.
// ============================================================================

export function MyEditor() {
	const editor = useMemo(() => withReact(createEditor()), [])

	const [value, setValue] = useState<Array<Node>>([
		{
			type: "paragraph",
			children: [{ text: "A line of text in a paragraph." }],
		},
	])

	const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
		for (const [annotation, hotkey] of objectEntries(textAnnotationHotkeys)) {
			if (isHotkey(hotkey, event.nativeEvent)) {
				toggleSelectedTextAnnotation(editor, annotation)
			}
		}

		if (isHotkey("mod+e", event.nativeEvent)) {
			event.preventDefault()
			toggleSelectedBlocks(editor, "code")
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

const textAnnotationStyles: Record<TextAnnotation, CSSProperties> = {
	bold: { fontWeight: "bold" },
	italic: { fontStyle: "italic" },
	strike: { textDecoration: "line-through" },
	code: {
		fontFamily: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`,
		background: "rgba(135,131,120,0.15)",
		color: "#EB5757",
		borderRadius: 3,
		fontSize: "0.85em",
		padding: "0.2em 0.4em",
	},
}

function renderLeaf(props: RenderLeafProps) {
	let style: React.CSSProperties = {}
	for (const [annotation, annotationStyle] of objectEntries(
		textAnnotationStyles
	)) {
		if (props.leaf[annotation]) {
			Object.assign(style, annotationStyle)
		}
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
