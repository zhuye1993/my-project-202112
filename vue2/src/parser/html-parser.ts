import { extend, isNonPhrasingTag, isPlainTextElement, makeMap, no } from "../utils"
const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being passed as HTML comment when inlined in page
const comment = /^<!\--/
const conditionalComment = /^<!\[/

const reCache: any = {}
const decodingMap: any = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)


export function parseHTML(html: string, options: any) {
  // 栈结构来解析DOM结构
  const stack: any = []
  let index = 0
  // last最后的html内容， lastTag上一次的tag标签
  let last, lastTag: any
  while (html) {
    last = html
    // 以<开头
    let textEnd = html.indexOf('<')
    // 如果是开始标签，或者结束标签，将会做相应的处理
    if (textEnd === 0) {
      // 是结束标签 </div>
      const endTagMatch = html.match(endTag)
      if (endTagMatch) {
        const curIndex = index
        advance(endTagMatch[0].length)
        // 调用options.end方法，标签出栈，进入下次循环
        parseEndTag(endTagMatch[1], curIndex, index)
        continue
      }
      // 获取到 1.开始标签名 2.标签属性 3.开始标签结尾，<div class="box" 解析完成
      const startTagMatch = parseStartTag()
      // 开始标签组合成<div class="box">，我们才能进一步处理开始标签
      if (startTagMatch) {
        // 调用options.start方法,标签入栈，进入下次循环
        handleStartTag(startTagMatch)
        continue
      }
    }


    let text, rest, next
    // 不是标签，说明是文本
    if (textEnd >= 0) {
      // 如果有"123<d</span>"这种文本，我们去掉文本123，剩余"<d</span>"，取的文本不完整
      // 在循环中，每次找<之前的文本，看是否符合标签要求，可以截取的完整的文本123<d
      rest = html.slice(textEnd)
      while (
        !endTag.test(rest) &&
        !startTagOpen.test(rest)
      ) {
        next = rest.indexOf('<', 1)
        if (next < 0) break
        // 再往后截取
        textEnd += next

        rest = html.slice(textEnd)
      }
      // 截取标签之前的文本 123<456
      text = html.substring(0, textEnd)
    }

    // 不包含<，内容全是文本
    if (textEnd < 0) text = html

    // 截掉文本内容
    if (text) advance(text.length)

    // 调用options.chars，处理文本内容
    if (options.chars && text) {
      options.chars(text, index - text.length, index)
    }

    if (html === last) {
      options.chars && options.chars(html)
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  // 截取字符串
  function advance(n: number) {
    index += n
    html = html.substring(n)
  }

  function parseStartTag() {
    // 是否是开始标签
    const start = html.match(startTagOpen)
    if (start) {
      const match: any = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      let end, attr: any
      // 没有匹配到>,匹配>之前的所有属性
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      // <div 和 /> 同时匹配成功，才能返回match
      if (end) {
        // unarySlash存在，就是自闭合标签，否则不是
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  function handleStartTag(match: any) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash
    const unary = !!unarySlash
    // 处理标签的属性
    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      attrs[i] = {
        name: args[1],
        value: value
      }
    }

    if (!unary) {
      // 标签属性当做对象，push到stack栈中
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      // 设置上一次标签
      lastTag = tagName
    }
    // 调用start方法。创建ast
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag(tagName?: any, start?: any, end?: any) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      pos = 0
    }
    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        // 调用结束标签的方法
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }
      // 标签出栈
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    }
  }
}