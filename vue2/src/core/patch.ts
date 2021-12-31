import { isDef, isPrimitive } from "../utils"
import VNode from "./vnode"

export function createPatchFunction(backend: any) {
  const { nodeOps } = backend
  // 插入节点
  function insert(parent: any, elm: any, ref: any) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  // 创建子节点
  function createChildren(vnode: any, children: any[]) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; ++i) {
        createElm(children[i], vnode.elm, null, children, i)
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  // 创建元素
  function createElm(vnode: any, parentElm?: any, refElm?: any, ownerArray?: any, index?: number) {
    const children = vnode.children
    const tag = vnode.tag
    // 创建元素节点
    if (tag != null) {
      vnode.elm = nodeOps.createElement(tag, vnode)
      createChildren(vnode, children)
    } else if (vnode.isComment) { // 创建注释节点
      vnode.elm = nodeOps.createComment(vnode.text)
    } else { // 创建
      vnode.elm = nodeOps.createTextNode(vnode.text)
    }
    insert(parentElm, vnode.elm, refElm)
  }

  // 创建空的虚拟节点
  function emptyNodeAt(elm: any) {
    return new VNode(elm.tagName.toLowerCase(), {}, [], undefined, elm)
  }

  function removeNode(el: any) {
    var parent = nodeOps.parentNode(el);
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }

  return function patch(oldVnode: any, vnode: any) {
    if (isDef(oldVnode.nodeType)) oldVnode = emptyNodeAt(oldVnode)
    const oldElm = oldVnode.elm
    const parentElm = nodeOps.parentNode(oldElm)
    createElm(
      vnode,
      parentElm,
      nodeOps.nextSibling(oldElm)
    )
    if (isDef(parentElm)) {
      if (isDef(oldVnode)) {
        removeNode(oldVnode.elm);
      }
    }
    return vnode.elm
  }
}

const nodeOps = {
  // 获取父元素
  parentNode(node: any) {
    return node.parentNode
  },
  // 传入元素
  insertBefore(parentNode: any, newNode: any, referenceNode: any) {
    parentNode.insertBefore(newNode, referenceNode)
  },
  // 子元素插入父元素中
  appendChild(node: any, child: any) {
    node.appendChild(child)
  },
  // 创建文本节点
  createTextNode(text: string) {
    return document.createTextNode(text)
  },
  // 创建注释节点
  createComment(text: string) {
    return document.createComment(text)
  },
  createElement(tagName: string, vnode: any): Element {
    const elm = document.createElement(tagName)
    if (tagName !== 'select') {
      return elm
    }
    // false or null will remove the attribute but undefined will not
    if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
      elm.setAttribute('multiple', 'multiple')
    }
    return elm
  },
  nextSibling(node: any) {
    return node.nextSibling
  },
  removeChild(node: Node, child: Node) {
    node.removeChild(child)
  }
}

const backend = {
  nodeOps
}

export const patch = createPatchFunction(backend)