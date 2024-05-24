/**
 * Creates a more practical signals for classes. using Solid's ones
 */
import {batch, createEffect, createMemo, createRoot, createSignal, untrack} from "solid-js";


export type CustomReadonlySignal<T> = {
  (): T; // use directly as a function
  get val(): T; // use as a property, to be able to use +=, -=, etc
  set val(value: T); // use as a property, to be able to use +=, -=, etc
  peek: () => T;
}

export function computed<T>(fn: (curr?: T) => T, defaultValue = undefined as T | undefined) {
  const getter = createMemo(fn, defaultValue);

  const _readonlySignal = () => getter();

  _readonlySignal.peek = () => untrack(getter);

  Object.defineProperty(_readonlySignal, 'val', {
    get: () => getter(),
    set: (..._:any) => {}
  });

  // parsed to unknown to avoid type errors, as we are sure it has all the required properties
  return _readonlySignal as unknown as CustomReadonlySignal<T>;
}

export type CustomSignal<T> = {
  (value: T): void; // use directly as a function
} & CustomReadonlySignal<T>;


export function signal<T>(init: T) {
  const [getter, setter] = createSignal(init);


  const _signal = function (value?: T) {
    if(arguments.length){
      setter(value as Exclude<T, Function>);
      return value;
    }
    return getter();
  }

  _signal.peek = () => untrack(getter);

  Object.defineProperty(_signal, 'val', {
    get: () => getter(),
    set: (value: T) => setter(value as Exclude<T, Function>)
  });

  // parsed to unknown to avoid type errors, as we are sure it has all the required properties
  return _signal as unknown as CustomSignal<T>;
}

type StoreAttr<T> = T extends ((old: infer R) => infer R) ? R : T
export type CustomStore<T extends {}> = { [K in keyof T]: StoreAttr<T[K]> }

/**
 * A hook that creates a signal for each key of the object, and returns an object with values transformed to signal getter / setter.
 * @param initialValue
 */
export function store<T extends {}>(initialValue: T, signalFilter?: (keyof T)[]) : CustomStore<T> {
  const out = {} as CustomStore<T>
  for (const k in initialValue) {
    if(signalFilter && !signalFilter.includes(k as keyof T)){
      out[k] = initialValue[k] as any
    } else if(typeof initialValue[k] === 'function') {
      let cb = (initialValue[k] as any).bind(out)
      const [_s, __s] = createSignal(cb())
      createRoot(() => createEffect(() => {__s(cb())})) // created in new root because nested effect not fired
      Object.defineProperty(out, k, {
        get: () => _s(),
        set: (v: any) => {if(typeof v == "function") cb = v.bind(out)},
        enumerable: true
      });
    } else if (typeof initialValue[k] === 'object') {
      if(Array.isArray(initialValue[k])) {
        const _s = unindexedArrayStore(initialValue[k] as [])
        Object.defineProperty(out, k, {
          get: () => _s(),
          set: (v) => _s(v),
          enumerable: true
        });
      } else {
        const _s = store(initialValue[k] as {})
        Object.defineProperty(out, k, {
          get: () => _s,
          set: (v) => Object.assign(_s, v),
          enumerable: true
        });
      }
    } else {
      const _s = createSignal(initialValue[k])
      Object.defineProperty(out, k, {
        get: () => _s[0](),
        set: (v) => _s[1](v),
        enumerable: true
      });
    }
  }
  return out
}

export type Storable<T extends {}> = {
  [P in keyof T]: T[P] | ((old: T[P]) => T[P])
}
export type CustomUnindexedArrayStoreSignal<T extends {}> = {
  findBy: (matchObj: Partial<T>) => T | undefined;
  findIndexBy: (matchObj: Partial<T>) => number;
  get val(): T[]; // use as a property, to be able to use +=, -=, etc
  set val(value: Storable<T>[]); // use as a property, to be able to use +=, -=, etc
  (value: Storable<T>[]): void; // use directly as a function
} & CustomReadonlySignal<CustomStore<T>[]>
export type CustomArrayStoreSignal<T extends {}, K extends keyof T> = {
  find: (id: T[K]) => T | undefined;
  findIndex: (id: T[K]) => number;
  remove: (id: T[K]) => void;
  set: (value: Storable<T>) => void;
} & CustomUnindexedArrayStoreSignal<T>

