/* @flow */

import { isDef, isUndef, extend, toNumber } from 'shared/util'
import { updateVnodeToMP } from '../instance/index'
import { HOLDER_TYPE_VARS } from 'mp/util/index'

function updateDOMProps (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return
  }
  let key, cur
  const elm: any = vnode.elm
  const oldProps = oldVnode.data.domProps || {}
  let props = vnode.data.domProps || {}
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(props.__ob__)) {
    props = vnode.data.domProps = extend({}, props)
  }

  for (key in oldProps) {
    if (isUndef(props[key])) {
      elm[key] = ''
    }
  }
  for (key in props) {
    cur = props[key]
    // ignore children if the node has textContent or innerHTML,
    // as these will throw away existing DOM nodes and cause removal errors
    // on subsequent patches (#3360)
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) vnode.children.length = 0
      if (cur === oldProps[key]) continue
      /* istanbul ignore else */
      if (key === 'innerHTML') {
        const { $htmlParse } = vnode.context
        if ($htmlParse) {
          const htmlNodes = $htmlParse(cur)
          updateVnodeToMP(vnode, HOLDER_TYPE_VARS.vhtml, htmlNodes)
        } else {
          updateVnodeToMP(vnode, HOLDER_TYPE_VARS.vhtml, cur)
        }
        return
      } else if (key === 'textContent') {
        updateVnodeToMP(vnode, HOLDER_TYPE_VARS.vtext, cur)
        return
      }
    }

    if (key === 'value') {
      // store value as _value as well since
      // non-string values will be stringified
      elm._value = cur
      // avoid resetting cursor position when value is the same
      const strCur = isUndef(cur) ? '' : String(cur)
      if (shouldUpdateValue(elm, strCur)) {
        if (elm.value !== strCur) {
          elm.value = strCur
          updateVnodeToMP(vnode, key, strCur)
        }
      }
    } else if (elm[key] !== cur) {
      elm[key] = cur
      updateVnodeToMP(vnode, key, cur)
    }
  }
}

// check platforms/web/util/attrs.js acceptValue
type acceptValueElm = HTMLInputElement | HTMLSelectElement | HTMLOptionElement;

function shouldUpdateValue (elm: acceptValueElm, checkVal: string): boolean {
  return (!elm.composing && (
    elm.tagName === 'OPTION' ||
    isNotInFocusAndDirty(elm, checkVal) ||
    isDirtyWithModifiers(elm, checkVal)
  ))
}

function isNotInFocusAndDirty (elm: acceptValueElm, checkVal: string): boolean {
  // return true when textbox (.number and .trim) loses focus and its value is
  // not equal to the updated value
  let notInFocus = true
  // #6157
  // work around IE bug when accessing document.activeElement in an iframe
  try { notInFocus = document.activeElement !== elm } catch (e) {}
  return notInFocus && elm.value !== checkVal
}

function isDirtyWithModifiers (elm: any, newVal: string): boolean {
  const value = elm.value
  const modifiers = elm._vModifiers // injected by v-model runtime
  if (isDef(modifiers)) {
    if (modifiers.lazy) {
      // inputs with lazy should only be updated when not in focus
      return false
    }
    if (modifiers.number) {
      return toNumber(value) !== toNumber(newVal)
    }
    if (modifiers.trim) {
      return value.trim() !== newVal.trim()
    }
  }
  return value !== newVal
}

export default {
  create: updateDOMProps,
  update: updateDOMProps
}
