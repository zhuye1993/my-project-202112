export type CodegenResult = {
  render: string,
  staticRenderFns: Array<string>
};



export function generate(
  ast: any | void
): any {
  const code = ast ? genElement(ast) : '_c("div")'
  return {
    render: `with(this){return ${code}}`
  }
}


// 生成元素节点，递归生成
export function genElement(el: any): string {
  let code
  const data = el.plain ? undefined : genData(el)
  const children = genChildren(el)
  code = `_c('${el.tag}'${data ? `,${data}` : '' // data
    }${children ? `,${children}` : '' // children
    })`
  return code
}

// 生成子节点
export function genChildren(el: any,): string | void {
  const children = el.children
  if (children.length) {
    return `[${children.map((c: any) => genNode(c)).join(',')}]`
  }
}

// 根据类型生成不同的节点 
function genNode(node: any): string {
  if (node.type === 1) {
    return genElement(node)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

// 生成注释节点
function genComment(comment: any): string {
  return `_e(${JSON.stringify(comment.text)})`
}

// 生成文本节点
function genText(text: any): string {
  return `_v(${text.type === 2 ? text.expression : JSON.stringify(text.text)})`
}

// 生成标签属性
export function genData(el: any): string {
  let data = '{'
  // key
  if (el.key) {
    data += `key:${el.key},`
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`
  }

  // attributes
  if (el.attrsList) {
    data += `attrs:${genProps(el.attrsList)},`
  }
  // ...
  data = data.replace(/,$/, '') + '}'
  return data
}

function genProps(props: Array<any>): string {
  let staticProps = ``
  let dynamicProps = ``
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = JSON.stringify(prop.value)
    if (prop.dynamic) {
      dynamicProps += `${prop.name},${value},`
    } else {
      staticProps += `"${prop.name}":${value},`
    }
  }
  staticProps = `{${staticProps.slice(0, -1)}}`
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`
  } else {
    return staticProps
  }
}