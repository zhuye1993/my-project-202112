import { cached, isBuiltInTag, makeMap, no } from "../utils"

let isStaticKey: any
let isPlatformReservedTag: (arg0: any) => any
const genStaticKeysCached = cached(genStaticKeys)
export function optimize(root: any, options: any) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = () => true;
  markStatic(root)
  markStaticRoots(root)
}

// 静态key
function genStaticKeys(keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic(node: any) {
  node.static = isStatic(node)
  if (node.type === 1) {
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      // 子节点是动态节点，将父节点改为动态节点
      if (!child.static) {
        node.static = false
      }
    }
  }
}

function markStaticRoots(node: any) {
  if (node.type === 1) {
    // 要使节点符合静态根节点的要求，它必须有子节点
    // 这个节点不能是只有一个静态文本的子节点，否则优化成本将超过收益
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      // 找到静态根节点，直接退出
      return
    } else {
      node.staticRoot = false
    }
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i])
      }
    }
  }
}

function isStatic(node: any): boolean {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // 不能使用动态绑定语法
    !node.if && !node.for && // 不能使用 v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // 标签名不是slot或compoennt
    isPlatformReservedTag(node.tag) && // 不能是组件
    !isDirectChildOfTemplateFor(node) && // 父节点不能是带v-for的template
    Object.keys(node).every(isStaticKey) // 不存在动态节点才有的属性
  ))
}

function isDirectChildOfTemplateFor(node: any): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}