export function unindexedArrayStore<T extends {}>(initialValue: Storable<T>[]) : CustomUnindexedArrayStoreSignal<T> {
  const [_getter, _setter] = createSignal(initialValue.map(e => store(e)), {equals: false});

  function getter() { return _getter() }
  function setter(value: T[]) {
    const curr = untrack(getter)
    // if array is bigger than new one, we will remove elements to retrieve the new array's length
    while(curr.length > value.length) curr.pop()
    for(let i = 0; i < value.length; i++){
      if(i < curr.length) Object.assign(curr[i], value[i])
      else curr.push(store(value[i]))
    }
    _setter([...curr])
  }

  const _signal = function (value?: T[]) {
    if(arguments.length){
      setter(value as Exclude<T[], Function>);
      return value;
    }
    return getter();
  }

  _signal.peek = () => untrack(getter);

  Object.defineProperty(_signal, 'val', {
    get: () => getter(),
    set: (value: T[]) => setter(value as Exclude<T[], Function>)
  });

  _signal.findBy = (matchObj: Partial<T>) => getter().find(e => {
    for(const k in matchObj){
      if(e[k] !== matchObj[k]) return false
    }
    return true
  });

  _signal.findIndexBy = (matchObj: Partial<T>) => getter().findIndex(e => {
    for(const k in matchObj){
      if(e[k] !== matchObj[k]) return false
    }
    return true
  });

  // parsed to unknown to avoid type errors, as we are sure it has all the required properties
  return _signal as unknown as CustomUnindexedArrayStoreSignal<T>;
}

/**
 * A hook that creates a store for every element of the array, and returns an array of stores.
 * @param initialValue
 * @param identifiedBy
 */
export function arrayStore<T extends {}, K  extends keyof T>(initialValue: Storable<T>[], identifiedBy: K) : CustomArrayStoreSignal<T, K> {
  const [_getter, _setter] = createSignal(initialValue.map(e => store(e)), {equals: false});

  function getter() { return _getter() }
  function setter(value: T[]) {
    const curr = untrack(getter)
    //we will remove all ids abesnt from the new array, without shallow copy
    for(let i = curr.length - 1; i >= 0; i--){
      if(!value.find(e => e[identifiedBy] === curr[i][identifiedBy])) curr.splice(i, 1)
    }
    for(const v of value){
      if(!v[identifiedBy]) continue
      const index = curr.findIndex(e => e[identifiedBy] === v[identifiedBy])
      if(index > -1) Object.assign(curr[index], v)
      else  curr.push(store(v))
    }
    _setter([...curr])
  }

  const _signal = function (value?: T[]) {
    if(arguments.length){
      setter(value as Exclude<T[], Function>);
      return value;
    }
    return getter();
  }

  _signal.peek = () => untrack(getter);

  Object.defineProperty(_signal, 'val', {
    get: () => getter(),
    set: (value: T[]) => setter(value as Exclude<T[], Function>)
  });

  _signal.find = (id: T[K]) => getter().find(e => e[identifiedBy] === id);
  _signal.findIndex = (id: T[K]) => getter().findIndex(e => e[identifiedBy] === id);
  _signal.findBy = (matchObj: Partial<T>) => getter().find(e => {
    for(const k in matchObj){
      if(e[k] !== matchObj[k]) return false
    }
    return true
  });
  _signal.findIndexBy = (matchObj: Partial<T>) => getter().findIndex(e => {
    for(const k in matchObj){
      if(e[k] !== matchObj[k]) return false
    }
    return true
  });
  _signal.remove = (id: T[K]) => {
    const curr = untrack(getter)
    const index = curr.findIndex(e => e[identifiedBy] === id)
    if(index > -1) curr.splice(index, 1)
    _setter([...curr])
  }
  _signal.set = (value: Storable<T>) => {
    const curr = untrack(getter)
    const index = curr.findIndex(e => e[identifiedBy] === value[identifiedBy])
    if(index > -1) Object.assign(curr[index], value)
    else curr.push(store(value as T))
    _setter([...curr])
  }

  // parsed to unknown to avoid type errors, as we are sure it has all the required properties
  return _signal as unknown as CustomArrayStoreSignal<T, K>;
}