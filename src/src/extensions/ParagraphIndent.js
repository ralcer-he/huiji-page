import { Extension } from '@tiptap/core'

const INDENT_SIZE = 2 // 每级缩进的 em 值
const MAX_INDENT = 3

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      indentSize: INDENT_SIZE,
      maxIndent: MAX_INDENT,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const level = parseInt(element.getAttribute('data-indent') || '0', 10)
              return level || 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {}
              return { 'data-indent': attributes.indent }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indentParagraph:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const pos = selection.$from
          const node = pos.node(pos.depth === 0 ? 0 : pos.depth)
          if (!node || !this.options.types.includes(node.type.name)) return false

          const currentIndent = node.attrs.indent || 0
          if (currentIndent >= this.options.maxIndent) return false

          if (dispatch) {
            const nodePos = pos.depth === 0 ? pos.before(1) : pos.before(pos.depth)
            tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              indent: currentIndent + 1,
            })
            dispatch(tr)
          }
          return true
        },

      outdentParagraph:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const pos = selection.$from
          const node = pos.node(pos.depth === 0 ? 0 : pos.depth)
          if (!node || !this.options.types.includes(node.type.name)) return false

          const currentIndent = node.attrs.indent || 0
          if (currentIndent <= 0) return false

          if (dispatch) {
            const nodePos = pos.depth === 0 ? pos.before(1) : pos.before(pos.depth)
            tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              indent: currentIndent - 1,
            })
            dispatch(tr)
          }
          return true
        },

      toggleIndent:
        () =>
        ({ editor }) => {
          const { selection } = editor.state
          const node = selection.$from.node(selection.$from.depth === 0 ? 0 : selection.$from.depth)
          if (!node) return false
          const currentIndent = node.attrs.indent || 0
          if (currentIndent > 0) {
            return editor.commands.outdentParagraph()
          }
          return editor.commands.indentParagraph()
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indentParagraph(),
      'Shift-Tab': () => this.editor.commands.outdentParagraph(),
    }
  },
})
