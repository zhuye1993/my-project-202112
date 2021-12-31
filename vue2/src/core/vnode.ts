export default class VNode {
  tag: string | void;
  data: any | void;
  children: any | Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: any | void; // rendered in this component's scope
  key: string | number | void;
  componentOptions: any | void;
  componentInstance: any | void; // component instance
  parent: VNode | void; // component placeholder node

  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  fnContext: any | void; // real context vm for functional nodes
  fnOptions: any; // for SSR caching
  fnScopeId: any; // functional scope id support
  constructor(
    tag?: string,
    data?: any,
    children?: Array<VNode>,
    text?: string,
    elm?: Node,
    context?: any,
    componentOptions?: any,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }
}

export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}