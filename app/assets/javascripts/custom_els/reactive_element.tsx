import {render} from "solid-js/web";

/**
 * Will use native browser decompression to ungzip the given data.
 *
 * @param {string} data
 * @returns {Promise<string>}
 */
async function ungzip(data: string){
  // Converts the string to a byte array, that can be used by the DecompressionStream
  const byteArray = new Uint8Array(data.split('').map((e) => e.charCodeAt(0)));
  // Creates a DecompressionStream into gzip format
  const cs = new DecompressionStream("gzip");
  // get the writer that we will use to write the byte array
  const writer = cs.writable.getWriter();
  // write the byte array to the writer
  // noinspection ES6MissingAwait this functions freezes if you await it
  writer.write(byteArray);
  // close the writer
  // noinspection ES6MissingAwait this functions freezes if you await it
  writer.close();
  // We use Response to read the readable stream into a string, this is a small hack to get the string faster
  return new Response(cs.readable).arrayBuffer().then(function (arrayBuffer) {
    return new TextDecoder().decode(arrayBuffer);
  });
}

// Some type declarations for SolidJS, that will allow us to use custom elements in JSX
declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: Record<string, any>;
    }
  }
}

/**
 * A custom element that will render a SolidJS component.
 */
export default class ReactiveElement extends HTMLElement {
  // A map of all components that are available in the application, given by viteJS
  static allComponents: Record<string, () => any> = import.meta.glob('/javascripts/components/**/*.{jsx,tsx,js,ts}');
  static loadedComponents: Record<string, any> = {};

  // A function that will return the component by name (the name of the file), and lazy load it if it is not loaded yet.
  static async getComponentByName(name: string) {
    const path = Object.keys(ReactiveElement.allComponents).find((path) => ((e) => e[e.length-1])(path.split("/")) === `${name}.tsx`);
    if (!path) throw new Error(`Could not find component with name ${name}`);
    const c = ReactiveElement.loadedComponents[path] || (ReactiveElement.loadedComponents[path] = (await ReactiveElement.allComponents[path]()).default);
    return c;
  }

  // A simple component that will render the given component with the given props, this is a hack to make solid-refresh work
  // solid-refresh does not work with root components, so we need to wrap the component in a simple component,
  // Root itself cannot be hot reloaded, but we dont need to hot reload it, because it's just a wrapper for the component
  static Root({Component, props}: { Component: any, props: Record<string, any>}) {
    return <>
      <Component {...props}/>
    </>;
  }

  // A function that will return the component and the props that are needed to render the component
  // will un-gzip the props if it is base64 encoded, and find the component by name, and return them as a promise
  async getComponent() {
    const name = this.getAttribute('name');
    if(!name) throw new Error('No name attribute provided');
    const props = this.getAttribute('props');
    if(!props) console.warn('No props attribute provided, using empty object');
    let propsJson: any;
    try {
      propsJson = props ? JSON.parse(props) : {};
    } catch (e) {
      if(window.debug) console.time('Ungzipping props')
      propsJson = props ?
        JSON.parse(await ungzip(window.atob(props))) : {};
      if(window.debug) console.timeEnd('Ungzipping props')
    }
    return {component: await ReactiveElement.getComponentByName(name), props: {reactiveElement: this, ...propsJson}};
  }
  // wraps the getComponent function in a getter, so it can be accessed as a property
  get component() { return this.getComponent(); }

  // a flag that will be set to true if the component is disconnected, to avoid rendering the component when it is not needed
  disconnected = false;
  // a function that will unmount the component, to allow us to unrender the component by using reactiveElement.unmount()
  // or reactiveElement.remove(), becose the remove function will call the unmount function thanks to the disconnectedCallback
  unmount?: () => void;

  // Will be called when the component is connected to the DOM
  // Will render the component, and measure the time it takes to fetch and render the component
  // Will also clear the innerHTML of the component if the ssr attribute is present, we don't use hydration
  // because SolidJS uses timeouts into the hydration generation, and it will not work with the current setup
  connectedCallback() {
    this.disconnected = false;
    const ssr = this.hasAttribute('ssr');
    if(window.debug) console.time('Fetching ' + this.getAttribute('name') + ' and parsing its props');
    this.component.then(({component, props}) => {
      if(window.debug) console.timeEnd('Fetching ' + this.getAttribute('name') + ' and parsing its props');
      if(window.debug) console.time('Rendering of ' + this.getAttribute('name'));
      if(ssr) this.innerHTML = '';
      this.unmount?.();
      if(!this.disconnected) this.unmount = render(() => <ReactiveElement.Root Component={component} props={props}/>, this)
      if(window.debug) console.timeEnd('Rendering of ' + this.getAttribute('name'));
    });
  }

  // Will be called when the component is disconnected from the DOM
  disconnectedCallback() {
    this.disconnected = true;
    this.unmount?.();
  }
}