
## 响应式

响应式是通过发布订阅模式来实现的，将传入options的data数据，通过Object.defindProperty,设置它的get和set方法，读取数据会触发get，修改数据会触发set。通过一个Dep类来实现依赖的收集，收集所有用到该数据Watcher实例（订阅）。依赖就是Watcher的实例，只有watcher触发数据的get方法，才将依赖收集到dep。数据变化时通知所有的watcher，执行它们自己的更新函数。



### 1.如何追踪变化

在js中如何侦测一个对象的变化，使用Object.defineProperty和ES6的Proxy；

我们写一个简单的处理数据响应式的方法。

```js

```

每当从data的key中读取数据时，get函数被触发；每当往data的key中设置数据时，set函数被触发。

###2.如何收集依赖，依赖收集到哪里了

如果只是把Object.defineProperty进行封装，那其实并没什么实际用处，真正有用的是收集依赖。

对象的每个key都有一个数组，用来存储当前key的依赖。假设依赖是一个函数，保存在window.target上

```js
function defineReactive(data, key, val) {
  let dep = new Dep()
  Object.defineProperty(data,key,{
    enumerable: true,
    configurable: true,
    get: function() {
      dep.depend()
      return val
    },
    set: function(newVal) {
      if(val === newVal) return 
      dep.notify()
      val = newVal
    }
  })
}

export default class Dep {
  constructor () {
    this.subs = []
  }
  
  addSub(sub) {
    this.subs.push(sub)
  }
  
  removeSub(sub) {
    remove(this.subs, sub)
  }
  
  depend() {
    if(window.target) {
      this.addSub(window.target)
    }
  }
  
  notify() {
    const subs = this.subs.slice()
    subs.forEach(sub=>{
      sub.update
    })
  }
  
}

function remove(item) {
  if(arr.length) {
    const index = arr.indexOf(item)
    if(index > -1) {
      return arr.splice(index, 1)
    }
  }
}
```

这里新增dep，用来收集依赖。set触发时，循环dep以触发收集到的依赖。所以依赖被收集到dep中

###3.什么是Watcher（依赖）

收集谁，也就是属性变化了，通知谁

通知到对象可能一个用户写的一个watch，也可能是模板，这时抽象出一个Watcher类

Watcher是一个中介的角色，数据发生变化时通知它，然后它再通知其他地方。watcher的经典使用vm.$watch("a.b.c", function(newVal, oldVal) {})

这段代码表示data.a.b.c属性发生变化时，触发第二个参数中的函数。

这个功能的实现只要把watcher实例添加到data.a.b.c属性的Dep中，当data.a.b.c属性变化时，通知Watcher执行参数中的回调函数。

```js
export default class Watcher {
  constructor(
    vm: any,
    expOrFn: string | Function,
    cb: Function,
    options: any
  ) {
    this.vm = vm
    this.cb = cb
    this.getter = parsePath(expOrFn)
    this.value = this.get()
  }

  get() {
    window.target = this
    let value
    const vm = this.vm
    value = this.getter.call(vm, vm)
    window.target = null
    return value
  }

  update() {
    const oldValue = this.value
    this.value = this.get()
    this.cb.call(this.vm, this.value, oldValue)
  }
}



```

这段代码可以把自己主动将data.a.b.c的Dep中

在读取data.a.b.c值的时候，触发getters，this被添加到dep中。

依赖注入到Dep中，每当data.a.b.c的值发生变化，触发setter，就会触发update方法的执行。

所以不管用户的vm.$watch("a.b.c", function(newVal, oldVal) {})还是模板用到的data，都是通过Watcher来通知自己是否需要发生变化。

###4.递归侦听所有key

封装一个Observer类

```js
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value
    if (Array.isArray(value)) {
     
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
}

export function defineReactive(
  obj: Object | any,
  key: string,
  val: any,
  customSetter?: Function,
  shallow?: boolean
) {
 if(typeof val === 'object') {
   new Observer(val)
 }
  const dep = new Dep()
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = val
      if (Dep.target) {
        dep.depend()
      }
      console.log("访问了", key);

      return value
    },
    set: function reactiveSetter(newVal) {
      const value = val
      if (newVal === value) {
        return
      }
      val = newVal
      dep.notify()
    }
  })
}
```

###5.总结

Object可以通过Object.definProperty将属性转换成getter/setter的形式来追踪变化。读取属性触发getter，修改数据时触发setter。

我们在getter中收集哪些依赖使用了数据，在setter被触发时吗，通知收集的依赖数据发生变化了。

所谓的依赖就是Watcher，只有Watcher触发了getter才会收集依赖，哪个watcher触发了，就把哪个收集到dep中。全局设置一个唯一的watcher，当前watcher正在读取数据时，把这个watcher收集到dep中。

数据发生了变化是，触发setter，dep通知所有的watcher，触发更新。



## Array的变化侦听

### 拦截器

拦截器覆盖Array.prototype，拦截数组的7种常用方法，push、pop、shift、unshift、splice、sort和reverse

```js
const arrayProto = Array.prototype
export const arrayMethod = Object.create(arrayProto)
;['push','pop','shift','unshift','splice','sort','reverse'].forEach(method=>{
  const original = arrayProto[method]
  Object.defineProperty(arrayMethod, method, {
    value: function mutator(...args) {
      const result = original.apply(this, args);
      const ob = this.__ob__;
      
      let inserted
      switch(method) {
        case 'push':
        case: 'unshift':
          inserted = args;
          break
        case: 'splice':
          inserted = args.slice(2)
          break
      }
      if(inserted) ob.observeArray(inserted)
      ob.dep.notify(); // 向依赖发送消息
      return result
    },
    enumerable: false,
    writable: true,
    configurable: true
  })
})

```

### 使用拦截器覆盖原型方法

将一个数据转换成响应式的，需要通过Observer，所有我们只需要通过在Observer中使用拦截器覆盖那些即将被转换成响应式的Array类型的数据就可以

```js
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep(); // 依赖收集，它在拦截器和getter中都能访问到。就可以进行依赖收集和通知更新
    // __ob__可以通过value拿到，然后再数组拦截器中通过__ob__.dep去通知更新
    def(value, "__ob__", this)
    if(Array.isArray(value)) {
      value.__proto__ = arrayMethod
    }
  }
}
```

### 依赖收集

```js
function defineReactive(data,key,val) {
  let childObj = observe(val);
  let dep = new Dep()
  Object.defineProperty(data,key,{
    enumerable: true,
    cnfigurable: true,
    get: function(){
      dep.depend()
      if(childObj) {
        childObj.dep.depend()
      }
    }
   // ...
  })
}

export function observe(value, asRootData) {
  if(isObject(value)) {
    return 
  }
  let ob
  if(hasOwn(value, '__ob__') && value.__ob__ instance Observer) {
    ob = value.__ob__
  } else {
    ob = new Observer(value)
  }
  return ob
}
```

### 总结

Array追踪变化的方式不一样。因为它通过方法来改变内容，所以通过创建拦截器去覆盖数组原型方式来追踪变化。

由于数组要在拦截器中向依赖发消息，所以依赖不能保存在defineProperty中，我们将依赖保存在Observer实例上。

每个侦测了变化的数据都标上\_\_ob\__,并把this（Observer实例）保存在\_\_ob\_\_上。标记被侦测了变化的数据。在拦截器中可以通知更新。

数组新增的项，我们需要对新增的数据做侦测变化。
