import Watcher from "../observer/watcher"

export function mountComponent(vm: any, el: any) {
  vm.$el = el;
  if (!vm.$options.render) {
    return
  }
  // 更新组件的函数
  let updateComponent = () => {
    vm._update(vm._render())
  }
  // 创建一个渲染watcher
  new Watcher(vm, updateComponent, () => { }, {})
  return vm
}