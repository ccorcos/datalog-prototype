/*

	Editor

*/

import * as _ from "lodash"
import React, { useMemo, useState, CSSProperties, useCallback } from "react"
import {
	createEditor,
	Node,
	Editor,
	Element,
	Text,
	Transforms,
	Range,
	Point,
} from "slate"
import {
	Slate,
	Editable,
	withReact,
	RenderElementProps,
	RenderLeafProps,
	useSlate,
	ReactEditor,
} from "slate-react"
import isHotkey from "is-hotkey"
import {
	unionTypeValues,
	objectEntries,
	objectKeys,
} from "../../shared/typeUtils"
import { withHistory, HistoryEditor } from "slate-history"

/*
Todo:
- [x] basic blocks
- [x] basic annotations
- [x] types
	- [x] file a typescript issue
				https://github.com/ianstormtaylor/slate/issues/3680
- [x] better types and generalization
- [x] toggle bold with collapsed selection check.
- [x] toolbar for block types and annotations.
- [x] list-item coersion
- [x] reset paragraph on enter block types.
- [x] markdown autocomplete basics
	- [x] undo to leave it alone.

- [ ] load and persist to database
- [ ] nested pages

- [ ] annotation extends cursor shortcuts.
- [ ] popups for keyboard shortcuts.
- [ ] text selection from the gutters.
- [ ] drag and drop blocks with handle on the left.
- [ ] inline code should be an inline element so it doesnt break tokens.
- [ ] inline link popup
- [ ] inline tag autocomplete ux.

- [ ] command prompt

polish
- [ ] linkify
- [ ] arrow complete ->
- [ ] more block types
	- [ ] images
	- [ ] file upload
	- [ ] youtube embed
		- [ ] iframe
	- [ ] callout
	- [ ] divider
- [ ] annotations
	- [ ] block color
	- [ ] text color
	- [ ] underline
	- [ ] overline
- [ ] markdown completions
- [ ] keyboard option+up move blocks.

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
	children: Array<ListItemElement>
}

interface NumberedListElement {
	type: "numbered-list"
	children: Array<ListItemElement>
}

interface ListItemElement {
	type: "list-item"
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
	type: "heading-three"
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
	| ListItemElement

type BlockType = BlockElement["type"]

const blockTypes = unionTypeValues<BlockType>({
	paragraph: true,
	"heading-one": true,
	"heading-two": true,
	"heading-three": true,
	code: true,
	quote: true,
	"bulleted-list": true,
	"numbered-list": true,
	"list-item": true,
})

const listTypes: Partial<Record<BlockType, true>> = {
	"bulleted-list": true,
	"numbered-list": true,
}

const resetBlockTypes: Partial<Record<BlockType, true>> = {
	"heading-one": true,
	"heading-two": true,
	"heading-three": true,
	code: true,
	quote: true,
}

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
	if (listTypes[type]) {
		// Turn blocks into list items, wrap into a list.
		Transforms.setNodes(
			editor,
			{ type: "list-item" },
			{ match: (n) => Editor.isBlock(editor, n) }
		)
		Transforms.wrapNodes(
			editor,
			{ type, children: [] },
			{
				match: (n) => n.type === "list-item",
			}
		)
	} else {
		// Unwrap any lists that we're deleting.
		Transforms.unwrapNodes(editor, {
			match: (n) => Boolean(listTypes[n.type as BlockType]),
			split: true,
		})
		Transforms.setNodes(
			editor,
			{ type: type },
			{ match: (n) => Editor.isBlock(editor, n) }
		)
	}
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

function isAnnotationInSelection(editor: Editor, annotation: TextAnnotation) {
	const [match] = Editor.nodes(editor, {
		match: (n) => n[annotation] === true,
		universal: true,
	})
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
	if (editor.selection && Range.isCollapsed(editor.selection)) {
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
// Custom Extensions.
// ============================================================================

function withExtensions(editor: ReactEditor) {
	const { insertBreak } = editor
	editor.insertBreak = () => {
		// TODO: really just if the selection starts in a code block.
		if (isBlockTypeInSelection(editor, "code")) {
			Editor.insertText(editor, "\n")
			return
		}

		insertBreak()

		// Pressing return inside an H1 should create a new paragraph.
		for (const type of objectKeys(resetBlockTypes)) {
			if (resetBlockTypes[type]) {
				if (isBlockTypeInSelection(editor, type)) {
					transformSelectedBlocks(editor, "paragraph")
				}
			}
		}
	}

	const { insertText } = editor
	editor.insertText = (text) => {
		// Autocomplete dash into bulleted list.
		if (
			editor.selection &&
			Range.isCollapsed(editor.selection) &&
			text === " "
		) {
			// TODO: we want to make sure we're transforming the correct block types.
			const block = Editor.above(editor, {
				match: (n) => Editor.isBlock(editor, n),
			})
			const path = block ? block[1] : []
			const start = Editor.start(editor, path)

			// NOTE: inserting text mutates the selection!
			insertText(text)
			const range = { anchor: editor.selection.anchor, focus: start }
			const beforeText = Editor.string(editor, range)
			if (beforeText === "- ") {
				// Create an undo checkpoint here so we can come back to it.
				Transforms.select(editor, range)
				HistoryEditor.withoutMerging(editor as any, () => {
					Transforms.delete(editor)
				})
				transformSelectedBlocks(editor, "bulleted-list")
			}
			return
		}

		insertText(text)
	}

	const { deleteBackward } = editor
	editor.deleteBackward = (unit) => {
		if (editor.selection && Range.isCollapsed(editor.selection)) {
			const match = Editor.above(editor, {
				match: (n) => Editor.isBlock(editor, n),
			})
			if (match) {
				const [block, path] = match
				const start = Editor.start(editor, path)

				if (
					block.type !== "paragraph" &&
					Point.equals(editor.selection.anchor, start)
				) {
					transformSelectedBlocks(editor, "paragraph")
					return
				}
			}
		}
		deleteBackward(unit)
	}

	return editor
}

// ============================================================================
// Editor.
// ============================================================================

export function MyEditor() {
	const editor = useMemo(
		() => withExtensions(withReact(withHistory(createEditor()))),
		[]
	)

	const [value, setValue] = useState<Array<Node>>([
		{
			type: "paragraph",
			children: [{ text: "A line of text in a paragraph." }],
		},
	])

	const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
		// Text annotation shortcuts.
		for (const [annotation, hotkey] of objectEntries(textAnnotationHotkeys)) {
			if (isHotkey(hotkey, event.nativeEvent)) {
				toggleSelectedTextAnnotation(editor, annotation)
			}
		}
	}, [])

	return (
		<div
			style={{
				padding: "2em 1em",
				maxWidth: "45em",
				margin: "0 auto",
			}}
		>
			<Slate
				editor={editor}
				value={value}
				onChange={(value) => setValue(value)}
			>
				<Toolbar />
				<Editable
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					onKeyDown={handleKeyDown}
				/>
			</Slate>
		</div>
	)
}

function Toolbar() {
	return (
		<div>
			<div>
				{blockTypes.map((type) => (
					<BlockTypeButton key={type} type={type} />
				))}
			</div>
			<div>
				{textAnnotations.map((annotation) => (
					<AnnotationButton key={annotation} annotation={annotation} />
				))}
			</div>
		</div>
	)
}

function BlockTypeButton(props: { type: BlockType }) {
	const { type } = props
	const editor = useSlate()
	const isActive = isBlockTypeInSelection(editor, type)

	const handleClick = useCallback(() => {
		toggleSelectedBlocks(editor, type)
		if (editor.selection) {
			ReactEditor.focus(editor)
		}
	}, [editor, type])

	return (
		<button style={isActive ? { color: "red" } : {}} onClick={handleClick}>
			{type}
		</button>
	)
}

function AnnotationButton(props: { annotation: TextAnnotation }) {
	const { annotation } = props
	const editor = useSlate()
	const isActive = isAnnotationInSelection(editor, annotation)

	const handleClick = () => {
		toggleSelectedTextAnnotation(editor, annotation)
		if (editor.selection) {
			ReactEditor.focus(editor)
		}
	}

	return (
		<button style={isActive ? { color: "red" } : {}} onClick={handleClick}>
			{annotation}
		</button>
	)
}

function CodeElement(props: RenderElementProps) {
	return (
		<pre {...props.attributes}>
			<code>{props.children}</code>
		</pre>
	)
}

function ParagraphElement(props: RenderElementProps) {
	return <p {...props.attributes}>{props.children}</p>
}

function QuoteElement(props: RenderElementProps) {
	return <blockquote {...props.attributes}>{props.children}</blockquote>
}

function BulletedListElement(props: RenderElementProps) {
	return <ul {...props.attributes}>{props.children}</ul>
}

function NumberedListElement(props: RenderElementProps) {
	return <ol {...props.attributes}>{props.children}</ol>
}

function ListItemElement(props: RenderElementProps) {
	return <li {...props.attributes}>{props.children}</li>
}

function HeadingOneElement(props: RenderElementProps) {
	return <h1 {...props.attributes}>{props.children}</h1>
}

function HeadingTwoElement(props: RenderElementProps) {
	return <h2 {...props.attributes}>{props.children}</h2>
}

function HeadingThreeElement(props: RenderElementProps) {
	return <h3 {...props.attributes}>{props.children}</h3>
}

const blockElementRenderers: Record<
	BlockType,
	(props: RenderElementProps) => JSX.Element
> = {
	paragraph: ParagraphElement,
	code: CodeElement,
	quote: QuoteElement,
	"bulleted-list": BulletedListElement,
	"numbered-list": NumberedListElement,
	"list-item": ListItemElement,
	"heading-one": HeadingOneElement,
	"heading-two": HeadingTwoElement,
	"heading-three": HeadingThreeElement,
}

function renderElement(props: RenderElementProps) {
	const type = props.element.type as BlockType
	return blockElementRenderers[type](props)
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
