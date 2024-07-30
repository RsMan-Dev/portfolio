import {render} from "solid-js/web";

async function ungzip(data: string){
  // Convert the bytes to a stream.
  const byteArray = new Uint8Array(data.split('').map((e) => e.charCodeAt(0)));
  const cs = new DecompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer().then(function (arrayBuffer) {
    return new TextDecoder().decode(arrayBuffer);
  });
}

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: Record<string, any>;
    }
  }
}

declare global{
  var renderedComponents: Record<string, ReactiveElement[]>;
  var allComponents: Record<string, any>;
}

globalThis.renderedComponents = {};
globalThis.allComponents = import.meta.glob('/javascripts/components/**/*.{jsx,tsx,js,ts}', {eager: true});

function getComponentByName(name: string) {
  const path = Object.keys(allComponents).find((path) => ((e) => e[e.length-1])(path.split("/")) === `${name}.tsx`);
  if (!path) throw new Error(`Could not find component with name ${name}`);
  return allComponents[path].default;
}

export default class ReactiveElement extends HTMLElement {
  async getComponent() {
    const name = this.getAttribute('name');
    if(!name) throw new Error('No name attribute provided');
    const props = this.getAttribute('props');
    if(!props) console.warn('No props attribute provided, using empty object');
    let propsJson: any;
    try {
      propsJson = props ? JSON.parse(props) : {};
    } catch (e) {
      propsJson = props ?
        JSON.parse(await ungzip(window.atob(props))) : {};
    }
    return () => getComponentByName(name)({parent: this, unmountFn: () => this.unmount, ...propsJson});
  }
  get component() { return this.getComponent(); }

  unmounted = false;
  unmount?: () => void;

  // renders or rerenders the component
  connectedCallback() {
    this.unmounted = false;
    const ssr = this.hasAttribute('ssr');
    console.time('Rendering of ' + this.getAttribute('name'));
    this.component.then((component) => {
      if(ssr) this.innerHTML = '';
      this.unmount?.();
      if(!this.unmounted) this.unmount = render(component, this)
      console.timeEnd('Rendering of ' + this.getAttribute('name'));
    });
    if(!renderedComponents[this.getAttribute('name')!]?.includes(this)) {
      renderedComponents[this.getAttribute('name')!] ||= [];
      renderedComponents[this.getAttribute('name')!].push(this);
    }
  }

  disconnectedCallback() {
    this.unmounted = true;
    this.unmount?.();
    renderedComponents[this.getAttribute('name')!] =
      renderedComponents[this.getAttribute('name')!]
        .filter((el) => el !== this);
  }
}