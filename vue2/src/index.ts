import { defineReactive, observe } from "./observer";
import { generate } from "./parser/codegen";
import { parseHTML } from "./parser/html-parser";
import { optimize } from "./parser/optimizer";
import { parse } from "./parser/parser";
import { createASTElement, extend, hasOwn, isValidArrayIndex } from "./utils";
import Watcher from "./watcher";

// a.test = '30'

// console.log(a.test);
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
  constructor(options: any) {
    this.$options = options;
    this._init()
    this.$options.mounted && this.$options.mounted.call(this)
  }
  // 初始化
  _init() {
    this.initState(this)
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
  mounted() {
    // @ts-ignore
    this.$watch('a.c', (val: any) => {
      // @ts-ignore
      console.log(this.a.c, '监听到了');
      // @ts-ignore
      document.getElementById('root').textContent = val
    }, {
      immediate: false,
      deep: true
    })
    // @ts-ignore
    this.$watch(() => {
      // @ts-ignore
      return this.a.c[2].a
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




console.log(vm);
// @ts-ignore
// vm.a.b++
setTimeout(() => {
  // vm.a.c[2].a++
  // vm.a.b++
  // vm.a.c.push(4)
}, 1000)

let html = `<div class="box" name="123">
  <li v-if="message">
    <i>1</i>
    <i>2</i>
    <i>3</i>
  </li>
  <li>123</li>
  <li>123</li>
</div>`
const root = parse(html);
console.log(root, "================code================")

optimize(root, {});
const code = generate(root)
console.log(code, "================code================")