import { defineReactive, observe } from "./observer/observer";
import { generate } from "./parser/codegen";
import { parseHTML } from "./parser/html-parser";
import { optimize } from "./parser/optimizer";
import { parse } from "./parser/parser";
import { createASTElement, extend, hasOwn, isValidArrayIndex } from "./utils";
import Watcher from "./observer/watcher";
import { patch } from "./core/patch";
import { createElement } from "./core/create-element";
import { mountComponent } from "./core/lifecycle";
import { createTextVNode } from "./core/vnode";

// a.test = '30'

// console.log(a.test);∂
const sharedPropertyDefinition: any = {
  enumerable: true,
  configurable: true,
  get: Function.prototype,
  set: Function.prototype,
};
function proxy(target: Object, sourceKey: any, key: string) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val: any) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

class Vue {
  private $options: any
  private __patch__ = patch
  private _v = createTextVNode
  private _renderProxy: any
  constructor(options: any) {
    this.$options = options;
    this._init()
    this.$options.mounted && this.$options.mounted.call(this)
  }
  // 初始化
  _init() {
    this._renderProxy = this
    this.initRender(this)
    this.initState(this)
    if (this.$options.el) {
      this.$mount(this.$options.el)
    }
  }

  initRender(vm: any) {
    vm._c = (a: any, b: any, c: any, d: any) => createElement(vm, a, b, c, d, false);
    vm.$createElement = (a: any, b: any, c: any, d: any) => createElement(vm, a, b, c, d, true)
  }

  initState(vm: any) {
    let data = vm.$options.data;
    vm._data = data
    // data代理
    const keys = Object.keys(data);
    let i = keys.length;
    while (i--) {
      const key = keys[i];
      proxy(vm, `_data`, key);
    }
    observe(data)

  }

  // 用户watcher
  $watch(expOrFn: string | Function, cb: any, options?: any) {
    const vm = this
    options = options || {}
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
    return function unwatchFn() {
      watcher.teardown()
    }
  }

  // 挂载方法
  $mount(el: any) {
    const options = this.$options;
    if (!options.render) {
      let template = options.template
      if (typeof template === 'string') {
        const root = parse(template);
        optimize(root, {});
        const code = generate(root)
        options.render = new Function(code.render);
      }
    }
    return mountComponent(this, document.querySelector(el))
  }

  // 返回虚拟dom
  _render() {
    const vm = this;
    const { render } = vm.$options
    let vnode = render.call(vm._renderProxy, vm.$createElement)
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    return vnode
  }

  // 虚拟dom转化真实dom
  _update(vnode: any) {
    const vm: any = this;
    const preEl = vm.$del;
    const prevVnode = vm._vnode;
    vm._vnode = vnode
    if (!prevVnode) {
      vm.$el = vm.__patch__(vm.$el, vnode)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
  }

  $createElement() {

  }

  $set(target: any, key: any, val: any): any {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key)
      target.splice(key, 1, val)
      return val
    }
    if (key in target && !(key in Object.prototype)) {
      target[key] = val
      return val
    }
    const ob = target.__ob__
    if (target._isVue || (ob && ob.vmCount)) {
      return val
    }
    if (!ob) {
      target[key] = val
      return val
    }
    defineReactive(ob.value, key, val)
    ob.dep.notify()
    return val
  }

  $del(target: any | Object, key: any) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.splice(key, 1)
      return
    }
    const ob = (target).__ob__
    if (target._isVue || (ob && ob.vmCount)) {
      return
    }
    if (!hasOwn(target, key)) {
      return
    }
    delete target[key]
    if (!ob) {
      return
    }
    ob.dep.notify()
  }

}



const options = {
  data: {
    a: {
      b: 3,
      c: [1, 2, { a: 3 }]
    }
  },
  el: "#root",
  // @ts-ignore
  // render(h: any) {
  //   // @ts-ignore
  //   return h('div', this.a.b)
  // },
  template: `<div class="box" name="123">
  <li >
    <i>1</i>
    <i>2</i>
    <i>3</i>
  </li>
  <li>123</li>
  <li>123</li>
</div>`,
  mounted() {
    console.log(this, "外面this");

    setTimeout(() => {
      console.log("执行了吗");
      console.log("里面this", this);

      // @ts-ignore
      this.a.b = 30
    }, 300)
    // @ts-ignore
    this.$watch('a.c', (val: any) => {
      // @ts-ignore
      console.log(this.a.c, '监听到了');
      // @ts-ignore
      // document.getElementById('root').textContent = val
    }, {
      immediate: false,
      deep: true
    })
    // @ts-ignore
    this.$watch(() => {
      // @ts-ignore
      // return this.a.c[2].a
    }, (val: any) => {
      console.log(val, '监听到了---zzzz');
    })
    // @ts-ignore
    this.$set(this.a.c, 3, 5)
    // @ts-ignore
    this.$del(this.a.c, 1)
  }
}
const vm: any = new Vue(options)




// console.log(vm);
// @ts-ignore
// vm.a.b++
setTimeout(() => {
  // vm.a.c[2].a++
  // vm.a.b++
  // vm.a.c.push(4)
}, 1000)

// let html = 

// console.log(root, "================code================")


// console.log(code, "================code================")