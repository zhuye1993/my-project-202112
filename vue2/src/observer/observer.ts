import { arrayMethods } from "./array";
import Dep from "./dep";
import { isObject } from "../utils";
import { def, hasOwn, isPlainObject } from "../utils";



export function observe(value: any): Observer | void {
  if (!isObject(value)) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value)
  ) {
    ob = new Observer(value)
  }
  return ob
}


export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value
    // 为什么创建dep
    // object里面有新增删除，或者数组有变更方法
    // 通过dep通知变更
    this.dep = new Dep()
    this.vmCount = 0
    // 设置一个__ob__属性引用当前Observer实例
    def(value, '__ob__', this)
    // 判断类型
    if (Array.isArray(value)) {
      // @ts-ignore
      value.__proto__ = arrayMethods
      // 替换数组对象原型
      // if (hasProto) {
      //   protoAugment(value, arrayMethods)
      // } else {
      //   copyAugment(value, arrayMethods, arrayKeys)
      // }
      // 如果数组里面的元素还是对象
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  walk(obj: any) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

export function defineReactive(
  obj: Object | any,
  key: string,
  val: any
) {
  const dep = new Dep()
  // 递归处理所有key,c:{a:22}
  let childOb: any = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = val
      if (Dep.target) {
        // 收集依赖
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 逐个触发数组每个元素的依赖收集
            dependArray(value)
          }
        }
      }

      return value
    },
    set: function reactiveSetter(newVal) {
      const value = val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      val = newVal
      childOb = observe(newVal)
      dep.notify()
    }
  })
}

// 递归收集依赖
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}