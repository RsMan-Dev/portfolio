'use strict';const sharedConfig = {
  context: undefined,
  registry: undefined
};

const equalFn = (a, b) => a === b;
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var Owner = null;
let Transition = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
    owner = Owner,
    unowned = fn.length === 0,
    current = detachedOwner === undefined ? owner : detachedOwner,
    root = unowned
      ? UNOWNED
      : {
          owned: null,
          cleanups: null,
          context: current ? current.context : null,
          owner: current
        },
    updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      value = value(s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function untrack(fn) {
  if (Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) ;
    return fn();
  } finally {
    Listener = listener;
  }
}
function readSignal() {
  if (this.sources && (this.state)) {
    if ((this.state) === STALE) updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current =
    node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (false);
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(
    node,
    node.value,
    time
  );
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner,
    listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function runTop(node) {
  if ((node.state) === 0) return;
  if ((node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if ((node.state) === STALE) {
      updateComputation(node);
    } else if ((node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
          runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);
      else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
        index = node.sourceSlots.pop(),
        obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
          s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const error = castError(err);
  throw error;
}var z$1=(o=>(o[o.AggregateError=1]="AggregateError",o[o.ArrowFunction=2]="ArrowFunction",o[o.ErrorPrototypeStack=4]="ErrorPrototypeStack",o[o.ObjectAssign=8]="ObjectAssign",o[o.BigIntTypedArray=16]="BigIntTypedArray",o))(z$1||{});function mr(n){switch(n){case'"':return '\\"';case"\\":return "\\\\";case`
`:return "\\n";case"\r":return "\\r";case"\b":return "\\b";case"	":return "\\t";case"\f":return "\\f";case"<":return "\\x3C";case"\u2028":return "\\u2028";case"\u2029":return "\\u2029";default:return}}function d$1(n){let e="",r=0,t;for(let s=0,o=n.length;s<o;s++)t=mr(n[s]),t&&(e+=n.slice(r,s)+t,r=s+1);return r===0?e=n:e+=n.slice(r),e}var A$1="__SEROVAL_REFS__",$="$R",ee$1=`self.${$}`;function Sr(n){return n==null?`${ee$1}=${ee$1}||[]`:`(${ee$1}=${ee$1}||{})["${d$1(n)}"]=[]`}function f$1(n,e){if(!n)throw e}var Fe=new Map,I$1=new Map;function re(n){return Fe.has(n)}function Me(n){return f$1(re(n),new te$1(n)),Fe.get(n)}typeof globalThis!="undefined"?Object.defineProperty(globalThis,A$1,{value:I$1,configurable:!0,writable:!1,enumerable:!1}):typeof window!="undefined"?Object.defineProperty(window,A$1,{value:I$1,configurable:!0,writable:!1,enumerable:!1}):typeof self!="undefined"?Object.defineProperty(self,A$1,{value:I$1,configurable:!0,writable:!1,enumerable:!1}):typeof global!="undefined"&&Object.defineProperty(global,A$1,{value:I$1,configurable:!0,writable:!1,enumerable:!1});function _r(n){return n}function We(n,e){for(let r=0,t=e.length;r<t;r++){let s=e[r];n.has(s)||(n.add(s),s.extends&&We(n,s.extends));}}function c(n){if(n){let e=new Set;return We(e,n),[...e]}}var Ke={0:"Symbol.asyncIterator",1:"Symbol.hasInstance",2:"Symbol.isConcatSpreadable",3:"Symbol.iterator",4:"Symbol.match",5:"Symbol.matchAll",6:"Symbol.replace",7:"Symbol.search",8:"Symbol.species",9:"Symbol.split",10:"Symbol.toPrimitive",11:"Symbol.toStringTag",12:"Symbol.unscopables"},se={[Symbol.asyncIterator]:0,[Symbol.hasInstance]:1,[Symbol.isConcatSpreadable]:2,[Symbol.iterator]:3,[Symbol.match]:4,[Symbol.matchAll]:5,[Symbol.replace]:6,[Symbol.search]:7,[Symbol.species]:8,[Symbol.split]:9,[Symbol.toPrimitive]:10,[Symbol.toStringTag]:11,[Symbol.unscopables]:12},Je={2:"!0",3:"!1",1:"void 0",0:"null",4:"-0",5:"1/0",6:"-1/0",7:"0/0"};var oe={0:"Error",1:"EvalError",2:"RangeError",3:"ReferenceError",4:"SyntaxError",5:"TypeError",6:"URIError"};function y(n){return {t:2,i:void 0,s:n,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}var v=y(2),N=y(3),ie=y(1),ae$1=y(0),Ge=y(4),He=y(5),qe=y(6),Ze=y(7);function le(n){return n instanceof EvalError?1:n instanceof RangeError?2:n instanceof ReferenceError?3:n instanceof SyntaxError?4:n instanceof TypeError?5:n instanceof URIError?6:0}function vr(n){let e=oe[le(n)];return n.name!==e?{name:n.name}:n.constructor.name!==e?{name:n.constructor.name}:{}}function T(n,e){let r=vr(n),t=Object.getOwnPropertyNames(n);for(let s=0,o=t.length,i;s<o;s++)i=t[s],i!=="name"&&i!=="message"&&(i==="stack"?e&4&&(r=r||{},r[i]=n[i]):(r=r||{},r[i]=n[i]));return r}function ue(n){return Object.isFrozen(n)?3:Object.isSealed(n)?2:Object.isExtensible(n)?0:1}function de(n){switch(n){case Number.POSITIVE_INFINITY:return He;case Number.NEGATIVE_INFINITY:return qe}return n!==n?Ze:Object.is(n,-0)?Ge:{t:0,i:void 0,s:n,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function b(n){return {t:1,i:void 0,s:d$1(n),l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function ce(n){return {t:3,i:void 0,s:""+n,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function Qe(n){return {t:4,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function fe(n,e){return {t:5,i:n,s:e.toISOString(),l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,f:void 0,a:void 0,b:void 0,o:void 0}}function pe(n,e){return {t:6,i:n,s:void 0,l:void 0,c:d$1(e.source),m:e.flags,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function me(n,e){let r=new Uint8Array(e),t=r.length,s=new Array(t);for(let o=0;o<t;o++)s[o]=r[o];return {t:19,i:n,s,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function er(n,e){return {t:17,i:n,s:se[e],l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function Ve(n,e){return {t:18,i:n,s:d$1(Me(e)),l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function k(n,e,r){return {t:25,i:n,s:r,l:void 0,c:d$1(e),m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function ge(n,e,r){return {t:9,i:n,s:void 0,l:e.length,c:void 0,m:void 0,p:void 0,e:void 0,a:r,f:void 0,b:void 0,o:ue(e)}}function Se(n,e){return {t:21,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:e,b:void 0,o:void 0}}function he(n,e,r){return {t:15,i:n,s:void 0,l:e.length,c:e.constructor.name,m:void 0,p:void 0,e:void 0,a:void 0,f:r,b:e.byteOffset,o:void 0}}function ye(n,e,r){return {t:16,i:n,s:void 0,l:e.length,c:e.constructor.name,m:void 0,p:void 0,e:void 0,a:void 0,f:r,b:e.byteOffset,o:void 0}}function ve(n,e,r){return {t:20,i:n,s:void 0,l:e.byteLength,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:r,b:e.byteOffset,o:void 0}}function Ne(n,e,r){return {t:13,i:n,s:le(e),l:void 0,c:void 0,m:d$1(e.message),p:r,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function be(n,e,r){return {t:14,i:n,s:le(e),l:void 0,c:void 0,m:d$1(e.message),p:r,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}function xe(n,e,r){return {t:7,i:n,s:void 0,l:e,c:void 0,m:void 0,p:void 0,e:void 0,a:r,f:void 0,b:void 0,o:void 0}}function F$1(n,e){return {t:28,i:void 0,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:[n,e],f:void 0,b:void 0,o:void 0}}function V$1(n,e){return {t:30,i:void 0,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:[n,e],f:void 0,b:void 0,o:void 0}}function D(n,e,r){return {t:31,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:r,f:e,b:void 0,o:void 0}}function Ae(n,e){return {t:32,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:e,b:void 0,o:void 0}}function Ie(n,e){return {t:33,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:e,b:void 0,o:void 0}}function Ee(n,e){return {t:34,i:n,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:e,b:void 0,o:void 0}}var{toString:De}=Object.prototype;function Nr(n,e){return e instanceof Error?`Seroval caught an error during the ${n} process.
  
${e.name}
${e.message}

- For more information, please check the "cause" property of this error.
- If you believe this is an error in Seroval, please submit an issue at https://github.com/lxsmnsyc/seroval/issues/new`:`Seroval caught an error during the ${n} process.

"${De.call(e)}"

For more information, please check the "cause" property of this error.`}var G$1=class G extends Error{constructor(r,t){super(Nr(r,t));this.cause=t;}},B$1=class B extends G$1{constructor(e){super("parsing",e);}},we=class extends G$1{constructor(e){super("serialization",e);}},p$1=class p extends Error{constructor(r){super(`The value ${De.call(r)} of type "${typeof r}" cannot be parsed/serialized.
      
There are few workarounds for this problem:
- Transform the value in a way that it can be serialized.
- If the reference is present on multiple runtimes (isomorphic), you can use the Reference API to map the references.`);this.value=r;}},m$1=class m extends Error{constructor(e){super('Unsupported node type "'+e.t+'".');}},j=class extends Error{constructor(e){super('Missing plugin for tag "'+e+'".');}},te$1=class te extends Error{constructor(r){super('Missing reference for the value "'+De.call(r)+'" of type "'+typeof r+'"');this.value=r;}};var rr={},tr={};var nr={0:{},1:{},2:{},3:{},4:{}};function Ce(n){return "__SEROVAL_STREAM__"in n}function _$1(){let n=new Set,e=[],r=!0,t=!1;function s(a){for(let l of n.keys())l.next(a);}function o(a){for(let l of n.keys())l.throw(a);}function i(a){for(let l of n.keys())l.return(a);}return {__SEROVAL_STREAM__:!0,on(a){r&&n.add(a);for(let l=0,u=e.length;l<u;l++){let S=e[l];l===u-1?t?a.return(S):a.throw(S):a.next(S);}return ()=>{r&&n.delete(a);}},next(a){r&&(e.push(a),s(a));},throw(a){r&&(e.push(a),o(a),r=!1,t=!1,n.clear());},return(a){r&&(e.push(a),i(a),r=!1,t=!0,n.clear());}}}function Oe(n){let e=_$1(),r=n[Symbol.asyncIterator]();async function t(){try{let s=await r.next();s.done?e.return(s.value):(e.next(s.value),await t());}catch(s){e.throw(s);}}return t().catch(()=>{}),e}function M$1(n){let e=[],r=-1,t=-1,s=n[Symbol.iterator]();for(;;)try{let o=s.next();if(e.push(o.value),o.done){t=e.length-1;break}}catch(o){r=e.length,e.push(o);}return {v:e,t:r,d:t}}var U=class{constructor(e){this.marked=new Set;this.plugins=e.plugins,this.features=31^(e.disabledFeatures||0),this.refs=e.refs||new Map;}markRef(e){this.marked.add(e);}isMarked(e){return this.marked.has(e)}getIndexedValue(e){let r=this.refs.get(e);if(r!=null)return this.markRef(r),{type:1,value:Qe(r)};let t=this.refs.size;return this.refs.set(e,t),{type:0,value:t}}getReference(e){let r=this.getIndexedValue(e);return r.type===1?r:re(e)?{type:2,value:Ve(r.value,e)}:r}getStrictReference(e){f$1(re(e),new p$1(e));let r=this.getIndexedValue(e);return r.type===1?r.value:Ve(r.value,e)}parseFunction(e){return this.getStrictReference(e)}parseWellKnownSymbol(e){let r=this.getReference(e);return r.type!==0?r.value:(f$1(e in se,new p$1(e)),er(r.value,e))}parseSpecialReference(e){let r=this.getIndexedValue(nr[e]);return r.type===1?r.value:{t:26,i:r.value,s:e,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:void 0,b:void 0,o:void 0}}parseIteratorFactory(){let e=this.getIndexedValue(rr);return e.type===1?e.value:{t:27,i:e.value,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:this.parseWellKnownSymbol(Symbol.iterator),b:void 0,o:void 0}}parseAsyncIteratorFactory(){let e=this.getIndexedValue(tr);return e.type===1?e.value:{t:29,i:e.value,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:[this.parseSpecialReference(1),this.parseWellKnownSymbol(Symbol.asyncIterator)],f:void 0,b:void 0,o:void 0}}createObjectNode(e,r,t,s){return {t:t?11:10,i:e,s:void 0,l:void 0,c:void 0,m:void 0,p:s,e:void 0,a:void 0,f:void 0,b:void 0,o:ue(r)}}createMapNode(e,r,t,s){return {t:8,i:e,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:{k:r,v:t,s},a:void 0,f:this.parseSpecialReference(0),b:void 0,o:void 0}}createPromiseConstructorNode(e){return {t:22,i:e,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:void 0,f:this.parseSpecialReference(1),b:void 0,o:void 0}}};var xr=/^[$A-Z_][0-9A-Z_$]*$/i;function je(n){let e=n[0];return (e==="$"||e==="_"||e>="A"&&e<="Z"||e>="a"&&e<="z")&&xr.test(n)}function Z$1(n){switch(n.t){case 0:return n.s+"="+n.v;case 2:return n.s+".set("+n.k+","+n.v+")";case 1:return n.s+".add("+n.v+")";case 3:return n.s+".delete("+n.k+")"}}function Ar(n){let e=[],r=n[0];for(let t=1,s=n.length,o,i=r;t<s;t++)o=n[t],o.t===0&&o.v===i.v?r={t:0,s:o.s,k:void 0,v:Z$1(r)}:o.t===2&&o.s===i.s?r={t:2,s:Z$1(r),k:o.k,v:o.v}:o.t===1&&o.s===i.s?r={t:1,s:Z$1(r),k:void 0,v:o.v}:o.t===3&&o.s===i.s?r={t:3,s:Z$1(r),k:o.k,v:void 0}:(e.push(r),r=o),i=o;return e.push(r),e}function lr(n){if(n.length){let e="",r=Ar(n);for(let t=0,s=r.length;t<s;t++)e+=Z$1(r[t])+",";return e}}var Ir="Object.create(null)",Er="new Set",wr="new Map",Rr="Promise.resolve",Pr="Promise.reject",Cr={3:"Object.freeze",2:"Object.seal",1:"Object.preventExtensions",0:void 0},P=class{constructor(e){this.stack=[];this.flags=[];this.assignments=[];this.plugins=e.plugins,this.features=e.features,this.marked=new Set(e.markedRefs);}createFunction(e,r){return this.features&2?(e.length===1?e[0]:"("+e.join(",")+")")+"=>"+r:"function("+e.join(",")+"){return "+r+"}"}createEffectfulFunction(e,r){return this.features&2?(e.length===1?e[0]:"("+e.join(",")+")")+"=>{"+r+"}":"function("+e.join(",")+"){"+r+"}"}markRef(e){this.marked.add(e);}isMarked(e){return this.marked.has(e)}pushObjectFlag(e,r){e!==0&&(this.markRef(r),this.flags.push({type:e,value:this.getRefParam(r)}));}resolveFlags(){let e="";for(let r=0,t=this.flags,s=t.length;r<s;r++){let o=t[r];e+=Cr[o.type]+"("+o.value+"),";}return e}resolvePatches(){let e=lr(this.assignments),r=this.resolveFlags();return e?r?e+r:e:r}createAssignment(e,r){this.assignments.push({t:0,s:e,k:void 0,v:r});}createAddAssignment(e,r){this.assignments.push({t:1,s:this.getRefParam(e),k:void 0,v:r});}createSetAssignment(e,r,t){this.assignments.push({t:2,s:this.getRefParam(e),k:r,v:t});}createDeleteAssignment(e,r){this.assignments.push({t:3,s:this.getRefParam(e),k:r,v:void 0});}createArrayAssign(e,r,t){this.createAssignment(this.getRefParam(e)+"["+r+"]",t);}createObjectAssign(e,r,t){this.createAssignment(this.getRefParam(e)+"."+r,t);}isIndexedValueInStack(e){return e.t===4&&this.stack.includes(e.i)}serializeReference(e){return this.assignIndexedValue(e.i,A$1+'.get("'+e.s+'")')}serializeArrayItem(e,r,t){return r?this.isIndexedValueInStack(r)?(this.markRef(e),this.createArrayAssign(e,t,this.getRefParam(r.i)),""):this.serialize(r):""}serializeArray(e){let r=e.i;if(e.l){this.stack.push(r);let t=e.a,s=this.serializeArrayItem(r,t[0],0),o=s==="";for(let i=1,a=e.l,l;i<a;i++)l=this.serializeArrayItem(r,t[i],i),s+=","+l,o=l==="";return this.stack.pop(),this.pushObjectFlag(e.o,e.i),this.assignIndexedValue(r,"["+s+(o?",]":"]"))}return this.assignIndexedValue(r,"[]")}serializeProperty(e,r,t){if(typeof r=="string"){let s=Number(r),o=s>=0&&s.toString()===r||je(r);if(this.isIndexedValueInStack(t)){let i=this.getRefParam(t.i);return this.markRef(e.i),o&&s!==s?this.createObjectAssign(e.i,r,i):this.createArrayAssign(e.i,o?r:'"'+r+'"',i),""}return (o?r:'"'+r+'"')+":"+this.serialize(t)}return "["+this.serialize(r)+"]:"+this.serialize(t)}serializeProperties(e,r){let t=r.s;if(t){let s=r.k,o=r.v;this.stack.push(e.i);let i=this.serializeProperty(e,s[0],o[0]);for(let a=1,l=i;a<t;a++)l=this.serializeProperty(e,s[a],o[a]),i+=(l&&i&&",")+l;return this.stack.pop(),"{"+i+"}"}return "{}"}serializeObject(e){return this.pushObjectFlag(e.o,e.i),this.assignIndexedValue(e.i,this.serializeProperties(e,e.p))}serializeWithObjectAssign(e,r,t){let s=this.serializeProperties(e,r);return s!=="{}"?"Object.assign("+t+","+s+")":t}serializeStringKeyAssignment(e,r,t,s){let o=this.serialize(s),i=Number(t),a=i>=0&&i.toString()===t||je(t);if(this.isIndexedValueInStack(s))a&&i!==i?this.createObjectAssign(e.i,t,o):this.createArrayAssign(e.i,a?t:'"'+t+'"',o);else {let l=this.assignments;this.assignments=r,a&&i!==i?this.createObjectAssign(e.i,t,o):this.createArrayAssign(e.i,a?t:'"'+t+'"',o),this.assignments=l;}}serializeAssignment(e,r,t,s){if(typeof t=="string")this.serializeStringKeyAssignment(e,r,t,s);else {let o=this.stack;this.stack=[];let i=this.serialize(s);this.stack=o;let a=this.assignments;this.assignments=r,this.createArrayAssign(e.i,this.serialize(t),i),this.assignments=a;}}serializeAssignments(e,r){let t=r.s;if(t){let s=[],o=r.k,i=r.v;this.stack.push(e.i);for(let a=0;a<t;a++)this.serializeAssignment(e,s,o[a],i[a]);return this.stack.pop(),lr(s)}}serializeDictionary(e,r){if(e.p)if(this.features&8)r=this.serializeWithObjectAssign(e,e.p,r);else {this.markRef(e.i);let t=this.serializeAssignments(e,e.p);if(t)return "("+this.assignIndexedValue(e.i,r)+","+t+this.getRefParam(e.i)+")"}return this.assignIndexedValue(e.i,r)}serializeNullConstructor(e){return this.pushObjectFlag(e.o,e.i),this.serializeDictionary(e,Ir)}serializeDate(e){return this.assignIndexedValue(e.i,'new Date("'+e.s+'")')}serializeRegExp(e){return this.assignIndexedValue(e.i,"/"+e.c+"/"+e.m)}serializeSetItem(e,r){return this.isIndexedValueInStack(r)?(this.markRef(e),this.createAddAssignment(e,this.getRefParam(r.i)),""):this.serialize(r)}serializeSet(e){let r=Er,t=e.l,s=e.i;if(t){let o=e.a;this.stack.push(s);let i=this.serializeSetItem(s,o[0]);for(let a=1,l=i;a<t;a++)l=this.serializeSetItem(s,o[a]),i+=(l&&i&&",")+l;this.stack.pop(),i&&(r+="(["+i+"])");}return this.assignIndexedValue(s,r)}serializeMapEntry(e,r,t,s){if(this.isIndexedValueInStack(r)){let o=this.getRefParam(r.i);if(this.markRef(e),this.isIndexedValueInStack(t)){let a=this.getRefParam(t.i);return this.createSetAssignment(e,o,a),""}if(t.t!==4&&t.i!=null&&this.isMarked(t.i)){let a="("+this.serialize(t)+",["+s+","+s+"])";return this.createSetAssignment(e,o,this.getRefParam(t.i)),this.createDeleteAssignment(e,s),a}let i=this.stack;return this.stack=[],this.createSetAssignment(e,o,this.serialize(t)),this.stack=i,""}if(this.isIndexedValueInStack(t)){let o=this.getRefParam(t.i);if(this.markRef(e),r.t!==4&&r.i!=null&&this.isMarked(r.i)){let a="("+this.serialize(r)+",["+s+","+s+"])";return this.createSetAssignment(e,this.getRefParam(r.i),o),this.createDeleteAssignment(e,s),a}let i=this.stack;return this.stack=[],this.createSetAssignment(e,this.serialize(r),o),this.stack=i,""}return "["+this.serialize(r)+","+this.serialize(t)+"]"}serializeMap(e){let r=wr,t=e.e.s,s=e.i,o=e.f,i=this.getRefParam(o.i);if(t){let a=e.e.k,l=e.e.v;this.stack.push(s);let u=this.serializeMapEntry(s,a[0],l[0],i);for(let S=1,ke=u;S<t;S++)ke=this.serializeMapEntry(s,a[S],l[S],i),u+=(ke&&u&&",")+ke;this.stack.pop(),u&&(r+="(["+u+"])");}return o.t===26&&(this.markRef(o.i),r="("+this.serialize(o)+","+r+")"),this.assignIndexedValue(s,r)}serializeArrayBuffer(e){let r="new Uint8Array(",t=e.s,s=t.length;if(s){r+="["+t[0];for(let o=1;o<s;o++)r+=","+t[o];r+="]";}return this.assignIndexedValue(e.i,r+").buffer")}serializeTypedArray(e){return this.assignIndexedValue(e.i,"new "+e.c+"("+this.serialize(e.f)+","+e.b+","+e.l+")")}serializeDataView(e){return this.assignIndexedValue(e.i,"new DataView("+this.serialize(e.f)+","+e.b+","+e.l+")")}serializeAggregateError(e){let r=e.i;this.stack.push(r);let t=this.serializeDictionary(e,'new AggregateError([],"'+e.m+'")');return this.stack.pop(),t}serializeError(e){return this.serializeDictionary(e,"new "+oe[e.s]+'("'+e.m+'")')}serializePromise(e){let r,t=e.f,s=e.i,o=e.s?Rr:Pr;if(this.isIndexedValueInStack(t)){let i=this.getRefParam(t.i);r=o+(e.s?"().then("+this.createFunction([],i)+")":"().catch("+this.createEffectfulFunction([],"throw "+i)+")");}else {this.stack.push(s);let i=this.serialize(t);this.stack.pop(),r=o+"("+i+")";}return this.assignIndexedValue(s,r)}serializeWellKnownSymbol(e){return this.assignIndexedValue(e.i,Ke[e.s])}serializeBoxed(e){return this.assignIndexedValue(e.i,"Object("+this.serialize(e.f)+")")}serializePlugin(e){let r=this.plugins;if(r)for(let t=0,s=r.length;t<s;t++){let o=r[t];if(o.tag===e.c)return this.assignIndexedValue(e.i,o.serialize(e.s,this,{id:e.i}))}throw new j(e.c)}getConstructor(e){let r=this.serialize(e);return r===this.getRefParam(e.i)?r:"("+r+")"}serializePromiseConstructor(e){return this.assignIndexedValue(e.i,this.getConstructor(e.f)+"()")}serializePromiseResolve(e){return this.getConstructor(e.a[0])+"("+this.getRefParam(e.i)+","+this.serialize(e.a[1])+")"}serializePromiseReject(e){return this.getConstructor(e.a[0])+"("+this.getRefParam(e.i)+","+this.serialize(e.a[1])+")"}serializeSpecialReferenceValue(e){switch(e){case 0:return "[]";case 1:return this.createFunction(["s","f","p"],"((p=new Promise("+this.createEffectfulFunction(["a","b"],"s=a,f=b")+")).s=s,p.f=f,p)");case 2:return this.createEffectfulFunction(["p","d"],'p.s(d),p.status="success",p.value=d;delete p.s;delete p.f');case 3:return this.createEffectfulFunction(["p","d"],'p.f(d),p.status="failure",p.value=d;delete p.s;delete p.f');case 4:return this.createFunction(["b","a","s","l","p","f","e","n"],"(b=[],a=!0,s=!1,l=[],p=0,f="+this.createEffectfulFunction(["v","m","x"],"for(x=0;x<p;x++)l[x]&&l[x][m](v)")+",n="+this.createEffectfulFunction(["o","x","z","c"],'for(x=0,z=b.length;x<z;x++)(c=b[x],x===z-1?o[s?"return":"throw"](c):o.next(c))')+",e="+this.createFunction(["o","t"],"(a&&(l[t=p++]=o),n(o),"+this.createEffectfulFunction([],"a&&(l[t]=void 0)")+")")+",{__SEROVAL_STREAM__:!0,on:"+this.createFunction(["o"],"e(o)")+",next:"+this.createEffectfulFunction(["v"],'a&&(b.push(v),f(v,"next"))')+",throw:"+this.createEffectfulFunction(["v"],'a&&(b.push(v),f(v,"throw"),a=s=!1,l.length=0)')+",return:"+this.createEffectfulFunction(["v"],'a&&(b.push(v),f(v,"return"),a=!1,s=!0,l.length=0)')+"})");default:return ""}}serializeSpecialReference(e){return this.assignIndexedValue(e.i,this.serializeSpecialReferenceValue(e.s))}serializeIteratorFactory(e){let r="",t=!1;return e.f.t!==4&&(this.markRef(e.f.i),r="("+this.serialize(e.f)+",",t=!0),r+=this.assignIndexedValue(e.i,this.createFunction(["s"],this.createFunction(["i","c","d","t"],"(i=0,t={["+this.getRefParam(e.f.i)+"]:"+this.createFunction([],"t")+",next:"+this.createEffectfulFunction([],"if(i>s.d)return{done:!0,value:void 0};if(d=s.v[c=i++],c===s.t)throw d;return{done:c===s.d,value:d}")+"})"))),t&&(r+=")"),r}serializeIteratorFactoryInstance(e){return this.getConstructor(e.a[0])+"("+this.serialize(e.a[1])+")"}serializeAsyncIteratorFactory(e){let r=e.a[0],t=e.a[1],s="";r.t!==4&&(this.markRef(r.i),s+="("+this.serialize(r)),t.t!==4&&(this.markRef(t.i),s+=(s?",":"(")+this.serialize(t)),s&&(s+=",");let o=this.assignIndexedValue(e.i,this.createFunction(["s"],this.createFunction(["b","c","p","d","e","t","f"],"(b=[],c=0,p=[],d=-1,e=!1,f="+this.createEffectfulFunction(["i","l"],"for(i=0,l=p.length;i<l;i++)p[i].s({done:!0,value:void 0})")+",s.on({next:"+this.createEffectfulFunction(["v","t"],"if(t=p.shift())t.s({done:!1,value:v});b.push(v)")+",throw:"+this.createEffectfulFunction(["v","t"],"if(t=p.shift())t.f(v);f(),d=b.length,e=!0,b.push(v)")+",return:"+this.createEffectfulFunction(["v","t"],"if(t=p.shift())t.s({done:!0,value:v});f(),d=b.length,b.push(v)")+"}),t={["+this.getRefParam(t.i)+"]:"+this.createFunction([],"t")+",next:"+this.createEffectfulFunction(["i","t","v"],"if(d===-1){return((i=c++)>=b.length)?(p.push(t="+this.getRefParam(r.i)+"()),t):{done:!0,value:b[i]}}if(c>d)return{done:!0,value:void 0};if(v=b[i=c++],i!==d)return{done:!1,value:v};if(e)throw v;return{done:!0,value:v}")+"})")));return s?s+o+")":o}serializeAsyncIteratorFactoryInstance(e){return this.getConstructor(e.a[0])+"("+this.serialize(e.a[1])+")"}serializeStreamConstructor(e){let r=this.assignIndexedValue(e.i,this.getConstructor(e.f)+"()"),t=e.a.length;if(t){let s=this.serialize(e.a[0]);for(let o=1;o<t;o++)s+=","+this.serialize(e.a[o]);return "("+r+","+s+","+this.getRefParam(e.i)+")"}return r}serializeStreamNext(e){return this.getRefParam(e.i)+".next("+this.serialize(e.f)+")"}serializeStreamThrow(e){return this.getRefParam(e.i)+".throw("+this.serialize(e.f)+")"}serializeStreamReturn(e){return this.getRefParam(e.i)+".return("+this.serialize(e.f)+")"}serialize(e){try{switch(e.t){case 2:return Je[e.s];case 0:return ""+e.s;case 1:return '"'+e.s+'"';case 3:return e.s+"n";case 4:return this.getRefParam(e.i);case 18:return this.serializeReference(e);case 9:return this.serializeArray(e);case 10:return this.serializeObject(e);case 11:return this.serializeNullConstructor(e);case 5:return this.serializeDate(e);case 6:return this.serializeRegExp(e);case 7:return this.serializeSet(e);case 8:return this.serializeMap(e);case 19:return this.serializeArrayBuffer(e);case 16:case 15:return this.serializeTypedArray(e);case 20:return this.serializeDataView(e);case 14:return this.serializeAggregateError(e);case 13:return this.serializeError(e);case 12:return this.serializePromise(e);case 17:return this.serializeWellKnownSymbol(e);case 21:return this.serializeBoxed(e);case 22:return this.serializePromiseConstructor(e);case 23:return this.serializePromiseResolve(e);case 24:return this.serializePromiseReject(e);case 25:return this.serializePlugin(e);case 26:return this.serializeSpecialReference(e);case 27:return this.serializeIteratorFactory(e);case 28:return this.serializeIteratorFactoryInstance(e);case 29:return this.serializeAsyncIteratorFactory(e);case 30:return this.serializeAsyncIteratorFactoryInstance(e);case 31:return this.serializeStreamConstructor(e);case 32:return this.serializeStreamNext(e);case 33:return this.serializeStreamThrow(e);case 34:return this.serializeStreamReturn(e);default:throw new m$1(e)}}catch(r){throw new we(r)}}};var g$1=class g extends U{parseItems(e){let r=[];for(let t=0,s=e.length;t<s;t++)t in e&&(r[t]=this.parse(e[t]));return r}parseArray(e,r){return ge(e,r,this.parseItems(r))}parseProperties(e){let r=Object.entries(e),t=[],s=[];for(let i=0,a=r.length;i<a;i++)t.push(d$1(r[i][0])),s.push(this.parse(r[i][1]));let o=Symbol.iterator;return o in e&&(t.push(this.parseWellKnownSymbol(o)),s.push(F$1(this.parseIteratorFactory(),this.parse(M$1(e))))),o=Symbol.asyncIterator,o in e&&(t.push(this.parseWellKnownSymbol(o)),s.push(V$1(this.parseAsyncIteratorFactory(),this.parse(_$1())))),o=Symbol.toStringTag,o in e&&(t.push(this.parseWellKnownSymbol(o)),s.push(b(e[o]))),o=Symbol.isConcatSpreadable,o in e&&(t.push(this.parseWellKnownSymbol(o)),s.push(e[o]?v:N)),{k:t,v:s,s:t.length}}parsePlainObject(e,r,t){return this.createObjectNode(e,r,t,this.parseProperties(r))}parseBoxed(e,r){return Se(e,this.parse(r.valueOf()))}parseTypedArray(e,r){return he(e,r,this.parse(r.buffer))}parseBigIntTypedArray(e,r){return ye(e,r,this.parse(r.buffer))}parseDataView(e,r){return ve(e,r,this.parse(r.buffer))}parseError(e,r){let t=T(r,this.features);return Ne(e,r,t?this.parseProperties(t):void 0)}parseAggregateError(e,r){let t=T(r,this.features);return be(e,r,t?this.parseProperties(t):void 0)}parseMap(e,r){let t=[],s=[];for(let[o,i]of r.entries())t.push(this.parse(o)),s.push(this.parse(i));return this.createMapNode(e,t,s,r.size)}parseSet(e,r){let t=[];for(let s of r.keys())t.push(this.parse(s));return xe(e,r.size,t)}parsePlugin(e,r){let t=this.plugins;if(t)for(let s=0,o=t.length;s<o;s++){let i=t[s];if(i.parse.sync&&i.test(r))return k(e,i.tag,i.parse.sync(r,this,{id:e}))}}parseStream(e,r){return D(e,this.parseSpecialReference(4),[])}parsePromise(e,r){return this.createPromiseConstructorNode(e)}parseObject(e,r){if(Array.isArray(r))return this.parseArray(e,r);if(Ce(r))return this.parseStream(e,r);let t=this.parsePlugin(e,r);if(t)return t;let s=r.constructor;switch(s){case Object:return this.parsePlainObject(e,r,!1);case void 0:return this.parsePlainObject(e,r,!0);case Date:return fe(e,r);case RegExp:return pe(e,r);case Error:case EvalError:case RangeError:case ReferenceError:case SyntaxError:case TypeError:case URIError:return this.parseError(e,r);case Number:case Boolean:case String:case BigInt:return this.parseBoxed(e,r);case ArrayBuffer:return me(e,r);case Int8Array:case Int16Array:case Int32Array:case Uint8Array:case Uint16Array:case Uint32Array:case Uint8ClampedArray:case Float32Array:case Float64Array:return this.parseTypedArray(e,r);case DataView:return this.parseDataView(e,r);case Map:return this.parseMap(e,r);case Set:return this.parseSet(e,r);}if(s===Promise||r instanceof Promise)return this.parsePromise(e,r);let o=this.features;if(o&16)switch(s){case BigInt64Array:case BigUint64Array:return this.parseBigIntTypedArray(e,r);}if(o&1&&typeof AggregateError!="undefined"&&(s===AggregateError||r instanceof AggregateError))return this.parseAggregateError(e,r);if(r instanceof Error)return this.parseError(e,r);if(Symbol.iterator in r||Symbol.asyncIterator in r)return this.parsePlainObject(e,r,!!s);throw new p$1(r)}parse(e){try{switch(typeof e){case"boolean":return e?v:N;case"undefined":return ie;case"string":return b(e);case"number":return de(e);case"bigint":return ce(e);case"object":{if(e){let r=this.getReference(e);return r.type===0?this.parseObject(r.value,e):r.value}return ae$1}case"symbol":return this.parseWellKnownSymbol(e);case"function":return this.parseFunction(e);default:throw new p$1(e)}}catch(r){throw new B$1(r)}}};var O$1=class O extends P{constructor(r){super(r);this.mode="cross";this.scopeId=r.scopeId;}getRefParam(r){return $+"["+r+"]"}assignIndexedValue(r,t){return this.getRefParam(r)+"="+t}serializeTop(r){let t=this.serialize(r),s=r.i;if(s==null)return t;let o=this.resolvePatches(),i=this.getRefParam(s),a=this.scopeId==null?"":$,l=o?t+","+o+i:t;if(a==="")return o?"("+l+")":l;let u=this.scopeId==null?"()":"("+$+'["'+d$1(this.scopeId)+'"])';return "("+this.createFunction([a],l)+")"+u}};var Q$1=class Q extends g$1{constructor(r){super(r);this.alive=!0;this.pending=0;this.initial=!0;this.buffer=[];this.onParseCallback=r.onParse,this.onErrorCallback=r.onError,this.onDoneCallback=r.onDone;}onParseInternal(r,t){try{this.onParseCallback(r,t);}catch(s){this.onError(s);}}flush(){for(let r=0,t=this.buffer.length;r<t;r++)this.onParseInternal(this.buffer[r],!1);}onParse(r){this.initial?this.buffer.push(r):this.onParseInternal(r,!1);}onError(r){if(this.onErrorCallback)this.onErrorCallback(r);else throw r}onDone(){this.onDoneCallback&&this.onDoneCallback();}pushPendingState(){this.pending++;}popPendingState(){--this.pending<=0&&this.onDone();}parseProperties(r){let t=Object.entries(r),s=[],o=[];for(let a=0,l=t.length;a<l;a++)s.push(d$1(t[a][0])),o.push(this.parse(t[a][1]));let i=Symbol.iterator;return i in r&&(s.push(this.parseWellKnownSymbol(i)),o.push(F$1(this.parseIteratorFactory(),this.parse(M$1(r))))),i=Symbol.asyncIterator,i in r&&(s.push(this.parseWellKnownSymbol(i)),o.push(V$1(this.parseAsyncIteratorFactory(),this.parse(Oe(r))))),i=Symbol.toStringTag,i in r&&(s.push(this.parseWellKnownSymbol(i)),o.push(b(r[i]))),i=Symbol.isConcatSpreadable,i in r&&(s.push(this.parseWellKnownSymbol(i)),o.push(r[i]?v:N)),{k:s,v:o,s:s.length}}parsePromise(r,t){return t.then(s=>{let o=this.parseWithError(s);o&&this.onParse({t:23,i:r,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:[this.parseSpecialReference(2),o],f:void 0,b:void 0,o:void 0}),this.popPendingState();},s=>{if(this.alive){let o=this.parseWithError(s);o&&this.onParse({t:24,i:r,s:void 0,l:void 0,c:void 0,m:void 0,p:void 0,e:void 0,a:[this.parseSpecialReference(3),o],f:void 0,b:void 0,o:void 0});}this.popPendingState();}),this.pushPendingState(),this.createPromiseConstructorNode(r)}parsePlugin(r,t){let s=this.plugins;if(s)for(let o=0,i=s.length;o<i;o++){let a=s[o];if(a.parse.stream&&a.test(t))return k(r,a.tag,a.parse.stream(t,this,{id:r}))}}parseStream(r,t){let s=D(r,this.parseSpecialReference(4),[]);return this.pushPendingState(),t.on({next:o=>{if(this.alive){let i=this.parseWithError(o);i&&this.onParse(Ae(r,i));}},throw:o=>{if(this.alive){let i=this.parseWithError(o);i&&this.onParse(Ie(r,i));}this.popPendingState();},return:o=>{if(this.alive){let i=this.parseWithError(o);i&&this.onParse(Ee(r,i));}this.popPendingState();}}),s}parseWithError(r){try{return this.parse(r)}catch(t){this.onError(t);return}}start(r){let t=this.parseWithError(r);t&&(this.onParseInternal(t,!0),this.initial=!1,this.flush(),this.pending<=0&&this.destroy());}destroy(){this.alive&&(this.onDone(),this.alive=!1);}isAlive(){return this.alive}};var J=class extends Q$1{constructor(){super(...arguments);this.mode="cross";}};function pr(n,e){let r=c(e.plugins),t=new J({plugins:r,refs:e.refs,disabledFeatures:e.disabledFeatures,onParse(s,o){let i=new O$1({plugins:r,features:t.features,scopeId:e.scopeId,markedRefs:t.marked}),a;try{a=i.serializeTop(s);}catch(l){e.onError&&e.onError(l);return}e.onSerialize(a,o);},onError:e.onError,onDone:e.onDone});return t.start(n),()=>{t.destroy();}}var Te=class{constructor(e){this.options=e;this.alive=!0;this.flushed=!1;this.done=!1;this.pending=0;this.cleanups=[];this.refs=new Map;this.keys=new Set;this.ids=0;this.plugins=c(e.plugins);}write(e,r){this.alive&&!this.flushed&&(this.pending++,this.keys.add(e),this.cleanups.push(pr(r,{plugins:this.plugins,scopeId:this.options.scopeId,refs:this.refs,disabledFeatures:this.options.disabledFeatures,onError:this.options.onError,onSerialize:(t,s)=>{this.alive&&this.options.onData(s?this.options.globalIdentifier+'["'+d$1(e)+'"]='+t:t);},onDone:()=>{this.alive&&(this.pending--,this.pending<=0&&this.flushed&&!this.done&&this.options.onDone&&(this.options.onDone(),this.done=!0));}})));}getNextID(){for(;this.keys.has(""+this.ids);)this.ids++;return ""+this.ids}push(e){let r=this.getNextID();return this.write(r,e),r}flush(){this.alive&&(this.flushed=!0,this.pending<=0&&!this.done&&this.options.onDone&&(this.options.onDone(),this.done=!0));}close(){if(this.alive){for(let e=0,r=this.cleanups.length;e<r;e++)this.cleanups[e]();!this.done&&this.options.onDone&&(this.options.onDone(),this.done=!0),this.alive=!1;}}};function p(e){return {detail:e.detail,bubbles:e.bubbles,cancelable:e.cancelable,composed:e.composed}}var E=_r({tag:"seroval-plugins/web/CustomEvent",test(e){return typeof CustomEvent=="undefined"?!1:e instanceof CustomEvent},parse:{sync(e,r){return {type:r.parse(e.type),options:r.parse(p(e))}},async async(e,r){return {type:await r.parse(e.type),options:await r.parse(p(e))}},stream(e,r){return {type:r.parse(e.type),options:r.parse(p(e))}}},serialize(e,r){return "new CustomEvent("+r.serialize(e.type)+","+r.serialize(e.options)+")"},deserialize(e,r){return new CustomEvent(r.deserialize(e.type),r.deserialize(e.options))}}),F=E;var I=_r({tag:"seroval-plugins/web/DOMException",test(e){return typeof DOMException=="undefined"?!1:e instanceof DOMException},parse:{sync(e,r){return {name:r.parse(e.name),message:r.parse(e.message)}},async async(e,r){return {name:await r.parse(e.name),message:await r.parse(e.message)}},stream(e,r){return {name:r.parse(e.name),message:r.parse(e.message)}}},serialize(e,r){return "new DOMException("+r.serialize(e.message)+","+r.serialize(e.name)+")"},deserialize(e,r){return new DOMException(r.deserialize(e.message),r.deserialize(e.name))}}),B=I;function u(e){return {bubbles:e.bubbles,cancelable:e.cancelable,composed:e.composed}}var L=_r({tag:"seroval-plugins/web/Event",test(e){return typeof Event=="undefined"?!1:e instanceof Event},parse:{sync(e,r){return {type:r.parse(e.type),options:r.parse(u(e))}},async async(e,r){return {type:await r.parse(e.type),options:await r.parse(u(e))}},stream(e,r){return {type:r.parse(e.type),options:r.parse(u(e))}}},serialize(e,r){return "new Event("+r.serialize(e.type)+","+r.serialize(e.options)+")"},deserialize(e,r){return new Event(r.deserialize(e.type),r.deserialize(e.options))}}),O=L;var q=_r({tag:"seroval-plugins/web/File",test(e){return typeof File=="undefined"?!1:e instanceof File},parse:{async async(e,r){return {name:await r.parse(e.name),options:await r.parse({type:e.type,lastModified:e.lastModified}),buffer:await r.parse(await e.arrayBuffer())}}},serialize(e,r){return "new File(["+r.serialize(e.buffer)+"],"+r.serialize(e.name)+","+r.serialize(e.options)+")"},deserialize(e,r){return new File([r.deserialize(e.buffer)],r.deserialize(e.name),r.deserialize(e.options))}}),d=q;function f(e){let r=[];return e.forEach((s,a)=>{r.push([a,s]);}),r}var n={},H=_r({tag:"seroval-plugins/web/FormDataFactory",test(e){return e===n},parse:{sync(){},async async(){return await Promise.resolve(void 0)},stream(){}},serialize(e,r){return r.createEffectfulFunction(["e","f","i","s","t"],"f=new FormData;for(i=0,s=e.length;i<s;i++)f.append((t=e[i])[0],t[1]);return f")},deserialize(){return n}}),M=_r({tag:"seroval-plugins/web/FormData",extends:[d,H],test(e){return typeof FormData=="undefined"?!1:e instanceof FormData},parse:{sync(e,r){return {factory:r.parse(n),entries:r.parse(f(e))}},async async(e,r){return {factory:await r.parse(n),entries:await r.parse(f(e))}},stream(e,r){return {factory:r.parse(n),entries:r.parse(f(e))}}},serialize(e,r){return "("+r.serialize(e.factory)+")("+r.serialize(e.entries)+")"},deserialize(e,r){let s=new FormData,a=r.deserialize(e.entries);for(let t=0,b=a.length;t<b;t++){let c=a[t];s.append(c[0],c[1]);}return s}}),A=M;function m(e){let r=[];return e.forEach((s,a)=>{r.push([a,s]);}),r}var _=_r({tag:"seroval-plugins/web/Headers",test(e){return typeof Headers=="undefined"?!1:e instanceof Headers},parse:{sync(e,r){return r.parse(m(e))},async async(e,r){return await r.parse(m(e))},stream(e,r){return r.parse(m(e))}},serialize(e,r){return "new Headers("+r.serialize(e)+")"},deserialize(e,r){return new Headers(r.deserialize(e))}}),i=_;var o={},V=_r({tag:"seroval-plugins/web/ReadableStreamFactory",test(e){return e===o},parse:{sync(){},async async(){return await Promise.resolve(void 0)},stream(){}},serialize(e,r){return r.createFunction(["d"],"new ReadableStream({start:"+r.createEffectfulFunction(["c"],"d.on({next:"+r.createEffectfulFunction(["v"],"c.enqueue(v)")+",throw:"+r.createEffectfulFunction(["v"],"c.error(v)")+",return:"+r.createEffectfulFunction([],"c.close()")+"})")+"})")},deserialize(){return o}});function g(e){let r=_$1(),s=e.getReader();async function a(){try{let t=await s.read();t.done?r.return(t.value):(r.next(t.value),await a());}catch(t){r.throw(t);}}return a().catch(()=>{}),r}var G=_r({tag:"seroval/plugins/web/ReadableStream",extends:[V],test(e){return typeof ReadableStream=="undefined"?!1:e instanceof ReadableStream},parse:{sync(e,r){return {factory:r.parse(o),stream:r.parse(_$1())}},async async(e,r){return {factory:await r.parse(o),stream:await r.parse(g(e))}},stream(e,r){return {factory:r.parse(o),stream:r.parse(g(e))}}},serialize(e,r){return "("+r.serialize(e.factory)+")("+r.serialize(e.stream)+")"},deserialize(e,r){let s=r.deserialize(e.stream);return new ReadableStream({start(a){s.on({next(t){a.enqueue(t);},throw(t){a.error(t);},return(){a.close();}});}})}}),l=G;function z(e,r){return {body:r,cache:e.cache,credentials:e.credentials,headers:e.headers,integrity:e.integrity,keepalive:e.keepalive,method:e.method,mode:e.mode,redirect:e.redirect,referrer:e.referrer,referrerPolicy:e.referrerPolicy}}var K=_r({tag:"seroval-plugins/web/Request",extends:[l,i],test(e){return typeof Request=="undefined"?!1:e instanceof Request},parse:{async async(e,r){return {url:await r.parse(e.url),options:await r.parse(z(e,e.body?await e.clone().arrayBuffer():null))}},stream(e,r){return {url:r.parse(e.url),options:r.parse(z(e,e.clone().body))}}},serialize(e,r){return "new Request("+r.serialize(e.url)+","+r.serialize(e.options)+")"},deserialize(e,r){return new Request(r.deserialize(e.url),r.deserialize(e.options))}}),Q=K;function S(e){return {headers:e.headers,status:e.status,statusText:e.statusText}}var X=_r({tag:"seroval-plugins/web/Response",extends:[l,i],test(e){return typeof Response=="undefined"?!1:e instanceof Response},parse:{async async(e,r){return {body:await r.parse(e.body?await e.clone().arrayBuffer():null),options:await r.parse(S(e))}},stream(e,r){return {body:r.parse(e.clone().body),options:r.parse(S(e))}}},serialize(e,r){return "new Response("+r.serialize(e.body)+","+r.serialize(e.options)+")"},deserialize(e,r){return new Response(r.deserialize(e.body),r.deserialize(e.options))}}),Z=X;var x=_r({tag:"seroval-plugins/web/URLSearchParams",test(e){return typeof URLSearchParams=="undefined"?!1:e instanceof URLSearchParams},parse:{sync(e,r){return r.parse(e.toString())},async async(e,r){return await r.parse(e.toString())},stream(e,r){return r.parse(e.toString())}},serialize(e,r){return "new URLSearchParams("+r.serialize(e)+")"},deserialize(e,r){return new URLSearchParams(r.deserialize(e))}}),ee=x;var ae=_r({tag:"seroval-plugins/web/URL",test(e){return typeof URL=="undefined"?!1:e instanceof URL},parse:{sync(e,r){return r.parse(e.href)},async async(e,r){return await r.parse(e.href)},stream(e,r){return r.parse(e.href)}},serialize(e,r){return "new URL("+r.serialize(e)+")"},deserialize(e,r){return new URL(r.deserialize(e))}}),te=ae;const ES2017FLAG = z$1.AggregateError | z$1.BigIntTypedArray;
const GLOBAL_IDENTIFIER = "_$HY.r";
function createSerializer({ onData, onDone, scopeId, onError }) {
  return new Te({
    scopeId,
    plugins: [
      F,
      B,
      O,
      A,
      i,
      l,
      Q,
      Z,
      ee,
      te
    ],
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
    onError
  });
}
function getLocalHeaderScript(id) {
  return Sr(id) + ";";
}
function renderToString(code, options = {}) {
  const { renderId } = options;
  let scripts = "";
  const serializer = createSerializer({
    scopeId: renderId,
    onData(script) {
      if (!scripts) {
        scripts = getLocalHeaderScript(renderId);
      }
      scripts += script;
    },
    onError: options.onError
  });
  sharedConfig.context = {
    id: renderId || "",
    count: 0,
    suspense: {},
    lazy: {},
    assets: [],
    nonce: options.nonce,
    serialize(id, p) {
      !sharedConfig.context.noHydrate && serializer.write(id, p);
    },
    roots: 0,
    nextRoot() {
      return this.renderId + "i-" + this.roots++;
    }
  };
  let html = createRoot(d => {
    setTimeout(d);
    return resolveSSRNode(escape(code()));
  });
  sharedConfig.context.noHydrate = true;
  serializer.close();
  html = injectAssets(sharedConfig.context.assets, html);
  if (scripts.length) html = injectScripts(html, scripts, options.nonce);
  return html;
}
function ssr(t, ...nodes) {
  if (nodes.length) {
    let result = "";
    for (let i = 0; i < nodes.length; i++) {
      result += t[i];
      const node = nodes[i];
      if (node !== undefined) result += resolveSSRNode(node);
    }
    t = result + t[nodes.length];
  }
  return {
    t
  };
}
function escape(s, attr) {
  const t = typeof s;
  if (t !== "string") {
    if (!attr && t === "function") return escape(s());
    if (!attr && Array.isArray(s)) {
      for (let i = 0; i < s.length; i++) s[i] = escape(s[i]);
      return s;
    }
    if (attr && t === "boolean") return String(s);
    return s;
  }
  const delim = attr ? '"' : "<";
  const escDelim = attr ? "&quot;" : "&lt;";
  let iDelim = s.indexOf(delim);
  let iAmp = s.indexOf("&");
  if (iDelim < 0 && iAmp < 0) return s;
  let left = 0,
    out = "";
  while (iDelim >= 0 && iAmp >= 0) {
    if (iDelim < iAmp) {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } else {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }
  }
  if (iDelim >= 0) {
    do {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } while (iDelim >= 0);
  } else
    while (iAmp >= 0) {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }
  return left < s.length ? out + s.substring(left) : out;
}
function resolveSSRNode(node, top) {
  const t = typeof node;
  if (t === "string") return node;
  if (node == null || t === "boolean") return "";
  if (Array.isArray(node)) {
    let prev = {};
    let mapped = "";
    for (let i = 0, len = node.length; i < len; i++) {
      if (!top && typeof prev !== "object" && typeof node[i] !== "object") mapped += `<!--!$-->`;
      mapped += resolveSSRNode((prev = node[i]));
    }
    return mapped;
  }
  if (t === "object") return node.t;
  if (t === "function") return resolveSSRNode(node());
  return String(node);
}
function injectAssets(assets, html) {
  if (!assets || !assets.length) return html;
  let out = "";
  for (let i = 0, len = assets.length; i < len; i++) out += assets[i]();
  return html.replace(`</head>`, out + `</head>`);
}
function injectScripts(html, scripts, nonce) {
  const tag = `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}</script>`;
  const index = html.indexOf("<!--xs-->");
  if (index > -1) {
    return html.slice(0, index) + tag + html.slice(index);
  }
  return html + tag;
}var _tmpl$$1=["<div style=\"","\"></div>"];function Fish(){return ssr(_tmpl$$1,"height:"+"100%"+(";position:"+"relative"))}var _tmpl$=["<div><button>count: ","</button></div>"];function Hello(){const[count,setCount]=createSignal(0);return ssr(_tmpl$,escape(count()))}const comps={Fish,Hello};globalThis.renderComponent=(name,props)=>{//@ts-ignore comps var generated by vite_ssr_bundle.ts
const component=comps[name];return renderToString(()=>component(props))};