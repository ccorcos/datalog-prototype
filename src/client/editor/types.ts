/*
Todo:
- [x] basic blocks
- [x] basic annotations
- [x] types
	- [x] file a typescript issue
				https://github.com/ianstormtaylor/slate/issues/3680
- [ ] markdown autocomplete basics
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
	children: Array<InlineElement | TextValue>
}
interface CodeElement {
	type: "code"
	children: Array<InlineElement | TextValue>
}
interface QuoteElement {
	type: "quote"
	children: Array<InlineElement | TextValue>
}
interface BulletedListElement {
	type: "bulleted-list"
	children: Array<InlineElement | TextValue>
}
interface NumberedListElement {
	type: "numbered-list"
	children: Array<InlineElement | TextValue>
}
interface HeadingOneElement {
	type: "heading-one"
	children: Array<InlineElement | TextValue>
}
interface HeadingTwoElement {
	type: "heading-two"
	children: Array<InlineElement | TextValue>
}
interface HeadingThreeElement {
	type: "heading-Three"
	children: Array<InlineElement | TextValue>
}
type BlockElement =
	| ParagraphElement
	| CodeElement
	| BulletedListElement
	| NumberedListElement
	| HeadingOneElement
	| HeadingTwoElement
	| HeadingThreeElement
	| QuoteElement

interface LinkElement {
	type: "url"
	url: string
	children: Array<TextValue>
}
interface TagElement {
	type: "tag"
	tag: string
	children: Array<TextValue>
}
type InlineElement = LinkElement | TagElement

export type TextValue = {
	text: string
	bold?: boolean
	italic?: boolean
	strike?: boolean
	code?: boolean
}

// embed, image, column, table,
// inline math
// variables and formulas
// nested page, tag, mention
