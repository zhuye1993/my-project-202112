import { createASTElement, extend } from "../utils"
import { parseHTML } from "./html-parser"

export function parse(html: string) {
  let currentParent: any
  let inVPre = false
  let root: any
  let stack: any = []
  let inPre = false
  parseHTML(html, {
    expectHTML: true,
    start(tag: any, attrs: any, unary: any, start: any, end: any) {
      let element: any = createASTElement(tag, attrs, currentParent)
      if (!element.processed) {
        // 结构指令
        processFor(element) // v-for
        processIf(element) // v-if
        processOnce(element) // v-once
      }

      if (!root) {
        root = element
      }

      if (!unary) {
        currentParent = element
        stack.push(element)
      } else {
        // 自闭合标签
        closeElement(element)
      }
    },
    end(tag: any, start: any, end: any) {
      const element = stack[stack.length - 1]
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      closeElement(element)
    },
    chars(text: string, start: number, end: number) {
      if (!currentParent) {
        return
      }
      const children = currentParent.children
      text = text.trim()
      if (text) {
        let res
        let child: any
        if ((res = parseText(text))) {
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          }
        } else {
          // 纯文本
          child = {
            type: 3,
            text
          }
        }
        if (child) {
          children.push(child)
        }
      }
    }
  })
  // 闭合
  function closeElement(element: any) {
    if (!element.processed) {
      element.plain = (
        !element.key &&
        !element.scopedSlots &&
        !element.attrsList.length
      )
    }
    // 存在父元素
    if (currentParent) {
      currentParent.children.push(element)
      element.parent = currentParent
    }

  }

  function trimEndingWhitespace(el: any) {
    if (!inPre) {
      let lastNode
      while (
        (lastNode = el.children[el.children.length - 1]) &&
        lastNode.type === 3 &&
        lastNode.text === ' '
      ) {
        el.children.pop()
      }
    }
  }
  return root;
}





export function getAndRemoveAttr(
  el: any,
  name: string,
  removeFromMap?: boolean
): string {
  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name]
  }
  return val
}


export function processFor(el: any) {
  let exp
  // 取出v-for的值，并将v-for属性从列表attrsList中移除
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const res = parseFor(exp)
    if (res) {
      extend(el, res)
    }
  }
}



export function parseFor(exp: string): any {
  const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
  const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
  const stripParensRE = /^\(|\)$/g
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  const res: any = {}
  res.for = inMatch[2].trim()
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '').trim()
    res.iterator1 = iteratorMatch[1].trim()
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim()
    }
  } else {
    res.alias = alias
  }
  return res
}

function processIf(el: any) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}

export function addIfCondition(el: any, condition: any) {
  if (!el.ifConditions) {
    el.ifConditions = []
  }
  el.ifConditions.push(condition)
}

function processOnce(el: any) {
  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    el.once = true
  }
}




export function parseText(text: string): any | void {
  const tagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
  if (!tagRE.test(text)) {
    return
  }
  const tokens = []
  const rawTokens = []
  let lastIndex = tagRE.lastIndex = 0
  let match, index, tokenValue
  while ((match = tagRE.exec(text))) {
    index = match.index
    // 先将{{前边文本添加到tokens中
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    const exp = match[1].trim()
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}